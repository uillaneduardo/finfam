# Modelo de Dados - FinFam

Este documento descreve a modelagem lógica sugerida para o banco de dados do **FinFam** utilizando o **MySQL**. Os nomes técnicos de tabelas e colunas foram definidos em inglês, enquanto todas as explicações de regras e finalidades estão em português do Brasil.

---

## 1. Famílias (`families`)
Armazena as famílias (inquilinos) do sistema, servindo como o contexto principal para o isolamento de dados.

* **Campos:**
  * `id`: `BIGINT UNSIGNED` (AUTO_INCREMENT) | **PK** | Identificador único da família.
  * `name`: `VARCHAR(100)` | **NOT NULL** | Nome da família (ex: "Família Silva").
  * `created_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP`.
  * `updated_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP` on update `CURRENT_TIMESTAMP`.

* **Regras de Integridade:**
  * O nome da família deve possuir no mínimo 3 caracteres.

---

## 2. Usuários (`users`)
Armazena os membros da família cadastrados na plataforma.

* **Campos:**
  * `id`: `BIGINT UNSIGNED` (AUTO_INCREMENT) | **PK** | Identificador único do usuário.
  * `family_id`: `BIGINT UNSIGNED` | **FK** | Referencia `families(id)`. **NOT NULL** | Família à qual pertence.
  * `name`: `VARCHAR(150)` | **NOT NULL** | Nome completo do usuário.
  * `username`: `VARCHAR(50)` | **NOT NULL** | Nome de usuário único globalmente para login.
  * `password_hash`: `VARCHAR(255)` | **NOT NULL** | Hash seguro da senha de acesso.
  * `role`: `ENUM('admin', 'member')` | **NOT NULL** | Papel operacional do usuário.
  * `status`: `ENUM('active', 'inactive')` | **NOT NULL** | Default `'active'`.
  * `last_login_at`: `TIMESTAMP` | **NULL** | Registro do último acesso válido.
  * `created_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP`.
  * `updated_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP` on update `CURRENT_TIMESTAMP`.

* **Índices e Restrições:**
  * **Unique Key:** `uq_users_username` em `username` (garante unicidade global para viabilizar login unificado).
  * **Índice:** `idx_users_family_id` em `family_id`.

---

## 3. Contas Financeiras (`accounts`)
Registra as contas onde os valores monetários estão fisicamente ou virtualmente guardados.

* **Campos:**
  * `id`: `BIGINT UNSIGNED` (AUTO_INCREMENT) | **PK** | Identificador único da conta.
  * `family_id`: `BIGINT UNSIGNED` | **FK** | Referencia `families(id)`. **NOT NULL**.
  * `name`: `VARCHAR(100)` | **NOT NULL** | Nome personalizado da conta (ex: "Nubank Principal").
  * `institution`: `VARCHAR(100)` | **NOT NULL** | Nome da instituição (ex: "Nu Pagamentos S.A.").
  * `type`: `ENUM('checking', 'savings', 'digital_wallet', 'cash', 'other')` | **NOT NULL** | Tipo da conta.
  * `holder_name`: `VARCHAR(150)` | **NOT NULL** | Nome do titular da conta (usuário ou terceiro).
  * `account_identifier`: `VARCHAR(50)` | **NULL** | Número de agência/conta opcional.
  * `pix_key`: `VARCHAR(100)` | **NULL** | Chave Pix atrelada à conta para consulta familiar.
  * `initial_balance`: `DECIMAL(15,2)` | **NOT NULL** | Default `0.00` | Saldo inicial cadastrado.
  * `status`: `ENUM('active', 'inactive')` | **NOT NULL** | Default `'active'`.
  * `notes`: `TEXT` | **NULL** | Observações adicionais.
  * `created_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NOT NULL**.
  * `updated_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NULL**.
  * `created_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP`.
  * `updated_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP` on update `CURRENT_TIMESTAMP`.

* **Índices:**
  * **Índice composto:** `idx_accounts_family_status` em `(family_id, status)`.

---

## 4. Contatos Financeiros (`contacts`)
Armazena terceiros com quem a família realiza transações de pagamento ou recebimento.

