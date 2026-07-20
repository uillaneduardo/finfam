/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { query } from '../database/db';

/**
 * Custom error class for cross-family resource access
 */
export class CrossFamilyAccessError extends Error {
  public statusCode = 404;
  public code = 'NOT_FOUND';
  
  constructor() {
    super('Recurso não encontrado.');
  }
}

/**
 * Validates that a record exists in the given table and belongs to the specified family.
 * Throws a CrossFamilyAccessError if ownership cannot be confirmed, which automatically
 * bubbles up and gets caught as a generic 404 Not Found error (hiding existence).
 */
export async function checkFamilyOwnership(
  tableName: string,
  id: number | null | undefined,
  familyId: number
): Promise<boolean> {
  if (id === null || id === undefined || Number.isNaN(id)) {
    return true;
  }

  const [rows] = await query(
    `SELECT 1 FROM \`${tableName}\` WHERE \`id\` = ? AND \`family_id\` = ?`,
    [id, familyId]
  );

  if (rows.length === 0) {
    throw new CrossFamilyAccessError();
  }

  return true;
}

/**
 * Helper to validate a batch of related entities in one go before executing a write.
 */
export async function validateRelatedEntities(
  familyId: number,
  entities: {
    account_id?: number | null;
    source_account_id?: number | null;
    destination_account_id?: number | null;
    responsible_user_id?: number | null;
    category_id?: number | null;
    contact_id?: number | null;
    project_id?: number | null;
    commitment_id?: number | null;
    transaction_id?: number | null;
    estimated_account_id?: number | null;
  }
) {
  const promises: Promise<boolean>[] = [];

  if (entities.account_id !== undefined) {
    promises.push(checkFamilyOwnership('accounts', entities.account_id, familyId));
  }
  if (entities.source_account_id !== undefined) {
    promises.push(checkFamilyOwnership('accounts', entities.source_account_id, familyId));
  }
  if (entities.destination_account_id !== undefined) {
    promises.push(checkFamilyOwnership('accounts', entities.destination_account_id, familyId));
  }
  if (entities.estimated_account_id !== undefined) {
    promises.push(checkFamilyOwnership('accounts', entities.estimated_account_id, familyId));
  }
  if (entities.responsible_user_id !== undefined) {
    promises.push(checkFamilyOwnership('users', entities.responsible_user_id, familyId));
  }
  if (entities.category_id !== undefined) {
    promises.push(checkFamilyOwnership('categories', entities.category_id, familyId));
  }
  if (entities.contact_id !== undefined) {
    promises.push(checkFamilyOwnership('contacts', entities.contact_id, familyId));
  }
  if (entities.project_id !== undefined) {
    promises.push(checkFamilyOwnership('projects', entities.project_id, familyId));
  }
  if (entities.commitment_id !== undefined) {
    promises.push(checkFamilyOwnership('commitments', entities.commitment_id, familyId));
  }
  if (entities.transaction_id !== undefined) {
    promises.push(checkFamilyOwnership('transactions', entities.transaction_id, familyId));
  }

  await Promise.all(promises);
}
