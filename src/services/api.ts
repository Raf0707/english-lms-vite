const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface BackendProfile {
  id?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  displayName?: string | null;
  timezone: string;
  locale: string;
  avatarAssetId?: string | null;
}

export interface BackendTeacherProfile {
  headline?: string | null;
  bio?: string | null;
  level?: string | null;
  specialties?: string[];
}

type NestedRole = { role: { code: string; name?: string } };

export interface BackendUser {
  id: string;
  email: string;
  phone: string;
  status: string;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  profile?: BackendProfile | null;
  teacherProfile?: BackendTeacherProfile | null;
  roles: string[] | NestedRole[];
  createdAt?: string;
}

export interface VerificationCodes {
  emailCode?: string;
  phoneCode?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  timezone: string;
}

export interface RegisterResponse {
  user: BackendUser;
  verification?: VerificationCodes;
}

export interface UpdateContactsPayload {
  currentPassword: string;
  email?: string;
  phone?: string;
}

export interface UpdateContactsResponse {
  user: BackendUser;
  verification?: VerificationCodes;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const bodyIsFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (!bodyIsFormData && init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers
    });
  } catch {
    throw new ApiError('Backend недоступен. Проверьте, что API запущен на localhost:4000.', 0, 'NETWORK_ERROR');
  }

  if (!response.ok) {
    let payload: {
      error?: { message?: string | string[]; code?: string; details?: unknown };
      message?: string | string[];
      code?: string;
    } | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const rawMessage = payload?.error?.message ?? payload?.message;
    const message = Array.isArray(rawMessage) ? rawMessage.join('. ') : rawMessage;
    throw new ApiError(
      message ?? `Запрос завершился с ошибкой ${response.status}`,
      response.status,
      payload?.error?.code ?? payload?.code,
      payload?.error?.details
    );
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  auth: {
    login: (login: string, password: string) =>
      apiRequest<BackendUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password })
      }),
    register: (payload: RegisterPayload) =>
      apiRequest<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    session: () => apiRequest<BackendUser>('/auth/session'),
    logout: () => apiRequest<{ success: true }>('/auth/logout', { method: 'POST' }),
    logoutAll: () => apiRequest<{ success: true }>('/auth/logout-all', { method: 'POST' }),
    forgotPassword: (login: string) =>
      apiRequest<{ sent: true; token?: string }>('/auth/password/forgot', {
        method: 'POST',
        body: JSON.stringify({ login })
      }),
    resetPassword: (token: string, newPassword: string) =>
      apiRequest<{ reset: true }>('/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      }),
    requestVerification: (channel: 'email' | 'phone') =>
      apiRequest<{ sent: true; channel: 'email' | 'phone'; code?: string }>('/auth/verification/request', {
        method: 'POST',
        body: JSON.stringify({ channel })
      }),
    confirmVerification: (channel: 'email' | 'phone', code: string) =>
      apiRequest<{ verified: true; channel: 'email' | 'phone' }>('/auth/verification/confirm', {
        method: 'POST',
        body: JSON.stringify({ channel, code })
      }),
    updateContacts: (payload: UpdateContactsPayload) =>
      apiRequest<UpdateContactsResponse>('/auth/contacts', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
  },
  profile: {
    me: () => apiRequest<BackendUser>('/me'),
    update: (payload: {
      firstName?: string;
      lastName?: string;
      middleName?: string;
      displayName?: string;
      timezone?: string;
      locale?: string;
    }) => apiRequest<BackendProfile>('/me/profile', { method: 'PATCH', body: JSON.stringify(payload) })
  },
  courses: {
    list: () => apiRequest('/courses'),
    bySlug: (slug: string) => apiRequest(`/courses/${encodeURIComponent(slug)}`)
  },
  learning: {
    enrollments: () => apiRequest('/me/enrollments'),
    course: (courseId: string) => apiRequest(`/learning/courses/${encodeURIComponent(courseId)}`),
    completeLesson: (lessonKeyId: string) => apiRequest(`/lessons/${encodeURIComponent(lessonKeyId)}/complete`, { method: 'POST' })
  },
  dictionary: {
    translate: (text: string, context?: string) =>
      apiRequest('/dictionary/translate', { method: 'POST', body: JSON.stringify({ text, context }) }),
    add: (payload: unknown) => apiRequest('/dictionary/entries', { method: 'POST', body: JSON.stringify(payload) })
  },
  payments: {
    createOrder: (payload: unknown) => apiRequest('/orders', { method: 'POST', body: JSON.stringify(payload) }),
    myOrders: () => apiRequest('/me/orders')
  },
  video: {
    token: (sessionId: string) => apiRequest(`/video/sessions/${encodeURIComponent(sessionId)}/token`, { method: 'POST' })
  }
};
