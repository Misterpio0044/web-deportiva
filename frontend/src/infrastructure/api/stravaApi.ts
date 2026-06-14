import apiClient from './client';

export interface StravaStatus {
  connected: boolean;
  stravaId: number | null;
  scope: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | null;
  lastSyncError: string | null;
  lastSyncCreated: number | null;
  lastSyncUpdated: number | null;
  lastSyncDeleted: number | null;
}

export interface StravaSyncResult {
  activitiesSynced: number;
  created: number;
  updated: number;
  deleted: number;
  profileUpdated: boolean;
  lastSyncAt: string;
}

const API_BASE = 'http://localhost:3000/api';

export const stravaApi = {
  /**
   * URL absoluta del endpoint de autorización. Se navega vía `window.location`
   * (redirect HTTP de Strava); por eso no usa axios.
   *
   * Para vincular a la cuenta ya autenticada (link=true), pasamos el JWT en
   * la query string ya que un GET con redirect no permite headers.
   */
  authorizeUrl(link = false): string {
    if (!link) return `${API_BASE}/auth/strava/authorize`;
    const token = localStorage.getItem('token') ?? '';
    return `${API_BASE}/auth/strava/authorize?link=1&token=${encodeURIComponent(token)}`;
  },

  status: () => apiClient.get<StravaStatus>('/strava/status').then((r) => r.data),

  sync: () => apiClient.post<StravaSyncResult>('/strava/sync').then((r) => r.data),

  disconnect: () => apiClient.post<{ ok: true }>('/strava/disconnect').then((r) => r.data),
};
