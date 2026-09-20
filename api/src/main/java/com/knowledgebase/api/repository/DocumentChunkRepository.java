package com.knowledgebase.api.repository;

import com.knowledgebase.api.domain.entity.DocumentChunk;
import com.knowledgebase.api.dto.response.ChunkSearchResultView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    @Modifying
    @Query(value = """
        INSERT INTO document_chunks (id, project_id, document_id, chunk_index, content, page_number, embedding, created_at)
        VALUES (:id, :projectId, :documentId, :chunkIndex, :content, :pageNumber, cast(:embedding as vector), :createdAt)
        """, nativeQuery = true)
    void insertChunk(
            @Param("id") UUID id,
            @Param("projectId") UUID projectId,
            @Param("documentId") UUID documentId,
            @Param("chunkIndex") int chunkIndex,
            @Param("content") String content,
            @Param("pageNumber") Integer pageNumber,
            @Param("embedding") String embedding,
            @Param("createdAt") LocalDateTime createdAt
    );

    @Query(value = """
        SELECT c.id AS id,
               c.document_id AS documentId,
               d.original_name AS documentName,
               c.content AS content,
               c.page_number AS pageNumber,
               c.chunk_index AS chunkIndex,
               (1 - (c.embedding <=> cast(:queryVector as vector))) AS similarity
        FROM document_chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE c.project_id = :projectId
          AND d.is_deleted = false
        ORDER BY c.embedding <=> cast(:queryVector as vector) ASC
        LIMIT :topK
        """, nativeQuery = true)
    List<ChunkSearchResultView> searchSimilarChunks(
            @Param("projectId") UUID projectId,
            @Param("queryVector") String queryVector,
            @Param("topK") int topK
    );

    @Query(value = """
        SELECT c.id AS id,
               c.document_id AS documentId,
               d.original_name AS documentName,
               c.content AS content,
               c.page_number AS pageNumber,
               c.chunk_index AS chunkIndex,
               0.95 AS similarity
        FROM document_chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE c.project_id = :projectId
          AND d.is_deleted = false
          AND c.chunk_index <= 1
        ORDER BY d.created_at DESC, c.chunk_index ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<ChunkSearchResultView> findOverviewChunks(
            @Param("projectId") UUID projectId,
            @Param("limit") int limit
    );

    @Query(value = """
        SELECT c.id AS id,
               c.document_id AS documentId,
               d.original_name AS documentName,
               c.content AS content,
               c.page_number AS pageNumber,
               c.chunk_index AS chunkIndex,
               (1 - (c.embedding <=> cast(:queryVector as vector))) AS similarity
        FROM document_chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE c.project_id = :projectId
          AND d.is_deleted = false
          AND c.document_id IN (:documentIds)
        ORDER BY c.embedding <=> cast(:queryVector as vector) ASC
        LIMIT :topK
        """, nativeQuery = true)
    List<ChunkSearchResultView> searchSimilarChunksInDocuments(
            @Param("projectId") UUID projectId,
            @Param("documentIds") List<UUID> documentIds,
            @Param("queryVector") String queryVector,
            @Param("topK") int topK
    );

    @Query(value = """
        SELECT c.id AS id,
               c.document_id AS documentId,
               d.original_name AS documentName,
               c.content AS content,
               c.page_number AS pageNumber,
               c.chunk_index AS chunkIndex,
               0.95 AS similarity
        FROM document_chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE c.project_id = :projectId
          AND d.is_deleted = false
          AND c.document_id IN (:documentIds)
          AND c.chunk_index <= 1
        ORDER BY d.created_at DESC, c.chunk_index ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<ChunkSearchResultView> findOverviewChunksInDocuments(
            @Param("projectId") UUID projectId,
            @Param("documentIds") List<UUID> documentIds,
            @Param("limit") int limit
    );

    @Modifying
    @Query("DELETE FROM DocumentChunk c WHERE c.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") UUID documentId);

    long countByDocumentId(UUID documentId);
}
