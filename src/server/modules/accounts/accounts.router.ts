/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query } from '../../database/db';
import { requireAuth } from '../../middleware/auth';

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

    // Calculate balances
    const accountsWithBalances = accounts.map(account => {
      let balance = Number(account.initial_balance);

      // Account for transactions
      transactions.forEach(tx => {
        const amount = Number(tx.amount);
        if (tx.type === 'income' && tx.destination_account_id === account.id) {
          balance += amount;
        } else if (tx.type === 'expense' && tx.source_account_id === account.id) {
          balance -= amount;
        } else if (tx.type === 'transfer') {
          if (tx.source_account_id === account.id) {
            balance -= amount;
          }
          if (tx.destination_account_id === account.id) {
            balance += amount;
          }
        }
      });

      // Account for project operations (depósitos reduzem saldo livre, retiradas aumentam saldo livre)
      let reservedAmount = 0;
      projectOps.forEach(op => {
        const amount = Number(op.amount);
        // Depósito na caixinha tira do saldo livre da conta
        if (op.operation_type === 'deposit' && op.source_account_id === account.id) {
          reservedAmount += amount;
        }
        // Resgate da caixinha devolve para o saldo nominal e livre da conta
        if (op.operation_type === 'withdrawal' && op.destination_account_id === account.id) {
          reservedAmount -= amount;
        }
      });

      const freeBalance = balance - reservedAmount;

      return {
        ...account,
        nominal_balance: balance,
        reserved_balance: reservedAmount,
        free_balance: freeBalance
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
  const { name, institution, type, holder_name, account_identifier, pix_key, initial_balance, notes } = req.body;

  if (!name || !institution || !type || !holder_name) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Nome, instituição, tipo de conta e titular são obrigatórios.'
    });
  }

  try {
    const balance = Number(initial_balance || 0);
    const [result] = await query(
      'INSERT INTO `accounts` (`family_id`, `name`, `institution`, `type`, `holder_name`, `account_identifier`, `pix_key`, `initial_balance`, `status`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [familyId, name, institution, type, holder_name, account_identifier || null, pix_key || null, balance, 'active', notes || null, userId]
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

export default router;
