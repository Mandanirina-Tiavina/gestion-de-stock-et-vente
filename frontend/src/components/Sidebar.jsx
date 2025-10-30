import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Home, Package, ShoppingCart, TrendingUp, DollarSign, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', icon: Home, label: 'Tableau de bord' },
    { to: '/stock', icon: Package, label: 'Gestion du stock' },
    { to: '/commandes', icon: ShoppingCart, label: 'Commandes' },
    { to: '/ventes', icon: TrendingUp, label: 'Historique des ventes' },
    { to: '/comptabilite', icon: DollarSign, label: 'Comptabilité' },
    { to: '/parametres', icon: Settings, label: 'Paramètres' },
    { to: '/profil', icon: User, label: 'Mon Profil' }
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              onClose();
              window.location.href = '/profil';
            }}
            className="flex items-center space-x-3 flex-1 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">📦</span>
            </div>
            <div className="text-left">
              <h2 className="font-bold text-gray-900 dark:text-white">Stock & Ventes</h2>
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">👤 {user?.username}</p>
            </div>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 pb-24">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer - Déconnexion */}
        <div className="absolute bottom-20 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
