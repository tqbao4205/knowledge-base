package com.knowledgebase.api.repository;

import com.knowledgebase.api.domain.entity.Permission;
import com.knowledgebase.api.domain.enums.AppPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    Optional<Permission> findByName(String name);

    default Optional<Permission> findByAppPermission(AppPermission appPermission) {
        return appPermission != null ? findByName(appPermission.getCode()) : Optional.empty();
    }
}
