# RDD-002.5 — Despesas (PostgreSQL)

Data: 2026-09-13

## Objetivo

Migrar o domínio de Despesas do módulo legado (localStorage / `financeService`) para uma entidade persistida em PostgreSQL.

Após migração, o PostgreSQL será a única fonte de verdade para Despesas (sem dual source nem fallback para localStorage). O módulo PostgreSQL começa limpo; não será feita importação automática do histórico legacy nesta etapa.

## Escopo
- Criar especificação de requisitos para a entidade `Despesa` e as APIs/contratos transacionais necessários para registrar pagamento e gerar o movimento de Caixa correspondente.
- Regras de autorização, idempotência, concorrência e imutabilidade financeira.

## Fora de escopo
- Implementação de schema, migrations ou código frontend/backend nesta RDD.
- Importação automática de `INITIAL_DESPESAS` ou movimentações/despesas armazenadas em localStorage.
- Estorno/ajustes financeiros (serão tratados em RDD futura específica).

## Modelo conceitual (visão mínima)

Despesa (conceitual)
- `id` (UUID)
- `descricao` (string)
- `categoria` (enum — manter valores atuais da aplicação)
- `valor` Decimal(10,2)
- `dataDespesa` DATE (data da despesa, não competência formal)
- `status` ENUM { PENDENTE, PAGA } (nova despesa nasce PENDENTE)
- `criadoPorId` FK -> User
- `createdAt` TIMESTAMP
- `dataPagamento?` DATE
- `formaPagamento?` VARCHAR(limit razoável)
- `pagoPorId?` FK -> User
- `pagoEm?` TIMESTAMP
- `observacao?` TEXT

Observação: forma de pagamento permanece string controlada (por ora sem enum Prisma), com validação e limite de tamanho.

## Regras de cadastro
- Apenas `ADMIN` pode cadastrar despesas.
- Campos obrigatórios no cadastro: `descricao`, `categoria`, `valor`, `dataDespesa`.
- Campos gerados automaticamente: `id`, `criadoPorId` (usuário autenticado), `createdAt`, `status = PENDENTE`.
- Não permitir criar despesa diretamente como `PAGA`. Se a despesa já foi paga externamente, o fluxo será:
  1. Cadastrar como `PENDENTE`.
  2. Executar `Registrar Pagamento` (endpoint transacional) com data real do pagamento.

## Regras de pagamento (Registrar Pagamento)
- Apenas `ADMIN`.
- Entrada: `despesaId`, `dataPagamento` (YYYY-MM-DD), `formaPagamento` (string), `observacao?`.
- Validações:
  - `despesaId` existe.
  - despesa.status === PENDENTE (se já PAGA, operação será idempotente — ver idempotência abaixo).
  - `dataPagamento` é data civil válida.
  - `formaPagamento` é texto não vazio dentro do limite.
- Efeito transacional (mesma transação DB):
  1. Atualizar a mesma linha `despesa` preservando `id` e `dataDespesa`:
     - `status` -> `PAGA`
     - `dataPagamento` = informado
     - `formaPagamento` = informado
     - `pagoPorId` = adminId
     - `pagoEm` = now()
     - `observacao` = opcional
  2. Criar exatamente UMA linha em `movimentos_caixa` com:
     - `tipo` = `SAIDA`
     - `origem` = `DESPESA`
     - `valor` = `despesa.valor`
     - `dataFinanceira` = `despesa.dataPagamento` (ou seja, `dataPagamento` informado)
     - `referenciaId` = `despesa.id`
     - `chaveIdempotencia` = `DESPESA:${despesa.id}:PAGAMENTO`
     - `criadoPorId` = adminId

## Integração com o Caixa (ponto de criação do movimento)
- O movimento do Caixa deve ser gerado no mesmo escopo transacional que atualiza a `despesa` para `PAGA`.
- `MovimentoCaixa.dataFinanceira` deve ser igual a `Despesa.dataPagamento`.
- A chave de idempotência especificada deve prevenir duplicidade e é a proteção final via UNIQUE no banco.

