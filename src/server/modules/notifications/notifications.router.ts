/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { pushSubscribeSchema, pushUnsubscribeSchema } from '../../schemas/validation.schemas';
import { getVapidPublicKey, getVapidConfig, hashEndpoint } from './webPush.service';

const router = express.Router();

/**
 * GET /api/notifications/push/public-key
 * Retorna apenas a chave pública VAPID se o serviço estiver configurado
 */
router.get('/push/public-key', requireAuth, (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({
      error: 'NOT_CONFIGURED',
      message: 'O serviço de Web Push não está configurado no servidor. Defina as variáveis VAPID no ambiente.'
    });
  }

  res.json({ publicKey });
});

/**
 * GET /api/notifications/push/status
 * Retorna o status de configuração e quantidade de dispositivos inscritos pelo usuário
 */
router.get('/push/status', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;
  const config = getVapidConfig();

  try {
    const [rows] = await query(
      `SELECT COUNT(*) as count FROM \`push_subscriptions\` WHERE \`user_id\` = ? AND \`family_id\` = ?`,
      [userId, familyId]
    );

    const count = (rows as any[])[0]?.count || 0;

    res.json({
      configured: config.configured,
      subscribedDevices: Number(count)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/push/subscribe
 * Registra ou atualiza uma inscrição Web Push associada à sessão do usuário
 */
router.post('/push/subscribe', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;

  try {
    const data = pushSubscribeSchema.parse(req.body);
    const endpointHash = hashEndpoint(data.endpoint);
    const userAgent = (req.headers['user-agent'] || '').slice(0, 500);
    const deviceName = data.deviceName ? data.deviceName.slice(0, 100) : null;

    await query(
      `INSERT INTO \`push_subscriptions\` 
        (\`family_id\`, \`user_id\`, \`endpoint\`, \`endpoint_hash\`, \`p256dh\`, \`auth\`, \`user_agent\`, \`device_name\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        \`family_id\` = VALUES(\`family_id\`),
        \`user_id\` = VALUES(\`user_id\`),
        \`endpoint\` = VALUES(\`endpoint\`),
        \`p256dh\` = VALUES(\`p256dh\`),
        \`auth\` = VALUES(\`auth\`),
        \`user_agent\` = VALUES(\`user_agent\`),
        \`device_name\` = VALUES(\`device_name\`),
        \`updated_at\` = CURRENT_TIMESTAMP`,
      [
        familyId,
        userId,
        data.endpoint,
        endpointHash,
        data.keys.p256dh,
        data.keys.auth,
        userAgent || null,
        deviceName
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Inscrição de Web Push registrada com sucesso.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/notifications/push/unsubscribe
 * Remove uma inscrição Web Push pertencente ao usuário autenticado
 */
router.delete('/push/unsubscribe', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;

  try {
    const data = pushUnsubscribeSchema.parse(req.body);
    const endpointHash = hashEndpoint(data.endpoint);

    await query(
      `DELETE FROM \`push_subscriptions\` 
       WHERE \`endpoint_hash\` = ? AND \`user_id\` = ? AND \`family_id\` = ?`,
      [endpointHash, userId, familyId]
    );

    res.json({
      success: true,
      message: 'Inscrição de Web Push removida com sucesso.'
    });
  } catch (err) {
    next(err);
  }
});

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
