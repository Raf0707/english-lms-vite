import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AssignmentSubmission,
  Course,
  CourseStatus,
  DictionaryEntry,
  Enrollment,
  Notification,
  Payment,
  Role,
  Session,
  TutoringSlot,
  User
} from '../types';
import { api, ApiError, type BackendAssignmentSubmission, type BackendAvailability, type BackendCalendarEvent, type BackendDictionaryEntry, type BackendEnrollmentSummary, type BackendNotification, type BackendOrder, type VerificationCodes } from '../services/api';
import { backendUserToAppUser, splitPersonName } from '../services/auth';
import { courseBackend, learningCourseToCourse, managedSummaryToCourse, publicCourseToCourse } from '../services/courseBackend';

interface Toast {
  id: string;
  title: string;
  text?: string;
  tone?: 'success' | 'warning' | 'info';
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'guest';

interface AppState {
  user: User | null;
  authStatus: AuthStatus;
  authError: string | null;
  pendingVerification: VerificationCodes | null;
  courses: Course[];
  managedCourses: Course[];
  managedCoursesStatus: 'idle' | 'loading' | 'ready' | 'error';
  learningStatus: 'idle' | 'loading' | 'ready' | 'error';
  enrollments: Enrollment[];
  dictionary: DictionaryEntry[];
  sessions: Session[];
  tutoringSlots: TutoringSlot[];
  assignmentSubmissions: AssignmentSubmission[];
  payments: Payment[];
  notifications: Notification[];
  toasts: Toast[];
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  bootstrapAuth: () => Promise<void>;
  loginAs: (role: Exclude<Role, 'guest'>) => Promise<User>;
  login: (identifier: string, password: string) => Promise<User>;
  register: (name: string, email: string, phone: string, password: string, timezone?: string) => Promise<{ user: User; verification?: VerificationCodes }>;
  updateProfile: (payload: Pick<User, 'name' | 'email' | 'phone' | 'timezone'>) => Promise<void>;
  updateContacts: (payload: { email?: string; phone?: string; currentPassword: string }) => Promise<VerificationCodes | undefined>;
  requestVerification: (channel: 'email' | 'phone') => Promise<string | undefined>;
  confirmVerification: (channel: 'email' | 'phone', code: string) => Promise<void>;
  forgotPassword: (login: string) => Promise<string | undefined>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  loadPublicCourses: () => Promise<Course[]>;
  loadManagedCourses: () => Promise<Course[]>;
  loadEnrollments: () => Promise<Enrollment[]>;
  loadDictionary: () => Promise<DictionaryEntry[]>;
  loadSchedule: () => Promise<Session[]>;
  loadTutoringSlots: (teacherId?: string) => Promise<TutoringSlot[]>;
  loadPayments: () => Promise<Payment[]>;
  loadNotifications: () => Promise<Notification[]>;
  loadAssignmentQueue: () => Promise<AssignmentSubmission[]>;
  setManagedCourse: (course: Course) => void;
  removeManagedCourse: (courseId: string) => void;
  purchaseCourse: (course: Course) => Promise<Enrollment>;
  completeLesson: (courseId: string, lessonId: string) => Promise<void>;
  upsertCourse: (course: Course) => Course;
  setCourseStatus: (courseId: string, status: CourseStatus, comment?: string) => void;
  submitCourseForModeration: (courseId: string) => void;
  approveCourse: (courseId: string) => void;
  requestCourseRevision: (courseId: string, comment: string) => void;
  requestCourseDeletion: (courseId: string) => void;
  rejectCourseDeletion: (courseId: string) => void;
  deleteCourse: (courseId: string) => void;
  addSession: (session: Omit<Session, 'id'>) => Promise<Session>;
  updateSession: (sessionId: string, data: Partial<Omit<Session, 'id'>>) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  addTutoringSlot: (slot: Omit<TutoringSlot, 'id' | 'attendees' | 'booked'>) => Promise<TutoringSlot>;
  updateTutoringSlot: (slotId: string, data: Partial<Omit<TutoringSlot, 'id' | 'instructorId'>>) => Promise<void>;
  removeTutoringSlot: (slotId: string) => Promise<void>;
  bookTutoringSlot: (slotId: string) => Promise<void>;
  submitAssignment: (submission: Omit<AssignmentSubmission, 'id' | 'studentId' | 'studentName' | 'submittedAt'>) => Promise<AssignmentSubmission | null>;
  gradeAssignment: (submissionId: string, status: 'approved' | 'revision', score?: number, feedback?: string) => Promise<void>;
  addDictionaryEntry: (entry: Omit<DictionaryEntry, 'id' | 'createdAt' | 'repetitions' | 'interval' | 'easeFactor' | 'nextReviewAt' | 'status'>) => Promise<void>;
  removeDictionaryEntry: (id: string) => Promise<void>;
  rateReview: (id: string, quality: number) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  resetDemo: () => void;
}



function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const devCredentials: Record<Exclude<Role, 'guest'>, { login: string; password: string }> = {
  student: {
    login: import.meta.env.VITE_DEV_STUDENT_LOGIN ?? 'student@example.local',
    password: import.meta.env.VITE_DEV_STUDENT_PASSWORD ?? 'ChangeMe123!'
  },
  teacher: {
    login: import.meta.env.VITE_DEV_TEACHER_LOGIN ?? 'teacher@example.local',
    password: import.meta.env.VITE_DEV_TEACHER_PASSWORD ?? 'ChangeMe123!'
  },
  admin: {
    login: import.meta.env.VITE_DEV_ADMIN_LOGIN ?? 'admin@example.local',
    password: import.meta.env.VITE_DEV_ADMIN_PASSWORD ?? 'ChangeMe123!'
  }
};

function apiMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Не удалось выполнить запрос к серверу';
}

