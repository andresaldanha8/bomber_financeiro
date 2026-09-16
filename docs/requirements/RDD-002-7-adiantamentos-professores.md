# RDD-002.7 — Adiantamentos de Professores

Data: 2026-09-16

## Objetivo

Migrar o fluxo de Adiantamentos de Professores do `localStorage` para PostgreSQL, preservando solicitação, análise administrativa, pagamento externo, integração com o Caixa oficial e confirmação de recebimento.

O Bomber Financeiro não transfere dinheiro. “Registrar Pagamento” significa registrar que o ADMIN já realizou externamente o pagamento ao professor.

Esta etapa é exclusivamente documental. Não implementa schema, migration, backend, frontend nem alteração de banco.

## Contexto e fonte de verdade

Após a migração, PostgreSQL será a única fonte de verdade para Adiantamentos de Professores.

Não haverá:

- fallback para `localStorage`;
- dual source;
- importação automática;
- migração automática de seeds ou mocks.

O seed legado `adiant-marcos-300`, de Prof. Marcos Andrade, no valor de R$ 300,00, não deve ser importado automaticamente. Qualquer tratamento excepcional de dado real legado exige decisão separada e inventário explícito.

Nome conceitual e técnico da entidade: `AdiantamentoProfessor`.

## Atores

### PROFESSOR

O PROFESSOR autenticado pode:

- listar somente seus próprios adiantamentos;
- visualizar somente seus próprios adiantamentos;
- solicitar adiantamento exclusivamente para si;
- confirmar somente o recebimento dos próprios adiantamentos pagos.

O PROFESSOR não pode pagar, recusar nem visualizar valores de outros professores.

### ADMIN

O ADMIN autenticado pode:

- listar todos os adiantamentos;
- visualizar qualquer adiantamento;
- recusar uma solicitação;
- registrar um pagamento externo.

O ADMIN não pode solicitar em nome de professor nem confirmar recebimento nesta RDD.

Toda autorização deve ser aplicada no backend. Filtros, IDs e controles visuais enviados pelo frontend nunca substituem a autorização baseada na sessão autenticada.

## Fluxo oficial

O fluxo oficial é:

```text
PROFESSOR solicita
→ ADMIN analisa
→ ADMIN recusa OU registra pagamento externo
→ se pago, nasce exatamente uma SAIDA no Caixa PostgreSQL
→ fica aguardando confirmação
→ PROFESSOR destinatário confirma recebimento
→ a confirmação não movimenta o Caixa novamente
```

Solicitar e recusar não movimentam o Caixa. Somente o registro administrativo do pagamento externo cria efeito financeiro.

## Estados

Somente os seguintes estados são permitidos:

- `SOLICITADO`;
- `RECUSADO`;
- `PAGO_AGUARDANDO_CONFIRMACAO`;
- `CONFIRMADO`.

## Transições permitidas

```text
SOLICITADO → RECUSADO
SOLICITADO → PAGO_AGUARDANDO_CONFIRMACAO
PAGO_AGUARDANDO_CONFIRMACAO → CONFIRMADO
```

`RECUSADO` e `CONFIRMADO` são estados terminais nesta RDD.

Não implementar:

- cancelamento;
- reabertura;
- estorno;
- edição genérica;
- exclusão.

## Modelo PostgreSQL mínimo

O modelo mínimo de `AdiantamentoProfessor` deve conter:

| Campo | Contrato |
|---|---|
| `id` | Identificador gerado pelo servidor |
| `professorId` | FK para `User`; destinatário e solicitante |
| `valor` | `Decimal(10,2)` |
| `motivo` | Texto nullable informado pelo PROFESSOR |
| `status` | Um dos quatro estados oficiais |
| `analisadoPorId` | FK nullable para o ADMIN que recusou ou registrou o pagamento |
| `analisadoEm` | Timestamp nullable do servidor |
| `motivoRecusa` | Texto nullable, obrigatório quando `status = RECUSADO` |
| `dataPagamento` | `DATE` nullable; data civil do pagamento externo |
| `formaPagamento` | Nullable; `PIX`, `DINHEIRO` ou `TRANSFERENCIA` |
| `registradoPorId` | FK nullable para o ADMIN que registrou o pagamento |
| `pagoEm` | Timestamp nullable do servidor |
| `observacaoPagamento` | Texto nullable |
| `confirmadoPorId` | FK nullable para o PROFESSOR destinatário |
| `confirmadoEm` | Timestamp nullable do servidor |
| `createdAt` | Timestamp do servidor; instante da solicitação |

Não persistir snapshots redundantes de nomes quando as relações com `User` forem suficientes.

### `dataSolicitacao` e `createdAt`

