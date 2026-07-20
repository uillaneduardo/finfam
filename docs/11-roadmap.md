# Roadmap de Desenvolvimento - FinFam

Este documento organiza as fases planejadas para a implementação incremental do **FinFam**, estabelecendo metas claras e entregáveis para cada estágio do desenvolvimento do MVP, além de listar as metas de evolução de longo prazo.

---

## 🗺️ Visão Geral do Cronograma

O desenvolvimento do MVP está dividido em **5 Etapas Concretas**, seguidas por uma seção dedicada a futuras melhorias.

```text
[Etapa 1: Base] ---> [Etapa 2: Movimentações] ---> [Etapa 3: Compromissos] ---> [Etapa 4: Reservas] ---> [Etapa 5: Filtros e QA]
```

### 📋 Legenda de Situação das Tarefas
* `- [x] Concluído`: Tarefa já implementada, documentada ou estruturada com sucesso no repositório atual.
* `- [~] Iniciado ou precisa de revisão`: Tarefa com modelagem conceitual ou inicial criada, pendente de validação e refinamento em código funcional.
* `- [ ] Pendente`: Tarefa a ser implementada na respectiva fase do projeto.

---

## 🚀 Detalhamento das Etapas

### Etapa 1 — Base do Sistema (Fundação)
O foco desta etapa é criar o esqueleto funcional, o banco de dados inicial e garantir que a autenticação e o isolamento familiar funcionem com perfeição de segurança.
* **Nota sobre Backup:** A estratégia conceitual de backup deve ser definida nesta etapa (e.g., scripts de dump agendados ou backups automatizados na nuvem), assegurando que nenhum ambiente real opere sem segurança.
* **Tarefas:**
  * [x] Configurar a estrutura básica de diretórios e o projeto monólito no repositório.
  * [x] Escrever as primeiras **Migrations** estruturais para as tabelas iniciais (`migrations/001_initial_schema.sql`).
  * [x] Criar e parametrizar o arquivo modelo de variáveis de ambiente (`.env.example`).
  * [x] Desenvolver o scaffold React inicial do frontend.
  * [x] Estruturar e consolidar a documentação do monólito modular e diretrizes básicas.
  * [ ] Estruturar a conexão funcional do Express com o pool de conexões do **MySQL**.
  * [ ] Criar o sistema de migrations executável automático.
  * [ ] Implementar o fluxo de **Criação de Família (Primeiro Uso)** e do primeiro usuário administrador (`admin`) sob uma transação de banco unificada.
  * [ ] Implementar o fluxo de **Autenticação (Login/Logout)** baseado em sessão segura via Cookie HTTP-Only.
  * [ ] Criar os middlewares de validação de sessão, rate limit e tratamento de erros no Express.
  * [ ] Desenvolver as telas funcionais de primeiro uso, login e o container de navegação principal.
* **Entregável:** Criação de família e autenticação funcional com isolamento de dados por família.

### Etapa 2 — Contas e Movimentações (Coração Financeiro)
Implementação das entidades financeiras brutas que sustentam a saúde do caixa familiar.
* **Tarefas:**
  * [~] Validar e executar a migration inicial das tabelas `accounts` e `transactions` (Iniciado - esquema modelado fisicamente).
  * [ ] Desenvolver endpoints CRUD e telas funcionais para gerenciamento de **Contas Financeiras** (contas correntes, carteiras, espécie).
  * [ ] Implementação lógica e visual do cadastro de **Categorias** (opcionais).
  * [ ] Desenvolvimento do fluxo de registro de **Entradas** (Receitas) e **Saídas** (Despesas).
  * [ ] Desenvolvimento do motor de transações de **Transferências entre Contas** da mesma família com proteção ACID.
  * [ ] Implementação matemática do cálculo dinâmico do **Saldo Nominal por Conta** e **Saldo Total da Família** (saldos calculados corretamente).
  * [ ] Desenvolver um dashboard simples e progressivo para visualização dos saldos calculados (não bloqueia a conclusão desta etapa).
* **Entregável:** Fluxos funcionais de contas e movimentações, com saldos calculados corretamente.

### Etapa 3 — Compromissos (Previsibilidade e Controle)
Passagem do controle reativo (o que já aconteceu) para o controle pró-ativo (o que vai acontecer).
* **Tarefas:**
  * [~] Validar e executar a migration inicial das tabelas `contacts` e `commitments` (Iniciado - esquema modelado fisicamente).
  * [ ] Criação do cadastro e telas para **Contatos Financeiros** associados à família.
  * [ ] Endpoints e telas de agendamento de **Compromissos a Pagar** e **Compromissos a Receber**.
  * [ ] Codificação do cálculo automático de **Atrasos e Dias de Atraso** (com base no fuso `America/Fortaleza`).
  * [ ] Implementação do fluxo transacional de **Quitação Assistida** (pagamento gerando saída e recebimento gerando entrada com proteção transacional).
  * [ ] Desenvolver a **Lista Cronológica de Compromissos** como padrão para o MVP, com filtros por dia, semana, mês, atrasados e período personalizado (calendário visual movido para pós-MVP).
