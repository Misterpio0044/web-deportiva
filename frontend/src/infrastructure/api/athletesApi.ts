import apiClient from './client';

export interface AthletePublic {
  id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  profileMediumUrl?: string;
  stravaId?: number;
  lastStravaSyncAt?: string;
  lastStravaSyncStatus?: 'success' | 'error';
  activityCount?: number;
  createdAt: string;
}

export const athletesApi = {
  list: () =>
    apiClient.get<{ athletes: AthletePublic[] }>('/athletes').then((r) => r.data.athletes),

  delete: (id: number) => apiClient.delete(`/athletes/${id}`),

  changeRole: (id: number, role: 'admin' | 'user') =>
    apiClient.patch<{ ok: true }>(`/athletes/${id}/role`, { role }),
};
