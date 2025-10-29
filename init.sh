#!/bin/bash

# Script d'initialisation automatique pour Gestion Stock & Ventes
# Usage: ./init.sh

set -e

echo "🚀 Initialisation de l'application Gestion Stock & Ventes"
echo "=========================================================="
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier les prérequis
echo "📋 Vérification des prérequis..."
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js n'est pas installé"
    echo "Installez Node.js depuis https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js installé : $NODE_VERSION"

# Vérifier npm
if ! command -v npm &> /dev/null; then
    print_error "npm n'est pas installé"
    exit 1
fi
NPM_VERSION=$(npm --version)
print_success "npm installé : $NPM_VERSION"

# Vérifier PostgreSQL
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL n'est pas installé ou pas dans le PATH"
    echo "Installez PostgreSQL depuis https://www.postgresql.org/"
else
    PSQL_VERSION=$(psql --version)
    print_success "PostgreSQL installé : $PSQL_VERSION"
fi

echo ""
echo "📦 Installation des dépendances..."
echo ""

# Installer les dépendances du backend
echo "Backend..."
cd backend
npm install
print_success "Dépendances backend installées"
cd ..

# Installer les dépendances du frontend
echo "Frontend..."
cd frontend
npm install
print_success "Dépendances frontend installées"
cd ..

echo ""
echo "⚙️  Configuration..."
echo ""

# Créer les fichiers .env s'ils n'existent pas
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    print_success "Fichier backend/.env créé"
    print_warning "N'oubliez pas de configurer DATABASE_URL et JWT_SECRET dans backend/.env"
else
    print_warning "backend/.env existe déjà, non modifié"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    print_success "Fichier frontend/.env créé"
else
    print_warning "frontend/.env existe déjà, non modifié"
fi

echo ""
echo "🎉 Installation terminée !"
echo ""
echo "📝 Prochaines étapes :"
echo ""
echo "1. Configurez PostgreSQL :"
echo "   sudo -u postgres psql"
echo "   CREATE DATABASE gestion_stock;"
echo "   CREATE USER gestion_user WITH PASSWORD 'votre_mot_de_passe';"
echo "   GRANT ALL PRIVILEGES ON DATABASE gestion_stock TO gestion_user;"
echo "   \\q"
echo ""
echo "2. Modifiez backend/.env avec vos informations de base de données"
echo ""
echo "3. Exécutez les migrations :"
echo "   cd backend && npm run migrate"
echo ""
echo "4. Démarrez l'application :"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "5. Accédez à http://localhost:5173"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📚 Documentation :"
echo "   - README.md : Documentation complète"
echo "   - QUICK_START.md : Guide de démarrage rapide"
echo "   - USER_GUIDE.md : Guide utilisateur"
echo "   - DEPLOYMENT.md : Guide de déploiement"
echo ""
print_success "Bonne utilisation ! 🚀"
