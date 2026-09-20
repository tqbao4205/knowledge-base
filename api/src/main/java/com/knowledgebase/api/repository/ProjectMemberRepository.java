package com.knowledgebase.api.repository;

import com.knowledgebase.api.domain.entity.ProjectMember;
import com.knowledgebase.api.domain.entity.ProjectMemberId;
import com.knowledgebase.api.domain.enums.ProjectRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, ProjectMemberId> {

    @Query("SELECT pm FROM ProjectMember pm JOIN FETCH pm.user u JOIN FETCH pm.role r LEFT JOIN FETCH r.permissions WHERE pm.id.projectId = :projectId ORDER BY pm.joinedAt ASC")
    List<ProjectMember> findByProjectIdWithDetails(@Param("projectId") UUID projectId);

    @Query("SELECT pm FROM ProjectMember pm JOIN FETCH pm.role r LEFT JOIN FETCH r.permissions WHERE pm.id.projectId = :projectId AND pm.id.userId = :userId")
    Optional<ProjectMember> findByProjectIdAndUserIdWithPermissions(@Param("projectId") UUID projectId, @Param("userId") UUID userId);

    @Query("SELECT CASE WHEN COUNT(pm) > 0 THEN true ELSE false END FROM ProjectMember pm WHERE pm.id.projectId = :projectId AND pm.id.userId = :userId")
    boolean existsByProjectIdAndUserId(@Param("projectId") UUID projectId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(pm) FROM ProjectMember pm WHERE pm.id.projectId = :projectId AND pm.role.name = :roleName")
    long countByProjectIdAndRoleName(@Param("projectId") UUID projectId, @Param("roleName") String roleName);

    default long countByProjectIdAndRole(UUID projectId, ProjectRole role) {
        return role != null ? countByProjectIdAndRoleName(projectId, role.getRoleName()) : 0;
    }

    @Modifying
    @Query("DELETE FROM ProjectMember pm WHERE pm.id.projectId = :projectId AND pm.id.userId = :userId")
    void deleteByProjectIdAndUserId(@Param("projectId") UUID projectId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(pm) FROM ProjectMember pm WHERE pm.id.projectId = :projectId")
    long countByProjectId(@Param("projectId") UUID projectId);
}
