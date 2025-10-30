import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Configuration axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Produits
export const productAPI = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock')
};

// API Commandes
export const orderAPI = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status, finalPrice) => 
    api.patch(`/orders/${id}/status`, { status, final_price: finalPrice }),
  delete: (id) => api.delete(`/orders/${id}`)
};

// API Ventes
export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getTotal: (params) => api.get('/sales/total', { params }),
  getStats: () => api.get('/sales/stats')
};

// API Comptabilité
export const accountingAPI = {
  getTransactions: (params) => api.get('/accounting/transactions', { params }),
  createTransaction: (data) => api.post('/accounting/transactions', data),
  deleteTransaction: (id) => api.delete(`/accounting/transactions/${id}`),
  getSummary: () => api.get('/accounting/summary')
};

// API Catégories
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  getColors: () => api.get('/categories/colors'),
  createColor: (data) => api.post('/categories/colors', data)
};

// API Authentification
export const authAPI = {
  changePassword: (data) => api.post('/auth/change-password', data),
  requestPasswordReset: (email) => api.post('/auth/request-password-reset', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token })
};

export default api;
