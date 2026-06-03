export interface Gear {
  id: string;
  athleteId: number;
  name: string;
  isPrimary: boolean;
  distance: number; // metros, dato informativo de Strava
  brand?: string;
  model?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
}
