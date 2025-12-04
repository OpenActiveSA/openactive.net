/**
 * Club Roles System
 * 
 * This system allows users to have different roles at different clubs.
 * - VISITOR: Default role (no record needed - absence = visitor)
 * - MEMBER: Regular member of the club
 * - CLUB_ADMIN: Administrator of a specific club
 * 
 * Global roles (in Users table):
 * - SUPER_ADMIN: System-wide administrator
 */

export type ClubRole = 'VISITOR' | 'MEMBER' | 'CLUB_ADMIN';

export interface UserClubRole {
  id: string;
  userId: string;
  clubId: string;
  role: ClubRole;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get a user's role at a specific club
 * Returns 'VISITOR' if no explicit role is set
 */
export async function getUserClubRole(
  supabase: any,
  userId: string,
  clubId: string
): Promise<ClubRole> {
  const { data, error } = await supabase
    .from('UserClubRoles')
    .select('role')
    .eq('userId', userId)
    .eq('clubId', clubId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user club role:', error);
    return 'VISITOR'; // Default to visitor on error
  }

  return data?.role || 'VISITOR';
}

/**
 * Set a user's role at a specific club
 * To make someone a visitor, you can either delete the record or set role to VISITOR
 */
export async function setUserClubRole(
  supabase: any,
  userId: string,
  clubId: string,
  role: ClubRole
): Promise<{ success: boolean; error?: string }> {
  try {
    // If setting to VISITOR, we can delete the record (optional - can keep it)
    if (role === 'VISITOR') {
      const { error: deleteError } = await supabase
        .from('UserClubRoles')
        .delete()
        .eq('userId', userId)
        .eq('clubId', clubId);

      if (deleteError && deleteError.code !== 'PGRST116') {
        return { success: false, error: deleteError.message };
      }
      return { success: true };
    }

    // Upsert the role (insert or update)
    const { error: upsertError } = await supabase
      .from('UserClubRoles')
      .upsert(
        {
          userId,
          clubId,
          role,
          updatedAt: new Date().toISOString(),
        },
        {
          onConflict: 'userId,clubId',
        }
      );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Get all clubs with a user's role at each club
 */
export async function getUserClubsWithRoles(
  supabase: any,
  userId: string
): Promise<Array<{ club: any; role: ClubRole }>> {
  const { data: clubs, error: clubsError } = await supabase
    .from('Clubs')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (clubsError) {
    console.error('Error fetching clubs:', clubsError);
    return [];
  }

  const { data: roles, error: rolesError } = await supabase
    .from('UserClubRoles')
    .select('clubId, role')
    .eq('userId', userId);

  if (rolesError) {
    console.error('Error fetching user club roles:', rolesError);
  }

  const roleMap = new Map<string, ClubRole>();
  (roles || []).forEach((r: any) => {
    roleMap.set(r.clubId, r.role);
  });

  return (clubs || []).map((club: any) => ({
    club,
    role: roleMap.get(club.id) || 'VISITOR',
  }));
}

/**
 * Get all users with their roles for a specific club
 */
export async function getClubUsersWithRoles(
  supabase: any,
  clubId: string
): Promise<Array<{ user: any; role: ClubRole }>> {
  const { data: roles, error: rolesError } = await supabase
    .from('UserClubRoles')
    .select('userId, role, Users!inner(id, email, Firstname, Surname)')
    .eq('clubId', clubId);

  if (rolesError) {
    console.error('Error fetching club users:', rolesError);
    return [];
  }

  // Also get all users who don't have an explicit role (they are VISITORS)
  // This is optional - you might want to only show users with explicit roles
  const { data: allUsers, error: usersError } = await supabase
    .from('Users')
    .select('id, email, Firstname, Surname')
    .order('email');

  if (usersError) {
    console.error('Error fetching all users:', usersError);
    return [];
  }

  const roleMap = new Map<string, ClubRole>();
  (roles || []).forEach((r: any) => {
    const userId = typeof r.userId === 'object' ? r.userId.id : r.userId;
    roleMap.set(userId, r.role);
  });

  // Combine: users with explicit roles + all users marked as VISITOR
  return (allUsers || []).map((user: any) => ({
    user,
    role: roleMap.get(user.id) || 'VISITOR',
  }));
}







