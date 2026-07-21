/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query, transaction } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { transactionSchema } from '../../schemas/validation.schemas';
import { validateRelatedEntities } from '../../utils/family.validator';
import { notifyFamily, getUserName } from '../notifications/notifications.service';

const router = express.Router();

/**
 * GET /api/transactions
 * Retorna o histórico de movimentações da família
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    const [rows] = await query(
      'SELECT * FROM `transactions` WHERE `family_id` = ? ORDER BY `transaction_date` DESC, `id` DESC',
      [familyId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/transactions
 * Registro de nova movimentação financeira (Entrada, Saída, Transferência)
 */
router.post('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;

  // 1. Zod Struct validation
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const {
    type,
    description,
    amount,
    transaction_date,
    source_account_id,
    destination_account_id,
    responsible_user_id,
    category_id,
    contact_id,
    notes,
    idempotency_key
  } = parsed.data;

  // Extract idempotency key from header or body
  const headerKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  const rawIdempotencyKey = headerKey || idempotency_key;
  const finalIdempotencyKey = typeof rawIdempotencyKey === 'string' && rawIdempotencyKey.trim() !== ''
    ? rawIdempotencyKey.trim()
    : null;

  if (finalIdempotencyKey && finalIdempotencyKey.length > 100) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'A chave de idempotência não pode exceder 100 caracteres.'
    });
  }

  try {
    // 2. Validate that all related entities exist and belong to the same family
    await validateRelatedEntities(familyId, {
      source_account_id,
      destination_account_id,
      responsible_user_id,
      category_id,
      contact_id
    });

    // 3. Idempotency check: Return existing transaction if duplicate key sent
    if (finalIdempotencyKey) {
      const [existingTx] = await query(
        'SELECT * FROM `transactions` WHERE `family_id` = ? AND `idempotency_key` = ? LIMIT 1',
        [familyId, finalIdempotencyKey]
      );
      if (existingTx.length > 0) {
        const existing = existingTx[0];
        
        // Helper to normalize values for comparison
        const norm = (val: any) => (val === null || val === undefined ? '' : String(val).trim());
        const normDesc = (val: any) => norm(val).toLowerCase();

        const sameType = norm(existing.type) === norm(type);
        const sameDesc = normDesc(existing.description) === normDesc(description);
        const sameAmount = Number(existing.amount) === Number(amount);

        // Normalize dates
        let existingDateStr = '';
        if (existing.transaction_date instanceof Date) {
          existingDateStr = existing.transaction_date.toISOString().split('T')[0];
        } else {
          existingDateStr = norm(existing.transaction_date).split('T')[0];
        }
        let parsedDateStr = norm(transaction_date).split('T')[0];
        const sameDate = existingDateStr === parsedDateStr;

        const sameSrc = (existing.source_account_id === null ? null : Number(existing.source_account_id)) === 
                        (source_account_id === null || source_account_id === undefined ? null : Number(source_account_id));
        
        const sameDest = (existing.destination_account_id === null ? null : Number(existing.destination_account_id)) === 
                         (destination_account_id === null || destination_account_id === undefined ? null : Number(destination_account_id));

        const sameResp = Number(existing.responsible_user_id) === Number(responsible_user_id);

        const sameCat = (existing.category_id === null ? null : Number(existing.category_id)) === 
                        (category_id === null || category_id === undefined ? null : Number(category_id));

        const sameCont = (existing.contact_id === null ? null : Number(existing.contact_id)) === 
                         (contact_id === null || contact_id === undefined ? null : Number(contact_id));

        const sameNotes = norm(existing.notes) === norm(notes);

        const match = sameType && sameDesc && sameAmount && sameDate && sameSrc && sameDest && sameResp && sameCat && sameCont && sameNotes;

        if (match) {
          return res.status(200).json({
            success: true,
            replayed: true,
            transactionId: existing.id,
            message: 'Movimentação registrada com sucesso.'
          });
        } else {
          return res.status(409).json({
            error: 'IDEMPOTENCY_KEY_REUSED',
            message: 'Esta chave de segurança já foi utilizada em uma movimentação diferente.'
          });
        }
      }
    }

    // 4. Verify that used accounts are ACTIVE (Cenário 6)
    if (source_account_id) {
      const [srcAccRows] = await query('SELECT `status` FROM `accounts` WHERE `id` = ?', [source_account_id]);
      if (srcAccRows[0]?.status !== 'active') {
        return res.status(400).json({
          error: 'INACTIVE_ACCOUNT',
          message: 'Lançamentos não são permitidos em uma conta financeira inativa.'
        });
      }
    }

    if (destination_account_id) {
      const [destAccRows] = await query('SELECT `status` FROM `accounts` WHERE `id` = ?', [destination_account_id]);
      if (destAccRows[0]?.status !== 'active') {
        return res.status(400).json({
          error: 'INACTIVE_ACCOUNT',
          message: 'Lançamentos não são permitidos em uma conta financeira inativa.'
        });
      }
    }

    // 5. Execute transaction atomically
    const result = await transaction(async (runQuery) => {
      const txResult = await runQuery(
        'INSERT INTO `transactions` (`family_id`, `type`, `description`, `amount`, `transaction_date`, `source_account_id`, `destination_account_id`, `responsible_user_id`, `category_id`, `contact_id`, `notes`, `created_by_id`, `idempotency_key`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          familyId,
          type,
          description,
          amount,
          transaction_date,
          source_account_id || null,
          destination_account_id || null,
          responsible_user_id,
          category_id || null,
          contact_id || null,
          notes || null,
          userId,
          finalIdempotencyKey
        ]
      );
      return txResult;
    });

    const userName = await getUserName(userId);
    const formattedAmount = Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    await notifyFamily({
      familyId,
      actorUserId: userId,
      module: 'transaction',
      action: 'create',
      title: 'Novo Lançamento',
      message: `${userName} lançou '${description}' no valor de ${formattedAmount}.`
    });

    res.status(201).json({
      success: true,
      replayed: false,
      transactionId: result.insertId,
      message: 'Movimentação registrada com sucesso.'
    });
  } catch (err: any) {
    // If double submit triggers MySQL unique key violation under race conditions, gracefully return the existing transaction
    if (err.code === 'ER_DUP_ENTRY' && finalIdempotencyKey && err.message.includes('uq_transactions_idempotency')) {
      try {
        const [existingTx] = await query(
          'SELECT * FROM `transactions` WHERE `family_id` = ? AND `idempotency_key` = ? LIMIT 1',
          [familyId, finalIdempotencyKey]
        );
        if (existingTx.length > 0) {
          const existing = existingTx[0];
          
          const norm = (val: any) => (val === null || val === undefined ? '' : String(val).trim());
          const normDesc = (val: any) => norm(val).toLowerCase();

          const sameType = norm(existing.type) === norm(type);
          const sameDesc = normDesc(existing.description) === normDesc(description);
          const sameAmount = Number(existing.amount) === Number(amount);

          let existingDateStr = '';
          if (existing.transaction_date instanceof Date) {
            existingDateStr = existing.transaction_date.toISOString().split('T')[0];
          } else {
            existingDateStr = norm(existing.transaction_date).split('T')[0];
          }
          let parsedDateStr = norm(transaction_date).split('T')[0];
          const sameDate = existingDateStr === parsedDateStr;

          const sameSrc = (existing.source_account_id === null ? null : Number(existing.source_account_id)) === 
                          (source_account_id === null || source_account_id === undefined ? null : Number(source_account_id));
          
          const sameDest = (existing.destination_account_id === null ? null : Number(existing.destination_account_id)) === 
                           (destination_account_id === null || destination_account_id === undefined ? null : Number(destination_account_id));

          const sameResp = Number(existing.responsible_user_id) === Number(responsible_user_id);

          const sameCat = (existing.category_id === null ? null : Number(existing.category_id)) === 
                          (category_id === null || category_id === undefined ? null : Number(category_id));

          const sameCont = (existing.contact_id === null ? null : Number(existing.contact_id)) === 
                           (contact_id === null || contact_id === undefined ? null : Number(contact_id));

          const sameNotes = norm(existing.notes) === norm(notes);

          const match = sameType && sameDesc && sameAmount && sameDate && sameSrc && sameDest && sameResp && sameCat && sameCont && sameNotes;

          if (match) {
            return res.status(200).json({
              success: true,
              replayed: true,
              transactionId: existing.id,
              message: 'Movimentação registrada com sucesso.'
            });
          } else {
            return res.status(409).json({
              error: 'IDEMPOTENCY_KEY_REUSED',
              message: 'Esta chave de segurança já foi utilizada em uma movimentação diferente.'
            });
          }
        }
      } catch (innerErr) {
        // Fall through to normal error handling
      }
    }
    next(err);
  }
});

