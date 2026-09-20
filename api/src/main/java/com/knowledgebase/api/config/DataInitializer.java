package com.knowledgebase.api.config;

import com.knowledgebase.api.domain.entity.*;
import com.knowledgebase.api.domain.enums.AppPermission;
import com.knowledgebase.api.domain.enums.ProjectRole;
import com.knowledgebase.api.domain.enums.SystemRole;
import com.knowledgebase.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final DocumentRepository documentRepository;
    private final com.knowledgebase.api.service.MinioStorageService minioStorageService;
    private final com.knowledgebase.api.service.ai.DocumentIngestionService documentIngestionService;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking and seeding RBAC initial data...");

        // 1. Seed Permissions from AppPermission enum
        Map<AppPermission, Permission> permissions = new EnumMap<>(AppPermission.class);
        for (AppPermission appPerm : AppPermission.values()) {
            Permission perm = permissionRepository.findByAppPermission(appPerm)
                    .orElseGet(() -> permissionRepository.save(
                            Permission.builder()
                                    .name(appPerm.getCode())
                                    .description(appPerm.getDescription())
                                    .build()
                    ));
            permissions.put(appPerm, perm);
        }

        // 2. Seed Roles
        // 2.1 System Admin Role
        Role systemAdminRole = roleRepository.findBySystemRole(SystemRole.ROLE_SYSTEM_ADMIN)
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                                .name(SystemRole.ROLE_SYSTEM_ADMIN.getRoleName())
                                .isSystemRole(true)
                                .permissions(new HashSet<>(permissions.values()))
                                .build()
                ));

        // 2.2 System User Role
        Role systemUserRole = roleRepository.findBySystemRole(SystemRole.ROLE_SYSTEM_USER)
                .orElseGet(() -> {
                    Set<Permission> userPerms = new HashSet<>();
                    userPerms.add(permissions.get(AppPermission.PROJECT_CREATE));
                    userPerms.add(permissions.get(AppPermission.PROJECT_READ));
                    userPerms.add(permissions.get(AppPermission.DOC_READ));
                    return roleRepository.save(
                            Role.builder()
                                    .name(SystemRole.ROLE_SYSTEM_USER.getRoleName())
                                    .isSystemRole(true)
                                    .permissions(userPerms)
                                    .build()
                    );
                });

        // 2.3 Project Roles (Owner, Manager, Editor, Viewer)
        Role ownerRole = getOrCreateProjectRole(ProjectRole.OWNER, permissions);
        Role managerRole = getOrCreateProjectRole(ProjectRole.MANAGER, permissions);
        Role editorRole = getOrCreateProjectRole(ProjectRole.EDITOR, permissions);
        Role viewerRole = getOrCreateProjectRole(ProjectRole.VIEWER, permissions);

        // 3. Seed Default Admin User
        String adminEmail = "admin@knowledgebase.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .email(adminEmail)
                    .password(passwordEncoder.encode("Admin12345"))
                    .fullName("System Administrator")
                    .roles(Set.of(systemAdminRole))
                    .build();
            userRepository.save(admin);
            log.info("Default Admin created: {} / Admin12345", adminEmail);
        }

        // 4. Seed Demo Project with 4 Member Roles (Owner, Manager, Editor, Viewer)
        seedDemoProject(systemUserRole, ownerRole, managerRole, editorRole, viewerRole);

        log.info("RBAC Seeding completed successfully.");
    }

    private void seedDemoProject(Role systemUserRole, Role ownerRole, Role managerRole, Role editorRole, Role viewerRole) {
        // 4.1 Create test users for each role
        User ownerUser = getOrCreateUser("owner@knowledgebase.com", "Nguyễn Văn Owner", systemUserRole);
        User managerUser = getOrCreateUser("manager@knowledgebase.com", "Trần Thị Manager", systemUserRole);
        User editorUser = getOrCreateUser("editor@knowledgebase.com", "Lê Văn Editor", systemUserRole);
        User viewerUser = getOrCreateUser("viewer@knowledgebase.com", "Phạm Thị Viewer", systemUserRole);

        // 4.2 Create Demo Project
        String demoProjectName = "Dự Án Mẫu Đầy Đủ Phân Quyền (RBAC Demo)";
        Project demoProject = projectRepository.findAll().stream()
                .filter(p -> demoProjectName.equals(p.getName()) && !Boolean.TRUE.equals(p.getIsDeleted()))
                .findFirst()
                .orElseGet(() -> projectRepository.save(
                        Project.builder()
                                .name(demoProjectName)
                                .description("Dự án mẫu kiểm thử tất cả các vai trò (Owner, Manager, Editor, Viewer) và trải nghiệm tải lên, xem trước, tải về tài liệu qua MinIO S3.")
                                .createdBy(ownerUser.getId())
                                .build()
                ));

        // 4.3 Add Members to Project
        addMemberIfNotExist(demoProject, ownerUser, ownerRole);
        addMemberIfNotExist(demoProject, managerUser, managerRole);
        addMemberIfNotExist(demoProject, editorUser, editorRole);
        addMemberIfNotExist(demoProject, viewerUser, viewerRole);

        // 4.4 Add Sample Documents
        createSampleDocument(demoProject, ownerUser, "Ke_hoach_kinh_doanh_2026.pdf", "application/pdf",
                "%PDF-1.4\n1 0 obj\n<< /Title (Ke hoach kinh doanh 2026) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
        createSampleDocument(demoProject, editorUser, "Bao_cao_tai_chinh_quy_3.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Nội dung báo cáo tài chính quý 3 - Knowledge Base Enterprise System.");
        createSampleDocument(demoProject, managerUser, "Huong_dan_su_dung_he_thong.md", "text/markdown",
                "# Hướng dẫn sử dụng hệ thống Knowledge Base\n\n- **Owner**: Toàn quyền trên dự án và tài liệu.\n- **Manager**: Quản lý thành viên và tài liệu.\n- **Editor**: Quản lý tài liệu (tải lên, tải về, xóa).\n- **Viewer**: Chỉ xem và tải về tài liệu.");

        // 4.5 Auto-ingest any documents remaining in PENDING state
        documentRepository.findAll().stream()
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()) && d.getIndexingStatus() == com.knowledgebase.api.domain.enums.DocumentIndexingStatus.PENDING)
                .forEach(d -> {
                    try {
                        documentIngestionService.ingestDocumentAsync(d.getId());
                    } catch (Exception e) {
                        log.warn("Could not start background ingestion for documentId={}: {}", d.getId(), e.getMessage());
                    }
                });

        log.info("Demo project seeded successfully: '{}' with 4 members and sample documents.", demoProjectName);
    }

    private User getOrCreateUser(String email, String fullName, Role systemRole) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User u = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode("Password123"))
                    .fullName(fullName)
                    .roles(systemRole != null ? Set.of(systemRole) : Set.of())
                    .build();
            return userRepository.save(u);
        });
    }

    private void addMemberIfNotExist(Project project, User user, Role role) {
        if (!projectMemberRepository.existsByProjectIdAndUserId(project.getId(), user.getId())) {
            projectMemberRepository.save(
                    ProjectMember.builder()
                            .id(new ProjectMemberId(project.getId(), user.getId()))
                            .project(project)
                            .user(user)
                            .role(role)
                            .joinedAt(java.time.LocalDateTime.now())
                            .build()
            );
        }
    }

    private void createSampleDocument(Project project, User uploader, String filename, String mimeType, String content) {
        String objectKey = String.format("projects/%s/demo_%s", project.getId(), filename);
        if (documentRepository.existsByObjectKey(objectKey)) {
            return;
        }

        byte[] bytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        try {
            minioStorageService.uploadFile(objectKey, new java.io.ByteArrayInputStream(bytes), bytes.length, mimeType);
        } catch (Exception e) {
            log.warn("Could not upload demo file to MinIO: {}", e.getMessage());
        }

        Document savedDoc = documentRepository.save(
                Document.builder()
                        .project(project)
                        .originalName(filename)
                        .fileType(mimeType)
                        .fileSizeBytes((long) bytes.length)
                        .objectKey(objectKey)
                        .uploadedBy(uploader)
                        .build()
        );

        try {
            documentIngestionService.ingestDocumentAsync(savedDoc.getId());
        } catch (Exception e) {
            log.warn("Could not trigger async ingestion for demo document '{}': {}", filename, e.getMessage());
        }
    }

    private Role getOrCreateProjectRole(ProjectRole projectRole, Map<AppPermission, Permission> permissions) {
        return roleRepository.findByProjectRole(projectRole)
                .orElseGet(() -> {
                    Set<Permission> rolePerms = projectRole.getDefaultPermissions().stream()
                            .map(permissions::get)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());
                    return roleRepository.save(
                            Role.builder()
                                    .name(projectRole.getRoleName())
                                    .isSystemRole(false)
                                    .permissions(rolePerms)
                                    .build()
                    );
                });
    }
}
