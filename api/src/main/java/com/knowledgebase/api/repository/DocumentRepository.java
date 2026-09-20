package com.knowledgebase.api.repository;

import com.knowledgebase.api.domain.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    @Query(value = "SELECT d FROM Document d JOIN FETCH d.uploadedBy WHERE d.project.id = :projectId AND d.isDeleted = false",
           countQuery = "SELECT count(d) FROM Document d WHERE d.project.id = :projectId AND d.isDeleted = false")
    Page<Document> findByProjectIdWithUploader(@Param("projectId") UUID projectId, Pageable pageable);

    Optional<Document> findByIdAndProjectIdAndIsDeletedFalse(UUID id, UUID projectId);

    Optional<Document> findByIdAndIsDeletedFalse(UUID id);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.project.id = :projectId AND d.isDeleted = false")
    long countByProjectIdAndIsDeletedFalse(@Param("projectId") UUID projectId);

    long countByIsDeletedFalse();

    long countByIndexingStatusAndIsDeletedFalse(com.knowledgebase.api.domain.enums.DocumentIndexingStatus indexingStatus);

    boolean existsByObjectKey(String objectKey);
}
