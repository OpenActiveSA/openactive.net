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

  return `${prefix}/api/users/${encodeURIComponent(username)}`;
}

async function getDemoUser(): Promise<UserPayload | null> {
  const username = process.env.NEXT_PUBLIC_DEMO_USERNAME ?? 'demo.user';
  const url = buildApiUrl(username);

  try {
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as UserPayload;
  } catch (error) {
    console.error('Failed to load demo user', error);
    return null;
  }
}

export default async function Home() {
  const data = await getDemoUser();
  const displayName = data?.user.displayName ?? 'Demo User';
  const username = data?.user.username ?? 'demo.user';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#000000',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>frontend</h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
          {displayName}
        </p>
        <p style={{ fontSize: '1rem', color: '#555555' }}>@{username}</p>
      </div>
    </main>
  );
}
