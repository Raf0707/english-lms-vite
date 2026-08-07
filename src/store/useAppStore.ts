import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  courses as seedCourses,
  initialDictionary,
  instructors,
  notifications,
  payments,
  sessions as seedSessions,
  tutoringSlots as seedTutoringSlots
} from '../data/mock';
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
import { calculateSm2 } from '../utils/sm2';
import { api, ApiError, type VerificationCodes } from '../services/api';
import { backendUserToAppUser, splitPersonName } from '../services/auth';

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
  purchaseCourse: (courseId: string) => void;
  completeLesson: (courseId: string, lessonId: string) => void;
  upsertCourse: (course: Course) => Course;
  setCourseStatus: (courseId: string, status: CourseStatus, comment?: string) => void;
  submitCourseForModeration: (courseId: string) => void;
  approveCourse: (courseId: string) => void;
  requestCourseRevision: (courseId: string, comment: string) => void;
  requestCourseDeletion: (courseId: string) => void;
  rejectCourseDeletion: (courseId: string) => void;
  deleteCourse: (courseId: string) => void;
  addSession: (session: Omit<Session, 'id'>) => Session;
  updateSession: (sessionId: string, data: Partial<Omit<Session, 'id'>>) => void;
  removeSession: (sessionId: string) => void;
  addTutoringSlot: (slot: Omit<TutoringSlot, 'id' | 'attendees' | 'booked'>) => TutoringSlot;
  updateTutoringSlot: (slotId: string, data: Partial<Omit<TutoringSlot, 'id' | 'instructorId'>>) => void;
  removeTutoringSlot: (slotId: string) => void;
  bookTutoringSlot: (slotId: string) => void;
  submitAssignment: (submission: Omit<AssignmentSubmission, 'id' | 'studentId' | 'studentName' | 'submittedAt'>) => AssignmentSubmission | null;
  gradeAssignment: (submissionId: string, status: 'approved' | 'revision', score?: number, feedback?: string) => void;
  addDictionaryEntry: (entry: Omit<DictionaryEntry, 'id' | 'createdAt' | 'repetitions' | 'interval' | 'easeFactor' | 'nextReviewAt' | 'status'>) => void;
  removeDictionaryEntry: (id: string) => void;
  rateReview: (id: string, quality: number) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  resetDemo: () => void;
}

