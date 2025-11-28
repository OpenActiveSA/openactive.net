'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AuthScreen.module.css';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const router = useRouter();

  const checkEmailAndNavigate = async () => {
    if (!email || !email.includes('@')) {
      alert('Invalid Email\nPlease enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      setShowEmailModal(false);
      
      // Navigate to email auth page (login/register form) with email
      // This matches the mobile app flow where it navigates to Login screen
      router.push(`/login/email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('Error checking email:', error);
      alert('Error\nSomething went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailButtonPress = () => {
    setShowEmailModal(true);
  };

  const handleGooglePress = () => {
    alert('Coming Soon\nGoogle sign-in will be available soon');
  };

  const handleFacebookPress = () => {
    alert('Coming Soon\nFacebook sign-in will be available soon');
  };

  return (
    <div className={styles.container}>
      {!showEmailModal && (
        <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <img src="/open-logo.svg" alt="Open Active Logo" className={styles.logoImage} />
          </div>
        </div>

        {/* Title */}
        <h1 className={styles.title}>Log in or sign up</h1>
        <p className={styles.subtitle}>Your game starts here</p>

        {/* Google Button */}
        <button 
          className={styles.socialButton}
          onClick={handleGooglePress}
        >
          <div className={styles.googleIcon}>
            <span className={styles.googleIconText}>G</span>
          </div>
          <span className={styles.socialButtonText}>Continue with Google</span>
        </button>

        {/* Facebook Button */}
        <button 
          className={styles.socialButton}
          onClick={handleFacebookPress}
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
          onClick={handleEmailButtonPress}
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
      )}

      {/* Email Input Modal - Full Page */}
      {showEmailModal && (
        <div className={styles.fullPageModal}>
          <div className={styles.fullPageModalContent}>
            {/* Back Button */}
            <button 
              className={styles.backButton}
              onClick={() => {
                setShowEmailModal(false);
                setEmail('');
              }}
            >
              ← Back
            </button>

            {/* Logo */}
            <div className={styles.logoContainer}>
              <div className={styles.logo}>
                <img src="/open-logo.svg" alt="Open Active Logo" className={styles.logoImage} />
              </div>
            </div>

            {/* Title */}
            <h1 className={styles.title}>Enter your email</h1>
            <p className={styles.subtitle}>We'll check if you have an account</p>

            {/* Email Input Form */}
            <form 
              className={styles.emailForm}
              onSubmit={(e) => {
                e.preventDefault();
                checkEmailAndNavigate();
              }}
            >
              <div className={styles.formGroup}>
                <input
                  type="email"
                  className={styles.emailInput}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <button 
                type="submit"
                className={styles.continueButton}
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <span>Checking...</span>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

