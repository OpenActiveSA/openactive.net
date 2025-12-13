import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instances to prevent multiple client creation
let clientInstance: SupabaseClient | null = null;
let serverInstance: SupabaseClient | null = null;

/**
 * Get Supabase client based on environment
 * 
 * Priority order:
 * 1. Custom URL/key (if provided)
 * 2. Local Supabase (if USE_LOCAL_SUPABASE=true and in development)
 * 3. Environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, etc.)
 * 
 * Local Development:
 * - Run `npm run supabase:start` to start local Supabase
 * - Set USE_LOCAL_SUPABASE=true in .env.local to use local instance
 * - Local Supabase runs on http://127.0.0.1:54321
 * 
 * Remote Projects (Free Tier):
 * - Create separate Supabase projects for dev/test and production
 * - Set SUPABASE_URL and keys in environment variables
 * - Use different env vars for different environments
 */
export function getSupabaseClient(options?: {
  useServiceRole?: boolean;
  customUrl?: string;
  customKey?: string;
  useLocal?: boolean;
}): SupabaseClient {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const useLocal = options?.useLocal ?? process.env.USE_LOCAL_SUPABASE === 'true';
  
  let supabaseUrl: string | undefined;
  let supabaseKey: string | undefined;

  // Priority 1: Custom override
  if (options?.customUrl && options?.customKey) {
    supabaseUrl = options.customUrl;
    supabaseKey = options.customKey;
  }
  // Priority 2: Local Supabase (development only)
  else if (useLocal && isDevelopment) {
    supabaseUrl = process.env.SUPABASE_LOCAL_URL || 'http://127.0.0.1:54321';
    supabaseKey = options?.useServiceRole
      ? process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.SUPABASE_LOCAL_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  }
  // Priority 3: Environment variables
  // For client-side, use NEXT_PUBLIC_ prefixed variables (they're available in browser)
  // For server-side, use regular variables or NEXT_PUBLIC_ variables
  else {
    // Check NEXT_PUBLIC_ first (available in both client and server)
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    
    // Check if URL is a placeholder (common placeholder patterns)
    if (supabaseUrl && (
      supabaseUrl.includes('your-project-id') || 
      supabaseUrl.includes('your-project') ||
      supabaseUrl.includes('example.com') ||
      supabaseUrl === 'https://.supabase.co'
    )) {
      // URL is a placeholder - treat as not configured
      supabaseUrl = undefined;
    }
    
    if (options?.useServiceRole) {
      // Service role key should NOT be exposed to client - only use on server
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      // Check if service role key is valid (not a placeholder)
      // New Supabase keys start with 'sb_secret_' and are shorter
      // Old JWT keys are longer (200+ chars)
      if (supabaseKey && (
        supabaseKey.includes('your-') || 
        supabaseKey.includes('paste-your') ||
        (supabaseKey.length < 30 && !supabaseKey.startsWith('sb_secret_')) // Too short unless it's new format
      )) {
        // Service role key is invalid/placeholder - will fall back to anon key
        supabaseKey = undefined;
      }
    } else {
      // Anon key can be public - use NEXT_PUBLIC_ version for client-side
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      
      // Check if key is a placeholder
      // New Supabase keys start with 'sb_publishable_' and are shorter
      // Old JWT keys are longer (200+ chars)
      if (supabaseKey && (
        supabaseKey.includes('your-') || 
        supabaseKey.includes('paste-your') ||
        (supabaseKey.length < 30 && !supabaseKey.startsWith('sb_publishable_') && !supabaseKey.startsWith('eyJ')) // Too short unless it's new format or JWT
      )) {
        supabaseKey = undefined;
      }
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    const missing = !supabaseUrl ? 'SUPABASE_URL' : 'SUPABASE_ANON_KEY/SERVICE_ROLE_KEY';
    const hint = useLocal && isDevelopment
      ? 'Make sure local Supabase is running (`npm run supabase:start`) and check your .env.local file.'
      : 'Please set the appropriate environment variables in your .env.local file.';
    
    throw new Error(
      `Supabase configuration missing: ${missing}. ${hint} ` +
      `Environment: ${process.env.NODE_ENV || 'unknown'}, ` +
      `Using local: ${useLocal}`
    );
  }

  // Log which environment we're using (only in development, and only once)
  if (isDevelopment && !clientInstance && !serverInstance) {
    const mode = useLocal ? 'local' : 'remote';
    const keyType = options?.useServiceRole ? 'service role' : 'anon';
    console.log(`[Supabase] Mode: ${mode}, Key: ${keyType}`);
    console.log(`[Supabase] URL: ${supabaseUrl}`);
    console.log(`[Supabase] Key exists: ${!!supabaseKey}`);
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: options?.useServiceRole ? false : true,
      autoRefreshToken: !options?.useServiceRole,
      detectSessionInUrl: true,
      // Handle refresh token errors gracefully
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'sb-auth-token',
      // Clear invalid tokens on error
      flowType: 'pkce',
    },
  });
}

/**
 * Server-side Supabase client (uses service role key if available, falls back to anon key)
 * Use this for API routes and server components
 * 
 * Note: Server instances are not cached as they may need different configurations
 * per request in some scenarios. If you need caching, implement request-scoped caching.
 */
export function getSupabaseServerClient(): SupabaseClient {
  // For server-side, we can create new instances as they're request-scoped
  // But we'll cache if no custom options are needed
  if (!serverInstance) {
    // Check if service role key is available and valid
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // New Supabase keys start with 'sb_secret_' and are shorter (30-50 chars)
    // Old JWT keys are longer (200+ chars)
    const hasServiceRole = !!serviceRoleKey && 
                          !serviceRoleKey.includes('your-') &&
                          !serviceRoleKey.includes('paste-your') &&
                          (serviceRoleKey.startsWith('sb_secret_') || serviceRoleKey.length > 50);
    
    if (hasServiceRole) {
      // Use service role key for full database access
      serverInstance = getSupabaseClient({ useServiceRole: true });
    } else {
      // Fall back to anon key (works for read operations if RLS allows)
      console.warn('[Supabase] Service role key not available, using anon key for server client. Some operations may be limited by RLS policies.');
      serverInstance = getSupabaseClient({ useServiceRole: false });
    }
  }
  return serverInstance;
}

/**
 * Client-side Supabase client (uses anon key)
 * Use this in client components and browser code
 * 
 * This uses a singleton pattern to prevent multiple GoTrueClient instances
 * which can cause warnings and undefined behavior.
 */
export function getSupabaseClientClient(): SupabaseClient {
  // Use singleton pattern for client-side to prevent multiple instances
  if (typeof window !== 'undefined') {
    if (!clientInstance) {
      clientInstance = getSupabaseClient({ useServiceRole: false });
    }
    return clientInstance;
  }
  
  // Server-side fallback (shouldn't happen, but handle gracefully)
  return getSupabaseClient({ useServiceRole: false });
}

