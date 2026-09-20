package com.knowledgebase.api.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardStatsResponse {
    private long totalUsers;
    private long bannedUsers;
    private long totalProjects;
    private long totalDocuments;
    private long totalChunks;
    private DocumentStatusStats documentStatus;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DocumentStatusStats {
        private long indexed;
        private long processing;
        private long failed;
    }
}
