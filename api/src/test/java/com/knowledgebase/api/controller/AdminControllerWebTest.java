package com.knowledgebase.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgebase.api.dto.request.UpdateUserRolesRequest;
import com.knowledgebase.api.dto.request.UpdateUserStatusRequest;
import com.knowledgebase.api.dto.response.*;
import com.knowledgebase.api.security.CustomUserDetails;
import com.knowledgebase.api.service.AdminService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AdminControllerWebTest {

    @Mock
    private AdminService adminService;

    @InjectMocks
    private AdminController adminController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminController)
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
                    }

                    @Override
                    public Object resolveArgument(MethodParameter parameter,
                                                  ModelAndViewContainer mavContainer,
                                                  NativeWebRequest webRequest,
                                                  WebDataBinderFactory binderFactory) {
                        return User.withUsername("admin@knowledgebase.com")
                                .password("dummy")
                                .authorities("ROLE_SYSTEM_ADMIN")
                                .build();
                    }
                })
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/admin/users - Trả về 200 OK kèm danh sách phân trang")
    void getAllUsers_success() throws Exception {
        AdminUserResponse userRes = AdminUserResponse.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .fullName("User Test")
                .isActive(true)
                .roles(Set.of("ROLE_SYSTEM_USER"))
                .build();

        PagedResponse<AdminUserResponse> pagedResponse = PagedResponse.<AdminUserResponse>builder()
                .content(List.of(userRes))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();

        when(adminService.getAllUsers(0, 20, null)).thenReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/admin/users")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].email").value("user@example.com"));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/users/{id}/status - Cập nhật trạng thái người dùng")
    void updateUserStatus_success() throws Exception {
        UUID userId = UUID.randomUUID();
        UpdateUserStatusRequest request = UpdateUserStatusRequest.builder()
                .isActive(false)
                .build();

        AdminUserResponse userRes = AdminUserResponse.builder()
                .id(userId)
                .email("user@example.com")
                .fullName("User Test")
                .isActive(false)
                .roles(Set.of("ROLE_SYSTEM_USER"))
                .build();

        when(adminService.updateUserStatus(eq(userId), eq(false), eq("admin@knowledgebase.com")))
                .thenReturn(userRes);

        mockMvc.perform(put("/api/v1/admin/users/{id}/status", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isActive").value(false));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/users/{id}/roles - Cập nhật danh sách quyền")
    void updateUserRoles_success() throws Exception {
        UUID userId = UUID.randomUUID();
        UpdateUserRolesRequest request = UpdateUserRolesRequest.builder()
                .roleNames(List.of("ADMIN", "USER"))
                .build();

        AdminUserResponse userRes = AdminUserResponse.builder()
                .id(userId)
                .email("user@example.com")
                .fullName("User Test")
                .isActive(true)
                .roles(Set.of("ROLE_SYSTEM_ADMIN", "ROLE_SYSTEM_USER"))
                .build();

        when(adminService.updateUserRoles(eq(userId), eq(List.of("ADMIN", "USER")), eq("admin@knowledgebase.com")))
                .thenReturn(userRes);

        mockMvc.perform(put("/api/v1/admin/users/{id}/roles", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.roles").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/admin/projects - Lấy danh sách dự án")
    void getAllProjects_success() throws Exception {
        AdminProjectResponse projRes = AdminProjectResponse.builder()
                .id(UUID.randomUUID())
                .name("Test Project")
                .description("Desc")
                .memberCount(3)
                .documentCount(10)
                .build();

        PagedResponse<AdminProjectResponse> pagedResponse = PagedResponse.<AdminProjectResponse>builder()
                .content(List.of(projRes))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();

        when(adminService.getAllProjects(0, 20, null)).thenReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/admin/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].name").value("Test Project"))
                .andExpect(jsonPath("$.data.content[0].memberCount").value(3))
                .andExpect(jsonPath("$.data.content[0].documentCount").value(10));
    }

    @Test
    @DisplayName("GET /api/v1/admin/projects/{id}/members - Xem danh sách thành viên dự án")
    void getProjectMembers_success() throws Exception {
        UUID projId = UUID.randomUUID();
        ProjectMemberResponse memberRes = ProjectMemberResponse.builder()
                .userId(UUID.randomUUID())
                .email("member@example.com")
                .fullName("Member Name")
                .roleName("EDITOR")
                .joinedAt(LocalDateTime.now())
                .build();

        when(adminService.getProjectMembers(projId)).thenReturn(List.of(memberRes));

        mockMvc.perform(get("/api/v1/admin/projects/{id}/members", projId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].email").value("member@example.com"))
                .andExpect(jsonPath("$.data[0].roleName").value("EDITOR"));
    }

    @Test
    @DisplayName("GET /api/v1/admin/dashboard/stats - Lấy số liệu thống kê Dashboard")
    void getDashboardStats_success() throws Exception {
        AdminDashboardStatsResponse stats = AdminDashboardStatsResponse.builder()
                .totalUsers(150)
                .bannedUsers(2)
                .totalProjects(40)
                .totalDocuments(1200)
                .totalChunks(35000)
                .documentStatus(AdminDashboardStatsResponse.DocumentStatusStats.builder()
                        .indexed(1150)
                        .processing(30)
                        .failed(20)
                        .build())
                .build();

        when(adminService.getDashboardStats()).thenReturn(stats);

        mockMvc.perform(get("/api/v1/admin/dashboard/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalUsers").value(150))
                .andExpect(jsonPath("$.data.bannedUsers").value(2))
                .andExpect(jsonPath("$.data.totalProjects").value(40))
                .andExpect(jsonPath("$.data.totalDocuments").value(1200))
                .andExpect(jsonPath("$.data.totalChunks").value(35000))
                .andExpect(jsonPath("$.data.documentStatus.indexed").value(1150))
                .andExpect(jsonPath("$.data.documentStatus.processing").value(30))
                .andExpect(jsonPath("$.data.documentStatus.failed").value(20));
    }
}
