package com.knowledgebase.api.dto.response;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponse {
    @Builder.Default
    private boolean success = false;
    private String message;
    private String errorCode;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
