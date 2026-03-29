import { Router, type Request, type Response } from 'express';
import { GetActivitiesUseCase } from '../../../application/usecases/GetActivitiesUseCase';
import { GetActivityByIdUseCase } from '../../../application/usecases/GetActivityByIdUseCase';
import { PostgresActivityRepository } from '../../database/PostgresActivityRepository';
import { getPool } from '../../database/pool';

const router = Router();
const activityRepository = new PostgresActivityRepository(getPool());
const getActivitiesUseCase = new GetActivitiesUseCase(activityRepository);
const getActivityByIdUseCase = new GetActivityByIdUseCase(activityRepository);

// GET /api/activities?athleteId=<id>
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { athleteId } = req.query;
  if (!athleteId || typeof athleteId !== 'string') {
    res.status(400).json({ error: 'athleteId query parameter is required' });
    return;
  }
  try {
    const activities = await getActivitiesUseCase.execute(athleteId);
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/activities/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const activity = await getActivityByIdUseCase.execute(String(req.params.id));
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }
    res.json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
