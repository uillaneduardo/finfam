/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { query } from '../../database/db';
import { requireAuth } from '../../middleware/auth';
import { contactSchema } from '../../schemas/validation.schemas';
import { notifyFamily, getUserName } from '../notifications/notifications.service';

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

    const userName = await getUserName(userId);
    await notifyFamily({
      familyId,
      actorUserId: userId,
      module: 'contact',
      action: 'create',
      title: 'Contato Adicionado',
      message: `${userName} adicionou o contato '${name}'.`
    });

    res.status(201).json({
      success: true,
      contactId: result.insertId,
      message: 'Contato financeiro cadastrado com sucesso.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/contacts/:id
 * Atualização de contato financeiro
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const contactId = req.params.id;

  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: parsed.error.issues.map(err => err.message).join(', ')
    });
  }

  const { name, type, phone, document_number, pix_key, notes } = parsed.data;

  try {
    const [check] = await query('SELECT `id` FROM `contacts` WHERE `id` = ? AND `family_id` = ?', [contactId, familyId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Contato não encontrado.' });
    }

    await query(
      'UPDATE `contacts` SET `name` = ?, `type` = ?, `phone` = ?, `document_number` = ?, `pix_key` = ?, `notes` = ? WHERE `id` = ? AND `family_id` = ?',
      [name, type, phone || null, document_number || null, pix_key || null, notes || null, contactId, familyId]
    );

    const userId = req.session!.userId;
    const userName = await getUserName(userId);
    await notifyFamily({
      familyId,
      actorUserId: userId,
      module: 'contact',
      action: 'update',
      title: 'Contato Atualizado',
      message: `${userName} atualizou as informações do contato '${name}'.`
    });

    res.json({ success: true, message: 'Contato atualizado com sucesso.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/contacts/:id
 * Exclusão de contato financeiro
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  const familyId = req.session!.familyId;
  const contactId = req.params.id;

  try {
    const [check] = await query('SELECT `id` FROM `contacts` WHERE `id` = ? AND `family_id` = ?', [contactId, familyId]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Contato não encontrado.' });
    }

    await query('DELETE FROM `contacts` WHERE `id` = ? AND `family_id` = ?', [contactId, familyId]);

    const userId = req.session!.userId;
    const userName = await getUserName(userId);
    await notifyFamily({
      familyId,
      actorUserId: userId,
      module: 'contact',
      action: 'delete',
      title: 'Contato Removido',
      message: `${userName} excluiu um contato da família.`
    });

    res.json({ success: true, message: 'Contato removido com sucesso.' });
  } catch (err) {
    next(err);
  }
});

export default router;
