import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { courses, demoUsers, initialDictionary, notifications, payments, sessions } from '../data/mock';
import type { DictionaryEntry, Enrollment, Notification, Payment, Role, Session, User } from '../types';
import { calculateSm2 } from '../utils/sm2';

interface Toast {
  id: string;
  title: string;
  text?: string;
  tone?: 'success' | 'warning' | 'info';
}

interface AppState {
  user: User | null;
  enrollments: Enrollment[];
  dictionary: DictionaryEntry[];
  sessions: Session[];
  payments: Payment[];
  notifications: Notification[];
  toasts: Toast[];
  sidebarOpen: boolean;
  loginAs: (role: Exclude<Role, 'guest'>) => void;
  login: (email: string) => void;
  register: (name: string, email: string) => void;
  logout: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  purchaseCourse: (courseId: string) => void;
  completeLesson: (courseId: string, lessonId: string) => void;
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      enrollments: baseEnrollments,
      dictionary: initialDictionary,
      sessions,
      payments,
      notifications,
      toasts: [],
      sidebarOpen: false,
      loginAs: (role) => {
        set({ user: demoUsers[role], sidebarOpen: false });
        get().addToast({ title: 'Вы вошли в демо-режим', text: `Роль: ${role}`, tone: 'success' });
      },
      login: (email) => {
        const role: Exclude<Role, 'guest'> = email.toLowerCase().includes('admin')
          ? 'admin'
          : email.toLowerCase().includes('teacher')
            ? 'teacher'
            : 'student';
        set({ user: { ...demoUsers[role], email } });
        get().addToast({ title: 'Добро пожаловать!', text: 'Вход выполнен успешно.', tone: 'success' });
      },
      register: (name, email) => {
        set({
          user: {
            ...demoUsers.student,
            id: newId('user'),
            name,
            email,
            avatar: name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          }
        });
        get().addToast({ title: 'Аккаунт создан', text: 'Письмо подтверждения отправлено на email.', tone: 'success' });
      },
      logout: () => set({ user: null, sidebarOpen: false }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
      purchaseCourse: (courseId) => {
        if (get().enrollments.some((item) => item.courseId === courseId)) {
          get().addToast({ title: 'Курс уже доступен', tone: 'info' });
          return;
        }
        const course = courses.find((item) => item.id === courseId);
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
        const course = courses.find((item) => item.id === courseId);
        if (!course) return;
        const allLessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
        set((state) => ({
          enrollments: state.enrollments.map((enrollment) => {
            if (enrollment.courseId !== courseId) return enrollment;
            const completed = Array.from(new Set([...enrollment.completedLessonIds, lessonId]));
            const currentIndex = allLessonIds.indexOf(lessonId);
            const nextLesson = allLessonIds[currentIndex + 1] ?? lessonId;
            return {
              ...enrollment,
              completedLessonIds: completed,
              progress: Math.round((completed.length / allLessonIds.length) * 100),
              lastLessonId: nextLesson
            };
          })
        }));
        get().addToast({ title: 'Урок завершён', text: 'Прогресс курса обновлён.', tone: 'success' });
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
          dictionary: state.dictionary.map((entry) =>
            entry.id === id ? { ...entry, ...calculateSm2(entry, quality) } : entry
          )
        }));
      },
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) => (item.id === id ? { ...item, read: true } : item))
        })),
      markAllNotificationsRead: () =>
        set((state) => ({ notifications: state.notifications.map((item) => ({ ...item, read: true })) })),
      addToast: (toast) => {
        const id = newId('toast');
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        window.setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
      resetDemo: () =>
        set({
          user: null,
          enrollments: baseEnrollments,
          dictionary: initialDictionary,
          sessions,
          payments,
          notifications,
          toasts: [],
          sidebarOpen: false
        })
    }),
    {
      name: 'lingua-lms-demo-v1',
      partialize: (state) => ({
        user: state.user,
        enrollments: state.enrollments,
        dictionary: state.dictionary,
        sessions: state.sessions,
        payments: state.payments,
        notifications: state.notifications
      })
    }
  )
);
