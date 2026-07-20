/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { validateTestEnvironment } from './dbSecurity';

describe('Database Security Protection Unit Tests', () => {
  it('should accept NODE_ENV=test and DB_NAME=finfam_test', () => {
    expect(() => {
      validateTestEnvironment('test', 'finfam_test', 'finfam_db');
    }).not.toThrow();
  });

  it('should accept another name ending in _test', () => {
    expect(() => {
      validateTestEnvironment('test', 'my_custom_db_test', 'finfam_db');
    }).not.toThrow();
  });

  it('should reject NODE_ENV=development', () => {
    expect(() => {
      validateTestEnvironment('development', 'finfam_test', 'finfam_db');
    }).toThrow('Testes de integração bloqueados');
  });

  it('should reject NODE_ENV=production', () => {
    expect(() => {
      validateTestEnvironment('production', 'finfam_test', 'finfam_db');
    }).toThrow('Testes de integração bloqueados');
  });

  it('should reject DB_NAME=finfam_db', () => {
    expect(() => {
      validateTestEnvironment('test', 'finfam_db', 'finfam_db');
    }).toThrow('Testes de integração bloqueados');
  });

  it('should reject DB_NAME without _test suffix', () => {
    expect(() => {
      validateTestEnvironment('test', 'finfam_production', 'finfam_db');
    }).toThrow('Testes de integração bloqueados');
  });

  it('should reject empty or undefined DB_NAME', () => {
    expect(() => {
      validateTestEnvironment('test', '', 'finfam_db');
    }).toThrow('Testes de integração bloqueados');
  });

  it('should reject DB_NAME equal to normal database name', () => {
    expect(() => {
      validateTestEnvironment('test', 'app_prod_db_test', 'app_prod_db_test');
    }).toThrow('Testes de integração bloqueados');
  });
});
