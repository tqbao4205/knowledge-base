package com.knowledgebase.api.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgebase.api.config.ai.OllamaProperties;
import com.knowledgebase.api.exception.ApiException;
import com.knowledgebase.api.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.function.Consumer;

@Slf4j
@Service
@RequiredArgsConstructor
public class OllamaClient {

    private final OllamaProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Generates embedding vector (768 dimensions) using nomic-embed-text.
     * Returns string formatted as "[x1,x2,...]" suitable for PostgreSQL pgvector casting.
     */
    public String generateEmbedding(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Text for embedding cannot be empty");
        }

        try {
            Map<String, Object> payload = Map.of(
                    "model", properties.getEmbeddingModel(),
                    "input", text
            );

            String requestBody = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.getBaseUrl() + "/api/embed"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (response.statusCode() != 200) {
                log.error("Ollama embed API error: status={}, body={}", response.statusCode(), response.body());
                throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, "Lỗi khi tạo vector embedding từ Ollama");
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode embeddingsNode = root.path("embeddings");
            if (!embeddingsNode.isArray() || embeddingsNode.isEmpty()) {
                throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, "Ollama không trả về vector embedding hợp lệ");
            }

            JsonNode firstVector = embeddingsNode.get(0);
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < firstVector.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append(firstVector.get(i).asDouble());
            }
            sb.append("]");

            return sb.toString();

        } catch (Exception e) {
            log.error("Failed to generate embedding with Ollama", e);
            throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể kết nối với dịch vụ Ollama Embedding: " + e.getMessage());
        }
    }

    /**
     * Streams chat completion tokens from Ollama in real-time.
     */
    public void streamChat(
            List<Map<String, String>> messages,
            Consumer<String> onToken,
            Consumer<String> onComplete,
            Consumer<Throwable> onError
    ) {
        try {
            Map<String, Object> payload = Map.of(
                    "model", properties.getChatModel(),
                    "messages", messages,
                    "stream", true,
                    "options", Map.of("temperature", 0.3)
            );

            String requestBody = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.getBaseUrl() + "/api/chat"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofMinutes(3))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<java.io.InputStream> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofInputStream()
            );

            if (response.statusCode() != 200) {
                String errBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
                log.error("Ollama chat API error: status={}, body={}", response.statusCode(), errBody);
                onError.accept(new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, "Lỗi Ollama Chat: " + errBody));
                return;
            }

            StringBuilder fullContent = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.isBlank()) continue;
                    try {
                        JsonNode node = objectMapper.readTree(line);
                        JsonNode msgNode = node.path("message");
                        String token = msgNode.path("content").asText("");
                        if (!token.isEmpty()) {
                            fullContent.append(token);
                            onToken.accept(token);
                        }
                        if (node.path("done").asBoolean(false)) {
                            break;
                        }
                    } catch (Exception parseEx) {
                        log.warn("Could not parse Ollama stream line: {}", line, parseEx);
                    }
                }
            }

            onComplete.accept(fullContent.toString());

        } catch (Exception e) {
            log.error("Ollama stream chat failed", e);
            onError.accept(e);
        }
    }
}
