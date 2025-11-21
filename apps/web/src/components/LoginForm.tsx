'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement actual login logic with Supabase
      // For now, this is a placeholder
      console.log('Login attempt:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If login successful, call onSuccess or redirect
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="form-container">
        <h2 className="form-title">o p e n</h2>
        <p className="form-subtitle">Login to book & play!</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-with-icon">
              <span className="input-icon">
                <Icon name="envelope" size={20} color={formData.email ? "#052333" : "rgba(255, 255, 255, 0.6)"} />
              </span>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <div className="input-with-icon">
              <span className="input-icon">
                <Icon name="lock" size={20} color={formData.password ? "#052333" : "rgba(255, 255, 255, 0.6)"} />
              </span>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Password"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          <div className="auth-links">
            <a href="#" className="auth-link">Forgot Password?</a>
            <a href="/register" className="auth-link">Register new account</a>
          </div>
        </form>
      </div>
    </div>
  );
}




