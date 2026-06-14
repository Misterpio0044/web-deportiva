import { Athlete, AthletePublic } from './Athlete';

export interface CreateAthleteInput {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  passwordHash: string;
  role?: 'admin' | 'user';
}

export interface CreateAthleteFromStravaInput {
  stravaId: number;
  firstname: string;
  lastname: string;
  username: string;
  profileMediumUrl?: string;
  profileUrl?: string;
  weight?: number;
  measurementPreference?: string;
  scope: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}

export interface UpdateStravaTokensInput {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  scope?: string;
}

export interface UpdateStravaProfileInput {
  firstname?: string;
  lastname?: string;
  profileMediumUrl?: string;
  profileUrl?: string;
  weight?: number;
  measurementPreference?: string;
  lastStravaSyncAt?: Date;
}

export interface UpdateProfileInput {
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  maxHeartrate?: number;
}

export interface RecordSyncSuccessInput {
  at: Date;
  created: number;
  updated: number;
  deleted: number;
}

export interface RecordSyncErrorInput {
  at: Date;
  message: string;
}

export interface AthleteRepository {
  findById(id: number): Promise<Athlete | null>;
  findByEmail(email: string): Promise<Athlete | null>;
  findByUsername(username: string): Promise<Athlete | null>;
  findByStravaId(stravaId: number): Promise<Athlete | null>;
  findAll(): Promise<AthletePublic[]>;
  create(input: CreateAthleteInput): Promise<Athlete>;
  createFromStrava(input: CreateAthleteFromStravaInput): Promise<Athlete>;
  updateStravaTokens(athleteId: number, input: UpdateStravaTokensInput): Promise<void>;
  linkStravaAccount(
    athleteId: number,
    input: UpdateStravaTokensInput & { stravaId: number }
  ): Promise<void>;
  updateStravaProfile(athleteId: number, input: UpdateStravaProfileInput): Promise<void>;
  updateProfile(athleteId: number, input: UpdateProfileInput): Promise<Athlete>;
  updatePasswordHash(athleteId: number, passwordHash: string): Promise<void>;
  unlinkStravaAccount(athleteId: number): Promise<void>;
  recordSyncSuccess(athleteId: number, input: RecordSyncSuccessInput): Promise<void>;
  recordSyncError(athleteId: number, input: RecordSyncErrorInput): Promise<void>;
  deleteById(id: number): Promise<void>;
  updateRole(athleteId: number, role: 'admin' | 'user'): Promise<void>;
}