function enrollmentFromBackend(item: BackendEnrollmentSummary, fallbackLastLessonId = ''): Enrollment {
  return {
    courseId: item.courseId,
    progress: item.progress,
    completedLessonIds: item.completedLessonIds ?? [],
    lastLessonId: item.lastLessonId || fallbackLastLessonId,
    startedAt: item.startedAt,
    expiresAt: item.expiresAt ?? undefined
  };
}

function dictionaryFromBackend(item: BackendDictionaryEntry): DictionaryEntry {
  const state = item.reviewState;
  const statusMap: Record<string, DictionaryEntry['status']> = { NEW: 'new', LEARNING: 'learning', REVIEW: 'review', MASTERED: 'mastered', PAUSED: 'paused' };
  return {
    id: item.id, word: item.sourceText, translation: item.translation, context: item.contextSentence ?? '',
    courseId: item.courseId ?? undefined, lessonId: item.lessonKeyId ?? undefined, status: statusMap[item.status] ?? 'new',
    repetitions: state?.repetitions ?? 0, interval: state?.intervalDays ?? 0, easeFactor: Number(state?.easeFactor ?? 2.5),
    nextReviewAt: state?.nextReviewAt ?? item.createdAt, createdAt: item.createdAt
  };
}

function sessionFromBackend(item: BackendCalendarEvent): Session {
  const profile = item.instructor?.profile;
  const instructor = profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Преподаватель';
  const type: Session['type'] = item.type === 'PRIVATE_LESSON' ? 'individual' : item.type === 'GROUP_LESSON' ? 'group' : 'webinar';
  const statusMap: Record<string, Session['status']> = { SCHEDULED: 'scheduled', LIVE: 'live', COMPLETED: 'completed', CANCELLED: 'cancelled' };
  return {
    id: item.id, title: item.title, type, courseId: item.courseId ?? undefined, instructor, instructorId: item.instructorId, startAt: item.startAt,
    duration: Math.max(1, Math.round((+new Date(item.endAt) - +new Date(item.startAt)) / 60000)), attendees: item.attendees ?? item.bookings?.length ?? 0,
    maxAttendees: item.maxParticipants, price: Math.round(item.priceMinor / 100), status: statusMap[item.status] ?? 'scheduled', source: item.courseId ? 'course' : 'tutoring'
  };
}

function slotFromBackend(item: BackendAvailability): TutoringSlot {
  return {
    id: item.id, instructorId: item.teacherId, type: item.type === 'GROUP' ? 'group' : 'individual', startAt: item.startAt,
    duration: Math.max(1, Math.round((+new Date(item.endAt) - +new Date(item.startAt)) / 60000)), price: Math.round(item.priceMinor / 100),
    maxAttendees: item.maxParticipants, attendees: item.attendees ?? 0, booked: Boolean(item.booked)
  };
}

function paymentFromBackend(order: BackendOrder): Payment {
  const payment = order.payments?.[0];
  const receipt = order.receipts?.find((item) => item.url);
  const refunded = order.status === 'REFUNDED' || order.status === 'PARTIALLY_REFUNDED' || payment?.status === 'REFUNDED';
  const status: Payment['status'] = refunded ? 'refunded' : payment?.status === 'SUCCEEDED' || order.status === 'PAID' ? 'paid' : payment?.status === 'FAILED' ? 'failed' : 'pending';
  return { id: order.id, number: order.number, title: order.items?.map((item) => item.title).join(', ') || 'Заказ', amount: order.totalMinor / 100, date: payment?.paidAt ?? order.createdAt, status, receiptUrl: receipt?.url ?? undefined };
}

