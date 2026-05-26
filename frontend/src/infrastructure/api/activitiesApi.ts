import apiClient from './client';

export interface ActivityDetail {
  id: number;
  athleteId: number;
  gearId?: string;
  name: string;
  sportType: string;
  startDate: string;
  startDateLocal: string;
  timezone: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  averageCadence?: number;
  hasHeartrate: boolean;
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageTemp?: number;
  sufferScore?: number;
  calories?: number;
  trainer: boolean;
  commute: boolean;
  deviceName?: string;
  description?: string;
  createdAt: string;
}

export interface CreateActivityInput {
  name: string;
  sportType: string;
  startDateLocal: string;
  timezone?: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain?: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageCadence?: number;
  maxSpeed?: number;
  averageTemp?: number;
  sufferScore?: number;
  calories?: number;
  description?: string;
  trainer?: boolean;
  commute?: boolean;
  deviceName?: string;
}

export const activitiesApi = {
  list: (athleteId?: number) => {
    const params = athleteId ? { athleteId } : {};
    return apiClient
      .get<{ activities: ActivityDetail[] }>('/activities', { params })
      .then((r) => r.data.activities);
  },
  get: (id: number) => {
    return apiClient
      .get<{ activity: ActivityDetail }>(`/activities/${id}`)
      .then((r) => r.data.activity);
  },
  create: (input: CreateActivityInput) =>
    apiClient.post<{ activity: ActivityDetail }>('/activities', input).then((r) => r.data.activity),
  exportOne: (id: number) =>
    apiClient
      .get<Blob>(`/activities/${id}/gpx`, { responseType: 'blob' })
      .then((r) => ({
        blob: r.data,
        filename: parseFilenameFromContentDisposition(r.headers['content-disposition']),
      })),
  exportMany: (ids: number[]) =>
    apiClient
      .post<Blob>('/activities/export/gpx', { ids }, { responseType: 'blob' })
      .then((r) => ({
        blob: r.data,
        filename:
          parseFilenameFromContentDisposition(r.headers['content-disposition']) ??
          'actividades.zip',
      })),
};

function parseFilenameFromContentDisposition(header: unknown): string | undefined {
  if (typeof header !== 'string') return undefined;
  const match = /filename="?([^"]+)"?/i.exec(header);
  return match?.[1];
}
