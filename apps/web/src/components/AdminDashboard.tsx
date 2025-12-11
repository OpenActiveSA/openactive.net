'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import styles from './AdminDashboard.module.css';

interface User {
  id: string;
  email: string;
  Firstname?: string;
  Surname?: string;
  role: string;
  avatarUrl?: string;
  createdAt?: string;
  clubMemberships?: Array<{ clubId: string; clubName: string; role: string }>;
}

type ClubStatus = 'ACTIVE_PAID' | 'ACTIVE_FREE' | 'FREE_TRIAL' | 'DISABLED';

interface Club {
  id: string;
  name: string;
  numberOfCourts?: number;
  country?: string;
  province?: string;
  is_active?: boolean; // Keep for backwards compatibility
  status?: ClubStatus;
  logo?: string;
  backgroundColor?: string;
  selectedColor?: string;
  actionColor?: string;
  fontColor?: string;
  hoverColor?: string;
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

export function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
  const hasCheckedRole = useRef(false);
  const hasRedirected = useRef(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClientClient();

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('Users')
        .select('id, email, Firstname, Surname, role, avatarUrl, createdAt')
        .order('createdAt', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
        throw new Error('Failed to load users');
      }

      // Load club memberships for all users
      const { data: clubRolesData, error: clubRolesError } = await supabase
        .from('UserClubRoles')
        .select('userId, clubId, role')
        .order('role');

      if (clubRolesError) {
        if (clubRolesError.code === '42P01') {
          console.warn('UserClubRoles table does not exist yet');
        } else {
          console.error('Error loading club roles:', clubRolesError);
        }
      } else {
        console.log('Loaded club roles:', clubRolesData?.length || 0, 'memberships');
      }

      // Load all clubs to get names
      const { data: allClubs, error: clubsForMembershipsError } = await supabase
        .from('Clubs')
        .select('id, name');

      if (clubsForMembershipsError) {
        console.error('Error loading clubs for memberships:', clubsForMembershipsError);
      }

      // Create a map of clubId -> club name
      const clubNameMap = new Map<string, string>();
      if (allClubs) {
        allClubs.forEach((club: any) => {
          clubNameMap.set(club.id, club.name);
        });
      }

      // Create a map of userId -> club memberships
      const membershipsMap = new Map<string, Array<{ clubId: string; clubName: string; role: string }>>();
      if (clubRolesData && clubRolesData.length > 0) {
        clubRolesData.forEach((item: any) => {
          const userId = item.userId;
          const clubId = item.clubId;
          const clubName = clubNameMap.get(clubId) || 'Unknown Club';
          
          if (!membershipsMap.has(userId)) {
            membershipsMap.set(userId, []);
          }
          membershipsMap.get(userId)!.push({
            clubId: clubId,
            clubName: clubName,
            role: item.role
          });
        });
        console.log('Memberships map created with', membershipsMap.size, 'users');
      }

      // Add club memberships to users
      const usersWithMemberships = (usersData || []).map((user: any) => ({
        ...user,
        clubMemberships: membershipsMap.get(user.id) || []
      }));

      setUsers(usersWithMemberships as User[]);

      // Load clubs - try with all fields first, fallback if columns don't exist
      let clubsData: any = null;
      let clubsError: any = null;
      
      // First attempt: with all columns
      const resultWithAll = await supabase
        .from('Clubs')
        .select('id, name, country, province, is_active, status, logo, backgroundColor, selectedColor, actionColor, fontColor, hoverColor, moduleCourtBooking, moduleMemberManager, moduleWebsite, moduleEmailers, moduleVisitorPayment, moduleFloodlightPayment, moduleEvents, moduleCoaching, moduleLeague, moduleRankings, moduleMarketing, moduleAccessControl, moduleClubWallet, moduleFinanceIntegration, createdAt')
        .order('createdAt', { ascending: false });
      
      clubsData = resultWithAll.data;
      clubsError = resultWithAll.error;

      // If error is about missing columns, try without branding fields
      if (clubsError && (clubsError.code === '42703' || clubsError.message?.includes('column'))) {
        console.warn('Some columns not found, loading clubs without branding fields');
        const resultWithoutBranding = await supabase
          .from('Clubs')
          .select('id, name, country, province, is_active, status, createdAt')
          .order('createdAt', { ascending: false });
        
        clubsData = resultWithoutBranding.data;
        clubsError = resultWithoutBranding.error;
        
        // If still error about status, try without status too
        if (clubsError && (clubsError.code === '42703' || clubsError.message?.includes('status'))) {
          console.warn('Status column not found, loading clubs without status field');
          const resultWithoutStatus = await supabase
            .from('Clubs')
            .select('id, name, country, province, is_active, createdAt')
            .order('createdAt', { ascending: false });
          
          clubsData = resultWithoutStatus.data;
          clubsError = resultWithoutStatus.error;
        }
      }

      if (clubsError) {
        console.error('Error loading clubs:', {
          code: clubsError.code,
          message: clubsError.message,
          details: clubsError.details,
          hint: clubsError.hint,
          fullError: clubsError
        });
        // Don't throw error if table doesn't exist yet, just log it
        if (clubsError.code !== '42P01') {
          throw new Error(`Failed to load clubs: ${clubsError.message || 'Unknown error'}`);
        }
        setClubs([]);
      } else {
        setClubs((clubsData || []) as Club[]);
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkUserRole = useCallback(async () => {
    if (!user?.email || hasRedirected.current) return;

    try {
      const supabase = getSupabaseClientClient();
      const { data, error } = await supabase
        .from('Users')
        .select('role, Firstname, Surname, avatarUrl')
        .eq('email', user.email)
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking user role:', error);
        setError('Failed to verify permissions');
        setIsLoading(false);
        return;
      }

      if (!data || data.role !== 'SUPER_ADMIN') {
        if (!hasRedirected.current) {
          hasRedirected.current = true;
          router.push('/');
        }
        return;
      }

      // User is authorized as SUPER_ADMIN
      setIsAuthorized(true);
      setCurrentUserAvatarUrl(data.avatarUrl || null);
      loadDashboardData();
    } catch (err: any) {
      console.error('Exception checking user role:', err);
      setError(err.message || 'Failed to verify permissions');
      setIsLoading(false);
    }
  }, [user, router, loadDashboardData]);

  // Check user role and permissions
  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) {
      return;
    }

