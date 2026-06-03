import { Gear } from './Gear';

export interface GearDistanceStat {
  gearId: string;
  name: string;
  brand?: string;
  model?: string;
  isPrimary: boolean;
  /** Suma real de activities.distance para este gear (metros) */
  totalDistance: number;
  activityCount: number;
}

export interface GearRepository {
  findByAthleteId(athleteId: number): Promise<Gear[]>;
  findAll(): Promise<Gear[]>;
  /**
   * Upsert transaccional: inserta/actualiza el gear del atleta y elimina
   * los registros que ya no aparezcan en la lista (sincronización limpia).
   * Si `gears` está vacío, no hace nada (protege contra revocación de scope).
   */
  upsertManyForAthlete(athleteId: number, gears: Gear[]): Promise<void>;
  getGearDistanceStats(athleteId: number): Promise<GearDistanceStat[]>;
  getGlobalGearDistanceStats(): Promise<GearDistanceStat[]>;
}
