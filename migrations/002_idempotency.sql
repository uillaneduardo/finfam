-- =============================================================================
-- FinFam - Migration 002 (Idempotency Key for Transactions)
-- Banco de Dados: MySQL (v8.0+)
-- Descrição: Adiciona suporte a idempotency_key para evitar lançamentos duplicados
-- =============================================================================

ALTER TABLE `transactions` ADD COLUMN `idempotency_key` VARCHAR(100) DEFAULT NULL COMMENT 'Chave única de idempotência gerada pelo frontend';
ALTER TABLE `transactions` ADD UNIQUE KEY `uq_transactions_idempotency` (`family_id`, `idempotency_key`);
