import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();

    // First, check if club exists
    const { data: club, error: clubError } = await supabase
      .from('Clubs')
      .select('id, name')
      .eq('id', id)
      .single();

    if (clubError || !club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    // Delete related data in order (to avoid foreign key constraints)
    // 1. Delete UserClubRoles
    const { error: rolesError } = await supabase
      .from('UserClubRoles')
      .delete()
      .eq('clubId', id);

    if (rolesError && rolesError.code !== '42P01') {
      console.warn('Error deleting user club roles (table may not exist):', rolesError);
    }

    // 2. Delete Courts
    const { error: courtsError } = await supabase
      .from('Courts')
      .delete()
      .eq('clubId', id);

    if (courtsError && courtsError.code !== '42P01') {
      console.warn('Error deleting courts (table may not exist):', courtsError);
    }

    // 3. Delete Bookings
    const { error: bookingsError } = await supabase
      .from('Bookings')
      .delete()
      .eq('clubId', id);

    if (bookingsError && bookingsError.code !== '42P01') {
      console.warn('Error deleting bookings (table may not exist):', bookingsError);
    }

    // 4. Delete MatchResults (if exists)
    const { error: matchResultsError } = await supabase
      .from('MatchResults')
      .delete()
      .eq('clubId', id);

    if (matchResultsError && matchResultsError.code !== '42P01') {
      console.warn('Error deleting match results (table may not exist):', matchResultsError);
    }

    // 5. Finally, delete the club
    const { error: deleteError } = await supabase
      .from('Clubs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting club:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete club' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Club "${club.name}" deleted successfully` 
    });
  } catch (err: any) {
    console.error('API error deleting club:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


