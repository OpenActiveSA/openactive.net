'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import { getClubUsersWithRoles, type ClubRole } from '@/lib/club-roles';
import { useAuth } from '@/lib/auth-context';
import ClubHeader from '../ClubHeader';
import ClubFooter from '../ClubFooter';
import styles from '@/styles/frontend.module.css';

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

export default function ClubMembersPage() {
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
  const { user } = useAuth();

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
        });
        
        // Sort by name
        membersList.sort((a, b) => a.name.localeCompare(b.name));
        
        setMembers(membersList);
      } catch (err) {
        console.error('Error loading members:', err);
      }
    };

    if (clubId) {
      loadMembers();
    }
  }, [clubId, user?.id]);

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
            currentPath={`/club/${slug}/members`}
          />
          <ClubNotifications clubId={clubId} fontColor={fontColor} />
          
          <div style={{
        flex: 1, 
        padding: '20px',
        maxWidth: '500px',
        width: '100%',
        margin: '0 auto'
      }}>
        {isLoading ? (
          <div style={{
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
              Loading members...
            </div>
          </div>
        ) : (
          <>

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
                    ...getRatingStyle(member.rating || 0, index)
                  }}>
                    {member.rating?.toFixed(1) || 'N/A'}
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
          </>
        )}
      </div>

      <ClubFooter fontColor={fontColor} />
    </div>
  );
}

