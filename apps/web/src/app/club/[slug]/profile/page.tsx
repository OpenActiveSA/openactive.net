import { use } from 'react';
import { getClubSettings } from '@/lib/club-settings';
import ClubProfileClient from './ClubProfileClient';

interface ClubProfilePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClubProfilePage({ params }: ClubProfilePageProps) {
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

  return <ClubProfileClient slug={slug} clubSettings={clubSettings} />;
}






