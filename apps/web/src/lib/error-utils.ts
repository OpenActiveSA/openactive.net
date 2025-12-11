/**
 * Error handling utilities
 * Centralized error extraction and logging for consistent error handling across the application
 */

/**
 * Extracts a user-friendly error message from various error types
 * Handles Supabase errors, API errors, and generic errors
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  // String errors
  if (typeof error === 'string') {
    return error;
  }

  // Error instances
  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }

  // Supabase/API error objects
  if (typeof error === 'object') {
    const errObj = error as any;
    
    // Check for nested error objects
    if (errObj.error) {
      return extractErrorMessage(errObj.error);
    }
    
    // Supabase error format
    if (errObj.message) {
      return errObj.message;
    }
    
    // API error format
    if (errObj.details) {
      return errObj.details;
    }
    
    if (errObj.hint) {
      return errObj.hint;
    }
    
    // Link error format (from Supabase auth)
    if (errObj.linkError) {
      return errObj.linkError;
    }
  }

  return String(error) || 'An unknown error occurred';
}

/**
 * Extracts detailed error information for logging
 */
export interface ErrorDetails {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  statusText?: string;
  stack?: string;
}

export function extractErrorDetails(error: unknown): ErrorDetails {
  const message = extractErrorMessage(error);
  const details: ErrorDetails = { message };

  if (error && typeof error === 'object') {
    const errObj = error as any;
    
    if (errObj.code) details.code = errObj.code;
    if (errObj.details) details.details = errObj.details;
    if (errObj.hint) details.hint = errObj.hint;
    if (errObj.status) details.status = errObj.status;
    if (errObj.statusText) details.statusText = errObj.statusText;
    if (errObj.stack) details.stack = errObj.stack;
    
    // Check nested error
    if (errObj.error && typeof errObj.error === 'object') {
      const nested = errObj.error;
      if (nested.code && !details.code) details.code = nested.code;
      if (nested.details && !details.details) details.details = nested.details;
      if (nested.hint && !details.hint) details.hint = nested.hint;
    }
  } else if (error instanceof Error) {
    if (error.stack) details.stack = error.stack;
    if ((error as any).code) details.code = (error as any).code;
  }

  return details;
}

/**
 * Logs an error with consistent formatting
 * Only logs in development mode unless forceLog is true
 */
export function logError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, any>,
  forceLog: boolean = false
): void {
  if (!forceLog && process.env.NODE_ENV === 'production') {
    return;
  }

  const errorDetails = extractErrorDetails(error);
  
  console.error(`[${context}] Error:`, {
    message: errorDetails.message,
    code: errorDetails.code,
    details: errorDetails.details,
    hint: errorDetails.hint,
    status: errorDetails.status,
    ...additionalInfo,
  });

  // Only log stack trace in development
  if (process.env.NODE_ENV === 'development' && errorDetails.stack) {
    console.error(`[${context}] Stack trace:`, errorDetails.stack);
  }
}

/**
 * Logs a warning with consistent formatting
 * Only logs in development mode unless forceLog is true
 */
export function logWarning(
  context: string,
  message: string,
  additionalInfo?: Record<string, any>,
  forceLog: boolean = false
): void {
  if (!forceLog && process.env.NODE_ENV === 'production') {
    return;
  }

  console.warn(`[${context}] Warning:`, message, additionalInfo || '');
}

/**
 * Logs debug information
 * Only logs in development mode
 */
export function logDebug(
  context: string,
  message: string,
  data?: any
): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  if (data !== undefined) {
    console.log(`[${context}]`, message, data);
  } else {
    console.log(`[${context}]`, message);
  }
}

/**
 * Parses API response and extracts error information
 */
export async function parseApiErrorResponse(response: Response): Promise<{
  error: string;
  details?: any;
}> {
  let responseText = '';
  let parsedData: any = null;

  try {
    // Clone response to avoid reading it multiple times
    const clonedResponse = response.clone();
    responseText = await clonedResponse.text();
    
    if (responseText && responseText.trim()) {
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        // Not JSON, use raw text
      }
    }
  } catch (textError) {
    logWarning('parseApiErrorResponse', 'Failed to read response text', { textError });
  }

  const errorMessage = parsedData?.error || 
                      parsedData?.details || 
                      parsedData?.message ||
                      parsedData?.linkError ||
                      `Server error (${response.status} ${response.statusText})`;

  return {
    error: errorMessage,
    details: parsedData,
  };
}

