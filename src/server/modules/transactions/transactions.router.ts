/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query, transaction } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { TransactionType } from '../../../shared/types';

const router = express.Router();

/**
 * GET /api/transactions
 * Retorna o histórico de movimentações da família
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    const [rows] = await query('SELECT * FROM `transactions` WHERE `family_id` = ? ORDER BY `transaction_date` DESC, `id` DESC', [familyId]);
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
  } = req.body;

  if (!type || !description || !amount || !transaction_date || !responsible_user_id) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Tipo de transação, descrição, valor, data e responsável são obrigatórios.'
    });
  }

  // Validate account mapping
  if (type === TransactionType.EXPENSE && !source_account_id) {
    return res.status(400).json({
      error: 'INVALID_ACCOUNTS',
      message: 'Uma despesa (saída) exige uma conta de origem.'
    });
  }
  if (type === TransactionType.INCOME && !destination_account_id) {
    return res.status(400).json({
      error: 'INVALID_ACCOUNTS',
      message: 'Uma receita (entrada) exige uma conta de destino.'
    });
  }
  if (type === TransactionType.TRANSFER && (!source_account_id || !destination_account_id)) {
    return res.status(400).json({
      error: 'INVALID_ACCOUNTS',
      message: 'Uma transferência exige contas de origem e destino preenchidas.'
    });
  }

  try {
    const result = await transaction(async (runQuery) => {
      // Create transaction
      const txResult = await runQuery(
        'INSERT INTO `transactions` (`family_id`, `type`, `description`, `amount`, `transaction_date`, `source_account_id`, `destination_account_id`, `responsible_user_id`, `category_id`, `contact_id`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          familyId,
          type,
          description.trim(),
          Number(amount),
          transaction_date,
          source_account_id ? Number(source_account_id) : null,
          destination_account_id ? Number(destination_account_id) : null,
          Number(responsible_user_id),
          category_id ? Number(category_id) : null,
          contact_id ? Number(contact_id) : null,
          notes || null,
          userId
        ]
      );
      return txResult;
    });

    res.status(201).json({
      success: true,
      transactionId: result.insertId,
      message: 'Movimentação registrada com sucesso.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
