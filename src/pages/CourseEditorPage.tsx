import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardPaste,
  Copy,
  FileText,
  FileVideo2,
  GripVertical,
  Heading2,
  Image,
  Eye,
  MessageSquareText,
  Music2,
  Mic,
  MicOff,
  Plus,
  Quote,
  Save,
  Send,
  Table2,
  Trash2,
  Type,
  Upload,
  Video,
  XCircle
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type Dispatch, type DragEvent as ReactDragEvent, type SetStateAction } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Badge, Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { instructors } from '../data/mock';
import type { Course, CourseScheduleItem, Lesson, LessonBlock, Module, Question } from '../types';
import { formatMoney } from '../utils/format';

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');

function emptyCourse(userId: string, name: string, avatar: string): Course {
  return {
    id: '',
    slug: '',
    title: '',
    shortDescription: '',
    description: '',
    cover: '/course-1.svg',
    level: 'A1',
    category: 'Общий английский',
    instructor: name,
    instructorAvatar: avatar,
    instructorId: userId,
    ownerId: userId,
    price: 0,
    rating: 5,
    reviews: 0,
    duration: '8 недель',
    students: 0,
    accent: '#1f5a48',
    tags: [],
    outcomes: [],
    modules: [],
    schedule: [],
    status: 'draft'
  };
}

const blockLabels: Record<LessonBlock['type'], string> = {
  heading: 'Заголовок', text: 'Текст', quote: 'Цитата', image: 'Изображение', video: 'Видео', audio: 'Аудио', file: 'Файл',
  test: 'Тест', callout: 'Выделенный блок', table: 'Таблица', assignment: 'Домашнее задание', conference: 'Видеоконференция'
};

type EditorClipboard =
  | { kind: 'module'; data: Module }
  | { kind: 'lesson'; data: Lesson }
  | { kind: 'block'; data: LessonBlock };

type DragItem =
  | { kind: 'module'; moduleId: string }
  | { kind: 'lesson'; moduleId: string; lessonId: string }
  | { kind: 'block'; moduleId: string; lessonId: string; blockId: string };

const clipboardPrefix = 'LINGUA_LMS_EDITOR_V1:';

function cloneBlock(block: LessonBlock): LessonBlock {
  const next = structuredClone(block);
  next.id = id('block');
  if (next.assignment) next.assignment.id = id('assignment');
  return next;
}

function cloneLesson(lesson: Lesson): Lesson {
  const next = structuredClone(lesson);
  next.id = id('lesson');
  next.blocks = next.blocks.map(cloneBlock);
  if (next.test) {
    next.test.id = id('test');
    next.test.questions = next.test.questions.map((question) => ({ ...question, id: id('q') }));
  }
  return next;
}

function cloneModule(module: Module): Module {
  const next = structuredClone(module);
  next.id = id('module');
  next.lessons = next.lessons.map(cloneLesson);
  return next;
}

function lessonBlockFromFile(file: File): LessonBlock {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const type: LessonBlock['type'] = mime.startsWith('image/') ? 'image'
    : mime.startsWith('video/') ? 'video'
      : mime.startsWith('audio/') ? 'audio'
        : /\.(png|jpe?g|webp|gif|svg)$/i.test(name) ? 'image'
          : /\.(mp4|webm|mov|m4v)$/i.test(name) ? 'video'
            : /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(name) ? 'audio'
              : 'file';
  return { id: id('block'), type, title: file.name, fileName: file.name, url: URL.createObjectURL(file) };
}

