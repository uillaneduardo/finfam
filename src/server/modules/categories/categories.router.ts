/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { categorySchema } from '../../schemas/validation.schemas';

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

  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { name, type } = parsed.data;

  try {
    const [result] = await query(
      'INSERT INTO `categories` (`family_id`, `name`, `type`, `status`) VALUES (?, ?, ?, "active")',
      [familyId, name, type]
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

/**
 * PUT /api/categories/:id
 * Atualização de categoria existente
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const categoryId = req.params.id;

  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { name, type } = parsed.data;

  try {
    const [check] = await query('SELECT `id` FROM `categories` WHERE `id` = ? AND `family_id` = ?', [categoryId, familyId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }

    await query(
      'UPDATE `categories` SET `name` = ?, `type` = ? WHERE `id` = ? AND `family_id` = ?',
      [name, type, categoryId, familyId]
    );

    res.json({ success: true, message: 'Categoria atualizada com sucesso.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/categories/:id
 * Exclusão de categoria
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const categoryId = req.params.id;

  try {
    const [check] = await query('SELECT `id` FROM `categories` WHERE `id` = ? AND `family_id` = ?', [categoryId, familyId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }

    await query('DELETE FROM `categories` WHERE `id` = ? AND `family_id` = ?', [categoryId, familyId]);

    res.json({ success: true, message: 'Categoria removida com sucesso.' });
  } catch (err) {
    next(err);
  }
});

export default router;
