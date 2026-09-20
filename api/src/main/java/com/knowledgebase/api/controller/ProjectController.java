package com.knowledgebase.api.controller;

import com.knowledgebase.api.dto.request.AddMemberRequest;
import com.knowledgebase.api.dto.request.CreateProjectRequest;
import com.knowledgebase.api.dto.request.UpdateMemberRoleRequest;
import com.knowledgebase.api.dto.request.UpdateProjectRequest;
import com.knowledgebase.api.dto.response.*;
import com.knowledgebase.api.service.ProjectMemberService;
import com.knowledgebase.api.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Projects", description = "Endpoints for managing project workspaces and members")
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;

    @PostMapping
    @PreAuthorize("hasAuthority('PROJECT_CREATE')")
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ProjectResponse response = projectService.createProject(request, userDetails.getUsername());
        return new ResponseEntity<>(ApiResponse.success("Tạo dự án thành công", response), HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PagedResponse<ProjectResponse>>> getMyProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        Pageable pageable = PageRequest.of(page, size);
        PagedResponse<ProjectResponse> response = projectService.getMyProjects(userDetails.getUsername(), pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách dự án thành công", response));
    }

    @GetMapping("/roles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getProjectRoles() {
        List<RoleResponse> roles = projectMemberService.getAvailableProjectRoles();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách vai trò dự án thành công", roles));
    }

    @GetMapping("/{projectId}")
    @PreAuthorize("@projectSecurity.isMember(#projectId)")
    public ResponseEntity<ApiResponse<ProjectDetailResponse>> getProjectDetail(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        ProjectDetailResponse response = projectService.getProjectDetail(projectId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin dự án thành công", response));
    }

    @PutMapping("/{projectId}")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'PROJECT_UPDATE')")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateProjectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ProjectResponse response = projectService.updateProject(projectId, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật dự án thành công", response));
    }

    @DeleteMapping("/{projectId}")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'PROJECT_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.deleteProject(projectId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Xóa dự án thành công", null));
    }

    @GetMapping("/{projectId}/members")
    @PreAuthorize("@projectSecurity.isMember(#projectId)")
    public ResponseEntity<ApiResponse<List<ProjectMemberResponse>>> getMembers(
            @PathVariable UUID projectId) {
        List<ProjectMemberResponse> members = projectMemberService.getMembers(projectId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thành viên thành công", members));
    }

    @PostMapping("/{projectId}/members")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'PROJECT_MANAGE_MEMBERS')")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> addMember(
            @PathVariable UUID projectId,
            @Valid @RequestBody AddMemberRequest request) {
        ProjectMemberResponse response = projectMemberService.addMember(projectId, request);
        return new ResponseEntity<>(ApiResponse.success("Thêm thành viên vào dự án thành công", response), HttpStatus.CREATED);
    }

    @PutMapping("/{projectId}/members/{userId}/role")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'PROJECT_MANAGE_MEMBERS')")
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> updateMemberRole(
            @PathVariable UUID projectId,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateMemberRoleRequest request) {
        ProjectMemberResponse response = projectMemberService.updateMemberRole(projectId, userId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò thành viên thành công", response));
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    @PreAuthorize("@projectSecurity.canRemoveMember(#projectId, #userId)")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable UUID projectId,
            @PathVariable UUID userId) {
        projectMemberService.removeMember(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success("Xóa thành viên khỏi dự án thành công", null));
    }
}

