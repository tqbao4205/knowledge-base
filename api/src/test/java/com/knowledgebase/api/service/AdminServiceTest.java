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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private DocumentChunkRepository documentChunkRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private ProjectMemberMapper projectMemberMapper;

    @InjectMocks
    private AdminService adminService;

    private User sampleUser;
    private Role adminRole;
    private Role userRole;

    @BeforeEach
    void setUp() {
        adminRole = Role.builder()
                .id(UUID.randomUUID())
                .name(SystemRole.ROLE_SYSTEM_ADMIN.getRoleName())
                .isSystemRole(true)
                .build();

        userRole = Role.builder()
                .id(UUID.randomUUID())
                .name(SystemRole.ROLE_SYSTEM_USER.getRoleName())
                .isSystemRole(true)
                .build();

        sampleUser = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .fullName("Regular User")
                .isActive(true)
                .roles(new HashSet<>(Set.of(userRole)))
                .build();
    }

    @Test
    @DisplayName("AdminService - getAllUsers trả về danh sách phân trang")
    void getAllUsers_success() {
        when(userRepository.searchUsers(eq("test"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleUser)));

        PagedResponse<AdminUserResponse> response = adminService.getAllUsers(0, 10, "test");

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getEmail()).isEqualTo("user@example.com");
        assertThat(response.getContent().get(0).getRoles()).contains("ROLE_SYSTEM_USER");
    }

    @Test
    @DisplayName("AdminService - updateUserStatus khóa tài khoản người dùng thành công")
    void updateUserStatus_success() {
        when(userRepository.findById(sampleUser.getId())).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminUserResponse response = adminService.updateUserStatus(sampleUser.getId(), false, "admin@example.com");

        assertThat(response.getIsActive()).isFalse();
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("AdminService - Admin không được tự khóa tài khoản của chính mình")
    void updateUserStatus_cannotDeactivateSelf() {
        when(userRepository.findById(sampleUser.getId())).thenReturn(Optional.of(sampleUser));

        assertThatThrownBy(() -> adminService.updateUserStatus(sampleUser.getId(), false, "user@example.com"))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.CANNOT_DEACTIVATE_SELF);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("AdminService - updateUserRoles thăng cấp user thành Admin thành công")
    void updateUserRoles_success() {
        when(userRepository.findById(sampleUser.getId())).thenReturn(Optional.of(sampleUser));
        when(roleRepository.findBySystemRole(SystemRole.ROLE_SYSTEM_ADMIN)).thenReturn(Optional.of(adminRole));
        when(roleRepository.findBySystemRole(SystemRole.ROLE_SYSTEM_USER)).thenReturn(Optional.of(userRole));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminUserResponse response = adminService.updateUserRoles(sampleUser.getId(), List.of("ADMIN", "USER"), "admin@example.com");

        assertThat(response.getRoles()).contains("ROLE_SYSTEM_ADMIN", "ROLE_SYSTEM_USER");
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("AdminService - Admin không thể tự gỡ quyền Admin của chính mình")
    void updateUserRoles_cannotRemoveAdminRoleFromSelf() {
        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@example.com")
                .fullName("Admin")
                .isActive(true)
                .roles(new HashSet<>(Set.of(adminRole)))
                .build();

        when(userRepository.findById(adminUser.getId())).thenReturn(Optional.of(adminUser));

        assertThatThrownBy(() -> adminService.updateUserRoles(adminUser.getId(), List.of("USER"), "admin@example.com"))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.CANNOT_REMOVE_ADMIN_ROLE_FROM_SELF);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("AdminService - getAllProjects trả về danh sách kèm metadata thành viên và tài liệu")
    void getAllProjects_success() {
        UUID projId = UUID.randomUUID();
        Project project = Project.builder()
                .id(projId)
                .name("Project Alpha")
                .description("Demo Project")
                .build();
        project.setCreatedAt(LocalDateTime.now());

        when(projectRepository.searchProjects(eq(null), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(project)));
        when(projectMemberRepository.countByProjectId(projId)).thenReturn(5L);
        when(documentRepository.countByProjectIdAndIsDeletedFalse(projId)).thenReturn(12L);

        PagedResponse<AdminProjectResponse> response = adminService.getAllProjects(0, 10, null);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        AdminProjectResponse projRes = response.getContent().get(0);
        assertThat(projRes.getName()).isEqualTo("Project Alpha");
        assertThat(projRes.getMemberCount()).isEqualTo(5L);
        assertThat(projRes.getDocumentCount()).isEqualTo(12L);
    }

    @Test
    @DisplayName("AdminService - getDashboardStats trả về đầy đủ các chỉ số thống kê hệ thống")
    void getDashboardStats_success() {
        when(userRepository.countByIsDeletedFalse()).thenReturn(100L);
        when(userRepository.countByIsActiveFalseAndIsDeletedFalse()).thenReturn(3L);
        when(projectRepository.countByIsDeletedFalse()).thenReturn(20L);
        when(documentRepository.countByIsDeletedFalse()).thenReturn(450L);
        when(documentChunkRepository.count()).thenReturn(12500L);

        when(documentRepository.countByIndexingStatusAndIsDeletedFalse(DocumentIndexingStatus.INDEXED)).thenReturn(400L);
        when(documentRepository.countByIndexingStatusAndIsDeletedFalse(DocumentIndexingStatus.PROCESSING)).thenReturn(30L);
        when(documentRepository.countByIndexingStatusAndIsDeletedFalse(DocumentIndexingStatus.FAILED)).thenReturn(20L);

        AdminDashboardStatsResponse stats = adminService.getDashboardStats();

        assertThat(stats.getTotalUsers()).isEqualTo(100L);
        assertThat(stats.getBannedUsers()).isEqualTo(3L);
        assertThat(stats.getTotalProjects()).isEqualTo(20L);
        assertThat(stats.getTotalDocuments()).isEqualTo(450L);
        assertThat(stats.getTotalChunks()).isEqualTo(12500L);
        assertThat(stats.getDocumentStatus().getIndexed()).isEqualTo(400L);
        assertThat(stats.getDocumentStatus().getProcessing()).isEqualTo(30L);
        assertThat(stats.getDocumentStatus().getFailed()).isEqualTo(20L);
    }
}
