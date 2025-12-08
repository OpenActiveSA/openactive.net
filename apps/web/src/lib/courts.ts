/**
 * Courts and Sport Types
 */

export type SportType = 
  | 'TENNIS'
  | 'PICKLEBALL'
  | 'PADEL'
  | 'TABLE_TENNIS'
  | 'SQUASH'
  | 'BADMINTON'
  | 'BEACH_TENNIS'
  | 'RACQUETBALL'
  | 'REAL_TENNIS';

export interface Court {
  id: string;
  clubId: string;
  name: string;
  sportType: SportType;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const SPORT_TYPE_LABELS: Record<SportType, string> = {
  TENNIS: 'Tennis',
  PICKLEBALL: 'Pickleball',
  PADEL: 'Padel',
  TABLE_TENNIS: 'Table Tennis',
  SQUASH: 'Squash',
  BADMINTON: 'Badminton',
  BEACH_TENNIS: 'Beach Tennis',
  RACQUETBALL: 'Racquetball',
  REAL_TENNIS: 'Real Tennis',
};

export const SPORT_TYPES: SportType[] = [
  'TENNIS',
  'PICKLEBALL',
  'PADEL',
  'TABLE_TENNIS',
  'SQUASH',
  'BADMINTON',
  'BEACH_TENNIS',
  'RACQUETBALL',
  'REAL_TENNIS',
];

/**
 * Get all courts for a club
 */
export async function getClubCourts(
  supabase: any,
  clubId: string,
  includeInactive: boolean = false
): Promise<Court[]> {
  try {
    // First, try a simple query to check if table exists
    // If it fails, we'll return empty array gracefully
    let query = supabase
      .from('Courts')
      .select('*')
      .eq('clubId', clubId)
      .order('name', { ascending: true })
      .limit(1); // Limit to 1 initially to test if table exists

    if (!includeInactive) {
      query = query.eq('isActive', true);
    }

    const { data, error } = await query;

    if (error) {
      // Extract error information safely
      const errorCode = error?.code;
      const errorMessage = error?.message || '';
      const errorDetails = error?.details || '';
      const errorString = String(error);
      
      // Check if table doesn't exist or permission denied
      // Common error codes: 42P01 (table doesn't exist), 42501 (permission denied)
      const isTableMissing = errorCode === '42P01' || 
                            errorCode === '42501' ||
                            errorCode === 'PGRST116' || // PostgREST: relation not found
                            errorMessage?.toLowerCase().includes('does not exist') ||
                            errorMessage?.toLowerCase().includes('relation') ||
                            errorMessage?.toLowerCase().includes('table') ||
                            errorMessage?.toLowerCase().includes('permission') ||
                            errorDetails?.toLowerCase().includes('does not exist') ||
                            errorDetails?.toLowerCase().includes('relation') ||
                            errorString?.toLowerCase().includes('does not exist') ||
                            errorString?.toLowerCase().includes('relation');
      
      if (isTableMissing) {
        // Silently return empty array if table doesn't exist - this is expected before migration
        // Only log once to avoid console spam
        if (!(window as any).__courts_table_warning_shown) {
          console.info('ℹ️ Courts table does not exist yet. This is normal if you haven\'t run the migration. Run CREATE_COURTS_TABLE.sql in Supabase SQL Editor to create it.');
          (window as any).__courts_table_warning_shown = true;
        }
        return [];
      }
      
      // For other errors, log them but still return empty array to prevent UI breakage
      console.warn('⚠️ Error fetching club courts:', {
        code: errorCode || 'NO_CODE',
        message: errorMessage || 'NO_MESSAGE',
        details: errorDetails || 'NO_DETAILS',
        errorString: errorString || 'NO_STRING'
      });
      
      return [];
    }
    
    // Success - return the data
    return (data || []) as Court[];

    return (data || []) as Court[];
  } catch (err: any) {
    console.error('Exception fetching club courts:', {
      error: err,
      errorMessage: err?.message,
      errorStack: err?.stack,
      errorString: JSON.stringify(err, null, 2),
      errorType: typeof err
    });
    return [];
  }
}

/**
 * Get a single court by ID
 */
export async function getCourt(
  supabase: any,
  courtId: string
): Promise<Court | null> {
  const { data, error } = await supabase
    .from('Courts')
    .select('*')
    .eq('id', courtId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching court:', error);
    return null;
  }

  return data as Court | null;
}

/**
 * Create a new court
 */
export async function createCourt(
  supabase: any,
  court: Omit<Court, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; data?: Court; error?: string }> {
  try {
    console.log('Creating court with data:', court);
    
    // Try the insert directly - don't test first as RLS might block SELECT but allow INSERT
    const { data, error } = await supabase
      .from('Courts')
      .insert([court])
      .select()
      .single();

    if (error) {
      // Log error in multiple ways - try to get all possible properties
      console.error('=== ERROR CREATING COURT ===');
      
      // Try direct property access
      const errorCode = error?.code;
      const errorMessage = error?.message;
      const errorDetails = error?.details;
      const errorHint = error?.hint;
      const errorStatus = error?.status;
      const errorStatusText = error?.statusText;
      
      // Log everything we can find
      console.error('Error code:', errorCode);
      console.error('Error message:', errorMessage);
      console.error('Error details:', errorDetails);
      console.error('Error hint:', errorHint);
      console.error('Error status:', errorStatus);
      console.error('Error statusText:', errorStatusText);
      console.error('Error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      
      // Try to get all enumerable properties
      if (error && typeof error === 'object') {
        const props: any = {};
        for (const key in error) {
          try {
            props[key] = error[key];
          } catch (e) {
            props[key] = '[Cannot access]';
          }
        }
        console.error('Error properties:', props);
      }
      
      // Try JSON stringify with replacer
      try {
        const errorString = JSON.stringify(error, (key, value) => {
          if (key === 'stack') return '[Stack]';
          return value;
        }, 2);
        console.error('Error JSON:', errorString);
      } catch (e) {
        console.error('Could not stringify error:', e);
      }
      
      // Try toString
      try {
        console.error('Error toString:', error.toString());
      } catch (e) {
        console.error('Could not call toString:', e);
      }
      
      // Provide more helpful error messages
      let userFriendlyMessage = errorMessage || 'Failed to create court';
      
      // Check for table not found errors (be more specific)
      const isTableMissing = (errorCode === '42P01' || errorCode === 'PGRST116') &&
                            (errorMessage?.toLowerCase().includes('does not exist') || 
                             errorMessage?.toLowerCase().includes('relation') ||
                             errorDetails?.toLowerCase().includes('does not exist') ||
                             errorDetails?.toLowerCase().includes('relation'));
      
      // Check for permission/RLS errors
      const isPermissionError = errorCode === '42501' || 
                               errorCode === 'PGRST301' ||
                               errorCode === 'PGRST301' ||
                               errorMessage?.toLowerCase().includes('permission') || 
                               errorMessage?.toLowerCase().includes('denied') ||
                               errorMessage?.toLowerCase().includes('policy') ||
                               errorMessage?.toLowerCase().includes('row-level security') ||
                               errorDetails?.toLowerCase().includes('permission') ||
                               errorDetails?.toLowerCase().includes('policy');
      
      if (isTableMissing) {
        userFriendlyMessage = 'Courts table does not exist. Please run CREATE_COURTS_TABLE.sql migration first.';
      } else if (isPermissionError) {
        userFriendlyMessage = 'Permission denied. You may not have access to create courts. Make sure you are logged in as a SUPER_ADMIN. If you are, the RLS policies may need to be updated.';
      } else if (errorCode === '23505' || 
                 errorMessage?.toLowerCase().includes('duplicate') || 
                 errorMessage?.toLowerCase().includes('unique') ||
                 errorDetails?.toLowerCase().includes('duplicate')) {
        userFriendlyMessage = 'A court with this name already exists for this club. Please choose a different name.';
      } else if (errorCode === '42501' || 
                 errorCode === 'PGRST301' ||
                 errorMessage?.toLowerCase().includes('permission') || 
                 errorMessage?.toLowerCase().includes('denied') ||
                 errorMessage?.toLowerCase().includes('policy')) {
        userFriendlyMessage = 'Permission denied. You may not have access to create courts. Make sure you are logged in as a SUPER_ADMIN or CLUB_ADMIN.';
      } else if (errorCode === '23503' || errorMessage?.toLowerCase().includes('foreign key')) {
        userFriendlyMessage = 'Invalid club ID. The club does not exist.';
      } else if (errorCode === '23514' || errorMessage?.toLowerCase().includes('check constraint')) {
        userFriendlyMessage = 'Invalid data. Please check that all required fields are filled correctly.';
      }
      
      return { success: false, error: userFriendlyMessage };
    }

    console.log('Court created successfully:', data);
    return { success: true, data: data as Court };
  } catch (err: any) {
    console.error('Exception creating court:', {
      error: err,
      errorMessage: err?.message,
      errorStack: err?.stack,
      errorString: JSON.stringify(err, null, 2)
    });
    return { success: false, error: err?.message || 'Failed to create court' };
  }
}

/**
 * Update a court
 */
export async function updateCourt(
  supabase: any,
  courtId: string,
  updates: Partial<Omit<Court, 'id' | 'clubId' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; data?: Court; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('Courts')
      .update(updates)
      .eq('id', courtId)
      .select()
      .single();

    if (error) {
      console.error('Error updating court:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      
      let errorMessage = error.message || 'Failed to update court';
      if (error.code === '42P01') {
        errorMessage = 'Courts table does not exist. Please run CREATE_COURTS_TABLE.sql migration first.';
      } else if (error.code === '42501') {
        errorMessage = 'Permission denied. You may not have access to update courts.';
      }
      
      return { success: false, error: errorMessage };
    }

    return { success: true, data: data as Court };
  } catch (err: any) {
    console.error('Exception updating court:', err);
    return { success: false, error: err.message || 'Failed to update court' };
  }
}

/**
 * Delete a court (soft delete by setting isActive to false, or hard delete)
 */
export async function deleteCourt(
  supabase: any,
  courtId: string,
  hardDelete: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    if (hardDelete) {
      const { error } = await supabase
        .from('Courts')
        .delete()
        .eq('id', courtId);

      if (error) {
        console.error('Error deleting court:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        
        let errorMessage = error.message || 'Failed to delete court';
        if (error.code === '42P01') {
          errorMessage = 'Courts table does not exist. Please run CREATE_COURTS_TABLE.sql migration first.';
        } else if (error.code === '42501') {
          errorMessage = 'Permission denied. You may not have access to delete courts.';
        }
        
        return { success: false, error: errorMessage };
      }
    } else {
      const { error } = await supabase
        .from('Courts')
        .update({ isActive: false })
        .eq('id', courtId);

      if (error) {
        console.error('Error deactivating court:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        
        let errorMessage = error.message || 'Failed to deactivate court';
        if (error.code === '42P01') {
          errorMessage = 'Courts table does not exist. Please run CREATE_COURTS_TABLE.sql migration first.';
        } else if (error.code === '42501') {
          errorMessage = 'Permission denied. You may not have access to deactivate courts.';
        }
        
        return { success: false, error: errorMessage };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Exception deleting court:', err);
    return { success: false, error: err.message || 'Failed to delete court' };
  }
}

/**
 * Get courts grouped by sport type for a club
 */
export async function getClubCourtsBySportType(
  supabase: any,
  clubId: string
): Promise<Record<SportType, Court[]>> {
  const courts = await getClubCourts(supabase, clubId, false);
  
  const grouped: Record<SportType, Court[]> = {
    TENNIS: [],
    PICKLEBALL: [],
    PADEL: [],
    TABLE_TENNIS: [],
    SQUASH: [],
    BADMINTON: [],
    BEACH_TENNIS: [],
    RACQUETBALL: [],
    REAL_TENNIS: [],
  };

  courts.forEach(court => {
    if (grouped[court.sportType]) {
      grouped[court.sportType].push(court);
    }
  });

  return grouped;
}