export function CourseEditorPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user)!;
  const courses = useAppStore((state) => state.courses);
  const upsertCourse = useAppStore((state) => state.upsertCourse);
  const submitForModeration = useAppStore((state) => state.submitCourseForModeration);
  const approveCourse = useAppStore((state) => state.approveCourse);
  const requestRevision = useAppStore((state) => state.requestCourseRevision);
  const addToast = useAppStore((state) => state.addToast);
  const source = useMemo(() => courses.find((item) => item.id === courseId), [courseId, courses]);
  const [course, setCourse] = useState<Course>(() => {
    if (source) return structuredClone(source);
    const draft = emptyCourse(user.id, user.name, user.avatar ?? user.name.slice(0, 2));
    if (user.role === 'admin' && instructors[0]) {
      const teacher = instructors[0];
      return { ...draft, instructor: teacher.name, instructorAvatar: teacher.avatar, instructorId: teacher.id, ownerId: teacher.id };
    }
    return draft;
  });
  const [tab, setTab] = useState<'main' | 'program' | 'schedule' | 'publication'>('main');
  const [savedId, setSavedId] = useState(course.id);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [collapsedLessons, setCollapsedLessons] = useState<Set<string>>(new Set());
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState(() => course.tags.join(', '));
  const [editorClipboard, setEditorClipboard] = useState<EditorClipboard | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const dragItemRef = useRef<DragItem | null>(null);
  const beginEditorDrag = (event: ReactDragEvent<HTMLElement>, item: DragItem) => {
    dragItemRef.current = item;
    setDragItem(item);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-lingua-editor-drag', JSON.stringify(item));
    event.dataTransfer.setData('text/plain', JSON.stringify(item));
    const preview = event.currentTarget.closest('.editor-module, .editor-lesson, .lesson-block-editor') as HTMLElement | null;
    if (preview) {
      try { event.dataTransfer.setDragImage(preview, Math.min(36, preview.clientWidth / 5), 24); } catch { /* Browser may ignore custom drag image. */ }
    }
  };
  const endEditorDrag = () => {
    dragItemRef.current = null;
    setDragItem(null);
  };
  const activeEditorDrag = () => dragItemRef.current ?? dragItem;
  const allowEditorDrop = (event: ReactDragEvent<HTMLElement>, kind: DragItem['kind']) => {
    const active = activeEditorDrag();
    if (!active || active.kind !== kind) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return true;
  };

  const isAdmin = user.role === 'admin';
  const isExistingRoute = Boolean(courseId);
  const canEditSource = !source || isAdmin || source.ownerId === user.id || source.instructorId === user.id;

  if (isExistingRoute && !source) {
    return (
      <AppLayout title="Курс не найден" subtitle="Проверьте ссылку или вернитесь к списку курсов.">
        <Card className="editor-access-state"><XCircle size={28}/><h2>Курс не найден</h2><p>Возможно, он был удалён или ссылка устарела.</p><Link to={isAdmin ? '/admin?tab=courses' : '/teacher?tab=courses'}><Button>К списку курсов</Button></Link></Card>
      </AppLayout>
    );
  }

  if (!canEditSource) {
    return (
      <AppLayout title="Нет доступа" subtitle="Редактировать этот курс может только его автор или администратор.">
        <Card className="editor-access-state"><XCircle size={28}/><h2>Недостаточно прав</h2><p>Курс принадлежит другому преподавателю.</p><Link to="/teacher?tab=courses"><Button>К моим курсам</Button></Link></Card>
      </AppLayout>
    );
  }

  const patch = <K extends keyof Course>(key: K, value: Course[K]) => setCourse((current) => ({ ...current, [key]: value }));
  const toggleSet = (setter: Dispatch<SetStateAction<Set<string>>>, key: string) => setter((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const collapseAll = () => {
    setCollapsedModules(new Set(course.modules.map((module) => module.id)));
    setCollapsedLessons(new Set(course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id))));
  };
  const expandAll = () => { setCollapsedModules(new Set()); setCollapsedLessons(new Set()); setCollapsedBlocks(new Set()); };

  const save = (quiet = false) => {
    if (!course.title.trim()) {
      addToast({ title: 'Введите название курса', tone: 'warning' });
      setTab('main');
      return null;
    }
    const record = upsertCourse({ ...course, id: savedId || course.id, slug: course.slug || slugify(course.title) || `course-${Date.now()}` });
    setCourse(record);
    setSavedId(record.id);
    if (!quiet) addToast({ title: 'Курс сохранён', text: 'Изменения сохранены локально в демо-проекте.', tone: 'success' });
    return record;
  };

  const submit = () => {
    const record = save(true);
    if (!record) return;
    submitForModeration(record.id);
    navigate(user.role === 'admin' ? '/admin?tab=courses' : '/teacher?tab=courses');
  };

  const approve = () => {
    const record = save(true);
    if (!record) return;
    approveCourse(record.id);
    setCourse((current) => ({ ...current, status: 'published', moderationComment: undefined }));
  };

  const uploadCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch('cover', String(reader.result));
    reader.readAsDataURL(file);
  };

  const addModule = () => patch('modules', [...course.modules, { id: id('module'), title: `Модуль ${course.modules.length + 1}`, description: '', lessons: [] }]);
  const updateModule = (moduleId: string, data: Partial<Module>) => patch('modules', course.modules.map((module) => module.id === moduleId ? { ...module, ...data } : module));
  const removeModule = (moduleId: string) => patch('modules', course.modules.filter((module) => module.id !== moduleId));
  const moveModule = (moduleId: string, direction: -1 | 1) => {
    const index = course.modules.findIndex((module) => module.id === moduleId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= course.modules.length) return;
    const next = [...course.modules];
    [next[index], next[target]] = [next[target], next[index]];
    patch('modules', next);
  };
  const dropModule = (targetModuleId: string) => {
    const active = activeEditorDrag();
    if (!active || active.kind !== 'module' || active.moduleId === targetModuleId) return;
    setCourse((current) => {
      const modules = [...current.modules];
      const from = modules.findIndex((module) => module.id === active.moduleId);
      const [moved] = from >= 0 ? modules.splice(from, 1) : [];
      if (!moved) return current;
      const to = modules.findIndex((module) => module.id === targetModuleId);
      modules.splice(to < 0 ? modules.length : to, 0, moved);
      return { ...current, modules };
    });
    endEditorDrag();
  };

  const addLesson = (moduleId: string) => {
    const lesson: Lesson = { id: id('lesson'), title: 'Новый урок', duration: 15, type: 'text', blocks: [] };
    updateModule(moduleId, { lessons: course.modules.find((module) => module.id === moduleId)!.lessons.concat(lesson) });
  };
  const updateLesson = (moduleId: string, lessonId: string, data: Partial<Lesson>) => {
    const module = course.modules.find((item) => item.id === moduleId)!;
    updateModule(moduleId, { lessons: module.lessons.map((lesson) => lesson.id === lessonId ? { ...lesson, ...data } : lesson) });
  };
  const removeLesson = (moduleId: string, lessonId: string) => {
    const module = course.modules.find((item) => item.id === moduleId)!;
    updateModule(moduleId, { lessons: module.lessons.filter((lesson) => lesson.id !== lessonId) });
  };
  const moveLesson = (moduleId: string, lessonId: string, direction: -1 | 1) => {
    const module = course.modules.find((item) => item.id === moduleId);
    if (!module) return;
    const index = module.lessons.findIndex((lesson) => lesson.id === lessonId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= module.lessons.length) return;
    const lessons = [...module.lessons];
    [lessons[index], lessons[target]] = [lessons[target], lessons[index]];
    updateModule(moduleId, { lessons });
  };
  const dropLesson = (targetModuleId: string, targetLessonId: string) => {
    const active = activeEditorDrag();
    if (!active || active.kind !== 'lesson' || active.lessonId === targetLessonId) return;
    setCourse((current) => {
      const next = structuredClone(current);
      const sourceModule = next.modules.find((module) => module.id === active.moduleId);
      const targetModule = next.modules.find((module) => module.id === targetModuleId);
      if (!sourceModule || !targetModule) return current;
      const sourceIndex = sourceModule.lessons.findIndex((lesson) => lesson.id === active.lessonId);
      if (sourceIndex < 0) return current;
      const [moved] = sourceModule.lessons.splice(sourceIndex, 1);
      const targetIndex = targetModule.lessons.findIndex((lesson) => lesson.id === targetLessonId);
      targetModule.lessons.splice(targetIndex < 0 ? targetModule.lessons.length : targetIndex, 0, moved);
      return next;
    });
    endEditorDrag();
  };
  const dropLessonToModuleEnd = (targetModuleId: string) => {
    const active = activeEditorDrag();
    if (!active || active.kind !== 'lesson') return;
    setCourse((current) => {
      const next = structuredClone(current);
      const sourceModule = next.modules.find((module) => module.id === active.moduleId);
      const targetModule = next.modules.find((module) => module.id === targetModuleId);
      if (!sourceModule || !targetModule) return current;
      const sourceIndex = sourceModule.lessons.findIndex((lesson) => lesson.id === active.lessonId);
      if (sourceIndex < 0) return current;
      const [moved] = sourceModule.lessons.splice(sourceIndex, 1);
      targetModule.lessons.push(moved);
      return next;
    });
    endEditorDrag();
  };

  const addBlock = (moduleId: string, lesson: Lesson, type: LessonBlock['type']) => {
    const block: LessonBlock = { id: id('block'), type };
    if (type === 'heading') block.title = 'Новый заголовок';
    if (type === 'text' || type === 'quote' || type === 'callout') block.content = '';
    if (type === 'table') block.table = { headers: ['Колонка 1', 'Колонка 2'], rows: [['', '']] };
    if (type === 'assignment') block.assignment = { id: id('assignment'), title: 'Домашнее задание', instructions: '', gradingMode: 'manual', maxScore: 10, allowTextAnswer: true, allowFileUpload: true };
    if (type === 'test' && !lesson.test) {
      lesson = { ...lesson, test: { id: id('test'), title: 'Тест урока', passScore: 70, questions: [] } };
    }
    updateLesson(moduleId, lesson.id, { blocks: [...lesson.blocks, block], test: lesson.test });
  };
  const updateBlock = (moduleId: string, lesson: Lesson, blockId: string, data: Partial<LessonBlock>) => updateLesson(moduleId, lesson.id, { blocks: lesson.blocks.map((block) => block.id === blockId ? { ...block, ...data } : block) });
  const removeBlock = (moduleId: string, lesson: Lesson, blockId: string) => updateLesson(moduleId, lesson.id, { blocks: lesson.blocks.filter((block) => block.id !== blockId) });
  const moveBlock = (moduleId: string, lesson: Lesson, blockId: string, direction: -1 | 1) => {
    const index = lesson.blocks.findIndex((block) => block.id === blockId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= lesson.blocks.length) return;
    const blocks = [...lesson.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    updateLesson(moduleId, lesson.id, { blocks });
  };
  const dropBlock = (targetModuleId: string, targetLessonId: string, targetBlockId: string) => {
    const active = activeEditorDrag();
    if (!active || active.kind !== 'block' || active.blockId === targetBlockId) return;
    setCourse((current) => {
      const next = structuredClone(current);
      const sourceModule = next.modules.find((module) => module.id === active.moduleId);
      const sourceLesson = sourceModule?.lessons.find((lesson) => lesson.id === active.lessonId);
      const targetModule = next.modules.find((module) => module.id === targetModuleId);
      const targetLesson = targetModule?.lessons.find((lesson) => lesson.id === targetLessonId);
      if (!sourceLesson || !targetLesson) return current;
      const sourceIndex = sourceLesson.blocks.findIndex((block) => block.id === active.blockId);
      if (sourceIndex < 0) return current;
      const [moved] = sourceLesson.blocks.splice(sourceIndex, 1);
      const targetIndex = targetLesson.blocks.findIndex((block) => block.id === targetBlockId);
      targetLesson.blocks.splice(targetIndex < 0 ? targetLesson.blocks.length : targetIndex, 0, moved);
      return next;
    });
    endEditorDrag();
  };
  const dropBlockToLessonEnd = (targetModuleId: string, targetLessonId: string) => {
    const active = activeEditorDrag();
    if (!active || active.kind !== 'block') return;
    setCourse((current) => {
      const next = structuredClone(current);
      const sourceModule = next.modules.find((module) => module.id === active.moduleId);
      const sourceLesson = sourceModule?.lessons.find((lesson) => lesson.id === active.lessonId);
      const targetModule = next.modules.find((module) => module.id === targetModuleId);
      const targetLesson = targetModule?.lessons.find((lesson) => lesson.id === targetLessonId);
      if (!sourceLesson || !targetLesson) return current;
      const sourceIndex = sourceLesson.blocks.findIndex((block) => block.id === active.blockId);
      if (sourceIndex < 0) return current;
      const [moved] = sourceLesson.blocks.splice(sourceIndex, 1);
      targetLesson.blocks.push(moved);
      return next;
    });
    endEditorDrag();
  };

  const copyEditorItem = async (payload: EditorClipboard) => {
    setEditorClipboard(payload);
    try { await navigator.clipboard?.writeText(`${clipboardPrefix}${JSON.stringify(payload)}`); } catch { /* Local clipboard remains available. */ }
    addToast({ title: 'Скопировано', text: payload.kind === 'module' ? 'Модуль целиком' : payload.kind === 'lesson' ? 'Урок целиком' : 'Блок урока', tone: 'success' });
  };
  const readEditorClipboard = async (): Promise<EditorClipboard | null> => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text?.startsWith(clipboardPrefix)) return JSON.parse(text.slice(clipboardPrefix.length)) as EditorClipboard;
    } catch { /* Browser can deny clipboard read; use internal clipboard below. */ }
    return editorClipboard;
  };
  const pasteModule = async () => {
    const payload = await readEditorClipboard();
    if (!payload || payload.kind !== 'module') { addToast({ title: 'В буфере нет модуля', text: 'Сначала скопируйте нужный модуль.', tone: 'warning' }); return; }
    patch('modules', [...course.modules, cloneModule(payload.data)]);
  };
  const pasteLesson = async (moduleId: string) => {
    const payload = await readEditorClipboard();
    if (!payload || payload.kind !== 'lesson') { addToast({ title: 'В буфере нет урока', text: 'Сначала скопируйте нужный урок.', tone: 'warning' }); return; }
    const module = course.modules.find((item) => item.id === moduleId);
    if (module) updateModule(moduleId, { lessons: [...module.lessons, cloneLesson(payload.data)] });
  };
  const pasteBlock = async (moduleId: string, lesson: Lesson) => {
    const payload = await readEditorClipboard();
    if (!payload || payload.kind !== 'block') { addToast({ title: 'В буфере нет блока', text: 'Сначала скопируйте нужный блок.', tone: 'warning' }); return; }
    updateLesson(moduleId, lesson.id, { blocks: [...lesson.blocks, cloneBlock(payload.data)] });
  };

  const appendFilesToLesson = (moduleId: string, lesson: Lesson, files: File[]) => {
    if (!files.length) return;
    const blocks = files.map(lessonBlockFromFile);
    updateLesson(moduleId, lesson.id, { blocks: [...lesson.blocks, ...blocks] });
    addToast({ title: 'Материалы добавлены', text: `${files.length} файл(а/ов) автоматически распознаны по формату.`, tone: 'success' });
  };
  const handleLessonPaste = (event: ReactClipboardEvent<HTMLDivElement>, moduleId: string, lesson: Lesson) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length) {
      event.preventDefault();
      appendFilesToLesson(moduleId, lesson, files);
      return;
    }
    const text = event.clipboardData.getData('text/plain');
    if (!text.trim()) return;
    event.preventDefault();
    if (text.startsWith(clipboardPrefix)) {
      try {
        const payload = JSON.parse(text.slice(clipboardPrefix.length)) as EditorClipboard;
        if (payload.kind === 'block') updateLesson(moduleId, lesson.id, { blocks: [...lesson.blocks, cloneBlock(payload.data)] });
        else if (payload.kind === 'lesson') {
          const module = course.modules.find((item) => item.id === moduleId);
          if (module) updateModule(moduleId, { lessons: [...module.lessons, cloneLesson(payload.data)] });
        } else patch('modules', [...course.modules, cloneModule(payload.data)]);
        return;
      } catch { /* Treat as regular text below. */ }
    }
    updateLesson(moduleId, lesson.id, { blocks: [...lesson.blocks, { id: id('block'), type: 'text', content: text }] });
  };

  const updateTest = (moduleId: string, lesson: Lesson, data: Partial<NonNullable<Lesson['test']>>) => updateLesson(moduleId, lesson.id, { test: { ...(lesson.test ?? { id: id('test'), title: 'Тест урока', passScore: 70, questions: [] }), ...data } });
  const addQuestion = (moduleId: string, lesson: Lesson) => {
    const test = lesson.test ?? { id: id('test'), title: 'Тест урока', passScore: 70, questions: [] };
    const question: Question = { id: id('q'), type: 'single', prompt: 'Новый вопрос', options: ['Вариант 1', 'Вариант 2'], correctAnswer: 'Вариант 1', gradingMode: 'auto', points: 1 };
    updateTest(moduleId, lesson, { questions: [...test.questions, question] });
  };
  const updateQuestion = (moduleId: string, lesson: Lesson, questionId: string, data: Partial<Question>) => {
    const test = lesson.test!;
    updateTest(moduleId, lesson, { questions: test.questions.map((question) => question.id === questionId ? { ...question, ...data } : question) });
  };

  const addScheduleItem = () => {
    const start = new Date(Date.now() + 86400000);
    start.setMinutes(0, 0, 0);
    const item: CourseScheduleItem = { id: id('schedule'), type: 'lesson', title: 'Открытие урока', startAt: start.toISOString(), duration: 60, required: true };
    patch('schedule', [...(course.schedule ?? []), item]);
  };

  const updateScheduleItem = (itemId: string, data: Partial<CourseScheduleItem>) => patch('schedule', (course.schedule ?? []).map((item) => item.id === itemId ? { ...item, ...data } : item));
  const allLessons = course.modules.flatMap((module) => module.lessons);

  return (
    <AppLayout wide title={savedId ? 'Редактирование курса' : 'Создание курса'} subtitle="Контент, тесты, домашние задания, расписание и публикация.">
      <div className="course-editor-topline">
        <Link to={isAdmin ? '/admin?tab=courses' : '/teacher?tab=courses'} className="editor-back"><ArrowLeft size={17} /> К списку курсов</Link>
        <div className="editor-top-actions">
          <Badge tone={course.status === 'published' ? 'green' : course.status === 'moderation' ? 'amber' : course.status === 'revision' ? 'red' : 'neutral'}>{statusLabel(course.status)}</Badge>
          <Button variant="secondary" icon={<Save size={17} />} onClick={() => save()}>Сохранить</Button>
          {!isAdmin ? <Button icon={<Send size={17} />} onClick={submit}>На модерацию</Button> : null}
          {isAdmin && course.status !== 'published' ? <Button icon={<CheckCircle2 size={17} />} onClick={approve}>Подтвердить и опубликовать</Button> : null}
        </div>
      </div>

      <div className="course-editor-tabs">
        {([['main', 'Основное'], ['program', 'Программа и контент'], ['schedule', 'Расписание курса'], ['publication', 'Публикация']] as const).map(([value, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}
      </div>

      {tab === 'main' ? (
        <div className="editor-main-grid">
          <Card className="editor-panel">
            <header><div><h2>Карточка курса</h2><p>Эти данные увидит ученик в каталоге и на странице курса.</p></div></header>
            <div className="editor-form-grid">
              <label className="full"><span>Название курса *</span><div className="voice-field"><input value={course.title} onChange={(event) => patch('title', event.target.value)} placeholder="Английский для путешествий" /><VoiceInputButton value={course.title} onChange={(value) => patch('title', value)} /></div></label>
              <label className="full"><span>Краткое описание</span><div className="voice-field voice-field--textarea"><textarea rows={3} value={course.shortDescription} onChange={(event) => patch('shortDescription', event.target.value)} /><VoiceInputButton value={course.shortDescription} onChange={(value) => patch('shortDescription', value)} /></div></label>
              <label className="full"><span>Полное описание</span><div className="voice-field voice-field--textarea"><textarea rows={7} value={course.description} onChange={(event) => patch('description', event.target.value)} /><VoiceInputButton value={course.description} onChange={(value) => patch('description', value)} /></div></label>
              <label><span>Уровень</span><input value={course.level} onChange={(event) => patch('level', event.target.value)} placeholder="Например: A1, A2–B1, Beginner" /></label>
              <label><span>Категория</span><input value={course.category} onChange={(event) => patch('category', event.target.value)} /></label>
              {isAdmin ? <label><span>Преподаватель</span><select value={course.instructorId ?? ''} onChange={(event) => { const teacher = instructors.find((item) => item.id === event.target.value); if (teacher) setCourse((current) => ({ ...current, instructor: teacher.name, instructorAvatar: teacher.avatar, instructorId: teacher.id, ownerId: teacher.id })); }}>{instructors.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label> : <label><span>Преподаватель</span><input value={course.instructor} readOnly /></label>}
              <label><span>Цена, ₽</span><input type="number" min="0" value={course.price} onChange={(event) => patch('price', Number(event.target.value))} /></label>
              <label><span>Старая цена, ₽</span><input type="number" min="0" value={course.oldPrice ?? ''} onChange={(event) => patch('oldPrice', event.target.value ? Number(event.target.value) : undefined)} /></label>
              <label><span>Длительность</span><input value={course.duration} onChange={(event) => patch('duration', event.target.value)} /></label>
              <label><span>URL / slug</span><input value={course.slug} onChange={(event) => patch('slug', slugify(event.target.value))} placeholder="создастся автоматически" /></label>
              <label className="full"><span>Теги через запятую</span><input value={tagsInput} onChange={(event) => { const value = event.target.value; setTagsInput(value); patch('tags', value.split(',').map((tag) => tag.trim()).filter(Boolean)); }} placeholder="Разговорный, путешествия, A2" /></label>
              <label className="full"><span>Результаты курса — по одному в строке</span><textarea rows={5} value={course.outcomes.join('\n')} onChange={(event) => patch('outcomes', event.target.value.split('\n').map((value) => value.trim()).filter(Boolean))} /></label>
            </div>
          </Card>
          <Card className="editor-panel cover-editor-card">
            <header><div><h2>Обложка</h2><p>Рекомендуемое соотношение 16:10.</p></div></header>
            <div className="course-cover-preview"><img src={course.cover} alt="Обложка курса" /></div>
            <label className="upload-dropzone"><Upload size={22} /><strong>Загрузить изображение</strong><span>PNG, JPG, WebP</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadCover} /></label>
            <div className="price-preview"><span>Цена в каталоге</span><strong>{formatMoney(course.price)}</strong>{course.oldPrice ? <s>{formatMoney(course.oldPrice)}</s> : null}</div>
          </Card>
        </div>
      ) : null}

      {tab === 'program' ? (
        <div className={`editor-program ${dragItem ? `is-reordering drag-${dragItem.kind}` : ''}`}>
          <div className="workspace-section__header editor-program-header"><div><h2>Программа курса</h2><p>Модули, уроки и произвольные блоки контента. Перетаскивайте их за ручку слева или используйте стрелки справа.</p></div><div className="editor-program-actions"><Button size="sm" variant="ghost" icon={<Eye size={16}/>} onClick={() => setPreviewOpen((value) => !value)}>{previewOpen ? 'Скрыть предпросмотр' : 'Предпросмотр'}</Button><Button size="sm" variant="ghost" onClick={collapseAll}>Свернуть всё</Button><Button size="sm" variant="ghost" onClick={expandAll}>Развернуть всё</Button><Button size="sm" variant="secondary" icon={<ClipboardPaste size={16}/>} onClick={pasteModule}>Вставить модуль</Button><Button size="sm" icon={<Plus size={17} />} onClick={addModule}>Добавить модуль</Button></div></div>
          {dragItem ? <div className="editor-drag-guide"><GripVertical size={17}/><strong>{dragItem.kind === 'module' ? 'Перемещение модуля' : dragItem.kind === 'lesson' ? 'Перемещение урока' : 'Перемещение блока'}</strong><span>Наведите на нужную позицию — она подсветится, затем отпустите.</span></div> : null}
          {course.modules.length === 0 ? <Card className="editor-empty"><GraduationCapIcon /><h3>Программа пока пуста</h3><p>Добавьте первый модуль, затем уроки и учебные материалы.</p><Button onClick={addModule}>Создать модуль</Button></Card> : null}
          <div className="editor-module-list">
            {course.modules.map((module, moduleIndex) => (
              <Card className={`editor-module ${collapsedModules.has(module.id) ? 'is-collapsed' : ''} ${dragItem?.kind === 'module' && dragItem.moduleId === module.id ? 'is-dragging' : ''}`} key={module.id} onDragOver={(event) => { allowEditorDrop(event, 'module'); }} onDrop={(event) => { if (!allowEditorDrop(event, 'module')) return; event.stopPropagation(); dropModule(module.id); }}>
                <header>
                  <span className="editor-drag-handle" role="button" tabIndex={0} draggable onDragStart={(event) => beginEditorDrag(event, { kind: 'module', moduleId: module.id })} onDragEnd={endEditorDrag} title="Перетащить модуль" aria-label="Перетащить модуль"><GripVertical size={18}/></span>
                  <div className="module-number">{moduleIndex + 1}</div>
                  <div className="editor-module-fields"><input value={module.title} onChange={(event) => updateModule(module.id, { title: event.target.value })} /><input value={module.description} onChange={(event) => updateModule(module.id, { description: event.target.value })} placeholder="Краткое описание модуля" /></div>
                  <div className="editor-module__actions"><button onClick={() => moveModule(module.id, -1)} disabled={moduleIndex === 0} title="Модуль выше"><ArrowUp size={16}/></button><button onClick={() => moveModule(module.id, 1)} disabled={moduleIndex === course.modules.length - 1} title="Модуль ниже"><ArrowDown size={16}/></button><button onClick={() => copyEditorItem({ kind: 'module', data: module })} title="Копировать модуль"><Copy size={16}/></button><button onClick={() => pasteLesson(module.id)} title="Вставить скопированный урок"><ClipboardPaste size={16}/></button><button className="collapse-icon" onClick={() => toggleSet(setCollapsedModules, module.id)} title={collapsedModules.has(module.id) ? 'Развернуть модуль' : 'Свернуть модуль'}>{collapsedModules.has(module.id) ? <ChevronDown size={17}/> : <ChevronUp size={17}/>}</button><Button size="sm" variant="secondary" icon={<Plus size={15} />} onClick={() => addLesson(module.id)}>Урок</Button><button className="danger-icon" onClick={() => { if (window.confirm('Удалить модуль целиком вместе с уроками?')) removeModule(module.id); }}><Trash2 size={17} /></button></div>
                </header>
                <div className="editor-lesson-list" onDragOver={(event) => { allowEditorDrop(event, 'lesson'); }} onDrop={(event) => { if (event.target === event.currentTarget && allowEditorDrop(event, 'lesson')) { event.stopPropagation(); dropLessonToModuleEnd(module.id); } }}>
                  {module.lessons.map((lesson, lessonIndex) => (
                    <article className={`editor-lesson ${collapsedLessons.has(lesson.id) ? 'is-collapsed' : ''} ${dragItem?.kind === 'lesson' && dragItem.lessonId === lesson.id ? 'is-dragging' : ''}`} key={lesson.id} onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } else { allowEditorDrop(event, 'lesson'); } }} onDrop={(event) => { if (event.dataTransfer.files.length) { event.preventDefault(); event.stopPropagation(); appendFilesToLesson(module.id, lesson, Array.from(event.dataTransfer.files)); return; } if (allowEditorDrop(event, 'lesson')) { event.stopPropagation(); dropLesson(module.id, lesson.id); } }}>
                      <div className="editor-lesson__head">
                        <span className="editor-drag-handle" role="button" tabIndex={0} draggable onDragStart={(event) => beginEditorDrag(event, { kind: 'lesson', moduleId: module.id, lessonId: lesson.id })} onDragEnd={endEditorDrag} title="Перетащить урок" aria-label="Перетащить урок"><GripVertical size={17}/></span>
                        <span>{moduleIndex + 1}.{lessonIndex + 1}</span>
                        <input value={lesson.title} onChange={(event) => updateLesson(module.id, lesson.id, { title: event.target.value })} />
                        <select value={lesson.type} onChange={(event) => updateLesson(module.id, lesson.id, { type: event.target.value as Lesson['type'] })}><option value="text">Текстовый урок</option><option value="video">Видеоурок</option><option value="practice">Практика</option><option value="test">Тест</option><option value="assignment">Домашнее задание</option><option value="conference">Видеоконференция</option></select>
                        <label className="compact-number"><input type="number" min="1" value={lesson.duration} onChange={(event) => updateLesson(module.id, lesson.id, { duration: Number(event.target.value) })} /><span>мин</span></label>
                        <label className="preview-check"><input type="checkbox" checked={Boolean(lesson.isPreview)} onChange={(event) => updateLesson(module.id, lesson.id, { isPreview: event.target.checked })} /> Пробный</label>
                        <div className="editor-lesson__actions"><button onClick={() => moveLesson(module.id, lesson.id, -1)} disabled={lessonIndex === 0} title="Урок выше"><ArrowUp size={15}/></button><button onClick={() => moveLesson(module.id, lesson.id, 1)} disabled={lessonIndex === module.lessons.length - 1} title="Урок ниже"><ArrowDown size={15}/></button><button onClick={() => copyEditorItem({ kind: 'lesson', data: lesson })} title="Копировать урок"><Copy size={15}/></button><button className="collapse-icon" onClick={() => toggleSet(setCollapsedLessons, lesson.id)} title={collapsedLessons.has(lesson.id) ? 'Развернуть урок' : 'Свернуть урок'}>{collapsedLessons.has(lesson.id) ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}</button><button className="danger-icon" onClick={() => { if (window.confirm('Удалить урок вместе со всем содержимым?')) removeLesson(module.id, lesson.id); }}><Trash2 size={16} /></button></div>
                      </div>

                      <div className="block-toolbar">
                        <span>Добавить:</span>
                        <button onClick={() => addBlock(module.id, lesson, 'heading')}><Heading2 size={15}/> Заголовок</button>
                        <button onClick={() => addBlock(module.id, lesson, 'text')}><Type size={15}/> Текст</button>
                        <button onClick={() => addBlock(module.id, lesson, 'table')}><Table2 size={15}/> Таблица</button>
                        <button onClick={() => addBlock(module.id, lesson, 'image')}><Image size={15}/> Фото</button>
                        <button onClick={() => addBlock(module.id, lesson, 'video')}><FileVideo2 size={15}/> Видео</button>
                        <button onClick={() => addBlock(module.id, lesson, 'audio')}><Music2 size={15}/> Аудио / запись</button>
                        <button onClick={() => addBlock(module.id, lesson, 'file')}><FileText size={15}/> Файл</button>
                        <button onClick={() => addBlock(module.id, lesson, 'test')}><ClipboardCheck size={15}/> Тест</button>
                        <button onClick={() => addBlock(module.id, lesson, 'assignment')}><MessageSquareText size={15}/> Д/з</button>
                        <button onClick={() => addBlock(module.id, lesson, 'conference')}><Video size={15}/> Конференция</button>
                        <button onClick={() => addBlock(module.id, lesson, 'quote')}><Quote size={15}/> Цитата</button>
                        <button onClick={() => pasteBlock(module.id, lesson)}><ClipboardPaste size={15}/> Вставить блок</button>
                      </div>

                      <div className="lesson-block-editor-list" onDragOver={(event) => { allowEditorDrop(event, 'block'); }} onDrop={(event) => { if (event.target === event.currentTarget && allowEditorDrop(event, 'block')) { event.stopPropagation(); dropBlockToLessonEnd(module.id, lesson.id); } }}>
                        {lesson.blocks.map((block, blockIndex) => (
                          <div className={`lesson-block-editor ${collapsedBlocks.has(block.id) ? 'is-collapsed' : ''} ${dragItem?.kind === 'block' && dragItem.blockId === block.id ? 'is-dragging' : ''}`} key={block.id} onDragOver={(event) => { allowEditorDrop(event, 'block'); }} onDrop={(event) => { if (allowEditorDrop(event, 'block')) { event.stopPropagation(); dropBlock(module.id, lesson.id, block.id); } }}>
                            <div className="lesson-block-editor__title"><div className="lesson-block-editor__label"><span className="editor-drag-handle editor-drag-handle--small" role="button" tabIndex={0} draggable onDragStart={(event) => beginEditorDrag(event, { kind: 'block', moduleId: module.id, lessonId: lesson.id, blockId: block.id })} onDragEnd={endEditorDrag} title="Перетащить блок" aria-label="Перетащить блок"><GripVertical size={15}/></span><span>{blockIndex + 1}. {blockLabels[block.type]}</span></div><div><button onClick={() => moveBlock(module.id, lesson, block.id, -1)} disabled={blockIndex === 0} title="Блок выше"><ArrowUp size={14}/></button><button onClick={() => moveBlock(module.id, lesson, block.id, 1)} disabled={blockIndex === lesson.blocks.length - 1} title="Блок ниже"><ArrowDown size={14}/></button><button onClick={() => copyEditorItem({ kind: 'block', data: block })} title="Копировать блок"><Copy size={14}/></button><button onClick={() => toggleSet(setCollapsedBlocks, block.id)} title={collapsedBlocks.has(block.id) ? 'Развернуть блок' : 'Свернуть блок'}>{collapsedBlocks.has(block.id) ? <ChevronDown size={15}/> : <ChevronUp size={15}/>}</button><button onClick={() => removeBlock(module.id, lesson, block.id)}><Trash2 size={15} /></button></div></div>
                            <div className="lesson-block-editor__body"><BlockEditor moduleId={module.id} lesson={lesson} block={block} updateBlock={updateBlock} updateTest={updateTest} addQuestion={addQuestion} updateQuestion={updateQuestion} /></div>
                          </div>
                        ))}
                      </div>
                      <div className="lesson-dropzone" tabIndex={0} onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }} onDrop={(event) => { if (event.dataTransfer.files.length) { event.preventDefault(); event.stopPropagation(); appendFilesToLesson(module.id, lesson, Array.from(event.dataTransfer.files)); } }} onPaste={(event) => handleLessonPaste(event, module.id, lesson)}><Upload size={18}/><div><strong>Перетащите материалы в урок</strong><span>Фото, аудио, видео, PDF и другие файлы определяются автоматически. Сюда же можно вставить файл или текст из буфера обмена.</span></div></div>
                    </article>
                  ))}
                  {module.lessons.length === 0 ? <button className="inline-empty-action" onClick={() => addLesson(module.id)}><Plus size={16} /> Добавить первый урок</button> : null}
                </div>
              </Card>
            ))}
          </div>
          {previewOpen ? <CourseEditorPreview course={course} onClose={() => setPreviewOpen(false)} /> : null}
        </div>
      ) : null}

      {tab === 'schedule' ? (
        <div className="workspace-section">
          <div className="workspace-section__header"><div><h2>Расписание курса</h2><p>Привяжите публикацию уроков и живые конференции к конкретным датам.</p></div><Button icon={<Plus size={17} />} onClick={addScheduleItem}>Добавить событие</Button></div>
          <Card className="schedule-editor-card">
            {(course.schedule ?? []).map((item) => (
              <div className="schedule-editor-row" key={item.id}>
                <select value={item.type} onChange={(event) => updateScheduleItem(item.id, { type: event.target.value as CourseScheduleItem['type'] })}><option value="lesson">Урок</option><option value="conference">Видеоконференция</option></select>
                <input value={item.title} onChange={(event) => updateScheduleItem(item.id, { title: event.target.value })} placeholder="Название события" />
                <input type="datetime-local" value={toLocalInput(item.startAt)} onChange={(event) => updateScheduleItem(item.id, { startAt: new Date(event.target.value).toISOString() })} />
                <label className="compact-number"><input type="number" value={item.duration} min="1" onChange={(event) => updateScheduleItem(item.id, { duration: Number(event.target.value) })} /><span>мин</span></label>
                {item.type === 'lesson' ? <select value={item.lessonId ?? ''} onChange={(event) => updateScheduleItem(item.id, { lessonId: event.target.value || undefined })}><option value="">Выберите урок</option>{allLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select> : <span className="conference-hint"><Video size={16}/> Комната будет создана для участников курса</span>}
                <button className="danger-icon" onClick={() => patch('schedule', (course.schedule ?? []).filter((current) => current.id !== item.id))}><Trash2 size={16}/></button>
              </div>
            ))}
            {(course.schedule ?? []).length === 0 ? <div className="editor-empty editor-empty--compact"><CalendarClock size={28}/><h3>Расписание не настроено</h3><p>Курс может быть полностью самостоятельным или иметь уроки и конференции по датам.</p></div> : null}
          </Card>
        </div>
      ) : null}

      {tab === 'publication' ? (
        <div className="publication-grid">
          <Card className="editor-panel publication-card">
            <header><div><h2>Готовность к публикации</h2><p>Проверьте обязательные элементы перед отправкой.</p></div></header>
            <PublicationCheck ok={Boolean(course.title)} text="Название курса заполнено" />
            <PublicationCheck ok={Boolean(course.cover)} text="Обложка добавлена" />
            <PublicationCheck ok={course.price >= 0} text="Цена указана" />
            <PublicationCheck ok={course.modules.length > 0} text="Есть хотя бы один модуль" />
            <PublicationCheck ok={allLessons.length > 0} text="Есть хотя бы один урок" />
            <PublicationCheck ok={course.description.length > 40} text="Добавлено подробное описание" />
          </Card>
          <Card className="editor-panel moderation-card">
            <header><div><h2>Модерация</h2><p>Преподаватель отправляет курс, администратор принимает решение.</p></div></header>
            <div className="moderation-status"><Badge tone={course.status === 'published' ? 'green' : course.status === 'revision' ? 'red' : course.status === 'moderation' ? 'amber' : 'neutral'}>{statusLabel(course.status)}</Badge><span>{course.updatedAt ? `Обновлено ${new Date(course.updatedAt).toLocaleString('ru-RU')}` : 'Новый курс'}</span></div>
            {course.moderationComment ? <div className="moderation-comment"><strong>Комментарий администратора</strong><p>{course.moderationComment}</p></div> : null}
            {!isAdmin ? <Button icon={<Send size={17}/>} onClick={submit}>Отправить на модерацию</Button> : null}
            {isAdmin ? <div className="moderation-admin-actions"><Button icon={<CheckCircle2 size={17}/>} onClick={approve}>Подтвердить публикацию</Button><Button variant="danger" icon={<XCircle size={17}/>} onClick={() => { const comment = window.prompt('Что нужно исправить?', 'Уточните описание и проверьте программу курса.'); if (comment) { const record = save(true); if (record) { requestRevision(record.id, comment); setCourse((current) => ({ ...current, status: 'revision', moderationComment: comment })); } } }}>Вернуть на доработку</Button></div> : null}
          </Card>
        </div>
      ) : null}
    </AppLayout>
  );
}

