/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query, transaction } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { CommitmentStatus } from '../../../shared/types';
import { commitmentSchema, quitaçãoSchema } from '../../schemas/validation.schemas';
import { validateRelatedEntities } from '../../utils/family.validator';

const router = express.Router();

/**
 * Helper to get the current date in the America/Fortaleza timezone
 */
function getTodayFortaleza(): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Helper to calculate the difference in days (overdue count)
 */
function getDaysOverdue(dueDateStr: string, todayStr: string): number {
  const due = new Date(dueDateStr + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * GET /api/commitments
 * Retorna os compromissos agendados futuros e em atraso
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    const [rows] = await query('SELECT * FROM `commitments` WHERE `family_id` = ? ORDER BY `due_date` ASC', [familyId]);
    
    const todayStr = getTodayFortaleza();
    
    const enhancedRows = rows.map(item => {
      let daysOverdue = 0;
      let label = item.status === 'pending' ? 'Pendente' : 'Pago';
      
      if (item.status === 'pending') {
        const overdue = getDaysOverdue(item.due_date, todayStr);
        if (overdue > 0) {
          daysOverdue = overdue;
          label = `Atrasado há ${overdue} ${overdue === 1 ? 'dia' : 'dias'}`;
        } else if (item.due_date === todayStr) {
          label = 'Vence Hoje';
        }
      }
      
      return {
        ...item,
        days_overdue: daysOverdue,
        status_label: label
      };
    });

    res.json(enhancedRows);
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

  // 1. Zod validation
  const parsed = commitmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

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
  } = parsed.data;

  try {
    // 2. Cross-family checks
    await validateRelatedEntities(familyId, {
      contact_id,
      responsible_user_id,
      estimated_account_id,
      category_id
    });

    const [result] = await query(
      'INSERT INTO `commitments` (`family_id`, `type`, `description`, `estimated_amount`, `due_date`, `contact_id`, `responsible_user_id`, `estimated_account_id`, `category_id`, `status`, `recurrence_type`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        familyId,
        type,
        description,
        estimated_amount,
        due_date,
        contact_id || null,
        responsible_user_id,
        estimated_account_id || null,
        category_id || null,
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

  // 1. Zod validation
  const parsed = quitaçãoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { actual_amount, actual_date, account_id } = parsed.data;

  try {
    // 2. Validate that the account belongs to the family
    await validateRelatedEntities(familyId, { account_id });

    // 3. Verify that the account is active
    const [accRows] = await query('SELECT `status` FROM `accounts` WHERE `id` = ?', [account_id]);
    if (accRows[0]?.status !== 'active') {
      return res.status(400).json({
        error: 'INACTIVE_ACCOUNT',
        message: 'Lançamentos não são permitidos em uma conta financeira inativa.'
      });
    }

    // 4. Fetch commitment
    const [commitments] = await query(
      'SELECT * FROM `commitments` WHERE `id` = ? AND `family_id` = ? LIMIT 1',
      [commitmentId, familyId]
    );
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
    const sourceAcc = commitment.type === 'to_pay' ? account_id : null;
    const destAcc = commitment.type === 'to_receive' ? account_id : null;

    // 5. Execute quitação atomically
    await transaction(async (runQuery) => {
      // Create actual real-life transaction linked to the commitment
      const txResult = await runQuery(
        'INSERT INTO `transactions` (`family_id`, `type`, `description`, `amount`, `transaction_date`, `source_account_id`, `destination_account_id`, `responsible_user_id`, `category_id`, `contact_id`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          familyId,
          txType,
          `Quitação: ${commitment.description}`,
          actual_amount,
          actual_date,
          sourceAcc,
          destAcc,
          commitment.responsible_user_id,
          commitment.category_id,
          commitment.contact_id,
          commitment.notes,
          userId
        ]
      );
      const transactionId = txResult.insertId;

      // Update commitment
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await runQuery(
        'UPDATE `commitments` SET `status` = ?, `actual_amount` = ?, `actual_date` = ?, `transaction_id` = ?, `updated_at` = ? WHERE `id` = ?',
        [CommitmentStatus.PAID, actual_amount, actual_date, transactionId, now, commitmentId]
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
