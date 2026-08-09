import { apiRequest, type BackendLearningCourse } from './api';
import type { Course, CourseScheduleItem, CourseStatus, Lesson, LessonBlock, Module, Question, Test } from '../types';

export type BackendCourseVersionStatus = 'DRAFT' | 'MODERATION' | 'CHANGES_REQUESTED' | 'PUBLISHED' | 'SUPERSEDED';

type BackendVersionSummary = {
  id: string;
  versionNumber: number;
  status: BackendCourseVersionStatus;
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
  durationLabel: string;
  moderationComment?: string | null;
  accessMode?: 'PUBLIC_SALE' | 'PUBLIC_FREE' | 'MANAGED';
  managedKind?: 'INDIVIDUAL' | 'GROUP' | null;
  completionDueAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export interface BackendManagedCourse {
  id: string;
  slug: string;
  ownerId: string;
  lifecycleStatus: 'ACTIVE' | 'ARCHIVED' | 'DELETION_REQUESTED';
  createdAt: string;
  updatedAt: string;
  students: number;
  moduleCount?: number;
  lessonCount?: number;
  deletionRequest?: { id: string; reason?: string | null; createdAt?: string } | null;
  instructor: { id: string; name: string; avatarAssetId?: string | null };
  workingVersion?: BackendVersionSummary | null;
  publishedVersion?: BackendVersionSummary | null;
  displayVersion?: BackendVersionSummary | null;
}

type BackendModule = { moduleKeyId: string; title: string; description: string; sortKey: string | number };
type BackendLesson = {
  lessonKeyId: string; moduleKeyId: string; title: string; durationMinutes: number; lessonType: string;
  isPreview: boolean; releaseAt?: string | null; completionRule?: unknown; sortKey: string | number;
};
type BackendBlock = {
  blockKeyId: string; lessonKeyId: string; type: string; title?: string | null; content?: string | null;
  assetId?: string | null; data?: Record<string, unknown> | null; sortKey: string | number;
};
type BackendQuestion = {
  id: string; questionKeyId: string; type: string; prompt: string; options?: unknown; correctAnswer?: unknown;
  explanation?: string | null; gradingMode: string; points: number; sortKey: string | number;
};
type BackendTest = {
  id: string; testKeyId: string; lessonKeyId: string; title: string; passScore: number;
  timeLimitSeconds?: number | null; attemptsLimit?: number | null; settings?: unknown; questions: BackendQuestion[];
};
type BackendAssignment = {
  id: string; assignmentKeyId: string; lessonKeyId: string; title: string; instructions: string; gradingMode: string;
  maxScore: number; autoAnswer?: string | null; acceptedFileTypes?: unknown; allowTextAnswer: boolean; allowFileUpload: boolean; dueAt?: string | null;
};
type BackendScheduleItem = {
  scheduleKeyId: string; type: string; title: string; startAt: string; durationMinutes: number;
  lessonKeyId?: string | null; required: boolean; metadata?: Record<string, unknown> | null;
};

export interface BackendCourseEditor extends BackendVersionSummary {
  course: {
    id: string; slug: string; ownerId: string; lifecycleStatus: string; createdAt: string; updatedAt: string;
    owner?: { id: string; email?: string; profile?: { firstName?: string; lastName?: string; displayName?: string | null } | null } | null;
    instructors?: Array<{ user?: { id: string; email?: string; profile?: { firstName?: string; lastName?: string; displayName?: string | null } | null } | null }>;
  };
  modules: BackendModule[];
  lessons: BackendLesson[];
  blocks: BackendBlock[];
  tests: BackendTest[];
  assignments: BackendAssignment[];
  scheduleItems: BackendScheduleItem[];
  moderation?: Array<{ id: string; decision: string; comment?: string | null; createdAt: string }>;
}

const defaultCover = '/course-1.svg';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string | null) => Boolean(value && uuidPattern.test(value));
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
const accessModeFromBackend = (value?: string | null): Course['accessMode'] =>
  value === 'PUBLIC_FREE' ? 'public-free' : value === 'MANAGED' ? 'managed' : 'public-sale';
const accessModeToBackend = (value?: Course['accessMode']) =>
  value === 'public-free' ? 'PUBLIC_FREE' : value === 'managed' ? 'MANAGED' : 'PUBLIC_SALE';

function statusFromBackend(status?: BackendCourseVersionStatus | null, lifecycle?: string): CourseStatus {
  if (lifecycle === 'ARCHIVED') return 'archived';
  if (status === 'MODERATION') return 'moderation';
  if (status === 'CHANGES_REQUESTED') return 'revision';
  if (status === 'PUBLISHED') return 'published';
  return 'draft';
}

