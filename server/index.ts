import 'dotenv/config';

import express from 'express';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import studentsRoutes from './routes/students.routes';
import mensalidadesRoutes from './routes/mensalidades.routes';
import pagamentosRoutes from './routes/pagamentos.routes';
import caixaRoutes from './routes/caixa.routes';
import despesasRoutes from './routes/despesas.routes';
import repassesRoutes from './routes/repasses.routes';

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

app.listen(PORT, () => {
  console.log(`Bomber Financeiro API rodando em http://localhost:${PORT}`);
});
