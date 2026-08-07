/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_LIVEKIT_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_SHOW_DEV_LOGIN?: string;
  readonly VITE_DEV_STUDENT_LOGIN?: string;
  readonly VITE_DEV_STUDENT_PASSWORD?: string;
  readonly VITE_DEV_TEACHER_LOGIN?: string;
  readonly VITE_DEV_TEACHER_PASSWORD?: string;
  readonly VITE_DEV_ADMIN_LOGIN?: string;
  readonly VITE_DEV_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
