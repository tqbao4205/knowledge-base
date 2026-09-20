package com.knowledgebase.api.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SystemRole {

    ROLE_SYSTEM_ADMIN(RoleName.ROLE_SYSTEM_ADMIN, "Quản trị viên hệ thống"),
    ROLE_SYSTEM_USER(RoleName.ROLE_SYSTEM_USER, "Người dùng hệ thống");

    private final String roleName;
    private final String description;

    public static SystemRole fromRoleName(String roleName) {
        if (roleName == null) return null;
        for (SystemRole role : values()) {
            if (role.roleName.equalsIgnoreCase(roleName)) {
                return role;
            }
        }
        return null;
    }

    public static final class RoleName {
        public static final String ROLE_SYSTEM_ADMIN = "ROLE_SYSTEM_ADMIN";
        public static final String ROLE_SYSTEM_USER = "ROLE_SYSTEM_USER";

        private RoleName() {}
    }
}
