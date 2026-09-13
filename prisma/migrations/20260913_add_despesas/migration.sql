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
