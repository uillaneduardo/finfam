/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { 
  financialAmountSchema, 
  strongPasswordSchema, 
  transactionSchema,
  accountSchema 
} from './validation.schemas';

describe('Validation Schemas Tests', () => {
  describe('financialAmountSchema', () => {
    it('should validate positive amounts up to 2 decimal places', () => {
      expect(financialAmountSchema.safeParse(100.5).success).toBe(true);
      expect(financialAmountSchema.safeParse(100.55).success).toBe(true);
      expect(financialAmountSchema.safeParse(10).success).toBe(true);
      expect(financialAmountSchema.safeParse('123.45').success).toBe(true);
    });

    it('should reject non-positive amounts (zero or negative)', () => {
      expect(financialAmountSchema.safeParse(0).success).toBe(false);
      expect(financialAmountSchema.safeParse(-5).success).toBe(false);
    });

    it('should reject NaN or Infinity', () => {
      expect(financialAmountSchema.safeParse(NaN).success).toBe(false);
      expect(financialAmountSchema.safeParse(Infinity).success).toBe(false);
    });

    it('should reject amounts with more than 2 decimal places', () => {
      expect(financialAmountSchema.safeParse(100.555).success).toBe(false);
    });
  });

  describe('strongPasswordSchema', () => {
    it('should accept passwords with upper, lower, number, special character and min 8 characters', () => {
      expect(strongPasswordSchema.safeParse('P@ssword1').success).toBe(true);
    });

    it('should reject short passwords', () => {
      expect(strongPasswordSchema.safeParse('P@s1').success).toBe(false);
    });

    it('should reject passwords without uppercase letters', () => {
      expect(strongPasswordSchema.safeParse('p@ssword1').success).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      expect(strongPasswordSchema.safeParse('P@sswordx').success).toBe(false);
    });

    it('should reject passwords without special characters', () => {
      expect(strongPasswordSchema.safeParse('Password12').success).toBe(false);
    });
  });

  describe('transactionSchema', () => {
    it('should reject expense if source_account_id is missing', () => {
      const res = transactionSchema.safeParse({
        type: 'expense',
        description: 'Buying food',
        amount: 25.5,
        transaction_date: '2026-07-20',
        responsible_user_id: 1,
      });
      expect(res.success).toBe(false);
    });

    it('should reject income if destination_account_id is missing', () => {
      const res = transactionSchema.safeParse({
        type: 'income',
        description: 'Salary',
        amount: 3000,
        transaction_date: '2026-07-20',
        responsible_user_id: 1,
      });
      expect(res.success).toBe(false);
    });

    it('should validate complete correct transaction', () => {
      const res = transactionSchema.safeParse({
        type: 'expense',
        description: 'Rent',
        amount: 500,
        transaction_date: '2026-07-20',
        source_account_id: 2,
        responsible_user_id: 1,
      });
      expect(res.success).toBe(true);
    });
  });
});