export function managedSummaryToCourse(item: BackendManagedCourse): Course {
  const version = item.displayVersion ?? item.workingVersion ?? item.publishedVersion;
  return {
    id: item.id,
    slug: item.slug,
    title: version?.title ?? 'Без названия',
    shortDescription: version?.shortDescription ?? '',
    description: version?.description ?? '',
    cover: defaultCover,
    coverAssetId: version?.coverAssetId ?? undefined,
    level: version?.level ?? '',
    category: version?.category ?? '',
    instructor: item.instructor?.name || 'Преподаватель',
    instructorAvatar: 'PR',
    instructorId: item.instructor?.id,
    ownerId: item.ownerId,
    price: Math.round((version?.priceMinor ?? 0) / 100),
    oldPrice: version?.oldPriceMinor == null ? undefined : Math.round(version.oldPriceMinor / 100),
    rating: 0,
    reviews: 0,
    duration: version?.durationLabel ?? '',
    students: item.students ?? 0,
    accent: '#1f5a48',
    tags: strings(version?.tags),
    outcomes: strings(version?.outcomes),
    modules: [],
    schedule: [],
    status: statusFromBackend(version?.status, item.lifecycleStatus),
    moderationComment: version?.moderationComment ?? undefined,
    deletionStatus: item.deletionRequest ? 'requested' : undefined,
    deletionRequestedAt: item.deletionRequest?.createdAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    source: 'backend',
    backendVersionNumber: version?.versionNumber,
    backendPublishedVersionNumber: item.publishedVersion?.versionNumber,
    hasPublishedVersion: Boolean(item.publishedVersion),
    moduleCount: item.moduleCount ?? 0,
    lessonCount: item.lessonCount ?? 0,
    accessMode: accessModeFromBackend(version?.accessMode),
    managedKind: version?.managedKind === 'GROUP' ? 'group' : version?.managedKind === 'INDIVIDUAL' ? 'individual' : undefined,
    completionDueAt: version?.completionDueAt ?? undefined
  };
}

function mapQuestion(question: BackendQuestion): Question {
  const rawAnswer = question.correctAnswer;
  const correctAnswer = Array.isArray(rawAnswer)
    ? rawAnswer.map(String)
    : rawAnswer == null ? '' : String(rawAnswer);
  return {
    id: question.questionKeyId,
    type: question.type.toLowerCase() as Question['type'],
    prompt: question.prompt,
    options: Array.isArray(question.options) ? question.options.map(String) : undefined,
    correctAnswer,
    explanation: question.explanation ?? undefined,
    gradingMode: question.gradingMode === 'MANUAL' ? 'manual' : 'auto',
    points: question.points
  };
}

function mapTest(test: BackendTest): Test {
  return {
    id: test.testKeyId,
    title: test.title,
    passScore: test.passScore,
    questions: [...test.questions].sort((a, b) => Number(a.sortKey) - Number(b.sortKey)).map(mapQuestion)
  };
}

function mapBlock(block: BackendBlock, assignment?: BackendAssignment): LessonBlock {
  const data = block.data ?? {};
  const mapped: LessonBlock = {
    id: block.blockKeyId,
    type: block.type.toLowerCase() as LessonBlock['type'],
    title: block.title ?? undefined,
    content: block.content ?? undefined,
    url: typeof data.url === 'string' ? data.url : undefined,
    assetId: block.assetId ?? undefined,
    fileName: typeof data.fileName === 'string' ? data.fileName : undefined,
    table: data.table && typeof data.table === 'object' ? data.table as LessonBlock['table'] : undefined,
    textStyle: data.textStyle && typeof data.textStyle === 'object' ? data.textStyle as LessonBlock['textStyle'] : undefined,
    richTextHtml: typeof data.richTextHtml === 'string' ? data.richTextHtml : undefined,
    conferenceSessionId: typeof data.conferenceSessionId === 'string' ? data.conferenceSessionId : undefined
  };
  if (assignment) {
    mapped.assignment = {
      id: assignment.assignmentKeyId,
      title: assignment.title,
      instructions: assignment.instructions,
      gradingMode: assignment.gradingMode === 'AUTO' ? 'auto' : 'manual',
      maxScore: assignment.maxScore,
      autoAnswer: assignment.autoAnswer ?? undefined,
      acceptedFileTypes: strings(assignment.acceptedFileTypes),
      allowTextAnswer: assignment.allowTextAnswer,
      allowFileUpload: assignment.allowFileUpload,
      dueAt: assignment.dueAt ?? undefined
    };
  }
  return mapped;
}

