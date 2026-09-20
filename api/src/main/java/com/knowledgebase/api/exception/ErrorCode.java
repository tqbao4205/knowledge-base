package com.knowledgebase.api.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 400 Bad Request
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Dữ liệu đầu vào không hợp lệ"),
    EMAIL_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "Email đã được sử dụng"),
    USER_ALREADY_IN_PROJECT(HttpStatus.BAD_REQUEST, "Người dùng đã là thành viên của dự án"),
    INVALID_ROLE(HttpStatus.BAD_REQUEST, "Không thể gán vai trò hệ thống cho thành viên dự án"),
    CANNOT_DEMOTE_LAST_OWNER(HttpStatus.BAD_REQUEST, "Không thể hạ quyền Owner duy nhất còn lại của dự án"),
    CANNOT_REMOVE_LAST_OWNER(HttpStatus.BAD_REQUEST, "Không thể xóa hoặc rời khỏi dự án khi bạn là Owner duy nhất"),
    CANNOT_DEACTIVATE_SELF(HttpStatus.BAD_REQUEST, "Bạn không thể tự khóa tài khoản của chính mình"),
    CANNOT_REMOVE_ADMIN_ROLE_FROM_SELF(HttpStatus.BAD_REQUEST, "Bạn không thể tự hạ quyền Admin của chính mình"),

    // 401 Unauthorized
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Yêu cầu cần xác thực (Token không hợp lệ hoặc đã hết hạn)"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Sai thông tin đăng nhập (email hoặc mật khẩu không chính xác)"),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ hoặc đã hết hạn"),

    // 403 Forbidden
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),
    ACCOUNT_DISABLED(HttpStatus.FORBIDDEN, "Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa"),

    // 404 Not Found
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"),
    PROJECT_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy dự án"),
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong dự án"),
    ROLE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy vai trò yêu cầu"),
    DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tài liệu"),
    CHAT_CONVERSATION_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy phiên hội thoại"),

    // 413 Payload Too Large & 415 Unsupported Media Type
    FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "Kích thước tập tin vượt quá giới hạn cho phép (100MB)"),
    INVALID_FILE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Định dạng tập tin không được hỗ trợ"),

    // 500 Internal Server Error
    FILE_STORAGE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi tương tác với hệ thống lưu trữ MinIO"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Đã có lỗi xảy ra từ máy chủ");

    private final HttpStatus httpStatus;
    private final String defaultMessage;

    public String getCode() {
        return this.name();
    }
}
