import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Shield, Eye, EyeOff, Users, KeyRound, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI, userAPI } from '../services/api';

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

  const isAdmin = user?.role === 'admin';

  // Gestion des membres (admin)
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'vendeur'
  });
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const canDeleteMember = (member) => {
    if (member.id === user?.id) return false;
    if (member.role === 'admin') {
      const adminMembers = members.filter(m => m.role === 'admin');
      return adminMembers.length > 1;
    }
    return true;
  };

  const canChangeRole = (member) => {
    if (member.id === user?.id) {
      const adminMembers = members.filter(m => m.role === 'admin');
      return adminMembers.length > 1;
    }
    return true;
  };

  const loadMembers = async () => {
    if (!isAdmin) return;
    setMembersLoading(true);
    try {
      const response = await userAPI.getAll();
      setMembers(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des membres:', error);
      toast.error('Erreur lors du chargement des membres');
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [isAdmin]);

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
      
      if (response.data.code) {
        console.log('🔑 Token de réinitialisation:', response.data.code);
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

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userAPI.create(memberForm);
      toast.success('Membre ajouté avec succès');
      setMemberForm({ username: '', email: '', password: '', role: 'vendeur' });
      setShowMemberForm(false);
      await loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'ajout du membre');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTarget || !newPassword || newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      await userAPI.resetPassword(resetTarget.id, newPassword);
      toast.success(`Mot de passe de ${resetTarget.username} réinitialisé`);
      setResetTarget(null);
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Supprimer le membre ${member.username} ?`)) return;
    setLoading(true);
    try {
      await userAPI.delete(member.id);
      toast.success('Membre supprimé');
      await loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (member, role) => {
    setLoading(true);
    try {
      await userAPI.updateRole(member.id, role);
      toast.success(`Rôle de ${member.username} mis à jour`);
      await loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour du rôle');
    } finally {
      setLoading(false);
    }
  };

  const roleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      case 'comptable': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
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
          {user?.shop_name && (
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Boutique</p>
                <p className="font-semibold text-gray-900 dark:text-white">{user?.shop_name}</p>
              </div>
            </div>
          )}

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

      {/* Gestion des membres (admin uniquement) */}
      {isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Membres de la boutique
            </h2>
            <button
              type="button"
              onClick={() => setShowMemberForm(!showMemberForm)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showMemberForm ? 'Fermer' : 'Ajouter'}</span>
            </button>
          </div>

          {showMemberForm && (
            <form onSubmit={handleAddMember} className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="label">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={memberForm.username}
                  onChange={(e) => setMemberForm({ ...memberForm, username: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  className="input"
                  placeholder="6 caractères minimum"
                  required
                />
              </div>
              <div>
                <label className="label">Rôle</label>
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                  className="input"
                >
                  <option value="vendeur">Vendeur</option>
                  <option value="comptable">Comptable</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? 'Ajout...' : 'Ajouter le membre'}
              </button>
            </form>
          )}

          {resetTarget && (
            <form onSubmit={handleResetPassword} className="space-y-4 mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Réinitialiser le mot de passe de {resetTarget.username}
              </p>
              <div>
                <label className="label">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Réinitialisation...' : 'Valider'}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetTarget(null); setNewPassword(''); }}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {membersLoading ? (
            <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3 pr-4">Utilisateur</th>
                    <th className="py-3 pr-4">Rôle</th>
                    <th className="py-3 pr-4 hidden md:table-cell">Email</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                        {member.username}{member.id === user?.id && <span className="ml-2 text-xs text-gray-500">(vous)</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={member.role}
                          disabled={!canChangeRole(member)}
                          onChange={(e) => handleChangeRole(member, e.target.value)}
                          className={`px-2 py-1 rounded-md text-xs font-medium ${roleBadgeColor(member.role)} ${canChangeRole(member) ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          <option value="vendeur">Vendeur</option>
                          <option value="comptable">Comptable</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        {member.email}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => { setResetTarget(member); setNewPassword(''); }}
                          className="text-amber-600 dark:text-amber-400 hover:underline text-xs mr-4"
                        >
                          Réinitialiser MDP
                        </button>
                        {canDeleteMember(member) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(member)}
                            className="text-red-600 dark:text-red-400 hover:underline text-xs"
                          >
                            Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
      </div>
    </div>
  );
};

export default Profile;