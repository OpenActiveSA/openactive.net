import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Test 1: Direct react-native-svg components
let SvgDirect, Circle, Path, Rect;
let svgDirectAvailable = false;
try {
  const svgModule = require('react-native-svg');
  SvgDirect = svgModule.default || svgModule.Svg;
  Circle = svgModule.Circle;
  Path = svgModule.Path;
  Rect = svgModule.Rect;
  svgDirectAvailable = true;
  console.log('[SvgTest] react-native-svg loaded successfully');
} catch (e) {
  console.error('[SvgTest] react-native-svg not available:', e.message);
}

// Test 2: Import Heart SVG as component via transformer
let HeartSvg;
let heartSvgAvailable = false;
try {
  HeartSvg = require('../assets/heart-svgrepo-com.svg').default;
  heartSvgAvailable = true;
  console.log('[SvgTest] Heart SVG file import successful');
} catch (e) {
  console.error('[SvgTest] Heart SVG file import failed:', e.message);
}

// Test 3: Import test.svg
let TestSvgFile;
let svgFileAvailable = false;
try {
  TestSvgFile = require('../assets/test.svg').default;
  svgFileAvailable = true;
  console.log('[SvgTest] test.svg import successful');
} catch (e) {
  console.error('[SvgTest] test.svg import failed:', e.message);
}

// Test 4: Import OpenLogo SVG
let OpenLogo;
let openLogoAvailable = false;
try {
  OpenLogo = require('../assets/open-logo.svg').default;
  openLogoAvailable = true;
  console.log('[SvgTest] OpenLogo SVG import successful');
} catch (e) {
  console.error('[SvgTest] OpenLogo SVG import failed:', e.message);
}

// Test 5: Use existing components
let TestCircle, SvgLogo, HeartIcon;
let componentsAvailable = false;
try {
  const testCircleModule = require('../components/TestCircle');
  TestCircle = testCircleModule.TestCircle;
  const svgLogoModule = require('../components/SvgLogo');
  SvgLogo = svgLogoModule.SvgLogo;
  const heartIconModule = require('../components/HeartIcon');
  HeartIcon = heartIconModule.HeartIcon;
  componentsAvailable = true;
  console.log('[SvgTest] SVG components loaded successfully');
} catch (e) {
  console.error('[SvgTest] SVG components failed:', e.message);
}

/**
 * Comprehensive SVG Test Screen
 * Tests all methods of using SVGs in React Native
 */
