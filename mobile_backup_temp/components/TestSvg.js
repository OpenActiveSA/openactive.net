import React from 'react';
import { View } from 'react-native';

// Test if react-native-svg is available
let Svg, Path;
let isAvailable = false;

try {
  const svgModule = require('react-native-svg');
  Svg = svgModule.default || svgModule.Svg;
  Path = svgModule.Path;
  isAvailable = true;
  console.log('[TestSvg] react-native-svg loaded successfully');
} catch (e) {
  console.error('[TestSvg] react-native-svg not available:', e.message);
  isAvailable = false;
}

/**
 * Simple test SVG component
 */
export function TestSvg({ width = 50, height = 50, color = '#ff0000' }) {
  if (!isAvailable || !Svg || !Path) {
    return (
      <View style={{ width, height, backgroundColor: color, borderRadius: width / 2 }} />
    );
  }

  return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
      <Path
        d="M12 2L2 7v10l10 5 10-5V7L12 2z"
        fill={color}
      />
    </Svg>
  );
}

export { isAvailable as svgIsAvailable };

