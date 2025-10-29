# 📱 Guide Utilisateur - Gestion Stock & Ventes

Guide complet pour utiliser l'application de gestion de stock et ventes.

## 🚀 Démarrage Rapide

### Première Connexion

1. Ouvrez l'application dans votre navigateur
2. Vous arrivez sur la page de connexion
3. Utilisez les identifiants par défaut :
   - **Username** : `admin`
   - **Password** : `admin123`
4. Cliquez sur "Se connecter"

> ⚠️ **Important** : Changez le mot de passe admin après la première connexion !

## 📊 Tableau de Bord

### Vue d'ensemble

Le tableau de bord affiche :
- **Nombre de produits en stock**
- **Commandes en attente**
- **Total des ventes**
- **Solde actuel**

### Alertes Stock Faible

Si des produits ont un stock inférieur au seuil d'alerte, une notification jaune apparaît avec :
- Liste des produits concernés
- Quantité restante
- Lien vers la gestion du stock

### Commandes Récentes

Les 5 dernières commandes sont affichées avec leur statut.

## 📦 Gestion du Stock

### Ajouter un Produit

1. Allez dans **"Stock"** (menu du bas sur mobile)
2. Cliquez sur **"Ajouter un produit"**
3. Remplissez le formulaire :
   - **Nom** : Ex. "T-shirt Polo"
   - **Catégorie** : Sélectionnez dans la liste
   - **Couleur** : Choisissez la couleur
   - **Taille** : Ex. "M", "L", "XL"
   - **Quantité** : Nombre d'unités en stock
   - **Prix** : Prix de vente suggéré (en Ariary)
   - **Seuil d'alerte** : Quantité minimale avant alerte (défaut: 5)
4. Cliquez sur **"Ajouter"**

### Modifier un Produit

1. Dans la liste des produits, trouvez le produit à modifier
2. Cliquez sur **"Modifier"**
3. Modifiez les informations souhaitées
4. Cliquez sur **"Mettre à jour"**

### Supprimer un Produit

1. Trouvez le produit à supprimer
2. Cliquez sur l'icône **🗑️ (Corbeille)**
3. Confirmez la suppression

> ⚠️ **Attention** : La suppression est définitive !

### Rechercher et Filtrer

- **Barre de recherche** : Tapez le nom du produit ou de la catégorie
- **Filtre par catégorie** : Sélectionnez une catégorie spécifique

### Comprendre les Indicateurs

- **🟡 Icône d'alerte** : Stock faible
- **Nombre en vert** : Stock suffisant
- **Nombre en jaune** : Stock sous le seuil d'alerte

## 🛒 Gestion des Commandes

### Créer une Commande

1. Allez dans **"Commandes"**
2. Cliquez sur **"Nouvelle commande"**
3. Remplissez les informations :

   **Produit** :
   - Sélectionnez un produit en stock
   - Seuls les produits avec stock > 0 sont disponibles

   **Informations Client** :
   - **Nom** : Nom complet du client (requis)
   - **Téléphone** : Numéro de contact (optionnel)
   - **Email** : Adresse email (optionnel)

   **Livraison** :
   - **Adresse** : Adresse complète de livraison (requis)
   - **Date et heure** : Moment prévu pour la livraison (requis)

4. Cliquez sur **"Créer la commande"**

### Statuts des Commandes

- **🟡 En attente** : Commande créée, en attente de traitement
- **🟢 Vendu** : Commande finalisée et payée
- **🔴 Annulé** : Commande annulée

### Marquer une Commande comme Vendue

1. Trouvez la commande en attente
2. Cliquez sur **"Vendu"**
3. Une fenêtre s'ouvre :
   - **Prix final** : Saisissez le prix réellement payé
   - Le prix suggéré est affiché (peut être différent si négociation)
4. Cliquez sur **"Confirmer la vente"**

**Ce qui se passe automatiquement** :
- ✅ Le stock est déduit de 1 unité
- ✅ La vente est ajoutée à l'historique
- ✅ Le revenu est enregistré en comptabilité
- ✅ Le statut passe à "Vendu"

### Annuler une Commande

1. Trouvez la commande en attente
2. Cliquez sur **"Annuler"**
3. Le statut passe à "Annulé"

> ℹ️ **Note** : L'annulation ne remet pas le stock à jour

### Rechercher une Commande

- **Barre de recherche** : Tapez le nom du client ou du produit
- **Filtre par statut** : Affichez uniquement les commandes d'un statut spécifique

## 📈 Historique des Ventes

### Consulter les Ventes

