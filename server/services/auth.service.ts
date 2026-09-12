import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from '../lib/prisma';

const scrypt = promisify(scryptCallback);

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

const SESSION_DURATION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error('A senha deve possuir pelo menos 6 caracteres.');
  }

  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const [algorithm, salt, hash] = storedHash.split(':');

    if (algorithm !== 'scrypt' || !salt || !hash) {
      return false;
    }

    const storedKey = Buffer.from(hash, 'hex');

    if (storedKey.length !== KEY_LENGTH) {
      return false;
    }

    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

    return timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function getSessionUser(token: string) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  if (!session.user.active) {
    return null;
  }

  return session.user;
}

export async function revokeSession(token: string): Promise<void> {
  if (!token) {
    return;
  }

  const tokenHash = hashSessionToken(token);

  await prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}