Os dois conceitos são semanticamente redundantes nesta RDD: a criação da linha é a solicitação. O modelo físico mínimo deve persistir somente `createdAt`, gerado pelo servidor, como instante oficial da solicitação.

A API e o frontend podem apresentar esse valor com o nome semântico `dataSolicitacao`, sem criar uma segunda coluna. A data civil da solicitação usada na validação do pagamento deve ser derivada de `createdAt` no fuso de negócio da aplicação.

## Consistência por estado

O banco deve possuir CHECKs coerentes com os quatro estados, no mínimo:

- `SOLICITADO`: sem análise, recusa, pagamento ou confirmação;
- `RECUSADO`: `analisadoPorId`, `analisadoEm` e `motivoRecusa` preenchidos; sem dados de pagamento ou confirmação;
- `PAGO_AGUARDANDO_CONFIRMACAO`: análise, registro e dados de pagamento preenchidos; sem confirmação;
- `CONFIRMADO`: todos os dados obrigatórios de pagamento e `confirmadoPorId`/`confirmadoEm` preenchidos.

As relações devem usar usuários PostgreSQL. Não depender de IDs ou usuários legados.

## Solicitação pelo PROFESSOR

Somente usuário autenticado com `role = PROFESSOR` pode solicitar.

`professorId` deve vir exclusivamente da sessão autenticada. A criação nunca deve aceitar `professorId` confiado do frontend.

Campos informados:

- `valor`, obrigatório;
- `motivo`, opcional.

Campos automáticos:

- `id`;
- `professorId`;
- `status = SOLICITADO`;
- `createdAt`, como instante da solicitação.

Regras do valor:

- `Decimal(10,2)`;
- mínimo R$ 0,01;
- máximo R$ 99.999.999,99;
- no máximo duas casas decimais;
- sem limite comercial adicional.

Múltiplas solicitações simultâneas do mesmo professor são permitidas. Não criar `UNIQUE` por professor/status.

A solicitação não movimenta o Caixa.

## Recusa pelo ADMIN

Somente ADMIN autenticado pode recusar.

Estado necessário: `SOLICITADO`.

O motivo da recusa é obrigatório.

Persistir, no mínimo:

- `status = RECUSADO`;
- `analisadoPorId = ADMIN autenticado`;
- `analisadoEm = timestamp do servidor`;
- `motivoRecusa`.

Não aceitar `analisadoPorId` informado pelo frontend. A recusa não cria `MovimentoCaixa`.

## Registro de pagamento externo pelo ADMIN

Somente ADMIN autenticado pode registrar pagamento.

Estado necessário: `SOLICITADO`.

Campos informados:

- `dataPagamento`;
- `formaPagamento`;
- `observacaoPagamento`, opcional.

Formas permitidas:

- `PIX`;
- `DINHEIRO`;
- `TRANSFERENCIA`.

Ao registrar o pagamento, persistir:

- `status = PAGO_AGUARDANDO_CONFIRMACAO`;
- `analisadoPorId = ADMIN autenticado`;
- `analisadoEm = timestamp do servidor`;
- `dataPagamento`;
- `formaPagamento`;
- `registradoPorId = ADMIN autenticado`;
- `pagoEm = timestamp do servidor`;
- `observacaoPagamento`, quando informada.

Não aceitar do frontend os IDs dos atores nem os timestamps controlados pelo servidor.

## Datas

| Campo | Semântica |
|---|---|
| `createdAt` | Instante da solicitação, gerado pelo servidor |
| `analisadoEm` | Instante da decisão administrativa, gerado pelo servidor |
| `dataPagamento` | `DATE` civil do pagamento externo, transmitida como `YYYY-MM-DD` |
| `pagoEm` | Instante em que o ADMIN registrou o pagamento no sistema |
| `confirmadoEm` | Instante da confirmação do PROFESSOR |

`dataPagamento` pode ser uma data passada ou a data civil atual. Não pode ser futura nem anterior à data civil da solicitação derivada de `createdAt`.

Não usar `createdAt`, `analisadoEm`, `pagoEm` ou `confirmadoEm` como `MovimentoCaixa.dataFinanceira`.

## Pagamento e Caixa PostgreSQL

A transição de `SOLICITADO` para `PAGO_AGUARDANDO_CONFIRMACAO` deve ocorrer na mesma transação PostgreSQL que cria exatamente um `MovimentoCaixa`.

| Campo do movimento | Valor obrigatório |
|---|---|
| `tipo` | `SAIDA` |
| `origem` | `ADIANTAMENTO_PROFESSOR` |
| `valor` | `AdiantamentoProfessor.valor` |
| `dataFinanceira` | `AdiantamentoProfessor.dataPagamento` |
| `referenciaId` | `AdiantamentoProfessor.id` |
| `criadoPorId` | ADMIN autenticado |
| `chaveIdempotencia` | `ADIANTAMENTO_PROFESSOR:<adiantamentoId>:PAGAMENTO` |

