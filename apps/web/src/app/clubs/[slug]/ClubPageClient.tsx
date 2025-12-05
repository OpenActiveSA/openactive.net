'use client';

interface Club {
  id: string;
  name: string;
  backgroundColor?: string;
  fontColor?: string;
}

interface ClubPageClientProps {
  club: Club | null;
  slug: string;
  backgroundColor: string;
  fontColor: string;
}

export default function ClubPageClient({ club, slug, backgroundColor, fontColor }: ClubPageClientProps) {
  const displayName = club?.name || slug.replace(/([A-Z])/g, ' $1').trim();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: backgroundColor,
      color: fontColor,
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{
        fontSize: '32px',
        marginBottom: '16px',
        fontWeight: '600',
        textTransform: 'capitalize',
        wordBreak: 'break-word',
        textAlign: 'center',
        color: fontColor
      }}>
        {displayName}
      </h1>
      <p style={{
        fontSize: '16px',
        opacity: 0.7,
        textAlign: 'center',
        marginTop: '8px',
        color: fontColor
      }}>
        Club page coming soon
      </p>
    </div>
  );
}

