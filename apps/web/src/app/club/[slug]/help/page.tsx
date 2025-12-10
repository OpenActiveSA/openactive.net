import { use } from 'react';
import { getClubSettings } from '@/lib/club-settings';
import ClubHelpClient from './ClubHelpClient';

interface ClubHelpPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClubHelpPage({ params }: ClubHelpPageProps) {
  const { slug } = await params;
  const clubSettings = await getClubSettings(slug);

  if (!clubSettings) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#052333',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Club not found</div>
      </div>
    );
  }

  return <ClubHelpClient slug={slug} clubSettings={clubSettings} />;
}
