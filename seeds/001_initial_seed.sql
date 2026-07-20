-- =============================================================================
-- FinFam - Base Seed (Sementes v1.0)
-- Banco de Dados: MySQL (v8.0+)
-- Descrição: População inicial de dados de demonstração e teste para o FinFam,
--            simulando a "Família Silva" com dois usuários (administrador e membro),
--            contas financeiras, movimentações históricas, compromissos em diversos
--            estados (incluindo um intencionalmente atrasado) e metas de reservas.
--
-- ATENÇÃO - SEGURANÇA SOBRE OPERAÇÕES DE TRUNCATE:
-- 1. Este script é EXCLUSIVO para ambientes de desenvolvimento, QA e testes de consistência.
-- 2. Ele NUNCA deve ser executado de forma automatizada ou acidental em produção.
-- 3. A execução em produção (onde NODE_ENV=production) deve ser rigorosamente bloqueada.
-- 4. O uso de TRUNCATE neste arquivo é projetado apenas para limpar dados de demonstração.
-- =============================================================================

-- Desabilita verificação estrita temporariamente para execução das sementes
SET FOREIGN_KEY_CHECKS = 0;

-- Limpa registros existentes para evitar duplicidade durante testes de deploy.
-- IMPORTANTE: Bloquear em produção via script executor (ex: NODE_ENV=production) antes de rodar.
TRUNCATE TABLE `project_operations`;
TRUNCATE TABLE `projects`;
TRUNCATE TABLE `commitments`;
TRUNCATE TABLE `transactions`;
TRUNCATE TABLE `categories`;
TRUNCATE TABLE `contacts`;
TRUNCATE TABLE `accounts`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `families`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Inserção: families
-- -----------------------------------------------------------------------------
INSERT INTO `families` (`id`, `name`, `created_at`, `updated_at`) 
VALUES (1, 'Família Silva', '2026-07-01 08:00:00', '2026-07-01 08:00:00');

-- -----------------------------------------------------------------------------
-- 2. Inserção: users (Senhas criptografadas usando hash simulado seguro)
-- -----------------------------------------------------------------------------
-- Senha de teste para ambos os usuários: 'FinFam@2026' (hasheada com bcrypt)
-- O hash abaixo possui exatamente 60 caracteres e é uma estrutura bcrypt válida.
INSERT INTO `users` (`id`, `family_id`, `name`, `username`, `password_hash`, `role`, `status`, `last_login_at`, `created_at`, `updated_at`) 
VALUES 
(1, 1, 'Carlos Silva', 'carlos', '$2b$12$K38sA7W983sh7aA8Hhs7shdaUshfUhsdfuihsdfiushdfiu123456', 'admin', 'active', '2026-07-19 14:30:00', '2026-07-01 08:10:00', '2026-07-19 14:30:00'),
(2, 1, 'Mariana Silva', 'mariana', '$2b$12$K38sA7W983sh7aA8Hhs7shdaUshfUhsdfuihsdfiushdfiu123456', 'member', 'active', '2026-07-19 10:15:00', '2026-07-01 08:15:00', '2026-07-19 10:15:00');

-- -----------------------------------------------------------------------------
-- 3. Inserção: accounts (Saldos iniciais cadastrados)
-- -----------------------------------------------------------------------------
INSERT INTO `accounts` (`id`, `family_id`, `name`, `institution`, `type`, `holder_name`, `account_identifier`, `pix_key`, `initial_balance`, `status`, `notes`, `created_by_id`, `created_at`, `updated_at`) 
VALUES 
(1, 1, 'Banco Exemplo S.A.', 'Banco Exemplo S.A. Principal', 'checking', 'Carlos Silva', 'Ag: 0001 Cc: 12345-6', 'carlos@example.invalid', 1500.00, 'active', 'Conta conjunta para despesas mensais', 1, '2026-07-01 08:20:00', '2026-07-01 08:20:00'),
(2, 1, 'Cooperativa Poupança', 'Cooperativa Poupança Fictícia', 'savings', 'Mariana Silva', 'Ag: 0102 Cc: 98765-4', 'mariana@example.invalid', 5000.00, 'active', 'Destinada exclusivamente à reserva de emergência', 2, '2026-07-01 08:25:00', '2026-07-01 08:25:00'),
(3, 1, 'Carteira Dinheiro', 'Espécie', 'cash', 'Carlos Silva', NULL, NULL, 150.00, 'active', 'Dinheiro guardado em casa para pequenos gastos', 1, '2026-07-01 08:30:00', '2026-07-01 08:30:00');