const baseEnrollments: Enrollment[] = [
  {
    courseId: 'everyday-a1',
    progress: 28,
    completedLessonIds: ['l1', 'l2'],
    lastLessonId: 'l3',
    startedAt: '2026-07-28T12:22:00.000Z',
    expiresAt: '2027-01-28T12:22:00.000Z'
  }
];

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const seededCourses: Course[] = seedCourses.map((course, index) => ({
  ...course,
  status: course.status ?? (index === seedCourses.length - 1 ? 'moderation' : 'published'),
  createdAt: course.createdAt ?? '2026-07-01T09:00:00.000Z',
  updatedAt: course.updatedAt ?? '2026-08-01T09:00:00.000Z',
  ownerId: course.ownerId ?? (course.instructor === 'Наталья Орлова' ? 'u-teacher' : course.instructorId),
  schedule: course.schedule ?? []
}));

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
  return error instanceof ApiError ? error.message : 'Не удалось выполнить запрос к серверу';
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      authStatus: 'idle',
      authError: null,
      pendingVerification: null,
      courses: seededCourses,
      enrollments: baseEnrollments,
      dictionary: initialDictionary,
      sessions: seedSessions,
      tutoringSlots: seedTutoringSlots,
      assignmentSubmissions: [],
      payments,
      notifications,
      toasts: [],
      sidebarOpen: false,
      sidebarCollapsed: false,
      bootstrapAuth: async () => {
        if (get().authStatus === 'loading') return;
        set({ authStatus: 'loading', authError: null });
        try {
          const backendUser = await api.profile.me();
          set({ user: backendUserToAppUser(backendUser), authStatus: 'authenticated', authError: null });
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
          set({ user, authStatus: 'authenticated', authError: null, sidebarOpen: false });
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
            sidebarOpen: false
          });
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
        set({ user: null, authStatus: 'guest', pendingVerification: null });
      },
      logout: async () => {
        try {
          await api.auth.logout();
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 401)) throw error;
        } finally {
          set({ user: null, authStatus: 'guest', authError: null, pendingVerification: null, sidebarOpen: false });
        }
      },
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      purchaseCourse: (courseId) => {
        if (get().enrollments.some((item) => item.courseId === courseId)) {
          get().addToast({ title: 'Курс уже доступен', tone: 'info' });
          return;
        }
        const course = get().courses.find((item) => item.id === courseId);
        if (!course) return;
        const firstLesson = course.modules[0]?.lessons[0]?.id ?? '';
        const enrollment: Enrollment = {
          courseId,
          progress: 0,
          completedLessonIds: [],
          lastLessonId: firstLesson,
          startedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString()
        };
        const payment: Payment = {
          id: newId('payment'),
          number: `LNG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`,
          title: course.title,
          amount: course.price,
          date: new Date().toISOString(),
          status: 'paid',
          receiptUrl: '#'
        };
        set((state) => ({
          enrollments: [enrollment, ...state.enrollments],
          payments: [payment, ...state.payments]
        }));
        get().addToast({ title: 'Оплата прошла успешно', text: 'Доступ к курсу открыт.', tone: 'success' });
      },
      completeLesson: (courseId, lessonId) => {
        const course = get().courses.find((item) => item.id === courseId);
        if (!course) return;
        const allLessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
        if (!allLessonIds.includes(lessonId)) return;
        const targetEnrollment = get().enrollments.find((item) => item.courseId === courseId);
        if (!targetEnrollment) {
          get().addToast({ title: 'Не удалось обновить прогресс', text: 'Зачисление на курс не найдено.', tone: 'warning' });
          return;
        }
        if ((targetEnrollment.completedLessonIds ?? []).includes(lessonId)) return;
        set((state) => ({
          enrollments: state.enrollments.map((enrollment) => {
            if (enrollment.courseId !== courseId) return enrollment;
            const completed = Array.from(new Set([...(enrollment.completedLessonIds ?? []), lessonId]))
              .filter((id) => allLessonIds.includes(id));
            const currentIndex = allLessonIds.indexOf(lessonId);
            const nextLesson = allLessonIds[currentIndex + 1] ?? lessonId;
            return {
              ...enrollment,
              completedLessonIds: completed,
              progress: allLessonIds.length ? Math.min(100, Math.round((completed.length / allLessonIds.length) * 100)) : 0,
              lastLessonId: nextLesson
            };
          })
        }));
        get().addToast({ title: 'Урок завершён', text: 'Прогресс курса обновлён. Можно перейти к следующему уроку.', tone: 'success' });
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
      addSession: (session) => {
        const record: Session = { ...session, id: newId('session') };
        set((state) => ({ sessions: [record, ...state.sessions] }));
        get().addToast({ title: 'Занятие добавлено', text: `${record.title} — ${new Date(record.startAt).toLocaleString('ru-RU')}`, tone: 'success' });
        return record;
      },
      updateSession: (sessionId, data) => {
        set((state) => ({ sessions: state.sessions.map((session) => session.id === sessionId ? { ...session, ...data } : session) }));
        get().addToast({ title: 'Занятие обновлено', text: 'Изменения в расписании сохранены.', tone: 'success' });
      },
      removeSession: (sessionId) => {
        set((state) => ({ sessions: state.sessions.filter((session) => session.id !== sessionId) }));
        get().addToast({ title: 'Занятие удалено', tone: 'info' });
      },
      addTutoringSlot: (slot) => {
        const record: TutoringSlot = { ...slot, id: newId('slot'), attendees: 0, booked: false };
        set((state) => ({ tutoringSlots: [record, ...state.tutoringSlots] }));
        get().addToast({ title: 'Окно для записи опубликовано', text: `${new Date(record.startAt).toLocaleString('ru-RU')} · ${record.type === 'individual' ? 'индивидуально' : 'группа'}`, tone: 'success' });
        return record;
      },
      updateTutoringSlot: (slotId, data) => {
        set((state) => ({ tutoringSlots: state.tutoringSlots.map((slot) => slot.id === slotId ? { ...slot, ...data } : slot) }));
        get().addToast({ title: 'Окно для записи обновлено', tone: 'success' });
      },
      removeTutoringSlot: (slotId) => {
        set((state) => ({ tutoringSlots: state.tutoringSlots.filter((slot) => slot.id !== slotId) }));
        get().addToast({ title: 'Окно для записи удалено', tone: 'info' });
      },
      bookTutoringSlot: (slotId) => {
        const slot = get().tutoringSlots.find((item) => item.id === slotId);
        if (!slot || slot.booked || slot.attendees >= slot.maxAttendees) return;
        const instructor = instructors.find((item) => item.id === slot.instructorId);
        if (!instructor) return;
        const session: Session = {
          id: newId('session'),
          title: slot.type === 'individual' ? `Индивидуальное занятие с ${instructor.name}` : `Групповое занятие с ${instructor.name}`,
          type: slot.type,
          instructor: instructor.name,
          instructorId: instructor.id,
          startAt: slot.startAt,
          duration: slot.duration,
          attendees: slot.attendees + 1,
          maxAttendees: slot.maxAttendees,
          price: slot.price,
          status: 'scheduled',
          source: 'tutoring'
        };
        const payment: Payment = {
          id: newId('payment'),
          number: `LESSON-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`,
          title: session.title,
          amount: slot.price,
          date: new Date().toISOString(),
          status: 'paid',
          receiptUrl: '#'
        };
        set((state) => ({
          tutoringSlots: state.tutoringSlots.map((item) => item.id === slotId ? {
            ...item,
            attendees: item.attendees + 1,
            booked: true
          } : item),
          sessions: [session, ...state.sessions],
          payments: [payment, ...state.payments]
        }));
        get().addToast({ title: 'Занятие забронировано', text: 'Оно появилось в расписании. Оплата сохранена в истории.', tone: 'success' });
      },
      submitAssignment: (submission) => {
        const currentUser = get().user;
        if (!currentUser || currentUser.role !== 'student') return null;
        const record: AssignmentSubmission = {
          ...submission,
          id: newId('submission'),
          studentId: currentUser.id,
          studentName: currentUser.name,
          submittedAt: new Date().toISOString()
        };
        set((state) => ({
          assignmentSubmissions: [record, ...state.assignmentSubmissions.filter((item) => !(item.assignmentId === record.assignmentId && item.studentId === currentUser.id && item.status === 'pending'))]
        }));
        return record;
      },
      gradeAssignment: (submissionId, status, score, feedback) => {
        set((state) => ({ assignmentSubmissions: state.assignmentSubmissions.map((item) => item.id === submissionId ? { ...item, status, score, feedback, reviewedAt: new Date().toISOString() } : item) }));
        get().addToast({ title: status === 'approved' ? 'Задание принято' : 'Задание возвращено на доработку', text: feedback, tone: status === 'approved' ? 'success' : 'warning' });
      },
      addDictionaryEntry: (entry) => {
        const existing = get().dictionary.find((item) => item.word.toLowerCase() === entry.word.toLowerCase());
        if (existing) {
          get().addToast({ title: 'Слово уже в словаре', text: existing.word, tone: 'info' });
          return;
        }
        const record: DictionaryEntry = {
          ...entry,
          id: newId('word'),
          createdAt: new Date().toISOString(),
          repetitions: 0,
          interval: 0,
          easeFactor: 2.5,
          nextReviewAt: new Date().toISOString(),
          status: 'new'
        };
        set((state) => ({ dictionary: [record, ...state.dictionary] }));
        get().addToast({ title: 'Добавлено в словарь', text: `${entry.word} — ${entry.translation}`, tone: 'success' });
      },
      removeDictionaryEntry: (id) => set((state) => ({ dictionary: state.dictionary.filter((item) => item.id !== id) })),
      rateReview: (id, quality) => {
        set((state) => ({
          dictionary: state.dictionary.map((entry) => entry.id === id ? { ...entry, ...calculateSm2(entry, quality) } : entry)
        }));
      },
      markNotificationRead: (id) => set((state) => ({ notifications: state.notifications.map((item) => item.id === id ? { ...item, read: true } : item) })),
      markAllNotificationsRead: () => set((state) => ({ notifications: state.notifications.map((item) => ({ ...item, read: true })) })),
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
        courses: seededCourses,
        enrollments: baseEnrollments,
        dictionary: initialDictionary,
        sessions: seedSessions,
        tutoringSlots: seedTutoringSlots,
        assignmentSubmissions: [],
        payments,
        notifications,
        toasts: [],
        sidebarOpen: false,
        sidebarCollapsed: false
      })
    }),
    {
      name: 'lingua-lms-v8',
      partialize: (state) => ({
        courses: state.courses,
        enrollments: state.enrollments,
        dictionary: state.dictionary,
        sessions: state.sessions,
        tutoringSlots: state.tutoringSlots,
        assignmentSubmissions: state.assignmentSubmissions,
        payments: state.payments,
        notifications: state.notifications,
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
);

