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
import { notifyFamily, getUserName } from '../notifications/notifications.service';

const router = express.Router();

/**
 * Helper to get the current date in the system timezone
 */
function getTodayFortaleza(): string {
  const systemTimezone = process.env.TIMEZONE || 'America/Fortaleza';
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: systemTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Helper to safely format a date from DB (Date object or string) to a clean YYYY-MM-DD format
 */
function formatDateString(dateVal: any): string {
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(dateVal).substring(0, 10);
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
      
      const dueDateStr = formatDateString(item.due_date);
      
      if (item.status === 'pending') {
        const overdue = getDaysOverdue(dueDateStr, todayStr);
        if (overdue > 0) {
          daysOverdue = overdue;
          label = `Atrasado há ${overdue} ${overdue === 1 ? 'dia' : 'dias'}`;
        } else if (dueDateStr === todayStr) {
          label = 'Vence Hoje';
        }
      }
      
      return {
        ...item,
        due_date: dueDateStr,
        days_overdue: daysOverdue,
        status_label: label
      };
    });

    res.json(enhancedRows);
  } catch (err) {
    next(err);
  }
});

function calculateNextDueDate(baseDateStr: string, index: number, recurrenceType: string): string {
  if (index === 0 || recurrenceType === 'none') return baseDateStr;

  const [yearStr, monthStr, dayStr] = baseDateStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1;
  let day = parseInt(dayStr, 10);

  if (recurrenceType === 'weekly') {
    const date = new Date(year, month, day);
    date.setDate(date.getDate() + (index * 7));
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (recurrenceType === 'biweekly') {
    const date = new Date(year, month, day);
    date.setDate(date.getDate() + (index * 14));
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (recurrenceType === 'monthly') {
    month += index;
    const targetDate = new Date(year, month, 1);
    year = targetDate.getFullYear();
    month = targetDate.getMonth();
    const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
    const validDay = Math.min(day, daysInTargetMonth);
    const m = String(month + 1).padStart(2, '0');
    const d = String(validDay).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  if (recurrenceType === 'yearly') {
    year += index;
    const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
    const validDay = Math.min(day, daysInTargetMonth);
    const m = String(month + 1).padStart(2, '0');
    const d = String(validDay).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  return baseDateStr;
}

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
    recurrence_count,
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

    const count = (recurrence_type && recurrence_type !== 'none') ? Math.max(1, recurrence_count || 1) : 1;
    let firstInsertId = 0;

    for (let i = 0; i < count; i++) {
      const itemDueDate = calculateNextDueDate(due_date, i, recurrence_type || 'none');
      const itemDescription = count > 1 ? `${description} (${i + 1}/${count})` : description;

      const [result] = await query(
        'INSERT INTO `commitments` (`family_id`, `type`, `description`, `estimated_amount`, `due_date`, `contact_id`, `responsible_user_id`, `estimated_account_id`, `category_id`, `status`, `recurrence_type`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          familyId,
          type,
          itemDescription,
          estimated_amount,
          itemDueDate,
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

      if (i === 0) {
        firstInsertId = result.insertId;
      }
    }

    const userName = await getUserName(userId);
    const unitAmountFormatted = Number(estimated_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let notificationMessage = '';
    if (count > 1) {
      const totalAmountFormatted = (Number(estimated_amount) * count).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      notificationMessage = `${userName} agendou o compromisso recorrente '${description}' em ${count} parcelas de ${unitAmountFormatted} (Total: ${totalAmountFormatted}).`;
    } else {
      notificationMessage = `${userName} agendou o compromisso '${description}' (${unitAmountFormatted}).`;
    }

    await notifyFamily({
      familyId,
      actorUserId: userId,
      module: 'commitment',
      action: 'create',
      title: 'Compromisso Agendado',
      message: notificationMessage
    });

    res.status(201).json({
      success: true,
      commitmentId: firstInsertId,
      message: count > 1 
        ? `${count} parcelas recorrentes do compromisso foram agendadas com sucesso.` 
        : 'Compromisso agendado com sucesso.'
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
    const result = await transaction(async (runQuery) => {
      // 2. Fetch commitment with SELECT ... FOR UPDATE to lock the row
      const commitments = await runQuery(
        'SELECT * FROM `commitments` WHERE `id` = ? AND `family_id` = ? FOR UPDATE',
        [commitmentId, familyId]
      );
      const commitment = commitments[0];

      if (!commitment) {
        return {
          status: 404,
          body: {
            error: 'NOT_FOUND',
            message: 'Compromisso financeiro não encontrado.'
          }
        };
      }

      // 3. Confirm that status is pending inside the transaction
      if (commitment.status !== CommitmentStatus.PENDING) {
        return {
          status: 400,
          body: {
            error: 'ALREADY_PAID',
            message: 'Este compromisso já se encontra liquidado/pago.'
          }
        };
      }

      // 4. Validate account inside the same transaction using FOR UPDATE to lock
      const accounts = await runQuery(
        'SELECT * FROM `accounts` WHERE `id` = ? AND `family_id` = ? FOR UPDATE',
        [account_id, familyId]
      );
      const account = accounts[0];

      if (!account) {
        return {
          status: 404,
          body: {
            error: 'NOT_FOUND',
            message: 'Conta financeira não encontrada.'
          }
        };
      }

      if (account.status !== 'active') {
        return {
          status: 400,
          body: {
            error: 'INACTIVE_ACCOUNT',
            message: 'Lançamentos não são permitidos em uma conta financeira inativa.'
          }
        };
      }

      // Determine transaction direction
      const txType = commitment.type === 'to_pay' ? 'expense' : 'income';
      const sourceAcc = commitment.type === 'to_pay' ? account_id : null;
      const destAcc = commitment.type === 'to_receive' ? account_id : null;

      // 5. Create actual real-life transaction linked to the commitment
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

      // 6. Update commitment using id, family_id and status = pending
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const updateResult = await runQuery(
        'UPDATE `commitments` SET `status` = ?, `actual_amount` = ?, `actual_date` = ?, `transaction_id` = ?, `updated_at` = ? WHERE `id` = ? AND `family_id` = ? AND `status` = ?',
        [
          CommitmentStatus.PAID,
          actual_amount,
          actual_date,
          transactionId,
          now,
          commitmentId,
          familyId,
          CommitmentStatus.PENDING
        ]
      );

      // Confirm exactly one row was updated
      if (updateResult.affectedRows !== 1) {
        throw new Error('CONCURRENCY_ERROR: Compromisso já liquidado por outra transação simultânea.');
      }

      const userName = await getUserName(userId);
      const formattedAmount = Number(actual_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      await notifyFamily({
        familyId,
        actorUserId: userId,
        module: 'commitment',
        action: 'update',
        title: 'Compromisso Quitado',
        message: `${userName} quitou o compromisso '${commitment.description}' (${formattedAmount}).`
      });

      return {
        status: 200,
        body: {
          success: true,
          message: 'Compromisso liquidado com sucesso e transação financeira respectiva registrada.'
        }
      };
    });

    return res.status(result.status).json(result.body);
  } catch (err: any) {
    if (err.message && err.message.includes('CONCURRENCY_ERROR')) {
      return res.status(409).json({
        error: 'CONCURRENCY_ERROR',
        message: 'Não foi possível quitar o compromisso. Ele já foi processado ou está sendo processado por outra requisição.'
      });
    }
    next(err);
  }
});

/**
 * PUT /api/commitments/:id
 * Atualiza um compromisso financeiro existente
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { id } = req.params;

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
    await validateRelatedEntities(familyId, {
      contact_id,
      responsible_user_id,
      estimated_account_id,
      category_id
    });

    const [result] = await query(
      `UPDATE \`commitments\` SET
        \`type\` = ?,
        \`description\` = ?,
        \`estimated_amount\` = ?,
        \`due_date\` = ?,
        \`contact_id\` = ?,
        \`responsible_user_id\` = ?,
        \`estimated_account_id\` = ?,
        \`category_id\` = ?,
        \`recurrence_type\` = ?,
        \`notes\` = ?,
        \`updated_at\` = NOW()
       WHERE \`id\` = ? AND \`family_id\` = ?`,
      [
        type,
        description,
        estimated_amount,
        due_date,
        contact_id || null,
        responsible_user_id,
        estimated_account_id || null,
        category_id || null,
        recurrence_type || 'none',
        notes || null,
        id,
        familyId
      ]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Compromisso não encontrado.' });
    }

    const userId = req.session!.userId;
    const userName = await getUserName(userId);
    const formattedAmount = Number(estimated_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    await notifyFamily({
      familyId,
      actorUserId: userId,
      module: 'commitment',
      action: 'update',
      title: 'Compromisso Alterado',
      message: `${userName} alterou o compromisso '${description}' (${formattedAmount}).`
    });

    res.json({ success: true, message: 'Compromisso atualizado com sucesso.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/commitments/:id
 * Remove um compromisso financeiro existente
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { id } = req.params;

  try {
    const [result] = await query(
      'DELETE FROM `commitments` WHERE `id` = ? AND `family_id` = ?',
      [id, familyId]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Compromisso não encontrado.' });
    }

    const userId = req.session!.userId;
    const userName = await getUserName(userId);
    await notifyFamily({
      familyId,
      actorUserId: userId,
      module: 'commitment',
      action: 'delete',
      title: 'Compromisso Removido',
      message: `${userName} excluiu um compromisso da família.`
    });

    res.json({ success: true, message: 'Compromisso excluído com sucesso.' });
  } catch (err) {
    next(err);
  }
});

export default router;
