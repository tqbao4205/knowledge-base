package com.knowledgebase.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendMessageRequest {
    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    private String question;

    /**
     * Danh sách documentId cụ thể muốn hỏi đáp.
     * Nếu null hoặc rỗng, hệ thống sẽ tự động tìm kiếm trên toàn bộ tài liệu của dự án.
     */
    private java.util.List<java.util.UUID> documentIds;
}
