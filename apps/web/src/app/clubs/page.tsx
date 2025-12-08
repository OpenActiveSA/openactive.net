import { getSupabaseServerClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import ClubsListClient from './ClubsListClient';

interface Club {
  id: string;
  name: string;
  numberOfCourts?: number; // Keep for backwards compatibility
  courtCount?: number; // New: actual count from Courts table
  country?: string;
  province?: string;
  logo?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  address?: string;
  description?: string;
}

export default async function ClubsPage() {
  let clubs: Club[] = [];

  try {
    const supabase = getSupabaseServerClient();
    
    // Try to fetch with all columns first, if that fails, try without branding columns
    let clubsData, error;
    
    // First attempt: with all columns including branding
    const result = await supabase
      .from('Clubs')
      .select('id, name, country, province, logo, backgroundImage, backgroundColor')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    clubsData = result.data;
    error = result.error;

    // If error and it's about missing columns, try without branding
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      const fallbackResult = await supabase
        .from('Clubs')
        .select('id, name, country, province')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      clubsData = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (!error && clubsData) {
      clubs = clubsData as Club[];
      
      // Load court counts for each club
      try {
        const { data: courtsData } = await supabase
          .from('Courts')
          .select('clubId')
          .eq('isActive', true);
        
        if (courtsData) {
          // Count courts per club
          const courtCounts = courtsData.reduce((acc, court) => {
            acc[court.clubId] = (acc[court.clubId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          // Add court counts to clubs
          clubs = clubs.map(club => ({
            ...club,
            courtCount: courtCounts[club.id] || 0
          }));
        }
      } catch (courtsError) {
        // If Courts table doesn't exist or error, just use numberOfCourts as fallback
        console.warn('Could not load court counts, using numberOfCourts:', courtsError);
      }
    }
  } catch (err) {
    console.error('Error loading clubs:', err);
  }

  return <ClubsListClient clubs={clubs} />;
}

