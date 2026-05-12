/**
 * Mobile-optimized layout component for PWA
 * Responsive design with mobile-first approach
 */
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  BellIcon, 
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';

const MobileLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }, []);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Submit',
      href: '/submit-grievance',
      icon: DocumentTextIcon,
      current: location.pathname === '/submit-grievance'
    },
    {
      name: 'Track',
      href: '/track-grievance',
      icon: DocumentTextIcon,
      current: location.pathname.startsWith('/track-grievance')
    },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: BellIcon,
      current: location.pathname === '/notifications',
      badge: unreadCount > 0 ? unreadCount : null
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
      current: location.pathname === '/profile'
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Online/Offline Status Bar */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm">
          <span className="font-medium">Offline Mode</span>
          <span className="ml-2">Some features may be limited</span>
        </div>
      )}

      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">E-Grievance</h1>
              {user && (
                <p className="text-xs text-gray-500">Welcome, {user.name}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Notification Bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-label="Notifications"
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
            
            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-label="Settings"
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>
            
            <nav className="mt-4">
              <div className="px-2 space-y-1">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${
                      item.current
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-16">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="grid grid-cols-5 gap-1">
          {navigation.slice(0, 5).map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium ${
                item.current
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                <item.icon className="h-6 w-6" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1">{item.name}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Pull-to-refresh indicator */}
      <div id="pull-to-refresh" className="fixed top-16 left-0 right-0 bg-blue-500 text-white text-center py-2 transform -translate-y-full transition-transform duration-300 z-20">
        <div className="flex items-center justify-center space-x-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Refreshing...</span>
        </div>
      </div>
    </div>
  );
};

export default MobileLayout;
