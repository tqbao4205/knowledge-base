package com.knowledgebase.api.service;

import com.knowledgebase.api.domain.entity.Role;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.domain.enums.SystemRole;
import com.knowledgebase.api.dto.request.LoginRequest;
import com.knowledgebase.api.dto.request.RefreshTokenRequest;
import com.knowledgebase.api.dto.request.RegisterRequest;
import com.knowledgebase.api.dto.response.AuthResponse;
import com.knowledgebase.api.dto.response.TokenResponse;
import com.knowledgebase.api.dto.response.UserResponse;
import com.knowledgebase.api.exception.ApiException;
import com.knowledgebase.api.exception.ErrorCode;
import com.knowledgebase.api.mapper.UserMapper;
import com.knowledgebase.api.repository.RoleRepository;
import com.knowledgebase.api.repository.UserRepository;
import com.knowledgebase.api.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserMapper userMapper;

    @Transactional
    public void register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        Set<Role> roles = new HashSet<>();
        roleRepository.findBySystemRole(SystemRole.ROLE_SYSTEM_USER).ifPresent(roles::add);

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .roles(roles)
                .build();

        userRepository.save(user);
        log.info("Successfully registered user with email: {}", email);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        // Will throw BadCredentialsException caught by GlobalExceptionHandler if credentials invalid
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        User user = userRepository.findByEmailWithRolesAndPermissions(email)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        String accessToken = tokenProvider.generateAccessToken(user);
        String refreshToken = tokenProvider.generateRefreshToken(user);

        return AuthResponse.builder()
                .user(userMapper.toUserResponse(user))
                .tokens(TokenResponse.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public TokenResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!tokenProvider.validateToken(refreshToken) || !tokenProvider.isRefreshToken(refreshToken)) {
            throw new ApiException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        String email = tokenProvider.getEmailFromToken(refreshToken);
        User user = userRepository.findByEmailWithRolesAndPermissions(email)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        String newAccessToken = tokenProvider.generateAccessToken(user);
        String newRefreshToken = tokenProvider.generateRefreshToken(user);

        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailWithRolesAndPermissions(email.trim().toLowerCase())
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        return userMapper.toUserResponse(user);
    }
}
