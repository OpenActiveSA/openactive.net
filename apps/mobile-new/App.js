import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, Animated, TextInput } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { getSupabaseClient } from './lib/supabase';

// Keep the native splash screen visible initially
SplashScreen.preventAutoHideAsync();

// Icon map for OpenActive font icons
// Unicode values from style.css (Private Use Area F000-F0FF)
// CSS mappings:
// .oa-open-p:before { content: "\f001"; }  → 0xF001 (61441)
// .oa-open-o:before { content: "\f002"; }  → 0xF002 (61442)
// .oa-open-n:before { content: "\f003"; }  → 0xF003 (61443)
// .oa-open-e:before { content: "\f004"; }  → 0xF004 (61444)
// Using String.fromCharCode for React Native compatibility
const iconMap = {
  'open-o': String.fromCharCode(0xF002),  // O - 61442
  'open-p': String.fromCharCode(0xF001),  // P - 61441
  'open-e': String.fromCharCode(0xF004),  // E - 61444
  'open-n': String.fromCharCode(0xF003),  // N - 61443
};

function OpenActiveIcon({ name, size = 32, color = '#ffffff', opacity = 0.8, animatedOpacity }) {
  const iconChar = iconMap[name];
  if (!iconChar) return null;
  
  const opacityValue = animatedOpacity !== undefined ? animatedOpacity : opacity;
  
  return (
    <Animated.Text style={{ 
      fontFamily: 'openactive', // Must match font-family in style.css: "openactive"
      fontSize: size, 
      color: color, 
      opacity: opacityValue,
      lineHeight: size,
      textAlign: 'center',
      includeFontPadding: false, // Remove extra padding
      textAlignVertical: 'center',
    }}>
      {iconChar}
    </Animated.Text>
  );
}

