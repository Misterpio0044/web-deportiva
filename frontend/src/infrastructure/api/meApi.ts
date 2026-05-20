import apiClient from './client';
import type { AuthUser } from './authApi';

export interface MeProfile extends AuthUser {
  username: string;
  hasPassword: boolean;
  stravaConnected: boolean;
}

interface ApiMeResponse {
  user: {
    id: number;
    firstname: string;
    lastname: string;
    username: string;
    email: string | null;
    role: 'admin' | 'user';
    stravaId?: number;
  };
}

interface ApiUpdateResponse {
  token: string;
  user: ApiMeResponse['user'] & { passwordHash?: string | null };
}

export interface UpdateProfilePayload {
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

function toAuthUser(u: ApiMeResponse['user']): AuthUser {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    firstname: u.firstname,
    lastname: u.lastname,
  };
}

export const meApi = {
  get: async (): Promise<{ user: AuthUser; username: string; stravaId?: number }> => {
    const { data } = await apiClient.get<ApiMeResponse>('/me');
    return {
      user: toAuthUser(data.user),
      username: data.user.username,
      stravaId: data.user.stravaId,
    };
  },

  updateProfile: async (
    payload: UpdateProfilePayload
  ): Promise<{ token: string; user: AuthUser; username: string }> => {
    const { data } = await apiClient.patch<ApiUpdateResponse>('/me', payload);
    return {
      token: data.token,
      user: toAuthUser(data.user),
      username: data.user.username,
    };
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await apiClient.post('/me/password', payload);
  },
};
