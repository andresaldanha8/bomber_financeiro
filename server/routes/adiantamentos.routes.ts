import { Router, type Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.middleware';
import * as AdiantamentosService from '../services/adiantamentos.service';

const router = Router();
router.use(requireAuth);

function responderErro(res: Response, error: unknown) {
  if (error instanceof AdiantamentosService.AdiantamentoError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error('Erro na API de adiantamentos:', error);
  return res.status(500).json({ message: 'Erro interno ao processar adiantamento.' });
}

function bodyVazio(req: AuthenticatedRequest, res: Response): boolean {
  if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length)) {
    res.status(400).json({ message: 'Confirmação não aceita campos no body.' });
    return false;
  }
  return true;
}

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    return res.status(200).json({ adiantamentos: await AdiantamentosService.listarAdiantamentos(req.query, req.authUser!) });
  } catch (error) { return responderErro(res, error); }
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    return res.status(200).json({ adiantamento: await AdiantamentosService.getAdiantamentoById(req.params.id, req.authUser!) });
  } catch (error) { return responderErro(res, error); }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser!.role !== 'PROFESSOR') return res.status(403).json({ message: 'Acesso restrito ao PROFESSOR.' });
    return res.status(201).json({ adiantamento: await AdiantamentosService.solicitarAdiantamento(req.body, req.authUser!) });
  } catch (error) { return responderErro(res, error); }
});

router.post('/:id/recusa', async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser!.role !== 'ADMIN') return res.status(403).json({ message: 'Acesso restrito ao ADMIN.' });
    return res.status(200).json({ adiantamento: await AdiantamentosService.recusarAdiantamento(req.params.id, req.body, req.authUser!) });
  } catch (error) { return responderErro(res, error); }
});

router.post('/:id/confirmacao', async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser!.role !== 'PROFESSOR') return res.status(403).json({ message: 'Acesso restrito ao PROFESSOR.' });
    if (!bodyVazio(req, res)) return;
    return res.status(200).json({ adiantamento: await AdiantamentosService.confirmarRecebimento(req.params.id, req.authUser!) });
  } catch (error) { return responderErro(res, error); }
});

export default router;
