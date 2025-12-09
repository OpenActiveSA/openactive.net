'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClubFooter from '../club/[slug]/ClubFooter';

interface UserProfile {
  id: string;
  Firstname?: string;
  Surname?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClientClient();
        
        // Try Users table first (most common), fallback to User if needed
        let data, error;
        
        try {
          const result = await supabase
            .from('Users')
            .select('id, Firstname, Surname, email, avatarUrl, role')
            .eq('id', user.id)
            .maybeSingle();
          
          data = result.data;
          error = result.error;
          
          if (error) {
            console.error('Error querying Users table:', {
              error: error,
              message: error?.message,
              details: error?.details,
              hint: error?.hint,
              code: error?.code,
              errorString: String(error),
              errorKeys: error ? Object.keys(error) : []
            });
            
            // If Users table doesn't exist, try User table
            if (error.code === '42P01' || error.code === 'PGRST116' || 
                error.message?.includes('does not exist') || 
                error.message?.includes('relation') ||
                error.details?.includes('does not exist')) {
              console.warn('Users table not found, trying User table');
              
              const fallbackResult = await supabase
                .from('User')
                .select('id, Firstname, Surname, email, avatarUrl, role')
                .eq('id', user.id)
                .maybeSingle();
              
              data = fallbackResult.data;
              error = fallbackResult.error;
              
              if (fallbackResult.error) {
                console.error('Error querying User table:', {
                  error: fallbackResult.error,
                  message: fallbackResult.error?.message,
                  details: fallbackResult.error?.details,
                  hint: fallbackResult.error?.hint,
                  code: fallbackResult.error?.code
                });
              }
            }
          }
        } catch (queryErr: any) {
          console.error('Exception during database query:', {
            error: queryErr,
            message: queryErr?.message,
            stack: queryErr?.stack,
            name: queryErr?.name,
            errorString: String(queryErr)
          });
          error = queryErr;
        }

        if (error) {
          // Log error but don't throw - allow page to render with defaults
          console.error('Final error state:', {
            hasError: !!error,
            errorType: typeof error,
            errorConstructor: error?.constructor?.name,
            errorMessage: error?.message,
            errorCode: error?.code,
            errorDetails: error?.details
          });
        }

        if (data) {
          setProfile(data);
        } else if (!error) {
          // No data and no error - user might not exist in Users table yet
          console.warn('User profile not found in database, using defaults');
        }
      } catch (err: unknown) {
        // Extract error message from various possible error formats
        let errorMessage = 'Unknown error';
        let errorDetails: any = null;
        
        if (err) {
          if (typeof err === 'string') {
            errorMessage = err;
          } else if (err instanceof Error) {
            errorMessage = err.message || 'An error occurred';
            errorDetails = {
              name: err.name,
              stack: err.stack
            };
          } else if (typeof err === 'object') {
            const errObj = err as any;
            errorMessage = errObj.message || 
                          errObj.error?.message || 
                          errObj.details || 
                          errObj.hint || 
                          'An error occurred';
            errorDetails = {
              code: errObj.code,
              details: errObj.details,
              hint: errObj.hint,
              message: errObj.message,
              keys: Object.keys(errObj)
            };
          } else {
            errorMessage = String(err) || 'Unknown error occurred';
          }
        }
        
        console.error('Catch block - Error loading profile:', {
          errorMessage,
          errorDetails,
          errorType: err instanceof Error ? 'Error' : typeof err,
          error: err,
          errorString: String(err)
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const displayName = profile?.Firstname && profile?.Surname
    ? `${profile.Firstname} ${profile.Surname}`
    : profile?.Firstname || profile?.Surname || 
    (profile?.Firstname && profile?.Surname 
      ? `${profile.Firstname} ${profile.Surname}` 
      : profile?.Firstname || profile?.Surname || profile?.email?.split('@')[0] || 'Player Name');

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
          upsert: true // Allow overwriting existing avatar
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

        // Try User table if Users doesn't work
        if (updateError && (updateError.code === '42P01' || updateError.message?.includes('does not exist'))) {
          const { error: fallbackUpdateError } = await supabase
            .from('User')
            .update({ avatarUrl: urlData.publicUrl })
            .eq('id', user.id);
          
          if (fallbackUpdateError) {
            throw fallbackUpdateError;
          }
        } else if (updateError) {
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

  return (
    <ProtectedRoute>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        {/* Header */}
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              color: '#052333',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>←</span>
            <span>Menu</span>
          </button>
          
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#052333' }}>
            <span style={{ color: '#052333' }}>open</span>
            <span style={{ color: '#14b8a6' }}>active</span>
          </div>

          <div style={{ width: '40px', height: '40px' }}></div>
        </header>

        {isLoading ? (
          <div style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ color: '#666', fontSize: '16px' }}>Loading...</div>
          </div>
        ) : (
          <>
            {/* Profile Banner */}
            <div style={{
              position: 'relative',
              backgroundColor: '#052333',
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
                opacity: 0.3
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
                    backgroundColor: '#052333',
                    border: '4px solid #fbbf24',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
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
                      color: '#ffffff',
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
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
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
                  color: '#ffffff',
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
                  backgroundColor: '#fbbf24',
                  color: '#052333',
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
                  color: 'rgba(255, 255, 255, 0.9)',
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
              maxWidth: '800px',
              margin: '0 auto',
              padding: '32px 24px'
            }}>
              {/* Basic Info Card */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
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

                  {profile?.email && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Email</div>
                      <div style={{ fontSize: '16px', color: '#052333', fontWeight: '500' }}>
                        {profile.email}
                      </div>
                    </div>
                  )}

                  {profile?.role && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Role</div>
                      <div style={{ fontSize: '16px', color: '#052333', fontWeight: '500' }}>
                        {profile.role}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <ClubFooter fontColor="#ffffff" />
      </div>
    </ProtectedRoute>
  );
}

