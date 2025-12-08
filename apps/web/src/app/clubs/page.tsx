import { getSupabaseServerClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import ClubsListClient from './ClubsListClient';

interface Club {
  id: string;
  name: string;
  numberOfCourts?: number;
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
      .select('id, name, numberOfCourts, country, province, logo, backgroundImage, backgroundColor')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    clubsData = result.data;
    error = result.error;

    // If error and it's about missing columns, try without branding
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      const fallbackResult = await supabase
        .from('Clubs')
        .select('id, name, numberOfCourts, country, province')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      clubsData = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (!error && clubsData) {
      clubs = clubsData as Club[];
    }
  } catch (err) {
    console.error('Error loading clubs:', err);
  }

  return <ClubsListClient clubs={clubs} />;
}

