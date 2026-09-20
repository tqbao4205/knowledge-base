import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/auth';
import type {
  Project,
  ProjectDetail,
  ProjectMember,
  ProjectRole,
  PagedResponse,
  CreateProjectParams,
  UpdateProjectParams,
  AddMemberParams,
  UpdateMemberRoleParams,
} from '../types/project';

export const projectApi = {
  getMyProjects: async (page = 0, size = 20) => {
    const res = await apiClient.get<ApiResponse<PagedResponse<Project>>>(
      `/projects?page=${page}&size=${size}`
    );
    return res.data;
  },

  getProjectDetail: async (projectId: string) => {
    const res = await apiClient.get<ApiResponse<ProjectDetail>>(`/projects/${projectId}`);
    return res.data;
  },

  createProject: async (params: CreateProjectParams) => {
    const res = await apiClient.post<ApiResponse<Project>>('/projects', params);
    return res.data;
  },

  updateProject: async (projectId: string, params: UpdateProjectParams) => {
    const res = await apiClient.put<ApiResponse<Project>>(`/projects/${projectId}`, params);
    return res.data;
  },

  deleteProject: async (projectId: string) => {
    const res = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}`);
    return res.data;
  },

  getMembers: async (projectId: string) => {
    const res = await apiClient.get<ApiResponse<ProjectMember[]>>(`/projects/${projectId}/members`);
    return res.data;
  },

  addMember: async (projectId: string, params: AddMemberParams) => {
    const res = await apiClient.post<ApiResponse<ProjectMember>>(
      `/projects/${projectId}/members`,
      params
    );
    return res.data;
  },

  updateMemberRole: async (
    projectId: string,
    userId: string,
    params: UpdateMemberRoleParams
  ) => {
    const res = await apiClient.put<ApiResponse<ProjectMember>>(
      `/projects/${projectId}/members/${userId}/role`,
      params
    );
    return res.data;
  },

  removeMember: async (projectId: string, userId: string) => {
    const res = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/members/${userId}`
    );
    return res.data;
  },

  getProjectRoles: async () => {
    const res = await apiClient.get<ApiResponse<ProjectRole[]>>('/projects/roles');
    return res.data;
  },
};
