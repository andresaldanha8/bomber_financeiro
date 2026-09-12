import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';

const app = express();

const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'bomber-financeiro-api',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/users', usersRoutes);

app.listen(PORT, () => {
  console.log(`Bomber Financeiro API rodando em http://localhost:${PORT}`);
});