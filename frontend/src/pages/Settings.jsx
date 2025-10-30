import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Palette, Tag } from 'lucide-react';
import { categoryAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Loading from '../components/Loading';

const Settings = () => {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '',
    color: '#3B82F6'
  });
  const [colorForm, setColorForm] = useState({
    name: '',
    hex_code: '#000000'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, colorsRes] = await Promise.all([
        categoryAPI.getAll(),
        categoryAPI.getColors()
      ]);
      setCategories(categoriesRes.data);
      setColors(colorsRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoryAPI.update(editingCategory.id, categoryForm);
      } else {
        await categoryAPI.create(categoryForm);
      }
      await loadData();
      toast.success(editingCategory ? 'Catégorie modifiée avec succès' : 'Catégorie ajoutée avec succès');
      handleCloseCategoryModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleColorSubmit = async (e) => {
    e.preventDefault();
    try {
      await categoryAPI.createColor(colorForm);
      await loadData();
      toast.success('Couleur ajoutée avec succès');
      handleCloseColorModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteClick = (type, item) => {
    setDeleteType(type);
    setItemToDelete(item);
    setShowConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !deleteType) return;
    try {
      if (deleteType === 'category') {
        await categoryAPI.delete(itemToDelete.id);
      } else {
        await categoryAPI.deleteColor(itemToDelete.id);
      }
      await loadData();
      toast.success(`${deleteType === 'category' ? 'Catégorie' : 'Couleur'} supprimée avec succès`);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setItemToDelete(null);
      setDeleteType(null);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      icon: category.icon || '',
      color: category.color || '#3B82F6'
    });
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      icon: '',
      color: '#3B82F6'
    });
  };

  const handleCloseColorModal = () => {
    setShowColorModal(false);
    setColorForm({
      name: '',
      hex_code: '#000000'
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Paramètres
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gérez les catégories et couleurs de vos produits
        </p>
      </div>

      {/* Catégories */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Catégories de produits
          </h2>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {category.icon || '📦'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {category.id}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditCategory(category)}
                  className="flex-1 btn btn-secondary flex items-center justify-center space-x-2 text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => handleDeleteClick('category', category)}
                  className="btn btn-danger flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Couleurs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Couleurs disponibles
          </h2>
          <button
            onClick={() => setShowColorModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {colors.map((color) => (
            <div
              key={color.id}
              className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 transition-colors"
            >
              <div className="flex flex-col items-center space-y-2">
                <div
                  className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: color.hex_code }}
                />
                <p className="font-medium text-sm text-gray-900 dark:text-white text-center">
                  {color.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {color.hex_code}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Informations système */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Informations système
            </h3>
            <div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
              <p>• {categories.length} catégorie(s) configurée(s)</p>
              <p>• {colors.length} couleur(s) disponible(s)</p>
              <p>• Version de l'application: 1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal catégorie */}
      <Modal
        isOpen={showCategoryModal}
        onClose={handleCloseCategoryModal}
        title={editingCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
        size="sm"
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <div>
            <label className="label">Nom de la catégorie</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="input"
              placeholder="Ex: T-shirt, Pantalon..."
              required
            />
          </div>

          <div>
            <label className="label">Icône (emoji)</label>
            <input
              type="text"
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
              className="input text-2xl"
              placeholder="👕"
              maxLength="2"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Copiez un emoji depuis votre clavier
            </p>
          </div>

          <div>
            <label className="label">Couleur d'identification</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                className="w-16 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                className="input flex-1"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={handleCloseCategoryModal} className="flex-1 btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="flex-1 btn btn-primary">
              {editingCategory ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal couleur */}
      <Modal
        isOpen={showColorModal}
        onClose={handleCloseColorModal}
        title="Ajouter une couleur"
        size="sm"
      >
        <form onSubmit={handleColorSubmit} className="space-y-4">
          <div>
            <label className="label">Nom de la couleur</label>
            <input
              type="text"
              value={colorForm.name}
              onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })}
              className="input"
              placeholder="Ex: Bleu ciel, Rouge vif..."
              required
            />
          </div>

          <div>
            <label className="label">Code couleur</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colorForm.hex_code}
                onChange={(e) => setColorForm({ ...colorForm, hex_code: e.target.value })}
                className="w-16 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={colorForm.hex_code}
                onChange={(e) => setColorForm({ ...colorForm, hex_code: e.target.value })}
                className="input flex-1"
                placeholder="#000000"
                pattern="^#[0-9A-Fa-f]{6}$"
                required
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={handleCloseColorModal} className="flex-1 btn btn-secondary">
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
        title={`Supprimer ${deleteType === 'category' ? 'la catégorie' : 'la couleur'}`}
        message={`Êtes-vous sûr de vouloir supprimer "${itemToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  );
};

export default Settings;
