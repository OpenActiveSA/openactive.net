import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';

export default function App() {
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
        {/* No Logo - as requested */}

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
