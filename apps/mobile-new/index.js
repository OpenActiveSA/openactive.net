import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

import App from './App';

console.log('[index.js] Starting app registration...');

// Disable Expo Updates at runtime to prevent "Failed to download remote update" errors
if (typeof global !== 'undefined') {
  // Prevent Expo from trying to check for updates
  global.__expo = global.__expo || {};
  global.__expo.updates = global.__expo.updates || {};
  global.__expo.updates.enabled = false;
}

// Hide the native splash screen as early as possible
// This will hide it immediately when the app loads, before our custom splash shows
SplashScreen.preventAutoHideAsync();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
console.log('[index.js] Registering root component...');
registerRootComponent(App);
console.log('[index.js] Root component registered');
