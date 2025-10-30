import React from 'react';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, LogOut, Home, Package, ShoppingCart, TrendingUp, DollarSign, Settings, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: Home, label: 'Accueil' },
    { to: '/stock', icon: Package, label: 'Stock' },
    { to: '/commandes', icon: ShoppingCart, label: 'Commandes' },
    { to: '/ventes', icon: TrendingUp, label: 'Ventes' },
    { to: '/comptabilite', icon: DollarSign, label: 'Comptabilité' },
    { to: '/parametres', icon: Settings, label: 'Paramètres' }
  ];

  const currentPage = navItems.find(item => item.to === location.pathname);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Menu burger (mobile) */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo et titre de la page */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">📦</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {currentPage?.label || 'Stock & Ventes'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                Gestion de stock et ventes
              </p>
            </div>
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Utilisateur - cliquable pour aller au profil (toujours visible) */}
            <button
              onClick={() => navigate('/profil')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-sm hidden sm:block">
                <p className="font-medium text-gray-900 dark:text-white">{user?.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
              </div>
            </button>

            {/* Toggle thème */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Changer le thème"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Déconnexion (desktop) */}
            <button
              onClick={logout}
              className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
