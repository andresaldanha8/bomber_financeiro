BEGIN;

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

COMMIT;