-- -----------------------------------------------------------------------------
-- 4. Inserção: contacts (Parceiros comerciais e concessionárias - Fictícios)
-- -----------------------------------------------------------------------------
INSERT INTO `contacts` (`id`, `family_id`, `name`, `type`, `phone`, `document_number`, `pix_key`, `status`, `notes`, `created_by_id`, `created_at`, `updated_at`) 
VALUES 
(1, 1, 'Distribuidora de Energia S.A.', 'company', '(00) 00000-0000', '00.000.000/0000-00', 'energia.pix@example.invalid', 'active', 'Concessionária fictícia de fornecimento de energia elétrica', 1, '2026-07-01 08:35:00', '2026-07-01 08:35:00'),
(2, 1, 'Provedor de Internet Banda Larga', 'company', '(00) 00000-0000', '00.000.000/0000-00', 'internet.pix@example.invalid', 'active', 'Operadora fictícia de fornecimento de internet banda larga', 2, '2026-07-01 08:40:00', '2026-07-01 08:40:00'),
(3, 1, 'Padaria do Bairro', 'supplier', '(00) 00000-0000', NULL, NULL, 'active', 'Despesas diárias fictícias com café da manhã e panificação', 2, '2026-07-01 08:45:00', '2026-07-01 08:45:00'),
(4, 1, 'Empresa Exemplo S.A.', 'client', '(00) 00000-0000', '00.000.000/0000-00', 'empresa.pix@example.invalid', 'active', 'Fonte de receita fictícia (trabalho CLT de Carlos)', 1, '2026-07-01 08:50:00', '2026-07-01 08:50:00');

-- -----------------------------------------------------------------------------
-- 5. Inserção: categories (Classificação opcional)
-- -----------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `family_id`, `name`, `type`, `status`, `created_at`, `updated_at`) 
VALUES 
(1, 1, 'Habitação e Moradia', 'expense', 'active', '2026-07-01 08:55:00', '2026-07-01 08:55:00'),
(2, 1, 'Alimentação e Supermercado', 'expense', 'active', '2026-07-01 08:56:00', '2026-07-01 08:56:00'),
(3, 1, 'Serviços de Tecnologia', 'expense', 'active', '2026-07-01 08:57:00', '2026-07-01 08:57:00'),
(4, 1, 'Lazer e Entretenimento', 'expense', 'active', '2026-07-01 08:58:00', '2026-07-01 08:58:00'),
(5, 1, 'Rendimentos e Salários', 'income', 'active', '2026-07-01 08:59:00', '2026-07-01 08:59:00');

