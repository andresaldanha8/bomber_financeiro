-- Migration: add pagamentos_alunos table and enums (deterministic)
BEGIN;

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

COMMIT;
