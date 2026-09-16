-- RDD-002.7.1: estrutura de adiantamentos, sem dados ou integracao funcional com Caixa.
BEGIN;

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
