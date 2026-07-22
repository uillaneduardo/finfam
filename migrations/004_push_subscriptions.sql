-- =============================================================================
-- FinFam - Migration 004 (Inscrições de Web Push)
-- Banco de Dados: MySQL (v8.0+)
-- Descrição: Tabela para armazenamento e gerenciamento de inscrições Web Push por dispositivo e usuário.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Família associada à inscrição do dispositivo',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Usuário proprietário do dispositivo inscrito',
  `endpoint` TEXT NOT NULL COMMENT 'URL do endpoint do serviço de Push do navegador',
  `endpoint_hash` VARCHAR(64) NOT NULL COMMENT 'Hash SHA-256 do endpoint para indexação e unicidade',
  `p256dh` VARCHAR(255) NOT NULL COMMENT 'Chave pública p256dh do cliente para criptografia',
  `auth` VARCHAR(255) NOT NULL COMMENT 'Segredo auth do cliente para autenticação do payload',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT 'User-Agent do dispositivo/navegador',
  `device_name` VARCHAR(100) DEFAULT NULL COMMENT 'Nome identificador amigável do dispositivo',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação da inscrição',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização da inscrição',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_push_subscriptions_endpoint_hash` (`endpoint_hash`),
  CONSTRAINT `fk_push_subscriptions_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_push_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inscrições Web Push ativas para envio de notificações nos dispositivos';

CREATE INDEX `idx_push_subscriptions_family` ON `push_subscriptions` (`family_id`);
CREATE INDEX `idx_push_subscriptions_user` ON `push_subscriptions` (`user_id`);
