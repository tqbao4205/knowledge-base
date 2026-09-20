package com.knowledgebase.api.mapper;

import com.knowledgebase.api.domain.entity.Document;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.dto.response.DocumentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DocumentMapper {

    @Mapping(target = "projectId", source = "project.id")
    @Mapping(target = "uploadedBy", source = "uploadedBy")
    DocumentResponse toDocumentResponse(Document document);

    DocumentResponse.UserSummaryResponse toUserSummaryResponse(User user);

    List<DocumentResponse> toDocumentResponseList(List<Document> documents);
}
