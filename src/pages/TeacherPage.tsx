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
import { StatCard } from '../components/StatCard';
import { Avatar, Badge, Button, Card, Modal } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import type { AssignmentSubmission, Course, Session, TutoringSlot } from '../types';
import { formatDate, formatMoney } from '../utils/format';

export function TeacherPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const setTab = (value: string) => setParams(value === 'overview' ? {} : { tab: value });
  const user = useAppStore((state) => state.user)!;
  const courses = useAppStore((state) => state.courses);
  const sessions = useAppStore((state) => state.sessions);
  const assignmentSubmissions = useAppStore((state) => state.assignmentSubmissions);
  const teacherCourses = useMemo(() => courses.filter((course) => course.ownerId === user.id || course.instructorId === user.id || course.instructor === user.name), [courses, user.id, user.name]);
  const teacherSessions = useMemo(() => sessions.filter((session) => session.instructorId === user.id || session.instructor === user.name), [sessions, user.id, user.name]);
  const courseIds = useMemo(() => new Set(teacherCourses.map((course) => course.id)), [teacherCourses]);
  const teacherSubmissions = useMemo(() => assignmentSubmissions.filter((submission) => courseIds.has(submission.courseId)), [assignmentSubmissions, courseIds]);

  return (
    <AppLayout title="Кабинет преподавателя" subtitle="Курсы, ученики, занятия и вознаграждение.">
      <div className="workspace-tabs">
        {[['overview', 'Обзор'], ['courses', 'Курсы'], ['students', 'Ученики'], ['reviews', 'Проверка заданий'], ['sessions', 'Занятия'], ['finance', 'Финансы']].map(([value, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}
      </div>

      {tab === 'overview' ? <TeacherOverview courses={teacherCourses} sessions={teacherSessions} submissions={teacherSubmissions} /> : null}
      {tab === 'courses' ? <TeacherCourses courses={teacherCourses} /> : null}
      {tab === 'students' ? <TeacherStudents /> : null}
      {tab === 'reviews' ? <TeacherReviewQueue submissions={teacherSubmissions} courses={teacherCourses} /> : null}
      {tab === 'sessions' ? <TeacherSessions courses={teacherCourses} sessions={teacherSessions} /> : null}
      {tab === 'finance' ? <TeacherFinance /> : null}
    </AppLayout>
  );
}

function TeacherOverview({ courses, sessions, submissions }: { courses: Course[]; sessions: Session[]; submissions: AssignmentSubmission[] }) {
  const next = sessions.filter((item) => item.status === 'scheduled').sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0];
  const pending = submissions.filter((item) => item.status === 'pending');
  return <>
    <div className="dashboard-stats teacher-stats">
      <StatCard icon={<Users size={22} />} label="Активные ученики" value={String(courses.reduce((sum, course) => sum + course.students, 0))} note="по вашим программам" />
      <StatCard icon={<FileCheck2 size={22} />} label="На проверке" value={String(pending.length)} note="ручные домашние задания" />
      <StatCard icon={<CalendarClock size={22} />} label="Будущих занятий" value={String(sessions.filter((item) => item.status === 'scheduled').length)} note="курсовые и отдельные" />
      <StatCard icon={<WalletCards size={22} />} label="К начислению" value="184 650 ₽" note="за текущий период" />
    </div>
    <div className="teacher-overview-grid">
      <section>
        <div className="section-title-row"><div><span className="eyebrow">Курсы</span><h2>Активные программы</h2></div><Link to="/teacher/course/new"><Button size="sm" icon={<Plus size={16} />}>Создать курс</Button></Link></div>
        <div className="teacher-course-list">{courses.length ? courses.slice(0, 3).map((course) => <CourseRow course={course} key={course.id} />) : <Card className="editor-empty editor-empty--compact"><h3>У вас пока нет курсов</h3><p>Создайте программу, добавьте материалы и отправьте её администратору на модерацию.</p><Link to="/teacher/course/new"><Button>Создать курс</Button></Link></Card>}</div>
      </section>
      <aside>
        <Card className="review-queue-card"><header><div><span className="eyebrow">Задания</span><h2>Нужно проверить</h2></div><Badge tone={pending.length ? 'amber' : 'green'}>{pending.length}</Badge></header>{pending.length ? pending.slice(0,3).map((item) => <article key={item.id}><Avatar value={item.studentName.split(' ').map((part) => part[0]).join('').slice(0,2)} size="sm"/><div><strong>Домашнее задание</strong><span>{item.studentName}</span><small>{formatDate(item.submittedAt,true)}</small></div><Link to="/teacher?tab=reviews"><Button size="sm" variant="secondary">Проверить</Button></Link></article>) : <div className="review-empty"><CheckCircle2 size={24}/><span>Все ручные задания проверены</span></div>}<Link className="text-link" to="/teacher?tab=reviews">Открыть все <ArrowUpRight size={16}/></Link></Card>
        <Card className="teacher-next-session"><header><Video size={20}/><span>Следующее занятие</span></header>{next ? <><strong>{next.title}</strong><p>{formatDate(next.startAt, true)} · {next.attendees}/{next.maxAttendees} участников</p><div className="avatar-stack">{['АВ','МК','ИП','+5'].map((item) => <Avatar key={item} value={item} size="sm" />)}</div><Link to={`/app/video/${next.id}`}><Button>Открыть комнату</Button></Link></> : <p>Ближайших занятий пока нет.</p>}</Card>
      </aside>
    </div>
  </>;
}

function CourseRow({ course }: { course: Course }) {
  return <Card className="teacher-course-row"><img src={course.cover} alt="" /><div><div><CourseStatusBadge course={course}/><span>{course.level}</span></div><h3>{course.title}</h3><p>{course.students} учеников · {course.modules.length} модулей · {course.modules.flatMap((m) => m.lessons).length} уроков</p>{course.moderationComment ? <small className="course-row-comment">Комментарий: {course.moderationComment}</small> : null}</div><div className="teacher-course-row__actions"><Link to={`/course/${course.slug}`} title="Предпросмотр"><Eye size={17} /></Link><Link to={`/teacher/course/${course.id}/edit`} title="Редактировать"><Edit3 size={17} /></Link><CourseMenu course={course} compact /></div></Card>;
}

function CourseMenu({ course, compact = false }: { course: Course; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const upsertCourse = useAppStore((state) => state.upsertCourse);
  const setCourseStatus = useAppStore((state) => state.setCourseStatus);
  const addToast = useAppStore((state) => state.addToast);
  const navigate = useNavigate();

  const duplicate = () => {
    const copy: Course = structuredClone(course);
    copy.id = '';
    copy.slug = '';
    copy.title = `${course.title} — копия`;
    copy.status = 'draft';
    copy.students = 0;
    copy.rating = 5;
    copy.reviews = 0;
    copy.schedule = [];
    const record = upsertCourse(copy);
    addToast({ title: 'Курс продублирован', text: 'Создан новый черновик курса.', tone: 'success' });
    setOpen(false);
    navigate(`/teacher/course/${record.id}/edit`);
  };

  return <div className={compact ? 'course-more course-more--compact' : 'course-more'}>
    <button className="course-more__trigger" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((value) => !value); }} aria-label="Действия с курсом" aria-expanded={open}><MoreHorizontal size={18}/></button>
    {open ? <><button className="course-more__backdrop" onClick={() => setOpen(false)} aria-label="Закрыть меню"/><div className="course-more__menu">
      <Link to={`/teacher/course/${course.id}/edit`} onClick={() => setOpen(false)}><Edit3 size={15}/> Редактировать</Link>
      <Link to={`/course/${course.slug}`} onClick={() => setOpen(false)}><Eye size={15}/> Предпросмотр</Link>
      <button onClick={duplicate}><Copy size={15}/> Создать копию</button>
      <button onClick={() => { setCourseStatus(course.id, course.status === 'archived' ? 'draft' : 'archived'); setOpen(false); }}><Archive size={15}/> {course.status === 'archived' ? 'Вернуть в черновики' : 'В архив'}</button>
    </div></> : null}
  </div>;
}

