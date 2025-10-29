# 🏗️ Architecture de l'Application

Documentation technique de l'architecture du projet.

## 📁 Structure du Projet

```
gestion-de-stock-et-vente/
│
├── backend/                      # API REST Node.js
│   ├── src/
│   │   ├── config/              # Configuration
│   │   │   ├── database.js      # Connexion PostgreSQL
│   │   │   └── migrate.js       # Script de migration
│   │   ├── controllers/         # Logique métier
│   │   │   ├── authController.js
│   │   │   ├── productController.js
│   │   │   ├── orderController.js
│   │   │   ├── salesController.js
│   │   │   ├── accountingController.js
│   │   │   └── categoryController.js
│   │   ├── middleware/          # Middlewares
│   │   │   └── auth.js          # Authentification JWT
│   │   ├── routes/              # Routes API
│   │   │   ├── authRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   ├── salesRoutes.js
│   │   │   ├── accountingRoutes.js
│   │   │   └── categoryRoutes.js
│   │   ├── utils/               # Utilitaires
│   │   │   └── hashPassword.js
│   │   └── server.js            # Point d'entrée
│   ├── .env.example             # Template variables d'environnement
│   ├── package.json
│   └── render.yaml              # Configuration Render
│
├── frontend/                     # Application React
│   ├── src/
│   │   ├── components/          # Composants réutilisables
│   │   │   ├── Layout.jsx       # Layout principal
│   │   │   ├── Header.jsx       # En-tête
│   │   │   ├── BottomNav.jsx    # Navigation mobile
│   │   │   ├── Sidebar.jsx      # Menu latéral
│   │   │   ├── Modal.jsx        # Composant modal
│   │   │   └── Loading.jsx      # Indicateur de chargement
│   │   ├── contexts/            # Contextes React
│   │   │   ├── AuthContext.jsx  # Gestion authentification
│   │   │   └── ThemeContext.jsx # Gestion thème
│   │   ├── pages/               # Pages de l'application
│   │   │   ├── Login.jsx        # Connexion/Inscription
│   │   │   ├── Dashboard.jsx    # Tableau de bord
│   │   │   ├── Stock.jsx        # Gestion du stock
│   │   │   ├── Orders.jsx       # Gestion des commandes
│   │   │   ├── Sales.jsx        # Historique des ventes
│   │   │   ├── Accounting.jsx   # Comptabilité
│   │   │   └── Settings.jsx     # Paramètres
│   │   ├── services/            # Services API
│   │   │   └── api.js           # Client API Axios
│   │   ├── App.jsx              # Composant racine
│   │   ├── main.jsx             # Point d'entrée
│   │   └── index.css            # Styles globaux
│   ├── public/                  # Fichiers statiques
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vercel.json              # Configuration Vercel
│
├── .gitignore
├── LICENSE
├── README.md                     # Documentation principale
├── QUICK_START.md               # Guide de démarrage rapide
├── USER_GUIDE.md                # Guide utilisateur
├── DEPLOYMENT.md                # Guide de déploiement
├── ARCHITECTURE.md              # Ce fichier
└── init.sh                      # Script d'initialisation
```

## 🔄 Flux de Données

### Authentification

```
Client (React)
    ↓ POST /api/auth/login {username, password}
Backend (Express)
    ↓ Vérification credentials
Database (PostgreSQL)
    ↓ Retour user data
Backend
    ↓ Génération JWT token
    ↓ Response {user, token}
Client
    ↓ Stockage token (localStorage)
    ↓ Configuration Axios headers
    ↓ Redirection vers Dashboard
```

### Création de Commande → Vente

