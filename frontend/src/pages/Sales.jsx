import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Filter } from 'lucide-react';
import { salesAPI } from '../services/api';
import Loading from '../components/Loading';
import { formatPrice } from '../utils/formatPrice';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    category: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [salesRes, statsRes] = await Promise.all([
        salesAPI.getAll(filters),
        salesAPI.getStats()
      ]);
      setSales(salesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      category: ''
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Historique des ventes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {sales.length} vente(s) enregistrée(s)
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total des ventes</h3>
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">{formatPrice(stats?.total)}</p>
          <p className="text-sm opacity-90 mt-1">{stats?.count} vente(s)</p>
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Ventes du mois</h3>
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">{formatPrice(stats?.monthTotal)}</p>
          <p className="text-sm opacity-90 mt-1">Mois en cours</p>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Moyenne par vente</h3>
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">
            {stats?.count > 0 ? formatPrice(stats.total / stats.count) : '0 Ar'}
          </p>
          <p className="text-sm opacity-90 mt-1">Prix moyen</p>
        </div>
      </div>

      {/* Ventes par catégorie */}
      {stats?.byCategory && stats.byCategory.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Ventes par catégorie
          </h2>
          <div className="space-y-3">
            {stats.byCategory.map((cat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {cat.category_name}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {cat.count} vente(s)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(parseFloat(cat.total) / stats.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
                <span className="ml-4 font-bold text-gray-900 dark:text-white">
                  {formatPrice(parseFloat(cat.total))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Filtres</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Date de début</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Date de fin</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="input"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn btn-secondary w-full"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Liste des ventes */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Détail des ventes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Produit
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Catégorie
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Client
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Prix
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                    {new Date(sale.sale_date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                    {sale.product_name}
                    {(sale.size || sale.color) && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {' - '}
                        {[sale.size, sale.color].filter(Boolean).join(' - ')}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {sale.category_name || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {sale.customer_name}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-right text-green-600 dark:text-green-400">
                    {formatPrice(sale.final_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sales.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucune vente enregistrée
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sales;
