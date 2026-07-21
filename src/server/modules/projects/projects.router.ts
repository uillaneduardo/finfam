/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query, transaction } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { ProjectStatus, ProjectOperationType } from '../../../shared/types';
import { projectSchema, aporteSchema, resgateSchema } from '../../schemas/validation.schemas';
import { validateRelatedEntities } from '../../utils/family.validator';

const router = express.Router();

/**
 * GET /api/projects
 * Retorna os projetos/caixinhas com seus saldos acumulados calculados dinamicamente
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    // 1. Fetch projects
    const [projects] = await query('SELECT * FROM `projects` WHERE `family_id` = ?', [familyId]);
    
    // 2. Fetch operations for progress calculation
    const [operations] = await query('SELECT * FROM `project_operations` WHERE `family_id` = ?', [familyId]);

    const projectsWithProgress = projects.map(project => {
      let currentAmountCents = 0;

      operations.forEach(op => {
        if (op.project_id === project.id) {
          const amountCents = Math.round(Number(op.amount) * 100);
          if (op.operation_type === 'deposit') {
            currentAmountCents += amountCents;
          } else if (op.operation_type === 'withdrawal') {
            currentAmountCents -= amountCents;
          }
        }
      });

      const currentAmount = currentAmountCents / 100;
      const targetAmount = Number(project.target_amount);

      return {
        ...project,
        current_amount: currentAmount,
        progress_percentage: targetAmount > 0 
          ? Math.min(100, Math.round((currentAmountCents / (targetAmount * 100)) * 100)) 
          : 0
      };
    });

    res.json(projectsWithProgress);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects
 * Cria uma nova caixinha/projeto de reserva
 */