L'historique affiche toutes les ventes réalisées avec :
- Date et heure de la vente
- Nom du produit
- Catégorie
- Nom du client
- Prix final

### Statistiques

**Cartes de statistiques** :
- **Total des ventes** : Montant total de toutes les ventes
- **Ventes du mois** : Montant du mois en cours
- **Moyenne par vente** : Prix moyen d'une vente

**Ventes par catégorie** :
- Graphique en barres montrant la répartition
- Nombre de ventes par catégorie
- Montant total par catégorie

### Filtrer les Ventes

**Par date** :
1. Sélectionnez une **Date de début**
2. Sélectionnez une **Date de fin**
3. Les ventes sont filtrées automatiquement

**Réinitialiser** :
- Cliquez sur **"Réinitialiser"** pour afficher toutes les ventes

## 💰 Comptabilité

### Tableau de Bord Financier

**Vue d'ensemble** :
- **Total Revenus** : Somme de tous les revenus (ventes + revenus additionnels)
- **Total Dépenses** : Somme de toutes les dépenses
- **Solde Net** : Revenus - Dépenses

**Statistiques mensuelles** :
- Revenus du mois en cours
- Dépenses du mois en cours
- Solde du mois

### Ajouter une Transaction Manuelle

**Quand ajouter une transaction ?**
- Vente réalisée hors système
- Remboursement reçu
- Achat de matériel
- Frais de livraison
- Charges diverses

**Procédure** :
1. Cliquez sur **"Ajouter une transaction"**
2. Choisissez le **type** :
   - **💚 Revenu** : Argent entrant
   - **❤️ Dépense** : Argent sortant
3. Remplissez :
   - **Catégorie** : Ex. "Vente hors système", "Achat matériel"
   - **Montant** : Montant en Ariary
   - **Description** : Détails optionnels
   - **Date** : Date de la transaction
4. Cliquez sur **"Ajouter"**

### Consulter l'Historique

Toutes les transactions sont listées avec :
- Type (revenu/dépense) avec icône colorée
- Catégorie et description
- Montant (+ pour revenu, - pour dépense)
- Date de la transaction
- Bouton de suppression

### Filtrer les Transactions

- **Toutes les transactions** : Affiche tout
- **Revenus uniquement** : Affiche seulement les revenus
- **Dépenses uniquement** : Affiche seulement les dépenses

### Supprimer une Transaction

1. Trouvez la transaction à supprimer
2. Cliquez sur l'icône **🗑️**
3. Confirmez la suppression

> ⚠️ **Attention** : Les transactions de ventes automatiques ne peuvent pas être supprimées ici

## ⚙️ Paramètres

### Gérer les Catégories

**Ajouter une catégorie** :
1. Allez dans **"Paramètres"**
2. Section **"Catégories de produits"**
3. Cliquez sur **"Ajouter"**
4. Remplissez :
   - **Nom** : Ex. "Chemise", "Short"
   - **Icône** : Copiez un emoji (Ex. 👔, 🩳)
   - **Couleur** : Choisissez une couleur d'identification
5. Cliquez sur **"Ajouter"**

**Modifier une catégorie** :
1. Trouvez la catégorie
2. Cliquez sur **"Modifier"**
3. Modifiez les informations
4. Cliquez sur **"Mettre à jour"**

**Supprimer une catégorie** :
1. Cliquez sur l'icône **🗑️**
2. Confirmez la suppression

> ⚠️ **Note** : Les produits de cette catégorie ne seront pas supprimés, mais n'auront plus de catégorie

### Gérer les Couleurs

**Ajouter une couleur** :
1. Section **"Couleurs disponibles"**
2. Cliquez sur **"Ajouter"**
3. Remplissez :
   - **Nom** : Ex. "Bleu ciel", "Rouge bordeaux"
   - **Code couleur** : Sélectionnez avec le sélecteur ou tapez le code hex
4. Cliquez sur **"Ajouter"**

## 🎨 Thème Clair/Sombre

### Changer le Thème

1. Cliquez sur l'icône **🌙/☀️** dans le header
2. Le thème bascule automatiquement
3. Votre préférence est sauvegardée

**Thèmes disponibles** :
- **☀️ Clair** : Fond blanc, idéal en journée
- **🌙 Sombre** : Fond noir, confortable la nuit

## 👥 Gestion des Utilisateurs

### Rôles Disponibles

- **👑 Admin** : Accès complet à toutes les fonctionnalités
- **🛒 Vendeur** : Gestion des commandes et consultation du stock
- **💰 Comptable** : Accès à la comptabilité et consultation des ventes

### Créer un Utilisateur