function BlockEditor({ moduleId, lesson, block, updateBlock, updateTest, addQuestion, updateQuestion }: {
  moduleId: string;
  lesson: Lesson;
  block: LessonBlock;
  updateBlock: (moduleId: string, lesson: Lesson, blockId: string, data: Partial<LessonBlock>) => void;
  updateTest: (moduleId: string, lesson: Lesson, data: Partial<NonNullable<Lesson['test']>>) => void;
  addQuestion: (moduleId: string, lesson: Lesson) => void;
  updateQuestion: (moduleId: string, lesson: Lesson, questionId: string, data: Partial<Question>) => void;
}) {
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    updateBlock(moduleId, lesson, block.id, { fileName: file.name, url: URL.createObjectURL(file) });
  };

  if (block.type === 'heading') return <div className="voice-field"><input className="block-wide-input" value={block.title ?? ''} onChange={(event) => updateBlock(moduleId, lesson, block.id, { title: event.target.value })} placeholder="Текст заголовка" /><VoiceInputButton value={block.title ?? ''} onChange={(value) => updateBlock(moduleId, lesson, block.id, { title: value })} /></div>;
  if (block.type === 'text') {
    const style = block.textStyle ?? { fontSize: 'md', align: 'left', bold: false, italic: false, underline: false, listStyle: 'none' };
    const patchStyle = (data: Partial<NonNullable<LessonBlock['textStyle']>>) => updateBlock(moduleId, lesson, block.id, { textStyle: { ...style, ...data } });
    return (
      <div className="rich-text-block-editor">
        <div className="rich-text-toolbar" aria-label="Форматирование текста">
          <select value={style.fontSize ?? 'md'} onChange={(event) => patchStyle({ fontSize: event.target.value as NonNullable<LessonBlock['textStyle']>['fontSize'] })} aria-label="Размер текста">
            <option value="sm">Мелкий</option><option value="md">Обычный</option><option value="lg">Крупный</option><option value="xl">Очень крупный</option>
          </select>
          <button type="button" className={style.bold ? 'active' : ''} onClick={() => patchStyle({ bold: !style.bold })} aria-label="Полужирный"><strong>B</strong></button>
          <button type="button" className={style.italic ? 'active' : ''} onClick={() => patchStyle({ italic: !style.italic })} aria-label="Курсив"><em>I</em></button>
          <button type="button" className={style.underline ? 'active' : ''} onClick={() => patchStyle({ underline: !style.underline })} aria-label="Подчёркнутый"><u>U</u></button>
          <select value={style.align ?? 'left'} onChange={(event) => patchStyle({ align: event.target.value as NonNullable<LessonBlock['textStyle']>['align'] })} aria-label="Выравнивание">
            <option value="left">По левому краю</option><option value="center">По центру</option><option value="right">По правому краю</option>
          </select>
          <select value={style.listStyle ?? 'none'} onChange={(event) => patchStyle({ listStyle: event.target.value as NonNullable<LessonBlock['textStyle']>['listStyle'] })} aria-label="Тип списка">
            <option value="none">Обычный текст</option><option value="bullet">Маркированный список</option><option value="numbered">Нумерованный список</option>
          </select>
        </div>
        <div className="voice-field voice-field--textarea"><textarea className="block-wide-textarea" rows={7} value={block.content ?? ''} onChange={(event) => updateBlock(moduleId, lesson, block.id, { content: event.target.value })} placeholder="Введите текст. Для списка размещайте каждый пункт с новой строки…" /><VoiceInputButton value={block.content ?? ''} onChange={(value) => updateBlock(moduleId, lesson, block.id, { content: value })} /></div>
        <small>Можно менять размер, начертание, выравнивание и превращать строки в маркированный или нумерованный список.</small>
      </div>
    );
  }
  if (block.type === 'quote') return <div className="voice-field voice-field--textarea"><textarea className="block-wide-textarea" rows={3} value={block.content ?? ''} onChange={(event) => updateBlock(moduleId, lesson, block.id, { content: event.target.value })} placeholder="Текст цитаты…" /><VoiceInputButton value={block.content ?? ''} onChange={(value) => updateBlock(moduleId, lesson, block.id, { content: value })} /></div>;
  if (block.type === 'callout') return <div className="callout-block-editor"><div className="voice-field"><input value={block.title ?? ''} onChange={(event) => updateBlock(moduleId, lesson, block.id, { title: event.target.value })} placeholder="Заголовок блока"/><VoiceInputButton value={block.title ?? ''} onChange={(value) => updateBlock(moduleId, lesson, block.id, { title: value })} /></div><div className="voice-field voice-field--textarea"><textarea className="block-wide-textarea" rows={3} value={block.content ?? ''} onChange={(event) => updateBlock(moduleId, lesson, block.id, { content: event.target.value })} placeholder="Текст выделенного блока…" /><VoiceInputButton value={block.content ?? ''} onChange={(value) => updateBlock(moduleId, lesson, block.id, { content: value })} /></div></div>;
  if (block.type === 'audio') return <AudioAssetEditor block={block} onChange={(data) => updateBlock(moduleId, lesson, block.id, data)} />;
  if (block.type === 'video' || block.type === 'file' || block.type === 'image') return (
    <div className="asset-block-editor">
      <label className="upload-inline"><Upload size={17}/><span>{block.fileName ?? `Выбрать ${block.type === 'video' ? 'видеоролик' : block.type === 'image' ? 'изображение' : 'файл'}`}</span><input type="file" accept={block.type === 'video' ? 'video/*' : block.type === 'image' ? 'image/*' : undefined} onChange={upload}/></label>
      <input value={block.title ?? ''} onChange={(event) => updateBlock(moduleId, lesson, block.id, { title: event.target.value })} placeholder="Подпись / название материала" />
      {block.type === 'image' && block.url ? <img className="asset-editor-image-preview" src={block.url} alt={block.title || block.fileName || 'Предпросмотр изображения'} /> : null}
      {block.type === 'video' && block.url ? <video className="asset-editor-video-preview" controls preload="metadata" src={block.url} /> : null}
      {block.url ? <small>Материал выбран и доступен для локального предпросмотра.</small> : null}
    </div>
  );
  if (block.type === 'table') {
    const table = block.table ?? { headers: ['Колонка 1'], rows: [['']] };
    const updateTable = (headers: string[], rows: string[][]) => updateBlock(moduleId, lesson, block.id, { table: { headers, rows } });
    return (
      <div className="table-block-editor">
        <div className="table-editor-grid" style={{ gridTemplateColumns: `repeat(${table.headers.length}, minmax(120px,1fr))` }}>
          {table.headers.map((header, index) => <input key={`h${index}`} className="table-header-input" value={header} onChange={(event) => { const headers = [...table.headers]; headers[index] = event.target.value; updateTable(headers, table.rows); }} />)}
          {table.rows.flatMap((row, rowIndex) => row.map((cell, cellIndex) => <input key={`${rowIndex}-${cellIndex}`} value={cell} onChange={(event) => { const rows = table.rows.map((r) => [...r]); rows[rowIndex][cellIndex] = event.target.value; updateTable(table.headers, rows); }} />))}
        </div>
        <div className="table-editor-actions"><button onClick={() => updateTable(table.headers, [...table.rows, table.headers.map(() => '')])}><Plus size={14}/> Строка</button><button onClick={() => updateTable([...table.headers, `Колонка ${table.headers.length + 1}`], table.rows.map((row) => [...row, '']))}><Plus size={14}/> Колонка</button></div>
      </div>
    );
  }
  if (block.type === 'assignment') {
    const a = block.assignment!;
    return (
      <div className="assignment-editor-grid">
        <label className="full"><span>Название задания</span><div className="voice-field"><input value={a.title} onChange={(event) => updateBlock(moduleId, lesson, block.id, { assignment: { ...a, title: event.target.value } })}/><VoiceInputButton value={a.title} onChange={(value) => updateBlock(moduleId, lesson, block.id, { assignment: { ...a, title: value } })}/></div></label>
        <label className="full"><span>Инструкция</span><div className="voice-field voice-field--textarea"><textarea rows={4} value={a.instructions} onChange={(event) => updateBlock(moduleId, lesson, block.id, { assignment: { ...a, instructions: event.target.value } })}/><VoiceInputButton value={a.instructions} onChange={(value) => updateBlock(moduleId, lesson, block.id, { assignment: { ...a, instructions: value } })}/></div></label>
        <label><span>Проверка</span><select value={a.gradingMode} onChange={(event) => updateBlock(moduleId, lesson, block.id, { assignment: { ...a, gradingMode: event.target.value as 'auto' | 'manual' } })}><option value="manual">Ручная преподавателем</option><option value="auto">Автоматическая</option></select></label>
        <label><span>Максимум баллов</span><input type="number" min="1" value={a.maxScore} onChange={(event) => updateBlock(moduleId, lesson, block.id, { assignment: { ...a, maxScore: Number(event.target.value) } })}/></label>
        {a.gradingMode === 'auto' ? <label className="full"><span>Эталонный ответ для автопроверки</span><textarea rows={3} value={a.autoAnswer ?? ''} onChange={(event) => updateBlock(moduleId, lesson, block.id, { assignment: { ...a, autoAnswer: event.target.value } })}/></label> : null}
        <label className="check-inline"><input type="checkbox" checked={a.allowTextAnswer} onChange={(event) => updateBlock(moduleId, lesson, block.id, { assignment: { ...a, allowTextAnswer: event.target.checked } })}/> Текстовый ответ</label>
        <label className="check-inline"><input type="checkbox" checked={a.allowFileUpload} onChange={(event) => updateBlock(moduleId, lesson, block.id, { assignment: { ...a, allowFileUpload: event.target.checked } })}/> Прикрепление файла</label>
      </div>
    );
  }
  if (block.type === 'conference') return <div className="conference-block-editor"><div className="voice-field"><input value={block.title ?? ''} onChange={(event) => updateBlock(moduleId, lesson, block.id, { title: event.target.value })} placeholder="Название конференции"/><VoiceInputButton value={block.title ?? ''} onChange={(value) => updateBlock(moduleId, lesson, block.id, { title: value })}/></div><div className="voice-field voice-field--textarea"><textarea rows={3} value={block.content ?? ''} onChange={(event) => updateBlock(moduleId, lesson, block.id, { content: event.target.value })} placeholder="Описание, цели встречи, материалы…"/><VoiceInputButton value={block.content ?? ''} onChange={(value) => updateBlock(moduleId, lesson, block.id, { content: value })}/></div><small><Video size={14}/> Дату и длительность задайте во вкладке «Расписание курса».</small></div>;
  if (block.type === 'test') {
    const test = lesson.test ?? { id: 'test', title: 'Тест урока', passScore: 70, questions: [] };
    return (
      <div className="test-builder">
        <div className="test-builder__settings"><label><span>Название теста</span><input value={test.title} onChange={(event) => updateTest(moduleId, lesson, { title: event.target.value })}/></label><label><span>Проходной балл, %</span><input type="number" min="0" max="100" value={test.passScore} onChange={(event) => updateTest(moduleId, lesson, { passScore: Number(event.target.value) })}/></label></div>
        {test.questions.map((question, index) => (
          <div className="question-editor" key={question.id}>
            <div className="question-editor__head">
              <strong>Вопрос {index + 1}</strong>
              <select value={question.type} onChange={(event) => {
                const type = event.target.value as Question['type'];
                const base: Partial<Question> = { type };
                if (type === 'single') Object.assign(base, { options: question.options?.length ? question.options : ['Вариант 1', 'Вариант 2'], correctAnswer: question.options?.[0] ?? 'Вариант 1' });
                if (type === 'multiple') Object.assign(base, { options: question.options?.length ? question.options : ['Вариант 1', 'Вариант 2'], correctAnswer: Array.isArray(question.correctAnswer) ? question.correctAnswer : [String(question.correctAnswer || question.options?.[0] || 'Вариант 1')] });
                if (type === 'essay') Object.assign(base, { gradingMode: 'manual', correctAnswer: '' });
                updateQuestion(moduleId, lesson, question.id, base);
              }}><option value="single">Один вариант</option><option value="multiple">Несколько вариантов</option><option value="text">Текстовый ответ</option><option value="essay">Развёрнутый ответ</option></select>
              <select value={question.gradingMode ?? 'auto'} onChange={(event) => updateQuestion(moduleId, lesson, question.id, { gradingMode: event.target.value as 'auto' | 'manual' })}><option value="auto">Автопроверка</option><option value="manual">Ручная проверка</option></select>
            </div>
            <div className="voice-field voice-field--textarea"><textarea rows={2} value={question.prompt} onChange={(event) => updateQuestion(moduleId, lesson, question.id, { prompt: event.target.value })} placeholder="Формулировка вопроса"/><VoiceInputButton value={question.prompt} onChange={(value) => updateQuestion(moduleId, lesson, question.id, { prompt: value })}/></div>
            {question.type === 'single' || question.type === 'multiple' ? <QuestionOptionsEditor question={question} onChange={(data) => updateQuestion(moduleId, lesson, question.id, data)} /> : null}
            {question.type === 'text' && question.gradingMode !== 'manual' ? <div className="voice-field"><input value={Array.isArray(question.correctAnswer) ? question.correctAnswer[0] ?? '' : question.correctAnswer} onChange={(event) => updateQuestion(moduleId, lesson, question.id, { correctAnswer: event.target.value })} placeholder="Правильный текстовый ответ"/><VoiceInputButton value={Array.isArray(question.correctAnswer) ? question.correctAnswer[0] ?? '' : question.correctAnswer} onChange={(value) => updateQuestion(moduleId, lesson, question.id, { correctAnswer: value })}/></div> : null}
            {question.gradingMode === 'manual' ? <small>Ответ появится в очереди преподавателя на ручную проверку.</small> : null}
          </div>
        ))}
        <Button size="sm" variant="secondary" icon={<Plus size={15}/>} onClick={() => addQuestion(moduleId, lesson)}>Добавить вопрос</Button>
      </div>
    );
  }
  return null;
}