export default function App() {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('email'); // 'email' | 'login' | 'register'
  
  // Animated values for each letter (O, P, E, N) - start at 30% opacity
  const opacityO = useRef(new Animated.Value(0.3)).current;
  const opacityP = useRef(new Animated.Value(0.3)).current;
  const opacityE = useRef(new Animated.Value(0.3)).current;
  const opacityN = useRef(new Animated.Value(0.3)).current;
  
  // Animated value for sliding the splash screen out
  const slideX = useRef(new Animated.Value(0)).current;

  // Load font programmatically as backup
  useEffect(() => {
    async function loadFont() {
      try {
        await Font.loadAsync({
          openactive: require('./assets/fonts/openactive.ttf'),
        });
        setFontLoaded(true);
        console.log('[App] OpenActive font loaded successfully');
      } catch (error) {
        console.error('[App] Error loading OpenActive font:', error);
        // Still try to show icons even if load fails
        setFontLoaded(true);
      }
    }
    loadFont();
  }, []);

  // Hide native splash and animate custom splash screen icons
  useEffect(() => {
    // Hide native splash screen immediately
    SplashScreen.hideAsync().catch(() => {
      // Ignore errors
    });

    // Start animation after a brief delay to ensure splash is visible
    const timer = setTimeout(() => {
      // Animate each letter one by one from 30% to 100% opacity, then slide out
      Animated.sequence([
        // O - fade in first
        Animated.timing(opacityO, {
          toValue: 1.0,
          duration: 400,
          useNativeDriver: true,
        }),
        // P - fade in second
        Animated.timing(opacityP, {
          toValue: 1.0,
          duration: 400,
          useNativeDriver: true,
        }),
        // E - fade in third
        Animated.timing(opacityE, {
          toValue: 1.0,
          duration: 400,
          useNativeDriver: true,
        }),
        // N - fade in fourth
        Animated.timing(opacityN, {
          toValue: 1.0,
          duration: 400,
          useNativeDriver: true,
        }),
        // Wait a bit
        Animated.delay(300),
        // Slide out to the right
        Animated.timing(slideX, {
          toValue: 1000, // Slide completely off screen to the right
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSplash(false);
      });
    }, 300);

    // Fallback timeout - always hide splash after 4 seconds
    const fallbackTimer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleGooglePress = () => {
    Alert.alert('Coming Soon', 'Google sign-in will be available soon');
  };

  const handleFacebookPress = () => {
    Alert.alert('Coming Soon', 'Facebook sign-in will be available soon');
  };


  const handleBackPress = () => {
    if (step === 'email') {
      setShowEmailModal(false);
      setEmail('');
      setStep('email');
      setError('');
    } else {
      // Go back to email step
      setStep('email');
      setPassword('');
      setName('');
      setSurname('');
      setError('');
    }
  };

  const handleEmailPress = () => {
    setShowEmailModal(true);
    setStep('email');
    setEmail('');
    setPassword('');
    setName('');
    setSurname('');
    setError('');
  };

  const checkIfUserExists = async (emailToCheck) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      return;
    }

    setIsCheckingEmail(true);
    setError('');
    
    try {
      const supabase = getSupabaseClient();
      console.log('[App] Checking if user exists:', emailToCheck.toLowerCase().trim());
      
      // Check if user exists in Users table
      const { data, error: queryError } = await supabase
        .from('Users')
        .select('email')
        .eq('email', emailToCheck.toLowerCase().trim())
        .maybeSingle();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          // PGRST116 means no rows returned, which is fine
          console.log('[App] User not found, going to register');
          setStep('register');
          return;
        }
        
        console.error('[App] Error checking user:', queryError);
        // Default to register if error
        setStep('register');
        return;
      }

      // If user exists, go to login step; otherwise go to register step
      if (data) {
        console.log('[App] User found, going to login');
        setStep('login');
      } else {
        console.log('[App] User not found, going to register');
        setStep('register');
      }
    } catch (err) {
      console.error('[App] Exception checking if user exists:', err);
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

  const handleAuthSubmit = async () => {
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
          // Update last login in Users table
          try {
            await supabase
              .from('Users')
              .update({ lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
              .eq('id', data.user.id.toString());
          } catch (err) {
            console.error('Error updating last login:', err);
          }
          
          Alert.alert('Success', 'Logged in successfully!');
          // TODO: Navigate to home/dashboard
          setShowEmailModal(false);
          setEmail('');
          setPassword('');
          setStep('email');
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
              Firstname: name.trim(),
              Surname: surname.trim(),
            },
          },
        });

        if (authError) {
          setError(authError.message || 'Registration failed. Please try again.');
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
          }
          
          Alert.alert('Success', 'Account created successfully!');
          // TODO: Navigate to home/dashboard
          setShowEmailModal(false);
          setEmail('');
          setPassword('');
          setName('');
          setSurname('');
          setStep('email');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Email Input Screen - Full Page */}
      {showEmailModal ? (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          style={styles.container}
        >
          <StatusBar style="light" />
          <View style={styles.emailModalContent}>
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            {/* OpenActive Font Icons - Spelling "OPEN" */}
            <View style={styles.iconRow}>
              <View style={styles.iconItem}>
                <OpenActiveIcon name="open-o" size={32} color="#ffffff" opacity={1.0} />
              </View>
              <View style={styles.iconItem}>
                <OpenActiveIcon name="open-p" size={32} color="#ffffff" opacity={1.0} />
              </View>
              <View style={styles.iconItem}>
                <OpenActiveIcon name="open-e" size={32} color="#ffffff" opacity={1.0} />
              </View>
              <View style={styles.iconItem}>
                <OpenActiveIcon name="open-n" size={32} color="#ffffff" opacity={1.0} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {step === 'email' && 'Enter your email'}
              {step === 'login' && 'Welcome back'}
              {step === 'register' && 'Create account'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email' && "We'll check if you have an account"}
              {step === 'login' && 'Enter your password to continue'}
              {step === 'register' && 'Sign up to get started'}
            </Text>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email Step Form */}
            {step === 'email' && (
              <View style={styles.emailForm}>
                <View style={styles.formGroup}>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Email address"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    editable={!isCheckingEmail}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.continueButton, (isCheckingEmail || !email) && styles.continueButtonDisabled]}
                  onPress={handleEmailSubmit}
                  disabled={isCheckingEmail || !email}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueButtonText}>
                    {isCheckingEmail ? 'Checking...' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Login Step Form (Password only) */}
            {step === 'login' && (
              <View style={styles.emailForm}>
                {/* Show email (read-only) */}
                <View style={styles.formGroup}>
                  <View style={styles.emailDisplay}>
                    <Text style={styles.emailLabel}>Email</Text>
                    <View style={styles.emailDisplayRow}>
                      <Text style={styles.emailDisplayText}>{email}</Text>
                      <TouchableOpacity
                        onPress={handleBackPress}
                        disabled={isLoading}
                      >
                        <Text style={styles.changeEmailButton}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.emailInput}
                      placeholder="Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setError('');
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
                  onPress={handleAuthSubmit}
                  disabled={isLoading || !password}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueButtonText}>
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Register Step Form (Name + Surname + Password) */}
            {step === 'register' && (
              <View style={styles.emailForm}>
                {/* Show email (read-only) */}
                <View style={styles.formGroup}>
                  <View style={styles.emailDisplay}>
                    <Text style={styles.emailLabel}>Email</Text>
                    <View style={styles.emailDisplayRow}>
                      <Text style={styles.emailDisplayText}>{email}</Text>
                      <TouchableOpacity
                        onPress={handleBackPress}
                        disabled={isLoading}
                      >
                        <Text style={styles.changeEmailButton}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setError('');
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                    editable={!isLoading}
                  />
                </View>

                <View style={styles.formGroup}>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Surname"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={surname}
                    onChangeText={(text) => {
                      setSurname(text);
                      setError('');
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.emailInput}
                      placeholder="Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setError('');
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
                  onPress={handleAuthSubmit}
                  disabled={isLoading || !password || !name.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueButtonText}>
                    {isLoading ? 'Creating account...' : 'Sign up'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* Main app content - always rendered, visible when splash slides away */
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          style={styles.container}
        >
          <StatusBar style="light" />
          <View style={styles.content}>
            {/* OpenActive Font Icons - Spelling "OPEN" */}
            <View style={styles.iconRow}>
              <View style={styles.iconItem}>
                <OpenActiveIcon name="open-o" size={32} color="#ffffff" opacity={1.0} />
              </View>
              <View style={styles.iconItem}>
                <OpenActiveIcon name="open-p" size={32} color="#ffffff" opacity={1.0} />
              </View>
              <View style={styles.iconItem}>
                <OpenActiveIcon name="open-e" size={32} color="#ffffff" opacity={1.0} />
              </View>
              <View style={styles.iconItem}>
                <OpenActiveIcon name="open-n" size={32} color="#ffffff" opacity={1.0} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Log in or sign up</Text>
            <Text style={styles.subtitle}>Your game starts here</Text>

            {/* Google Button */}
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={handleGooglePress}
              activeOpacity={0.8}
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Facebook Button */}
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={handleFacebookPress}
              activeOpacity={0.8}
            >
              <View style={styles.facebookIcon}>
                <Text style={styles.facebookIconText}>f</Text>
              </View>
              <Text style={styles.socialButtonText}>Continue with Facebook</Text>
            </TouchableOpacity>

            {/* Separator */}
            <View style={styles.separator}>
              <Text style={styles.separatorText}>or</Text>
            </View>

            {/* Email Button */}
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={handleEmailPress}
              activeOpacity={0.8}
            >
              <Text style={styles.emailIcon}>✉</Text>
              <Text style={styles.socialButtonText}>Continue with email</Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              By registering you are accepting our{' '}
              <Text style={styles.linkText}>terms of use</Text>
              {' '}and{' '}
              <Text style={styles.linkText}>privacy policy</Text>
            </Text>
          </View>
        </ScrollView>
      )}
      
      {/* Animated splash screen - slides out to the side - must be rendered last to be on top */}
      {showSplash && (
        <Animated.View 
          style={[
            styles.splashContainer,
            {
              transform: [{ translateX: slideX }]
            }
          ]}
        >
          <StatusBar style="light" />
          <View style={styles.splashIconRow}>
            <View style={styles.splashIconItem}>
              <OpenActiveIcon name="open-o" size={48} color="#ffffff" animatedOpacity={opacityO} />
            </View>
            <View style={styles.splashIconItem}>
              <OpenActiveIcon name="open-p" size={48} color="#ffffff" animatedOpacity={opacityP} />
            </View>
            <View style={styles.splashIconItem}>
              <OpenActiveIcon name="open-e" size={48} color="#ffffff" animatedOpacity={opacityE} />
            </View>
            <View style={styles.splashIconItem}>
              <OpenActiveIcon name="open-n" size={48} color="#ffffff" animatedOpacity={opacityN} />
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#052333',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1000,
    elevation: 1000, // For Android
  },
  splashIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIconItem: {
    marginHorizontal: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#052333',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#052333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40, // Match web app: margin-bottom: 40px
    flexWrap: 'wrap',
  },
  iconItem: {
    marginHorizontal: 6, // Creates 12px gap between icons (6px on each side)
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
    marginTop: 8,
    marginBottom: 64,
    textAlign: 'center',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    width: '100%',
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  facebookIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  facebookIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emailIcon: {
    fontSize: 20,
    marginRight: 12,
    color: 'rgba(0, 0, 0, 0.7)',
  },
  socialButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  separator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    width: '100%',
  },
  separatorText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  linkText: {
    color: '#667eea',
    textDecorationLine: 'underline',
  },
  emailModalContent: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 24,
    padding: 8,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  emailForm: {
    width: '100%',
  },
  formGroup: {
    marginBottom: 24,
    width: '100%',
  },
  emailInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    padding: 14,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
  },
  continueButton: {
    width: '100%',
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
  emailDisplay: {
    width: '100%',
  },
  emailLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  emailDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  emailDisplayText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  changeEmailButton: {
    color: '#667eea',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  passwordInputContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 4,
  },
  passwordToggleText: {
    fontSize: 20,
  },
});
