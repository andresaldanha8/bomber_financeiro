import { NextFunction, Request, Response } from 'express';

import { getSessionUser } from '../services/auth.service';

const SESSION_COOKIE = 'bomber_session';

export interface AuthenticatedRequest extends Request {
  authUser?: {
    id: string;
    name: string;
    username: string;
    role: 'ADMIN' | 'PROFESSOR';
    active: boolean;
    avatar: string | null;
    chavePix: string | null;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];

    if (!token) {
      return res.status(401).json({
        message: 'Não autenticado.',
      });
    }

    const user = await getSessionUser(token);

    if (!user) {
      return res.status(401).json({
        message: 'Sessão inválida ou expirada.',
      });
    }

    req.authUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      active: user.active,
      avatar: user.avatar,
      chavePix: user.chavePix,
    };

    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);

    return res.status(500).json({
      message: 'Erro interno de autenticação.',
    });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.authUser) {
    return res.status(401).json({
      message: 'Não autenticado.',
    });
  }

  if (req.authUser.role !== 'ADMIN') {
    return res.status(403).json({
      message: 'Acesso restrito ao ADMIN.',
    });
  }

  next();
}