import { Prisma, type PrismaClient } from '../../src/generated/prisma/client';

/**
 * Até 3 tentativas TOTAIS, cada uma com nova transação ReadCommitted.
 * Callback deve conter somente operações transacionais, sem efeitos externos.
 * P2034: retry integral após rollback. Erro final preservado.
 * P2002: sempre propaga. O chamador deve avaliar a constraint e, somente se
 * equivalente/idempotente, abrir nova transação para reler e validar o registro.
 * Nunca continuar consultando uma tx que sofreu unique violation.
 */
export async function executarTransacaoComRetry<T>(
  client: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const maxTentativas = 3;
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await client.$transaction(operation, { isolationLevel: 'ReadCommitted' });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034' || tentativa >= maxTentativas) throw error;
    }
  }
}
