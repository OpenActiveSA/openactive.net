import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getSupabaseClient } from '../lib/supabase';

export function EmailAuth({ navigation, route }) {
  const initialEmail = route?.params?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(initialEmail ? 'checking' : 'email');

  useEffect(() => {
    if (initialEmail) {
      checkIfUserExists(initialEmail);
    }
  }, [initialEmail]);

  const checkIfUserExists = async (emailToCheck) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      return;
    }

    setIsCheckingEmail(true);
    setError('');
    
    try {
      const supabase = getSupabaseClient();
      
      // Check if user exists in User table
      const { data, error: dbError } = await supabase
        .from('User')
        .select('email')
        .eq('email', emailToCheck.toLowerCase().trim())
        .maybeSingle();

      if (dbError && dbError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is fine
        console.error('Error checking user:', dbError);
        // Default to register if error
        setStep('register');
        return;
      }

      // If user exists, go to login step; otherwise go to register step
      if (data) {
        setStep('login');
      } else {
        setStep('register');
      }
    } catch (err) {
      console.error('Error checking if user exists:', err);
      // Default to register on error (safer - allows new signups)
      setStep('register');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if user exists
    await checkIfUserExists(email);
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      if (step === 'login') {
        // Login with password
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (authError) {
          setError(authError.message || 'Login failed. Please check your credentials.');
          return;
        }

        if (data.user) {
          // Update last login in User table
          try {
            await supabase
              .from('User')
              .update({ 
                lastLoginAt: new Date().toISOString(), 
                updatedAt: new Date().toISOString() 
              })
              .eq('id', data.user.id.toString());
          } catch (err) {
            console.error('Error updating last login:', err);
            // Don't fail login if this fails
          }
          
          // Navigate to main app
          if (navigation && navigation.navigate) {
            navigation.navigate('Home', {});
          } else {
            // If no navigation, just show success
            Alert.alert('Success', 'Logged in successfully!');
          }
        }
      } else if (step === 'register') {
        // Sign up with name, surname and password
        if (!name.trim()) {
          setError('Please enter your name');
          return;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              name: name.trim(),
              surname: surname.trim(),
              username: email.split('@')[0], // Use email prefix as default username
            },
          },
        });

        if (authError) {
          setError(authError.message || 'Registration failed. Please try again.');
          return;
        }

        if (data.user) {
          // Check if email confirmation is required
          if (data.user.confirmed_at) {
            // User is immediately confirmed, navigate to home
            if (navigation && navigation.navigate) {
              navigation.navigate('Home', {});
            } else {
              Alert.alert('Success', 'Account created successfully!');
            }
          } else {
            // Email confirmation required
            setError('');
            Alert.alert(
              'Registration Successful',
              'Please check your email to confirm your account.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (navigation && navigation.goBack) {
                      navigation.goBack();
                    }
                  }
                }
              ]
            );
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setPassword('');
    setName('');
    setSurname('');
    setError('');
  };

  const handleBack = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>O</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {step === 'email' && 'Enter your email'}
          {step === 'checking' && 'Checking...'}
          {step === 'login' && 'Welcome back'}
          {step === 'register' && 'Create account'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'email' && "We'll check if you have an account"}
          {step === 'checking' && 'Please wait...'}
          {step === 'login' && 'Enter your password to continue'}
          {step === 'register' && 'Sign up to get started'}
        </Text>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Email Step Form */}
        {step === 'email' && (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="john.doe@example.com"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading && !isCheckingEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (!email || isLoading || isCheckingEmail) && styles.submitButtonDisabled]}
              onPress={handleEmailSubmit}
              disabled={isLoading || isCheckingEmail || !email}
            >
              {isCheckingEmail ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Checking Step */}
        {step === 'checking' && (
          <View style={styles.form}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.checkingText}>Checking account...</Text>
          </View>
        )}

        {/* Login Step Form (Password only) */}
        {step === 'login' && (
          <View style={styles.form}>
            {/* Show email (read-only) */}
            <View style={styles.emailDisplay}>
              <Text style={styles.emailLabel}>Email</Text>
              <View style={styles.emailDisplayRow}>
                <Text style={styles.emailValue}>{email}</Text>
                <TouchableOpacity
                  style={styles.changeEmailButton}
                  onPress={handleBackToEmail}
                  disabled={isLoading}
                >
                  <Text style={styles.changeEmailButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                autoFocus
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading || !password}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Sign in</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Register Step Form (Name + Surname + Password) */}
        {step === 'register' && (
          <View style={styles.form}>
            {/* Show email (read-only) */}
            <View style={styles.emailDisplay}>
              <Text style={styles.emailLabel}>Email</Text>
              <View style={styles.emailDisplayRow}>
                <Text style={styles.emailValue}>{email}</Text>
                <TouchableOpacity
                  style={styles.changeEmailButton}
                  onPress={handleBackToEmail}
                  disabled={isLoading}
                >
                  <Text style={styles.changeEmailButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="John"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={name}
                onChangeText={setName}
                editable={!isLoading}
                autoFocus
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={surname}
                onChangeText={setSurname}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (isLoading || !name.trim() || !password) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading || !name.trim() || !password}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Sign up</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#052333',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
  emailDisplay: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  emailLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  emailDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailValue: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  changeEmailButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  changeEmailButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#667eea',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(102, 126, 234, 0.5)',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});

