import { use } from 'react';
import { getClubSettings } from '@/lib/club-settings';
import ClubEventsClient from './ClubEventsClient';

interface ClubEventsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClubEventsPage({ params }: ClubEventsPageProps) {
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

  return <ClubEventsClient slug={slug} clubSettings={clubSettings} />;
}
