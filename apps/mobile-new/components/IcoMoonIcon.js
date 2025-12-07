import React from 'react';
import { Text, StyleSheet } from 'react-native';

/**
 * IcoMoon Icon Component
 * 
 * Maps icon names to their Unicode characters from the IcoMoon font.
 * This component handles the font rendering safely with proper fallbacks.
 */
const iconMap = {
  'home3': '\ue902',
  'droplet': '\ue90b',
  'paint-format': '\ue90c',
  'play': '\ue912',
  'spades': '\ue917',
};

export default function IcoMoonIcon({ 
  name, 
  size = 24, 
  color = '#ffffff', 
  style,
  opacity = 0.8 
}) {
  const iconChar = iconMap[name];
  
  if (!iconChar) {
    console.warn(`IcoMoonIcon: Icon "${name}" not found in iconMap`);
    return null;
  }

  return (
    <Text
      style={[
        styles.icon,
        {
          fontFamily: 'icomoon',
          fontSize: size,
          color: color,
          opacity: opacity,
        },
        style,
      ]}
    >
      {iconChar}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontFamily: 'icomoon',
    textAlign: 'center',
  },
});




