const ALLOWED_CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;

export function sanitizeString(input: unknown, maxLength: number = 100): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidCurrency(currency: unknown): currency is string {
  return typeof currency === "string" && ALLOWED_CURRENCIES.includes(currency as typeof ALLOWED_CURRENCIES[number]);
}

export function isValidAmount(amount: unknown): amount is number {
  if (typeof amount !== "number" && typeof amount !== "string") return false;
  const num = Number(amount);
  return !isNaN(num) && isFinite(num) && num > 0 && num <= 999999.99;
}

export function isValidUUID(id: unknown): id is string {
  if (typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
