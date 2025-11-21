import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Get Supabase client for mobile app
 * 
 * Environment variables needed:
 * - EXPO_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon/public key
 * 
 * For local Supabase (development):
 * - EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 (or your local IP for physical device)
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
 * 
 * For remote Supabase (production):
 * - EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY=your-remote-anon-key
 */
export function getSupabaseClient() {
  let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const missing = !supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : 'EXPO_PUBLIC_SUPABASE_ANON_KEY';
    throw new Error(
      `Supabase configuration missing: ${missing}. Please create apps/mobile/.env file with these variables.`
    );
  }

  // Check for placeholder values
  if (supabaseKey === 'your-anon-key-here' || supabaseKey.includes('paste-your') || supabaseKey.includes('your-')) {
    throw new Error(
      `Invalid API key: Please replace the placeholder value in apps/mobile/.env with your actual Supabase anon key. Get your key from: https://supabase.com/dashboard/project/buahkjwwahvnpjlkvnjv/settings/api Then update EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env and restart the app.`
    );
  }

  // For Android emulator, replace 127.0.0.1 with 10.0.2.2
  // This is the special IP that Android emulator uses to access host machine
  if (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')) {
    if (Platform.OS === 'android') {
      supabaseUrl = supabaseUrl.replace('127.0.0.1', '10.0.2.2').replace('localhost', '10.0.2.2');
      console.log('[mobile] Android emulator detected, using 10.0.2.2 instead of localhost');
    }
  }

  console.log('[mobile] Supabase client initialized', {
    url: supabaseUrl.substring(0, 40) + '...',
    hasKey: !!supabaseKey,
  });

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-client-info': 'openactive-mobile',
      },
    },
    db: {
      schema: 'public',
    },
    // Increase timeout for slow connections
    realtime: {
      timeout: 30000, // 30 seconds
    },
  });
}

