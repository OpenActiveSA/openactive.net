'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClientClient } from '@/lib/supabase';
import styles from './EmailAuth.module.css';

export function EmailAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'email' | 'login' | 'register' | 'success'>('email');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const supabase = getSupabaseClientClient();

  useEffect(() => {
    // Get email from URL params if available
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
      // Check if user exists to determine next step
      checkIfUserExists(emailParam);
    } else {
      // Start at email step if no email in URL
      setStep('email');
    }
  }, [searchParams]);

  const checkIfUserExists = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      return;
    }

    setIsCheckingEmail(true);
    setError('');
    
    try {
      console.log('[EmailAuth] Checking if user exists:', emailToCheck.toLowerCase().trim());
      
      // Check if user exists in Users table
      const { data, error } = await supabase
        .from('Users')
        .select('email')
        .eq('email', emailToCheck.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116 means no rows returned, which is fine
          console.log('[EmailAuth] User not found in Users table, going to register');
          setStep('register');
          return;
        }
        
        // Real error - log it
        console.error('[EmailAuth] Error checking user:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        // Default to register if error
        setStep('register');
        return;
      }

      // If user exists in Users table, check if they also exist in auth.users
      if (data) {
        console.log('[EmailAuth] User found in Users table, checking auth...');
        // Try to sign in with a dummy password to check if auth account exists
        // This will fail but tell us if the user exists in auth
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: emailToCheck.toLowerCase().trim(),
          password: 'dummy-check-password-12345'
        });
        
        // If error is "Invalid login credentials", user exists in auth but password is wrong
        // If error is "Email not confirmed", user exists in auth
        // If error is "User not found", user doesn't exist in auth
        if (authError) {
          if (authError.message?.includes('Invalid login') || authError.message?.includes('Email not confirmed') || authError.message?.includes('not found') === false) {
            console.log('[EmailAuth] User exists in auth, going to login');
            setStep('login');
          } else {
            console.log('[EmailAuth] User exists in Users but not in auth, going to register (will likely fail)');
            setStep('register');
            setError('An account with this email exists but is not properly set up. Please contact support.');
          }
        } else {
          // This shouldn't happen, but if sign in succeeds, go to login
          setStep('login');
        }
      } else {
        console.log('[EmailAuth] User not found, going to register');
        setStep('register');
      }
    } catch (err: any) {
      console.error('[EmailAuth] Exception checking if user exists:', {
        message: err?.message || String(err),
        stack: err?.stack,
      });
      // Default to register on error (safer - allows new signups)
      setStep('register');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if user exists
    await checkIfUserExists(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (step === 'login') {
        // Login with password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setError(error.message || 'Login failed. Please check your credentials.');
          return;
        }

        if (data.user) {
          // Update last login in Users table
          try {
            await supabase
              .from('Users')
              .update({ lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
              .eq('id', data.user.id.toString());
          } catch (err) {
            console.error('Error updating last login:', err);
            // Don't fail login if this fails
          }
          
          // Check user role and redirect accordingly
          try {
            const { data: userData, error: roleError } = await supabase
              .from('Users')
              .select('role')
              .eq('id', data.user.id)
              .eq('email', data.user.email)
              .maybeSingle();

            if (!roleError && userData?.role === 'SUPER_ADMIN') {
              // Redirect SUPER_ADMIN to admin dashboard
              router.push('/admin');
            } else {
              // Redirect regular users to clubs list page
              router.push('/clubs');
            }
          } catch (err) {
            console.error('Error checking user role:', err);
            // Default to clubs list page if role check fails
            router.push('/clubs');
          }
          router.refresh();
        }
      } else if (step === 'register') {
        // Sign up with name, surname and password
        if (!name.trim()) {
          setError('Please enter your name');
          return;
        }

        // Before signing up, check if user already exists in Users table
        // This can cause a trigger conflict if they exist in Users but not in auth.users
        const { data: existingUserCheck } = await supabase
          .from('Users')
          .select('id, email')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (existingUserCheck) {
          setError('An account with this email already exists in the system. Please try logging in instead. If you cannot log in, the account may need to be linked to an authentication account. Please contact support.');
          setStep('login');
          return;
        }

        // Use API route to create user (bypasses database trigger issues)
        // This is more reliable than using signUp directly when triggers are problematic
        let signUpData, signUpError;
        
          try {
            console.log('Creating account via API route...');
            
            // Use API route to create user with service role (bypasses trigger)
            let apiResponse;
            try {
              apiResponse = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: email.trim(),
                  password: password,
                  firstName: name.trim(),
                  surname: surname.trim(),
                  avatarUrl: null, // Will upload after account creation
                }),
              });
            } catch (fetchError: any) {
              console.error('Network error calling API route:', fetchError);
              throw new Error(`Network error: ${fetchError.message || 'Failed to connect to server'}`);
            }

          if (!apiResponse) {
            throw new Error('No response from server');
          }

          // Read response as text first
          const responseText = await apiResponse.text();
          console.log('=== API RESPONSE DEBUG ===');
          console.log('Status:', apiResponse.status);
          console.log('Status Text:', apiResponse.statusText);
          console.log('OK:', apiResponse.ok);
          console.log('Response Text Length:', responseText?.length || 0);
          console.log('Response Text:', responseText || '(empty)');
          console.log('==========================');
          
          let apiData: any = null;
          if (responseText) {
            try {
              apiData = JSON.parse(responseText);
              console.log('Parsed API Data:', apiData);
            } catch (parseError: any) {
              console.error('Failed to parse API response as JSON:', parseError);
              console.error('Response text that failed to parse:', responseText);
              throw new Error(`Server returned invalid JSON (${apiResponse.status}): ${responseText.substring(0, 200)}`);
            }
          } else {
            console.warn('Empty response body from API route');
            apiData = {};
          }
          
          if (!apiResponse.ok) {
            const errorInfo = {
              status: apiResponse.status,
              statusText: apiResponse.statusText,
              responseText: responseText || '(empty)',
              parsedData: apiData,
              hasData: !!apiData,
              dataKeys: apiData ? Object.keys(apiData) : [],
              dataType: typeof apiData
            };
            console.error('API route error response:', errorInfo);
            
            // Check if user already exists
            if (apiData?.error?.includes('already exists') || 
                apiData?.error?.includes('already registered') || 
                apiResponse.status === 409) {
              setError('An account with this email already exists. Please try logging in instead.');
              setStep('login');
              return;
            }
            
            // Show detailed error message
            const errorMessage = apiData?.details || apiData?.error || 'Failed to create account';
            const errorHint = apiData?.hint ? ` ${apiData.hint}` : '';
            const fullError = `${errorMessage}${errorHint}`;
            console.error('Registration error:', fullError);
            throw new Error(fullError);
          }

          // Sign in with the newly created account
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });

          if (signInError || !signInData?.user) {
            throw new Error('Account created but failed to sign in. Please try logging in manually.');
          }

          // Success - use the sign-in data
          signUpData = signInData;
          signUpError = null;
        } catch (apiError: any) {
          console.error('API route registration failed:', apiError);
          signUpError = apiError;
          setError(apiError.message || 'There was an issue creating your account. Please try again or contact support.');
          return;
        }

        if (signUpData?.user) {
          const data = signUpData;
          
          // Upload profile photo if provided
          let avatarUrl: string | null = null;
          if (profilePhoto) {
            avatarUrl = await uploadProfilePhoto(data.user.id);
          }
          
          // Wait a moment for the database trigger to create the user in Users table (if it hasn't already)
          // The trigger might take a moment to complete, so we'll retry if needed
          let userExists = false;
          let retries = 0;
          const maxRetries = 5;
          
          while (!userExists && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Check if user exists in Users table
            const { data: userCheck, error: checkError } = await supabase
              .from('Users')
              .select('id')
              .eq('id', data.user.id.toString())
              .maybeSingle();
            
            if (userCheck) {
              userExists = true;
            } else if (checkError?.code === 'PGRST116') {
              // User doesn't exist yet, continue waiting
              retries++;
              continue;
            } else {
              // Some other error, assume user exists or will be created
              userExists = true;
            }
            
            retries++;
          }

          // Update Users table with last login and avatar URL
          // Try both 'Users' and 'User' table names for compatibility
          const updateData: any = {
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          if (avatarUrl) {
            updateData.avatarUrl = avatarUrl;
          }

          // Try updating Users table first
          try {
            const { error: usersError } = await supabase
              .from('Users')
              .update(updateData)
              .eq('id', data.user.id.toString());
            
            if (usersError) {
              console.warn('Error updating Users table, trying User table:', usersError);
              // Try User table as fallback
              await supabase
                .from('User')
                .update(updateData)
                .eq('id', data.user.id.toString());
            }
          } catch (err) {
            console.error('Error updating user profile:', err);
            // Don't fail registration if this fails - the trigger should have created the user
          }
          
          // Check user role and redirect accordingly
          try {
            const { data: userData, error: roleError } = await supabase
              .from('Users')
              .select('role')
              .eq('id', data.user.id)
              .eq('email', data.user.email)
              .maybeSingle();

            if (!roleError && userData?.role === 'SUPER_ADMIN') {
              // Redirect SUPER_ADMIN to admin dashboard
              router.push('/admin');
            } else {
              // Redirect regular users to clubs list page
              router.push('/clubs');
            }
          } catch (err) {
            console.error('Error checking user role:', err);
            // Default to clubs list page if role check fails
            router.push('/clubs');
          }
          router.refresh();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setPassword('');
    setName('');
    setSurname('');
    setError('');
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setProfilePhoto(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
  };

  const uploadProfilePhoto = async (userId: string): Promise<string | null> => {
    if (!profilePhoto) return null;

    try {
      setIsUploadingPhoto(true);

      // Generate unique filename
      const fileExt = profilePhoto.name.split('.').pop();
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${userId}/${fileName}`;

      // Upload file to Supabase Storage (try user-avatars bucket, fallback to club-images)
      let uploadData, uploadError, bucketName = 'user-avatars';
      
      const result = await supabase.storage
        .from('user-avatars')
        .upload(filePath, profilePhoto, {
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
          .upload(filePath, profilePhoto, {
            cacheControl: '3600',
            upsert: true
          });
        uploadData = fallbackResult.data;
        uploadError = fallbackResult.error;
      }

      if (uploadError) {
        console.error('Error uploading profile photo:', uploadError);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Error uploading profile photo:', err);
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* OpenActive Font Icons - Spelling "OPEN" */}
        <div className={styles.iconRow}>
          <i className="oa-open-o" style={{ fontSize: '32px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
          <i className="oa-open-p" style={{ fontSize: '32px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
          <i className="oa-open-e" style={{ fontSize: '32px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
          <i className="oa-open-n" style={{ fontSize: '32px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
        </div>

        {/* Title */}
        <h1 className={styles.title}>
          {step === 'email' && 'Enter your email'}
          {step === 'login' && 'Welcome back'}
          {step === 'register' && 'Create account'}
          {step === 'success' && 'Check your email'}
        </h1>
        <p className={styles.subtitle}>
          {step === 'email' && 'We\'ll check if you have an account'}
          {step === 'login' && 'Enter your password to continue'}
          {step === 'register' && 'Sign up to get started'}
          {step === 'success' && 'We sent you a confirmation link'}
        </p>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && step === 'success' && (
          <div className={styles.successMessage}>
            {successMessage}
          </div>
        )}

        {/* Success Step Display */}
        {step === 'success' && (
          <div className={styles.successContent}>
            <div className={styles.successIcon}>✉️</div>
            <p className={styles.successText}>
              We've sent a confirmation email to <strong>{email}</strong>
            </p>
            <p className={styles.successSubtext}>
              Please check your inbox and click the confirmation link to activate your account.
            </p>
            <button
              type="button"
              className={styles.backToLoginButton}
              onClick={() => {
                setStep('email');
                setEmail('');
                setSuccessMessage('');
                router.push('/login');
              }}
            >
              Back to login
            </button>
          </div>
        )}

        {/* Email Step Form */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className={styles.form}>
            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type="email"
                className={styles.input}
                placeholder="john.doe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isCheckingEmail}
                required
                autoFocus
              />
              <label className={styles.label}>Email *</label>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || isCheckingEmail || !email}
            >
              {isCheckingEmail ? (
                <span>Checking...</span>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>
        )}

        {/* Login Step Form (Password only) */}
        {step === 'login' && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Show email (read-only) */}
            <div className={styles.formGroup}>
              <div className={styles.emailDisplay}>
                <span className={styles.emailLabel}>Email</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '8px' }}>
                  <span>{email}</span>
                  <button
                    type="button"
                    className={styles.changeEmailButton}
                    onClick={handleBackToEmail}
                    disabled={isLoading}
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
                minLength={6}
              />
              <label className={styles.label}>Password *</label>
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className={styles.eyeIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </span>
              </button>
            </div>

            <div className={styles.forgotPassword}>
              <a href="#" className={styles.link}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
        )}

        {/* Register Step Form (Display Name + Password) */}
        {step === 'register' && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Profile Photo Upload - At the top, circular */}
            <div className={styles.formGroup} style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}
                onClick={() => {
                  const input = document.getElementById('register-avatar-upload') as HTMLInputElement;
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
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '4px solid rgba(255, 255, 255, 0.3)',
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
                  {profilePhotoPreview ? (
                    <img 
                      src={profilePhotoPreview} 
                      alt="Profile preview" 
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <span>
                      {name.trim() ? name.charAt(0).toUpperCase() : '?'}
                      {surname.trim() ? surname.charAt(0).toUpperCase() : ''}
                    </span>
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
                    {isUploadingPhoto ? 'Uploading...' : profilePhotoPreview ? '📷 Change' : '📷 Add photo'}
                  </div>
                </div>
              </div>
              <input
                id="register-avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoChange}
                disabled={isLoading || isUploadingPhoto}
                style={{ display: 'none' }}
              />
              {profilePhotoPreview && (
                <button
                  type="button"
                  className={styles.removePhotoButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto();
                  }}
                  disabled={isLoading || isUploadingPhoto}
                  style={{ marginTop: '8px', fontSize: '12px', padding: '4px 12px' }}
                >
                  Remove photo
                </button>
              )}
            </div>

            {/* Show email (read-only) */}
            <div className={styles.formGroup}>
              <div className={styles.emailDisplay}>
                <span className={styles.emailLabel}>Email</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '8px' }}>
                  <span>{email}</span>
                  <button
                    type="button"
                    className={styles.changeEmailButton}
                    onClick={handleBackToEmail}
                    disabled={isLoading}
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type="text"
                className={styles.input}
                placeholder="John"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
              />
              <label className={styles.label}>Name *</label>
            </div>

            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type="text"
                className={styles.input}
                placeholder="Doe"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                disabled={isLoading}
              />
              <label className={styles.label}>Surname</label>
            </div>

            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={6}
              />
              <label className={styles.label}>Password *</label>
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className={styles.eyeIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </span>
              </button>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || isUploadingPhoto}
            >
              {isLoading || isUploadingPhoto ? (
                <span>{isUploadingPhoto ? 'Uploading photo...' : 'Creating account...'}</span>
              ) : (
                <span>Sign up</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
