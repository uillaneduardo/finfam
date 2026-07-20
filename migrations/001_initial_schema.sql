-- =============================================================================
-- FinFam - Initial Migration (Schema v1.0)
-- Banco de Dados: MySQL (v8.0+)
-- Descrição: Criação de todas as tabelas básicas do monólito modular FinFam,
--            garantindo restrições de chaves estrangeiras, índices de performance,
--            e campos de auditoria e isolamento (family_id).
-- =============================================================================

-- Habilita verificação estrita de chaves estrangeiras durante o deploy
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Tabela: families
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `families` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT 'Nome de exibição da família',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação da família',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última alteração de metadados da família',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de isolamento multi-tenant (Famílias)';

-- -----------------------------------------------------------------------------
-- 2. Tabela: users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Associação única do usuário à sua família no MVP',
  `name` VARCHAR(150) NOT NULL COMMENT 'Nome completo do usuário',
  `username` VARCHAR(50) NOT NULL COMMENT 'Nome de login unificado (único globalmente)',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hash seguro da senha de acesso',
  `role` ENUM('admin', 'member') NOT NULL COMMENT 'Papel do usuário na gestão financeira',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'Controle de acesso do usuário',
  `last_login_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Registro de auditoria do último login',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização do registro',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  CONSTRAINT `fk_users_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de usuários cadastrados e vinculados às famílias';

CREATE INDEX `idx_users_family` ON `users` (`family_id`);

-- -----------------------------------------------------------------------------
-- 3. Tabela: accounts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Isolamento de dados por família',
  `name` VARCHAR(100) NOT NULL COMMENT 'Nome intuitivo da conta bancária ou caixinha',
  `institution` VARCHAR(100) NOT NULL COMMENT 'Nome do banco ou localizador físico',
  `type` ENUM('checking', 'savings', 'digital_wallet', 'cash', 'other') NOT NULL COMMENT 'Tipo da conta financeira',
  `holder_name` VARCHAR(150) NOT NULL COMMENT 'Nome do titular (usuário ou terceiro)',
  `account_identifier` VARCHAR(50) DEFAULT NULL COMMENT 'Dados adicionais (Agência, conta)',
  `pix_key` VARCHAR(100) DEFAULT NULL COMMENT 'Chave Pix opcional da conta',
  `initial_balance` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT 'Saldo no momento da criação da conta',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'Indica se a conta pode receber novos lançamentos',
  `notes` TEXT DEFAULT NULL COMMENT 'Observações e detalhes de uso',
  `created_by_id` BIGINT UNSIGNED NOT NULL COMMENT 'Auditoria de autoria de criação',
  `updated_by_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Auditoria de autoria de alteração',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização do registro',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_accounts_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_accounts_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_accounts_updated_by` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de contas financeiras onde o dinheiro é custodiado';

CREATE INDEX `idx_accounts_family_status` ON `accounts` (`family_id`, `status`);

-- -----------------------------------------------------------------------------
-- 4. Tabela: contacts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Isolamento de dados por família',
  `name` VARCHAR(150) NOT NULL COMMENT 'Nome ou razão social do contato financeiro',
  `type` ENUM('person', 'company', 'bank', 'client', 'supplier', 'government', 'other') NOT NULL COMMENT 'Tipo do contato',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT 'Telefone opcional de contato',
  `document_number` VARCHAR(30) DEFAULT NULL COMMENT 'CPF/CNPJ para notas fiscais',
  `pix_key` VARCHAR(100) DEFAULT NULL COMMENT 'Chave Pix para facilitação de pagamentos',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'Permissões de vínculo do contato',
  `notes` TEXT DEFAULT NULL COMMENT 'Observações ou informações de histórico',
  `created_by_id` BIGINT UNSIGNED NOT NULL COMMENT 'Auditoria de autoria de criação',
  `updated_by_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Auditoria de autoria de alteração',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de alteração',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_contacts_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contacts_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_contacts_updated_by` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de contatos financeiros da família';

CREATE INDEX `idx_contacts_family_name` ON `contacts` (`family_id`, `name`);

-- -----------------------------------------------------------------------------
-- 5. Tabela: categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Isolamento de dados por família',
  `name` VARCHAR(100) NOT NULL COMMENT 'Nome de exibição da categoria',
  `type` ENUM('income', 'expense', 'both') NOT NULL DEFAULT 'both' COMMENT 'Aplicações sugeridas',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'Indica se a categoria está ativa para novos registros',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_family_name` (`family_id`, `name`),
  CONSTRAINT `fk_categories_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de categorias opcionais para classificação';

