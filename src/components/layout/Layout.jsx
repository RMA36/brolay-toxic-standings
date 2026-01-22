import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, RefreshCw, Loader } from 'lucide-react';
import { useBrolayContext } from '../../contexts/BrolayContext';
import Button from '../common/Button';

/**
 * Layout - Main application layout with navigation
 *
 * Features:
 * - Horizontal navbar on desktop with dropdowns
 * - Mobile sidebar navigation
 * - Pull-to-refresh on mobile
 * - Outlet for child routes
 */
const Layout = () => {
  const {
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    saving,
    refreshing,
    pullDistance,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useBrolayContext();

  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

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

  const isActive = (path) => currentPath === path;
  const isGroupActive = (paths) => paths.includes(currentPath);

  return (
    <div
      className="min-h-screen bg-gray-900"
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

      {/* Header - Desktop and Mobile */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-b border-gray-700 pwa-sticky-header">
        <div className="container mx-auto p-4 md:p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-2xl md:text-3xl">👑</span>
              <div>
                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-transparent bg-clip-text">
                  Brolay Toxic Standings
                </h1>
                <p className="text-gray-400 text-xs md:text-sm">5 Big Guys, Inc.</p>
              </div>
            </div>
            {isMobile && (
              <Button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                variant="ghost"
                className="text-white"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            )}
            {!isMobile && saving && (
              <div className="text-sm bg-gray-800 px-3 py-1 rounded-lg border border-gray-700">
                <Loader className="inline animate-spin text-yellow-400" size={16} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation */}
      <div
        className={`${
          isMobile
            ? `fixed top-0 left-0 h-full w-64 bg-gray-900 shadow-lg z-50 transform transition-transform duration-300 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'container mx-auto p-4 md:p-6'
        }`}
      >
        <div className={isMobile ? 'pt-20 px-4' : 'mb-6'}>
          <div
            className={`${
              isMobile
                ? 'space-y-2'
                : 'bg-gray-900/80 backdrop-blur-md rounded-xl p-2 border border-gray-700 shadow-xl flex gap-2 flex-wrap'
            }`}
          >
            {/* New Brolay Button */}
            <Button
              onClick={() => handleNavClick('/entry')}
              variant={isActive('/entry') ? 'primary' : 'secondary'}
              className={isMobile ? 'w-full min-h-[44px]' : ''}
            >
              ✨ New Brolay
            </Button>

            {/* Brolays Dropdown */}
            <div className={`${isMobile ? 'w-full' : 'dropdown'}`}>
              <Button
                onClick={() => {
                  if (isMobile) {
                    toggleDropdown('brolays');
                  }
                }}
                onMouseEnter={(e) =>
                  !isMobile && e.currentTarget.parentElement.classList.add('dropdown-open')
                }
                variant={isGroupActive(['/brolays', '/picks']) ? 'primary' : 'secondary'}
                className={isMobile ? 'w-full min-h-[44px]' : ''}
              >
                📚 Brolays {isMobile ? (mobileDropdownOpen === 'brolays' ? '▲' : '▼') : '▼'}
              </Button>
              {!isMobile && (
                <div
                  className="dropdown-content"
                  onMouseLeave={(e) => e.currentTarget.parentElement.classList.remove('dropdown-open')}
                >
                  <div className="bg-gray-800 rounded-lg border border-yellow-500/30 shadow-2xl overflow-hidden">
                    <Button
                      onClick={() => handleNavClick('/brolays')}
                      variant="ghost"
                      className="w-full text-left"
                    >
                      📅 All Brolays
                    </Button>
                    <Button
                      onClick={() => handleNavClick('/picks')}
                      variant="ghost"
                      className="w-full text-left"
                    >
                      📊 All Picks
                    </Button>
                  </div>
                </div>
              )}
              {isMobile && mobileDropdownOpen === 'brolays' && (
                <div className="ml-4 mt-2 space-y-2">
                  <Button
                    onClick={() => handleNavClick('/brolays')}
                    variant="ghost"
                    className="w-full text-left min-h-[44px]"
                  >
                    📅 All Brolays
                  </Button>
                  <Button
                    onClick={() => handleNavClick('/picks')}
                    variant="ghost"
                    className="w-full text-left min-h-[44px]"
                  >
                    📊 All Picks
                  </Button>
                </div>
              )}
            </div>

            {/* Analytics Dropdown */}
            <div className={`${isMobile ? 'w-full' : 'dropdown'}`}>
              <Button
                onClick={() => {
                  if (isMobile) {
                    toggleDropdown('analytics');
                  }
                }}
                onMouseEnter={(e) =>
                  !isMobile && e.currentTarget.parentElement.classList.add('dropdown-open')
                }
                variant={
                  isGroupActive(['/search', '/individual', '/group', '/rankings', '/grid'])
                    ? 'primary'
                    : 'secondary'
                }
                className={isMobile ? 'w-full min-h-[44px]' : ''}
              >
                📈 Analytics {isMobile ? (mobileDropdownOpen === 'analytics' ? '▲' : '▼') : '▼'}
              </Button>
              {!isMobile && (
                <div
                  className="dropdown-content"
                  onMouseLeave={(e) => e.currentTarget.parentElement.classList.remove('dropdown-open')}
                >
                  <div className="bg-gray-800 rounded-lg border border-yellow-500/30 shadow-2xl overflow-hidden">
                    <Button
                      onClick={() => handleNavClick('/search')}
                      variant="ghost"
                      className="w-full text-left"
                    >
                      🔍 Insights
                    </Button>
                    <Button
                      onClick={() => handleNavClick('/individual')}
                      variant="ghost"
                      className="w-full text-left"
                    >
                      👤 Individual Stats
                    </Button>
                    <Button
                      onClick={() => handleNavClick('/group')}
                      variant="ghost"
                      className="w-full text-left"
                    >
                      👥 Group Stats
                    </Button>
                    <Button
                      onClick={() => handleNavClick('/rankings')}
                      variant="ghost"
                      className="w-full text-left"
                    >
                      🏆 Rankings
                    </Button>
                    <Button
                      onClick={() => handleNavClick('/grid')}
                      variant="ghost"
                      className="w-full text-left"
                    >
                      🎯 Grid View
                    </Button>
                  </div>
                </div>
              )}
              {isMobile && mobileDropdownOpen === 'analytics' && (
                <div className="ml-4 mt-2 space-y-2">
                  <Button
                    onClick={() => handleNavClick('/search')}
                    variant="ghost"
                    className="w-full text-left min-h-[44px]"
                  >
                    🔍 Insights
                  </Button>
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

            {/* Payments Button */}
            <Button
              onClick={() => handleNavClick('/payments')}
              variant={isActive('/payments') ? 'primary' : 'secondary'}
              className={isMobile ? 'w-full min-h-[44px]' : ''}
            >
              💰 Payments
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