1. Déconnectez-vous
2. Sur la page de connexion, cliquez sur **"Inscription"**
3. Remplissez :
   - **Nom d'utilisateur** : Unique
   - **Email** : Adresse email valide
   - **Mot de passe** : Sécurisé (8+ caractères)
4. Cliquez sur **"S'inscrire"**

> ℹ️ **Note** : Les nouveaux utilisateurs ont le rôle "Vendeur" par défaut

### Se Déconnecter

**Sur Desktop** :
- Cliquez sur **"Déconnexion"** dans le header

**Sur Mobile** :
- Ouvrez le menu burger (☰)
- Cliquez sur **"Déconnexion"** en bas du menu

## 📱 Navigation Mobile

### Menu Bottom (Bas de l'écran)

- **🏠 Accueil** : Tableau de bord
- **📦 Stock** : Gestion des produits
- **🛒 Commandes** : Gestion des commandes
- **📈 Ventes** : Historique des ventes
- **💰 Compta** : Comptabilité

### Menu Burger (☰)

Accès à :
- Toutes les sections
- Paramètres
- Déconnexion

## 💡 Conseils et Astuces

### Optimiser la Gestion du Stock

1. **Définissez des seuils d'alerte pertinents**
   - Produits à rotation rapide : seuil plus élevé (10-15)
   - Produits à rotation lente : seuil plus bas (3-5)

2. **Utilisez les catégories efficacement**
   - Créez des catégories logiques
   - Utilisez des emojis reconnaissables

3. **Mettez à jour régulièrement**
   - Vérifiez le stock physique chaque semaine
   - Corrigez les écarts immédiatement

### Gérer les Commandes Efficacement

1. **Remplissez toutes les informations**
   - Plus d'infos = meilleur suivi
   - Le téléphone est crucial pour la livraison

2. **Planifiez les livraisons**
   - Groupez les livraisons par zone
   - Prévoyez une marge de temps

3. **Communiquez avec les clients**
   - Confirmez la commande par téléphone
   - Prévenez en cas de retard

### Suivre la Comptabilité

1. **Enregistrez TOUTES les transactions**
   - Même les petites dépenses
   - Gardez les justificatifs

2. **Catégorisez correctement**
   - Utilisez des noms de catégories clairs
   - Soyez cohérent dans les noms

3. **Vérifiez régulièrement**
   - Consultez le solde chaque semaine
   - Comparez avec votre compte bancaire

## 🆘 Problèmes Courants

### "Produit en rupture de stock"

**Problème** : Impossible de créer une commande pour ce produit

**Solution** :
1. Allez dans "Stock"
2. Modifiez le produit
3. Augmentez la quantité
4. Réessayez de créer la commande

### "Erreur lors de la sauvegarde"

**Problème** : Les modifications ne sont pas enregistrées

**Solutions** :
1. Vérifiez votre connexion internet
2. Actualisez la page (F5)
3. Reconnectez-vous
4. Réessayez

### "Token invalide ou expiré"

**Problème** : Déconnexion automatique

**Solution** :
- Reconnectez-vous
- Votre session a expiré après 7 jours

### L'application est lente

**Sur mobile** :
1. Fermez les autres applications
2. Videz le cache du navigateur
3. Utilisez une connexion WiFi stable

**Sur desktop** :
1. Fermez les onglets inutiles
2. Videz le cache
3. Essayez un autre navigateur

## 📞 Support

### Besoin d'Aide ?

1. Consultez ce guide utilisateur
2. Vérifiez le README.md pour les aspects techniques
3. Consultez le DEPLOYMENT.md pour les problèmes de déploiement

### Signaler un Bug

1. Notez ce que vous faisiez
2. Notez le message d'erreur exact
3. Faites une capture d'écran si possible
4. Contactez l'administrateur système

## 🎓 Formation Recommandée

### Pour les Nouveaux Utilisateurs

**Jour 1 - Découverte** :
- Se connecter
- Explorer le tableau de bord
- Comprendre les différentes sections

**Jour 2 - Stock** :
- Ajouter 5 produits de test
- Modifier un produit
- Rechercher et filtrer

**Jour 3 - Commandes** :
- Créer 2 commandes
- Marquer une comme vendue
- Annuler une commande

**Jour 4 - Comptabilité** :
- Consulter les statistiques
- Ajouter une transaction manuelle
- Comprendre le solde

**Jour 5 - Pratique** :
- Utiliser l'application normalement
- Tester toutes les fonctionnalités
- Personnaliser les paramètres

---

**Bonne utilisation ! 🚀**

Pour toute question, n'hésitez pas à consulter la documentation technique ou à contacter le support.