function AudioAssetEditor({ block, onChange }: { block: LessonBlock; onChange: (data: Partial<LessonBlock>) => void }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const uploadAudio = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onChange({ fileName: file.name, url: URL.createObjectURL(file), title: block.title || file.name.replace(/\.[^.]+$/, '') });
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      window.alert('Запись звука не поддерживается этим браузером. Можно загрузить готовый аудиофайл.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setElapsed(0);
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        const extension = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';
        const fileName = `audio-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
        onChange({ url: URL.createObjectURL(blob), fileName, title: block.title || 'Аудиодорожка' });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        setRecording(false);
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
      };
      recorder.start(250);
      setRecording(true);
      timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    } catch {
      window.alert('Не удалось получить доступ к микрофону. Разрешите использование микрофона в браузере или загрузите аудиофайл.');
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  };

  const time = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div className="asset-block-editor audio-recorder-editor">
      <div className="audio-recorder-actions">
        <label className="upload-inline"><Upload size={17}/><span>{block.fileName ?? 'Загрузить аудиофайл'}</span><input type="file" accept="audio/*" onChange={uploadAudio}/></label>
        <button type="button" className={`audio-record-button ${recording ? 'is-recording' : ''}`} onClick={recording ? stopRecording : startRecording}>{recording ? <MicOff size={17}/> : <Mic size={17}/>}<span>{recording ? `Остановить запись · ${time}` : 'Записать с микрофона'}</span></button>
      </div>
      <input value={block.title ?? ''} onChange={(event) => onChange({ title: event.target.value })} placeholder="Название аудиодорожки" />
      {block.url ? <audio className="asset-editor-audio-preview" controls preload="metadata" src={block.url} /> : null}
      <small>{recording ? 'Идёт запись. После остановки дорожка сразу появится в предпросмотре урока.' : 'Можно загрузить MP3/WAV/M4A/OGG/WebM или записать новую дорожку прямо здесь.'}</small>
    </div>
  );
}


function QuestionOptionsEditor({ question, onChange }: { question: Question; onChange: (data: Partial<Question>) => void }) {
  const options = question.options?.length ? question.options : ['Вариант 1', 'Вариант 2'];
  const selected = new Set(Array.isArray(question.correctAnswer) ? question.correctAnswer : question.correctAnswer ? [question.correctAnswer] : []);
  const setOption = (index: number, value: string) => {
    const next = [...options];
    const previous = next[index];
    next[index] = value;
    let correctAnswer: string | string[] = question.correctAnswer;
    if (question.type === 'single' && question.correctAnswer === previous) correctAnswer = value;
    if (question.type === 'multiple' && Array.isArray(question.correctAnswer)) correctAnswer = question.correctAnswer.map((item) => item === previous ? value : item);
    onChange({ options: next, correctAnswer });
  };
  const toggleCorrect = (value: string) => {
    if (question.type === 'single') {
      onChange({ correctAnswer: value });
      return;
    }
    const next = new Set(selected);
    if (next.has(value)) next.delete(value); else next.add(value);
    onChange({ correctAnswer: Array.from(next) });
  };
  const addOption = () => onChange({ options: [...options, `Вариант ${options.length + 1}`] });
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    const removed = options[index];
    const next = options.filter((_, optionIndex) => optionIndex !== index);
    let correctAnswer: string | string[] = question.correctAnswer;
    if (question.type === 'single' && question.correctAnswer === removed) correctAnswer = next[0] ?? '';
    if (question.type === 'multiple' && Array.isArray(question.correctAnswer)) correctAnswer = question.correctAnswer.filter((item) => item !== removed);
    onChange({ options: next, correctAnswer });
  };
  return (
    <div className="question-options-editor">
      <header><span>Варианты ответа</span><small>{question.gradingMode === 'manual' ? 'Правильность будет проверять преподаватель' : question.type === 'single' ? 'Отметьте один правильный вариант' : 'Отметьте все правильные варианты'}</small></header>
      <div className="question-options-list">
        {options.map((option, index) => {
          const checked = selected.has(option);
          return (
            <div className="question-option-row" key={`${question.id}-option-${index}`}>
              <button type="button" className={`question-option-correct ${checked ? 'active' : ''}`} disabled={question.gradingMode === 'manual'} onClick={() => toggleCorrect(option)} aria-label={checked ? 'Правильный вариант' : 'Отметить правильным'}>{question.type === 'single' ? <span className="radio-dot"/> : <CheckCircle2 size={16}/>}</button>
              <input value={option} onChange={(event) => setOption(index, event.target.value)} placeholder={`Вариант ${index + 1}`}/>
              <button type="button" className="question-option-remove" disabled={options.length <= 2} onClick={() => removeOption(index)} aria-label="Удалить вариант"><Trash2 size={15}/></button>
            </div>
          );
        })}
      </div>
      <button type="button" className="question-option-add" onClick={addOption}><Plus size={15}/> Добавить вариант</button>
    </div>
  );
}

function VoiceInputButton({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const scope = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
    if (!Recognition) {
      window.alert('Голосовой ввод не поддерживается этим браузером. Используйте актуальный Chrome, Edge или Яндекс Браузер.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'ru-RU';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) onChange(`${value}${value.trim() ? ' ' : ''}${transcript}`);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };
  return <button type="button" className={`voice-input-button ${listening ? 'is-listening' : ''}`} onClick={toggle} title={listening ? 'Остановить голосовой ввод' : 'Голосовой ввод'} aria-label={listening ? 'Остановить голосовой ввод' : 'Голосовой ввод'}>{listening ? <MicOff size={17}/> : <Mic size={17}/>}</button>;
}

function CourseEditorPreview({ course, onClose }: { course: Course; onClose: () => void }) {
  return (
    <aside className="course-editor-preview" aria-label="Предпросмотр курса">
      <header><div><small>Предпросмотр</small><strong>{course.title || 'Без названия'}</strong></div><button onClick={onClose} aria-label="Закрыть предпросмотр"><XCircle size={19}/></button></header>
      <div className="course-editor-preview__cover"><img src={course.cover} alt=""/><span>{course.level || 'Уровень не указан'}</span></div>
      <div className="course-editor-preview__summary"><p>{course.shortDescription || course.description || 'Добавьте описание курса.'}</p><div><Badge tone="green">{course.category || 'Без категории'}</Badge><strong>{formatMoney(course.price)}</strong></div></div>
      <div className="course-editor-preview__program">
        {course.modules.length ? course.modules.map((module, moduleIndex) => <details key={module.id} open={moduleIndex === 0}><summary><span>{moduleIndex + 1}</span><strong>{module.title || `Модуль ${moduleIndex + 1}`}</strong><small>{module.lessons.length} ур.</small></summary><div>{module.lessons.map((lesson, lessonIndex) => <p key={lesson.id}><span>{moduleIndex + 1}.{lessonIndex + 1}</span><strong>{lesson.title}</strong><small>{lesson.duration} мин</small></p>)}</div></details>) : <p className="course-editor-preview__empty">Добавьте модули и уроки, чтобы увидеть структуру курса.</p>}
      </div>
    </aside>
  );
}

function PublicationCheck({ ok, text }: { ok: boolean; text: string }) {
  return <div className={`publication-check ${ok ? 'ok' : ''}`}>{ok ? <CheckCircle2 size={18}/> : <XCircle size={18}/>}<span>{text}</span></div>;
}

function GraduationCapIcon() {
  return <div className="editor-empty-icon"><FileText size={28}/></div>;
}

function statusLabel(status: Course['status']) {
  return status === 'published' ? 'Опубликован' : status === 'moderation' ? 'На модерации' : status === 'revision' ? 'Нужна доработка' : status === 'archived' ? 'Архив' : 'Черновик';
}

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
