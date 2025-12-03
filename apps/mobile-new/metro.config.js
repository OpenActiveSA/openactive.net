const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force Metro to ONLY use local node_modules
// Block parent node_modules to prevent React Native version conflicts
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Block parent node_modules/react-native specifically (not local one)
const parentNodeModules = path.resolve(__dirname, '../../node_modules');
config.resolver.blockList = [
  new RegExp(`^${parentNodeModules.replace(/\\/g, '\\\\')}\\\\react-native\\\\`),
];

// Only watch current directory
config.watchFolders = [
  __dirname,
];

module.exports = config;

