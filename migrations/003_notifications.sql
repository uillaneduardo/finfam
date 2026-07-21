-- =============================================================================
-- FinFam - Migration 003 (Notificações de Alterações da Família)
-- Banco de Dados: MySQL (v8.0+)
-- Descrição: Tabela para histórico e avisos de modificações em contas, lançamentos,
--            compromissos, caixinhas, contatos e categorias.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT,
  `family_id` BIGINT UNSIGNED NOT NULL COMMENT 'Família destinatária da notificação',
  `actor_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Usuário que realizou a alteração',
  `module` ENUM('account', 'transaction', 'commitment', 'project', 'contact', 'category') NOT NULL COMMENT 'Funcionalidade alterada',
  `action` ENUM('create', 'update', 'delete') NOT NULL COMMENT 'Tipo de operação',
  `title` VARCHAR(255) NOT NULL COMMENT 'Título amigável',
  `message` TEXT NOT NULL COMMENT 'Descrição detalhada do evento',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = Não Lida, 1 = Lida',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data/Hora de envio',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notifications_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notificações e atividades em tempo quase-real da família';

CREATE INDEX `idx_notifications_family_read` ON `notifications` (`family_id`, `is_read`, `created_at`);
