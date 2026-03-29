export interface Athlete {
  id: string;
  stravaId: number;
  username: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  city: string | null;
  country: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}
