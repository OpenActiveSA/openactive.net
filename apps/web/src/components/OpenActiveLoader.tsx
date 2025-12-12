'use client';

import { useEffect, useState } from 'react';

interface OpenActiveLoaderProps {
  fontColor?: string;
  size?: number;
}

export default function OpenActiveLoader({ fontColor = '#ffffff', size = 32 }: OpenActiveLoaderProps) {
  const [opacities, setOpacities] = useState([0.3, 0.3, 0.3, 0.3]);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacities(prev => {
        // Animate each letter in sequence: o -> p -> e -> n
        const newOpacities = [...prev];
        const maxIndex = newOpacities.indexOf(Math.max(...newOpacities));
        const nextIndex = (maxIndex + 1) % 4;
        
        // Reset all to low opacity
        newOpacities.fill(0.3);
        // Set the next one to full opacity
        newOpacities[nextIndex] = 1.0;
        
        return newOpacities;
      });
    }, 300); // Change every 300ms

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <i 
        className="oa-open-o" 
        style={{ 
          fontSize: `${size}px`, 
          color: fontColor, 
          opacity: opacities[0],
          display: 'inline-block',
          transition: 'opacity 0.3s ease'
        }}
      />
      <i 
        className="oa-open-p" 
        style={{ 
          fontSize: `${size}px`, 
          color: fontColor, 
          opacity: opacities[1],
          display: 'inline-block',
          transition: 'opacity 0.3s ease'
        }}
      />
      <i 
        className="oa-open-e" 
        style={{ 
          fontSize: `${size}px`, 
          color: fontColor, 
          opacity: opacities[2],
          display: 'inline-block',
          transition: 'opacity 0.3s ease'
        }}
      />
      <i 
        className="oa-open-n" 
        style={{ 
          fontSize: `${size}px`, 
          color: fontColor, 
          opacity: opacities[3],
          display: 'inline-block',
          transition: 'opacity 0.3s ease'
        }}
      />
    </div>
  );
}