-- -----------------------------------------------------------------------------
-- 6. Tabela: transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Isolamento de dados por família',
  `type` ENUM('income', 'expense', 'transfer') NOT NULL COMMENT 'Tipo do lançamento financeiro',
  `description` VARCHAR(255) NOT NULL COMMENT 'Descrição amigável da operação',
  `amount` DECIMAL(15,2) NOT NULL COMMENT 'Valor absoluto e positivo da operação',
  `transaction_date` DATE NOT NULL COMMENT 'Data efetiva da movimentação (não data de registro)',
  `source_account_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Conta debitada (obrigatorio em expense e transfer)',
  `destination_account_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Conta creditada (obrigatorio em income e transfer)',
  `responsible_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Usuário responsável pelo gasto/recebimento',
  `category_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Referência de classificação opcional',
  `contact_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Parceiro associado à operação',
  `notes` TEXT DEFAULT NULL COMMENT 'Observações e esclarecimentos',
  `created_by_id` BIGINT UNSIGNED NOT NULL COMMENT 'Criador do lançamento',
  `updated_by_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Alterador do lançamento',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_transactions_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_source_acc` FOREIGN KEY (`source_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_dest_acc` FOREIGN KEY (`destination_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_responsible` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transactions_updated_by` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela central de movimentações e lançamentos financeiros';

CREATE INDEX `idx_transactions_query` ON `transactions` (`family_id`, `transaction_date`, `type`);

-- -----------------------------------------------------------------------------
-- 7. Tabela: commitments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `commitments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Isolamento de dados por família',
  `type` ENUM('to_pay', 'to_receive') NOT NULL COMMENT 'Tipo do compromisso agendado',
  `description` VARCHAR(255) NOT NULL COMMENT 'Descrição do compromisso',
  `estimated_amount` DECIMAL(15,2) NOT NULL COMMENT 'Valor previsto',
  `due_date` DATE NOT NULL COMMENT 'Data limite de vencimento',
  `contact_id` BIGINT UNSIGNED NOT NULL COMMENT 'Contato credor ou devedor',
  `responsible_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Usuário responsável por quitar/cobrar',
  `estimated_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'Conta prevista para liquidação',
  `category_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Classificação opcional',
  `status` ENUM('pending', 'paid', 'received', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT 'Status do fluxo',
  `recurrence_type` ENUM('none', 'monthly', 'weekly') NOT NULL DEFAULT 'none' COMMENT 'Recorrência operacional',
  `actual_amount` DECIMAL(15,2) DEFAULT NULL COMMENT 'Valor efetivamente pago ou recebido',
  `actual_date` DATE DEFAULT NULL COMMENT 'Data em que ocorreu a quitação real',
  `transaction_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Link para a movimentação criada no fluxo transacional de quitação',
  `notes` TEXT DEFAULT NULL,
  `created_by_id` BIGINT UNSIGNED NOT NULL,
  `updated_by_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_commitments_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_commitments_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_commitments_responsible` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_commitments_estimated_acc` FOREIGN KEY (`estimated_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_commitments_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_commitments_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_commitments_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_commitments_updated_by` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de compromissos agendados e contas futuras';

CREATE INDEX `idx_commitments_due` ON `commitments` (`family_id`, `status`, `due_date`);

-- -----------------------------------------------------------------------------
-- 8. Tabela: projects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Isolamento de dados por família',
  `type` ENUM('reserve', 'project') NOT NULL COMMENT 'Diferenciação operacional das caixinhas',
  `name` VARCHAR(100) NOT NULL COMMENT 'Nome amigável da meta',
  `description` TEXT DEFAULT NULL COMMENT 'Detalhes dos objetivos da poupança',
  `target_amount` DECIMAL(15,2) DEFAULT NULL COMMENT 'Valor financeiro final da meta',
  `deadline` DATE DEFAULT NULL COMMENT 'Prazo desejado para conclusão',
  `responsible_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Líder da poupança mútua',
  `status` ENUM('active', 'paused', 'completed', 'cancelled') NOT NULL DEFAULT 'active' COMMENT 'Indica se aceita depósitos',
  `notes` TEXT DEFAULT NULL,
  `created_by_id` BIGINT UNSIGNED NOT NULL,
  `updated_by_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_projects_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_projects_responsible` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_projects_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_projects_updated_by` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de reservas e projetos planejados em comum';

-- -----------------------------------------------------------------------------
-- 9. Tabela: project_operations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `project_operations` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Isolamento de dados por família',
  `project_id` BIGINT UNSIGNED NOT NULL COMMENT 'Associação à caixinha',
  `operation_type` ENUM('deposit', 'withdrawal', 'transfer_out', 'transfer_in') NOT NULL COMMENT 'Sentido da movimentação de reserva',
  `amount` DECIMAL(15,2) NOT NULL COMMENT 'Valor absoluto da operação (positivo)',
  `source_account_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Conta onde o dinheiro foi debitado/reservado',
  `destination_account_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Conta de onde o dinheiro foi resgatado/liberado',
  `operation_date` DATE NOT NULL COMMENT 'Data do fato',
  `notes` TEXT DEFAULT NULL COMMENT 'Histórico descritivo da movimentação de reserva',
  `created_by_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_project_ops_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_project_ops_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_ops_source_acc` FOREIGN KEY (`source_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_project_ops_dest_acc` FOREIGN KEY (`destination_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_project_ops_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de operações de reservas que impactam o saldo livre das contas';

CREATE INDEX `idx_proj_ops_query` ON `project_operations` (`family_id`, `project_id`);
