export interface User {
  id: string;
  email: string;
  fullName: string;
  systemRoles: string[];
  permissions: string[];
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  user: User;
  tokens: Tokens;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  errorCode: string;
  timestamp: string;
}
