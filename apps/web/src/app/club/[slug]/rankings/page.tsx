'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import { getClubUsersWithRoles, type ClubRole } from '@/lib/club-roles';
import { useAuth } from '@/lib/auth-context';
import ClubHeader from '../ClubHeader';
import ClubFooter from '../ClubFooter';
import ClubNotifications from '../ClubNotifications';
import styles from '@/styles/frontend.module.css';

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

export default function ClubRankingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [backgroundColor, setBackgroundColor] = useState('#052333');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clubId, setClubId] = useState<string | null>(null);
  const [startRanking, setStartRanking] = useState<number>(5);
  const [hasSetRanking, setHasSetRanking] = useState<boolean>(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<RankingCategory>('SINGLES_MENS');
  const [rankings, setRankings] = useState<Map<string, UserRanking>>(new Map());
  const [isSavingRanking, setIsSavingRanking] = useState<boolean>(false);
  const { user } = useAuth();
  
  const minRanking = 3;
  const maxRanking = 7;

  const categoryOptions: { value: RankingCategory; label: string }[] = [
    { value: 'SINGLES_MENS', label: 'Singles Mens Tennis' },
    { value: 'SINGLES_LADIES', label: 'Singles Ladies Tennis' },
    { value: 'DOUBLES_MENS', label: 'Doubles Mens Tennis' },
    { value: 'DOUBLES_LADIES', label: 'Doubles Ladies Tennis' },
    { value: 'MIXED', label: 'Mixed' }
  ];

  useEffect(() => {
    const loadClubSettings = async () => {
      try {
        const supabase = getSupabaseClientClient();

        const { data: clubsData } = await supabase
          .from('Clubs')
          .select('id, name, logo, backgroundColor, fontColor, selectedColor')
          .eq('is_active', true);

        if (clubsData) {
          const club = clubsData.find(c => generateSlug(c.name) === slug);
          if (club) {
            setClubId(club.id);
            setBackgroundColor(club.backgroundColor || '#052333');
            setFontColor(club.fontColor || '#ffffff');
            setSelectedColor(club.selectedColor || '#667eea');
            setLogo(club.logo);
          }
        }
      } catch (err) {
        console.error('Error loading club settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadClubSettings();
    }
  }, [slug]);

  // Load user avatar and name
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) return;
      
      try {
        const supabase = getSupabaseClientClient();
        const { data: userData } = await supabase
          .from('Users')
          .select('avatarUrl, Firstname, Surname')
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
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };
    
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id, user?.email]);

  // Load rankings for the selected category
  useEffect(() => {
    const loadRankings = async () => {
      if (!clubId || !selectedCategory) return;
      
      try {
        const supabase = getSupabaseClientClient();
        
        // Fetch rankings for this club and all categories
        const { data: rankingsData, error: rankingsError } = await supabase
          .from('Rankings')
          .select('userId, category, startingRanking, currentRanking')
          .eq('clubId', clubId);

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
          } else {
            setHasSetRanking(false);
          }
        }
      } catch (err) {
        console.error('Error loading rankings:', err);
      }
    };

    if (clubId) {
      loadRankings();
    }
  }, [clubId, selectedCategory, user?.id]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!clubId) return;
      
      try {
        const supabase = getSupabaseClientClient();
        
        // Fetch users with roles and avatarUrl
        const { data: roles, error: rolesError } = await supabase
          .from('UserClubRoles')
          .select('userId, role, Users!inner(id, email, Firstname, Surname, avatarUrl)')
          .eq('clubId', clubId);

        // Get all users (including those without explicit roles - they are VISITORS)
        const { data: allUsers, error: usersError } = await supabase
          .from('Users')
          .select('id, email, Firstname, Surname, avatarUrl, lastLoginAt')
          .order('Firstname', { ascending: true });

        if (usersError) {
          console.error('Error fetching users:', usersError);
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
        });
        
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
      }
    };

    if (clubId) {
      loadMembers();
    }
  }, [clubId, user?.id, rankings, selectedCategory]);

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
          backgroundColor: '#fbbf24', // Gold
          color: '#052333'
        };
      case 'VISITOR':
        return {
          backgroundColor: '#052333', // Dark blue
          color: '#ffffff'
        };
      case 'COACH':
        return {
          backgroundColor: '#fbbf24', // Gold
          color: '#052333'
        };
      case 'CLUB_ADMIN':
        return {
          backgroundColor: '#fbbf24', // Gold
          color: '#052333'
        };
      default:
        return {
          backgroundColor: '#fbbf24',
          color: '#052333'
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
        backgroundColor: backgroundColor,
        color: fontColor,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ClubHeader 
        logo={logo}
        fontColor={fontColor} 
        backgroundColor={backgroundColor}
        selectedColor={selectedColor}
        currentPath={`/club/${slug}/rankings`}
      />
      <ClubNotifications clubId={clubId} fontColor={fontColor} />
      
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
          <div 
            className={styles.spinner}
            style={{
              width: '40px',
              height: '40px',
              border: `4px solid ${fontColor}20`,
              borderTop: `4px solid ${fontColor}`,
              borderRadius: '50%'
            }} 
          />
          <div style={{
            color: fontColor,
            fontSize: '16px',
            opacity: 0.7
          }}>
            Loading rankings...
          </div>
        </div>
      ) : (
        <>
        {/* Set Your Start Ranking Section */}
        {!hasSetRanking && (
          <div style={{
            backgroundColor: '#052333',
            width: '100%',
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            {/* Circular Image with Ranking Number */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                backgroundColor: '#052333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '4px solid #fbbf24'
              }}>
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt="Profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      // Fallback to initials if image fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const initials = userName
                          ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          : user?.email?.charAt(0).toUpperCase() || 'U';
                        parent.innerHTML = `<div style="width: 100%; height: 100%; background-color: #667eea; display: flex; align-items: center; justify-content: center; font-size: 48px; color: #ffffff; font-weight: 600;">${initials}</div>`;
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    color: '#ffffff',
                    fontWeight: '600'
                  }}>
                    {userName
                      ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              {/* Ranking Number Overlay */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: '700',
                color: '#052333',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                {startRanking}
              </div>
            </div>

            {/* Title and Description */}
            <div style={{ textAlign: 'center' }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '12px'
              }}>
                SET YOUR START RANKING
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#ffffff',
                opacity: 0.8,
                maxWidth: '400px',
                lineHeight: '1.5'
              }}>
                Estimate your level at the club it will be used as a starting ranking and adjust with results entered.
              </p>
            </div>

            {/* Skill Level Slider */}
            <div style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
              {/* Background track showing full range */}
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                height: '4px',
                borderRadius: '2px',
                background: 'rgba(255, 255, 255, 0.2)',
                pointerEvents: 'none'
              }} />
              
              {/* Active track (3-7 portion) */}
              <div style={{
                position: 'absolute',
                top: '0',
                left: `${(minRanking / 10) * 100}%`,
                width: `${((maxRanking - minRanking) / 10) * 100}%`,
                height: '4px',
                borderRadius: '2px',
                background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${((startRanking - minRanking) / (maxRanking - minRanking)) * 100}%, rgba(255, 255, 255, 0.2) ${((startRanking - minRanking) / (maxRanking - minRanking)) * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
                pointerEvents: 'none'
              }} />
              
              {/* Slider input constrained to 3-7 range */}
              <div style={{
                position: 'relative',
                paddingLeft: `${(minRanking / 10) * 100}%`,
                paddingRight: `${((10 - maxRanking) / 10) * 100}%`,
                marginBottom: '32px'
              }}>
                <input
                  type="range"
                  min={minRanking}
                  max={maxRanking}
                  value={startRanking}
                  onChange={(e) => setStartRanking(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'transparent',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    position: 'relative',
                    zIndex: 1
                  }}
                />
              </div>
              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  background: #fbbf24;
                  cursor: pointer;
                  border: none;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                  position: relative;
                }
                input[type="range"]::-moz-range-thumb {
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  background: #fbbf24;
                  cursor: pointer;
                  border: none;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                input[type="range"]::-webkit-slider-runnable-track {
                  background: transparent;
                }
                input[type="range"]::-moz-range-track {
                  background: transparent;
                }
              `}</style>
              
              {/* Number Markers (0-10) */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                position: 'absolute',
                top: '24px',
                left: '0',
                right: '0',
                fontSize: '12px',
                color: '#ffffff',
                opacity: 0.7,
                pointerEvents: 'none',
                paddingTop: '8px'
              }}>
                {Array.from({ length: 11 }, (_, i) => (
                  <span key={i} style={{ opacity: i >= minRanking && i <= maxRanking ? 1 : 0.3 }}>
                    {i}
                  </span>
                ))}
              </div>
              
              {/* Slider Labels */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '32px',
                fontSize: '12px',
                color: '#ffffff',
                opacity: 0.7
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px' }}>BEGINNER</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px' }}>INTERMEDIATE</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px' }}>ADVANCED</span>
                </div>
              </div>
            </div>

            {/* Lock In Button */}
            <button
              onClick={async () => {
                if (!user?.id || !clubId || isSavingRanking) return;
                
                setIsSavingRanking(true);
                try {
                  const supabase = getSupabaseClientClient();
                  
                  // Upsert the ranking (insert or update if exists)
                  const { error } = await supabase
                    .from('Rankings')
                    .upsert({
                      userId: user.id,
                      clubId: clubId,
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
                  
                  // Reload rankings to update the display
                  const { data: rankingsData } = await supabase
                    .from('Rankings')
                    .select('userId, category, startingRanking, currentRanking')
                    .eq('clubId', clubId)
                    .eq('category', selectedCategory);

                  if (rankingsData) {
                    const rankingsMap = new Map<string, UserRanking>();
                    rankingsData.forEach((r: any) => {
                      rankingsMap.set(r.userId, {
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
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                backgroundColor: isSavingRanking ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                border: '2px solid #ffffff',
                borderRadius: '3px',
                cursor: isSavingRanking ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isSavingRanking ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSavingRanking) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSavingRanking) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {isSavingRanking ? 'SAVING...' : 'LOCK IN START LEVEL'}
            </button>
          </div>
        )}

        <div style={{ 
          flex: 1, 
          padding: '20px',
          maxWidth: '500px',
          width: '100%',
          margin: '0 auto'
        }}>
        {/* Category Selector */}
        <div style={{
          marginBottom: '20px'
        }}>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as RankingCategory);
              setHasSetRanking(false); // Reset until we load the new category's rankings
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: fontColor,
              outline: 'none',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value} style={{ backgroundColor: backgroundColor, color: fontColor }}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          marginBottom: '20px'
        }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: fontColor,
              outline: 'none',
              boxSizing: 'border-box',
              backdropFilter: 'blur(10px)'
            }}
          />
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            color: fontColor,
            opacity: 0.7
          }}>
            🔍
          </span>
        </div>

        {/* Members List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '5px'
        }}>
          {filteredMembers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: fontColor,
              opacity: 0.7
            }}>
              {searchTerm ? 'No members found matching your search.' : 'No members found.'}
            </div>
          ) : (
            filteredMembers.map((member, index) => (
              <div
                key={member.id}
                onClick={() => router.push(`/club/${slug}/members/${member.id}`)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '3px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Avatar */}
                <div style={{
                  position: 'relative',
                  flexShrink: 0
                }}>
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #fbbf24'
                      }}
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
                          parent.innerHTML = `<div style="width: 64px; height: 64px; border-radius: 50%; background-color: #052333; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 600; font-size: 20px; border: 3px solid #fbbf24;">${initials}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: '#052333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '20px',
                      border: '3px solid #fbbf24'
                    }}>
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
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#052333'
                  }}>
                    {member.name}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontWeight: '500',
                      ...getRoleBadgeStyle(member.role)
                    }}>
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                </div>

                    {/* Rating */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexShrink: 0
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '16px',
                        ...(member.rating !== undefined 
                          ? getRatingStyle(member.rating, index)
                          : { backgroundColor: '#e5e7eb', color: '#6b7280' }
                        )
                      }}>
                        {member.rating !== undefined ? member.rating.toFixed(1) : '?'}
                      </div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getStatusDotColor(member.isOnline || false)
                      }} />
                    </div>
              </div>
            ))
          )}
        </div>
        </div>
          </>
        )}

      <ClubFooter fontColor={fontColor} />
    </div>
  );
}
