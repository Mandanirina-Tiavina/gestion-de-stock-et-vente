# 📦 Gestion de Stock et Ventes

Application web complète de gestion de stock et de ventes, **multi-boutique**, optimisée pour mobile avec interface responsive.

## 🎯 Fonctionnalités

### ✅ Authentification multi-boutique
- Inscription : création d'une boutique + compte administrateur
- Connexion par **Nom de boutique + Nom d'utilisateur + Mot de passe**
- Gestion des membres par boutique avec rôles (Admin, Vendeur, Comptable)
- Un utilisateur peut être le même nom dans plusieurs boutiques
- Protection JWT des routes API

### 👥 Gestion des membres (Admin)
- Liste des membres de la boutique (section "Membres" dans Mon Profil)
- Ajout de membres avec mot de passe défini par l'admin
- Réinitialisation du mot de passe d'un membre
- Modification du rôle (protégé : impossible de supprimer/rétrograder le dernier admin)
- Suppression d'un membre (sauf soi-même)

### 📦 Gestion du Stock
- Ajout, modification et suppression de produits (spécifiques à la boutique)
- Catégorisation des produits avec icônes (par boutique)
- Gestion des couleurs et tailles
- Alertes de stock faible
- Recherche et filtres avancés

### 🛒 Gestion des Commandes
- Création de commandes avec informations client complètes
- Suivi du statut (En attente, Vendu, Annulé)
- Modification du prix final lors de la vente
- Déduction automatique du stock lors de la vente

### 📊 Historique des Ventes
- Liste complète des ventes réalisées
- Filtres par date et catégorie
- Statistiques détaillées (total, moyenne, par catégorie)
- Export des données

### 💰 Comptabilité
- Tableau de bord financier complet
- Gestion des revenus et dépenses
- Calcul automatique du solde
- Historique des transactions
- Statistiques mensuelles

### 🎨 Interface
- Design moderne et responsive (Mobile-First)
- Thème clair/sombre avec sauvegarde des préférences
- Animations fluides et feedback visuel
- Navigation intuitive avec bottom nav sur mobile

## 🚀 Stack Technique

### Frontend
- **React 18** - Framework UI
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - Requêtes HTTP
- **Lucide React** - Icônes
- **Vite** - Build tool

### Backend
- **Node.js + Express** - Serveur API REST
- **PostgreSQL** - Base de données
- **JWT** - Authentification
- **Bcrypt** - Hashing des mots de passe

### Déploiement
- **Frontend**: Vercel
- **Backend**: Vercel (serverless)
- **Database**: Neon (PostgreSQL)

## 📋 Prérequis

- Node.js 18+ et npm
- PostgreSQL 14+
- Git

## 🛠️ Installation Locale

### 1. Cloner le repository

```bash
git clone https://github.com/Mandanirina-Tiavina/gestion-de-stock-et-vente.git
cd gestion-de-stock-et-vente
```

### 2. Configuration du Backend

```bash
cd backend

# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env
```

Modifier le fichier `.env` avec vos informations :

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/gestion_stock
DATABASE_SSL=true
JWT_SECRET=votre_secret_jwt_tres_securise_ici
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

### 3. Créer la base de données

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE gestion_stock;
\q

# Exécuter les migrations (crée le schéma multi-boutique)
npm run migrate
```

### 4. Démarrer le backend

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:5000`

### 5. Configuration du Frontend

```bash
cd ../frontend

# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env
```

Modifier le fichier `.env` :

```env
VITE_API_URL=http://localhost:5000/api
```

### 6. Démarrer le frontend

```bash
npm run dev
```

L'application démarre sur `http://localhost:5173`

## 🏪 Premiers pas (nouvelle boutique)

