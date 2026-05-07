# University E-Grievance Management System

A production-oriented full-stack grievance platform for universities, built with React, Express, MongoDB, and Redis.

## Quick Start (60 seconds)

### Option A: Docker (recommended)

```bash
git clone <your-repo-url>
cd E-Griverence
docker compose up -d --build
```

Open:
- [http://localhost:5173](http://localhost:5173) (frontend)
- [http://localhost:5000/api/health](http://localhost:5000/api/health) (backend health)

### Option B: Local development

```bash
git clone <your-repo-url>
cd E-Griverence
cd backend && cp .env.example .env && npm install
cd ../frontend && npm install
```

Run backend:

```bash
cd backend
npm start
```

Run frontend (new terminal):

```bash
cd frontend
npm run frontend
```

This project is designed to demonstrate:
- Role-based product design across three personas (`student`, `admin`, `superadmin`)
- Security-first backend engineering (JWT rotation, rate limits, audit trail, secure headers)
- Operational readiness (health checks, containerized deployment, graceful shutdown, background jobs)

## Why this project matters

Manual grievance handling is slow, opaque, and hard to audit.  
This system provides a transparent workflow from complaint creation to resolution, with strict access controls and accountability through immutable audit logging.

## Core Features

- End-to-end grievance lifecycle: create, assign, update status, comment, resolve, feedback
- Multi-role RBAC:
  - `Student`: submit and track own grievances
  - `Department Admin`: manage grievances within assigned department
  - `Super Admin`: governance controls, reports, audit logs, user/admin management
- Authentication and session security:
  - Short-lived access tokens
  - Refresh-token flow with httpOnly cookies
  - Role-aware login and access guards
- Auditability and compliance:
  - Action logging with hash-chain style audit records
  - Activity tracking endpoint
  - Retention support in audit records
- Operational tooling:
  - CSV reporting
  - Health (`/api/health`) and readiness (`/api/ready`) endpoints
  - SLA escalation scheduler via `node-cron`
  - Redis-backed cache for high-read endpoints

## Tech Stack

- Frontend: `React`, `Vite`, `React Router`, `Axios`, `Tailwind CSS`
- Backend: `Node.js`, `Express`, `Mongoose`, `JWT`, `Nodemailer`
- Data & Infra: `MongoDB`, `Redis`, `Docker Compose`
- Testing: `Vitest`, `Supertest`, `mongodb-memory-server`

## Architecture Overview

- `frontend` (Vite app on port `5173`)
  - Proxies `/api` and `/uploads` calls to backend
- `backend` (Express API on port `5000`)
  - Handles auth, grievances, admin operations, reports, audit logs
- `mongo` (MongoDB service)
  - Primary persistent datastore
- `redis` (Redis service)
  - Cache layer and fast read optimization

## API Surface (high level)

- Auth: `/api/auth/*`
- Grievances: `/api/grievances/*`
- Admin management: `/api/admin/*`, `/api/superadmin/*`
- Master data: `/api/departments/*`, `/api/categories/*`, `/api/courses/*`
- Notifications: `/api/notifications/*`
- Audit + Reports: `/api/audit-logs/*`, `/api/reports/*`

## Run with Docker (recommended)

### 1) Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)

### 2) Start the full stack

```bash
docker compose up -d --build
```

### 3) Verify services

```bash
docker compose ps
curl http://localhost:5000/api/health
curl http://localhost:5173/api/health
```

### 4) Access app

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:5000](http://localhost:5000)

### 5) Stop stack

```bash
docker compose down
```

## Run locally (without Docker)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run frontend
```

## Environment Variables

Use `backend/.env.example` as the source of truth.  
At minimum, configure:

- `MONGODB_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Security and Reliability Highlights

- Helmet security headers
- CORS allowlist
- Input hardening via `express-mongo-sanitize` and `hpp`
- Route-level rate limiting
- Secure cookie-based refresh flow
- Graceful shutdown handling for process signals
- API readiness checks for container orchestration

## Project Structure

```text
E-Griverence/
  frontend/      # React + Vite client
  backend/       # Express API + Mongo models + jobs + middleware
  docker-compose.yml
```

## Suggested recruiter demo flow

1. Login as `student`, submit a grievance, attach context.
2. Login as `admin`, assign/update status and add comments.
3. Login as `superadmin`, review analytics/reporting and audit logs.
4. Show Dockerized reproducibility with `docker compose up -d --build`.

## Roadmap

- Add CI pipeline with automated tests and lint checks
- Add OpenAPI/Swagger docs for endpoint discoverability
- Add cloud object storage for uploads (S3-compatible)
- Add observability dashboard (structured logs + metrics)

## License

This project is currently intended for portfolio/demo and internal academic workflow use.
