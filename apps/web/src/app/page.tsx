'use client';

import { BurgerMenu } from '@/components/BurgerMenu';
import styles from '@/components/AuthScreen.module.css';

export default function Home() {
  return (
    <div className={styles.container} style={{ position: 'relative' }}>
      <BurgerMenu />
      <div className={styles.content}>
        {/* No Logo - as requested */}

        {/* Title */}
        <h1 className={styles.title}>Log in or sign up</h1>
        <p className={styles.subtitle}>Your game starts here</p>

        {/* Google Button */}
        <button 
          className={styles.socialButton}
          onClick={() => alert('Coming Soon\nGoogle sign-in will be available soon')}
        >
          <div className={styles.googleIcon}>
            <span className={styles.googleIconText}>G</span>
          </div>
          <span className={styles.socialButtonText}>Continue with Google</span>
        </button>

        {/* Facebook Button */}
        <button 
          className={styles.socialButton}
          onClick={() => alert('Coming Soon\nFacebook sign-in will be available soon')}
        >
          <div className={styles.facebookIcon}>
            <span className={styles.facebookIconText}>f</span>
          </div>
          <span className={styles.socialButtonText}>Continue with Facebook</span>
        </button>

        {/* Separator */}
        <div className={styles.separator}>
          <span className={styles.separatorText}>or</span>
        </div>

        {/* Email Button */}
        <button 
          className={styles.socialButton}
          onClick={() => window.location.href = '/login'}
        >
          <span className={styles.emailIcon}>✉</span>
          <span className={styles.socialButtonText}>Continue with email</span>
        </button>

        {/* Terms */}
        <p className={styles.termsText}>
          By registering you are accepting our{' '}
          <a href="#" className={styles.linkText}>terms of use</a>
          {' '}and{' '}
          <a href="#" className={styles.linkText}>privacy policy</a>
        </p>
      </div>
    </div>
  );
}
