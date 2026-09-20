package com.knowledgebase.api.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageResponse {
    private UUID id;
    private String senderType;
    private String content;
    private List<CitationResponse> citations;
    private LocalDateTime createdAt;
}
