package com.knowledgebase.api.mapper;

import com.knowledgebase.api.domain.entity.Project;
import com.knowledgebase.api.dto.response.ProjectDetailResponse;
import com.knowledgebase.api.dto.response.ProjectMemberResponse;
import com.knowledgebase.api.dto.response.ProjectResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;
import java.util.Set;

@Mapper(componentModel = "spring")
public interface ProjectMapper {

    @Mapping(target = "id", source = "project.id")
    @Mapping(target = "name", source = "project.name")
    @Mapping(target = "description", source = "project.description")
    @Mapping(target = "createdAt", source = "project.createdAt")
    @Mapping(target = "updatedAt", source = "project.updatedAt")
    @Mapping(target = "memberCount", source = "memberCount")
    @Mapping(target = "myRole", source = "myRole")
    @Mapping(target = "myPermissions", source = "myPermissions")
    ProjectResponse toProjectResponse(Project project, String myRole, Set<String> myPermissions, long memberCount);

    default ProjectDetailResponse toProjectDetailResponse(ProjectResponse project, List<ProjectMemberResponse> members) {
        return ProjectDetailResponse.builder()
                .project(project)
                .members(members)
                .build();
    }
}
