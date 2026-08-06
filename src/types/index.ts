export type Role = 'guest' | 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Exclude<Role, 'guest'>;
  avatar?: string;
  level?: string;
  timezone: string;
}

export interface LessonBlock {
  id: string;
  type: 'heading' | 'text' | 'quote' | 'image' | 'video' | 'audio' | 'file' | 'test' | 'callout';
  title?: string;
  content?: string;
  url?: string;
}

export interface Question {
  id: string;
  type: 'single' | 'multiple' | 'text' | 'matching';
  prompt: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
}

export interface Test {
  id: string;
  title: string;
  passScore: number;
  questions: Question[];
}

export interface Lesson {
  id: string;
  title: string;
  duration: number;
  type: 'video' | 'text' | 'test' | 'practice';
  isPreview?: boolean;
  blocks: LessonBlock[];
  test?: Test;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  cover: string;
  level: string;
  category: string;
  instructor: string;
  instructorAvatar: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  duration: string;
  students: number;
  accent: string;
  tags: string[];
  outcomes: string[];
  modules: Module[];
}

export interface Enrollment {
  courseId: string;
  progress: number;
  completedLessonIds: string[];
  lastLessonId: string;
  startedAt: string;
  expiresAt?: string;
}

export interface DictionaryEntry {
  id: string;
  word: string;
  translation: string;
  context: string;
  courseId?: string;
  lessonId?: string;
  status: 'new' | 'learning' | 'review' | 'mastered' | 'paused';
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReviewAt: string;
  createdAt: string;
}

export interface Session {
  id: string;
  title: string;
  type: 'individual' | 'group' | 'webinar';
  courseId?: string;
  instructor: string;
  startAt: string;
  duration: number;
  attendees: number;
  maxAttendees: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
}

export interface Payment {
  id: string;
  number: string;
  title: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'refunded' | 'failed';
  receiptUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  text: string;
  date: string;
  read: boolean;
  type: 'lesson' | 'payment' | 'session' | 'system';
}
