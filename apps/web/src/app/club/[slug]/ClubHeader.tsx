'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
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
  const pathname = usePathname();
  
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

        {/* Login Button - Right */}
        <div style={{ flexShrink: 0 }}>
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
        </div>
      </div>
    </header>
  );
}

