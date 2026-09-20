package com.knowledgebase.api.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;
    private final HttpStatus status;

    public ApiException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
        this.status = errorCode.getHttpStatus();
    }

    public ApiException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode;
        this.status = errorCode.getHttpStatus();
    }

    public ApiException(String message, String rawCode, HttpStatus status) {
        super(message);
        this.status = status;
        ErrorCode matched = null;
        try {
            matched = ErrorCode.valueOf(rawCode);
        } catch (Exception ignored) {
        }
        this.errorCode = matched;
    }

    public ApiException(String message, String rawCode) {
        this(message, rawCode, HttpStatus.BAD_REQUEST);
    }

    public String getErrorCodeString() {
        return errorCode != null ? errorCode.name() : "ERROR";
    }
}
