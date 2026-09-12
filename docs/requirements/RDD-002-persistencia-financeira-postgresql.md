# RDD-002 — Persistência Financeira no PostgreSQL

## 1. Objetivo

Migrar o módulo financeiro do Bomber Financeiro para persistência real em PostgreSQL, eliminando progressivamente o uso de `localStorage` como fonte oficial dos dados financeiros.

A migração deverá preservar as regras de negócio já homologadas no MVP e será executada de forma incremental, sem reescrever todo o `financeService` de uma única vez.

---

## 2. Dependência

Este RDD depende do RDD-001 — Autenticação e Gestão de Usuários.

A autenticação real, sessões e usuários ADMIN/PROFESSOR já utilizam PostgreSQL e serão reutilizados pelas entidades financeiras.

---

## 3. Princípios

1. PostgreSQL será a fonte oficial dos dados financeiros.
2. O banco financeiro começará zerado.
3. Nenhum dado financeiro existente no `localStorage` será migrado.
4. O `localStorage` atual será tratado apenas como legado de desenvolvimento/teste.
5. A migração será feita módulo por módulo.
6. Após a migração de um módulo, aquele módulo não deverá mais utilizar `localStorage` como fonte de verdade.
7. Não haverá sincronização permanente entre PostgreSQL e `localStorage`.
8. Regras financeiras já homologadas não deverão ser alteradas sem novo requisito.
9. Operações financeiras deverão ser atômicas e idempotentes.
10. Registros históricos relevantes não deverão ser apagados.

---

# 4. Usuários e rastreabilidade

## 4.1 Alunos não pertencem a professores

Não existe conceito de professor proprietário ou professor responsável fixo pelo aluno.

Todos os professores autorizados poderão visualizar todos os alunos da academia.

Exemplo:

- Kawan cadastra João.
- No mês seguinte João encontra Ryan.
- Ryan poderá visualizar João e registrar seu pagamento normalmente.

O sistema deverá registrar separadamente quem executou cada ação.

---

## 4.2 Autoria das ações

Toda operação relevante deverá registrar o usuário que a executou.

Exemplos:

- aluno cadastrado por Kawan;
- telefone alterado por Ryan;
- pagamento registrado por Ryan;
- pagamento confirmado por Andre;
- pagamento estornado por Andre.

O vínculo será com a ação realizada, e não com a propriedade do aluno.

---

# 5. Alunos

## 5.1 Dados principais

O cadastro deverá contemplar, no mínimo:

- ID;
- nome;
- telefone;
- observações;
- condição de entrada;
- dia-base de vencimento;
- data de entrada;
- status;
- usuário que realizou o cadastro;
- data/hora de criação;
- data/hora de atualização.

---

## 5.2 Telefone

Telefone será opcional.

A ausência de telefone não deverá impedir o cadastro do aluno.

---

## 5.3 Status

Estados principais:

- ATIVO
- INATIVO

Aluno não será excluído definitivamente.

A inativação preservará todo o histórico financeiro e administrativo.

---

## 5.4 Permissões de edição

### PROFESSOR

Pode alterar:

- nome;
- telefone;
- observações.

### ADMIN

Pode alterar também:

- condição de entrada;
- dia-base de vencimento;
- status;
- data de entrada;
- demais campos administrativos autorizados.

Alterações relevantes deverão ser registradas na auditoria.

---

# 6. Condições de entrada e valores

As condições comerciais continuam:

### INDIVIDUAL

- primeira mensalidade: R$ 80,00;
- ciclos seguintes: R$ 80,00.

### DUPLA

- primeira mensalidade: R$ 75,00;
- ciclos seguintes: R$ 80,00.

### TRIO+

- primeira mensalidade: R$ 70,00;
- ciclos seguintes: R$ 80,00.

DUPLA e TRIO+ são condições comerciais de entrada.

Não existirão grupos técnicos permanentes de alunos para cálculo futuro.

O valor efetivo deverá pertencer à mensalidade gerada, e não ser recalculado retroativamente a partir do cadastro do aluno.

---

# 7. Pagamento inicial

O pagamento inicial representa o primeiro período do aluno.

Ele não deverá ser tratado como uma mensalidade vencida convencional.

Enquanto não for pago, deverá aparecer como:

> Pagamento inicial pendente

