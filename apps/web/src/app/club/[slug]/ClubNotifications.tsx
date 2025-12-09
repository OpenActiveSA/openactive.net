'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';

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

        const newNotifications: Notification[] = [];
        allCategories.forEach(category => {
          if (!categoriesWithRankings.has(category)) {
            newNotifications.push({
              id: `ranking_${category}`,
              message: `You haven't set your starting ranking for ${categoryLabels[category]} yet. Set it on the rankings page to appear in the rankings.`,
              category,
              type: 'ranking'
            });
          }
        });

        setNotifications(newNotifications);
        setCurrentNotificationIndex(0);
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    };

    if (clubId && user?.id) {
      loadNotifications();
    }
  }, [clubId, user?.id]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#fbbf24',
      color: '#052333',
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      position: 'relative'
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
        textAlign: 'center'
      }}>
        <span>⚠️</span>
        <span>{notifications[currentNotificationIndex]?.message}</span>
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
            <span style={{ fontSize: '12px', opacity: 0.7 }}>
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
                color: '#052333',
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