A descrição deve identificar claramente o professor.

Pagamento e movimento são atômicos:

- não pode existir adiantamento pago sem sua saída;
- não pode existir saída sem o adiantamento ter sido marcado como pago;
- falha parcial deve causar rollback integral.

Usar a transação com retry do padrão financeiro existente e lock/controle concorrente adequado sobre o adiantamento.

## Idempotência do pagamento

Repetições sequenciais ou concorrentes nunca podem criar uma segunda saída.

A restrição `UNIQUE` de `MovimentoCaixa.chaveIdempotencia` é a proteção final obrigatória.

Se o adiantamento já estiver `PAGO_AGUARDANDO_CONFIRMACAO` ou `CONFIRMADO` e existir exatamente um movimento consistente com o pagamento:

- retornar o estado atual com sucesso;
- não alterar valor, data, forma, atores ou timestamps já persistidos;
- não criar novo movimento;
- não substituir o recibo existente.

Se o estado e o movimento estiverem inconsistentes, a operação deve falhar sem nova mutação. Não corrigir ou reconciliar silenciosamente no endpoint de pagamento.

Não capturar violação de unicidade e continuar usando uma transação PostgreSQL abortada. Após conflito concorrente, reler e validar o estado persistido conforme o padrão financeiro existente.

## Confirmação pelo PROFESSOR

Somente o PROFESSOR destinatário autenticado pode confirmar. A autorização exige:

```text
req.authUser.role = PROFESSOR
req.authUser.id = adiantamento.professorId
```

ADMIN não pode confirmar em nome do professor.

Estado necessário para a primeira confirmação: `PAGO_AGUARDANDO_CONFIRMACAO`.

Persistir:

- `status = CONFIRMADO`;
- `confirmadoPorId = PROFESSOR autenticado`;
- `confirmadoEm = timestamp do servidor`.

A confirmação representa um recibo digital persistente, não uma assinatura criptográfica.

A confirmação:

- não cria `MovimentoCaixa`;
- não altera `valor`;
- não altera `dataPagamento`;
- não altera `formaPagamento`;
- não altera o movimento existente.

### Idempotência da confirmação

Se o próprio adiantamento já estiver `CONFIRMADO` corretamente pelo destinatário:

- retornar o estado atual com sucesso;
- não sobrescrever `confirmadoPorId` ou `confirmadoEm`;
- não criar novo efeito financeiro;
- não alterar o recibo.

## Autorizações por operação

| Operação | ADMIN | PROFESSOR |
|---|---|---|
| Listar | Todos | Somente os próprios |
| Visualizar detalhe | Qualquer adiantamento | Somente o próprio |
| Solicitar | Não permitido | Somente para si |
| Recusar | Somente `SOLICITADO` | Não permitido |
| Registrar pagamento | Somente `SOLICITADO` | Não permitido |
| Confirmar recebimento | Não permitido | Somente o próprio |
| Editar genericamente | Não permitido | Não permitido |
| Excluir | Não permitido | Não permitido |

Professor não pode obter, por ID previsível, resposta que revele adiantamento ou valor de outro professor. A API deve aplicar o isolamento também em listagem, detalhe e confirmação.

## Badges e contadores

No PROFESSOR, o badge principal “Recebimentos” deve ser a soma de:

- Repasses próprios com `AGUARDANDO_RECEBIMENTO`;
- Adiantamentos próprios com `PAGO_AGUARDANDO_CONFIRMACAO`.

Os badges internos continuam separados:

- Repasses: quantidade própria aguardando recebimento;
- Adiantamentos: quantidade própria aguardando confirmação.

No ADMIN, manter o indicador interno de solicitações `SOLICITADO` na área administrativa. Não criar novo badge global ADMIN nesta RDD.

## Frontend PostgreSQL

Migrar somente Adiantamentos para API PostgreSQL. Não alterar o comportamento homologado de Repasses.

Componentes principais:

- `TeacherPaymentsView`;
- `RequestAdvanceModal`;
- `AdminPayAdvanceModal`;
- `AdminRejectAdvanceModal`;
- `AuditView`;
- `App`.

Criar cliente API tipado próprio para Adiantamentos.

Seguir o padrão homologado:

- API assíncrona;
- `credentials` de sessão;
- `AbortController` nas leituras e operações canceláveis;
- preservação das mensagens do backend;
- proteção contra double-submit;
- atualização imediata e segura do estado;
- refresh seguro;
- nenhum fallback local.

