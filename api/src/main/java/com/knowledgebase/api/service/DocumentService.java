package com.knowledgebase.api.service;

import com.knowledgebase.api.domain.entity.Document;
import com.knowledgebase.api.domain.entity.Project;
import com.knowledgebase.api.domain.entity.User;
import com.knowledgebase.api.dto.response.DocumentResponse;
import com.knowledgebase.api.dto.response.PagedResponse;
import com.knowledgebase.api.dto.response.PresignedUrlResponse;
import com.knowledgebase.api.exception.ApiException;
import com.knowledgebase.api.exception.ErrorCode;
import com.knowledgebase.api.mapper.DocumentMapper;
import com.knowledgebase.api.repository.DocumentRepository;
import com.knowledgebase.api.repository.ProjectRepository;
import com.knowledgebase.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    public static final long MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024L; // 100MB

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "docx", "xlsx", "pptx", "txt", "md", "csv",
            "jpg", "jpeg", "png", "webp", "gif", "mp4"
    );

    private final DocumentRepository documentRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final MinioStorageService minioStorageService;
    private final DocumentMapper documentMapper;
    private final com.knowledgebase.api.service.ai.DocumentIngestionService documentIngestionService;

    @Transactional
    public DocumentResponse uploadDocument(UUID projectId, MultipartFile file, String userEmail) {
        validateFile(file);

        Project project = projectRepository.findByIdAndIsDeletedFalse(projectId)
                .orElseThrow(() -> new ApiException(ErrorCode.PROJECT_NOT_FOUND));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed_file");
        String extension = getFileExtension(originalFilename);
        String sanitizedFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");

        String objectKey = String.format("projects/%s/%s_%s", projectId, UUID.randomUUID(), sanitizedFilename);

        try {
            minioStorageService.uploadFile(
                    objectKey,
                    file.getInputStream(),
                    file.getSize(),
                    file.getContentType()
            );
        } catch (IOException e) {
            log.error("Failed to read upload file stream", e);
            throw new ApiException(ErrorCode.FILE_STORAGE_ERROR, "Không thể đọc dữ liệu tập tin tải lên: " + e.getMessage());
        }

        Document document = Document.builder()
                .project(project)
                .originalName(originalFilename)
                .fileType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileSizeBytes(file.getSize())
                .objectKey(objectKey)
                .uploadedBy(user)
                .build();

        document = documentRepository.saveAndFlush(document);
        log.info("Document saved: id={}, name={}, size={} bytes, uploader={}",
                document.getId(), originalFilename, document.getFileSizeBytes(), userEmail);

        final UUID savedDocId = document.getId();
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            documentIngestionService.ingestDocumentAsync(savedDocId);
                        }
                    }
            );
        } else {
            documentIngestionService.ingestDocumentAsync(savedDocId);
        }

        return documentMapper.toDocumentResponse(document);
    }

    @Transactional(readOnly = true)
    public void reindexDocument(UUID projectId, UUID documentId) {
        Document document = documentRepository.findByIdAndProjectIdAndIsDeletedFalse(documentId, projectId)
                .orElseThrow(() -> new ApiException(ErrorCode.DOCUMENT_NOT_FOUND));

        documentIngestionService.ingestDocumentAsync(document.getId());
        log.info("Requested reindex for document id={} in project={}", documentId, projectId);
    }

    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> getDocuments(UUID projectId, Pageable pageable) {
        if (!projectRepository.existsByIdAndIsDeletedFalse(projectId)) {
            throw new ApiException(ErrorCode.PROJECT_NOT_FOUND);
        }

        Page<Document> page = documentRepository.findByProjectIdWithUploader(projectId, pageable);
        List<DocumentResponse> responses = documentMapper.toDocumentResponseList(page.getContent());

        return PagedResponse.<DocumentResponse>builder()
                .content(responses)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public PresignedUrlResponse getDownloadUrl(UUID projectId, UUID documentId) {
        Document document = documentRepository.findByIdAndProjectIdAndIsDeletedFalse(documentId, projectId)
                .orElseThrow(() -> new ApiException(ErrorCode.DOCUMENT_NOT_FOUND));

        String presignedUrl = minioStorageService.generatePresignedDownloadUrl(
                document.getObjectKey(),
                document.getOriginalName(),
                300 // 5 minutes
        );

        return PresignedUrlResponse.builder()
                .url(presignedUrl)
                .expiresInSeconds(300)
                .build();
    }

    @Transactional
    public void deleteDocument(UUID projectId, UUID documentId) {
        Document document = documentRepository.findByIdAndProjectIdAndIsDeletedFalse(documentId, projectId)
                .orElseThrow(() -> new ApiException(ErrorCode.DOCUMENT_NOT_FOUND));

        document.setIsDeleted(true);
        documentRepository.save(document);

        log.info("Soft-deleted document id={} from project={}", documentId, projectId);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Tập tin tải lên không được để trống");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ApiException(ErrorCode.FILE_TOO_LARGE, "Kích thước tập tin vượt quá giới hạn cho phép (100MB)");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Tên tập tin không hợp lệ");
        }

        String extension = getFileExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(
                    ErrorCode.INVALID_FILE_TYPE,
                    "Định dạng tập tin ." + extension + " không được hỗ trợ. Các định dạng cho phép: " + String.join(", ", ALLOWED_EXTENSIONS)
            );
        }
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex == -1 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }
}
