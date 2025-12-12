'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { getSupabaseClientClient } from '@/lib/supabase';
import { type ClubRole, getUserClubRole } from '@/lib/club-roles';
import { useAuth } from '@/lib/auth-context';
import { ClubAnimationProvider, useClubAnimation } from '@/components/club/ClubAnimationContext';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';
import ClubNotifications from '@/components/club/ClubNotifications';
import OpenActiveLoader from '@/components/OpenActiveLoader';
import styles from '@/styles/frontend.module.css';
import type { ClubSettings } from '@/lib/club-settings';

type RankingCategory = 'SINGLES_MENS' | 'SINGLES_LADIES' | 'DOUBLES_MENS' | 'DOUBLES_LADIES' | 'MIXED';

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

interface UserRanking {
  userId: string;
  category: RankingCategory;
  startingRanking: number;
  currentRanking: number;
}

interface ClubRankingsClientProps {
  slug: string;
  clubSettings: ClubSettings;
}

function ClubRankingsContent({ slug, clubSettings }: ClubRankingsClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { contentVisible } = useClubAnimation();
  const searchParams = useSearchParams();
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startRanking, setStartRanking] = useState<number>(5);
  const [hasSetRanking, setHasSetRanking] = useState<boolean>(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<RankingCategory>(() => {
    // Initialize from URL query parameter if present
    const categoryParam = searchParams?.get('category');
    if (categoryParam && ['SINGLES_MENS', 'SINGLES_LADIES', 'DOUBLES_MENS', 'DOUBLES_LADIES', 'MIXED'].includes(categoryParam)) {
      return categoryParam as RankingCategory;
    }
    return 'SINGLES_MENS';
  });
  const [rankings, setRankings] = useState<Map<string, UserRanking>>(new Map());
  const [isSavingRanking, setIsSavingRanking] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<ClubRole | 'SUPER_ADMIN' | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showStartRankingSection, setShowStartRankingSection] = useState(false);
  
  const minRanking = 3;
  const maxRanking = 7;

  const categoryOptions: { value: RankingCategory; label: string }[] = [
    { value: 'SINGLES_MENS', label: 'Singles Mens Tennis' },
    { value: 'SINGLES_LADIES', label: 'Singles Ladies Tennis' },
    { value: 'DOUBLES_MENS', label: 'Doubles Mens Tennis' },
    { value: 'DOUBLES_LADIES', label: 'Doubles Ladies Tennis' },
    { value: 'MIXED', label: 'Mixed' }
  ];

  // Load user avatar, name, and role
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id || !clubSettings.id) {
        setUserRole(null);
        setIsSuperAdmin(false);
        return;
      }
      
      try {
        const supabase = getSupabaseClientClient();
        
        // Check if user is SUPER_ADMIN (global role in Users table)
        const { data: userData } = await supabase
          .from('Users')
          .select('role, avatarUrl, Firstname, Surname')
          .eq('id', user.id)
          .maybeSingle();
        
        if (userData) {
          if (userData.avatarUrl) {
            setUserAvatar(userData.avatarUrl);
          }
          
          const name = userData.Firstname && userData.Surname
            ? `${userData.Firstname} ${userData.Surname}`
            : userData.Firstname || userData.Surname || user.email?.split('@')[0] || '';
          setUserName(name);
          
          // Check if user is SUPER_ADMIN
          if (userData.role === 'SUPER_ADMIN') {
            setIsSuperAdmin(true);
            setUserRole('SUPER_ADMIN');
            return;
          }
        }
        
        // Get user's club role
        const clubRole = await getUserClubRole(supabase, user.id, clubSettings.id);
        setUserRole(clubRole);
        setIsSuperAdmin(false);
      } catch (err) {
        console.error('Error loading user data:', err);
        setUserRole(null);
        setIsSuperAdmin(false);
      }
    };
    
    if (user?.id && clubSettings.id) {
      loadUserData();
    } else {
      setUserRole(null);
      setIsSuperAdmin(false);
    }
  }, [user?.id, user?.email, clubSettings.id]);

  // Load rankings for the selected category
  useEffect(() => {
    const loadRankings = async () => {
      if (!clubSettings.id || !selectedCategory) return;
      
      try {
        const supabase = getSupabaseClientClient();
        
        // Fetch rankings for this club and all categories
        const { data: rankingsData, error: rankingsError } = await supabase
          .from('Rankings')
          .select('userId, category, startingRanking, currentRanking')
          .eq('clubId', clubSettings.id);

        if (rankingsError) {
          console.error('Error fetching rankings:', rankingsError);
          return;
        }

        // Create rankings map
        const rankingsMap = new Map<string, UserRanking>();
        if (rankingsData) {
          rankingsData.forEach((r: any) => {
            const key = `${r.userId}_${r.category}`;
            rankingsMap.set(key, {
              userId: r.userId,
              category: r.category,
              startingRanking: parseFloat(r.startingRanking),
              currentRanking: parseFloat(r.currentRanking)
            });
          });
        }
        
        setRankings(rankingsMap);
        
        // Check if current user has set a ranking for the selected category
        if (user?.id) {
          const userRanking = rankingsMap.get(`${user.id}_${selectedCategory}`);
          if (userRanking) {
            setHasSetRanking(true);
            setStartRanking(userRanking.startingRanking);
            setShowStartRankingSection(false);
          } else {
            setHasSetRanking(false);
            // Trigger animation after a short delay when section becomes visible
            setTimeout(() => setShowStartRankingSection(true), 100);
          }
        }
      } catch (err) {
        console.error('Error loading rankings:', err);
      }
    };

    if (clubSettings.id) {
      loadRankings();
    }
  }, [clubSettings.id, selectedCategory, user?.id]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!clubSettings.id) {
        setIsLoadingData(false);
        return;
      }
      
      setIsLoadingData(true);
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
          setIsLoadingData(false);
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

        // Combine users with roles and rankings
        const membersList: ClubMember[] = (allUsers || []).map((memberUser: any) => {
          const name = memberUser.Firstname && memberUser.Surname
            ? `${memberUser.Firstname} ${memberUser.Surname}`
            : memberUser.Firstname || memberUser.Surname || memberUser.email?.split('@')[0] || 'Unknown';
          
          // Get ranking from rankings map for the selected category
          const rankingKey = `${memberUser.id}_${selectedCategory}`;
          const userRanking = rankings.get(rankingKey);
          const rating = userRanking ? userRanking.currentRanking : undefined;
          
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
        
        // Sort: members with rankings first (by rating descending), then members without rankings
        membersList.sort((a, b) => {
          if (a.rating !== undefined && b.rating !== undefined) {
            return b.rating - a.rating; // Both have rankings, sort by rating descending
          } else if (a.rating !== undefined) {
            return -1; // a has ranking, b doesn't - a comes first
          } else if (b.rating !== undefined) {
            return 1; // b has ranking, a doesn't - b comes first
          } else {
            return 0; // Neither has ranking, maintain order
          }
        });
        
        setMembers(membersList);
      } catch (err) {
        console.error('Error loading members:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (clubSettings.id) {
      loadMembers();
    }
  }, [clubSettings.id, user?.id, rankings, selectedCategory]);

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
        return 'Player';
      case 'VISITOR':
        return 'Guest';
      case 'COACH':
        return 'Coach';
      case 'CLUB_ADMIN':
        return 'Club Manager';
      default:
        return 'Player';
    }
  };

  // Get role badge color
  const getRoleBadgeStyle = (role: ClubRole) => {
    switch (role) {
      case 'MEMBER':
        return {
          backgroundColor: '#cda746', // OpenActive Gold
          color: '#052333'
        };
      case 'VISITOR':
        return {
          backgroundColor: '#000000', // Black
          color: '#ffffff'
        };
      case 'COACH':
        return {
          backgroundColor: '#cda746', // OpenActive Gold
          color: '#052333'
        };
      case 'CLUB_ADMIN':
        return {
          backgroundColor: '#cda746', // OpenActive Gold
          color: '#052333'
        };
      default:
        return {
          backgroundColor: '#cda746', // OpenActive Gold
          color: '#052333'
        };
    }
  };

  // Get rating circle style (gold for some, gray for others)
  const getRatingStyle = (rating: number, index: number) => {
    // Alternate between gold and gray, or use gold for ratings >= 7.5
    const useGold = rating >= 7.5 || index % 3 === 0;
    return {
      backgroundColor: useGold ? '#cda746' : '#e5e7eb', // OpenActive Gold
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
        currentPath={`/club/${slug}/rankings`}
      />
      <ClubNotifications clubId={clubSettings.id} fontColor={clubSettings.fontColor} />
      
      {isLoadingData ? (
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
          {/* Set Your Start Ranking Section - Only show for logged-in members, club managers, or super admins */}
          {!hasSetRanking && user?.id && userRole && (userRole === 'MEMBER' || userRole === 'CLUB_ADMIN' || isSuperAdmin) && showStartRankingSection && (
            <div className={styles.rankingsStartSection}>
              {/* Circular Image with Ranking Number */}
              <div className={styles.rankingsProfileContainer}>
                <div className={styles.rankingsProfileCircle}>
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="Profile"
                      className={styles.rankingsProfileImage}
                      onError={(e) => {
                        // Fallback to initials if image fails
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const initials = userName
                            ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : user?.email?.charAt(0).toUpperCase() || 'U';
                          const div = document.createElement('div');
                          div.className = styles.rankingsProfileInitials;
                          div.textContent = initials;
                          parent.appendChild(div);
                        }
                      }}
                    />
                  ) : (
                    <div className={styles.rankingsProfileInitials}>
                      {userName
                        ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        : user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                {/* Ranking Number Overlay */}
                <div className={styles.rankingsNumberOverlay}>
                  {startRanking}
                </div>
              </div>

              {/* Title and Description */}
              <div className={styles.rankingsTitleSection}>
                <h2 className={styles.rankingsTitle}>
                  SET YOUR START RANKING
                </h2>
                <p className={styles.rankingsDescription}>
                  Estimate your level at the club it will be used as a starting ranking and adjust with results entered.
                </p>
              </div>

              {/* Skill Level Slider */}
              <div className={styles.rankingsSliderContainer}>
                {/* Background track showing full range */}
                <div className={styles.rankingsSliderTrack} />
                
                {/* Slider input constrained to 3-7 range */}
                <div 
                  className={styles.rankingsSliderInputContainer}
                  style={{
                    paddingLeft: '27%',
                    paddingRight: '27%'
                  }}
                >
                  <input
                    type="range"
                    min={minRanking}
                    max={maxRanking}
                    value={startRanking}
                    onChange={(e) => setStartRanking(parseInt(e.target.value))}
                    className={styles.rankingsSliderInput}
                  />
                </div>
                
                {/* Number Markers (0-10) */}
                <div className={styles.rankingsSliderNumberMarkers}>
                  {Array.from({ length: 11 }, (_, i) => (
                    <span key={i} style={{ opacity: i >= minRanking && i <= maxRanking ? 1 : 0.3 }}>
                      {i}
                    </span>
                  ))}
                </div>
                
                {/* Slider Labels */}
                <div className={styles.rankingsSliderLabels}>
                  <div className={styles.rankingsSliderLabelItem}>
                    <span className={styles.rankingsSliderLabelText}>BEGINNER</span>
                  </div>
                  <div className={styles.rankingsSliderLabelItem}>
                    <span className={styles.rankingsSliderLabelText}>INTERMEDIATE</span>
                  </div>
                  <div className={styles.rankingsSliderLabelItem}>
                    <span className={styles.rankingsSliderLabelText}>ADVANCED</span>
                  </div>
                </div>
              </div>

              {/* Lock In Button */}
              <button
                onClick={async () => {
                  if (!user?.id || !clubSettings.id || isSavingRanking) return;
                  
                  setIsSavingRanking(true);
                  try {
                    const supabase = getSupabaseClientClient();
                    
                    // Upsert the ranking (insert or update if exists)
                    const { error } = await supabase
                      .from('Rankings')
                      .upsert({
                        userId: user.id,
                        clubId: clubSettings.id,
                        category: selectedCategory,
                        startingRanking: startRanking,
                        currentRanking: startRanking // Initially, current ranking equals starting ranking
                      }, {
                        onConflict: 'userId,clubId,category'
                      });

                    if (error) {
                      console.error('Error saving ranking:', error);
                      alert('Failed to save ranking. Please try again.');
                      return;
                    }

                    setHasSetRanking(true);
                    setShowStartRankingSection(false);
                    
                    // Reload rankings to update the display
                    const { data: rankingsData } = await supabase
                      .from('Rankings')
                      .select('userId, category, startingRanking, currentRanking')
                      .eq('clubId', clubSettings.id)
                      .eq('category', selectedCategory);

                    if (rankingsData) {
                      const rankingsMap = new Map<string, UserRanking>();
                      rankingsData.forEach((r: any) => {
                        const key = `${r.userId}_${r.category}`;
                        rankingsMap.set(key, {
                          userId: r.userId,
                          category: r.category,
                          startingRanking: parseFloat(r.startingRanking),
                          currentRanking: parseFloat(r.currentRanking)
                        });
                      });
                      setRankings(rankingsMap);
                    }
                  } catch (err) {
                    console.error('Error saving ranking:', err);
                    alert('Failed to save ranking. Please try again.');
                  } finally {
                    setIsSavingRanking(false);
                  }
                }}
                disabled={isSavingRanking}
                className={styles.rankingsLockButton}
                style={{
                  backgroundColor: isSavingRanking ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                  opacity: isSavingRanking ? 0.7 : 1
                }}
              >
                {isSavingRanking ? 'SAVING...' : 'LOCK IN START LEVEL'}
              </button>
            </div>
          )}

          <div className={styles.rankingsContentContainer}>
            {/* Category Selector */}
            <div className={styles.rankingsCategorySelector}>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value as RankingCategory);
                  setHasSetRanking(false); // Reset until we load the new category's rankings
                  setShowStartRankingSection(false); // Reset animation state
                }}
                className={styles.rankingsCategorySelect}
                style={{ color: clubSettings.fontColor }}
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value} style={{ backgroundColor: clubSettings.backgroundColor, color: clubSettings.fontColor }}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

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
                        style={member.rating !== undefined 
                          ? getRatingStyle(member.rating, index)
                          : { backgroundColor: '#e5e7eb', color: '#6b7280' }
                        }
                      >
                        {member.rating !== undefined ? member.rating.toFixed(1) : '?'}
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
          </div>
        </>
      )}

      <ClubFooter fontColor={clubSettings.fontColor} />
    </div>
  );
}

export default function ClubRankingsClient(props: ClubRankingsClientProps) {
  return (
    <ClubAnimationProvider>
      <ClubRankingsContent {...props} />
    </ClubAnimationProvider>
  );
}

