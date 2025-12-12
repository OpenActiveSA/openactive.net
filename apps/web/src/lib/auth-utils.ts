/**
 * Utility functions for handling authentication errors
 */

/**
 * Clear all Supabase auth tokens from localStorage
 * Useful when dealing with invalid refresh tokens
 */
export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear all Supabase-related auth tokens
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && (key.includes('auth') || key.includes('token'))) {
        localStorage.removeItem(key);
      }
    });
    
    // Also clear cookies that might contain auth tokens
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith('sb-') || name.includes('auth')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    
    console.log('Auth tokens cleared from storage');
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
}

/**
 * Check if an error is a refresh token error
 */
export function isRefreshTokenError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || error.toString() || '';
  return (
    message.includes('Refresh Token') ||
    message.includes('refresh_token') ||
    message.includes('Invalid Refresh Token') ||
    error.status === 401 ||
    error.code === 'invalid_refresh_token'
  );
}








