package com.knowledgebase.api.service.ai;

import com.knowledgebase.api.dto.response.ChunkSearchResultView;
import com.knowledgebase.api.repository.DocumentChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagSearchService {

    private final DocumentChunkRepository documentChunkRepository;
    private final OllamaClient ollamaClient;

    private static final List<String> SUMMARY_KEYWORDS = List.of(
            "tóm tắt", "tổng quan", "nội dung chính", "nói về gì", "gồm những gì",
            "điểm chính", "giới thiệu", "thông tin chính", "báo cáo", "kết quả",
            "summarize", "summary", "overview", "what is this", "main points"
    );

    @Transactional(readOnly = true)
    public List<ChunkSearchResultView> searchRelevantChunks(UUID projectId, String query, int topK) {
        return searchRelevantChunks(projectId, null, query, topK);
    }

    /**
     * Performs vector similarity search strictly scoped to the specified projectId and optional documentIds.
     */
    @Transactional(readOnly = true)
    public List<ChunkSearchResultView> searchRelevantChunks(UUID projectId, List<UUID> documentIds, String query, int topK) {
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        int limit = topK > 0 ? topK : 6;
        String queryLower = query.toLowerCase(Locale.ROOT);
        boolean isSummaryQuery = SUMMARY_KEYWORDS.stream().anyMatch(queryLower::contains);
        boolean hasDocFilter = documentIds != null && !documentIds.isEmpty();

        // Nomic Embed Text query prefix
        String queryVector = ollamaClient.generateEmbedding("search_query: " + query.trim());

        List<ChunkSearchResultView> vectorResults = hasDocFilter
                ? documentChunkRepository.searchSimilarChunksInDocuments(projectId, documentIds, queryVector, limit)
                : documentChunkRepository.searchSimilarChunks(projectId, queryVector, limit);

        Set<UUID> seenIds = new HashSet<>();
        List<ChunkSearchResultView> combinedResults = new ArrayList<>();

        // If user asks for summary or overview, prioritize introducing overview chunks (chunk_index 0, 1)
        if (isSummaryQuery) {
            List<ChunkSearchResultView> overviewChunks = hasDocFilter
                    ? documentChunkRepository.findOverviewChunksInDocuments(projectId, documentIds, 4)
                    : documentChunkRepository.findOverviewChunks(projectId, 4);

            for (ChunkSearchResultView chunk : overviewChunks) {
                if (seenIds.add(chunk.getId())) {
                    combinedResults.add(chunk);
                }
            }
        }

        for (ChunkSearchResultView chunk : vectorResults) {
            if (seenIds.add(chunk.getId())) {
                combinedResults.add(chunk);
            }
        }

        log.info("Found {} relevant chunks (summaryQuery={}, docFilterCount={}) for query in projectId={}",
                combinedResults.size(), isSummaryQuery, hasDocFilter ? documentIds.size() : "ALL", projectId);

        return combinedResults;
    }
}
