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

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL-encoded request body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Cookie Parser with safe Session Secret
  const sessionSecret = process.env.SESSION_SECRET || 'fallback-secret-for-signing-cookies-finfam';
  app.use(cookieParser(sessionSecret));

  // Initialize Database Pool (MySQL or automatic JSON local file fallback)
  await initDb();

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
