import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/auth';
import type {
  AdminDashboardStats,
  AdminUser,
  AdminProject,
  AdminProjectMember,
  PagedResponse,
} from '../types/admin';

export const adminApi = {
  getDashboardStats: async () => {
    const res = await apiClient.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard/stats');
    return res.data;
  },

  getUsers: async (page = 0, size = 20, search?: string) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('size', String(size));
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    const res = await apiClient.get<ApiResponse<PagedResponse<AdminUser>>>(`/admin/users?${params.toString()}`);
    return res.data;
  },

  updateUserStatus: async (userId: string, isActive: boolean) => {
    const res = await apiClient.put<ApiResponse<AdminUser>>(`/admin/users/${userId}/status`, {
      isActive,
    });
    return res.data;
  },

  updateUserRoles: async (userId: string, roleNames: string[]) => {
    const res = await apiClient.put<ApiResponse<AdminUser>>(`/admin/users/${userId}/roles`, {
      roleNames,
    });
    return res.data;
  },

  getProjects: async (page = 0, size = 20, search?: string) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('size', String(size));
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    const res = await apiClient.get<ApiResponse<PagedResponse<AdminProject>>>(`/admin/projects?${params.toString()}`);
    return res.data;
  },

  getProjectMembers: async (projectId: string) => {
    const res = await apiClient.get<ApiResponse<AdminProjectMember[]>>(`/admin/projects/${projectId}/members`);
    return res.data;
  },
};
