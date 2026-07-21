/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { accountSchema } from '../../schemas/validation.schemas';

const router = express.Router();

/**
 * GET /api/accounts
 * Retorna as contas com saldos nominais e saldos livres calculados dinamicamente
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    // 1. Fetch accounts
    const [accounts] = await query('SELECT * FROM `accounts` WHERE `family_id` = ?', [familyId]);
    
    // 2. Fetch transactions for calculation
    const [transactions] = await query('SELECT * FROM `transactions` WHERE `family_id` = ?', [familyId]);
    
    // 3. Fetch project operations
    const [projectOps] = await query('SELECT * FROM `project_operations` WHERE `family_id` = ?', [familyId]);

    // Calculate balances using cent-based integers to avoid floating-point math errors
    const accountsWithBalances = accounts.map(account => {
      let balanceCents = Math.round(Number(account.initial_balance) * 100);

      // Account for transactions
      transactions.forEach(tx => {
        const amountCents = Math.round(Number(tx.amount) * 100);
        if (tx.type === 'income' && tx.destination_account_id === account.id) {
          balanceCents += amountCents;
        } else if (tx.type === 'expense' && tx.source_account_id === account.id) {
          balanceCents -= amountCents;
        } else if (tx.type === 'transfer') {
          if (tx.source_account_id === account.id) {
            balanceCents -= amountCents;
          }
          if (tx.destination_account_id === account.id) {
            balanceCents += amountCents;
          }
        }
      });

      // Account for project operations (depósitos reduzem saldo livre, retiradas aumentam saldo livre)
      let reservedCents = 0;
      projectOps.forEach(op => {
        const amountCents = Math.round(Number(op.amount) * 100);
        // Depósito na caixinha tira do saldo livre da conta
        if (op.operation_type === 'deposit' && op.source_account_id === account.id) {
          reservedCents += amountCents;
        }
        // Resgate da caixinha devolve para o saldo livre da conta
        if (op.operation_type === 'withdrawal' && op.destination_account_id === account.id) {
          reservedCents -= amountCents;
        }
      });

      const freeBalanceCents = balanceCents - reservedCents;

      return {
        ...account,
        nominal_balance: balanceCents / 100,
        reserved_balance: reservedCents / 100,
        free_balance: freeBalanceCents / 100
      };
    });

    res.json(accountsWithBalances);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/accounts
 * Cadastro de nova conta financeira
 */
router.post('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;

  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { name, institution, type, holder_name, account_identifier, pix_key, initial_balance, notes } = parsed.data;

  try {
    const [result] = await query(
      'INSERT INTO `accounts` (`family_id`, `name`, `institution`, `type`, `holder_name`, `account_identifier`, `pix_key`, `initial_balance`, `status`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [familyId, name, institution, type, holder_name, account_identifier || null, pix_key || null, initial_balance, 'active', notes || null, userId]
    );

    res.status(201).json({
      success: true,
      accountId: result.insertId,
      message: 'Conta financeira cadastrada com sucesso.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/accounts/:id
 * Atualiza uma conta financeira
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { id } = req.params;

  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { name, institution, type, holder_name, account_identifier, pix_key, initial_balance, notes } = parsed.data;

  try {
    const [result] = await query(
      `UPDATE \`accounts\` SET
        \`name\` = ?,
        \`institution\` = ?,
        \`type\` = ?,
        \`holder_name\` = ?,
        \`account_identifier\` = ?,
        \`pix_key\` = ?,
        \`initial_balance\` = ?,
        \`notes\` = ?,
        \`updated_at\` = NOW()
       WHERE \`id\` = ? AND \`family_id\` = ?`,
      [
        name,
        institution,
        type,
        holder_name,
        account_identifier || null,
        pix_key || null,
        initial_balance,
        notes || null,
        id,
        familyId
      ]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Conta financeira não encontrada.' });
    }

    res.json({ success: true, message: 'Conta financeira atualizada com sucesso.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/accounts/:id
 * Remove/arquiva uma conta financeira
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { id } = req.params;

  try {
    const [result] = await query(
      'DELETE FROM `accounts` WHERE `id` = ? AND `family_id` = ?',
      [id, familyId]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Conta não encontrada.' });
    }

    res.json({ success: true, message: 'Conta financeira excluída com sucesso.' });
  } catch (err) {
    next(err);
  }
});

export default router;
