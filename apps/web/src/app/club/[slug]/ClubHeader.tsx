'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
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
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch by only rendering auth-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Fetch user's name when logged in
  useEffect(() => {
    const fetchUserName = async () => {
      if (user && user.id) {
        try {
          // Try to get Supabase client - it may throw if config is missing
          let supabase;
          try {
            supabase = getSupabaseClientClient();
          } catch (configError: any) {
            // Supabase not configured - use email fallback
            console.warn('Supabase not configured, using email as username:', configError.message);
            setUserName(user.email?.split('@')[0] || 'User');
            setUserAvatar(null);
            return;
          }

          const { data: userData, error } = await supabase
            .from('Users')
            .select('Firstname, Surname, avatarUrl')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching user name from database:', error);
            setUserName(user.email?.split('@')[0] || 'User');
            setUserAvatar(null);
            return;
          }
          
          if (userData) {
            console.log('Fetched user data from database:', userData);
            const name = userData.Firstname && userData.Surname 
                          ? `${userData.Firstname} ${userData.Surname}` 
                          : userData.Firstname || userData.Surname || '';
            const finalName = name || user.email?.split('@')[0] || 'User';
            console.log('Setting user name to:', finalName);
            setUserName(finalName);
            setUserAvatar(userData.avatarUrl || null);
          } else {
            console.log('No user data found in database, using email fallback');
            setUserName(user.email?.split('@')[0] || 'User');
            setUserAvatar(null);
          }
        } catch (err: any) {
          console.error('Error fetching user name:', err);
          setUserName(user.email?.split('@')[0] || 'User');
          setUserAvatar(null);
        }
      } else {
        setUserName('');
        setUserAvatar(null);
      }
    };
    
    fetchUserName();
  }, [user]);
  
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
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: '#ffffff',
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid rgba(0, 0, 0, 0.1)`,
      padding: '16px 24px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px'
      }}>
        {/* Logo - Left */}
        <div style={{ flexShrink: 0 }}>
          <Link 
            href={currentPath && currentPath.includes('/club/') 
              ? currentPath.split('/').slice(0, 3).join('/') // Extract /club/[slug] from currentPath
              : '/book'}
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            {logo && !logoError ? (
              <img 
                src={logo} 
                alt="Club logo" 
                style={{ 
                  maxHeight: '52px',
                  width: 'auto',
                  objectFit: 'contain'
                }}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#052333' }}>
                <i className="oa-open-o" style={{ fontSize: '24px', display: 'inline-block' }}></i>
                <i className="oa-open-p" style={{ fontSize: '24px', display: 'inline-block' }}></i>
                <i className="oa-open-e" style={{ fontSize: '24px', display: 'inline-block' }}></i>
                <i className="oa-open-n" style={{ fontSize: '24px', display: 'inline-block' }}></i>
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
        <div style={{ flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }} ref={dropdownRef}>
          {mounted && !authLoading && user ? (
            <>
              <div 
                style={{
                  color: '#052333',
                  fontSize: '16px',
                  fontWeight: '500',
                  padding: '8px 20px',
                  display: 'inline-block',
                  opacity: 0.9,
                  cursor: 'pointer',
                  userSelect: 'none',
                  position: 'relative'
                }}
                onClick={() => setShowDropdown(!showDropdown)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
              >
                {userName || user.email?.split('@')[0] || 'User'}
                <span style={{ marginLeft: '8px', fontSize: '12px' }}>▼</span>
              </div>
              
              {/* Profile Picture */}
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '2px solid #052333',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f0f0f0'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName || 'User'} 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const initials = userName
                          ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          : user.email?.[0].toUpperCase() || 'U';
                        parent.innerHTML = `<span style="color: #052333; font-weight: 600; font-size: 14px;">${initials}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span style={{ color: '#052333', fontWeight: '600', fontSize: '14px' }}>
                    {userName
                      ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : user.email?.[0].toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              
              {/* Dropdown Menu */}
              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  minWidth: '220px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  {currentPath && currentPath.includes('/club/') ? (
                    <Link 
                      href={`${currentPath.split('/').slice(0, 3).join('/')}/profile`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        color: '#052333',
                        textDecoration: 'none',
                        fontSize: '14px',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ fontSize: '18px' }}>👤</span>
                      <span>My Profile</span>
                    </Link>
                  ) : (
                    <Link 
                      href="/profile" 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        color: '#052333',
                        textDecoration: 'none',
                        fontSize: '14px',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ fontSize: '18px' }}>👤</span>
                      <span>My Profile</span>
                    </Link>
                  )}
                  
                  <Link 
                    href={currentPath && currentPath.includes('/club/') 
                      ? `${currentPath.split('/').slice(0, 3).join('/')}/matches`
                      : '/matches'} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      color: '#052333',
                      textDecoration: 'none',
                      fontSize: '14px',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => setShowDropdown(false)}
                  >
                    <span style={{ fontSize: '18px' }}>🏆</span>
                    <span>Manage Matches</span>
                  </Link>
                  
                  {currentPath && currentPath.includes('/club/') && (
                    <Link 
                      href={`${currentPath.split('/').slice(0, 3).join('/')}/events`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        color: '#052333',
                        textDecoration: 'none',
                        fontSize: '14px',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ fontSize: '18px' }}>📅</span>
                      <span>Events</span>
                    </Link>
                  )}
                  
                  {currentPath && currentPath.includes('/club/') && (
                    <Link 
                      href={`${currentPath.split('/').slice(0, 3).join('/')}/members`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        color: '#052333',
                        textDecoration: 'none',
                        fontSize: '14px',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ fontSize: '18px' }}>👥</span>
                      <span>Club Members</span>
                    </Link>
                  )}
                  
                  <Link 
                    href={currentPath && currentPath.includes('/club/') 
                      ? `${currentPath.split('/').slice(0, 3).join('/')}/documents`
                      : '/documents'} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      color: '#052333',
                      textDecoration: 'none',
                      fontSize: '14px',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => setShowDropdown(false)}
                  >
                    <span style={{ fontSize: '18px' }}>📄</span>
                    <span>Club Documents</span>
                  </Link>
                  
                  <Link 
                    href={currentPath && currentPath.includes('/club/') 
                      ? `${currentPath.split('/').slice(0, 3).join('/')}/finance`
                      : '/finance'} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      color: '#052333',
                      textDecoration: 'none',
                      fontSize: '14px',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => setShowDropdown(false)}
                  >
                    <span style={{ fontSize: '18px' }}>💰</span>
                    <span>Finance</span>
                  </Link>
                  
                  {currentPath && currentPath.includes('/club/') && (
                    <Link 
                      href={`${currentPath.split('/').slice(0, 3).join('/')}/rankings`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        color: '#052333',
                        textDecoration: 'none',
                        fontSize: '14px',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => setShowDropdown(false)}
                    >
                      <span style={{ fontSize: '18px' }}>📊</span>
                      <span>Ranking</span>
                    </Link>
                  )}
                  
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      color: '#052333',
                      fontSize: '14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={handleSwitchClub}
                  >
                    <span style={{ fontSize: '18px' }}>🔄</span>
                    <span>Switch Club</span>
                  </div>
                  
                  <Link 
                    href={currentPath && currentPath.includes('/club/') 
                      ? `${currentPath.split('/').slice(0, 3).join('/')}/help`
                      : '/help'} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      color: '#052333',
                      textDecoration: 'none',
                      fontSize: '14px',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => setShowDropdown(false)}
                  >
                    <span style={{ fontSize: '18px' }}>❓</span>
                    <span>Help</span>
                  </Link>
                  
                  <Link 
                    href="http://opensport.co.za/" 
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      color: '#052333',
                      textDecoration: 'none',
                      fontSize: '14px',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => setShowDropdown(false)}
                  >
                    <span style={{ fontSize: '18px' }}>🛒</span>
                    <span>Tennis Shop</span>
                  </Link>
                  
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      color: '#dc2626',
                      fontSize: '14px',
                      cursor: 'pointer',
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
                    <span style={{ fontSize: '18px' }}>🚪</span>
                    <span>Log out</span>
                  </div>
                </div>
              )}
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
            <div style={{ width: '60px', height: '40px' }}></div>
          )}
        </div>
      </div>
    </header>
  );
}

