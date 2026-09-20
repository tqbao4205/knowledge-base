package com.knowledgebase.api.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRolesRequest {

    @NotEmpty(message = "Danh sách roleNames không được để trống")
    private List<String> roleNames;
}
