package com.knowledgebase.api.repository;

import com.knowledgebase.api.domain.entity.Role;
import com.knowledgebase.api.domain.enums.ProjectRole;
import com.knowledgebase.api.domain.enums.SystemRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(String name);

    default Optional<Role> findByProjectRole(ProjectRole projectRole) {
        return projectRole != null ? findByName(projectRole.getRoleName()) : Optional.empty();
    }

    default Optional<Role> findBySystemRole(SystemRole systemRole) {
        return systemRole != null ? findByName(systemRole.getRoleName()) : Optional.empty();
    }
}
