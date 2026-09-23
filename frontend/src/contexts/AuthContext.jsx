import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // Charger le profil (une seule fois par token, évite les races)
  const loadUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/profile`);
      setUser(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [API_URL, logout]);

  // Configurer axios et charger le profil une seule fois par token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token, loadUser]);

  const login = async (shopName, username, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        shopName,
        username,
        password
      });

      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erreur de connexion'
      };
    }
  };

  const register = async (shopName, username, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        shopName,
        username,
        email,
        password
      });

      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erreur lors de l\'inscription'
      };
    }
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/profile`);
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erreur lors du rechargement du profil'
      };
    }
  };

  const updatePreferences = async (theme) => {
    try {
      await axios.put(`${API_URL}/auth/preferences`, { theme });
      setUser(prev => ({ ...prev, theme }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erreur lors de la mise à jour'
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshUser,
    updatePreferences,
    isAuthenticated: !!token && !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};