import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { productAPI, categoryAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Loading from '../components/Loading';
import { formatPrice } from '../utils/formatPrice';

const Stock = () => {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    color_id: '',
    size: '',
    quantity: 0,
    price: 0,
    alert_threshold: 5
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes, colorsRes] = await Promise.all([
        productAPI.getAll(),
        categoryAPI.getAll(),
        categoryAPI.getColors()
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setColors(colorsRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productAPI.update(editingProduct.id, formData);
      } else {
        await productAPI.create(formData);
      }
      await loadData();
      toast.success(editingProduct ? 'Produit modifié avec succès' : 'Produit ajouté avec succès');
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde du produit');
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setShowConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      await productAPI.delete(productToDelete.id);
      await loadData();
      toast.success('Produit supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du produit');
    } finally {
      setProductToDelete(null);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id,
      color_id: product.color_id,
      size: product.size,
      quantity: product.quantity,
      price: product.price,
      alert_threshold: product.alert_threshold
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: '',
      color_id: '',
      size: '',
      quantity: 0,
      price: 0,
      alert_threshold: 5
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category_id === parseInt(filterCategory);
    return matchesSearch && matchesCategory;
  });

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestion du stock
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {products.length} produit(s) au total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter un produit</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{product.category_icon || '📦'}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {product.category_name}
                  </p>
                </div>
              </div>
              {product.quantity <= product.alert_threshold && (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Couleur:</span>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: product.hex_code }}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {product.color_name}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Taille:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {product.size}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Stock:</span>
                <span className={`font-bold ${
                  product.quantity <= product.alert_threshold
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {product.quantity}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Prix:</span>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {formatPrice(product.price)}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleEdit(product)}
                className="flex-1 btn btn-secondary flex items-center justify-center space-x-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Modifier</span>
              </button>
              <button
                onClick={() => handleDeleteClick(product)}
                className="btn btn-danger flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Aucun produit trouvé
          </p>
        </div>
      )}

      {/* Modal d'ajout/édition */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nom du produit</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="input"
                required
              >
                <option value="">Sélectionner</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Couleur</label>
              <select
                value={formData.color_id}
                onChange={(e) => setFormData({ ...formData, color_id: e.target.value })}
                className="input"
                required
              >
                <option value="">Sélectionner</option>
                {colors.map(color => (
                  <option key={color.id} value={color.id}>{color.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Taille</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="input"
                placeholder="Ex: M, L, XL"
                required
              />
            </div>

            <div>
              <label className="label">Quantité</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="input"
                min="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prix (Ar)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="input"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="label">Seuil d'alerte</label>
              <input
                type="number"
                value={formData.alert_threshold}
                onChange={(e) => setFormData({ ...formData, alert_threshold: parseInt(e.target.value) })}
                className="input"
                min="0"
                required
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={handleCloseModal} className="flex-1 btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="flex-1 btn btn-primary">
              {editingProduct ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog de confirmation */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le produit"
        message={`Êtes-vous sûr de vouloir supprimer "${productToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  );
};

export default Stock;
