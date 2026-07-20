/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../database/db';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { UserRole, UserStatus } from '../../../shared/types';
import { createUserSchema } from '../../schemas/validation.schemas';
import { checkFamilyOwnership } from '../../utils/family.validator';
import { z } from 'zod';

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

  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { name, username, password, role } = parsed.data;

  try {
    // Check if username already exists globally
    const [existing] = await query('SELECT `id` FROM `users` WHERE `username` = ? LIMIT 1', [username]);
    if (existing.length > 0) {
      return res.status(400).json({
        error: 'USERNAME_TAKEN',
        message: 'Este nome de usuário já está sendo utilizado por outra pessoa no sistema.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await query(
      'INSERT INTO `users` (`family_id`, `name`, `username`, `password_hash`, `role`, `status`) VALUES (?, ?, ?, ?, ?, ?)',
      [familyId, name, username, passwordHash, role, UserStatus.ACTIVE]
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

  if (targetUserId === req.session!.userId) {
    return res.status(400).json({
      error: 'SELF_MODIFICATION',
      message: 'Não é permitido desativar a sua própria conta de administrador ativo.'
    });
  }

  const parsed = z.object({
    status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE], {
      message: 'O status deve ser active ou inactive.'
    })
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { status } = parsed.data;

  try {
    // Verify target user belongs to the same family
    await checkFamilyOwnership('users', targetUserId, familyId);

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
