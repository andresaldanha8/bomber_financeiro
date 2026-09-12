import { Router } from 'express';
import { prisma } from '../lib/prisma';
import {
  createSession,
  getSessionUser,
  revokeSession,
  verifyPassword,
} from '../services/auth.service';

const router = Router();

const SESSION_COOKIE = 'bomber_session';

function publicUser(user: {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'PROFESSOR';
  active: boolean;
  avatar: string | null;
  chavePix: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active,
    avatar: user.avatar,
    chavePix: user.chavePix,
  };
}

router.post('/login', async (req, res) => {
  try {
    const username =
      typeof req.body?.username === 'string'
        ? req.body.username.trim()
        : '';

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : '';

    if (!username || !password) {
      return res.status(400).json({
        message: 'Usuário e senha são obrigatórios.',
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (!user || !user.active) {
      return res.status(401).json({
        message: 'Usuário ou senha inválidos.',
      });
    }

    const passwordIsValid = await verifyPassword(
      password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        message: 'Usuário ou senha inválidos.',
      });
    }

    const session = await createSession(user.id);

    res.cookie(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: session.expiresAt,
      path: '/',
    });

    return res.status(200).json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Erro no login:', error);

    return res.status(500).json({
      message: 'Erro interno ao realizar login.',
    });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];

    if (!token) {
      return res.status(401).json({
        message: 'Não autenticado.',
      });
    }

    const user = await getSessionUser(token);

    if (!user) {
      res.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });

      return res.status(401).json({
        message: 'Sessão inválida ou expirada.',
      });
    }

    return res.status(200).json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Erro ao validar sessão:', error);

    return res.status(500).json({
      message: 'Erro interno ao validar sessão.',
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];

    if (token) {
      await revokeSession(token);
    }

    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Erro no logout:', error);

    return res.status(500).json({
      message: 'Erro interno ao realizar logout.',
    });
  }
});

export default router;