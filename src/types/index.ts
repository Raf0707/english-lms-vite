export type Role = 'guest' | 'student' | 'teacher' | 'admin';
export type CourseStatus = 'draft' | 'moderation' | 'revision' | 'published' | 'archived';
export type GradingMode = 'auto' | 'manual';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Exclude<Role, 'guest'>;
  avatar?: string;
  level?: string;
  timezone: string;
}

export interface TableBlockData {
  headers: string[];
  rows: string[][];
}

export interface AssignmentData {
  id: string;
  title: string;
  instructions: string;
  gradingMode: GradingMode;
  maxScore: number;
  autoAnswer?: string;
  acceptedFileTypes?: string[];
  allowTextAnswer: boolean;
  allowFileUpload: boolean;
}

export interface TextBlockStyle {
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  listStyle?: 'none' | 'bullet' | 'numbered';
}

export interface LessonBlock {
  id: string;
  type: 'heading' | 'text' | 'quote' | 'image' | 'video' | 'audio' | 'file' | 'test' | 'callout' | 'table' | 'assignment' | 'conference';
  title?: string;
  content?: string;
  url?: string;
  fileName?: string;
  table?: TableBlockData;
  assignment?: AssignmentData;
  conferenceSessionId?: string;
  textStyle?: TextBlockStyle;
}

export interface Question {
  id: string;
  type: 'single' | 'multiple' | 'text' | 'matching' | 'essay';
  prompt: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  gradingMode?: GradingMode;
  points?: number;
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
  type: 'video' | 'text' | 'test' | 'practice' | 'conference' | 'assignment';
  isPreview?: boolean;
  blocks: LessonBlock[];
  test?: Test;
  releaseAt?: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface CourseScheduleItem {
  id: string;
  type: 'lesson' | 'conference';
  title: string;
  startAt: string;
  duration: number;
  lessonId?: string;
  sessionId?: string;
  required?: boolean;
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
  instructorId?: string;
  ownerId?: string;
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
  status?: CourseStatus;
  moderationComment?: string;
  schedule?: CourseScheduleItem[];
  createdAt?: string;
  updatedAt?: string;
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


export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  courseId: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  answer?: string;
  fileName?: string;
  status: 'pending' | 'approved' | 'revision';
  score?: number;
  feedback?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface Session {
  id: string;
  title: string;
  type: 'individual' | 'group' | 'webinar';
  courseId?: string;
  instructor: string;
  instructorId?: string;
  startAt: string;
  duration: number;
  attendees: number;
  maxAttendees: number;
  price?: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  source?: 'course' | 'tutoring';
}

export interface TutoringSlot {
  id: string;
  instructorId: string;
  type: 'individual' | 'group';
  startAt: string;
  duration: number;
  price: number;
  maxAttendees: number;
  attendees: number;
  booked?: boolean;
}

export interface InstructorProfile {
  id: string;
  name: string;
  avatar: string;
  headline: string;
  bio: string;
  level: string;
  rating: number;
  reviews: number;
  specialties: string[];
  individualPrice: number;
  groupPrice: number;
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