### Inscription
1. Accédez à `http://localhost:5173` (ou l'URL de production)
2. Onglet "Inscription"
3. Renseignez :
   - **Nom de la boutique** (ex : `Boutique Centre`) — unique à l'échelle de la plateforme
   - **Nom d'utilisateur** — votre identifiant au sein de la boutique
   - **Email** — unique à l'échelle de la plateforme (utilisé pour la récupération de mot de passe)
   - **Mot de passe**
4. Le compte créé a le rôle **Admin**. Les catégories et couleurs par défaut sont ajoutées automatiquement.

### Connexion
- Renseignez le **Nom de la boutique**, votre **Nom d'utilisateur** et votre **Mot de passe**.

### Inviter des membres (Admin)
1. Allez dans **Mon Profil**
2. Section **Membres de la boutique**
3. Cliquez sur "Ajouter", définissez le nom d'utilisateur, l'email, le mot de passe et le rôle
4. À tout moment : réinitialiser le mot de passe d'un membre, changer son rôle ou le supprimer

### Gestion du Stock

1. Allez dans "Stock"
2. Cliquez sur "Ajouter un produit"
3. Remplissez les informations (nom, catégorie, couleur, taille, quantité, prix)
4. Le produit apparaît dans la liste

### Créer une Commande

1. Allez dans "Commandes"
2. Cliquez sur "Nouvelle commande"
3. Sélectionnez un produit en stock
4. Remplissez les informations client et livraison
5. La commande est créée avec le statut "En attente"

### Marquer une Vente

1. Dans "Commandes", trouvez une commande en attente
2. Cliquez sur "Vendu"
3. Saisissez le prix final (peut être différent du prix de base)
4. Confirmez : le stock est déduit, la vente est enregistrée, le revenu est ajouté

### Gérer la Comptabilité

1. Allez dans "Comptabilité"
2. Consultez le tableau de bord (revenus, dépenses, solde)
3. Ajoutez des transactions manuelles (revenus additionnels, dépenses)
4. Consultez l'historique complet

## 🚀 Déploiement

### Déploiement sur Neon (Database)

1. Créez un compte sur [Neon](https://neon.tech)
2. Créez un projet PostgreSQL et copiez la **Connection string**
3. Définissez `DATABASE_URL` dans l'environnement du backend
4. Exécutez les migrations : `npm run migrate`

### Déploiement sur Vercel (Backend)

1. Créez un compte sur [Vercel](https://vercel.com)
2. **Déployer le backend** :
   - Import Project depuis GitHub
   - Root Directory : `backend`
   - Framework Preset : Other
   - Le déploiement est serverless : `backend/api/index.js` exporte l'application Express (voir `backend/vercel.json`)
   - Variables d'environnement :
     ```
     NODE_ENV=production
     DATABASE_URL=[Connection string Neon]
     DATABASE_SSL=true
     JWT_SECRET=[générez une clé aléatoire sécurisée]
     JWT_EXPIRE=7d
     FRONTEND_URL=[URL de votre frontend Vercel]
     ```

### Déploiement sur Vercel (Frontend)

1. Créez un compte sur [Vercel](https://vercel.com)

2. **Déployer le frontend** :
   - Import Project depuis GitHub
   - Root Directory : `frontend`
   - Framework Preset : Vite
   - Build Command : `npm run build`
   - Output Directory : `dist`
   - Variables d'environnement :
     ```
     VITE_API_URL=[URL de votre backend Vercel]/api
     ```

3. Déployez et votre application est en ligne ! 🎉

## 📊 Schéma de la Base de Données

```
shops
├── id (PK)
├── name (UNIQUE)
└── created_at

users
├── id (PK)
├── shop_id (FK → shops)
├── username (UNIQUE par boutique)
├── email (UNIQUE global)
├── password_hash
├── role (admin/vendeur/comptable)
└── created_at

categories
├── id (PK)
├── shop_id (FK → shops)
├── name (UNIQUE par boutique)
├── icon
├── color
└── created_at

colors
├── id (PK)
├── shop_id (FK → shops)
├── name (UNIQUE par boutique)
├── hex_code
└── created_at

products
├── id (PK)
├── shop_id (FK → shops)
├── name
├── category_id (FK)
├── color_id (FK)
├── size
├── quantity
├── price
├── alert_threshold
├── created_by (FK)
└── created_at

orders
├── id (PK)
├── shop_id (FK → shops)
├── customer_name
├── customer_phone
├── customer_email
├── delivery_address
├── delivery_date
├── status (en_attente/vendu/annule)
├── final_price
├── total_amount
├── created_by (FK)
└── created_at

order_items
├── id (PK)
├── order_id (FK → orders)
├── product_id (FK)
├── product_name
├── category_name
├── quantity
├── unit_price
└── total_price

sales
├── id (PK)
├── shop_id (FK → shops)
├── order_id (FK)
├── product_id (FK)
├── product_name
├── category_name
├── customer_name
├── final_price
├── sale_date
└── created_by (FK)

transactions
├── id (PK)
├── shop_id (FK → shops)
├── type (revenu/depense)
├── category
├── amount
├── description
├── transaction_date
└── created_by (FK)

user_preferences
├── id (PK)
├── user_id (FK, UNIQUE)
├── theme (light/dark)
└── updated_at
```

## 🔒 Sécurité

- ✅ Mots de passe hashés avec bcrypt
- ✅ Authentification JWT (shopId intégré au token)
- ✅ Protection CORS
- ✅ Validation des entrées côté serveur
- ✅ Requêtes préparées (protection SQL injection) + scoping `shop_id` (anti-IDOR)
- ✅ Vérification RBAC côté serveur (`authorizeRoles`)
- ✅ Variables d'environnement pour les secrets
- ✅ Unicité username par boutique (index composite)

## 📱 Responsive Design

L'application est optimisée pour :
- 📱 Mobile (360px - 414px) - Navigation bottom
- 💻 Tablet (768px - 1024px)
- 🖥️ Desktop (1024px+) - Navigation sidebar

## 🎨 Personnalisation

### Ajouter une catégorie

1. Allez dans "Paramètres"
2. Section "Catégories de produits"
3. Cliquez sur "Ajouter"
4. Choisissez un nom, un emoji et une couleur

### Ajouter une couleur

1. Allez dans "Paramètres"
2. Section "Couleurs disponibles"
3. Cliquez sur "Ajouter"
4. Choisissez un nom et un code couleur

## 🐛 Dépannage

### Erreur de connexion à la base de données

Vérifiez que :
- PostgreSQL est démarré
- Les credentials dans `.env` sont corrects
- La base de données existe

### Erreur CORS

Vérifiez que `FRONTEND_URL` dans le backend correspond à l'URL du frontend

### Erreur 401 (Non autorisé)

- Vérifiez que le token JWT est valide
- Reconnectez-vous si nécessaire

## 📝 Scripts disponibles

### Backend

```bash
npm start          # Démarrer le serveur
npm run dev        # Démarrer en mode développement (nodemon)
npm run migrate    # Exécuter les migrations (schéma multi-boutique)
npm run reset:all  # Réinitialiser entièrement la base (tables supprimées)
```

### Frontend

```bash
npm run dev        # Démarrer en mode développement
npm run build      # Build pour production
npm run preview    # Preview du build
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails

## 👨‍💻 Auteur

Développé avec ❤️ pour la gestion efficace de votre business

## 🙏 Remerciements

- React Team pour l'excellent framework
- Tailwind CSS pour le système de design
- Lucide pour les icônes magnifiques
- La communauté open source

---

**Note** : chaque boutique travaille sur ses propres données (produits, commandes, ventes, comptabilité, catégories, couleurs, membres).
