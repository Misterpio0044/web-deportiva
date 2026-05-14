import { Athlete, AthletePublic } from './Athlete';

export interface CreateAthleteInput {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  passwordHash: string;
  role?: 'admin' | 'user';
}

export interface AthleteRepository {
  findById(id: number): Promise<Athlete | null>;
  findByEmail(email: string): Promise<Athlete | null>;
  findByUsername(username: string): Promise<Athlete | null>;
  findAll(): Promise<AthletePublic[]>;
  create(input: CreateAthleteInput): Promise<Athlete>;
  deleteById(id: number): Promise<void>;
}
