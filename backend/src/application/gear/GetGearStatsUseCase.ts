import { GearRepository, GearDistanceStat } from '../../domain/gear/GearRepository';
import { ForbiddenError } from '../../domain/shared/DomainError';

export interface GetGearStatsInput {
  requesterId: number;
  requesterRole: 'admin' | 'user';
  /** 'me' → el propio atleta | 'global' → todos (solo admin) | number → atleta concreto (solo admin) */
  scope: 'me' | 'global' | number;
}

export class GetGearStatsUseCase {
  constructor(private readonly gearRepo: GearRepository) {}

  async execute(input: GetGearStatsInput): Promise<GearDistanceStat[]> {
    const { requesterId, requesterRole, scope } = input;

    if (scope === 'global') {
      if (requesterRole !== 'admin') throw new ForbiddenError();
      return this.gearRepo.getGlobalGearDistanceStats();
    }

    if (typeof scope === 'number') {
      if (requesterRole !== 'admin' && scope !== requesterId) throw new ForbiddenError();
      return this.gearRepo.getGearDistanceStats(scope);
    }

    // scope === 'me'
    return this.gearRepo.getGearDistanceStats(requesterId);
  }
}
