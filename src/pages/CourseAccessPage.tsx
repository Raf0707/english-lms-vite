import { Archive, ArrowLeft, Clock3, History, LockKeyhole, RefreshCw, RotateCcw, Search, ShieldCheck, UserPlus, Users, XCircle } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Avatar, Badge, Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { courseBackend, type BackendCourseAccess, type BackendCourseAccessHistory } from '../services/courseBackend';
import { formatDate } from '../utils/format';

function personName(item: BackendCourseAccess) {
  const profile = item.user.profile;
  return profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || item.user.email;
}
function historyPersonName(item: BackendCourseAccessHistory['student'] | BackendCourseAccessHistory['actor']) {
  const profile = item.profile;
  return profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || item.email;
}

function accessDateBounds() {
  const now = new Date();
  const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const max = new Date(now); max.setFullYear(max.getFullYear() + 3);
  return { min: local(now), max: local(max) };
}

function progress(item: BackendCourseAccess) {
  const rows = item.lessonProgress ?? [];
  const total = item.courseVersion?._count?.lessons ?? 0;
  if (!total) return 0;
  const done = rows.filter((entry) => entry.status === 'COMPLETED').length;
  return Math.min(100, Math.round((done / total) * 100));
}

const historyLabels: Record<BackendCourseAccessHistory['action'], string> = {
  GRANTED: 'Доступ открыт',
  REVOKED: 'Доступ закрыт',
  RESTORED: 'Доступ восстановлен',
  ARCHIVED: 'Убран из рабочего списка'
};

