package com.knowledgebase.api.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMemberResponse {
    private UUID userId;
    private String email;
    private String fullName;
    private UUID roleId;
    private String roleName;
    private LocalDateTime joinedAt;
}
