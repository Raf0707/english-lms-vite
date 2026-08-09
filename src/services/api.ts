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



export type BackendAssetKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'AVATAR' | 'DOCUMENT';
export interface BackendAssetAccess { assetId: string; url: string; expiresIn: number; mimeType: string; fileName: string; status: string }

export interface BackendLearningMaterial {
  id: string;
  assetId: string;
  uploadedById: string;
  scope: 'CHAT' | 'SESSION' | 'LIBRARY';
  title: string;
  description?: string | null;
  conversationId?: string | null;
  eventId?: string | null;
  createdAt: string;
  asset: { id: string; kind: string; status: string; originalName: string; mimeType: string; sizeBytes?: string | number | null };
  uploadedBy?: { id: string; email: string; profile?: BackendProfile | null };
  event?: { id: string; title: string; startAt: string; type: string } | null;
  conversation?: { id: string; type: string } | null;
  saved?: boolean;
}

export interface BackendChatAttachment {
  id: string;
  materialId: string;
  material: BackendLearningMaterial;
}

export interface BackendDictionaryEntry {
  id: string;
  sourceText: string;
  translation: string;
  contextSentence?: string | null;
  courseId?: string | null;
  lessonKeyId?: string | null;
  status: string;
  createdAt: string;
  reviewState?: { repetitions: number; intervalDays: number; easeFactor: number | string; nextReviewAt: string } | null;
}

export interface BackendDictionaryTranslation {
  sourceText: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
  provider: string;
  alternatives?: string[];
  partsOfSpeech?: Array<{ partOfSpeech: string; translations: string[] }>;
  pronunciation?: { language: string; browserSpeechSynthesis: boolean };
}

export interface BackendCalendarEvent {
  id: string;
  title: string;
  type: string;
  courseId?: string | null;
  instructorId: string;
  startAt: string;
  endAt: string;
  status: string;
  maxParticipants: number;
  priceMinor: number;
  currency: string;
  metadata?: Record<string, unknown> | null;
  instructor?: { id: string; profile?: BackendProfile | null };
  bookings?: Array<{ id: string; status: string; userId: string }>;
  attendees?: number;
}

export interface BackendTeacherPublic {
  id: string; name: string; avatarAssetId?: string | null; headline: string; bio: string; level: string;
  rating: number; reviews: number; specialties: string[]; individualPriceMinor: number; groupPriceMinor: number; currency: string;
}


export interface BackendTeacherStudent {
  enrollmentId: string; studentId: string; name: string; email: string; phone: string;
  courseId: string; courseSlug: string; courseTitle: string; versionNumber: number;
  progress: number; completedLessons: number; totalLessons: number; status: string;
  startedAt: string; lastActivityAt: string;
}

export interface BackendTeacherFinance {
  currency: string;
  grossMinor: number;
  paidOrders: number;
  currentMonthGrossMinor: number;
  currentMonthOrders: number;
  recent: Array<{
    orderId: string;
    number: string;
    title: string;
    productType: 'course' | 'booking' | 'booking_series' | string;
    amountMinor: number;
    currency: string;
    date: string;
    student: string;
  }>;
}

export interface BackendAvailability {
  id: string; teacherId: string; type: 'INDIVIDUAL' | 'GROUP'; startAt: string; endAt: string;
  priceMinor: number; currency: string; maxParticipants: number; isActive: boolean; attendees?: number; booked?: boolean;
}

export interface BackendOrder {
  id: string; number: string; totalMinor: number; currency: string; status: string; createdAt: string;
  items: Array<{ id: string; productType: string; referenceId: string; title: string; totalMinor: number }>;
  payments: Array<{ id: string; amountMinor: number; status: string; paidAt?: string | null; createdAt: string }>;
  refunds: Array<{ id: string; amountMinor: number; status: string }>;
  receipts: Array<{ id: string; status: string; url?: string | null }>;
}


export interface BackendAdminUser {
  id: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'BLOCKED' | string;
  createdAt: string;
  profile?: BackendProfile | null;
  roles: Array<{ role: { code: string; name: string } }>;
}

export interface BackendAdminOrder extends BackendOrder {
  user?: { id: string; email: string; phone: string; profile?: BackendProfile | null };
}