## Idempotência e concorrência
- Implementar lock e transação seguindo padrão já adotado para `PagamentoAluno` (ex.: `FOR UPDATE` na despesa, checagens pré-insert e tratamento de P2002 de UNIQUE durante concorrência).
- Fluxo desejado ao receber requisição duplicada/concorrente:
  - Se primeira requisição concluiu e já gravou movimento (despesa.status === `PAGA`): a segunda requisição NÃO cria novo movimento e NÃO altera os dados financeiros confirmados. Responder com HTTP 200 OK e corpo informando que a despesa já está paga (idempotência gentil).
  - Se houver violação de unique na inserção do movimento (P2002), readquirir a linha existente e validar se corresponde; não tentar reaplicar a transação já abortada.

## Datas
- `dataDespesa`: DATE civil — representa a data da despesa (campo `data` do legacy renomeado conceitualmente).
- `dataPagamento`: DATE civil — data real do pagamento informada pelo ADMIN; esta é a data usada em `MovimentoCaixa.dataFinanceira`.
- `pagoEm`: TIMESTAMP — instante em que o ADMIN registrou o pagamento no sistema (metadado). NÃO usar `createdAt` como `dataFinanceira`.

## Autorização
- Todas as rotas e operações de escrita/listagem financeira de despesas devem validar que o usuário é `ADMIN` no backend (server-side enforcement obrigatório).

## Imutabilidade financeira
- Após `status = PAGA`:
  - Não permitir alteração direta de: `valor`, `dataPagamento`, `formaPagamento`, `status` financeiro, nem alteração do movimento do Caixa correspondente.
  - Correções futuras deverão ocorrer por fluxos explícitos de estorno/ajuste (fora desta RDD).

## Legado / localStorage
- Não importar automaticamente `INITIAL_DESPESAS` ou quaisquer dados do `STORAGE_KEYS.DESPESAS` nem das movimentações de despesa no localStorage.
- Após migração da UI, o frontend de Despesas deverá consumir apenas o backend PostgreSQL (sem fallback remoto/local).

## Critérios de aceite
1. API backend para CRUD limitado: criação (somente ADMIN) e endpoint transacional `registrarPagamentoDespesa` (somente ADMIN) com comportamento idempotente e atomicidade Caixa+Despesa.
2. Nova tabela `despesas` suportando o modelo conceitual mínimo (campos listados acima).
3. Testes/integração demonstrando que: duas requisições concorrentes para registrar pagamento não geram duas saídas em `movimentos_caixa` (ou seja, chaveIdempotencia evita duplicidade).
4. Documentação & migração manual do time de produto sobre não-importação do histórico legacy.

## Sequência sugerida de implementação (checkpoints)
- RDD-002.5.1 — Schema + migration + constraints (tabelas `despesas`, FK e índices; não importar dados)
- RDD-002.5.2 — Serviço/API backend: endpoints para criar despesa e registrar pagamento (transacional e idempotente)
- RDD-002.5.3 — Despesa → Caixa: integração transacional para gerar `movimento_caixa` com `chaveIdempotencia = DESPESA:{id}:PAGAMENTO`
- RDD-002.5.4 — Frontend: ajustar `ExpenseModal`/`ExpenseDetailModal` para usar backend PostgreSQL e remover mensagens que afirmam “módulo legado” após corte

## Exceções e notas importantes
- A UI atual permite cadastrar uma despesa já como `PAGA` (legacy). Com a regra definida nesta RDD, o frontend deverá ser adaptado para **não** permitir isso — fluxo documentado exige criar `PENDENTE` e depois `Registrar Pagamento` (somente ADMIN). Esta diferença é uma contradição operacional atual e deverá ser tratada na etapa frontend (RDD-002.5.4).
- Histórico legacy permanecerá acessível apenas no front-end legado até migração; não haverá sincronização automática.

## Contatos / Responsáveis
- Time Backend / DBA: responsáveis por criar migration e garantir constraints e índices.
- Time Frontend: responsável por adaptar UX (proibir cadastro direto como PAGA, consumir API PostgreSQL).

----

## Anexos técnicos (resumo rápido de decisões)
- Chave idempotência do movimento: `DESPESA:${despesa.id}:PAGAMENTO` (string única)
- Resposta HTTP para Registrar Pagamento em despesa já paga: `200 OK` com corpo informando idempotência (ex.: `{ ok: true, message: 'Despesa já encontrada como PAGA' }`) — preferir comportamento idempotente em vez de erro 409, para compatibilidade com fluxo de reenvio/concorrência do cliente.
