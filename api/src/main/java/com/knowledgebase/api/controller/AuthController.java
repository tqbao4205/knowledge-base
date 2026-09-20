package com.knowledgebase.api.controller;

import com.knowledgebase.api.dto.request.LoginRequest;
import com.knowledgebase.api.dto.request.RefreshTokenRequest;
import com.knowledgebase.api.dto.request.RegisterRequest;
import com.knowledgebase.api.dto.response.ApiResponse;
import com.knowledgebase.api.dto.response.AuthResponse;
import com.knowledgebase.api.dto.response.TokenResponse;
import com.knowledgebase.api.dto.response.UserResponse;
import com.knowledgebase.api.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Authentication", description = "Endpoints for user registration, login, token refresh, and profile")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Register user", description = "Create a new user account with default system user role")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return new ResponseEntity<>(ApiResponse.success("Đăng ký tài khoản thành công", null), HttpStatus.CREATED);
    }

    @Operation(summary = "User login", description = "Authenticate with email and password to receive JWT access and refresh tokens")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    @Operation(summary = "Refresh access token", description = "Exchange a valid refresh token for a new access token")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        TokenResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Refresh token thành công", response));
    }

    @Operation(summary = "Get current user profile", description = "Retrieve current authenticated user information and permissions")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new com.knowledgebase.api.exception.ApiException(com.knowledgebase.api.exception.ErrorCode.UNAUTHORIZED);
        }
        UserResponse response = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", response));
    }
}
