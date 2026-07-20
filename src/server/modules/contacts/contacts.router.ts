/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { contactSchema } from '../../schemas/validation.schemas';

const router = express.Router();

/**
 * GET /api/contacts
 * Lista de contatos/fornecedores/clientes cadastrados para a família
 */
router.get('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;

  try {
    const [rows] = await query('SELECT * FROM `contacts` WHERE `family_id` = ? AND `status` = "active" ORDER BY `name` ASC', [familyId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/contacts
 * Criação de novo contato associado à família
 */
router.post('/', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const userId = req.session!.userId;

  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { name, type, phone, document_number, pix_key, notes } = parsed.data;

  try {
    const [result] = await query(
      'INSERT INTO `contacts` (`family_id`, `name`, `type`, `phone`, `document_number`, `pix_key`, `status`, `notes`, `created_by_id`) VALUES (?, ?, ?, ?, ?, ?, "active", ?, ?)',
      [familyId, name, type, phone || null, document_number || null, pix_key || null, notes || null, userId]
    );

    res.status(201).json({
      success: true,
      contactId: result.insertId,
      message: 'Contato financeiro cadastrado com sucesso.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
