# RDD-002.4 — Caixa PostgreSQL

## 1. Objetivo

Migrar o Caixa financeiro do legado/localStorage para PostgreSQL. O Caixa será a fonte oficial de:

- saldo disponível;
- entradas;
- saídas;
- extrato;
- resultado financeiro operacional;
- rastreabilidade dos movimentos.

O Caixa atual da interface é LEGADO e seus valores NÃO devem ser migrados automaticamente. O banco financeiro PostgreSQL começa em ZERO.

---

## 2. Princípio central

Um evento financeiro só pode alterar o Caixa quando houver fato financeiro efetivamente confirmado/registrado.

Exemplos:

- Pagamento de aluno:
  - PROFESSOR informa pagamento → NÃO movimenta Caixa
  - ADMIN confirma pagamento → futuramente gera exatamente UMA ENTRADA no Caixa
- Pagamento direto registrado pelo ADMIN → gera exatamente UMA ENTRADA no Caixa
- Despesa apenas cadastrada/pendente → NÃO movimenta Caixa
- Despesa marcada como paga → gera exatamente UMA SAÍDA
- Repasse registrado como pago pelo ADMIN → gera exatamente UMA SAÍDA
- Professor confirmar recebimento do repasse → NÃO gera nova saída
- Adiantamento solicitado → NÃO movimenta Caixa
- Adiantamento recusado → NÃO movimenta Caixa
- Adiantamento pago pelo ADMIN → gera exatamente UMA SAÍDA
- Professor confirmar recebimento do adiantamento → NÃO gera nova saída

---

## 3. Saldo Inicial

Como o PostgreSQL financeiro começa em zero, o ADMIN deverá ter a funcionalidade "Definir Saldo Inicial".

Objetivo:
registrar quanto realmente existe no caixa da academia no momento da implantação.

Regras:

- saldo inicial NÃO é receita;
- não entra em "Entradas do mês";
- não entra no resultado operacional mensal;
- apenas compõe o saldo disponível acumulado;
- deve gerar movimento rastreável;
- deve registrar quem definiu;
- deve registrar quando foi definido;
- deve registrar valor;
- deve permitir observação/contexto;
- normalmente será definido uma única vez na implantação.

Não criar edição destrutiva silenciosa. Se no futuro houver correção de saldo inicial, deverá existir mecanismo rastreável, nunca sobrescrever histórico sem trilha.

DECISÃO FECHADA (Saldo Inicial):
- Normalmente existe apenas um evento inicial; `chaveIdempotencia = SALDO_INICIAL` impede duplicação acidental.
- Valor pode ser zero.
- Correção posterior NÃO edita esse movimento; eventual correção futura será um novo AJUSTE rastreável.

---

## 4. Movimento de Caixa (modelo conceitual)
Definir conceitualmente uma entidade `MovimentoCaixa` que represente, no mínimo:

- TIPOS (representam somente o efeito matemático no Caixa):
   - SALDO_INICIAL
   - ENTRADA
   - SAIDA

   Observação: ESTORNO e AJUSTE NÃO são tipos do movimento. Eles devem existir como ORIGENS/eventos rastreáveis que geram um movimento cujo `tipo` seja ENTRADA ou SAIDA conforme o efeito matemático.

   Exemplo:
   - Pagamento original:
      - tipo = ENTRADA
      - origem = PAGAMENTO_ALUNO
   - Estorno posterior:
      - tipo = SAIDA
      - origem = ESTORNO

Cada movimento deve possuir pelo menos:

- `id`
- `tipo` (SALDO_INICIAL | ENTRADA | SAIDA)
- `valor`
- `dataFinanceira` (data do fato financeiro usada para periodização)
- `descricao`
- `origem` (PAGAMENTO_ALUNO, DESPESA, REPASSE_PROFESSOR, ADIANTAMENTO_PROFESSOR, ESTORNO, AJUSTE, SALDO_INICIAL)
- `referenciaId` quando aplicável (id da entidade origem)
- `chaveIdempotencia` (UNIQUE) — ver seção Idempotência
- `criadoPorId` / `registradoPor`
- `observacao` / `contexto` quando aplicável
- `createdAt` (timestamp técnico)

