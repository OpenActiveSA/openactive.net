'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/frontend.module.css';

interface ClubFooterProps {
  fontColor: string;
}

export default function ClubFooter({ fontColor }: ClubFooterProps) {
  const [version, setVersion] = useState<string>('');
  const [platformStatus, setPlatformStatus] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    // Fetch version from public file
    fetch('/version.txt')
      .then(res => res.text())
      .then(text => {
        const v = text.trim();
        setVersion(v || '3.3.26');
      })
      .catch(() => {
        // Fallback if file doesn't exist
        setVersion('3.3.26');
      });

    // Check platform status
    const checkPlatformStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        if (response.ok) {
          setPlatformStatus('online');
        } else {
          setPlatformStatus('offline');
        }
      } catch (error) {
        // If health check fails, default to online (graceful degradation)
        // In production, you might want to set this to 'offline' instead
        setPlatformStatus('online');
      }
    };

    checkPlatformStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkPlatformStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className={styles.footer} style={{ color: '#ffffff' }}>
      <div className={styles.footerContent}>
        <p className={styles.footerText}>
          Booking Platform by Open Active - Version: {version} - Platform Status: 
          <span className={styles.statusIndicator} style={{ color: platformStatus === 'online' ? '#10b981' : '#ef4444' }}>
            {' '}● {platformStatus === 'online' ? 'Online' : 'Offline'}
          </span>
        </p>
        <div className={styles.footerLinks}>
          <Link href="/help" className={styles.footerLink} style={{ color: '#ffffff' }}>
            Help
          </Link>
          <a 
            href="http://opensport.co.za/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.footerLink} 
            style={{ color: '#ffffff' }}
          >
            Tennis Store
          </a>
          <a 
            href="http://opentennisfoundation.org.za/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.footerLink} 
            style={{ color: '#ffffff' }}
          >
            Charity Donations
          </a>
        </div>
      </div>
    </footer>
  );
}





