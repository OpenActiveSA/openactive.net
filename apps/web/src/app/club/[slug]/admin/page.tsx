'use client';

import { use, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import type { ClubRole } from '@/lib/club-roles';
import { setUserClubRole, getUserClubRole } from '@/lib/club-roles';
import styles from '@/components/AdminDashboard.module.css';
import adminStyles from '@/styles/admin.module.css';

interface ClubAdminProps {
  params: Promise<{ slug: string }>;
}

interface Club {
  id: string;
  name: string;
  numberOfCourts?: number;
  country?: string;
  province?: string;
  is_active?: boolean;
  backgroundColor?: string;
  createdAt?: string;
  // Module settings
  moduleCourtBooking?: boolean;
  moduleMemberManager?: boolean;
  moduleWebsite?: boolean;
  moduleEmailers?: boolean;
  moduleVisitorPayment?: boolean;
  moduleFloodlightPayment?: boolean;
  moduleEvents?: boolean;
  moduleCoaching?: boolean;
  moduleLeague?: boolean;
  moduleRankings?: boolean;
  moduleMarketing?: boolean;
  moduleAccessControl?: boolean;
  moduleClubWallet?: boolean;
  moduleFinanceIntegration?: boolean;
}

export default function ClubAdminPage({ params }: ClubAdminProps) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [membersBookingDays, setMembersBookingDays] = useState<number>(7);
  const [visitorBookingDays, setVisitorBookingDays] = useState<number>(3);
  const [coachBookingDays, setCoachBookingDays] = useState<number>(14);
  const [clubManagerBookingDays, setClubManagerBookingDays] = useState<number>(30);
  const [bookingSlotInterval, setBookingSlotInterval] = useState<number>(60);
  const [sessionDuration, setSessionDuration] = useState<number[]>([60]);
  const [openingTime, setOpeningTime] = useState<string>('06:00');
  const [closingTime, setClosingTime] = useState<string>('22:00');
  const [isSaving, setIsSaving] = useState(false);
  const [courts, setCourts] = useState<Array<{ id: string; name: string; courtNumber: number }>>([]);
  const [scheduleRules, setScheduleRules] = useState<Array<{
    id: string;
    name: string;
    courts: number[];
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    reason: string;
    recurring: 'none' | 'daily' | 'weekly';
    recurringDays?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    disabledDates?: string[]; // Array of dates (YYYY-MM-DD) to exclude from recurring rules
    status: 'active' | 'pause';
    setting: 'blocked' | 'blocked-coaching' | 'blocked-tournament' | 'blocked-maintenance' | 'blocked-social' | 'members-only' | 'members-only-bookings' | 'open-doubles-singles' | 'doubles-only' | 'singles-only';
  }>>([]);
  const [scheduleRulesTableExists, setScheduleRulesTableExists] = useState<boolean | null>(null); // null = unknown, true = exists, false = doesn't exist
  const [editingRule, setEditingRule] = useState<{
    id: string | null;
    name: string;
    courts: number[];
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    reason: string;
    recurring: 'none' | 'daily' | 'weekly';
    recurringDays?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    disabledDates?: string[]; // Array of dates (YYYY-MM-DD) to exclude from recurring rules
    status: 'active' | 'pause';
    setting: 'blocked' | 'blocked-coaching' | 'blocked-tournament' | 'blocked-maintenance' | 'blocked-social' | 'members-only' | 'members-only-bookings' | 'open-doubles-singles' | 'doubles-only' | 'singles-only';
  } | null>(null);
  const [bookings, setBookings] = useState<Array<{
    id: string;
    courtId?: string;
    courtNumber?: number;
    courtName?: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    duration: number;
    player1Id?: string;
    player2Id?: string;
    player3Id?: string;
    player4Id?: string;
    guestPlayer1Name?: string;
    guestPlayer2Name?: string;
    guestPlayer3Name?: string;
    playerNames: string;
    status: string;
    bookingType: string;
    createdAt: string;
  }>>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const hasLoadedRef = useRef(false);
  const mountedRef = useRef(true);
  const [players, setPlayers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: ClubRole;
    lastLoginAt?: string;
  }>>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [addPlayerSearchTerm, setAddPlayerSearchTerm] = useState('');
  const [addPlayerSearchResults, setAddPlayerSearchResults] = useState<Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  }>>([]);
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false);
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<ClubRole>('MEMBER');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState('');
  const [addPlayerSuccess, setAddPlayerSuccess] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userClubRole, setUserClubRole] = useState<ClubRole | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [impersonatingPlayerId, setImpersonatingPlayerId] = useState<string | null>(null);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
  
  // Stable user ID for dependency array
  const userId = user?.id || null;

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadClubData = useCallback(async (forceReload = false) => {
    if (!forceReload && (hasLoadedRef.current || club)) {
      return;
    }

    hasLoadedRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClientClient();

      // Try to fetch with all columns first, if that fails, try without branding columns
      let clubsData, clubsError;
      
      // First attempt: with all columns including branding, booking settings, and module settings
      const result = await supabase
        .from('Clubs')
        .select('id, name, country, province, is_active, backgroundColor, logo, openingTime, closingTime, bookingSlotInterval, sessionDuration, membersBookingDays, visitorBookingDays, coachBookingDays, clubManagerBookingDays, moduleCourtBooking, moduleMemberManager, moduleWebsite, moduleEmailers, moduleVisitorPayment, moduleFloodlightPayment, moduleEvents, moduleCoaching, moduleLeague, moduleRankings, moduleMarketing, moduleAccessControl, moduleClubWallet, moduleFinanceIntegration, createdAt')
        .order('createdAt', { ascending: false });
      
      clubsData = result.data;
      clubsError = result.error;

      // If error and it's about missing columns, try without optional fields
      if (clubsError && (clubsError.code === '42703' || clubsError.message?.includes('column'))) {
        console.warn('Some columns may not exist, trying with basic fields:', clubsError);
        const fallbackResult = await supabase
          .from('Clubs')
          .select('id, name, country, province, is_active, logo, openingTime, closingTime, bookingSlotInterval, sessionDuration, createdAt')
          .order('createdAt', { ascending: false });
        
        clubsData = fallbackResult.data;
        clubsError = fallbackResult.error;
        
        // If still error, try with absolute minimum fields
        if (clubsError && (clubsError.code === '42703' || clubsError.message?.includes('column'))) {
          console.warn('Trying with absolute minimum fields:', clubsError);
          const minimalResult = await supabase
            .from('Clubs')
            .select('id, name, country, province, is_active, createdAt')
            .order('createdAt', { ascending: false });
          
          clubsData = minimalResult.data;
          clubsError = minimalResult.error;
        }
      }

      if (clubsError) {
        console.error('Clubs fetch error:', {
          message: clubsError.message,
          code: clubsError.code,
          details: clubsError.details,
          hint: clubsError.hint,
          error: clubsError
        });
        setError(`Database error: ${clubsError.message || 'Unknown error'}. Code: ${clubsError.code || 'N/A'}`);
        setIsLoading(false);
        return;
      }

      if (!clubsData) {
        setError('No data returned from database');
        setIsLoading(false);
        return;
      }

      const foundClub = clubsData.find(
        (c: any) => generateSlug(c.name) === slug
      );

      if (!foundClub) {
        if (clubsData.length > 0) {
          setError(`Club not found for slug: "${slug}". Available clubs: ${clubsData.map((c: any) => c.name).join(', ')}`);
        } else {
          setError('No clubs found in database. Please create a club first.');
        }
        setIsLoading(false);
        return;
      }

      setClub(foundClub as Club);
      
      // Load booking settings if they exist
      if ((foundClub as any).openingTime) {
        setOpeningTime((foundClub as any).openingTime);
      }
      if ((foundClub as any).closingTime) {
        setClosingTime((foundClub as any).closingTime);
      }
      if ((foundClub as any).bookingSlotInterval !== null && (foundClub as any).bookingSlotInterval !== undefined) {
        const interval = typeof (foundClub as any).bookingSlotInterval === 'number' 
          ? (foundClub as any).bookingSlotInterval 
          : parseInt(String((foundClub as any).bookingSlotInterval), 10);
        if (!isNaN(interval) && interval > 0) {
          setBookingSlotInterval(interval);
        }
      }
      if ((foundClub as any).sessionDuration !== null && (foundClub as any).sessionDuration !== undefined) {
        // Handle both array and single value (for backward compatibility)
        // JSONB from Supabase is automatically parsed as array/object
        if (Array.isArray((foundClub as any).sessionDuration)) {
          setSessionDuration((foundClub as any).sessionDuration);
        } else if (typeof (foundClub as any).sessionDuration === 'string') {
          // If it's a string, try to parse it as JSON
          try {
            const parsed = JSON.parse((foundClub as any).sessionDuration);
            if (Array.isArray(parsed)) {
              setSessionDuration(parsed);
            } else {
              setSessionDuration([parsed]);
            }
          } catch {
            // If parsing fails, try as single number
            const duration = parseInt(String((foundClub as any).sessionDuration), 10);
            if (!isNaN(duration) && duration > 0) {
              setSessionDuration([duration]);
            }
          }
        } else {
          const duration = typeof (foundClub as any).sessionDuration === 'number' 
            ? (foundClub as any).sessionDuration 
            : parseInt(String((foundClub as any).sessionDuration), 10);
          if (!isNaN(duration) && duration > 0) {
            setSessionDuration([duration]);
          }
        }
      }
      
      // Load booking days settings
      if ((foundClub as any).membersBookingDays !== null && (foundClub as any).membersBookingDays !== undefined) {
        const days = typeof (foundClub as any).membersBookingDays === 'number' 
          ? (foundClub as any).membersBookingDays 
          : parseInt(String((foundClub as any).membersBookingDays), 10);
        if (!isNaN(days) && days > 0) {
          setMembersBookingDays(days);
        }
      }
      if ((foundClub as any).visitorBookingDays !== null && (foundClub as any).visitorBookingDays !== undefined) {
        const days = typeof (foundClub as any).visitorBookingDays === 'number' 
          ? (foundClub as any).visitorBookingDays 
          : parseInt(String((foundClub as any).visitorBookingDays), 10);
        if (!isNaN(days) && days > 0) {
          setVisitorBookingDays(days);
        }
      }
      if ((foundClub as any).coachBookingDays !== null && (foundClub as any).coachBookingDays !== undefined) {
        const days = typeof (foundClub as any).coachBookingDays === 'number' 
          ? (foundClub as any).coachBookingDays 
          : parseInt(String((foundClub as any).coachBookingDays), 10);
        if (!isNaN(days) && days > 0) {
          setCoachBookingDays(days);
        }
      }
      if ((foundClub as any).clubManagerBookingDays !== null && (foundClub as any).clubManagerBookingDays !== undefined) {
        const days = typeof (foundClub as any).clubManagerBookingDays === 'number' 
          ? (foundClub as any).clubManagerBookingDays 
          : parseInt(String((foundClub as any).clubManagerBookingDays), 10);
        if (!isNaN(days) && days > 0) {
          setClubManagerBookingDays(days);
        }
      }
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error loading club:', err);
      setError(err.message || 'Failed to load club. Please check the browser console for details.');
      setIsLoading(false);
    }
  }, [slug, club]);

  // Load courts for the club
  const loadCourts = useCallback(async () => {
    if (!club?.id) return;

    try {
      const supabase = getSupabaseClientClient();
      
      // Try with courtNumber first, fallback to just name if column doesn't exist
      let courtsData, courtsError;
      const result = await supabase
        .from('Courts')
        .select('id, name, courtNumber')
        .eq('clubId', club.id)
        .eq('isActive', true);
      
      courtsData = result.data;
      courtsError = result.error;

      // If courtNumber column doesn't exist, try without it
      if (courtsError && (courtsError.code === '42703' || courtsError.message?.includes('courtNumber'))) {
        const fallbackResult = await supabase
          .from('Courts')
          .select('id, name')
          .eq('clubId', club.id)
          .eq('isActive', true);
        
        courtsData = fallbackResult.data;
        courtsError = fallbackResult.error;
      }

      if (courtsError) {
        console.warn('Error loading courts:', courtsError);
        return;
      }

      if (courtsData && courtsData.length > 0) {
        // Map to include courtNumber (extract from name if not in database)
        const mappedCourts = courtsData.map((court: any) => {
          let courtNumber = court.courtNumber;
          if (!courtNumber && court.name) {
            // Extract number from name like "Court 1" -> 1
            const match = court.name.match(/\d+/);
            courtNumber = match ? parseInt(match[0], 10) : 0;
          }
          return {
            id: court.id,
            name: court.name,
            courtNumber: courtNumber || 0
          };
        }).sort((a, b) => a.courtNumber - b.courtNumber); // Sort by court number
        setCourts(mappedCourts);
      } else {
        // No courts found, set empty array
        setCourts([]);
      }
    } catch (err) {
      console.error('Error loading courts:', err);
    }
  }, [club?.id]);

  // Load courts when club is loaded
  useEffect(() => {
    if (club?.id) {
      loadCourts();
    }
  }, [club?.id, loadCourts]);

  // Load schedule rules for the club
  const loadScheduleRules = useCallback(async () => {
    if (!club?.id) return;

    try {
      const supabase = getSupabaseClientClient();
      
      // Try to load from ScheduleRules table
      const { data: rulesData, error: rulesError } = await supabase
        .from('ScheduleRules')
        .select('*')
        .eq('clubId', club.id)
        .order('createdAt', { ascending: false });

      if (rulesError) {
        // If table doesn't exist (42P01) or relation doesn't exist, that's okay - rules will be empty
        const errorCode = rulesError.code || '';
        const errorMessage = rulesError.message || '';
        
        if (errorCode === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('table')) {
          // Table doesn't exist - set flag and return
          setScheduleRulesTableExists(false);
          return;
        }
        
        // For other errors, log them
        console.warn('Error loading schedule rules (non-fatal):', {
          message: errorMessage,
          code: errorCode,
          details: rulesError.details || null,
          hint: rulesError.hint || null,
        });
        return;
      }

      // Table exists and query succeeded
      setScheduleRulesTableExists(true);

      if (rulesData) {
        // Map database format to component format
        const mappedRules = rulesData.map((rule: any) => ({
          id: rule.id,
          name: rule.name || '',
          courts: rule.courts || [],
          startDate: rule.startDate || rule.start_date || '',
          endDate: rule.endDate || rule.end_date || '',
          startTime: rule.startTime || rule.start_time || '00:00',
          endTime: rule.endTime || rule.end_time || '23:59',
          reason: rule.reason || '',
          recurring: rule.recurring || 'none',
          recurringDays: rule.recurringDays || rule.recurring_days || [],
          disabledDates: rule.disabledDates || rule.disabled_dates || [],
          status: rule.status || 'active',
          setting: rule.setting || 'blocked'
        }));
        setScheduleRules(mappedRules);
      }
    } catch (err: any) {
      // Enhanced error logging
      const errorInfo: any = {
        message: err?.message || 'Unknown error',
        name: err?.name || 'Unknown',
        stack: err?.stack || null,
      };
      
      // Try to stringify the error
      try {
        errorInfo.stringified = JSON.stringify(err, Object.getOwnPropertyNames(err));
      } catch (e) {
        errorInfo.stringified = String(err);
      }
      
      // Try to get all keys
      try {
        if (err && typeof err === 'object') {
          errorInfo.keys = Object.keys(err);
          errorInfo.errorType = typeof err;
        }
      } catch (e) {
        // Ignore
      }
      
      console.error('Error loading schedule rules (catch block):', errorInfo);
    }
  }, [club?.id]);

  // Load schedule rules when club is loaded or when schedule-rules tab is active
  useEffect(() => {
    if (club?.id && activeTab === 'schedule-rules') {
      loadScheduleRules();
    }
  }, [club?.id, activeTab, loadScheduleRules]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    // Wait for session to be available before loading
    if (!session) {
      return;
    }

    // Check authorization: user must be SUPER_ADMIN or CLUB_ADMIN
    const checkAuthorization = async () => {
      try {
        const supabase = getSupabaseClientClient();
        
        // Check if user is SUPER_ADMIN (global role)
        const { data: userData, error: userError } = await supabase
          .from('Users')
          .select('role, avatarUrl')
          .eq('id', user.id)
          .maybeSingle();

        if (userError) {
          console.error('Error checking user role:', userError);
          setError('Failed to verify permissions');
          setIsAuthorized(false);
          return;
        }

        if (userData && userData.role === 'SUPER_ADMIN') {
          console.log('User is SUPER_ADMIN, authorized');
          setIsSuperAdmin(true);
          setUserClubRole(null);
          setIsAuthorized(true);
          setCurrentUserAvatarUrl(userData.avatarUrl || null);
          loadClubData();
          return;
        }

        // If not SUPER_ADMIN, check club-specific role
        // First, we need to get the club ID
        const clubsResult = await supabase
          .from('Clubs')
          .select('id, name')
          .order('createdAt', { ascending: false });

        if (clubsResult.error) {
          console.error('Error loading clubs for role check:', clubsResult.error);
          setError('Failed to verify permissions');
          setIsAuthorized(false);
          return;
        }

        const foundClub = clubsResult.data?.find(
          (c: any) => generateSlug(c.name) === slug
        );

        if (!foundClub) {
          setError('Club not found');
          setIsAuthorized(false);
          return;
        }

        // Get user's club role
        const clubRole = await getUserClubRole(supabase, user.id, foundClub.id);
        setUserClubRole(clubRole);

        // Fetch user avatarUrl if not already fetched
        if (!currentUserAvatarUrl && userData) {
          setCurrentUserAvatarUrl(userData.avatarUrl || null);
        } else if (!currentUserAvatarUrl) {
          // Fetch avatarUrl separately if not in userData
          const { data: avatarData } = await supabase
            .from('Users')
            .select('avatarUrl')
            .eq('id', user.id)
            .maybeSingle();
          if (avatarData) {
            setCurrentUserAvatarUrl(avatarData.avatarUrl || null);
          }
        }

        // Check if user is CLUB_ADMIN for this club
        if (clubRole === 'CLUB_ADMIN') {
          console.log('User is CLUB_ADMIN for this club, authorized');
          setIsSuperAdmin(false);
          setIsAuthorized(true);
          // Load club data after authorization is confirmed
          loadClubData();
        } else if (clubRole === 'VISITOR') {
          console.log('User is VISITOR, access denied');
          setError('Visitors do not have access to the admin section');
          setIsAuthorized(false);
          setIsLoading(false);
          setTimeout(() => {
            router.push(`/club/${slug}`);
          }, 2000); // Give user time to see the error message
        } else {
          console.log('User role:', clubRole, '- access denied');
          setError('You do not have permission to access the admin section. Only Club Managers and Super Admins can access this page.');
          setIsAuthorized(false);
          setIsLoading(false);
          setTimeout(() => {
            router.push(`/club/${slug}`);
          }, 2000); // Give user time to see the error message
        }
      } catch (err) {
        console.error('Error checking authorization:', err);
        setError('Failed to verify permissions');
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, session?.user?.id, slug]);

  // Load bookings for the club
  const loadBookings = useCallback(async () => {
    if (!club?.id) {
      return;
    }

    setIsLoadingBookings(true);
    try {
      const supabase = getSupabaseClientClient();
      
      // Fetch bookings for this club, ordered by date and time
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('Bookings')
        .select(`
          id,
          courtId,
          courtNumber,
          bookingDate,
          startTime,
          endTime,
          duration,
          player1Id,
          player2Id,
          player3Id,
          player4Id,
          guestPlayer1Name,
          guestPlayer2Name,
          guestPlayer3Name,
          status,
          bookingType,
          createdAt
        `)
        .eq('clubId', club.id)
        .order('bookingDate', { ascending: false })
        .order('startTime', { ascending: false })
        .limit(100); // Limit to recent 100 bookings

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
        setBookings([]);
        return;
      }

      // Fetch court names and player names
      const bookingsWithDetails = await Promise.all((bookingsData || []).map(async (booking) => {
        const names: string[] = [];
        
        // Get court name
        let courtName = `Court ${booking.courtNumber || 'N/A'}`;
        if (booking.courtId) {
          const { data: courtData } = await supabase
            .from('Courts')
            .select('name')
            .eq('id', booking.courtId)
            .maybeSingle();
          if (courtData?.name) {
            courtName = courtData.name;
          }
        }
        
        // Fetch player names
        const playerIds = [
          booking.player1Id,
          booking.player2Id,
          booking.player3Id,
          booking.player4Id
        ].filter(Boolean) as string[];

        if (playerIds.length > 0) {
          const { data: playersData } = await supabase
            .from('Users')
            .select('id, Firstname, Surname')
            .in('id', playerIds);

          if (playersData) {
            playersData.forEach((player) => {
              const name = `${player.Firstname || ''} ${player.Surname || ''}`.trim();
              if (name) names.push(name);
            });
          }
        }
        
        // Add guest names
        if (booking.guestPlayer1Name) names.push(booking.guestPlayer1Name);
        if (booking.guestPlayer2Name) names.push(booking.guestPlayer2Name);
        if (booking.guestPlayer3Name) names.push(booking.guestPlayer3Name);
        
        return {
          ...booking,
          courtName,
          playerNames: names.length > 0 ? names.join(', ') : 'No players'
        };
      }));

      setBookings(bookingsWithDetails);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [club?.id]);

  // Load bookings when bookings tab is active
  useEffect(() => {
    if (activeTab === 'bookings' && club?.id) {
      loadBookings();
    }
  }, [activeTab, club?.id, loadBookings]);

  // Load players when club-players tab is active
  useEffect(() => {
    const loadPlayers = async () => {
      if (!club?.id || activeTab !== 'club-players') {
        return;
      }

      setIsLoadingPlayers(true);
      try {
        const supabase = getSupabaseClientClient();
        
        // Fetch users with roles linked to this club
        const { data: roles, error: rolesError } = await supabase
          .from('UserClubRoles')
          .select('userId, role, Users!inner(id, email, Firstname, Surname, avatarUrl, lastLoginAt)')
          .eq('clubId', club.id);

        if (rolesError) {
          console.error('Error fetching player roles:', rolesError);
          setPlayers([]);
          setIsLoadingPlayers(false);
          return;
        }

        // Create role map
        const roleMap = new Map<string, ClubRole>();
        const playersList: Array<{
          id: string;
          name: string;
          email: string;
          avatarUrl?: string;
          role: ClubRole;
          lastLoginAt?: string;
        }> = [];

        if (roles) {
          roles.forEach((r: any) => {
            const userId = typeof r.userId === 'object' ? r.userId.id : r.userId;
            const userData = typeof r.Users === 'object' ? r.Users : null;
            
            if (userData) {
              const name = userData.Firstname && userData.Surname
                ? `${userData.Firstname} ${userData.Surname}`
                : userData.Firstname || userData.Surname || userData.email?.split('@')[0] || 'Unknown';
              
              roleMap.set(userId, r.role);
              playersList.push({
                id: userId,
                name,
                email: userData.email || '',
                avatarUrl: userData.avatarUrl || undefined,
                role: r.role,
                lastLoginAt: userData.lastLoginAt || undefined
              });
            }
          });
        }

        // Sort by name
        playersList.sort((a, b) => a.name.localeCompare(b.name));
        setPlayers(playersList);
      } catch (err) {
        console.error('Error loading players:', err);
        setPlayers([]);
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    loadPlayers();
  }, [activeTab, club?.id]);

  // Search for users to add
  useEffect(() => {
    const searchUsers = async () => {
      if (!addPlayerSearchTerm.trim() || addPlayerSearchTerm.length < 2) {
        setAddPlayerSearchResults([]);
        return;
      }

      setIsSearchingPlayers(true);
      try {
        const supabase = getSupabaseClientClient();
        const term = addPlayerSearchTerm.toLowerCase();
        
        // Search users by name or email
        const { data, error } = await supabase
          .from('Users')
          .select('id, email, Firstname, Surname, avatarUrl')
          .or(`Firstname.ilike.%${term}%,Surname.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(10);

        if (error) {
          console.error('Error searching users:', error);
          setAddPlayerSearchResults([]);
          return;
        }

        if (data) {
          const results = data.map((u: any) => ({
            id: u.id,
            name: u.Firstname && u.Surname
              ? `${u.Firstname} ${u.Surname}`
              : u.Firstname || u.Surname || u.email?.split('@')[0] || 'Unknown',
            email: u.email || '',
            avatarUrl: u.avatarUrl || undefined
          }));
          
          // Filter out players already in the club
          const existingPlayerIds = new Set(players.map(p => p.id));
          const filteredResults = results.filter(r => !existingPlayerIds.has(r.id));
          
          setAddPlayerSearchResults(filteredResults);
        }
      } catch (err) {
        console.error('Error searching users:', err);
        setAddPlayerSearchResults([]);
      } finally {
        setIsSearchingPlayers(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [addPlayerSearchTerm, players]);

  // Handle impersonating a player
  const handleImpersonatePlayer = async (playerId: string) => {
    if (!user?.id || !isSuperAdmin) {
      alert('Only super admins can impersonate players');
      return;
    }

    if (!confirm('Are you sure you want to log in as this player? You will be signed out of your current session.')) {
      return;
    }

    setImpersonatingPlayerId(playerId);

    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: playerId,
          adminUserId: user.id,
          clubSlug: slug
        }),
      });

      // Get response text (this consumes the body, so we need to do it once)
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (textError) {
        console.error('Error reading response text:', textError);
        responseText = '(could not read response)';
      }
      
      // Log response details
      console.log('=== IMPERSONATE RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('OK:', response.ok);
      console.log('Response Text:', responseText);
      console.log('Response Text Length:', responseText?.length || 0);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
      console.log('===========================');
      
      // Check if response is ok
      if (!response.ok) {
        // Try to parse as JSON for error details
        let errorData: any = null;
        let errorMessage = `Server error (${response.status} ${response.statusText})`;
        
        try {
          if (responseText && responseText.trim() && responseText.trim() !== '(could not read response)') {
            errorData = JSON.parse(responseText);
            console.log('Parsed error data:', JSON.stringify(errorData, null, 2));
            errorMessage = errorData?.error || errorData?.details || errorData?.message || errorData?.linkError || errorMessage;
          } else {
            console.warn('Response text is empty or could not be read');
            errorData = { raw: responseText || '(empty response)' };
          }
        } catch (parseError: any) {
          console.error('Could not parse error response as JSON:', parseError);
          console.error('Parse error details:', parseError?.message, parseError?.stack);
          errorData = { raw: responseText || '(empty)', parseError: parseError?.message };
        }
        
        // Log error details separately with full details
        console.error('========== ERROR DETAILS ==========');
        console.error('ERROR STATUS:', response.status);
        console.error('ERROR STATUS TEXT:', response.statusText);
        console.error('ERROR DATA (full):', JSON.stringify(errorData, null, 2));
        console.error('ERROR DATA DETAILS:', errorData?.details);
        console.error('ERROR DATA ERROR:', errorData?.error);
        console.error('ERROR DATA LINK ERROR:', errorData?.linkError);
        console.error('ERROR DATA LINK ERROR CODE:', errorData?.linkErrorCode);
        console.error('ERROR MESSAGE:', errorMessage);
        console.error('RAW RESPONSE:', responseText);
        console.error('===================================');
        
        // Show more detailed error message
        const detailedError = errorData?.details || errorData?.error || errorData?.linkError || errorMessage;
        throw new Error(detailedError);
      }
      
      // Parse successful response
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('SUCCESS - Parsed data:', data);
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error(`Failed to parse server response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
      }

      // Store admin session info for later restoration
      if (session) {
        localStorage.setItem('admin_session_backup', JSON.stringify({
          userId: user.id,
          email: user.email,
          accessToken: session.access_token,
          refreshToken: session.refresh_token
        }));
      }

      // Use the magic link to sign in as the target user
      if (data.magicLink) {
        // Redirect to the magic link which will sign in as the target user
        window.location.href = data.magicLink;
      } else {
        console.error('No magic link in response:', data);
        throw new Error('No magic link provided in response');
      }
    } catch (err: any) {
      console.error('Error impersonating player:', err);
      const errorMessage = err.message || err.toString() || 'Failed to impersonate player. Please try again.';
      alert(`Error: ${errorMessage}\n\nCheck the browser console for more details.`);
      setImpersonatingPlayerId(null);
    }
  };

  // Handle adding a player to the club
  const handleAddPlayer = async () => {
    if (!selectedPlayerToAdd || !club?.id) {
      setAddPlayerError('Please select a player');
      return;
    }

    setIsAddingPlayer(true);
    setAddPlayerError('');
    setAddPlayerSuccess(false);

    try {
      const supabase = getSupabaseClientClient();
      
      // Log the attempt
      console.log('Adding player:', {
        userId: selectedPlayerToAdd.id,
        clubId: club.id,
        role: selectedRoleToAdd
      });
      
      // Verify function exists
      if (typeof setUserClubRole !== 'function') {
        console.error('setUserClubRole is not a function:', typeof setUserClubRole);
        setAddPlayerError('Failed to add player: Function not available');
        return;
      }

      let result;
      try {
        console.log('Calling setUserClubRole with:', {
          userId: selectedPlayerToAdd.id,
          clubId: club.id,
          role: selectedRoleToAdd,
          supabaseExists: !!supabase,
          functionType: typeof setUserClubRole
        });
        
        // Try calling the function with explicit Promise handling
        const promise = setUserClubRole(supabase, selectedPlayerToAdd.id, club.id, selectedRoleToAdd);
        console.log('Promise created:', promise);
        console.log('Is promise:', promise instanceof Promise);
        
        result = await promise;
        
        console.log('setUserClubRole returned:', result);
        console.log('Result type:', typeof result);
        console.log('Result keys:', result ? Object.keys(result) : 'null/undefined');
        
        // If result is still undefined, try direct implementation as fallback
        if (!result) {
          console.warn('setUserClubRole returned undefined, using fallback implementation');
          try {
            const { error: upsertError } = await supabase
              .from('UserClubRoles')
              .upsert(
                {
                  userId: selectedPlayerToAdd.id,
                  clubId: club.id,
                  role: selectedRoleToAdd,
                  updatedAt: new Date().toISOString(),
                },
                {
                  onConflict: 'userId,clubId',
                }
              );

            if (upsertError) {
              result = { success: false, error: upsertError.message };
            } else {
              result = { success: true };
            }
            console.log('Fallback implementation result:', result);
          } catch (fallbackErr: any) {
            console.error('Fallback implementation error:', fallbackErr);
            result = { success: false, error: fallbackErr.message || 'Unknown error' };
          }
        }
      } catch (err: any) {
        console.error('Error calling setUserClubRole:', err);
        console.error('Error stack:', err.stack);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        setAddPlayerError(`Failed to add player: ${err.message || 'Unknown error occurred'}`);
        return;
      }

      // Check if result is valid
      if (!result || typeof result !== 'object') {
        console.error('setUserClubRole returned invalid result:', result);
        console.error('Result type:', typeof result);
        setAddPlayerError('Failed to add player: Invalid response from server');
        return;
      }

      if (result.success) {
        setAddPlayerSuccess(true);
        setSelectedPlayerToAdd(null);
        setAddPlayerSearchTerm('');
        setAddPlayerSearchResults([]);
        setSelectedRoleToAdd('MEMBER');
        
        // Reload players list
        const reloadPlayers = async () => {
          const supabase = getSupabaseClientClient();
          setIsLoadingPlayers(true);
          try {
            const { data: roles, error: rolesError } = await supabase
              .from('UserClubRoles')
              .select('userId, role, Users!inner(id, email, Firstname, Surname, avatarUrl, lastLoginAt)')
              .eq('clubId', club.id);

            if (rolesError) {
              console.error('Error reloading players:', rolesError);
              setAddPlayerError(`Player added but failed to refresh list: ${rolesError.message}`);
              return;
            }

            if (roles) {
              const playersList: Array<{
                id: string;
                name: string;
                email: string;
                avatarUrl?: string;
                role: ClubRole;
                lastLoginAt?: string;
              }> = [];

              roles.forEach((r: any) => {
                const userId = typeof r.userId === 'object' ? r.userId.id : r.userId;
                const userData = typeof r.Users === 'object' ? r.Users : null;
                
                if (userData) {
                  const name = userData.Firstname && userData.Surname
                    ? `${userData.Firstname} ${userData.Surname}`
                    : userData.Firstname || userData.Surname || userData.email?.split('@')[0] || 'Unknown';
                  
                  playersList.push({
                    id: userId,
                    name,
                    email: userData.email || '',
                    avatarUrl: userData.avatarUrl || undefined,
                    role: r.role,
                    lastLoginAt: userData.lastLoginAt || undefined
                  });
                }
              });

              playersList.sort((a, b) => a.name.localeCompare(b.name));
              setPlayers(playersList);
            }
          } catch (err: any) {
            console.error('Error reloading players:', err);
            setAddPlayerError(`Player added but failed to refresh list: ${err.message || 'Unknown error'}`);
          } finally {
            setIsLoadingPlayers(false);
          }
        };
        
        reloadPlayers();
        
        // Clear success message after 3 seconds
        setTimeout(() => setAddPlayerSuccess(false), 3000);
      } else {
        const errorMsg = result.error || 'Failed to add player';
        console.error('Failed to add player:', errorMsg);
        setAddPlayerError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to add player';
      console.error('Exception adding player:', err);
      setAddPlayerError(errorMsg);
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // Filter players based on search term
  const filteredPlayers = useMemo(() => {
    if (!playerSearchTerm.trim()) return players;
    
    const term = playerSearchTerm.toLowerCase();
    return players.filter(player =>
      player.name.toLowerCase().includes(term) ||
      player.email.toLowerCase().includes(term)
    );
  }, [players, playerSearchTerm]);

  // Get role display label
  const getRoleLabel = (role: ClubRole): string => {
    switch (role) {
      case 'MEMBER':
        return 'Member';
      case 'VISITOR':
        return 'Visitor';
      case 'COACH':
        return 'Coach';
      case 'CLUB_ADMIN':
        return 'Club Admin';
      default:
        return 'Unknown';
    }
  };

  // Get role badge color
  const getRoleBadgeStyle = (role: ClubRole) => {
    switch (role) {
      case 'MEMBER':
        return { backgroundColor: '#3b82f6', color: '#ffffff' };
      case 'VISITOR':
        return { backgroundColor: '#9ca3af', color: '#ffffff' };
      case 'COACH':
        return { backgroundColor: '#f59e0b', color: '#ffffff' };
      case 'CLUB_ADMIN':
        return { backgroundColor: '#ef4444', color: '#ffffff' };
      default:
        return { backgroundColor: '#6b7280', color: '#ffffff' };
    }
  };

  // Show loading state
  if (authLoading || isLoading || !isAuthorized) {
    return (
      <div className={styles.adminLayout}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>{authLoading ? 'Loading authentication...' : isLoading ? 'Loading club data...' : 'Verifying permissions...'}</p>
          {error && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', color: '#fca5a5' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className={styles.adminLayout}>
        <div className={styles.loadingContainer}>
          <h2>Error</h2>
          <p>{error || 'Club not found'}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => router.push(`/club/${slug}`)} className={styles.btnPrimary}>
              Back to Club
            </button>
            {user && (
              <button 
                onClick={async () => {
                  try {
                    await signOut();
                    router.push('/login');
                  } catch (err) {
                    console.error('Error logging out:', err);
                    router.push('/login');
                  }
                }} 
                className={styles.btnSecondary}
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const userName = user ? `${(user as any).Firstname || ''} ${(user as any).Surname || ''}`.trim() || user.email?.split('@')[0] || 'Admin' : 'Admin';

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={`${styles.adminSidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          {!isSidebarCollapsed && (
            <div className={styles.sidebarBrand}>
              <h2>{club.name}</h2>
              <span className={styles.sidebarSubtitle}>Club Admin</span>
            </div>
          )}
          <button className={styles.toggleSidebarButton} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarCollapsed ? (
                <polyline points="9 18 15 12 9 6"></polyline>
              ) : (
                <polyline points="15 18 9 12 15 6"></polyline>
              )}
            </svg>
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <button
            className={`${styles.navItem} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
            title="Overview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            {!isSidebarCollapsed && <span>Overview</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'bookings' ? styles.active : ''}`}
            onClick={() => setActiveTab('bookings')}
            title="Bookings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {!isSidebarCollapsed && <span>Bookings</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'schedule-rules' ? styles.active : ''}`}
            onClick={() => setActiveTab('schedule-rules')}
            title="Schedule Rules"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            {!isSidebarCollapsed && <span>Schedule Rules</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'events' ? styles.active : ''}`}
            onClick={() => setActiveTab('events')}
            title="Events"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {!isSidebarCollapsed && <span>Events</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'club-documents' ? styles.active : ''}`}
            onClick={() => setActiveTab('club-documents')}
            title="Club Documents"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            {!isSidebarCollapsed && <span>Club Documents</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'club-players' ? styles.active : ''}`}
            onClick={() => setActiveTab('club-players')}
            title="Club Players"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {!isSidebarCollapsed && <span>Club Players</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'finance' ? styles.active : ''}`}
            onClick={() => setActiveTab('finance')}
            title="Finance"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            {!isSidebarCollapsed && <span>Finance</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'memberships' ? styles.active : ''}`}
            onClick={() => setActiveTab('memberships')}
            title="Memberships"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            {!isSidebarCollapsed && <span>Memberships</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'club-ranking' ? styles.active : ''}`}
            onClick={() => setActiveTab('club-ranking')}
            title="Club Ranking"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            {!isSidebarCollapsed && <span>Club Ranking</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'announcements' ? styles.active : ''}`}
            onClick={() => setActiveTab('announcements')}
            title="Announcements"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {!isSidebarCollapsed && <span>Announcements</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'coaching' ? styles.active : ''}`}
            onClick={() => setActiveTab('coaching')}
            title="Coaching"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {!isSidebarCollapsed && <span>Coaching</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'league' ? styles.active : ''}`}
            onClick={() => setActiveTab('league')}
            title="League"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            {!isSidebarCollapsed && <span>League</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'emailers' ? styles.active : ''}`}
            onClick={() => setActiveTab('emailers')}
            title="Emailers"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            {!isSidebarCollapsed && <span>Emailers</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 17.364m12.728 0l-4.243-4.243m-4.242 0L5.636 6.636"></path>
            </svg>
            {!isSidebarCollapsed && <span>Settings</span>}
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            {currentUserAvatarUrl ? (
              <img
                src={currentUserAvatarUrl}
                alt={userName}
                className={styles.userAvatar}
                style={{
                  borderRadius: '50%',
                  objectFit: 'cover',
                  width: '40px',
                  height: '40px'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className={styles.userAvatar}
              style={{ display: currentUserAvatarUrl ? 'none' : 'flex' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className={styles.userDetails}>
                <div className={styles.userName}>{userName}</div>
                <div className={styles.userEmail}>{user?.email}</div>
              </div>
            )}
          </div>
          <button
            className={styles.logoutButton}
            onClick={() => {
              signOut();
              router.push('/login');
            }}
            title="Log out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isSidebarCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.adminMain} style={{ position: 'relative' }}>
        <div className={styles.adminContent}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          {activeTab === 'overview' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Overview</h1>
                  <p className={styles.sectionSubtitle}>Club dashboard and key metrics</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Link 
                    href={`/club/${slug}`}
                    className={styles.btnPrimary}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View Club Page
                  </Link>
                  <button 
                    onClick={() => router.push('/admin')}
                    className={styles.btnSecondary}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back to Admin
                  </button>
                </div>
              </div>

              <div className={adminStyles.featuresGrid}>
                {/* Court Booking */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>Court Booking</h3>
                  <span className={`${adminStyles.featureStatus} ${(club?.moduleCourtBooking ?? true) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {(club?.moduleCourtBooking ?? true) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>{bookings.length} bookings</div>
                </div>

                {/* Member Manager */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="7" y1="8" x2="17" y2="8"></line>
                      <line x1="7" y1="12" x2="17" y2="12"></line>
                      <line x1="7" y1="16" x2="12" y2="16"></line>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>Member Manager</h3>
                  <span className={`${adminStyles.featureStatus} ${(club?.moduleMemberManager ?? false) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {(club?.moduleMemberManager ?? false) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>Find out more</div>
                </div>

                {/* Website */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>Website</h3>
                  <span className={`${adminStyles.featureStatus} ${(club?.moduleWebsite ?? true) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {(club?.moduleWebsite ?? true) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>{bookings.length} bookings</div>
                </div>

                {/* Emailers */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>Emailers</h3>
                  <span className={`${adminStyles.featureStatus} ${(club?.moduleEmailers ?? true) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {(club?.moduleEmailers ?? true) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>{bookings.length} bookings</div>
                </div>

                {/* Payments */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>Payments</h3>
                  <span className={`${adminStyles.featureStatus} ${((club?.moduleVisitorPayment ?? true) || (club?.moduleFloodlightPayment ?? true)) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {((club?.moduleVisitorPayment ?? true) || (club?.moduleFloodlightPayment ?? true)) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>{bookings.length} bookings</div>
                </div>

                {/* Events */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>Events</h3>
                  <span className={`${adminStyles.featureStatus} ${(club?.moduleEvents ?? true) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {(club?.moduleEvents ?? true) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>{bookings.length} bookings</div>
                </div>

                {/* Coaching */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>Coaching</h3>
                  <span className={`${adminStyles.featureStatus} ${(club?.moduleCoaching ?? true) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {(club?.moduleCoaching ?? true) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>{bookings.length} bookings</div>
                </div>

                {/* League */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <circle cx="12" cy="12" r="6"></circle>
                      <circle cx="12" cy="12" r="2"></circle>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>League</h3>
                  <span className={`${adminStyles.featureStatus} ${(club?.moduleLeague ?? true) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {(club?.moduleLeague ?? true) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>{bookings.length} bookings</div>
                </div>


                {/* Access Control */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>Access Control</h3>
                  <span className={`${adminStyles.featureStatus} ${(club?.moduleAccessControl ?? true) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {(club?.moduleAccessControl ?? true) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>{bookings.length} bookings</div>
                </div>

                {/* Finance Integration */}
                <div className={adminStyles.featureCard}>
                  <div className={adminStyles.featureIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                      <path d="M9 14l2 2 4-4"></path>
                    </svg>
                  </div>
                  <h3 className={adminStyles.featureTitle}>Finance Integration</h3>
                  <span className={`${adminStyles.featureStatus} ${(club?.moduleFinanceIntegration ?? true) ? adminStyles.featureStatusActive : adminStyles.featureStatusDisabled}`}>
                    {(club?.moduleFinanceIntegration ?? true) ? 'Active' : 'Disabled'}
                  </span>
                  <div className={adminStyles.featureDetail}>{bookings.length} bookings</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Settings</h1>
                  <p className={styles.sectionSubtitle}>Manage club settings</p>
                </div>
              </div>
              
              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* General Settings */}
                <div className={adminStyles.settingsSection}>
                  <h2 className={adminStyles.settingsTitle}>
                    General Settings
                  </h2>
                  <p className={adminStyles.settingsDescription}>
                    Configure general booking settings
                  </p>
                  
                  <div className={adminStyles.formGroup}>
                    <label className={adminStyles.formLabel}>
                      Booking Slot Interval
                    </label>
                    <div className={adminStyles.buttonGroup}>
                      {[30, 60, 90, 120].map((interval) => (
                        <button
                          key={interval}
                          onClick={() => setBookingSlotInterval(interval)}
                          className={`${adminStyles.intervalButton} ${bookingSlotInterval === interval ? adminStyles.intervalButtonSelected : ''}`}
                          onMouseEnter={(e) => {
                            if (bookingSlotInterval !== interval) {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (bookingSlotInterval !== interval) {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            }
                          }}
                        >
                          {interval}min
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={adminStyles.formGroup} style={{ marginTop: '24px' }}>
                    <label className={adminStyles.formLabel}>
                      Session Duration
                    </label>
                    <div className={adminStyles.buttonGroup}>
                      {[60, 90, 120].map((duration) => (
                        <button
                          key={duration}
                          onClick={() => {
                            const currentDurations = sessionDuration || [];
                            const newDurations = currentDurations.includes(duration)
                              ? currentDurations.filter(d => d !== duration)
                              : [...currentDurations, duration].sort((a, b) => a - b);
                            setSessionDuration(newDurations.length > 0 ? newDurations : [60]);
                          }}
                          className={`${adminStyles.intervalButton} ${(sessionDuration || []).includes(duration) ? adminStyles.intervalButtonSelected : ''}`}
                          onMouseEnter={(e) => {
                            if (!(sessionDuration || []).includes(duration)) {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(sessionDuration || []).includes(duration)) {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            }
                          }}
                        >
                          {duration}min
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Opening Time */}
                  <div className={adminStyles.formRowWithMargin}>
                    <label className={adminStyles.formLabelSmall}>
                      Opening Time:
                    </label>
                    <div className={adminStyles.timePickerContainer}>
                      <select
                        value={openingTime.split(':')[0]}
                        onChange={(e) => {
                          const minutes = openingTime.split(':')[1] || '00';
                          setOpeningTime(`${e.target.value}:${minutes}`);
                        }}
                        className={adminStyles.formSelect}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i.toString().padStart(2, '0')}>
                            {i.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <span className={adminStyles.timeSeparator}>:</span>
                      <select
                        value={openingTime.split(':')[1] || '00'}
                        onChange={(e) => {
                          const hours = openingTime.split(':')[0];
                          setOpeningTime(`${hours}:${e.target.value}`);
                        }}
                        className={adminStyles.formSelect}
                      >
                        <option value="00">00</option>
                        <option value="30">30</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Closing Time */}
                  <div className={adminStyles.formRowWithMargin} style={{ marginTop: '16px' }}>
                    <label className={adminStyles.formLabelSmall}>
                      Closing Time:
                    </label>
                    <div className={adminStyles.timePickerContainer}>
                      <select
                        value={closingTime.split(':')[0]}
                        onChange={(e) => {
                          const minutes = closingTime.split(':')[1] || '00';
                          setClosingTime(`${e.target.value}:${minutes}`);
                        }}
                        className={adminStyles.formSelect}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i.toString().padStart(2, '0')}>
                            {i.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <span className={adminStyles.timeSeparator}>:</span>
                      <select
                        value={closingTime.split(':')[1] || '00'}
                        onChange={(e) => {
                          const hours = closingTime.split(':')[0];
                          setClosingTime(`${hours}:${e.target.value}`);
                        }}
                        className={adminStyles.formSelect}
                      >
                        <option value="00">00</option>
                        <option value="30">30</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Members Settings */}
                <div style={{
                  padding: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#ffffff'
                  }}>
                    Members Settings
                  </h2>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px',
                    marginBottom: '24px'
                  }}>
                    Configure settings for club members
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <label style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '14px',
                      fontWeight: 500,
                      minWidth: '200px'
                    }}>
                      Days in advance they can book:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={membersBookingDays}
                      onChange={(e) => setMembersBookingDays(parseInt(e.target.value) || 0)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px',
                        width: '100px',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    />
                    <span style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '14px'
                    }}>
                      days
                    </span>
                  </div>
                </div>

                {/* Visitor Settings */}
                <div style={{
                  padding: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#ffffff'
                  }}>
                    Visitor Settings
                  </h2>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px',
                    marginBottom: '24px'
                  }}>
                    Configure settings for visitors
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <label style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '14px',
                      fontWeight: 500,
                      minWidth: '200px'
                    }}>
                      Days in advance they can book:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={visitorBookingDays}
                      onChange={(e) => setVisitorBookingDays(parseInt(e.target.value) || 0)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px',
                        width: '100px',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    />
                    <span style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '14px'
                    }}>
                      days
                    </span>
                  </div>
                </div>

                {/* Coach Settings */}
                <div style={{
                  padding: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#ffffff'
                  }}>
                    Coach Settings
                  </h2>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px',
                    marginBottom: '24px'
                  }}>
                    Configure settings for coaches
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <label style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '14px',
                      fontWeight: 500,
                      minWidth: '200px'
                    }}>
                      Days in advance they can book:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={coachBookingDays}
                      onChange={(e) => setCoachBookingDays(parseInt(e.target.value) || 0)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px',
                        width: '100px',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    />
                    <span style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '14px'
                    }}>
                      days
                    </span>
                  </div>
                </div>

                {/* Club Manager Settings */}
                <div style={{
                  padding: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#ffffff'
                  }}>
                    Club Manager Settings
                  </h2>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px',
                    marginBottom: '24px'
                  }}>
                    Configure settings for club managers. Super Admins will use the same setting.
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <label style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '14px',
                      fontWeight: 500,
                      minWidth: '200px'
                    }}>
                      Days in advance they can book:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={clubManagerBookingDays}
                      onChange={(e) => setClubManagerBookingDays(parseInt(e.target.value) || 0)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px',
                        width: '100px',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    />
                    <span style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '14px'
                    }}>
                      days
                    </span>
                  </div>
                </div>

                {/* Save Button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <button
                    onClick={async () => {
                      if (!club) {
                        setError('Club not loaded');
                        return;
                      }
                      
                      setIsSaving(true);
                      setError('');
                      
                      try {
                        // Ensure bookingSlotInterval is a number
                        const intervalToSave = typeof bookingSlotInterval === 'number' 
                          ? bookingSlotInterval 
                          : parseInt(String(bookingSlotInterval), 10);
                        
                        console.log('Saving settings:', {
                          bookingSlotInterval,
                          intervalToSave,
                          openingTime,
                          closingTime
                        });
                        
                        const response = await fetch(`/api/admin/clubs/${club.id}/update`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            name: club.name,
                            numberOfCourts: club.numberOfCourts || 1,
                            country: club.country || null,
                            province: club.province || null,
                            is_active: club.is_active !== undefined ? club.is_active : true,
                            logo: (club as any).logo || null,
                            openingTime: openingTime,
                            closingTime: closingTime,
                            bookingSlotInterval: intervalToSave,
                            sessionDuration: sessionDuration,
                            membersBookingDays: membersBookingDays,
                            visitorBookingDays: visitorBookingDays,
                            coachBookingDays: coachBookingDays,
                            clubManagerBookingDays: clubManagerBookingDays,
                          }),
                        });

                        const result = await response.json();

                        if (!response.ok) {
                          throw new Error(result.error || 'Failed to save settings');
                        }

                        console.log('Save response:', result);
                        if (result.warning) {
                          console.warn('Warning from API:', result.warning);
                          alert('Settings saved, but some fields may not have been updated. Check console for details.');
                        }

                        // Reload club data to get updated values
                        hasLoadedRef.current = false;
                        setClub(null); // Clear club to force reload
                        await loadClubData(true);
                        
                        setError('');
                        // Show success message
                        alert('Settings saved successfully!');
                      } catch (err: any) {
                        console.error('Error saving settings:', err);
                        setError(err.message || 'Failed to save settings');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className={styles.btnPrimary}
                    style={{
                      minWidth: '120px'
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Bookings</h1>
                  <p className={styles.sectionSubtitle}>Manage club bookings</p>
                </div>
                <button
                  onClick={loadBookings}
                  disabled={isLoadingBookings}
                  className={styles.btnSecondary}
                  style={{ marginLeft: 'auto' }}
                >
                  {isLoadingBookings ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <div style={{ padding: '32px' }}>
                {isLoadingBookings ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div className={styles.spinner}></div>
                    <p style={{ marginTop: '16px', color: 'rgba(255, 255, 255, 0.7)' }}>Loading bookings...</p>
                  </div>
                ) : bookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    <p>No bookings found.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', overflow: 'hidden' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '13px' }}>Date</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '13px' }}>Time</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '13px' }}>Court</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '13px' }}>Duration</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '13px' }}>Players</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '13px' }}>Type</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, fontSize: '13px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => {
                          const date = new Date(booking.bookingDate);
                          const formattedDate = date.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                          const statusColors: Record<string, string> = {
                            pending: 'rgba(251, 191, 36, 0.2)',
                            confirmed: 'rgba(34, 197, 94, 0.2)',
                            cancelled: 'rgba(239, 68, 68, 0.2)',
                            completed: 'rgba(59, 130, 246, 0.2)',
                            no_show: 'rgba(156, 163, 175, 0.2)'
                          };
                          const statusTextColors: Record<string, string> = {
                            pending: '#fbbf24',
                            confirmed: '#22c55e',
                            cancelled: '#ef4444',
                            completed: '#3b82f6',
                            no_show: '#9ca3af'
                          };
                          
                          return (
                            <tr 
                              key={booking.id} 
                              style={{ 
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>
                                {formattedDate}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>
                                {booking.startTime} - {booking.endTime}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px', fontWeight: 500 }}>
                                {booking.courtName}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>
                                {booking.duration} min
                              </td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>
                                {booking.playerNames}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px', textTransform: 'capitalize' }}>
                                {booking.bookingType || 'singles'}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                <span
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: statusColors[booking.status] || 'rgba(255, 255, 255, 0.1)',
                                    color: statusTextColors[booking.status] || 'rgba(255, 255, 255, 0.9)',
                                    fontWeight: 500,
                                    textTransform: 'capitalize',
                                    fontSize: '12px'
                                  }}
                                >
                                  {booking.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule-rules' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Schedule Rules</h1>
                  <p className={styles.sectionSubtitle}>Block courts for specific events or maintenance</p>
                </div>
                <button
                  className={styles.btnPrimary}
                  onClick={() => {
                    setEditingRule({
                      id: null,
                      name: '',
                      courts: [],
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: new Date().toISOString().split('T')[0],
                      startTime: '00:00',
                      endTime: '23:59',
                      reason: '',
                      recurring: 'none' as const,
                      recurringDays: [],
                      disabledDates: [],
                      status: 'active' as const,
                      setting: 'blocked' as const
                    });
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Rule
                </button>
              </div>
              
              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Database Setup Warning */}
                {scheduleRulesTableExists === false && (
                  <div style={{
                    padding: '16px 20px',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '8px',
                    color: '#fbbf24',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>
                      ⚠️ Database Table Not Found
                    </div>
                    <div style={{ fontSize: '14px', color: 'rgba(251, 191, 36, 0.9)' }}>
                      The ScheduleRules table has not been created yet. Rules will be saved locally only and will be lost on page refresh.
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(251, 191, 36, 0.8)', marginTop: '4px' }}>
                      To enable persistent storage, run the SQL migration file: <code style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>CREATE_SCHEDULE_RULES_TABLE.sql</code> in your Supabase SQL Editor.
                    </div>
                  </div>
                )}

                {/* Rules Table */}
                {scheduleRules.length === 0 && !editingRule ? (
                  <div style={{ 
                    padding: '48px', 
                    textAlign: 'center', 
                    color: 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)'
                  }}>
                    <p>No schedule rules configured. Click "Add Rule" to create one.</p>
                  </div>
                ) : !editingRule ? (
                  <div style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 500 }}>Name</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 500 }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 500 }}>Setting</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 500 }}>Courts</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 500 }}>Date Range</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 500 }}>Time</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 500 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleRules.map((rule) => {
                          const settingLabels: Record<string, string> = {
                            'blocked': 'Blocked',
                            'blocked-coaching': 'Blocked for Coaching',
                            'blocked-tournament': 'Blocked for Tournament',
                            'blocked-maintenance': 'Blocked for Maintenance',
                            'blocked-social': 'Blocked for Social',
                            'members-only': 'Members Only',
                            'members-only-bookings': 'Members Only Bookings',
                            'open-doubles-singles': 'Open Doubles & Singles',
                            'doubles-only': 'Doubles Only',
                            'singles-only': 'Singles Only'
                          };
                          return (
                            <tr key={rule.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <td style={{ padding: '12px 16px', color: '#ffffff' }}>{rule.name || '(Unnamed)'}</td>
                              <td style={{ padding: '12px 16px', color: '#ffffff' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  backgroundColor: rule.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                  color: rule.status === 'active' ? '#22c55e' : '#ef4444'
                                }}>
                                  {rule.status === 'active' ? 'Active' : 'Pause'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.8)' }}>{settingLabels[rule.setting] || rule.setting}</td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.8)' }}>
                                {rule.courts.length > 0 ? rule.courts.map(c => `Court ${c}`).join(', ') : 'None'}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.8)' }}>
                                {rule.startDate === rule.endDate ? rule.startDate : `${rule.startDate} - ${rule.endDate}`}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.8)' }}>
                                {rule.startTime} - {rule.endTime}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => setEditingRule({ ...rule })}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: 'rgba(102, 126, 234, 0.2)',
                                      border: '1px solid rgba(102, 126, 234, 0.3)',
                                      borderRadius: '4px',
                                      color: '#667eea',
                                      cursor: 'pointer',
                                      fontSize: '14px'
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const supabase = getSupabaseClientClient();
                                        const { error } = await supabase
                                          .from('ScheduleRules')
                                          .delete()
                                          .eq('id', rule.id);

                                        if (error) {
                                          console.error('Error deleting schedule rule:', error);
                                        }
                                        // Update local state regardless of database result
                                        setScheduleRules(prevRules => prevRules.filter(r => r.id !== rule.id));
                                        // Reload from database if table exists
                                        if (scheduleRulesTableExists) {
                                          await loadScheduleRules();
                                        }
                                      } catch (err) {
                                        console.error('Error deleting schedule rule:', err);
                                        // Update local state on error
                                        setScheduleRules(prevRules => prevRules.filter(r => r.id !== rule.id));
                                      }
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: 'transparent',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: '4px',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      fontSize: '14px'
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {/* Edit/Create Form */}
                {editingRule && (
                  <div className={adminStyles.settingsSection}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                        {editingRule.id ? 'Edit Rule' : 'New Rule'}
                      </h3>
                      <button
                        onClick={() => setEditingRule(null)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'rgba(255, 255, 255, 0.7)',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className={adminStyles.formRow}>
                        <label className={adminStyles.formLabel}>Rule Name / Description:</label>
                        <input
                          type="text"
                          value={editingRule.name}
                          onChange={(e) => {
                            setEditingRule({ ...editingRule, name: e.target.value });
                          }}
                          placeholder="e.g., Court Maintenance, Tournament"
                          className={adminStyles.formInput}
                          style={{ flex: 1 }}
                        />
                      </div>

                      <div className={adminStyles.formRow}>
                        <label className={adminStyles.formLabel}>Status:</label>
                        <select
                          value={editingRule.status}
                          onChange={(e) => {
                            setEditingRule({ ...editingRule, status: e.target.value as 'active' | 'pause' });
                          }}
                          className={adminStyles.formSelect}
                          style={{ flex: 1 }}
                        >
                          <option value="active">Active</option>
                          <option value="pause">Pause</option>
                        </select>
                      </div>

                      <div className={adminStyles.formRow}>
                        <label className={adminStyles.formLabel}>Setting:</label>
                        <select
                          value={editingRule.setting}
                          onChange={(e) => {
                            setEditingRule({ ...editingRule, setting: e.target.value as typeof editingRule.setting });
                          }}
                          className={adminStyles.formSelect}
                          style={{ flex: 1 }}
                        >
                          <option value="blocked">Blocked</option>
                          <option value="blocked-coaching">Blocked for Coaching</option>
                          <option value="blocked-tournament">Blocked for Tournament</option>
                          <option value="blocked-maintenance">Blocked for Maintenance</option>
                          <option value="blocked-social">Blocked for Social</option>
                          <option value="members-only">Members Only</option>
                          <option value="members-only-bookings">Members Only Bookings</option>
                          <option value="open-doubles-singles">Open Doubles & Singles</option>
                          <option value="doubles-only">Doubles Only</option>
                          <option value="singles-only">Singles Only</option>
                        </select>
                      </div>

                      <div className={adminStyles.formRow}>
                        <label className={adminStyles.formLabel}>Courts:</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                          {courts.length > 0 ? (
                            courts.map((court) => {
                              const courtNum = court.courtNumber || parseInt(court.name.match(/\d+/)?.[0] || '0', 10);
                              return (
                                <button
                                  key={court.id}
                                  onClick={() => {
                                    const newCourts = editingRule.courts.includes(courtNum)
                                      ? editingRule.courts.filter(c => c !== courtNum)
                                      : [...editingRule.courts, courtNum];
                                    setEditingRule({ ...editingRule, courts: newCourts });
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: editingRule.courts.includes(courtNum) 
                                      ? 'rgba(102, 126, 234, 0.2)' 
                                      : 'rgba(255, 255, 255, 0.05)',
                                    border: `1px solid ${editingRule.courts.includes(courtNum) 
                                      ? '#667eea' 
                                      : 'rgba(255, 255, 255, 0.2)'}`,
                                    borderRadius: '4px',
                                    color: editingRule.courts.includes(courtNum) ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                  }}
                                >
                                  {court.name}
                                </button>
                              );
                            })
                          ) : (
                            // Fallback if no courts loaded
                            Array.from({ length: club?.numberOfCourts || 1 }, (_, i) => i + 1).map((courtNum) => (
                              <button
                                key={courtNum}
                                onClick={() => {
                                  const newCourts = editingRule.courts.includes(courtNum)
                                    ? editingRule.courts.filter(c => c !== courtNum)
                                    : [...editingRule.courts, courtNum];
                                  setEditingRule({ ...editingRule, courts: newCourts });
                                }}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: editingRule.courts.includes(courtNum) 
                                    ? 'rgba(102, 126, 234, 0.2)' 
                                    : 'rgba(255, 255, 255, 0.05)',
                                  border: `1px solid ${editingRule.courts.includes(courtNum) 
                                    ? '#667eea' 
                                    : 'rgba(255, 255, 255, 0.2)'}`,
                                  borderRadius: '4px',
                                  color: editingRule.courts.includes(courtNum) ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                                  cursor: 'pointer',
                                  fontSize: '14px'
                                }}
                              >
                                Court {courtNum}
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className={adminStyles.formRow}>
                          <label className={adminStyles.formLabel}>Start Date:</label>
                          <input
                            type="date"
                            value={editingRule.startDate}
                            onChange={(e) => {
                              setEditingRule({ ...editingRule, startDate: e.target.value });
                            }}
                            className={adminStyles.formInput}
                          />
                        </div>

                        <div className={adminStyles.formRow}>
                          <label className={adminStyles.formLabel}>End Date:</label>
                          <input
                            type="date"
                            value={editingRule.endDate}
                            onChange={(e) => {
                              setEditingRule({ ...editingRule, endDate: e.target.value });
                            }}
                            className={adminStyles.formInput}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className={adminStyles.formRow}>
                          <label className={adminStyles.formLabel}>Start Time:</label>
                          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                            <select
                              value={editingRule.startTime.split(':')[0] || '00'}
                              onChange={(e) => {
                                const hours = e.target.value;
                                const minutes = editingRule.startTime.split(':')[1] || '00';
                                setEditingRule({ ...editingRule, startTime: `${hours}:${minutes}` });
                              }}
                              className={adminStyles.formSelect}
                              style={{ flex: 1 }}
                            >
                              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                <option key={hour} value={String(hour).padStart(2, '0')}>
                                  {String(hour).padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                            <span style={{ color: 'rgba(255, 255, 255, 0.7)', alignSelf: 'center' }}>:</span>
                            <select
                              value={editingRule.startTime.split(':')[1] || '00'}
                              onChange={(e) => {
                                const hours = editingRule.startTime.split(':')[0] || '00';
                                const minutes = e.target.value;
                                setEditingRule({ ...editingRule, startTime: `${hours}:${minutes}` });
                              }}
                              className={adminStyles.formSelect}
                              style={{ flex: 1 }}
                            >
                              <option value="00">00</option>
                              <option value="30">30</option>
                            </select>
                          </div>
                        </div>

                        <div className={adminStyles.formRow}>
                          <label className={adminStyles.formLabel}>End Time:</label>
                          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                            <select
                              value={editingRule.endTime.split(':')[0] || '00'}
                              onChange={(e) => {
                                const hours = e.target.value;
                                const minutes = editingRule.endTime.split(':')[1] || '00';
                                setEditingRule({ ...editingRule, endTime: `${hours}:${minutes}` });
                              }}
                              className={adminStyles.formSelect}
                              style={{ flex: 1 }}
                            >
                              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                <option key={hour} value={String(hour).padStart(2, '0')}>
                                  {String(hour).padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                            <span style={{ color: 'rgba(255, 255, 255, 0.7)', alignSelf: 'center' }}>:</span>
                            <select
                              value={editingRule.endTime.split(':')[1] || '00'}
                              onChange={(e) => {
                                const hours = editingRule.endTime.split(':')[0] || '00';
                                const minutes = e.target.value;
                                setEditingRule({ ...editingRule, endTime: `${hours}:${minutes}` });
                              }}
                              className={adminStyles.formSelect}
                              style={{ flex: 1 }}
                            >
                              <option value="00">00</option>
                              <option value="30">30</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className={adminStyles.formRow}>
                        <label className={adminStyles.formLabel}>Recurring:</label>
                        <select
                          value={editingRule.recurring}
                          onChange={(e) => {
                            const newRecurring = e.target.value as 'none' | 'daily' | 'weekly';
                            setEditingRule({ 
                              ...editingRule, 
                              recurring: newRecurring,
                              recurringDays: newRecurring === 'weekly' ? (editingRule.recurringDays || []) : undefined
                            });
                          }}
                          className={adminStyles.formSelect}
                          style={{ flex: 1 }}
                        >
                          <option value="none">None (One-time)</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>

                      {editingRule.recurring === 'weekly' && (
                        <div className={adminStyles.formRow}>
                          <label className={adminStyles.formLabel}>Days of Week:</label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                            {[
                              { value: 0, label: 'Sun' },
                              { value: 1, label: 'Mon' },
                              { value: 2, label: 'Tue' },
                              { value: 3, label: 'Wed' },
                              { value: 4, label: 'Thu' },
                              { value: 5, label: 'Fri' },
                              { value: 6, label: 'Sat' }
                            ].map((day) => (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => {
                                  const currentDays = editingRule.recurringDays || [];
                                  const newDays = currentDays.includes(day.value)
                                    ? currentDays.filter(d => d !== day.value)
                                    : [...currentDays, day.value].sort();
                                  setEditingRule({ ...editingRule, recurringDays: newDays });
                                }}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: (editingRule.recurringDays || []).includes(day.value)
                                    ? 'rgba(102, 126, 234, 0.2)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                  border: `1px solid ${(editingRule.recurringDays || []).includes(day.value)
                                    ? '#667eea'
                                    : 'rgba(255, 255, 255, 0.2)'}`,
                                  borderRadius: '4px',
                                  color: (editingRule.recurringDays || []).includes(day.value) ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  minWidth: '50px'
                                }}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {editingRule.recurring === 'weekly' && editingRule.startDate && editingRule.endDate && editingRule.recurringDays && editingRule.recurringDays.length > 0 && (() => {
                        // Generate all occurrences of selected days between startDate and endDate
                        const generateDayOccurrences = (startDateStr: string, endDateStr: string, selectedDays: number[]) => {
                          // Parse date string (YYYY-MM-DD) to avoid timezone issues
                          const parseDateStr = (dateStr: string): Date => {
                            const [year, month, day] = dateStr.split('-').map(Number);
                            return new Date(year, month - 1, day, 0, 0, 0, 0); // Local time, not UTC
                          };
                          
                          // Format date as YYYY-MM-DD (local time, no timezone conversion)
                          const formatDateStr = (date: Date): string => {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                          };
                          
                          const start = parseDateStr(startDateStr);
                          const end = parseDateStr(endDateStr);
                          const occurrences: Array<{ date: string; dateObj: Date; label: string }> = [];
                          
                          const currentDate = new Date(start);
                          end.setHours(23, 59, 59, 999);
                          
                          // Format date: "Fri, Jan 5"
                          const formatDate = (date: Date) => {
                            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
                          };
                          
                          while (currentDate <= end) {
                            const dayOfWeek = currentDate.getDay();
                            if (selectedDays.includes(dayOfWeek)) {
                              const dateStr = formatDateStr(currentDate); // Use local time formatting
                              occurrences.push({
                                date: dateStr,
                                dateObj: new Date(currentDate),
                                label: formatDate(currentDate)
                              });
                            }
                            currentDate.setDate(currentDate.getDate() + 1);
                          }
                          
                          return occurrences;
                        };
                        
                        const occurrences = generateDayOccurrences(
                          editingRule.startDate, 
                          editingRule.endDate, 
                          editingRule.recurringDays
                        );
                        const disabledDates = editingRule.disabledDates || [];
                        
                        // Toggle individual date
                        const toggleDate = (dateStr: string) => {
                          const newDisabledDates = [...disabledDates];
                          const isDisabled = disabledDates.includes(dateStr);
                          
                          if (isDisabled) {
                            // Remove from disabled dates
                            const index = newDisabledDates.indexOf(dateStr);
                            if (index > -1) {
                              newDisabledDates.splice(index, 1);
                            }
                          } else {
                            // Add to disabled dates
                            if (!newDisabledDates.includes(dateStr)) {
                              newDisabledDates.push(dateStr);
                            }
                          }
                          
                          setEditingRule({ ...editingRule, disabledDates: newDisabledDates });
                        };
                        
                        // Get day name(s) for label
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const selectedDayNames = editingRule.recurringDays
                          .map(day => dayNames[day])
                          .join(', ');
                        
                        return occurrences.length > 0 ? (
                          <div className={adminStyles.formRow}>
                            <label className={adminStyles.formLabel}>Disable {selectedDayNames}:</label>
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '8px', 
                              flex: 1,
                              maxHeight: '200px',
                              overflowY: 'auto',
                              padding: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '4px',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              {occurrences.map((occurrence) => {
                                const isDisabled = disabledDates.includes(occurrence.date);
                                return (
                                  <button
                                    key={occurrence.date}
                                    type="button"
                                    onClick={() => toggleDate(occurrence.date)}
                                    style={{
                                      padding: '8px 12px',
                                      backgroundColor: isDisabled
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : 'rgba(255, 255, 255, 0.05)',
                                      border: `1px solid ${isDisabled
                                        ? 'rgba(239, 68, 68, 0.3)'
                                        : 'rgba(255, 255, 255, 0.2)'}`,
                                      borderRadius: '4px',
                                      color: isDisabled ? '#ef4444' : 'rgba(255, 255, 255, 0.7)',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      textAlign: 'left',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <span>{occurrence.label}</span>
                                    <span style={{ 
                                      fontSize: '12px', 
                                      opacity: 0.7,
                                      fontWeight: isDisabled ? '600' : '400'
                                    }}>
                                      {isDisabled ? 'Disabled' : 'Active'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      <div className={adminStyles.formRow}>
                        <label className={adminStyles.formLabel}>Reason (optional):</label>
                        <textarea
                          value={editingRule.reason}
                          onChange={(e) => {
                            setEditingRule({ ...editingRule, reason: e.target.value });
                          }}
                          placeholder="Additional details about this block..."
                          className={adminStyles.formInput}
                          style={{ flex: 1, minHeight: '80px', resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <button
                          onClick={() => setEditingRule(null)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!editingRule || !club?.id) return;
                            
                            try {
                              const supabase = getSupabaseClientClient();
                              
                              const ruleData = {
                                clubId: club.id,
                                name: editingRule.name,
                                courts: editingRule.courts,
                                startDate: editingRule.startDate,
                                endDate: editingRule.endDate,
                                startTime: editingRule.startTime,
                                endTime: editingRule.endTime,
                                reason: editingRule.reason,
                                recurring: editingRule.recurring,
                                recurringDays: editingRule.recurringDays || [],
                                disabledDates: editingRule.disabledDates || [],
                                status: editingRule.status,
                                setting: editingRule.setting
                              };

                              if (editingRule.id) {
                                // Update existing rule
                                const { data, error } = await supabase
                                  .from('ScheduleRules')
                                  .update(ruleData)
                                  .eq('id', editingRule.id)
                                  .select()
                                  .single();

                                if (error) {
                                  const errorCode = error.code || '';
                                  const errorMessage = error.message || '';
                                  
                                  // If table doesn't exist, just use local state
                                  if (errorCode === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('table')) {
                                    console.log('ScheduleRules table does not exist. Updating local state only.');
                                    const ruleId = editingRule.id;
                                    setScheduleRules(prevRules => prevRules.map(r => 
                                      r.id === ruleId 
                                        ? { ...editingRule, id: ruleId } 
                                        : r
                                    ));
                                    setEditingRule(null);
                                    return;
                                  }
                                  
                                  console.error('Error updating schedule rule:', {
                                    message: errorMessage,
                                    code: errorCode,
                                    details: error.details || null,
                                    hint: error.hint || null,
                                  });
                                  // Fallback to local state update if database update fails
                                  const ruleId = editingRule.id;
                                  setScheduleRules(prevRules => prevRules.map(r => 
                                    r.id === ruleId 
                                      ? { ...editingRule, id: ruleId } 
                                      : r
                                  ));
                                } else {
                                  // Successfully updated - reload rules from database to ensure consistency
                                  await loadScheduleRules();
                                }
                              } else {
                                // Add new rule
                                const { data, error } = await supabase
                                  .from('ScheduleRules')
                                  .insert(ruleData)
                                  .select()
                                  .single();

                                if (error) {
                                  const errorCode = error.code || '';
                                  const errorMessage = error.message || '';
                                  
                                  // If table doesn't exist, just use local state
                                  if (errorCode === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('table')) {
                                    console.log('ScheduleRules table does not exist. Saving to local state only.');
                                    setScheduleRules(prevRules => [...prevRules, { ...editingRule, id: Date.now().toString() }]);
                                    setEditingRule(null);
                                    return;
                                  }
                                  
                                  console.error('Error creating schedule rule:', {
                                    message: errorMessage,
                                    code: errorCode,
                                    details: error.details || null,
                                    hint: error.hint || null,
                                  });
                                  // Fallback to local state update if database insert fails
                                  setScheduleRules(prevRules => [...prevRules, { ...editingRule, id: Date.now().toString() }]);
                                } else {
                                  // Successfully created - reload rules from database to ensure consistency
                                  await loadScheduleRules();
                                }
                              }
                              setEditingRule(null);
                            } catch (err: any) {
                              console.error('Error saving schedule rule (catch block):', {
                                message: err?.message || 'Unknown error',
                                name: err?.name || 'Unknown',
                                stack: err?.stack || null,
                                stringified: (() => {
                                  try {
                                    return JSON.stringify(err, Object.getOwnPropertyNames(err));
                                  } catch {
                                    return String(err);
                                  }
                                })()
                              });
                              // Fallback to local state update on error
                              if (editingRule.id) {
                                const ruleId = editingRule.id;
                                setScheduleRules(prevRules => prevRules.map(r => 
                                  r.id === ruleId 
                                    ? { ...editingRule, id: ruleId } 
                                    : r
                                ));
                              } else {
                                setScheduleRules(prevRules => [...prevRules, { ...editingRule, id: Date.now().toString() }]);
                              }
                              setEditingRule(null);
                            }
                          }}
                          className={styles.btnPrimary}
                          style={{ minWidth: '120px' }}
                        >
                          Save Rule
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Events</h1>
                  <p className={styles.sectionSubtitle}>Manage club events</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Event management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'club-documents' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Club Documents</h1>
                  <p className={styles.sectionSubtitle}>Manage club documents</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Document management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'club-players' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Club Players</h1>
                  <p className={styles.sectionSubtitle}>Manage club players</p>
                </div>
              </div>
              <div className={adminStyles.clubPlayersContainer}>
                {/* Search input */}
                <div className={adminStyles.playerSearchContainer}>
                  <input
                    type="text"
                    placeholder="Search players by name or email..."
                    value={playerSearchTerm}
                    onChange={(e) => setPlayerSearchTerm(e.target.value)}
                    className={adminStyles.playerSearchInput}
                  />
                </div>

                {/* Loading state */}
                {isLoadingPlayers ? (
                  <div className={adminStyles.loadingContainer}>
                    <div className={styles.spinner} style={{ margin: '0 auto' }}></div>
                    <p className={adminStyles.loadingText}>Loading players...</p>
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className={adminStyles.emptyState}>
                    {playerSearchTerm ? 'No players found matching your search.' : 'No players linked to this club yet.'}
                  </div>
                ) : (
                  /* Players table */
                  <div className={adminStyles.playersTableContainer}>
                    <table className={adminStyles.playersTable}>
                      <thead>
                        <tr className={adminStyles.playersTableHeader}>
                          <th className={adminStyles.playersTableHeaderCell}>Player</th>
                          <th className={adminStyles.playersTableHeaderCell}>Email</th>
                          <th className={adminStyles.playersTableHeaderCell}>Role</th>
                          <th className={adminStyles.playersTableHeaderCell}>Last Login</th>
                          {isSuperAdmin && (
                            <th className={adminStyles.playersTableHeaderCell}>Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlayers.map((player, index) => (
                          <tr
                            key={player.id}
                            className={adminStyles.playersTableRow}
                            style={{
                              borderBottom: index < filteredPlayers.length - 1 ? '1px solid #f3f4f6' : 'none'
                            }}
                          >
                            <td className={adminStyles.playerCell}>
                              <div className={adminStyles.playerInfo}>
                                {player.avatarUrl ? (
                                  <img
                                    src={player.avatarUrl}
                                    alt={player.name}
                                    className={adminStyles.playerAvatar}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) {
                                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={adminStyles.playerAvatarPlaceholder}
                                  style={{ display: player.avatarUrl ? 'none' : 'flex' }}
                                >
                                  {player.name.charAt(0).toUpperCase()}
                                </div>
                                <span className={adminStyles.playerName}>{player.name}</span>
                              </div>
                            </td>
                            <td className={adminStyles.playerEmail}>{player.email}</td>
                            <td className={adminStyles.playersTableCell}>
                              <span
                                className={adminStyles.roleBadge}
                                style={getRoleBadgeStyle(player.role)}
                              >
                                {getRoleLabel(player.role)}
                              </span>
                            </td>
                            <td className={adminStyles.playerEmail}>
                              {player.lastLoginAt
                                ? new Date(player.lastLoginAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : 'Never'}
                            </td>
                            {isSuperAdmin && (
                              <td className={adminStyles.playersTableCell}>
                                <button
                                  onClick={() => handleImpersonatePlayer(player.id)}
                                  disabled={impersonatingPlayerId === player.id}
                                  className={adminStyles.impersonateButton}
                                >
                                  {impersonatingPlayerId === player.id ? 'Logging in...' : 'Log in as player'}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Results count */}
                {!isLoadingPlayers && filteredPlayers.length > 0 && (
                  <div className={adminStyles.resultsCount}>
                    Showing {filteredPlayers.length} of {players.length} player{players.length !== 1 ? 's' : ''}
                    {playerSearchTerm && ` matching "${playerSearchTerm}"`}
                  </div>
                )}

                {/* Add Player Section */}
                <div className={adminStyles.addPlayerSection}>
                  <h2 className={adminStyles.addPlayerTitle}>
                    Add Player to Club
                  </h2>

                  {/* Success message */}
                  {addPlayerSuccess && (
                    <div className={adminStyles.successMessage}>
                      Player added successfully!
                    </div>
                  )}

                  {/* Error message */}
                  {addPlayerError && (
                    <div className={adminStyles.errorMessage}>
                      {addPlayerError}
                    </div>
                  )}

                  <div className={adminStyles.addPlayerForm}>
                    {/* Search input */}
                    <div className={adminStyles.addPlayerFormGroup}>
                      <label className={adminStyles.addPlayerLabel}>
                        Search for Player
                      </label>
                      <div className={adminStyles.addPlayerInputContainer}>
                        <input
                          type="text"
                          placeholder="Search by name or email..."
                          value={addPlayerSearchTerm}
                          onChange={(e) => {
                            setAddPlayerSearchTerm(e.target.value);
                            setSelectedPlayerToAdd(null);
                          }}
                          className={adminStyles.addPlayerInput}
                        />
                        {isSearchingPlayers && (
                          <div className={adminStyles.searchSpinner}>
                            <div className={styles.spinner} style={{ width: '16px', height: '16px' }}></div>
                          </div>
                        )}
                      </div>

                      {/* Search results dropdown */}
                      {addPlayerSearchTerm.length >= 2 && addPlayerSearchResults.length > 0 && !selectedPlayerToAdd && (
                        <div className={adminStyles.searchResultsDropdown}>
                          {addPlayerSearchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => setSelectedPlayerToAdd(user)}
                              className={adminStyles.searchResultButton}
                            >
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.name}
                                  className={adminStyles.searchResultAvatar}
                                />
                              ) : (
                                <div className={adminStyles.searchResultAvatarPlaceholder}>
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className={adminStyles.searchResultInfo}>
                                <div className={adminStyles.searchResultName}>
                                  {user.name}
                                </div>
                                <div className={adminStyles.searchResultEmail}>
                                  {user.email}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {addPlayerSearchTerm.length >= 2 && !isSearchingPlayers && addPlayerSearchResults.length === 0 && (
                        <div className={adminStyles.noResultsMessage}>
                          No users found
                        </div>
                      )}
                    </div>

                    {/* Selected player display */}
                    {selectedPlayerToAdd && (
                      <div className={adminStyles.selectedPlayerCard}>
                        <div className={adminStyles.selectedPlayerInfo}>
                          {selectedPlayerToAdd.avatarUrl ? (
                            <img
                              src={selectedPlayerToAdd.avatarUrl}
                              alt={selectedPlayerToAdd.name}
                              className={adminStyles.playerAvatar}
                            />
                          ) : (
                            <div className={adminStyles.playerAvatarPlaceholder}>
                              {selectedPlayerToAdd.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className={adminStyles.selectedPlayerName}>
                              {selectedPlayerToAdd.name}
                            </div>
                            <div className={adminStyles.selectedPlayerEmail}>
                              {selectedPlayerToAdd.email}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedPlayerToAdd(null);
                            setAddPlayerSearchTerm('');
                          }}
                          className={adminStyles.changeButton}
                        >
                          Change
                        </button>
                      </div>
                    )}

                    {/* Role selection */}
                    <div className={adminStyles.addPlayerFormGroup}>
                      <label className={adminStyles.addPlayerLabel}>
                        Assign Role
                      </label>
                      <select
                        value={selectedRoleToAdd}
                        onChange={(e) => setSelectedRoleToAdd(e.target.value as ClubRole)}
                        className={adminStyles.roleSelect}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="VISITOR">Visitor</option>
                        <option value="COACH">Coach</option>
                        <option value="CLUB_ADMIN">Club Manager</option>
                      </select>
                    </div>

                    {/* Add button */}
                    <button
                      onClick={handleAddPlayer}
                      disabled={!selectedPlayerToAdd || isAddingPlayer}
                      className={adminStyles.addPlayerButton}
                    >
                      {isAddingPlayer ? 'Adding...' : 'Add Player to Club'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Finance</h1>
                  <p className={styles.sectionSubtitle}>Manage club finances</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Finance management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'memberships' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Memberships</h1>
                  <p className={styles.sectionSubtitle}>Manage memberships</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Membership management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'club-ranking' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Club Ranking</h1>
                  <p className={styles.sectionSubtitle}>Manage club rankings</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Ranking management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Announcements</h1>
                  <p className={styles.sectionSubtitle}>Manage announcements</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Announcement management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'coaching' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Coaching</h1>
                  <p className={styles.sectionSubtitle}>Manage coaching</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Coaching management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'league' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>League</h1>
                  <p className={styles.sectionSubtitle}>Manage leagues</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>League management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'emailers' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Emailers</h1>
                  <p className={styles.sectionSubtitle}>Manage emailers</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Emailer management coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
