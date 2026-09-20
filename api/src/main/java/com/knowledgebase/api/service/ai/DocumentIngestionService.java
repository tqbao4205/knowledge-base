package com.knowledgebase.api.service.ai;

import com.knowledgebase.api.domain.entity.Document;
import com.knowledgebase.api.domain.enums.DocumentIndexingStatus;
import com.knowledgebase.api.repository.DocumentChunkRepository;
import com.knowledgebase.api.repository.DocumentRepository;
import com.knowledgebase.api.service.MinioStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentIngestionService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final MinioStorageService minioStorageService;
    private final TextExtractorService textExtractorService;
    private final TextChunkerService textChunkerService;
    private final OllamaClient ollamaClient;

    /**
     * Ingests, chunks, embeds, and indexes a document asynchronously in the background.
     */
    @Async
    @Transactional
    public void ingestDocumentAsync(UUID documentId) {
        log.info("Starting background ingestion for documentId={}", documentId);

        Document document = null;
        for (int i = 0; i < 5; i++) {
            document = documentRepository.findById(documentId).orElse(null);
            if (document != null) break;
            try {
                Thread.sleep(300);
            } catch (InterruptedException ignored) {}
        }

        if (document == null || Boolean.TRUE.equals(document.getIsDeleted())) {
            log.warn("Document not found or deleted, skipping ingestion: {}", documentId);
            return;
        }

        try {
            document.setIndexingStatus(DocumentIndexingStatus.PROCESSING);
            documentRepository.save(document);

            // 1. Delete old chunks if re-indexing
            documentChunkRepository.deleteByDocumentId(documentId);

            // 2. Read file stream from MinIO
            List<TextExtractorService.ExtractedPage> pages;
            try (InputStream stream = minioStorageService.getObjectInputStream(document.getObjectKey())) {
                pages = textExtractorService.extractText(stream, document.getOriginalName(), document.getFileType());
            }

            if (pages.isEmpty()) {
                log.warn("No text could be extracted from document {}", document.getOriginalName());
                document.setIndexingStatus(DocumentIndexingStatus.FAILED);
                documentRepository.save(document);
                return;
            }

            // 3. Chunk text
            List<TextChunkerService.Chunk> chunks = textChunkerService.chunkPages(pages);
            log.info("Extracted {} pages and generated {} chunks for document '{}'",
                    pages.size(), chunks.size(), document.getOriginalName());

            // 4. Generate embeddings and save chunks
            for (TextChunkerService.Chunk chunk : chunks) {
                String embeddingVector = ollamaClient.generateEmbedding(chunk.getContent());
                documentChunkRepository.insertChunk(
                        UUID.randomUUID(),
                        document.getProject().getId(),
                        document.getId(),
                        chunk.getIndex(),
                        chunk.getContent(),
                        chunk.getPageNumber(),
                        embeddingVector,
                        LocalDateTime.now()
                );
            }

            // 5. Update document status
            document.setIndexingStatus(DocumentIndexingStatus.INDEXED);
            document.setChunkCount(chunks.size());
            document.setIndexedAt(LocalDateTime.now());
            documentRepository.save(document);

            log.info("Successfully indexed document '{}' with {} chunks into pgvector",
                    document.getOriginalName(), chunks.size());

        } catch (Exception e) {
            log.error("Failed to ingest and index document '{}': {}", document.getOriginalName(), e.getMessage(), e);
            document.setIndexingStatus(DocumentIndexingStatus.FAILED);
            documentRepository.save(document);
        }
    }
}
