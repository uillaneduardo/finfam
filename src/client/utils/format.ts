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
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // Handle standard YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss at start
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return str;
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch {
    return str;
  }
}

/**
 * Format string ISO date/timestamp to pt-BR date and time (dd/mm/yyyy às HH:mm)
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return formatDate(str);

    // If date string is purely a date without time (e.g. YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return formatDate(str);
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return formatDate(str);
  }
}

/**
 * Format a transaction's date and registration time in pt-BR standard (dd/mm/yyyy às HH:mm)
 */
export function formatTransactionDateTime(tx: { transaction_date?: string; created_at?: string }): string {
  if (!tx) return '';
  const dateFormatted = formatDate(tx.transaction_date || tx.created_at);
  if (tx.created_at) {
    try {
      const date = new Date(tx.created_at);
      if (!isNaN(date.getTime())) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${dateFormatted} às ${hours}:${minutes}`;
      }
    } catch {
      // Fallback
    }
  }
  return dateFormatted;
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