/**
 * PUT /api/transactions/:id
 * Atualiza uma movimentação financeira existente
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { id } = req.params;

  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const {
    type,
    description,
    amount,
    transaction_date,
    source_account_id,
    destination_account_id,
    responsible_user_id,
    category_id,
    contact_id,
    notes
  } = parsed.data;

  try {
    await validateRelatedEntities(familyId, {
      source_account_id,
      destination_account_id,
      responsible_user_id,
      category_id,
      contact_id
    });

    const [result] = await query(
      `UPDATE \`transactions\` SET
        \`type\` = ?,
        \`description\` = ?,
        \`amount\` = ?,
        \`transaction_date\` = ?,
        \`source_account_id\` = ?,
        \`destination_account_id\` = ?,
        \`responsible_user_id\` = ?,
        \`category_id\` = ?,
        \`contact_id\` = ?,
        \`notes\` = ?,
        \`updated_at\` = NOW()
       WHERE \`id\` = ? AND \`family_id\` = ?`,
      [
        type,
        description,
        amount,
        transaction_date,
        source_account_id || null,
        destination_account_id || null,
        responsible_user_id,
        category_id || null,
        contact_id || null,
        notes || null,
        id,
        familyId
      ]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Movimentação não encontrada.' });
    }

    const userId = req.session!.userId;
    const userName = await getUserName(userId);
    const formattedAmount = Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    await notifyFamily({
      familyId,
      actorUserId: userId,
      module: 'transaction',
      action: 'update',
      title: 'Lançamento Alterado',
      message: `${userName} alterou o lançamento '${description}' (${formattedAmount}).`
    });

    res.json({ success: true, message: 'Movimentação atualizada com sucesso.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/transactions/:id
 * Remove uma movimentação financeira existente
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { id } = req.params;

  try {
    const [result] = await query(
      'DELETE FROM `transactions` WHERE `id` = ? AND `family_id` = ?',
      [id, familyId]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Movimentação não encontrada.' });
    }

    const userId = req.session!.userId;
    const userName = await getUserName(userId);
    await notifyFamily({
      familyId,
      actorUserId: userId,
      module: 'transaction',
      action: 'delete',
      title: 'Lançamento Excluído',
      message: `${userName} excluiu um lançamento financeiro.`
    });

    res.json({ success: true, message: 'Movimentação excluída com sucesso.' });
  } catch (err) {
    next(err);
  }
});

export default router;
