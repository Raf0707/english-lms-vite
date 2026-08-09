# Backend course integration — V9

## What is real in V9

The following flow no longer uses localStorage/mock data:

1. Teacher opens `/teacher?tab=courses` -> `GET /api/v1/teacher/courses`.
2. New course is created with `POST /api/v1/teacher/courses`.
3. The editor synchronizes metadata, modules, lessons, blocks, tests, assignments and schedule to the backend.
4. Existing published course editing creates/uses a new draft via `POST /api/v1/teacher/courses/:id/draft`.
5. Teacher submits with `POST /api/v1/teacher/courses/:id/submit`.
6. Admin sees the moderation candidate in `/admin?tab=courses`.
7. Admin publishes with `POST /api/v1/admin/courses/:id/publish` or returns it with `request-changes`.
8. Published releases appear in `/catalog` through `GET /api/v1/courses`.
9. `/course/:slug` loads the current published release through the backend.

## Test scenario

- Login as `teacher@example.local` / `ChangeMe123!`.
- Create a course, add a module, lesson, text block and test, then Save.
- Reload the browser. The same structure must be restored from PostgreSQL.
- Submit the course for moderation.
- Logout and login as `admin@example.local` / `ChangeMe123!`.
- Open Courses and publish it.
- Logout or open a public window and visit `/catalog`. The course must be visible.
- Login as the teacher again, edit the published course and Save. The public catalog must continue showing the old release until the new draft is moderated and published.

## Intentionally still mock in V9

Student purchase/enrollment, lesson progress, payments, media delivery URLs and several dashboard statistics remain on the previous mock layer. They are the next migration stages.
