package com.knowledgebase.api.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgebase.api.domain.entity.ChatConversation;
import com.knowledgebase.api.domain.entity.ChatMessage;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.domain.enums.ChatMessageSenderType;
import com.knowledgebase.api.dto.request.CreateConversationRequest;
import com.knowledgebase.api.dto.response.ChatConversationResponse;
import com.knowledgebase.api.dto.response.ChatMessageResponse;
import com.knowledgebase.api.dto.response.ChunkSearchResultView;
import com.knowledgebase.api.dto.response.CitationResponse;
import com.knowledgebase.api.exception.ApiException;
import com.knowledgebase.api.exception.ErrorCode;
import com.knowledgebase.api.repository.ChatConversationRepository;
import com.knowledgebase.api.repository.ChatMessageRepository;
import com.knowledgebase.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagChatService {

    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final RagSearchService ragSearchService;
    private final OllamaClient ollamaClient;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<ChatConversationResponse> getConversations(UUID projectId, String userEmail) {
        User user = getUserByEmail(userEmail);
        return conversationRepository.findByProjectIdAndUserIdOrderByUpdatedAtDesc(projectId, user.getId())
                .stream()
                .map(this::mapToConversationResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatConversationResponse createConversation(UUID projectId, CreateConversationRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        ChatConversation conversation = ChatConversation.builder()
                .projectId(projectId)
                .userId(user.getId())
                .title(request.getTitle().trim())
                .build();

        conversation = conversationRepository.save(conversation);
        log.info("Created chat conversation '{}' (id={}) for project {}", conversation.getTitle(), conversation.getId(), projectId);

        return mapToConversationResponse(conversation);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(UUID projectId, UUID conversationId) {
        getConversation(projectId, conversationId); // Validate exists in project

        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId).stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteConversation(UUID projectId, UUID conversationId) {
        ChatConversation conversation = getConversation(projectId, conversationId);
        messageRepository.deleteByConversationId(conversationId);
        conversationRepository.delete(conversation);
        log.info("Deleted chat conversation id={} from project {}", conversationId, projectId);
    }

    /**
     * Executes RAG flow and streams assistant tokens via Server-Sent Events (SSE).
     */
    @Async
    public void streamChatAnswer(UUID projectId, UUID conversationId, List<UUID> documentIds, String question, String userEmail, SseEmitter emitter) {
        try {
            ChatConversation conversation = getConversation(projectId, conversationId);

            // 1. Save user question to DB
            ChatMessage userMessage = ChatMessage.builder()
                    .conversation(conversation)
                    .senderType(ChatMessageSenderType.USER)
                    .content(question.trim())
                    .build();
            messageRepository.save(userMessage);

            // 2. Vector search for relevant chunks (increase to top 6 chunks, filtered by documentIds if provided)
            List<ChunkSearchResultView> relevantChunks = ragSearchService.searchRelevantChunks(projectId, documentIds, question, 6);

            List<CitationResponse> citations = relevantChunks.stream()
                    .map(chunk -> CitationResponse.builder()
                            .documentId(chunk.getDocumentId())
                            .documentName(chunk.getDocumentName())
                            .pageNumber(chunk.getPageNumber())
                            .snippet(createSnippet(chunk.getContent(), 250))
                            .similarity(chunk.getSimilarity())
                            .build())
                    .collect(Collectors.toList());

            // 3. Build prompts for Ollama
            List<Map<String, String>> messages = buildOllamaMessages(projectId, conversationId, documentIds, question, relevantChunks);

            // 4. Stream chat from Ollama
            ollamaClient.streamChat(
                    messages,
                    token -> {
                        try {
                            emitter.send(SseEmitter.event()
                                    .name("token")
                                    .data(Map.of("token", token)));
                        } catch (IOException e) {
                            log.warn("Error sending SSE token event: {}", e.getMessage());
                        }
                    },
                    fullAnswer -> {
                        try {
                            String citationsJson = citations.isEmpty() ? null : objectMapper.writeValueAsString(citations);

                            ChatMessage assistantMessage = ChatMessage.builder()
                                    .conversation(conversation)
                                    .senderType(ChatMessageSenderType.ASSISTANT)
                                    .content(fullAnswer)
                                    .citationsJson(citationsJson)
                                    .build();
                            assistantMessage = messageRepository.save(assistantMessage);

                            conversation.setUpdatedAt(LocalDateTime.now());
                            conversationRepository.save(conversation);

                            emitter.send(SseEmitter.event()
                                    .name("done")
                                    .data(Map.of(
                                            "messageId", assistantMessage.getId(),
                                            "fullContent", fullAnswer,
                                            "citations", citations
                                    )));
                            emitter.complete();

                        } catch (Exception ex) {
                            log.error("Failed to complete SSE chat stream", ex);
                            emitter.completeWithError(ex);
                        }
                    },
                    error -> {
                        try {
                            emitter.send(SseEmitter.event()
                                    .name("error")
                                    .data(Map.of("error", error.getMessage() != null ? error.getMessage() : "Unknown AI error")));
                        } catch (IOException ignored) {}
                        emitter.completeWithError(error);
                    }
            );

        } catch (Exception e) {
            log.error("Error in streamChatAnswer", e);
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data(Map.of("error", e.getMessage())));
            } catch (IOException ignored) {}
            emitter.completeWithError(e);
        }
    }

    /**
     * Backward-compatible overload without document filter (searches all documents).
     */
    @Async
    public void streamChatAnswer(UUID projectId, UUID conversationId, String question, String userEmail, SseEmitter emitter) {
        streamChatAnswer(projectId, conversationId, null, question, userEmail, emitter);
    }

    private List<Map<String, String>> buildOllamaMessages(
            UUID projectId,
            UUID conversationId,
            List<UUID> documentIds,
            String question,
            List<ChunkSearchResultView> relevantChunks
    ) {
        List<Map<String, String>> messages = new ArrayList<>();

        // System prompt with multilingual comprehension and natural summarization
        String systemPrompt = """
            Bạn là trợ lý AI thông minh chuyên phân tích tài liệu của hệ thống KnowledgeBase.
            
            HƯỚNG DẪN TRẢ LỜI:
            1. NGÔN NGỮ TRẢ LỜI: Luôn luôn trả lời bằng TIẾNG VIỆT tự nhiên, chuẩn mực, lưu loát và dễ hiểu.
            2. ĐA NGÔN NGỮ (MULTILINGUAL): Tài liệu trong phần ngữ cảnh có thể được viết bằng Tiếng Anh, Tiếng Việt hoặc ngôn ngữ khác. Bạn có trách nhiệm đọc hiểu toàn diện nội dung tài liệu đó và dịch nghĩa, giải thích hoặc tổng hợp lại đầy đủ bằng Tiếng Việt cho người dùng.
            3. TỔNG HỢP & TÓM TẮT: Với các câu hỏi như "tóm tắt", "nội dung chính", "tổng quan", hãy tổng hợp các dữ kiện quan trọng nhất, các số liệu, điểm số, tên người, bảng biểu, quy định hoặc kết luận nổi bật từ các đoạn tài liệu được cung cấp.
            4. TRÍCH DẪN NGUỒN: Luôn ghi rõ tên tài liệu và số trang (nếu có) tương ứng với từng thông tin trong câu trả lời.
            5. ĐỘ TRUNG THỰC: Chỉ trả lời dựa trên các dữ kiện có trong ngữ cảnh tài liệu được cung cấp dưới đây, không tự suy đoán thông tin ngoài tài liệu. Nếu nội dung ngữ cảnh hoàn toàn không có thông tin liên quan đến câu hỏi, hãy nhẹ nhàng thông báo rằng tài liệu hiện có chưa nhắc tới điều này.
            """;
        messages.add(Map.of("role", "system", "content", systemPrompt));

        // Append previous conversation history (excluding the current user question just saved)
        List<ChatMessage> recentMessages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        int endIndex = Math.max(0, recentMessages.size() - 1);
        int startIndex = Math.max(0, endIndex - 6);
        for (int i = startIndex; i < endIndex; i++) {
            ChatMessage msg = recentMessages.get(i);
            String role = msg.getSenderType() == ChatMessageSenderType.USER ? "user" : "assistant";
            messages.add(Map.of("role", role, "content", msg.getContent()));
        }

        // Build context block
        boolean hasDocFilter = documentIds != null && !documentIds.isEmpty();
        StringBuilder contextBuilder = new StringBuilder(hasDocFilter
                ? "=== CÁC ĐOẠN TÀI LIỆU ĐƯỢC CHỌN TỪ DỰ ÁN ===\n"
                : "=== CÁC ĐOẠN TÀI LIỆU TRÍCH XUẤT TỪ DỰ ÁN ===\n");

        if (relevantChunks.isEmpty()) {
            contextBuilder.append(hasDocFilter
                    ? "(Không tìm thấy đoạn tài liệu nào liên quan trong các tài liệu bạn đã chọn)\n"
                    : "(Không tìm thấy đoạn tài liệu nào liên quan trong dự án)\n");
        } else {
            for (int i = 0; i < relevantChunks.size(); i++) {
                ChunkSearchResultView chunk = relevantChunks.get(i);
                contextBuilder.append(String.format("[Nguồn %d] Tệp: %s (Trang: %s)\nNội dung: %s\n\n",
                        i + 1,
                        chunk.getDocumentName(),
                        chunk.getPageNumber() != null ? chunk.getPageNumber() : "N/A",
                        chunk.getContent()));
            }
        }
        contextBuilder.append("=====================================\n");
        contextBuilder.append("CÂU HỎI CỦA NGƯỜI DÙNG:\n").append(question);

        messages.add(Map.of("role", "user", "content", contextBuilder.toString()));

        return messages;
    }

    private String createSnippet(String content, int maxLen) {
        if (content == null) return "";
        if (content.length() <= maxLen) return content;
        return content.substring(0, maxLen).trim() + "...";
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private ChatConversation getConversation(UUID projectId, UUID conversationId) {
        return conversationRepository.findByIdAndProjectId(conversationId, projectId)
                .orElseThrow(() -> new ApiException(ErrorCode.CHAT_CONVERSATION_NOT_FOUND, "Không tìm thấy cuộc trò chuyện trong dự án này"));
    }

    private ChatConversationResponse mapToConversationResponse(ChatConversation c) {
        return ChatConversationResponse.builder()
                .id(c.getId())
                .projectId(c.getProjectId())
                .title(c.getTitle())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private ChatMessageResponse mapToMessageResponse(ChatMessage m) {
        List<CitationResponse> citations = Collections.emptyList();
        if (m.getCitationsJson() != null && !m.getCitationsJson().isBlank()) {
            try {
                citations = objectMapper.readValue(m.getCitationsJson(), new TypeReference<List<CitationResponse>>() {});
            } catch (Exception e) {
                log.warn("Could not parse citationsJson for message id={}", m.getId());
            }
        }

        return ChatMessageResponse.builder()
                .id(m.getId())
                .senderType(m.getSenderType().name())
                .content(m.getContent())
                .citations(citations)
                .createdAt(m.getCreatedAt())
                .build();
    }
}