Avaliar também:
- competência financeira quando fizer sentido (preferir pertencer à entidade de origem);
- `status` somente se realmente necessário.

NÃO adicionar campos por excesso. O modelo deve permanecer simples.

---

## 5. Origens previstas

O Caixa deve ser capaz de rastrear a origem real do movimento. Origens previstas:

- SALDO_INICIAL
- PAGAMENTO_ALUNO
- DESPESA
- REPASSE_PROFESSOR
- ADIANTAMENTO_PROFESSOR
- ESTORNO
- eventual AJUSTE rastreável futuro

DECISÃO FECHADA (Origens):
- Origens previstas permanecem as listadas acima. ESTORNO e AJUSTE são tratadas como ORIGENS/eventos rastreáveis (não como tipo de movimento).

Cada movimento derivado de outra entidade financeira deve guardar referência suficiente para responder: "Por que esse valor entrou ou saiu do Caixa?"

---

## 6. Idempotência

Regra obrigatória: o mesmo evento financeiro não pode gerar dois movimentos no Caixa.

DECISÃO FECHADA:
- Adotar conceitualmente uma `chaveIdempotencia` obrigatória e `UNIQUE` no banco para representar o EVENTO financeiro (não apenas a entidade).

Exemplos conceituais de `chaveIdempotencia`:

- SALDO_INICIAL
- PAGAMENTO_ALUNO:<pagamentoId>
- DESPESA:<despesaId>:PAGAMENTO
- REPASSE_PROFESSOR:<repasseId>:PAGAMENTO
- ADIANTAMENTO_PROFESSOR:<adiantamentoId>:PAGAMENTO
- ESTORNO:<idDoEstorno>

Não depender somente da UI. A criação concorrente do mesmo evento deve resultar em apenas um `MovimentoCaixa`.

Observação: `origem` + `referenciaId` continuam existindo para rastreabilidade, mas a proteção formal de idempotência será a `chaveIdempotencia` única.

---

## 7. Datas

Separar claramente:

- data do fato financeiro (data do movimento, usada para periodização) — chamada `dataFinanceira` no modelo;
- `createdAt` do registro técnico;
- `competência` quando houver (pertence à entidade origem quando aplicável).

DECISÃO FECHADA:
- A data que determina o mês/período do Caixa é sempre a DATA DO FATO FINANCEIRO. Nunca usar `createdAt` para periodização.

Para `PAGAMENTO_ALUNO`:
- `dataFinanceira` = `PagamentoAluno.dataPagamento`.

`confirmadoEm` continua representando quando o ADMIN confirmou, mas não altera a `dataFinanceira`.

Para futuras origens:
- despesa → data efetiva do pagamento;
- repasse → data efetiva do repasse;
- adiantamento → data efetiva do pagamento;
- saldo inicial → data efetiva definida na implantação.

`createdAt` é somente timestamp técnico.

Usar a mesma estratégia de datas civis já adotada em Mensalidades/Pagamentos, evitando conversões incorretas de timezone.

---

## 8. Período Mensal

O período financeiro segue mês civil:

- inicia dia 1;
- termina no último dia do mês.

Mês atual: "CAIXA ABERTO".
Meses anteriores: "PERÍODO ENCERRADO".

Encerramento é consequência da data/calendário. Movimentos históricos permanecem consultáveis. Correções de períodos anteriores devem ocorrer por mecanismo rastreável, não edição destrutiva.

---

## 9. Cálculos

Definições claras:

- SALDO DISPONÍVEL = saldo inicial + todas as entradas válidas - todas as saídas válidas (histórico acumulado).
- ENTRADAS DO MÊS = somente movimentos operacionais de entrada do período (SALDO_INICIAL não entra).
- SAÍDAS DO MÊS = somente saídas operacionais do período.
- RESULTADO DO MÊS = Entradas do mês - Saídas do mês.

