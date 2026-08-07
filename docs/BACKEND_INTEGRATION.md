# Backend integration — V8

The frontend and backend remain separate repositories.

## Local addresses

- frontend: `http://localhost:5173`
- backend API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/docs`

## Start backend

```powershell
.\scripts\bootstrap-dev.ps1
npm run start:dev
```

Worker in another terminal:

```powershell
npm run worker:dev
```

## Start frontend

Copy environment file once:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

The important setting is:

```env
VITE_API_URL=http://localhost:4000/api/v1
```

Backend `.env` must allow the Vite origin:

```env
WEB_ORIGIN=http://localhost:5173
```

## Authentication model

The browser never stores a JWT. `POST /auth/login` sets the `lms.sid` HttpOnly cookie. Every API request uses `credentials: include`. On a page reload the frontend calls `GET /me`; a valid Redis session restores the user and role.

## Seed accounts

All use `ChangeMe123!`:

- `student@example.local`
- `teacher@example.local`
- `admin@example.local`

Quick-login buttons in development call the same real login API. Disable them for production with:

```env
VITE_SHOW_DEV_LOGIN=false
```

## Current migration boundary

V8 connects authentication and profile only. Existing course/editor/learning demo state is deliberately kept so that UI work remains testable while we migrate the next domain. Do not interpret local course data as backend data yet.
