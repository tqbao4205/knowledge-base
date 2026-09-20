package com.knowledgebase.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgebase.api.domain.entity.Project;
import com.knowledgebase.api.domain.entity.ProjectMember;
import com.knowledgebase.api.domain.entity.ProjectMemberId;
import com.knowledgebase.api.domain.entity.Role;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.repository.DocumentRepository;
import com.knowledgebase.api.repository.ProjectMemberRepository;
import com.knowledgebase.api.repository.ProjectRepository;
import com.knowledgebase.api.repository.RoleRepository;
import com.knowledgebase.api.repository.UserRepository;
import com.knowledgebase.api.security.JwtTokenProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class DocumentControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectMemberRepository projectMemberRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static String ownerToken;
    private static String viewerToken;
    private static String outsiderToken;
    private static UUID testProjectId;
    private static UUID uploadedDocId;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @BeforeAll
    static void initTestData(
            @Autowired UserRepository userRepo,
            @Autowired RoleRepository roleRepo,
            @Autowired ProjectRepository projRepo,
            @Autowired ProjectMemberRepository memberRepo,
            @Autowired DocumentRepository docRepo,
            @Autowired com.knowledgebase.api.repository.DocumentChunkRepository chunkRepo,
            @Autowired PasswordEncoder encoder,
            @Autowired JwtTokenProvider tokenProv) {

        // Clean up only test project data from previous runs
        projRepo.findAll().stream()
                .filter(p -> "Dự án Tài Liệu MinIO".equals(p.getName()))
                .forEach(p -> {
                    docRepo.findByProjectIdWithUploader(p.getId(), org.springframework.data.domain.Pageable.unpaged())
                            .forEach(d -> {
                                chunkRepo.deleteByDocumentId(d.getId());
                                docRepo.delete(d);
                            });
                    memberRepo.deleteAll(memberRepo.findByProjectIdWithDetails(p.getId()));
                    projRepo.delete(p);
                });
        userRepo.findByEmail("doc_owner@example.com").ifPresent(userRepo::delete);
        userRepo.findByEmail("doc_viewer@example.com").ifPresent(userRepo::delete);
        userRepo.findByEmail("doc_outsider@example.com").ifPresent(userRepo::delete);

        Role userRole = roleRepo.findByName("ROLE_SYSTEM_USER").orElse(null);
        Role ownerRole = roleRepo.findByName("Owner").orElseThrow();
        Role viewerRole = roleRepo.findByName("Viewer").orElseThrow();

        // 1. Owner User
        User owner = userRepo.save(User.builder()
                .email("doc_owner@example.com")
                .fullName("Doc Project Owner")
                .password(encoder.encode("Password123"))
                .roles(userRole != null ? Set.of(userRole) : Set.of())
                .build());
        ownerToken = tokenProv.generateAccessToken(owner);

        // 2. Viewer User
        User viewer = userRepo.save(User.builder()
                .email("doc_viewer@example.com")
                .fullName("Doc Project Viewer")
                .password(encoder.encode("Password123"))
                .roles(userRole != null ? Set.of(userRole) : Set.of())
                .build());
        viewerToken = tokenProv.generateAccessToken(viewer);

        // 3. Outsider User
        User outsider = userRepo.save(User.builder()
                .email("doc_outsider@example.com")
                .fullName("Doc Outsider")
                .password(encoder.encode("Password123"))
                .roles(userRole != null ? Set.of(userRole) : Set.of())
                .build());
        outsiderToken = tokenProv.generateAccessToken(outsider);

        // 4. Create Project
        Project project = projRepo.save(Project.builder()
                .name("Dự án Tài Liệu MinIO")
                .description("Dự án kiểm thử Phase 3 Document Management")
                .createdBy(owner.getId())
                .build());
        testProjectId = project.getId();

        // 5. Add Owner & Viewer to Project
        memberRepo.save(ProjectMember.builder()
                .id(new ProjectMemberId(project.getId(), owner.getId()))
                .project(project)
                .user(owner)
                .role(ownerRole)
                .joinedAt(LocalDateTime.now())
                .build());

        memberRepo.save(ProjectMember.builder()
                .id(new ProjectMemberId(project.getId(), viewer.getId()))
                .project(project)
                .user(viewer)
                .role(viewerRole)
                .joinedAt(LocalDateTime.now())
                .build());
    }

    @AfterAll
    static void cleanup(
            @Autowired UserRepository userRepo,
            @Autowired ProjectRepository projRepo,
            @Autowired ProjectMemberRepository memberRepo,
            @Autowired DocumentRepository docRepo) {
        if (testProjectId != null) {
            docRepo.findAll().stream()
                    .filter(d -> testProjectId.equals(d.getProject().getId()))
                    .forEach(docRepo::delete);
            memberRepo.findAll().stream()
                    .filter(m -> testProjectId.equals(m.getProject().getId()))
                    .forEach(memberRepo::delete);
            projRepo.findById(testProjectId).ifPresent(projRepo::delete);
        }
        userRepo.findByEmail("doc_owner@example.com").ifPresent(userRepo::delete);
        userRepo.findByEmail("doc_viewer@example.com").ifPresent(userRepo::delete);
        userRepo.findByEmail("doc_outsider@example.com").ifPresent(userRepo::delete);
    }

    @Test
    @Order(1)
    @DisplayName("Should successfully upload a document to MinIO and save metadata (201 Created)")
    void testUploadDocumentSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "bao_cao_tai_chinh.pdf",
                "application/pdf",
                "Sample PDF content for MinIO upload test".getBytes()
        );

        MvcResult result = mockMvc.perform(multipart("/api/v1/projects/" + testProjectId + "/documents")
                        .file(file)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.originalName").value("bao_cao_tai_chinh.pdf"))
                .andExpect(jsonPath("$.data.fileType").value("application/pdf"))
                .andExpect(jsonPath("$.data.fileSizeBytes").isNumber())
                .andExpect(jsonPath("$.data.uploadedBy.email").value("doc_owner@example.com"))
                .andReturn();

        String json = result.getResponse().getContentAsString();
        uploadedDocId = UUID.fromString(objectMapper.readTree(json).at("/data/id").asText());
        Assertions.assertNotNull(uploadedDocId);
    }

    @Test
    @Order(2)
    @DisplayName("Should reject upload with invalid extension (.exe) with 415 Unsupported Media Type")
    void testUploadInvalidExtension() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "virus.exe",
                "application/octet-stream",
                "Dangerous executable content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/projects/" + testProjectId + "/documents")
                        .file(file)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_FILE_TYPE"));
    }

    @Test
    @Order(3)
    @DisplayName("Should reject upload when empty file with 400 Bad Request")
    void testUploadEmptyFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "empty.pdf",
                "application/pdf",
                new byte[0]
        );

        mockMvc.perform(multipart("/api/v1/projects/" + testProjectId + "/documents")
                        .file(file)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
    }

    @Test
    @Order(4)
    @DisplayName("Should reject Viewer from uploading document (403 Forbidden - no DOC_CREATE)")
    void testViewerCannotUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "viewer_doc.pdf",
                "application/pdf",
                "Viewer file content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/projects/" + testProjectId + "/documents")
                        .file(file)
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Order(5)
    @DisplayName("Should reject Outsider from accessing project documents (403 Forbidden)")
    void testOutsiderCannotViewDocuments() throws Exception {
        mockMvc.perform(get("/api/v1/projects/" + testProjectId + "/documents")
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Order(6)
    @DisplayName("Should allow Viewer to list documents in project (200 OK)")
    void testViewerCanListDocuments() throws Exception {
        mockMvc.perform(get("/api/v1/projects/" + testProjectId + "/documents")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data.content[0].originalName").value("bao_cao_tai_chinh.pdf"));
    }

    @Test
    @Order(7)
    @DisplayName("Should generate a valid presigned download URL from MinIO (200 OK)")
    void testGeneratePresignedDownloadUrl() throws Exception {
        mockMvc.perform(get("/api/v1/projects/" + testProjectId + "/documents/" + uploadedDocId + "/download-url")
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.url", containsString("knowledge-base")))
                .andExpect(jsonPath("$.data.expiresInSeconds").value(300));
    }

    @Test
    @Order(8)
    @DisplayName("Should deny Viewer from deleting document uploaded by Owner (403 Forbidden)")
    void testViewerCannotDeleteOthersDocument() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/" + testProjectId + "/documents/" + uploadedDocId)
                        .header("Authorization", "Bearer " + viewerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Order(9)
    @DisplayName("Should allow Owner to delete document (200 OK)")
    void testOwnerCanDeleteDocument() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/" + testProjectId + "/documents/" + uploadedDocId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify document is soft-deleted
        Assertions.assertTrue(documentRepository.findById(uploadedDocId).orElseThrow().getIsDeleted());

        // Verify it no longer appears in active list
        mockMvc.perform(get("/api/v1/projects/" + testProjectId + "/documents")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(0)));
    }
}
