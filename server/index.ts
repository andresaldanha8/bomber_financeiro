import 'dotenv/config';

import { fileURLToPath } from 'node:url';

import express from 'express';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import studentsRoutes from './routes/students.routes.js';
import mensalidadesRoutes from './routes/mensalidades.routes.js';
import pagamentosRoutes from './routes/pagamentos.routes.js';
import caixaRoutes from './routes/caixa.routes.js';
import despesasRoutes from './routes/despesas.routes.js';
import repassesRoutes from './routes/repasses.routes.js';
import adiantamentosRoutes from './routes/adiantamentos.routes.js';

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
app.use('/api/students', studentsRoutes);
app.use('/api', mensalidadesRoutes);
app.use('/api', pagamentosRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/repasses', repassesRoutes);
app.use('/api/adiantamentos', adiantamentosRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

if (process.env.NODE_ENV === 'production') {
  const clientDir = fileURLToPath(
    new URL('../client/', import.meta.url),
  );

  app.use(express.static(clientDir));
}

app.listen(PORT, () => {
  console.log(`Bomber Financeiro API rodando em http://localhost:${PORT}`);
});
