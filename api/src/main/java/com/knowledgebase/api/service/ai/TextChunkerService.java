package com.knowledgebase.api.service.ai;

import lombok.Builder;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class TextChunkerService {

    public static final int DEFAULT_CHUNK_SIZE_CHARS = 2500; // ~700-800 tokens
    public static final int DEFAULT_OVERLAP_CHARS = 400;     // ~100-150 tokens

    @Getter
    @Builder
    public static class Chunk {
        private final int index;
        private final String content;
        private final Integer pageNumber;
    }

    /**
     * Splits extracted pages into overlapping chunks.
     */
    public List<Chunk> chunkPages(List<TextExtractorService.ExtractedPage> pages) {
        List<Chunk> chunks = new ArrayList<>();
        int globalIndex = 0;

        for (TextExtractorService.ExtractedPage page : pages) {
            String text = page.getText();
            if (text == null || text.isBlank()) continue;

            if (text.length() <= DEFAULT_CHUNK_SIZE_CHARS) {
                chunks.add(Chunk.builder()
                        .index(globalIndex++)
                        .content(text)
                        .pageNumber(page.getPageNumber())
                        .build());
            } else {
                int start = 0;
                while (start < text.length()) {
                    int end = Math.min(start + DEFAULT_CHUNK_SIZE_CHARS, text.length());

                    // Try to break at paragraph or newline or space boundary if not at end
                    if (end < text.length()) {
                        int breakPoint = findBreakPoint(text, start, end);
                        if (breakPoint > start + (DEFAULT_CHUNK_SIZE_CHARS / 2)) {
                            end = breakPoint;
                        }
                    }

                    String chunkText = text.substring(start, end).trim();
                    if (!chunkText.isBlank()) {
                        chunks.add(Chunk.builder()
                                .index(globalIndex++)
                                .content(chunkText)
                                .pageNumber(page.getPageNumber())
                                .build());
                    }

                    if (end >= text.length()) break;
                    start = end - DEFAULT_OVERLAP_CHARS;
                }
            }
        }

        return chunks;
    }

    private int findBreakPoint(String text, int start, int end) {
        // Try paragraph break
        int pBreak = text.lastIndexOf("\n\n", end);
        if (pBreak > start) return pBreak + 2;

        // Try single line break
        int lBreak = text.lastIndexOf('\n', end);
        if (lBreak > start) return lBreak + 1;

        // Try sentence break
        int sBreak = text.lastIndexOf(". ", end);
        if (sBreak > start) return sBreak + 2;

        // Try space
        int spaceBreak = text.lastIndexOf(' ', end);
        if (spaceBreak > start) return spaceBreak + 1;

        return end;
    }
}
