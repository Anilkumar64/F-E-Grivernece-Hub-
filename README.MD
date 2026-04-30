# University E-Grievance Management System

Full-stack MERN grievance platform with student, department-admin, and super-admin RBAC.

## Setup

1. Install backend dependencies: `cd backend && npm install`
2. Install frontend dependencies: `cd frontend && npm install`
3. Copy env: `cp backend/.env.example backend/.env`
4. Create the first super admin: `cd backend && node createSuperAdmin.js`
5. Start backend: `cd backend && npm start`
6. Start frontend: `cd frontend && npm run frontend`

Docker: `docker compose up --build`

## Roles

- Student: submit grievances, view own list, track timeline, comment, feedback after resolution.
- Department Admin: view only department grievances, update statuses, comment, monitor SLA warnings.
- Super Admin: manage admins, departments, categories, audit logs, reports, and all grievances.

## Main API Routes

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/student/login`, `POST /api/auth/admin/login`, `POST /api/auth/superadmin/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Grievances | `POST /api/grievances`, `GET /api/grievances/mine`, `GET /api/grievances/:id`, `GET /api/grievances`, `PATCH /api/grievances/:id/status`, `POST /api/grievances/:id/comments`, `POST /api/grievances/:id/feedback`, `GET /api/grievances/analytics` |
| Admins | `POST /api/admin/create`, `GET /api/admin/all`, `PATCH /api/admin/:id`, `DELETE /api/admin/:id` |
| Departments | `GET /api/departments`, `POST /api/departments`, `PATCH /api/departments/:id`, `DELETE /api/departments/:id` |
| Categories | `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id` |
| Notifications | `GET /api/notifications/mine`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` |
| Audit/Reports | `GET /api/audit-logs`, `GET /api/reports/grievances.csv` |
| Health | `GET /api/health`, `GET /api/ready` |

## Frontend Routes

- Public: `/`, `/login`, `/signup`, `/admin/login`, `/superadmin/login`
- Student: `/dashboard`, `/submit-grievance`, `/my-grievances`, `/grievance/:id`, `/notifications`, `/profile`
- Admin: `/admin/dashboard`, `/admin/grievances`, `/admin/pending`, `/admin/resolved`, `/admin/grievance/:id`, `/admin/notifications`, `/admin/profile`
- Super Admin: `/superadmin/dashboard`, `/superadmin/admins`, `/superadmin/departments`, `/superadmin/categories`, `/superadmin/reports`, `/superadmin/audit-logs`, `/superadmin/profile`

## Production Notes

- JWT access tokens expire in 15 minutes; refresh tokens are stored in httpOnly role-specific cookies.
- Auth, API, and upload routes are rate-limited.
- Helmet, CORS whitelist, HPP, Mongo sanitize, and compression are enabled.
- SLA escalation runs every 30 minutes with `node-cron`.
- Redis caches department/category lists and analytics for 5 minutes when `REDIS_URL` is available.