function TeacherCourses({ courses }: { courses: Course[] }) {
  return <div className="workspace-section"><div className="workspace-section__header"><div><h2>Мои курсы</h2><p>Создавайте уроки, видео, тесты, домашние задания и расписание. После готовности отправляйте курс на модерацию.</p></div><Link to="/teacher/course/new"><Button icon={<Plus size={17}/>}>Новый курс</Button></Link></div><div className="teacher-course-grid">{courses.map((course) => <Card className="teacher-course-tile" key={course.id}><img src={course.cover} alt=""/><div><div><CourseStatusBadge course={course}/><CourseMenu course={course}/></div><h3>{course.title}</h3><p>{course.shortDescription}</p><dl><div><dt>Учеников</dt><dd>{course.students}</dd></div><div><dt>Уроков</dt><dd>{course.modules.flatMap((m)=>m.lessons).length}</dd></div><div><dt>Цена</dt><dd>{formatMoney(course.price)}</dd></div></dl><div className="teacher-course-tile__footer"><Link to={`/teacher/course/${course.id}/edit`}><Button size="sm" icon={<Edit3 size={16}/>}>Редактировать</Button></Link><Link to={`/course/${course.slug}`}><Button size="sm" variant="ghost" icon={<Eye size={16}/>}>Предпросмотр</Button></Link></div></div></Card>)}</div></div>;
}