export interface BackendNotification {
  id: string; type: string; title: string; body: string; readAt?: string | null; createdAt: string; payload?: Record<string, unknown> | null;
}

export interface BackendAssignmentSubmission {
  id: string; assignmentVersionId: string; studentId: string; answerText?: string | null; fileAssetId?: string | null;
  status: string; score?: number | null; feedback?: string | null; submittedAt: string; reviewedAt?: string | null;
  assignmentVersion?: { id: string; assignmentKeyId: string; courseVersionId: string; lessonKeyId: string; title: string; maxScore: number; courseVersion?: { courseId: string } };
  student?: { id: string; profile?: BackendProfile | null };
}

export interface BackendTestAttemptStart {
  attemptId: string; startedAt: string; timeLimitSeconds?: number | null; title: string;
  questions: Array<{ id: string; questionKeyId: string; type: string; prompt: string; options?: unknown; points: number }>;
}

export interface BackendTestAttemptResult {
  attemptId: string; status: string; score: number; maxScore: number; requiresManualReview: boolean; passed: boolean | null;
}

export interface BackendChatUser {
  id: string;
  email: string;
  status: string;
  profile?: BackendProfile | null;
  roles?: Array<{ role: { code: string } }>;
}

export interface BackendChatParticipant {
  id: string;
  userId: string;
  joinedAt: string;
  leftAt?: string | null;
  lastReadAt?: string | null;
  mutedUntil?: string | null;
  user: BackendChatUser;
}

export interface BackendChatMessage {
  id: string;
  conversationId: string;
  authorId?: string | null;
  kind: 'TEXT' | 'SYSTEM';
  body: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  author?: BackendChatUser | null;
  attachments?: BackendChatAttachment[];
}

export interface BackendConversation {
  id: string;
  type: 'DIRECT' | 'SUPPORT';
  status: 'ACTIVE' | 'CLOSED';
  createdById: string;
  createdAt: string;
  updatedAt: string;
  participants: BackendChatParticipant[];
  messages?: BackendChatMessage[];
  unreadCount?: number;
  lastReadAt?: string | null;
}

