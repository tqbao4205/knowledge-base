import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/auth';
import type { PagedResponse } from '../types/project';
import type { DocumentItem, PresignedUrlData } from '../types/document';

export const documentApi = {
  getDocuments: async (projectId: string, page = 0, size = 20) => {
    const res = await apiClient.get<ApiResponse<PagedResponse<DocumentItem>>>(
      `/projects/${projectId}/documents?page=${page}&size=${size}`
    );
    return res.data;
  },

  uploadDocument: async (
    projectId: string,
    file: File,
    onUploadProgress?: (percent: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<ApiResponse<DocumentItem>>(
      `/projects/${projectId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress) {
            const percent = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : Math.round(((progressEvent as any).progress || 0) * 100);
            onUploadProgress(percent);
          }
        },
      }
    );
    return res.data;
  },

  getDownloadUrl: async (projectId: string, documentId: string) => {
    const res = await apiClient.get<ApiResponse<PresignedUrlData>>(
      `/projects/${projectId}/documents/${documentId}/download-url`
    );
    return res.data;
  },

  deleteDocument: async (projectId: string, documentId: string) => {
    const res = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/documents/${documentId}`
    );
    return res.data;
  },

  reindexDocument: async (projectId: string, documentId: string) => {
    const res = await apiClient.post<ApiResponse<null>>(
      `/projects/${projectId}/documents/${documentId}/reindex`
    );
    return res.data;
  },
};

