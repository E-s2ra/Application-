export const PASSWORD_REQUIREMENTS = [
  'More than 4 characters',
  'At least one number (0-9)',
  'At least one symbol (!@#$%^&*)',
];

export interface PasswordRuleCheck {
  id: string;
  label: string;
  passed: boolean;
}

export function getPasswordRuleChecks(password: string): PasswordRuleCheck[] {
  return [
    {
      id: 'length',
      label: 'More than 4 characters',
      passed: password.length > 4,
    },
    {
      id: 'number',
      label: 'At least one number (0-9)',
      passed: /\d/.test(password),
    },
    {
      id: 'symbol',
      label: 'At least one symbol (!@#$%^&*)',
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export type PasswordStrength = 'empty' | 'low' | 'good' | 'strong';

export interface PasswordStrengthInfo {
  strength: PasswordStrength;
  score: number; // 0, 1, 2, 3
  label: string;
  emoji: string;
  color: string;
  badgeBg: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthInfo {
  if (!password) {
    return {
      strength: 'empty',
      score: 0,
      label: '',
      emoji: '',
      color: '#6B7280',
      badgeBg: 'rgba(107, 114, 128, 0.15)',
    };
  }

  const checks = getPasswordRuleChecks(password);
  const passedCount = checks.filter((c) => c.passed).length;
  const isExtraStrong = password.length >= 8 && passedCount === 3;

  if (isExtraStrong) {
    return {
      strength: 'strong',
      score: 3,
      label: 'Strong',
      emoji: '👑 💖',
      color: '#10B981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
    };
  } else if (passedCount === 3) {
    return {
      strength: 'good',
      score: 2,
      label: 'Good',
      emoji: '🐱 ✨',
      color: '#F59E0B',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
    };
  } else {
    return {
      strength: 'low',
      score: 1,
      label: 'Low',
      emoji: '🐣 🌸',
      color: '#EF4444',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
    };
  }
}

export function validatePassword(password: string): string | null {
  if (password.length <= 4) return 'Password must be more than 4 characters.';
  if (!/\d/.test(password)) return 'Password must include at least one number (0-9).';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one symbol (e.g. !@#$%^&*).';
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
