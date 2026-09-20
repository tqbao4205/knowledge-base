package com.knowledgebase.api.mapper;

import com.knowledgebase.api.domain.entity.ProjectMember;
import com.knowledgebase.api.dto.response.ProjectMemberResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ProjectMemberMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "fullName", source = "user.fullName")
    @Mapping(target = "roleId", source = "role.id")
    @Mapping(target = "roleName", source = "role.name")
    @Mapping(target = "joinedAt", source = "joinedAt")
    ProjectMemberResponse toMemberResponse(ProjectMember member);

    List<ProjectMemberResponse> toMemberResponseList(List<ProjectMember> members);
}
