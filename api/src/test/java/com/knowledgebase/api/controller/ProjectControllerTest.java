package com.knowledgebase.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgebase.api.domain.entity.Role;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.dto.request.AddMemberRequest;
import com.knowledgebase.api.dto.request.CreateProjectRequest;
import com.knowledgebase.api.dto.request.UpdateMemberRoleRequest;
import com.knowledgebase.api.dto.request.UpdateProjectRequest;
import com.knowledgebase.api.repository.ProjectMemberRepository;
import com.knowledgebase.api.repository.ProjectRepository;
import com.knowledgebase.api.repository.RoleRepository;
import com.knowledgebase.api.repository.UserRepository;
import com.knowledgebase.api.security.JwtTokenProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ProjectControllerTest {

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
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static String ownerToken;
    private static String memberToken;
    private static String outsiderToken;
    private static UUID memberUserId;
    private static UUID createdProjectId;
    private static UUID managerRoleId;
    private static UUID editorRoleId;
    private static UUID viewerRoleId;

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
            @Autowired PasswordEncoder encoder,
            @Autowired JwtTokenProvider tokenProv) {

        Role userRole = roleRepo.findByName("ROLE_SYSTEM_USER").orElse(null);

        // 1. Owner User
        User owner = userRepo.findByEmail("proj_owner@example.com")
                .orElseGet(() -> userRepo.save(User.builder()
                        .email("proj_owner@example.com")
                        .fullName("Project Owner")
                        .password(encoder.encode("Password123"))
                        .roles(userRole != null ? Set.of(userRole) : Set.of())
                        .build()));
        ownerToken = tokenProv.generateAccessToken(owner);

        // 2. Member User
        User member = userRepo.findByEmail("proj_member@example.com")
                .orElseGet(() -> userRepo.save(User.builder()
                        .email("proj_member@example.com")
                        .fullName("Project Member")
                        .password(encoder.encode("Password123"))
                        .roles(userRole != null ? Set.of(userRole) : Set.of())
                        .build()));
        memberUserId = member.getId();
        memberToken = tokenProv.generateAccessToken(member);

        // 3. Outsider User (not in project)
        User outsider = userRepo.findByEmail("proj_outsider@example.com")
                .orElseGet(() -> userRepo.save(User.builder()
                        .email("proj_outsider@example.com")
                        .fullName("Project Outsider")
                        .password(encoder.encode("Password123"))
                        .roles(userRole != null ? Set.of(userRole) : Set.of())
                        .build()));
        outsiderToken = tokenProv.generateAccessToken(outsider);

        managerRoleId = roleRepo.findByName("Manager").map(Role::getId).orElse(null);
        editorRoleId = roleRepo.findByName("Editor").map(Role::getId).orElse(null);
        viewerRoleId = roleRepo.findByName("Viewer").map(Role::getId).orElse(null);
    }

    @AfterAll
    static void cleanup(
            @Autowired UserRepository userRepo,
            @Autowired ProjectRepository projRepo,
            @Autowired ProjectMemberRepository memberRepo) {
        if (createdProjectId != null) {
            memberRepo.findAll().stream()
                    .filter(m -> createdProjectId.equals(m.getProject().getId()))
                    .forEach(memberRepo::delete);
            projRepo.findById(createdProjectId).ifPresent(projRepo::delete);
        }
        userRepo.findByEmail("proj_owner@example.com").ifPresent(userRepo::delete);
        userRepo.findByEmail("proj_member@example.com").ifPresent(userRepo::delete);
        userRepo.findByEmail("proj_outsider@example.com").ifPresent(userRepo::delete);
    }

    @Test
    @Order(1)
    @DisplayName("Should successfully create a project and auto-assign creator as Owner")
    void testCreateProject() throws Exception {
        CreateProjectRequest request = CreateProjectRequest.builder()
                .name("Dự án Tích Hợp Test")
                .description("Mô tả dự án kiểm thử Phase 2")
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/projects")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Dự án Tích Hợp Test"))
                .andExpect(jsonPath("$.data.myRole").value("Owner"))
                .andExpect(jsonPath("$.data.memberCount").value(1))
                .andExpect(jsonPath("$.data.myPermissions", hasItem("PROJECT_MANAGE_MEMBERS")))
                .andReturn();

        String json = result.getResponse().getContentAsString();
        createdProjectId = UUID.fromString(objectMapper.readTree(json).at("/data/id").asText());
    }

    @Test
    @Order(2)
    @DisplayName("Should fetch my projects list with memberCount and myRole")
    void testGetMyProjects() throws Exception {
        mockMvc.perform(get("/api/v1/projects")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data.content[0].myRole").value("Owner"));
    }

    @Test
    @Order(3)
    @DisplayName("Should successfully add a member to the project with Editor role")
    void testAddMemberSuccess() throws Exception {
        AddMemberRequest request = AddMemberRequest.builder()
                .email("proj_member@example.com")
                .roleId(editorRoleId)
                .build();

        mockMvc.perform(post("/api/v1/projects/" + createdProjectId + "/members")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("proj_member@example.com"))
                .andExpect(jsonPath("$.data.roleName").value("Editor"));
    }

    @Test
    @Order(4)
    @DisplayName("Should reject adding member with unregistered email")
    void testAddMemberUnregisteredEmail() throws Exception {
        AddMemberRequest request = AddMemberRequest.builder()
                .email("notfound@example.com")
                .roleId(editorRoleId)
                .build();

        mockMvc.perform(post("/api/v1/projects/" + createdProjectId + "/members")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("USER_NOT_FOUND"));
    }

    @Test
    @Order(5)
    @DisplayName("Should reject adding already existing member")
    void testAddMemberDuplicate() throws Exception {
        AddMemberRequest request = AddMemberRequest.builder()
                .email("proj_member@example.com")
                .roleId(editorRoleId)
                .build();

        mockMvc.perform(post("/api/v1/projects/" + createdProjectId + "/members")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("USER_ALREADY_IN_PROJECT"));
    }

    @Test
    @Order(6)
    @DisplayName("Should deny outsider from accessing project details (403 Forbidden)")
    void testOutsiderAccessDenied() throws Exception {
        mockMvc.perform(get("/api/v1/projects/" + createdProjectId)
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Order(7)
    @DisplayName("Should deny member without PROJECT_UPDATE from updating project (403 Forbidden)")
    void testMemberWithoutPermissionCannotUpdate() throws Exception {
        UpdateProjectRequest request = UpdateProjectRequest.builder()
                .name("Hack Name")
                .description("Hack Desc")
                .build();

        // Member has Editor role (no PROJECT_UPDATE permission)
        mockMvc.perform(put("/api/v1/projects/" + createdProjectId)
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @Order(8)
    @DisplayName("Should allow Owner to update project details")
    void testOwnerCanUpdateProject() throws Exception {
        UpdateProjectRequest request = UpdateProjectRequest.builder()
                .name("Dự án Tích Hợp Đã Cập Nhật")
                .description("Mô tả mới")
                .build();

        mockMvc.perform(put("/api/v1/projects/" + createdProjectId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Dự án Tích Hợp Đã Cập Nhật"));
    }

    @Test
    @Order(9)
    @DisplayName("Should update member role to Manager")
    void testUpdateMemberRole() throws Exception {
        UpdateMemberRoleRequest request = UpdateMemberRoleRequest.builder()
                .roleId(managerRoleId)
                .build();

        mockMvc.perform(put("/api/v1/projects/" + createdProjectId + "/members/" + memberUserId + "/role")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.roleName").value("Manager"));
    }

    @Test
    @Order(10)
    @DisplayName("Should prevent demoting the only Owner of the project")
    void testPreventDemotingLastOwner() throws Exception {
        User owner = userRepository.findByEmail("proj_owner@example.com").orElseThrow();

        UpdateMemberRoleRequest request = UpdateMemberRoleRequest.builder()
                .roleId(viewerRoleId)
                .build();

        mockMvc.perform(put("/api/v1/projects/" + createdProjectId + "/members/" + owner.getId() + "/role")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("CANNOT_DEMOTE_LAST_OWNER"));
    }

    @Test
    @Order(11)
    @DisplayName("Should remove member from project")
    void testRemoveMember() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/" + createdProjectId + "/members/" + memberUserId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa thành viên khỏi dự án thành công"));
    }

    @Test
    @Order(12)
    @DisplayName("Should soft delete project")
    void testDeleteProject() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/" + createdProjectId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa dự án thành công"));

        // Subsequent detail fetch returns 404
        mockMvc.perform(get("/api/v1/projects/" + createdProjectId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNotFound());
    }
}
