package com.knowledgebase.api.controller;

import com.knowledgebase.api.dto.request.CreateConversationRequest;
import com.knowledgebase.api.dto.request.SendMessageRequest;
import com.knowledgebase.api.dto.response.ApiResponse;
import com.knowledgebase.api.dto.response.ChatConversationResponse;
import com.knowledgebase.api.dto.response.ChatMessageResponse;
import com.knowledgebase.api.service.ai.RagChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/projects/{projectId}/chat")
@RequiredArgsConstructor
public class ChatController {

    private final RagChatService ragChatService;

    @GetMapping("/conversations")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'DOC_READ')")
    public ResponseEntity<ApiResponse<List<ChatConversationResponse>>> getConversations(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<ChatConversationResponse> list = ragChatService.getConversations(projectId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách hội thoại thành công", list));
    }

    @PostMapping("/conversations")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'DOC_READ')")
    public ResponseEntity<ApiResponse<ChatConversationResponse>> createConversation(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateConversationRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ChatConversationResponse response = ragChatService.createConversation(projectId, request, userDetails.getUsername());
        return new ResponseEntity<>(ApiResponse.success("Tạo hội thoại thành công", response), HttpStatus.CREATED);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'DOC_READ')")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(
            @PathVariable UUID projectId,
            @PathVariable UUID conversationId) {
        List<ChatMessageResponse> messages = ragChatService.getMessages(projectId, conversationId);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử tin nhắn thành công", messages));
    }

    @PostMapping(value = "/conversations/{conversationId}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'DOC_READ')")
    public SseEmitter streamMessage(
            @PathVariable UUID projectId,
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Timeout 180s cho LLM local sinh câu trả lời
        SseEmitter emitter = new SseEmitter(180_000L);

        emitter.onTimeout(() -> {
            log.warn("SSE stream timed out for conversationId={}", conversationId);
            emitter.complete();
        });

        emitter.onError(e -> {
            log.error("SSE stream error for conversationId={}: {}", conversationId, e.getMessage());
            emitter.complete();
        });

        ragChatService.streamChatAnswer(projectId, conversationId, request.getDocumentIds(), request.getQuestion(), userDetails.getUsername(), emitter);
        return emitter;
    }

    @DeleteMapping("/conversations/{conversationId}")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'DOC_READ')")
    public ResponseEntity<ApiResponse<Void>> deleteConversation(
            @PathVariable UUID projectId,
            @PathVariable UUID conversationId) {
        ragChatService.deleteConversation(projectId, conversationId);
        return ResponseEntity.ok(ApiResponse.success("Xóa hội thoại thành công", null));
    }
}
