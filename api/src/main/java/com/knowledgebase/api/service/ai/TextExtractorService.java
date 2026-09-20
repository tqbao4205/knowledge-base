package com.knowledgebase.api.service.ai;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
public class TextExtractorService {

    @Getter
    @Builder
    public static class ExtractedPage {
        private final Integer pageNumber;
        private final String text;
    }

    /**
     * Extracts text page-by-page or section-by-section from an input stream.
     */
    public List<ExtractedPage> extractText(InputStream inputStream, String filename, String fileType) {
        String lowerName = filename != null ? filename.toLowerCase(Locale.ROOT) : "";

        try {
            if (lowerName.endsWith(".pdf") || (fileType != null && fileType.contains("pdf"))) {
                return extractPdf(inputStream);
            } else if (lowerName.endsWith(".docx") || (fileType != null && fileType.contains("wordprocessingml"))) {
                return extractDocx(inputStream);
            } else {
                // Plain text, markdown, csv, etc.
                return extractPlainText(inputStream);
            }
        } catch (Exception e) {
            log.error("Failed to extract text from file '{}': {}", filename, e.getMessage(), e);
            throw new RuntimeException("Không thể trích xuất nội dung văn bản từ tệp " + filename + ": " + e.getMessage(), e);
        }
    }

    private List<ExtractedPage> extractPdf(InputStream inputStream) throws Exception {
        byte[] bytes = inputStream.readAllBytes();
        try (PDDocument document = Loader.loadPDF(bytes)) {
            List<ExtractedPage> pages = new ArrayList<>();
            PDFTextStripper stripper = new PDFTextStripper();
            int totalPages = document.getNumberOfPages();

            for (int page = 1; page <= totalPages; page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                String text = stripper.getText(document);
                if (text != null && !text.isBlank()) {
                    pages.add(ExtractedPage.builder()
                            .pageNumber(page)
                            .text(text.trim())
                            .build());
                }
            }
            return pages;
        }
    }

    private List<ExtractedPage> extractDocx(InputStream inputStream) throws Exception {
        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            StringBuilder sb = new StringBuilder();

            for (IBodyElement element : document.getBodyElements()) {
                if (element instanceof XWPFParagraph p) {
                    String text = p.getText();
                    if (text != null && !text.isBlank()) {
                        sb.append(text.trim()).append("\n\n");
                    }
                } else if (element instanceof XWPFTable table) {
                    for (XWPFTableRow row : table.getRows()) {
                        List<String> cellTexts = new ArrayList<>();
                        for (XWPFTableCell cell : row.getTableCells()) {
                            String text = cell.getText();
                            if (text != null) {
                                cellTexts.add(text.trim().replaceAll("\\s+", " "));
                            }
                        }
                        if (!cellTexts.isEmpty() && cellTexts.stream().anyMatch(s -> !s.isBlank())) {
                            sb.append(String.join(" | ", cellTexts)).append("\n");
                        }
                    }
                    sb.append("\n");
                }
            }

            String fullText = sb.toString().trim();
            if (fullText.isBlank()) {
                try (XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
                    fullText = extractor.getText();
                }
            }

            return List.of(ExtractedPage.builder()
                    .pageNumber(1)
                    .text(fullText != null ? fullText.trim() : "")
                    .build());
        }
    }

    private List<ExtractedPage> extractPlainText(InputStream inputStream) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
        }
        return List.of(ExtractedPage.builder()
                .pageNumber(1)
                .text(sb.toString().trim())
                .build());
    }
}
