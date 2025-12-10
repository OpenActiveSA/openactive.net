'use client';

import { ClubAnimationProvider, useClubAnimation } from '@/components/club/ClubAnimationContext';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';
import ClubNotifications from '@/components/club/ClubNotifications';
import type { ClubSettings } from '@/lib/club-settings';

interface ClubEventsClientProps {
  slug: string;
  clubSettings: ClubSettings;
}

function ClubEventsContent({ slug, clubSettings }: ClubEventsClientProps) {
  const { contentVisible } = useClubAnimation();
  
  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: clubSettings.backgroundColor,
        color: clubSettings.fontColor,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ClubHeader 
        logo={clubSettings.logo}
        fontColor={clubSettings.fontColor} 
        backgroundColor={clubSettings.backgroundColor}
        selectedColor={clubSettings.selectedColor}
        currentPath={`/club/${slug}/events`}
      />
      <ClubNotifications clubId={clubSettings.id} fontColor={clubSettings.fontColor} />
      
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '40px 20px',
        opacity: contentVisible ? 1 : 0,
        transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '600px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '600',
            marginBottom: '16px',
            color: clubSettings.fontColor
          }}>
            Events
          </h1>
          <p style={{
            fontSize: '18px',
            opacity: 0.8,
            color: clubSettings.fontColor
          }}>
            Events page coming soon
          </p>
        </div>
      </div>

      <ClubFooter fontColor={clubSettings.fontColor} />
    </div>
  );
}

export default function ClubEventsClient(props: ClubEventsClientProps) {
  return (
    <ClubAnimationProvider>
      <ClubEventsContent {...props} />
    </ClubAnimationProvider>
  );
}

