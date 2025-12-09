'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import { getUserClubRole, type ClubRole } from '@/lib/club-roles';
import ClubHeader from '../../ClubHeader';
import ClubFooter from '../../ClubFooter';
import ClubNotifications from '../../ClubNotifications';
import styles from '@/styles/frontend.module.css';

interface MemberProfile {
  id: string;
  Firstname?: string;
  Surname?: string;
  email?: string;
  avatarUrl?: string;
  role?: ClubRole;
  lastLoginAt?: string;
  isOnline?: boolean;
}

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const userId = params.userId as string;
  
  const [backgroundColor, setBackgroundColor] = useState('#052333');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);

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
      }
    };

    if (slug) {
      loadClubSettings();
    }
  }, [slug]);

  useEffect(() => {
    const loadMemberProfile = async () => {
      if (!userId || !clubId) return;
      
      try {
        const supabase = getSupabaseClientClient();
        
        // Load user data
        const { data: userData, error: userError } = await supabase
          .from('Users')
          .select('id, Firstname, Surname, email, avatarUrl, lastLoginAt')
          .eq('id', userId)
          .maybeSingle();
        
        if (userError) {
          console.error('Error loading member:', userError);
          setIsLoading(false);
          return;
        }
        
        if (!userData) {
          setIsLoading(false);
          return;
        }
        
        // Get user's role at this club
        const role = await getUserClubRole(supabase, userId, clubId);
        
        // Determine if user is online
        const lastLoginAt = userData.lastLoginAt ? new Date(userData.lastLoginAt) : null;
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const isOnline = lastLoginAt && lastLoginAt > fifteenMinutesAgo;
        
        const name = userData.Firstname && userData.Surname
          ? `${userData.Firstname} ${userData.Surname}`
          : userData.Firstname || userData.Surname || userData.email?.split('@')[0] || 'Unknown';
        
        setMember({
          id: userData.id,
          Firstname: userData.Firstname,
          Surname: userData.Surname,
          email: userData.email || '',
          avatarUrl: userData.avatarUrl || undefined,
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

    if (userId && clubId) {
      loadMemberProfile();
    }
  }, [userId, clubId]);

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

  const getRoleBadgeStyle = (role: ClubRole) => {
    switch (role) {
      case 'MEMBER':
        return {
          backgroundColor: '#fbbf24',
          color: '#052333'
        };
      case 'VISITOR':
        return {
          backgroundColor: '#052333',
          color: '#ffffff'
        };
      case 'COACH':
        return {
          backgroundColor: '#fbbf24',
          color: '#052333'
        };
      case 'CLUB_ADMIN':
        return {
          backgroundColor: '#fbbf24',
          color: '#052333'
        };
      default:
        return {
          backgroundColor: '#fbbf24',
          color: '#052333'
        };
    }
  };

  if (isLoading) {
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
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
              Loading profile...
            </div>
          </div>
        </div>
        <ClubFooter fontColor={fontColor} />
      </div>
    );
  }

  if (!member) {
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: fontColor }}>
              Member not found
            </h1>
            <button
              onClick={() => router.push(`/club/${slug}/members`)}
              style={{
                padding: '12px 24px',
                backgroundColor: selectedColor,
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
        <ClubFooter fontColor={fontColor} />
      </div>
    );
  }

  const displayName = member.Firstname && member.Surname
    ? `${member.Firstname} ${member.Surname}`
    : member.Firstname || member.Surname || member.email?.split('@')[0] || 'Unknown';

  const initials = displayName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          style={{
            marginBottom: '24px',
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: fontColor,
            border: `1px solid ${fontColor}40`,
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back
        </button>

        {/* Profile Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '3px',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          border: '1px solid #e5e7eb'
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={displayName}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #fbbf24'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div style="width: 120px; height: 120px; border-radius: 50%; background-color: #052333; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 600; font-size: 36px; border: 4px solid #fbbf24;">${initials}</div>`;
                  }
                }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#052333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '36px',
                border: '4px solid #fbbf24'
              }}>
                {initials}
              </div>
            )}
            {/* Online Status Dot */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: member.isOnline ? '#14b8a6' : '#9ca3af',
              border: '3px solid #ffffff'
            }} />
          </div>

          {/* Name */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#052333',
              marginBottom: '8px'
            }}>
              {displayName}
            </h1>
            <div style={{
              display: 'inline-block',
              fontSize: '14px',
              padding: '6px 12px',
              borderRadius: '16px',
              fontWeight: '500',
              ...getRoleBadgeStyle(member.role || 'VISITOR')
            }}>
              {getRoleLabel(member.role || 'VISITOR')}
            </div>
          </div>

          {/* Profile Information */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '8px'
          }}>
            {member.email && (
              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '3px'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  Email
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#052333',
                  fontWeight: '500'
                }}>
                  {member.email}
                </div>
              </div>
            )}

            {member.Firstname && (
              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '3px'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  First Name
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#052333',
                  fontWeight: '500'
                }}>
                  {member.Firstname}
                </div>
              </div>
            )}

            {member.Surname && (
              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '3px'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  Last Name
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#052333',
                  fontWeight: '500'
                }}>
                  {member.Surname}
                </div>
              </div>
            )}

            <div style={{
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                Status
              </div>
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

      <ClubFooter fontColor={fontColor} />
    </div>
  );
}

