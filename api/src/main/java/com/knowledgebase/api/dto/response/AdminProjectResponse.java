package com.knowledgebase.api.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProjectResponse {
    private UUID id;
    private String name;
    private String description;
    private long memberCount;
    private long documentCount;
    private LocalDateTime createdAt;
}