* **Campos:**
  * `id`: `BIGINT UNSIGNED` (AUTO_INCREMENT) | **PK**.
  * `family_id`: `BIGINT UNSIGNED` | **FK** | Referencia `families(id)`. **NOT NULL**.
  * `name`: `VARCHAR(150)` | **NOT NULL** | Nome do contato (ex: "Neoenergia Coelba").
  * `type`: `ENUM('person', 'company', 'bank', 'client', 'supplier', 'government', 'other')` | **NOT NULL**.
  * `phone`: `VARCHAR(20)` | **NULL**.
  * `document_number`: `VARCHAR(30)` | **NULL** | CPF, CNPJ ou identificador opcional.
  * `pix_key`: `VARCHAR(100)` | **NULL** | Chave Pix do contato para facilitar pagamentos.
  * `status`: `ENUM('active', 'inactive')` | **NOT NULL** | Default `'active'`.
  * `notes`: `TEXT` | **NULL**.
  * `created_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NOT NULL**.
  * `updated_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NULL**.
  * `created_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP`.
  * `updated_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP` on update `CURRENT_TIMESTAMP`.

* **Índices:**
  * **Índice composto:** `idx_contacts_family_name` em `(family_id, name)`.

---

## 5. Categorias (`categories`)
Permite a classificação opcional de transações e compromissos.

* **Campos:**
  * `id`: `BIGINT UNSIGNED` (AUTO_INCREMENT) | **PK**.
  * `family_id`: `BIGINT UNSIGNED` | **FK** | Referencia `families(id)`. **NOT NULL**.
  * `name`: `VARCHAR(100)` | **NOT NULL** | Nome da categoria (ex: "Moradia", "Lazer").
  * `type`: `ENUM('income', 'expense', 'both')` | **NOT NULL** | Default `'both'`.
  * `status`: `ENUM('active', 'inactive')` | **NOT NULL** | Default `'active'`.
  * `created_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP`.
  * `updated_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP` on update `CURRENT_TIMESTAMP`.

* **Índices:**
  * **Unique Key composta:** `uq_categories_family_name` em `(family_id, name)`.

---

## 6. Movimentações Financeiras (`transactions`)
Histórico de todas as entradas, saídas e transferências de saldo consolidadas na família.

* **Campos:**
  * `id`: `BIGINT UNSIGNED` (AUTO_INCREMENT) | **PK**.
  * `family_id`: `BIGINT UNSIGNED` | **FK** | Referencia `families(id)`. **NOT NULL**.
  * `type`: `ENUM('income', 'expense', 'transfer')` | **NOT NULL**.
  * `description`: `VARCHAR(255)` | **NOT NULL**.
  * `amount`: `DECIMAL(15,2)` | **NOT NULL** | Deve ser maior que `0.00`.
  * `transaction_date`: `DATE` | **NOT NULL** | Data efetiva em que ocorreu a movimentação.
  * `source_account_id`: `BIGINT UNSIGNED` | **FK** | Referencia `accounts(id)`. **NULL** (Obrigatório se `type` for `'expense'` ou `'transfer'`).
  * `destination_account_id`: `BIGINT UNSIGNED` | **FK** | Referencia `accounts(id)`. **NULL** (Obrigatório se `type` for `'income'` ou `'transfer'`).
  * `responsible_user_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NOT NULL** | Usuário responsável pela despesa/receita.
  * `category_id`: `BIGINT UNSIGNED` | **FK** | Referencia `categories(id)`. **NULL** | Classificação opcional.
  * `contact_id`: `BIGINT UNSIGNED` | **FK** | Referencia `contacts(id)`. **NULL** | Contato associado.
  * `notes`: `TEXT` | **NULL**.
  * `created_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NOT NULL**.
  * `updated_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NULL**.
  * `created_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP`.
  * `updated_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP` on update `CURRENT_TIMESTAMP`.

* **Índices:**
  * **Índice composto:** `idx_transactions_query` em `(family_id, transaction_date, type)`.

---

## 7. Compromissos Financeiros (`commitments`)
Agendamento de contas a pagar e a receber previstas.

* **Campos:**
  * `id`: `BIGINT UNSIGNED` (AUTO_INCREMENT) | **PK**.
  * `family_id`: `BIGINT UNSIGNED` | **FK** | Referencia `families(id)`. **NOT NULL**.
  * `type`: `ENUM('to_pay', 'to_receive')` | **NOT NULL**.
  * `description`: `VARCHAR(255)` | **NOT NULL**.
  * `estimated_amount`: `DECIMAL(15,2)` | **NOT NULL** | Valor previsto. Deve ser maior que `0.00`.
  * `due_date`: `DATE` | **NOT NULL** | Data de vencimento do compromisso.
  * `contact_id`: `BIGINT UNSIGNED` | **FK** | Referencia `contacts(id)`. **NOT NULL** | Fornecedor ou cliente do compromisso.
  * `responsible_user_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NOT NULL** | Usuário encarregado por efetuar o pagamento/recebimento.
  * `estimated_account_id`: `BIGINT UNSIGNED` | **FK** | Referencia `accounts(id)`. **NOT NULL** | Conta financeira prevista para a operação.
  * `category_id`: `BIGINT UNSIGNED` | **FK** | Referencia `categories(id)`. **NULL**.
  * `status`: `ENUM('pending', 'paid', 'received', 'cancelled')` | **NOT NULL** | Default `'pending'`.
  * `recurrence_type`: `ENUM('none', 'monthly', 'weekly')` | **NOT NULL** | Default `'none'`.
  * `actual_amount`: `DECIMAL(15,2)` | **NULL** | Valor efetivamente realizado ao liquidar.
  * `actual_date`: `DATE` | **NULL** | Data efetiva do pagamento/recebimento.
  * `transaction_id`: `BIGINT UNSIGNED` | **FK** | Referencia `transactions(id)`. **NULL** | Link para a movimentação criada na quitação.
  * `notes`: `TEXT` | **NULL**.
  * `created_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NOT NULL**.
  * `updated_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NULL**.
  * `created_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP`.
  * `updated_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP` on update `CURRENT_TIMESTAMP`.

