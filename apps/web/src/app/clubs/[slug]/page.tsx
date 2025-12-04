'use client';

import { use } from 'react';

interface ClubPageProps {
  params: Promise<{ slug: string }>;
}

export default function ClubPage({ params }: ClubPageProps) {
  const { slug } = use(params);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#052333',
      color: '#ffffff',
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
        textAlign: 'center'
      }}>
        {slug.replace(/([A-Z])/g, ' $1').trim()}
      </h1>
      <p style={{
        fontSize: '16px',
        opacity: 0.7,
        textAlign: 'center',
        marginTop: '8px'
      }}>
        Club page coming soon
      </p>
    </div>
  );
}

