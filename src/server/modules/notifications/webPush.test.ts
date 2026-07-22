/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushSubscribeSchema, pushUnsubscribeSchema } from '../../schemas/validation.schemas';
import { hashEndpoint, getVapidConfig, getVapidPublicKey, sendPushToFamily } from './webPush.service';
import webpush from 'web-push';

vi.mock('web-push', () => {
  return {
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    }
  };
});

vi.mock('../../database/db', () => {
  return {
    query: vi.fn()
  };
});

import { query } from '../../database/db';

describe('Web Push Service & Validation Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Zod Validation Schemas', () => {
    it('deve aceitar uma inscrição Web Push válida', () => {
      const validPayload = {
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABk...',
        keys: {
          p256dh: 'BNcRdreALRF3m+vL5Fi0...',
          auth: 'tC2bzY3W...'
        },
        deviceName: 'Chrome no Android'
      };

      const result = pushSubscribeSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar inscrição com endpoint inválido', () => {
      const invalidPayload = {
        endpoint: 'not-a-valid-url',
        keys: {
          p256dh: 'key',
          auth: 'auth'
        }
      };

      const result = pushSubscribeSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar inscrição sem as chaves p256dh ou auth', () => {
      const invalidPayload = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/foo',
        keys: {
          p256dh: '',
          auth: ''
        }
      };

      const result = pushSubscribeSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve validar payload de desinscrição', () => {
      const validPayload = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/valid-endpoint'
      };

      const result = pushUnsubscribeSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('SHA-256 Hashing de Endpoint', () => {
    it('deve gerar hashes determinísticos para endpoints', () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/device123';
      const hash1 = hashEndpoint(endpoint);
      const hash2 = hashEndpoint(endpoint);

      expect(hash1).toHaveLength(64); // SHA-256 em hex
      expect(hash1).toBe(hash2);
      expect(hashEndpoint(endpoint + 'a')).not.toBe(hash1);
    });
  });

  describe('Gestão de Configuração VAPID', () => {
    it('deve retornar não configurado quando variáveis de ambiente ausentes', () => {
      const oldSubject = process.env.VAPID_SUBJECT;
      const oldPub = process.env.VAPID_PUBLIC_KEY;
      const oldPriv = process.env.VAPID_PRIVATE_KEY;

      delete process.env.VAPID_SUBJECT;
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      const config = getVapidConfig();
      expect(config.configured).toBe(false);

      process.env.VAPID_SUBJECT = oldSubject;
      process.env.VAPID_PUBLIC_KEY = oldPub;
      process.env.VAPID_PRIVATE_KEY = oldPriv;
    });

    it('deve retornar chave pública se variáveis VAPID estiverem definidas', () => {
      process.env.VAPID_SUBJECT = 'mailto:test@finfam.com';
      process.env.VAPID_PUBLIC_KEY = 'TEST_PUBLIC_KEY';
      process.env.VAPID_PRIVATE_KEY = 'TEST_PRIVATE_KEY';

      const key = getVapidPublicKey();
      expect(key).toBe('TEST_PUBLIC_KEY');
    });
  });

  describe('Envio de Push para Família (sendPushToFamily)', () => {
    it('deve remover inscrições expiradas com status 410 Gone ou 404 Not Found', async () => {
      process.env.VAPID_SUBJECT = 'mailto:test@finfam.com';
      process.env.VAPID_PUBLIC_KEY = 'TEST_PUBLIC_KEY';
      process.env.VAPID_PRIVATE_KEY = 'TEST_PRIVATE_KEY';

      // Mock de inscrições retornadas pelo banco
      (query as any).mockResolvedValueOnce([
        [
          {
            id: 1,
            endpoint: 'https://fcm.googleapis.com/fcm/send/expired',
            endpoint_hash: 'hash_expired',
            p256dh: 'p256',
            auth: 'auth',
            user_id: 2
          }
        ]
      ]);

      // Mock da falha de envio do webpush com status 410
      (webpush.sendNotification as any).mockRejectedValueOnce({
        statusCode: 410,
        message: 'Subscription expired'
      });

      // Mock da exclusão no banco
      (query as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await sendPushToFamily({
        familyId: 1,
        excludeUserId: 1,
        title: 'Nova Receita',
        body: 'Uillan adicionou Salário no valor de R$ 5.000,00'
      });

      expect(result.failed).toBe(1);
      expect(result.removed).toBe(1);
      expect(query).toHaveBeenCalledWith(
        'DELETE FROM `push_subscriptions` WHERE `endpoint_hash` = ?',
        ['hash_expired']
      );
    });

    it('não deve quebrar ou lançar exceção caso ocorra erro ao enviar push', async () => {
      process.env.VAPID_SUBJECT = 'mailto:test@finfam.com';
      process.env.VAPID_PUBLIC_KEY = 'TEST_PUBLIC_KEY';
      process.env.VAPID_PRIVATE_KEY = 'TEST_PRIVATE_KEY';

      (query as any).mockRejectedValueOnce(new Error('DB Connection Timeout'));

      const result = await sendPushToFamily({
        familyId: 1,
        title: 'Erro de Banco',
        body: 'Teste de resiliência'
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
