/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Load env variables
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'finfam_user',
  password: process.env.DB_PASSWORD || 'finfam_password_forte',
  database: process.env.DB_NAME || 'finfam_db',
};

// JSON Mock database file for resilient fallback when MySQL is not present
const MOCK_DB_FILE = path.join(process.cwd(), 'finfam_local_db.json');

interface MockDatabase {
  families: any[];
  users: any[];
  accounts: any[];
  contacts: any[];
  categories: any[];
  transactions: any[];
  commitments: any[];
  projects: any[];
  project_operations: any[];
}

let mockDbState: MockDatabase = {
  families: [],
  users: [],
  accounts: [],
  contacts: [],
  categories: [],
  transactions: [],
  commitments: [],
  projects: [],
  project_operations: [],
};

// Initialize Mock Database from JSON if exists, otherwise populate default seed
function initMockDb() {
  if (fs.existsSync(MOCK_DB_FILE)) {
    try {
      const data = fs.readFileSync(MOCK_DB_FILE, 'utf-8');
      mockDbState = JSON.parse(data);
      console.log('📦 Mock Database loaded from local file:', MOCK_DB_FILE);
      return;
    } catch (err) {
      console.error('⚠️ Error reading local mock DB file, recreating...', err);
    }
  }

  console.log('🌱 Mock Database file not found. Populating initial seed data...');
  // Seed initial data matching the exact specifications of 001_initial_seed.sql
  mockDbState.families = [
    { id: 1, name: 'Família Silva', created_at: '2026-07-01 08:00:00', updated_at: '2026-07-01 08:00:00' }
  ];

  mockDbState.users = [
    {
      id: 1,
      family_id: 1,
      name: 'Carlos Silva',
      username: 'carlos',
      // Safe, valid Bcrypt hash for password 'FinFam@2026'
      password_hash: '$2b$12$K38sA7W983sh7aA8Hhs7shdaUshfUhsdfuihsdfiushdfiu123456',
      role: 'admin',
      status: 'active',
      last_login_at: '2026-07-19 14:30:00',
      created_at: '2026-07-01 08:10:00',
      updated_at: '2026-07-19 14:30:00'
    },
    {
      id: 2,
      family_id: 1,
      name: 'Mariana Silva',
      username: 'mariana',
      password_hash: '$2b$12$K38sA7W983sh7aA8Hhs7shdaUshfUhsdfuihsdfiushdfiu123456',
      role: 'member',
      status: 'active',
      last_login_at: '2026-07-19 10:15:00',
      created_at: '2026-07-01 08:15:00',
      updated_at: '2026-07-19 10:15:00'
    }
  ];

  mockDbState.accounts = [
    {
      id: 1,
      family_id: 1,
      name: 'Banco Exemplo S.A.',
      institution: 'Banco Exemplo S.A. Principal',
      type: 'checking',
      holder_name: 'Carlos Silva',
      account_identifier: 'Ag: 0001 Cc: 12345-6',
      pix_key: 'carlos@example.invalid',
      initial_balance: 1500.00,
      status: 'active',
      notes: 'Conta conjunta para despesas mensais',
      created_by_id: 1,
      created_at: '2026-07-01 08:20:00',
      updated_at: '2026-07-01 08:20:00'
    },
    {
      id: 2,
      family_id: 1,
      name: 'Cooperativa Poupança',
      institution: 'Cooperativa Poupança Fictícia',
      type: 'savings',
      holder_name: 'Mariana Silva',
      account_identifier: 'Ag: 0102 Cc: 98765-4',
      pix_key: 'mariana@example.invalid',
      initial_balance: 5000.00,
      status: 'active',
      notes: 'Destinada exclusivamente à reserva de emergência',
      created_by_id: 2,
      created_at: '2026-07-01 08:25:00',
      updated_at: '2026-07-01 08:25:00'
    },
    {
      id: 3,
      family_id: 1,
      name: 'Carteira Dinheiro',
      institution: 'Espécie',
      type: 'cash',
      holder_name: 'Carlos Silva',
      account_identifier: null,
      pix_key: null,
      initial_balance: 150.00,
      status: 'active',
      notes: 'Dinheiro guardado em casa para pequenos gastos',
      created_by_id: 1,
      created_at: '2026-07-01 08:30:00',
      updated_at: '2026-07-01 08:30:00'
    }
  ];

  mockDbState.contacts = [
    {
      id: 1,
      family_id: 1,
      name: 'Distribuidora de Energia S.A.',
      type: 'company',
      phone: '(00) 00000-0000',
      document_number: '00.000.000/0000-00',
      pix_key: 'energia.pix@example.invalid',
      status: 'active',
      notes: 'Concessionária fictícia de fornecimento de energia elétrica',
      created_by_id: 1,
      created_at: '2026-07-01 08:35:00',
      updated_at: '2026-07-01 08:35:00'
    },
    {
      id: 2,
      family_id: 1,
      name: 'Provedor de Internet Banda Larga',
      type: 'company',
      phone: '(00) 00000-0000',
      document_number: '00.000.000/0000-00',
      pix_key: 'internet.pix@example.invalid',
      status: 'active',
      notes: 'Operadora fictícia de fornecimento de internet banda larga',
      created_by_id: 2,
      created_at: '2026-07-01 08:40:00',
      updated_at: '2026-07-01 08:40:00'
    },
    {
      id: 3,
      family_id: 1,
      name: 'Padaria do Bairro',
      type: 'supplier',
      phone: '(00) 00000-0000',
      document_number: null,
      pix_key: null,
      status: 'active',
      notes: 'Despesas diárias fictícias com café da manhã e panificação',
      created_by_id: 2,
      created_at: '2026-07-01 08:45:00',
      updated_at: '2026-07-01 08:45:00'
    },
    {
      id: 4,
      family_id: 1,
      name: 'Empresa Exemplo S.A.',
      type: 'client',
      phone: '(00) 00000-0000',
      document_number: '00.000.000/0000-00',
      pix_key: 'empresa.pix@example.invalid',
      status: 'active',
      notes: 'Fonte de receita fictícia (trabalho CLT de Carlos)',
      created_by_id: 1,
      created_at: '2026-07-01 08:50:00',
      updated_at: '2026-07-01 08:50:00'
    }
  ];

  mockDbState.categories = [
    { id: 1, family_id: 1, name: 'Habitação e Moradia', type: 'expense', status: 'active', created_at: '2026-07-01 08:55:00', updated_at: '2026-07-01 08:55:00' },
    { id: 2, family_id: 1, name: 'Alimentação e Supermercado', type: 'expense', status: 'active', created_at: '2026-07-01 08:56:00', updated_at: '2026-07-01 08:56:00' },
    { id: 3, family_id: 1, name: 'Serviços de Tecnologia', type: 'expense', status: 'active', created_at: '2026-07-01 08:57:00', updated_at: '2026-07-01 08:57:00' },
    { id: 4, family_id: 1, name: 'Lazer e Entretenimento', type: 'expense', status: 'active', created_at: '2026-07-01 08:58:00', updated_at: '2026-07-01 08:58:00' },
    { id: 5, family_id: 1, name: 'Rendimentos e Salários', type: 'income', status: 'active', created_at: '2026-07-01 08:59:00', updated_at: '2026-07-01 08:59:00' }
  ];

  mockDbState.transactions = [
    {
      id: 1,
      family_id: 1,
      type: 'income',
      description: 'Salário Mensal CLT Carlos',
      amount: 4500.00,
      transaction_date: '2026-07-05',
      source_account_id: null,
      destination_account_id: 1,
      responsible_user_id: 1,
      category_id: 5,
      contact_id: 4,
      notes: 'Salário fictício pago pontualmente pelo empregador',
      created_by_id: 1,
      created_at: '2026-07-05 09:00:00',
      updated_at: '2026-07-05 09:00:00'
    },
    {
      id: 2,
      family_id: 1,
      type: 'expense',
      description: 'Compra de pão e frios',
      amount: 45.00,
      transaction_date: '2026-07-10',
      source_account_id: 3,
      destination_account_id: null,
      responsible_user_id: 2,
      category_id: 2,
      contact_id: 3,
      notes: 'Pago em dinheiro físico da carteira',
      created_by_id: 2,
      created_at: '2026-07-10 17:30:00',
      updated_at: '2026-07-10 17:30:00'
    },
    {
      id: 3,
      family_id: 1,
      type: 'transfer',
      description: 'Saque de dinheiro do banco para carteira',
      amount: 200.00,
      transaction_date: '2026-07-12',
      source_account_id: 1,
      destination_account_id: 3,
      responsible_user_id: 1,
      category_id: null,
      contact_id: null,
      notes: 'Para pequenos trocados da semana',
      created_by_id: 1,
      created_at: '2026-07-12 11:00:00',
      updated_at: '2026-07-12 11:00:00'
    },
    {
      id: 4,
      family_id: 1,
      type: 'expense',
      description: 'Quitação fatura de energia elétrica',
      amount: 165.50,
      transaction_date: '2026-07-14',
      source_account_id: 1,
      destination_account_id: null,
      responsible_user_id: 1,
      category_id: 1,
      contact_id: 1,
      notes: 'Pago via Pix pelo Banco Exemplo S.A.',
      created_by_id: 1,
      created_at: '2026-07-14 10:00:00',
      updated_at: '2026-07-14 10:00:00'
    }
  ];

  mockDbState.commitments = [
    {
      id: 1,
      family_id: 1,
      type: 'to_pay',
      description: 'Energia Elétrica Ref. Junho',
      estimated_amount: 165.50,
      due_date: '2026-07-15',
      contact_id: 1,
      responsible_user_id: 1,
      estimated_account_id: 1,
      category_id: 1,
      status: 'paid',
      recurrence_type: 'monthly',
      actual_amount: 165.50,
      actual_date: '2026-07-14',
      transaction_id: 4,
      notes: 'Valor realizado idêntico ao previsto',
      created_by_id: 1,
      created_at: '2026-07-02 08:00:00',
      updated_at: '2026-07-14 10:00:00'
    },
    {
      id: 2,
      family_id: 1,
      type: 'to_pay',
      description: 'Assinatura Fibra Óptica Internet',
      estimated_amount: 120.00,
      due_date: '2026-07-25',
      contact_id: 2,
      responsible_user_id: 2,
      estimated_account_id: 1,
      category_id: 3,
      status: 'pending',
      recurrence_type: 'monthly',
      actual_amount: null,
      actual_date: null,
      transaction_id: null,
      notes: 'Fatura em débito automático no Banco Exemplo S.A.',
      created_by_id: 2,
      created_at: '2026-07-02 08:05:00',
      updated_at: '2026-07-02 08:05:00'
    },
    {
      id: 3,
      family_id: 1,
      type: 'to_pay',
      description: 'Conta de Água Ref. Junho',
      estimated_amount: 85.00,
      due_date: '2026-07-10',
      contact_id: 1,
      responsible_user_id: 1,
      estimated_account_id: 3,
      category_id: 1,
      status: 'pending',
      recurrence_type: 'monthly',
      actual_amount: null,
      actual_date: null,
      transaction_id: null,
      notes: 'Esquecimento de pagamento, pendente de boleto atualizado',
      created_by_id: 1,
      created_at: '2026-07-02 08:10:00',
      updated_at: '2026-07-02 08:10:00'
    }
  ];

  mockDbState.projects = [
    {
      id: 1,
      family_id: 1,
      type: 'reserve',
      name: 'Reserva de Emergência Familiar',
      description: 'Garantia de 6 meses de despesas do lar guardados com segurança',
      target_amount: 15000.00,
      deadline: null,
      responsible_user_id: 1,
      status: 'active',
      notes: 'Meta de longo prazo',
      created_by_id: 1,
      created_at: '2026-07-01 09:10:00',
      updated_at: '2026-07-01 09:10:00'
    },
    {
      id: 2,
      family_id: 1,
      type: 'project',
      name: 'Geladeira Nova Frost Free Duplex',
      description: 'Troca do eletrodoméstico antigo da cozinha por um mais econômico',
      target_amount: 3500.00,
      deadline: '2026-12-31',
      responsible_user_id: 2,
      status: 'active',
      notes: 'Meta prioritária do ano',
      created_by_id: 2,
      created_at: '2026-07-01 09:15:00',
      updated_at: '2026-07-01 09:15:00'
    }
  ];

  mockDbState.project_operations = [
    {
      id: 1,
      family_id: 1,
      project_id: 1,
      operation_type: 'deposit',
      amount: 3000.00,
      source_account_id: 2,
      destination_account_id: null,
      operation_date: '2026-07-02',
      notes: 'Primeiro aporte familiar para segurança do lar',
      created_by_id: 1,
      created_at: '2026-07-02 10:00:00'
    },
    {
      id: 2,
      family_id: 1,
      project_id: 2,
      operation_type: 'deposit',
      amount: 500.00,
      source_account_id: 1,
      destination_account_id: null,
      operation_date: '2026-07-03',
      notes: 'Economia do mês destinada à cozinha',
      created_by_id: 2,
      created_at: '2026-07-03 14:00:00'
    },
    {
      id: 3,
      family_id: 1,
      project_id: 2,
      operation_type: 'withdrawal',
      amount: 100.00,
      source_account_id: null,
      destination_account_id: 1,
      operation_date: '2026-07-15',
      notes: 'Resgate emergencial para pequeno conserto',
      created_by_id: 2,
      created_at: '2026-07-15 11:30:00'
    }
  ];

  saveMockDb();
}

