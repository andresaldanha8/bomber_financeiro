# RDD-002.6 — Repasses de Professores

Data: 2026-09-14

## Objetivo

Migrar Repasses de Professores do localStorage para PostgreSQL, integrando cada repasse registrado pelo ADMIN a exatamente uma SAIDA no Caixa oficial.

O sistema não executa transferência bancária. O ADMIN apenas registra um repasse que já foi realizado externamente. O PROFESSOR confirma posteriormente o recebimento como recibo digital.

## Escopo deste documento

Registrar o contrato oficial de cadastro, persistência, autorização, integração com Caixa, confirmação, imutabilidade e datas de `RepasseProfessor`.

Esta etapa é exclusivamente documental: não implementa schema, migration, frontend ou backend.

## Fonte oficial

Após a migração, PostgreSQL será a única fonte oficial de Repasses.

Não usar no novo fluxo:

- localStorage;
- fallback para dados locais;
- dupla fonte de dados;
- sincronização com `PagamentoProfessor` legado.

Não migrar automaticamente seeds nem registros existentes do localStorage.

## Terminologia

Nome conceitual e técnico: `RepasseProfessor`.

Textos oficiais:

- Registrar Repasse;
- Repasses;
- Confirmar que recebi;
- Aguardando confirmação;
- Confirmado.

Evitar “Pagamento de Professor” para o novo fluxo.

## Cadastro pelo ADMIN

Somente ADMIN pode criar um repasse.

Campos obrigatórios:

| Campo | Contrato |
|---|---|
| `professorId` | Identifica um `User` PostgreSQL com `role = PROFESSOR` e `active = true` no momento do novo cadastro |
| `competencia` | Referência mensal estruturada no formato `YYYY-MM`; o frontend pode exibir de forma amigável |
| `valor` | `Decimal(10,2)`, maior que zero |
| `dataRepasse` | Data civil `YYYY-MM-DD` do repasse realizado externamente |
| `formaPagamento` | Somente `PIX`, `DINHEIRO` ou `TRANSFERENCIA` |

Todo novo repasse nasce com `status = AGUARDANDO_RECEBIMENTO`.

Registrar automaticamente:

- `registradoPorId = ADMIN autenticado`;
- `registradoEm = timestamp do servidor`.

## Status

Somente os seguintes status são permitidos:

- `AGUARDANDO_RECEBIMENTO`;
- `RECEBIMENTO_CONFIRMADO`.

Apresentação correspondente: “Aguardando confirmação” e “Confirmado”.

## Integração com Caixa

Ao criar um `RepasseProfessor`, deve nascer exatamente um `MovimentoCaixa` na mesma transação PostgreSQL.

| Campo do movimento | Valor obrigatório |
|---|---|
| `tipo` | `SAIDA` |
| `origem` | `REPASSE_PROFESSOR` |
| `valor` | `RepasseProfessor.valor` |
| `dataFinanceira` | `RepasseProfessor.dataRepasse` |
| `referenciaId` | `RepasseProfessor.id` |
| `criadoPorId` | ADMIN autenticado |
| `chaveIdempotencia` | `REPASSE_PROFESSOR:<repasseId>` |

A `descricao` do movimento pode identificar o professor e a competência.

O Caixa usa a data real do repasse externo. Não usar `registradoEm` nem `confirmadoEm` como `dataFinanceira`.

## Atomicidade

A criação do `RepasseProfessor` e do `MovimentoCaixa` deve ocorrer na mesma transação PostgreSQL.

- Se a criação do movimento falhar, o repasse não pode permanecer criado isoladamente.
- Se a criação do repasse falhar, o movimento não pode existir.
- Reaproveitar `executarTransacaoComRetry`.
- A restrição `UNIQUE` em `chaveIdempotencia` continua sendo a proteção final contra duplicidade do movimento.
- Não capturar `P2002` e continuar operações dentro da mesma transação PostgreSQL.

## Confirmação pelo PROFESSOR

Somente o PROFESSOR destinatário pode confirmar o recebimento.

A autorização exige perfil PROFESSOR e a condição:

`req.authUser.id === repasse.professorId`

ADMIN não confirma em nome do professor.

Na primeira confirmação, registrar:

- `status = RECEBIMENTO_CONFIRMADO`;
- `confirmadoPorId = PROFESSOR autenticado`;
- `confirmadoEm = timestamp do servidor`.

A confirmação:

- não cria `MovimentoCaixa`;
- não altera `valor`;
- não altera `dataRepasse`;
- não altera `competencia`;
- não altera `formaPagamento`.

## Idempotência da confirmação

Para o PROFESSOR destinatário autorizado, se o repasse já estiver `RECEBIMENTO_CONFIRMADO`:

