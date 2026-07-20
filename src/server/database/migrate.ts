/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables cleanly depending on environment
if (process.env.NODE_ENV === 'test') {
  const envTestPath = path.join(process.cwd(), '.env.test');
  if (fs.existsSync(envTestPath)) {
    dotenv.config({ path: envTestPath, override: true });
  }
} else {
  dotenv.config();
}

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

async function getConnectedClient() {
  const config = getDbConfig();
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      multipleStatements: true,
    });
    return connection;
  } catch (err: any) {
    const safeMessage = sanitizeErrorMessage(err.message);
    throw new Error(`Erro de conexão com o MySQL (${config.host}:${config.port}): ${safeMessage}`);
  }
}

// 1. Create schema_migrations table
async function ensureMigrationsTable(conn: mysql.Connection) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
      \`name\` VARCHAR(255) NOT NULL,
      \`applied_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de migrations aplicadas';
  `);
}

// Helper to check for pending migrations
export async function getMigrationsStatus() {
  const conn = await getConnectedClient();
  await ensureMigrationsTable(conn);

  const migrationsDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    await conn.end();
    return { applied: [], pending: [] };
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const [rows] = await conn.query('SELECT `name` FROM `schema_migrations`');
  const appliedNames = new Set((rows as any[]).map(r => r.name));

  const applied: string[] = [];
  const pending: string[] = [];

  for (const file of files) {
    if (appliedNames.has(file)) {
      applied.push(file);
    } else {
      pending.push(file);
    }
  }

  await conn.end();
  return { applied, pending };
}

// Command: Migrate
export async function runMigrate() {
  console.log('🔄 Verificando e executando migrations pendentes...');
  const conn = await getConnectedClient();
  await ensureMigrationsTable(conn);

  const migrationsDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn('⚠️ Diretório de migrations não encontrado.');
    await conn.end();
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const [rows] = await conn.query('SELECT `name` FROM `schema_migrations`');
  const appliedNames = new Set((rows as any[]).map(r => r.name));

  let count = 0;
  for (const file of files) {
    if (!appliedNames.has(file)) {
      console.log(`🚀 Iniciando migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        // Execute migration
        await conn.query(sql);
        // Record as applied
        await conn.query('INSERT INTO `schema_migrations` (`name`) VALUES (?)', [file]);
        console.log(`✅ Migration ${file} aplicada com sucesso!`);
        count++;
      } catch (err: any) {
        console.error(`❌ Falha na migration ${file}:`, sanitizeErrorMessage(err.message));
        await conn.end();
        throw err;
      }
    }
  }

  if (count === 0) {
    console.log('✅ Nenhuma migration pendente. O banco de dados está atualizado!');
  } else {
    console.log(`🎉 Sucesso: ${count} migration(s) aplicada(s) com êxito.`);
  }

  await conn.end();
}

// Command: Status
async function runStatus() {
  const { applied, pending } = await getMigrationsStatus();
  console.log('\n=========================================');
  console.log('📋 STATUS DAS MIGRATIONS');
  console.log('=========================================');
  
  if (applied.length === 0 && pending.length === 0) {
    console.log('⚠️ Nenhuma migration encontrada.');
    return;
  }

  console.log('\nAplicadas:');
  if (applied.length === 0) {
    console.log('  (Nenhuma migration aplicada ainda)');
  } else {
    applied.forEach(m => console.log(`  [OK]  ${m}`));
  }

  console.log('\nPendentes:');
  if (pending.length === 0) {
    console.log('  (Nenhuma migration pendente - 100% atualizado)');
  } else {
    pending.forEach(m => console.log(`  [ ]   ${m}`));
  }
  console.log('\n=========================================\n');
}

// Command: Seed
export async function runSeed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ Operação REJEITADA: Sementeira de demonstração é proibida em ambiente de produção (NODE_ENV=production).');
  }

  console.log('🌱 Executando semente de demonstração...');
  const conn = await getConnectedClient();
  const seedPath = path.join(process.cwd(), 'seeds', '001_initial_seed.sql');
  
  if (!fs.existsSync(seedPath)) {
    await conn.end();
    throw new Error(`Arquivo de seed não encontrado: ${seedPath}`);
  }

  const sql = fs.readFileSync(seedPath, 'utf8');
  try {
    await conn.query(sql);
    console.log('✅ Dados de demonstração semeados com sucesso!');
  } catch (err: any) {
    await conn.end();
    throw new Error(`Erro durante execução do seed: ${sanitizeErrorMessage(err.message)}`);
  }

  await conn.end();
}

// Command: Reset
export async function runReset(confirmed: boolean) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ Operação REJEITADA: Reset de banco de dados é estritamente proibido em ambiente de produção.');
  }

  if (!confirmed) {
    console.warn('⚠️ ATENÇÃO: Esse comando irá APAGAR TODAS as tabelas e dados do banco de dados!');
    console.warn('Para confirmar essa ação destrutiva, execute novamente passando o argumento --confirm');
    console.warn('Exemplo: npm run db:reset -- --confirm');
    process.exitCode = 1;
    return;
  }

  console.log('🔥 Iniciando destruição e recriação do banco de dados (Reset)...');
  const conn = await getConnectedClient();
  
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Get all tables
    const [tables] = await conn.query('SHOW TABLES');
    const dbName = getDbConfig().database;
    
    for (const row of tables as any[]) {
      const tableName = row[`Tables_in_${dbName}`];
      console.log(`💥 Removendo tabela: ${tableName}`);
      await conn.query(`DROP TABLE \`${tableName}\``);
    }
    
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Todas as tabelas foram removidas com sucesso.');
    
    // Automatically re-run migrate after reset
    console.log('🔄 Recriando tabelas a partir das migrations...');
    await conn.end();
    
    // We re-connect and execute migrations
    await runMigrate();
    console.log('🎉 Banco de dados reinicializado com sucesso!');
  } catch (err: any) {
    throw new Error(`Erro durante o reset do banco de dados: ${sanitizeErrorMessage(err.message)}`);
  }
}

// Main CLI Entrypoint
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--migrate')) {
    await runMigrate();
  } else if (args.includes('--status')) {
    await runStatus();
  } else if (args.includes('--seed')) {
    await runSeed();
  } else if (args.includes('--reset')) {
    const confirmed = args.includes('--confirm');
    await runReset(confirmed);
  } else {
    console.log('FinFam Database CLI Utility');
    console.log('Uso: tsx src/server/database/migrate.ts [opção]');
    console.log('Opções:');
    console.log('  --migrate      Aplica somente migrations pendentes');
    console.log('  --status       Exibe as migrations aplicadas e pendentes');
    console.log('  --seed         Insere dados iniciais de demonstração (não roda em produção)');
    console.log('  --reset        Apaga todas as tabelas e reaplica migrations (requer --confirm)');
  }
}

// Only execute CLI runner if file is called directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('migrate.ts') || 
  process.argv[1].endsWith('migrate.js') ||
  process.argv[1].endsWith('migrate')
);

if (isDirectRun) {
  main().catch(err => {
    console.error('❌ Erro fatal no executor de migrations:', err);
    process.exit(1);
  });
}
