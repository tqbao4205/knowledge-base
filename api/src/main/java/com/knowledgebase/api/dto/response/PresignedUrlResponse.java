package com.knowledgebase.api.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PresignedUrlResponse {
    private String url;
    private int expiresInSeconds;
}
