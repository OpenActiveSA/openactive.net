'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { getSupabaseClientClient } from '@/lib/supabase';
import { getClubUsersWithRoles, type ClubRole } from '@/lib/club-roles';
import { useAuth } from '@/lib/auth-context';
import { ClubAnimationProvider, useClubAnimation } from '@/components/club/ClubAnimationContext';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';
import ClubNotifications from '@/components/club/ClubNotifications';
import OpenActiveLoader from '@/components/OpenActiveLoader';
import styles from '@/styles/frontend.module.css';
import type { ClubSettings } from '@/lib/club-settings';

interface ClubMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: ClubRole;
  rating?: number;
  lastLoginAt?: string;
  isOnline?: boolean;
}

interface ClubMembersClientProps {
  slug: string;
  clubSettings: ClubSettings;
}

function ClubMembersContent({ slug, clubSettings }: ClubMembersClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { contentVisible } = useClubAnimation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadMembers = async () => {
      if (!clubSettings.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        const supabase = getSupabaseClientClient();
        
        // Fetch users with roles and avatarUrl
        const { data: roles, error: rolesError } = await supabase
          .from('UserClubRoles')
          .select('userId, role, Users!inner(id, email, Firstname, Surname, avatarUrl)')
          .eq('clubId', clubSettings.id);

        // Get all users (including those without explicit roles - they are VISITORS)
        const { data: allUsers, error: usersError } = await supabase
          .from('Users')
          .select('id, email, Firstname, Surname, avatarUrl, lastLoginAt')
          .order('Firstname', { ascending: true });

        if (usersError) {
          console.error('Error fetching users:', usersError);
          setIsLoading(false);
          return;
        }

        // Create role map
        const roleMap = new Map<string, ClubRole>();
        if (roles) {
          roles.forEach((r: any) => {
            const userId = typeof r.userId === 'object' ? r.userId.id : r.userId;
            roleMap.set(userId, r.role);
          });
        }

        // Combine users with roles
        const membersList: ClubMember[] = (allUsers || []).map((memberUser: any) => {
          const name = memberUser.Firstname && memberUser.Surname
            ? `${memberUser.Firstname} ${memberUser.Surname}`
            : memberUser.Firstname || memberUser.Surname || memberUser.email?.split('@')[0] || 'Unknown';
          
          // Generate a random rating for now (in real app, this would come from match results or ratings table)
          const rating = Math.round((Math.random() * 2 + 6) * 10) / 10; // Random between 6.0 and 8.0
          
          // Determine if user is online
          // If this is the current logged-in user, they are always online
          const isCurrentUser = user?.id === memberUser.id;
          const lastLoginAt = memberUser.lastLoginAt ? new Date(memberUser.lastLoginAt) : null;
          const now = new Date();
          const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
          // Current user is always online, others are online if logged in within last 15 minutes
          const isOnline = isCurrentUser || (lastLoginAt && lastLoginAt > fifteenMinutesAgo);
          
          return {
            id: memberUser.id,
            name,
            email: memberUser.email || '',
            avatarUrl: memberUser.avatarUrl || undefined,
            role: roleMap.get(memberUser.id) || 'VISITOR',
            rating,
            lastLoginAt: memberUser.lastLoginAt || undefined,
            isOnline: isOnline || false
          };
        })
        .filter(member => member.role !== 'VISITOR'); // Filter out guests/visitors
        
        // Sort by name
        membersList.sort((a, b) => a.name.localeCompare(b.name));
        
        setMembers(membersList);
      } catch (err) {
        console.error('Error loading members:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (clubSettings.id) {
      loadMembers();
    }
  }, [clubSettings.id, user?.id]);

  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    
    const term = searchTerm.toLowerCase();
    return members.filter(member =>
      member.name.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term)
    );
  }, [members, searchTerm]);

  // Get role display label
  const getRoleLabel = (role: ClubRole): string => {
    switch (role) {
      case 'MEMBER':
        return 'Member';
      case 'VISITOR':
        return 'Guest';
      case 'COACH':
        return 'Coach';
      case 'CLUB_ADMIN':
        return 'Club Manager';
      default:
        return 'Member';
    }
  };

  // Get role badge color
  const getRoleBadgeStyle = (role: ClubRole) => {
    switch (role) {
      case 'MEMBER':
        return {
          backgroundColor: '#cda746', // OpenActive Gold
          color: '#ffffff'
        };
      case 'VISITOR':
        return {
          backgroundColor: '#000000', // Black
          color: '#ffffff'
        };
      case 'COACH':
        return {
          backgroundColor: '#cda746', // OpenActive Gold
          color: '#ffffff'
        };
      case 'CLUB_ADMIN':
        return {
          backgroundColor: '#cda746', // OpenActive Gold
          color: '#ffffff'
        };
      default:
        return {
          backgroundColor: '#cda746', // OpenActive Gold
          color: '#ffffff'
        };
    }
  };

  // Get rating circle style (gold for some, gray for others)
  const getRatingStyle = (rating: number, index: number) => {
    // Alternate between gold and gray, or use gold for ratings >= 7.5
    const useGold = rating >= 7.5 || index % 3 === 0;
    return {
      backgroundColor: useGold ? '#fbbf24' : '#e5e7eb',
      color: useGold ? '#052333' : '#6b7280'
    };
  };

  // Get status dot color (teal/green for online, gray for offline)
  const getStatusDotColor = (isOnline: boolean) => {
    return isOnline ? '#14b8a6' : '#9ca3af'; // Teal for online, gray for offline
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: clubSettings.backgroundColor,
        color: clubSettings.fontColor,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ClubHeader 
        logo={clubSettings.logo}
        fontColor={clubSettings.fontColor} 
        backgroundColor={clubSettings.backgroundColor}
        selectedColor={clubSettings.selectedColor}
        currentPath={`/club/${slug}/members`}
      />
      <ClubNotifications clubId={clubSettings.id} fontColor={clubSettings.fontColor} />
      
      <div className={styles.rankingsContentContainer}>
        {isLoading ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            gap: '16px'
          }}>
            <OpenActiveLoader fontColor="#ffffff" size={48} />
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className={styles.rankingsSearchContainer}>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.rankingsSearchInput}
                style={{ color: clubSettings.fontColor }}
              />
              <span className={styles.rankingsSearchIcon} style={{ color: clubSettings.fontColor }}>
                🔍
              </span>
            </div>

            {/* Members List */}
            <div className={styles.rankingsMembersList}>
              {filteredMembers.length === 0 ? (
                <div className={styles.rankingsEmptyState} style={{ color: clubSettings.fontColor }}>
                  {searchTerm ? 'No members found matching your search.' : 'No members found.'}
                </div>
              ) : (
                filteredMembers.map((member, index) => (
                  <div
                    key={member.id}
                    onClick={() => router.push(`/club/${slug}/members/${member.id}`)}
                    className={styles.rankingsMemberCard}
                  >
                    {/* Avatar */}
                    <div className={styles.rankingsMemberAvatarContainer}>
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className={styles.rankingsMemberAvatar}
                          onError={(e) => {
                            // Fallback to initials if image fails
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const initials = member.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);
                              const div = document.createElement('div');
                              div.className = styles.rankingsMemberAvatarPlaceholder;
                              div.textContent = initials;
                              parent.appendChild(div);
                            }
                          }}
                        />
                      ) : (
                        <div className={styles.rankingsMemberAvatarPlaceholder}>
                          {member.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                      )}
                    </div>

                    {/* Member Info */}
                    <div className={styles.rankingsMemberInfo}>
                      <div className={styles.rankingsMemberName}>
                        {member.name}
                      </div>
                      <div className={styles.rankingsMemberRoleContainer}>
                        <span
                          className={styles.rankingsMemberRoleBadge}
                          style={getRoleBadgeStyle(member.role)}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className={styles.rankingsMemberRatingContainer}>
                      <div
                        className={styles.rankingsMemberRatingCircle}
                        style={getRatingStyle(member.rating || 0, index)}
                      >
                        {member.rating?.toFixed(1) || 'N/A'}
                      </div>
                      <div
                        className={styles.rankingsMemberStatusDot}
                        style={{ backgroundColor: getStatusDotColor(member.isOnline || false) }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <ClubFooter fontColor={clubSettings.fontColor} />
    </div>
  );
}

export default function ClubMembersClient(props: ClubMembersClientProps) {
  return (
    <ClubAnimationProvider>
      <ClubMembersContent {...props} />
    </ClubAnimationProvider>
  );
}