router.post('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;

  // 1. Zod validation
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { type, name, description, target_amount, deadline, responsible_user_id, notes } = parsed.data;

  try {
    // 2. Cross-family check
    await validateRelatedEntities(familyId, { responsible_user_id });

    const [result] = await query(
      'INSERT INTO `projects` (`family_id`, `type`, `name`, `description`, `target_amount`, `deadline`, `responsible_user_id`, `status`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        familyId,
        type,
        name,
        description,
        target_amount,
        deadline || null,
        responsible_user_id,
        ProjectStatus.ACTIVE,
        notes || null,
        userId
      ]
    );

    res.status(201).json({
      success: true,
      projectId: result.insertId,
      message: 'Reserva/projeto de caixinha cadastrado com sucesso.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper to fetch and lock an account, calculating its nominal and free balances.
 */
async function getAccountBalancesForUpdate(runQuery: any, accountId: number, familyId: number) {
  // 1. Select account for update to avoid race conditions
  const accountRows = await runQuery(
    'SELECT `initial_balance`, `status` FROM `accounts` WHERE `id` = ? AND `family_id` = ? FOR UPDATE',
    [accountId, familyId]
  );
  if (accountRows.length === 0) {
    const error: any = new Error('Conta real não encontrada.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  const account = accountRows[0];
  const initialBalance = Number(account.initial_balance);

  // 2. Sum income
  const incomeRows = await runQuery(
    'SELECT COALESCE(SUM(`amount`), 0) as total FROM `transactions` WHERE `family_id` = ? AND `type` = "income" AND `destination_account_id` = ?',
    [familyId, accountId]
  );
  const incomeTotal = Number(incomeRows[0]?.total || 0);

  // 3. Sum expense
  const expenseRows = await runQuery(
    'SELECT COALESCE(SUM(`amount`), 0) as total FROM `transactions` WHERE `family_id` = ? AND `type` = "expense" AND `source_account_id` = ?',
    [familyId, accountId]
  );
  const expenseTotal = Number(expenseRows[0]?.total || 0);

  // 4. Sum transfer to
  const transferToRows = await runQuery(
    'SELECT COALESCE(SUM(`amount`), 0) as total FROM `transactions` WHERE `family_id` = ? AND `type` = "transfer" AND `destination_account_id` = ?',
    [familyId, accountId]
  );
  const transferToTotal = Number(transferToRows[0]?.total || 0);

  // 5. Sum transfer from
  const transferFromRows = await runQuery(
    'SELECT COALESCE(SUM(`amount`), 0) as total FROM `transactions` WHERE `family_id` = ? AND `type` = "transfer" AND `source_account_id` = ?',
    [familyId, accountId]
  );
  const transferFromTotal = Number(transferFromRows[0]?.total || 0);

  const initialBalanceCents = Math.round(initialBalance * 100);
  const incomeCents = Math.round(incomeTotal * 100);
  const expenseCents = Math.round(expenseTotal * 100);
  const transferToCents = Math.round(transferToTotal * 100);
  const transferFromCents = Math.round(transferFromTotal * 100);

  const nominalBalanceCents = initialBalanceCents + incomeCents - expenseCents + transferToCents - transferFromCents;

  // 6. Sum project deposits on this account
  const depositRows = await runQuery(
    'SELECT COALESCE(SUM(`amount`), 0) as total FROM `project_operations` WHERE `family_id` = ? AND `operation_type` = "deposit" AND `source_account_id` = ?',
    [familyId, accountId]
  );
  const depositTotal = Number(depositRows[0]?.total || 0);
  const depositCents = Math.round(depositTotal * 100);

  // 7. Sum project withdrawals on this account
  const withdrawRows = await runQuery(
    'SELECT COALESCE(SUM(`amount`), 0) as total FROM `project_operations` WHERE `family_id` = ? AND `operation_type` = "withdrawal" AND `destination_account_id` = ?',
    [familyId, accountId]
  );
  const withdrawTotal = Number(withdrawRows[0]?.total || 0);
  const withdrawCents = Math.round(withdrawTotal * 100);

  const reservedBalanceCents = depositCents - withdrawCents;
  const freeBalanceCents = nominalBalanceCents - reservedBalanceCents;

  return {
    nominalBalance: nominalBalanceCents / 100,
    reservedBalance: reservedBalanceCents / 100,
    freeBalance: freeBalanceCents / 100,
    status: account.status
  };
}

/**
 * POST /api/projects/:id/deposit
 * Realiza aporte financeiro reservando saldo de uma conta real da família
 */
router.post('/:id/deposit', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;
  const projectId = Number(req.params.id);

  // 1. Zod validation
  const parsed = aporteSchema.safeParse({
    ...req.body,
    project_id: projectId
  });
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { amount, source_account_id, operation_date, notes } = parsed.data;

  try {
    // 2. Perform within a single atomic ACID transaction
    await transaction(async (runQuery) => {
      // a. Verify project exists, belongs to family and is ACTIVE
      const projectRows = await runQuery(
        'SELECT `status` FROM `projects` WHERE `id` = ? AND `family_id` = ? FOR UPDATE',
        [projectId, familyId]
      );
      if (projectRows.length === 0) {
        const error: any = new Error('Reserva/projeto de caixinha não encontrado.');
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }
      if (projectRows[0].status !== ProjectStatus.ACTIVE) {
        const error: any = new Error('Operações não são permitidas em projetos/reservas pausados, concluídos ou cancelados.');
        error.statusCode = 400;
        error.code = 'INACTIVE_PROJECT';
        throw error;
      }

      // b. Verify account status and balances
      const accountData = await getAccountBalancesForUpdate(runQuery, source_account_id, familyId);
      if (accountData.status !== 'active') {
        const error: any = new Error('Não é possível realizar aportes a partir de uma conta inativa.');
        error.statusCode = 400;
        error.code = 'INACTIVE_ACCOUNT';
        throw error;
      }

      // c. Check if free balance is sufficient
      if (amount > accountData.freeBalance) {
        const error: any = new Error(`Saldo livre insuficiente nesta conta para realizar este aporte. Saldo livre disponível: R$ ${accountData.freeBalance.toFixed(2)}.`);
        error.statusCode = 400;
        error.code = 'INSUFFICIENT_FREE_BALANCE';
        throw error;
      }

      // d. Insert deposit operation
      await runQuery(
        'INSERT INTO `project_operations` (`family_id`, `project_id`, `operation_type`, `amount`, `source_account_id`, `destination_account_id`, `operation_date`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)',
        [familyId, projectId, ProjectOperationType.DEPOSIT, amount, source_account_id, operation_date, notes || null, userId]
      );
    });

    res.json({
      success: true,
      message: 'Aporte de reserva realizado com sucesso. O saldo correspondente desta conta real foi reservado.'
    });
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: err.message });
    }
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.code || 'BAD_REQUEST', message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/projects/:id/withdraw
 * Resgata saldo poupado liberando o valor de volta para uma conta real da família
 */
router.post('/:id/withdraw', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;
  const projectId = Number(req.params.id);

  // 1. Zod validation
  const parsed = resgateSchema.safeParse({
    ...req.body,
    project_id: projectId
  });
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { amount, destination_account_id, operation_date, notes } = parsed.data;

  try {
    // 2. Perform within a single atomic ACID transaction
    await transaction(async (runQuery) => {
      // a. Verify project exists, belongs to family and is ACTIVE
      const projectRows = await runQuery(
        'SELECT `status` FROM `projects` WHERE `id` = ? AND `family_id` = ? FOR UPDATE',
        [projectId, familyId]
      );
      if (projectRows.length === 0) {
        const error: any = new Error('Reserva/projeto de caixinha não encontrado.');
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }
      if (projectRows[0].status !== ProjectStatus.ACTIVE) {
        const error: any = new Error('Operações não são permitidas em projetos/reservas pausados, concluídos ou cancelados.');
        error.statusCode = 400;
        error.code = 'INACTIVE_PROJECT';
        throw error;
      }

      // b. Verify account status
      const accountData = await getAccountBalancesForUpdate(runQuery, destination_account_id, familyId);
      if (accountData.status !== 'active') {
        const error: any = new Error('Não é possível realizar resgates para uma conta inativa.');
        error.statusCode = 400;
        error.code = 'INACTIVE_ACCOUNT';
        throw error;
      }

      // c. Calculate how much specifically this project has reserved on this specific account
      const depositRows = await runQuery(
        'SELECT COALESCE(SUM(`amount`), 0) as total FROM `project_operations` WHERE `family_id` = ? AND `project_id` = ? AND `operation_type` = "deposit" AND `source_account_id` = ?',
        [familyId, projectId, destination_account_id]
      );
      const depositTotal = Number(depositRows[0]?.total || 0);

      const withdrawRows = await runQuery(
        'SELECT COALESCE(SUM(`amount`), 0) as total FROM `project_operations` WHERE `family_id` = ? AND `project_id` = ? AND `operation_type` = "withdrawal" AND `destination_account_id` = ?',
        [familyId, projectId, destination_account_id]
      );
      const withdrawTotal = Number(withdrawRows[0]?.total || 0);

      const currentReservedOnAccount = depositTotal - withdrawTotal;

      // d. Validate that withdrawal amount does not exceed reserved amount on this specific account
      if (amount > currentReservedOnAccount) {
        const error: any = new Error(`Resgate superior ao saldo reservado especificamente nesta conta financeira. Valor atualmente reservado nesta conta: R$ ${currentReservedOnAccount.toFixed(2)}.`);
        error.statusCode = 400;
        error.code = 'INSUFFICIENT_RESERVED_BALANCE';
        throw error;
      }

      // e. Insert withdrawal operation
      await runQuery(
        'INSERT INTO `project_operations` (`family_id`, `project_id`, `operation_type`, `amount`, `source_account_id`, `destination_account_id`, `operation_date`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)',
        [familyId, projectId, ProjectOperationType.WITHDRAWAL, amount, destination_account_id, operation_date, notes || null, userId]
      );
    });

    res.json({
      success: true,
      message: 'Resgate de reserva efetuado com sucesso. O valor foi creditado de volta ao saldo livre da sua conta real.'
    });
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: err.message });
    }
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.code || 'BAD_REQUEST', message: err.message });
    }
    next(err);
  }
});

