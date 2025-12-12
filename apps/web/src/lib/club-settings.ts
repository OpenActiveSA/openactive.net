import { getSupabaseServerClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';

export interface ClubSettings {
  id: string;
  name: string;
  logo?: string;
  backgroundColor: string;
  fontColor: string;
  selectedColor: string;
  hoverColor?: string;
  actionColor?: string;
}

export async function getClubSettings(slug: string): Promise<ClubSettings | null> {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data: clubsData } = await supabase
      .from('Clubs')
      .select('id, name, logo, backgroundColor, fontColor, selectedColor, actionColor, hoverColor')
      .eq('is_active', true);

    if (clubsData) {
      const club = clubsData.find(c => generateSlug(c.name) === slug);
      if (club) {
        return {
          id: club.id,
          name: club.name,
          logo: club.logo || undefined,
          backgroundColor: club.backgroundColor || '#052333',
          fontColor: club.fontColor || '#ffffff',
          selectedColor: club.selectedColor || '#667eea',
          hoverColor: club.hoverColor,
          actionColor: club.actionColor,
        };
      }
    }
  } catch (err) {
    console.error('Error loading club settings:', err);
  }
  
  return null;
}



