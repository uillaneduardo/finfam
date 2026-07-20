# Migrations e Carga de Sementes (Seed) - FinFam

Este documento detalha o funcionamento, as diretrizes de execução, o controle de versão do banco de dados e a massa de dados para testes (seeds) projetados para o deploy e homologação do **FinFam**.

---

## 1. Estratégia de Migrations (Controle de Versão do Banco)

O banco de dados do FinFam utiliza migrações estruturadas (scripts SQL DDL) para evoluir a estrutura do esquema sem perda de dados e garantir deploys reproduzíveis em qualquer ambiente (desenvolvimento, testes, produção).

### 1.1 Repositório de Migrations
Todas as migrações de estrutura residem na pasta `/migrations` do repositório, nomeadas de forma sequencial cronológica:
```text
/migrations
└── 001_initial_schema.sql      # Schema v1.0 contendo todas as tabelas e índices do MVP
```

### 1.2 Regras de Ouro para Escrita de Migrations
1. **Idempotência:** Cada script de migração deve ser idempotente, utilizando condicionais como `CREATE TABLE IF NOT EXISTS` ou `ALTER TABLE ... ADD COLUMN ...` com checagens prévias, evitando falhas em caso de reexecução acidental.
2. **Sem Alteração de Arquivos Passados:** Uma migração já aplicada em produção **nunca** deve ser editada. Alterações subsequentes de estrutura (ex: adicionar uma coluna ou índice) devem obrigatoriamente ser feitas criando um novo arquivo (ex: `002_add_new_column.sql`).
3. **Atomicidade:** Sempre que possível, utilize transações de DDL ou execute as operações em lotes isolados de forma que falhas parem o deploy e possam ser revertidas com segurança.

---

## 2. Estratégia de Carga de Dados (Seed de Sementes)

Para acelerar a homologação, facilitar a escrita de cenários de teste automatizados e guiar o desenvolvimento do frontend, foi disponibilizada uma carga de dados estruturada na pasta `/seeds`.

### 2.1 Massa de Dados Fornecida (`/seeds/001_initial_seed.sql`)
O script popula uma família fictícia de exemplo extremamente coerente, cobrindo todas as regras de negócio especificadas:

* **Inquilino:** Cria a **"Família Silva"** (ID: 1).
* **Usuários (Membros):**
  * `uilland` (ID 1, administrador): papel de `admin`, senha criptografada em hash seguro.
  * `aline` (ID 2, membro): papel de `member`, senha criptografada em hash seguro.
* **Contas Financeiras:**
  * *Nubank Principal* (Checking, titular Uilland): Saldo nominal inicial de R$ 1.500,00.
  * *Poupança Sicredi* (Savings, titular Aline): Saldo nominal inicial de R$ 5.000,00.
  * *Carteira Dinheiro* (Cash, titular Uilland): Saldo nominal inicial de R$ 150,00.
* **Contatos Financeiros:** Neoenergia (Concessionária), Brisanet (Internet), Padaria do Bairro (Fornecedor) e Patrão Tecnologia (CLT).
* **Categorias Opcionais:** Habitação, Alimentação, Serviços de Tecnologia, Lazer e Salários.
* **Transações Realizadas:**
  * Entrada: Salário de Uilland de R$ 4.500,00 (Nubank).
  * Saída: Gasto de R$ 45,00 na Padaria (Carteira).
  * Transferência: R$ 200,00 retirados do Nubank para a Carteira.
  * Saída: R$ 165,50 referentes à quitação da luz (Nubank).
* **Compromissos Agendados:**
  * Energia elétrica: no valor de R$ 165,50, vencimento 15/07/2026, com status de **Pago** em 14/07/2026 e vinculado à respectiva transação (Transação 4).
  * Fibra Óptica Internet: R$ 120,00, vencimento em 25/07/2026, status de **Pendente** (dentro do prazo).
  * Conta de Água: R$ 85,00, vencimento em 10/07/2026, status de **Pendente** (intencionalmente **Atrasado por 9 dias** frente ao tempo de simulação de 19/07/2026 para validar o motor de atrasos).
* **Projetos e Caixinhas (Reservas):**
  * *Reserva de Emergência* (Meta R$ 15.000,00): Aporte/depósito inicial de R$ 3.000,00 associado logicamente à conta *Poupança Sicredi*.
  * *Geladeira Nova* (Meta R$ 3.500,00): Aporte de R$ 500,00 (Nubank) e um resgate de R$ 100,00 (Nubank).

---

## 3. Consolidação Matemática Esperada do Seed

Os desenvolvedores e analistas de QA podem usar os seguintes valores nominais resultantes do script de sementes para validar as fórmulas de cálculo de saldos da aplicação:

### 3.1 Valores Individuais por Conta
* **Nubank Principal (ID 1):**
  * Saldo Nominal: **R$ 5.634,50**
  * Saldo Reservado: **R$ 400,00** (Geladeira: R$ 500,00 de aporte - R$ 100,00 de resgate)
  * **Saldo Livre Disponível: R$ 5.234,50**
* **Poupança Sicredi (ID 2):**
  * Saldo Nominal: **R$ 5.000,00**
  * Saldo Reservado: **R$ 3.000,00** (Reserva de Emergência)
  * **Saldo Livre Disponível: R$ 2.000,00**
* **Carteira Dinheiro (ID 3):**
  * Saldo Nominal: **R$ 305,00**
  * Saldo Reservado: **R$ 0,00**
  * **Saldo Livre Disponível: R$ 305,00**

### 3.2 Valores Consolidados Globais da Família Silva
* **Saldo Nominal Total:** **R$ 10.939,50** (Dinheiro total bruto nos bancos)
* **Saldo Reservado Total:** **R$ 3.400,00** (Dinheiro retido em metas comuns)
* **Saldo Livre Global:** **R$ 7.539,50** (Dinheiro disponível para o dia a dia da família)

---

## 4. Como Executar as Migrations e Seeds no Deploy

A execução das migrações e a carga de dados para homologação estão documentadas nas tarefas do `package.json` utilizando scripts automatizados.

### 4.1 Preparar Ambiente
Certifique-se de que as variáveis de ambiente de acesso ao banco MySQL estejam devidamente configuradas no arquivo `.env` local:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=suasenha
DB_NAME=finfam_db
```

### 4.2 Executar Migrations (Deploy de Estrutura)
Para rodar as migrações que preparam as tabelas para a aplicação, utilize:
```bash
# Executa as queries DDL do diretório /migrations no MySQL configurado
npm run db:migrate
```

### 4.3 Executar Seeds (Carga Inicial de Demonstração)
Para carregar a massa de dados fictícia descrita acima (útil em ambientes de teste, homologação e desenvolvimento local):
```bash
# Executa as queries DML de sementes para popular os registros de teste
npm run db:seed
```

*Nota: O script de sementes possui um comando inicial `TRUNCATE TABLE` para limpar dados antigos antes de injetar os novos. Portanto, nunca execute `db:seed` em ambientes de produção real para evitar perda acidental de dados da família.*
