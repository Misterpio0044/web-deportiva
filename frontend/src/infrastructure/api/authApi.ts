import apiClient from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: 'admin' | 'user';
  firstname: string;
  lastname: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', payload).then((r) => r.data),

  me: () => apiClient.get<{ user: AuthUser }>('/auth/me').then((r) => r.data),
};
