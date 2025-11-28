'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClientClient } from '@/lib/supabase';
import styles from './EmailAuth.module.css';

export function EmailAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'email' | 'login' | 'register' | 'success'>('email');
  const supabase = getSupabaseClientClient();

  useEffect(() => {
    // Get email from URL params if available
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
      // Check if user exists to determine next step
      checkIfUserExists(emailParam);
    } else {
      // Start at email step if no email in URL
      setStep('email');
    }
  }, [searchParams]);

  const checkIfUserExists = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      return;
    }

    setIsCheckingEmail(true);
    setError('');
    
    try {
      console.log('[EmailAuth] Checking if user exists:', emailToCheck.toLowerCase().trim());
      
      // Check if user exists in Users table
      const { data, error } = await supabase
        .from('Users')
        .select('email')
        .eq('email', emailToCheck.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116 means no rows returned, which is fine
          console.log('[EmailAuth] User not found, going to register');
          setStep('register');
          return;
        }
        
        // Real error - log it
        console.error('[EmailAuth] Error checking user:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        // Default to register if error
        setStep('register');
        return;
      }

      // If user exists, go to login step; otherwise go to register step
      if (data) {
        console.log('[EmailAuth] User found, going to login');
        setStep('login');
      } else {
        console.log('[EmailAuth] User not found, going to register');
        setStep('register');
      }
    } catch (err: any) {
      console.error('[EmailAuth] Exception checking if user exists:', {
        message: err?.message || String(err),
        stack: err?.stack,
      });
      // Default to register on error (safer - allows new signups)
      setStep('register');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if user exists
    await checkIfUserExists(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (step === 'login') {
        // Login with password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setError(error.message || 'Login failed. Please check your credentials.');
          return;
        }

        if (data.user) {
          // Update last login in Users table
          try {
            await supabase
              .from('Users')
              .update({ lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
              .eq('id', data.user.id.toString());
          } catch (err) {
            console.error('Error updating last login:', err);
            // Don't fail login if this fails
          }
          
          // Check user role and redirect accordingly
          try {
            const { data: userData, error: roleError } = await supabase
              .from('Users')
              .select('role')
              .eq('id', data.user.id)
              .eq('email', data.user.email)
              .maybeSingle();

            if (!roleError && userData?.role === 'SUPER_ADMIN') {
              // Redirect SUPER_ADMIN to admin dashboard
              router.push('/admin');
            } else {
              // Redirect regular users to home page
              router.push('/');
            }
          } catch (err) {
            console.error('Error checking user role:', err);
            // Default to home page if role check fails
            router.push('/');
          }
          router.refresh();
        }
      } else if (step === 'register') {
        // Sign up with name, surname and password
        if (!name.trim()) {
          setError('Please enter your name');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              Firstname: name.trim(),
              Surname: surname.trim(),
            },
          },
        });

        if (error) {
          setError(error.message || 'Registration failed. Please try again.');
          return;
        }

        if (data.user) {
          // Skip email confirmation for now - immediately redirect
          // Update last login in Users table
          try {
            await supabase
              .from('Users')
              .update({ lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
              .eq('id', data.user.id.toString());
          } catch (err) {
            console.error('Error updating last login:', err);
            // Don't fail registration if this fails
          }
          
          // Check user role and redirect accordingly
          try {
            const { data: userData, error: roleError } = await supabase
              .from('Users')
              .select('role')
              .eq('id', data.user.id)
              .eq('email', data.user.email)
              .maybeSingle();

            if (!roleError && userData?.role === 'SUPER_ADMIN') {
              // Redirect SUPER_ADMIN to admin dashboard
              router.push('/admin');
            } else {
              // Redirect regular users to home page
              router.push('/');
            }
          } catch (err) {
            console.error('Error checking user role:', err);
            // Default to home page if role check fails
            router.push('/');
          }
          router.refresh();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setPassword('');
    setDisplayName('');
    setError('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <span className={styles.logoText}>O</span>
          </div>
        </div>

        {/* Title */}
        <h1 className={styles.title}>
          {step === 'email' && 'Enter your email'}
          {step === 'login' && 'Welcome back'}
          {step === 'register' && 'Create account'}
          {step === 'success' && 'Check your email'}
        </h1>
        <p className={styles.subtitle}>
          {step === 'email' && 'We\'ll check if you have an account'}
          {step === 'login' && 'Enter your password to continue'}
          {step === 'register' && 'Sign up to get started'}
          {step === 'success' && 'We sent you a confirmation link'}
        </p>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && step === 'success' && (
          <div className={styles.successMessage}>
            {successMessage}
          </div>
        )}

        {/* Success Step Display */}
        {step === 'success' && (
          <div className={styles.successContent}>
            <div className={styles.successIcon}>✉️</div>
            <p className={styles.successText}>
              We've sent a confirmation email to <strong>{email}</strong>
            </p>
            <p className={styles.successSubtext}>
              Please check your inbox and click the confirmation link to activate your account.
            </p>
            <button
              type="button"
              className={styles.backToLoginButton}
              onClick={() => {
                setStep('email');
                setEmail('');
                setSuccessMessage('');
                router.push('/login');
              }}
            >
              Back to login
            </button>
          </div>
        )}

        {/* Email Step Form */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className={styles.form}>
            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type="email"
                className={styles.input}
                placeholder="john.doe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isCheckingEmail}
                required
                autoFocus
              />
              <label className={styles.label}>Email *</label>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || isCheckingEmail || !email}
            >
              {isCheckingEmail ? (
                <span>Checking...</span>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>
        )}

        {/* Login Step Form (Password only) */}
        {step === 'login' && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Show email (read-only) */}
            <div className={styles.formGroup}>
              <div className={styles.emailDisplay}>
                <span className={styles.emailLabel}>Email</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '8px' }}>
                  <span>{email}</span>
                  <button
                    type="button"
                    className={styles.changeEmailButton}
                    onClick={handleBackToEmail}
                    disabled={isLoading}
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
                minLength={6}
              />
              <label className={styles.label}>Password *</label>
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className={styles.eyeIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </span>
              </button>
            </div>

            <div className={styles.forgotPassword}>
              <a href="#" className={styles.link}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
        )}

        {/* Register Step Form (Display Name + Password) */}
        {step === 'register' && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Show email (read-only) */}
            <div className={styles.formGroup}>
              <div className={styles.emailDisplay}>
                <span className={styles.emailLabel}>Email</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '8px' }}>
                  <span>{email}</span>
                  <button
                    type="button"
                    className={styles.changeEmailButton}
                    onClick={handleBackToEmail}
                    disabled={isLoading}
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type="text"
                className={styles.input}
                placeholder="John"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
              />
              <label className={styles.label}>Name *</label>
            </div>

            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type="text"
                className={styles.input}
                placeholder="Doe"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                disabled={isLoading}
              />
              <label className={styles.label}>Surname</label>
            </div>

            <div className={`${styles.formGroup} ${styles.inputFloating}`}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={6}
              />
              <label className={styles.label}>Password *</label>
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className={styles.eyeIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </span>
              </button>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Creating account...</span>
              ) : (
                <span>Sign up</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