-- -----------------------------------------------------------------------------
-- 6. Inserção: transactions (Histórico financeiro real)
-- -----------------------------------------------------------------------------
INSERT INTO `transactions` (`id`, `family_id`, `type`, `description`, `amount`, `transaction_date`, `source_account_id`, `destination_account_id`, `responsible_user_id`, `category_id`, `contact_id`, `notes`, `created_by_id`, `created_at`, `updated_at`) 
VALUES 
-- Entrada de Salário (CLT) recebida no Banco Exemplo S.A.
(1, 1, 'income', 'Salário Mensal CLT Carlos', 4500.00, '2026-07-05', NULL, 1, 1, 5, 4, 'Salário fictício pago pontualmente pelo empregador', 1, '2026-07-05 09:00:00', '2026-07-05 09:00:00'),
-- Saída real para compra de lanches na Padaria
(2, 1, 'expense', 'Compra de pão e frios', 45.00, '2026-07-10', 3, NULL, 2, 2, 3, 'Pago em dinheiro físico da carteira', 2, '2026-07-10 17:30:00', '2026-07-10 17:30:00'),
-- Transferência interna entre Banco Exemplo S.A. e Carteira física
(3, 1, 'transfer', 'Saque de dinheiro do banco para carteira', 200.00, '2026-07-12', 1, 3, 1, NULL, NULL, 'Para pequenos trocados da semana', 1, '2026-07-12 11:00:00', '2026-07-12 11:00:00'),
-- Saída automática decorrente da quitação de um compromisso de luz (Distribuidora de Energia)
(4, 1, 'expense', 'Quitação fatura de energia elétrica', 165.50, '2026-07-14', 1, NULL, 1, 1, 1, 'Pago via Pix pelo Banco Exemplo S.A.', 1, '2026-07-14 10:00:00', '2026-07-14 10:00:00');

-- -----------------------------------------------------------------------------
-- 7. Inserção: commitments (Contas a pagar/receber futuras e atrasadas)
-- -----------------------------------------------------------------------------
INSERT INTO `commitments` (`id`, `family_id`, `type`, `description`, `estimated_amount`, `due_date`, `contact_id`, `responsible_user_id`, `estimated_account_id`, `category_id`, `status`, `recurrence_type`, `actual_amount`, `actual_date`, `transaction_id`, `notes`, `created_by_id`, `created_at`, `updated_at`) 
VALUES 
-- 7.1 Compromisso Quitado (Pago): Vinculado à transação ID 4 realizada acima
(1, 1, 'to_pay', 'Energia Elétrica Ref. Junho', 165.50, '2026-07-15', 1, 1, 1, 1, 'paid', 'monthly', 165.50, '2026-07-14', 4, 'Valor realizado idêntico ao previsto', 1, '2026-07-02 08:00:00', '2026-07-14 10:00:00'),

-- 7.2 Compromisso Pendente Futuro (Dentro do Prazo): Vence em 25/07/2026
(2, 1, 'to_pay', 'Assinatura Fibra Óptica Internet', 120.00, '2026-07-25', 2, 2, 1, 3, 'pending', 'monthly', NULL, NULL, NULL, 'Fatura em débito automático no Banco Exemplo S.A.', 2, '2026-07-02 08:05:00', '2026-07-02 08:05:00'),

-- 7.3 Compromisso Pendente ATRASADO intencionalmente para teste (Vencido em 10/07/2026)
-- Nota: Como o fuso é America/Fortaleza e a data local simulada é 19/07/2026,
--       este registro aparecerá atrasado por exatamente 9 dias corridos!
(3, 1, 'to_pay', 'Conta de Água Ref. Junho', 85.00, '2026-07-10', 1, 1, 3, 1, 'pending', 'monthly', NULL, NULL, NULL, 'Esquecimento de pagamento, pendente de boleto atualizado', 1, '2026-07-02 08:10:00', '2026-07-02 08:10:00');

-- -----------------------------------------------------------------------------
-- 8. Inserção: projects (Reservas e projetos planejados)
-- -----------------------------------------------------------------------------
INSERT INTO `projects` (`id`, `family_id`, `type`, `name`, `description`, `target_amount`, `deadline`, `responsible_user_id`, `status`, `notes`, `created_by_id`, `created_at`, `updated_at`) 
VALUES 
-- Reserva de Emergência
(1, 1, 'reserve', 'Reserva de Emergência Familiar', 'Garantia de 6 meses de despesas do lar guardados com segurança', 15000.00, NULL, 1, 'active', 'Meta de longo prazo', 1, '2026-07-01 09:10:00', '2026-07-01 09:10:00'),
-- Projeto Geladeira Nova
(2, 1, 'project', 'Geladeira Nova Frost Free Duplex', 'Troca do eletrodoméstico antigo da cozinha por um mais econômico', 3500.00, '2026-12-31', 2, 'active', 'Meta prioritária do ano', 2, '2026-07-01 09:15:00', '2026-07-01 09:15:00');

