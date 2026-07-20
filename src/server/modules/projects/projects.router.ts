/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query, transaction } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { ProjectStatus, ProjectOperationType } from '../../../shared/types';

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
      let currentAmount = 0;

      operations.forEach(op => {
        if (op.project_id === project.id) {
          const amount = Number(op.amount);
          if (op.operation_type === 'deposit') {
            currentAmount += amount;
          } else if (op.operation_type === 'withdrawal') {
            currentAmount -= amount;
          }
        }
      });

      return {
        ...project,
        current_amount: currentAmount,
        progress_percentage: project.target_amount > 0 
          ? Math.min(100, Math.round((currentAmount / project.target_amount) * 100)) 
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
  const { type, name, description, target_amount, deadline, responsible_user_id, notes } = req.body;

  if (!type || !name || !target_amount || !responsible_user_id) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Tipo de meta, nome do projeto, valor alvo e usuário responsável são obrigatórios.'
    });
  }

  try {
    const [result] = await query(
      'INSERT INTO `projects` (`family_id`, `type`, `name`, `description`, `target_amount`, `deadline`, `responsible_user_id`, `status`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [familyId, type, name.trim(), description || null, Number(target_amount), deadline || null, Number(responsible_user_id), ProjectStatus.ACTIVE, notes || null, userId]
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
 * POST /api/projects/:id/deposit
 * Realiza aporte financeiro reservando saldo de uma conta real da família
 */
router.post('/:id/deposit', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;
  const projectId = Number(req.params.id);
  const { amount, source_account_id, operation_date, notes } = req.body;

  if (!amount || !source_account_id || !operation_date) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Valor do aporte, conta de origem e data da operação são obrigatórios.'
    });
  }

  try {
    // 1. Verify project exists
    const [projects] = await query('SELECT * FROM `projects` WHERE `id` = ? AND `family_id` = ? LIMIT 1', [projectId, familyId]);
    if (projects.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Caixinha de reserva não encontrada.' });
    }

    // 2. Perform Deposit within ACID transaction
    await transaction(async (runQuery) => {
      await runQuery(
        'INSERT INTO `project_operations` (`family_id`, `project_id`, `operation_type`, `amount`, `source_account_id`, `destination_account_id`, `operation_date`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)',
        [familyId, projectId, ProjectOperationType.DEPOSIT, Number(amount), Number(source_account_id), operation_date, notes || null, userId]
      );
    });

    res.json({
      success: true,
      message: 'Aporte de reserva realizado com sucesso. O saldo correspondente desta conta real foi reservado.'
    });
  } catch (err) {
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
  const { amount, destination_account_id, operation_date, notes } = req.body;

  if (!amount || !destination_account_id || !operation_date) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Valor do resgate, conta de destino e data da operação são obrigatórios.'
    });
  }

  try {
    // 1. Verify project exists
    const [projects] = await query('SELECT * FROM `projects` WHERE `id` = ? AND `family_id` = ? LIMIT 1', [projectId, familyId]);
    if (projects.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Caixinha de reserva não encontrada.' });
    }

    // 2. Perform Withdrawal within transaction
    await transaction(async (runQuery) => {
      await runQuery(
        'INSERT INTO `project_operations` (`family_id`, `project_id`, `operation_type`, `amount`, `source_account_id`, `destination_account_id`, `operation_date`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)',
        [familyId, projectId, ProjectOperationType.WITHDRAWAL, Number(amount), Number(destination_account_id), operation_date, notes || null, userId]
      );
    });

    res.json({
      success: true,
      message: 'Resgate de reserva efetuado com sucesso. O valor foi creditado de volta ao saldo livre da sua conta real.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
