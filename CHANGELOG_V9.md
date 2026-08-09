# Frontend V9 — backend course workflow

- Teacher/admin course lists now load from PostgreSQL through `GET /teacher/courses`.
- Course editor loads real draft/published versions from backend.
- Saving synchronizes metadata, modules, lessons, blocks, tests, assignments and course schedule.
- Published courses are edited through a new draft version; the active published release is not overwritten.
- Teacher moderation submission is real backend state.
- Admin publication / changes requested / deletion decisions use backend endpoints.
- Course duplication creates a new backend draft.
- Public catalog and public course page now read published releases from backend.
- Existing student learning/payment mock flow is intentionally left for the next migration stage.
