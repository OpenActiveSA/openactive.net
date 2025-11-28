import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type UserData = {
  email: string;
  name: string;
  surname: string;
};

async function getDemoUser(): Promise<UserData | null> {
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? 'demo@example.com';

  // Check if Supabase is properly configured before attempting to use it
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[web] Supabase not configured - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  // Wrap in a timeout to prevent infinite hanging
  return Promise.race([
    (async () => {
      try {
        const supabase = getSupabaseServerClient();
        console.log('[web] Attempting to fetch user from database', { email: demoEmail });
        
        // Query the table with Firstname and Surname columns, using email as identifier
        let { data, error } = await supabase
          .from('Users')
          .select('email, Firstname, Surname, displayName')
          .eq('email', demoEmail)
          .limit(1)
          .maybeSingle();

        // If error suggests column doesn't exist, try with just basic columns
        if (error && (error.message?.includes('column') || error.message?.includes('does not exist'))) {
          console.warn('[web] Trying alternative query without Firstname/Surname columns');
          const altQuery = await supabase
            .from('Users')
            .select('email')
            .eq('email', demoEmail)
            .limit(1)
            .maybeSingle();
          
          if (!altQuery.error && altQuery.data) {
            // Table exists but doesn't have Firstname/Surname - return what we have
            console.warn('[web] Table exists but missing Firstname/Surname columns. Please run MIGRATE_TO_FIRSTNAME_SURNAME.sql');
            return {
              email: altQuery.data.email || demoEmail,
              name: '',
              surname: '',
            };
          }
          
          // Use the original error
          data = altQuery.data;
          error = altQuery.error || error;
        }

        if (error) {
          // Log the full error object to see its structure
          console.error('[web] Database query failed:', {
            error: error,
            errorString: String(error),
            errorJSON: JSON.stringify(error, null, 2),
            code: error?.code,
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            status: (error as any)?.status,
            statusText: (error as any)?.statusText,
          });
          
          // Try to get more info
          if (error instanceof Error) {
            console.error('[web] Error is Error instance:', {
              name: error.name,
              message: error.message,
              stack: error.stack,
            });
          }
          
          return null;
        }

        if (!data) {
          console.warn('[web] User not found in database', { email: demoEmail });
          return null;
        }

        console.log('[web] Successfully fetched user:', {
          email: data.email,
          Firstname: data.Firstname,
          Surname: data.Surname,
        });
        
        return {
          email: data.email,
          name: data.Firstname || '',
          surname: data.Surname || '',
        };
      } catch (err: any) {
        console.error('[web] Exception while fetching user:', {
          message: err?.message || String(err),
          stack: err?.stack,
        });
        return null;
      }
    })(),
    new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('[web] Database query timeout after 5 seconds');
        resolve(null);
      }, 5000);
    }),
  ]);
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
  const fullName = data ? `${data.name || ''} ${data.surname || ''}`.trim() || 'Demo User' : 'Demo User';
  const email = data?.email ?? 'demo@example.com';
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
            {fullName}
          </p>
          <p style={{ fontSize: '1rem', color: '#555555' }}>{email}</p>
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
