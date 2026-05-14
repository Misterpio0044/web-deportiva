export interface Athlete {
  id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  passwordHash: string;
  profileMediumUrl?: string;
  maxHeartrate?: number;
  restingHeartrate?: number;
  weight?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AthletePublic = Omit<Athlete, 'passwordHash'>;
