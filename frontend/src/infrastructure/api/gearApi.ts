import apiClient from './client';

export interface GearStat {
  gearId: string;
  name: string;
  brand?: string;
  model?: string;
  isPrimary: boolean;
  totalDistance: number; // metros
  activityCount: number;
}

export const gearApi = {
  stats: (opts: { athleteId?: number; global?: boolean } = {}) => {
    const params: Record<string, string> = {};
    if (opts.global) {
      params.scope = 'global';
    } else if (opts.athleteId != null) {
      params.athleteId = String(opts.athleteId);
    }
    return apiClient
      .get<{ stats: GearStat[] }>('/gear/stats', { params })
      .then((r) => r.data.stats);
  },
};
