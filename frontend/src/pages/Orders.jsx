import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, CheckCircle, XCircle, Clock, Trash2, Edit2 } from 'lucide-react';
import { orderAPI, productAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import Loading from '../components/Loading';

const Orders = () => {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [finalPrice, setFinalPrice] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    delivery_date: ''
  });
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: 1, custom_price: '' }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsRes = await productAPI.getAll();
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des produits:', error);
    }
  };

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

  const handleOpenModal = async () => {
    setShowModal(true);
    await fetchProducts();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payloadItems = orderItems
        .filter(item => item.product_id)
        .map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity) || 1,
          custom_price: item.custom_price !== '' ? Number(item.custom_price) : undefined
        }));

      if (payloadItems.length === 0) {
        toast.warning('Veuillez ajouter au moins un produit à la commande');
        return;
      }

      const payload = {
        ...formData,
        items: payloadItems
      };

      if (editingOrder) {
        await orderAPI.update(editingOrder.id, payload);
        toast.success('Commande modifiée avec succès');
      } else {
        await orderAPI.create(payload);
        toast.success('Commande créée avec succès');
      }
      
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde de la commande');
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedOrder) return;

    try {
      const priceValue = status === 'vendu'
        ? Number(finalPrice || selectedOrder?.total_amount || 0)
        : null;

      if (status === 'vendu' && !priceValue) {
        toast.warning('Veuillez saisir le prix final');
        return;
      }

      await orderAPI.updateStatus(
        selectedOrder.id,
        status,
        priceValue
      );
      await loadData();
      setShowStatusModal(false);
      setSelectedOrder(null);
      toast.success('Statut mis à jour avec succès');
      setFinalPrice('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleEdit = async (order) => {
    setEditingOrder(order);
    setFormData({
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email || '',
      delivery_address: order.delivery_address || '',
      delivery_date: order.delivery_date ? order.delivery_date.split('T')[0] : ''
    });
    setOrderItems(order.items.map(item => ({
      product_id: item.product_id.toString(),
      quantity: item.quantity,
      custom_price: item.unit_price
    })));
    await fetchProducts();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOrder(null);
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      delivery_address: '',
      delivery_date: ''
    });
    setOrderItems([{ product_id: '', quantity: 1, custom_price: '' }]);
  };

  const openStatusModal = (order) => {
    setSelectedOrder(order);
    setFinalPrice(
      order.final_price?.toString() ||
      order.total_amount?.toString() ||
      ''
    );
    setShowStatusModal(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items?.some(item =>
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesStatus = !filterStatus || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const computeDraftTotal = useMemo(() => {
    return orderItems.reduce((sum, item) => {
      if (!item.product_id) return sum;
      const product = products.find(p => p.id === Number(item.product_id));
      const unitPrice = item.custom_price !== ''
        ? Number(item.custom_price)
        : product?.price || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + unitPrice * quantity;
    }, 0);
  }, [orderItems, products]);

  const handleItemChange = (index, field, value) => {
    setOrderItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, { product_id: '', quantity: 1, custom_price: '' }]);
  };

  const removeOrderItem = (index) => {
    setOrderItems(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index));
  };

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
          onClick={handleOpenModal}
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
                      Commande #{order.id}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.items?.length || 0} produit(s) • Créée le{' '}
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
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

                {order.items?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {order.items.map(item => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-gray-100 dark:border-gray-700 rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Quantité: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Prix unitaire: {item.unit_price} Ar
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Total: {item.total_price} Ar
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Total commande: <span className="font-bold">{order.total_amount || 0} Ar</span>
                    </p>
                  </div>
                  {order.final_price && (
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        Prix final: <span className="font-bold">{order.final_price} Ar</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {order.status === 'en_cours' && (
                <div className="flex md:flex-col gap-2">
                  <button
                    onClick={() => handleEdit(order)}
                    className="flex-1 btn btn-secondary flex items-center justify-center space-x-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                </div>
              )}

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

      {/* Modal de création/modification */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingOrder ? 'Modifier la commande' : 'Nouvelle commande'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <label className="label">Produits</label>
            {orderItems.map((item, index) => {
              const selectedProduct = products.find(p => p.id === Number(item.product_id));
              const unitPrice = item.custom_price !== ''
                ? Number(item.custom_price)
                : selectedProduct?.price || 0;
              const total = unitPrice * (Number(item.quantity) || 0);

              return (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Produit #{index + 1}
                    </p>
                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        className="text-red-500 hover:text-red-600"
                        aria-label="Supprimer le produit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <select
                    value={item.product_id}
                    onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Sélectionner un produit</option>
                    {products.filter(p => p.quantity > 0 || p.id === Number(item.product_id)).map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.color_name} - {product.size} (Stock: {product.quantity})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        Quantité
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        Prix unitaire négocié (optionnel)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.custom_price}
                        onChange={(e) => handleItemChange(index, 'custom_price', e.target.value)}
                        className="input"
                        placeholder={selectedProduct ? `${selectedProduct.price} Ar` : 'Prix négocié'}
                      />
                    </div>
                  </div>

                  {selectedProduct && (
                    <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
                      <p>Prix catalogue: <strong>{selectedProduct.price} Ar</strong></p>
                      <p>Stock disponible: <strong>{selectedProduct.quantity}</strong></p>
                      <p className="mt-2">Total pour ce produit: <strong>{total || 0} Ar</strong></p>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addOrderItem}
              className="btn btn-secondary w-full"
            >
              Ajouter un produit
            </button>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
              Total estimé de la commande : <strong>{computeDraftTotal} Ar</strong>
            </div>
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
              {editingOrder ? 'Mettre à jour' : 'Créer la commande'}
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
              <li>Déduire le stock de chaque produit de la commande</li>
              <li>Ajouter chaque produit dans l'historique des ventes</li>
              <li>Enregistrer le revenu total en comptabilité</li>
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
