import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * UIContext - Provides UI-related state that changes frequently
 *
 * Separated from BrolayContext to prevent data-heavy components
 * from re-rendering when UI state (sidebar, mobile dropdown, etc.) changes.
 */
const UIContext = createContext(null);

/**
 * UIProvider - Wraps the application and provides UI-related state
 */
export const UIProvider = ({ children }) => {
  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch handlers for pull-to-refresh
  const handleTouchStart = (e) => {
    if (!isMobile || window.scrollY > 0) return;
    setPullStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || window.scrollY > 0 || pullStartY === 0) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - pullStartY);
    setPullDistance(Math.min(distance, 100));
  };

  const handleTouchEnd = async () => {
    if (!isMobile) return;
    if (pullDistance > 80) {
      setRefreshing(true);
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
    setPullDistance(0);
    setPullStartY(0);
  };

  const value = {
    // Mobile state
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    mobileDropdownOpen,
    setMobileDropdownOpen,

    // Pull-to-refresh state
    refreshing,
    setRefreshing,
    pullStartY,
    setPullStartY,
    pullDistance,
    setPullDistance,

    // Touch handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

/**
 * useUIContext - Custom hook to access UIContext
 * @returns {Object} Context value with UI state and handlers
 * @throws {Error} If used outside of UIProvider
 */
export const useUIContext = () => {
  const context = useContext(UIContext);

  if (!context) {
    throw new Error('useUIContext must be used within a UIProvider');
  }

  return context;
};

export default UIContext;
