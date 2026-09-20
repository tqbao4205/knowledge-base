package com.knowledgebase.api.dto.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CitationResponse {
    private UUID documentId;
    private String documentName;
    private Integer pageNumber;
    private String snippet;
    private Double similarity;
}