- retornar o estado atual;
- responder HTTP 200;
- não sobrescrever `confirmadoEm`;
- não gerar nova movimentação;
- não alterar o recibo, inclusive a identidade de quem confirmou;
- não criar novo efeito financeiro.

## Imutabilidade

Depois de criado, não permitir alteração de:

- `professorId`;
- `competencia`;
- `valor`;
- `dataRepasse`;
- `formaPagamento`;
- `registradoPorId`;
- `registradoEm`.

A confirmação segue exclusivamente as regras específicas deste documento.

Não implementar PATCH genérico, DELETE ou estorno nesta RDD.

## Datas e competência

| Campo | Semântica |
|---|---|
| `dataRepasse` | `DATE` civil, transmitida como `YYYY-MM-DD`; dia do repasse externo |
| `registradoEm` | Timestamp do servidor no registro pelo ADMIN |
| `confirmadoEm` | Timestamp do servidor na confirmação; nullable antes da confirmação |
| `competencia` | Referência mensal estruturada `YYYY-MM` |

Não usar horário artificial de 12:00 UTC.

## Professores e preservação do histórico

Novos repasses somente podem ser destinados a usuários PostgreSQL com `role = PROFESSOR` e `active = true` no momento do cadastro.

Se o professor ficar inativo depois, não apagar o histórico. O repasse continua legível conforme as permissões de acesso e confirmável pelo destinatário somente se a regra de autenticação permitir sessão válida. Esta RDD não flexibiliza as regras de autenticação existentes.

Não depender de IDs legacy. Não usar `financeService.getUsers` no novo fluxo.

## Autorização

O backend é a autoridade final para todas as operações.

| Operação | ADMIN | PROFESSOR |
|---|---|---|
| Listar | Todos os repasses | Somente os próprios |
| Criar | Permitido | Não permitido |
| Visualizar detalhe | Qualquer repasse | Somente o próprio |
| Confirmar recebimento | Não permitido | Somente o próprio |
| Editar | Não permitido | Não permitido |
| Excluir | Não permitido | Não permitido |

## Recibo digital

“Recibo digital” nesta RDD significa registro persistente da confirmação. Não é assinatura criptográfica.

Deve permitir rastrear:

- repasse;
- professor;
- valor;
- `competencia`;
- `dataRepasse`;
- `formaPagamento`;
- `confirmadoPorId`;
- `confirmadoEm`.

## Dados legados

Não migrar automaticamente:

- `PAGAMENTOS_PROFESSORES`;
- `mov-03`;
- `mov-06`;
- `pag-prof-01`;
- `pag-prof-02`;
- logs locais relacionados.

Não reconciliar automaticamente esses dados com `MovimentoCaixa` PostgreSQL.

## Frontend futuro

Migrar posteriormente:

- `TeacherPaymentModal`;
- `TeacherPaymentsView`;
- badges e callbacks de `App`;
- textos de Caixa e fechamento que ainda dizem que repasses não estão integrados.

O modal ADMIN deve usar a lista real PostgreSQL de professores. A confirmação do professor deve usar API real. Não haverá fallback para localStorage.

## Fora de escopo

Não incluir nesta RDD:

- observação do repasse;
- comprovante;
- anexos;
- edição;
- exclusão;
- cancelamento;
- estorno;
- transferência bancária executada pelo sistema;
- migração ou reconciliação automática de dados legados.

## Microetapas

### RDD-002.6.1 — Schema + migration + constraints

Definir e implementar posteriormente a persistência PostgreSQL e as restrições correspondentes ao contrato deste documento.

### RDD-002.6.2 — Serviço/API backend

Implementar posteriormente cadastro, listagem, detalhe e confirmação, com autorização no backend, validação e preservação do recibo.

### RDD-002.6.3 — Repasse → Caixa PostgreSQL

Implementar e validar posteriormente a criação de exatamente uma SAIDA por repasse, na mesma transação, com a chave de idempotência definida e sem movimento na confirmação.

### RDD-002.6.4 — Frontend Repasses PostgreSQL

Migrar posteriormente os consumidores para API real, professores PostgreSQL, terminologia oficial, badges, callbacks e textos de integração com Caixa.

A divisão em microetapas não altera o contrato de atomicidade: o cadastro integrado não pode deixar repasse persistido sem seu movimento correspondente.

## Verificação desta etapa documental

Criar somente `docs/requirements/RDD-002-6-repasses-professores.md` e executar:

```text
git diff --check
git status --short --untracked-files=all
```

Status esperado:

```text
?? docs/requirements/RDD-002-6-repasses-professores.md
```

Não alterar outro arquivo. Não implementar schema, migration, frontend ou backend nesta etapa. Não fazer commit.