* **Índices:**
  * **Índice composto:** `idx_commitments_due` em `(family_id, status, due_date)`.

---

## 8. Reservas e Projetos (`projects`)
Guarda as metas financeiras estabelecidas pela família.

* **Campos:**
  * `id`: `BIGINT UNSIGNED` (AUTO_INCREMENT) | **PK**.
  * `family_id`: `BIGINT UNSIGNED` | **FK** | Referencia `families(id)`. **NOT NULL**.
  * `type`: `ENUM('reserve', 'project')` | **NOT NULL**.
  * `name`: `VARCHAR(100)` | **NOT NULL** | Nome da meta (ex: "Reserva de Emergência").
  * `description`: `TEXT` | **NULL**.
  * `target_amount`: `DECIMAL(15,2)` | **NULL** | Valor opcional a ser atingido.
  * `deadline`: `DATE` | **NULL** | Prazo final opcional para a meta.
  * `responsible_user_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NOT NULL** | Gestor da reserva.
  * `status`: `ENUM('active', 'paused', 'completed', 'cancelled')` | **NOT NULL** | Default `'active'`.
  * `notes`: `TEXT` | **NULL**.
  * `created_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NOT NULL**.
  * `updated_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NULL**.
  * `created_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP`.
  * `updated_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP` on update `CURRENT_TIMESTAMP`.

---

## 9. Operações de Reserva (`project_operations`)
Acompanhamento detalhado de todas as alterações nos valores reservados.

* **Campos:**
  * `id`: `BIGINT UNSIGNED` (AUTO_INCREMENT) | **PK**.
  * `family_id`: `BIGINT UNSIGNED` | **FK** | Referencia `families(id)`. **NOT NULL**.
  * `project_id`: `BIGINT UNSIGNED` | **FK** | Referencia `projects(id)`. **NOT NULL**.
  * `operation_type`: `ENUM('deposit', 'withdrawal', 'transfer_out', 'transfer_in')` | **NOT NULL**.
  * `amount`: `DECIMAL(15,2)` | **NOT NULL** | Valor absoluto da operação. Deve ser maior que `0.00`.
  * `source_account_id`: `BIGINT UNSIGNED` | **FK** | Referencia `accounts(id)`. **NULL** (Requerido em `'deposit'` ou `'transfer_out'`).
  * `destination_account_id`: `BIGINT UNSIGNED` | **FK** | Referencia `accounts(id)`. **NULL** (Requerido em `'withdrawal'` ou `'transfer_in'`).
  * `operation_date`: `DATE` | **NOT NULL**.
  * `notes`: `TEXT` | **NULL** | Detalhamento ou justificativa da operação.
  * `created_by_id`: `BIGINT UNSIGNED` | **FK** | Referencia `users(id)`. **NOT NULL**.
  * `created_at`: `TIMESTAMP` | **NOT NULL** | Default `CURRENT_TIMESTAMP`.

* **Índices:**
  * **Índice composto:** `idx_proj_ops_query` em `(family_id, project_id)`.
