import { Router, type Response } from 'express';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.middleware';
import * as RepassesService from '../services/repasses.service';

const router = Router();
router.use(requireAuth);

function responderErro(res: Response, error: unknown) {
  if (error instanceof RepassesService.RepasseError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error('Erro na API de repasses:', error);
  return res.status(500).json({ message: 'Erro interno ao processar repasse.' });
}

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const repasses = await RepassesService.listarRepasses(req.query, req.authUser!);
    return res.status(200).json({ repasses });
  } catch (error) { return responderErro(res, error); }
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const repasse = await RepassesService.getRepasseById(req.params.id, req.authUser!);
    return res.status(200).json({ repasse });
  } catch (error) { return responderErro(res, error); }
});

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const repasse = await RepassesService.criarRepasse(req.body, req.authUser!);
    return res.status(201).json({ repasse });
  } catch (error) { return responderErro(res, error); }
});

router.post('/:id/confirmacao', async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser!.role !== 'PROFESSOR') return res.status(403).json({ message: 'Acesso restrito ao PROFESSOR.' });
    if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length)) {
      return res.status(400).json({ message: 'Confirmação não aceita campos no body.' });
    }
    const repasse = await RepassesService.confirmarRecebimento(req.params.id, req.authUser!);
    return res.status(200).json({ repasse });
  } catch (error) { return responderErro(res, error); }
});

export default router;
