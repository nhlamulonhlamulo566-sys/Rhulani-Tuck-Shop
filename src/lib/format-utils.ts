/**
 * Utility function to safely convert values to fixed decimal places
 * Handles string values from database (MySQL DECIMAL types)
 */
export function toMoney(value: any, decimals: number = 2): string {
  if (value === null || value === undefined) return '0.00';
  return Number(value).toFixed(decimals);
}

/**
 * Alias for toMoney - use when you want the numeric value
 */
export function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}
