package com.knowledgebase.api.service;

import com.knowledgebase.api.config.MinioConfig;
import com.knowledgebase.api.exception.ApiException;
import com.knowledgebase.api.exception.ErrorCode;
import io.minio.GetObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MinioStorageService {

    private final MinioClient minioClient;
    private final MinioConfig minioConfig;

    public InputStream getObjectInputStream(String objectKey) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(minioConfig.getBucketName())
                            .object(objectKey)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to read object stream from MinIO for objectKey={}", objectKey, e);
            throw new ApiException(ErrorCode.FILE_STORAGE_ERROR, "Không thể đọc dữ liệu tệp từ MinIO: " + e.getMessage());
        }
    }

    public void uploadFile(String objectKey, InputStream inputStream, long size, String contentType) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioConfig.getBucketName())
                            .object(objectKey)
                            .stream(inputStream, size, -1)
                            .contentType(contentType != null ? contentType : "application/octet-stream")
                            .build()
            );
            log.info("Successfully uploaded object to MinIO: bucket={}, objectKey={}, size={}",
                    minioConfig.getBucketName(), objectKey, size);
        } catch (Exception e) {
            log.error("Failed to upload object to MinIO: bucket={}, objectKey={}",
                    minioConfig.getBucketName(), objectKey, e);
            throw new ApiException(ErrorCode.FILE_STORAGE_ERROR, "Không thể lưu trữ tập tin: " + e.getMessage());
        }
    }

    public String generatePresignedDownloadUrl(String objectKey, String originalFilename, int expirySeconds) {
        try {
            Map<String, String> queryParams = new HashMap<>();
            if (originalFilename != null && !originalFilename.isBlank()) {
                String encodedFilename = URLEncoder.encode(originalFilename, StandardCharsets.UTF_8).replace("+", "%20");
                queryParams.put("response-content-disposition", "inline; filename*=UTF-8''" + encodedFilename);
            }

            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(minioConfig.getBucketName())
                            .object(objectKey)
                            .expiry(expirySeconds > 0 ? expirySeconds : 300, TimeUnit.SECONDS)
                            .extraQueryParams(queryParams)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for objectKey={}", objectKey, e);
            throw new ApiException(ErrorCode.FILE_STORAGE_ERROR, "Không thể tạo liên kết tải tài liệu: " + e.getMessage());
        }
    }

    public void deleteFile(String objectKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioConfig.getBucketName())
                            .object(objectKey)
                            .build()
            );
            log.info("Successfully removed object from MinIO: objectKey={}", objectKey);
        } catch (Exception e) {
            log.warn("Could not delete file from MinIO: objectKey={}, reason: {}", objectKey, e.getMessage());
        }
    }
}
