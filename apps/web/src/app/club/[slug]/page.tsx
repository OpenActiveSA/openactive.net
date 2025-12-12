import { use } from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import { logError, logDebug } from '@/lib/error-utils';
import ClubPageClient from './ClubPageClient';

interface ClubPageProps {
  params: Promise<{ slug: string }>;
}

interface Club {
  id: string;
  name: string;
  logo?: string;
  backgroundColor?: string;
  fontColor?: string;
  selectedColor?: string;
  hoverColor?: string;
  numberOfCourts?: number;
  openingTime?: string;
  closingTime?: string;
  bookingSlotInterval?: number;
  sessionDuration?: number[];
}

// Disable caching for this page to ensure booking days settings are always fresh
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params;
  
  let club: Club | null = null;
  let backgroundColor = '#052333';
  let fontColor = '#ffffff';
  let selectedColor = '#667eea';
  let actionColor = '#667eea'; // Separate action color for duration buttons
  let hoverColor = '#f0f0f0';

  try {
    const supabase = getSupabaseServerClient();
    
    // Try to fetch with all columns first, if that fails, try without branding columns
    let clubData, error;
    
    // First attempt: with all columns including branding and settings
    // Get all active clubs and find by slug
    const result = await supabase
      .from('Clubs')
      .select('id, name, logo, backgroundColor, fontColor, selectedColor, actionColor, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration, membersBookingDays, visitorBookingDays, coachBookingDays, clubManagerBookingDays, country, timezone')
      .eq('is_active', true);
    
    clubData = result.data;
    error = result.error;

    // If error and it's about missing columns, try without booking days columns (they might not exist yet)
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      const fallbackResult = await supabase
        .from('Clubs')
        .select('id, name, logo, backgroundColor, fontColor, selectedColor, actionColor, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration, country, timezone')
        .eq('is_active', true);
      
      clubData = fallbackResult.data;
      error = fallbackResult.error;
      
      // If still error, try without country and timezone (they might not exist yet)
      if (error && (error.code === '42703' || error.message?.includes('column'))) {
        const fallbackResult2 = await supabase
          .from('Clubs')
          .select('id, name, logo, backgroundColor, fontColor, selectedColor, actionColor, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration')
          .eq('is_active', true);
        
        clubData = fallbackResult2.data;
        error = fallbackResult2.error;
      }
    }

    if (!error && clubData) {
      const foundClub = clubData.find(
        (c) => generateSlug(c.name) === slug
      );

      if (foundClub) {
        club = foundClub as Club;
        // Log the logo value from database
        logDebug('ClubPage', 'Found club logo from database', { logo: (foundClub as any).logo });
        // Only use backgroundColor if it exists and is not empty
        const clubBgColor = (foundClub as any).backgroundColor;
        if (clubBgColor && typeof clubBgColor === 'string' && clubBgColor.trim() !== '') {
          backgroundColor = clubBgColor.trim();
        }
        const clubFontColor = (foundClub as any).fontColor;
        if (clubFontColor && typeof clubFontColor === 'string' && clubFontColor.trim() !== '') {
          fontColor = clubFontColor.trim();
        }
        // Get actionColor separately (for duration buttons)
        const clubActionColor = (foundClub as any).actionColor;
        if (clubActionColor && typeof clubActionColor === 'string' && clubActionColor.trim() !== '') {
          actionColor = clubActionColor.trim();
        }
        // Get selectedColor (for date/time buttons and other selections)
        const clubSelectedColor = (foundClub as any).selectedColor;
        if (clubSelectedColor && typeof clubSelectedColor === 'string' && clubSelectedColor.trim() !== '') {
          selectedColor = clubSelectedColor.trim();
        }
        const clubHoverColor = (foundClub as any).hoverColor;
        if (clubHoverColor && typeof clubHoverColor === 'string' && clubHoverColor.trim() !== '') {
          hoverColor = clubHoverColor.trim();
        }
      }
    }
  } catch (err) {
    logError('ClubPage', err, { slug });
  }

  const logo = club?.logo || undefined;
  const openingTime = (club as any)?.openingTime || '06:00';
  const closingTime = (club as any)?.closingTime || '22:00';
  
  // Get timezone from club settings
  const { getClubTimezone } = await import('@/lib/timezone-utils');
  const timezone = getClubTimezone((club as any)?.country, (club as any)?.timezone);
  
  // Ensure bookingSlotInterval is properly converted to a number
  let bookingSlotInterval = 60; // default
  const intervalValue = (club as any)?.bookingSlotInterval;
  if (intervalValue !== null && intervalValue !== undefined) {
    if (typeof intervalValue === 'number') {
      bookingSlotInterval = intervalValue;
    } else {
      const parsed = parseInt(String(intervalValue), 10);
      if (!isNaN(parsed) && parsed > 0) {
        bookingSlotInterval = parsed;
      }
    }
  }
  
  // Parse sessionDuration (JSONB array)
  let sessionDuration: number[] = [60]; // default
  const durationValue = (club as any)?.sessionDuration;
  if (durationValue !== null && durationValue !== undefined) {
    if (Array.isArray(durationValue)) {
      sessionDuration = durationValue;
    } else if (typeof durationValue === 'string') {
      try {
        const parsed = JSON.parse(durationValue);
        sessionDuration = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        const parsed = parseInt(String(durationValue), 10);
        if (!isNaN(parsed) && parsed > 0) {
          sessionDuration = [parsed];
        }
      }
    } else if (typeof durationValue === 'number') {
      sessionDuration = [durationValue];
    }
  }
  
  // Get booking days settings with defaults
  // Use nullish coalescing to only use default if value is null or undefined (not if it's 0)
  const membersBookingDays = (club as any)?.membersBookingDays ?? 7;
  const visitorBookingDays = (club as any)?.visitorBookingDays ?? 3;
  const coachBookingDays = (club as any)?.coachBookingDays ?? 14;
  const clubManagerBookingDays = (club as any)?.clubManagerBookingDays ?? 30;
  
  logDebug('ClubPage', 'Club page props', { 
    clubId: club?.id, 
    clubName: club?.name,
    logo: logo,
    openingTime, 
    closingTime, 
    bookingSlotInterval,
    sessionDuration,
    membersBookingDays,
    visitorBookingDays,
    coachBookingDays,
    clubManagerBookingDays,
  });
  
  return <ClubPageClient 
    club={club} 
    slug={slug} 
    logo={logo} 
    backgroundColor={backgroundColor} 
    fontColor={fontColor} 
    selectedColor={selectedColor}
    actionColor={actionColor}
    hoverColor={hoverColor}
    openingTime={openingTime}
    closingTime={closingTime}
    bookingSlotInterval={bookingSlotInterval}
    sessionDuration={sessionDuration}
    membersBookingDays={membersBookingDays}
    visitorBookingDays={visitorBookingDays}
    coachBookingDays={coachBookingDays}
    clubManagerBookingDays={clubManagerBookingDays}
    timezone={timezone}
  />;
}

