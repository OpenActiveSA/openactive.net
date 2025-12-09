'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import ClubHeader from '../ClubHeader';
import ClubFooter from '../ClubFooter';

export default function ClubEventsPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [backgroundColor, setBackgroundColor] = useState('#052333');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadClubSettings = async () => {
      try {
        const supabase = getSupabaseClientClient();

        const { data: clubsData } = await supabase
          .from('Clubs')
          .select('*')
          .eq('is_active', true);

        if (clubsData) {
          const club = clubsData.find(c => generateSlug(c.name) === slug);
          if (club) {
            setBackgroundColor(club.backgroundColor || '#052333');
            setFontColor(club.fontColor || '#ffffff');
            setSelectedColor(club.selectedColor || '#667eea');
            setLogo(club.logo);
          }
        }
      } catch (err) {
        console.error('Error loading club settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadClubSettings();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#052333',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: backgroundColor,
        color: fontColor,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ClubHeader 
        logo={logo}
        fontColor={fontColor} 
        backgroundColor={backgroundColor}
        selectedColor={selectedColor}
        currentPath={`/club/${slug}/events`}
      />
      
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '600px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '600',
            marginBottom: '16px',
            color: fontColor
          }}>
            Events
          </h1>
          <p style={{
            fontSize: '18px',
            opacity: 0.8,
            color: fontColor
          }}>
            Events page coming soon
          </p>
        </div>
      </div>

      <ClubFooter fontColor={fontColor} />
    </div>
  );
}