* **Entregável:** Lista cronológica de compromissos com filtros por dia, semana, mês, atrasados e período personalizado, com alertas de atrasos e dias vencidos.

### Etapa 4 — Reservas e Projetos (Metas Compartilhadas)
Permite que a família separe fundos para sonhos e emergências sem poluir as contas bancárias reais.
* **Tarefas:**
  * [~] Validar e executar a migration inicial das tabelas `projects` e `project_operations` (Iniciado - esquema modelado fisicamente).
  * [ ] Criar endpoints e telas de criação de **Reservas e Projetos** (meta, prazo e responsável).
  * [ ] Desenvolvimento do fluxo de **Depósitos em Reserva** (validando saldo livre da conta origem).
  * [ ] Desenvolvimento do fluxo de **Retiradas de Reserva** (liberando fundos com segurança).
  * [ ] Desenvolvimento do fluxo de **Transferência de Valor Reservado** (mover recursos da reserva de um banco para outro gerando a transferência real respectiva em lote).
  * [ ] Atualização do painel central para separar claramente **Saldo Total**, **Saldo Reservado** e **Saldo Livre** global e por conta.
* **Entregável:** Aba dedicada ao acompanhamento do progresso das metas financeiras (com barra de progresso) e visualização exata de onde o dinheiro poupado está guardado.

### Etapa 5 — Consultas, Backup e Estabilidade (Polimento e QA)
Garantia de que o sistema é resiliente, rápido, seguro contra perdas de dados e possui dados consolidados úteis.
* **Nota sobre Backup:** Embora a estratégia conceitual e operacional de backup deva estar definida desde a Etapa 1 para que nenhum ambiente real de produção opere sem ela, é nesta Etapa 5 que realizaremos a validação prática, automatização de recuperação e testes completos de consistência de dump do MySQL.
* **Tarefas:**
  * [~] Implementar os **Seeds** iniciais com a carga de massa de dados de teste da "Família Silva" (`seeds/001_initial_seed.sql`) (Iniciado - seed criado).
  * [ ] Implementação de filtros avançados e dinâmicos de busca (períodos personalizados, contatos, categorias, responsável).
  * [ ] Revisão do rastreamento de auditoria básica (`created_by_id`, etc.) em todas as tabelas.
  * [ ] Validação prática do plano de Backup e automatização periódica de recuperação do MySQL.
  * [ ] Execução e automação de testes manuais e automatizados baseados nos cenários de BDD (`docs/09-criterios-de-aceitacao.md`).
  * [ ] Revisão de índices físicos e otimização de queries lentas no MySQL.
  * [ ] Homologação final de uso com stakeholders.
* **Entregável:** MVP concluído, testado, validado com política de backup ativa e massa de sementes para homologação de uso.

---

## 🔮 Funcionalidades Futuras (Roadmap de Longo Prazo)

As seguintes melhorias estão listadas para desenvolvimento em fases pós-MVP (fora do escopo do MVP, incluindo inteligência artificial e animações avançadas):
1. **Segurança Avançada (MFA):** Ativação de autenticação de duas etapas (OTP/TOTP) e suporte a **Passkeys** ou biometria.
2. **Convites Inteligentes:** Fluxo de convite para novos membros através de links temporários com hash de expiração.
3. **Cartões de Crédito:** Controle de cartões com limite de crédito, datas de fechamento, vencimento e organização de faturas mensais detalhadas.
4. **Parcelamento de Longo Prazo:** Geração automatizada de despesas recorrentes parceladas (ex: 12 parcelas fixas).
5. **Notificações Ativas:** Envio de lembretes diários ou semanais de faturas a pagar via WhatsApp ou e-mail.
6. **Importação Automatizada:** Suporte a arquivos OFX ou extratos em PDF para facilitar o preenchimento de transações.
7. **Calendário Visual de Compromissos:** Exibição interativa e gráfica dos compromissos a pagar/receber em formato de calendário mensal tradicional (melhoria de usabilidade pós-MVP).
8. **Animações Avançadas e Transições Complexas:** Implementação de feedbacks animados com bibliotecas adicionais de movimentação (como `motion`) no frontend.
9. **Relatórios, Gráficos e dashboards complexos:** Gráficos interativos (usando `recharts` ou `d3`) de despesas por categoria, projeções de fluxo de caixa e relatórios contábeis avançados.
10. **Assistente de IA Financeira:** Chatbot de análise familiar (utilizando o SDK `@google/genai` e modelos Gemini no servidor) para responder perguntas de insights (ex: *"Em qual categoria gastamos mais este mês?"*).