export function CourseAccessPage() {
  const { courseId = '' } = useParams();
  const courses = useAppStore((state) => state.managedCourses);
  const loadManagedCourses = useAppStore((state) => state.loadManagedCourses);
  const addToast = useAppStore((state) => state.addToast);
  const user = useAppStore((state) => state.user)!;
  const isAdmin = user.role === 'admin';
  const course = useMemo(() => courses.find((item) => item.id === courseId), [courses, courseId]);
  const [items, setItems] = useState<BackendCourseAccess[]>([]);
  const [history, setHistory] = useState<BackendCourseAccessHistory[]>([]);
  const [identifier, setIdentifier] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyStudentId, setBusyStudentId] = useState('');

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [accessRows, historyRows] = await Promise.all([
        isAdmin ? courseBackend.adminAccessList(courseId) : courseBackend.accessList(courseId),
        isAdmin ? courseBackend.adminAccessHistory(courseId) : courseBackend.accessHistory(courseId)
      ]);
      setItems(accessRows);
      setHistory(historyRows);
    } catch (error) {
      addToast({ title: 'Не удалось загрузить доступы', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!courses.length) void loadManagedCourses().catch(() => undefined);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const grant = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim()) return;
    setBusy(true);
    try {
      if (isAdmin) await courseBackend.adminGrantAccess(courseId, identifier.trim(), expiresAt ? new Date(expiresAt).toISOString() : undefined);
      else await courseBackend.grantAccess(courseId, identifier.trim(), expiresAt ? new Date(expiresAt).toISOString() : undefined);
      setIdentifier('');
      setExpiresAt('');
      await Promise.all([load(), loadManagedCourses()]);
      addToast({ title: 'Доступ открыт', text: 'Ученик увидит курс в разделе «Моё обучение». Если доступ раньше закрывался, прогресс продолжится.', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось открыть курс', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (item: BackendCourseAccess) => {
    if (!window.confirm(`Закрыть доступ ученику ${personName(item)}? Прогресс, работы и тесты сохранятся.`)) return;
    setBusyStudentId(item.userId);
    try {
      if (isAdmin) await courseBackend.adminRevokeAccess(courseId, item.userId);
      else await courseBackend.revokeAccess(courseId, item.userId);
      await Promise.all([load(), loadManagedCourses()]);
      addToast({ title: 'Доступ закрыт', text: 'Ученик больше не видит курс как активный, но история обучения сохранена и доступ можно восстановить.', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось закрыть доступ', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally { setBusyStudentId(''); }
  };

  const restore = async (item: BackendCourseAccess) => {
    setBusyStudentId(item.userId);
    try {
      if (isAdmin) await courseBackend.adminRestoreAccess(courseId, item.userId);
      else await courseBackend.restoreAccess(courseId, item.userId);
      await Promise.all([load(), loadManagedCourses()]);
      addToast({ title: 'Доступ восстановлен', text: 'Ученик продолжит обучение с сохранённого прогресса.', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось восстановить доступ', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally { setBusyStudentId(''); }
  };

  const archiveClosed = async (item: BackendCourseAccess) => {
    if (!window.confirm(`Убрать закрытый доступ ${personName(item)} из рабочего списка? Данные обучения не удалятся и действие останется в журнале.`)) return;
    setBusyStudentId(item.userId);
    try {
      if (isAdmin) await courseBackend.adminArchiveAccess(courseId, item.userId);
      else await courseBackend.archiveAccess(courseId, item.userId);
      await load();
      addToast({ title: 'Закрытый доступ очищен', text: 'Запись убрана из рабочего списка. Прогресс и журнал сохранены в базе.', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось очистить запись', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally { setBusyStudentId(''); }
  };

  const visible = items.filter((item) => {
    const haystack = `${personName(item)} ${item.user.email} ${item.user.phone}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const activeCount = items.filter((item) => ['ACTIVE','COMPLETED','PAUSED'].includes(item.status)).length;
  const closedCount = items.filter((item) => item.status === 'EXPIRED').length;

  return (
    <AppLayout wide title="Доступ к курсу" subtitle={course?.title ?? 'Управляемая учебная программа'}>
      <div className="course-access-toolbar">
        <Link to={isAdmin ? "/admin?tab=courses" : "/teacher?tab=courses"} className="editor-back"><ArrowLeft size={17}/> К курсам</Link>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={15}/>} onClick={() => void load()}>Обновить</Button>
      </div>

      <div className="course-access-grid">
        <Card className="course-access-card">
          <header><div><span className="eyebrow">{course?.managedKind === 'group' ? 'Групповой закрытый курс' : 'Индивидуальный закрытый курс'}</span><h2>Открыть ученику</h2><p>Укажите Email или телефон зарегистрированного ученика. Повторная выдача автоматически восстанавливает ранее закрытый доступ без потери прогресса.</p></div><span className="course-access-icon"><LockKeyhole size={22}/></span></header>
          <form className="course-access-form" onSubmit={grant}>
            <label><span>Email или телефон</span><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="student@example.com или +7999…" required/></label>
            <label><span>Доступ до</span><input type="datetime-local" min={accessDateBounds().min} max={accessDateBounds().max} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)}/><small>Оставьте пустым для доступа без автоматического окончания. Максимум — 3 года вперёд.</small></label>
            <Button type="submit" loading={busy} icon={<UserPlus size={16}/>}>Открыть доступ</Button>
          </form>
          <div className="course-access-note"><ShieldCheck size={17}/><span>Закрытие и «очистка» не удаляют тесты, домашние работы и прогресс. Очистка только убирает закрытую запись из рабочего списка; журнал остаётся доступен преподавателю и администратору.</span></div>
        </Card>

        <Card className="course-access-card course-access-card--list">
          <header><div><span className="eyebrow">Ученики</span><h2>{activeCount} с доступом · {closedCount} закрыто</h2></div><label className="course-access-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск"/></label></header>
          {loading ? <div className="review-empty"><RefreshCw size={20}/><span>Загружаем доступы…</span></div> : visible.length ? <div className="course-access-list">{visible.map((item) => {
            const name = personName(item);
            const active = ['ACTIVE','COMPLETED','PAUSED'].includes(item.status);
            const rowBusy = busyStudentId === item.userId;
            return <article key={item.id}><Avatar value={name.split(' ').map((part) => part[0]).join('').slice(0,2)} size="sm"/><div className="course-access-person"><strong>{name}</strong><span>{item.user.email} · {item.user.phone}</span><small><Clock3 size={13}/> {active ? item.expiresAt ? `до ${formatDate(item.expiresAt,true)}` : 'без срока' : `закрыт ${item.expiresAt ? formatDate(item.expiresAt,true) : ''}`} · версия {item.courseVersion?.versionNumber ?? '—'} · прогресс {progress(item)}%</small></div><Badge tone={active?'green':'neutral'}>{active ? 'Открыт' : 'Закрыт'}</Badge><div className="course-access-row-actions">{active ? <button className="course-access-revoke" onClick={() => void revoke(item)} title="Закрыть доступ" disabled={rowBusy}><XCircle size={18}/></button> : <><button className="course-access-restore" onClick={() => void restore(item)} title="Восстановить доступ" disabled={rowBusy}><RotateCcw size={17}/></button><button className="course-access-archive" onClick={() => void archiveClosed(item)} title="Убрать закрытый доступ из списка" disabled={rowBusy}><Archive size={17}/></button></>}</div></article>;
          })}</div> : <div className="review-empty"><Users size={22}/><span>Доступы пока не выданы.</span></div>}
        </Card>
      </div>

      <Card className="course-access-history-card">
        <header><div><span className="eyebrow">Аудит</span><h2><History size={19}/> Журнал доступа</h2><p>Кто и когда открывал, закрывал, восстанавливал или убирал закрытый доступ из рабочего списка.</p></div><Badge>{history.length}</Badge></header>
        {history.length ? <div className="course-access-history-list">{history.map((entry) => <article key={entry.id}><span className={`course-access-history-icon action-${entry.action.toLowerCase()}`}><History size={15}/></span><div><strong>{historyLabels[entry.action]}</strong><span>{historyPersonName(entry.student)} · {entry.student.email}</span><small>{formatDate(entry.createdAt, true)} · выполнил: {historyPersonName(entry.actor)}{entry.note ? ` · ${entry.note}` : ''}</small></div></article>)}</div> : <div className="review-empty"><History size={22}/><span>Журнал пока пуст.</span></div>}
      </Card>
    </AppLayout>
  );
}
