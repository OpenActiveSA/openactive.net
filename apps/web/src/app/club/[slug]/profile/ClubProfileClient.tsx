'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ClubAnimationProvider, useClubAnimation } from '@/components/club/ClubAnimationContext';
import { getUserClubRole, type ClubRole } from '@/lib/club-roles';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';
import OpenActiveLoader from '@/components/OpenActiveLoader';
import type { ClubSettings } from '@/lib/club-settings';

interface UserProfile {
  id: string;
  Firstname?: string;
  Surname?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  bio?: string;
}

interface ClubProfileClientProps {
  slug: string;
  clubSettings: ClubSettings;
}

function ClubProfileContent({ slug, clubSettings }: ClubProfileClientProps) {
  const { user } = useAuth();
  const { contentVisible } = useClubAnimation();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clubRole, setClubRole] = useState<ClubRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);

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
          .select('id, Firstname, Surname, email, avatarUrl, role, bio')
          .eq('id', user.id)
          .maybeSingle();
        
        if (result.data) {
          setProfile(result.data);
          setBio(result.data.bio || '');
        }

        // Fetch club role
        if (clubSettings.id) {
          const role = await getUserClubRole(supabase, user.id, clubSettings.id);
          setClubRole(role);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user?.id, clubSettings.id]);

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

  // Handle bio save
  const handleSaveBio = async () => {
    if (!user?.id) return;

    setIsSavingBio(true);
    try {
      const supabase = getSupabaseClientClient();
      const { error } = await supabase
        .from('Users')
        .update({ bio: bio })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, bio: bio } : null);
      setIsEditingBio(false);
    } catch (err: any) {
      console.error('Error saving bio:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSavingBio(false);
    }
  };

  return (
    <ProtectedRoute>
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
          currentPath={`/club/${slug}/profile`}
        />

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
                    backgroundColor: clubSettings.backgroundColor,
                    border: `4px solid ${clubRole === 'VISITOR' ? '#000000' : (clubRole === 'MEMBER' || profile?.role === 'SUPER_ADMIN' ? '#cda746' : clubSettings.selectedColor)}`,
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
                      color: clubSettings.fontColor,
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
                    color: clubSettings.fontColor,
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
                  color: clubSettings.fontColor,
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
                  backgroundColor: clubSettings.selectedColor,
                  color: '#ffffff',
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
                  {profile?.Firstname && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>First Name</div>
                      <div style={{ fontSize: '16px', color: '#052333', fontWeight: '500' }}>
                        {profile.Firstname}
                      </div>
                    </div>
                  )}

                  {profile?.Surname && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Last Name</div>
                      <div style={{ fontSize: '16px', color: '#052333', fontWeight: '500' }}>
                        {profile.Surname}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>About</div>
                    {isEditingBio ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell us about yourself..."
                          style={{
                            width: '100%',
                            minHeight: '100px',
                            padding: '12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '3px',
                            fontSize: '16px',
                            color: '#052333',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleSaveBio}
                            disabled={isSavingBio}
                            style={{
                              backgroundColor: clubSettings.selectedColor,
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '8px 16px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: isSavingBio ? 'not-allowed' : 'pointer',
                              opacity: isSavingBio ? 0.6 : 1
                            }}
                          >
                            {isSavingBio ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setBio(profile?.bio || '');
                              setIsEditingBio(false);
                            }}
                            disabled={isSavingBio}
                            style={{
                              backgroundColor: '#f3f4f6',
                              color: '#052333',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '8px 16px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: isSavingBio ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ 
                          fontSize: '16px', 
                          color: '#052333', 
                          fontWeight: '400',
                          lineHeight: '1.5',
                          flex: 1,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {bio || 'Tell us about yourself...'}
                        </div>
                        <button
                          onClick={() => setIsEditingBio(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: clubSettings.selectedColor,
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            flexShrink: 0
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {profile?.role && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Role</div>
                      <div style={{ fontSize: '16px', color: '#ffffff', fontWeight: '500' }}>
                        {profile.role}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <ClubFooter fontColor={clubSettings.fontColor} />
      </div>
    </ProtectedRoute>
  );
}

export default function ClubProfileClient(props: ClubProfileClientProps) {
  return (
    <ClubAnimationProvider>
      <ClubProfileContent {...props} />
    </ClubAnimationProvider>
  );
}