export function SvgTestScreen({ navigation }) {
  const [testResults, setTestResults] = useState({
    directSvg: svgDirectAvailable,
    heartSvg: heartSvgAvailable,
    svgFile: svgFileAvailable,
    openLogo: openLogoAvailable,
    components: componentsAvailable,
  });

  const TestResult = ({ label, passed, children }) => (
    <View style={styles.testContainer}>
      <View style={styles.testHeader}>
        <Text style={styles.testLabel}>{label}</Text>
        <View style={[styles.statusBadge, passed ? styles.passed : styles.failed]}>
          <Text style={styles.statusText}>{passed ? '✓' : '✗'}</Text>
        </View>
      </View>
      {children && (
        <View style={styles.testContent}>
          {children}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>SVG Test Screen</Text>
          <Text style={styles.subtitle}>Testing all SVG methods</Text>
        </View>

        {/* Test 1: Direct react-native-svg */}
        <TestResult label="Test 1: Direct react-native-svg Components" passed={testResults.directSvg}>
          {testResults.directSvg && SvgDirect && Circle ? (
            <View style={styles.svgContainer}>
              <SvgDirect width={50} height={50} viewBox="0 0 24 24">
                <Circle cx="12" cy="12" r="10" fill="#4CAF50" />
              </SvgDirect>
              <Text style={styles.testDescription}>Green circle rendered using direct SVG components</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>react-native-svg module not available</Text>
          )}
        </TestResult>

        {/* Test 2: Heart SVG File Import */}
        <TestResult label="Test 2: Heart SVG File Import (heart-svgrepo-com.svg)" passed={testResults.heartSvg}>
          {testResults.heartSvg && HeartSvg ? (
            <View style={styles.svgContainer}>
              <HeartSvg width={80} height={80} />
              <Text style={styles.testDescription}>Heart SVG imported and rendered via transformer</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>Heart SVG import failed - check metro.config.js and transformer setup</Text>
          )}
        </TestResult>

        {/* Test 3: SVG File Import */}
        <TestResult label="Test 3: SVG File Import (test.svg)" passed={testResults.svgFile}>
          {testResults.svgFile && TestSvgFile ? (
            <View style={styles.svgContainer}>
              <TestSvgFile width={50} height={50} />
              <Text style={styles.testDescription}>SVG file imported and rendered via transformer</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>SVG file import failed - check metro.config.js and transformer setup</Text>
          )}
        </TestResult>

        {/* Test 4: OpenLogo SVG */}
        <TestResult label="Test 4: OpenLogo SVG File" passed={testResults.openLogo}>
          {testResults.openLogo && OpenLogo ? (
            <View style={styles.svgContainer}>
              <OpenLogo width={200} height={45} />
              <Text style={styles.testDescription}>OpenActive logo SVG rendered</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>OpenLogo SVG import failed</Text>
          )}
        </TestResult>

        {/* Test 5: Existing Components */}
        <TestResult label="Test 5: Existing SVG Components" passed={testResults.components}>
          {testResults.components && TestCircle && SvgLogo && HeartIcon ? (
            <View style={styles.svgContainer}>
              <View style={styles.componentRow}>
                <View style={styles.componentItem}>
                  <TestCircle width={40} height={40} color="#2196F3" />
                  <Text style={styles.componentLabel}>TestCircle</Text>
                </View>
                <View style={styles.componentItem}>
                  <HeartIcon width={40} height={40} color="#ff1744" />
                  <Text style={styles.componentLabel}>HeartIcon</Text>
                </View>
                <View style={styles.componentItem}>
                  <SvgLogo width={120} height={27} color="#ffffff" />
                  <Text style={styles.componentLabel}>SvgLogo</Text>
                </View>
              </View>
              <Text style={styles.testDescription}>Pre-built SVG components working</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>SVG components failed to load</Text>
          )}
        </TestResult>

        {/* Test 6: Complex SVG with Path */}
        <TestResult label="Test 6: Complex SVG with Path" passed={testResults.directSvg}>
          {testResults.directSvg && SvgDirect && Path ? (
            <View style={styles.svgContainer}>
              <SvgDirect width={60} height={60} viewBox="0 0 24 24">
                <Path
                  d="M12 2L2 7v10l10 5 10-5V7L12 2z"
                  fill="#FF9800"
                />
              </SvgDirect>
              <Text style={styles.testDescription}>Complex path shape rendered</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>Path rendering not available</Text>
          )}
        </TestResult>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Test Summary</Text>
          <Text style={styles.summaryText}>
            Direct SVG: {testResults.directSvg ? '✓' : '✗'}{'\n'}
            Heart SVG: {testResults.heartSvg ? '✓' : '✗'}{'\n'}
            Test SVG: {testResults.svgFile ? '✓' : '✗'}{'\n'}
            OpenLogo: {testResults.openLogo ? '✓' : '✗'}{'\n'}
            Components: {testResults.components ? '✓' : '✗'}
          </Text>
          {testResults.directSvg && (
            <Text style={styles.successText}>
              ✓ react-native-svg is working! You can use SVG components.
            </Text>
          )}
          {!testResults.directSvg && (
            <Text style={styles.warningText}>
              ⚠ react-native-svg native module may not be linked. Try rebuilding the app.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1f44',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    color: '#c7d2ff',
    fontSize: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f7ff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#c7d2ff',
  },
  testContainer: {
    backgroundColor: '#1a2f54',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  testLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f5f7ff',
    flex: 1,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passed: {
    backgroundColor: '#4CAF50',
  },
  failed: {
    backgroundColor: '#f44336',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testContent: {
    marginTop: 8,
  },
  svgContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0f1a2e',
    borderRadius: 8,
  },
  testDescription: {
    color: '#c7d2ff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontStyle: 'italic',
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 12,
  },
  componentItem: {
    alignItems: 'center',
  },
  componentLabel: {
    color: '#c7d2ff',
    fontSize: 12,
    marginTop: 8,
  },
  summary: {
    backgroundColor: '#1a2f54',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f5f7ff',
    marginBottom: 12,
  },
  summaryText: {
    color: '#c7d2ff',
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  warningText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});

