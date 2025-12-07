'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import styles from '@/components/AdminDashboard.module.css';

interface EditClubProps {
  params: Promise<{ id: string }>;
}

interface Club {
  id: string;
  name: string;
  numberOfCourts?: number;
  country?: string;
  province?: string;
  is_active?: boolean;
  logo?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  selectedColor?: string;
  actionColor?: string;
  fontColor?: string;
  hoverColor?: string;
  createdAt?: string;
}

// List of countries for the dropdown
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
  'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
  'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
].sort();

export default function EditClubPage({ params }: EditClubProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [clubName, setClubName] = useState('');
  const [numberOfCourts, setNumberOfCourts] = useState<number>(1);
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [logo, setLogo] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [actionColor, setActionColor] = useState('#10b981');
  const [fontColor, setFontColor] = useState('#052333');
  const [hoverColor, setHoverColor] = useState('#f0f0f0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const backgroundImageFileInputRef = useRef<HTMLInputElement>(null);
  
  const hasLoadedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadClubData = useCallback(async () => {
    if (hasLoadedRef.current || club) {
      return;
    }

    hasLoadedRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClientClient();
      
      // First, check if user is authenticated
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setError('You must be logged in to edit clubs');
        setIsLoading(false);
        router.push('/login');
        return;
      }

      // Try to fetch with all columns first, if that fails, try without branding columns
      let data, fetchError;
      
      // First attempt: with all columns including branding
      const result = await supabase
        .from('Clubs')
        .select('id, name, numberOfCourts, country, province, is_active, logo, backgroundImage, backgroundColor, selectedColor, actionColor, fontColor, hoverColor, createdAt')
        .eq('id', id)
        .single();
      
      data = result.data;
      fetchError = result.error;

      // If error and it's about missing columns, try without branding columns
      if (fetchError && (fetchError.code === '42703' || fetchError.message?.includes('column'))) {
        console.warn('Branding columns may not exist, trying without them:', fetchError);
        const fallbackResult = await supabase
          .from('Clubs')
          .select('id, name, numberOfCourts, country, province, is_active, createdAt')
          .eq('id', id)
          .single();
        
        data = fallbackResult.data;
        fetchError = fallbackResult.error;
      }

      if (fetchError) {
        console.error('Club fetch error:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
          error: fetchError
        });
        setError(`Failed to load club: ${fetchError.message || 'Unknown error'}. Code: ${fetchError.code || 'N/A'}`);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError('Club not found');
        setIsLoading(false);
        return;
      }

      setClub(data as Club);
      setClubName(data.name);
      setNumberOfCourts(data.numberOfCourts || 1);
      setCountry(data.country || '');
      setProvince(data.province || '');
      setIsActive(data.is_active !== undefined ? data.is_active : true);
      setLogo((data as any).logo || '');
      setBackgroundImage((data as any).backgroundImage || '');
      setBackgroundColor((data as any).backgroundColor || '#ffffff');
      setSelectedColor((data as any).selectedColor || '#667eea');
      setActionColor((data as any).actionColor || '#10b981');
      setFontColor((data as any).fontColor || '#052333');
      setHoverColor((data as any).hoverColor || '#f0f0f0');
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error loading club:', err);
      setError(err.message || 'Failed to load club');
      setIsLoading(false);
    }
  }, [id, club, router]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    // Wait for session to be available
    if (!session) {
      return;
    }

    // Check if user is SUPER_ADMIN before loading
    const checkAuthorization = async () => {
      try {
        const supabase = getSupabaseClientClient();
        const { data, error } = await supabase
          .from('Users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking authorization:', error);
          // Try User table (singular) as fallback
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('User')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (fallbackError || !fallbackData || fallbackData.role !== 'SUPER_ADMIN') {
            setError('You do not have permission to edit clubs');
            router.push('/admin');
            return;
          }
        } else if (!data || data.role !== 'SUPER_ADMIN') {
          setError('You do not have permission to edit clubs');
          router.push('/admin');
          return;
        }

        // User is authorized, load club data
        loadClubData();
      } catch (err: any) {
        console.error('Authorization check error:', err);
        setError('Failed to verify permissions');
      }
    };

    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, session?.user?.id]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingLogo(true);
    setError('');

    try {
      const supabase = getSupabaseClientClient();
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `club-${id}-logo-${Date.now()}.${fileExt}`;
      const filePath = `clubs/${id}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('club-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          setError('Storage bucket not found. Please create a "club-images" bucket in Supabase Storage.');
        } else {
          throw uploadError;
        }
        setIsUploadingLogo(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('club-images')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setLogo(urlData.publicUrl);
        
        // Auto-save the logo URL to the database immediately
        try {
          const updateResponse = await fetch(`/api/admin/clubs/${id}/update`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: clubName,
              numberOfCourts: numberOfCourts,
              country: country,
              province: province,
              is_active: isActive,
              logo: urlData.publicUrl,
              backgroundImage: backgroundImage,
              backgroundColor: backgroundColor,
              selectedColor: selectedColor,
              actionColor: actionColor,
              fontColor: fontColor,
              hoverColor: hoverColor,
            }),
          });

          const updateResult = await updateResponse.json();
          if (updateResponse.ok) {
            if (updateResult.warning) {
              setError(`Logo uploaded but could not be saved: ${updateResult.warning}. Please run the migration script ADD_ALL_CLUB_BRANDING_COLUMNS.sql in Supabase.`);
            } else {
              setSuccess('Logo uploaded and saved successfully!');
            }
          } else {
            setError(`Logo uploaded but could not be saved: ${updateResult.error || 'Unknown error'}. Please run the migration script ADD_ALL_CLUB_BRANDING_COLUMNS.sql in Supabase.`);
            console.warn('Auto-save failed:', updateResult);
          }
        } catch (saveErr) {
          console.error('Error auto-saving logo:', saveErr);
          setSuccess('Logo uploaded! Please click "Save Changes" to save it.');
        }
      } else {
        throw new Error('Failed to get public URL');
      }
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setError(err.message || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
      // Reset file input
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    }
  };

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingBackground(true);
    setError('');

    try {
      const supabase = getSupabaseClientClient();
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `club-${id}-background-${Date.now()}.${fileExt}`;
      const filePath = `clubs/${id}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('club-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          setError('Storage bucket not found. Please create a "club-images" bucket in Supabase Storage.');
        } else {
          throw uploadError;
        }
        setIsUploadingBackground(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('club-images')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setBackgroundImage(urlData.publicUrl);
        
        // Auto-save the background image URL to the database immediately
        try {
          const updateResponse = await fetch(`/api/admin/clubs/${id}/update`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: clubName,
              numberOfCourts: numberOfCourts,
              country: country,
              province: province,
              is_active: isActive,
              logo: logo,
              backgroundImage: urlData.publicUrl,
              backgroundColor: backgroundColor,
              selectedColor: selectedColor,
              actionColor: actionColor,
              fontColor: fontColor,
              hoverColor: hoverColor,
            }),
          });

          const updateResult = await updateResponse.json();
          if (updateResponse.ok) {
            if (updateResult.warning) {
              setError(`Background image uploaded but could not be saved: ${updateResult.warning}. Please run the migration script ADD_ALL_CLUB_BRANDING_COLUMNS.sql in Supabase.`);
            } else {
              setSuccess('Background image uploaded and saved successfully!');
            }
          } else {
            setError(`Background image uploaded but could not be saved: ${updateResult.error || 'Unknown error'}. Please run the migration script ADD_ALL_CLUB_BRANDING_COLUMNS.sql in Supabase.`);
            console.warn('Auto-save failed:', updateResult);
          }
        } catch (saveErr) {
          console.error('Error auto-saving background image:', saveErr);
          setSuccess('Background image uploaded! Please click "Save Changes" to save it.');
        }
      } else {
        throw new Error('Failed to get public URL');
      }
    } catch (err: any) {
      console.error('Error uploading background image:', err);
      setError(err.message || 'Failed to upload background image');
    } finally {
      setIsUploadingBackground(false);
      // Reset file input
      if (backgroundImageFileInputRef.current) {
        backgroundImageFileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    if (!clubName.trim()) {
      setError('Club name is required');
      setIsSubmitting(false);
      return;
    }

    if (numberOfCourts < 1) {
      setError('Number of courts must be at least 1');
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = getSupabaseClientClient();
      
      // Verify user session before update
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        throw new Error('You must be logged in to update clubs');
      }
      
      // Debug: Check user role
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('id, role')
        .eq('id', currentSession.user.id)
        .maybeSingle();
      
      console.log('Current session user ID:', currentSession.user.id);
      console.log('User data from database:', userData);
      console.log('User error:', userError);
      
      if (!userData || userData.role !== 'SUPER_ADMIN') {
        throw new Error('You must be a SUPER_ADMIN to update clubs');
      }
      
      // Build update object with only basic fields first
      const updateData: any = {
        name: clubName.trim(),
        numberOfCourts: numberOfCourts,
        country: country && country.trim() ? country.trim() : null,
        province: province && province.trim() ? province.trim() : null,
        is_active: isActive,
        updatedAt: new Date().toISOString(),
      };

      // Try to add branding fields, but don't fail if columns don't exist
      try {
        updateData.logo = logo && logo.trim() ? logo.trim() : null;
        updateData.backgroundImage = backgroundImage && backgroundImage.trim() ? backgroundImage.trim() : null;
        updateData.backgroundColor = backgroundColor && backgroundColor.trim() ? backgroundColor.trim() : null;
        updateData.selectedColor = selectedColor && selectedColor.trim() ? selectedColor.trim() : null;
        updateData.actionColor = actionColor && actionColor.trim() ? actionColor.trim() : null;
        updateData.fontColor = fontColor && fontColor.trim() ? fontColor.trim() : null;
        updateData.hoverColor = hoverColor && hoverColor.trim() ? hoverColor.trim() : null;
      } catch (err) {
        console.warn('Branding columns may not exist, updating without them');
      }

      // Use API route to update (bypasses RLS using service role)
      const response = await fetch(`/api/admin/clubs/${id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update club');
      }

      // Show success message, and warning if some fields weren't updated
      if (result.warning) {
        setSuccess(`Club updated successfully! Note: ${result.warning}`);
      } else {
        setSuccess('Club updated successfully!');
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      console.error('Error updating club:', err);
      console.error('Error type:', typeof err);
      console.error('Error keys:', err ? Object.keys(err) : 'no error object');
      console.error('Error stringified:', JSON.stringify(err, null, 2));
      
      // Extract error message from various possible formats
      let errorMessage = 'Failed to update club';
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.toString && err.toString() !== '[object Object]') {
          errorMessage = err.toString();
        } else {
          errorMessage = 'An unknown error occurred. Please check the console for details.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.adminLayout}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !club) {
    return (
      <div className={styles.adminLayout}>
        <div className={styles.loadingContainer}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const userName = user ? `${(user as any).Firstname || ''} ${(user as any).Surname || ''}`.trim() || user.email?.split('@')[0] || 'Admin' : 'Admin';

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={`${styles.adminSidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          {!isSidebarCollapsed && (
            <div className={styles.sidebarBrand}>
              <h2>Open Active</h2>
              <span className={styles.sidebarSubtitle}>System Admin</span>
            </div>
          )}
          <button className={styles.toggleSidebarButton} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarCollapsed ? (
                <polyline points="9 18 15 12 9 6"></polyline>
              ) : (
                <polyline points="15 18 9 12 15 6"></polyline>
              )}
            </svg>
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <Link
            href="/admin"
            className={`${styles.navItem} ${false ? styles.active : ''}`}
            title="Overview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            {!isSidebarCollapsed && <span>Overview</span>}
          </Link>

          <Link
            href="/admin"
            className={`${styles.navItem} ${false ? styles.active : ''}`}
            title="All Users"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {!isSidebarCollapsed && <span>All Users</span>}
          </Link>

          <Link
            href="/admin"
            className={`${styles.navItem} ${true ? styles.active : ''}`}
            title="All Clubs"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {!isSidebarCollapsed && <span>All Clubs</span>}
          </Link>

          <Link
            href="/admin"
            className={`${styles.navItem} ${false ? styles.active : ''}`}
            title="Analytics"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            {!isSidebarCollapsed && <span>Analytics</span>}
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{userName.charAt(0).toUpperCase()}</div>
            {!isSidebarCollapsed && (
              <div className={styles.userDetails}>
                <div className={styles.userName}>{userName}</div>
                <div className={styles.userEmail}>{user?.email}</div>
              </div>
            )}
          </div>
          <button
            className={styles.logoutButton}
            onClick={() => {
              signOut();
              router.push('/login');
            }}
            title="Log out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isSidebarCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.adminMain} style={{ position: 'relative' }}>
        <div className={styles.adminContent}>
          <div className={styles.contentSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h1>Edit Club: {club?.name}</h1>
                <p className={styles.sectionSubtitle}>Update club settings and branding</p>
              </div>
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '16px 20px', borderRadius: '4px', marginBottom: '24px' }}>{success}</div>}

            <form onSubmit={handleSubmit} style={{ maxWidth: '800px', paddingLeft: '32px' }}>
              {/* Basic Information Section */}
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#ffffff' }}>Basic Information</h2>
                
                <div className={styles.formGroup}>
                  <label htmlFor="clubName">Club Name</label>
                  <input
                    id="clubName"
                    type="text"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="Enter club name"
                    required
                    disabled={isSubmitting}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="numberOfCourts">Number of Courts</label>
                  <input
                    id="numberOfCourts"
                    type="number"
                    min="1"
                    value={numberOfCourts}
                    onChange={(e) => setNumberOfCourts(parseInt(e.target.value) || 1)}
                    required
                    disabled={isSubmitting}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={isSubmitting}
                    className={styles.formInput}
                  >
                    <option value="">Select a country</option>
                    {COUNTRIES.map((countryName) => (
                      <option key={countryName} value={countryName}>
                        {countryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="province">City / Town</label>
                  <input
                    id="province"
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Enter city or town"
                    disabled={isSubmitting}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={isSubmitting}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>

              {/* Branding Section */}
              <div style={{ marginBottom: '32px', paddingTop: '32px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#ffffff' }}>Branding</h2>
                
                <div className={styles.formGroup}>
                  <label htmlFor="logo">Logo</label>
                  
                  {/* File Upload Option */}
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isSubmitting || isUploadingLogo}
                      style={{ display: 'none' }}
                      id="logoFile"
                    />
                    <label
                      htmlFor="logoFile"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: isUploadingLogo ? 'rgba(255, 255, 255, 0.1)' : 'rgba(102, 126, 234, 0.2)',
                        border: '1px solid rgba(102, 126, 234, 0.4)',
                        borderRadius: '4px',
                        color: '#ffffff',
                        cursor: isUploadingLogo ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        opacity: isUploadingLogo ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isUploadingLogo) {
                          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isUploadingLogo) {
                          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                        }
                      }}
                    >
                      {isUploadingLogo ? (
                        <>
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            style={{
                              animation: 'spin 1s linear infinite',
                              display: 'inline-block'
                            }}
                          >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                          {logo ? 'Change Logo' : 'Upload Logo'}
                        </>
                      )}
                    </label>
                    {logo && !isUploadingLogo && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '4px',
                        color: '#6ee7b7',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Logo uploaded
                      </div>
                    )}
                  </div>
                  
                  {logo && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img 
                          src={logo} 
                          alt="Club logo preview" 
                          style={{ 
                            maxWidth: '200px', 
                            maxHeight: '200px', 
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setLogo('')}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(239, 68, 68, 0.8)',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="backgroundImage">Background Image (for clubs list)</label>
                  
                  {/* File Upload Option */}
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      ref={backgroundImageFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundImageUpload}
                      disabled={isSubmitting || isUploadingBackground}
                      style={{ display: 'none' }}
                      id="backgroundImageFile"
                    />
                    <label
                      htmlFor="backgroundImageFile"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: isUploadingBackground ? 'rgba(255, 255, 255, 0.1)' : 'rgba(102, 126, 234, 0.2)',
                        border: '1px solid rgba(102, 126, 234, 0.4)',
                        borderRadius: '4px',
                        color: '#ffffff',
                        cursor: isUploadingBackground ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        opacity: isUploadingBackground ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isUploadingBackground) {
                          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isUploadingBackground) {
                          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                        }
                      }}
                    >
                      {isUploadingBackground ? (
                        <>
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            style={{
                              animation: 'spin 1s linear infinite',
                              display: 'inline-block'
                            }}
                          >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                          {backgroundImage ? 'Change Image' : 'Upload Image'}
                        </>
                      )}
                    </label>
                    {backgroundImage && !isUploadingBackground && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '4px',
                        color: '#6ee7b7',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Image uploaded
                      </div>
                    )}
                  </div>
                  
                  {backgroundImage && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{
                        width: '100%',
                        height: '150px',
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.6)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          Preview
                        </div>
                        <button
                          type="button"
                          onClick={() => setBackgroundImage('')}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'rgba(239, 68, 68, 0.8)',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="backgroundColor">Background Color</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      id="backgroundColor"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      disabled={isSubmitting}
                      style={{ 
                        width: '60px', 
                        height: '40px', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      placeholder="#ffffff"
                      disabled={isSubmitting}
                      className={styles.formInput}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="selectedColor">Selected Color</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      id="selectedColor"
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      disabled={isSubmitting}
                      style={{ 
                        width: '60px', 
                        height: '40px', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      placeholder="#667eea"
                      disabled={isSubmitting}
                      className={styles.formInput}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="actionColor">Action Color</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      id="actionColor"
                      type="color"
                      value={actionColor}
                      onChange={(e) => setActionColor(e.target.value)}
                      disabled={isSubmitting}
                      style={{ 
                        width: '60px', 
                        height: '40px', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={actionColor}
                      onChange={(e) => setActionColor(e.target.value)}
                      placeholder="#10b981"
                      disabled={isSubmitting}
                      className={styles.formInput}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fontColor">Font Color</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      id="fontColor"
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      disabled={isSubmitting}
                      style={{ 
                        width: '60px', 
                        height: '40px', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      placeholder="#052333"
                      disabled={isSubmitting}
                      className={styles.formInput}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="hoverColor">Hover Color</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      id="hoverColor"
                      type="color"
                      value={hoverColor}
                      onChange={(e) => setHoverColor(e.target.value)}
                      disabled={isSubmitting}
                      style={{ 
                        width: '60px', 
                        height: '40px', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={hoverColor}
                      onChange={(e) => setHoverColor(e.target.value)}
                      placeholder="#f0f0f0"
                      disabled={isSubmitting}
                      className={styles.formInput}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Link href="/admin" className={styles.btnSecondary} style={{ textDecoration: 'none' }}>
                  Cancel
                </Link>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

