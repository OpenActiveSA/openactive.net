'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
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
  const [bookingSlotInterval, setBookingSlotInterval] = useState<number>(60);
  const [sessionDuration, setSessionDuration] = useState<number[]>([60]);
  const [openingTime, setOpeningTime] = useState<string>('06:00');
  const [closingTime, setClosingTime] = useState<string>('22:00');
  const [hoverColor, setHoverColor] = useState<string>('#f0f0f0');
  const [isSaving, setIsSaving] = useState(false);
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
    status: 'active' | 'pause';
    setting: 'blocked' | 'blocked-coaching' | 'blocked-tournament' | 'blocked-maintenance' | 'blocked-social' | 'members-only' | 'members-only-bookings' | 'open-doubles-singles' | 'doubles-only' | 'singles-only';
  }>>([]);
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
      
      // First attempt: with all columns including branding and booking settings
      const result = await supabase
        .from('Clubs')
        .select('id, name, country, province, is_active, backgroundColor, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration, createdAt')
        .order('createdAt', { ascending: false });
      
      clubsData = result.data;
      clubsError = result.error;

      // If error and it's about missing columns, try without optional fields
      if (clubsError && (clubsError.code === '42703' || clubsError.message?.includes('column'))) {
        console.warn('Some columns may not exist, trying with basic fields:', clubsError);
        const fallbackResult = await supabase
          .from('Clubs')
          .select('id, name, country, province, is_active, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration, createdAt')
          .order('createdAt', { ascending: false });
        
        clubsData = fallbackResult.data;
        clubsError = fallbackResult.error;
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
      const clubHoverColor = (foundClub as any).hoverColor;
      console.log('Loading hoverColor from database. Raw value:', clubHoverColor, 'Type:', typeof clubHoverColor);
      if (clubHoverColor && typeof clubHoverColor === 'string' && clubHoverColor.trim() !== '') {
        const loadedHoverColor = clubHoverColor.trim();
        console.log('Setting hoverColor to:', loadedHoverColor);
        setHoverColor(loadedHoverColor);
      } else {
        console.log('No valid hoverColor found, keeping default:', hoverColor);
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
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error loading club:', err);
      setError(err.message || 'Failed to load club. Please check the browser console for details.');
      setIsLoading(false);
    }
  }, [slug, club]);

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

    loadClubData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, session?.user?.id]);

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

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className={styles.adminLayout}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>{authLoading ? 'Loading authentication...' : 'Loading club data...'}</p>
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
          <button onClick={() => router.push('/admin')} className={styles.btnPrimary} style={{ marginTop: '16px' }}>
            Back to Admin
          </button>
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
            <div className={styles.userAvatar}>{userName.charAt(0).toUpperCase()}</div>
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

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                  </div>
                  <div className={styles.statContent}>
                    <h3>{club.numberOfCourts || 0}</h3>
                    <p>Courts</p>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <div className={styles.statContent}>
                    <h3>0</h3>
                    <p>Members</p>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div className={styles.statContent}>
                    <h3>0</h3>
                    <p>Bookings</p>
                  </div>
                </div>
              </div>

              <div className={styles.contentSection} style={{ marginTop: '24px' }}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>Club Information</h2>
                  </div>
                </div>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)', minWidth: '120px' }}>Name:</span>
                    <span>{club.name}</span>
                  </div>
                  {(club.country || club.province) && (
                    <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)', minWidth: '120px' }}>Location:</span>
                      <span>{[club.province, club.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', padding: '12px 0' }}>
                    <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)', minWidth: '120px' }}>Status:</span>
                    <span className={club.is_active ? styles.statusActive : styles.statusInactive}>
                      {club.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
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

                {/* Hover Color Setting */}
                <div className={adminStyles.formGroup} style={{ marginTop: '24px' }}>
                  <label className={adminStyles.formLabel}>
                    Hover Color
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={hoverColor}
                      onChange={(e) => setHoverColor(e.target.value)}
                      disabled={isSaving}
                      style={{ 
                        width: '60px', 
                        height: '40px', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                      }}
                    />
                    <input
                      type="text"
                      value={hoverColor}
                      onChange={(e) => setHoverColor(e.target.value)}
                      placeholder="#f0f0f0"
                      disabled={isSaving}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px',
                        flex: 1,
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
                  </div>
                  <p style={{ 
                    color: 'rgba(255, 255, 255, 0.6)', 
                    fontSize: '12px', 
                    marginTop: '8px',
                    marginBottom: 0
                  }}>
                    Color used when hovering over date and time buttons
                  </p>
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
                          hoverColor: hoverColor,
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
                            openingTime: openingTime,
                            closingTime: closingTime,
                            bookingSlotInterval: intervalToSave,
                            sessionDuration: sessionDuration,
                            membersBookingDays: membersBookingDays,
                            visitorBookingDays: visitorBookingDays,
                            coachBookingDays: coachBookingDays,
                            hoverColor: hoverColor,
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
                        console.log('hoverColor sent:', hoverColor);
                        console.log('hoverColor in response:', result.data?.hoverColor);

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
                                    onClick={() => setScheduleRules(scheduleRules.filter(r => r.id !== rule.id))}
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
                          {Array.from({ length: club?.numberOfCourts || 1 }, (_, i) => i + 1).map((courtNum) => (
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
                          ))}
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
                          <input
                            type="time"
                            value={editingRule.startTime}
                            onChange={(e) => {
                              setEditingRule({ ...editingRule, startTime: e.target.value });
                            }}
                            className={adminStyles.formInput}
                          />
                        </div>

                        <div className={adminStyles.formRow}>
                          <label className={adminStyles.formLabel}>End Time:</label>
                          <input
                            type="time"
                            value={editingRule.endTime}
                            onChange={(e) => {
                              setEditingRule({ ...editingRule, endTime: e.target.value });
                            }}
                            className={adminStyles.formInput}
                          />
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
                          onClick={() => {
                            if (!editingRule) return;
                            
                            if (editingRule.id) {
                              // Update existing rule
                              const ruleId = editingRule.id;
                              setScheduleRules(scheduleRules.map(r => 
                                r.id === ruleId 
                                  ? { ...editingRule, id: ruleId } 
                                  : r
                              ));
                            } else {
                              // Add new rule
                              setScheduleRules([...scheduleRules, { ...editingRule, id: Date.now().toString() }]);
                            }
                            setEditingRule(null);
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
              <div style={{ padding: '32px' }}>
                <p>Player management coming soon...</p>
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
