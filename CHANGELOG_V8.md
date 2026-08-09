# V8 — first real backend connection

This release connects the existing Vite/React interface to the separate NestJS backend for the first vertical slice: authentication and profile.

## Connected to backend
- session restore via `GET /api/v1/me`;
- login by Email or phone via `POST /api/v1/auth/login`;
- registration with mandatory phone via `POST /api/v1/auth/register`;
- HttpOnly cookie session; frontend no longer stores the authenticated user in localStorage;
- real logout via Redis-backed session;
- real profile loading and update;
- secure Email/phone changes using the current password;
- contact verification request/confirm;
- password recovery request;
- role mapping from backend `STUDENT / TEACHER / ADMIN` to existing UI;
- dev quick-login buttons now use real seed accounts instead of local demo impersonation;
- protected routes wait for session bootstrap before redirecting.

## Still intentionally local/mock in V8
Courses, enrollment/progress, dictionary, schedule data, payments, video rooms and course editor content are still driven by the existing frontend demo state. They will be migrated module by module after the auth/profile vertical slice is verified.
