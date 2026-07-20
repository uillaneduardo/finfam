/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query } from '../../database/db';
import { requireAuth } from '../../middleware/auth';

const router = express.Router();

/**
 * GET /api/categories
 * Retorna as categorias de lançamentos cadastrados para a família
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    const [rows] = await query('SELECT * FROM `categories` WHERE `family_id` = ? AND `status` = "active" ORDER BY `name` ASC', [familyId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/categories
 * Cadastro de nova categoria personalizada para a família
 */
router.post('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const { name, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Nome da categoria e tipo (income/expense) são obrigatórios.'
    });
  }

  try {
    const [result] = await query(
      'INSERT INTO `categories` (`family_id`, `name`, `type`, `status`) VALUES (?, ?, ?, "active")',
      [familyId, name.trim(), type]
    );

    res.status(201).json({
      success: true,
      categoryId: result.insertId,
      message: 'Categoria cadastrada com sucesso.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
