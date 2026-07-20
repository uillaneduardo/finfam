/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../database/db';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { UserRole, UserStatus } from '../../../shared/types';

const router = express.Router();

/**
 * GET /api/users
 * Retorna os membros da família cadastrados (Para dropdowns e gestão)
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    const [rows] = await query('SELECT `id`, `family_id`, `name`, `username`, `role`, `status`, `last_login_at`, `created_at` FROM `users` WHERE `family_id` = ?', [familyId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users
 * Cadastro de novo membro na família (Permissão apenas para administrador)
 */
router.post('/', requireAdmin, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { name, username, password, role } = req.body;

  if (!name || !username || !password || !role) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Nome, nome de usuário, senha e papel do membro são obrigatórios.'
    });
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    // Check if username already exists globally
    const [existing] = await query('SELECT `id` FROM `users` WHERE `username` = ? LIMIT 1', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(400).json({
        error: 'USERNAME_TAKEN',
        message: 'Este nome de usuário já está sendo utilizado por outra pessoa no sistema.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await query(
      'INSERT INTO `users` (`family_id`, `name`, `username`, `password_hash`, `role`, `status`) VALUES (?, ?, ?, ?, ?, ?)',
      [familyId, name.trim(), cleanUsername, passwordHash, role, UserStatus.ACTIVE]
    );

    res.status(201).json({
      success: true,
      userId: result.insertId,
      message: `Novo membro '${name}' adicionado à família com sucesso.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users/:id/status
 * Ativa ou desativa um membro da família (Permissão apenas para administrador)
 */
router.post('/:id/status', requireAdmin, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const targetUserId = Number(req.params.id);
  const { status } = req.body;

  if (targetUserId === req.session!.userId) {
    return res.status(400).json({
      error: 'SELF_MODIFICATION',
      message: 'Não é permitido desativar a sua própria conta de administrador ativo.'
    });
  }

  if (status !== UserStatus.ACTIVE && status !== UserStatus.INACTIVE) {
    return res.status(400).json({
      error: 'INVALID_STATUS',
      message: 'O status deve ser active ou inactive.'
    });
  }

  try {
    // Verify target user belongs to the same family
    const [users] = await query('SELECT `id` FROM `users` WHERE `id` = ? AND `family_id` = ? LIMIT 1', [targetUserId, familyId]);
    if (users.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Membro de família não encontrado.'
      });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await query('UPDATE `users` SET `status` = ?, `updated_at` = ? WHERE `id` = ?', [status, now, targetUserId]);

    res.json({
      success: true,
      message: `Status do membro atualizado para '${status}' com sucesso.`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
