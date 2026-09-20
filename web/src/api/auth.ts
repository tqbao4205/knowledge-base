import apiClient from '../lib/axios';
import type { ApiResponse, AuthResponseData, Tokens, User } from '../types/auth';

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  fullName: string;
}

export const authApi = {
  login: async (params: LoginParams) => {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', params);
    return res.data;
  },

  register: async (params: RegisterParams) => {
    const res = await apiClient.post<ApiResponse<null>>('/auth/register', params);
    return res.data;
  },

  refresh: async (refreshToken: string) => {
    const res = await apiClient.post<ApiResponse<Tokens>>('/auth/refresh', { refreshToken });
    return res.data;
  },

  getProfile: async () => {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data;
  },
};
