package com.knowledgebase.api.service;

import com.knowledgebase.api.domain.entity.Project;
import com.knowledgebase.api.domain.entity.Role;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.domain.enums.DocumentIndexingStatus;
import com.knowledgebase.api.domain.enums.SystemRole;
import com.knowledgebase.api.dto.response.*;
import com.knowledgebase.api.exception.ApiException;
import com.knowledgebase.api.exception.ErrorCode;
import com.knowledgebase.api.mapper.ProjectMemberMapper;
import com.knowledgebase.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final RoleRepository roleRepository;
    private final ProjectMemberMapper projectMemberMapper;

    @Transactional(readOnly = true)
    public PagedResponse<AdminUserResponse> getAllUsers(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String query = (search != null && !search.isBlank()) ? search.trim() : null;
        Page<User> userPage = userRepository.searchUsers(query, pageable);

        List<AdminUserResponse> content = userPage.getContent().stream()
                .map(this::toAdminUserResponse)
                .collect(Collectors.toList());

        return PagedResponse.<AdminUserResponse>builder()
                .content(content)
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .last(userPage.isLast())
                .build();
    }

    @Transactional
    public AdminUserResponse updateUserStatus(UUID userId, Boolean isActive, String currentAdminEmail) {
        User user = userRepository.findById(userId)
                .filter(u -> !Boolean.TRUE.equals(u.getIsDeleted()))
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        if (user.getEmail().equalsIgnoreCase(currentAdminEmail) && Boolean.FALSE.equals(isActive)) {
            throw new ApiException(ErrorCode.CANNOT_DEACTIVATE_SELF);
        }

        user.setIsActive(isActive);
        User savedUser = userRepository.save(user);
        log.info("Admin [{}] updated user [{}] status to isActive={}", currentAdminEmail, user.getEmail(), isActive);
        return toAdminUserResponse(savedUser);
    }

    @Transactional
    public AdminUserResponse updateUserRoles(UUID userId, List<String> roleNames, String currentAdminEmail) {
        User user = userRepository.findById(userId)
                .filter(u -> !Boolean.TRUE.equals(u.getIsDeleted()))
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        if (roleNames == null || roleNames.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Danh sách vai trò không được rỗng");
        }

        boolean includesAdmin = roleNames.stream().anyMatch(this::isAdminRoleName);
        if (user.getEmail().equalsIgnoreCase(currentAdminEmail) && !includesAdmin) {
            throw new ApiException(ErrorCode.CANNOT_REMOVE_ADMIN_ROLE_FROM_SELF);
        }

        Set<Role> newRoles = new HashSet<>();
        for (String roleName : roleNames) {
            Role role = resolveSystemRole(roleName);
            newRoles.add(role);
        }

        user.setRoles(newRoles);
        User savedUser = userRepository.save(user);
        log.info("Admin [{}] updated user [{}] roles to {}", currentAdminEmail, user.getEmail(), roleNames);
        return toAdminUserResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public PagedResponse<AdminProjectResponse> getAllProjects(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size);
        String query = (search != null && !search.isBlank()) ? search.trim() : null;
        Page<Project> projectPage = projectRepository.searchProjects(query, pageable);

        List<AdminProjectResponse> content = projectPage.getContent().stream()
                .map(project -> {
                    long memberCount = projectMemberRepository.countByProjectId(project.getId());
                    long documentCount = documentRepository.countByProjectIdAndIsDeletedFalse(project.getId());
                    return AdminProjectResponse.builder()
                            .id(project.getId())
                            .name(project.getName())
                            .description(project.getDescription())
                            .memberCount(memberCount)
                            .documentCount(documentCount)
                            .createdAt(project.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());

        return PagedResponse.<AdminProjectResponse>builder()
                .content(content)
                .page(projectPage.getNumber())
                .size(projectPage.getSize())
                .totalElements(projectPage.getTotalElements())
                .totalPages(projectPage.getTotalPages())
                .last(projectPage.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getProjectMembers(UUID projectId) {
        if (!projectRepository.existsByIdAndIsDeletedFalse(projectId)) {
            throw new ApiException(ErrorCode.PROJECT_NOT_FOUND);
        }
        return projectMemberMapper.toMemberResponseList(
                projectMemberRepository.findByProjectIdWithDetails(projectId)
        );
    }

    @Transactional(readOnly = true)
    public AdminDashboardStatsResponse getDashboardStats() {
        long totalUsers = userRepository.countByIsDeletedFalse();
        long bannedUsers = userRepository.countByIsActiveFalseAndIsDeletedFalse();
        long totalProjects = projectRepository.countByIsDeletedFalse();
        long totalDocuments = documentRepository.countByIsDeletedFalse();
        long totalChunks = documentChunkRepository.count();

        long indexed = documentRepository.countByIndexingStatusAndIsDeletedFalse(DocumentIndexingStatus.INDEXED);
        long processing = documentRepository.countByIndexingStatusAndIsDeletedFalse(DocumentIndexingStatus.PROCESSING);
        long failed = documentRepository.countByIndexingStatusAndIsDeletedFalse(DocumentIndexingStatus.FAILED);

        return AdminDashboardStatsResponse.builder()
                .totalUsers(totalUsers)
                .bannedUsers(bannedUsers)
                .totalProjects(totalProjects)
                .totalDocuments(totalDocuments)
                .totalChunks(totalChunks)
                .documentStatus(AdminDashboardStatsResponse.DocumentStatusStats.builder()
                        .indexed(indexed)
                        .processing(processing)
                        .failed(failed)
                        .build())
                .build();
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        Set<String> roles = user.getRoles() != null
                ? user.getRoles().stream().map(Role::getName).collect(Collectors.toSet())
                : Collections.emptySet();

        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .isActive(user.getIsActive() != null ? user.getIsActive() : true)
                .createdAt(user.getCreatedAt())
                .roles(roles)
                .build();
    }

    private boolean isAdminRoleName(String roleName) {
        if (roleName == null) return false;
        String clean = roleName.trim().toUpperCase();
        return clean.equals("ADMIN") || clean.equals("ROLE_ADMIN") || clean.equals("ROLE_SYSTEM_ADMIN") || clean.equals("SYSTEM_ADMIN");
    }

    private Role resolveSystemRole(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            throw new ApiException(ErrorCode.INVALID_ROLE, "Tên vai trò không hợp lệ");
        }
        String clean = roleName.trim().toUpperCase();
        if (clean.equals("ADMIN") || clean.equals("ROLE_ADMIN") || clean.equals("ROLE_SYSTEM_ADMIN") || clean.equals("SYSTEM_ADMIN")) {
            return roleRepository.findBySystemRole(SystemRole.ROLE_SYSTEM_ADMIN)
                    .orElseThrow(() -> new ApiException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy vai trò ROLE_SYSTEM_ADMIN"));
        } else if (clean.equals("USER") || clean.equals("ROLE_USER") || clean.equals("ROLE_SYSTEM_USER") || clean.equals("SYSTEM_USER")) {
            return roleRepository.findBySystemRole(SystemRole.ROLE_SYSTEM_USER)
                    .orElseThrow(() -> new ApiException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy vai trò ROLE_SYSTEM_USER"));
        }

        Role role = roleRepository.findByName(clean)
                .orElseThrow(() -> new ApiException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy vai trò: " + roleName));
        if (!Boolean.TRUE.equals(role.getIsSystemRole())) {
            throw new ApiException(ErrorCode.INVALID_ROLE, "Chỉ có thể gán vai trò hệ thống cho tài khoản người dùng");
        }
        return role;
    }
}
