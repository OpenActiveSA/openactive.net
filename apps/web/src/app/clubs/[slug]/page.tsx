import { use } from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import ClubPageClient from './ClubPageClient';

interface ClubPageProps {
  params: Promise<{ slug: string }>;
}

interface Club {
  id: string;
  name: string;
  backgroundColor?: string;
  fontColor?: string;
}

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params;
  
  let club: Club | null = null;
  let backgroundColor = '#052333';
  let fontColor = '#ffffff';

  try {
    const supabase = getSupabaseServerClient();
    
    // Try to fetch with all columns first, if that fails, try without branding columns
    let clubsData, error;
    
    // First attempt: with all columns including branding
    const result = await supabase
      .from('Clubs')
      .select('id, name, backgroundColor, fontColor')
      .eq('is_active', true);
    
    clubsData = result.data;
    error = result.error;

    // If error and it's about missing columns, try without branding
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      const fallbackResult = await supabase
        .from('Clubs')
        .select('id, name')
        .eq('is_active', true);
      
      clubsData = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (!error && clubsData) {
      const foundClub = clubsData.find(
        (c) => generateSlug(c.name) === slug
      );

      if (foundClub) {
        club = foundClub as Club;
        backgroundColor = (club.backgroundColor && club.backgroundColor.trim() !== '') 
          ? club.backgroundColor 
          : '#052333';
        fontColor = (club.fontColor && club.fontColor.trim() !== '') 
          ? club.fontColor 
          : '#ffffff';
      }
    }
  } catch (err) {
    console.error('Error loading club:', err);
  }

  return <ClubPageClient club={club} slug={slug} backgroundColor={backgroundColor} fontColor={fontColor} />;
}

