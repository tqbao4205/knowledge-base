package com.knowledgebase.api.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
@RequiredArgsConstructor
public enum AppPermission {

    // Project Permissions
    PROJECT_CREATE(Code.PROJECT_CREATE, "Tạo mới dự án"),
    PROJECT_READ(Code.PROJECT_READ, "Xem thông tin dự án"),
    PROJECT_UPDATE(Code.PROJECT_UPDATE, "Cập nhật thông tin dự án"),
    PROJECT_DELETE(Code.PROJECT_DELETE, "Xóa dự án"),
    PROJECT_MANAGE_MEMBERS(Code.PROJECT_MANAGE_MEMBERS, "Quản lý và phân quyền thành viên dự án"),

    // Document Permissions
    DOC_CREATE(Code.DOC_CREATE, "Tải lên tài liệu mới"),
    DOC_READ(Code.DOC_READ, "Xem và tải tài liệu"),
    DOC_UPDATE(Code.DOC_UPDATE, "Chỉnh sửa tên và thông tin tài liệu"),
    DOC_DELETE(Code.DOC_DELETE, "Xóa tài liệu");

    private final String code;
    private final String description;

    public static Set<String> allCodes() {
        return Arrays.stream(values())
                .map(AppPermission::getCode)
                .collect(Collectors.toUnmodifiableSet());
    }

    public static AppPermission fromCode(String code) {
        if (code == null) return null;
        for (AppPermission perm : values()) {
            if (perm.code.equalsIgnoreCase(code)) {
                return perm;
            }
        }
        throw new IllegalArgumentException("Unknown permission code: " + code);
    }

    /**
     * Constants for use in Spring Security annotations like @PreAuthorize("hasAuthority(AppPermission.Code.PROJECT_CREATE)")
     */
    public static final class Code {
        public static final String PROJECT_CREATE = "PROJECT_CREATE";
        public static final String PROJECT_READ = "PROJECT_READ";
        public static final String PROJECT_UPDATE = "PROJECT_UPDATE";
        public static final String PROJECT_DELETE = "PROJECT_DELETE";
        public static final String PROJECT_MANAGE_MEMBERS = "PROJECT_MANAGE_MEMBERS";
        public static final String DOC_CREATE = "DOC_CREATE";
        public static final String DOC_READ = "DOC_READ";
        public static final String DOC_UPDATE = "DOC_UPDATE";
        public static final String DOC_DELETE = "DOC_DELETE";

        private Code() {}
    }
}
