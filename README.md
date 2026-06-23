# TaskFlow API — Pipeline Jenkins CI/CD

![CI Status](https://img.shields.io/badge/CI-passing-brightgreen?logo=jenkins&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-18_LTS-339933?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)

TaskFlow API est un backend REST de gestion de tâches développé pour la startup DevTask. Il expose des opérations CRUD complètes sur les tâches, s'exécute dans une stack Docker multi-conteneurs, et est intégré et déployé en continu via un pipeline Jenkins déclaratif avec notification de statut GitHub et déclenchement automatique sur push.

## Prérequis

- Docker Desktop (avec Docker Compose v2)
- Git

## Démarrage rapide

```bash
git clone https://github.com/MessaoudiIshak/projet-cicd
cd projet-cicd
cp .env.example .env
docker compose up -d
```

L'API est disponible sur `http://localhost/api/tasks` (via le reverse proxy Nginx).

## Variables d'environnement

| Variable    | Description                             | Exemple                            |
|-------------|-----------------------------------------|------------------------------------|
| `PORT`      | Port d'écoute interne de l'API          | `5000`                             |
| `MONGO_URI` | Chaîne de connexion MongoDB             | `mongodb://mongodb:27017/taskflow` |

Copier `.env.example` vers `.env` et renseigner les valeurs avant de démarrer.

## Endpoints de l'API

| Méthode  | Chemin           | Description             | Code succès |
|----------|------------------|-------------------------|-------------|
| `GET`    | `/health`        | Vérification de santé   | 200         |
| `GET`    | `/api/tasks`     | Lister toutes les tâches| 200         |
| `POST`   | `/api/tasks`     | Créer une tâche         | 201         |
| `GET`    | `/api/tasks/:id` | Récupérer une tâche     | 200         |
| `PUT`    | `/api/tasks/:id` | Mettre à jour une tâche | 200         |
| `DELETE` | `/api/tasks/:id` | Supprimer une tâche     | 200         |

`POST /api/tasks` exige le champ `title` dans le corps de la requête — retourne `400` si absent.

## Modèle de données

```js
{
  title:       String,   // obligatoire
  description: String,   // optionnel
  status:      String,   // enum : 'todo' | 'in-progress' | 'done', défaut 'todo'
  createdAt:   Date      // défini automatiquement à la création
}
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│            Dépôt GitHub                          │
│         MessaoudiIshak/projet-cicd               │
└───────────────────┬──────────────────────────────┘
                    │  git push → webhook (POST /github-webhook/)
                    ▼
┌──────────────────────────────────────────────────┐
│         Tunnel ngrok (URL HTTPS publique)        │
│       redirige vers http://localhost:8090        │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│             Jenkins  (localhost:8090)            │
│                                                  │
│  ┌──────────┐  ┌─────────┐  ┌──────┐  ┌──────┐ │
│  │ Checkout │→ │ Install │→ │ Lint │→ │ Test │ │
│  └──────────┘  └─────────┘  └──────┘  └──┬───┘ │
│                                           │      │
│  ┌────────────────┐  ┌────────┐  ┌───────┴──┐   │
│  │ Notify GitHub  │← │ Deploy │← │  Build   │   │
│  └────────────────┘  └────────┘  └──────────┘   │
└──────────────────────────────────────────────────┘
                    │  docker compose up --build api
                    ▼
┌──────────────────────────────────────────────────┐
│        Réseau Docker — taskflow_network          │
│                                                  │
│  ┌─────────────┐      ┌───────────────────────┐  │
│  │    Nginx    │ ───▶ │   API — Node.js 18    │  │
│  │   port 80   │      │      port 5000        │  │
│  └─────────────┘      └───────────┬───────────┘  │
│                                   │               │
│                       ┌───────────▼───────────┐   │
│                       │      MongoDB 6         │   │
│                       │  (interne uniquement)  │   │
│                       └───────────────────────┘   │
└──────────────────────────────────────────────────┘
```

## Jenkins — Port 8090

Jenkins est exposé sur le **port 8090** (`http://localhost:8090`) au lieu du port par défaut 8080.

Le port 8080 était déjà occupé par un autre service sur la machine de développement (interface web EDB PostgreSQL / Apache2), rendant Jenkins inaccessible sur ce port. Le mapping a été modifié dans `docker-compose.yml` :

```yaml
jenkins:
  ports:
    - "8090:8080"   # hôte:conteneur
```

Jenkins continue de s'exécuter sur le port 8080 **à l'intérieur** du conteneur — seul le côté hôte change. Aucune configuration interne de Jenkins n'est modifiée. Sur une machine sans conflit de port, cela fonctionne tel quel.

Le Jenkinsfile référence le port 8090 de manière cohérente dans le `target_url` envoyé à l'API GitHub Statuses :

```groovy
"target_url": "http://localhost:8090"
```

## Stages du Pipeline

| Stage         | Commande                         | Échoue si                            |
|---------------|----------------------------------|--------------------------------------|
| Checkout      | `checkout scm`                   | Dépôt inaccessible                   |
| Install       | `npm ci`                         | Incohérence du lock file             |
| Lint          | `npm run lint`                   | Toute violation ESLint               |
| Test          | `npm test`                       | Tout test échoue                     |
| Build Docker  | `docker build`                   | Erreur dans le Dockerfile            |
| Deploy        | `docker compose up -d --build`   | Échec de démarrage du conteneur      |
| Notify GitHub | API GitHub Statuses (curl)       | Poste ✅ en succès, ❌ en échec       |

Les secrets (`MONGO_URI`, `GITHUB_TOKEN`) sont injectés via `withCredentials` — ils n'apparaissent jamais dans le Jenkinsfile ni dans la sortie console.

## Déclenchement automatique sur push

Chaque `git push` sur la branche `main` démarre automatiquement le pipeline Jenkins. Ceci est implémenté à deux niveaux :

**1 — Le Jenkinsfile déclare le déclencheur :**
```groovy
triggers {
    githubPush()
}
```

**2 — Le webhook GitHub se déclenche sur push :**

GitHub envoie un `POST` à `https://<url-ngrok>/github-webhook/` à chaque push. Jenkins reçoit la requête, l'associe à ce pipeline et démarre un build immédiatement.

### Utilisation du déclencheur en local

Jenkins s'exécutant sur `localhost`, un tunnel public est nécessaire pour que GitHub puisse l'atteindre :

```bash
# Démarrer le tunnel (garder ce terminal ouvert)
ngrok http 8090
# → copier l'URL https://xxxx.ngrok-free.app

# Configurer cette URL comme Payload URL du webhook GitHub :
# https://xxxx.ngrok-free.app/github-webhook/
```

L'URL ngrok change à chaque redémarrage — mettre à jour le Payload URL du webhook GitHub en conséquence avant chaque session.

## Fonctionnalités implémentées

### Section A — Application
- API REST Express avec 6 routes (health + CRUD complet sur les tâches)
- `GET /health` retourne `{ status, uptime, version }` avec HTTP 200
- Modèle Mongoose : `title` obligatoire, `status` enum, `createdAt` automatique
- `POST /api/tasks` sans `title` retourne HTTP 400
- 12 tests Jest dans 2 fichiers — Mongoose mocké, aucune connexion DB réelle nécessaire
- ESLint configuré avec `no-var`, `prefer-const`, `no-unused-vars`, `eqeqeq`
- Couverture de tests : **94.64% statements / 90% branches / 100% functions**

### Section B — Docker & Infrastructure
- Dockerfile multi-stage : `builder` (toutes les dépendances) → `production` (uniquement `src/` + dépendances de prod)
- Image de base `node:18-alpine`, utilisateur non-root `node` via `USER node`
- `HEALTHCHECK` sur `GET /health` utilisé par `depends_on: condition: service_healthy`
- `docker-compose.yml` orchestre 4 services : `api`, `mongodb`, `nginx`, `jenkins`
- Volume nommé `mongo_data` — les données persistent après `docker compose restart`
- `mongodb` sans mapping de port hôte — accessible uniquement dans `taskflow_network`
- Reverse proxy Nginx sur le port 80 → `api:5000`, headers forwarded
- `.env` exclu du dépôt via `.gitignore`, `.env.example` fourni

### Section C — Pipeline Jenkins
- Jenkins s'exécute comme service Docker avec `jenkins/Dockerfile` custom (intègre `docker-ce-cli`)
- `/var/run/docker.sock` monté pour que Jenkins contrôle le daemon Docker hôte
- `Jenkinsfile` déclaratif à la racine du dépôt avec 7 stages
- `triggers { githubPush() }` — pipeline déclenché automatiquement à chaque push
- Le stage Lint fait échouer le pipeline à la moindre violation ESLint (démontré avec un build rouge intentionnel)
- Le stage Test affiche le rapport de couverture complet dans la console
- Le stage Build Docker crée deux tags : `:latest` et `:build-<N>`
- Le stage Deploy rafraîchit uniquement le conteneur `api` — les autres services restent actifs
- Blocs `post { always / success / failure }` présents et fonctionnels
- **Stage bonus :** Notify GitHub — poste un statut de commit (✅/❌) via l'API GitHub Statuses
- Secrets gérés via Jenkins Credentials (`mongo-uri`, `github-token`) — jamais en clair

## Répartition des tâches

| Tâche                                               | Réalisé par     |
|-----------------------------------------------------|-----------------|
| Application Node.js / Express                       | MESSAOUDI Ishak |
| Modèle de données Mongoose                          | MESSAOUDI Ishak |
| Suite de tests Jest (12 tests, 94.64% couverture)   | MESSAOUDI Ishak |
| Configuration ESLint                                | MESSAOUDI Ishak |
| Dockerfile multi-stage                              | MESSAOUDI Ishak |
| Orchestration Docker Compose (4 services)           | MESSAOUDI Ishak |
| Reverse proxy Nginx                                 | MESSAOUDI Ishak |
| Service Jenkins Docker + Dockerfile custom          | MESSAOUDI Ishak |
| Jenkinsfile déclaratif (7 stages)                   | MESSAOUDI Ishak |
| Déclenchement automatique : githubPush() + webhook  | MESSAOUDI Ishak |
| Stage bonus — GitHub Status Notification            | MESSAOUDI Ishak |
| Rapport PDF                                         | MESSAOUDI Ishak |
