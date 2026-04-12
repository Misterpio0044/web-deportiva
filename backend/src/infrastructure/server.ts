import express, { Request, Response } from 'express';

const app = express();
const PORT = 3000;

// Para que el servidor entienda datos en formato JSON y los traduzca a javaScript
app.use(express.json());

// Ruta de prueba
app.get('/api/km', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'OK' });
});

app.listen(PORT, () => {
  console.log(`[Servidor]: Corriendo en http://localhost:${PORT}`);
});