Saldo disponível e resultado mensal são conceitos diferentes.

DECISÃO FECHADA (Valores):
- Movimentos operacionais ENTRADA/SAIDA devem ter `valor > 0`.
- SALDO_INICIAL permite `valor >= 0`.
- Saldo inicial não é receita e continua excluído das Entradas do mês e do resultado operacional.

---

## RDD-002.4.1 — Decisões técnicas finais (constraints e modelagem)

As decisões abaixo definem o comportamento técnico do `MovimentoCaixa` para a entrega RDD-002.4.1. NÃO executar DDL nem alterar `schema.prisma` nesta etapa — isto é apenas especificação.

1) Constraint SALDO_INICIAL (correção)

Regra de equivalência exigida (aceita apenas pares coerentes):

```
CHECK (
   (tipo = 'SALDO_INICIAL' AND origem = 'SALDO_INICIAL')
   OR
   (tipo <> 'SALDO_INICIAL' AND origem <> 'SALDO_INICIAL')
)
```

Isto permite combinações válidas como:
- SALDO_INICIAL / SALDO_INICIAL
- ENTRADA / PAGAMENTO_ALUNO
- SAIDA / DESPESA

E rejeita combinações inconsistentes (ex.: tipo=SALDO_INICIAL com origem=PAGAMENTO_ALUNO).

2) Chave de idempotência

- Tipo técnico: `VARCHAR(255)` no banco.
- `NOT NULL` e `UNIQUE` (constraint real no banco).
- Justificativa: suficiente para CUIDs atuais e prefixos compostos (ex.: `PAGAMENTO_ALUNO:<id>`).

3) `referenciaId`

- Permanece opcional (`NULL`) no model.
- NÃO criar agora um CHECK global que exija `referenciaId` para todas as origens.
- Motivos: `SALDO_INICIAL` não tem referência; futuros AJUSTES podem ter semântica própria; cada serviço de domínio deve validar localmente quando exigir referência.
- NÃO criar FK polimórfica.

4) Campos textuais

- `descricao`: String? armazenada como TEXT no banco (sem limitar a VARCHAR por ora).
- `observacao`: String? armazenada como TEXT no banco.

5) Datas

- `dataFinanceira`: armazenar como `DATE` (Prisma `@db.Date`). É a única data usada para periodização do Caixa.
- `createdAt`: seguir EXACTAMENTE o padrão já existente no projeto para timestamps técnicos (usar o mesmo tipo e mapeamento das migrations existentes). Não assumir que é `timestamptz` sem confirmação nas migrations.
- `createdAt` é timestamp técnico e NÃO define o mês financeiro.

6) `updatedAt`

- DECISÃO: NÃO adicionar `updatedAt` ao `MovimentoCaixa`.
- Racional: movimentos financeiros são imutáveis; correções devem gerar novos movimentos rastreáveis.

7) FK `criadoPorId`

- `criadoPorId` terá FK real para `users(id)` com `ON DELETE RESTRICT`.

8) Índices iniciais

Manter apenas os índices iniciais abaixo para a primeira versão:

- `dataFinanceira` — para extrato/consultas por período.
- `(origem, referenciaId)` — para buscar movimentos de uma origem específica.
- `(tipo, dataFinanceira)` — para agregações rápidas de entradas/saídas por período.

Não criar índice em `criadoPorId` nesta primeira versão; adicionar mais tarde se necessário.

9) Regra de valor (CHECK)

Regras a aplicar no banco (ex.: CHECK):

- Se `tipo = 'SALDO_INICIAL'` então `valor >= 0`.
- Se `tipo IN ('ENTRADA','SAIDA')` então `valor > 0`.

Observação: o sinal matemático (positivo/negativo) do efeito no saldo deriva de `tipo`, não do valor armazenado.

10) Definir Saldo Inicial — comportamento idempotente do serviço

