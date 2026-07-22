/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import webpush from 'web-push';
import crypto from 'crypto';
import { query } from '../../database/db';

export interface SendPushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notificationId?: number;
  module?: string;
  action?: string;
}

export interface SendToFamilyParams extends SendPushPayload {
  familyId: number;
  excludeUserId?: number;
}

/**
 * Helper to compute SHA-256 hash of subscription endpoint
 */
export function hashEndpoint(endpoint: string): string {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
}

/**
 * Checks VAPID configuration in environment variables
 */
export function getVapidConfig(): { configured: boolean; subject?: string; publicKey?: string; privateKey?: string } {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    return { configured: false };
  }

  return {
    configured: true,
    subject,
    publicKey,
    privateKey,
  };
}

let vapidInitialized = false;

/**
 * Initializes web-push with VAPID details if available
 */
export function initWebPush(): boolean {
  const config = getVapidConfig();
  if (!config.configured || !config.subject || !config.publicKey || !config.privateKey) {
    console.warn('⚠️ [WebPush] VAPID não configurado. O recurso de Web Push estará desativado.');
    return false;
  }

  if (!vapidInitialized) {
    try {
      webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
      vapidInitialized = true;
      console.log('✅ [WebPush] VAPID configurado com sucesso.');
    } catch (err) {
      console.error('❌ [WebPush] Falha ao inicializar VAPID:', err);
      return false;
    }
  }

  return true;
}

/**
 * Retorna a chave pública VAPID se configurado
 */
export function getVapidPublicKey(): string | null {
  const config = getVapidConfig();
  if (!config.configured || !config.publicKey) {
    return null;
  }
  return config.publicKey;
}

/**
 * Dispara notificação Web Push para todas as inscrições ativas da família (opcionalmente excluindo quem realizou a ação)
 */
export async function sendPushToFamily(params: SendToFamilyParams): Promise<{ sent: number; failed: number; removed: number }> {
  if (!initWebPush()) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  const { familyId, excludeUserId, title, body, url = '/', tag, notificationId, module, action } = params;

  try {
    let sql = 'SELECT `id`, `endpoint`, `endpoint_hash`, `p256dh`, `auth`, `user_id` FROM `push_subscriptions` WHERE `family_id` = ?';
    const queryArgs: any[] = [familyId];

    if (excludeUserId !== undefined && excludeUserId !== null) {
      sql += ' AND `user_id` != ?';
      queryArgs.push(excludeUserId);
    }

    const [rows] = await query(sql, queryArgs);
    const subscriptions = (rows as any[]) || [];

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0, removed: 0 };
    }

    const pushPayload = JSON.stringify({
      title: title || 'FinFam',
      body: body || 'Nova atualização na família.',
      url: url.startsWith('/') ? url : '/',
      tag: tag || `finfam-notification-${notificationId || Date.now()}`,
      notificationId: notificationId || null,
      module: module || 'general',
      action: action || 'update'
    });

    let sentCount = 0;
    let failedCount = 0;
    let removedCount = 0;

    const promises = subscriptions.map(async (sub) => {
      const pushSubscriptionObj = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
      };

      try {
        await webpush.sendNotification(pushSubscriptionObj, pushPayload, {
          TTL: 86400, // 24 horas
          urgency: 'normal'
        });
        sentCount++;
      } catch (err: any) {
        failedCount++;
        const statusCode = err.statusCode || err.status;

        if (statusCode === 404 || statusCode === 410) {
          // Endpoint expirado ou inacessível - remover do banco
          try {
            await query('DELETE FROM `push_subscriptions` WHERE `endpoint_hash` = ?', [sub.endpoint_hash]);
            removedCount++;
            console.log(`🧹 [WebPush] Inscrição expirada/inválida removida (Status ${statusCode}).`);
          } catch (deleteErr) {
            console.error('❌ [WebPush] Erro ao remover inscrição expirada:', deleteErr);
          }
        } else {
          console.error(`⚠️ [WebPush] Falha ao enviar notificação para dispositivo (Status ${statusCode || 'desconhecido'}).`);
        }
      }
    });

    await Promise.allSettled(promises);

    console.log(`📱 [WebPush] Envio concluído para família ${familyId}: ${sentCount} enviados, ${failedCount} falhas, ${removedCount} removidos por expiração.`);

    return { sent: sentCount, failed: failedCount, removed: removedCount };
  } catch (err) {
    console.error('❌ [WebPush] Erro geral ao processar envio de notificações:', err);
    return { sent: 0, failed: 0, removed: 0 };
  }
}
