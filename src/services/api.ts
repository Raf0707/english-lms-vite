/**
 * Production API adapter.
 * The demo currently stores state in Zustand + localStorage, while this module
 * defines the boundary for connecting the Vite client to the NestJS/FastAPI backend.
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers
    },
    ...init
  });

  if (!response.ok) {
    let payload: { error?: { message?: string; code?: string } } | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new ApiError(
      payload?.error?.message ?? 'Не удалось выполнить запрос',
      response.status,
      payload?.error?.code
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (name: string, email: string, password: string) =>
      apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    logout: () => apiRequest('/auth/logout', { method: 'POST' })
  },
  courses: {
    list: () => apiRequest('/courses'),
    bySlug: (slug: string) => apiRequest(`/courses/${encodeURIComponent(slug)}`)
  },
  learning: {
    enrollments: () => apiRequest('/me/enrollments'),
    completeLesson: (lessonId: string) => apiRequest(`/lessons/${lessonId}/complete`, { method: 'POST' })
  },
  dictionary: {
    translate: (text: string, context?: string) =>
      apiRequest('/dictionary/translate', { method: 'POST', body: JSON.stringify({ text, context }) }),
    add: (payload: unknown) => apiRequest('/dictionary/entries', { method: 'POST', body: JSON.stringify(payload) })
  },
  payments: {
    createOrder: (productId: string) =>
      apiRequest('/orders', { method: 'POST', body: JSON.stringify({ productId }) })
  },
  video: {
    token: (sessionId: string) => apiRequest(`/video/sessions/${sessionId}/token`, { method: 'POST' })
  }
};
