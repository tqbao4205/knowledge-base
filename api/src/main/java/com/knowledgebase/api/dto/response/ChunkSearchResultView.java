package com.knowledgebase.api.dto.response;

import java.util.UUID;

public interface ChunkSearchResultView {
    UUID getId();
    UUID getDocumentId();
    String getDocumentName();
    String getContent();
    Integer getPageNumber();
    Integer getChunkIndex();
    Double getSimilarity();
}
