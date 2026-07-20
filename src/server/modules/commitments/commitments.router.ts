/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query, transaction } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { CommitmentStatus } from '../../../shared/types';

const router = express.Router();

/**
 * GET /api/commitments
 * Retorna os compromissos agendados futuros e em atraso
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    const [rows] = await query('SELECT * FROM `commitments` WHERE `family_id` = ? ORDER BY `due_date` ASC', [familyId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/commitments
 * Agenda um novo compromisso futuro (a pagar ou receber)
 */
router.post('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;

  const {
    type,
    description,
    estimated_amount,
    due_date,
    contact_id,
    responsible_user_id,
    estimated_account_id,
    category_id,
    recurrence_type,
    notes
  } = req.body;

  if (!type || !description || !estimated_amount || !due_date || !responsible_user_id) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Tipo de compromisso, descrição, valor previsto, data de vencimento e responsável são obrigatórios.'
    });
  }

  try {
    const [result] = await query(
      'INSERT INTO `commitments` (`family_id`, `type`, `description`, `estimated_amount`, `due_date`, `contact_id`, `responsible_user_id`, `estimated_account_id`, `category_id`, `status`, `recurrence_type`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        familyId,
        type,
        description.trim(),
        Number(estimated_amount),
        due_date,
        contact_id ? Number(contact_id) : null,
        Number(responsible_user_id),
        estimated_account_id ? Number(estimated_account_id) : null,
        category_id ? Number(category_id) : null,
        CommitmentStatus.PENDING,
        recurrence_type || 'none',
        notes || null,
        userId
      ]
    );

    res.status(201).json({
      success: true,
      commitmentId: result.insertId,
      message: 'Compromisso agendado com sucesso.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/commitments/:id/pay
 * Realiza a quitação assistida de um compromisso, gerando a transação financeira real correspondente
 */
router.post('/:id/pay', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;
  const commitmentId = Number(req.params.id);
  const { actual_amount, actual_date, account_id, notes } = req.body;

  if (!actual_amount || !actual_date || !account_id) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Valor pago/recebido, data da liquidação e conta financeira utilizada são obrigatórios.'
    });
  }

  try {
    // Fetch commitment
    const [commitments] = await query('SELECT * FROM `commitments` WHERE `id` = ? AND `family_id` = ? LIMIT 1', [commitmentId, familyId]);
    const commitment = commitments[0];

    if (!commitment) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Compromisso financeiro não encontrado.'
      });
    }

    if (commitment.status === CommitmentStatus.PAID) {
      return res.status(400).json({
        error: 'ALREADY_PAID',
        message: 'Este compromisso já se encontra liquidado/pago.'
      });
    }

    // Determine transaction direction
    const txType = commitment.type === 'to_pay' ? 'expense' : 'income';
    const sourceAcc = commitment.type === 'to_pay' ? Number(account_id) : null;
    const destAcc = commitment.type === 'to_receive' ? Number(account_id) : null;

    await transaction(async (runQuery) => {
      // 1. Insert actual transaction matching the payment
      const txResult = await runQuery(
        'INSERT INTO `transactions` (`family_id`, `type`, `description`, `amount`, `transaction_date`, `source_account_id`, `destination_account_id`, `responsible_user_id`, `category_id`, `contact_id`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          familyId,
          txType,
          `Quitação: ${commitment.description}`,
          Number(actual_amount),
          actual_date,
          sourceAcc,
          destAcc,
          commitment.responsible_user_id,
          commitment.category_id,
          commitment.contact_id,
          notes || commitment.notes,
          userId
        ]
      );
      const transactionId = txResult.insertId;

      // 2. Mark commitment as paid
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await runQuery(
        'UPDATE `commitments` SET `status` = ?, `actual_amount` = ?, `actual_date` = ?, `transaction_id` = ?, `updated_at` = ? WHERE `id` = ?',
        [CommitmentStatus.PAID, Number(actual_amount), actual_date, transactionId, now, commitmentId]
      );
    });

    res.json({
      success: true,
      message: 'Compromisso liquidado com sucesso e transação financeira respectiva registrada.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
