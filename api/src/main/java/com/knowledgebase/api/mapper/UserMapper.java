package com.knowledgebase.api.mapper;

import com.knowledgebase.api.domain.entity.Permission;
import com.knowledgebase.api.domain.entity.Role;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.dto.response.UserResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "systemRoles", source = "roles", qualifiedByName = "mapSystemRoles")
    @Mapping(target = "permissions", source = "roles", qualifiedByName = "mapPermissions")
    UserResponse toUserResponse(User user);

    @Named("mapSystemRoles")
    default Set<String> mapSystemRoles(Set<Role> roles) {
        if (roles == null) {
            return Set.of();
        }
        return roles.stream()
                .filter(Role::getIsSystemRole)
                .map(Role::getName)
                .collect(Collectors.toSet());
    }

    @Named("mapPermissions")
    default Set<String> mapPermissions(Set<Role> roles) {
        if (roles == null) {
            return Set.of();
        }
        return roles.stream()
                .flatMap(r -> r.getPermissions() != null ? r.getPermissions().stream() : java.util.stream.Stream.empty())
                .map(Permission::getName)
                .collect(Collectors.toSet());
    }
}
