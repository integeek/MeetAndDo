# Meet&Do

Meet&Do est une application web complète de gestion d'événements qui met en relation des organisateurs (Meeters) proposant des activités variées (ateliers créatifs, yoga, jeux de société...) et des participants souhaitant les découvrir, s'y inscrire et laisser un avis.

## Fonctionnalités

### Participants (Users)
- Création de compte et authentification sécurisée par email
- Recherche d'activités par mots-clés, catégorie, lieu ou date (y compris via une mini-map)
- Consultation des détails d'une activité (description, lieu, créneaux, prix, avis)
- Réservation de créneaux avec choix du nombre de places
- Gestion de ses propres réservations (consultation, annulation)
- Soumission d'avis et de notes après participation
- Messagerie interne
- Signalement d'activités ou d'utilisateurs

### Organisateurs (Publishers/Meeters)
- Demande du statut Meeter via formulaire
- Création et gestion d'activités (titre, description, images, lieu, dates, prix, capacité)
- Tableau de bord : vue globale, statistiques, revenus, réservations, avis, historique
- Export CSV des participants
- Notifications par email (nouvelles réservations, annulations)

### Administrateurs
- Tableau de bord global (utilisateurs, activités, revenus, signalements)
- Gestion des utilisateurs (rôles, blocage)
- Traitement des demandes Meeter et des signalements
- Gestion des messages de contact, thèmes et catégories

## Stack technique

- **Front-end** : HTML, CSS, JavaScript + Bootstrap
- **Back-end** : NestJS
- **Base de données** : PostgreSQL via Supabase
- **Authentification** : JWT (cookie HttpOnly) + bcrypt pour le hachage des mots de passe

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/integeek/MeetAndDo.git
cd MeetAndDo
```

### 2. Installer les dépendances du back-end

```bash
cd meet-do-back
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Compléter `meet-do-back/.env` avec :

```env
PORT=3000
SUPABASE_URL= <votre_url>
SUPABASE_ANON_KEY=<votre_clé_anon>
SUPABASE_SERVICE_ROLE_KEY=<votre_clé_service_role>
JWT_SECRET=<votre_secret_jwt>
JWT_EXPIRATION_TIME=10800
MAIL_USER=<votre_email>
MAIL_PASSWORD=<votre_mot_de_passe_application>
```

### 4. Créer les tables Supabase

Dans l'éditeur SQL de Supabase, exécuter dans l'ordre :

1. `meet-do-back/create-table.sql`
2. `meet-do-back/src/messaging/migrations/001_create_messaging_tables.sql`

### 5. Lancer le back-end

```bash
cd ./meet-do-back/
npm run start:dev
```

### 6. Lancer le front-end

Le front-end ne nécessite aucune dépendance :

1. Ouvrir le projet dans VS Code
2. Ouvrir `meet-do-front/Page/Home.html`
3. Cliquer sur **Go Live**
4. Vérifier l'accès sur `http://localhost:5500/meet-do-front/Page/Home.html`

Le back-end autorise les requêtes CORS depuis `http://localhost:5500` et `http://127.0.0.1:5500`.