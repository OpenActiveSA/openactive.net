'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { useClubAnimation } from './ClubAnimationContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

type RankingCategory = 'SINGLES_MENS' | 'SINGLES_LADIES' | 'DOUBLES_MENS' | 'DOUBLES_LADIES' | 'MIXED';

interface Notification {
  id: string;
  message: string;
  category?: RankingCategory;
  type: 'ranking' | 'other'; // For future notification types
}

interface ClubNotificationsProps {
  clubId: string | null;
  fontColor: string;
}

const categoryLabels: Record<RankingCategory, string> = {
  'SINGLES_MENS': 'singles mens tennis',
  'SINGLES_LADIES': 'singles ladies tennis',
  'DOUBLES_MENS': 'doubles mens tennis',
  'DOUBLES_LADIES': 'doubles ladies tennis',
  'MIXED': 'mixed'
};

const allCategories: RankingCategory[] = [
  'SINGLES_MENS',
  'SINGLES_LADIES',
  'DOUBLES_MENS',
  'DOUBLES_LADIES',
  'MIXED'
];

export default function ClubNotifications({ clubId, fontColor }: ClubNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState<number>(0);
  const { user } = useAuth();
  const pathname = usePathname();
  // Always call the hook - it returns safe defaults if context is not available
  const { notificationsVisible, setContentVisible } = useClubAnimation();
  
  // Extract slug from pathname (e.g., /club/constantiatennisclub/... -> constantiatennisclub)
  const slug = pathname?.split('/')[2] || '';

  useEffect(() => {
    const loadNotifications = async () => {
      if (!clubId || !user?.id) {
        setNotifications([]);
        return;
      }

      try {
        const supabase = getSupabaseClientClient();
        
        // Fetch all rankings for this user at this club
        const { data: rankingsData, error: rankingsError } = await supabase
          .from('Rankings')
          .select('category')
          .eq('clubId', clubId)
          .eq('userId', user.id);

        if (rankingsError) {
          console.error('Error fetching rankings:', rankingsError);
          return;
        }

        // Build list of categories that don't have rankings
        const categoriesWithRankings = new Set(
          (rankingsData || []).map((r: any) => r.category)
        );

        const missingCategories = allCategories.filter(category => !categoriesWithRankings.has(category));

        const newNotifications: Notification[] = [];
        // Show a single notification if any rankings are missing
        // But don't show ranking notifications on the rankings page itself
        const isOnRankingsPage = pathname?.includes('/rankings');
        if (missingCategories.length > 0 && !isOnRankingsPage) {
          newNotifications.push({
            id: 'ranking_missing',
            message: `You haven't set your starting rank yet.`,
            category: missingCategories[0], // Use first missing category for the link
            type: 'ranking'
          });
        }

        setNotifications(newNotifications);
        setCurrentNotificationIndex(0);
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    };

    if (clubId && user?.id) {
      loadNotifications();
    }
  }, [clubId, user?.id, pathname]);

  // If no notifications, trigger content visibility after header animation
  useEffect(() => {
    if (notifications.length === 0) {
      // Small delay to ensure header has animated
      const timer = setTimeout(() => setContentVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [notifications.length, setContentVisible]);
  
  // When notifications finish animating in, trigger content visibility
  useEffect(() => {
    if (notifications.length > 0 && notificationsVisible) {
      const timer = setTimeout(() => setContentVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [notifications.length, notificationsVisible, setContentVisible]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'var(--openactive-gold, #cda746)',
      color: '#ffffff',
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      position: 'relative',
      transform: notificationsVisible ? 'translateY(0)' : 'translateY(-100%)',
      opacity: notificationsVisible ? 1 : 0,
      maxHeight: notificationsVisible ? '100px' : '0',
      overflow: 'hidden',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Left arrow */}
      {notifications.length > 1 && (
        <button
          onClick={() => {
            setCurrentNotificationIndex((prev) => 
              prev === 0 ? notifications.length - 1 : prev - 1
            );
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#052333',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: 0.8,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
        >
          ←
        </button>
      )}

      {/* Notification message */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        textAlign: 'center',
        flexWrap: 'wrap'
      }}>
        <span>{notifications[currentNotificationIndex]?.message}</span>
        {notifications[currentNotificationIndex]?.type === 'ranking' && slug && (
          <Link
            href={`/club/${slug}/rankings${notifications[currentNotificationIndex]?.category ? `?category=${notifications[currentNotificationIndex].category}` : ''}`}
            style={{
              display: 'inline-block',
              backgroundColor: '#ffffff',
              color: 'var(--openactive-gold, #cda746)',
              padding: '4px 12px',
              borderRadius: '4px',
              fontWeight: '600',
              marginLeft: '8px',
              cursor: 'pointer',
              textDecoration: 'none',
              fontSize: '13px',
              transition: 'background-color 0.2s, opacity 0.2s',
              border: '1px solid #ffffff'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.opacity = '1';
            }}
          >
            Set now
          </Link>
        )}
      </div>

      {/* Right arrow and counter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0
      }}>
        {notifications.length > 1 && (
          <>
            <span style={{ fontSize: '12px', opacity: 0.9, color: '#ffffff' }}>
              {currentNotificationIndex + 1} of {notifications.length}
            </span>
            <button
              onClick={() => {
                setCurrentNotificationIndex((prev) => 
                  prev === notifications.length - 1 ? 0 : prev + 1
                );
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.8,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
            >
              →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

