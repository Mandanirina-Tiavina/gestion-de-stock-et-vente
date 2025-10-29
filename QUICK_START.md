# ⚡ Quick Start - Installation en 5 Minutes

Guide rapide pour démarrer l'application localement.

## 📋 Prérequis

Vérifiez que vous avez :
```bash
node --version  # v18 ou supérieur
npm --version   # v9 ou supérieur
psql --version  # PostgreSQL 14 ou supérieur
```

## 🚀 Installation Rapide

### 1. Cloner et Installer

```bash
# Cloner le repository
git clone https://github.com/Mandanirina-Tiavina/gestion-de-stock-et-vente.git
cd gestion-de-stock-et-vente

# Installer le backend
cd backend
npm install
cd ..

# Installer le frontend
cd frontend
npm install
cd ..
```

### 2. Configuration de la Base de Données

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base de données
CREATE DATABASE gestion_stock;
CREATE USER gestion_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE gestion_stock TO gestion_user;
\q
```

### 3. Configuration Backend

```bash
cd backend

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos informations
nano .env
```

Contenu du `.env` :
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://gestion_user:votre_mot_de_passe@localhost:5432/gestion_stock
JWT_SECRET=votre_secret_jwt_tres_securise_changez_moi
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

### 4. Exécuter les Migrations

```bash
# Toujours dans le dossier backend
npm run migrate
```

Vous devriez voir :
```
🚀 Début de la migration de la base de données...
✅ Table users créée
✅ Table categories créée
✅ Table colors créée
✅ Table products créée
✅ Table orders créée
✅ Table sales créée
✅ Table transactions créée
✅ Table user_preferences créée
✅ Couleurs par défaut insérées
✅ Catégories par défaut insérées
✅ Utilisateur admin créé (username: admin, password: admin123)
🎉 Migration terminée avec succès !
```

### 5. Configuration Frontend

```bash
cd ../frontend

# Copier le fichier d'environnement
cp .env.example .env

# Le contenu par défaut devrait suffire
cat .env
```

Contenu du `.env` :
```env
VITE_API_URL=http://localhost:5000/api
```

### 6. Démarrer l'Application

**Terminal 1 - Backend** :
```bash
cd backend
npm run dev
```

Vous devriez voir :
```
🚀 Serveur démarré sur le port 5000
📍 URL: http://localhost:5000
🌍 Environnement: development
✅ Connecté à la base de données PostgreSQL
```

**Terminal 2 - Frontend** :
```bash
cd frontend
npm run dev
```

Vous devriez voir :
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### 7. Accéder à l'Application

1. Ouvrez votre navigateur
2. Allez sur `http://localhost:5173`
3. Connectez-vous avec :
   - **Username** : `admin`
   - **Password** : `admin123`

## ✅ Vérification

### Tester l'API

```bash
# Test de santé
curl http://localhost:5000/api/health

# Devrait retourner :
# {"status":"OK","message":"API de gestion de stock et ventes","timestamp":"..."}
```

### Vérifier la Base de Données

```bash
psql -U gestion_user -d gestion_stock

# Lister les tables
\dt

# Vérifier l'utilisateur admin
SELECT username, email, role FROM users;

# Quitter
\q
```

## 🎉 C'est Prêt !

Votre application fonctionne maintenant localement !

**URLs importantes** :
- Frontend : http://localhost:5173
- Backend : http://localhost:5000
- API Health : http://localhost:5000/api/health

## 🔧 Commandes Utiles

### Backend

```bash
cd backend

# Démarrer en mode développement (avec auto-reload)
npm run dev

# Démarrer en mode production
npm start

# Réexécuter les migrations
npm run migrate

# Générer un hash de mot de passe
node src/utils/hashPassword.js monmotdepasse
```

### Frontend

```bash
cd frontend

# Démarrer en mode développement
npm run dev

# Build pour production
npm run build

# Prévisualiser le build
npm run preview
```

## 🐛 Problèmes Courants

### Erreur : "Cannot connect to database"

**Solution** :
```bash
# Vérifier que PostgreSQL est démarré
sudo systemctl status postgresql

# Démarrer PostgreSQL si nécessaire
sudo systemctl start postgresql

# Vérifier les credentials dans .env
```

### Erreur : "Port 5000 already in use"

**Solution** :
```bash
# Trouver le processus utilisant le port
lsof -i :5000

# Tuer le processus
kill -9 [PID]

# Ou changer le port dans backend/.env
PORT=5001
```

### Erreur : "ECONNREFUSED" sur le frontend

**Solution** :
1. Vérifiez que le backend est démarré
2. Vérifiez l'URL dans `frontend/.env`
3. Redémarrez le frontend

### Erreur lors de la migration

**Solution** :
```bash
# Supprimer la base de données et recommencer
psql -U postgres
DROP DATABASE gestion_stock;
CREATE DATABASE gestion_stock;
\q

# Réexécuter la migration
cd backend
npm run migrate
```

## 📱 Tester sur Mobile

### Option 1 : Même Réseau WiFi

```bash
# Démarrer le frontend avec --host
cd frontend
npm run dev -- --host

# Notez l'adresse Network (ex: 192.168.1.100:5173)
# Accédez depuis votre mobile avec cette adresse
```

### Option 2 : Ngrok (Tunnel)

```bash
# Installer ngrok
npm install -g ngrok

# Créer un tunnel pour le backend
ngrok http 5000

# Créer un tunnel pour le frontend
ngrok http 5173

# Utilisez les URLs https fournies
```

## 🎓 Prochaines Étapes

1. ✅ Explorez l'application
2. ✅ Lisez le [Guide Utilisateur](USER_GUIDE.md)
3. ✅ Ajoutez vos premiers produits
4. ✅ Créez des commandes de test
5. ✅ Consultez la documentation complète dans [README.md](README.md)
6. ✅ Préparez le déploiement avec [DEPLOYMENT.md](DEPLOYMENT.md)

## 💡 Conseils

- Utilisez deux terminaux séparés pour backend et frontend
- Gardez les logs visibles pour déboguer
- Testez d'abord localement avant de déployer
- Sauvegardez régulièrement votre base de données

## 🆘 Besoin d'Aide ?

- Consultez le [README.md](README.md) pour la documentation complète
- Lisez le [USER_GUIDE.md](USER_GUIDE.md) pour l'utilisation
- Consultez le [DEPLOYMENT.md](DEPLOYMENT.md) pour le déploiement
- Ouvrez une issue sur GitHub

---

**Bon développement ! 🚀**
