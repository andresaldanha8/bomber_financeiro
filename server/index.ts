import 'dotenv/config';
import express from 'express';

const app = express();

const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'bomber-financeiro-api',
  });
});

app.listen(PORT, () => {
  console.log(`Bomber Financeiro API rodando em http://localhost:${PORT}`);
});