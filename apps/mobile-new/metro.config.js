const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Explicitly set project root to the mobile-new directory
const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(projectRoot);

// Force Metro to use local node_modules first, but allow parent for hoisted packages
const parentNodeModules = path.resolve(workspaceRoot, 'node_modules');
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  parentNodeModules, // Allow parent for hoisted packages (expo, @babel, etc.)
];

// Block parent node_modules/react-native to prevent version conflicts
// Allow all other packages from parent (they're hoisted by npm)
config.resolver.blockList = [
  new RegExp(`^${parentNodeModules.replace(/\\/g, '\\\\')}\\\\react-native\\\\`),
];

// Watch current directory and root node_modules for hoisted packages
// Metro needs to watch files it resolves to compute SHA-1 hashes
config.watchFolders = [
  projectRoot,
  path.resolve(workspaceRoot, 'node_modules'), // Allow watching hoisted packages
];

// Explicitly set project root
config.projectRoot = projectRoot;

// Optimize for faster reloads - enable persistent cache
config.cacheVersion = '1.0';

// Optimize transformer for faster builds
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Increase max workers for faster bundling (but not too many to avoid memory issues)
config.maxWorkers = 2;

// Optimize server for faster responses
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};


module.exports = config;