export function editorToCourse(editor: BackendCourseEditor, instructor?: { id?: string; name?: string; avatar?: string }): Course {
  const backendInstructor = editor.course.instructors?.[0]?.user ?? editor.course.owner ?? undefined;
  const backendProfile = backendInstructor?.profile;
  const backendInstructorName = backendProfile?.displayName || [backendProfile?.firstName, backendProfile?.lastName].filter(Boolean).join(' ') || backendInstructor?.email || '';
  const assignmentsByLesson = new Map<string, BackendAssignment[]>();
  for (const assignment of editor.assignments ?? []) {
    const items = assignmentsByLesson.get(assignment.lessonKeyId) ?? [];
    items.push(assignment);
    assignmentsByLesson.set(assignment.lessonKeyId, items);
  }
  const testsByLesson = new Map((editor.tests ?? []).map((test) => [test.lessonKeyId, test]));
  const modules: Module[] = [...editor.modules].sort((a, b) => Number(a.sortKey) - Number(b.sortKey)).map((module) => ({
    id: module.moduleKeyId,
    title: module.title,
    description: module.description,
    lessons: [...editor.lessons]
      .filter((lesson) => lesson.moduleKeyId === module.moduleKeyId)
      .sort((a, b) => Number(a.sortKey) - Number(b.sortKey))
      .map((lesson): Lesson => {
        const lessonAssignments = [...(assignmentsByLesson.get(lesson.lessonKeyId) ?? [])];
        return {
          id: lesson.lessonKeyId,
          title: lesson.title,
          duration: lesson.durationMinutes,
          type: (lesson.lessonType === 'MIXED' ? 'text' : lesson.lessonType.toLowerCase()) as Lesson['type'],
          isPreview: lesson.isPreview,
          releaseAt: lesson.releaseAt ?? undefined,
          blocks: [...editor.blocks]
            .filter((block) => block.lessonKeyId === lesson.lessonKeyId)
            .sort((a, b) => Number(a.sortKey) - Number(b.sortKey))
            .map((block) => mapBlock(block, block.type === 'ASSIGNMENT' ? lessonAssignments.shift() : undefined)),
          test: testsByLesson.has(lesson.lessonKeyId) ? mapTest(testsByLesson.get(lesson.lessonKeyId)!) : undefined
        };
      })
  }));

  const schedule: CourseScheduleItem[] = (editor.scheduleItems ?? []).map((item) => ({
    id: item.scheduleKeyId,
    type: item.type === 'COURSE_LESSON' ? 'lesson' : 'conference',
    title: item.title,
    startAt: item.startAt,
    duration: item.durationMinutes,
    lessonId: item.lessonKeyId ?? undefined,
    sessionId: typeof item.metadata?.sessionId === 'string' ? item.metadata.sessionId : undefined,
    required: item.required
  }));

  return {
    id: editor.course.id,
    slug: editor.course.slug,
    title: editor.title,
    shortDescription: editor.shortDescription,
    description: editor.description,
    cover: defaultCover,
    coverAssetId: editor.coverAssetId ?? undefined,
    level: editor.level,
    category: editor.category,
    instructor: backendInstructorName || instructor?.name || 'Преподаватель',
    instructorAvatar: instructor?.avatar ?? 'PR',
    instructorId: backendInstructor?.id ?? instructor?.id ?? editor.course.ownerId,
    ownerId: editor.course.ownerId,
    price: Math.round(editor.priceMinor / 100),
    oldPrice: editor.oldPriceMinor == null ? undefined : Math.round(editor.oldPriceMinor / 100),
    rating: 0,
    reviews: 0,
    duration: editor.durationLabel,
    students: 0,
    accent: '#1f5a48',
    tags: strings(editor.tags),
    outcomes: strings(editor.outcomes),
    modules,
    schedule,
    status: statusFromBackend(editor.status, editor.course.lifecycleStatus),
    moderationComment: editor.moderationComment ?? undefined,
    createdAt: editor.course.createdAt,
    updatedAt: editor.course.updatedAt,
    source: 'backend',
    backendVersionNumber: editor.versionNumber,
    hasPublishedVersion: editor.status !== 'DRAFT' || editor.versionNumber > 1,
    moduleCount: modules.length,
    lessonCount: modules.reduce((sum, module) => sum + module.lessons.length, 0),
    accessMode: accessModeFromBackend(editor.accessMode),
    managedKind: editor.managedKind === 'GROUP' ? 'group' : editor.managedKind === 'INDIVIDUAL' ? 'individual' : undefined,
    completionDueAt: editor.completionDueAt ?? undefined
  };
}


export interface BackendPublicCourse {
  id: string;
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
  students?: number;
  instructor?: { id?: string; name?: string; avatarAssetId?: string | null; headline?: string };
  modules?: Array<{ id: string; title: string; description: string; lessons: Array<{ id: string; title: string; duration: number; type: string; isPreview?: boolean; releaseAt?: string | null; blocks: Array<{ id: string; type: string; title?: string | null; content?: string | null; assetId?: string | null; data?: Record<string, unknown> | null }> }> }>;
  schedule?: Array<{ scheduleKeyId?: string; type: string; title: string; startAt: string; durationMinutes: number; lessonKeyId?: string | null; required?: boolean; metadata?: Record<string, unknown> | null }>;
}

export function publicCourseToCourse(item: BackendPublicCourse): Course {
  const modules: Module[] = (item.modules ?? []).map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      duration: lesson.duration,
      type: (lesson.type === 'mixed' ? 'text' : lesson.type) as Lesson['type'],
      isPreview: lesson.isPreview,
      releaseAt: lesson.releaseAt ?? undefined,
      blocks: lesson.blocks.map((block) => mapBlock({
        blockKeyId: block.id, lessonKeyId: lesson.id, type: block.type.toUpperCase(), title: block.title,
        content: block.content, assetId: block.assetId, data: block.data, sortKey: 0
      }))
    }))
  }));
  return {
    id: item.id, slug: item.slug, title: item.title, shortDescription: item.shortDescription, description: item.description,
    cover: defaultCover, coverAssetId: item.coverAssetId ?? undefined, level: item.level, category: item.category, instructor: item.instructor?.name || 'Преподаватель',
    instructorAvatar: 'PR', instructorId: item.instructor?.id, ownerId: item.instructor?.id,
    price: Math.round(item.priceMinor / 100), oldPrice: item.oldPriceMinor == null ? undefined : Math.round(item.oldPriceMinor / 100),
    rating: 0, reviews: 0, duration: item.duration, students: item.students ?? 0, accent: '#1f5a48', tags: strings(item.tags), outcomes: strings(item.outcomes),
    modules, status: 'published', schedule: (item.schedule ?? []).map((event) => ({
      id: event.scheduleKeyId ?? `${event.type}-${event.startAt}`, type: event.type === 'COURSE_LESSON' ? 'lesson' : 'conference',
      title: event.title, startAt: event.startAt, duration: event.durationMinutes, lessonId: event.lessonKeyId ?? undefined, required: Boolean(event.required),
      sessionId: typeof event.metadata?.sessionId === 'string' ? event.metadata.sessionId : undefined
    })), source: 'backend', backendVersionNumber: item.versionNumber, backendPublishedVersionNumber: item.versionNumber, hasPublishedVersion: true,
    moduleCount: modules.length, lessonCount: modules.reduce((sum, module) => sum + module.lessons.length, 0),
    accessMode: accessModeFromBackend(item.accessMode),
    managedKind: item.managedKind === 'GROUP' ? 'group' : item.managedKind === 'INDIVIDUAL' ? 'individual' : undefined,
    completionDueAt: item.completionDueAt ?? undefined
  };
}


