package com.knowledgebase.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgebase.api.dto.request.LoginRequest;
import com.knowledgebase.api.dto.request.RefreshTokenRequest;
import com.knowledgebase.api.dto.request.RegisterRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private com.knowledgebase.api.repository.UserRepository userRepository;

    private MockMvc mockMvc;

    private static String savedAccessToken;
    private static String savedRefreshToken;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @org.junit.jupiter.api.BeforeAll
    static void init(@Autowired com.knowledgebase.api.repository.UserRepository userRepo) {
        userRepo.findByEmail("testuser@example.com").ifPresent(userRepo::delete);
    }

    @org.junit.jupiter.api.AfterAll
    static void cleanUp(@Autowired com.knowledgebase.api.repository.UserRepository userRepo) {
        userRepo.findByEmail("testuser@example.com").ifPresent(userRepo::delete);
    }

    @Test
    @Order(1)
    @DisplayName("Should successfully register a new user")
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("testuser@example.com")
                .password("Password123")
                .fullName("Test User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đăng ký tài khoản thành công"));
    }

    @Test
    @Order(2)
    @DisplayName("Should fail when registering duplicate email")
    void testRegisterDuplicateEmail() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("testuser@example.com")
                .password("Password123")
                .fullName("Test User Duplicate")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("EMAIL_ALREADY_EXISTS"));
    }

    @Test
    @Order(3)
    @DisplayName("Should fail when register password is too short")
    void testRegisterInvalidPassword() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("invalid@example.com")
                .password("short")
                .fullName("Invalid User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
    }

    @Test
    @Order(4)
    @DisplayName("Should successfully login with registered credentials and return tokens & RBAC permissions")
    void testLoginSuccess() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("testuser@example.com")
                .password("Password123")
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.email").value("testuser@example.com"))
                .andExpect(jsonPath("$.data.user.fullName").value("Test User"))
                .andExpect(jsonPath("$.data.user.systemRoles", hasItem("ROLE_SYSTEM_USER")))
                .andExpect(jsonPath("$.data.tokens.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.tokens.refreshToken").isNotEmpty())
                .andReturn();

        String responseJson = result.getResponse().getContentAsString();
        savedAccessToken = objectMapper.readTree(responseJson).at("/data/tokens/accessToken").asText();
        savedRefreshToken = objectMapper.readTree(responseJson).at("/data/tokens/refreshToken").asText();
    }

    @Test
    @Order(5)
    @DisplayName("Should fail login with wrong password")
    void testLoginWrongPassword() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("testuser@example.com")
                .password("WrongPassword")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    @Test
    @Order(6)
    @DisplayName("Should fetch current user profile with valid Access Token")
    void testGetProfileSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + savedAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("testuser@example.com"))
                .andExpect(jsonPath("$.data.fullName").value("Test User"));
    }

    @Test
    @Order(7)
    @DisplayName("Should reject profile request without token")
    void testGetProfileUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    @Order(8)
    @DisplayName("Should successfully refresh token")
    void testRefreshTokenSuccess() throws Exception {
        RefreshTokenRequest request = RefreshTokenRequest.builder()
                .refreshToken(savedRefreshToken)
                .build();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test
    @Order(9)
    @DisplayName("Should login with default system admin account")
    void testDefaultAdminLogin() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("admin@knowledgebase.com")
                .password("Admin12345")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.email").value("admin@knowledgebase.com"))
                .andExpect(jsonPath("$.data.user.systemRoles", hasItem("ROLE_SYSTEM_ADMIN")))
                .andExpect(jsonPath("$.data.user.permissions", hasItem("PROJECT_CREATE")));
    }
}
