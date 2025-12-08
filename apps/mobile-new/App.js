import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, Animated, TextInput, Modal, FlatList, Image } from 'react-native';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [showBurgerMenu, setShowBurgerMenu] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [bookingType, setBookingType] = useState('singles'); // 'singles', 'doubles', 'coaching'
  const [selectedPlayers, setSelectedPlayers] = useState([null, null, null, null]);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [logoError, setLogoError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [dateScrollIndex, setDateScrollIndex] = useState(0);
  
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
          setCurrentUser(session.user);
          
          // Get user's name from Users table
          try {
            const { data: userData } = await supabase
              .from('Users')
              .select('name, Firstname, Surname')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (userData) {
              const name = userData.name || 
                          (userData.Firstname && userData.Surname 
                            ? `${userData.Firstname} ${userData.Surname}` 
                            : userData.Firstname || userData.Surname || '');
              setUserName(name || session.user.email?.split('@')[0] || 'User');
            } else {
              setUserName(session.user.email?.split('@')[0] || 'User');
            }
          } catch (err) {
            console.error('[App] Error loading user name:', err);
            setUserName(session.user.email?.split('@')[0] || 'User');
          }
          
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
          .select('id, name, numberOfCourts, country, province, logo, backgroundImage, backgroundColor, fontColor, selectedColor, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration')
          .order('name', { ascending: true });
        
        if (!result.error && result.data) {
          clubsData = result.data;
          console.log('[App] Step 3 - Added branding and booking columns:', { 
            count: clubsData.length 
          });
        }
      }

      // Try filtering by is_active if we have clubs
      if (!error && clubsData && clubsData.length > 0) {
        result = await supabase
          .from('Clubs')
          .select('id, name, numberOfCourts, country, province, logo, backgroundImage, backgroundColor, fontColor, selectedColor, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration')
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
        // Debug: Log first club's structure
        if (clubsData && clubsData.length > 0) {
          console.log('[DEBUG] First club data structure:', JSON.stringify(clubsData[0], null, 2));
          console.log('[DEBUG] First club backgroundImage:', clubsData[0].backgroundImage, 'type:', typeof clubsData[0].backgroundImage);
          console.log('[DEBUG] First club logo:', clubsData[0].logo, 'type:', typeof clubsData[0].logo);
        }
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
          
          // Get user's name from Users table
          try {
            const { data: userData } = await supabase
              .from('Users')
              .select('name, Firstname, Surname')
              .eq('id', data.user.id)
              .maybeSingle();
            
            if (userData) {
              const name = userData.name || 
                          (userData.Firstname && userData.Surname 
                            ? `${userData.Firstname} ${userData.Surname}` 
                            : userData.Firstname || userData.Surname || '');
              setUserName(name || data.user.email?.split('@')[0] || 'User');
            } else {
              setUserName(data.user.email?.split('@')[0] || 'User');
            }
          } catch (err) {
            console.error('[App] Error loading user name:', err);
            setUserName(data.user.email?.split('@')[0] || 'User');
          }
          
          // Load clubs and navigate to clubs list
          setIsAuthenticated(true);
          setCurrentUser(data.user);
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
          
          // Get user's name from Users table
          try {
            const { data: userData } = await supabase
              .from('Users')
              .select('name, Firstname, Surname')
              .eq('id', data.user.id)
              .maybeSingle();
            
            if (userData) {
              const name = userData.name || 
                          (userData.Firstname && userData.Surname 
                            ? `${userData.Firstname} ${userData.Surname}` 
                            : userData.Firstname || userData.Surname || '');
              setUserName(name || data.user.email?.split('@')[0] || 'User');
            } else {
              setUserName(data.user.email?.split('@')[0] || 'User');
            }
          } catch (err) {
            console.error('[App] Error loading user name:', err);
            setUserName(data.user.email?.split('@')[0] || 'User');
          }
          
          // Load clubs and navigate to clubs list
          setIsAuthenticated(true);
          setCurrentUser(data.user);
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

  const handleQuickLogin = async () => {
    const testEmail = 'jb@openactive.co.za';
    const testPassword = 'Su5ver303#';
    
    setError('');
    setIsLoading(true);
    
    try {
      const supabase = getSupabaseClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (authError) {
        setError(authError.message || 'Quick login failed.');
        setIsLoading(false);
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
        
        // Get user's name from Users table
        try {
          const { data: userData } = await supabase
            .from('Users')
            .select('name, Firstname, Surname')
            .eq('id', data.user.id)
            .maybeSingle();
          
          if (userData) {
            const name = userData.name || 
                        (userData.Firstname && userData.Surname 
                          ? `${userData.Firstname} ${userData.Surname}` 
                          : userData.Firstname || userData.Surname || '');
            setUserName(name || data.user.email?.split('@')[0] || 'User');
          } else {
            setUserName(data.user.email?.split('@')[0] || 'User');
          }
        } catch (err) {
          console.error('[App] Error loading user name:', err);
          setUserName(data.user.email?.split('@')[0] || 'User');
        }
        
        // Load clubs and navigate to clubs list
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        setShowEmailModal(false);
        setEmail('');
        setPassword('');
        setStep('email');
        await loadClubs();
      }
    } catch (err) {
      console.error('Quick login error:', err);
      setError(err.message || 'Quick login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserName('');
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
    setSelectedClub(null);
  };

  // Load available players when player selection screen is shown
  useEffect(() => {
    const loadPlayers = async () => {
      if (!showPlayerSelection || !selectedClub?.id) return;
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('Users')
          .select('id, Firstname, Surname, email')
          .order('Firstname', { ascending: true })
          .limit(100);
        
        if (data) {
          const players = data.map(u => ({
            id: u.id,
            name: u.Firstname && u.Surname 
              ? `${u.Firstname} ${u.Surname}`
              : u.Firstname || u.Surname || u.email?.split('@')[0] || 'User',
            email: u.email || ''
          }));
          setAvailablePlayers(players);
          // For now, all users can be coaches. Later you can filter by role if needed
          setCoaches(players);
        }
      } catch (err) {
        console.error('Error loading players:', err);
      }
    };
    
    loadPlayers();
  }, [showPlayerSelection, selectedClub?.id]);
  
  // Set current user as first player when player selection opens
  useEffect(() => {
    if (showPlayerSelection && currentUser && currentUser.id) {
      const supabase = getSupabaseClient();
      supabase
        .from('Users')
        .select('id, Firstname, Surname, email')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const name = data.Firstname && data.Surname 
              ? `${data.Firstname} ${data.Surname}`
              : data.Firstname || data.Surname || data.email?.split('@')[0] || 'User';
            const newPlayers = [...selectedPlayers];
            newPlayers[0] = { id: data.id, name };
            setSelectedPlayers(newPlayers);
          }
        });
    }
  }, [showPlayerSelection, currentUser]);

  // Auto-select time when date is selected (for club detail page)
  // This hook must be at the top level, not inside conditional blocks
  useEffect(() => {
    if (isAuthenticated && selectedClub && selectedDate) {
      // Get booking settings from selected club
      const openingTime = selectedClub.openingTime || '06:00';
      const closingTime = selectedClub.closingTime || '22:00';
      let bookingSlotInterval = 60;
      const intervalValue = selectedClub.bookingSlotInterval;
      if (intervalValue !== null && intervalValue !== undefined) {
        if (typeof intervalValue === 'number') {
          bookingSlotInterval = intervalValue;
        } else {
          const parsed = parseInt(String(intervalValue), 10);
          if (!isNaN(parsed) && parsed > 0) {
            bookingSlotInterval = parsed;
          }
        }
      }
      
      // Generate time slots
      const generateTimeSlots = () => {
        const slots = [];
        const [openHour, openMinute] = openingTime.split(':').map(Number);
        const [closeHour, closeMinute] = closingTime.split(':').map(Number);
        const startMinutes = openHour * 60 + openMinute;
        const endMinutes = closeHour * 60 + closeMinute;
        for (let minutes = startMinutes; minutes < endMinutes; minutes += bookingSlotInterval) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          slots.push(time);
        }
        return slots;
      };
      
      const timeSlots = generateTimeSlots();
      
      if (timeSlots && timeSlots.length > 0 && !selectedTime) {
        const findClosestTime = (slots, dateString) => {
          if (!slots || slots.length === 0) return null;
          const today = new Date();
          const selectedDate = new Date(dateString);
          const isToday = selectedDate.toDateString() === today.toDateString();
          if (!isToday) {
            return slots[0];
          }
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          for (const time of slots) {
            const [hours, minutes] = time.split(':').map(Number);
            const timeMinutes = hours * 60 + minutes;
            if (timeMinutes >= currentMinutes) {
              return time;
            }
          }
          return slots[slots.length - 1];
        };
        
        const closestTime = findClosestTime(timeSlots, selectedDate);
        if (closestTime) {
          setSelectedTime(closestTime);
        }
      }
    }
  }, [isAuthenticated, selectedClub, selectedDate, selectedTime]);
  
  // Reset logo error when club changes
  useEffect(() => {
    setLogoError(false);
  }, [selectedClub?.id]);
  
  // Filter players based on search term
  const filteredPlayers = useMemo(() => {
    if (!playerSearchTerm.trim()) return availablePlayers.slice(0, 10);
    const term = playerSearchTerm.toLowerCase();
    return availablePlayers
      .filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.email.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [availablePlayers, playerSearchTerm]);
  
  const handleSelectPlayer = (playerIndex, player) => {
    const newPlayers = [...selectedPlayers];
    newPlayers[playerIndex] = player;
    setSelectedPlayers(newPlayers);
    setShowPlayerDropdown(null);
    setPlayerSearchTerm('');
  };
  
  const handleAddGuest = (playerIndex) => {
    const newPlayers = [...selectedPlayers];
    newPlayers[playerIndex] = { id: 'guest', name: 'Guest' };
    setSelectedPlayers(newPlayers);
    setShowPlayerDropdown(null);
  };

  // Show player selection screen if booking details are set
  if (isAuthenticated && selectedClub && showPlayerSelection && bookingDetails) {
    const clubBgColor = selectedClub.backgroundColor;
    const backgroundColor = (clubBgColor && typeof clubBgColor === 'string' && clubBgColor.trim() !== '') 
      ? clubBgColor.trim() 
      : '#052333';
    const fontColor = (selectedClub.fontColor && typeof selectedClub.fontColor === 'string' && selectedClub.fontColor.trim() !== '') 
      ? selectedClub.fontColor.trim() 
      : '#ffffff';
    const selectedColor = (selectedClub.selectedColor && typeof selectedClub.selectedColor === 'string' && selectedClub.selectedColor.trim() !== '') 
      ? selectedClub.selectedColor.trim() 
      : '#667eea';

    return (
      <View style={[styles.container, { backgroundColor }]}>
        <StatusBar style="light" />
        {/* White Header */}
        <View style={styles.clubHeader}>
          <View style={styles.clubHeaderLogo}>
            {(() => {
              let logoUri = null;
              
              if (selectedClub && typeof selectedClub === 'object' && selectedClub.logo && typeof selectedClub.logo === 'string') {
                const trimmed = selectedClub.logo.trim();
                if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
                  logoUri = trimmed;
                }
              }
              
              console.log('[App] ClubDetail Logo rendering check:', {
                hasSelectedClub: !!selectedClub,
                clubId: selectedClub?.id,
                logoValue: selectedClub?.logo,
                logoType: typeof selectedClub?.logo,
                logoUri,
                logoError
              });
              
              if (logoUri && !logoError) {
                console.log('[App] ClubDetail Rendering logo image:', logoUri);
                return (
                  <Image
                    key={`header-logo-${selectedClub.id || 'unknown'}`}
                    source={{ uri: logoUri }}
                    style={styles.clubHeaderLogoImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.log('[App] ClubDetail Logo failed to load:', logoUri, error);
                      console.log('[App] Error details:', JSON.stringify(error, null, 2));
                      setLogoError(true);
                    }}
                    onLoad={() => {
                      console.log('[App] ClubDetail Logo loaded successfully:', logoUri);
                      setLogoError(false);
                    }}
                    onLoadStart={() => {
                      console.log('[App] ClubDetail Logo loading started:', logoUri);
                    }}
                  />
                );
              }
              
              // Fallback to OpenActive icons if no logo is set or logo failed to load
              console.log('[App] ClubDetail Rendering OpenActive icons fallback');
              return (
                <View style={styles.clubHeaderLogoIcons}>
                  <OpenActiveIcon name="open-o" size={24} color="#052333" opacity={1.0} />
                  <OpenActiveIcon name="open-p" size={24} color="#052333" opacity={1.0} />
                  <OpenActiveIcon name="open-e" size={24} color="#052333" opacity={1.0} />
                  <OpenActiveIcon name="open-n" size={24} color="#052333" opacity={1.0} />
                </View>
              );
            })()}
          </View>
          <View style={styles.clubHeaderRight}>
            <TouchableOpacity
              style={styles.burgerMenuButton}
              onPress={() => setShowBurgerMenu(!showBurgerMenu)}
              activeOpacity={0.7}
            >
              <View style={styles.burgerMenuIcon}>
                <View style={styles.burgerLine} />
                <View style={styles.burgerLine} />
                <View style={styles.burgerLine} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              activeOpacity={0.7}
            >
              <View style={styles.profilePicture}>
                <Text style={styles.profileInitials}>
                  {userName ? userName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={[styles.clubDetailContainer, { backgroundColor }]}
          contentContainerStyle={styles.clubDetailScrollContent}
        >
          <View style={styles.clubDetailContent}>
            <Text style={[styles.clubDetailTitle, { color: fontColor, textAlign: 'center', marginBottom: 30 }]}>Select players</Text>
            
            {/* Booking Details Summary Card */}
            {bookingDetails && bookingDetails.date && (
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                padding: 16,
                marginBottom: 30,
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'center',
                borderLeftWidth: 3,
                borderRightWidth: 3,
                borderLeftColor: selectedColor,
                borderRightColor: selectedColor
              }}>
                <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255, 255, 255, 0.2)' }}>
                  <Text style={{ fontSize: 14, color: fontColor, opacity: 0.8, marginBottom: 4 }}>
                    {new Date(bookingDetails.date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: fontColor }}>
                    {new Date(bookingDetails.date).getDate()} {new Date(bookingDetails.date).toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                </View>
                {bookingDetails.time && (
                  <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255, 255, 255, 0.2)' }}>
                    <Text style={{ fontSize: 14, color: fontColor, opacity: 0.8, marginBottom: 4 }}>
                      Start
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: fontColor }}>
                      {bookingDetails.time}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: fontColor, opacity: 0.8, marginBottom: 4 }}>
                    Court {bookingDetails.court}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: fontColor }}>
                    {bookingDetails.duration} min
                  </Text>
                </View>
              </View>
            )}

            {/* Game Type Selection */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 30 }}>
              <TouchableOpacity
                onPress={() => setBookingType('singles')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: bookingType === 'singles' ? selectedColor : '#ffffff',
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: bookingType === 'singles' ? selectedColor : 'rgba(5, 35, 51, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 20 }}>👤</Text>
                <Text style={{ fontSize: 16, fontWeight: '500', color: bookingType === 'singles' ? '#ffffff' : '#052333' }}>
                  Singles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBookingType('doubles')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: bookingType === 'doubles' ? selectedColor : '#ffffff',
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: bookingType === 'doubles' ? selectedColor : 'rgba(5, 35, 51, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 20 }}>👥</Text>
                <Text style={{ fontSize: 16, fontWeight: '500', color: bookingType === 'doubles' ? '#ffffff' : '#052333' }}>
                  Doubles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBookingType('coaching')}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: bookingType === 'coaching' ? selectedColor : '#ffffff',
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: bookingType === 'coaching' ? selectedColor : 'rgba(5, 35, 51, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 20 }}>🏆</Text>
                <Text style={{ fontSize: 16, fontWeight: '500', color: bookingType === 'coaching' ? '#ffffff' : '#052333' }}>
                  Coaching
                </Text>
              </TouchableOpacity>
            </View>

            {/* Player Selection Fields */}
            <View style={{ marginBottom: 30 }}>
              {bookingType === 'singles' && (
                <>
                  {/* Player 1 */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 6,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 2,
                      borderColor: selectedPlayers[0] ? selectedColor : 'rgba(5, 35, 51, 0.2)'
                    }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: selectedPlayers[0] ? selectedColor : 'rgba(5, 35, 51, 0.1)',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Text style={{
                          color: selectedPlayers[0] ? '#ffffff' : '#052333',
                          fontWeight: '600',
                          fontSize: 16
                        }}>
                          {selectedPlayers[0] ? selectedPlayers[0].name.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                      {selectedPlayers[0] ? (
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#052333', fontSize: 16, fontWeight: '500' }}>
                            {selectedPlayers[0].name}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flex: 1, position: 'relative' }}>
                          <TextInput
                            placeholder="Type players name & select"
                            placeholderTextColor="#999"
                            value={showPlayerDropdown === 0 ? playerSearchTerm : ''}
                            onChangeText={(text) => {
                              setPlayerSearchTerm(text);
                              setShowPlayerDropdown(0);
                            }}
                            onFocus={() => setShowPlayerDropdown(0)}
                            style={{ flex: 1, fontSize: 16, color: '#052333' }}
                          />
                          {showPlayerDropdown === 0 && filteredPlayers.length > 0 && (
                            <View style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              backgroundColor: '#ffffff',
                              borderRadius: 6,
                              marginTop: 4,
                              maxHeight: 200,
                              zIndex: 1000,
                              borderWidth: 1,
                              borderColor: 'rgba(5, 35, 51, 0.2)',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.25,
                              shadowRadius: 3.84,
                              elevation: 5
                            }}>
                              <FlatList
                                data={filteredPlayers}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                  <TouchableOpacity
                                    onPress={() => handleSelectPlayer(0, item)}
                                    style={{
                                      padding: 12,
                                      borderBottomWidth: 1,
                                      borderBottomColor: 'rgba(5, 35, 51, 0.1)',
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 12
                                    }}
                                  >
                                    <View style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      backgroundColor: selectedColor,
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
                                        {item.name.charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ color: '#052333', fontSize: 14, fontWeight: '500' }}>
                                        {item.name}
                                      </Text>
                                      <Text style={{ color: '#666', fontSize: 12 }}>
                                        {item.email}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                )}
                              />
                              <TouchableOpacity
                                onPress={() => handleAddGuest(0)}
                                style={{
                                  padding: 12,
                                  borderTopWidth: 1,
                                  borderTopColor: 'rgba(5, 35, 51, 0.1)',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 12
                                }}
                              >
                                <View style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: '#052333',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
                                    G
                                  </Text>
                                </View>
                                <Text style={{ color: '#052333', fontSize: 14, fontWeight: '500' }}>
                                  Guest
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}
                      {selectedPlayers[0] && (
                        <TouchableOpacity
                          onPress={() => {
                            const newPlayers = [...selectedPlayers];
                            newPlayers[0] = null;
                            setSelectedPlayers(newPlayers);
                          }}
                        >
                          <Text style={{ color: '#666', fontSize: 20 }}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {/* Player 2 */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 6,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 2,
                      borderColor: selectedPlayers[1] ? selectedColor : 'rgba(5, 35, 51, 0.2)'
                    }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: selectedPlayers[1] ? selectedColor : 'rgba(5, 35, 51, 0.1)',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Text style={{
                          color: selectedPlayers[1] ? '#ffffff' : '#052333',
                          fontWeight: '600',
                          fontSize: 16
                        }}>
                          {selectedPlayers[1] ? (selectedPlayers[1].id === 'guest' ? 'G' : selectedPlayers[1].name.charAt(0).toUpperCase()) : '?'}
                        </Text>
                      </View>
                      {selectedPlayers[1] ? (
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#052333', fontSize: 16, fontWeight: '500' }}>
                            {selectedPlayers[1].name}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flex: 1, position: 'relative' }}>
                          <TextInput
                            placeholder="Type players name & select"
                            placeholderTextColor="#999"
                            value={showPlayerDropdown === 1 ? playerSearchTerm : ''}
                            onChangeText={(text) => {
                              setPlayerSearchTerm(text);
                              setShowPlayerDropdown(1);
                            }}
                            onFocus={() => setShowPlayerDropdown(1)}
                            style={{ flex: 1, fontSize: 16, color: '#052333' }}
                          />
                          {showPlayerDropdown === 1 && filteredPlayers.length > 0 && (
                            <View style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              backgroundColor: '#ffffff',
                              borderRadius: 6,
                              marginTop: 4,
                              maxHeight: 200,
                              zIndex: 1000,
                              borderWidth: 1,
                              borderColor: 'rgba(5, 35, 51, 0.2)',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.25,
                              shadowRadius: 3.84,
                              elevation: 5
                            }}>
                              <FlatList
                                data={filteredPlayers}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                  <TouchableOpacity
                                    onPress={() => handleSelectPlayer(1, item)}
                                    style={{
                                      padding: 12,
                                      borderBottomWidth: 1,
                                      borderBottomColor: 'rgba(5, 35, 51, 0.1)',
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 12
                                    }}
                                  >
                                    <View style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      backgroundColor: selectedColor,
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
                                        {item.name.charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ color: '#052333', fontSize: 14, fontWeight: '500' }}>
                                        {item.name}
                                      </Text>
                                      <Text style={{ color: '#666', fontSize: 12 }}>
                                        {item.email}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                )}
                              />
                              <TouchableOpacity
                                onPress={() => handleAddGuest(1)}
                                style={{
                                  padding: 12,
                                  borderTopWidth: 1,
                                  borderTopColor: 'rgba(5, 35, 51, 0.1)',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 12
                                }}
                              >
                                <View style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: '#052333',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
                                    G
                                  </Text>
                                </View>
                                <Text style={{ color: '#052333', fontSize: 14, fontWeight: '500' }}>
                                  Guest
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}
                      {selectedPlayers[1] && (
                        <TouchableOpacity
                          onPress={() => {
                            const newPlayers = [...selectedPlayers];
                            newPlayers[1] = null;
                            setSelectedPlayers(newPlayers);
                          }}
                        >
                          <Text style={{ color: '#666', fontSize: 20 }}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </>
              )}
              
              {bookingType === 'doubles' && (
                <>
                  {[0, 1, 2, 3].map((index) => (
                    <View key={index} style={{ marginBottom: 16 }}>
                      <View style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 6,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderWidth: 2,
                        borderColor: selectedPlayers[index] ? selectedColor : 'rgba(5, 35, 51, 0.2)'
                      }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: selectedPlayers[index] ? selectedColor : 'rgba(5, 35, 51, 0.1)',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Text style={{
                            color: selectedPlayers[index] ? '#ffffff' : '#052333',
                            fontWeight: '600',
                            fontSize: 16
                          }}>
                            {selectedPlayers[index] ? (selectedPlayers[index].id === 'guest' ? 'G' : selectedPlayers[index].name.charAt(0).toUpperCase()) : '?'}
                          </Text>
                        </View>
                        {selectedPlayers[index] ? (
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#052333', fontSize: 16, fontWeight: '500' }}>
                              {selectedPlayers[index].name}
                            </Text>
                          </View>
                        ) : (
                          <TextInput
                            placeholder="Type players name & select"
                            placeholderTextColor="#999"
                            value={showPlayerDropdown === index ? playerSearchTerm : ''}
                            onChangeText={(text) => {
                              setPlayerSearchTerm(text);
                              setShowPlayerDropdown(index);
                            }}
                            onFocus={() => setShowPlayerDropdown(index)}
                            style={{ flex: 1, fontSize: 16, color: '#052333' }}
                          />
                        )}
                        {selectedPlayers[index] && (
                          <TouchableOpacity
                            onPress={() => {
                              const newPlayers = [...selectedPlayers];
                              newPlayers[index] = null;
                              setSelectedPlayers(newPlayers);
                            }}
                          >
                            <Text style={{ color: '#666', fontSize: 20 }}>×</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}
              
              {bookingType === 'coaching' && (
                <>
                  <View style={{ marginBottom: 16 }}>
                    <View style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 6,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 2,
                      borderColor: selectedPlayers[0] ? selectedColor : 'rgba(5, 35, 51, 0.2)'
                    }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: selectedPlayers[0] ? selectedColor : 'rgba(5, 35, 51, 0.1)',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Text style={{
                          color: selectedPlayers[0] ? '#ffffff' : '#052333',
                          fontWeight: '600',
                          fontSize: 16
                        }}>
                          {selectedPlayers[0] ? selectedPlayers[0].name.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                      {selectedPlayers[0] ? (
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#052333', fontSize: 16, fontWeight: '500' }}>
                            {selectedPlayers[0].name}
                          </Text>
                        </View>
                      ) : (
                        <TextInput
                          placeholder="Type client name & select"
                          placeholderTextColor="#999"
                          value={playerSearchTerm}
                          onChangeText={setPlayerSearchTerm}
                          style={{ flex: 1, fontSize: 16, color: '#052333' }}
                        />
                      )}
                      {selectedPlayers[0] && (
                        <TouchableOpacity
                          onPress={() => {
                            const newPlayers = [...selectedPlayers];
                            newPlayers[0] = null;
                            setSelectedPlayers(newPlayers);
                          }}
                        >
                          <Text style={{ color: '#666', fontSize: 20 }}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {/* Coach Selection - List */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 6,
                      padding: 12,
                      borderWidth: 2,
                      borderColor: selectedPlayers[1] ? selectedColor : 'rgba(5, 35, 51, 0.2)'
                    }}>
                      {selectedPlayers[1] ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: selectedColor,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Text style={{
                              color: '#ffffff',
                              fontWeight: '600',
                              fontSize: 16
                            }}>
                              {selectedPlayers[1].name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#052333', fontSize: 16, fontWeight: '500' }}>
                              {selectedPlayers[1].name}
                            </Text>
                            <Text style={{ color: '#666', fontSize: 12 }}>
                              {selectedPlayers[1].email}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              const newPlayers = [...selectedPlayers];
                              newPlayers[1] = null;
                              setSelectedPlayers(newPlayers);
                            }}
                          >
                            <Text style={{ color: '#666', fontSize: 20 }}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <ScrollView style={{ maxHeight: 300 }}>
                          {coaches.map((coach) => (
                            <TouchableOpacity
                              key={coach.id}
                              onPress={() => handleSelectPlayer(1, coach)}
                              style={{
                                padding: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: 'rgba(5, 35, 51, 0.1)',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12
                              }}
                            >
                              <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: selectedColor,
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Text style={{
                                  color: '#ffffff',
                                  fontWeight: '600',
                                  fontSize: 16
                                }}>
                                  {coach.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#052333', fontSize: 16, fontWeight: '500' }}>
                                  {coach.name}
                                </Text>
                                <Text style={{ color: '#666', fontSize: 12 }}>
                                  {coach.email}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Navigation Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 40 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowPlayerSelection(false);
                  setBookingDetails(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  backgroundColor: '#ffffff',
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: 'rgba(5, 35, 51, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#052333' }}>
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  // TODO: Navigate to next step or create booking
                  console.log('Next step', { bookingType, selectedPlayers, bookingDetails });
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  backgroundColor: selectedColor,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: selectedColor,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#ffffff' }}>
                  Next step
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show club detail screen if a club is selected
  if (isAuthenticated && selectedClub) {
    // Use backgroundColor from club settings, default to #052333 if not set or empty
    const clubBgColor = selectedClub.backgroundColor;
    const backgroundColor = (clubBgColor && typeof clubBgColor === 'string' && clubBgColor.trim() !== '') 
      ? clubBgColor.trim() 
      : '#052333';
    
    // Get club colors
    const fontColor = (selectedClub.fontColor && typeof selectedClub.fontColor === 'string' && selectedClub.fontColor.trim() !== '') 
      ? selectedClub.fontColor.trim() 
      : '#ffffff';
    const selectedColor = (selectedClub.selectedColor && typeof selectedClub.selectedColor === 'string' && selectedClub.selectedColor.trim() !== '') 
      ? selectedClub.selectedColor.trim() 
      : '#667eea';
    const hoverColor = (selectedClub.hoverColor && typeof selectedClub.hoverColor === 'string' && selectedClub.hoverColor.trim() !== '') 
      ? selectedClub.hoverColor.trim() 
      : 'rgba(255, 255, 255, 0.2)';
    
    // Get booking settings
    const openingTime = selectedClub.openingTime || '06:00';
    const closingTime = selectedClub.closingTime || '22:00';
    let bookingSlotInterval = 60; // default
    const intervalValue = selectedClub.bookingSlotInterval;
    if (intervalValue !== null && intervalValue !== undefined) {
      if (typeof intervalValue === 'number') {
        bookingSlotInterval = intervalValue;
      } else {
        const parsed = parseInt(String(intervalValue), 10);
        if (!isNaN(parsed) && parsed > 0) {
          bookingSlotInterval = parsed;
        }
      }
    }
    
    // Parse sessionDuration (JSONB array)
    let sessionDuration = [60]; // default
    const durationValue = selectedClub.sessionDuration;
    if (durationValue !== null && durationValue !== undefined) {
      if (Array.isArray(durationValue)) {
        sessionDuration = durationValue;
      } else if (typeof durationValue === 'string') {
        try {
          const parsed = JSON.parse(durationValue);
          sessionDuration = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          const parsed = parseInt(String(durationValue), 10);
          if (!isNaN(parsed) && parsed > 0) {
            sessionDuration = [parsed];
          }
        }
      } else if (typeof durationValue === 'number') {
        sessionDuration = [durationValue];
      }
    }
    
    // Generate time slots
    const generateTimeSlots = () => {
      const slots = [];
      const [openHour, openMinute] = openingTime.split(':').map(Number);
      const [closeHour, closeMinute] = closingTime.split(':').map(Number);
      
      const startMinutes = openHour * 60 + openMinute;
      const endMinutes = closeHour * 60 + closeMinute;
      
      for (let minutes = startMinutes; minutes < endMinutes; minutes += bookingSlotInterval) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        slots.push(time);
      }
      
      return slots;
    };
    
    const timeSlots = generateTimeSlots();
    
    // Generate court numbers
    const numberOfCourts = selectedClub.numberOfCourts || 1;
    const courts = Array.from({ length: numberOfCourts }, (_, i) => i + 1);
    
    // Generate date buttons (next 14 days)
    const generateDateButtons = () => {
      const dates = [];
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = date.getDate();
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        
        dates.push({
          dateString,
          dayName,
          dayNumber,
          monthName,
          isToday: i === 0
        });
      }
      return dates;
    };
    
    const dateButtons = generateDateButtons();
    
    // Find the closest time to current time
    const findClosestTime = (timeSlots, selectedDateString) => {
      if (!timeSlots || timeSlots.length === 0) return null;
      
      const today = new Date();
      const selectedDate = new Date(selectedDateString);
      const isToday = selectedDate.toDateString() === today.toDateString();
      
      if (!isToday) {
        // For future dates, select the first time slot
        return timeSlots[0];
      }
      
      // For today, find the closest time that hasn't passed
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Find the first time slot that is >= current time
      for (const time of timeSlots) {
        const [hours, minutes] = time.split(':').map(Number);
        const timeMinutes = hours * 60 + minutes;
        
        if (timeMinutes >= currentMinutes) {
          return time;
        }
      }
      
      // If all times have passed, return the last time slot
      return timeSlots[timeSlots.length - 1];
    };
    
    const handleDateChange = (dateString) => {
      setSelectedDate(dateString);
      setSelectedCourt(null);
      setSelectedDuration(null);
      
      // Auto-select the closest time
      const closestTime = findClosestTime(timeSlots, dateString);
      setSelectedTime(closestTime);
    };
    
    // Note: Time auto-selection is handled in the top-level useEffect hook (line 798)
    
    const handleBooking = () => {
      if (selectedCourt && selectedTime && selectedDate) {
        // TODO: Implement booking logic
        Alert.alert('Booking', `Booking Court ${selectedCourt} on ${selectedDate} at ${selectedTime}`);
      }
    };
    
    // Get user initials for profile picture
    const userEmail = currentUser?.email || '';
    const userInitials = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.container}>
        <StatusBar style="light" />
        {/* White Header */}
        <View style={styles.clubHeader}>
          {/* Logo - Left */}
          <View style={styles.clubHeaderLogo}>
            {(() => {
              let logoUri = null;
              
              if (selectedClub && typeof selectedClub === 'object' && selectedClub.logo && typeof selectedClub.logo === 'string') {
                const trimmed = selectedClub.logo.trim();
                if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
                  logoUri = trimmed;
                }
              }
              
              console.log('[App] PlayerSelection Logo rendering check:', {
                hasSelectedClub: !!selectedClub,
                clubId: selectedClub?.id,
                logoValue: selectedClub?.logo,
                logoType: typeof selectedClub?.logo,
                logoUri,
                logoError
              });
              
              if (logoUri && !logoError) {
                console.log('[App] PlayerSelection Rendering logo image:', logoUri);
                return (
                  <Image
                    key={`header-logo-${selectedClub.id || 'unknown'}`}
                    source={{ uri: logoUri }}
                    style={styles.clubHeaderLogoImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.log('[App] PlayerSelection Logo failed to load:', logoUri, error);
                      console.log('[App] Error details:', JSON.stringify(error, null, 2));
                      setLogoError(true);
                    }}
                    onLoad={() => {
                      console.log('[App] PlayerSelection Logo loaded successfully:', logoUri);
                      setLogoError(false);
                    }}
                    onLoadStart={() => {
                      console.log('[App] PlayerSelection Logo loading started:', logoUri);
                    }}
                  />
                );
              }
              
              // Fallback to OpenActive icons if no logo is set or logo failed to load
              console.log('[App] PlayerSelection Rendering OpenActive icons fallback');
              return (
                <View style={styles.clubHeaderLogoIcons}>
                  <OpenActiveIcon name="open-o" size={24} color="#052333" opacity={1.0} />
                  <OpenActiveIcon name="open-p" size={24} color="#052333" opacity={1.0} />
                  <OpenActiveIcon name="open-e" size={24} color="#052333" opacity={1.0} />
                  <OpenActiveIcon name="open-n" size={24} color="#052333" opacity={1.0} />
                </View>
              );
            })()}
          </View>
          
          {/* Right side - Burger menu and profile */}
          <View style={styles.clubHeaderRight}>
            <TouchableOpacity
              style={styles.burgerMenuButton}
              onPress={() => setShowBurgerMenu(!showBurgerMenu)}
              activeOpacity={0.7}
            >
              <View style={styles.burgerMenuIcon}>
                <View style={styles.burgerLine} />
                <View style={styles.burgerLine} />
                <View style={styles.burgerLine} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              activeOpacity={0.7}
            >
              <View style={styles.profilePicture}>
                <Text style={styles.profileInitials}>{userInitials}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={[styles.clubDetailContainer, { backgroundColor }]}
          contentContainerStyle={styles.clubDetailScrollContent}
        >
          <View style={styles.clubDetailContent}>
            {/* Date Selection */}
            <View style={styles.dateSelectionContainer}>
              <View style={styles.dateButtonsContainer}>
                {/* Left Arrow */}
                {dateScrollIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.scrollArrow, { borderColor: fontColor + '33' }]}
                    onPress={() => setDateScrollIndex(Math.max(0, dateScrollIndex - 1))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.scrollArrowText, { color: fontColor }]}>‹</Text>
                  </TouchableOpacity>
                )}
                
                {/* Date Buttons */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.dateButtonsScroll}
                  contentContainerStyle={styles.dateButtonsGrid}
                >
                  {dateButtons.slice(dateScrollIndex, dateScrollIndex + 7).map((date) => (
                    <TouchableOpacity
                      key={date.dateString}
                      style={[
                        styles.dateButton,
                        selectedDate === date.dateString && { backgroundColor: selectedColor, borderColor: selectedColor }
                      ]}
                      onPress={() => handleDateChange(date.dateString)}
                      activeOpacity={0.7}
                    >
                      {date.isToday ? (
                        <Text style={[styles.dateButtonText, selectedDate === date.dateString && styles.dateButtonTextSelected]}>
                          Today
                        </Text>
                      ) : (
                        <>
                          <Text style={[styles.dateButtonText, selectedDate === date.dateString && styles.dateButtonTextSelected]}>
                            {date.dayName}
                          </Text>
                          <Text style={[styles.dateButtonText, styles.dateButtonTextBold, selectedDate === date.dateString && styles.dateButtonTextSelected]}>
                            {date.dayNumber}
                          </Text>
                          <Text style={[styles.dateButtonText, selectedDate === date.dateString && styles.dateButtonTextSelected]}>
                            {date.monthName}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Right Arrow */}
                {dateScrollIndex + 7 < dateButtons.length && (
                  <TouchableOpacity
                    style={[styles.scrollArrow, { borderColor: fontColor + '33' }]}
                    onPress={() => setDateScrollIndex(Math.min(dateButtons.length - 7, dateScrollIndex + 1))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.scrollArrowText, { color: fontColor }]}>›</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Time Selection */}
            {selectedDate && (
              <View style={styles.timeSelectionContainer}>
                <View style={styles.timeButtonsGrid}>
                  {timeSlots.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeButton,
                        selectedTime === time && { backgroundColor: selectedColor, borderColor: selectedColor }
                      ]}
                      onPress={() => setSelectedTime(time)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timeButtonText, selectedTime === time && styles.timeButtonTextSelected]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Court Selection */}
            <View style={styles.courtSelectionContainer}>
              <View style={styles.courtButtonsGrid}>
                {courts.map((courtNum) => (
                  <View 
                    key={courtNum} 
                    style={[
                      styles.courtCard,
                      {
                        backgroundColor: '#ffffff',
                        borderWidth: 0,
                        borderRadius: 3,
                        padding: 16
                      }
                    ]}
                  >
                    <View
                      style={[
                        styles.courtButton,
                        { 
                          backgroundColor: '#ffffff',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          width: '100%'
                        }
                      ]}
                    >
                      <View style={styles.courtButtonContent}>
                        <Text style={[styles.courtButtonText, { color: '#052333' }]}>
                          Court {courtNum}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Duration Selection - Always visible for all courts */}
                    {sessionDuration && sessionDuration.length > 0 && (
                      <View style={styles.durationSelectionContainer}>
                        <View style={styles.durationButtonsGrid}>
                          {sessionDuration.map((duration) => (
                            <TouchableOpacity
                              key={duration}
                              style={[
                                styles.durationButton,
                                selectedCourt === courtNum && selectedDuration === duration && { backgroundColor: selectedColor, borderColor: selectedColor },
                                { backgroundColor: selectedCourt === courtNum && selectedDuration === duration ? selectedColor : 'rgba(5, 35, 51, 0.1)' }
                              ]}
                              onPress={() => {
                                // Navigate to player selection
                                setBookingDetails({
                                  court: courtNum,
                                  date: selectedDate,
                                  time: selectedTime,
                                  duration: duration
                                });
                                setShowPlayerSelection(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.durationButtonText, 
                                selectedCourt === courtNum && selectedDuration === duration && styles.durationButtonTextSelected, 
                                { color: selectedCourt === courtNum && selectedDuration === duration ? '#ffffff' : '#052333' }
                              ]}>
                                {duration} min
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <Text style={[styles.courtButtonSubtext, { color: '#052333', opacity: 0.8 }]}>
                          Available: Singles & Doubles
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
        
        {/* Burger Menu Overlay */}
        {showBurgerMenu && (
          <View style={styles.burgerMenuOverlay}>
            <TouchableOpacity
              style={styles.burgerMenuBackdrop}
              activeOpacity={1}
              onPress={() => setShowBurgerMenu(false)}
            />
            <View style={styles.burgerMenuContent}>
              <View style={styles.burgerMenuHeader}>
                <Text style={styles.burgerMenuTitle} numberOfLines={1}>
                  {userName || 'User'}
                </Text>
                <TouchableOpacity
                  style={styles.burgerMenuClose}
                  onPress={() => setShowBurgerMenu(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.burgerMenuCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.burgerMenuList}>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>👤</Text>
                  <Text style={styles.burgerMenuItemText}>My Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>🎾</Text>
                  <Text style={styles.burgerMenuItemText}>Book a court</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>🏆</Text>
                  <Text style={styles.burgerMenuItemText}>Manage Matches</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>📅</Text>
                  <Text style={styles.burgerMenuItemText}>Events</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>📄</Text>
                  <Text style={styles.burgerMenuItemText}>Club Documents</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>👥</Text>
                  <Text style={styles.burgerMenuItemText}>Club Members</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>💰</Text>
                  <Text style={styles.burgerMenuItemText}>Finance</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>🎫</Text>
                  <Text style={styles.burgerMenuItemText}>Club Membership</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>📊</Text>
                  <Text style={styles.burgerMenuItemText}>Ranking</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.burgerMenuItem} 
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedClub(null);
                    setShowBurgerMenu(false);
                  }}
                >
                  <Text style={styles.burgerMenuIcon}>🔄</Text>
                  <Text style={styles.burgerMenuItemText}>Switch Club</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>❓</Text>
                  <Text style={styles.burgerMenuItemText}>Help</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.burgerMenuItem} activeOpacity={0.7}>
                  <Text style={styles.burgerMenuIcon}>🛒</Text>
                  <Text style={styles.burgerMenuItemText}>Tennis Store</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.burgerMenuItem} 
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowBurgerMenu(false);
                    handleLogout();
                  }}
                >
                  <Text style={styles.burgerMenuIcon}>🚪</Text>
                  <Text style={[styles.burgerMenuItemText, styles.burgerMenuItemLogout]}>Log Out</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
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
                      {(() => {
                        // Debug logging
                        if (club && club.id) {
                          console.log(`[DEBUG] Club ${club.id} image data:`, {
                            backgroundImage: club.backgroundImage,
                            backgroundImageType: typeof club.backgroundImage,
                            logo: club.logo,
                            logoType: typeof club.logo,
                            clubKeys: Object.keys(club || {})
                          });
                        }
                        
                        let imageUri = null;
                        
                        // Safely extract image URI
                        if (club && typeof club === 'object') {
                          if (club.backgroundImage) {
                            console.log('[DEBUG] backgroundImage value:', club.backgroundImage, 'type:', typeof club.backgroundImage);
                            if (typeof club.backgroundImage === 'string') {
                              const trimmed = club.backgroundImage.trim();
                              if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
                                imageUri = trimmed;
                              }
                            } else {
                              console.warn('[DEBUG] backgroundImage is not a string:', club.backgroundImage);
                            }
                          }
                          if (!imageUri && club.logo) {
                            console.log('[DEBUG] logo value:', club.logo, 'type:', typeof club.logo);
                            if (typeof club.logo === 'string') {
                              const trimmed = club.logo.trim();
                              if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
                                imageUri = trimmed;
                              }
                            } else {
                              console.warn('[DEBUG] logo is not a string:', club.logo);
                            }
                          }
                        }
                        
                        console.log('[DEBUG] Final imageUri:', imageUri, 'type:', typeof imageUri);
                        
                        // Render Image if we have a valid URI
                        if (imageUri && typeof imageUri === 'string' && imageUri.length > 0) {
                          const validUri = String(imageUri).trim();
                          if (validUri && (validUri.startsWith('http://') || validUri.startsWith('https://'))) {
                            return (
                              <Image
                                key={`club-image-${club.id || 'unknown'}`}
                                source={{ uri: validUri }}
                                style={styles.clubImage}
                                resizeMode="cover"
                              />
                            );
                          }
                        }
                        
                        // Fallback to placeholder
                        return (
                          <View style={[styles.clubImage, styles.clubImagePlaceholder]} />
                        );
                      })()}
                      
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
                      {club.numberOfCourts !== undefined && club.numberOfCourts !== null && (
                        <View style={styles.courtCountBadge}>
                          <Text style={styles.courtCountIcon}>⚾</Text>
                          <Text style={styles.courtCountText}>
                            {typeof club.numberOfCourts === 'number' ? club.numberOfCourts : 0}
                          </Text>
                        </View>
                      )}
                      
                      {/* Club Name Overlay */}
                      <View style={styles.clubNameOverlay}>
                        <Text style={styles.clubNameOverlayText}>
                          {club.name && typeof club.name === 'string' ? club.name : 'Club'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Location Info */}
                    <View style={styles.clubLocationContainer}>
                      <Text style={styles.locationIcon}>📍</Text>
                      <Text style={styles.clubLocationText}>
                        {(() => {
                          const address = club.address && typeof club.address === 'string' ? club.address : null;
                          const description = club.description && typeof club.description === 'string' ? club.description : null;
                          const province = club.province && typeof club.province === 'string' ? club.province : null;
                          const country = club.country && typeof club.country === 'string' ? club.country : null;
                          return address || description || [province, country].filter(Boolean).join(', ') || 'Location not specified';
                        })()}
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

            {/* Temporary Quick Login Button for Testing */}
            <TouchableOpacity 
              style={[styles.socialButton, styles.quickLoginButton]}
              onPress={handleQuickLogin}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <Text style={styles.quickLoginButtonText}>⚡ Quick Login (Test)</Text>
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
  quickLoginButton: {
    backgroundColor: '#667eea',
    marginTop: 12,
  },
  quickLoginButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
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
    // Using system default font
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
    // Using system default font
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
    // Using system default font
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
  clubHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clubHeaderLogo: {
    flexShrink: 0,
    minWidth: 100,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  clubHeaderLogoImage: {
    height: 60,
    width: 200,
    maxWidth: 200,
  },
  clubHeaderLogoIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
  },
  clubHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  burgerMenuButton: {
    padding: 8,
  },
  burgerMenuIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  burgerLine: {
    height: 2,
    backgroundColor: '#052333',
    borderRadius: 1,
    width: '100%',
  },
  profileButton: {
    padding: 4,
  },
  profilePicture: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#052333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    // Using system default font
  },
  clubDetailContainer: {
    flex: 1,
    backgroundColor: '#052333',
  },
  clubDetailScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  clubDetailContent: {
    alignItems: 'center',
  },
  clubDetailTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    // Using system default font
    marginBottom: 30,
  },
  dateSelectionContainer: {
    marginBottom: 30,
    width: '100%',
  },
  dateButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollArrow: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 3,
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArrowText: {
    fontSize: 20,
    fontWeight: '600',
  },
  dateButtonsScroll: {
    flex: 1,
  },
  dateButtonsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  dateButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  dateButtonText: {
    fontSize: 12,
    color: '#052333',
    // Using system default font
  },
  dateButtonTextBold: {
    fontWeight: '600',
    fontSize: 14,
  },
  dateButtonTextSelected: {
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    // Using system default font
  },
  timeSelectionContainer: {
    marginBottom: 30,
    width: '100%',
  },
  timeButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  timeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 55,
  },
  timeButtonText: {
    fontSize: 15,
    color: '#052333',
    // Using system default font
    fontWeight: '500',
  },
  timeButtonTextSelected: {
    color: '#ffffff',
  },
  courtSelectionContainer: {
    marginBottom: 30,
    width: '100%',
  },
  courtButtonsGrid: {
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  courtButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  courtButtonText: {
    fontSize: 15,
    color: '#052333',
    // Using system default font
    fontWeight: '500',
  },
  courtButtonTextSelected: {
    color: '#ffffff',
  },
  courtButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  courtButtonSubtext: {
    fontSize: 11,
    color: '#052333',
    // Using system default font
    opacity: 0.8,
  },
  courtButtonSubtextSelected: {
    color: '#ffffff',
    opacity: 0.9,
  },
  courtCard: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  durationSelectionContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  durationTitle: {
    fontSize: 14,
    fontWeight: '500',
    // Using system default font
    marginBottom: 4,
  },
  durationButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  durationButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  durationButtonText: {
    fontSize: 14,
    // Using system default font
    fontWeight: '500',
  },
  durationButtonTextSelected: {
    color: '#ffffff',
  },
  bookButtonContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  bookButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '600',
    // Using system default font
  },
  burgerMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  burgerMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  burgerMenuContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  burgerMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  burgerMenuTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#052333',
    // Using system default font
  },
  burgerMenuClose: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  burgerMenuCloseText: {
    fontSize: 24,
    color: '#052333',
    fontWeight: '300',
  },
  burgerMenuList: {
    flex: 1,
  },
  burgerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  burgerMenuIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  burgerMenuItemText: {
    fontSize: 16,
    color: '#052333',
    // Using system default font
    flex: 1,
  },
  burgerMenuItemLogout: {
    color: '#e20761',
    fontWeight: '600',
  },
});
