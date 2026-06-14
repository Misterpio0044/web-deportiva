export interface Athlete {
  id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string | null;
  role: 'admin' | 'user';
  passwordHash: string | null;
  profileMediumUrl?: string;
  profileUrl?: string;
  measurementPreference?: string;
  maxHeartrate?: number;
  restingHeartrate?: number;
  weight?: number;

  // Strava OAuth link
  stravaId?: number;
  stravaScope?: string;
  stravaAccessToken?: string;
  stravaRefreshToken?: string;
  stravaTokenExpiresAt?: Date;
  lastStravaSyncAt?: Date;
  lastStravaSyncStatus?: 'success' | 'error';
  lastStravaSyncError?: string;
  lastStravaSyncCreated?: number;
  lastStravaSyncUpdated?: number;
  lastStravaSyncDeleted?: number;

  createdAt: Date;
  updatedAt: Date;
}

export type AthletePublic = Omit<Athlete, 'passwordHash'> & { activityCount?: number };
