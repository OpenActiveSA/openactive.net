import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// import OpenLogo from '../assets/open-logo.svg';

// SVG disabled - testing build first
let canUseSvg = false;

// Combined Login/Register Screen - First screen users see
export function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const checkEmailAndNavigate = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      setShowEmailModal(false);

      // Navigate to EmailAuth screen with email
      if (navigation && navigation.navigate) {
        navigation.navigate('EmailAuth', { email });
      } else {
        // Fallback if no navigation
        Alert.alert('Info', `Email: ${email}\n\nWould navigate to login/register screen`);
      }
    } catch (error) {
      console.error('Error checking email:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailButtonPress = () => {
    setShowEmailModal(true);
  };

  const handleGooglePress = () => {
    Alert.alert('Coming Soon', 'Google sign-in will be available soon');
  };

  const handleFacebookPress = () => {
    Alert.alert('Coming Soon', 'Facebook sign-in will be available soon');
  };

  console.log('AuthScreen rendering');

  return (
    <View
      style={styles.container}
    >
      <StatusBar style="light" />
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          {canUseSvg ? (
            <OpenLogo width={120} height={120} />
          ) : (
            <Text style={styles.logoText}>OpenActive</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>Log in or sign up</Text>
        <Text style={styles.subtitle}>Your game starts here</Text>

        {/* Google Button */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleGooglePress}
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
          onPress={handleEmailButtonPress}
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

        {/* SVG Test Button - DISABLED */}
        {/* {navigation?.navigate && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => navigation.navigate('svgTest')}
          >
            <Text style={styles.testButtonText}>🧪 Test SVG Support</Text>
          </TouchableOpacity>
        )} */}
      </View>

      {/* Email Input Modal */}
      <Modal
        visible={showEmailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter your email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Email address"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowEmailModal(false);
                  setEmail('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonContinue]}
                onPress={checkEmailAndNavigate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonContinueText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF0000', // Red for debugging
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 3,
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
    marginBottom: 48,
    textAlign: 'center',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    marginVertical: 16,
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
  testButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.5)',
    alignSelf: 'center',
  },
  testButtonText: {
    color: '#4a90e2',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#052333',
    borderRadius: 8,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtonCancelText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonContinue: {
    backgroundColor: '#667eea',
  },
  modalButtonContinueText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

