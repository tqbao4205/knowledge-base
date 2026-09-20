package com.knowledgebase.api.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Set;

@Getter
@RequiredArgsConstructor
public enum ProjectRole {

    OWNER(
            RoleName.OWNER,
            "Chủ sở hữu dự án - toàn quyền quản lý dự án, thành viên và tài liệu",
            Set.of(
                    AppPermission.PROJECT_CREATE,
                    AppPermission.PROJECT_READ,
                    AppPermission.PROJECT_UPDATE,
                    AppPermission.PROJECT_DELETE,
                    AppPermission.PROJECT_MANAGE_MEMBERS,
                    AppPermission.DOC_CREATE,
                    AppPermission.DOC_READ,
                    AppPermission.DOC_UPDATE,
                    AppPermission.DOC_DELETE
            )
    ),
    MANAGER(
            RoleName.MANAGER,
            "Quản lý dự án - quản lý thành viên, tài liệu và cấu hình, không thể xóa dự án",
            Set.of(
                    AppPermission.PROJECT_READ,
                    AppPermission.PROJECT_UPDATE,
                    AppPermission.PROJECT_MANAGE_MEMBERS,
                    AppPermission.DOC_CREATE,
                    AppPermission.DOC_READ,
                    AppPermission.DOC_UPDATE,
                    AppPermission.DOC_DELETE
            )
    ),
    EDITOR(
            RoleName.EDITOR,
            "Biên tập viên - xem dự án và toàn quyền thao tác với tài liệu",
            Set.of(
                    AppPermission.PROJECT_READ,
                    AppPermission.DOC_CREATE,
                    AppPermission.DOC_READ,
                    AppPermission.DOC_UPDATE,
                    AppPermission.DOC_DELETE
            )
    ),
    VIEWER(
            RoleName.VIEWER,
            "Người xem - chỉ có quyền xem dự án và tải/đọc tài liệu",
            Set.of(
                    AppPermission.PROJECT_READ,
                    AppPermission.DOC_READ
            )
    );

    private final String roleName;
    private final String description;
    private final Set<AppPermission> defaultPermissions;

    public boolean isOwner() {
        return this == OWNER;
    }

    public static ProjectRole fromRoleName(String roleName) {
        if (roleName == null) return null;
        for (ProjectRole role : values()) {
            if (role.roleName.equalsIgnoreCase(roleName)) {
                return role;
            }
        }
        return null;
    }

    public static final class RoleName {
        public static final String OWNER = "Owner";
        public static final String MANAGER = "Manager";
        public static final String EDITOR = "Editor";
        public static final String VIEWER = "Viewer";

        private RoleName() {}
    }
}
