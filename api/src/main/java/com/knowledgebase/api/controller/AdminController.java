package com.knowledgebase.api.controller;

import com.knowledgebase.api.dto.request.UpdateUserRolesRequest;
import com.knowledgebase.api.dto.request.UpdateUserStatusRequest;
import com.knowledgebase.api.dto.response.*;
import com.knowledgebase.api.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_SYSTEM_ADMIN', 'ROLE_ADMIN') or hasAnyRole('SYSTEM_ADMIN', 'ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PagedResponse<AdminUserResponse>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        PagedResponse<AdminUserResponse> response = adminService.getAllUsers(page, size, search);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng thành công", response));
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        AdminUserResponse response = adminService.updateUserStatus(id, request.getIsActive(), userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái người dùng thành công", response));
    }

    @PutMapping("/users/{id}/roles")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUserRoles(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRolesRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        AdminUserResponse response = adminService.updateUserRoles(id, request.getRoleNames(), userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật quyền người dùng thành công", response));
    }

    @GetMapping("/projects")
    public ResponseEntity<ApiResponse<PagedResponse<AdminProjectResponse>>> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        PagedResponse<AdminProjectResponse> response = adminService.getAllProjects(page, size, search);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách dự án thành công", response));
    }

    @GetMapping("/projects/{id}/members")
    public ResponseEntity<ApiResponse<List<ProjectMemberResponse>>> getProjectMembers(@PathVariable UUID id) {
        List<ProjectMemberResponse> response = adminService.getProjectMembers(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thành viên dự án thành công", response));
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<AdminDashboardStatsResponse>> getDashboardStats() {
        AdminDashboardStatsResponse response = adminService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success("Lấy chỉ số thống kê hệ thống thành công", response));
    }
}