/**
 * PUT /api/projects/:id
 * Edita dados de um projeto/meta de reserva existente
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { id } = req.params;

  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { type, name, description, target_amount, deadline, responsible_user_id, notes } = parsed.data;

  try {
    await validateRelatedEntities(familyId, { responsible_user_id });

    const [result] = await query(
      `UPDATE \`projects\` SET
        \`type\` = ?,
        \`name\` = ?,
        \`description\` = ?,
        \`target_amount\` = ?,
        \`deadline\` = ?,
        \`responsible_user_id\` = ?,
        \`notes\` = ?,
        \`updated_at\` = NOW()
       WHERE \`id\` = ? AND \`family_id\` = ?`,
      [
        type,
        name,
        description,
        target_amount,
        deadline || null,
        responsible_user_id,
        notes || null,
        id,
        familyId
      ]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Projeto/meta não encontrado.' });
    }

    res.json({ success: true, message: 'Projeto atualizado com sucesso.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/projects/:id
 * Exclui um projeto/meta de reserva
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { id } = req.params;

  try {
    const [result] = await query(
      'DELETE FROM `projects` WHERE `id` = ? AND `family_id` = ?',
      [id, familyId]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Projeto não encontrado.' });
    }

    res.json({ success: true, message: 'Projeto excluído com sucesso.' });
  } catch (err) {
    next(err);
  }
});

export default router;
