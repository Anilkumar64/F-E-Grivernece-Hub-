# E-Grievance Hub

A full-stack university grievance management platform for students, department admins, and super admins. It supports grievance submission, evidence upload, tracking, comments, SLA monitoring, notifications, audit logs, reports, analytics, and AI-assisted workflow features.

## Table Of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Run With Docker](#run-with-docker)
- [Run Locally](#run-locally)
- [Database And Seed Scripts](#database-and-seed-scripts)
- [Useful Commands](#useful-commands)
- [API Overview](#api-overview)
- [Security Notes](#security-notes)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

E-Grievance Hub turns manual complaint handling into a transparent role-based workflow:

- Students submit grievances, track progress, upload evidence, comment, give feedback, and request reopen reviews.
- Department admins manage grievances within their department, update statuses, resolve issues, and monitor SLA pressure.
- Super admins manage departments, courses, admins, users, categories, reports, audit logs, analytics, and site configuration.
- The AI service supports analysis, summaries, similar-case lookup, response suggestions, and workflow insights.

## Features

- Student registration, login, profile, grievance submission, drafts, tracking, feedback, and reopen requests.
- Department admin dashboards with assigned grievances, pending queues, escalation views, and SLA warnings.
- Super admin dashboards for governance, reports, audit trails, master data, and operational health.
- Secure authentication with access tokens, refresh tokens, role guards, rate limits, and optional step-up verification.
- Grievance statuses: `Pending`, `InProgress`, `UnderReview`, `Resolved`, `Closed`, `Escalated`.
- Notifications, email hooks, OTP routes, audit logging, reports, analytics, workflow automation, and webhook support.
- Dockerized backend, frontend, MongoDB, and Python AI service.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, Tailwind CSS, Recharts, Lucide React |
| Backend | Node.js, Express, Mongoose, JWT, Multer, Nodemailer, Vitest |
| AI Service | Python, FastAPI, Gemini integration hooks, embedding/search helpers |
| Database | MongoDB |
| Infrastructure | Docker Compose, Nginx frontend image, Makefile helpers |

## Project Structure

```text
E-Griverence/
  ai-service/                 # Python FastAPI AI service
    ml/                       # ML helpers
    routers/                  # AI endpoints
    services/                 # DB, embedding, and model clients
    main.py
    config.py

  backend/                    # Express API
    src/
      Database/               # Mongo connection
      constants/              # Shared backend constants
      jobs/                   # Background jobs such as SLA escalation
      middleware/             # Auth, RBAC, upload, security, rate limit middleware
      models/                 # Mongoose models
      routes/                 # API route modules
      seed/                   # Active npm-wired seed scripts only
      services/               # AI, workflow, analytics, notifications, OTP, webhooks
      translations/           # i18n files
      utils/                  # Account, audit, cache, email, ID helpers
    scripts/                  # Maintenance and migration scripts
    tests/                    # Vitest suites
    server.js

  frontend/                   # React + Vite client
    src/
      api/                    # Axios instance
      components/             # Common, protected, landing, and UI components
      context/                # Auth, user, notification contexts
      hooks/                  # Shared frontend hooks
      pages/                  # Student, admin, super admin, auth, landing pages
      routes/                 # App routing
      styles/                 # Page-specific styles

  docker-compose.yml          # Standard Docker stack
  docker-compose.v2.yml       # Versioned Docker stack with env-file support
  Makefile                    # Docker helper commands
  .env.example                # Root environment template
```

## Prerequisites

- Node.js 20+
- npm
- Python 3.10+ for the AI service
- MongoDB locally or MongoDB Atlas
- Docker and Docker Compose for containerized runs

## Environment Setup

Create a local environment file:

```bash
cp .env.example .env
```

Minimum values:

```env
MONGODB_URL=mongodb://localhost:27017/EgrievanceHub
MONGODB_DB=EgrievanceHub
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-long-random-secret
AI_SERVICE_SECRET=replace-with-a-long-random-secret
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
FRONTEND_URL=http://localhost:5173
```

Enable email only after setting `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM`.

Never commit real `.env` files, API keys, app passwords, JWT secrets, or database credentials.

## Run With Docker

Recommended:

```bash
make docker-up
```

Equivalent command:

```bash
COMPOSE_PARALLEL_LIMIT=1 docker compose -f docker-compose.v2.yml --env-file .env up -d --build
```

Useful Docker commands:

```bash
make docker-status
make docker-logs
make docker-down
make docker-destroy
```

Default v2 ports come from `.env`:

- Frontend: `http://localhost:5174` or `FRONTEND_HOST_PORT`
- Backend: `http://localhost:5002` or `BACKEND_HOST_PORT`
- AI service: `http://localhost:8001` or `AI_HOST_PORT`
- MongoDB: `localhost:27019` or `MONGO_HOST_PORT`

Health checks:

```bash
curl http://localhost:5002/api/health
curl http://localhost:5002/api/ready
```

## Run Locally

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run frontend
```

AI service:

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Database And Seed Scripts

Only the seed scripts wired in `backend/package.json` are kept:

```bash
cd backend
npm run seed:superadmin
npm run seed:department-admins
npm run seed:students
```

What they do:

- `seed:superadmin`: creates or updates the configured super admin from `.env`.
- `seed:department-admins`: ensures active departments have department admin accounts.
- `seed:students`: creates realistic student accounts up to `SEED_STUDENTS_PER_DEPARTMENT`.

Maintenance scripts:

```bash
cd backend
npm run migrate:role-collections
npm run reset:dev-passwords
npm run reset:accounts
```

Use reset scripts carefully. They modify account data and are intended for development or demo environments.

Removed seed utilities:

- `backend/src/seed/seeddept.js` was removed because it deleted department data and was not referenced by npm scripts.
- `scripts/generateTestData.js` was removed because it was an old standalone generator with schema drift and no npm entrypoint.

## Useful Commands

Backend:

```bash
cd backend
npm start
npm test
npm run test:coverage
```

Frontend:

```bash
cd frontend
npm run frontend
npm run build
npm run lint
npm run preview
```

Docker:

```bash
make docker-build
make docker-up
make docker-status
make docker-logs
make docker-down
```

## API Overview

| Area | Base Path |
| --- | --- |
| Health | `/api/health`, `/api/ready` |
| Auth | `/api/auth` |
| Students | `/api/students` |
| Users | `/api/users` |
| Admin | `/api/admin` |
| Super Admin | `/api/superadmin` |
| Grievances | `/api/grievances` |
| Departments | `/api/departments` |
| Courses | `/api/courses` |
| Categories | `/api/categories` |
| Notifications | `/api/notifications` |
| Audit Logs | `/api/audit-logs` |
| Reports | `/api/reports` |
| AI Proxy | `/api/ai` |
| Analytics | `/api/analytics` |
| Workflow | `/api/workflow` |
| Knowledge Base | `/api/knowledge` |
| Webhooks | `/api/webhooks` |
| OTP | `/api/otp` |

## Security Notes

- Keep secrets in `.env`, not source control.
- Rotate exposed keys, email app passwords, JWT secrets, and database credentials immediately.
- Use strong `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and `AI_SERVICE_SECRET` values.
- Restrict `ALLOWED_ORIGINS` to known frontend URLs.
- Keep `NODE_ENV=production` in deployed backend containers.
- Review reset and seed commands before using them against shared databases.

Backend security controls include Helmet, CORS allowlisting, rate limiters, request hardening, Mongo sanitization, HPP protection, RBAC guards, audit logs, token records, and centralized security error handling.

## Testing

Backend tests:

```bash
cd backend
npm test
```

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

## Troubleshooting

If the backend cannot connect to MongoDB:

- Check `MONGODB_URL` and `MONGODB_DB`.
- Confirm MongoDB is running.
- For Docker v2, run `make docker-status` and inspect `v2-mongo`.

If the frontend cannot reach the backend:

- Check `VITE_PROXY_TARGET` for local Vite development.
- Check `VITE_API_URL` only if bypassing the Vite proxy.
- Confirm `ALLOWED_ORIGINS` includes the frontend URL.

If login fails after seed or reset work:

- Confirm the correct role login page is being used.
- Reset development passwords only in development:

```bash
cd backend
npm run reset:dev-passwords
```

If AI routes fail:

- Confirm the AI service is running.
- Check `AI_SERVICE_URL`, `AI_SERVICE_SECRET`, and `AI_REQUIRE_DB`.
- Use `/api/ai/health` from the backend to verify AI connectivity.
