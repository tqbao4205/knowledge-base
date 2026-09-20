package com.knowledgebase.api.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatConversationResponse {
    private UUID id;
    private UUID projectId;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
