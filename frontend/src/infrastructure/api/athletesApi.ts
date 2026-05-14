import apiClient from './client';

export interface AthletePublic {
  id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  maxHeartrate?: number;
  weight?: number;
  createdAt: string;
}

export const athletesApi = {
  list: () =>
    apiClient.get<{ athletes: AthletePublic[] }>('/athletes').then((r) => r.data.athletes),

  delete: (id: number) => apiClient.delete(`/athletes/${id}`),
};
