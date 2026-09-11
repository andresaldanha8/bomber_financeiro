# RDD-001 — Autenticação e Gestão de Usuários

## 1. Objetivo

Substituir o atual simulador de usuários do Bomber Financeiro por um sistema real de autenticação simples, seguro e adequado à operação da Bomber Fitness.

Esta etapa deve preservar integralmente todas as regras financeiras já homologadas no MVP.

---

## 2. Escopo

Esta etapa contempla:

- login real por usuário e senha;
- autenticação de ADMIN e PROFESSOR;
- sessão persistente;
- logout;
- criação e gestão de professores pelo ADMIN;
- redefinição de senha pelo ADMIN;
- bloqueio e desbloqueio de acesso;
- remoção do atual seletor manual de usuários;
- proteção real das permissões no backend.

Esta etapa não contempla:

- cadastro público;
- recuperação de senha por e-mail;
- alteração de senha pelo professor;
- autenticação social;
- múltiplos administradores;
- redefinição de regras financeiras existentes.

---

## 3. Perfis do sistema

### 3.1 ADMIN

O sistema terá apenas 1 ADMIN principal nesta versão.

O ADMIN poderá:

- acessar o painel administrativo;
- criar professores;
- definir usuário e senha;
- redefinir senha de professor;
- bloquear acesso;
- desbloquear acesso;
- visualizar todo o histórico financeiro;
- acessar funcionalidades administrativas já existentes.

---

### 3.2 PROFESSOR

O PROFESSOR poderá:

- acessar o sistema com usuário e senha;
- utilizar somente as funcionalidades permitidas ao perfil PROFESSOR;
- visualizar seus dados e operações já autorizadas pelo MVP.

O PROFESSOR não poderá:

- criar usuários;
- alterar seu próprio usuário;
- alterar sua própria senha;
- redefinir senha;
- desbloquear sua conta;
- acessar endpoints exclusivos do ADMIN;
- acessar o Caixa consolidado;
- acessar informações financeiras restritas ao ADMIN.

---

## 4. Login

O sistema terá uma única tela de login.

Campos obrigatórios:

- Usuário
- Senha

Não haverá:

- campo de e-mail;
- cadastro de usuário;
- “Esqueci minha senha”;
- recuperação automática;
- login social.

Após autenticação:

- ADMIN → painel administrativo;
- PROFESSOR → painel do professor.

O perfil será determinado automaticamente pelo sistema.

---

## 5. Sessão

A sessão deverá permanecer ativa mesmo após:

- atualizar a página;
- fechar o navegador;
- abrir novamente o navegador.

A sessão somente deverá ser encerrada quando:

- o usuário clicar em Sair;
- a sessão for invalidada pelo sistema;
- a conta for bloqueada;
- ocorrer outra condição de segurança que exija invalidação.

A senha nunca deverá ser armazenada em texto puro no navegador.

---

## 6. Gestão de usuários

A gestão de professores ficará em:

**Equipe → Usuários**

A aba deverá permitir ao ADMIN:

- criar professor;
- redefinir senha;
- bloquear acesso;
- desbloquear acesso;
- visualizar status do usuário.

---

## 7. Cadastro de professor

Campos:

- Nome completo
- Usuário
- Senha
- Chave PIX — opcional

O perfil será automaticamente:

`PROFESSOR`

Não haverá seletor de perfil neste cadastro.

---

## 8. Regras de usuário

O campo de usuário deverá ser único.

Não poderá existir mais de um usuário com o mesmo identificador.

O sistema deverá impedir criação duplicada.

---

## 9. Senhas

Somente o ADMIN poderá definir ou redefinir senhas de professores.

A senha:

- não poderá ser armazenada em texto puro;
- deverá ser persistida utilizando hash seguro;
- não deverá ser retornada pelas APIs;
- não deverá aparecer em telas administrativas após criação.

O ADMIN poderá gerar uma nova senha e repassá-la manualmente ao professor.

---

## 10. Bloqueio de acesso

Ao bloquear um professor:

- novos logins deverão ser impedidos;
- sessões ativas deverão ser invalidadas;
- nenhum registro financeiro poderá ser excluído;
- nenhum histórico poderá ser alterado;
- o professor continuará existindo para fins de histórico.

Devem ser preservados:

- alunos relacionados;
- pagamentos;
- mensalidades;
- repasses;
- adiantamentos;
- movimentações de caixa;
- auditoria;
- demais registros históricos.

Bloqueio de acesso não significa exclusão de usuário.

---

## 11. Remoção do simulador atual

O seletor atual de usuários usado no MVP para testes deverá ser removido da versão real.

Exemplos atuais:

- CF
- MA
- KS
- RM

Não deverá existir troca manual de perfil após a implantação da autenticação real.

A identidade do usuário deverá vir exclusivamente da sessão autenticada.

---

## 12. Segurança e autorização

A proteção não poderá existir somente no frontend.

O backend deverá validar:

- identidade;
- sessão;
- perfil;
- permissão para cada operação protegida.

Um PROFESSOR não poderá acessar operações de ADMIN mesmo realizando requisições diretamente à API.

As regras de autorização deverão ser aplicadas no servidor.

---

## 13. Preservação do MVP

Esta implementação não deverá alterar o comportamento financeiro homologado.

Devem permanecer inalterados, salvo necessidade técnica explícita:

- alunos;
- mensalidades;
- pagamentos;
- confirmação de recebimentos;
- despesas;
- repasses;
- adiantamentos;
- Caixa;
- resumo mensal;
- auditoria;
- regras de valores;
- regras de vencimento;
- regras de competência;
- permissões financeiras já definidas.

---

## 14. Critérios de aceite

A implementação será considerada homologada quando:

- [ ] ADMIN consegue entrar com usuário e senha válidos.
- [ ] PROFESSOR consegue entrar com usuário e senha válidos.
- [ ] Credenciais inválidas não permitem acesso.
- [ ] Professor bloqueado não consegue entrar.
- [ ] Bloqueio invalida sessão ativa.
- [ ] F5 mantém a sessão.
- [ ] Fechar e abrir novamente o navegador mantém a sessão.
- [ ] Logout encerra a sessão.
- [ ] ADMIN consegue criar um novo professor.
- [ ] ADMIN consegue redefinir senha de professor.
- [ ] ADMIN consegue bloquear professor.
- [ ] ADMIN consegue desbloquear professor.
- [ ] Usuário duplicado é rejeitado.
- [ ] Senha não fica armazenada em texto puro.
- [ ] Senha não é retornada pelas APIs.
- [ ] PROFESSOR não consegue acessar operações de ADMIN.
- [ ] Histórico financeiro permanece intacto após bloqueio.
- [ ] O seletor CF/MA/KS/RM não existe na versão real.
- [ ] O sistema continua compilando sem erros.
- [ ] As funcionalidades financeiras já homologadas continuam funcionando.

---

## 15. Princípio desta implementação

A autenticação deverá ser:

- simples para o usuário;
- segura no backend;
- sem burocracia desnecessária;
- fácil de administrar;
- compatível com uso diário em celular;
- construída sem redesenhar o MVP financeiro existente.
