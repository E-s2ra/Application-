/**
 * AniFlix Error Logger — Phase 6: Observability
 *
 * Centralised error reporting utility. In production this should be wired
 * to a crash-reporting service such as Sentry. For now it:
 *   - Always logs to console.warn in development
 *   - Captures structured context (screen, userId, action)
 *   - Provides a single integration point so upgrading to Sentry
 *     requires changing only this file.
 *
 * UPGRADE PATH:
 *   npm install @sentry/react-native
 *   Uncomment the Sentry block below and set EXPO_PUBLIC_SENTRY_DSN in .env
 */

// import * as Sentry from '@sentry/react-native';
// Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });

type ErrorContext = {
  /** Human-readable label for the screen or feature (e.g. 'HomeScreen', 'AdminPanel') */
  screen?: string;
  /** The action being performed when the error occurred (e.g. 'fetchCatalog') */
  action?: string;
  /** Supabase user ID of the currently authenticated user, if known */
  userId?: string;
  /** Any additional key-value metadata to attach to the report */
  extra?: Record<string, unknown>;
};

/**
 * Reports a non-fatal error. Logs in development; in production this
 * should forward to a real crash-reporting service.
 */
export function logError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const report = {
    message,
    stack,
    ...context,
    timestamp: new Date().toISOString(),
  };

  // Development: always print to console
  console.warn('[AniFlix Error]', JSON.stringify(report, null, 2));

  // Production: send to crash-reporting service
  // Sentry.captureException(error, { extra: { ...context } });
}

/**
 * Reports a handled warning (non-crash, but noteworthy). Useful for
 * tracking unexpected-but-recoverable states (empty DB results, etc.).
 */
export function logWarning(message: string, context?: ErrorContext): void {
  const report = {
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };
  console.warn('[AniFlix Warning]', JSON.stringify(report, null, 2));

  // Sentry.captureMessage(message, { level: 'warning', extra: { ...context } });
}

/**
 * Wraps an async function and reports any thrown error via logError.
 * Returns null on failure instead of throwing.
 *
 * Usage:
 *   const data = await withErrorLogging(
 *     () => fetchSomeData(),
 *     { screen: 'HomeScreen', action: 'fetchCatalog' }
 *   );
 */
export async function withErrorLogging<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    logError(err, context);
    return null;
  }
}
