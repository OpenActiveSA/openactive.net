'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  
  // Fetch user's name when logged in
  useEffect(() => {
    const fetchUserName = async () => {
      if (user && user.id) {
        try {
          const supabase = getSupabaseClientClient();
          const { data: userData } = await supabase
            .from('Users')
            .select('name, Firstname, Surname')
            .eq('id', user.id)
            .maybeSingle();
          
          if (userData) {
            const name = userData.name || 
                        (userData.Firstname && userData.Surname 
                          ? `${userData.Firstname} ${userData.Surname}` 
                          : userData.Firstname || userData.Surname || '');
            setUserName(name || user.email?.split('@')[0] || 'User');
          } else {
            setUserName(user.email?.split('@')[0] || 'User');
          }
        } catch (err) {
          console.error('Error fetching user name:', err);
          setUserName(user.email?.split('@')[0] || 'User');
        }
      } else {
        setUserName('');
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
            href="/"
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
                  height: '40px',
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
          <Link
            href="/book"
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
          <Link
            href="/events"
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
          <Link
            href="/rankings"
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
        </nav>

        {/* User Name or Login Button - Right */}
        <div style={{ flexShrink: 0 }}>
          {!authLoading && user && userName ? (
            <div style={{
              color: '#052333',
              fontSize: '16px',
              fontWeight: '500',
              padding: '8px 20px',
              border: '1px solid #052333',
              borderRadius: '6px',
              display: 'inline-block',
              opacity: 0.9
            }}>
              {userName}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
}

