package com.knowledgebase.api.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserResponse {
    private UUID id;
    private String email;
    private String fullName;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private Set<String> roles;
}
