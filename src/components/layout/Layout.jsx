import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, RefreshCw } from 'lucide-react';
import { useBrolayContext } from '../../contexts/BrolayContext';
import Button from '../common/Button';

/**
 * Layout - Main application layout with navigation
 *
 * Features:
 * - Responsive navigation (desktop sidebar, mobile hamburger)
 * - Navigation links with active state
 * - Pull-to-refresh on mobile
 * - Outlet for child routes
 */
const Layout = () => {
  const {
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    autoUpdating,
    refreshing,
    pullDistance,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useBrolayContext();

  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null);
  const navigate = useNavigate();

  // Feature flags (could be moved to context or config)
  const SHOW_SETTINGS_TAB = false;
  const SHOW_IMPORT_TAB = false;

  const toggleDropdown = (dropdown) => {
    setMobileDropdownOpen(mobileDropdownOpen === dropdown ? null : dropdown);
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
      setMobileDropdownOpen(null);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="fixed top-0 left-0 right-0 flex justify-center items-center bg-blue-500 text-white transition-all duration-200 z-50"
          style={{ height: `${pullDistance}px` }}
        >
          <RefreshCw className={`${refreshing ? 'animate-spin' : ''}`} size={24} />
          {!refreshing && pullDistance > 80 && <span className="ml-2">Release to refresh</span>}
          {refreshing && <span className="ml-2">Refreshing...</span>}
        </div>
      )}

      {/* Mobile Navbar */}
      {isMobile && (
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center sticky top-0 z-40">
          <h1 className="text-xl font-bold">Brolay Toxic Standings</h1>
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            variant="ghost"
            className="text-white"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      )}

      {/* Desktop Sidebar / Mobile Drawer */}
      <div
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform' : 'fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 overflow-y-auto'}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        {/* Desktop Header */}
        {!isMobile && (
          <div className="p-6 bg-blue-600 text-white">
            <h1 className="text-2xl font-bold">Brolay Toxic Standings</h1>
          </div>
        )}

        {/* Navigation */}
        <div className="p-4 space-y-2">
          {/* Entry Button */}
          <NavLink to="/entry">
            {({ isActive }) => (
              <Button
                variant={isActive ? 'primary' : 'secondary'}
                className={`w-full text-left ${isMobile ? 'min-h-[44px]' : ''}`}
              >
                ➕ New Brolay
              </Button>
            )}
          </NavLink>

          {/* All Brolays Button */}
          <NavLink to="/brolays">
            {({ isActive }) => (
              <Button
                variant={isActive ? 'primary' : 'secondary'}
                className={`w-full text-left ${isMobile ? 'min-h-[44px]' : ''}`}
              >
                📅 All Brolays
              </Button>
            )}
          </NavLink>

          {/* All Picks Button */}
          <NavLink to="/picks">
            {({ isActive }) => (
              <Button
                variant={isActive ? 'primary' : 'secondary'}
                className={`w-full text-left ${isMobile ? 'min-h-[44px]' : ''}`}
              >
                📋 All Picks
              </Button>
            )}
          </NavLink>

          {/* Insights Dropdown */}
          <div className="dropdown">
            <Button
              onClick={() => toggleDropdown('insights')}
              variant="secondary"
              className={`w-full text-left ${isMobile ? 'min-h-[44px]' : ''}`}
            >
              🔍 Insights
            </Button>
            {mobileDropdownOpen === 'insights' && isMobile && (
              <div className="pl-4 space-y-2 mt-2">
                <Button
                  onClick={() => handleNavClick('/individual')}
                  variant="ghost"
                  className="w-full text-left min-h-[44px]"
                >
                  👤 Individual Stats
                </Button>
                <Button
                  onClick={() => handleNavClick('/group')}
                  variant="ghost"
                  className="w-full text-left min-h-[44px]"
                >
                  👥 Group Stats
                </Button>
                <Button
                  onClick={() => handleNavClick('/rankings')}
                  variant="ghost"
                  className="w-full text-left min-h-[44px]"
                >
                  🏆 Rankings
                </Button>
                <Button
                  onClick={() => handleNavClick('/grid')}
                  variant="ghost"
                  className="w-full text-left min-h-[44px]"
                >
                  🎯 Grid View
                </Button>
              </div>
            )}
          </div>

          {/* Desktop Insights Links (shown on hover) */}
          {!isMobile && (
            <div className="dropdown">
              <div className="dropdown-content">
                <div className="bg-white shadow-lg rounded-lg p-2 space-y-2">
                  <NavLink to="/individual">
                    {({ isActive }) => (
                      <Button
                        variant={isActive ? 'primary' : 'ghost'}
                        className="w-full text-left"
                      >
                        👤 Individual Stats
                      </Button>
                    )}
                  </NavLink>
                  <NavLink to="/group">
                    {({ isActive }) => (
                      <Button
                        variant={isActive ? 'primary' : 'ghost'}
                        className="w-full text-left"
                      >
                        👥 Group Stats
                      </Button>
                    )}
                  </NavLink>
                  <NavLink to="/rankings">
                    {({ isActive }) => (
                      <Button
                        variant={isActive ? 'primary' : 'ghost'}
                        className="w-full text-left"
                      >
                        🏆 Rankings
                      </Button>
                    )}
                  </NavLink>
                  <NavLink to="/grid">
                    {({ isActive }) => (
                      <Button
                        variant={isActive ? 'primary' : 'ghost'}
                        className="w-full text-left"
                      >
                        🎯 Grid View
                      </Button>
                    )}
                  </NavLink>
                </div>
              </div>
            </div>
          )}

          {/* Payments Button */}
          <NavLink to="/payments">
            {({ isActive }) => (
              <Button
                variant={isActive ? 'primary' : 'secondary'}
                className={`w-full text-left ${isMobile ? 'min-h-[44px]' : ''}`}
              >
                💰 Payments
              </Button>
            )}
          </NavLink>

          {/* Settings (if enabled) */}
          {SHOW_SETTINGS_TAB && (
            <NavLink to="/settings">
              {({ isActive }) => (
                <Button
                  variant={isActive ? 'primary' : 'secondary'}
                  className={`w-full text-left ${isMobile ? 'min-h-[44px]' : ''}`}
                >
                  ⚙️ Settings
                </Button>
              )}
            </NavLink>
          )}

          {/* Import (if enabled) */}
          {SHOW_IMPORT_TAB && (
            <NavLink to="/import">
              {({ isActive }) => (
                <Button
                  variant={isActive ? 'primary' : 'secondary'}
                  className={`w-full text-left ${isMobile ? 'min-h-[44px]' : ''}`}
                >
                  📥 Import Data
                </Button>
              )}
            </NavLink>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`${isMobile ? '' : 'ml-64'} min-h-screen`}>
        <div className="container mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
