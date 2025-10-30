# Configuration de l'envoi d'emails

## Mode Développement (par défaut)

En mode développement, les emails ne sont **pas réellement envoyés**. Le token de réinitialisation est affiché dans la console du serveur.

Quand vous demandez une réinitialisation de mot de passe, regardez les logs du serveur backend :
```
✅ Email de réinitialisation envoyé à user@example.com
🔑 Token de réinitialisation: abc123xyz789
🌐 URL de réinitialisation: http://localhost:5173/reset-password?token=abc123xyz789
```

Copiez le token et utilisez-le pour tester la réinitialisation.

## Configuration Gmail (Production)

Pour envoyer de vrais emails via Gmail :

### 1. Activer l'authentification à 2 facteurs sur votre compte Gmail
- Allez sur https://myaccount.google.com/security
- Activez la "Validation en deux étapes"

### 2. Créer un mot de passe d'application
- Allez sur https://myaccount.google.com/apppasswords
- Sélectionnez "Autre (nom personnalisé)"
- Entrez "Stock & Ventes"
- Copiez le mot de passe généré (16 caractères)

### 3. Configurer les variables d'environnement

Dans votre fichier `.env` :
```env
EMAIL_SERVICE=gmail
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # Le mot de passe d'application
EMAIL_FROM="Stock & Ventes <votre.email@gmail.com>"
FRONTEND_URL=https://votre-site.vercel.app
```

### 4. Sur Render

Ajoutez ces variables d'environnement dans les paramètres de votre service Render :
- `EMAIL_SERVICE` = `gmail`
- `EMAIL_USER` = `votre.email@gmail.com`
- `EMAIL_PASSWORD` = `votre mot de passe d'application`
- `EMAIL_FROM` = `"Stock & Ventes <votre.email@gmail.com>"`
- `FRONTEND_URL` = `https://gestion-de-stock-et-vente.vercel.app`

## Autres services d'email

### SendGrid (recommandé pour la production)
```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=votre_api_key_sendgrid
```

### Mailgun
```env
EMAIL_SERVICE=mailgun
EMAIL_USER=votre_username_mailgun
EMAIL_PASSWORD=votre_api_key_mailgun
```

## Test

Pour tester l'envoi d'email :
1. Lancez le backend
2. Allez sur la page Profil
3. Cliquez sur "Mot de passe oublié ?"
4. Entrez votre email
5. Vérifiez :
   - En dev : les logs du serveur
   - En prod : votre boîte email

## Dépannage

### Les emails ne sont pas reçus
- Vérifiez le dossier spam
- Vérifiez que `EMAIL_SERVICE=gmail` est bien configuré
- Vérifiez que le mot de passe d'application est correct
- Regardez les logs du serveur pour les erreurs

### Erreur "Invalid login"
- Assurez-vous d'utiliser un mot de passe d'application, pas votre mot de passe Gmail normal
- Vérifiez que l'authentification à 2 facteurs est activée

### Les logs montrent "Email envoyé" mais rien n'arrive
- Vérifiez que `FRONTEND_URL` pointe vers votre vraie URL de production
- Attendez quelques minutes (les emails peuvent prendre du temps)