```
1. Création Commande
   Client → POST /api/orders
   → Insertion dans table 'orders' (status: en_attente)

2. Marquage comme Vendu
   Client → PATCH /api/orders/:id/status {status: 'vendu', final_price}
   Backend (Transaction) :
   ├─ UPDATE orders SET status='vendu', final_price=X
   ├─ UPDATE products SET quantity = quantity - 1
   ├─ INSERT INTO sales (order_id, product_id, ...)
   └─ INSERT INTO transactions (type='revenu', amount=X)
   
3. Mise à jour UI
   Client recharge les données
   → Dashboard mis à jour
   → Stock mis à jour
   → Ventes mises à jour
   → Comptabilité mise à jour
```

## 🗄️ Schéma de Base de Données

### Relations

```
users (1) ──< (N) orders
users (1) ──< (N) sales
users (1) ──< (N) transactions
users (1) ──< (1) user_preferences

categories (1) ──< (N) products
colors (1) ──< (N) products

products (1) ──< (N) orders
orders (1) ──< (1) sales
```

### Tables Principales

**users**
- Stocke les utilisateurs et leurs rôles
- Hash bcrypt pour les mots de passe
- Relation avec toutes les actions (created_by)

**products**
- Catalogue des produits
- Références vers categories et colors
- Gestion du stock (quantity)
- Seuil d'alerte (alert_threshold)

**orders**
- Commandes clients
- États : en_attente, vendu, annule
- Lien vers le produit commandé

**sales**
- Historique immuable des ventes
- Créé automatiquement lors du passage à "vendu"
- Dénormalisation pour performance (product_name, category_name)

**transactions**
- Journal comptable
- Types : revenu, depense
- Créé automatiquement pour les ventes
- Ajout manuel pour autres transactions

## 🔐 Sécurité

### Backend

**Authentification**
```javascript
// Middleware auth.js
1. Extraction du token depuis header Authorization
2. Vérification JWT avec secret
3. Décodage et ajout user dans req.user
4. Passage au controller ou erreur 401/403
```

**Autorisation**
```javascript
// Middleware authorizeRoles
1. Vérification du rôle de l'utilisateur
2. Comparaison avec les rôles autorisés
3. Passage ou erreur 403
```

**Protection des données**
- Mots de passe hashés avec bcrypt (10 rounds)
- Tokens JWT signés avec secret fort
- Requêtes SQL préparées (protection injection)
- Validation des entrées avec express-validator
- CORS configuré pour frontend uniquement

### Frontend

**Protection des routes**
```javascript
// ProtectedRoute component
1. Vérification isAuthenticated
2. Si non authentifié → Redirect /login
3. Si authentifié → Affichage du composant
```

**Gestion du token**
```javascript
// Axios interceptor
1. Ajout automatique du token dans headers
2. Gestion erreur 401 → Déconnexion automatique
3. Redirection vers login
```

## 🎨 Architecture Frontend

### Gestion d'État

**Context API**
- `AuthContext` : État d'authentification global
- `ThemeContext` : Préférence de thème

**Local State**
- Chaque page gère son état local (useState)
- Chargement des données à l'initialisation (useEffect)

### Routing

```javascript
App.jsx
├── PublicRoute
│   └── /login → Login.jsx
└── ProtectedRoute
    └── Layout.jsx
        ├── / → Dashboard.jsx
        ├── /stock → Stock.jsx
        ├── /commandes → Orders.jsx
        ├── /ventes → Sales.jsx
        ├── /comptabilite → Accounting.jsx
        └── /parametres → Settings.jsx
```

### Communication API

```javascript
// services/api.js
- Configuration Axios centralisée
- Intercepteurs pour token et erreurs
- Fonctions API organisées par domaine
  - productAPI
  - orderAPI
  - salesAPI
  - accountingAPI
  - categoryAPI
```

## 📱 Responsive Design

### Breakpoints Tailwind

```css
/* Mobile First */
default: 0-640px      /* Mobile */
sm: 640px            /* Petit tablet */
md: 768px            /* Tablet */
lg: 1024px           /* Desktop */
xl: 1280px           /* Large desktop */
```

### Adaptations

**Navigation**
- Mobile (< 768px) : Bottom navigation + Menu burger
- Desktop (≥ 768px) : Header avec actions visibles

