package com.knowledgebase.api.service;

import com.knowledgebase.api.domain.entity.*;
import com.knowledgebase.api.domain.enums.ProjectRole;
import com.knowledgebase.api.dto.request.AddMemberRequest;
import com.knowledgebase.api.dto.request.UpdateMemberRoleRequest;
import com.knowledgebase.api.dto.response.ProjectMemberResponse;
import com.knowledgebase.api.dto.response.RoleResponse;
import com.knowledgebase.api.exception.ApiException;
import com.knowledgebase.api.exception.ErrorCode;
import com.knowledgebase.api.mapper.ProjectMemberMapper;
import com.knowledgebase.api.mapper.RoleMapper;
import com.knowledgebase.api.repository.ProjectMemberRepository;
import com.knowledgebase.api.repository.ProjectRepository;
import com.knowledgebase.api.repository.RoleRepository;
import com.knowledgebase.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectMemberService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProjectMemberMapper projectMemberMapper;
    private final RoleMapper roleMapper;

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getMembers(UUID projectId) {
        return projectMemberMapper.toMemberResponseList(
                projectMemberRepository.findByProjectIdWithDetails(projectId)
        );
    }

    @Transactional
    public ProjectMemberResponse addMember(UUID projectId, AddMemberRequest request) {
        Project project = getProjectById(projectId);

        String targetEmail = request.getEmail().trim().toLowerCase();
        User targetUser = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.USER_NOT_FOUND,
                        "Email '" + targetEmail + "' chưa đăng ký tài khoản trên hệ thống"
                ));

        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, targetUser.getId())) {
            throw new ApiException(
                    ErrorCode.USER_ALREADY_IN_PROJECT,
                    "Người dùng '" + targetUser.getFullName() + "' đã là thành viên của dự án"
            );
        }

        Role assignedRole;
        if (request.getRoleId() != null) {
            assignedRole = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new ApiException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy vai trò đã chọn"));
        } else {
            assignedRole = roleRepository.findByProjectRole(ProjectRole.VIEWER)
                    .orElseThrow(() -> new ApiException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy vai trò Viewer"));
        }

        ProjectMember member = ProjectMember.builder()
                .id(new ProjectMemberId(project.getId(), targetUser.getId()))
                .project(project)
                .user(targetUser)
                .role(assignedRole)
                .joinedAt(LocalDateTime.now())
                .build();

        member = projectMemberRepository.save(member);
        log.info("Added user {} as {} to project {}", targetUser.getEmail(), assignedRole.getName(), projectId);

        return projectMemberMapper.toMemberResponse(member);
    }

    @Transactional
    public ProjectMemberResponse updateMemberRole(UUID projectId, UUID targetUserId, UpdateMemberRoleRequest request) {
        ProjectMember targetMember = projectMemberRepository
                .findByProjectIdAndUserIdWithPermissions(projectId, targetUserId)
                .orElseThrow(() -> new ApiException(ErrorCode.MEMBER_NOT_FOUND));

        Role newRole = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new ApiException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy vai trò mới"));

        if (Boolean.TRUE.equals(newRole.getIsSystemRole())) {
            throw new ApiException(ErrorCode.INVALID_ROLE);
        }

        // Prevent demoting the last Owner
        if (ProjectRole.OWNER.getRoleName().equalsIgnoreCase(targetMember.getRole().getName())
                && !ProjectRole.OWNER.getRoleName().equalsIgnoreCase(newRole.getName())) {
            long ownerCount = projectMemberRepository.countByProjectIdAndRole(projectId, ProjectRole.OWNER);
            if (ownerCount <= 1) {
                throw new ApiException(
                        ErrorCode.CANNOT_DEMOTE_LAST_OWNER,
                        "Không thể hạ quyền Owner duy nhất còn lại của dự án. Vui lòng chuyển giao vai trò Owner cho thành viên khác trước."
                );
            }
        }

        targetMember.setRole(newRole);
        targetMember = projectMemberRepository.save(targetMember);
        log.info("Updated user {} role to {} in project {}", targetUserId, newRole.getName(), projectId);

        return projectMemberMapper.toMemberResponse(targetMember);
    }

    @Transactional
    public void removeMember(UUID projectId, UUID targetUserId) {
        ProjectMember targetMember = projectMemberRepository
                .findByProjectIdAndUserIdWithPermissions(projectId, targetUserId)
                .orElseThrow(() -> new ApiException(ErrorCode.MEMBER_NOT_FOUND));

        // Prevent removing the last Owner
        if (ProjectRole.OWNER.getRoleName().equalsIgnoreCase(targetMember.getRole().getName())) {
            long ownerCount = projectMemberRepository.countByProjectIdAndRole(projectId, ProjectRole.OWNER);
            if (ownerCount <= 1) {
                throw new ApiException(
                        ErrorCode.CANNOT_REMOVE_LAST_OWNER,
                        "Không thể xóa hoặc rời khỏi dự án khi bạn là Owner duy nhất."
                );
            }
        }

        projectMemberRepository.deleteByProjectIdAndUserId(projectId, targetUserId);
        log.info("Removed user {} from project {}", targetUserId, projectId);
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> getAvailableProjectRoles() {
        List<Role> projectRoles = roleRepository.findAll().stream()
                .filter(r -> Boolean.FALSE.equals(r.getIsSystemRole()))
                .collect(Collectors.toList());
        return roleMapper.toRoleResponseList(projectRoles);
    }

    private Project getProjectById(UUID id) {
        return projectRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ApiException(ErrorCode.PROJECT_NOT_FOUND));
    }
}
