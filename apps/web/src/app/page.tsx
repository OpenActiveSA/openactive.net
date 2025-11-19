import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type UserData = {
  username: string;
  displayName: string;
};

async function getDemoUser(): Promise<UserData | null> {
  const username = process.env.NEXT_PUBLIC_DEMO_USERNAME ?? 'demo.user';

  try {
    const supabase = getSupabaseServerClient();
    
    console.log('[web] Fetching user from database', { username });

    const { data, error } = await supabase
      .from('User')
      .select('username, displayName')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[web] Database query failed', {
        message: error.message,
        code: error.code,
      });
      return null;
    }

    if (!data) {
      console.warn('[web] User not found', { username });
      return null;
    }

    console.log('[web] User found', { username: data.username, displayName: data.displayName });

    return {
      username: data.username,
      displayName: data.displayName,
    };
  } catch (error) {
    console.error('[web] Failed to load user from database', error);
    return null;
  }
}

async function getVersion(): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'version.txt');
    const contents = await fs.readFile(filePath, 'utf-8');
    const trimmed = contents.trim();

    if (!trimmed) {
      console.warn('[frontend] Version file is empty, falling back to default');
      return '0.0.0';
    }

    return trimmed;
  } catch (error) {
    console.error('[frontend] Failed to read version file', error);
    return 'dev';
  }
}

export default async function Home() {
  const [data, version] = await Promise.all([getDemoUser(), getVersion()]);
  const displayName = data?.displayName ?? 'Demo User';
  const username = data?.username ?? 'demo.user';
  const hasData = Boolean(data);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#ffffff',
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#000000',
      }}
    >
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            frontend
          </h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
            {displayName}
          </p>
          <p style={{ fontSize: '1rem', color: '#555555' }}>@{username}</p>
          {!hasData && (
            <p style={{ marginTop: '0.75rem', color: '#b42323' }}>
              Unable to load live data. Showing fallback content.
            </p>
          )}
        </div>
      </main>
      <footer
        style={{
          borderTop: '1px solid #e5e5e5',
          padding: '0.75rem 1rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#666666',
        }}
      >
        Version {version}
      </footer>
      </div>
  );
}