O aluno poderá permanecer ATIVO mesmo com pagamento inicial pendente.

Essa pendência:

- não entra no indicador EM ATRASO;
- não será classificada como mensalidade atrasada comum;
- permanece aguardando pagamento normalmente.

---

# 8. Primeiro ciclo após a entrada

A próxima mensalidade será sempre referente ao mês seguinte ao da entrada.

Exemplos:

Entrada em 05/09, vencimento dia 10:

- pagamento inicial em setembro;
- próxima mensalidade: 10/10.

Entrada em 25/09, vencimento dia 10:

- pagamento inicial em setembro;
- próxima mensalidade: 10/10.

O aluno novo nunca deverá nascer com dívida retroativa.

---

# 9. Dia-base de vencimento

Será permitido dia-base entre 1 e 31.

Quando o dia não existir naquele mês, será utilizado o último dia válido do mês.

Exemplo com dia-base 31:

- janeiro: 31/01;
- fevereiro: 28/02 ou 29/02;
- março: 31/03;
- abril: 30/04;
- maio: 31/05.

O dia-base continuará sendo 31.

O ajuste de calendário não altera permanentemente o cadastro.

---

# 10. Alteração do vencimento

Mudanças no dia-base de vencimento somente afetarão mensalidades futuras ainda não geradas.

Mensalidades já existentes manterão:

- competência;
- valor;
- vencimento;
- histórico original.

Exemplo:

Mensalidade já criada para 10/10.

ADMIN altera o dia-base para 20.

A mensalidade de 10/10 permanece inalterada.

Os próximos ciclos utilizarão o novo dia-base.

---

# 11. Mensalidades

Cada mensalidade deverá possuir seu próprio valor e suas próprias datas.

Informações conceituais mínimas:

- ID;
- aluno;
- competência;
- valor;
- data de vencimento;
- status;
- indicação de pagamento inicial quando aplicável;
- data de criação;
- data de atualização.

Mensalidades já geradas são historicamente imutáveis em seus dados financeiros essenciais.

---

# 12. Datas financeiras

As seguintes datas possuem significados diferentes e não poderão ser confundidas:

### Competência

Mês de referência da mensalidade.

### Vencimento

Data originalmente prevista para pagamento.

### Data de pagamento

Data em que o pagamento ocorreu externamente.

### Confirmação

Momento em que o ADMIN confirmou o recebimento no sistema.

Uma data não deverá sobrescrever a outra.

---

# 13. Pagamento antecipado

Pagamento antecipado será permitido para mensalidade futura já gerada.

Exemplo:

- mensalidade de outubro vence 10/10;
- aluno paga em 20/09.

O pagamento deverá:

- utilizar o valor exato da mensalidade;
- manter competência outubro;
- manter vencimento 10/10;
- registrar pagamento em 20/09;
- entrar no Caixa na data real do pagamento após confirmação.

Visualmente poderá ser classificado como pagamento antecipado.

---

# 14. Fluxo de pagamento pelo PROFESSOR

Professor poderá registrar pagamento do aluno em:

- PIX;
- DINHEIRO.

Ao registrar:

- pagamento fica AGUARDANDO confirmação;
- mensalidade fica AGUARDANDO_CONFIRMACAO;
- nenhum movimento de Caixa é criado ainda.

O ADMIN deverá confirmar posteriormente.

Na confirmação:

- pagamento passa para CONFIRMADO;
- mensalidade passa para QUITADA;
- movimento de entrada no Caixa é criado;
- próximo ciclo poderá ser gerado conforme regras.

A operação deverá ser atômica e idempotente.

---

# 15. Recebimento direto pelo ADMIN

ADMIN poderá utilizar fluxo direto de:

> Confirmar Recebimento

Nesse fluxo:

- pagamento já nasce confirmado;
- mensalidade é quitada;
- Caixa recebe a entrada imediatamente;
- próximo ciclo é processado;
- pagamento não passa pela fila de confirmação.

A operação deverá possuir proteção contra duplicidade.

---

# 16. Inativação do aluno

Ao inativar aluno:

- mensalidades já existentes permanecem;
- dívidas existentes permanecem;
- pagamentos e histórico permanecem;
- novas mensalidades deixam de ser geradas.

Inativar não significa cancelar dívida.

---

# 17. Reativação

Ao reativar aluno:

