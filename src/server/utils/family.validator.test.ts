/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkFamilyOwnership, validateRelatedEntities, CrossFamilyAccessError } from './family.validator';
import * as db from '../database/db';

// Mock the query function from db
vi.mock('../database/db', () => ({
  query: vi.fn()
}));

describe('Family Validator Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkFamilyOwnership', () => {
    it('should return true if ID is null or undefined', async () => {
      const resNull = await checkFamilyOwnership('accounts', null, 1);
      const resUndefined = await checkFamilyOwnership('accounts', undefined, 1);
      expect(resNull).toBe(true);
      expect(resUndefined).toBe(true);
    });

    it('should return true if record exists and belongs to the specified family', async () => {
      vi.mocked(db.query).mockResolvedValue([[ { id: 1 } ], []]);

      const res = await checkFamilyOwnership('accounts', 42, 1);
      expect(res).toBe(true);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT 1 FROM `accounts` WHERE `id` = ? AND `family_id` = ?',
        [42, 1]
      );
    });

    it('should throw CrossFamilyAccessError if record does not exist or belongs to another family', async () => {
      vi.mocked(db.query).mockResolvedValue([[], []]);

      await expect(checkFamilyOwnership('accounts', 99, 1))
        .rejects
        .toThrow(CrossFamilyAccessError);
    });
  });

  describe('validateRelatedEntities', () => {
    it('should check family ownership for all provided entity IDs', async () => {
      vi.mocked(db.query).mockResolvedValue([[ { id: 1 } ], []]);

      await validateRelatedEntities(1, {
        account_id: 10,
        responsible_user_id: 5,
        category_id: 3,
        estimated_account_id: 12
      });

      // It should call query for each of the entities checkFamilyOwnership
      expect(db.query).toHaveBeenCalledTimes(4);
    });

    it('should propagate rejection if one of the ownership checks fails', async () => {
      // First call succeeds, second call fails
      vi.mocked(db.query)
        .mockResolvedValueOnce([[ { id: 1 } ], []]) // account_id check succeeds
        .mockResolvedValueOnce([[], []]);             // responsible_user_id check fails

      await expect(validateRelatedEntities(1, {
        account_id: 10,
        responsible_user_id: 5
      })).rejects.toThrow(CrossFamilyAccessError);
    });
  });
});