function notificationFromBackend(item: BackendNotification): Notification {
  const type: Notification['type'] = item.type.includes('PAYMENT') ? 'payment' : item.type.includes('SESSION') || item.type.includes('BOOKING') ? 'session' : item.type.includes('LESSON') ? 'lesson' : 'system';
  return { id: item.id, title: item.title, text: item.body, date: item.createdAt, read: Boolean(item.readAt), type, actionPath: typeof item.payload?.path === 'string' ? item.payload.path : undefined };
}

function submissionFromBackend(item: BackendAssignmentSubmission): AssignmentSubmission {
  const profile = item.student?.profile;
  const studentName = profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Ученик';
  const status: AssignmentSubmission['status'] = item.status === 'ACCEPTED' ? 'approved' : item.status === 'REVISION_REQUIRED' ? 'revision' : 'pending';
  return {
    id: item.id, assignmentId: item.assignmentVersion?.id ?? item.assignmentVersionId, courseId: item.assignmentVersion?.courseVersion?.courseId ?? '',
    lessonId: item.assignmentVersion?.lessonKeyId ?? '', studentId: item.studentId, studentName, answer: item.answerText ?? undefined,
    fileName: item.fileAssetId ?? undefined, fileAssetId: item.fileAssetId ?? undefined, status, score: item.score ?? undefined, feedback: item.feedback ?? undefined, submittedAt: item.submittedAt, reviewedAt: item.reviewedAt ?? undefined
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      authStatus: 'idle',
      authError: null,
      pendingVerification: null,
      courses: [],
      managedCourses: [],
      managedCoursesStatus: 'idle',
      learningStatus: 'idle',
      enrollments: [],
      dictionary: [],
      sessions: [],
      tutoringSlots: [],
      assignmentSubmissions: [],
      payments: [],
      notifications: [],
      toasts: [],
      sidebarOpen: false,
      sidebarCollapsed: false,
      bootstrapAuth: async () => {
        if (get().authStatus === 'loading') return;
        set({ authStatus: 'loading', authError: null });
        try {
          const backendUser = await api.profile.me();
          const user = backendUserToAppUser(backendUser);
          set({ user, authStatus: 'authenticated', authError: null, managedCourses: [], managedCoursesStatus: 'idle', enrollments: [], learningStatus: user.role === 'student' ? 'loading' : 'idle' });
          const connected: Promise<unknown>[] = [get().loadNotifications()];
          if (user.role === 'student') connected.push(get().loadPublicCourses(), get().loadEnrollments(), get().loadDictionary(), get().loadSchedule(), get().loadPayments());
          if (user.role === 'teacher') connected.push(get().loadManagedCourses(), get().loadSchedule(), get().loadTutoringSlots(user.id), get().loadAssignmentQueue());
          if (user.role === 'admin') connected.push(get().loadManagedCourses());
          const settled = await Promise.allSettled(connected);
          if (user.role === 'student' && settled.some((item) => item.status === 'rejected')) set({ learningStatus: get().enrollments.length ? 'ready' : 'error' });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            set({ user: null, authStatus: 'guest', authError: null });
            return;
          }
          set({ user: null, authStatus: 'guest', authError: apiMessage(error) });
        }
      },
      loginAs: async (role) => {
        const credentials = devCredentials[role];
        return get().login(credentials.login, credentials.password);
      },
      login: async (identifier, password) => {
        set({ authStatus: 'loading', authError: null });
        try {
          await api.auth.login(identifier.trim(), password);
          const fullUser = await api.profile.me();
          const user = backendUserToAppUser(fullUser);
          set({ user, authStatus: 'authenticated', authError: null, sidebarOpen: false, managedCourses: [], managedCoursesStatus: 'idle', enrollments: [], learningStatus: user.role === 'student' ? 'loading' : 'idle' });
          const connected: Promise<unknown>[] = [get().loadNotifications()];
          if (user.role === 'student') connected.push(get().loadPublicCourses(), get().loadEnrollments(), get().loadDictionary(), get().loadSchedule(), get().loadPayments());
          if (user.role === 'teacher') connected.push(get().loadManagedCourses(), get().loadSchedule(), get().loadTutoringSlots(user.id), get().loadAssignmentQueue());
          if (user.role === 'admin') connected.push(get().loadManagedCourses());
          const settled = await Promise.allSettled(connected);
          if (settled.some((item) => item.status === 'rejected')) get().addToast({ title: 'Вход выполнен', text: 'Часть данных не удалось загрузить сразу. Разделы можно обновить повторно.', tone: 'warning' });
          get().addToast({ title: 'Добро пожаловать!', text: 'Вход выполнен через backend.', tone: 'success' });
          return user;
        } catch (error) {
          const message = apiMessage(error);
          set({ user: null, authStatus: 'guest', authError: message });
          throw error;
        }
      },
      register: async (name, email, phone, password, timezone) => {
        const person = splitPersonName(name);
        if (!person.firstName) throw new Error('Введите имя');
        set({ authStatus: 'loading', authError: null });
        try {
          const result = await api.auth.register({
            firstName: person.firstName,
            lastName: person.lastName,
            email: email.trim(),
            phone: phone.trim(),
            password,
            timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow'
          });
          const user = backendUserToAppUser(result.user);
          set({
            user,
            authStatus: 'authenticated',
            authError: null,
            pendingVerification: result.verification ?? null,
            sidebarOpen: false,
            managedCourses: [],
            managedCoursesStatus: 'idle',
            enrollments: [],
            learningStatus: user.role === 'student' ? 'loading' : 'idle'
          });
          const connected: Promise<unknown>[] = [get().loadNotifications()];
          if (user.role === 'student') connected.push(get().loadPublicCourses(), get().loadEnrollments(), get().loadDictionary(), get().loadSchedule(), get().loadPayments());
          await Promise.allSettled(connected);
          get().addToast({ title: 'Аккаунт создан', text: 'Данные сохранены в PostgreSQL, сессия создана в Redis.', tone: 'success' });
          return { user, verification: result.verification };
        } catch (error) {
          const message = apiMessage(error);
          set({ user: null, authStatus: 'guest', authError: message });
          throw error;
        }
      },
      updateProfile: async (payload) => {
        const person = splitPersonName(payload.name);
        await api.profile.update({
          firstName: person.firstName,
          lastName: person.lastName,
          displayName: person.displayName,
          timezone: payload.timezone,
          locale: 'ru'
        });
        const fullUser = await api.profile.me();
        set({ user: backendUserToAppUser(fullUser), authStatus: 'authenticated' });
      },
      updateContacts: async (payload) => {
        const result = await api.auth.updateContacts(payload);
        const user = backendUserToAppUser(result.user);
        set({ user, authStatus: 'authenticated', pendingVerification: result.verification ?? null });
        return result.verification;
      },
      requestVerification: async (channel) => {
        const result = await api.auth.requestVerification(channel);
        set((state) => ({
          pendingVerification: {
            ...(state.pendingVerification ?? {}),
            ...(channel === 'email' ? { emailCode: result.code } : { phoneCode: result.code })
          }
        }));
        return result.code;
      },
      confirmVerification: async (channel, code) => {
        await api.auth.confirmVerification(channel, code);
        const fullUser = await api.profile.me();
        set((state) => ({
          user: backendUserToAppUser(fullUser),
          authStatus: 'authenticated',
          pendingVerification: state.pendingVerification
            ? { ...state.pendingVerification, ...(channel === 'email' ? { emailCode: undefined } : { phoneCode: undefined }) }
            : null
        }));
      },
      forgotPassword: async (login) => {
        const result = await api.auth.forgotPassword(login);
        return result.token;
      },
      resetPassword: async (token, newPassword) => {
        await api.auth.resetPassword(token, newPassword);
        set({ user: null, authStatus: 'guest', pendingVerification: null, enrollments: [], learningStatus: 'idle', courses: [] });
      },
      logout: async () => {
        try {
          await api.auth.logout();
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 401)) throw error;
        } finally {
          set({ user: null, authStatus: 'guest', authError: null, pendingVerification: null, sidebarOpen: false, managedCourses: [], managedCoursesStatus: 'idle', enrollments: [], learningStatus: 'idle', courses: [], dictionary: [], sessions: [], tutoringSlots: [], assignmentSubmissions: [], payments: [], notifications: [] });
        }
      },
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      loadPublicCourses: async () => {
        const result = await courseBackend.listPublic();
        const publicCourses = result.items.map(publicCourseToCourse);
        set((state) => {
          const existingById = new Map(state.courses.map((course) => [course.id, course]));
          // Keep the richer enrollment-bound course object when it is already
          // loaded; add public catalogue courses that are not present yet.
          for (const course of publicCourses) {
            if (!existingById.has(course.id)) existingById.set(course.id, course);
          }
          return { courses: [...existingById.values()] };
        });
        return publicCourses;
      },
      loadManagedCourses: async () => {
        set({ managedCoursesStatus: 'loading' });
        try {
          const items = await courseBackend.listManaged();
          const courses = items.map(managedSummaryToCourse);
          set({ managedCourses: courses, managedCoursesStatus: 'ready' });
          return courses;
        } catch (error) {
          set({ managedCoursesStatus: 'error' });
          throw error;
        }
      },
      loadEnrollments: async () => {
        set({ learningStatus: 'loading' });
        try {
          const summaries = await api.learning.enrollments();
          const loadedCourses = await Promise.all(summaries.map(async (summary) => {
            try {
              const learningCourse = await api.learning.course(summary.courseId);
              return learningCourseToCourse(learningCourse);
            } catch {
              try {
                const publicCourse = await courseBackend.publicBySlug(summary.slug);
                return publicCourseToCourse(publicCourse);
              } catch {
                return null;
              }
            }
          }));
          const courseById = new Map(loadedCourses.filter((course): course is Course => Boolean(course)).map((course) => [course.id, course]));
          const enrollments = summaries.map((summary) => {
            const course = courseById.get(summary.courseId);
            const firstLesson = course?.modules[0]?.lessons[0]?.id ?? '';
            return enrollmentFromBackend(summary, firstLesson);
          });
          set((state) => ({
            learningStatus: 'ready',
            enrollments,
            courses: [
              ...courseById.values(),
              ...state.courses.filter((course) => !courseById.has(course.id))
            ]
          }));
          return enrollments;
        } catch (error) {
          set({ learningStatus: 'error' });
          throw error;
        }
      },
      loadDictionary: async () => {
        const items = await api.dictionary.list();
        const dictionary = items.map(dictionaryFromBackend);
        set({ dictionary });
        return dictionary;
      },
      loadSchedule: async () => {
        const items = await api.schedule.mine();
        const sessions = items.map(sessionFromBackend);
        set({ sessions });
        return sessions;
      },
      loadTutoringSlots: async (teacherId) => {
        const id = teacherId ?? get().user?.id;
        if (!id) { set({ tutoringSlots: [] }); return []; }
        const from = new Date(Date.now() - 86400000).toISOString();
        const to = new Date(Date.now() + 400 * 86400000).toISOString();
        const items = await api.schedule.availability(id, from, to);
        const slots = items.map(slotFromBackend);
        set((state) => ({ tutoringSlots: [...slots, ...state.tutoringSlots.filter((slot) => slot.instructorId !== id)] }));
        return slots;
      },
      loadPayments: async () => {
        const orders = await api.payments.myOrders();
        const rows = orders.map(paymentFromBackend);
        set({ payments: rows });
        return rows;
      },
      loadNotifications: async () => {
        const items = await api.notifications.list();
        const rows = items.map(notificationFromBackend);
        set({ notifications: rows });
        return rows;
      },
      loadAssignmentQueue: async () => {
        const items = await api.assignments.queue();
        const rows = items.map(submissionFromBackend);
        set({ assignmentSubmissions: rows });
        return rows;
      },
      setManagedCourse: (course) => set((state) => ({
        managedCourses: [course, ...state.managedCourses.filter((item) => item.id !== course.id)]
      })),
      removeManagedCourse: (courseId) => set((state) => ({
        managedCourses: state.managedCourses.filter((item) => item.id !== courseId)
      })),
      purchaseCourse: async (course) => {
        const existing = get().enrollments.find((item) => item.courseId === course.id);
        if (existing) {
          get().addToast({ title: 'Курс уже доступен', text: 'Он находится в разделе «Моё обучение».', tone: 'info' });
          return existing;
        }
        try {
          const order = await api.payments.createOrder({ productId: course.id });
          if (order.provider === 'mock') {
            await api.payments.mockSucceed(order.paymentId);
          } else if (order.confirmationUrl) {
            window.location.assign(order.confirmationUrl);
            throw new Error('Открыта страница оплаты. После подтверждения вернитесь в «Моё обучение».');
          }

          set((state) => ({
            courses: [course, ...state.courses.filter((item) => item.id !== course.id)]
          }));
          const enrollments = await get().loadEnrollments();
          const enrollment = enrollments.find((item) => item.courseId === course.id);
          if (!enrollment) throw new Error('Оплата подтверждена, но зачисление ещё не появилось. Обновите «Моё обучение».');
          get().addToast({ title: 'Оплата прошла успешно', text: 'Доступ к курсу открыт и сохранён на backend.', tone: 'success' });
          return enrollment;
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            try {
              const enrollments = await get().loadEnrollments();
              const enrollment = enrollments.find((item) => item.courseId === course.id);
              if (enrollment) {
                get().addToast({ title: 'Курс уже доступен', text: 'Доступ восстановлен из backend.', tone: 'info' });
                return enrollment;
              }
            } catch { /* keep original payment error */ }
          }
          const message = apiMessage(error);
          get().addToast({ title: 'Не удалось открыть доступ к курсу', text: message, tone: 'warning' });
          throw error;
        }
      },
      completeLesson: async (courseId, lessonId) => {
        const course = get().courses.find((item) => item.id === courseId);
        if (!course) return;
        const allLessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
        if (!allLessonIds.includes(lessonId)) return;
        const targetEnrollment = get().enrollments.find((item) => item.courseId === courseId);
        if (!targetEnrollment) {
          get().addToast({ title: 'Не удалось обновить прогресс', text: 'Зачисление на курс не найдено.', tone: 'warning' });
          return;
        }
        try {
          await api.learning.completeLesson(lessonId);
          await get().loadEnrollments();
          get().addToast({ title: 'Урок завершён', text: 'Прогресс курса сохранён на backend.', tone: 'success' });
        } catch (error) {
          get().addToast({ title: 'Не удалось сохранить прогресс', text: apiMessage(error), tone: 'warning' });
          throw error;
        }
      },

      upsertCourse: (course) => {
        const now = new Date().toISOString();
        const recordId = course.id || newId('course');
        const schedule = (course.schedule ?? []).map((item) => item.type === 'conference'
          ? { ...item, sessionId: `course-schedule-${recordId}-${item.id}` }
          : item);
        const releaseByLesson = new Map(schedule.filter((item) => item.type === 'lesson' && item.lessonId).map((item) => [item.lessonId!, item.startAt]));
        const record: Course = {
          ...course,
          id: recordId,
          slug: course.slug || `course-${Date.now()}`,
          status: course.status ?? 'draft',
          createdAt: course.createdAt ?? now,
          updatedAt: now,
          ownerId: course.ownerId ?? get().user?.id,
          instructorId: course.instructorId ?? get().user?.id,
          schedule,
          modules: course.modules.map((module) => ({
            ...module,
            lessons: module.lessons.map((lesson) => ({ ...lesson, releaseAt: releaseByLesson.get(lesson.id) }))
          }))
        };
        const conferenceSessions: Session[] = schedule
          .filter((item) => item.type === 'conference')
          .map((item) => ({
            id: item.sessionId!,
            title: item.title || `Видеоконференция · ${record.title}`,
            type: 'webinar',
            courseId: record.id,
            instructor: record.instructor,
            instructorId: record.instructorId,
            startAt: item.startAt,
            duration: item.duration,
            attendees: 0,
            maxAttendees: 50,
            status: new Date(item.startAt).getTime() < Date.now() ? 'completed' : 'scheduled',
            source: 'course'
          }));
        const prefix = `course-schedule-${record.id}-`;
        set((state) => ({
          courses: state.courses.some((item) => item.id === record.id)
            ? state.courses.map((item) => (item.id === record.id ? record : item))
            : [record, ...state.courses],
          sessions: [...conferenceSessions, ...state.sessions.filter((session) => !session.id.startsWith(prefix))]
        }));
        return record;
      },
      setCourseStatus: (courseId, status, comment) => set((state) => ({
        courses: state.courses.map((course) => course.id === courseId ? {
          ...course,
          status,
          moderationComment: comment,
          updatedAt: new Date().toISOString()
        } : course)
      })),
      submitCourseForModeration: (courseId) => {
        get().setCourseStatus(courseId, 'moderation');
        get().addToast({ title: 'Курс отправлен на модерацию', text: 'Администратор сможет проверить и опубликовать его.', tone: 'success' });
      },
      approveCourse: (courseId) => {
        get().setCourseStatus(courseId, 'published');
        get().addToast({ title: 'Курс опубликован', text: 'Он доступен в публичном каталоге.', tone: 'success' });
      },
      requestCourseRevision: (courseId, comment) => {
        get().setCourseStatus(courseId, 'revision', comment);
        get().addToast({ title: 'Курс возвращён на доработку', text: comment || 'Добавлен комментарий администратора.', tone: 'warning' });
      },
      requestCourseDeletion: (courseId) => {
        const currentUser = get().user;
        set((state) => ({
          courses: state.courses.map((course) => course.id === courseId ? {
            ...course,
            deletionStatus: 'requested',
            deletionRequestedBy: currentUser?.id,
            deletionRequestedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } : course)
        }));
        get().addToast({ title: 'Запрос на удаление отправлен', text: 'Курс будет удалён после подтверждения администратором.', tone: 'warning' });
      },
      rejectCourseDeletion: (courseId) => {
        set((state) => ({
          courses: state.courses.map((course) => course.id === courseId ? {
            ...course,
            deletionStatus: undefined,
            deletionRequestedBy: undefined,
            deletionRequestedAt: undefined,
            updatedAt: new Date().toISOString()
          } : course)
        }));
        get().addToast({ title: 'Удаление курса отклонено', text: 'Курс остаётся доступным владельцу.', tone: 'info' });
      },
      deleteCourse: (courseId) => {
        const course = get().courses.find((item) => item.id === courseId);
        if (!course) return;
        set((state) => ({
          courses: state.courses.filter((item) => item.id !== courseId),
          enrollments: state.enrollments.filter((item) => item.courseId !== courseId),
          sessions: state.sessions.filter((item) => item.courseId !== courseId),
          assignmentSubmissions: state.assignmentSubmissions.filter((item) => item.courseId !== courseId)
        }));
        get().addToast({ title: 'Курс удалён', text: course.title, tone: 'info' });
      },
      addSession: async (session) => {
        const endAt = new Date(+new Date(session.startAt) + session.duration * 60000).toISOString();
        const created = await api.schedule.createEvent({
          title: session.title,
          type: session.type === 'individual' ? 'PRIVATE_LESSON' : session.type === 'group' ? 'GROUP_LESSON' : 'WEBINAR',
          courseId: session.courseId,
          startAt: session.startAt, endAt, maxParticipants: session.maxAttendees, priceMinor: Math.round((session.price ?? 0) * 100), currency: 'RUB'
        });
        const record = sessionFromBackend(created);
        set((state) => ({ sessions: [record, ...state.sessions.filter((item) => item.id !== record.id)] }));
        get().addToast({ title: 'Занятие добавлено', text: `${record.title} — ${new Date(record.startAt).toLocaleString('ru-RU')}`, tone: 'success' });
        return record;
      },
      updateSession: async (sessionId, data) => {
        const current = get().sessions.find((item) => item.id === sessionId);
        if (!current) return;
        const next = { ...current, ...data };
        const endAt = new Date(+new Date(next.startAt) + next.duration * 60000).toISOString();
        const updated = await api.schedule.updateEvent(sessionId, {
          title: next.title, type: next.type === 'individual' ? 'PRIVATE_LESSON' : next.type === 'group' ? 'GROUP_LESSON' : 'WEBINAR',
          courseId: next.courseId, startAt: next.startAt, endAt, maxParticipants: next.maxAttendees, priceMinor: Math.round((next.price ?? 0) * 100), currency: 'RUB'
        });
        const record = sessionFromBackend(updated);
        set((state) => ({ sessions: state.sessions.map((item) => item.id === sessionId ? record : item) }));
        get().addToast({ title: 'Занятие обновлено', text: 'Изменения сохранены на backend.', tone: 'success' });
      },
      removeSession: async (sessionId) => {
        await api.schedule.deleteEvent(sessionId);
        set((state) => ({ sessions: state.sessions.filter((session) => session.id !== sessionId) }));
        get().addToast({ title: 'Занятие удалено', tone: 'info' });
      },
      addTutoringSlot: async (slot) => {
        const endAt = new Date(+new Date(slot.startAt) + slot.duration * 60000).toISOString();
        const created = await api.schedule.createAvailability({
          type: slot.type === 'group' ? 'GROUP' : 'INDIVIDUAL', startAt: slot.startAt, endAt,
          priceMinor: Math.round(slot.price * 100), currency: 'RUB', maxParticipants: slot.maxAttendees
        });
        const record = slotFromBackend(created);
        set((state) => ({ tutoringSlots: [record, ...state.tutoringSlots.filter((item) => item.id !== record.id)] }));
        get().addToast({ title: 'Окно для записи опубликовано', text: `${new Date(record.startAt).toLocaleString('ru-RU')} · ${record.type === 'individual' ? 'индивидуально' : 'группа'}`, tone: 'success' });
        return record;
      },
      updateTutoringSlot: async (slotId, data) => {
        const current = get().tutoringSlots.find((item) => item.id === slotId);
        if (!current) return;
        const next = { ...current, ...data };
        const endAt = new Date(+new Date(next.startAt) + next.duration * 60000).toISOString();
        await api.schedule.updateAvailability(slotId, {
          type: next.type === 'group' ? 'GROUP' : 'INDIVIDUAL', startAt: next.startAt, endAt,
          priceMinor: Math.round(next.price * 100), currency: 'RUB', maxParticipants: next.maxAttendees
        });
        await get().loadTutoringSlots(next.instructorId);
        get().addToast({ title: 'Окно для записи обновлено', tone: 'success' });
      },
      removeTutoringSlot: async (slotId) => {
        await api.schedule.deleteAvailability(slotId);
        set((state) => ({ tutoringSlots: state.tutoringSlots.filter((slot) => slot.id !== slotId) }));
        get().addToast({ title: 'Окно для записи удалено', tone: 'info' });
      },
      bookTutoringSlot: async (slotId) => {
        const slot = get().tutoringSlots.find((item) => item.id === slotId);
        if (!slot) throw new Error('Окно записи не найдено');
        const booking = await api.schedule.bookAvailability(slotId);
        if (booking.needsPayment) {
          const order = await api.payments.createBookingOrder(booking.bookingId);
          if (order.provider === 'mock') await api.payments.mockSucceed(order.paymentId);
          else if (order.confirmationUrl) window.location.assign(order.confirmationUrl);
        }
        await Promise.allSettled([get().loadSchedule(), get().loadPayments(), get().loadTutoringSlots(slot.instructorId)]);
        get().addToast({ title: 'Занятие забронировано', text: booking.needsPayment ? 'Оплата подтверждена, занятие добавлено в расписание.' : 'Занятие добавлено в расписание.', tone: 'success' });
      },
      submitAssignment: async (submission) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'student') return null;
        const result = await api.assignments.submit(submission.assignmentId, { answerText: submission.answer, fileAssetId: submission.fileAssetId });
        const record: AssignmentSubmission = {
          id: result.id, assignmentId: submission.assignmentId, courseId: submission.courseId, lessonId: submission.lessonId,
          studentId: currentUser.id, studentName: currentUser.name, answer: result.answerText ?? submission.answer, fileName: submission.fileName, fileAssetId: result.fileAssetId ?? submission.fileAssetId,
          status: result.status === 'ACCEPTED' ? 'approved' : result.status === 'REVISION_REQUIRED' ? 'revision' : 'pending',
          score: result.score ?? undefined, feedback: result.feedback ?? undefined, submittedAt: result.submittedAt, reviewedAt: result.reviewedAt ?? undefined
        };
        set((state) => ({ assignmentSubmissions: [record, ...state.assignmentSubmissions.filter((item) => item.id !== record.id)] }));
        return record;
      },
      gradeAssignment: async (submissionId, status, score, feedback) => {
        const existing = get().assignmentSubmissions.find((item) => item.id === submissionId);
        const result = await api.assignments.review(submissionId, {
          status: status === 'approved' ? 'ACCEPTED' : 'REVISION_REQUIRED',
          score: status === 'approved' ? Math.max(0, Number(score ?? existing?.score ?? 0)) : 0,
          feedback: feedback ?? ''
        });
        set((state) => ({ assignmentSubmissions: state.assignmentSubmissions.map((item) => item.id === submissionId ? { ...item, status: result.status === 'ACCEPTED' ? 'approved' : 'revision', score: result.score ?? undefined, feedback: result.feedback ?? undefined, reviewedAt: result.reviewedAt ?? new Date().toISOString() } : item) }));
        get().addToast({ title: status === 'approved' ? 'Задание принято' : 'Задание возвращено на доработку', text: feedback, tone: status === 'approved' ? 'success' : 'warning' });
      },
      addDictionaryEntry: async (entry) => {
        const existing = get().dictionary.find((item) => item.word.toLowerCase() === entry.word.toLowerCase());
        if (existing) { get().addToast({ title: 'Слово уже в словаре', text: existing.word, tone: 'info' }); return; }
        const created = await api.dictionary.add({ sourceText: entry.word, translation: entry.translation, contextSentence: entry.context || undefined, courseId: entry.courseId, lessonKeyId: entry.lessonId });
        const record = dictionaryFromBackend(created);
        set((state) => ({ dictionary: [record, ...state.dictionary.filter((item) => item.id !== record.id)] }));
        get().addToast({ title: 'Добавлено в словарь', text: `${entry.word} — ${entry.translation}`, tone: 'success' });
      },
      removeDictionaryEntry: async (id) => {
        await api.dictionary.remove(id);
        set((state) => ({ dictionary: state.dictionary.filter((item) => item.id !== id) }));
      },
      rateReview: async (id, quality) => {
        const next = await api.dictionary.review(id, quality);
        set((state) => ({ dictionary: state.dictionary.map((entry) => entry.id === id ? { ...entry, repetitions: next.repetitions, interval: next.intervalDays, easeFactor: next.easeFactor, nextReviewAt: next.nextReviewAt, status: next.repetitions >= 5 ? 'review' : 'learning' } : entry) }));
      },
      markNotificationRead: async (id) => {
        await api.notifications.read(id);
        set((state) => ({ notifications: state.notifications.map((item) => item.id === id ? { ...item, read: true } : item) }));
      },
      markAllNotificationsRead: async () => {
        await api.notifications.readAll();
        set((state) => ({ notifications: state.notifications.map((item) => ({ ...item, read: true })) }));
      },
      addToast: (toast) => {
        const id = newId('toast');
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        window.setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
      resetDemo: () => set({
        user: null,
        authStatus: 'guest',
        authError: null,
        pendingVerification: null,
        courses: [],
        managedCourses: [],
        managedCoursesStatus: 'idle',
        learningStatus: 'idle',
        enrollments: [],
        dictionary: [],
        sessions: [],
        tutoringSlots: [],
        assignmentSubmissions: [],
        payments: [],
        notifications: [],
        toasts: [],
        sidebarOpen: false,
        sidebarCollapsed: false
      })
    }),
    {
      name: 'lingua-lms-v12',
      partialize: (state) => ({
        // Backend-backed entities are deliberately not persisted locally. After a
        // refresh they are reloaded for the authenticated session, preventing one
        // account's dictionary/payments/schedule from leaking into another account.
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
);

