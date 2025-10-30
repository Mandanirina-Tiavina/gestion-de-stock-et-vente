import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.requestPasswordReset(email);
      
      // En développement, afficher le code
      if (response.data.code) {
        console.log('🔑 Code de réinitialisation:', response.data.code);
        toast.success(`Code envoyé ! En dev: ${response.data.code}`);
      } else {
        toast.success('Un code a été envoyé à votre email');
      }
      
      // Rediriger vers la page de réinitialisation avec l'email
      navigate('/reset-password', { state: { email } });
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Bouton retour */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour à la connexion</span>
        </button>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Mot de passe oublié ?
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Entrez votre email pour recevoir un code de réinitialisation
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le code'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 Vous recevrez un code à 6 chiffres par email. Ce code est valable pendant 1 heure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
