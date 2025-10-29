import React, { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { orderAPI, productAPI } from '../services/api';
import Modal from '../components/Modal';
import Loading from '../components/Loading';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [finalPrice, setFinalPrice] = useState('');
  const [formData, setFormData] = useState({
    product_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    delivery_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        orderAPI.getAll(),
        productAPI.getAll()
      ]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await orderAPI.create(formData);
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert(error.response?.data?.error || 'Erreur lors de la création de la commande');
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedOrder) return;

    try {
      if (status === 'vendu' && !finalPrice) {
        alert('Veuillez saisir le prix final');
        return;
      }

      await orderAPI.updateStatus(
        selectedOrder.id,
        status,
        status === 'vendu' ? parseFloat(finalPrice) : null
      );
      await loadData();
      setShowStatusModal(false);
      setSelectedOrder(null);
      setFinalPrice('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert(error.response?.data?.error || 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      product_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      delivery_address: '',
      delivery_date: ''
    });
  };

  const openStatusModal = (order) => {
    setSelectedOrder(order);
    setFinalPrice(order.product_price || '');
    setShowStatusModal(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestion des commandes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {orders.length} commande(s) au total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle commande</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="vendu">Vendu</option>
            <option value="annule">Annulé</option>
          </select>
        </div>
      </div>

      {/* Liste des commandes */}
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {order.product_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.category_name} • {order.color_name} • {order.size}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Client</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {order.customer_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.customer_phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Livraison</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(order.delivery_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.delivery_address}
                    </p>
                  </div>
                </div>

                {order.final_price && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Prix final: <span className="font-bold">{order.final_price} Ar</span>
                    </p>
                  </div>
                )}
              </div>

              {order.status === 'en_attente' && (
                <div className="flex md:flex-col gap-2">
                  <button
                    onClick={() => openStatusModal(order)}
                    className="flex-1 btn btn-success flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Vendu</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      handleStatusChange('annule');
                    }}
                    className="flex-1 btn btn-danger flex items-center justify-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Annuler</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="card text-center py-12">
          <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Aucune commande trouvée
          </p>
        </div>
      )}

      {/* Modal de création */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Nouvelle commande"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Produit</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="input"
              required
            >
              <option value="">Sélectionner un produit</option>
              {products.filter(p => p.quantity > 0).map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.color_name} - {product.size} (Stock: {product.quantity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Nom du client</label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Téléphone</label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Adresse de livraison</label>
            <textarea
              value={formData.delivery_address}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
              className="input"
              rows="3"
              required
            />
          </div>

          <div>
            <label className="label">Date et heure de livraison</label>
            <input
              type="datetime-local"
              value={formData.delivery_date}
              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={handleCloseModal} className="flex-1 btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="flex-1 btn btn-primary">
              Créer la commande
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmation vente */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedOrder(null);
          setFinalPrice('');
        }}
        title="Confirmer la vente"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Confirmez la vente de <strong>{selectedOrder?.product_name}</strong> à{' '}
            <strong>{selectedOrder?.customer_name}</strong>
          </p>

          <div>
            <label className="label">Prix final de vente (Ar)</label>
            <input
              type="number"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              className="input"
              step="0.01"
              min="0"
              placeholder="Prix négocié"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Prix suggéré: {selectedOrder?.product_price} Ar
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Cette action va :
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1 list-disc list-inside">
              <li>Déduire 1 unité du stock</li>
              <li>Ajouter la vente à l'historique</li>
              <li>Enregistrer le revenu en comptabilité</li>
            </ul>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setShowStatusModal(false);
                setSelectedOrder(null);
                setFinalPrice('');
              }}
              className="flex-1 btn btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={() => handleStatusChange('vendu')}
              className="flex-1 btn btn-success"
            >
              Confirmer la vente
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Orders;
