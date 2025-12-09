'use client';

import { BurgerMenu } from '@/components/BurgerMenu';
import styles from '@/components/AuthScreen.module.css';

export default function Home() {
  return (
    <div className={styles.container} style={{ position: 'relative' }}>
      <BurgerMenu />
      <div className={styles.content}>
        {/* OpenActive Font Icons - Spelling "OPEN" */}
        <div className={styles.iconRow}>
          <i className="oa-open-o" style={{ fontSize: '32px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
          <i className="oa-open-p" style={{ fontSize: '32px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
          <i className="oa-open-e" style={{ fontSize: '32px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
          <i className="oa-open-n" style={{ fontSize: '32px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
        </div>

        {/* Title */}
        <h1 className={styles.title}>Coming Soon</h1>
        <p className={styles.subtitle}>We're working on something amazing. Stay tuned!</p>
      </div>
    </div>
  );
}
