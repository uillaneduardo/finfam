# FinFam — Finanças Familiares Compartilhadas

O **FinFam** é uma aplicação web robusta, segura e moderna para organização e gestão financeira familiar compartilhada. Ela centraliza o registro e o acompanhamento de contas, lançamentos de entradas, saídas, transferências, compromissos futuros, além de reservas e metas financeiras ("caixinhas"), diferenciando claramente o saldo total do saldo livre para gastos diários.

Este projeto é desenvolvido como um **Monólito Modular** altamente otimizado para produção, combinando a integridade transacional forte do MySQL e a segurança avançada do Express e do Zod no backend com a interatividade moderna do React, Tailwind CSS e TypeScript no frontend.

---

## 🎯 Funcionalidades Principais do Sistema

1. **Autenticação Segura & Gestão Familiar (Multi-tenant)**
   - Fluxo unificado de configuração inicial (primeiro uso) para criar a família e o primeiro usuário administrador.
   - Login seguro utilizando sessões com cookie assinado HTTP-Only, rotação e expiração.
   - Middlewares avançados de autenticação, checagem ao vivo do status do usuário no banco de dados, rate limiters e controle de permissões por papel (`admin` e `member`).
   - Gestão de membros da família (ativação/desativação de usuários com proteção contra auto-desativação).

2. **Isolamento de Dados Estrito (Zero Leakage)**
   - Validador centralizado (`checkFamilyOwnership` e `validateRelatedEntities`) que assegura que todas as leituras, escritas e referências a entidades pertençam estritamente à família associada à sessão atual. Qualquer tentativa de acesso cruzado resulta em erros neutros de "não encontrado" (404), mitigando riscos de ID enumeration.

3. **Contas & Movimentações Financeiras**
   - Cadastro e gerenciamento de contas (corrente, poupança, carteira digital, dinheiro vivo).
   - Lançamentos de **Entradas (Receitas)**, **Saídas (Despesas)** e **Transferências entre Contas** com transações ACID no MySQL.
   - Atualização automática de saldos nominal e livre por conta.
   - Prevenção ativa contra cliques duplos (janela de idempotência de 3 segundos).

4. **Compromissos Financeiros futuros (A Pagar / A Receber)**
   - Agendamento de compromissos futuros com cálculo automático de status de atraso com base no fuso horário `America/Fortaleza`.
   - Fluxo de **Quitação Assistida**: pagar ou receber um compromisso de forma transacional, gerando a movimentação financeira correspondente de forma atômica no banco de dados e atualizando o status do compromisso.

5. **Reservas & Caixinhas (Metas Compartilhadas)**
   - Separação lógica de fundos em metas de poupança (emergência, sonhos, aquisições).
   - Fluxo atômico de **Aportes (Depósitos)** e **Resgates (Retiradas)** com conciliação automática de saldo nas contas reais e proteção contra saldo insuficiente ou caixinhas inativas.
   - Bloqueio pessimista de registros (`FOR UPDATE`) para prevenir condições de corrida sob alta concorrência.

6. **Validação & Estabilidade de Dados (Zod & TypeScript)**
   - Schemas de validação Zod centralizados para todas as entradas e contratos da API.
   - Rejeição absoluta de valores inválidos, `NaN`, `Infinity`, nulos inadequados, zero ou valores negativos nas operações financeiras.
   - Suporte a arredondamento e validação estrita de até duas casas decimais.

---

## 🏗️ Arquitetura do Projeto

O FinFam utiliza uma arquitetura monolítica modular e limpa:
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js, Express, TypeScript, Zod.
- **Banco de Dados:** MySQL 8+ com suporte nativo a transações InnoDB e locks pessimistas.
- **Suíte de Testes:** Vitest para testes automatizados unitários e de integração de segurança/validação.

---

## 🛠️ Scripts e Comandos

Todos os scripts necessários para o gerenciamento, testes e compilação do sistema estão centralizados no `package.json`:

- **Desenvolvimento:**
  ```bash
  npm run dev
  ```
  Inicia o servidor backend Express (carregando o Vite como middleware em desenvolvimento) na porta `3000`.

- **Build de Produção:**
  ```bash
  npm run build
  ```
  Gera a compilação estática do frontend React (`dist/`) e empacota o backend TypeScript em um arquivo CommonJS independente (`dist/server.cjs`) usando esbuild.

- **Inicialização em Produção:**
  ```bash
  npm run start
  ```
  Roda a aplicação compilada em modo de produção.

- **Qualidade de Código e Linter:**
  ```bash
  npm run lint
  ```
  Verifica a consistência estática e tipagem do TypeScript (`tsc --noEmit`).

- **Testes Automatizados (Vitest):**
  ```bash
  npm run test
  ```
  Executa a suíte completa de testes unitários e de integração para esquemas de validação Zod e isolamento familiar.

- **Controle de Banco de Dados (Migrations e Seeds):**
  ```bash
  # Executa as migrations pendentes para estruturar o banco
  npm run db:migrate

  # Verifica o status atual de execução das migrations
  npm run db:status

  # Executa a semente de dados iniciais (seed de desenvolvimento/teste)
  npm run db:seed

  # Reinicia o banco de dados (reseta e roda migrations do zero)
  npm run db:reset
  ```

---

## 🔒 Segurança e Robustez Implementadas

- **Idempotência de Transações:** Proteção contra envio duplo de movimentações utilizando uma janela temporal de 3 segundos para lançamentos com a mesma conta, valor e data.
- **Locks de Concorrência:** Locks pessimistas (`SELECT ... FOR UPDATE`) aplicados durante depósitos, retiradas e quitações assistidas para prevenir condições de corrida matemática.
- **Erros de Validação Limpos:** Centralização de tratamento de erros no Express, retornando códigos de erro claros (`VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, etc.) de forma amigável ao usuário.
- **Fuso Horário Nativo:** Tratamento correto de datas locais via fuso horário fixo brasileiro (`America/Fortaleza`), independentemente da localização física do container de execução.

---

*O projeto FinFam está sob licença Apache-2.0. Consulte o time de engenharia e arquitetura para mais informações.*
