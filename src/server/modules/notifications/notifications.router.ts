/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query } from '../../database/db';
import { requireAuth } from '../../middleware/auth';

const router = express.Router();

/**
 * GET /api/notifications
 * Retorna as últimas notificações da família e a contagem de não lidas
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    const [rows] = await query(
      `SELECT 
        n.id,
        n.family_id,
        n.actor_user_id,
        n.module,
        n.action,
        n.title,
        n.message,
        n.is_read,
        n.created_at,
        u.name as actor_name
       FROM \`notifications\` n
       LEFT JOIN \`users\` u ON u.id = n.actor_user_id
       WHERE n.family_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [familyId]
    );

    const [unreadCountRow] = await query(
      `SELECT COUNT(*) as unread_count FROM \`notifications\` WHERE \`family_id\` = ? AND \`is_read\` = 0`,
      [familyId]
    );

    const unreadCount = (unreadCountRow as any[])[0]?.unread_count || 0;

    res.json({
      notifications: rows,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/read-all
 * Marcar todas as notificações da família como lidas
 */
router.post('/read-all', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    await query(
      `UPDATE \`notifications\` SET \`is_read\` = 1 WHERE \`family_id\` = ? AND \`is_read\` = 0`,
      [familyId]
    );

    res.json({ success: true, message: 'Todas as notificações foram marcadas como lidas.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/:id/read
 * Marcar uma notificação específica como lida
 */
router.post('/:id/read', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { id } = req.params;

  try {
    await query(
      `UPDATE \`notifications\` SET \`is_read\` = 1 WHERE \`id\` = ? AND \`family_id\` = ?`,
      [id, familyId]
    );

    res.json({ success: true, message: 'Notificação marcada como lida.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/notifications
 * Limpar notificações lidas da família
 */
router.delete('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    await query(
      `DELETE FROM \`notifications\` WHERE \`family_id\` = ? AND \`is_read\` = 1`,
      [familyId]
    );

    res.json({ success: true, message: 'Notificações lidas foram limpas com sucesso.' });
  } catch (err) {
    next(err);
  }
});

export default router;
