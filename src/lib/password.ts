export const PASSWORD_REQUIREMENTS = [
  'at least 9 characters',
  'an uppercase letter',
  'a lowercase letter',
  'a number',
  'a symbol',
];

export function validatePassword(password: string): string | null {
  if (password.length < 9) return 'Password must be at least 9 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/\d/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a symbol.';
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const CLIENT_DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', 'dispostable.com', 'emailondeck.com', 'guerrillamail.com',
  'mailinator.com', 'mailnesia.com', 'mohmal.com', 'tempmail.com', 'trashmail.com', 'yopmail.com',
]);

export function isKnownDisposableEmail(email: string): boolean {
  return CLIENT_DISPOSABLE_DOMAINS.has(normalizeEmail(email).split('@')[1] || '');
}
