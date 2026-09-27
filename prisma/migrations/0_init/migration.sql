BEGIN;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PROFESSOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PROFESSOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "chavePix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "EntryCondition" AS ENUM ('INDIVIDUAL', 'DUPLA', 'TRIO_MAIS');

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "entryCondition" "EntryCondition" NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ATIVO',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE INDEX "students_name_idx" ON "students"("name");

-- CreateIndex
CREATE INDEX "students_createdById_idx" ON "students"("createdById");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "StatusMensalidade" AS ENUM ('PENDENTE', 'QUITADA', 'ATRASADA', 'AGUARDANDO_CONFIRMACAO');

-- CreateTable
CREATE TABLE "mensalidades" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "competencia" DATE NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "isPagamentoInicial" BOOLEAN NOT NULL DEFAULT false,
    "diaBaseNaGeracao" INTEGER NOT NULL,
    "status" "StatusMensalidade" NOT NULL DEFAULT 'PENDENTE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensalidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_activity_periods" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "startedById" TEXT NOT NULL,
    "endedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_activity_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mensalidades_status_dataVencimento_idx" ON "mensalidades"("status", "dataVencimento");

-- CreateIndex
CREATE INDEX "mensalidades_dataVencimento_idx" ON "mensalidades"("dataVencimento");

-- CreateIndex
CREATE INDEX "mensalidades_competencia_idx" ON "mensalidades"("competencia");

-- CreateIndex
CREATE INDEX "mensalidades_createdById_idx" ON "mensalidades"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "mensalidades_studentId_competencia_key" ON "mensalidades"("studentId", "competencia");

-- CreateIndex
CREATE INDEX "student_activity_periods_studentId_startedAt_idx" ON "student_activity_periods"("studentId", "startedAt");

-- CreateIndex
CREATE INDEX "student_activity_periods_startedById_idx" ON "student_activity_periods"("startedById");

-- CreateIndex
CREATE INDEX "student_activity_periods_endedById_idx" ON "student_activity_periods"("endedById");

-- AddForeignKey
ALTER TABLE "mensalidades" ADD CONSTRAINT "mensalidades_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensalidades" ADD CONSTRAINT "mensalidades_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_activity_periods" ADD CONSTRAINT "student_activity_periods_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_activity_periods" ADD CONSTRAINT "student_activity_periods_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_activity_periods" ADD CONSTRAINT "student_activity_periods_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras de dominio complementares ao schema Prisma.
ALTER TABLE "mensalidades"
    ADD CONSTRAINT "mensalidades_valor_positive_check" CHECK ("valor" > 0),
    ADD CONSTRAINT "mensalidades_dia_base_check" CHECK ("diaBaseNaGeracao" BETWEEN 1 AND 31),
    ADD CONSTRAINT "mensalidades_competencia_first_day_check" CHECK (EXTRACT(DAY FROM "competencia") = 1),
    ADD CONSTRAINT "mensalidades_inicial_not_atrasada_check" CHECK (NOT "isPagamentoInicial" OR "status" <> 'ATRASADA');

CREATE UNIQUE INDEX "mensalidades_studentId_inicial_key"
    ON "mensalidades"("studentId") WHERE "isPagamentoInicial" = true;

ALTER TABLE "student_activity_periods"
    ADD CONSTRAINT "student_activity_periods_temporal_check"
    CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");

-- No maximo um periodo ativo aberto por Student.
CREATE UNIQUE INDEX "student_activity_periods_studentId_open_key"
    ON "student_activity_periods"("studentId") WHERE "endedAt" IS NULL;

-- Migration: add pagamentos_alunos table and enums (deterministic)

-- Enums
CREATE TYPE forma_pagamento AS ENUM ('PIX', 'DINHEIRO');
CREATE TYPE status_confirmacao_pagamento AS ENUM ('AGUARDANDO', 'CONFIRMADO');

-- Tabela de pagamentos de alunos
CREATE TABLE pagamentos_alunos (
  id TEXT PRIMARY KEY,
  mensalidade_id TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento forma_pagamento NOT NULL,
  status_confirmacao status_confirmacao_pagamento NOT NULL DEFAULT 'AGUARDANDO',
  data_pagamento DATE NOT NULL,
  registrado_por_id TEXT NOT NULL,
  confirmado_por_id TEXT,
  confirmado_em TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_valor_positive CHECK (valor > 0),
  CONSTRAINT chk_confirm_consistency CHECK (
    (status_confirmacao = 'AGUARDANDO' AND confirmado_por_id IS NULL AND confirmado_em IS NULL)
    OR
    (status_confirmacao = 'CONFIRMADO' AND confirmado_por_id IS NOT NULL AND confirmado_em IS NOT NULL)
  )
);

