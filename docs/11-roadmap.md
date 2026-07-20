# Roadmap de Desenvolvimento - FinFam (Status: Concluído)

Este documento organiza as fases planejadas para a implementação incremental do **FinFam**, estabelecendo metas claras e entregáveis para cada estágio do desenvolvimento do MVP, além de listar as metas de evolução de longo prazo.

---

## 🗺️ Visão Geral do Cronograma

O desenvolvimento de todas as etapas planejadas do MVP do FinFam foi concluído com absoluto sucesso e alta qualidade de engenharia:

```text
[Etapa 1: Base] ---> [Etapa 2: Movimentações] ---> [Etapa 3: Compromissos] ---> [Etapa 4: Reservas] ---> [Etapa 5: Filtros e QA]
                                                                                            └─ (TODAS AS ETAPAS 100% CONCLUÍDAS)
```

---

## 🚀 Detalhamento das Etapas

### Etapa 1 — Base do Sistema (Fundação)
O foco desta etapa foi criar o esqueleto funcional, a integração robusta de banco de dados e garantir que a autenticação e o isolamento familiar funcionassem com perfeição de segurança.
* **Tarefas:**
  * [x] Configurar a estrutura básica de diretórios e o projeto monólito no repositório.
  * [x] Escrever as primeiras **Migrations** estruturais para as tabelas iniciais.
  * [x] Criar e parametrizar o arquivo modelo de variáveis de ambiente (`.env.example`).
  * [x] Desenvolver o scaffold React inicial do frontend.
  * [x] Estruturar e consolidar a documentação do monólito modular e diretrizes básicas.
  * [x] Estruturar a conexão funcional do Express com o pool de conexões do **MySQL**.
  * [x] Criar o sistema de migrations executável automático (`db:migrate`, `db:status`, `db:reset`).
  * [x] Implementar o fluxo de **Criação de Família (Primeiro Uso)** e do primeiro usuário administrador (`admin`) sob uma transação de banco unificada.
  * [x] Implementar o fluxo de **Autenticação (Login/Logout)** baseado em sessão segura via Cookie HTTP-Only assinado.
  * [x] Criar os middlewares de validação de sessão, rate limit e tratamento de erros no Express com suporte a checagem de usuário ativo ao vivo no banco.
  * [x] Desenvolver as telas funcionais de primeiro uso, login e o container de navegação principal.
* **Status:** Concluído.

### Etapa 2 — Contas e Movimentações (Coração Financeiro)
Implementação das entidades financeiras brutas que sustentam a saúde do caixa familiar.
* **Tarefas:**
  * [x] Validar e executar a migration inicial das tabelas `accounts` e `transactions`.
  * [x] Desenvolver endpoints CRUD e telas funcionais para gerenciamento de **Contas Financeiras** com validação robusta Zod.
  * [x] Implementação lógica e visual do cadastro de **Categorias** com isolamento estrito por família.
  * [x] Desenvolvimento do fluxo de registro de **Entradas** (Receitas) e **Saídas** (Despesas).
  * [x] Desenvolvimento do motor de transações de **Transferências entre Contas** da mesma família com proteção ACID e atualização automática de saldos nominal e livre.
  * [x] Implementação matemática do cálculo dinâmico do **Saldo Nominal por Conta** e **Saldo Total da Família** com validação estrita contra NaN, Infinity ou valores negativos.
  * [x] Implementar controle idempotente de cliques duplos (janela de 3 segundos).
* **Status:** Concluído.

### Etapa 3 — Compromissos (Previsibilidade e Controle)
Passagem do controle reativo (o que já aconteceu) para o controle pró-ativo (o que vai acontecer).
* **Tarefas:**
  * [x] Validar e executar a migration inicial das tabelas `contacts` e `commitments`.
  * [x] Criação do cadastro e telas para **Contatos Financeiros** associados à família.
  * [x] Endpoints e telas de agendamento de **Compromissos a Pagar** e **Compromissos a Receber**.
  * [x] Codificação do cálculo automático de **Atrasos e Dias de Atraso** com base no fuso `America/Fortaleza`.
  * [x] Implementação do fluxo transacional de **Quitação Assistida** (pagamento gerando saída e recebimento gerando entrada com proteção transacional ACID completa).
  * [x] Desenvolver a **Lista Cronológica de Compromissos** com filtros por dia, semana, mês, atrasados e período personalizado.
* **Status:** Concluído.

### Etapa 4 — Reservas e Projetos (Metas Compartilhadas)
Permite que a família separe fundos para sonhos e emergências sem poluir as contas reais de caixa livre.
* **Tarefas:**
  * [x] Validar e executar a migration inicial das tabelas `projects` e `project_operations`.
  * [x] Criar endpoints e telas de criação de **Reservas e Projetos** (meta, prazo e responsável).
  * [x] Desenvolvimento do fluxo de **Depósitos em Reserva** (validando saldo livre da conta de origem e utilizando locks pessimistas `FOR UPDATE`).
  * [x] Desenvolvimento do fluxo de **Retiradas de Reserva** (liberando fundos com segurança transacional).
  * [x] Atualização do cálculo para separar de forma robusta e livre de vazamentos: **Saldo Total**, **Saldo Reservado** e **Saldo Livre** global e por conta.
* **Status:** Concluído.

### Etapa 5 — Consultas, Backup e Estabilidade (Polimento e QA)
Garantia de que o sistema é resiliente, rápido, seguro contra perdas de dados e possui dados consolidados úteis.
* **Tarefas:**
  * [x] Implementar os **Seeds** iniciais com a carga de massa de dados de teste (`seeds/001_initial_seed.sql`) habilitado em ambientes seguros por parâmetro explícito.
  * [x] Implementação de filtros avançados e dinâmicos de busca na API.
  * [x] Revisão do rastreamento de auditoria básica (`created_by_id`, `family_id` etc.) em todas as tabelas.
  * [x] Configuração e automação de testes automatizados com o **Vitest** cobrindo esquemas de validação Zod e o isolamento familiar.
  * [x] Execução do build de produção e linter passando 100% livre de erros ou alertas.
* **Status:** Concluído.

---

## 🔮 Funcionalidades Futuras (Roadmap de Longo Prazo)

As seguintes melhorias estão listadas para desenvolvimento em fases futuras pós-MVP:
1. **Segurança Avançada (MFA):** Ativação de autenticação de duas etapas (OTP/TOTP) e suporte a **Passkeys** ou biometria.
2. **Convites Inteligentes:** Fluxo de convite para novos membros através de links temporários com hash de expiração.
3. **Cartões de Crédito:** Controle de cartões com limite de crédito, datas de fechamento, vencimento e organização de faturas mensais detalhadas.
4. **Notificações Ativas:** Envio de lembretes diários ou semanais de faturas a pagar via WhatsApp ou e-mail.
5. **Assistente de IA Financeira:** Chatbot de análise familiar (utilizando o SDK `@google/genai` e modelos Gemini no servidor) para responder perguntas de insights (ex: *"Em qual categoria gastamos mais este mês?"*).
