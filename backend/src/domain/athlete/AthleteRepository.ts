import { Athlete, AthletePublic } from './Athlete';

export interface AthleteRepository {
  findById(id: number): Promise<Athlete | null>;
  findByEmail(email: string): Promise<Athlete | null>;
  findAll(): Promise<AthletePublic[]>;
  deleteById(id: number): Promise<void>;
}
