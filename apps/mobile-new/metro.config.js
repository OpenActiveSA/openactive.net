const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force Metro to ONLY use node_modules from this project, not root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Block Metro from looking in root node_modules
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react\/.*/,
];

// Only watch files in this project
config.watchFolders = [__dirname];

// Set project root to this directory
config.projectRoot = __dirname;

module.exports = config;

