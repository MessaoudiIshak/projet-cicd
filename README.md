# TaskFlow API — Jenkins CI/CD Pipeline

![CI Status](https://img.shields.io/badge/CI-passing-brightgreen?logo=jenkins&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-18_LTS-339933?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)

TaskFlow API is a REST task-management backend built for DevTask startup. It exposes full CRUD operations on tasks, runs inside a multi-container Docker stack, and is continuously integrated and deployed through a declarative Jenkins pipeline with automated GitHub status reporting.

## Prerequisites

- Docker Desktop (with Docker Compose v2)
- Git

## Quick Start

```bash
git clone https://github.com/MessaoudiIshak/projet-cicd
cd projet-cicd
cp .env.example .env
docker compose up -d
```

API is available at `http://localhost/api/tasks` (through Nginx reverse proxy).

## Jenkins Access

Jenkins is exposed on **port 8090** (`http://localhost:8090`) instead of the default 8080.

Port 8080 was already in use by Apache2 on the development machine, so Jenkins was remapped to 8090 in `docker-compose.yml`:

```yaml
jenkins:
  ports:
    - "8090:8080"
```

No change is needed on a machine without Apache2 — port 8090 will work out of the box.

## Environment Variables

| Variable    | Description                        | Example                                  |
|-------------|------------------------------------|------------------------------------------|
| `PORT`      | Port the API listens on internally | `5000`                                   |
| `MONGO_URI` | MongoDB connection string          | `mongodb://mongodb:27017/taskflow`       |

Copy `.env.example` to `.env` and fill in values before starting.

## API Endpoints

| Method   | Path               | Description              |
|----------|--------------------|--------------------------|
| `GET`    | `/health`          | Health check             |
| `GET`    | `/api/tasks`       | List all tasks           |
| `POST`   | `/api/tasks`       | Create a task            |
| `GET`    | `/api/tasks/:id`   | Get task by ID           |
| `PUT`    | `/api/tasks/:id`   | Update task status       |
| `DELETE` | `/api/tasks/:id`   | Delete a task            |

## Architecture

```
┌──────────────────────────────────────────────────┐
│              GitHub Repository                   │
│         MessaoudiIshak/projet-cicd               │
└───────────────────┬──────────────────────────────┘
                    │  push → webhook
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
│        Docker Network — taskflow_network         │
│                                                  │
│  ┌─────────────┐      ┌───────────────────────┐  │
│  │    Nginx    │ ───▶ │   API — Node.js 18    │  │
│  │   port 80   │      │      port 5000        │  │
│  └─────────────┘      └───────────┬───────────┘  │
│                                   │               │
│                       ┌───────────▼───────────┐   │
│                       │      MongoDB 6         │   │
│                       │  (internal only)       │   │
│                       └───────────────────────┘   │
└──────────────────────────────────────────────────┘
```

## Pipeline Stages

| Stage            | Command                  | Fails if                          |
|------------------|--------------------------|-----------------------------------|
| Checkout         | `git checkout`           | Repo unreachable                  |
| Install          | `npm ci`                 | Lock file mismatch                |
| Lint             | `npm run lint`           | Any ESLint violation              |
| Test             | `npm test`               | Any test fails / coverage drops   |
| Build Docker     | `docker build`           | Dockerfile error                  |
| Deploy           | `docker compose up -d`   | Container startup failure         |
| Notify GitHub    | GitHub Statuses API      | Invalid token / network error     |

## Task Distribution

| Task                              | Author           |
|-----------------------------------|------------------|
| Node.js / Express application     | MESSAOUDI Ishak  |
| Mongoose data model               | MESSAOUDI Ishak  |
| Jest test suite                   | MESSAOUDI Ishak  |
| ESLint configuration              | MESSAOUDI Ishak  |
| Multi-stage Dockerfile            | MESSAOUDI Ishak  |
| Docker Compose orchestration      | MESSAOUDI Ishak  |
| Nginx reverse proxy               | MESSAOUDI Ishak  |
| Jenkins Docker service            | MESSAOUDI Ishak  |
| Declarative Jenkinsfile           | MESSAOUDI Ishak  |
| GitHub Status Notification stage  | MESSAOUDI Ishak  |
| PDF report                        | MESSAOUDI Ishak  |