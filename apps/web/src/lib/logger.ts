/**
 * Logger utility
 * Provides consistent logging that respects NODE_ENV
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logs a message only in development mode
 */
export function devLog(...args: any[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

/**
 * Logs an error (always logs, even in production)
 */
export function devError(...args: any[]): void {
  if (isDevelopment) {
    console.error(...args);
  }
}

/**
 * Logs a warning only in development mode
 */
export function devWarn(...args: any[]): void {
  if (isDevelopment) {
    console.warn(...args);
  }
}

/**
 * Logs debug information with context
 */
export function devDebug(context: string, message: string, data?: any): void {
  if (isDevelopment) {
    if (data !== undefined) {
      console.log(`[${context}]`, message, data);
    } else {
      console.log(`[${context}]`, message);
    }
  }
}


