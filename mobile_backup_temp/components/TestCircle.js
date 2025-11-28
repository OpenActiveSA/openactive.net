import React from 'react';
import Svg, { Circle } from 'react-native-svg';

/**
 * Simple test circle SVG component
 * 
 * Usage:
 * <TestCircle width={24} height={24} color="#000000" />
 */
export function TestCircle({ width = 24, height = 24, color = '#000000' }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10.32" fill={color} />
    </Svg>
  );
}

