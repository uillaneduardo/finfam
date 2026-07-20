# FinFam — Finanças Familiares Compartilhadas

O **FinFam** é uma aplicação web robusta, segura e moderna para organização e gestão financeira familiar compartilhada. Ela centraliza o registro e o acompanhamento de contas, lançamentos de entradas, saídas, transferências, compromissos futuros, além de reservas e metas financeiras ("caixinhas"), diferenciando claramente o saldo total do saldo livre para gastos diários.

Este projeto é desenvolvido como um **Monólito Modular** altamente otimizado para produção, combinando a integridade transacional forte do MySQL e a segurança avançada do Express e do Zod no backend com a interatividade moderna do React, Tailwind CSS e TypeScript no frontend.

---

## 🎯 Funcionalidades Principais do Sistema

1. **Autenticação Segura & Gestão Familiar (Multi-tenant)**
   - Fluxo unificado de configuração inicial (primeiro uso) para criar a família e o primeiro usuário administrador.
   - Login seguro utilizando cookies de sessão assinados HTTP-Only.
   - Middlewares de autenticação, checagem ao vivo do status do usuário no banco de dados, rate limiters e controle de permissões por papel (`admin` e `member`).
   - Gestão de membros da família (ativação/desativação de usuários com proteção contra auto-desativação).

2. **Isolamento de Dados Estrito (Zero Leakage)**
   - Validador centralizado (`checkFamilyOwnership` e `validateRelatedEntities`) que assegura que todas as leituras, escritas e referências a entidades pertençam estritamente à família associada à sessão atual. Qualquer tentativa de acesso cruzado resulta em erros neutros de "não encontrado" (404), mitigando riscos de ID enumeration.

3. **Contas & Movimentações Financeiras**
   - Cadastro e gerenciamento de contas (corrente, poupança, carteira digital, dinheiro vivo).
   - Lançamentos de **Entradas (Receitas)**, **Saídas (Despesas)** e **Transferências entre Contas** com transações ACID no MySQL.
   - Atualização automática de saldos nominal e livre por conta.
   - **Garantia de Idempotência**: Prevenção ativa e confiável contra transações duplicadas utilizando `idempotency_key` gerada pelo frontend combinada com índice único por família e chave no banco de dados, retornando o resultado anterior imediatamente caso uma chave repetida seja enviada.

4. **Compromissos Financeiros futuros (A Pagar / A Receber)**
   - Agendamento de compromissos futuros com cálculo automático de status de atraso com base no fuso horário local (configurado pela variável `TIMEZONE`, ex: `America/Fortaleza`).
   - Fluxo de **Quitação Assistida Atômica**:
     - Abertura de transação ACID antes de consultar o compromisso.
     - Bloqueio pessimista via `SELECT ... FOR UPDATE` no compromisso específico da família.
     - Validação estrita do status do compromisso (somente `pending`) e de saldos da conta envolvida na mesma transação.
     - Lançamento atômico da movimentação financeira correspondente e atualização do compromisso utilizando filtro específico de ID, Family ID e status `pending`.
     - Confirmação imediata de atualização de exatamente uma linha, prevenindo de forma definitiva que duas quitações paralelas gerem movimentações duplicadas.

5. **Reservas & Caixinhas (Metas Compartilhadas)**
   - Separação lógica de fundos em metas de poupança (emergência, sonhos, aquisições).
   - Fluxo atômico de **Aportes (Depósitos)** e **Resgates (Retiradas)** com conciliação automática de saldo nas contas reais e proteção contra saldo insuficiente ou caixinhas inativas.
   - Bloqueio pessimista de registros (`FOR UPDATE`) para prevenir condições de corrida matemática sob alta concorrência.

6. **Validação & Estabilidade de Dados (Zod & TypeScript)**
   - Schemas de validação Zod centralizados para todas as entradas e contratos da API.
   - Rejeição absoluta de valores inválidos, `NaN`, `Infinity`, nulos inadequados, zero ou valores negativos nas operações financeiras.
   - Suporte a arredondamento e tratamento estrito de valores monetários como centavos de inteiros no backend para evitar erros de ponto flutuante.

---

## 🏗️ Arquitetura do Projeto

O FinFam utiliza uma arquitetura monolítica modular e limpa:
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js, Express, TypeScript, Zod.
- **Banco de Dados:** MySQL 8+ com suporte nativo a transações InnoDB e locks pessimistas.
- **Suíte de Testes:** Vitest + Supertest para testes automatizados unitários e testes reais de integração de ponta a ponta sem mocks.

---

## 💻 Como Configurar e Executar (Passo a Passo)

### 1. Pré-requisitos
- Node.js (versão 18+)
- MySQL (versão 8+)

### 2. Configuração do Ambiente (.env)
Crie um arquivo `.env` na raiz do projeto com as suas credenciais e configurações locais:
```env
# Configurações do Servidor
PORT=3000
SESSION_SECRET=uma_chave_secreta_e_longa_aqui
TIMEZONE=America/Fortaleza

# Configurações do Banco de Dados MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_NAME=finfam_db
```

### 3. Instalação de Dependências
Instale todos os pacotes necessários:
```bash
npm install
```

### 4. Criação e Migração do Banco de Dados
O FinFam possui um gerenciador de banco nativo para manter sua estrutura sempre atualizada:
```bash
# Executa as migrations pendentes para estruturar as tabelas
npm run db:migrate

# Executa as sementes (seeds) de dados para desenvolvimento e testes
npm run db:seed
```

### 5. Execução em Modo de Desenvolvimento
Inicie o servidor com hot-reload ativo:
```bash
npm run dev
```
A aplicação estará acessível em `http://localhost:3000`.

---

## 🛠️ Scripts e Comandos Adicionais

- **Build de Produção:**
  ```bash
  npm run build
  ```
  Compila o frontend estático (`dist/`) e empacota o backend TypeScript em um bundle independente (`dist/server.cjs`) usando esbuild.

- **Inicialização em Produção:**
  ```bash
  npm run start
  ```

- **Qualidade de Código e Linter:**
  ```bash
  npm run lint
  ```

- **Testes Automatizados (Vitest):**
  ```bash
  # Executa toda a suíte de testes unitários e de integração de ponta a ponta
  npm run test
  ```

- **Utilitários do Banco de Dados:**
  ```bash
  # Verifica o status atual das migrations
  npm run db:status

  # Reinicia o banco de dados (reseta e roda migrations/seeds do zero)
  npm run db:reset
  ```

---

*O projeto FinFam está sob licença Apache-2.0. Consulte o time de engenharia e arquitetura para mais informações.*