- não serão criadas mensalidades retroativas referentes ao período de inatividade;
- dívidas anteriores continuam existentes;
- novos ciclos voltam a ser gerados a partir da reativação.

O aluno não será cobrado pelos meses em que permaneceu inativo.

---

# 18. Caixa

O Caixa deverá ser derivado de movimentos financeiros persistidos no PostgreSQL.

Tipos deverão contemplar, entre outros:

- ENTRADA;
- SAIDA;
- SALDO_INICIAL;
- ESTORNO;
- demais origens necessárias.

Cada movimento deverá possuir origem e referência suficientes para rastreabilidade.

---

# 19. Saldo inicial

O ADMIN poderá utilizar:

> Definir Saldo Inicial

O saldo inicial:

- será registrado de forma controlada;
- será utilizado uma única vez na implantação normal;
- compõe o saldo disponível;
- não é receita operacional;
- não entra no faturamento mensal;
- não deverá ser simplesmente editado posteriormente.

Correções deverão gerar registro rastreável.

Exemplo:

Saldo existente antes da implantação: R$ 2.500,00.

O Caixa passa a possuir R$ 2.500,00 disponíveis, mas o faturamento do mês continua R$ 0,00.

---

# 20. Estorno de pagamento

Pagamentos confirmados não serão apagados.

ADMIN poderá executar:

> Estornar Pagamento

O estorno deverá:

- preservar o pagamento original;
- marcar sua situação de estornado;
- criar movimentação inversa no Caixa;
- reabrir a mensalidade correspondente quando aplicável;
- exigir motivo;
- registrar usuário responsável;
- registrar data/hora;
- manter histórico completo.

Nenhum registro financeiro original deverá ser destruído.

---

# 21. Despesas

Despesas continuarão seguindo a regra já homologada:

- despesa pendente não impacta Caixa;
- pagamento efetivo gera saída;
- mudança de pendente para paga preserva o mesmo registro;
- pagamento externo deverá ser registrado no sistema;
- não haverá movimentação bancária automática pelo Bomber Financeiro.

Operações deverão ser idempotentes.

---

# 22. Repasses aos professores

ADMIN registra repasse que já foi realizado externamente.

Ao registrar:

- é criada exatamente uma saída no Caixa;
- professor visualiza somente seus próprios repasses;
- professor poderá confirmar recebimento;
- confirmação do professor funciona como recibo digital;
- confirmação não gera nova saída.

---

# 23. Adiantamentos de professores

Fluxo preservado:

- SOLICITADO;
- RECUSADO;
- PAGO_AGUARDANDO_CONFIRMACAO;
- CONFIRMADO.

Professor solicita.

ADMIN pode recusar ou registrar pagamento.

Solicitação e recusa não afetam Caixa.

Quando ADMIN registra pagamento:

- gera exatamente uma saída no Caixa.

Professor confirma recebimento:

- gera recibo digital;
- não gera nova movimentação financeira.

Não haverá desconto automático de adiantamento em repasses futuros nesta versão.

---

# 24. Período mensal

O período financeiro seguirá mês civil:

- primeiro dia do mês;
- último dia do mês.

Mês atual:

> CAIXA ABERTO

Meses anteriores:

> PERÍODO ENCERRADO

Não haverá botão obrigatório de fechamento mensal.

O encerramento visual ocorrerá automaticamente pela mudança do calendário.

Correções posteriores continuarão possíveis somente por operações rastreáveis, como estorno.

---

# 25. Auditoria

Auditoria será persistida no PostgreSQL.

Deverá registrar ações financeiras e administrativas relevantes.

Informações conceituais:

- usuário responsável;
- ação executada;
- entidade afetada;
- ID da entidade;
- data/hora;
- valores/dados anteriores quando aplicável;
- valores/dados novos quando aplicável;
- contexto ou motivo quando necessário.

Exemplos:

- telefone alterado;
- vencimento 10 → 20;
- aluno ATIVO → INATIVO;
- pagamento registrado;
- pagamento confirmado;
- pagamento estornado;
- despesa paga;
- repasse registrado;
- adiantamento pago.

---

# 26. Integridade transacional

Operações que envolvem mais de uma entidade deverão ocorrer dentro de transação de banco quando necessário.

Exemplo de confirmação de pagamento:

