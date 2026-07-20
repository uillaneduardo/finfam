/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query, transaction } from '../../database/db';
import { SessionData, UserRole, UserStatus } from '../../../shared/types';
import { rateLimit, requireAuth } from '../../middleware/auth';
import { firstUseSetupSchema, loginSchema } from '../../schemas/validation.schemas';

const router = express.Router();

/**
 * GET /api/auth/first-use-check
 * Retorna se o sistema necessita de configuração inicial (primeiro uso)
 */
router.get('/first-use-check', async (req, res, next) => {
  try {
    const [rows] = await query('SELECT COUNT(*) as count FROM `users`');
    const userCount = rows[0]?.count || 0;
    
    res.json({
      firstUseRequired: userCount === 0
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/first-use-setup
 * Criação da primeira família e do primeiro usuário administrador unificados
 */
router.post('/first-use-setup', rateLimit(5, 60 * 1000), async (req, res, next) => {
  const parsed = firstUseSetupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { familyName, adminName, adminUsername, adminPassword } = parsed.data;

  try {
    // Check if any user already exists to prevent bypass
    const [existingUsers] = await query('SELECT COUNT(*) as count FROM `users`');
    if (existingUsers[0]?.count > 0) {
      return res.status(403).json({
        error: 'ALREADY_CONFIGURED',
        message: 'O sistema já possui uma família e administrador configurados. Utilize a tela de login.'
      });
    }

    // Generate secure password hash using bcryptjs (12 salt rounds)
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Run creation inside a single ACID-safe Transaction to prevent partial/orphaned records
    const sessionPayload = await transaction<SessionData>(async (runQuery) => {
      // 1. Insert Family
      const familyResult = await runQuery(
        'INSERT INTO `families` (`name`) VALUES (?)',
        [familyName]
      );
      const familyId = familyResult.insertId;

      // 2. Insert User Admin
      const userResult = await runQuery(
        'INSERT INTO `users` (`family_id`, `name`, `username`, `password_hash`, `role`, `status`) VALUES (?, ?, ?, ?, ?, ?)',
        [familyId, adminName, adminUsername, passwordHash, UserRole.ADMIN, UserStatus.ACTIVE]
      );
      const userId = userResult.insertId;

      // 3. Insert Default Categories (Metadata) for the family
      const defaultCategories = [
        { name: 'Habitação e Moradia', type: 'expense' },
        { name: 'Alimentação e Supermercado', type: 'expense' },
        { name: 'Serviços de Tecnologia', type: 'expense' },
        { name: 'Lazer e Entretenimento', type: 'expense' },
        { name: 'Transporte e Mobilidade', type: 'expense' },
        { name: 'Saúde e Cuidados', type: 'expense' },
        { name: 'Educação', type: 'expense' },
        { name: 'Rendimentos e Salários', type: 'income' },
        { name: 'Outras Receitas', type: 'income' },
        { name: 'Outras Despesas', type: 'expense' }
      ];

      for (const cat of defaultCategories) {
        await runQuery(
          'INSERT INTO `categories` (`family_id`, `name`, `type`, `status`) VALUES (?, ?, ?, "active")',
          [familyId, cat.name, cat.type]
        );
      }

      return {
        userId,
        username: adminUsername,
        name: adminName,
        familyId,
        role: UserRole.ADMIN
      };
    });

    // Generate cookies session directly
    const maxAge = 24 * 60 * 60 * 1000; // 1 day
    res.cookie('sid', JSON.stringify(sessionPayload), {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge
    });

    res.status(201).json({
      success: true,
      user: {
        id: sessionPayload.userId,
        name: sessionPayload.name,
        username: sessionPayload.username,
        role: sessionPayload.role,
        familyId: sessionPayload.familyId
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Autenticação do usuário e criação de sessão HTTP-Only
 */
router.post('/login', rateLimit(10, 60 * 1000), async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { username, password } = parsed.data;

  try {
    // 1. Fetch user by username
    const [users] = await query('SELECT * FROM `users` WHERE `username` = ? LIMIT 1', [username]);
    const user = users[0];

    // 2. Return generic "Nome de usuário ou senha incorretos." error if not found or inactive for security
    if (!user || user.status !== UserStatus.ACTIVE) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Nome de usuário ou senha incorretos.'
      });
    }

    // 3. Verify password hash using bcryptjs
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Nome de usuário ou senha incorretos.'
      });
    }

    // 4. Update last_login_at timestamp
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await query('UPDATE `users` SET `last_login_at` = ? WHERE `id` = ?', [now, user.id]);

    // 5. Create Session Payload
    const sessionPayload: SessionData = {
      userId: user.id,
      username: user.username,
      name: user.name,
      familyId: user.family_id,
      role: user.role as UserRole
    };

    // 6. Set httpOnly signed cookie
    const maxAge = 24 * 60 * 60 * 1000; // 1 day
    res.cookie('sid', JSON.stringify(sessionPayload), {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        familyId: user.family_id
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Destruição da sessão ativa limpando o cookie correspondente
 */
router.post('/logout', requireAuth, (req, res) => {
  res.clearCookie('sid');
  res.json({
    success: true,
    message: 'Sessão encerrada com sucesso.'
  });
});

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado ativo a partir de sua sessão
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.session
  });
});

export default router;
