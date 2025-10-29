# 🚀 Guide de Déploiement

Ce guide vous accompagne pas à pas pour déployer votre application sur des services gratuits.

## 📋 Prérequis

- Compte GitHub
- Compte Render.com (gratuit)
- Compte Vercel (gratuit)
- Repository GitHub avec le code

## 🗄️ Étape 1 : Déployer la Base de Données (Render)

### 1.1 Créer un compte Render

1. Allez sur [render.com](https://render.com)
2. Inscrivez-vous avec votre compte GitHub
3. Confirmez votre email

### 1.2 Créer la base de données PostgreSQL

1. Dans le dashboard Render, cliquez sur **"New +"**
2. Sélectionnez **"PostgreSQL"**
3. Configurez :
   - **Name** : `gestion-stock-db`
   - **Database** : `gestion_stock`
   - **User** : (généré automatiquement)
   - **Region** : Choisissez le plus proche (ex: Frankfurt)
   - **PostgreSQL Version** : 14 ou supérieur
   - **Plan** : **Free** (limité mais suffisant pour démarrer)

4. Cliquez sur **"Create Database"**

5. **IMPORTANT** : Notez les informations de connexion :
   - **Internal Database URL** (à utiliser pour le backend)
   - **External Database URL** (pour accès depuis votre machine)

### 1.3 Initialiser la base de données

Depuis votre machine locale :

```bash
# Installer psql si nécessaire (Ubuntu/Debian)
sudo apt-get install postgresql-client

# Se connecter à la base de données Render
psql [EXTERNAL_DATABASE_URL]

# Vérifier la connexion
\l

# Quitter
\q
```

## 🔧 Étape 2 : Déployer le Backend (Render)

### 2.1 Préparer le repository

Assurez-vous que votre code est poussé sur GitHub :

```bash
cd gestion-de-stock-et-vente
git add .
git commit -m "Préparation pour déploiement"
git push origin main
```

### 2.2 Créer le Web Service

1. Dans Render, cliquez sur **"New +"** → **"Web Service"**
2. Connectez votre repository GitHub
3. Sélectionnez le repository `gestion-de-stock-et-vente`

### 2.3 Configuration du service

- **Name** : `gestion-stock-api`
- **Region** : Même région que la base de données
- **Branch** : `main`
- **Root Directory** : `backend`
- **Runtime** : `Node`
- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Plan** : **Free**

### 2.4 Variables d'environnement

Cliquez sur **"Advanced"** puis ajoutez ces variables :

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=[Copiez l'Internal Database URL de votre base de données]
JWT_SECRET=[Générez une clé aléatoire sécurisée - voir ci-dessous]
JWT_EXPIRE=7d
FRONTEND_URL=https://votre-app.vercel.app
```

**Générer un JWT_SECRET sécurisé** :

```bash
# Option 1 : Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2 : OpenSSL
openssl rand -hex 64

# Option 3 : En ligne
# Utilisez https://randomkeygen.com/
```

### 2.5 Déployer

1. Cliquez sur **"Create Web Service"**
2. Attendez que le déploiement se termine (5-10 minutes)
3. Notez l'URL de votre API : `https://gestion-stock-api.onrender.com`

### 2.6 Exécuter les migrations

Une fois le service déployé :

1. Dans le dashboard de votre service, allez dans **"Shell"**
2. Exécutez :

```bash
npm run migrate
```

3. Vérifiez que les tables sont créées et que l'utilisateur admin existe

## 🎨 Étape 3 : Déployer le Frontend (Vercel)

### 3.1 Créer un compte Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Inscrivez-vous avec votre compte GitHub
3. Autorisez Vercel à accéder à vos repositories

### 3.2 Importer le projet

1. Cliquez sur **"Add New..."** → **"Project"**
2. Sélectionnez votre repository `gestion-de-stock-et-vente`
3. Cliquez sur **"Import"**

### 3.3 Configuration du projet

- **Framework Preset** : Vite
- **Root Directory** : `frontend`
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Install Command** : `npm install`

### 3.4 Variables d'environnement

Ajoutez cette variable :

```env
VITE_API_URL=https://gestion-stock-api.onrender.com/api
```

**Important** : Remplacez par l'URL réelle de votre backend Render

### 3.5 Déployer

1. Cliquez sur **"Deploy"**
2. Attendez que le déploiement se termine (2-5 minutes)
3. Votre application est en ligne ! 🎉

Notez l'URL : `https://gestion-stock-et-vente.vercel.app`

## 🔄 Étape 4 : Finaliser la configuration

### 4.1 Mettre à jour FRONTEND_URL dans le backend

1. Retournez dans Render → Votre service backend
2. Allez dans **"Environment"**
3. Modifiez `FRONTEND_URL` avec l'URL Vercel
4. Sauvegardez (le service redémarrera automatiquement)

### 4.2 Tester l'application

1. Ouvrez l'URL Vercel dans votre navigateur
2. Connectez-vous avec :
   - Username : `admin`
   - Password : `admin123`
3. Testez les fonctionnalités principales

## 🔍 Vérification et Tests

### Vérifier le backend

```bash
# Test de santé de l'API
curl https://gestion-stock-api.onrender.com/api/health

# Devrait retourner :
# {"status":"OK","message":"API de gestion de stock et ventes","timestamp":"..."}
```

### Vérifier la base de données

```bash
# Se connecter à la base
psql [EXTERNAL_DATABASE_URL]

# Lister les tables
\dt

# Vérifier l'utilisateur admin
SELECT username, email, role FROM users WHERE username = 'admin';

# Quitter
\q
```

## 🐛 Dépannage

### Erreur : "Application failed to respond"

**Cause** : Le backend ne démarre pas correctement

**Solutions** :
1. Vérifiez les logs dans Render → Votre service → "Logs"
2. Vérifiez que `DATABASE_URL` est correcte
3. Vérifiez que toutes les dépendances sont installées

### Erreur : "Cannot connect to database"

**Cause** : Problème de connexion à PostgreSQL

**Solutions** :
1. Vérifiez que la base de données est active dans Render
2. Vérifiez que `DATABASE_URL` utilise l'Internal URL
3. Assurez-vous que la base de données et le backend sont dans la même région

### Erreur CORS sur le frontend

**Cause** : `FRONTEND_URL` mal configurée dans le backend

**Solutions** :
1. Vérifiez que `FRONTEND_URL` dans Render correspond exactement à l'URL Vercel
2. Pas de slash final dans l'URL
3. Redémarrez le service backend après modification

### Le frontend ne se connecte pas au backend

**Cause** : `VITE_API_URL` mal configurée

**Solutions** :
1. Vérifiez `VITE_API_URL` dans Vercel → Settings → Environment Variables
2. L'URL doit se terminer par `/api`
3. Redéployez le frontend après modification

### Erreur 401 lors de la connexion

**Cause** : Problème avec le hash du mot de passe

**Solutions** :
1. Reconnectez-vous à la base de données
2. Réinitialisez le mot de passe admin :

```sql
-- Générer un nouveau hash
-- Sur votre machine locale :
node backend/src/utils/hashPassword.js admin123

-- Dans psql :
UPDATE users 
SET password_hash = '[NOUVEAU_HASH]' 
WHERE username = 'admin';
```

## 📊 Monitoring et Maintenance

### Surveiller les performances

**Render** :
- Dashboard → Metrics
- Surveillez l'utilisation CPU et mémoire
- Le plan gratuit a des limites : 750h/mois

**Vercel** :
- Analytics → Overview
- Surveillez les temps de chargement
- Le plan gratuit a 100GB de bande passante/mois

### Sauvegardes de la base de données

**Important** : Le plan gratuit Render ne fait pas de sauvegardes automatiques

**Solution manuelle** :

```bash
# Sauvegarder la base de données
pg_dump [EXTERNAL_DATABASE_URL] > backup_$(date +%Y%m%d).sql

# Restaurer une sauvegarde
psql [EXTERNAL_DATABASE_URL] < backup_20231201.sql
```

**Recommandation** : Faites une sauvegarde hebdomadaire

### Mettre à jour l'application

```bash
# Sur votre machine locale
git add .
git commit -m "Mise à jour de l'application"
git push origin main

# Render et Vercel redéploient automatiquement !
```

## 🔐 Sécurité en Production

### Checklist de sécurité

- ✅ `JWT_SECRET` est une clé aléatoire forte (64+ caractères)
- ✅ `NODE_ENV=production` est défini
- ✅ Les mots de passe par défaut ont été changés
- ✅ Les variables d'environnement ne sont pas dans le code
- ✅ HTTPS est activé (automatique sur Render et Vercel)
- ✅ CORS est configuré correctement

### Changer le mot de passe admin

Après le premier déploiement :

1. Connectez-vous avec `admin/admin123`
2. Créez un nouvel utilisateur admin avec un mot de passe fort
3. Supprimez ou désactivez l'ancien compte admin

## 💰 Limites du Plan Gratuit

### Render (Free)

- ✅ 750 heures/mois (suffisant pour 1 service)
- ✅ 512 MB RAM
- ✅ Services s'endorment après 15 min d'inactivité
- ⚠️ Premier démarrage peut prendre 30-60 secondes
- ⚠️ Base de données expire après 90 jours d'inactivité

### Vercel (Hobby)

- ✅ 100 GB bande passante/mois
- ✅ Déploiements illimités
- ✅ Domaines personnalisés
- ✅ SSL automatique
- ⚠️ Pas de support commercial

### Recommandations

Pour un usage personnel (3 utilisateurs max) :
- ✅ Les plans gratuits sont suffisants
- ✅ Performances acceptables
- ⚠️ Prévoyez un temps de démarrage initial

Pour un usage professionnel :
- 💰 Passez aux plans payants ($7-25/mois)
- 🚀 Meilleures performances
- 📞 Support technique
- 💾 Sauvegardes automatiques

## 🎉 Félicitations !

Votre application est maintenant déployée et accessible en ligne !

**URLs importantes** :
- Frontend : `https://votre-app.vercel.app`
- Backend : `https://gestion-stock-api.onrender.com`
- Database : Accessible via psql

**Prochaines étapes** :
1. Testez toutes les fonctionnalités
2. Créez des comptes utilisateurs
3. Ajoutez vos produits
4. Partagez l'URL avec votre équipe

**Besoin d'aide ?** Consultez la documentation ou ouvrez une issue sur GitHub.
