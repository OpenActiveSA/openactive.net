import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function App() {
  const [displayName, setDisplayName] = useState('PenActive Demo');
  const [username, setUsername] = useState('demo.user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchUser() {
      try {
        const response = await fetch(`${API_URL}/users/demo.user`);

        if (!response.ok) {
          throw new Error('Request failed');
        }

        const data = await response.json();

        if (isMounted && data?.user) {
          setDisplayName(data.user.displayName);
          setUsername(data.user.username);
        }
      } catch (error) {
        console.warn('Failed to fetch user', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>penactive</Text>
      <Text style={styles.subtitle}>mobile</Text>
      {loading ? (
        <ActivityIndicator color="#f5f7ff" />
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
});
