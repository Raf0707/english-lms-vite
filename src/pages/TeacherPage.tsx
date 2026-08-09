import {
  Archive,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  Eye,
  FileCheck2,
  GraduationCap,
  MoreHorizontal,
  Plus,
  Trash2,
  TrendingUp,
  Users,
  Video,
  WalletCards
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { CourseCoverImage } from '../components/CourseCoverImage';
import { StatCard } from '../components/StatCard';
import { Avatar, Badge, Button, Card, Modal } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import type { AssignmentSubmission, Course, Session, TutoringSlot } from '../types';
import { formatDate, formatMoney } from '../utils/format';
import { courseBackend, editorToCourse, saveCourseDraft } from '../services/courseBackend';
import { api, type BackendTeacherFinance, type BackendTeacherStudent } from '../services/api';

export function TeacherPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const setTab = (value: string) => setParams(value === 'overview' ? {} : { tab: value });
  const user = useAppStore((state) => state.user)!;
  const courses = useAppStore((state) => state.managedCourses);
  const managedCoursesStatus = useAppStore((state) => state.managedCoursesStatus);
  const loadManagedCourses = useAppStore((state) => state.loadManagedCourses);
  const sessions = useAppStore((state) => state.sessions);
  const assignmentSubmissions = useAppStore((state) => state.assignmentSubmissions);
  const teacherCourses = useMemo(() => courses.filter((course) => course.ownerId === user.id || course.instructorId === user.id || course.instructor === user.name), [courses, user.id, user.name]);
  const teacherSessions = useMemo(() => sessions.filter((session) => session.instructorId === user.id || session.instructor === user.name), [sessions, user.id, user.name]);
  const courseIds = useMemo(() => new Set(teacherCourses.map((course) => course.id)), [teacherCourses]);
  const teacherSubmissions = useMemo(() => assignmentSubmissions.filter((submission) => courseIds.has(submission.courseId)), [assignmentSubmissions, courseIds]);
  const [finance, setFinance] = useState<BackendTeacherFinance | null>(null);

  useEffect(() => {
    void loadManagedCourses().catch(() => undefined);
    void api.teachers.finance().then(setFinance).catch(() => setFinance(null));
  }, [loadManagedCourses, user.id]);

  return (
    <AppLayout title="Кабинет преподавателя" subtitle="Курсы, ученики, занятия и вознаграждение.">
      <div className="workspace-tabs">
        {[['overview', 'Обзор'], ['courses', 'Курсы'], ['students', 'Ученики'], ['reviews', 'Проверка заданий'], ['sessions', 'Занятия'], ['finance', 'Финансы']].map(([value, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}
      </div>

      {tab === 'overview' ? <TeacherOverview courses={teacherCourses} sessions={teacherSessions} submissions={teacherSubmissions} finance={finance} /> : null}
      {tab === 'courses' ? <TeacherCourses courses={teacherCourses} /> : null}
      {tab === 'students' ? <TeacherStudents /> : null}
      {tab === 'reviews' ? <TeacherReviewQueue submissions={teacherSubmissions} courses={teacherCourses} /> : null}
      {tab === 'sessions' ? <TeacherSessions courses={teacherCourses} sessions={teacherSessions} /> : null}
      {tab === 'finance' ? <TeacherFinance finance={finance} onRefresh={setFinance} /> : null}
    </AppLayout>
  );
}

function sessionTimeState(session: Session, now = Date.now()) {
  const start = +new Date(session.startAt);
  const end = start + session.duration * 60_000;
  const joinable = session.status !== 'cancelled' && now >= start && now <= end + 15 * 60_000;
  const upcoming = session.status !== 'cancelled' && now < start;
  const finished = session.status === 'completed' || now > end + 15 * 60_000;
  return { start, end, joinable, upcoming, finished };
}

function TeacherOverview({ courses, sessions, submissions, finance }: { courses: Course[]; sessions: Session[]; submissions: AssignmentSubmission[]; finance: BackendTeacherFinance | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const next = sessions.filter((item) => !sessionTimeState(item, now).finished).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0];
  const nextJoinable = next ? sessionTimeState(next, now).joinable : false;
  const pending = submissions.filter((item) => item.status === 'pending');
  return <>
    <div className="dashboard-stats teacher-stats">
      <StatCard icon={<Users size={22} />} label="Активные ученики" value={String(courses.reduce((sum, course) => sum + course.students, 0))} note="по вашим программам" />
      <StatCard icon={<FileCheck2 size={22} />} label="На проверке" value={String(pending.length)} note="ручные домашние задания" />
      <StatCard icon={<CalendarClock size={22} />} label="Будущих занятий" value={String(sessions.filter((item) => item.status === 'scheduled').length)} note="курсовые и отдельные" />
      <StatCard icon={<WalletCards size={22} />} label="Оплачено" value={formatMoney((finance?.currentMonthGrossMinor ?? 0) / 100)} note={`${finance?.currentMonthOrders ?? 0} оплаченных заказов за месяц`} />
    </div>
    <div className="teacher-overview-grid">
      <section>
        <div className="section-title-row"><div><span className="eyebrow">Курсы</span><h2>Активные программы</h2></div><Link to="/teacher/course/new"><Button size="sm" icon={<Plus size={16} />}>Создать курс</Button></Link></div>
        <div className="teacher-course-list">{courses.length ? courses.slice(0, 3).map((course) => <CourseRow course={course} key={course.id} />) : <Card className="editor-empty editor-empty--compact"><h3>У вас пока нет курсов</h3><p>Создайте программу, добавьте материалы и отправьте её администратору на модерацию.</p><Link to="/teacher/course/new"><Button>Создать курс</Button></Link></Card>}</div>
      </section>
      <aside>
        <Card className="review-queue-card"><header><div><span className="eyebrow">Задания</span><h2>Нужно проверить</h2></div><Badge tone={pending.length ? 'amber' : 'green'}>{pending.length}</Badge></header>{pending.length ? pending.slice(0,3).map((item) => <article key={item.id}><Avatar value={item.studentName.split(' ').map((part) => part[0]).join('').slice(0,2)} size="sm"/><div><strong>Домашнее задание</strong><span>{item.studentName}</span><small>{formatDate(item.submittedAt,true)}</small></div><Link to="/teacher?tab=reviews"><Button size="sm" variant="secondary">Проверить</Button></Link></article>) : <div className="review-empty"><CheckCircle2 size={24}/><span>Все ручные задания проверены</span></div>}<Link className="text-link" to="/teacher?tab=reviews">Открыть все <ArrowUpRight size={16}/></Link></Card>
        <Card className="teacher-next-session"><header><Video size={20}/><span>{nextJoinable ? 'Занятие идёт сейчас' : 'Следующее занятие'}</span></header>{next ? <><strong>{next.title}</strong><p>{formatDate(next.startAt, true)} · {next.attendees}/{next.maxAttendees} участников</p>{nextJoinable ? <Link to={`/app/video/${next.id}`}><Button>Открыть комнату</Button></Link> : <Button disabled variant="secondary">Комната откроется в начале занятия</Button>}</> : <p>Ближайших занятий пока нет.</p>}</Card>
      </aside>
    </div>
  </>;
}

function CourseRow({ course }: { course: Course }) {
  return <Card className="teacher-course-row"><CourseCoverImage course={course} mode="private" alt="" /><div><div><CourseStatusBadge course={course}/><span>{course.level}</span></div><h3>{course.title}</h3><p>{course.students} учеников · {course.moduleCount ?? course.modules.length} модулей · {course.lessonCount ?? course.modules.flatMap((m) => m.lessons).length} уроков</p>{course.moderationComment ? <small className="course-row-comment">Комментарий: {course.moderationComment}</small> : null}</div><div className="teacher-course-row__actions">{course.hasPublishedVersion && course.accessMode === 'managed' ? <Link to={`/teacher/course/${course.id}/access`} title="Управление доступом учеников"><Users size={17}/></Link> : null}<Link to={course.hasPublishedVersion && course.accessMode !== 'managed' ? `/course/${course.slug}` : `/teacher/course/${course.id}/edit`} title={course.hasPublishedVersion && course.accessMode !== 'managed' ? "Открыть опубликованную версию" : "Открыть редактор и предпросмотр"}><Eye size={17} /></Link><Link to={`/teacher/course/${course.id}/edit`} title="Редактировать"><Edit3 size={17} /></Link><CourseMenu course={course} compact /></div></Card>;
}

function CourseMenu({ course, compact = false }: { course: Course; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const addToast = useAppStore((state) => state.addToast);
  const loadManagedCourses = useAppStore((state) => state.loadManagedCourses);
  const user = useAppStore((state) => state.user)!;
  const navigate = useNavigate();

  const duplicate = async () => {
    try {
      const editor = await courseBackend.editor(course.id);
      const copy = editorToCourse(editor, { id: user.id, name: user.name, avatar: user.avatar });
      copy.id = '';
      copy.slug = '';
      copy.title = `${course.title} — копия`;
      copy.status = 'draft';
      copy.students = 0;
      copy.schedule = [];
      for (const module of copy.modules) {
        module.id = `copy-module-${crypto.randomUUID()}`;
        for (const lesson of module.lessons) {
          lesson.id = `copy-lesson-${crypto.randomUUID()}`;
          for (const block of lesson.blocks) block.id = `copy-block-${crypto.randomUUID()}`;
          if (lesson.test) {
            lesson.test.id = `copy-test-${crypto.randomUUID()}`;
            lesson.test.questions.forEach((question) => { question.id = `copy-question-${crypto.randomUUID()}`; });
          }
        }
      }
      const saved = await saveCourseDraft(copy);
      await loadManagedCourses();
      addToast({ title: 'Курс продублирован', text: 'Копия создана в PostgreSQL как новый черновик.', tone: 'success' });
      setOpen(false);
      navigate(`/teacher/course/${saved.courseId}/edit`);
    } catch (error) {
      addToast({ title: 'Не удалось создать копию', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    }
  };

  const requestDeletion = async () => {
    const reason = window.prompt(`Почему нужно удалить курс «${course.title}»?`, 'Курс больше не используется.');
    if (reason === null) return;
    try {
      await courseBackend.requestDeletion(course.id, reason || undefined);
      await loadManagedCourses();
      addToast({ title: 'Запрос отправлен', text: 'Администратор должен подтвердить архивирование курса.', tone: 'success' });
      setOpen(false);
    } catch (error) {
      addToast({ title: 'Не удалось отправить запрос', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    }
  };

  return <div className={compact ? 'course-more course-more--compact' : 'course-more'}>
    <button className="course-more__trigger" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((value) => !value); }} aria-label="Действия с курсом" aria-expanded={open}><MoreHorizontal size={18}/></button>
    {open ? <><button className="course-more__backdrop" onClick={() => setOpen(false)} aria-label="Закрыть меню"/><div className="course-more__menu">
      <Link to={`/teacher/course/${course.id}/edit`} onClick={() => setOpen(false)}><Edit3 size={15}/> Редактировать</Link>
      {course.hasPublishedVersion && course.accessMode === 'managed' ? <Link to={`/teacher/course/${course.id}/access`} onClick={() => setOpen(false)}><Users size={15}/> Доступ учеников</Link> : null}
      <Link to={course.hasPublishedVersion ? `/course/${course.slug}` : `/teacher/course/${course.id}/edit`} onClick={() => setOpen(false)}><Eye size={15}/> {course.hasPublishedVersion ? 'Опубликованная версия' : 'Предпросмотр в редакторе'}</Link>
      <button onClick={() => void duplicate()}><Copy size={15}/> Создать копию</button>
      {course.deletionStatus === 'requested' ? <button className="course-delete-requested" disabled><Trash2 size={15}/> Удаление ожидает администратора</button> : <button className="course-menu-danger" onClick={() => void requestDeletion()}><Trash2 size={15}/> Запросить удаление</button>}
    </div></> : null}
  </div>;
}

function TeacherCourses({ courses }: { courses: Course[] }) {
  return <div className="workspace-section"><div className="workspace-section__header"><div><h2>Мои курсы</h2><p>Создавайте уроки, видео, тесты, домашние задания и расписание. После готовности отправляйте курс на модерацию.</p></div><Link to="/teacher/course/new"><Button icon={<Plus size={17}/>}>Новый курс</Button></Link></div><div className="teacher-course-grid">{courses.map((course) => <Card className="teacher-course-tile" key={course.id}><CourseCoverImage course={course} mode="private" alt=""/><div><div><CourseStatusBadge course={course}/><CourseMenu course={course}/></div><h3>{course.title}</h3><p>{course.shortDescription}</p><dl><div><dt>Учеников</dt><dd>{course.students}</dd></div><div><dt>Уроков</dt><dd>{course.lessonCount ?? course.modules.flatMap((m)=>m.lessons).length}</dd></div><div><dt>Доступ</dt><dd>{course.accessMode === 'managed' ? 'По списку' : course.accessMode === 'public-free' ? 'Бесплатно' : formatMoney(course.price)}</dd></div></dl><div className="teacher-course-tile__footer"><Link to={`/teacher/course/${course.id}/edit`}><Button size="sm" icon={<Edit3 size={16}/>}>Редактировать</Button></Link>{course.hasPublishedVersion && course.accessMode === 'managed' ? <Link to={`/teacher/course/${course.id}/access`}><Button size="sm" variant="secondary" icon={<Users size={16}/>}>Доступ</Button></Link> : null}<Link to={course.hasPublishedVersion && course.accessMode !== 'managed' ? `/course/${course.slug}` : `/teacher/course/${course.id}/edit`}><Button size="sm" variant="ghost" icon={<Eye size={16}/>}>{course.hasPublishedVersion && course.accessMode !== 'managed' ? 'Открыть релиз' : 'Предпросмотр'}</Button></Link></div></div></Card>)}</div></div>;
}

function TeacherStudents() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [students, setStudents] = useState<BackendTeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useAppStore((state) => state.addToast);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      setStudents(await api.teachers.myStudents());
    } catch (error) {
      addToast({ title: 'Не удалось загрузить учеников', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const exportCsv = () => {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ['Ученик','Email','Телефон','Курс','Версия','Прогресс','Пройдено уроков','Всего уроков','Статус','Последняя активность'],
      ...students.map((item) => [item.name,item.email,item.phone,item.courseTitle,item.versionNumber,`${item.progress}%`,item.completedLessons,item.totalLessons,item.status,item.lastActivityAt])
    ];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `students-${new Date().toISOString().slice(0,10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <Card className="data-card teacher-students-card"><header><div><h2>Ученики</h2><p>Реальные зачисления, прогресс и последняя активность по вашим курсам.</p></div><div className="data-card__actions"><Button variant="secondary" onClick={() => void load()}>Обновить</Button><Button variant="secondary" onClick={exportCsv} disabled={!students.length}>Экспорт CSV</Button></div></header><div className="data-table-wrap"><table><thead><tr><th>Ученик</th><th>Курс</th><th>Прогресс</th><th>Последняя активность</th><th></th></tr></thead><tbody>
    {loading && !students.length ? <tr><td colSpan={5}>Загрузка учеников…</td></tr> : null}
    {!loading && !students.length ? <tr><td colSpan={5}>На ваших курсах пока нет учеников.</td></tr> : null}
    {students.map((item) => {
      const avatar = item.name.split(' ').map((part) => part[0]).join('').slice(0,2).toUpperCase() || 'U';
      return <tr key={item.enrollmentId}><td><div className="person-cell"><Avatar value={avatar} size="sm"/><span><strong>{item.name}</strong><small>{item.email}</small></span></div></td><td><strong>{item.courseTitle}</strong><small>Версия {item.versionNumber}</small></td><td><div className="mini-progress"><span><i style={{width:`${item.progress}%`}}/></span><strong>{item.progress}%</strong></div><small>{item.completedLessons}/{item.totalLessons} уроков</small></td><td>{formatDate(item.lastActivityAt,true)}</td><td><div className="admin-user-actions"><button className="admin-user-actions__trigger" onClick={() => setOpenMenu((current) => current === item.enrollmentId ? null : item.enrollmentId)} aria-label={`Действия: ${item.name}`}><MoreHorizontal size={18}/></button>{openMenu === item.enrollmentId ? <><button className="admin-user-actions__backdrop" onClick={() => setOpenMenu(null)} aria-label="Закрыть меню"/><div className="admin-user-actions__menu teacher-student-actions__menu"><button onClick={() => { window.alert(`${item.name}\n${item.email}\n${item.phone}\nКурс: ${item.courseTitle} v${item.versionNumber}\nПрогресс: ${item.progress}%\nУроки: ${item.completedLessons}/${item.totalLessons}\nПоследняя активность: ${formatDate(item.lastActivityAt,true)}`); setOpenMenu(null); }}><Eye size={16}/> Карточка ученика</button><button onClick={() => { setOpenMenu(null); navigate(`/course/${item.courseSlug}`); }}><GraduationCap size={16}/> Открыть курс</button><button onClick={() => { window.location.href = `mailto:${item.email}?subject=${encodeURIComponent('Занятия на платформе Lingua')}`; setOpenMenu(null); }}><Edit3 size={16}/> Написать ученику</button><button onClick={() => { addToast({ title: 'Прогресс ученика', text: `${item.name}: ${item.progress}% по курсу «${item.courseTitle}»`, tone: 'info' }); setOpenMenu(null); }}><TrendingUp size={16}/> Показать прогресс</button></div></> : null}</div></td></tr>;
    })}
  </tbody></table></div></Card>;
}

function TeacherReviewQueue({ submissions, courses }: { submissions: AssignmentSubmission[]; courses: Course[] }) {
  const gradeAssignment = useAppStore((state) => state.gradeAssignment);
  const pending = submissions.filter((item) => item.status === 'pending');
  const reviewed = submissions.filter((item) => item.status !== 'pending');
  const courseName = (id: string) => courses.find((course) => course.id === id)?.title ?? 'Курс';
  const review = (submission: AssignmentSubmission, status: 'approved' | 'revision') => {
    const scoreRaw = status === 'approved' ? window.prompt('Количество баллов:', String(submission.score ?? 10)) : undefined;
    if (status === 'approved' && scoreRaw === null) return;
    const feedback = window.prompt(status === 'approved' ? 'Комментарий ученику:' : 'Что нужно доработать:', status === 'approved' ? 'Хорошая работа.' : 'Уточните ответ и отправьте задание повторно.');
    if (feedback === null) return;
    gradeAssignment(submission.id, status, status === 'approved' ? Number(scoreRaw || 0) : undefined, feedback);
  };
  return <div className="workspace-section"><div className="workspace-section__header"><div><h2>Проверка домашних заданий</h2><p>Ручные задания, отправленные учениками, появляются здесь сразу после отправки.</p></div><Badge tone={pending.length ? 'amber' : 'green'}>{pending.length ? `${pending.length} ожидают` : 'Очередь пуста'}</Badge></div>{pending.length ? <div className="assignment-review-grid">{pending.map((submission) => <Card className="assignment-review-card" key={submission.id}><header><Avatar value={submission.studentName.split(' ').map((part) => part[0]).join('').slice(0,2)} size="sm"/><div><strong>{submission.studentName}</strong><span>{courseName(submission.courseId)} · {formatDate(submission.submittedAt,true)}</span></div><Badge tone="amber">На проверке</Badge></header>{submission.answer ? <div className="assignment-review-answer"><small>Ответ ученика</small><p>{submission.answer}</p></div> : null}{submission.fileName ? <div className="assignment-review-file"><FileCheck2 size={17}/><span>{submission.fileName}</span></div> : null}<footer><Button size="sm" variant="secondary" onClick={() => review(submission,'revision')}>Вернуть на доработку</Button><Button size="sm" icon={<CheckCircle2 size={15}/>} onClick={() => review(submission,'approved')}>Принять</Button></footer></Card>)}</div> : <Card className="editor-empty"><CheckCircle2 size={30}/><h3>Заданий на проверке нет</h3><p>Новые ручные задания появятся здесь после отправки учениками.</p></Card>}{reviewed.length ? <Card className="data-card assignment-review-history"><header><div><h2>Недавно проверенные</h2><p>История решений преподавателя.</p></div></header><div className="data-table-wrap"><table><thead><tr><th>Ученик</th><th>Курс</th><th>Статус</th><th>Баллы</th><th>Дата</th></tr></thead><tbody>{reviewed.slice(0,8).map((item)=><tr key={item.id}><td>{item.studentName}</td><td>{courseName(item.courseId)}</td><td><Badge tone={item.status==='approved'?'green':'red'}>{item.status==='approved'?'Принято':'На доработке'}</Badge></td><td>{item.score ?? '—'}</td><td>{formatDate(item.reviewedAt ?? item.submittedAt,true)}</td></tr>)}</tbody></table></div></Card> : null}</div>;
}

function TeacherSessions({ courses, sessions }: { courses: Course[]; sessions: Session[] }) {
  const user = useAppStore((state) => state.user)!;
  const slots = useAppStore((state) => state.tutoringSlots).filter((slot) => slot.instructorId === user.id);
  const removeSession = useAppStore((state) => state.removeSession);
  const removeTutoringSlot = useAppStore((state) => state.removeTutoringSlot);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TutoringSlot | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const createSession = () => { setEditingSession(null); setSessionModalOpen(true); };
  const editSession = (session: Session) => { setEditingSession(session); setSessionModalOpen(true); };
  const createSlot = () => { setEditingSlot(null); setSlotModalOpen(true); };
  const editSlot = (slot: TutoringSlot) => { setEditingSlot(slot); setSlotModalOpen(true); };
  const next = sessions.filter((item) => !sessionTimeState(item, now).finished).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0];
  const nextState = next ? sessionTimeState(next, now) : null;

  return <div className="workspace-section">
    <div className="workspace-section__header"><div><h2>Занятия</h2><p>Создавайте видеоконференции внутри курса или отдельные индивидуальные и групповые занятия. В момент начала активируется зелёная кнопка входа в комнату.</p></div><div className="teacher-session-actions"><Button variant="secondary" icon={<CalendarClock size={17}/>} onClick={createSlot}>Окно для записи</Button><Button icon={<Plus size={17}/>} onClick={createSession}>Создать занятие</Button></div></div>

    <Card className={`teacher-next-session teacher-next-session--sessions ${nextState?.joinable ? 'is-live' : ''}`}>
      <header><Video size={20}/><span>{nextState?.joinable ? 'Занятие идёт сейчас' : 'Следующее занятие'}</span></header>
      {next ? <><strong>{next.title}</strong><p>{formatDate(next.startAt, true)} · {next.attendees}/{next.maxAttendees} участников</p>{nextState?.joinable ? <Link to={`/app/video/${next.id}`}><Button>Открыть комнату</Button></Link> : <Button disabled variant="secondary">Подключиться можно с начала занятия</Button>}</> : <p>Ближайших занятий пока нет.</p>}
    </Card>

    <div className="teacher-session-grid">{sessions.map((session) => {
      const timing = sessionTimeState(session, now);
      return <Card key={session.id} className={`teacher-session-card ${timing.joinable ? 'teacher-session-card--live' : ''}`}>
        <div className="teacher-session-card__time"><strong>{new Date(session.startAt).getDate()}</strong><span>{new Intl.DateTimeFormat('ru-RU',{month:'short'}).format(new Date(session.startAt))}</span></div>
        <div><Badge tone={timing.finished ? 'neutral' : timing.joinable ? 'green' : session.type === 'individual' ? 'amber' : 'violet'}>{timing.finished ? 'Завершено' : timing.joinable ? 'Идёт сейчас' : session.type === 'individual' ? 'Индивидуальное' : session.type === 'group' ? 'Группа' : 'Вебинар'}</Badge><h3>{session.title}</h3><p>{formatDate(session.startAt,true)} · {session.duration} мин</p><span><Users size={15}/> {session.attendees}/{session.maxAttendees} участников {session.courseId ? '· по курсу' : '· отдельное занятие'}</span></div>
        <div className="teacher-session-card__actions"><Link className={`teacher-session-join ${timing.joinable ? 'is-active' : 'is-disabled'}`} to={timing.joinable ? `/app/video/${session.id}` : '#'} onClick={(event) => { if (!timing.joinable) event.preventDefault(); }} title={timing.joinable ? 'Подключиться к видеовстрече' : 'Кнопка активируется в момент начала занятия'}><Video size={16}/><span>{timing.joinable ? 'Подключиться' : timing.upcoming ? 'Ожидание' : 'Недоступно'}</span></Link><button className="muted-icon" title="Редактировать занятие" onClick={() => editSession(session)}><Edit3 size={17}/></button><button className="muted-icon" title="Удалить занятие" onClick={() => { if (window.confirm('Удалить это занятие из расписания?')) removeSession(session.id); }}><Trash2 size={16}/></button></div>
      </Card>;
    })}</div>
    <div className="workspace-section__header teacher-slots-heading"><div><h2>Окна для самостоятельной записи</h2><p>Эти слоты видны ученикам в каталоге преподавателей и не требуют покупки курса.</p></div></div>
    <div className="teacher-availability-grid">{slots.length ? slots.map((slot) => <Card className="teacher-availability-card" key={slot.id}><div><Badge tone={slot.type==='individual'?'amber':'violet'}>{slot.type==='individual'?'1-на-1':'Группа'}</Badge><strong>{formatDate(slot.startAt,true)}</strong><span><Clock3 size={15}/> {slot.duration} мин · {slot.attendees}/{slot.maxAttendees} мест</span></div><strong>{formatMoney(slot.price)}</strong><div className="teacher-availability-card__actions"><button title="Редактировать окно" onClick={() => editSlot(slot)}><Edit3 size={16}/></button><button title="Удалить окно" className="danger-icon" onClick={() => { if (window.confirm('Удалить это окно для записи?')) removeTutoringSlot(slot.id); }}><Trash2 size={16}/></button></div></Card>) : <Card className="editor-empty editor-empty--compact"><p>Свободных окон пока нет.</p></Card>}</div>
    <SessionModal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} courses={courses} initial={editingSession}/>
    <AvailabilityModal open={slotModalOpen} onClose={() => setSlotModalOpen(false)} initial={editingSlot}/>
  </div>;
}

function localDateValue(value: string | Date) {
  const d = value instanceof Date ? value : new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localTimeValue(value: string | Date) {
  const d = value instanceof Date ? value : new Date(value);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function scheduleBounds() {
  const min = new Date();
  min.setHours(0, 0, 0, 0);
  const max = new Date(min);
  max.setFullYear(max.getFullYear() + 3);
  return { min: localDateValue(min), max: localDateValue(max) };
}

function combineLocalDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Выберите корректные дату и время');
  const year = Number(date.slice(0, 4));
  const currentYear = new Date().getFullYear();
  if (year < currentYear || year > currentYear + 3) throw new Error(`Год должен быть от ${currentYear} до ${currentYear + 3}`);
  const result = new Date(`${date}T${time}:00`);
  if (!Number.isFinite(result.getTime()) || result.getTime() < Date.now() - 5 * 60_000) throw new Error('Нельзя назначить занятие в прошлом');
  return result.toISOString();
}

function DateTimePicker({ date, time, onDate, onTime }: { date: string; time: string; onDate: (value: string) => void; onTime: (value: string) => void }) {
  const bounds = scheduleBounds();
  const quick = (days: number) => {
    const next = new Date(Date.now() + days * 86400000);
    next.setMinutes(0, 0, 0);
    onDate(localDateValue(next));
    if (!time) onTime(localTimeValue(next));
  };
  return <div className="schedule-datetime-picker full"><div className="schedule-datetime-fields"><label><span>Дата</span><input type="date" min={bounds.min} max={bounds.max} value={date} onChange={(event) => onDate(event.target.value)} required/></label><label><span>Время</span><input type="time" step="300" value={time} onChange={(event) => onTime(event.target.value)} required/></label></div><div className="schedule-quick-dates"><span>Быстро:</span><button type="button" onClick={() => quick(1)}>Завтра</button><button type="button" onClick={() => quick(7)}>Через неделю</button><small>Можно планировать максимум на 3 года вперёд.</small></div></div>;
}

function SessionModal({ open, onClose, courses, initial }: { open: boolean; onClose: () => void; courses: Course[]; initial: Session | null }) {
  const user = useAppStore((state) => state.user)!;
  const addToast = useAppStore((state) => state.addToast);
  const addSession = useAppStore((state) => state.addSession);
  const updateSession = useAppStore((state) => state.updateSession);
  const [title, setTitle] = useState('Индивидуальное занятие');
  const [type, setType] = useState<Session['type']>('individual');
  const [courseId, setCourseId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(50);
  const [maxAttendees, setMaxAttendees] = useState(1);

  useEffect(() => {
    const d = initial ? new Date(initial.startAt) : new Date(Date.now() + 86400000);
    if (!initial) d.setMinutes(0, 0, 0);
    setTitle(initial?.title ?? 'Индивидуальное занятие');
    setType(initial?.type ?? 'individual');
    setCourseId(initial?.courseId ?? '');
    setDate(localDateValue(d));
    setTime(localTimeValue(d));
    setDuration(initial?.duration ?? 50);
    setMaxAttendees(initial?.maxAttendees ?? 1);
  }, [initial, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const startAt = combineLocalDateTime(date, time);
      const payload = { title, type, courseId: courseId || undefined, instructor: user.name, instructorId: user.id, startAt, duration, attendees: initial?.attendees ?? 0, maxAttendees: type === 'individual' ? 1 : maxAttendees, status: initial?.status ?? 'scheduled' as Session['status'], source: courseId ? 'course' as const : 'tutoring' as const };
      if (initial) await updateSession(initial.id, payload); else await addSession(payload);
      onClose();
    } catch (error) {
      addToast({ title: 'Проверьте дату и время', text: error instanceof Error ? error.message : 'Некорректная дата', tone: 'warning' });
    }
  };

  const formId = initial ? 'edit-session-form' : 'create-session-form';
  return <Modal open={open} onClose={onClose} title={initial ? 'Редактирование занятия' : 'Новое занятие'} actions={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" form={formId}>{initial ? 'Сохранить' : 'Создать'}</Button></>}><form id={formId} className="modal-form-grid" onSubmit={submit}><label className="full"><span>Название</span><input value={title} onChange={(event) => setTitle(event.target.value)} required/></label><label><span>Формат</span><select value={type} onChange={(event) => { const next = event.target.value as Session['type']; setType(next); if (next === 'individual') setMaxAttendees(1); else if (maxAttendees <= 1) setMaxAttendees(8); }}><option value="individual">Индивидуальное</option><option value="group">Групповое</option><option value="webinar">Вебинар</option></select></label><label><span>Курс</span><select value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Без курса / отдельная запись</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><DateTimePicker date={date} time={time} onDate={setDate} onTime={setTime}/><label><span>Длительность, мин</span><input type="number" min="15" max="720" value={duration} onChange={(event) => setDuration(Number(event.target.value))}/></label><label><span>Макс. участников</span><input type="number" min="1" max="50" value={maxAttendees} disabled={type === 'individual'} onChange={(event) => setMaxAttendees(Number(event.target.value))}/></label></form></Modal>;
}

function AvailabilityModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: TutoringSlot | null }) {
  const user = useAppStore((state) => state.user)!;
  const addToast = useAppStore((state) => state.addToast);
  const loadTutoringSlots = useAppStore((state) => state.loadTutoringSlots);
  const addTutoringSlot = useAppStore((state) => state.addTutoringSlot);
  const updateTutoringSlot = useAppStore((state) => state.updateTutoringSlot);
  const [type, setType] = useState<TutoringSlot['type']>('individual');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(50);
  const [price, setPrice] = useState(2900);
  const [maxAttendees, setMaxAttendees] = useState(1);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatCount, setRepeatCount] = useState(8);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = initial ? new Date(initial.startAt) : new Date(Date.now() + 86400000);
    if (!initial) d.setMinutes(0, 0, 0);
    setType(initial?.type ?? 'individual');
    setDate(localDateValue(d));
    setTime(localTimeValue(d));
    setDuration(initial?.duration ?? 50);
    setPrice(initial?.price ?? 2900);
    setMaxAttendees(initial?.maxAttendees ?? 1);
    setRepeatWeekly(false);
    setRepeatCount(8);
  }, [initial, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const startAt = combineLocalDateTime(date, time);
      const endAt = new Date(+new Date(startAt) + duration * 60000).toISOString();
      const maxParticipants = type === 'individual' ? 1 : maxAttendees;
      if (initial) {
        await updateTutoringSlot(initial.id, { type, startAt, duration, price, maxAttendees: maxParticipants });
      } else if (repeatWeekly) {
        const firstLocal = new Date(`${date}T${time}:00`);
        const occurrences = Array.from({ length: repeatCount }, (_, index) => {
          const occurrenceStart = new Date(firstLocal);
          occurrenceStart.setDate(firstLocal.getDate() + index * 7);
          return { startAt: occurrenceStart.toISOString(), endAt: new Date(occurrenceStart.getTime() + duration * 60000).toISOString() };
        });
        await api.schedule.createAvailabilitySeries({ type: type === 'group' ? 'GROUP' : 'INDIVIDUAL', startAt, endAt, priceMinor: Math.round(price * 100), currency: 'RUB', maxParticipants, count: repeatCount, intervalWeeks: 1, occurrences });
        await loadTutoringSlots(user.id);
        addToast({ title: 'Серия окон создана', text: `${repeatCount} занятий раз в неделю в ${time}. Ученики смогут оплатить несколько дат одним пакетом.`, tone: 'success' });
      } else {
        await addTutoringSlot({ instructorId: user.id, type, startAt, duration, price, maxAttendees: maxParticipants });
      }
      onClose();
    } catch (error) {
      addToast({ title: 'Не удалось сохранить расписание', text: error instanceof Error ? error.message : 'Проверьте дату и время', tone: 'warning' });
    } finally {
      setSaving(false);
    }
  };
  const formId = initial ? 'edit-slot-form' : 'create-slot-form';
  return <Modal open={open} onClose={onClose} title={initial ? 'Редактирование окна для записи' : 'Новое окно для записи'} actions={<><Button variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button><Button type="submit" form={formId} disabled={saving}>{saving ? 'Сохраняем…' : initial ? 'Сохранить' : repeatWeekly ? `Создать ${repeatCount} окон` : 'Опубликовать слот'}</Button></>}><form id={formId} className="modal-form-grid" onSubmit={submit}><label><span>Формат</span><select value={type} onChange={(event)=>{const next=event.target.value as TutoringSlot['type'];setType(next);if(next==='individual')setMaxAttendees(1);else if(maxAttendees<=1)setMaxAttendees(8);}}><option value="individual">Индивидуальное</option><option value="group">Групповое</option></select></label><div/><DateTimePicker date={date} time={time} onDate={setDate} onTime={setTime}/><label><span>Длительность, мин</span><input type="number" min="15" max="720" value={duration} onChange={(event)=>setDuration(Number(event.target.value))}/></label><label><span>Цена, ₽</span><input type="number" min="0" value={price} onChange={(event)=>setPrice(Number(event.target.value))}/></label><label><span>Максимум участников</span><input type="number" min="1" max="50" value={maxAttendees} disabled={type==='individual'} onChange={(event)=>setMaxAttendees(Number(event.target.value))}/></label>{!initial ? <div className="schedule-repeat-box full"><label className="schedule-repeat-toggle"><input type="checkbox" checked={repeatWeekly} onChange={(event) => setRepeatWeekly(event.target.checked)}/><span><strong>Повторять каждую неделю</strong><small>Создадим сразу несколько одинаковых свободных окон. Это удобно для постоянных учеников.</small></span></label>{repeatWeekly ? <label><span>Количество недель</span><input type="number" min="2" max="52" value={repeatCount} onChange={(event) => setRepeatCount(Math.max(2, Math.min(52, Number(event.target.value))))}/></label> : null}</div> : null}{initial?.booked ? <small className="full slot-booked-warning">Это окно уже было забронировано. Изменение времени должно быть согласовано с учеником.</small> : null}</form></Modal>;
}

function TeacherFinance({ finance, onRefresh }: { finance: BackendTeacherFinance | null; onRefresh: (value: BackendTeacherFinance | null) => void }) {
  const [loading, setLoading] = useState(false);
  const addToast = useAppStore((state) => state.addToast);

  const refresh = async () => {
    setLoading(true);
    try {
      onRefresh(await api.teachers.finance());
    } catch (error) {
      addToast({ title: 'Не удалось обновить финансы', text: error instanceof Error ? error.message : 'Попробуйте ещё раз', tone: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!finance) return;
    const rows = [
      ['Номер заказа', 'Дата', 'Ученик', 'Тип', 'Наименование', 'Сумма', 'Валюта'],
      ...finance.recent.map((item) => [item.number, new Date(item.date).toLocaleString('ru-RU'), item.student, item.productType, item.title, (item.amountMinor / 100).toFixed(2), item.currency])
    ];
    const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + rows.map((row) => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `teacher-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <>
    <div className="finance-hero-card">
      <div><span className="eyebrow eyebrow--light">Текущий месяц</span><h2>{formatMoney((finance?.currentMonthGrossMinor ?? 0) / 100)}</h2><p>Фактически оплаченные позиции по вашим курсам и занятиям.</p></div>
      <div><span>Оплаченных заказов</span><strong>{finance?.currentMonthOrders ?? 0}</strong><small><TrendingUp size={15}/> текущий месяц</small></div>
      <div><span>Весь оборот</span><strong>{formatMoney((finance?.grossMinor ?? 0) / 100)}</strong><small>{finance?.paidOrders ?? 0} заказов за всё время</small></div>
      <div className="finance-hero-actions"><Button variant="secondary" onClick={() => void refresh()} disabled={loading}>{loading ? 'Обновляем…' : 'Обновить'}</Button><Button variant="secondary" onClick={download} disabled={!finance?.recent.length}>Скачать CSV</Button></div>
    </div>
    <Card className="data-card"><header><div><h2>Последние оплаченные позиции</h2><p>Данные формируются из реальных оплаченных заказов. Процент вознаграждения не подставляется, пока не задана договорная модель выплат.</p></div></header><div className="data-table-wrap"><table><thead><tr><th>Заказ</th><th>Дата</th><th>Ученик</th><th>Что оплачено</th><th>Сумма</th></tr></thead><tbody>{finance?.recent.length ? finance.recent.map((row) => <tr key={`${row.orderId}-${row.title}`}><td><strong>{row.number}</strong></td><td>{formatDate(row.date, true)}</td><td>{row.student}</td><td><strong>{row.title}</strong><small className="table-cell-note">{row.productType === 'course' ? 'Курс' : row.productType === 'booking_series' ? 'Пакет занятий' : 'Занятие'}</small></td><td><strong>{formatMoney(row.amountMinor / 100)}</strong></td></tr>) : <tr><td colSpan={5}>Оплаченных позиций пока нет.</td></tr>}</tbody></table></div></Card>
  </>;
}

function CourseStatusBadge({ course }: { course: Course }) {
  if (course.deletionStatus === 'requested') return <Badge tone="red">Удаление на модерации</Badge>;
  const status = course.status ?? 'draft';
  const label = status === 'published' ? 'Опубликован' : status === 'moderation' ? 'На модерации' : status === 'revision' ? 'На доработке' : status === 'archived' ? 'Архив' : 'Черновик';
  return <Badge tone={status === 'published' ? 'green' : status === 'moderation' ? 'amber' : status === 'revision' ? 'red' : 'neutral'}>{label}</Badge>;
}
