import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, TrendingUp, DollarSign, AlertTriangle, ArrowRight } from 'lucide-react';
import { productAPI, orderAPI, salesAPI, accountingAPI } from '../services/api';
import Loading from '../components/Loading';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    pendingOrders: 0,
    totalSales: 0,
    monthRevenue: 0,
    balance: 0
  });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [products, lowStock, orders, salesStats, accounting] = await Promise.all([
        productAPI.getAll(),
        productAPI.getLowStock(),
        orderAPI.getAll(),
        salesAPI.getStats(),
        accountingAPI.getSummary()
      ]);

      setStats({
        totalProducts: products.data.length,
        lowStockProducts: lowStock.data.length,
        pendingOrders: orders.data.filter(o => o.status === 'en_attente').length,
        totalSales: salesStats.data.total,
        monthRevenue: accounting.data.monthRevenus,
        balance: accounting.data.solde
      });

      setLowStockItems(lowStock.data.slice(0, 5));
      setRecentOrders(orders.data.slice(0, 5));
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const statCards = [
    {
      title: 'Produits en stock',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      link: '/stock'
    },
    {
      title: 'Commandes en attente',
      value: stats.pendingOrders,
      icon: ShoppingCart,
      color: 'bg-orange-500',
      link: '/commandes'
    },
    {
      title: 'Ventes totales',
      value: `${stats.totalSales.toFixed(2)} Ar`,
      icon: TrendingUp,
      color: 'bg-green-500',
      link: '/ventes'
    },
    {
      title: 'Solde',
      value: `${stats.balance.toFixed(2)} Ar`,
      icon: DollarSign,
      color: 'bg-purple-500',
      link: '/comptabilite'
    }
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Tableau de bord
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Vue d'ensemble de votre activité
        </p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="card hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition-transform">
              <span>Voir détails</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* Alertes stock faible */}
      {stats.lowStockProducts > 0 && (
        <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Alerte stock faible
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                {stats.lowStockProducts} produit(s) ont un stock inférieur au seuil d'alerte
              </p>
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.category_name} • {item.color_name} • {item.size}
                      </p>
                    </div>
                    <span className="badge badge-warning">
                      Stock: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to="/stock"
                className="inline-flex items-center mt-3 text-sm font-medium text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200"
              >
                Voir tous les produits
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Commandes récentes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Commandes récentes
          </h2>
          <Link
            to="/commandes"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Voir tout
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Aucune commande pour le moment
          </p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {order.product_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {order.customer_name} • {new Date(order.delivery_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span
                  className={`badge ${
                    order.status === 'en_attente'
                      ? 'badge-warning'
                      : order.status === 'vendu'
                      ? 'badge-success'
                      : 'badge-danger'
                  }`}
                >
                  {order.status === 'en_attente' ? 'En attente' : order.status === 'vendu' ? 'Vendu' : 'Annulé'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenus du mois */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <h3 className="text-lg font-semibold mb-2">Revenus du mois</h3>
          <p className="text-3xl font-bold">{stats.monthRevenue.toFixed(2)} Ar</p>
          <p className="text-sm opacity-90 mt-2">
            Toutes sources confondues
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <h3 className="text-lg font-semibold mb-2">Solde actuel</h3>
          <p className="text-3xl font-bold">{stats.balance.toFixed(2)} Ar</p>
          <p className="text-sm opacity-90 mt-2">
            Revenus - Dépenses
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