-- Índices
CREATE INDEX idx_pagamentos_mensalidade ON pagamentos_alunos (mensalidade_id);
CREATE INDEX idx_pagamentos_registrado_por ON pagamentos_alunos (registrado_por_id);
CREATE INDEX idx_pagamentos_confirmado_por ON pagamentos_alunos (confirmado_por_id);

-- Único pagamento ativo por mensalidade (AGUARDANDO ou CONFIRMADO)
CREATE UNIQUE INDEX uq_pagamento_ativo ON pagamentos_alunos (mensalidade_id) WHERE status_confirmacao IN ('AGUARDANDO','CONFIRMADO');

-- FKs (restritivos)
ALTER TABLE pagamentos_alunos
  ADD CONSTRAINT fk_pagamento_mensalidade FOREIGN KEY (mensalidade_id) REFERENCES mensalidades(id) ON DELETE RESTRICT;

ALTER TABLE pagamentos_alunos
  ADD CONSTRAINT fk_pagamento_registrado_por FOREIGN KEY (registrado_por_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE pagamentos_alunos
  ADD CONSTRAINT fk_pagamento_confirmado_por FOREIGN KEY (confirmado_por_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Migration: add movimentos_caixa table and enums

-- Enums
CREATE TYPE tipo_movimento_caixa AS ENUM ('SALDO_INICIAL', 'ENTRADA', 'SAIDA');
CREATE TYPE origem_movimento_caixa AS ENUM ('SALDO_INICIAL', 'PAGAMENTO_ALUNO', 'DESPESA', 'REPASSE_PROFESSOR', 'ADIANTAMENTO_PROFESSOR', 'ESTORNO', 'AJUSTE');

-- Tabela de movimentos do caixa
CREATE TABLE movimentos_caixa (
  id TEXT PRIMARY KEY,
  tipo tipo_movimento_caixa NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_financeira DATE NOT NULL,
  descricao TEXT,
  origem origem_movimento_caixa NOT NULL,
  referencia_id TEXT,
  chave_idempotencia VARCHAR(255) NOT NULL,
  criado_por_id TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Constraints
-- Valor rules: SALDO_INICIAL => valor >= 0; ENTRADA/SAIDA => valor > 0
ALTER TABLE movimentos_caixa
  ADD CONSTRAINT chk_mov_caixa_valor CHECK (
    (tipo = 'SALDO_INICIAL' AND valor >= 0)
    OR
    (tipo IN ('ENTRADA','SAIDA') AND valor > 0)
  );

-- SALDO_INICIAL equivalence constraint (tipo <-> origem)
ALTER TABLE movimentos_caixa
  ADD CONSTRAINT chk_mov_caixa_saldo_equivalence CHECK (
    (tipo = 'SALDO_INICIAL' AND origem = 'SALDO_INICIAL')
    OR
    (tipo <> 'SALDO_INICIAL' AND origem <> 'SALDO_INICIAL')
  );

-- Idempotencia: chave_idempotencia NOT NULL UNIQUE
ALTER TABLE movimentos_caixa
  ADD CONSTRAINT uq_movimentos_chave_idempotencia UNIQUE (chave_idempotencia);

-- Foreign key criadoPorId -> users(id)
ALTER TABLE movimentos_caixa
  ADD CONSTRAINT fk_movimentos_criado_por FOREIGN KEY (criado_por_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Indices
CREATE INDEX idx_movimentos_data_financeira ON movimentos_caixa (data_financeira);
CREATE INDEX idx_movimentos_origem_referencia ON movimentos_caixa (origem, referencia_id);
CREATE INDEX idx_movimentos_tipo_data ON movimentos_caixa (tipo, data_financeira);

-- Migration: 20260913_add_despesas
-- Cria enums e tabela despesas com constraints e índices

-- Enum categoria de despesa
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'despesa_categoria') THEN
        CREATE TYPE despesa_categoria AS ENUM (
            'Professores',
            'Energia',
            'Água',
            'Internet',
            'Aluguel',
            'Manutenção',
            'Equipamentos',
            'Produtos/Material',
            'Impostos/Taxas',
            'Outros'
        );
    END IF;
END$$;

-- Enum status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'despesa_status') THEN
        CREATE TYPE despesa_status AS ENUM ('PENDENTE', 'PAGA');
    END IF;
END$$;

-- Criar tabela despesas
CREATE TABLE IF NOT EXISTS despesas (
    id TEXT PRIMARY KEY,
    descricao TEXT NOT NULL,
    categoria despesa_categoria NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    data_despesa DATE NOT NULL,
    status despesa_status NOT NULL DEFAULT 'PENDENTE',
    criado_por_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_pagamento DATE,
    forma_pagamento VARCHAR(100),
    pago_por_id TEXT,
    pago_em TIMESTAMPTZ,
    observacao TEXT
);

-- Foreign keys
ALTER TABLE despesas
  ADD CONSTRAINT fk_despesas_criado_por FOREIGN KEY (criado_por_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE despesas
  ADD CONSTRAINT fk_despesas_pago_por FOREIGN KEY (pago_por_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Valor positivo
ALTER TABLE despesas
  ADD CONSTRAINT chk_despesas_valor_positive CHECK (valor > 0);

-- Consistência PENDENTE/PAGA
ALTER TABLE despesas
  ADD CONSTRAINT chk_despesas_status_consistency CHECK (
    (status = 'PENDENTE' AND data_pagamento IS NULL AND forma_pagamento IS NULL AND pago_por_id IS NULL AND pago_em IS NULL)
    OR
    (status = 'PAGA' AND data_pagamento IS NOT NULL AND forma_pagamento IS NOT NULL AND pago_por_id IS NOT NULL AND pago_em IS NOT NULL)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas(status);
CREATE INDEX IF NOT EXISTS idx_despesas_data_despesa ON despesas(data_despesa);
CREATE INDEX IF NOT EXISTS idx_despesas_data_pagamento ON despesas(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas((categoria));

-- Fim migration

-- RDD-002.6.1: estrutura de repasses, sem dados ou integracao com Caixa.

CREATE TYPE repasse_professor_status AS ENUM (
    'AGUARDANDO_RECEBIMENTO',
    'RECEBIMENTO_CONFIRMADO'
);

CREATE TABLE repasses_professores (
    id TEXT NOT NULL,
    professor_id TEXT NOT NULL,
    competencia VARCHAR(7) NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    data_repasse DATE NOT NULL,
    forma_pagamento VARCHAR(100) NOT NULL,
    status repasse_professor_status NOT NULL DEFAULT 'AGUARDANDO_RECEBIMENTO',
    registrado_por_id TEXT NOT NULL,
    registrado_em TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmado_por_id TEXT,
    confirmado_em TIMESTAMPTZ(3),

    CONSTRAINT repasses_professores_pkey PRIMARY KEY (id),
    CONSTRAINT repasses_professores_professor_id_fkey FOREIGN KEY (professor_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT repasses_professores_registrado_por_id_fkey FOREIGN KEY (registrado_por_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT repasses_professores_confirmado_por_id_fkey FOREIGN KEY (confirmado_por_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,

    CONSTRAINT chk_repasses_valor_positive CHECK (valor > 0),
    CONSTRAINT chk_repasses_competencia CHECK (
        competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    ),
    CONSTRAINT chk_repasses_forma_pagamento CHECK (
        forma_pagamento IN ('PIX', 'DINHEIRO', 'TRANSFERENCIA')
    ),
    CONSTRAINT chk_repasses_confirmacao CHECK (
        (status = 'AGUARDANDO_RECEBIMENTO' AND confirmado_por_id IS NULL AND confirmado_em IS NULL)
        OR
        (status = 'RECEBIMENTO_CONFIRMADO' AND confirmado_por_id IS NOT NULL AND confirmado_em IS NOT NULL)
    )
);

CREATE INDEX idx_repasses_professor ON repasses_professores(professor_id);
CREATE INDEX idx_repasses_status ON repasses_professores(status);
CREATE INDEX idx_repasses_data_repasse ON repasses_professores(data_repasse);
CREATE INDEX idx_repasses_competencia ON repasses_professores(competencia);
CREATE INDEX idx_repasses_registrado_por ON repasses_professores(registrado_por_id);
CREATE INDEX idx_repasses_confirmado_por ON repasses_professores(confirmado_por_id);

-- RDD-002.7.1: estrutura de adiantamentos, sem dados ou integracao funcional com Caixa.

CREATE TYPE adiantamento_professor_status AS ENUM (
    'SOLICITADO',
    'RECUSADO',
    'PAGO_AGUARDANDO_CONFIRMACAO',
    'CONFIRMADO'
);

CREATE TABLE adiantamentos_professores (
    id TEXT NOT NULL,
    professor_id TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    motivo TEXT,
    status adiantamento_professor_status NOT NULL DEFAULT 'SOLICITADO',
    analisado_por_id TEXT,
    analisado_em TIMESTAMPTZ(3),
    motivo_recusa TEXT,
    data_pagamento DATE,
    forma_pagamento VARCHAR(100),
    registrado_por_id TEXT,
    pago_em TIMESTAMPTZ(3),
    observacao_pagamento TEXT,
    confirmado_por_id TEXT,
    confirmado_em TIMESTAMPTZ(3),
    created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT adiantamentos_professores_pkey PRIMARY KEY (id),
    CONSTRAINT adiantamentos_professores_professor_id_fkey FOREIGN KEY (professor_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT adiantamentos_professores_analisado_por_id_fkey FOREIGN KEY (analisado_por_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT adiantamentos_professores_registrado_por_id_fkey FOREIGN KEY (registrado_por_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT adiantamentos_professores_confirmado_por_id_fkey FOREIGN KEY (confirmado_por_id)
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,

    CONSTRAINT chk_adiantamentos_valor CHECK (
        valor >= 0.01 AND valor <= 99999999.99
    ),
    CONSTRAINT chk_adiantamentos_forma_pagamento CHECK (
        forma_pagamento IS NULL
        OR forma_pagamento IN ('PIX', 'DINHEIRO', 'TRANSFERENCIA')
    ),
    CONSTRAINT chk_adiantamentos_data_pagamento CHECK (
        data_pagamento IS NULL
        OR data_pagamento >= (created_at AT TIME ZONE 'America/Sao_Paulo')::date
    ),
    CONSTRAINT chk_adiantamentos_status_consistency CHECK (
        (
            status = 'SOLICITADO'
            AND analisado_por_id IS NULL
            AND analisado_em IS NULL
            AND motivo_recusa IS NULL
            AND data_pagamento IS NULL
            AND forma_pagamento IS NULL
            AND registrado_por_id IS NULL
            AND pago_em IS NULL
            AND observacao_pagamento IS NULL
            AND confirmado_por_id IS NULL
            AND confirmado_em IS NULL
        )
        OR
        (
            status = 'RECUSADO'
            AND analisado_por_id IS NOT NULL
            AND analisado_em IS NOT NULL
            AND motivo_recusa IS NOT NULL
            AND btrim(motivo_recusa) <> ''
            AND data_pagamento IS NULL
            AND forma_pagamento IS NULL
            AND registrado_por_id IS NULL
            AND pago_em IS NULL
            AND observacao_pagamento IS NULL
            AND confirmado_por_id IS NULL
            AND confirmado_em IS NULL
        )
        OR
        (
            status = 'PAGO_AGUARDANDO_CONFIRMACAO'
            AND analisado_por_id IS NOT NULL
            AND analisado_em IS NOT NULL
            AND motivo_recusa IS NULL
            AND data_pagamento IS NOT NULL
            AND forma_pagamento IS NOT NULL
            AND registrado_por_id IS NOT NULL
            AND pago_em IS NOT NULL
            AND confirmado_por_id IS NULL
            AND confirmado_em IS NULL
        )
        OR
        (
            status = 'CONFIRMADO'
            AND analisado_por_id IS NOT NULL
            AND analisado_em IS NOT NULL
            AND motivo_recusa IS NULL
            AND data_pagamento IS NOT NULL
            AND forma_pagamento IS NOT NULL
            AND registrado_por_id IS NOT NULL
            AND pago_em IS NOT NULL
            AND confirmado_por_id IS NOT NULL
            AND confirmado_em IS NOT NULL
        )
    )
);

CREATE INDEX idx_adiantamentos_professor ON adiantamentos_professores(professor_id);
CREATE INDEX idx_adiantamentos_status ON adiantamentos_professores(status);
CREATE INDEX idx_adiantamentos_data_pagamento ON adiantamentos_professores(data_pagamento);
CREATE INDEX idx_adiantamentos_created_at ON adiantamentos_professores(created_at);

COMMIT;
