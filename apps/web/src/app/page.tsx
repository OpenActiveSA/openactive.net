export const dynamic = 'force-dynamic';

type UserPayload = {
  user: {
    username: string;
    displayName: string;
  };
};

function buildApiUrl(username: string): string {
  const preferredBase = process.env.NEXT_PUBLIC_API_URL ?? '';
  const sanitizedBase = preferredBase.replace(/\/$/, '');
  const prefix = sanitizedBase.length > 0 ? sanitizedBase : '';

  if (prefix.length === 0) {
    return `/api/users/${encodeURIComponent(username)}`;
  }

  return `${prefix}/api/users/${encodeURIComponent(username)}`;
}

async function getDemoUser(): Promise<UserPayload | null> {
  const username = process.env.NEXT_PUBLIC_DEMO_USERNAME ?? 'demo.user';
  const url = buildApiUrl(username);

  try {
    console.log('[frontend] Requesting user', { url, username });

    const response = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error('[frontend] API returned non-OK status', {
        status: response.status,
        statusText: response.statusText,
      });

      return null;
    }

    const payload = (await response.json()) as UserPayload;

    console.log('[frontend] Received user payload', payload);

    return payload;
  } catch (error) {
    console.error('[frontend] Failed to load demo user', error);
    return null;
  }
}

async function getVersion(): Promise<string> {
  try {
    const response = await fetch(`${buildApiUrl('')}.version-placeholder`, {
      cache: 'no-store',
    });
    return 'dev';
  } catch (error) {
    console.error('[frontend] Failed to read version file', error);
    return 'dev';
  }
}

export default async function Home() {
  const [data, version] = await Promise.all([getDemoUser(), getVersion()]);
  const displayName = data?.user.displayName ?? 'Demo User';
  const username = data?.user.username ?? 'demo.user';

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
