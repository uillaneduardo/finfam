/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';

import { initDb, closeDb, query } from './database/db';
import { validateTestEnvironment } from './utils/dbSecurity';
import { runMigrate } from './database/migrate';
import authRouter from './modules/auth/auth.router';
import accountsRouter from './modules/accounts/accounts.router';
import transactionsRouter from './modules/transactions/transactions.router';
import commitmentsRouter from './modules/commitments/commitments.router';
import projectsRouter from './modules/projects/projects.router';
import contactsRouter from './modules/contacts/contacts.router';
import categoriesRouter from './modules/categories/categories.router';
import usersRouter from './modules/users/users.router';
import { errorHandler } from './middleware/auth';
import { UserRole, UserStatus, ProjectStatus } from '../shared/types';

// Create a decoupled Express application instance for integration testing
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser('fallback-secret-for-signing-cookies-finfam'));

  app.use('/api/auth', authRouter);
  app.use('/api/accounts', accountsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/commitments', commitmentsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/users', usersRouter);

  app.use(errorHandler);
  return app;
}

const app = createTestApp();

describe('FinFam Full System Integration Tests', () => {
  beforeAll(async () => {
    // 1. Validate environment protections
    validateTestEnvironment();

    // 2. Initialize DB Connection (exclusively to the _test database)
    await initDb();

    // 3. Apply pending migrations on the test database
    await runMigrate();

    // 4. Clean up database tables after ensuring the schema is complete
    await query('SET FOREIGN_KEY_CHECKS = 0');
    await query('TRUNCATE TABLE `project_operations`');
    await query('TRUNCATE TABLE `projects`');
    await query('TRUNCATE TABLE `commitments`');
    await query('TRUNCATE TABLE `transactions`');
    await query('TRUNCATE TABLE `accounts`');
    await query('TRUNCATE TABLE `contacts`');
    await query('TRUNCATE TABLE `categories`');
    await query('TRUNCATE TABLE `users`');
    await query('TRUNCATE TABLE `families`');
    await query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    // Close Database Pool connection to prevent test runner hangs
    await closeDb();
  });

  // 1. Migrations aplicadas e pendentes
  describe('1. Migrations Status', () => {
    it('should confirm schema_migrations table exists and migrations are fully applied', async () => {
      const [tables] = await query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'schema_migrations'
      `);
      expect(tables[0].count).toBe(1);

      const [rows] = await query('SELECT `name` FROM `schema_migrations`');
      expect(rows.length).toBeGreaterThan(0);

      const migrationsDir = path.join(process.cwd(), 'migrations');
      if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
        const appliedNames = new Set((rows as any[]).map(r => r.name));
        
        // Assert that all migration files in migrations/ are present in schema_migrations
        files.forEach(file => {
          expect(appliedNames.has(file)).toBe(true);
        });
      }
    });
  });

  // Global variables to hold session cookies and created resources
  let adminCookie: string;
  let memberCookie: string;
  let adminUserId: number;
  let memberUserId: number;
  let family1Id: number;
  let family2AdminCookie: string;
  let family2Id: number;
  let family2AccountId: number;
  let family2UserId: number;

  let account1Id: number;
  let account2Id: number;
  let categoryExpenseId: number;
  let categoryIncomeId: number;
  let project1Id: number;
  let commitment1Id: number;

  // 2. Primeiro Uso
  describe('2. Primeiro Uso Setup', () => {
    it('should require first-use configuration initially', async () => {
      const res = await request(app).get('/api/auth/first-use-check');
      expect(res.status).toBe(200);
      expect(res.body.firstUseRequired).toBe(true);
    });

    it('should successfully bootstrap family and administrator user', async () => {
      const setupPayload = {
        familyName: 'Silva Family',
        adminName: 'Carlos Silva',
        adminUsername: 'carlos_admin',
        adminPassword: 'Password123!'
      };

      const res = await request(app)
        .post('/api/auth/first-use-setup')
        .send(setupPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Carlos Silva');
      expect(res.body.user.username).toBe('carlos_admin');
      expect(res.body.user.role).toBe(UserRole.ADMIN);

      adminUserId = res.body.user.id;
      family1Id = res.body.user.familyId;

      // Extract session cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      adminCookie = cookies[0].split(';')[0];
    });

    it('should no longer require first-use check after being setup', async () => {
      const res = await request(app).get('/api/auth/first-use-check');
      expect(res.status).toBe(200);
      expect(res.body.firstUseRequired).toBe(false);
    });

    it('should reject subsequent first-use-setup calls', async () => {
      const setupPayload = {
        familyName: 'Duplicate Family',
        adminName: 'Fake Admin',
        adminUsername: 'fake_admin',
        adminPassword: 'Password123!'
      };

      const res = await request(app)
        .post('/api/auth/first-use-setup')
        .send(setupPayload);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ALREADY_CONFIGURED');
    });
  });

  // 3. Login e Logout
  describe('3. Autenticação (Login e Logout)', () => {
    it('should fail login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'carlos_admin', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_CREDENTIALS');
    });

    it('should login successfully with correct credentials and refresh cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'carlos_admin', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.username).toBe('carlos_admin');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      adminCookie = cookies[0].split(';')[0];
    });

    it('should fetch session profile under /me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.user.userId).toBe(adminUserId);
      expect(res.body.user.familyId).toBe(family1Id);
      expect(res.body.user.role).toBe(UserRole.ADMIN);
    });
  });

  // 4. Autorização admin/member
  describe('4. Autorização (Admin vs Member)', () => {
    it('should allow admin to create a new member user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Ana Silva',
          username: 'ana_member',
          password: 'Password123!',
          role: 'member'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      memberUserId = res.body.userId;
    });

    it('should login as the member user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ana_member', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const cookies = res.headers['set-cookie'];
      memberCookie = cookies[0].split(';')[0];
    });

    it('should forbid member user from managing users (requireAdmin endpoint)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Cookie', memberCookie)
        .send({
          name: 'Intruder Silva',
          username: 'intruder_silva',
          password: 'Password123!',
          role: 'member'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  // 5. Usuário inativo
  describe('5. Controle de Usuário Inativo', () => {
    it('should allow admin to deactivate a member user', async () => {
      const res = await request(app)
        .post(`/api/users/${memberUserId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: UserStatus.INACTIVE });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should block deactivated user from logging in', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ana_member', password: 'Password123!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_CREDENTIALS');
    });

    it('should reject deactivated user requests even with previously valid cookies', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', memberCookie);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('USER_INACTIVE_OR_DELETED');
    });

    it('should reactivate member user for subsequent tests', async () => {
      const res = await request(app)
        .post(`/api/users/${memberUserId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: UserStatus.ACTIVE });

      expect(res.status).toBe(200);
    });
  });

  // 6. Isolamento entre duas famílias
  describe('6. Isolamento Multi-Inquilino (Families Isolation)', () => {
    beforeAll(async () => {
      // Direct SQL injection to simulate a second pre-existing family
      const [famRes] = await query('INSERT INTO `families` (`name`) VALUES (?)', ['Souza Family']);
      family2Id = famRes.insertId;

      const [userRes] = await query(
        'INSERT INTO `users` (`family_id`, `name`, `username`, `password_hash`, `role`, `status`) VALUES (?, ?, ?, ?, ?, ?)',
        [family2Id, 'Julio Souza', 'julio_admin', 'some_hash', UserRole.ADMIN, UserStatus.ACTIVE]
      );
      family2UserId = userRes.insertId;

      const [accRes] = await query(
        'INSERT INTO `accounts` (`family_id`, `name`, `institution`, `type`, `holder_name`, `initial_balance`, `status`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [family2Id, 'Souza Checking', 'Banco Souza', 'checking', 'Julio Souza', 500, 'active', userRes.insertId]
      );
      family2AccountId = accRes.insertId;

      // Construct a valid signed cookie for family 2
      const appExpress = express();
      appExpress.use(cookieParser('fallback-secret-for-signing-cookies-finfam'));
      appExpress.get('/test-set', (req, res) => {
        res.cookie('sid', JSON.stringify({
          userId: userRes.insertId,
          username: 'julio_admin',
          name: 'Julio Souza',
          familyId: family2Id,
          role: UserRole.ADMIN
        }), { signed: true });
        res.end();
      });

      const cookieRes = await request(appExpress).get('/test-set');
      family2AdminCookie = cookieRes.headers['set-cookie'][0].split(';')[0];
    });

    it('should not expose Family 2 accounts to Family 1', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const accountsList = res.body;
      const intruderAccount = accountsList.find((acc: any) => acc.id === family2AccountId);
      expect(intruderAccount).toBeUndefined();
    });

    it('should reject Family 1 accessing Family 2 resources directly (validateRelatedEntities / checkFamilyOwnership)', async () => {
      // Attempt to register a transaction for Family 1 using Family 2's account
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .send({
          type: 'expense',
          description: 'Intrusive expense',
          amount: 100,
          transaction_date: '2026-07-20',
          source_account_id: family2AccountId,
          responsible_user_id: adminUserId
        });

      // Expect 404 Not Found to hide presence
      expect(res.status).toBe(404);
    });
  });

  // Setup accounts & categories for Silva Family (Family 1)
  describe('Silva Family Core Setup', () => {
    it('should create primary active accounts for Family 1', async () => {
      const [acc1] = await query(
        'INSERT INTO `accounts` (`family_id`, `name`, `institution`, `type`, `holder_name`, `initial_balance`, `status`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [family1Id, 'Conta Corrente', 'Itaú', 'checking', 'Carlos Silva', 1000.00, 'active', adminUserId]
      );
      account1Id = acc1.insertId;

      const [acc2] = await query(
        'INSERT INTO `accounts` (`family_id`, `name`, `institution`, `type`, `holder_name`, `initial_balance`, `status`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [family1Id, 'Poupança', 'Caixa', 'savings', 'Carlos Silva', 500.00, 'active', adminUserId]
      );
      account2Id = acc2.insertId;

      // Get Default categories inserted by setup
      const [cats] = await query('SELECT `id`, `type` FROM `categories` WHERE `family_id` = ?', [family1Id]);
      categoryExpenseId = cats.find((c: any) => c.type === 'expense')?.id;
      categoryIncomeId = cats.find((c: any) => c.type === 'income')?.id;

      expect(account1Id).toBeDefined();
      expect(account2Id).toBeDefined();
    });
  });

  // 7. Lançamentos (entrada, saída e transferência) + 9. Cálculo de saldo nominal
  describe('7 & 9. Lançamentos e Saldos Nominais', () => {
    it('should successfully post an income transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .send({
          type: 'income',
          description: 'Salário Quinzenal',
          amount: 500.00,
          transaction_date: '2026-07-20',
          destination_account_id: account1Id,
          responsible_user_id: adminUserId,
          category_id: categoryIncomeId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should successfully post an expense transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .send({
          type: 'expense',
          description: 'Supermercado',
          amount: 200.00,
          transaction_date: '2026-07-20',
          source_account_id: account1Id,
          responsible_user_id: adminUserId,
          category_id: categoryExpenseId
        });

      expect(res.status).toBe(201);
    });

    it('should successfully post a transfer transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .send({
          type: 'transfer',
          description: 'Reserva emergencial',
          amount: 150.00,
          transaction_date: '2026-07-20',
          source_account_id: account1Id,
          destination_account_id: account2Id,
          responsible_user_id: adminUserId
        });

      expect(res.status).toBe(201);
    });

    it('should calculate account nominal balances correctly', async () => {
      // Conta Corrente (Initial: 1000)
      // + Income: 500
      // - Expense: 200
      // - Transfer out: 150
      // Nominal balance should be: 1000 + 500 - 200 - 150 = 1150.00
      
      // Poupança (Initial: 500)
      // + Transfer in: 150
      // Nominal balance should be: 500 + 150 = 650.00

      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const accounts = res.body;

      const cc = accounts.find((a: any) => a.id === account1Id);
      const poupanca = accounts.find((a: any) => a.id === account2Id);

      expect(cc.nominal_balance).toBe(1150.00);
      expect(cc.free_balance).toBe(1150.00);

      expect(poupanca.nominal_balance).toBe(650.00);
      expect(poupanca.free_balance).toBe(650.00);
    });
  });

  // 8. Idempotência
  describe('8. Estratégia de Idempotência', () => {
    it('should process a transaction with an idempotency key normally on first submission (201)', async () => {
      const key = 'test-idemp-key-new-123-unique-uuid-36chars';
      const payload = {
        type: 'expense',
        description: 'Almoço Executivo',
        amount: 35.00,
        transaction_date: '2026-07-20',
        source_account_id: account1Id,
        responsible_user_id: adminUserId
      };
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .set('Idempotency-Key', key)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.replayed).toBe(false);
      expect(res.body.transactionId).toBeDefined();
    });

    it('should return 200, replayed: true, same transactionId on duplicate submission with same key', async () => {
      const key = 'test-idemp-key-new-123-unique-uuid-36chars';
      const payload = {
        type: 'expense',
        description: 'Almoço Executivo',
        amount: 35.00,
        transaction_date: '2026-07-20',
        source_account_id: account1Id,
        responsible_user_id: adminUserId
      };

      // Get first created ID
      const [firstTx] = await query('SELECT `id` FROM `transactions` WHERE `idempotency_key` = ?', [key]);
      const createdId = firstTx[0].id;

      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .set('Idempotency-Key', key)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.replayed).toBe(true);
      expect(res.body.transactionId).toBe(createdId);

      // Verify only 1 row exists
      const [count] = await query('SELECT COUNT(*) as count FROM `transactions` WHERE `idempotency_key` = ?', [key]);
      expect(count[0].count).toBe(1);
    });

    it('should reject same key with different payload with 409 Conflict', async () => {
      const key = 'test-idemp-key-new-123-unique-uuid-36chars';
      const payload = {
        type: 'expense',
        description: 'Almoço Executivo',
        amount: 55.00, // changed amount!
        transaction_date: '2026-07-20',
        source_account_id: account1Id,
        responsible_user_id: adminUserId
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .set('Idempotency-Key', key)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('IDEMPOTENCY_KEY_REUSED');
      expect(res.body.message).toContain('Esta chave de segurança já foi utilizada em uma movimentação diferente.');
    });

    it('should reject key that is too long (exceeds 100 max) with 400 Validation Error', async () => {
      const longKey = 'a'.repeat(101);
      const payload = {
        type: 'expense',
        description: 'Almoço Executivo',
        amount: 35.00,
        transaction_date: '2026-07-20',
        source_account_id: account1Id,
        responsible_user_id: adminUserId
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .set('Idempotency-Key', longKey)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should allow identical keys in different families (multi-tenant safety)', async () => {
      const sharedKey = 'shared-idemp-key-between-families-uuid-xyz';
      
      // Post for Family 1
      const resFam1 = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .set('Idempotency-Key', sharedKey)
        .send({
          type: 'expense',
          description: 'Café da manhã especial',
          amount: 25.50,
          transaction_date: '2026-07-20',
          source_account_id: account1Id,
          responsible_user_id: adminUserId
        });
      expect(resFam1.status).toBe(201);

      // Post for Family 2 with identical key and payload (should be allowed because unique index is on family_id + idempotency_key)
      const resFam2 = await request(app)
        .post('/api/transactions')
        .set('Cookie', family2AdminCookie)
        .set('Idempotency-Key', sharedKey)
        .send({
          type: 'expense',
          description: 'Café da Souza',
          amount: 25.50,
          transaction_date: '2026-07-20',
          source_account_id: family2AccountId,
          responsible_user_id: family2UserId
        });

      expect(resFam2.status).toBe(201);
      expect(resFam2.body.success).toBe(true);
      expect(resFam2.body.replayed).toBe(false);
      expect(resFam2.body.transactionId).not.toBe(resFam1.body.transactionId);
    });

    it('should allow identical transactions with different keys', async () => {
      const payload = {
        type: 'expense',
        description: 'Lanche da Tarde',
        amount: 15.00,
        transaction_date: '2026-07-20',
        source_account_id: account1Id,
        responsible_user_id: adminUserId
      };

      const res1 = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .set('Idempotency-Key', 'key-lanche-aaa-36-chars-unique-uuid')
        .send(payload);
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .set('Idempotency-Key', 'key-lanche-bbb-36-chars-unique-uuid')
        .send(payload);
      expect(res2.status).toBe(201);

      expect(res1.body.transactionId).not.toBe(res2.body.transactionId);
    });

    it('should process transaction normally without an idempotency key', async () => {
      const payload = {
        type: 'expense',
        description: 'Lanche sem chave',
        amount: 12.00,
        transaction_date: '2026-07-20',
        source_account_id: account1Id,
        responsible_user_id: adminUserId
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.replayed).toBe(false);
    });

    it('should handle simultaneous concurrent duplicate requests gracefully, creating only 1 transaction', async () => {
      const concurrentKey = 'concurrent-test-key-999-unique-uuid-36chars';
      const concurrentPayload = {
        type: 'expense',
        description: 'Cinema da Família',
        amount: 60.00,
        transaction_date: '2026-07-20',
        source_account_id: account1Id,
        responsible_user_id: adminUserId
      };

      const [resC1, resC2] = await Promise.all([
        request(app)
          .post('/api/transactions')
          .set('Cookie', adminCookie)
          .set('Idempotency-Key', concurrentKey)
          .send(concurrentPayload),
        request(app)
          .post('/api/transactions')
          .set('Cookie', adminCookie)
          .set('Idempotency-Key', concurrentKey)
          .send(concurrentPayload)
      ]);

      expect([200, 201]).toContain(resC1.status);
      expect([200, 201]).toContain(resC2.status);
      expect(resC1.body.transactionId).toBe(resC2.body.transactionId);

      const [countC] = await query('SELECT COUNT(*) as count FROM `transactions` WHERE `idempotency_key` = ?', [concurrentKey]);
      expect(countC[0].count).toBe(1);
    });

    afterAll(async () => {
      // 1. Delete all transactions created during Section 8
      await query(
        "DELETE FROM `transactions` WHERE `family_id` = ? AND `description` IN (?, ?, ?, ?, ?)",
        [
          family1Id,
          'Almoço Executivo',
          'Café da manhã especial',
          'Lanche da Tarde',
          'Lanche sem chave',
          'Cinema da Família'
        ]
      );
      // Also delete Family 2's test transaction to be pristine
      await query(
        "DELETE FROM `transactions` WHERE `family_id` = ? AND `description` = ?",
        [family2Id, 'Café da Souza']
      );

      // 2. Post exactly the two 'Café da manhã especial' (25.50 each) transactions expected by subsequent tests
      await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .set('Idempotency-Key', 'test-idemp-key-123')
        .send({
          type: 'expense',
          description: 'Café da manhã especial',
          amount: 25.50,
          transaction_date: '2026-07-20',
          source_account_id: account1Id,
          responsible_user_id: adminUserId
        });

      await request(app)
        .post('/api/transactions')
        .set('Cookie', adminCookie)
        .send({
          type: 'expense',
          description: 'Café da manhã especial',
          amount: 25.50,
          transaction_date: '2026-07-20',
          source_account_id: account1Id,
          responsible_user_id: adminUserId
        });
    });
  });

  // 10, 11, 12, 13, 14. Reservas/Caixinhas (Aporte, Resgate, Saldos por conta)
  describe('10 - 14. Projetos / Caixinhas (Aportes e Resgates)', () => {
    beforeAll(async () => {
      const [proj] = await query(
        'INSERT INTO `projects` (`family_id`, `type`, `name`, `description`, `target_amount`, `responsible_user_id`, `status`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [family1Id, 'project', 'Viagem de Férias', 'Reserva para viagem', 5000.00, adminUserId, ProjectStatus.ACTIVE, adminUserId]
      );
      project1Id = proj.insertId;
    });

    it('should perform a successful project deposit (aporte)', async () => {
      // Deposit 300.00 from Conta Corrente (Nominal: 1150.00 - 25.50 - 25.50 = 1099.00)
      const res = await request(app)
        .post(`/api/projects/${project1Id}/deposit`)
        .set('Cookie', adminCookie)
        .send({
          amount: 300.00,
          source_account_id: account1Id,
          operation_date: '2026-07-20',
          notes: 'Aporte inicial'
        });

      if (res.status !== 200) {
        console.log('DEPOSIT FAILURE BODY:', res.body);
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should verify reserved balance and free balance updates', async () => {
      // Account 1: Nominal: 1099.00, Reserved: 300.00, Free: 799.00
      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', adminCookie);

      const cc = res.body.find((a: any) => a.id === account1Id);
      expect(cc.nominal_balance).toBe(1099.00);
      expect(cc.reserved_balance).toBe(300.00);
      expect(cc.free_balance).toBe(799.00);
    });

    it('should reject deposit when amount exceeds free balance (aporte sem saldo livre)', async () => {
      const res = await request(app)
        .post(`/api/projects/${project1Id}/deposit`)
        .set('Cookie', adminCookie)
        .send({
          amount: 850.00, // Exceeds CC free balance (799.00)
          source_account_id: account1Id,
          operation_date: '2026-07-20'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INSUFFICIENT_FREE_BALANCE');
    });

    it('should check individual account specific reserved balances (saldo reservado por conta)', async () => {
      // Account 1 has 300.00 reserved. Account 2 has 0.00 reserved.
      // Attempting to withdraw 100.00 from Project 1 to Account 2 should be rejected,
      // because Project 1 does not have any reserved balance on Account 2!
      const res = await request(app)
        .post(`/api/projects/${project1Id}/withdraw`)
        .set('Cookie', adminCookie)
        .send({
          amount: 100.00,
          destination_account_id: account2Id, // Poupança
          operation_date: '2026-07-20'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INSUFFICIENT_RESERVED_BALANCE');
    });

    it('should perform a successful project withdrawal (resgate) on the correct account', async () => {
      const res = await request(app)
        .post(`/api/projects/${project1Id}/withdraw`)
        .set('Cookie', adminCookie)
        .send({
          amount: 100.00,
          destination_account_id: account1Id, // Conta Corrente (which holds the 300.00 reserve)
          operation_date: '2026-07-20'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify CC: Nominal: 1099.00, Reserved: 200.00, Free: 899.00
      const accRes = await request(app)
        .get('/api/accounts')
        .set('Cookie', adminCookie);

      const cc = accRes.body.find((a: any) => a.id === account1Id);
      expect(cc.reserved_balance).toBe(200.00);
      expect(cc.free_balance).toBe(899.00);
    });

    it('should reject withdrawal exceeding currently reserved amount (resgate sem saldo reservado)', async () => {
      const res = await request(app)
        .post(`/api/projects/${project1Id}/withdraw`)
        .set('Cookie', adminCookie)
        .send({
          amount: 250.00, // Exceeds CC remaining reserve (200.00)
          destination_account_id: account1Id,
          operation_date: '2026-07-20'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INSUFFICIENT_RESERVED_BALANCE');
    });
  });

  // 15, 16, 17. Compromissos e Quitação
  describe('15 - 17. Compromissos (Criação, Atraso, Quitação e Concorrência)', () => {
    it('should create a commitment and dynamically calculate if it is overdue (atraso)', async () => {
      // Create a commitment with a due date in the past to trigger overdue status
      const pastDate = '2025-01-15';
      const res = await request(app)
        .post('/api/commitments')
        .set('Cookie', adminCookie)
        .send({
          type: 'to_pay',
          description: 'Conta de Energia Elétrica',
          estimated_amount: 150.00,
          due_date: pastDate,
          responsible_user_id: adminUserId,
          estimated_account_id: account1Id
        });

      expect(res.status).toBe(201);
      expect(res.body.commitmentId).toBeDefined();
      commitment1Id = res.body.commitmentId;

      // Check overdue calculations on list
      const listRes = await request(app)
        .get('/api/commitments')
        .set('Cookie', adminCookie);

      const target = listRes.body.find((c: any) => c.id === commitment1Id);
      expect(target.days_overdue).toBeGreaterThan(0);
      expect(target.status_label).toContain('Atrasado');
    });

    it('should prevent simultaneous payout requests (duas quitações simultâneas) from generating duplicate transactions', async () => {
      // Trigger two simultaneous pay requests on the same pending commitment
      const p1 = request(app)
        .post(`/api/commitments/${commitment1Id}/pay`)
        .set('Cookie', adminCookie)
        .send({
          actual_amount: 150.00,
          actual_date: '2026-07-20',
          account_id: account1Id
        });

      const p2 = request(app)
        .post(`/api/commitments/${commitment1Id}/pay`)
        .set('Cookie', adminCookie)
        .send({
          actual_amount: 150.00,
          actual_date: '2026-07-20',
          account_id: account1Id
        });

      const [res1, res2] = await Promise.all([p1, p2]);

      // Assert that exactly one request succeeded and one failed with concurrency conflict
      const successRes = res1.status === 200 ? res1 : res2;
      const failedRes = res1.status !== 200 ? res1 : res2;

      expect(successRes.status).toBe(200);
      expect(successRes.body.success).toBe(true);

      expect([400, 409]).toContain(failedRes.status);
      expect(['ALREADY_PAID', 'CONCURRENCY_ERROR']).toContain(failedRes.body.error);

      // Double-check: confirm that only ONE actual transaction was inserted linked to this commitment
      const [txRows] = await query(
        'SELECT COUNT(*) as count FROM `transactions` WHERE `description` = ?',
        ['Quitação: Conta de Energia Elétrica']
      );
      expect(txRows[0].count).toBe(1);

      // Verify that the commitment status is now PAID
      const [commitmentRow] = await query('SELECT `status` FROM `commitments` WHERE `id` = ?', [commitment1Id]);
      expect(commitmentRow[0].status).toBe('paid');
    });

    it('should reject payout requests for already paid commitments (quitação de compromisso já liquidado)', async () => {
      const res = await request(app)
        .post(`/api/commitments/${commitment1Id}/pay`)
        .set('Cookie', adminCookie)
        .send({
          actual_amount: 150.00,
          actual_date: '2026-07-20',
          account_id: account1Id
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ALREADY_PAID');
    });
  });
});
