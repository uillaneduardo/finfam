/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converte chave pública VAPID em formato Base64 URL-safe para Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica se o navegador atual possui suporte para Web Push
 */
export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Retorna o estado atual da permissão de notificação no navegador
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Obtém o status do serviço Web Push e a quantidade de dispositivos inscritos
 */
export async function getPushStatus(): Promise<{ configured: boolean; subscribedDevices: number }> {
  try {
    const res = await fetch('/api/notifications/push/status');
    if (!res.ok) return { configured: false, subscribedDevices: 0 };
    return await res.json();
  } catch {
    return { configured: false, subscribedDevices: 0 };
  }
}

/**
 * Obtém a inscrição Web Push ativa do navegador atual (se houver)
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Ativa as notificações Web Push no dispositivo atual após ação explícita do usuário
 */
export async function enableWebPush(deviceName?: string): Promise<{ success: boolean; subscription: PushSubscription }> {
  if (!isWebPushSupported()) {
    throw new Error('Este navegador não oferece suporte a notificações Web Push.');
  }

  // 1. Solcita permissão ao usuário
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('As notificações foram bloqueadas ou recusadas nas configurações do navegador.');
  }

  // 2. Garante que o Service Worker está pronto
  const reg = await navigator.serviceWorker.ready;

  // 3. Obtém a chave pública VAPID do servidor
  const keyRes = await fetch('/api/notifications/push/public-key');
  if (!keyRes.ok) {
    const errorData = await keyRes.json().catch(() => ({}));
    throw new Error(errorData.message || 'O serviço de Web Push não está configurado ou disponível no servidor.');
  }

  const { publicKey } = await keyRes.json();
  if (!publicKey) {
    throw new Error('Chave pública VAPID não foi retornada pelo servidor.');
  }

  // 4. Verifica inscrição existente ou cria uma nova
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  // 5. Envia / sincroniza os dados da inscrição com o servidor
  const subJson = sub.toJSON();
  const subRes = await fetch('/api/notifications/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime || null,
      keys: subJson.keys,
      deviceName: deviceName || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
    }),
  });

  if (!subRes.ok) {
    const subErr = await subRes.json().catch(() => ({}));
    throw new Error(subErr.message || 'Erro ao registrar a inscrição no servidor.');
  }

  return { success: true, subscription: sub };
}

/**
 * Desativa as notificações Web Push no dispositivo atual
 */
export async function disableWebPush(): Promise<{ success: boolean }> {
  if (!isWebPushSupported()) return { success: true };

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();

    if (sub) {
      // 1. Informa o servidor para remover do banco de dados
      await fetch('/api/notifications/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch((err) => console.warn('Erro ao avisar servidor do unsubscribe:', err));

      // 2. Remove do navegador
      await sub.unsubscribe().catch((err) => console.warn('Erro ao realizar unsubscribe local:', err));
    }

    return { success: true };
  } catch (err) {
    console.error('Erro ao desativar Web Push:', err);
    return { success: true };
  }
}
