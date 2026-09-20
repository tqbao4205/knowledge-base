package com.knowledgebase.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgebase.api.domain.entity.Project;
import com.knowledgebase.api.domain.entity.ProjectMember;
import com.knowledgebase.api.domain.entity.ProjectMemberId;
import com.knowledgebase.api.domain.entity.Role;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.dto.request.CreateConversationRequest;
import com.knowledgebase.api.repository.*;
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

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ChatControllerTest {

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
    private ChatConversationRepository conversationRepository;

    @Autowired
    private ChatMessageRepository messageRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static String memberToken;
    private static String outsiderToken;
    private static UUID testProjectId;
    private static UUID createdConvId;

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
            @Autowired PasswordEncoder encoder,
            @Autowired JwtTokenProvider jwt) {

        Role userRole = roleRepo.findByName("ROLE_SYSTEM_USER").orElse(null);
        Role viewerRole = roleRepo.findByName("Viewer").orElseThrow();

        // 1. Tạo chat member
        User chatUser = userRepo.findByEmail("chatuser@kb.local").orElseGet(() ->
                userRepo.save(User.builder()
                        .email("chatuser@kb.local")
                        .fullName("Chat User")
                        .password(encoder.encode("Secret123!"))
                        .roles(userRole != null ? Set.of(userRole) : Set.of())
                        .build())
        );

        // 2. Tạo outsider
        User outsider = userRepo.findByEmail("chatoutsider@kb.local").orElseGet(() ->
                userRepo.save(User.builder()
                        .email("chatoutsider@kb.local")
                        .fullName("Chat Outsider")
                        .password(encoder.encode("Secret123!"))
                        .roles(userRole != null ? Set.of(userRole) : Set.of())
                        .build())
        );

        memberToken = "Bearer " + jwt.generateAccessToken(chatUser);
        outsiderToken = "Bearer " + jwt.generateAccessToken(outsider);

        // 3. Tạo project test
        Project project = projRepo.save(Project.builder()
                .name("Chat Test Project " + UUID.randomUUID().toString().substring(0, 8))
                .description("Project for testing AI chat endpoints")
                .createdBy(chatUser.getId())
                .build());
        testProjectId = project.getId();

        // Add member
        memberRepo.save(ProjectMember.builder()
                .id(new ProjectMemberId(project.getId(), chatUser.getId()))
                .project(project)
                .user(chatUser)
                .role(viewerRole)
                .joinedAt(LocalDateTime.now())
                .build());
    }

    @Test
    @Order(1)
    void testCreateConversation_Success() throws Exception {
        CreateConversationRequest request = new CreateConversationRequest();
        request.setTitle("Hội thoại tìm hiểu kiến trúc hệ thống");

        MvcResult result = mockMvc.perform(post("/api/v1/projects/" + testProjectId + "/chat/conversations")
                        .header("Authorization", memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.title", is("Hội thoại tìm hiểu kiến trúc hệ thống")))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andReturn();

        String respStr = result.getResponse().getContentAsString();
        createdConvId = UUID.fromString(objectMapper.readTree(respStr).get("data").get("id").asText());
    }

    @Test
    @Order(2)
    void testGetConversations_Success() throws Exception {
        mockMvc.perform(get("/api/v1/projects/" + testProjectId + "/chat/conversations")
                        .header("Authorization", memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].title", is("Hội thoại tìm hiểu kiến trúc hệ thống")));
    }

    @Test
    @Order(3)
    void testGetMessages_Success() throws Exception {
        mockMvc.perform(get("/api/v1/projects/" + testProjectId + "/chat/conversations/" + createdConvId + "/messages")
                        .header("Authorization", memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", is(empty())));
    }

    @Test
    @Order(4)
    void testAccessChat_Outsider_Forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/projects/" + testProjectId + "/chat/conversations")
                        .header("Authorization", outsiderToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(5)
    void testDeleteConversation_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/" + testProjectId + "/chat/conversations/" + createdConvId)
                        .header("Authorization", memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // Verify conversation is gone
        mockMvc.perform(get("/api/v1/projects/" + testProjectId + "/chat/conversations")
                        .header("Authorization", memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", is(empty())));
    }
}
