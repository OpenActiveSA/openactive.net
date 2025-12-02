import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getSupabaseClient } from './lib/supabase';

const DEMO_USERNAME = process.env.EXPO_PUBLIC_DEMO_USERNAME ?? 'demo.user';

export default function App() {
  const [displayName, setDisplayName] = useState('OpenActive Demo');
  const [username, setUsername] = useState('demo.user');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('[mobile] App component rendered', { loading, error, displayName });

  useEffect(() => {
    console.log('[mobile] useEffect triggered');
    let isMounted = true;

    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[mobile] Starting fetchUser');
        
        const supabase = getSupabaseClient();
        
        console.log('[mobile] Supabase client created', { 
          username: DEMO_USERNAME,
          hasUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL 
        });

        // Add timeout to prevent infinite loading (reduced to 5 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => {
            console.error('[mobile] Request timeout');
            reject(new Error('Request timeout after 5 seconds'));
          }, 5000)
        );

        const queryPromise = supabase
          .from('User')
          .select('username, displayName')
          .eq('username', DEMO_USERNAME)
          .limit(1)
          .maybeSingle();

        console.log('[mobile] Query started, waiting for response...');
        const { data, error: dbError } = await Promise.race([queryPromise, timeoutPromise]);
        console.log('[mobile] Query completed', { hasData: !!data, hasError: !!dbError });

        if (dbError) {
          console.error('[mobile] Database query failed', dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }

        if (!data) {
          console.warn('[mobile] User not found', { username: DEMO_USERNAME });
          // Don't throw error for missing user, just show fallback
          if (isMounted) {
            setLoading(false);
            setError(null);
          }
          return;
        }

        console.log('[mobile] User found', { 
          username: data.username, 
          displayName: data.displayName 
        });

        if (isMounted) {
          setDisplayName(data.displayName);
          setUsername(data.username);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('[mobile] Failed to fetch user from database', err);
        if (isMounted) {
          const errorMessage = err.message || 'Unknown error occurred';
          console.error('[mobile] Setting error state', errorMessage);
          setError(errorMessage);
          setLoading(false);
        }
      } finally {
        console.log('[mobile] fetchUser completed, isMounted:', isMounted);
      }
    }

    console.log('[mobile] Calling fetchUser');
    fetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>openactive</Text>
      <Text style={styles.subtitle}>mobile</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c7d2ff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Error</Text>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.errorHint}>
            Check console logs for details
          </Text>
          <View style={styles.divider} />
          <Text style={styles.fallback}>
            Showing fallback data:
          </Text>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{username}</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{username}</Text>
        </View>
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
  contentContainer: {
    alignItems: 'center',
    marginTop: 20,
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
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: '#c7d2ff',
    marginVertical: 16,
    opacity: 0.3,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#c7d2ff',
    marginTop: 8,
  },
});
