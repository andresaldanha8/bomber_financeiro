-- Migration: add movimentos_caixa table and enums
BEGIN;

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

COMMIT;
