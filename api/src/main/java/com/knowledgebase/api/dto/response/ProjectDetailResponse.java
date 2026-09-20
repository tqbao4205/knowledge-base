package com.knowledgebase.api.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectDetailResponse {
    private ProjectResponse project;
    private List<ProjectMemberResponse> members;
}
