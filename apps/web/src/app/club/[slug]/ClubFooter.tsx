'use client';

import { useEffect, useState } from 'react';
import styles from '@/styles/frontend.module.css';

interface ClubFooterProps {
  fontColor: string;
}

export default function ClubFooter({ fontColor }: ClubFooterProps) {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    // Fetch version from public file
    fetch('/version.txt')
      .then(res => res.text())
      .then(text => {
        const v = text.trim();
        setVersion(v || '0.0.1');
      })
      .catch(() => {
        // Fallback if file doesn't exist
        setVersion('0.0.1');
      });
  }, []);

  return (
    <footer className={styles.footer} style={{ color: fontColor }}>
      <p className={styles.footerText}>
        Version {version}
      </p>
    </footer>
  );
}