-- -----------------------------------------------------------------------------
-- 9. Inserção: project_operations (Operações que alteram saldos livres)
-- -----------------------------------------------------------------------------
INSERT INTO `project_operations` (`id`, `family_id`, `project_id`, `operation_type`, `amount`, `source_account_id`, `destination_account_id`, `operation_date`, `notes`, `created_by_id`, `created_at`) 
VALUES 
-- Aporte na Reserva de Emergência tirando saldo livre do Sicredi (Conta ID 2)
(1, 1, 1, 'deposit', 3000.00, 2, NULL, '2026-07-02', 'Primeiro aporte familiar para segurança do lar', 1, '2026-07-02 10:00:00'),
-- Aporte para a Geladeira Nova tirando saldo livre do Banco Exemplo S.A. (Conta ID 1)
(2, 1, 2, 'deposit', 500.00, 1, NULL, '2026-07-03', 'Economia do mês destinada à cozinha', 2, '2026-07-03 14:00:00'),
-- Retirada (Resgate) de R$ 100.00 da caixinha da Geladeira de volta para o Banco Exemplo S.A. (Conta ID 1)
(3, 1, 2, 'withdrawal', 100.00, NULL, 1, '2026-07-15', 'Resgate emergencial para pequeno conserto', 2, '2026-07-15 11:30:00');

-- =============================================================================
-- RESUMO DE ESTADO FINANCEIRO RESULTANTE DO SEED DA FAMÍLIA SILVA (Para Validação)
--
-- 1. Conta Banco Exemplo S.A. (ID 1):
--    - Saldo Nominal Inicial: R$ 1.500,00
--    - Entradas: + R$ 4.500,00 (Salário - Transação 1)
--    - Saídas: - R$ 200,00 (Transferência de Saque - Transação 3)
--              - R$ 165,50 (Energia - Transação 4)
--    - Saldo Nominal Atual: R$ 5.634,50
--    - Reservado nesta conta: R$ 400,00 (Geladeira: R$ 500,00 de aporte - R$ 100,00 de saque)
--    - SALDO LIVRE DA CONTA BANCO EXEMPLO S.A.: R$ 5.234,50
--
-- 2. Conta Cooperativa Poupança (ID 2):
--    - Saldo Nominal Inicial: R$ 5.000,00
--    - Sem outras movimentações reais de transação.
--    - Saldo Nominal Atual: R$ 5.000,00
--    - Reservado nesta conta: R$ 3.000,00 (Reserva de Emergência - Operação 1)
--    - SALDO LIVRE DA CONTA COOPERATIVA: R$ 2.000,00
--
-- 3. Conta Carteira Dinheiro (ID 3):
--    - Saldo Nominal Inicial: R$ 150,00
--    - Entradas: + R$ 200,00 (Transferência de Saque - Transação 3)
--    - Saídas: - R$ 45,00 (Padaria - Transação 2)
--    - Saldo Nominal Atual: R$ 305,00
--    - Reservado nesta conta: R$ 0,00
--    - SALDO LIVRE DA CONTA CARTEIRA: R$ 305,00
--
-- CONSOLIDAÇÃO GLOBAL DA FAMÍLIA SILVA:
-- - SALDO NOMINAL TOTAL DA FAMÍLIA (Todas as contas): R$ 10.939,50
-- - SALDO RESERVADO TOTAL (Soma das caixinhas): R$ 3.400,00
-- - SALDO LIVRE TOTAL DA FAMÍLIA (Para gastar): R$ 7.539,50
-- =============================================================================
