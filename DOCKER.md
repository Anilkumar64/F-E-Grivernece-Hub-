# Docker Workflow

Use the v2 Compose stack for Docker-only development and operations.

## Start

```bash
make docker-up
```

Open:

- Frontend: http://localhost:5174
- Backend health: http://localhost:5001/api/health
- AI health: http://localhost:8001/health

## Common Operations

```bash
make docker-status
make docker-logs
make docker-down
make docker-destroy
```

`docker-destroy` removes the MongoDB volume too.

## Reset Dev Passwords

```bash
make docker-reset-passwords
```

Default dev password:

```text
Password@123
```

You can override it:

```bash
DEV_LOGIN_PASSWORD='NewPassword@123' make docker-reset-passwords
```

## Images

The stack builds these local images:

- `e-grievance-v2-frontend:latest`
- `e-grievance-v2-backend:latest`
- `e-grievance-v2-ai:latest`

## Environment

Docker Compose reads the single root `.env`. Replace placeholder secrets and `GEMINI_API_KEY` before using this outside local development.
