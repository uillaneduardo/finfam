/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query, transaction } from '../../database/db';
import { SessionData, UserRole, UserStatus } from '../../../shared/types';
import { rateLimit, requireAuth } from '../../middleware/auth';

const router = express.Router();

/**
 * Helper to validate strong password rules (min 8 chars, uppercase, lowercase, number, symbol)
 */
function isPasswordStrong(password: string): boolean {
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNongs = /[^A-Za-z0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers && hasNongs;
}

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
  const { familyName, adminName, adminUsername, adminPassword } = req.body;

  if (!familyName || !adminName || !adminUsername || !adminPassword) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Todos os campos são obrigatórios: nome da família, nome do administrador, nome de usuário e senha.'
    });
  }

  // Sanitize username
  const cleanUsername = adminUsername.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({
      error: 'INVALID_USERNAME',
      message: 'O nome de usuário deve conter pelo menos 3 caracteres.'
    });
  }

  if (!isPasswordStrong(adminPassword)) {
    return res.status(400).json({
      error: 'WEAK_PASSWORD',
      message: 'A senha do administrador deve conter no mínimo 8 caracteres, incluindo pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial.'
    });
  }

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
        [familyName.trim()]
      );
      const familyId = familyResult.insertId;

      // 2. Insert User Admin
      const userResult = await runQuery(
        'INSERT INTO `users` (`family_id`, `name`, `username`, `password_hash`, `role`, `status`) VALUES (?, ?, ?, ?, ?, ?)',
        [familyId, adminName.trim(), cleanUsername, passwordHash, UserRole.ADMIN, UserStatus.ACTIVE]
      );
      const userId = userResult.insertId;

      return {
        userId,
        username: cleanUsername,
        name: adminName.trim(),
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
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Por favor, informe o seu nome de usuário e a sua senha.'
    });
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    // 1. Fetch user by username
    const [users] = await query('SELECT * FROM `users` WHERE `username` = ? LIMIT 1', [cleanUsername]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Nome de usuário ou senha incorretos.'
      });
    }

    // 2. Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({
        error: 'USER_INACTIVE',
        message: 'Esta conta de usuário foi desativada pelo administrador da família. Entre em contato para liberação.'
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
