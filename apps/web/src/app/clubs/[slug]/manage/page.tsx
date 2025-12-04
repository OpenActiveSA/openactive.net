'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import styles from './ClubManage.module.css';

interface ClubManageProps {
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

export default function ClubManagePage({ params }: ClubManageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    loadClub();
  }, [slug, user, authLoading, router]);

  const loadClub = async () => {
    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClientClient();
      
      // Fetch all clubs and find the one matching the slug
      const { data: clubsData, error: clubsError } = await supabase
        .from('Clubs')
        .select('id, name, numberOfCourts, country, province, is_active, createdAt')
        .eq('is_active', true);

      if (clubsError) {
        throw new Error(clubsError.message);
      }

      // Find club by matching slug
      const foundClub = clubsData?.find(
        (c) => generateSlug(c.name) === slug
      );

      if (!foundClub) {
        setError('Club not found');
        setIsLoading(false);
        return;
      }

      setClub(foundClub as Club);
    } catch (err: any) {
      console.error('Error loading club:', err);
      setError(err.message || 'Failed to load club');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h1>Error</h1>
          <p>{error || 'Club not found'}</p>
          <button onClick={() => router.push('/admin')} className={styles.btnPrimary}>
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <button 
              onClick={() => router.push('/admin')}
              className={styles.backButton}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Admin
            </button>
            <h1 className={styles.clubName}>{club.name}</h1>
            <p className={styles.clubSubtitle}>Club Management</p>
          </div>
          <div className={styles.headerActions}>
            <Link 
              href={`/clubs/${slug}`}
              className={styles.btnView}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              View Club Page
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'members' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'courts' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('courts')}
        >
          Courts
        </button>
      </nav>

      {/* Content */}
      <main className={styles.main}>
        {activeTab === 'overview' && (
          <div className={styles.tabContent}>
            <h2>Overview</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3>{club.numberOfCourts || 0}</h3>
                <p>Courts</p>
              </div>
              <div className={styles.statCard}>
                <h3>0</h3>
                <p>Members</p>
              </div>
              <div className={styles.statCard}>
                <h3>0</h3>
                <p>Bookings</p>
              </div>
            </div>
            <div className={styles.infoCard}>
              <h3>Club Information</h3>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name:</span>
                <span>{club.name}</span>
              </div>
              {(club.country || club.province) && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Location:</span>
                  <span>{[club.province, club.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Status:</span>
                <span className={club.is_active ? styles.statusActive : styles.statusInactive}>
                  {club.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={styles.tabContent}>
            <h2>Settings</h2>
            <p>Club settings coming soon...</p>
          </div>
        )}

        {activeTab === 'members' && (
          <div className={styles.tabContent}>
            <h2>Members</h2>
            <p>Member management coming soon...</p>
          </div>
        )}

        {activeTab === 'courts' && (
          <div className={styles.tabContent}>
            <h2>Courts</h2>
            <p>Court management coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

