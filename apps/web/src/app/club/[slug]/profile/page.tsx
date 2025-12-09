'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClubHeader from '../ClubHeader';
import ClubFooter from '../ClubFooter';

interface UserProfile {
  id: string;
  Firstname?: string;
  Surname?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

export default function ClubProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const [backgroundColor, setBackgroundColor] = useState('#052333');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [clubLoading, setClubLoading] = useState(true);

  // Load club settings
  useEffect(() => {
    const loadClubSettings = async () => {
      try {
        const supabase = getSupabaseClientClient();

        const { data: clubsData } = await supabase
          .from('Clubs')
          .select('*')
          .eq('is_active', true);

        if (clubsData) {
          const club = clubsData.find(c => generateSlug(c.name) === slug);
          if (club) {
            setBackgroundColor(club.backgroundColor || '#052333');
            setFontColor(club.fontColor || '#ffffff');
            setSelectedColor(club.selectedColor || '#667eea');
            setLogo(club.logo);
          }
        }
      } catch (err) {
        console.error('Error loading club settings:', err);
      } finally {
        setClubLoading(false);
      }
    };

    if (slug) {
      loadClubSettings();
    }
  }, [slug]);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClientClient();
        
        const result = await supabase
          .from('Users')
          .select('id, Firstname, Surname, email, avatarUrl, role')
          .eq('id', user.id)
          .maybeSingle();
        
        if (result.data) {
          setProfile(result.data);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const displayName = profile?.Firstname && profile?.Surname
    ? `${profile.Firstname} ${profile.Surname}`
    : profile?.Firstname || profile?.Surname || profile?.email?.split('@')[0] || 'Player Name';

  const initials = displayName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'PN';

  // Handle profile picture upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const supabase = getSupabaseClientClient();
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${user.id}/${fileName}`;

      // Upload file to Supabase Storage (try user-avatars bucket, fallback to club-images)
      let uploadData, uploadError, bucketName = 'user-avatars';
      
      const result = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      uploadData = result.data;
      uploadError = result.error;

      // If user-avatars bucket doesn't exist, try club-images as fallback
      if (uploadError && (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found'))) {
        console.warn('user-avatars bucket not found, trying club-images as fallback');
        bucketName = 'club-images';
        const fallbackResult = await supabase.storage
          .from('club-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });
        uploadData = fallbackResult.data;
        uploadError = fallbackResult.error;
      }

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          setUploadError('Storage bucket not found. Please create a "user-avatars" bucket in Supabase Storage.');
        } else {
          throw uploadError;
        }
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        // Update user profile with new avatar URL
        const { error: updateError } = await supabase
          .from('Users')
          .update({ avatarUrl: urlData.publicUrl })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }

        // Update local state
        setProfile(prev => prev ? { ...prev, avatarUrl: urlData.publicUrl } : null);
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setUploadError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  if (clubLoading || isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: backgroundColor,
        color: fontColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
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
          currentPath={`/club/${slug}/profile`}
        />

        {/* Profile Banner */}
        <div style={{
          position: 'relative',
          backgroundColor: backgroundColor,
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
              display: 'inline-block',
              cursor: 'pointer'
            }}
            onClick={() => {
              const input = document.getElementById('avatar-upload') as HTMLInputElement;
              input?.click();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            >
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: backgroundColor,
                border: `4px solid ${selectedColor}`,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: fontColor,
                fontSize: '48px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {profile?.avatarUrl ? (
                  <img 
                    src={profile.avatarUrl} 
                    alt={displayName}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  initials
                )}
                {/* Upload overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: fontColor,
                  padding: '4px',
                  fontSize: '10px',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '30px'
                }}>
                  {isUploading ? 'Uploading...' : '📷 Change'}
                </div>
              </div>
            </div>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
              disabled={isUploading}
            />
            {uploadError && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: fontColor,
                borderRadius: '6px',
                fontSize: '12px',
                textAlign: 'center',
                maxWidth: '300px',
                margin: '8px auto 0'
              }}>
                {uploadError}
              </div>
            )}
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
              color: fontColor,
              margin: 0
            }}>
              {displayName}
            </h1>
          </div>

          {/* Club Member Badge */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'inline-block',
              backgroundColor: selectedColor,
              color: fontColor,
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Club Member
            </div>
          </div>

          {/* Description Placeholder */}
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
              {profile?.email || 'Member of Open Active'}
            </p>
          </div>
        </div>

        {/* Profile Content */}
        <div style={{
          flex: 1,
          maxWidth: '800px',
          margin: '0 auto',
          padding: '32px 24px',
          width: '100%'
        }}>
          {/* Basic Info Card */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: fontColor,
              marginBottom: '20px'
            }}>
              Profile Information
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {profile?.Firstname && (
                <div>
                  <div style={{ fontSize: '12px', color: `rgba(255, 255, 255, 0.7)`, marginBottom: '4px' }}>First Name</div>
                  <div style={{ fontSize: '16px', color: fontColor, fontWeight: '500' }}>
                    {profile.Firstname}
                  </div>
                </div>
              )}

              {profile?.Surname && (
                <div>
                  <div style={{ fontSize: '12px', color: `rgba(255, 255, 255, 0.7)`, marginBottom: '4px' }}>Last Name</div>
                  <div style={{ fontSize: '16px', color: fontColor, fontWeight: '500' }}>
                    {profile.Surname}
                  </div>
                </div>
              )}

              {profile?.email && (
                <div>
                  <div style={{ fontSize: '12px', color: `rgba(255, 255, 255, 0.7)`, marginBottom: '4px' }}>Email</div>
                  <div style={{ fontSize: '16px', color: fontColor, fontWeight: '500' }}>
                    {profile.email}
                  </div>
                </div>
              )}

              {profile?.role && (
                <div>
                  <div style={{ fontSize: '12px', color: `rgba(255, 255, 255, 0.7)`, marginBottom: '4px' }}>Role</div>
                  <div style={{ fontSize: '16px', color: fontColor, fontWeight: '500' }}>
                    {profile.role}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ClubFooter fontColor={fontColor} />
      </div>
    </ProtectedRoute>
  );
}





