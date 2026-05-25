import type { Athlete } from '../../src/domain/athlete/Athlete';
import type { Activity } from '../../src/domain/activity/Activity';
import type { DashboardData } from '../../src/domain/activity/ActivityRepository';

export function makeAthlete(overrides: Partial<Athlete> = {}): Athlete {
  return {
    id: 1,
    firstname: 'Ana',
    lastname: 'Runner',
    username: 'ana',
    email: 'ana@example.com',
    role: 'user',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // placeholder bcrypt-like
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1001,
    athleteId: 1,
    name: 'Morning Run',
    sportType: 'Run',
    startDate: new Date('2024-05-20T08:30:00Z'),
    startDateLocal: new Date('2024-05-20T08:30:00Z'),
    timezone: '(GMT+01:00) Europe/Madrid',
    distance: 5000,
    movingTime: 1500,
    elapsedTime: 1500,
    totalElevationGain: 50,
    hasHeartrate: false,
    trainer: false,
    commute: false,
    createdAt: new Date('2024-05-20T09:00:00Z'),
    ...overrides,
  };
}

export function makeDashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    weeklyVolume: [],
    monthlyDistance: [],
    heartRateZones: [],
    activityHeatmap: [],
    recentActivities: [],
    totalDistance: 0,
    totalActivities: 0,
    averagePaceSecPerKm: 0,
    ...overrides,
  };
}
