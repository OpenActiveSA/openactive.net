# Club Roles System Documentation

## Overview

The club roles system allows users to have different roles at different clubs. This solves the problem where a user might be a MEMBER at one club, a VISITOR at another, and a CLUB_ADMIN at yet another.

## Database Structure

### Tables

1. **Users** (existing)
   - Contains global user information
   - Has a `role` field for system-wide roles (SUPER_ADMIN)

2. **Clubs** (existing)
   - Contains club information

3. **UserClubRoles** (new)
   - Junction table linking users to clubs with roles
   - Columns:
     - `id`: UUID primary key
     - `userId`: UUID foreign key to Users
     - `clubId`: UUID foreign key to Clubs
     - `role`: ClubRole enum (VISITOR, MEMBER, COACH, CLUB_ADMIN)
     - `createdAt`, `updatedAt`: Timestamps

### Role Types

**Global Roles** (in Users table):
- `SUPER_ADMIN`: System-wide administrator with access to all clubs

**Club-Specific Roles** (in UserClubRoles table):
- `VISITOR`: Default role - no record needed (absence = visitor)
- `MEMBER`: Regular member of the club
- `COACH`: Coach of the club
- `CLUB_ADMIN`: Administrator of a specific club

## Default Behavior

**VISITOR is the default role**. If no record exists in `UserClubRoles` for a user+club combination, that user is automatically considered a VISITOR at that club.

This means:
- You don't need to create records for visitors
- To make someone a visitor explicitly, you can delete their record
- Less database storage needed

## Usage Examples

### Check User's Role at a Club

```typescript
import { getUserClubRole } from '@/lib/club-roles';
import { getSupabaseClientClient } from '@/lib/supabase';

const supabase = getSupabaseClientClient();
const role = await getUserClubRole(supabase, userId, clubId);
// Returns: 'VISITOR' | 'MEMBER' | 'COACH' | 'CLUB_ADMIN'
```

### Set User's Role at a Club

```typescript
import { setUserClubRole } from '@/lib/club-roles';

// Make user a member
await setUserClubRole(supabase, userId, clubId, 'MEMBER');

// Make user a coach
await setUserClubRole(supabase, userId, clubId, 'COACH');

// Make user a club admin
await setUserClubRole(supabase, userId, clubId, 'CLUB_ADMIN');

// Make user a visitor (removes the record)
await setUserClubRole(supabase, userId, clubId, 'VISITOR');
```

### Get All Clubs with User's Roles

```typescript
import { getUserClubsWithRoles } from '@/lib/club-roles';

const clubsWithRoles = await getUserClubsWithRoles(supabase, userId);
// Returns: [{ club: {...}, role: 'MEMBER' }, ...]
```

### Get All Users with Roles for a Club

```typescript
import { getClubUsersWithRoles } from '@/lib/club-roles';

const usersWithRoles = await getClubUsersWithRoles(supabase, clubId);
// Returns: [{ user: {...}, role: 'VISITOR' }, ...]
```

## SQL Queries

### Get user's role at a club (with VISITOR as default)

```sql
SELECT COALESCE(role, 'VISITOR') as role
FROM "UserClubRoles"
WHERE "userId" = 'user-id-here' AND "clubId" = 'club-id-here';
```

### Get all clubs with user's role

```sql
SELECT 
  c.*,
  COALESCE(ucr.role, 'VISITOR') as role
FROM "Clubs" c
LEFT JOIN "UserClubRoles" ucr 
  ON c.id = ucr."clubId" 
  AND ucr."userId" = 'user-id-here';
```

### Get all users with roles for a club

```sql
SELECT 
  u.*,
  COALESCE(ucr.role, 'VISITOR') as role
FROM "Users" u
LEFT JOIN "UserClubRoles" ucr 
  ON u.id = ucr."userId" 
  AND ucr."clubId" = 'club-id-here';
```

## Implementation Steps

1. Run `CREATE_CLUB_ROLES_SYSTEM.sql` in Supabase SQL Editor
2. Import helper functions from `@/lib/club-roles` in your components
3. Update your UI to show/manage club-specific roles
4. Update access control logic to check club roles instead of global roles (for club-specific actions)

## Migration from Old System

If you previously had a global `CLUB_ADMIN` role in the Users table:

1. Find all users with `role = 'CLUB_ADMIN'` in Users table
2. For each, determine which club(s) they admin
3. Insert records into UserClubRoles: `(userId, clubId, 'CLUB_ADMIN')`
4. Consider removing the global CLUB_ADMIN role or keeping it for backward compatibility








