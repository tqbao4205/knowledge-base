package com.knowledgebase.api.security;

import com.knowledgebase.api.domain.entity.Permission;
import com.knowledgebase.api.domain.entity.ProjectMember;
import com.knowledgebase.api.domain.entity.Role;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.domain.enums.AppPermission;
import com.knowledgebase.api.domain.enums.SystemRole;
import com.knowledgebase.api.exception.ApiException;
import com.knowledgebase.api.exception.ErrorCode;
import com.knowledgebase.api.repository.ProjectMemberRepository;
import com.knowledgebase.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service("projectSecurity")
@RequiredArgsConstructor
public class ProjectSecurityService {

    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final com.knowledgebase.api.repository.DocumentRepository documentRepository;

    // =========================================================================
    // SpEL Methods for @PreAuthorize
    // =========================================================================

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        if (auth.getPrincipal() instanceof CustomUserDetails cud) {
            return cud.getId();
        }
        String email = auth.getName();
        if (email == null) {
            return null;
        }
        return userRepository.findByEmail(email).map(User::getId).orElse(null);
    }

    public boolean isSystemAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> SystemRole.ROLE_SYSTEM_ADMIN.getRoleName().equalsIgnoreCase(a.getAuthority()));
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(UUID projectId, String permissionName) {
        if (isSystemAdmin()) {
            return true;
        }

        UUID userId = getCurrentUserId();
        if (userId == null || projectId == null) {
            return false;
        }

        Optional<ProjectMember> memberOpt = projectMemberRepository
                .findByProjectIdAndUserIdWithPermissions(projectId, userId);

        if (memberOpt.isEmpty()) {
            return false;
        }

        Role role = memberOpt.get().getRole();
        if (role == null || role.getPermissions() == null) {
            return false;
        }

        return role.getPermissions().stream()
                .map(Permission::getName)
                .anyMatch(p -> p.equalsIgnoreCase(permissionName));
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(UUID projectId, AppPermission permission) {
        return permission != null && hasPermission(projectId, permission.getCode());
    }

    @Transactional(readOnly = true)
    public boolean isMember(UUID projectId) {
        if (isSystemAdmin()) {
            return true;
        }

        UUID userId = getCurrentUserId();
        if (userId == null || projectId == null) {
            return false;
        }

        return projectMemberRepository.existsByProjectIdAndUserId(projectId, userId);
    }

    @Transactional(readOnly = true)
    public boolean canRemoveMember(UUID projectId, UUID targetUserId) {
        if (isSystemAdmin()) {
            return true;
        }

        UUID currentUserId = getCurrentUserId();
        if (currentUserId == null || projectId == null) {
            return false;
        }

        // Self-leave is allowed at permission check level (business rule for last owner is checked in service)
        if (currentUserId.equals(targetUserId)) {
            return true;
        }

        // Removing other members requires PROJECT_MANAGE_MEMBERS
        return hasPermission(projectId, AppPermission.PROJECT_MANAGE_MEMBERS);
    }

    @Transactional(readOnly = true)
    public boolean canDeleteDocument(UUID projectId, UUID documentId) {
        if (isSystemAdmin()) {
            return true;
        }

        // 1. Check if user has DOC_DELETE permission in project
        if (hasPermission(projectId, AppPermission.DOC_DELETE)) {
            return true;
        }

        // 2. Otherwise check if user is the uploader of this document
        UUID currentUserId = getCurrentUserId();
        if (currentUserId == null || documentId == null) {
            return false;
        }

        return documentRepository.findByIdAndProjectIdAndIsDeletedFalse(documentId, projectId)
                .map(doc -> doc.getUploadedBy() != null && currentUserId.equals(doc.getUploadedBy().getId()))
                .orElse(false);
    }

    // =========================================================================
    // Programmatic Methods for Service Layer (Defense-in-depth & fine-grained rules)
    // =========================================================================

    public boolean isSystemAdmin(User user) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().stream()
                .anyMatch(r -> SystemRole.ROLE_SYSTEM_ADMIN.getRoleName().equalsIgnoreCase(r.getName()));
    }

    @Transactional(readOnly = true)
    public boolean hasProjectPermission(UUID projectId, String permissionName, User user) {
        if (isSystemAdmin(user)) {
            return true;
        }

        if (user == null) {
            return false;
        }

        Optional<ProjectMember> memberOpt = projectMemberRepository
                .findByProjectIdAndUserIdWithPermissions(projectId, user.getId());

        if (memberOpt.isEmpty()) {
            return false;
        }

        Role role = memberOpt.get().getRole();
        if (role == null || role.getPermissions() == null) {
            return false;
        }

        return role.getPermissions().stream()
                .map(Permission::getName)
                .anyMatch(p -> p.equalsIgnoreCase(permissionName));
    }

    @Transactional(readOnly = true)
    public boolean hasProjectPermission(UUID projectId, AppPermission permission, User user) {
        return permission != null && hasProjectPermission(projectId, permission.getCode(), user);
    }

    @Transactional(readOnly = true)
    public void requireProjectPermission(UUID projectId, String permissionName, User user) {
        if (!hasProjectPermission(projectId, permissionName, user)) {
            throw new ApiException(
                    ErrorCode.ACCESS_DENIED,
                    "Bạn không có quyền thực hiện thao tác này trên dự án (" + permissionName + ")"
            );
        }
    }

    @Transactional(readOnly = true)
    public void requireProjectPermission(UUID projectId, AppPermission permission, User user) {
        if (permission != null) {
            requireProjectPermission(projectId, permission.getCode(), user);
        }
    }

    @Transactional(readOnly = true)
    public void requireProjectMembership(UUID projectId, User user) {
        if (isSystemAdmin(user)) {
            return;
        }

        if (user == null || !projectMemberRepository.existsByProjectIdAndUserId(projectId, user.getId())) {
            throw new ApiException(
                    ErrorCode.ACCESS_DENIED,
                    "Bạn không phải là thành viên của dự án này"
            );
        }
    }

    @Transactional(readOnly = true)
    public Optional<ProjectMember> getMember(UUID projectId, UUID userId) {
        return projectMemberRepository.findByProjectIdAndUserIdWithPermissions(projectId, userId);
    }
}
