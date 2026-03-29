import 'dotenv/config';
import app from './infrastructure/http/app';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
