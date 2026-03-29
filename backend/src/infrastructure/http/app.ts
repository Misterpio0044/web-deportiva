import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import activitiesRouter from './routes/activities';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/activities', activitiesRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
