'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ClubAnimationContextType {
  headerVisible: boolean;
  notificationsVisible: boolean;
  contentVisible: boolean;
  setHeaderVisible: (visible: boolean) => void;
  setNotificationsVisible: (visible: boolean) => void;
  setContentVisible: (visible: boolean) => void;
}

const ClubAnimationContext = createContext<ClubAnimationContextType | undefined>(undefined);

// Default values when context is not available
const defaultAnimationContext: ClubAnimationContextType = {
  headerVisible: true,
  notificationsVisible: true,
  contentVisible: true,
  setHeaderVisible: () => {},
  setNotificationsVisible: () => {},
  setContentVisible: () => {},
};

export function ClubAnimationProvider({ children }: { children: ReactNode }) {
  const [headerVisible, setHeaderVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  // Start header animation
  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Start notifications animation after header (0.4s delay)
  useEffect(() => {
    if (headerVisible) {
      const timer = setTimeout(() => setNotificationsVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [headerVisible]);

  // Start content animation after notifications (0.4s delay)
  useEffect(() => {
    if (notificationsVisible) {
      const timer = setTimeout(() => setContentVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [notificationsVisible]);

  return (
    <ClubAnimationContext.Provider
      value={{
        headerVisible,
        notificationsVisible,
        contentVisible,
        setHeaderVisible,
        setNotificationsVisible,
        setContentVisible,
      }}
    >
      {children}
    </ClubAnimationContext.Provider>
  );
}

export function useClubAnimation() {
  const context = useContext(ClubAnimationContext);
  if (context === undefined) {
    // Return default values when context is not available (for backwards compatibility)
    return defaultAnimationContext;
  }
  return context;
}

