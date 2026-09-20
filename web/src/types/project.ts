export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  myRole: string;
  myPermissions: string[];
}

export interface ProjectMember {
  userId: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  joinedAt: string;
}

export interface ProjectDetail {
  project: Project;
  members: ProjectMember[];
}

export interface ProjectRole {
  id: string;
  name: string;
  isSystemRole: boolean;
  permissions: string[];
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
}

export interface UpdateProjectParams {
  name: string;
  description?: string;
}

export interface AddMemberParams {
  email: string;
  roleId?: string;
}

export interface UpdateMemberRoleParams {
  roleId: string;
}