1. validar pagamento;
2. validar mensalidade;
3. confirmar pagamento;
4. quitar mensalidade;
5. gerar movimento de Caixa;
6. gerar próximo ciclo quando aplicável;
7. registrar auditoria.

Se qualquer etapa falhar, nenhuma alteração parcial deverá permanecer.

---

# 27. Idempotência

O sistema deverá impedir duplicidades.

Exemplos:

- confirmar duas vezes o mesmo pagamento;
- gerar duas entradas de Caixa para a mesma mensalidade;
- registrar duas saídas para o mesmo repasse;
- registrar duas saídas para o mesmo adiantamento;
- gerar duas mensalidades para a mesma competência do mesmo aluno.

Deverão existir garantias também no backend/banco, e não somente na interface.

---

# 28. Permissões

As permissões deverão ser aplicadas no backend.

Não será suficiente ocultar botões no frontend.

### PROFESSOR

Pode:

- visualizar alunos;
- cadastrar aluno;
- alterar campos permitidos;
- visualizar mensalidades;
- registrar pagamentos;
- visualizar seus repasses;
- confirmar recebimento de seus repasses;
- solicitar adiantamento;
- visualizar seus adiantamentos;
- confirmar recebimento de seus adiantamentos.

Não pode:

- visualizar Caixa consolidado;
- confirmar pagamentos de alunos;
- alterar regras financeiras administrativas;
- registrar despesas;
- registrar repasses;
- pagar adiantamentos;
- visualizar dados financeiros restritos do ADMIN.

### ADMIN

Possui acesso integral às operações financeiras autorizadas pelo sistema.

---

# 29. Estratégia de migração

A implementação deverá ocorrer incrementalmente.

Ordem prevista:

1. Alunos;
2. Mensalidades;
3. Pagamentos;
4. Caixa;
5. Despesas;
6. Repasses;
7. Adiantamentos;
8. Auditoria.

Cada etapa deverá ser homologada antes da próxima.

---

# 30. Banco inicial

O banco financeiro começará sem dados financeiros.

Não migrar:

- alunos antigos do localStorage;
- mensalidades antigas;
- pagamentos antigos;
- despesas antigas;
- repasses antigos;
- adiantamentos antigos;
- Caixa antigo;
- auditoria financeira antiga.

Usuários e sessões do RDD-001 permanecem.

Os testes do RDD-002 começarão em ambiente financeiro limpo.

---

# 31. Fora do escopo

Não faz parte deste RDD:

- integração bancária;
- PIX automático;
- gateway de pagamento;
- emissão fiscal;
- cobrança automática;
- integração contábil externa;
- migração do histórico financeiro do localStorage;
- múltiplas academias;
- exclusão definitiva de histórico financeiro;
- alteração das regras comerciais homologadas sem novo requisito.

---

# 32. Critérios gerais de homologação

O RDD-002 será considerado concluído quando:

1. dados financeiros persistirem após logout, reinício do frontend e reinício do servidor;
2. PostgreSQL for a fonte oficial dos módulos migrados;
3. não houver dependência de localStorage para dados financeiros migrados;
4. PROFESSOR e ADMIN respeitarem permissões no backend;
5. alunos puderem ser cadastrados e editados conforme permissões;
6. pagamento inicial funcionar corretamente;
7. mensalidades futuras forem geradas sem duplicidade;
8. confirmação de pagamento gerar exatamente uma entrada no Caixa;
9. recebimento direto pelo ADMIN gerar exatamente uma entrada;
10. estorno preservar histórico e gerar movimento inverso;
11. inativação interromper novos ciclos sem apagar dívidas;
12. reativação não criar cobranças retroativas;
13. despesas gerarem saída apenas quando pagas;
14. repasses gerarem somente uma saída;
15. adiantamentos gerarem somente uma saída;
16. saldo inicial não contaminar faturamento operacional;
17. auditoria registrar usuários e alterações relevantes;
18. operações compostas utilizarem transações adequadas;
19. chamadas repetidas não produzirem lançamentos duplicados;
20. lint e build permanecerem aprovados.

---

# 33. Filosofia de implementação

A implementação deve manter a filosofia do Bomber Financeiro:

> Menos burocracia para quem opera. Mais rastreabilidade por trás.

O banco e o backend podem possuir controles rígidos de integridade sem transformar a experiência do professor ou do ADMIN em um processo complexo.
