package com.knowledgebase.api.controller;

import com.knowledgebase.api.dto.response.ApiResponse;
import com.knowledgebase.api.dto.response.DocumentResponse;
import com.knowledgebase.api.dto.response.PagedResponse;
import com.knowledgebase.api.dto.response.PresignedUrlResponse;
import com.knowledgebase.api.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'DOC_CREATE')")
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadDocument(
            @PathVariable UUID projectId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {
        DocumentResponse response = documentService.uploadDocument(projectId, file, userDetails.getUsername());
        return new ResponseEntity<>(ApiResponse.success("Tải lên tài liệu thành công", response), HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'DOC_READ')")
    public ResponseEntity<ApiResponse<PagedResponse<DocumentResponse>>> getDocuments(
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        PagedResponse<DocumentResponse> response = documentService.getDocuments(projectId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tài liệu thành công", response));
    }

    @GetMapping("/{documentId}/download-url")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'DOC_READ')")
    public ResponseEntity<ApiResponse<PresignedUrlResponse>> getDownloadUrl(
            @PathVariable UUID projectId,
            @PathVariable UUID documentId) {
        PresignedUrlResponse response = documentService.getDownloadUrl(projectId, documentId);
        return ResponseEntity.ok(ApiResponse.success("Tạo đường dẫn tải tài liệu thành công", response));
    }

    @PostMapping("/{documentId}/reindex")
    @PreAuthorize("@projectSecurity.hasPermission(#projectId, 'DOC_CREATE')")
    public ResponseEntity<ApiResponse<Void>> reindexDocument(
            @PathVariable UUID projectId,
            @PathVariable UUID documentId) {
        documentService.reindexDocument(projectId, documentId);
        return ResponseEntity.ok(ApiResponse.success("Đã yêu cầu lập chỉ mục lại tài liệu", null));
    }

    @DeleteMapping("/{documentId}")
    @PreAuthorize("@projectSecurity.canDeleteDocument(#projectId, #documentId)")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable UUID projectId,
            @PathVariable UUID documentId) {
        documentService.deleteDocument(projectId, documentId);
        return ResponseEntity.ok(ApiResponse.success("Xóa tài liệu thành công", null));
    }
}