**Layout**
- Mobile : 1 colonne, padding réduit
- Tablet : 2 colonnes
- Desktop : 3-4 colonnes, sidebar

**Composants**
- Boutons : min 44x44px (touch-friendly)
- Inputs : min 44px height
- Cards : padding adaptatif
- Modals : Full screen mobile, centered desktop

## 🚀 Performance

### Backend

**Optimisations**
- Connexion pool PostgreSQL (réutilisation)
- Requêtes optimisées (SELECT uniquement colonnes nécessaires)
- Indexes sur colonnes fréquemment recherchées
- Transactions pour opérations multiples

**Caching**
- Pas de cache côté serveur (données temps réel)
- Possibilité d'ajouter Redis si nécessaire

### Frontend

**Optimisations**
- Code splitting par route (React.lazy possible)
- Build optimisé avec Vite
- Images optimisées (pas d'images dans v1)
- CSS purgé par Tailwind

**Chargement**
- Loading states pour feedback utilisateur
- Chargement parallèle des données (Promise.all)
- Pas de sur-fetching (requêtes ciblées)

## 🔄 Déploiement

### CI/CD

**Automatique via Git**
```
Local
  ↓ git push origin main
GitHub
  ↓ Webhook
Render (Backend)
  ↓ Build + Deploy automatique
  ↓ Redémarrage du service
Vercel (Frontend)
  ↓ Build + Deploy automatique
  ↓ Mise en ligne instantanée
```

### Environnements

**Development**
- Backend : localhost:5000
- Frontend : localhost:5173
- Database : PostgreSQL local

**Production**
- Backend : Render.com
- Frontend : Vercel
- Database : PostgreSQL Render

## 🧪 Tests (À implémenter)

### Backend

**Tests unitaires**
```javascript
// Exemple avec Jest
describe('AuthController', () => {
  test('login avec credentials valides', async () => {
    // Test
  });
});
```

**Tests d'intégration**
```javascript
// Exemple avec Supertest
describe('POST /api/auth/login', () => {
  test('retourne token et user', async () => {
    // Test
  });
});
```

### Frontend

**Tests composants**
```javascript
// Exemple avec React Testing Library
describe('Login', () => {
  test('affiche le formulaire', () => {
    // Test
  });
});
```

**Tests E2E**
```javascript
// Exemple avec Cypress
describe('Flux de vente', () => {
  it('crée une commande et la marque comme vendue', () => {
    // Test
  });
});
```

## 📊 Monitoring (Recommandé)

### Backend

**Logs**
- Console.log pour développement
- Winston/Morgan pour production
- Logs structurés (JSON)

**Métriques**
- Temps de réponse API
- Taux d'erreur
- Utilisation mémoire/CPU

### Frontend

**Analytics**
- Google Analytics (optionnel)
- Vercel Analytics (inclus)
- Suivi des erreurs (Sentry recommandé)

## 🔮 Évolutions Futures

### Fonctionnalités

- [ ] Export Excel/PDF des rapports
- [ ] Notifications push
- [ ] Mode hors ligne (PWA)
- [ ] Gestion multi-magasins
- [ ] Statistiques avancées
- [ ] Intégration paiement mobile
- [ ] API publique pour intégrations

### Technique

- [ ] Tests automatisés (Jest, Cypress)
- [ ] CI/CD avec GitHub Actions
- [ ] Monitoring avec Sentry
- [ ] Cache Redis
- [ ] WebSockets pour temps réel
- [ ] GraphQL au lieu de REST
- [ ] Migration vers TypeScript

## 📚 Ressources

**Documentation**
- [Express.js](https://expressjs.com/)
- [React](https://react.dev/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

**Outils**
- [Postman](https://www.postman.com/) - Test API
- [DBeaver](https://dbeaver.io/) - Client PostgreSQL
- [React DevTools](https://react.dev/learn/react-developer-tools)

---

**Architecture maintenue par** : Équipe de développement
**Dernière mise à jour** : 2024
