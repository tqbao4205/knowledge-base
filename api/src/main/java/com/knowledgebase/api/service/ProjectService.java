package com.knowledgebase.api.service;

import com.knowledgebase.api.domain.entity.*;
import com.knowledgebase.api.domain.enums.AppPermission;
import com.knowledgebase.api.domain.enums.ProjectRole;
import com.knowledgebase.api.domain.enums.SystemRole;
import com.knowledgebase.api.dto.request.CreateProjectRequest;
import com.knowledgebase.api.dto.request.UpdateProjectRequest;
import com.knowledgebase.api.dto.response.PagedResponse;
import com.knowledgebase.api.dto.response.ProjectDetailResponse;
import com.knowledgebase.api.dto.response.ProjectMemberResponse;
import com.knowledgebase.api.dto.response.ProjectResponse;
import com.knowledgebase.api.exception.ApiException;
import com.knowledgebase.api.exception.ErrorCode;
import com.knowledgebase.api.mapper.ProjectMapper;
import com.knowledgebase.api.mapper.ProjectMemberMapper;
import com.knowledgebase.api.repository.ProjectMemberRepository;
import com.knowledgebase.api.repository.ProjectRepository;
import com.knowledgebase.api.repository.RoleRepository;
import com.knowledgebase.api.repository.UserRepository;
import com.knowledgebase.api.security.ProjectSecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProjectSecurityService projectSecurityService;
    private final ProjectMapper projectMapper;
    private final ProjectMemberMapper projectMemberMapper;

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);

        Project project = Project.builder()
                .name(request.getName().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .createdBy(user.getId())
                .build();

        project = projectRepository.save(project);

        // Find Owner role and assign creator as Project Owner
        Role ownerRole = roleRepository.findByProjectRole(ProjectRole.OWNER)
                .orElseThrow(() -> new ApiException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy vai trò Owner mặc định"));

        ProjectMember member = ProjectMember.builder()
                .id(new ProjectMemberId(project.getId(), user.getId()))
                .project(project)
                .user(user)
                .role(ownerRole)
                .joinedAt(LocalDateTime.now())
                .build();

        projectMemberRepository.save(member);
        log.info("Created project '{}' (ID: {}) with owner '{}'", project.getName(), project.getId(), user.getEmail());

        return projectMapper.toProjectResponse(project, ProjectRole.OWNER.getRoleName(), getPermissionNames(ownerRole), 1);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProjectResponse> getMyProjects(String userEmail, Pageable pageable) {
        User user = getUserByEmail(userEmail);
        boolean isAdmin = projectSecurityService.isSystemAdmin(user);

        Page<Project> projectPage = isAdmin
                ? projectRepository.findByIsDeletedFalseOrderByCreatedAtDesc(pageable)
                : projectRepository.findProjectsByUserId(user.getId(), pageable);

        List<ProjectResponse> responses = projectPage.getContent().stream().map(project -> {
            Optional<ProjectMember> memberOpt = projectMemberRepository
                    .findByProjectIdAndUserIdWithPermissions(project.getId(), user.getId());

            String myRole = memberOpt.map(m -> m.getRole().getName())
                    .orElse(isAdmin ? SystemRole.ROLE_SYSTEM_ADMIN.getRoleName() : "None");

            Set<String> myPerms = memberOpt.map(m -> getPermissionNames(m.getRole()))
                    .orElse(isAdmin ? getAllPermissionNames() : Collections.emptySet());

            long memberCount = projectMemberRepository.findByProjectIdWithDetails(project.getId()).size();

            return projectMapper.toProjectResponse(project, myRole, myPerms, memberCount);
        }).collect(Collectors.toList());

        return PagedResponse.<ProjectResponse>builder()
                .content(responses)
                .page(projectPage.getNumber())
                .size(projectPage.getSize())
                .totalElements(projectPage.getTotalElements())
                .totalPages(projectPage.getTotalPages())
                .last(projectPage.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public ProjectDetailResponse getProjectDetail(UUID projectId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Project project = getProjectById(projectId);

        List<ProjectMember> members = projectMemberRepository.findByProjectIdWithDetails(projectId);

        Optional<ProjectMember> myMember = members.stream()
                .filter(m -> m.getUser().getId().equals(user.getId()))
                .findFirst();

        boolean isAdmin = projectSecurityService.isSystemAdmin(user);

        String myRole = myMember.map(m -> m.getRole().getName())
                .orElse(isAdmin ? SystemRole.ROLE_SYSTEM_ADMIN.getRoleName() : "None");

        Set<String> myPerms = myMember.map(m -> getPermissionNames(m.getRole()))
                .orElse(isAdmin ? getAllPermissionNames() : Collections.emptySet());

        ProjectResponse projectResponse = projectMapper.toProjectResponse(project, myRole, myPerms, members.size());
        List<ProjectMemberResponse> memberResponses = projectMemberMapper.toMemberResponseList(members);

        return projectMapper.toProjectDetailResponse(projectResponse, memberResponses);
    }

    @Transactional
    public ProjectResponse updateProject(UUID projectId, UpdateProjectRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        Project project = getProjectById(projectId);
        project.setName(request.getName().trim());
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription().trim());
        }

        project = projectRepository.save(project);
        log.info("Updated project ID: {} by user: {}", projectId, user.getEmail());

        Optional<ProjectMember> myMember = projectMemberRepository
                .findByProjectIdAndUserIdWithPermissions(projectId, user.getId());

        String myRole = myMember.map(m -> m.getRole().getName()).orElse(SystemRole.ROLE_SYSTEM_ADMIN.getRoleName());
        Set<String> myPerms = myMember.map(m -> getPermissionNames(m.getRole())).orElse(getAllPermissionNames());
        long memberCount = projectMemberRepository.findByProjectIdWithDetails(projectId).size();

        return projectMapper.toProjectResponse(project, myRole, myPerms, memberCount);
    }

    @Transactional
    public void deleteProject(UUID projectId, String userEmail) {
        Project project = getProjectById(projectId);
        project.setIsDeleted(true);
        projectRepository.save(project);

        log.info("Soft-deleted project ID: {} by user: {}", projectId, userEmail);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmailWithRolesAndPermissions(email)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private Project getProjectById(UUID id) {
        return projectRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ApiException(ErrorCode.PROJECT_NOT_FOUND));
    }

    private Set<String> getPermissionNames(Role role) {
        if (role == null || role.getPermissions() == null) return Collections.emptySet();
        return role.getPermissions().stream()
                .filter(Objects::nonNull)
                .map(p -> p.getName())
                .collect(Collectors.toSet());
    }

    private Set<String> getAllPermissionNames() {
        return AppPermission.allCodes();
    }
}