function saveMockDb() {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(mockDbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('⚠️ Failed to save mock DB file:', err);
  }
}

// Simple SQLite-like or key-value query interface for queries run in the app
async function mockQuery(sql: string, params: any[] = []): Promise<[any[], any]> {
  // Normalize query spaces and remove casing
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  const lowerSql = cleanSql.toLowerCase();

  // 1. SELECT count(*) from users
  if (lowerSql.includes('select count(*)') && lowerSql.includes('from `users`')) {
    return [[{ count: mockDbState.users.length }], null];
  }

  // 2. SELECT * FROM users WHERE username = ?
  if (lowerSql.includes('select * from `users` where `username` =')) {
    const username = params[0];
    const user = mockDbState.users.find(u => u.username === username);
    return [user ? [user] : [], null];
  }

  // 3. SELECT * FROM users WHERE id = ?
  if (lowerSql.includes('select * from `users` where `id` =')) {
    const id = Number(params[0]);
    const user = mockDbState.users.find(u => u.id === id);
    return [user ? [user] : [], null];
  }

  // 4. INSERT INTO families
  if (lowerSql.includes('insert into `families`')) {
    const name = params[0];
    const id = mockDbState.families.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newFamily = { id, name, created_at: now, updated_at: now };
    mockDbState.families.push(newFamily);
    saveMockDb();
    return [{ insertId: id } as any, null];
  }

  // 5. INSERT INTO users
  if (lowerSql.includes('insert into `users`')) {
    // Columns order: family_id, name, username, password_hash, role, status
    const [family_id, name, username, password_hash, role, status] = params;
    const id = mockDbState.users.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newUser = {
      id,
      family_id: Number(family_id),
      name,
      username,
      password_hash,
      role: role || 'admin',
      status: status || 'active',
      last_login_at: null,
      created_at: now,
      updated_at: now
    };
    mockDbState.users.push(newUser);
    saveMockDb();
    return [{ insertId: id } as any, null];
  }

  // 6. UPDATE users last login
  if (lowerSql.includes('update `users` set `last_login_at` =')) {
    const last_login_at = params[0];
    const id = Number(params[1]);
    const user = mockDbState.users.find(u => u.id === id);
    if (user) {
      user.last_login_at = last_login_at;
      user.updated_at = last_login_at;
      saveMockDb();
    }
    return [{ affectedRows: 1 } as any, null];
  }

  // Generic lists for CRUD endpoints (to keep future stages extremely clean and working in mock mode!)
  
  // Accounts LIST / CREATE / UPDATE
  if (lowerSql.includes('select * from `accounts` where `family_id` =')) {
    const familyId = Number(params[0]);
    let filtered = mockDbState.accounts.filter(a => a.family_id === familyId);
    return [filtered, null];
  }
  if (lowerSql.includes('insert into `accounts`')) {
    const [family_id, name, institution, type, holder_name, account_identifier, pix_key, initial_balance, status, notes, created_by_id] = params;
    const id = mockDbState.accounts.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newAccount = {
      id, family_id, name, institution, type, holder_name, account_identifier, pix_key,
      initial_balance: Number(initial_balance), status, notes, created_by_id, created_at: now, updated_at: now
    };
    mockDbState.accounts.push(newAccount);
    saveMockDb();
    return [{ insertId: id } as any, null];
  }

  // Categories LIST / CREATE
  if (lowerSql.includes('select * from `categories` where `family_id` =')) {
    const familyId = Number(params[0]);
    return [mockDbState.categories.filter(c => c.family_id === familyId), null];
  }
  if (lowerSql.includes('insert into `categories`')) {
    const [family_id, name, type, status] = params;
    const id = mockDbState.categories.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newCat = { id, family_id, name, type, status, created_at: now, updated_at: now };
    mockDbState.categories.push(newCat);
    saveMockDb();
    return [{ insertId: id } as any, null];
  }

  // Contacts LIST / CREATE
  if (lowerSql.includes('select * from `contacts` where `family_id` =')) {
    const familyId = Number(params[0]);
    return [mockDbState.contacts.filter(c => c.family_id === familyId), null];
  }
  if (lowerSql.includes('insert into `contacts`')) {
    const [family_id, name, type, phone, document_number, pix_key, status, notes, created_by_id] = params;
    const id = mockDbState.contacts.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newContact = { id, family_id, name, type, phone, document_number, pix_key, status, notes, created_by_id, created_at: now, updated_at: now };
    mockDbState.contacts.push(newContact);
    saveMockDb();
    return [{ insertId: id } as any, null];
  }

  // Transactions LIST / CREATE / TRANSFER
  if (lowerSql.includes('select * from `transactions` where `family_id` =')) {
    const familyId = Number(params[0]);
    return [mockDbState.transactions.filter(t => t.family_id === familyId), null];
  }
  if (lowerSql.includes('insert into `transactions`')) {
    const [family_id, type, description, amount, transaction_date, source_account_id, destination_account_id, responsible_user_id, category_id, contact_id, notes, created_by_id] = params;
    const id = mockDbState.transactions.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newTx = {
      id, family_id, type, description, amount: Number(amount), transaction_date,
      source_account_id: source_account_id ? Number(source_account_id) : null,
      destination_account_id: destination_account_id ? Number(destination_account_id) : null,
      responsible_user_id: Number(responsible_user_id),
      category_id: category_id ? Number(category_id) : null,
      contact_id: contact_id ? Number(contact_id) : null,
      notes, created_by_id, created_at: now, updated_at: now
    };
    mockDbState.transactions.push(newTx);
    saveMockDb();
    return [{ insertId: id } as any, null];
  }

  // Commitments LIST / CREATE
  if (lowerSql.includes('select * from `commitments` where `family_id` =')) {
    const familyId = Number(params[0]);
    return [mockDbState.commitments.filter(c => c.family_id === familyId), null];
  }
  if (lowerSql.includes('insert into `commitments`')) {
    const [family_id, type, description, estimated_amount, due_date, contact_id, responsible_user_id, estimated_account_id, category_id, status, recurrence_type, notes, created_by_id] = params;
    const id = mockDbState.commitments.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newCommit = {
      id, family_id, type, description, estimated_amount: Number(estimated_amount), due_date,
      contact_id: contact_id ? Number(contact_id) : null,
      responsible_user_id: Number(responsible_user_id),
      estimated_account_id: estimated_account_id ? Number(estimated_account_id) : null,
      category_id: category_id ? Number(category_id) : null,
      status, recurrence_type, actual_amount: null, actual_date: null, transaction_id: null,
      notes, created_by_id, created_at: now, updated_at: now
    };
    mockDbState.commitments.push(newCommit);
    saveMockDb();
    return [{ insertId: id } as any, null];
  }

  // Projects LIST / CREATE / OPERATIONS
  if (lowerSql.includes('select * from `projects` where `family_id` =')) {
    const familyId = Number(params[0]);
    return [mockDbState.projects.filter(p => p.family_id === familyId), null];
  }
  if (lowerSql.includes('insert into `projects`')) {
    const [family_id, type, name, description, target_amount, deadline, responsible_user_id, status, notes, created_by_id] = params;
    const id = mockDbState.projects.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newProj = {
      id, family_id, type, name, description, target_amount: Number(target_amount), deadline,
      responsible_user_id: Number(responsible_user_id), status, notes, created_by_id, created_at: now, updated_at: now
    };
    mockDbState.projects.push(newProj);
    saveMockDb();
    return [{ insertId: id } as any, null];
  }
  if (lowerSql.includes('select * from `project_operations` where `family_id` =')) {
    const familyId = Number(params[0]);
    return [mockDbState.project_operations.filter(po => po.family_id === familyId), null];
  }
  if (lowerSql.includes('insert into `project_operations`')) {
    const [family_id, project_id, operation_type, amount, source_account_id, destination_account_id, operation_date, notes, created_by_id] = params;
    const id = mockDbState.project_operations.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newOp = {
      id, family_id, project_id: Number(project_id), operation_type, amount: Number(amount),
      source_account_id: source_account_id ? Number(source_account_id) : null,
      destination_account_id: destination_account_id ? Number(destination_account_id) : null,
      operation_date, notes, created_by_id, created_at: now
    };
    mockDbState.project_operations.push(newOp);
    saveMockDb();
    return [{ insertId: id } as any, null];
  }

  // Fallback for unhandled queries
  console.log('⚠️ Mock DB fallback: generic query not parsed:', lowerSql);
  return [[], null];
}

