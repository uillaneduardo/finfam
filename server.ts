/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { initDb } from './src/server/database/db';
import { errorHandler } from './src/server/middleware/auth';
import authRouter from './src/server/modules/auth/auth.router';
import accountsRouter from './src/server/modules/accounts/accounts.router';
import transactionsRouter from './src/server/modules/transactions/transactions.router';
import commitmentsRouter from './src/server/modules/commitments/commitments.router';
import projectsRouter from './src/server/modules/projects/projects.router';
import contactsRouter from './src/server/modules/contacts/contacts.router';
import categoriesRouter from './src/server/modules/categories/categories.router';
import usersRouter from './src/server/modules/users/users.router';
import notificationsRouter from './src/server/modules/notifications/notifications.router';

// Load environment variables
dotenv.config();

// Validate required environment variables on startup
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias ausentes: ${missingEnvVars.join(', ')}`);
  console.error('Por favor, certifique-se de configurar estas variáveis no arquivo .env antes de inicializar o servidor.');
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;

if (isProduction) {
  if (!sessionSecret || sessionSecret === 'altere_este_segredo_por_um_hash_aleatorio_e_seguro_em_producao' || sessionSecret === 'fallback-secret-for-signing-cookies-finfam') {
    console.error('❌ ERRO CRÍTICO DE SEGURANÇA: O SESSION_SECRET padrão ou ausente é proibido em ambiente de produção!');
    console.error('Configure um SESSION_SECRET seguro e exclusivo no seu arquivo .env para iniciar a aplicação.');
    process.exit(1);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // JSON and URL-encoded request body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Cookie Parser with safe Session Secret
  const secretToUse = sessionSecret || 'fallback-secret-for-signing-cookies-finfam';
  app.use(cookieParser(secretToUse));

  // Initialize Database Pool
  try {
    await initDb();
  } catch (err: any) {
    console.error('\n❌ ERRO CRÍTICO: Não foi possível conectar ao banco de dados MySQL.');
    console.error(`Detalhes do erro: ${err.message}`);
    console.error('O MySQL é a fonte oficial de persistência e é obrigatório para inicializar o servidor.\n');
    process.exit(1);
  }

  // -----------------------------------------------------------------------------
  // API Routes
  // -----------------------------------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'finfam', time: new Date().toISOString() });
  });

  // Mount API Sub-routers
  app.use('/api/auth', authRouter);
  app.use('/api/accounts', accountsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/commitments', commitmentsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/notifications', notificationsRouter);

  // Catch unhandled API paths
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Rota de API não encontrada.'
    });
  });

  // -----------------------------------------------------------------------------
  // Vite Dev Server / Static Assets Production Handling
  // -----------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚡ Mounting Vite Middleware in Development...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('📦 Serving compiled static files from dist/ in Production...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Centralized Express Error Handler
  app.use(errorHandler);

  // Listen on port 3000, binding to all interfaces (required by Cloud ingress)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FinFam fullstack container is up and running on port ${PORT}!`);
  });
}

startServer();