export interface BackendBookingSeriesResult {
  seriesId: string;
  bookingIds: string[];
  teacherId: string;
  needsPayment: boolean;
  totalMinor: number;
  currency: string;
  lessons: number;
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

export interface BackendEnrollmentSummary {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  coverAssetId?: string | null;
  versionId: string;
  versionNumber: number;
  progress: number;
  completedLessonIds: string[];
  lastLessonId: string;
  startedAt: string;
  expiresAt?: string | null;
  status: string;
}

export interface BackendLearningBlock {
  id: string;
  type: string;
  title?: string | null;
  content?: string | null;
  assetId?: string | null;
  data?: Record<string, unknown> | null;
}

export interface BackendLearningLesson {
  id: string;
  title: string;
  duration: number;
  type: string;
  isPreview?: boolean;
  releaseAt?: string | null;
  progress?: unknown;
  blocks: BackendLearningBlock[];
  tests?: Array<{ id: string; testKeyId: string; title: string; passScore: number; timeLimitSeconds?: number | null; attemptsLimit?: number | null }>;
  assignments?: Array<{
    id: string;
    assignmentKeyId: string;
    title: string;
    instructions: string;
    gradingMode: string;
    maxScore: number;
    dueAt?: string | null;
    allowTextAnswer: boolean;
    allowFileUpload: boolean;
    acceptedFileTypes?: unknown;
  }>;
}

export interface BackendLearningCourse {
  enrollmentId: string;
  courseId: string;
  slug: string;
  versionId: string;
  versionNumber: number;
  title: string;
  shortDescription: string;
  description: string;
  coverAssetId?: string | null;
  level: string;
  category: string;
  priceMinor: number;
  oldPriceMinor?: number | null;
  currency: string;
  tags?: unknown;
  outcomes?: unknown;
  duration: string;
  accessMode?: 'PUBLIC_SALE' | 'PUBLIC_FREE' | 'MANAGED';
  managedKind?: 'INDIVIDUAL' | 'GROUP' | null;
  completionDueAt?: string | null;
  instructor?: { id?: string; name?: string; avatarAssetId?: string | null; headline?: string };
  modules: Array<{ id: string; title: string; description: string; lessons: BackendLearningLesson[] }>;
  schedule?: Array<{ scheduleKeyId?: string; type: string; title: string; startAt: string; durationMinutes: number; lessonKeyId?: string | null; required?: boolean; metadata?: Record<string, unknown> | null }>;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  provider: string;
  confirmationUrl: string | null;
  amountMinor: number;
  currency: string;
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
    enrollments: () => apiRequest<BackendEnrollmentSummary[]>('/me/enrollments'),
    course: (courseId: string) => apiRequest<BackendLearningCourse>(`/learning/courses/${encodeURIComponent(courseId)}`),
    enrollFree: (courseId: string) => apiRequest<{ enrolled: true; enrollmentId: string; courseId: string }>(`/learning/courses/${encodeURIComponent(courseId)}/enroll-free`, { method: 'POST' }),
    completeLesson: (lessonKeyId: string) => apiRequest(`/lessons/${encodeURIComponent(lessonKeyId)}/complete`, { method: 'POST' })
  },
  media: {
    createUpload: (payload: { kind: BackendAssetKind; fileName: string; mimeType: string; sizeBytes: number }) => apiRequest<{ assetId: string; uploadUrl: string; expiresIn: number; method: 'PUT'; headers: Record<string, string> }>('/media/uploads', { method: 'POST', body: JSON.stringify(payload) }),
    complete: (assetId: string) => apiRequest(`/media/uploads/${encodeURIComponent(assetId)}/complete`, { method: 'POST' }),
    url: (assetId: string) => apiRequest<BackendAssetAccess>(`/media/assets/${encodeURIComponent(assetId)}/url`),
    publicCourseCover: (assetId: string) => apiRequest<BackendAssetAccess>(`/media/public/course-covers/${encodeURIComponent(assetId)}/url`),
    upload: async (file: File, kind: BackendAssetKind) => {
      const ticket = await apiRequest<{ assetId: string; uploadUrl: string; expiresIn: number; method: 'PUT'; headers: Record<string, string> }>('/media/uploads', {
        method: 'POST', body: JSON.stringify({ kind: kind === 'FILE' ? 'DOCUMENT' : kind, fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size })
      });
      const uploaded = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: file });
      if (!uploaded.ok) throw new ApiError(`MinIO/S3 отклонил загрузку (${uploaded.status})`, uploaded.status, 'MEDIA_UPLOAD_FAILED');
      await apiRequest(`/media/uploads/${encodeURIComponent(ticket.assetId)}/complete`, { method: 'POST' });
      return apiRequest<BackendAssetAccess>(`/media/assets/${encodeURIComponent(ticket.assetId)}/url`);
    }
  },
  dictionary: {
    list: () => apiRequest<BackendDictionaryEntry[]>('/dictionary/entries'),
    dueToday: () => apiRequest<BackendDictionaryEntry[]>('/dictionary/reviews/today'),
    translate: (text: string, context?: string) =>
      apiRequest<BackendDictionaryTranslation>('/dictionary/translate', { method: 'POST', body: JSON.stringify({ text, context }) }),
    add: (payload: unknown) => apiRequest<BackendDictionaryEntry>('/dictionary/entries', { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id: string) => apiRequest<{ archived: true }>(`/dictionary/entries/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    review: (id: string, quality: number, durationMs?: number) => apiRequest<{ repetitions: number; intervalDays: number; easeFactor: number; nextReviewAt: string }>(`/dictionary/reviews/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ quality, durationMs }) })
  },
  payments: {
    createOrder: (payload: { productId: string }) => apiRequest<CreateOrderResponse>('/orders', { method: 'POST', body: JSON.stringify(payload) }),
    createBookingOrder: (bookingId: string) => apiRequest<CreateOrderResponse>('/orders/tutoring', { method: 'POST', body: JSON.stringify({ bookingId }) }),
    createBookingSeriesOrder: (seriesId: string) => apiRequest<CreateOrderResponse>('/orders/tutoring-series', { method: 'POST', body: JSON.stringify({ seriesId }) }),
    mockSucceed: (paymentId: string) => apiRequest<{ success: true; orderId: string; enrollmentId?: string; bookingId?: string; seriesId?: string; alreadyProcessed?: boolean }>(`/payments/mock/${encodeURIComponent(paymentId)}/succeed`, { method: 'POST' }),
    myOrders: () => apiRequest<BackendOrder[]>('/me/orders')
  },
  teachers: {
    list: (q?: string) => apiRequest<BackendTeacherPublic[]>(`/teachers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    myStudents: () => apiRequest<BackendTeacherStudent[]>('/teacher/students'),
    finance: () => apiRequest<BackendTeacherFinance>('/teacher/finance'),
    availability: (teacherId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const suffix = params.size ? `?${params.toString()}` : '';
      return apiRequest<BackendAvailability[]>(`/teachers/${encodeURIComponent(teacherId)}/availability${suffix}`);
    }
  },
  schedule: {
    mine: () => apiRequest<BackendCalendarEvent[]>('/schedule'),
    availability: (teacherId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const suffix = params.size ? `?${params.toString()}` : '';
      return apiRequest<BackendAvailability[]>(`/schedule/teachers/${encodeURIComponent(teacherId)}/availability${suffix}`);
    },
    createAvailability: (payload: unknown) => apiRequest<BackendAvailability>('/schedule/availability', { method: 'POST', body: JSON.stringify(payload) }),
    createAvailabilitySeries: (payload: unknown) => apiRequest<BackendAvailability[]>('/schedule/availability/series', { method: 'POST', body: JSON.stringify(payload) }),
    updateAvailability: (id: string, payload: unknown) => apiRequest<BackendAvailability>(`/schedule/availability/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteAvailability: (id: string) => apiRequest(`/schedule/availability/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    bookAvailability: (id: string) => apiRequest<{ bookingId: string; eventId: string; needsPayment: boolean; amountMinor: number }>(`/schedule/availability/${encodeURIComponent(id)}/book`, { method: 'POST' }),
    bookAvailabilitySeries: (availabilityIds: string[], timezone?: string) => apiRequest<BackendBookingSeriesResult>('/schedule/availability/book-series', { method: 'POST', body: JSON.stringify({ availabilityIds, timezone }) }),
    createEvent: (payload: unknown) => apiRequest<BackendCalendarEvent>('/schedule/events', { method: 'POST', body: JSON.stringify(payload) }),
    updateEvent: (id: string, payload: unknown) => apiRequest<BackendCalendarEvent>(`/schedule/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteEvent: (id: string) => apiRequest(`/schedule/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  notifications: {
    list: () => apiRequest<BackendNotification[]>('/notifications'),
    read: (id: string) => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
    readAll: () => apiRequest('/notifications/read-all', { method: 'POST' })
  },
  assignments: {
    submit: (assignmentVersionId: string, payload: { answerText?: string; fileAssetId?: string }) => apiRequest<BackendAssignmentSubmission>(`/assignments/${encodeURIComponent(assignmentVersionId)}/submissions`, { method: 'POST', body: JSON.stringify(payload) }),
    queue: () => apiRequest<BackendAssignmentSubmission[]>('/teacher/assignments/queue'),
    review: (id: string, payload: { status: 'ACCEPTED' | 'REVISION_REQUIRED'; score: number; feedback: string }) => apiRequest<BackendAssignmentSubmission>(`/teacher/assignments/submissions/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(payload) })
  },
  tests: {
    start: (testVersionId: string) => apiRequest<BackendTestAttemptStart>(`/tests/${encodeURIComponent(testVersionId)}/attempts`, { method: 'POST' }),
    answer: (attemptId: string, questionVersionId: string, answer: unknown) => apiRequest(`/attempts/${encodeURIComponent(attemptId)}/answers`, { method: 'POST', body: JSON.stringify({ questionVersionId, answer }) }),
    submit: (attemptId: string) => apiRequest<BackendTestAttemptResult>(`/attempts/${encodeURIComponent(attemptId)}/submit`, { method: 'POST' })
  },
  admin: {
    users: {
      list: (q?: string) => apiRequest<BackendAdminUser[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
      setRoles: (id: string, roles: string[]) => apiRequest<BackendAdminUser>(`/admin/users/${encodeURIComponent(id)}/roles`, { method: 'PATCH', body: JSON.stringify({ roles }) }),
      setStatus: (id: string, status: 'ACTIVE' | 'BLOCKED') => apiRequest<BackendAdminUser>(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
    },
    payments: {
      list: (q?: string) => apiRequest<BackendAdminOrder[]>(`/admin/orders${q ? `?q=${encodeURIComponent(q)}` : ''}`),
      stats: () => apiRequest<{ todayRevenueMinor: number; todayPaidCount: number; averagePaidOrderMinor: number; refundRate: number; currency: string }>('/admin/orders/stats')
    },
    overview: () => apiRequest<{ users: number; activeStudents: number; monthRevenueMinor: number; paidOrders: number; sessionsToday: number; liveSessions: number; moderation: number }>('/admin/overview'),
    system: {
      status: () => apiRequest<{ checkedAt: string; services: Array<{ id: string; name: string; status: string; detail: string }>; queues: Record<string, Record<string, number>> }>('/admin/system/status'),
      retryQueue: (name: 'media' | 'notifications') => apiRequest<{ queue: string; retried: number }>(`/admin/system/queues/${name}/retry`, { method: 'POST' }),
      backup: () => apiRequest<{ created: boolean; fileName: string; path: string }>('/admin/system/backups', { method: 'POST' })
    }
  },
  chat: {
    conversations: () => apiRequest<BackendConversation[]>('/chat/conversations'),
    contacts: () => apiRequest<BackendChatUser[]>('/chat/contacts'),
    direct: (userId: string) => apiRequest<BackendConversation>('/chat/conversations/direct', { method: 'POST', body: JSON.stringify({ userId }) }),
    support: () => apiRequest<BackendConversation>('/chat/conversations/support', { method: 'POST' }),
    messages: (conversationId: string, before?: string, limit = 50) => {
      const params = new URLSearchParams();
      if (before) params.set('before', before);
      params.set('limit', String(limit));
      return apiRequest<BackendChatMessage[]>(`/chat/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`);
    },
    send: (conversationId: string, body: string, assetIds: string[] = []) => apiRequest<BackendChatMessage>(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', body: JSON.stringify({ body, assetIds }) }),
    read: (conversationId: string) => apiRequest<{ read: true; lastReadAt: string }>(`/chat/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST' }),
    report: (messageId: string, reason: string) => apiRequest<{ reported: true; reportId: string }>(`/chat/messages/${encodeURIComponent(messageId)}/report`, { method: 'POST', body: JSON.stringify({ reason }) })
  },
  materials: {
    mine: () => apiRequest<BackendLearningMaterial[]>('/materials'),
    event: (eventId: string) => apiRequest<BackendLearningMaterial[]>(`/materials/events/${encodeURIComponent(eventId)}`),
    attachEvent: (eventId: string, assetId: string, title?: string, description?: string) => apiRequest<BackendLearningMaterial>(`/materials/events/${encodeURIComponent(eventId)}`, { method: 'POST', body: JSON.stringify({ assetId, title, description }) }),
    attachLibrary: (assetId: string, title?: string, description?: string) => apiRequest<BackendLearningMaterial>('/materials/library', { method: 'POST', body: JSON.stringify({ assetId, title, description }) }),
    save: (materialId: string) => apiRequest<{ saved: true; materialId: string }>(`/materials/${encodeURIComponent(materialId)}/save`, { method: 'POST' }),
    unsave: (materialId: string) => apiRequest<{ saved: false; materialId: string }>(`/materials/${encodeURIComponent(materialId)}/save`, { method: 'DELETE' }),
    url: (materialId: string, mode: 'inline' | 'attachment' = 'inline') => apiRequest<BackendAssetAccess>(`/materials/${encodeURIComponent(materialId)}/url?mode=${mode}`),
    remove: (materialId: string) => apiRequest<{ removed: true; sourceDeleted: boolean; materialId: string }>(`/materials/${encodeURIComponent(materialId)}`, { method: 'DELETE' })
  },
  video: {
    health: () => apiRequest<{ reachable: boolean; url: string; httpStatus?: number; reason?: string }>('/video/health'),
    token: (sessionId: string) => apiRequest<{ url: string; token: string; roomName: string; moderator: boolean; expiresInSeconds: number }>(`/video/sessions/${encodeURIComponent(sessionId)}/token`, { method: 'POST' })
  }
};