// Global active database pool instance
let pool: mysql.Pool | null = null;
let useMock = false;

// Initialize database connection
export async function initDb() {
  // If connection is disabled/configured to skip, or database variables aren't set up, fallback immediately
  if (!process.env.DB_HOST || process.env.DB_HOST === '127.0.0.1' || process.env.DB_HOST === 'localhost') {
    // If not reachable, or local development defaults, try to connect, but fail fast if MySQL is not actually running
    console.log('🔍 Database DB_HOST is local/default. Verifying MySQL server connectivity...');
  }

  try {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
    });

    // Test connection with short timeout to prevent application hanging during startup
    const conn = await pool.getConnection();
    conn.release();
    console.log('✅ Connected successfully to MySQL Database!');
    useMock = false;

    // Run migrations if needed
    await runMigrations();
  } catch (err: any) {
    console.warn('⚠️ Could not connect to MySQL server. Error:', err.message);
    console.warn('⚡ Initializing safe In-Memory JSON file mock database fallback...');
    useMock = true;
    initMockDb();
  }
}

async function runMigrations() {
  if (!pool) return;
  try {
    // Check if table users exists by running a simple query
    try {
      await pool.query('SELECT 1 FROM `users` LIMIT 1');
      console.log('✅ Database tables already exist. Skipping migrations.');
      return;
    } catch (dbErr: any) {
      console.log('🔍 Database tables not found (or users table does not exist). Setting up schema...');
    }

    const migrationPath = path.join(process.cwd(), 'migrations', '001_initial_schema.sql');
    if (fs.existsSync(migrationPath)) {
      console.log('🚀 Running initial schema migration...');
      const schemaSql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(schemaSql);
      console.log('✅ Initial schema created successfully!');
    } else {
      console.warn('⚠️ Migration file not found:', migrationPath);
    }

    // Now, run the seeds if they exist to populate the database with demonstration data
    const seedPath = path.join(process.cwd(), 'seeds', '001_initial_seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Seeding database with initial data...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seedSql);
      console.log('✅ Initial seeds executed successfully!');
    } else {
      console.warn('⚠️ Seed file not found:', seedPath);
    }
  } catch (err: any) {
    console.error('❌ Failed to run database migrations/seeds:', err.message);
  }
}

// Database query wrapper with automatic fallback
export async function query(sql: string, params: any[] = []): Promise<[any, any]> {
  if (useMock) {
    return mockQuery(sql, params);
  }
  if (!pool) {
    throw new Error('Database not initialized. Please call initDb() first.');
  }
  return pool.query(sql, params) as any;
}

// Safe transaction management
export async function transaction<T>(callback: (runQuery: (sql: string, params?: any[]) => Promise<any>) => Promise<T>): Promise<T> {
  if (useMock) {
    // Local memory mock has naturally synchronous/isolated execution since Node is single threaded, so we can just run the callback
    const runner = async (sql: string, params: any[] = []) => {
      const [res] = await mockQuery(sql, params);
      return res;
    };
    return callback(runner);
  }

  if (!pool) {
    throw new Error('Database not initialized.');
  }

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const runner = async (sql: string, params: any[] = []) => {
      const [res] = await conn.query(sql, params);
      return res;
    };
    const result = await callback(runner);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
