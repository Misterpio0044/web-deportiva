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
  utcOffset?: number;
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

export type ActivitySortField = 'date' | 'name' | 'distance' | 'time' | 'speed' | 'hr';
export type SortDirection = 'asc' | 'desc';

export interface ActivityListParams {
  athleteId?: number;
  page?: number;
  limit?: number;
  sortBy?: ActivitySortField;
  sortDir?: SortDirection;
  search?: string;
  sportType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityListResponse {
  activities: ActivityDetail[];
  total: number;
  page: number;
  limit: number;
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
  gearId?: string;
}

export const activitiesApi = {
  list: (params: ActivityListParams = {}) => {
    const queryParams: Record<string, string | number> = {};
    if (params.athleteId != null) queryParams.athleteId = params.athleteId;
    if (params.page != null) queryParams.page = params.page;
    if (params.limit != null) queryParams.limit = params.limit;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortDir) queryParams.sortDir = params.sortDir;
    if (params.search) queryParams.search = params.search;
    if (params.sportType) queryParams.sportType = params.sportType;
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    return apiClient
      .get<ActivityListResponse>('/activities', { params: queryParams })
      .then((r) => r.data);
  },
  get: (id: number) => {
    return apiClient
      .get<{ activity: ActivityDetail }>(`/activities/${id}`)
      .then((r) => r.data.activity);
  },
  create: (input: CreateActivityInput) =>
    apiClient.post<{ activity: ActivityDetail }>('/activities', input).then((r) => r.data.activity),
  exportOne: (id: number) =>
    apiClient.get<Blob>(`/activities/${id}/gpx`, { responseType: 'blob' }).then((r) => ({
      blob: r.data,
      filename: parseFilenameFromContentDisposition(r.headers['content-disposition']),
    })),
  exportMany: (ids: number[]) =>
    apiClient.post<Blob>('/activities/export/gpx', { ids }, { responseType: 'blob' }).then((r) => ({
      blob: r.data,
      filename:
        parseFilenameFromContentDisposition(r.headers['content-disposition']) ?? 'actividades.zip',
    })),
};

function parseFilenameFromContentDisposition(header: unknown): string | undefined {
  if (typeof header !== 'string') return undefined;
  const match = /filename="?([^"]+)"?/i.exec(header);
  return match?.[1];
}
