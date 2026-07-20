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
  # ATENÇÃO: Comando altamente destrutivo! Requer o parâmetro --confirm para execução.
  npm run db:reset -- --confirm
  ```

---

## 🚀 Guia de Operações e Implantação

### 📦 1. Instalação e Configuração

#### Pré-requisitos
- **Node.js**: v18 ou superior.
- **MySQL**: v8.0 ou superior (com engine InnoDB suportada).

#### Configuração do MySQL local
1. Crie um banco de dados vazio para a aplicação:
   ```sql
   CREATE DATABASE finfam_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Recomenda-se criar um usuário dedicado com privilégios completos sobre o banco de dados:
   ```sql
   CREATE USER 'finfam_user'@'localhost' IDENTIFIED BY 'finfam_password_forte';
   GRANT ALL PRIVILEGES ON finfam_db.* TO 'finfam_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

#### Configuração do Arquivo `.env`
Duplique o arquivo `.env.example` ou crie um arquivo `.env` na raiz do projeto contendo as variáveis abaixo:
```env
PORT=3000
SESSION_SECRET=uma_chave_secreta_e_longa_aqui
TIMEZONE=America/Fortaleza

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=finfam_user
DB_PASSWORD=finfam_password_forte
DB_NAME=finfam_db
```

### 🗄️ 2. Gerenciamento de Migrations e Estrutura
O sistema gerencia sua própria estrutura de tabelas utilizando um utilitário CLI embutido escrito em TypeScript:
- Para criar a estrutura inicial e aplicar novas alterações:
  ```bash
  npm run db:migrate
  ```
- Para verificar o andamento e quais scripts SQL já foram aplicados:
  ```bash
  npm run db:status
  ```
- Para preencher o banco com dados de demonstração (não roda em produção):
  ```bash
  npm run db:seed
  ```
- Para apagar todas as tabelas e reconstruir o esquema do zero (não roda em produção, requer parâmetro de segurança):
  ```bash
  npm run db:reset -- --confirm
  ```

### 👤 3. Fluxo de Primeiro Uso
Ao rodar a aplicação pela primeira vez com o banco de dados limpo, o sistema impede o acesso convencional e exige um fluxo de bootstrap de segurança:
1. Acesse o endereço da aplicação no navegador (ex: `http://localhost:3000`).
2. O frontend detectará automaticamente que o sistema não está configurado e exibirá a tela de **Configuração Inicial (Primeiro Uso)**.
3. Insira o nome da família, o nome completo do primeiro administrador, um usuário e uma senha forte (mínimo 8 caracteres, uma maiúscula, uma minúscula, um número e um caractere especial).
4. Ao concluir, o sistema criará a família correspondente (`family_id: 1`), o usuário administrador (`role: "admin"`) e as categorias padrão recomendadas de receitas e despesas.

### 🧪 4. Executando os Testes Automatizados
O projeto conta com uma suíte de testes integrados e unitários construídos com **Vitest** e **Supertest** que realizam testes reais ponta a ponta contra o banco MySQL configurado na variável de ambiente (não utiliza mocks para conexões de rede ou persistência nos testes de integração).

Execute o seguinte comando para rodar todos os testes de validação, concorrência, multi-tenant e segurança:
```bash
npm run test
```

### 🏗️ 5. Build e Execução em Produção
Para implantar o sistema em um servidor de produção ou container (ex: Docker / Cloud Run):
1. Execute o comando de compilação:
   ```bash
   npm run build
   ```
   *Isso compilará os arquivos estáticos do frontend em `dist/` e gerará o arquivo independente `dist/server.cjs` para o backend.*
2. Inicialize a aplicação utilizando o script compilado de produção:
   ```bash
   npm run start
   ```

### 💾 6. Estratégia de Backup
Manter cópias de segurança do banco de dados MySQL é vital para evitar perda de dados familiares.
- **Exportação (Dump):** Para gerar um backup completo do esquema e dos dados:
  ```bash
  mysqldump -h 127.0.0.1 -u finfam_user -p finfam_db > backup_finfam_$(date +%F).sql
  ```
- **Restauração:** Para restaurar um backup existente em um banco limpo:
  ```bash
  mysql -h 127.0.0.1 -u finfam_user -p finfam_db < backup_finfam_nome_do_arquivo.sql
  ```

### 🚨 7. Resolução de Problemas Comuns

#### Erro `ER_ACCESS_DENIED_ERROR` ou falha ao conectar no banco de dados
- **Causa:** O usuário ou a senha definidos no `.env` estão incorretos, ou o serviço do MySQL não está rodando.
- **Solução:** Verifique as variáveis `DB_USER` e `DB_PASSWORD` no arquivo `.env`. Certifique-se de que o servidor do MySQL está ativo digitando `mysqladmin -u root -p status` no terminal do sistema operacional.

#### Erro `INSUFFICIENT_FREE_BALANCE` ao tentar realizar um aporte em caixinha
- **Causa:** Você está tentando guardar um valor em uma caixinha/projeto que excede o saldo disponível livre da conta bancária de origem.
- **Solução:** Lembre-se de que o saldo livre é o `nominal_balance` menos os saldos já reservados para outros projetos. Registre uma nova receita na conta antes de efetuar o aporte ou realize o resgate de outra caixinha na mesma conta.

#### Sessão expirada ou erro ao efetuar login
- **Causa:** A variável de ambiente `SESSION_SECRET` não foi configurada ou mudou repentinamente, invalidando cookies antigos.
- **Solução:** Certifique-se de definir uma chave fixa e segura para `SESSION_SECRET` no seu arquivo de produção para que ela persista após reinicializações do servidor.

---

*O projeto FinFam está sob licença Apache-2.0. Consulte o time de engenharia e arquitetura para mais informações.*
