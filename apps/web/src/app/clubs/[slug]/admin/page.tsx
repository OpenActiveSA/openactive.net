'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import styles from '@/components/AdminDashboard.module.css';

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

  const loadClubData = useCallback(async () => {
    if (hasLoadedRef.current || club) {
      return;
    }

    hasLoadedRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClientClient();

      // EXACT copy of main admin dashboard query
      const { data: clubsData, error: clubsError } = await supabase
        .from('Clubs')
        .select('id, name, numberOfCourts, country, province, is_active, createdAt')
        .order('createdAt', { ascending: false });


      if (clubsError) {
        console.error('Clubs fetch error:', clubsError);
        setError(`Database error: ${clubsError.message}. Code: ${clubsError.code}`);
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

          <button
            className={`${styles.navItem} ${activeTab === 'members' ? styles.active : ''}`}
            onClick={() => setActiveTab('members')}
            title="Members"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {!isSidebarCollapsed && <span>Members</span>}
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'courts' ? styles.active : ''}`}
            onClick={() => setActiveTab('courts')}
            title="Courts"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            {!isSidebarCollapsed && <span>Courts</span>}
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
                    href={`/clubs/${slug}`}
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
              <div style={{ padding: '32px' }}>
                <p>Club settings coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Members</h1>
                  <p className={styles.sectionSubtitle}>Manage club members</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Member management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'courts' && (
            <div className={styles.contentSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1>Courts</h1>
                  <p className={styles.sectionSubtitle}>Manage club courts</p>
                </div>
              </div>
              <div style={{ padding: '32px' }}>
                <p>Court management coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