export function learningCourseToCourse(item: BackendLearningCourse): Course {
  const modules: Module[] = (item.modules ?? []).map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    lessons: module.lessons.map((lesson) => {
      const assignments = [...(lesson.assignments ?? [])];
      const primaryTest = lesson.tests?.[0];
      return {
        id: lesson.id,
        title: lesson.title,
        duration: lesson.duration,
        type: (lesson.type === 'mixed' ? 'text' : lesson.type) as Lesson['type'],
        isPreview: lesson.isPreview,
        releaseAt: lesson.releaseAt ?? undefined,
        test: primaryTest ? { id: primaryTest.testKeyId, backendVersionId: primaryTest.id, title: primaryTest.title, passScore: primaryTest.passScore, questions: [] } : undefined,
        blocks: lesson.blocks.map((block) => {
          const sourceAssignment = block.type.toLowerCase() === 'assignment' ? assignments.shift() : undefined;
          const assignment = sourceAssignment ? {
            id: sourceAssignment.id,
            assignmentKeyId: sourceAssignment.assignmentKeyId,
            lessonKeyId: lesson.id,
            title: sourceAssignment.title,
            instructions: sourceAssignment.instructions,
            gradingMode: sourceAssignment.gradingMode,
            maxScore: sourceAssignment.maxScore,
            dueAt: sourceAssignment.dueAt ?? undefined,
            acceptedFileTypes: sourceAssignment.acceptedFileTypes ?? [],
            allowTextAnswer: sourceAssignment.allowTextAnswer,
            allowFileUpload: sourceAssignment.allowFileUpload
          } : undefined;
          return mapBlock({
            blockKeyId: block.id,
            lessonKeyId: lesson.id,
            type: block.type.toUpperCase(),
            title: block.title,
            content: block.content,
            assetId: block.assetId,
            data: block.data,
            sortKey: 0
          }, assignment);
        })
      } satisfies Lesson;
    })
  }));

  return {
    id: item.courseId,
    slug: item.slug,
    title: item.title,
    shortDescription: item.shortDescription,
    description: item.description,
    cover: defaultCover,
    coverAssetId: item.coverAssetId ?? undefined,
    level: item.level,
    category: item.category,
    instructor: item.instructor?.name || 'Преподаватель',
    instructorAvatar: 'PR',
    instructorId: item.instructor?.id,
    ownerId: item.instructor?.id,
    price: Math.round(item.priceMinor / 100),
    oldPrice: item.oldPriceMinor == null ? undefined : Math.round(item.oldPriceMinor / 100),
    rating: 0,
    reviews: 0,
    duration: item.duration,
    students: 0,
    accent: '#1f5a48',
    tags: strings(item.tags),
    outcomes: strings(item.outcomes),
    modules,
    status: 'published',
    schedule: (item.schedule ?? []).map((event) => ({
      id: event.scheduleKeyId ?? `${event.type}-${event.startAt}`,
      type: event.type === 'COURSE_LESSON' ? 'lesson' : 'conference',
      title: event.title,
      startAt: event.startAt,
      duration: event.durationMinutes,
      lessonId: event.lessonKeyId ?? undefined,
      required: Boolean(event.required),
      sessionId: typeof event.metadata?.sessionId === 'string' ? event.metadata.sessionId : undefined
    })),
    source: 'backend',
    backendVersionNumber: item.versionNumber,
    backendPublishedVersionNumber: item.versionNumber,
    hasPublishedVersion: true,
    moduleCount: modules.length,
    lessonCount: modules.reduce((sum, module) => sum + module.lessons.length, 0),
    accessMode: accessModeFromBackend(item.accessMode),
    managedKind: item.managedKind === 'GROUP' ? 'group' : item.managedKind === 'INDIVIDUAL' ? 'individual' : undefined,
    completionDueAt: item.completionDueAt ?? undefined
  };
}

