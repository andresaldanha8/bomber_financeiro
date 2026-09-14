-- RDD-002.6.1: estrutura de repasses, sem dados ou integracao com Caixa.
BEGIN;

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

COMMIT;
