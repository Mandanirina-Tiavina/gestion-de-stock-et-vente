import React, { useState } from 'react';
import { User, Mail, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI } from '../services/api';

const Profile = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      toast.success('Mot de passe modifié avec succès');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      toast.error(error.response?.data?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    setLoading(true);
    try {
      const response = await authAPI.requestPasswordReset(user.email);
      
      // En développement, afficher le token
      if (response.data.token) {
        console.log('🔑 Token de réinitialisation:', response.data.token);
        toast.success('Email envoyé ! En dev: vérifiez la console pour le token');
      } else {
        toast.success('Un email de réinitialisation a été envoyé à votre adresse');
      }
    } catch (error) {
      console.error('Erreur lors de la demande de réinitialisation:', error);
      toast.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Mon Profil
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gérez vos informations personnelles et votre sécurité
        </p>
      </div>

      {/* Informations du profil */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Informations personnelles
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Nom d'utilisateur</p>
              <p className="font-semibold text-gray-900 dark:text-white">{user?.username}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-semibold text-gray-900 dark:text-white">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Rôle</p>
              <p className="font-semibold text-gray-900 dark:text-white capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Changer le mot de passe */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Changer le mot de passe
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Mot de passe actuel</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="input pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="input pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="input pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn btn-primary flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Modification...' : 'Changer le mot de passe'}</span>
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Vous pouvez également recevoir un lien de réinitialisation par email
          </p>
          <button
            onClick={handleRequestPasswordReset}
            disabled={loading}
            className="btn btn-secondary"
          >
            Envoyer un email de réinitialisation
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