function blockPayload(block: LessonBlock, lessonKeyId: string) {
  return {
    lessonKeyId,
    type: block.type.toUpperCase(),
    title: block.title || undefined,
    content: block.content ?? undefined,
    assetId: block.assetId ?? undefined,
    data: {
      ...(!block.assetId && block.url ? { url: block.url } : {}),
      ...(block.fileName ? { fileName: block.fileName } : {}),
      ...(block.table ? { table: block.table } : {}),
      ...(block.textStyle ? { textStyle: block.textStyle } : {}),
      ...(block.richTextHtml ? { richTextHtml: block.richTextHtml } : {}),
      ...(block.conferenceSessionId ? { conferenceSessionId: block.conferenceSessionId } : {})
    }
  };
}

function lessonType(value: Lesson['type']) {
  return value.toUpperCase();
}

export interface BackendCourseAccess {
  id: string;
  userId: string;
  status: string;
  source: string;
  startedAt: string;
  expiresAt?: string | null;
  user: { id: string; email: string; phone: string; profile?: { firstName?: string; lastName?: string; displayName?: string | null } | null };
  lessonProgress?: Array<{ status: string; progressPercent?: number }>;
  courseVersion?: { versionNumber: number; title: string; _count?: { lessons: number } };
}


export interface BackendCourseAccessHistory {
  id: string;
  courseId: string;
  studentId: string;
  enrollmentId?: string | null;
  actorId: string;
  action: 'GRANTED' | 'REVOKED' | 'RESTORED' | 'ARCHIVED';
  note?: string | null;
  createdAt: string;
  actor: { id: string; email: string; profile?: { firstName?: string; lastName?: string; displayName?: string | null } | null; roles?: Array<{ role: { code: string } }> };
  student: { id: string; email: string; phone: string; profile?: { firstName?: string; lastName?: string; displayName?: string | null } | null };
}

