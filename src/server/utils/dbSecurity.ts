/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export function getNormalDbName(): string {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const parsed = dotenv.parse(envContent);
      if (parsed.DB_NAME) {
        return parsed.DB_NAME;
      }
    } catch {
      // Ignore reading errors
    }
  }
  return 'finfam_db';
}

export function validateTestEnvironment(
  nodeEnv = process.env.NODE_ENV,
  dbName = process.env.DB_NAME || 'finfam_db',
  normalDbName = getNormalDbName()
): void {
  if (nodeEnv !== 'test') {
    throw new Error('Testes de integração bloqueados: configure NODE_ENV=test e um banco MySQL exclusivo cujo nome termine com "_test".');
  }

  if (!dbName || !dbName.endsWith('_test')) {
    throw new Error('Testes de integração bloqueados: configure NODE_ENV=test e um banco MySQL exclusivo cujo nome termine com "_test".');
  }

  if (dbName === 'finfam_db') {
    throw new Error('Testes de integração bloqueados: configure NODE_ENV=test e um banco MySQL exclusivo cujo nome termine com "_test".');
  }

  if (dbName === normalDbName) {
    throw new Error('Testes de integração bloqueados: configure NODE_ENV=test e um banco MySQL exclusivo cujo nome termine com "_test".');
  }
}
