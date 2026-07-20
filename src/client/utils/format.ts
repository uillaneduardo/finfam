/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format currency value to Brazilian Real (R$)
 */
export function formatCurrency(value: number | string): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numericValue);
}

/**
 * Format string ISO date to pt-BR (dd/mm/yyyy)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split(' ')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Normalizes a decimal string (which may use comma as a decimal separator) into a valid float string
 */
export function normalizeDecimal(value: string): string {
  if (!value) return '';
  // Replace comma with dot
  let clean = value.trim().replace(/,/g, '.');
  
  // If there are multiple dots (e.g. 1.200.50), keep only the last dot
  const parts = clean.split('.');
  if (parts.length > 2) {
    const decimal = parts.pop();
    clean = parts.join('') + '.' + decimal;
  }
  
  // Keep only digits, minus sign, and a single dot
  clean = clean.replace(/[^0-9.-]/g, '');
  
  return clean;
}