## Caixa, extrato e fechamento

Após a migração, adiantamentos pagos integram oficialmente:

- saldo do Caixa;
- extrato;
- saídas;
- resultado mensal;
- fechamento mensal.

Na etapa frontend, remover os textos que dizem que adiantamentos legados não integram o Caixa. Não alterar esses textos durante a etapa documental.

## Auditoria desta RDD

O próprio `AdiantamentoProfessor` deve preservar:

- solicitante/destinatário;
- análise;
- pagamento;
- confirmação;
- respectivos atores e timestamps;
- motivo da recusa;
- informações do pagamento.

Não criar nesta RDD tabela genérica de auditoria financeira. A trilha financeira PostgreSQL unificada pertence à RDD-002.8.

## Dados legados

Não importar automaticamente:

- `INITIAL_ADIANTAMENTOS_PROFESSORES`;
- `bomber_adiantamentos_professores`;
- movimentos em `bomber_movimentacoes_caixa`;
- logs em `bomber_auditoria`;
- o seed `adiant-marcos-300`.

Não reconciliar automaticamente dados locais com `MovimentoCaixa` PostgreSQL. Não manter fallback ou leitura residual do legado depois do corte do frontend.

## Fora de escopo

Não implementar nesta RDD:

- transferência de dinheiro;
- estorno de adiantamento;
- cancelamento;
- reabertura;
- edição;
- exclusão;
- anexos ou comprovantes;
- assinatura criptográfica;
- limite comercial;
- aprovação automática;
- importação automática do legado;
- auditoria financeira genérica;
- notificações externas.

## Critérios de aceite

1. PostgreSQL é a única fonte de verdade, sem fallback, dual source ou importação automática.
2. Somente PROFESSOR autenticado solicita para si, com valor entre R$ 0,01 e R$ 99.999.999,99 e no máximo duas casas decimais.
3. Múltiplas solicitações do mesmo professor são permitidas.
4. PROFESSOR lista e visualiza somente os próprios adiantamentos; ADMIN lista todos.
5. Somente ADMIN recusa um `SOLICITADO`, com motivo obrigatório e sem efeito no Caixa.
6. Somente ADMIN registra pagamento de um `SOLICITADO`, usando `PIX`, `DINHEIRO` ou `TRANSFERENCIA` e data civil válida, não futura nem anterior à solicitação.
7. Pagamento e criação de exatamente uma `SAIDA` `ADIANTAMENTO_PROFESSOR` ocorrem atomicamente na mesma transação.
8. Repetição ou concorrência no pagamento preserva exatamente uma saída e não altera dados financeiros já registrados.
9. Somente o PROFESSOR destinatário confirma; ADMIN não confirma em seu nome.
10. Confirmação repetida é idempotente e não gera movimento adicional.
11. `RECUSADO` e `CONFIRMADO` são terminais; não existem endpoints genéricos de edição ou exclusão.
12. Badge principal do PROFESSOR soma repasses e adiantamentos pendentes, mantendo os indicadores internos separados.
13. O frontend usa cliente API tipado, sessão real, `AbortController`, proteção contra double-submit e nenhum fallback local.
14. Repasses PostgreSQL permanecem funcionalmente inalterados.
15. Testes de integração demonstram autorização, privacidade, CHECKs, atomicidade, rollback e concorrência.

## Microetapas oficiais

### RDD-002.7.1 — Schema + migration + constraints

Implementar o modelo PostgreSQL, enum de status, relações, índices e CHECKs, sem importar dados legados.

### RDD-002.7.2 — Serviço/API PostgreSQL

Implementar solicitação, listagem, detalhe, recusa e confirmação com autenticação real, isolamento, validação, transições protegidas e confirmação idempotente.

### RDD-002.7.3 — Pagamento → Caixa PostgreSQL

Implementar o registro transacional e idempotente do pagamento externo, com lock, retry e exatamente uma saída no Caixa.

### RDD-002.7.4 — Frontend PostgreSQL

Migrar os consumidores de Adiantamentos para o cliente API tipado, badges e estados remotos, remover o fallback local e atualizar os textos de integração com Caixa sem alterar Repasses.

### RDD-002.7.5 — Homologação/regressão

Validar o fluxo ponta a ponta, privacidade, concorrência, idempotência, Caixa, badges e ausência de regressão em Repasses. Esta etapa não implementa novos recursos.

## Verificação desta etapa documental

Criar somente:

```text
docs/requirements/RDD-002-7-adiantamentos-professores.md
```

Executar:

```text
git diff --check
git status --short --untracked-files=all
```

Não implementar schema, migration, backend, frontend ou alteração de banco. Não iniciar a RDD-002.7.1 e não fazer commit nesta etapa.
