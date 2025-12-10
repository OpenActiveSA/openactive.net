import { use } from 'react';
import { getClubSettings } from '@/lib/club-settings';
import MemberProfileClient from './MemberProfileClient';

interface MemberProfilePageProps {
  params: Promise<{ slug: string; userId: string }>;
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { slug, userId } = await params;
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

  return <MemberProfileClient slug={slug} userId={userId} clubSettings={clubSettings} />;
}
