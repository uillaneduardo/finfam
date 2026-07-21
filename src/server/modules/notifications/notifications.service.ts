/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { query } from '../../database/db';

export type NotificationModule = 'account' | 'transaction' | 'commitment' | 'project' | 'contact' | 'category';
export type NotificationAction = 'create' | 'update' | 'delete';

export interface NotifyParams {
  familyId: number;
  actorUserId: number;
  module: NotificationModule;
  action: NotificationAction;
  title: string;
  message: string;
}

/**
 * Registra uma notificação de atividade para toda a família
 */
export async function notifyFamily(params: NotifyParams): Promise<void> {
  try {
    const { familyId, actorUserId, module, action, title, message } = params;
    await query(
      `INSERT INTO \`notifications\` (\`family_id\`, \`actor_user_id\`, \`module\`, \`action\`, \`title\`, \`message\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [familyId, actorUserId, module, action, title, message]
    );
  } catch (err) {
    console.error('❌ Falha ao gravar notificação da família:', err);
    // Não bloqueia a transação principal caso a gravação de notificação falhe
  }
}

/**
 * Busca o nome do usuário ativo para incluir no texto amigável da notificação
 */
export async function getUserName(userId: number): Promise<string> {
  try {
    const [rows] = await query('SELECT `name` FROM `users` WHERE `id` = ?', [userId]);
    if (rows && rows.length > 0 && rows[0].name) {
      return rows[0].name;
    }
  } catch (err) {
    console.error('❌ Falha ao buscar nome do usuário para notificação:', err);
  }
  return 'Um membro da família';
}
