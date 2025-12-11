'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClientClient } from '@/lib/supabase';
import { getUserClubRole, type ClubRole } from '@/lib/club-roles';
import { useAuth } from '@/lib/auth-context';
import { ClubAnimationProvider, useClubAnimation } from '@/components/club/ClubAnimationContext';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';
import ClubNotifications from '@/components/club/ClubNotifications';
import OpenActiveLoader from '@/components/OpenActiveLoader';
import type { ClubSettings } from '@/lib/club-settings';

interface MemberProfile {
  id: string;
  Firstname?: string;
  Surname?: string;
  email?: string;
  avatarUrl?: string;
  role?: ClubRole;
  bio?: string;
  lastLoginAt?: string;
  isOnline?: boolean;
}

interface MemberProfileClientProps {
  slug: string;
  userId: string;
  clubSettings: ClubSettings;
}

function MemberProfileContent({ slug, userId, clubSettings }: MemberProfileClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { contentVisible } = useClubAnimation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [member, setMember] = useState<MemberProfile | null>(null);

  useEffect(() => {
    const loadMemberProfile = async () => {
      if (!userId || !clubSettings.id) return;
      
      try {
        const supabase = getSupabaseClientClient();
        
        // Load user data - try with bio first, fallback without if column doesn't exist
        let userData, userError;
        
        const resultWithBio = await supabase
          .from('Users')
          .select('id, Firstname, Surname, email, avatarUrl, bio, lastLoginAt')
          .eq('id', userId)
          .maybeSingle();
        
        userData = resultWithBio.data;
        userError = resultWithBio.error;
        
        // If error is about missing column, try without bio
        if (userError && (userError.code === '42703' || userError.message?.includes('column') || userError.message?.includes('bio'))) {
          console.warn('bio column not found, fetching without it');
          const resultWithoutBio = await supabase
            .from('Users')
            .select('id, Firstname, Surname, email, avatarUrl, lastLoginAt')
            .eq('id', userId)
            .maybeSingle();
          
          userData = resultWithoutBio.data;
          userError = resultWithoutBio.error;
        }
        
        if (userError) {
          console.error('Error loading member:', {
            message: userError.message,
            code: userError.code,
            details: userError.details,
            hint: userError.hint,
            error: userError
          });
          setIsLoading(false);
          return;
        }
        
        if (!userData) {
          console.warn('Member not found:', userId);
          setIsLoading(false);
          return;
        }
        
        // Get user's role at this club
        const role = await getUserClubRole(supabase, userId, clubSettings.id);
        
        // Determine if user is online
        const isCurrentUser = user?.id === userId;
        const lastLoginAt = userData.lastLoginAt ? new Date(userData.lastLoginAt) : null;
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
        // Current user is always online, others are online if logged in within last 15 minutes
        const isOnline = isCurrentUser || (lastLoginAt && lastLoginAt > fifteenMinutesAgo);
        
        const name = userData.Firstname && userData.Surname
          ? `${userData.Firstname} ${userData.Surname}`
          : userData.Firstname || userData.Surname || userData.email?.split('@')[0] || 'Unknown';
        
        setMember({
          id: userData.id,
          Firstname: userData.Firstname,
          Surname: userData.Surname,
          email: userData.email || '',
          avatarUrl: userData.avatarUrl || undefined,
          bio: userData.bio || undefined,
          role,
          lastLoginAt: userData.lastLoginAt || undefined,
          isOnline: isOnline || false
        });
      } catch (err) {
        console.error('Error loading member profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId && clubSettings.id) {
      loadMemberProfile();
    }
  }, [userId, clubSettings.id, user?.id]);

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

  const displayName = member?.Firstname && member?.Surname
    ? `${member.Firstname} ${member.Surname}`
    : member?.Firstname || member?.Surname || member?.email?.split('@')[0] || 'Player Name';

  const initials = displayName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'PN';

  if (isLoading) {
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
        <ClubFooter fontColor={clubSettings.fontColor} />
      </div>
    );
  }

  if (!member) {
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
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: clubSettings.fontColor }}>
              Member not found
            </h1>
            <button
              onClick={() => router.push(`/club/${slug}/members`)}
              style={{
                padding: '12px 24px',
                backgroundColor: clubSettings.selectedColor,
                color: '#ffffff',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Back to Members
            </button>
          </div>
        </div>
        <ClubFooter fontColor={clubSettings.fontColor} />
      </div>
    );
  }

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

      <div style={{
        opacity: contentVisible ? 1 : 0,
        transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Profile Banner */}
        <div style={{
          position: 'relative',
          backgroundColor: clubSettings.backgroundColor,
          paddingTop: '60px',
          paddingBottom: '40px',
          textAlign: 'center'
        }}>
          {/* Background Image Placeholder */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1622279457484731-3f12d8cb64d9?w=1200)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2
          }}></div>

          {/* Profile Avatar */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: '16px'
          }}>
            <div style={{
              position: 'relative',
              display: 'inline-block'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: clubSettings.backgroundColor,
                border: `4px solid ${member.role === 'VISITOR' ? '#000000' : (member.role === 'MEMBER' ? '#cda746' : clubSettings.selectedColor)}`,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: clubSettings.fontColor,
                fontSize: '48px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {member.avatarUrl ? (
                  <img 
                    src={member.avatarUrl} 
                    alt={displayName}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = initials;
                      }
                    }}
                  />
                ) : (
                  initials
                )}
              </div>
              {/* Online Status Dot */}
              {member.isOnline && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#14b8a6',
                  border: '3px solid #ffffff',
                  zIndex: 2
                }} />
              )}
            </div>
          </div>

          {/* Player Name */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: '12px'
          }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: clubSettings.fontColor,
              margin: 0
            }}>
              {displayName}
            </h1>
          </div>

          {/* Role Badge */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'inline-block',
              backgroundColor: member.role === 'VISITOR' ? '#000000' : (member.role === 'MEMBER' ? '#cda746' : clubSettings.selectedColor),
              color: '#ffffff',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {getRoleLabel(member.role || 'VISITOR')}
            </div>
          </div>

          {/* Description */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '600px',
            margin: '0 auto',
            padding: '0 24px'
          }}>
            <p style={{
              color: `rgba(255, 255, 255, 0.9)`,
              fontSize: '14px',
              lineHeight: '1.6',
              margin: 0
            }}>
              {member.email || 'Member of Open Active'}
            </p>
          </div>
        </div>

        {/* Profile Content */}
        <div style={{
          flex: 1,
          maxWidth: '800px',
          margin: '0 auto',
          padding: '32px 24px',
          width: '100%',
          backgroundColor: '#ffffff'
        }}>
          {/* Basic Info Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '3px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#052333',
              marginBottom: '20px'
            }}>
              Profile Information
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {member.Firstname && (
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>First Name</div>
                  <div style={{ fontSize: '16px', color: '#052333', fontWeight: '500' }}>
                    {member.Firstname}
                  </div>
                </div>
              )}

              {member.Surname && (
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Last Name</div>
                  <div style={{ fontSize: '16px', color: '#052333', fontWeight: '500' }}>
                    {member.Surname}
                  </div>
                </div>
              )}

              {member.email && (
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Email</div>
                  <div style={{ fontSize: '16px', color: '#052333', fontWeight: '500' }}>
                    {member.email}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>About</div>
                <div style={{ 
                  fontSize: '16px', 
                  color: '#052333', 
                  fontWeight: '400',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {member.bio || 'No bio available.'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Status</div>
                <div style={{ 
                  fontSize: '16px', 
                  color: '#052333', 
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: member.isOnline ? '#14b8a6' : '#9ca3af'
                  }} />
                  {member.isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClubFooter fontColor={clubSettings.fontColor} />
    </div>
  );
}

export default function MemberProfileClient(props: MemberProfileClientProps) {
  return (
    <ClubAnimationProvider>
      <MemberProfileContent {...props} />
    </ClubAnimationProvider>
  );
}

