import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Lazy load Supabase to prevent import-time crashes
let getSupabaseClient;
try {
  const supabaseModule = require('./lib/supabase');
  getSupabaseClient = supabaseModule.getSupabaseClient;
} catch (err) {
  console.error('[mobile] Failed to import Supabase:', err);
  getSupabaseClient = () => {
    throw new Error('Supabase module failed to load: ' + err.message);
  };
}

const DEMO_USERNAME = process.env.EXPO_PUBLIC_DEMO_USERNAME ?? 'demo.user';

function AppContent() {
  const [displayName, setDisplayName] = useState('OpenActive Demo');
  const [username, setUsername] = useState('demo.user');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[mobile] Loading timeout - showing error');
        setLoading(false);
        setError('Loading timeout: Please check your connection and try again');
      }
    }, 10000); // 10 second timeout

    async function fetchUser() {
      // Small delay to ensure component is mounted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        console.log('[mobile] Starting to fetch user...');
        
        let supabase;
        try {
          supabase = getSupabaseClient();
          console.log('[mobile] Supabase client created successfully');
        } catch (configErr) {
          console.error('[mobile] Failed to initialize Supabase client:', configErr);
          if (isMounted) {
            setLoading(false);
            setError(`Configuration error: ${configErr.message}`);
          }
          return; // Exit early if config fails
        }
        
        console.log('[mobile] Fetching user from database', { 
          username: DEMO_USERNAME,
          supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL 
        });

        const { data, error: dbError } = await supabase
          .from('User')
          .select('username, displayName')
          .eq('username', DEMO_USERNAME)
          .limit(1)
          .maybeSingle();

        if (dbError) {
          console.error('[mobile] Database query failed', {
            message: dbError.message,
            code: dbError.code,
            details: dbError.details,
            hint: dbError.hint,
          });
          throw new Error(`Database error: ${dbError.message} (${dbError.code})`);
        }

        if (!data) {
          console.warn('[mobile] User not found', { username: DEMO_USERNAME });
          throw new Error(`User not found: ${DEMO_USERNAME}`);
        }

        console.log('[mobile] User found', { 
          username: data.username, 
          displayName: data.displayName 
        });

        if (isMounted) {
          setDisplayName(data.displayName);
          setUsername(data.username);
          setError(null);
        }
      } catch (err) {
        console.error('[mobile] Failed to fetch user from database', err);
        if (isMounted) {
          // Format error message for display (remove newlines, truncate if too long)
          let errorMessage = err.message || 'Unknown error occurred';
          errorMessage = errorMessage.replace(/\n/g, ' ').substring(0, 200);
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Always render something - never return null
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>openactive</Text>
      <Text style={styles.subtitle}>mobile</Text>
      {loading ? (
        <>
          <ActivityIndicator color="#f5f7ff" size="large" />
          <Text style={styles.errorHint}>Loading...</Text>
        </>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.error} numberOfLines={5}>
            {error}
          </Text>
          <Text style={styles.errorHint}>
            Check console logs for details
          </Text>
          <Text style={styles.fallback}>
            Showing fallback: {displayName}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{username}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1f44',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f5f7ff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 20,
    color: '#c7d2ff',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  displayName: {
    marginTop: 8,
    fontSize: 20,
    color: '#f5f7ff',
  },
  username: {
    marginTop: 4,
    fontSize: 16,
    color: '#c7d2ff',
  },
  errorContainer: {
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
    maxWidth: '90%',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  error: {
    fontSize: 14,
    color: '#ffb4ab',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 12,
    color: '#c7d2ff',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  fallback: {
    marginTop: 16,
    fontSize: 16,
    color: '#c7d2ff',
    textAlign: 'center',
  },
});

// Error boundary wrapper to prevent crashes
export default function App() {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);

  useEffect(() => {
    console.log('[mobile] App component mounted');
    
    // Global error handler
    const errorHandler = (error, isFatal) => {
      console.error('[mobile] Global error:', error, isFatal);
      if (isFatal) {
        setHasError(true);
        setErrorInfo(error?.message || 'Unknown error');
      }
    };

    // Set up global error handler for React Native
    if (global.ErrorUtils) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        errorHandler(error, isFatal);
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  if (hasError) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.title}>openactive</Text>
        <Text style={styles.subtitle}>mobile</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>App Error</Text>
          <Text style={styles.error}>
            {errorInfo || 'An unexpected error occurred'}
          </Text>
          <Text style={styles.errorHint}>
            Please restart the app
          </Text>
        </View>
      </View>
    );
  }

  return <AppContent />;
}