- Primeira execução válida cria um `MovimentoCaixa` com:
   - `tipo = SALDO_INICIAL`
   - `origem = SALDO_INICIAL`
   - `chaveIdempotencia = 'SALDO_INICIAL'`
   - `referenciaId = NULL`
   - `valor >= 0`
- Se a operação for repetida e o movimento já existir:
   - NÃO criar um segundo movimento;
   - NÃO sobrescrever o existente;
   - Se os parâmetros da repetição (valor ou data) forem diferentes, o serviço deve retornar um erro de domínio controlado indicando que o saldo inicial já foi definido (em vez de atualizar silenciosamente).
   - Se a repetição representar exatamente a mesma operação, o serviço pode retornar o movimento existente (comportamento idempotente).

Correções futuras devem ser feitas por movimentos corretivos (AJUSTE), não por atualização do movimento inicial.

11) Idempotência concorrente

- A proteção definitiva contra duplicidade é o `UNIQUE(chaveIdempotencia)` no banco.
- O serviço pode (e deve) fazer checagem prévia por ergonomia, mas também deve capturar e tratar a violação de unicidade resultante de corridas concorrentes (ex.: retry, leitura do registro já criado ou erro controlado). Não confiar apenas em "consultar antes de inserir".

12) Estorno futuro

- O modelo suporta estorno sem novos campos:
   - Movimento original: `tipo = ENTRADA`, `origem = PAGAMENTO_ALUNO`.
   - Movimento de estorno: `tipo = SAIDA`, `origem = ESTORNO`, `referenciaId` apontando para a referência rastreável do evento original, `chaveIdempotencia` própria, e `dataFinanceira` = data do estorno.
- Não implementar agora; apenas garantir compatibilidade do modelo.

---

FIM das decisões técnicas finais para RDD-002.4.1.

---

## 10. Extrato

O Caixa deve expor um extrato vindo do PostgreSQL. Cada linha deve identificar:

- data (do fato financeiro);
- tipo (Entrada/Saída/Saldo Inicial);
- descrição;
- valor;
- origem;
- ator (quem registrou) quando relevante.

Cada item do extrato deverá abrir um detalhe somente leitura com rastreabilidade. Não permitir edição destrutiva diretamente pelo extrato.

---

## 11. Permissões

Somente `ADMIN` pode acessar:

- saldo consolidado;
- entradas totais;
- saídas totais;
- resultado;
- extrato completo;
- saldo inicial;
- movimentos de Caixa.

`PROFESSOR` permanece sem acesso ao Caixa consolidado. Nenhuma mudança de permissão nesta RDD.

---

## 12. Auditoria

Movimentos financeiros importantes devem ser auditáveis. No mínimo deve ser possível saber:

- quem causou o evento;
- qual entidade originou;
- valor;
- data;
- quando foi registrado;
- motivo/contexto quando aplicável.

A futura auditoria geral será módulo próprio, mas o Caixa já deve nascer preparado para rastreabilidade.

---

## 13. Não migrar legado

Os valores atuais mostrados na interface legado (ex.: saldo, entradas, saídas) NÃO são base para migração automática. Não copiar `localStorage` para PostgreSQL.

Ao ativar o novo Caixa:

- PostgreSQL financeiro começa em zero;
- ADMIN define saldo inicial real;
- novos eventos passam a alimentar o Caixa oficial.

DECISÃO FECHADA (Correção Histórica):
- Períodos anteriores permanecem encerrados. Não editar nem sobrescrever movimentos antigos.
- Uma correção futura deve gerar NOVO movimento rastreável. Por padrão, a data financeira da correção/estorno será a data em que a correção efetivamente ocorreu, não uma alteração silenciosa da data do movimento original.
- O movimento corretivo deve referenciar suficientemente o evento/movimento original.
- Não implementar Estorno/Ajuste agora; apenas garantir compatibilidade do modelo para suportá-los no futuro.

---

## 14. Relação com pagamentos já implementados (RDD-002.3)

A RDD-002.3 já possui:

