import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2 } from 'lucide-react';
import { transactionAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Loading from '../components/Loading';

const Accounting = () => {
  const toast = useToast();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState({
    type: 'revenu',
    category: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [filterType]);

  const loadData = async () => {
    try {
      const [transactionsRes, summaryRes] = await Promise.all([
        transactionAPI.getTransactions({ type: filterType }),
        transactionAPI.getSummary()
      ]);
      setTransactions(transactionsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await transactionAPI.createTransaction(formData);
      await loadData();
      toast.success('Transaction ajoutée avec succès');
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur lors de l\'ajout de la transaction');
    }
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setShowConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      await transactionAPI.delete(transactionToDelete.id);
      await loadData();
      toast.success('Transaction supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la transaction');
    } finally {
      setTransactionToDelete(null);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      type: 'revenu',
      category: '',
      amount: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0]
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Comptabilité
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez vos revenus et dépenses
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter une transaction</span>
        </button>
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total Revenus</h3>
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">{summary?.totalRevenus.toFixed(2)} Ar</p>
          <p className="text-sm opacity-90 mt-1">Toutes sources</p>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total Dépenses</h3>
            <TrendingDown className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">{summary?.totalDepenses.toFixed(2)} Ar</p>
          <p className="text-sm opacity-90 mt-1">Toutes catégories</p>
        </div>

        <div className={`card bg-gradient-to-br ${
          summary?.solde >= 0 
            ? 'from-purple-500 to-purple-600' 
            : 'from-orange-500 to-orange-600'
        } text-white`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Solde Net</h3>
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">{summary?.solde.toFixed(2)} Ar</p>
          <p className="text-sm opacity-90 mt-1">Revenus - Dépenses</p>
        </div>
      </div>

      {/* Résumé du mois */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Revenus du mois
          </h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {summary?.monthRevenus.toFixed(2)} Ar
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Dépenses du mois
          </h3>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {summary?.monthDepenses.toFixed(2)} Ar
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Solde du mois
          </h3>
          <p className={`text-2xl font-bold ${
            summary?.monthSolde >= 0 
              ? 'text-purple-600 dark:text-purple-400' 
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            {summary?.monthSolde.toFixed(2)} Ar
          </p>
        </div>
      </div>

      {/* Filtre */}
      <div className="card">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input"
        >
          <option value="">Toutes les transactions</option>
          <option value="revenu">Revenus uniquement</option>
          <option value="depense">Dépenses uniquement</option>
        </select>
      </div>

      {/* Liste des transactions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Historique des transactions
        </h2>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  transaction.type === 'revenu'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {transaction.type === 'revenu' ? (
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {transaction.category}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {transaction.description || 'Aucune description'}
                      </p>
                    </div>
                    <p className={`text-lg font-bold ${
                      transaction.type === 'revenu'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'revenu' ? '+' : '-'}{transaction.amount} Ar
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(transaction.transaction_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <button
                      onClick={() => handleDeleteClick(transaction)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucune transaction enregistrée
            </p>
          </div>
        )}
      </div>

      {/* Modal d'ajout */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Ajouter une transaction"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Type de transaction</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'revenu' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === 'revenu'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${
                  formData.type === 'revenu' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <p className="font-medium text-gray-900 dark:text-white">Revenu</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'depense' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === 'depense'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <TrendingDown className={`w-6 h-6 mx-auto mb-2 ${
                  formData.type === 'depense' ? 'text-red-600' : 'text-gray-400'
                }`} />
                <p className="font-medium text-gray-900 dark:text-white">Dépense</p>
              </button>
            </div>
          </div>

          <div>
            <label className="label">Catégorie</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input"
              placeholder="Ex: Vente hors système, Achat matériel..."
              required
            />
          </div>

          <div>
            <label className="label">Montant (Ar)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label className="label">Description (optionnel)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows="3"
              placeholder="Détails de la transaction..."
            />
          </div>

          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={handleCloseModal} className="flex-1 btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="flex-1 btn btn-primary">
              Ajouter
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog de confirmation */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer la transaction"
        message={`Êtes-vous sûr de vouloir supprimer cette transaction de ${transactionToDelete?.amount} Ar ? Cette action est irréversible.`}
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  );
};

export default Accounting;
