import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, Animated, TextInput, Image } from 'react-native';
import { useState, useEffect, useRef, useMemo } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Image as ExpoImage } from 'expo-image';
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
  console.log('[App] Component rendering...');
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [region, setRegion] = useState('All Regions');
  const [favorites, setFavorites] = useState([]);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  
  // Animated values for each letter (O, P, E, N) - start at 30% opacity
  const opacityO = useRef(new Animated.Value(0.3)).current;
  const opacityP = useRef(new Animated.Value(0.3)).current;
  const opacityE = useRef(new Animated.Value(0.3)).current;
  const opacityN = useRef(new Animated.Value(0.3)).current;
  
  // Animated value for sliding the splash screen out
  const slideX = useRef(new Animated.Value(0)).current;

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setIsAuthenticated(true);
          await loadClubs();
        }
      } catch (error) {
        console.error('[App] Error checking session:', error);
      }
    }
    checkSession();
  }, []);

  // Load font programmatically as backup
  useEffect(() => {
    async function loadFont() {
      try {
        // Add timeout to prevent hanging
        const fontPromise = Font.loadAsync({
          openactive: require('./assets/fonts/openactive.ttf'),
        });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Font load timeout')), 5000)
        );
        
        await Promise.race([fontPromise, timeoutPromise]);
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
    // If already authenticated, skip splash immediately
    if (isAuthenticated) {
      setShowSplash(false);
      SplashScreen.hideAsync().catch(() => {});
      return;
    }

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

    // Fallback timeout - always hide splash after 3 seconds (reduced from 4)
    const fallbackTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [isAuthenticated]);

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

  const loadClubs = async () => {
    setLoadingClubs(true);
    try {
      const supabase = getSupabaseClient();
      console.log('[App] Loading clubs...');
      
      // Start with the absolute minimum - just id and name
      let result = await supabase
        .from('Clubs')
        .select('id, name')
        .order('name', { ascending: true });
      
      let clubsData = result.data;
      let error = result.error;

      console.log('[App] Step 1 - Basic query (id, name):', { 
        data: clubsData, 
        error, 
        count: clubsData?.length,
        errorMessage: error?.message 
      });

      // If that works, try adding more columns
      if (!error && clubsData && clubsData.length > 0) {
        result = await supabase
          .from('Clubs')
          .select('id, name, numberOfCourts, country, province')
          .order('name', { ascending: true });
        
        clubsData = result.data;
        error = result.error;
        console.log('[App] Step 2 - Added basic columns:', { 
          data: clubsData, 
          error, 
          count: clubsData?.length 
        });
      }

      // Try adding branding columns if basic query worked
      if (!error && clubsData && clubsData.length > 0) {
        result = await supabase
          .from('Clubs')
          .select('id, name, numberOfCourts, country, province, logo, backgroundImage, backgroundColor')
          .order('name', { ascending: true });
        
        if (!result.error && result.data) {
          clubsData = result.data;
          console.log('[App] Step 3 - Added branding columns:', { 
            count: clubsData.length 
          });
        }
      }

      // Try filtering by is_active if we have clubs
      if (!error && clubsData && clubsData.length > 0) {
        result = await supabase
          .from('Clubs')
          .select('id, name, numberOfCourts, country, province, logo, backgroundImage, backgroundColor')
          .eq('is_active', true)
          .order('name', { ascending: true });
        
        // Only use filtered result if it returns data, otherwise keep all clubs
        if (!result.error && result.data && result.data.length > 0) {
          clubsData = result.data;
          console.log('[App] Step 4 - Filtered by is_active:', { 
            count: clubsData.length 
          });
        } else {
          console.log('[App] Step 4 - is_active filter returned no results, keeping all clubs');
        }
      }

      if (error) {
        console.error('[App] Final error loading clubs:', error);
        // Even if there's an error, try to use whatever data we got
        if (clubsData && clubsData.length > 0) {
          console.log('[App] Using clubs data despite error:', clubsData.length);
          setClubs(clubsData);
        }
      } else if (clubsData) {
        console.log('[App] ✅ Successfully loaded clubs:', clubsData.length);
        console.log('[App] Club names:', clubsData.map(c => c.name));
        setClubs(clubsData);
      } else {
        console.log('[App] ❌ No clubs data returned');
        setClubs([]);
      }
    } catch (err) {
      console.error('[App] Exception loading clubs:', err);
      setClubs([]);
    } finally {
      setLoadingClubs(false);
    }
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
          
          // Load clubs and navigate to clubs list
          setIsAuthenticated(true);
          setShowEmailModal(false);
          setEmail('');
          setPassword('');
          setStep('email');
          await loadClubs();
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
          
          // Load clubs and navigate to clubs list
          setIsAuthenticated(true);
          setShowEmailModal(false);
          setEmail('');
          setPassword('');
          setName('');
          setSurname('');
          setStep('email');
          await loadClubs();
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate slug from club name (matching web app)
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '')
      .replace(/^\s+|\s+$/g, '');
  };

  // Extract unique regions from clubs
  const availableRegions = useMemo(() => {
    if (!clubs || clubs.length === 0) return ['All Regions'];
    return ['All Regions', ...Array.from(new Set(
      clubs
        .map(club => {
          if (!club) return null;
          return club.province || club.country || null;
        })
        .filter(reg => reg !== null && typeof reg === 'string' && reg.trim() !== '')
        .sort()
    ))];
  }, [clubs]);

  // Filter clubs based on search and region
  const filteredClubs = useMemo(() => {
    console.log('[App] Filtering clubs:', { 
      totalClubs: clubs?.length || 0, 
      region, 
      searchTerm,
      favoritesCount: favorites.length 
    });
    
    if (!clubs || clubs.length === 0) {
      console.log('[App] No clubs to filter');
      return [];
    }
    
    const currentRegion = region || 'All Regions';
    const currentSearchTerm = (searchTerm || '').trim();
    
    const filtered = clubs
      .filter(club => {
        if (!club || !club.name) {
          console.log('[App] Filtering out club (no name):', club);
          return false;
        }
        const matchesSearch = currentSearchTerm === '' || club.name.toLowerCase().includes(currentSearchTerm.toLowerCase());
        const matchesRegion = currentRegion === 'All Regions' || 
          (club.province && club.province === currentRegion) || 
          (club.country && club.country === currentRegion);
        
        if (!matchesSearch) {
          console.log('[App] Club filtered out (search):', club.name);
        }
        if (!matchesRegion) {
          console.log('[App] Club filtered out (region):', club.name, 'region:', club.province || club.country, 'filter:', currentRegion);
        }
        
        return matchesSearch && matchesRegion;
      })
      .sort((a, b) => {
        // Sort favorites first
        const aFav = a && a.id && favorites.includes(a.id);
        const bFav = b && b.id && favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        if (!a || !a.name) return 1;
        if (!b || !b.name) return -1;
        return a.name.localeCompare(b.name);
      });
    
    console.log('[App] Filtered clubs result:', { 
      before: clubs.length, 
      after: filtered.length,
      clubNames: filtered.map(c => c.name)
    });
    
    return filtered;
  }, [clubs, region, searchTerm, favorites]);

  const toggleFavorite = (clubId) => {
    const newFavorites = favorites.includes(clubId)
      ? favorites.filter(id => id !== clubId)
      : [...favorites, clubId];
    setFavorites(newFavorites);
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setClubs([]);
    setSearchTerm('');
    setRegion('All Regions');
    setFavorites([]);
    setShowEmailModal(false);
    setEmail('');
    setPassword('');
    setName('');
    setSurname('');
    setStep('email');
  };

  // Show club detail screen if a club is selected
  if (isAuthenticated && selectedClub) {
    // Use backgroundColor from club settings, default to #052333 if not set or empty
    const clubBgColor = selectedClub.backgroundColor;
    const backgroundColor = (clubBgColor && typeof clubBgColor === 'string' && clubBgColor.trim() !== '') 
      ? clubBgColor.trim() 
      : '#052333';
    
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={[styles.clubDetailContainer, { backgroundColor }]}>
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={() => setSelectedClub(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.clubDetailContent}>
            <Text style={styles.clubDetailTitle}>{selectedClub.name}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Clubs List Screen - Shown when authenticated */}
      {isAuthenticated ? (
        <View style={styles.container}>
          <StatusBar style="light" />
          {/* Header */}
          <View style={styles.clubsHeaderContainer}>
            <View style={styles.clubsHeaderContent}>
              <View style={styles.clubsHeaderTop}>
                <TouchableOpacity 
                  style={styles.backButtonHeader}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.clubsLogoRow}>
                  <View style={styles.clubsLogoRowIcon}>
                    <OpenActiveIcon name="open-o" size={20} color="#ffffff" opacity={1.0} />
                  </View>
                  <View style={styles.clubsLogoRowIcon}>
                    <OpenActiveIcon name="open-p" size={20} color="#ffffff" opacity={1.0} />
                  </View>
                  <View style={styles.clubsLogoRowIcon}>
                    <OpenActiveIcon name="open-e" size={20} color="#ffffff" opacity={1.0} />
                  </View>
                  <View style={styles.clubsLogoRowIcon}>
                    <OpenActiveIcon name="open-n" size={20} color="#ffffff" opacity={1.0} />
                  </View>
                </View>
              </View>
              
              {/* Region Selector */}
              <View style={styles.regionSelectorContainer}>
                <TouchableOpacity
                  style={styles.regionSelector}
                  onPress={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.regionSelectorText}>{region || 'All Regions'}</Text>
                  <Text style={styles.regionDropdownArrow}>{isRegionDropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                
                {isRegionDropdownOpen && (
                  <View style={styles.regionDropdown}>
                    <ScrollView style={styles.regionDropdownScroll}>
                      {availableRegions.map((reg) => (
                        <TouchableOpacity
                          key={reg}
                          style={[
                            styles.regionDropdownItem,
                            (region || 'All Regions') === reg && styles.regionDropdownItemActive
                          ]}
                          onPress={() => {
                            setRegion(reg);
                            setIsRegionDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.regionDropdownItemText}>{reg}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Search Box */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={[
                    styles.searchInput,
                    searchTerm && styles.searchInputFilled
                  ]}
                  placeholder="Search Club"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
                <View style={styles.searchIcon}>
                  <Text style={styles.searchIconText}>🔍</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.clubsContent}
            contentContainerStyle={styles.clubsContentContainer}
          >
            {loadingClubs ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading clubs...</Text>
              </View>
            ) : clubs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No clubs available at the moment.
                </Text>
                <Text style={[styles.emptyText, { marginTop: 10, fontSize: 12, opacity: 0.7 }]}>
                  Check console for errors
                </Text>
              </View>
            ) : filteredClubs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchTerm || region !== 'All Regions' ? 'No clubs found matching your filters.' : 'No clubs available at the moment.'}
                </Text>
                <Text style={[styles.emptyText, { marginTop: 10, fontSize: 12, opacity: 0.7 }]}>
                  Total clubs: {clubs.length}
                </Text>
              </View>
            ) : (
              <View style={styles.clubsList}>
                {filteredClubs.map((club) => (
                  <TouchableOpacity
                    key={club.id}
                    style={styles.clubCard}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedClub(club);
                    }}
                  >
                    {/* Club Image/Logo Area */}
                    <View style={styles.clubImageContainer}>
                      {club.backgroundImage || club.logo ? (
                        <ExpoImage
                          source={{ uri: club.backgroundImage || club.logo }}
                          style={styles.clubImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.clubImage, styles.clubImagePlaceholder]} />
                      )}
                      
                      {/* Favorite Heart Icon */}
                      <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFavorite(club.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.favoriteIconContainer}>
                          <Text style={styles.favoriteIcon}>
                            {favorites.includes(club.id) ? '❤️' : '🤍'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      
                      {/* Court Count Badge */}
                      {club.numberOfCourts !== undefined && (
                        <View style={styles.courtCountBadge}>
                          <Text style={styles.courtCountIcon}>⚾</Text>
                          <Text style={styles.courtCountText}>{club.numberOfCourts || 0}</Text>
                        </View>
                      )}
                      
                      {/* Club Name Overlay */}
                      <View style={styles.clubNameOverlay}>
                        <Text style={styles.clubNameOverlayText}>{club.name}</Text>
                      </View>
                    </View>
                    
                    {/* Location Info */}
                    <View style={styles.clubLocationContainer}>
                      <Text style={styles.locationIcon}>📍</Text>
                      <Text style={styles.clubLocationText}>
                        {club.address || club.description || [club.province, club.country].filter(Boolean).join(', ') || 'Location not specified'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      ) : showEmailModal ? (
        /* Email Input Screen - Full Page */
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
  clubsHeaderContainer: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#052333',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  clubsHeaderContent: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  clubsHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  backButtonHeader: {
    position: 'absolute',
    left: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  clubsLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 8,
  },
  clubsLogoRowIcon: {
    marginHorizontal: 0,
  },
  regionSelectorContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  regionSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    padding: 12,
    paddingHorizontal: 15,
  },
  regionSelectorText: {
    color: '#ffffff',
    fontSize: 14,
  },
  regionDropdownArrow: {
    color: '#ffffff',
    fontSize: 12,
  },
  regionDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#052333',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginTop: 4,
    maxHeight: 300,
    zIndex: 1000,
    elevation: 5,
  },
  regionDropdownScroll: {
    maxHeight: 300,
  },
  regionDropdownItem: {
    padding: 12,
    paddingHorizontal: 15,
  },
  regionDropdownItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  regionDropdownItemText: {
    color: '#ffffff',
    fontSize: 14,
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: 16,
    paddingRight: 48,
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    fontSize: 16,
    fontFamily: 'Poppins',
    backgroundColor: 'transparent',
    color: '#ffffff',
  },
  searchInputFilled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    color: '#052333',
  },
  searchIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -9 }],
  },
  searchIconText: {
    fontSize: 18,
  },
  clubsContent: {
    flex: 1,
  },
  clubsContentContainer: {
    padding: 20,
  },
  clubsList: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  clubCard: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
  },
  clubImageContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  clubImage: {
    width: '100%',
    height: '100%',
  },
  clubImagePlaceholder: {
    backgroundColor: '#667eea',
  },
  favoriteButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 2,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 20,
  },
  courtCountBadge: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 4,
    padding: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  courtCountIcon: {
    fontSize: 14,
  },
  courtCountText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clubNameOverlay: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    zIndex: 1,
  },
  clubNameOverlayText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'Poppins',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  clubLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  locationIcon: {
    fontSize: 16,
  },
  clubLocationText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Poppins',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
  },
  favoriteIconContainer: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubDetailContainer: {
    flex: 1,
    backgroundColor: '#052333',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  clubDetailContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubDetailTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
});