export const courseBackend = {
  listPublic: (query = '') => apiRequest<{ items: BackendPublicCourse[]; page: number; limit: number; total: number }>(`/courses${query ? `?${query}` : ''}`),
  publicBySlug: (slug: string) => apiRequest<BackendPublicCourse>(`/courses/${encodeURIComponent(slug)}`),
  listManaged: () => apiRequest<BackendManagedCourse[]>('/teacher/courses'),
  editor: (courseId: string) => apiRequest<BackendCourseEditor>(`/teacher/courses/${courseId}/editor`),
  ensureDraft: (courseId: string) => apiRequest<BackendCourseEditor>(`/teacher/courses/${courseId}/draft`, { method: 'POST' }),
  create: (payload: Record<string, unknown>) => apiRequest<{ courseId: string; slug: string; draftVersionId: string; versionNumber: number }>('/teacher/courses', { method: 'POST', body: JSON.stringify(payload) }),
  patchDraft: (courseId: string, payload: Record<string, unknown>) => apiRequest(`/teacher/courses/${courseId}/draft`, { method: 'PATCH', body: JSON.stringify(payload) }),
  addModule: (courseId: string, payload: Record<string, unknown>) => apiRequest<BackendModule>(`/teacher/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify(payload) }),
  patchModule: (courseId: string, moduleId: string, payload: Record<string, unknown>) => apiRequest(`/teacher/courses/${courseId}/modules/${moduleId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteModule: (courseId: string, moduleId: string) => apiRequest(`/teacher/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' }),
  reorderModules: (courseId: string, ids: string[]) => apiRequest(`/teacher/courses/${courseId}/modules/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds: ids }) }),
  addLesson: (courseId: string, payload: Record<string, unknown>) => apiRequest<BackendLesson>(`/teacher/courses/${courseId}/lessons`, { method: 'POST', body: JSON.stringify(payload) }),
  patchLesson: (courseId: string, lessonId: string, payload: Record<string, unknown>) => apiRequest(`/teacher/courses/${courseId}/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteLesson: (courseId: string, lessonId: string) => apiRequest(`/teacher/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' }),
  moveLesson: (courseId: string, lessonId: string, targetModuleKeyId: string, targetIndex: number) => apiRequest(`/teacher/courses/${courseId}/lessons/${lessonId}/move`, { method: 'POST', body: JSON.stringify({ targetModuleKeyId, targetIndex }) }),
  reorderLessons: (courseId: string, moduleId: string, ids: string[]) => apiRequest(`/teacher/courses/${courseId}/modules/${moduleId}/lessons/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds: ids }) }),
  addBlock: (courseId: string, payload: Record<string, unknown>) => apiRequest<BackendBlock>(`/teacher/courses/${courseId}/blocks`, { method: 'POST', body: JSON.stringify(payload) }),
  patchBlock: (courseId: string, blockId: string, payload: Record<string, unknown>) => apiRequest(`/teacher/courses/${courseId}/blocks/${blockId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteBlock: (courseId: string, blockId: string) => apiRequest(`/teacher/courses/${courseId}/blocks/${blockId}`, { method: 'DELETE' }),
  moveBlock: (courseId: string, blockId: string, targetLessonKeyId: string, targetIndex: number) => apiRequest(`/teacher/courses/${courseId}/blocks/${blockId}/move`, { method: 'POST', body: JSON.stringify({ targetLessonKeyId, targetIndex }) }),
  reorderBlocks: (courseId: string, lessonId: string, ids: string[]) => apiRequest(`/teacher/courses/${courseId}/lessons/${lessonId}/blocks/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds: ids }) }),
  upsertTest: (courseId: string, payload: Record<string, unknown>) => apiRequest<BackendTest>(`/teacher/courses/${courseId}/tests`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTest: (courseId: string, testId: string) => apiRequest(`/teacher/courses/${courseId}/tests/${testId}`, { method: 'DELETE' }),
  upsertAssignment: (courseId: string, payload: Record<string, unknown>) => apiRequest<BackendAssignment>(`/teacher/courses/${courseId}/assignments`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAssignment: (courseId: string, assignmentId: string) => apiRequest(`/teacher/courses/${courseId}/assignments/${assignmentId}`, { method: 'DELETE' }),
  addSchedule: (courseId: string, payload: Record<string, unknown>) => apiRequest<BackendScheduleItem>(`/teacher/courses/${courseId}/schedule`, { method: 'POST', body: JSON.stringify(payload) }),
  patchSchedule: (courseId: string, scheduleId: string, payload: Record<string, unknown>) => apiRequest(`/teacher/courses/${courseId}/schedule/${scheduleId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSchedule: (courseId: string, scheduleId: string) => apiRequest(`/teacher/courses/${courseId}/schedule/${scheduleId}`, { method: 'DELETE' }),
  submit: (courseId: string) => apiRequest(`/teacher/courses/${courseId}/submit`, { method: 'POST' }),
  requestDeletion: (courseId: string, reason?: string) => apiRequest(`/teacher/courses/${courseId}/deletion-request`, { method: 'POST', body: JSON.stringify({ reason }) }),
  accessList: (courseId: string) => apiRequest<BackendCourseAccess[]>(`/teacher/courses/${courseId}/access`),
  accessHistory: (courseId: string) => apiRequest<BackendCourseAccessHistory[]>(`/teacher/courses/${courseId}/access/history`),
  grantAccess: (courseId: string, identifier: string, expiresAt?: string) => apiRequest(`/teacher/courses/${courseId}/access`, { method: 'POST', body: JSON.stringify({ identifier, expiresAt }) }),
  revokeAccess: (courseId: string, studentId: string) => apiRequest(`/teacher/courses/${courseId}/access/${studentId}`, { method: 'DELETE' }),
  restoreAccess: (courseId: string, studentId: string, expiresAt?: string) => apiRequest(`/teacher/courses/${courseId}/access/${studentId}/restore`, { method: 'POST', body: JSON.stringify({ expiresAt }) }),
  archiveAccess: (courseId: string, studentId: string) => apiRequest(`/teacher/courses/${courseId}/access/${studentId}/archive`, { method: 'POST' }),
  adminAccessList: (courseId: string) => apiRequest<BackendCourseAccess[]>(`/admin/courses/${courseId}/access`),
  adminAccessHistory: (courseId: string) => apiRequest<BackendCourseAccessHistory[]>(`/admin/courses/${courseId}/access/history`),
  adminGrantAccess: (courseId: string, identifier: string, expiresAt?: string) => apiRequest(`/admin/courses/${courseId}/access`, { method: 'POST', body: JSON.stringify({ identifier, expiresAt }) }),
  adminRevokeAccess: (courseId: string, studentId: string) => apiRequest(`/admin/courses/${courseId}/access/${studentId}`, { method: 'DELETE' }),
  adminRestoreAccess: (courseId: string, studentId: string, expiresAt?: string) => apiRequest(`/admin/courses/${courseId}/access/${studentId}/restore`, { method: 'POST', body: JSON.stringify({ expiresAt }) }),
  adminArchiveAccess: (courseId: string, studentId: string) => apiRequest(`/admin/courses/${courseId}/access/${studentId}/archive`, { method: 'POST' }),
  diff: (courseId: string) => apiRequest(`/admin/courses/${courseId}/diff`),
  requestChanges: (courseId: string, comment: string) => apiRequest(`/admin/courses/${courseId}/request-changes`, { method: 'POST', body: JSON.stringify({ comment }) }),
  publish: (courseId: string, migrationPolicy: 'NEW_STUDENTS_ONLY' | 'ALL_ACTIVE' | 'NOT_STARTED_ONLY' = 'NEW_STUDENTS_ONLY') => apiRequest(`/admin/courses/${courseId}/publish`, { method: 'POST', body: JSON.stringify({ migrationPolicy }) }),
  approveDeletion: (courseId: string, note?: string) => apiRequest(`/admin/courses/${courseId}/deletion-request/approve`, { method: 'POST', body: JSON.stringify({ note }) }),
  rejectDeletion: (courseId: string, note?: string) => apiRequest(`/admin/courses/${courseId}/deletion-request/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  archive: (courseId: string) => apiRequest(`/admin/courses/${courseId}`, { method: 'DELETE' })
};

export async function saveCourseDraft(course: Course, requestedCourseId?: string): Promise<{ courseId: string; course: Course }> {
  let courseId = requestedCourseId || (isUuid(course.id) ? course.id : '');
  if (!courseId) {
    const created = await courseBackend.create({
      title: course.title.trim(), slug: course.slug || undefined, shortDescription: course.shortDescription,
      description: course.description, coverAssetId: course.coverAssetId, level: course.level, category: course.category,
      priceMinor: Math.max(0, Math.round(course.price * 100)),
      oldPriceMinor: course.oldPrice == null ? undefined : Math.max(0, Math.round(course.oldPrice * 100)),
      currency: 'RUB', tags: course.tags, outcomes: course.outcomes, durationLabel: course.duration,
      accessMode: accessModeToBackend(course.accessMode), managedKind: course.accessMode === 'managed' ? (course.managedKind === 'group' ? 'GROUP' : 'INDIVIDUAL') : undefined, completionDueAt: course.completionDueAt ?? undefined
    });
    courseId = created.courseId;
  } else {
    await courseBackend.ensureDraft(courseId);
  }

  const before = await courseBackend.editor(courseId);
  if (before.status === 'MODERATION') throw new Error('Версия уже на модерации и недоступна для редактирования');

  await courseBackend.patchDraft(courseId, {
    title: course.title.trim(), shortDescription: course.shortDescription, description: course.description, coverAssetId: course.coverAssetId ?? null,
    level: course.level, category: course.category, priceMinor: Math.max(0, Math.round(course.price * 100)),
    oldPriceMinor: course.oldPrice == null ? null : Math.max(0, Math.round(course.oldPrice * 100)),
    currency: 'RUB', tags: course.tags, outcomes: course.outcomes, durationLabel: course.duration,
    accessMode: accessModeToBackend(course.accessMode), managedKind: course.accessMode === 'managed' ? (course.managedKind === 'group' ? 'GROUP' : 'INDIVIDUAL') : null, completionDueAt: course.completionDueAt ?? null
  });

  const existingModuleIds = new Set(before.modules.map((item) => item.moduleKeyId));
  const moduleMap = new Map<string, string>();
  for (const module of course.modules) {
    if (existingModuleIds.has(module.id)) {
      moduleMap.set(module.id, module.id);
      await courseBackend.patchModule(courseId, module.id, { title: module.title, description: module.description });
    } else {
      const created = await courseBackend.addModule(courseId, { title: module.title, description: module.description });
      moduleMap.set(module.id, created.moduleKeyId);
    }
  }

  const existingLessons = new Map(before.lessons.map((item) => [item.lessonKeyId, item]));
  const lessonMap = new Map<string, string>();
  for (const module of course.modules) {
    const targetModuleId = moduleMap.get(module.id)!;
    for (let index = 0; index < module.lessons.length; index += 1) {
      const lesson = module.lessons[index];
      const existing = existingLessons.get(lesson.id);
      if (existing) {
        lessonMap.set(lesson.id, lesson.id);
        if (existing.moduleKeyId !== targetModuleId) await courseBackend.moveLesson(courseId, lesson.id, targetModuleId, index);
        await courseBackend.patchLesson(courseId, lesson.id, {
          title: lesson.title, durationMinutes: lesson.duration, lessonType: lessonType(lesson.type),
          isPreview: Boolean(lesson.isPreview), releaseAt: lesson.releaseAt ?? null
        });
      } else {
        const created = await courseBackend.addLesson(courseId, {
          moduleKeyId: targetModuleId, title: lesson.title, durationMinutes: lesson.duration,
          lessonType: lessonType(lesson.type), isPreview: Boolean(lesson.isPreview), releaseAt: lesson.releaseAt
        });
        lessonMap.set(lesson.id, created.lessonKeyId);
      }
    }
  }

  const localLessonIds = new Set(course.modules.flatMap((module) => module.lessons.map((lesson) => lessonMap.get(lesson.id)!)));
  const removedLessonIds = new Set(before.lessons.filter((item) => !localLessonIds.has(item.lessonKeyId)).map((item) => item.lessonKeyId));
  for (const existing of before.lessons) {
    if (removedLessonIds.has(existing.lessonKeyId)) await courseBackend.deleteLesson(courseId, existing.lessonKeyId);
  }

  const localModuleIds = new Set(course.modules.map((module) => moduleMap.get(module.id)!));
  for (const existing of before.modules) {
    if (!localModuleIds.has(existing.moduleKeyId)) await courseBackend.deleteModule(courseId, existing.moduleKeyId);
  }
  if (localModuleIds.size) await courseBackend.reorderModules(courseId, course.modules.map((module) => moduleMap.get(module.id)!));
  for (const module of course.modules) {
    const moduleId = moduleMap.get(module.id)!;
    const ids = module.lessons.map((lesson) => lessonMap.get(lesson.id)!);
    if (ids.length) await courseBackend.reorderLessons(courseId, moduleId, ids);
  }

  const existingBlocks = new Map(before.blocks.map((item) => [item.blockKeyId, item]));
  const blockMap = new Map<string, string>();
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      const lessonId = lessonMap.get(lesson.id)!;
      for (let index = 0; index < lesson.blocks.length; index += 1) {
        const block = lesson.blocks[index];
        const existing = existingBlocks.get(block.id);
        const payload = blockPayload(block, lessonId);
        if (existing) {
          blockMap.set(block.id, block.id);
          if (existing.lessonKeyId !== lessonId) await courseBackend.moveBlock(courseId, block.id, lessonId, index);
          const { lessonKeyId: _lessonKeyId, ...update } = payload;
          await courseBackend.patchBlock(courseId, block.id, update);
        } else {
          const created = await courseBackend.addBlock(courseId, payload);
          blockMap.set(block.id, created.blockKeyId);
        }
      }
    }
  }
  const localBlockIds = new Set(course.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.blocks.map((block) => blockMap.get(block.id)!))));
  for (const existing of before.blocks) {
    if (!removedLessonIds.has(existing.lessonKeyId) && !localBlockIds.has(existing.blockKeyId)) await courseBackend.deleteBlock(courseId, existing.blockKeyId);
  }
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      const lessonId = lessonMap.get(lesson.id)!;
      const ids = lesson.blocks.map((block) => blockMap.get(block.id)!);
      if (ids.length) await courseBackend.reorderBlocks(courseId, lessonId, ids);
    }
  }

  const existingTests = new Map(before.tests.map((test) => [test.lessonKeyId, test]));
  const wantedTestKeys = new Set<string>();
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      if (!lesson.test) continue;
      const lessonId = lessonMap.get(lesson.id)!;
      const existing = existingTests.get(lessonId);
      const saved = await courseBackend.upsertTest(courseId, {
        lessonKeyId: lessonId,
        ...(existing ? { testKeyId: existing.testKeyId } : {}),
        title: lesson.test.title,
        passScore: lesson.test.passScore,
        questions: lesson.test.questions.map((question) => ({
          ...(isUuid(question.id) ? { questionKeyId: question.id } : {}),
          type: question.type.toUpperCase(), prompt: question.prompt, options: question.options,
          correctAnswer: question.correctAnswer, explanation: question.explanation,
          gradingMode: (question.gradingMode ?? 'auto').toUpperCase(), points: question.points ?? 1
        }))
      });
      wantedTestKeys.add(saved.testKeyId);
    }
  }
  for (const existing of before.tests) {
    if (!removedLessonIds.has(existing.lessonKeyId) && !wantedTestKeys.has(existing.testKeyId)) await courseBackend.deleteTest(courseId, existing.testKeyId);
  }

  const existingAssignments = new Map<string, BackendAssignment[]>();
  for (const assignment of before.assignments) {
    const list = existingAssignments.get(assignment.lessonKeyId) ?? [];
    list.push(assignment); existingAssignments.set(assignment.lessonKeyId, list);
  }
  const wantedAssignmentKeys = new Set<string>();
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      const lessonId = lessonMap.get(lesson.id)!;
      const existing = [...(existingAssignments.get(lessonId) ?? [])];
      const assignmentBlocks = lesson.blocks.filter((block) => block.type === 'assignment' && block.assignment);
      for (let i = 0; i < assignmentBlocks.length; i += 1) {
        const assignment = assignmentBlocks[i].assignment!;
        const prior = isUuid(assignment.id) ? before.assignments.find((item) => item.assignmentKeyId === assignment.id) : existing[i];
        const saved = await courseBackend.upsertAssignment(courseId, {
          lessonKeyId: lessonId,
          ...(prior ? { assignmentKeyId: prior.assignmentKeyId } : {}),
          title: assignment.title,
          instructions: assignment.instructions,
          gradingMode: assignment.gradingMode.toUpperCase(),
          maxScore: Math.max(1, assignment.maxScore),
          dueAt: assignment.dueAt ?? null,
          autoAnswer: assignment.autoAnswer,
          acceptedFileTypes: assignment.acceptedFileTypes ?? [],
          allowTextAnswer: assignment.allowTextAnswer,
          allowFileUpload: assignment.allowFileUpload
        });
        wantedAssignmentKeys.add(saved.assignmentKeyId);
      }
    }
  }
  for (const existing of before.assignments) {
    if (!removedLessonIds.has(existing.lessonKeyId) && !wantedAssignmentKeys.has(existing.assignmentKeyId)) await courseBackend.deleteAssignment(courseId, existing.assignmentKeyId);
  }

  const existingSchedule = new Map(before.scheduleItems.map((item) => [item.scheduleKeyId, item]));
  const scheduleMap = new Map<string, string>();
  for (const item of course.schedule ?? []) {
    const lessonId = item.lessonId ? lessonMap.get(item.lessonId) ?? (isUuid(item.lessonId) ? item.lessonId : undefined) : undefined;
    const payload = {
      type: item.type === 'lesson' ? 'COURSE_LESSON' : 'COURSE_CONFERENCE', title: item.title,
      startAt: item.startAt, durationMinutes: item.duration, lessonKeyId: lessonId,
      required: Boolean(item.required), metadata: item.sessionId ? { sessionId: item.sessionId } : {}
    };
    if (existingSchedule.has(item.id)) {
      scheduleMap.set(item.id, item.id); await courseBackend.patchSchedule(courseId, item.id, payload);
    } else {
      const created = await courseBackend.addSchedule(courseId, payload); scheduleMap.set(item.id, created.scheduleKeyId);
    }
  }
  const localScheduleIds = new Set((course.schedule ?? []).map((item) => scheduleMap.get(item.id)!));
  for (const existing of before.scheduleItems) {
    if (!localScheduleIds.has(existing.scheduleKeyId)) await courseBackend.deleteSchedule(courseId, existing.scheduleKeyId);
  }

  const fresh = await courseBackend.editor(courseId);
  return { courseId, course: editorToCourse(fresh, { id: course.instructorId, name: course.instructor, avatar: course.instructorAvatar }) };
}
