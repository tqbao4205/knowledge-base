package com.knowledgebase.api.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentResponse {
    private UUID id;
    private UUID projectId;
    private String originalName;
    private String fileType;
    private Long fileSizeBytes;
    private UserSummaryResponse uploadedBy;
    private com.knowledgebase.api.domain.enums.DocumentIndexingStatus indexingStatus;
    private Integer chunkCount;
    private LocalDateTime indexedAt;
    private LocalDateTime createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserSummaryResponse {
        private UUID id;
        private String email;
        private String fullName;
    }
}
