import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import * as Font from 'expo-font';

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

function OpenActiveIcon({ name, size = 32, color = '#ffffff', opacity = 0.8 }) {
  const iconChar = iconMap[name];
  if (!iconChar) return null;
  
  return (
    <Text style={{ 
      fontFamily: 'openactive', // Must match font-family in style.css: "openactive"
      fontSize: size, 
      color: color, 
      opacity: opacity,
      lineHeight: size,
      textAlign: 'center',
      includeFontPadding: false, // Remove extra padding
      textAlignVertical: 'center',
    }}>
      {iconChar}
    </Text>
  );
}

export default function App() {
  const [fontLoaded, setFontLoaded] = useState(false);

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

  const handleGooglePress = () => {
    Alert.alert('Coming Soon', 'Google sign-in will be available soon');
  };

  const handleFacebookPress = () => {
    Alert.alert('Coming Soon', 'Facebook sign-in will be available soon');
  };

  const handleEmailPress = () => {
    Alert.alert('Coming Soon', 'Email sign-in will be available soon');
  };

  return (
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
  );
}

const styles = StyleSheet.create({
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
    marginHorizontal: 12, // Creates 24px gap between icons (12px on each side)
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
});
