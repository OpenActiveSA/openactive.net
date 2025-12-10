'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { useClubAnimation } from './ClubAnimationContext';
import { getUserClubRole } from '@/lib/club-roles';
import { generateSlug } from '@/lib/slug-utils';
import styles from '@/styles/frontend.module.css';

interface ClubHeaderProps {
  logo?: string;
  fontColor: string;
  backgroundColor?: string;
  selectedColor?: string;
  currentPath?: string;
}

export default function ClubHeader({ logo, fontColor, backgroundColor, selectedColor, currentPath }: ClubHeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  // Initialize userName as empty - we'll fetch the real name and only show email as fallback in render
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Always call the hook - it returns safe defaults if context is not available
  const { headerVisible } = useClubAnimation();

  // Prevent hydration mismatch by only rendering auth-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scrolling when menu is open
  useEffect(() => {
    if (showDropdown) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDropdown]);
  
  // Fetch user's name when logged in - check cache first, then metadata, then database
  useEffect(() => {
    const fetchUserName = async () => {
      if (user && user.id) {
        // First, check localStorage cache (instant, no network call)
        const cacheKey = `user_name_${user.id}`;
        const avatarCacheKey = `user_avatar_${user.id}`;
        const cachedName = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
        const cachedAvatar = typeof window !== 'undefined' ? localStorage.getItem(avatarCacheKey) : null;
        
        if (cachedName) {
          setUserName(cachedName);
          setIsLoadingName(false);
          // Still fetch in background to update cache if name changed
        } else {
          setIsLoadingName(true);
        }
        
        if (cachedAvatar) {
          setUserAvatar(cachedAvatar);
          // Preload the image for instant display
          if (typeof window !== 'undefined' && cachedAvatar) {
            const img = new Image();
            img.src = cachedAvatar;
          }
        }
        
        // Check user metadata (fast, no database call)
        const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
        const metadataAvatar = user.user_metadata?.avatar_url || user.user_metadata?.avatarUrl;
        
        if (metadataName && !cachedName) {
          setUserName(metadataName);
          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, metadataName);
          }
          setIsLoadingName(false);
        }
        
        if (metadataAvatar && !cachedAvatar) {
          setUserAvatar(metadataAvatar);
          if (typeof window !== 'undefined') {
            localStorage.setItem(avatarCacheKey, metadataAvatar);
            // Preload the image
            const img = new Image();
            img.src = metadataAvatar;
          }
        }
        
        // If we have both from cache/metadata, we can return early
        if (cachedName && cachedAvatar) {
          // Still fetch in background to update cache if data changed
          setIsLoadingName(false);
        } else if (metadataName && metadataAvatar) {
          return;
        }
        
        // Fetch from database (only if not cached)
        try {
          const supabase = getSupabaseClientClient();
          const { data: userData, error } = await supabase
            .from('Users')
            .select('Firstname, Surname, avatarUrl')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching user name from database:', error);
            setUserAvatar(null);
            setIsLoadingName(false);
            return;
          }
          
          if (userData) {
            const name = userData.Firstname && userData.Surname 
                          ? `${userData.Firstname} ${userData.Surname}` 
                          : userData.Firstname || userData.Surname || '';
            if (name) {
              setUserName(name);
              // Cache for next time
              if (typeof window !== 'undefined') {
                localStorage.setItem(cacheKey, name);
              }
            }
            const avatarUrl = userData.avatarUrl || null;
            setUserAvatar(avatarUrl);
            // Cache avatar URL for next time and preload image
            if (typeof window !== 'undefined') {
              const avatarCacheKey = `user_avatar_${user.id}`;
              if (avatarUrl) {
                localStorage.setItem(avatarCacheKey, avatarUrl);
                // Preload the image for instant display next time
                const img = new Image();
                img.src = avatarUrl;
              } else {
                localStorage.removeItem(avatarCacheKey);
              }
            }
          } else {
            setUserAvatar(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`user_avatar_${user.id}`);
            }
          }
          setIsLoadingName(false);
        } catch (err) {
          console.error('Error fetching user name:', err);
          setIsLoadingName(false);
        }
      } else {
        setUserName('');
        setUserAvatar(null);
        setIsLoadingName(false);
      }
    };
    
    fetchUserName();
  }, [user]);

  // Fetch user's role when on a club page
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id || !currentPath || !currentPath.includes('/club/')) {
        setUserRole(null);
        return;
      }

      try {
        const supabase = getSupabaseClientClient();
        
        // Extract club slug from currentPath (e.g., /club/constantiatennisclub/...)
        const pathParts = currentPath.split('/');
        const clubSlugIndex = pathParts.indexOf('club');
        if (clubSlugIndex === -1 || clubSlugIndex + 1 >= pathParts.length) {
          setUserRole(null);
          return;
        }
        const clubSlug = pathParts[clubSlugIndex + 1];

        // Get all clubs and find by slug
        const { data: clubsData, error: clubsError } = await supabase
          .from('Clubs')
          .select('id')
          .eq('is_active', true);

        if (clubsError || !clubsData) {
          console.error('Error fetching clubs for role:', clubsError);
          setUserRole(null);
          return;
        }

        // Find club by matching slug
        const club = clubsData.find((c: any) => {
          // We need to get the club name to generate slug, but we only have id
          // Let's fetch the name as well
          return false; // Will handle this differently
        });

        // Better approach: fetch clubs with names
        const { data: clubsWithNames, error: clubsWithNamesError } = await supabase
          .from('Clubs')
          .select('id, name')
          .eq('is_active', true);

        if (clubsWithNamesError || !clubsWithNames) {
          console.error('Error fetching clubs with names for role:', clubsWithNamesError);
          setUserRole(null);
          return;
        }

        const foundClub = clubsWithNames.find((c: any) => generateSlug(c.name) === clubSlug);
        if (!foundClub) {
          setUserRole(null);
          return;
        }

        // Check if user is SUPER_ADMIN first
        const { data: userData } = await supabase
          .from('Users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (userData?.role === 'SUPER_ADMIN') {
          setUserRole('SUPER_ADMIN');
          return;
        }

        // Get user's club role
        const role = await getUserClubRole(supabase, user.id, foundClub.id);
        setUserRole(role);
      } catch (err) {
        console.error('Error fetching user role:', err);
        setUserRole(null);
      }
    };

    if (mounted && !authLoading && user) {
      fetchUserRole();
    } else {
      setUserRole(null);
    }
  }, [user, currentPath, mounted, authLoading]);
  
  // Determine active menu item based on current path
  const isActive = (path: string) => {
    if (currentPath) {
      // If on club page, "Book a court" is active
      if (currentPath.includes('/club/') && path === '/book') {
        return true;
      }
    }
    return pathname === path;
  };
  
  const activeColor = selectedColor || '#667eea';
  
  // Helper to get display name - formats email prefix consistently
  const getDisplayName = () => {
    if (userName) return userName;
    if (!user?.email) return 'User';
    const emailPrefix = user.email.split('@')[0];
    // Capitalize first letter to match name format
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    try {
      setShowDropdown(false);
      await signOut();
      // Stay on current page - just refresh to show logged-out state
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
      // Refresh page even if signOut fails
      router.refresh();
    }
  };

  const handleSwitchClub = () => {
    setShowDropdown(false);
    router.push('/clubs');
  };

  return (
    <>
      {/* Backdrop - Outside header so it covers entire page */}
      <div 
        className={styles.headerBackdrop}
        style={{
          opacity: showDropdown ? 1 : 0,
          pointerEvents: showDropdown ? 'auto' : 'none',
          visibility: showDropdown ? 'visible' : 'hidden'
        }}
        onClick={() => setShowDropdown(false)}
      />
      
      <header 
        className={styles.headerContainer}
        style={{
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: headerVisible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
      <div className={styles.headerInner}>
        {/* Logo - Left */}
        <div className={styles.logoContainer}>
          <Link 
            href={currentPath && currentPath.includes('/club/') 
              ? currentPath.split('/').slice(0, 3).join('/') // Extract /club/[slug] from currentPath
              : '/book'}
            className={styles.logoLink}
          >
            {logo && !logoError ? (
              <img 
                src={logo} 
                alt="Club logo" 
                className={styles.logoImage}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className={styles.logoFallback}>
                <i className={`oa-open-o ${styles.logoFallbackIcon}`}></i>
                <i className={`oa-open-p ${styles.logoFallbackIcon}`}></i>
                <i className={`oa-open-e ${styles.logoFallbackIcon}`}></i>
                <i className={`oa-open-n ${styles.logoFallbackIcon}`}></i>
              </div>
            )}
          </Link>
        </div>

        {/* Menu - Middle */}
        <nav className={styles.headerNav}>
          {mounted && !authLoading && !user && (
          <Link
            href="/register"
            className={styles.navLink}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
          >
            Register
          </Link>
          )}
          {!mounted || authLoading ? (
            <Link
              href={currentPath && currentPath.includes('/club/') 
                ? currentPath.split('/').slice(0, 3).join('/')
                : '/book'}
              className={styles.navLink}
            >
              Book a court
            </Link>
          ) : !user ? (
            <Link
              href="/login"
              className={styles.navLink}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = activeColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#052333';
              }}
            >
              Book a court
            </Link>
          ) : (
          <Link
              href={currentPath && currentPath.includes('/club/') 
                ? currentPath.split('/').slice(0, 3).join('/') // Extract /club/[slug] from currentPath
                : '/book'}
            className={`${styles.navLink} ${isActive('/book') ? styles.navLinkActive : ''}`}
            style={{
              color: isActive('/book') ? activeColor : undefined
            }}
            onMouseEnter={(e) => {
              if (!isActive('/book')) {
                e.currentTarget.style.color = activeColor;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/book')) {
                e.currentTarget.style.color = '#052333';
              }
            }}
          >
            Book a court
          </Link>
          )}
          {currentPath && currentPath.includes('/club/') && (
            <Link
              href={`${currentPath.split('/').slice(0, 3).join('/')}/events`}
              className={styles.navLink}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
            >
              Events
            </Link>
          )}
          {currentPath && currentPath.includes('/club/') && (
            <Link
              href={`${currentPath.split('/').slice(0, 3).join('/')}/rankings`}
              className={styles.navLink}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
            >
              Rankings
            </Link>
          )}
        </nav>

        {/* User Name or Login Button - Right */}
        <div className={styles.userInfoContainer} ref={dropdownRef}>
          {mounted && !authLoading && user ? (
            <>
              <div 
                className={styles.userNameContainer}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className={styles.userNameText}>
                  {getDisplayName()}
                </div>
                {userRole && (
                  <div className={styles.userRoleBadge}>
                    {userRole === 'SUPER_ADMIN' ? 'Super Admin' : 
                     userRole === 'CLUB_ADMIN' ? 'Club Manager' :
                     userRole === 'COACH' ? 'Coach' :
                     userRole === 'MEMBER' ? 'Member' :
                     userRole === 'VISITOR' ? 'Visitor' : userRole}
                  </div>
                )}
              </div>
              
              {/* Profile Picture */}
              <div
                className={styles.profilePictureContainer}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName || 'User'} 
                    className={styles.profilePictureImage}
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const initials = userName
                          ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          : user.email?.[0].toUpperCase() || 'U';
                        const span = document.createElement('span');
                        span.className = styles.profilePictureInitials;
                        span.textContent = initials;
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className={styles.profilePictureInitials}>
                    {userName
                      ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : user.email?.[0].toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              
              {/* Burger Menu Icon */}
              <button
                className={styles.burgerMenuButton}
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="Toggle menu"
              >
                <span className={styles.burgerMenuIcon}></span>
                <span className={styles.burgerMenuIcon}></span>
                <span className={styles.burgerMenuIcon}></span>
              </button>
            </>
          ) : mounted && !authLoading ? (
          <Link
            href="/login"
            className={styles.loginButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Login
          </Link>
          ) : (
            <div className={styles.headerSpacer}></div>
          )}
        </div>
      </div>
    </header>
    
    {/* Dropdown Menu - Full Height, Slides from Right - Outside header for proper z-index stacking */}
    {mounted && !authLoading && user && (
      <div 
        className={styles.dropdownMenu}
        style={{
          transform: showDropdown ? 'translateX(0)' : 'translateX(100%)',
          pointerEvents: showDropdown ? 'auto' : 'none',
          visibility: showDropdown ? 'visible' : 'hidden'
        }}
      >
        {/* Close Button */}
        <div className={styles.dropdownCloseButtonContainer}>
          <button
            className={styles.dropdownCloseButton}
            onClick={() => setShowDropdown(false)}
          >
            ✕
          </button>
        </div>
        
        {/* Menu Items Container */}
        <div className={styles.dropdownMenuItems}>
          {currentPath && currentPath.includes('/club/') ? (
            <Link 
              href={`${currentPath.split('/').slice(0, 3).join('/')}/profile`}
              className={styles.dropdownMenuItem}
              onClick={() => setShowDropdown(false)}
            >
              <span className={styles.dropdownMenuItemIcon}>👤</span>
              <span className={styles.dropdownMenuItemText}>My Profile</span>
            </Link>
          ) : (
            <Link 
              href="/profile" 
              className={styles.dropdownMenuItem}
              onClick={() => setShowDropdown(false)}
            >
              <span className={styles.dropdownMenuItemIcon}>👤</span>
              <span className={styles.dropdownMenuItemText}>My Profile</span>
            </Link>
          )}
          
          <Link 
            href={currentPath && currentPath.includes('/club/') 
              ? `${currentPath.split('/').slice(0, 3).join('/')}/matches`
              : '/matches'} 
            className={styles.dropdownMenuItem}
            onClick={() => setShowDropdown(false)}
          >
            <span className={styles.dropdownMenuItemIcon}>🏆</span>
            <span className={styles.dropdownMenuItemText}>Manage Matches</span>
          </Link>
          
          {currentPath && currentPath.includes('/club/') && (
            <Link 
              href={`${currentPath.split('/').slice(0, 3).join('/')}/events`}
              className={styles.dropdownMenuItem}
              onClick={() => setShowDropdown(false)}
            >
              <span className={styles.dropdownMenuItemIcon}>📅</span>
              <span className={styles.dropdownMenuItemText}>Events</span>
            </Link>
          )}
          
          {currentPath && currentPath.includes('/club/') && (
            <Link 
              href={`${currentPath.split('/').slice(0, 3).join('/')}/members`}
              className={styles.dropdownMenuItem}
              onClick={() => setShowDropdown(false)}
            >
              <span className={styles.dropdownMenuItemIcon}>👥</span>
              <span className={styles.dropdownMenuItemText}>Club Members</span>
            </Link>
          )}
          
          <Link 
            href={currentPath && currentPath.includes('/club/') 
              ? `${currentPath.split('/').slice(0, 3).join('/')}/documents`
              : '/documents'} 
            className={styles.dropdownMenuItem}
            onClick={() => setShowDropdown(false)}
          >
            <span className={styles.dropdownMenuItemIcon}>📄</span>
            <span className={styles.dropdownMenuItemText}>Club Documents</span>
          </Link>
          
          <Link 
            href={currentPath && currentPath.includes('/club/') 
              ? `${currentPath.split('/').slice(0, 3).join('/')}/finance`
              : '/finance'} 
            className={styles.dropdownMenuItem}
            onClick={() => setShowDropdown(false)}
          >
            <span className={styles.dropdownMenuItemIcon}>💰</span>
            <span className={styles.dropdownMenuItemText}>Finance</span>
          </Link>
          
          {currentPath && currentPath.includes('/club/') && (
            <Link 
              href={`${currentPath.split('/').slice(0, 3).join('/')}/rankings`}
              className={styles.dropdownMenuItem}
              onClick={() => setShowDropdown(false)}
            >
              <span className={styles.dropdownMenuItemIcon}>📊</span>
              <span className={styles.dropdownMenuItemText}>Ranking</span>
            </Link>
          )}
          
          <div 
            className={styles.dropdownMenuItem}
            style={{
              borderTop: '1px solid rgba(0, 0, 0, 0.1)',
              marginTop: '8px'
            }}
            onClick={handleSwitchClub}
          >
            <span className={styles.dropdownMenuItemIcon}>🔄</span>
            <span className={styles.dropdownMenuItemText}>Switch Club</span>
          </div>
          
          <Link 
            href={currentPath && currentPath.includes('/club/') 
              ? `${currentPath.split('/').slice(0, 3).join('/')}/help`
              : '/help'} 
            className={styles.dropdownMenuItem}
            onClick={() => setShowDropdown(false)}
          >
            <span className={styles.dropdownMenuItemIcon}>❓</span>
            <span className={styles.dropdownMenuItemText}>Help</span>
          </Link>
          
          <Link 
            href="http://opensport.co.za/" 
            target="_blank"
            rel="noopener noreferrer"
            className={styles.dropdownMenuItem}
            onClick={() => setShowDropdown(false)}
          >
            <span className={styles.dropdownMenuItemIcon}>🛒</span>
            <span className={styles.dropdownMenuItemText}>Tennis Shop</span>
          </Link>
          
          <div 
            className={styles.dropdownMenuItem}
            style={{
              color: '#dc2626',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onClick={handleLogout}
          >
            <span className={styles.dropdownMenuItemIcon}>🚪</span>
            <span className={styles.dropdownMenuItemText}>Log out</span>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
