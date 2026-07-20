/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

function getDbConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'finfam_user',
    password: process.env.DB_PASSWORD || 'finfam_password_forte',
    database: process.env.DB_NAME || 'finfam_db',
  };
}

function sanitizeErrorMessage(msg: string): string {
  const password = process.env.DB_PASSWORD;
  if (password && msg.includes(password)) {
    return msg.split(password).join('******');
  }
  return msg;
}

let pool: mysql.Pool | null = null;

export async function initDb() {
  const config = getDbConfig();
  console.log(`🔍 Inicializando conexão com o banco de dados MySQL (${config.host}:${config.port})...`);

  try {
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
    });

    // Test the database connection
    const conn = await pool.getConnection();
    conn.release();
    console.log('✅ Conectado com sucesso ao banco de dados MySQL!');

    // Check migration status on startup (non-blocking, warning only)
    await checkMigrationStatusOnStartup();
  } catch (err: any) {
    const safeMessage = sanitizeErrorMessage(err.message);
    console.error('\n❌ ERRO CRÍTICO: Não foi possível conectar ao banco de dados MySQL.');
    console.error(`Detalhes do erro: ${safeMessage}`);
    console.error('O MySQL é a fonte oficial de persistência e é obrigatório para inicializar o servidor.');
    console.error('Verifique as configurações no seu arquivo .env e certifique-se de que o servidor MySQL está rodando.\n');
    process.exit(1);
  }
}

async function checkMigrationStatusOnStartup() {
  if (!pool) return;
  try {
    // Check if schema_migrations table exists
    const [tables] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'schema_migrations'
    `, [getDbConfig().database]);

    const hasMigrationsTable = (tables as any[])[0]?.count > 0;

    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'));

    if (!hasMigrationsTable) {
      console.warn('\n⚠️ ATENÇÃO: Tabela de controle de migrations (`schema_migrations`) não encontrada.');
      console.warn(`👉 Existem ${files.length} migrations disponíveis. Execute "npm run db:migrate" para estruturar seu banco de dados.\n`);
      return;
    }

    const [rows] = await pool.query('SELECT `name` FROM `schema_migrations`');
    const appliedNames = new Set((rows as any[]).map(r => r.name));

    const pending = files.filter(f => !appliedNames.has(f));

    if (pending.length > 0) {
      console.warn(`\n⚠️ ATENÇÃO: O banco de dados possui ${pending.length} migration(s) pendente(s) que ainda não foi/foram aplicada(s):`);
      pending.forEach(m => console.warn(`   - ${m}`));
      console.warn('👉 Execute "npm run db:migrate" para atualizar a estrutura de tabelas e campos do seu sistema.\n');
    } else {
      console.log('✅ Todas as migrations do sistema estão aplicadas e atualizadas.');
    }
  } catch (err: any) {
    console.warn('⚠️ Não foi possível verificar o status das migrations:', sanitizeErrorMessage(err.message));
  }
}

export async function query(sql: string, params: any[] = []): Promise<[any, any]> {
  if (!pool) {
    throw new Error('Database not initialized. Please call initDb() first.');
  }
  return pool.query(sql, params) as any;
}

export async function transaction<T>(callback: (runQuery: (sql: string, params?: any[]) => Promise<any>) => Promise<T>): Promise<T> {
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
