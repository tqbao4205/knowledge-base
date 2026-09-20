export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

export interface AdminProject {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  documentCount: number;
  createdAt: string;
}

export interface AdminProjectMember {
  userId: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  joinedAt: string;
}

export interface DocumentStatusStats {
  indexed: number;
  processing: number;
  failed: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  bannedUsers: number;
  totalProjects: number;
  totalDocuments: number;
  totalChunks: number;
  documentStatus: DocumentStatusStats;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
