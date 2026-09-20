package com.knowledgebase.api.repository;

import com.knowledgebase.api.domain.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    Optional<Project> findByIdAndIsDeletedFalse(UUID id);

    boolean existsByIdAndIsDeletedFalse(UUID id);

    @Query("SELECT p FROM Project p JOIN p.members m WHERE m.user.id = :userId AND p.isDeleted = false ORDER BY p.createdAt DESC")
    Page<Project> findProjectsByUserId(@Param("userId") UUID userId, Pageable pageable);

    Page<Project> findByIsDeletedFalseOrderByCreatedAtDesc(Pageable pageable);

    @Query(value = "SELECT p FROM Project p WHERE p.isDeleted = false AND (:search IS NULL OR :search = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))) ORDER BY p.createdAt DESC",
           countQuery = "SELECT COUNT(p) FROM Project p WHERE p.isDeleted = false AND (:search IS NULL OR :search = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Project> searchProjects(@Param("search") String search, Pageable pageable);

    long countByIsDeletedFalse();
}