    // If already checked or redirected, don't check again
    if (hasCheckedRole.current || hasRedirected.current) {
      return;
    }

    // If no user, redirect to login
    if (!user) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        router.push('/login');
      }
      return;
    }

    // Check role only once
    if (!hasCheckedRole.current && user?.email && !hasRedirected.current) {
      hasCheckedRole.current = true;
      checkUserRole();
    }
  }, [user, authLoading, router, checkUserRole]);

  // Show loading while auth is being checked or authorization is being verified
  if (authLoading || !isAuthorized) {
    return (
      <div className={styles.adminLayout}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
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
              <h2>Open Active</h2>
              <span className={styles.sidebarSubtitle}>System Admin</span>
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
            className={`${styles.navItem} ${activeTab === 'users' ? styles.active : ''}`}
            onClick={() => setActiveTab('users')}
            title="All Users"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {!isSidebarCollapsed && <span>All Users</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'clubs' ? styles.active : ''}`}
            onClick={() => setActiveTab('clubs')}
            title="All Clubs"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {!isSidebarCollapsed && <span>All Clubs</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'analytics' ? styles.active : ''}`}
            onClick={() => setActiveTab('analytics')}
            title="Analytics"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            {!isSidebarCollapsed && <span>Analytics</span>}
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

          {isLoading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: 'calc(100vh - 80px)',
              width: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '16px' 
              }}>
                <div className={styles.spinner}></div>
                <p style={{ color: 'white', margin: 0 }}>Loading...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewTab users={users} clubs={clubs} />}
              {activeTab === 'users' && <AllUsersTab users={users} onRefresh={loadDashboardData} />}
              {activeTab === 'clubs' && <AllClubsTab clubs={clubs} onRefresh={loadDashboardData} />}
              {activeTab === 'analytics' && <AnalyticsTab users={users} clubs={clubs} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function OverviewTab({ users, clubs }: { users: User[]; clubs: Club[] }) {
  const [clubsWithCourtCounts, setClubsWithCourtCounts] = useState<Array<Club & { courtCount?: number }>>(clubs);
  const [isLoadingCourtCounts, setIsLoadingCourtCounts] = useState(false);

  useEffect(() => {
    const loadCourtCounts = async () => {
      if (clubs.length === 0) return;
      
      setIsLoadingCourtCounts(true);
      try {
        const supabase = getSupabaseClientClient();
        const { data: courtsData } = await supabase
          .from('Courts')
          .select('clubId')
          .eq('isActive', true);
        
        if (courtsData) {
          const courtCounts = courtsData.reduce((acc, court) => {
            acc[court.clubId] = (acc[court.clubId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          setClubsWithCourtCounts(clubs.map(club => ({
            ...club,
            courtCount: courtCounts[club.id] || 0
          })));
        }
      } catch (err) {
        console.error('Error loading court counts:', err);
        setClubsWithCourtCounts(clubs);
      } finally {
        setIsLoadingCourtCounts(false);
      }
    };
    
    loadCourtCounts();
  }, [clubs]);

  const getClubStatus = (club: Club): ClubStatus => {
    if (club.status) {
      return club.status;
    }
    // Fallback to is_active for backwards compatibility
    return club.is_active ? 'ACTIVE_FREE' : 'DISABLED';
  };

  const getStatusLabel = (status: ClubStatus): string => {
    switch (status) {
      case 'ACTIVE_PAID':
        return 'Active Paid';
      case 'ACTIVE_FREE':
        return 'Active Free';
      case 'FREE_TRIAL':
        return 'Free Trial';
      case 'DISABLED':
        return 'Disabled';
      default:
        return 'Unknown';
    }
  };

  const getStatusBadgeClass = (status: ClubStatus): string => {
    switch (status) {
      case 'ACTIVE_PAID':
        return `${styles.statusBadge} ${styles.statusActivePaid}`;
      case 'ACTIVE_FREE':
        return `${styles.statusBadge} ${styles.statusActiveFree}`;
      case 'FREE_TRIAL':
        return `${styles.statusBadge} ${styles.statusFreeTrial}`;
      case 'DISABLED':
        return `${styles.statusBadge} ${styles.statusInactive}`;
      default:
        return styles.statusBadge;
    }
  };

  const stats = {
    totalUsers: users.length,
    totalClubs: clubs.length,
    activeClubs: clubs.filter((c) => {
      const status = getClubStatus(c);
      return status === 'ACTIVE_PAID' || status === 'ACTIVE_FREE' || status === 'FREE_TRIAL';
    }).length,
    superAdmins: users.filter((u) => u.role === 'SUPER_ADMIN').length,
    clubAdmins: users.filter((u) => u.role === 'CLUB_ADMIN').length,
    members: users.filter((u) => u.role === 'MEMBER').length,
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return '—';
    }
  };

  return (
    <div className={styles.contentSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h1>Overview</h1>
          <p className={styles.sectionSubtitle}>System dashboard and key metrics</p>
        </div>
      </div>

      {/* Clubs Table Section - Moved to top */}
      <div style={{ marginBottom: '40px' }}>
        {clubs.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No clubs found.</p>
          </div>
        ) : (
          <div className={styles.tableContainer} style={{ marginTop: '20px' }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Club Name</th>
                  <th>Location</th>
                  <th>Courts</th>
                  <th>Modules</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clubsWithCourtCounts.map((club) => (
                  <tr key={club.id}>
                    <td>
                      <span style={{ fontWeight: 500 }}>{club.name}</span>
                    </td>
                    <td>
                      {club.province || '—'}
                    </td>
                    <td>
                      {isLoadingCourtCounts ? (
                        <span style={{ opacity: 0.6 }}>Loading...</span>
                      ) : (
                        <span>{club.courtCount || 0}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '300px' }}>
                        {[
                          { key: 'moduleCourtBooking', label: 'Booking', enabled: club.moduleCourtBooking ?? true },
                          { key: 'moduleMemberManager', label: 'Members', enabled: club.moduleMemberManager ?? false },
                          { key: 'moduleWebsite', label: 'Website', enabled: club.moduleWebsite ?? true },
                          { key: 'moduleEmailers', label: 'Email', enabled: club.moduleEmailers ?? true },
                          { key: 'modulePayments', label: 'Payments', enabled: (club.moduleVisitorPayment ?? true) || (club.moduleFloodlightPayment ?? true) },
                          { key: 'moduleEvents', label: 'Events', enabled: club.moduleEvents ?? true },
                          { key: 'moduleCoaching', label: 'Coaching', enabled: club.moduleCoaching ?? true },
                          { key: 'moduleLeague', label: 'League', enabled: club.moduleLeague ?? true },
                          { key: 'moduleAccessControl', label: 'Access Control', enabled: club.moduleAccessControl ?? true },
                          { key: 'moduleFinanceIntegration', label: 'Finance', enabled: club.moduleFinanceIntegration ?? true },
                        ].map((module) => (
                          <span
                            key={module.key}
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              fontSize: '11px',
                              backgroundColor: module.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                              color: module.enabled ? '#6ee7b7' : 'rgba(255, 255, 255, 0.4)',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}
                            title={module.label}
                          >
                            {module.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(getClubStatus(club))}>
                        {getStatusLabel(getClubStatus(club))}
                      </span>
                    </td>
                    <td className={styles.dateCell}>{formatDate(club.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Link 
                          href={`/club/${generateSlug(club.name)}`}
                          className={styles.btnView}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          View
                        </Link>
                        <Link 
                          href={`/admin/clubs/${club.id}/edit`}
                          className={styles.btnEdit}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.totalClubs}</h3>
            <p>Total Clubs</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.superAdmins}</h3>
            <p>System Admins</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.clubAdmins}</h3>
            <p>Club Admins</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconTeal}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.members}</h3>
            <p>Members</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.activeClubs}</h3>
            <p>Active Clubs</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AllUsersTab({ users, onRefresh }: { users: User[]; onRefresh: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return `${styles.roleBadge} ${styles.roleAdmin}`;
      case 'CLUB_ADMIN':
        return `${styles.roleBadge} ${styles.roleManager}`;
      case 'MEMBER':
        return `${styles.roleBadge} ${styles.roleMember}`;
      case 'COACH':
        return `${styles.roleBadge} ${styles.roleMember}`;
      case 'VISITOR':
        return styles.roleBadge;
      default:
        return styles.roleBadge;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return '—';
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.Firstname?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.Surname?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.contentSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h1>Users</h1>
          <p className={styles.sectionSubtitle}>{users.length} total users registered</p>
        </div>
        <button className={styles.btnPrimary} onClick={onRefresh}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No users found.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role / Club Memberships</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className={styles.userNameCell}>
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.Firstname && user.Surname ? `${user.Firstname} ${user.Surname}` : user.email || 'User'}
                        className={styles.userAvatarSmall}
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
                      className={styles.userAvatarSmall}
                      style={{ display: user.avatarUrl ? 'none' : 'flex' }}
                    >
                      {(user.Firstname?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <span>
                      {user.Firstname && user.Surname
                        ? `${user.Firstname} ${user.Surname}`
                        : user.Firstname || user.Surname || 'N/A'}
                    </span>
                  </td>
                  <td className={styles.userEmail}>{user.email}</td>
                  <td>
                    {user.role === 'SUPER_ADMIN' ? (
                      <span className={getRoleBadgeClass(user.role)}>{user.role.replace('_', ' ')}</span>
                    ) : user.clubMemberships && user.clubMemberships.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {user.clubMemberships.map((membership, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={getRoleBadgeClass(membership.role)}>
                              {membership.role.replace('_', ' ')}
                            </span>
                            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                              @ {membership.clubName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
                        No club memberships
                      </span>
                    )}
                  </td>
                  <td className={styles.dateCell}>{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// List of countries for the dropdown
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
  'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
  'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
].sort();

function AllClubsTab({ clubs, onRefresh }: { clubs: Club[]; onRefresh: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [clubName, setClubName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const supabase = getSupabaseClientClient();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return '—';
    }
  };

  const getClubStatus = (club: Club): ClubStatus => {
    if (club.status) {
      return club.status;
    }
    return club.is_active ? 'ACTIVE_FREE' : 'DISABLED';
  };

  const getStatusLabel = (status: ClubStatus): string => {
    switch (status) {
      case 'ACTIVE_PAID':
        return 'Active Paid';
      case 'ACTIVE_FREE':
        return 'Active Free';
      case 'FREE_TRIAL':
        return 'Free Trial';
      case 'DISABLED':
        return 'Disabled';
      default:
        return 'Unknown';
    }
  };

  const getStatusBadgeClass = (status: ClubStatus): string => {
    switch (status) {
      case 'ACTIVE_PAID':
        return `${styles.statusBadge} ${styles.statusActivePaid}`;
      case 'ACTIVE_FREE':
        return `${styles.statusBadge} ${styles.statusActiveFree}`;
      case 'FREE_TRIAL':
        return `${styles.statusBadge} ${styles.statusFreeTrial}`;
      case 'DISABLED':
        return `${styles.statusBadge} ${styles.statusInactive}`;
      default:
        return styles.statusBadge;
    }
  };

  const filteredClubs = clubs.filter((club) =>
    club.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!clubName.trim()) {
      setError('Club name is required');
      setIsSubmitting(false);
      return;
    }


    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 10000);
      });

      // Create the insert promise
      // Build insert data object
      const insertData: any = {
        name: clubName.trim(),
        country: country && country.trim() ? country.trim() : null,
        province: province && province.trim() ? province.trim() : null,
        is_active: true,
      };
      
      // Only include city if it has a value (and column exists)
      if (city && city.trim()) {
        insertData.city = city.trim();
      }
      
      const insertPromise = supabase
        .from('Clubs')
        .insert([insertData])
        .select();

      // Race between insert and timeout
      const result = await Promise.race([
        insertPromise,
        timeoutPromise,
      ]);
      
      const { data, error: insertError } = result;

      if (insertError) {
        console.error('Supabase insert error:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          fullError: insertError
        });
        const errorMsg = insertError.message || insertError.details || insertError.hint || 'Failed to create club';
        throw new Error(errorMsg);
      }

      console.log('Club created successfully:', data);

      // Reset form and close modal
      setClubName('');
      setCity('');
      setCountry('');
      setProvince('');
      setError('');
      setShowAddModal(false);
      
      // Refresh the clubs list
      onRefresh();
    } catch (err: any) {
      console.error('Error creating club:', {
        message: err.message,
        stack: err.stack,
        fullError: err
      });
      const errorMessage = err.message || 'Failed to create club. Please check the console for details.';
      setError(errorMessage);
      // Ensure error is visible by scrolling to it
      setTimeout(() => {
        const errorElement = document.querySelector(`.${styles.errorMessage}`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.contentSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h1>Clubs</h1>
          <p className={styles.sectionSubtitle}>{clubs.length} {clubs.length === 1 ? 'club' : 'clubs'} registered</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={styles.btnPrimary} onClick={() => setShowAddModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Club
          </button>
          <button className={styles.btnPrimary} onClick={onRefresh}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search clubs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredClubs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No clubs found.</p>
        </div>
      ) : (
        <div className={styles.clubsGrid}>
          {filteredClubs.map((club) => (
            <div key={club.id} className={styles.clubCard}>
              <div className={styles.clubCardHeader}>
                <h3>{club.name}</h3>
                <span className={getStatusBadgeClass(getClubStatus(club))}>
                  {getStatusLabel(getClubStatus(club))}
                </span>
              </div>
              <p className={styles.clubDescription}>
                {club.numberOfCourts || 0} {club.numberOfCourts === 1 ? 'court' : 'courts'}
              </p>
              {club.province && (
                <p className={styles.clubLocation} style={{ marginTop: '8px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {club.province}
                </p>
              )}
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'moduleCourtBooking', label: 'Booking', enabled: club.moduleCourtBooking ?? true },
                    { key: 'moduleMemberManager', label: 'Members', enabled: club.moduleMemberManager ?? false },
                    { key: 'moduleWebsite', label: 'Website', enabled: club.moduleWebsite ?? true },
                    { key: 'moduleEmailers', label: 'Email', enabled: club.moduleEmailers ?? true },
                    { key: 'moduleVisitorPayment', label: 'Visitor Payment', enabled: club.moduleVisitorPayment ?? true },
                    { key: 'moduleFloodlightPayment', label: 'Floodlight Payment', enabled: club.moduleFloodlightPayment ?? true },
                    { key: 'moduleEvents', label: 'Events', enabled: club.moduleEvents ?? true },
                    { key: 'moduleCoaching', label: 'Coaching', enabled: club.moduleCoaching ?? true },
                    { key: 'moduleLeague', label: 'League', enabled: club.moduleLeague ?? true },
                    { key: 'moduleRankings', label: 'Rankings', enabled: club.moduleRankings ?? true },
                    { key: 'moduleMarketing', label: 'Marketing', enabled: club.moduleMarketing ?? true },
                    { key: 'moduleAccessControl', label: 'Access Control', enabled: club.moduleAccessControl ?? true },
                    { key: 'moduleClubWallet', label: 'Club Wallet', enabled: club.moduleClubWallet ?? true },
                    { key: 'moduleFinanceIntegration', label: 'Finance', enabled: club.moduleFinanceIntegration ?? true },
                  ].map((module) => (
                    <span
                      key={module.key}
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        fontSize: '11px',
                        backgroundColor: module.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                        color: module.enabled ? '#6ee7b7' : 'rgba(255, 255, 255, 0.4)',
                        borderRadius: '4px',
                        fontWeight: 500
                      }}
                      title={module.label}
                    >
                      {module.label}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Link 
                    href={`/club/${generateSlug(club.name)}`}
                    className={styles.btnView}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </Link>
                  <Link 
                    href={`/admin/clubs/${club.id}/edit`}
                    className={styles.btnEdit}
                  >
                    Edit
                  </Link>
                  <Link 
                    href={`/club/${generateSlug(club.name)}/admin`}
                    className={styles.btnManage}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Club Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => !isSubmitting && setShowAddModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add New Club</h2>
              <button
                className={styles.modalCloseButton}
                onClick={() => !isSubmitting && setShowAddModal(false)}
                disabled={isSubmitting}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddClub} className={styles.modalForm}>
              {error && <div className={styles.errorMessage}>{error}</div>}

              <div className={styles.formGroup}>
                <label htmlFor="clubName">Club Name</label>
                <input
                  id="clubName"
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Enter club name"
                  required
                  disabled={isSubmitting}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="country">Country</label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={isSubmitting}
                  className={styles.formInput}
                >
                  <option value="">Select a country</option>
                  {COUNTRIES.map((countryName) => (
                    <option key={countryName} value={countryName}>
                      {countryName}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="province">Province or State</label>
                <input
                  id="province"
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Enter province or state"
                  disabled={isSubmitting}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="city">City / Town</label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city or town"
                  disabled={isSubmitting}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function AnalyticsTab({ users, clubs }: { users: User[]; clubs: Club[] }) {
  const stats = {
    totalUsers: users.length,
    totalClubs: clubs.length,
    activeClubs: clubs.filter((c) => c.is_active).length,
    superAdmins: users.filter((u) => u.role === 'SUPER_ADMIN').length,
    clubAdmins: users.filter((u) => u.role === 'CLUB_ADMIN').length,
    members: users.filter((u) => u.role === 'MEMBER').length,
  };

  return (
    <div className={styles.contentSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h1>Analytics</h1>
          <p className={styles.sectionSubtitle}>System-wide statistics and insights</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.totalClubs}</h3>
            <p>Total Clubs</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.superAdmins}</h3>
            <p>System Admins</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.clubAdmins}</h3>
            <p>Club Admins</p>
          </div>
        </div>
      </div>

      <div className={styles.chartPlaceholder}>
        <p>📊 Charts and detailed analytics coming soon...</p>
      </div>
    </div>
  );
}