- pagamento informado pelo professor;
- confirmação pelo ADMIN;
- pagamento direto ADMIN;
- idempotência;
- mensalidade quitada;
- próxima mensalidade gerada.

Hoje esses fluxos propositalmente NÃO geram Caixa. Na implementação da RDD-002.4 deverá existir integração atômica para que:

- confirmar pagamento ADMIN → pagamento confirmado + mensalidade quitada + movimento ENTRADA criado exatamente uma vez + próxima mensalidade gerada;
- pagamento direto ADMIN → pagamento confirmado + movimento ENTRADA criado exatamente uma vez + mensalidade quitada + próxima mensalidade gerada.

Tudo deve permanecer transacional e idempotente.

---

## 15. Estorno (planejamento)

Não implementar estorno agora, mas preparar o desenho. Regras futuras:

- pagamento confirmado nunca será apagado;
- estorno deverá preservar pagamento original, marcar estado apropriado e gerar movimento inverso no Caixa;
- estorno deve reabrir mensalidade quando aplicável;
- estorno exige motivo, ator e data;
- nunca apagar histórico.

Nesta RDD documentar somente compatibilidade do modelo com estorno futuro.

---

## 16. Sequência de implementação proposta (checkpoints)

Sugerimos dividir em entregas pequenas e homologáveis:

- RDD-002.4.1 — Schema/modelo `MovimentoCaixa` + constraints + saldo inicial (DDL, constraints de unicidade por origem, índices, tipos e enum `OrigemMovimentacao`).
- RDD-002.4.2 — Serviço de Caixa (API read) + leitura de saldo/resumo/extrato (endpoints GET seguros, permissão ADMIN).
- RDD-002.4.3 — Integração `PagamentoAluno` → criação de ENTRADA no Caixa (confirmar pagamento ADMIN e pagamento direto ADMIN), com transação atômica no backend e proteção de idempotência.
- RDD-002.4.4 — Frontend Caixa real PostgreSQL + UI para Definir Saldo Inicial (somente ADMIN) e extrato básico (somente leitura).

NOTA: manter a sequência de checkpoints proposta. Ver seção 16 para a ordem e escopo.

Observação: RDD-002.4.2 não deve expor escrita além do saldo inicial até que RDD-002.4.3 esteja homologado.

---

## 17. Filosofia

Manter:

> "Menos burocracia para quem opera. Mais rastreabilidade por trás."

O operador não deve precisar criar lançamentos duplicados manualmente. O Caixa deve nascer automaticamente dos fatos financeiros confirmados.

---

## Entrega solicitada

1. Documento criado: `docs/requirements/RDD-002-4-caixa-postgresql.md` (RDD-002.4 — Caixa PostgreSQL)
2. Estrutura / Seções: já apresentada no documento (1 Objetivo → 17 Filosofia)
3. Decisões fechadas:
   - Caixa PostgreSQL começa zerado;
   - Não migrar valores do `localStorage`;
   - Saldo inicial é rastreável e não é receita;
   - Movimentos só são criados por fatos confirmados; idempotência obrigatória;
   - Somente `ADMIN` tem acesso ao Caixa;
4. Dúvidas bloqueantes:
   - Estratégia de chave idempotência exata desejada (origin_type+origin_id vs token idempotência);
   - Política de correção histórica (fluxo para ajustar saldo inicial em produção sem perda de rastreabilidade);
   - Definição final sobre qual data determina o fechamento mensal (data do fato financeiro vs createdAt em casos excepcionais);
5. Riscos técnicos:
   - Implementação incorreta de idempotência pode gerar duplicidade de movimentos;
   - Falta de transação atômica ao integrar pagamento → movimento pode deixar sistema inconsistente;
   - Mudanças de fuso horário / parsing de datas podem causar alocação em meses errados;
   - Operação manual de saldo inicial mal registrada pode desalinhar relatórios;
6. Divisão dos próximos checkpoints: ver seção 16 (RDD-002.4.1 → RDD-002.4.4)
7. Git status (após criação do documento):