function TeacherStudents() {
  const students = [
    ['Анна Воронцова','student@lingua.demo','Английский для жизни','28%','сегодня','АВ'],
    ['Михаил Кузнецов','m.k@example.com','Английский для жизни','64%','вчера','МК'],
    ['Ирина Петрова','irina@example.com','Английский для путешествий','82%','2 дня назад','ИП'],
    ['Дарья Смирнова','daria@example.com','Английский для жизни','41%','3 дня назад','ДС']
  ];
  return <Card className="data-card"><header><div><h2>Ученики</h2><p>Прогресс и последняя активность по назначенным курсам.</p></div><Button variant="secondary">Экспорт CSV</Button></header><div className="data-table-wrap"><table><thead><tr><th>Ученик</th><th>Курс</th><th>Прогресс</th><th>Последняя активность</th><th></th></tr></thead><tbody>{students.map(([name,email,course,progress,last,avatar]) => <tr key={email}><td><div className="person-cell"><Avatar value={avatar} size="sm"/><span><strong>{name}</strong><small>{email}</small></span></div></td><td>{course}</td><td><div className="mini-progress"><span><i style={{width:progress}}/></span><strong>{progress}</strong></div></td><td>{last}</td><td><button><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table></div></Card>;
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

  const createSession = () => { setEditingSession(null); setSessionModalOpen(true); };
  const editSession = (session: Session) => { setEditingSession(session); setSessionModalOpen(true); };
  const createSlot = () => { setEditingSlot(null); setSlotModalOpen(true); };
  const editSlot = (slot: TutoringSlot) => { setEditingSlot(slot); setSlotModalOpen(true); };

  return <div className="workspace-section">
    <div className="workspace-section__header"><div><h2>Занятия</h2><p>Создавайте видеоконференции внутри курса или отдельные индивидуальные и групповые занятия. Уже созданные события можно редактировать.</p></div><div className="teacher-session-actions"><Button variant="secondary" icon={<CalendarClock size={17}/>} onClick={createSlot}>Окно для записи</Button><Button icon={<Plus size={17}/>} onClick={createSession}>Создать занятие</Button></div></div>
    <div className="teacher-session-grid">{sessions.map((session) => <Card key={session.id} className="teacher-session-card"><div className="teacher-session-card__time"><strong>{new Date(session.startAt).getDate()}</strong><span>{new Intl.DateTimeFormat('ru-RU',{month:'short'}).format(new Date(session.startAt))}</span></div><div><Badge tone={session.status === 'completed' ? 'neutral' : session.type === 'individual' ? 'amber' : 'violet'}>{session.status === 'completed' ? 'Завершено' : session.type === 'individual' ? 'Индивидуальное' : session.type === 'group' ? 'Группа' : 'Вебинар'}</Badge><h3>{session.title}</h3><p>{formatDate(session.startAt,true)} · {session.duration} мин</p><span><Users size={15}/> {session.attendees}/{session.maxAttendees} участников {session.courseId ? '· по курсу' : '· отдельное занятие'}</span></div><div><button title="Редактировать занятие" onClick={() => editSession(session)}><Edit3 size={17}/></button><button className="danger-icon" title="Удалить занятие" onClick={() => { if (window.confirm('Удалить это занятие из расписания?')) removeSession(session.id); }}><Trash2 size={16}/></button></div></Card>)}</div>
    <div className="workspace-section__header teacher-slots-heading"><div><h2>Окна для самостоятельной записи</h2><p>Эти слоты видны ученикам в каталоге преподавателей и не требуют покупки курса.</p></div></div>
    <div className="teacher-availability-grid">{slots.length ? slots.map((slot) => <Card className="teacher-availability-card" key={slot.id}><div><Badge tone={slot.type==='individual'?'amber':'violet'}>{slot.type==='individual'?'1-на-1':'Группа'}</Badge><strong>{formatDate(slot.startAt,true)}</strong><span><Clock3 size={15}/> {slot.duration} мин · {slot.attendees}/{slot.maxAttendees} мест</span></div><strong>{formatMoney(slot.price)}</strong><div className="teacher-availability-card__actions"><button title="Редактировать окно" onClick={() => editSlot(slot)}><Edit3 size={16}/></button><button title="Удалить окно" className="danger-icon" onClick={() => { if (window.confirm('Удалить это окно для записи?')) removeTutoringSlot(slot.id); }}><Trash2 size={16}/></button></div></Card>) : <Card className="editor-empty editor-empty--compact"><p>Свободных окон пока нет.</p></Card>}</div>
    <SessionModal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} courses={courses} initial={editingSession}/>
    <AvailabilityModal open={slotModalOpen} onClose={() => setSlotModalOpen(false)} initial={editingSlot}/>
  </div>;
}

function toLocalInput(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function SessionModal({ open, onClose, courses, initial }: { open: boolean; onClose: () => void; courses: Course[]; initial: Session | null }) {
  const user = useAppStore((state) => state.user)!;
  const addSession = useAppStore((state) => state.addSession);
  const updateSession = useAppStore((state) => state.updateSession);
  const [title, setTitle] = useState('Индивидуальное занятие');
  const [type, setType] = useState<Session['type']>('individual');
  const [courseId, setCourseId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [duration, setDuration] = useState(50);
  const [maxAttendees, setMaxAttendees] = useState(1);

  useEffect(() => {
    const d = new Date(Date.now() + 86400000); d.setMinutes(0,0,0);
    setTitle(initial?.title ?? 'Индивидуальное занятие');
    setType(initial?.type ?? 'individual');
    setCourseId(initial?.courseId ?? '');
    setStartAt(initial ? toLocalInput(initial.startAt) : toLocalInput(d.toISOString()));
    setDuration(initial?.duration ?? 50);
    setMaxAttendees(initial?.maxAttendees ?? 1);
  }, [initial, open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload = { title, type, courseId: courseId || undefined, instructor: user.name, instructorId: user.id, startAt: new Date(startAt).toISOString(), duration, attendees: initial?.attendees ?? 0, maxAttendees: type === 'individual' ? 1 : maxAttendees, status: initial?.status ?? 'scheduled' as Session['status'], source: courseId ? 'course' as const : 'tutoring' as const };
    if (initial) updateSession(initial.id, payload); else addSession(payload);
    onClose();
  };

  const formId = initial ? 'edit-session-form' : 'create-session-form';
  return <Modal open={open} onClose={onClose} title={initial ? 'Редактирование занятия' : 'Новое занятие'} actions={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" form={formId}>{initial ? 'Сохранить' : 'Создать'}</Button></>}><form id={formId} className="modal-form-grid" onSubmit={submit}><label className="full"><span>Название</span><input value={title} onChange={(event) => setTitle(event.target.value)} required/></label><label><span>Формат</span><select value={type} onChange={(event) => { const next = event.target.value as Session['type']; setType(next); if (next === 'individual') setMaxAttendees(1); else if (maxAttendees <= 1) setMaxAttendees(8); }}><option value="individual">Индивидуальное</option><option value="group">Групповое</option><option value="webinar">Вебинар</option></select></label><label><span>Курс</span><select value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Без курса / отдельная запись</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label><span>Дата и время</span><input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required/></label><label><span>Длительность, мин</span><input type="number" min="15" value={duration} onChange={(event) => setDuration(Number(event.target.value))}/></label><label><span>Макс. участников</span><input type="number" min="1" max="50" value={maxAttendees} disabled={type === 'individual'} onChange={(event) => setMaxAttendees(Number(event.target.value))}/></label></form></Modal>;
}

function AvailabilityModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: TutoringSlot | null }) {
  const user = useAppStore((state) => state.user)!;
  const addTutoringSlot = useAppStore((state) => state.addTutoringSlot);
  const updateTutoringSlot = useAppStore((state) => state.updateTutoringSlot);
  const [type, setType] = useState<TutoringSlot['type']>('individual');
  const [startAt, setStartAt] = useState('');
  const [duration, setDuration] = useState(50);
  const [price, setPrice] = useState(2900);
  const [maxAttendees, setMaxAttendees] = useState(1);

  useEffect(() => {
    const d = new Date(Date.now() + 86400000); d.setMinutes(0,0,0);
    setType(initial?.type ?? 'individual');
    setStartAt(initial ? toLocalInput(initial.startAt) : toLocalInput(d.toISOString()));
    setDuration(initial?.duration ?? 50);
    setPrice(initial?.price ?? 2900);
    setMaxAttendees(initial?.maxAttendees ?? 1);
  }, [initial, open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const data = { type, startAt: new Date(startAt).toISOString(), duration, price, maxAttendees: type === 'individual' ? 1 : maxAttendees };
    if (initial) updateTutoringSlot(initial.id, data); else addTutoringSlot({ instructorId: user.id, ...data });
    onClose();
  };
  const formId = initial ? 'edit-slot-form' : 'create-slot-form';
  return <Modal open={open} onClose={onClose} title={initial ? 'Редактирование окна для записи' : 'Новое окно для записи'} actions={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" form={formId}>{initial ? 'Сохранить' : 'Опубликовать слот'}</Button></>}><form id={formId} className="modal-form-grid" onSubmit={submit}><label><span>Формат</span><select value={type} onChange={(event)=>{const next=event.target.value as TutoringSlot['type'];setType(next);if(next==='individual')setMaxAttendees(1);else if(maxAttendees<=1)setMaxAttendees(8);}}><option value="individual">Индивидуальное</option><option value="group">Групповое</option></select></label><label><span>Дата и время</span><input type="datetime-local" value={startAt} onChange={(event)=>setStartAt(event.target.value)} required/></label><label><span>Длительность, мин</span><input type="number" min="15" value={duration} onChange={(event)=>setDuration(Number(event.target.value))}/></label><label><span>Цена, ₽</span><input type="number" min="0" value={price} onChange={(event)=>setPrice(Number(event.target.value))}/></label><label><span>Максимум участников</span><input type="number" min="1" max="50" value={maxAttendees} disabled={type==='individual'} onChange={(event)=>setMaxAttendees(Number(event.target.value))}/></label>{initial?.booked ? <small className="full slot-booked-warning">Это окно уже было забронировано. Изменение времени должно быть согласовано с учеником.</small> : null}</form></Modal>;
}

function TeacherFinance() {
  const rows = [
    ['Июль 2026','82 продажи','369 300 ₽','184 650 ₽','К выплате'],
    ['Июнь 2026','74 продажи','341 800 ₽','170 900 ₽','Выплачено'],
    ['Май 2026','69 продаж','318 600 ₽','159 300 ₽','Выплачено']
  ];
  return <><div className="finance-hero-card"><div><span className="eyebrow eyebrow--light">Текущий период</span><h2>{formatMoney(184650)}</h2><p>Предварительное вознаграждение за июль</p></div><div><span>Продажи</span><strong>82</strong><small><TrendingUp size={15}/> +10,8%</small></div><div><span>Ваша доля</span><strong>50%</strong><small>по действующему договору</small></div><Button variant="secondary">Скачать отчёт</Button></div><Card className="data-card"><header><div><h2>История начислений</h2><p>Расчёты, возвраты и статусы выплат.</p></div></header><div className="data-table-wrap"><table><thead><tr><th>Период</th><th>Продажи</th><th>База расчёта</th><th>Вознаграждение</th><th>Статус</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell,index) => <td key={cell}>{index===4?<Badge tone={cell==='Выплачено'?'green':'amber'}>{cell}</Badge>:<strong>{cell}</strong>}</td>)}</tr>)}</tbody></table></div></Card></>;
}

function CourseStatusBadge({ course }: { course: Course }) {
  const status = course.status ?? 'draft';
  const label = status === 'published' ? 'Опубликован' : status === 'moderation' ? 'На модерации' : status === 'revision' ? 'На доработке' : status === 'archived' ? 'Архив' : 'Черновик';
  return <Badge tone={status === 'published' ? 'green' : status === 'moderation' ? 'amber' : status === 'revision' ? 'red' : 'neutral'}>{label}</Badge>;
}
