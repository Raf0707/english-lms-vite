import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CreditCard,
  Database,
  Eye,
  GraduationCap,
  HardDrive,
  MoreHorizontal,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  Video,
  WalletCards
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { CourseCoverImage } from '../components/CourseCoverImage';
import { StatCard } from '../components/StatCard';
import { Avatar, Badge, Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import type { Course } from '../types';
import { formatMoney, formatShortDate } from '../utils/format';
import { courseBackend } from '../services/courseBackend';
import { api, type BackendAdminOrder, type BackendAdminUser } from '../services/api';

export function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const setTab = (value: string) => setParams(value === 'overview' ? {} : { tab: value });
  const loadManagedCourses = useAppStore((state) => state.loadManagedCourses);
  useEffect(() => { void loadManagedCourses().catch(() => undefined); }, [loadManagedCourses]);

  return (
    <AppLayout title="Панель управления" subtitle="Состояние платформы, пользователи, контент и финансы.">
      <div className="workspace-tabs">
        {[['overview','Обзор'],['users','Пользователи'],['courses','Курсы'],['payments','Платежи'],['system','Система']].map(([value,label]) => <button key={value} className={tab===value?'active':''} onClick={()=>setTab(value)}>{label}</button>)}
      </div>
      {tab === 'overview' ? <AdminOverview /> : null}
      {tab === 'users' ? <AdminUsers /> : null}
      {tab === 'courses' ? <AdminCourses /> : null}
      {tab === 'payments' ? <AdminPayments /> : null}
      {tab === 'system' ? <AdminSystem /> : null}
    </AppLayout>
  );
}

function AdminOverview() {
  const courses = useAppStore((state) => state.managedCourses);
  const addToast = useAppStore((state) => state.addToast);
  const [stats, setStats] = useState({ users: 0, activeStudents: 0, monthRevenueMinor: 0, paidOrders: 0, sessionsToday: 0, liveSessions: 0, moderation: 0 });
  const [orders, setOrders] = useState<BackendAdminOrder[]>([]);
  const [system, setSystem] = useState<Array<{ id: string; name: string; status: string; detail: string }>>([]);
  const moderationCount = courses.filter((course) => course.status === 'moderation').length || stats.moderation;

  const load = async () => {
    try {
      const [nextStats, nextOrders, status] = await Promise.all([api.admin.overview(), api.admin.payments.list(), api.admin.system.status()]);
      setStats(nextStats);
      setOrders(nextOrders.slice(0, 5));
      setSystem(status.services);
    } catch (error) {
      addToast({ title: 'Сводка не обновлена', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    }
  };
  useEffect(() => { void load(); }, []);

  return <>
    <div className="dashboard-stats admin-stats">
      <StatCard icon={<Users size={22}/>} label="Пользователи" value={stats.users.toLocaleString('ru-RU')} note="в PostgreSQL" />
      <StatCard icon={<GraduationCap size={22}/>} label="Активные ученики" value={stats.activeStudents.toLocaleString('ru-RU')} note="активные аккаунты STUDENT" />
      <StatCard icon={<CreditCard size={22}/>} label="Выручка за месяц" value={formatMoney(stats.monthRevenueMinor / 100)} note={`${stats.paidOrders} оплаченных заказов`} />
      <StatCard icon={<Video size={22}/>} label="Занятий сегодня" value={String(stats.sessionsToday)} note={`${stats.liveSessions} идут сейчас`} />
    </div>
    <div className="admin-overview-grid">
      <Card className="revenue-chart-card">
        <header><div><span className="eyebrow">Финансы</span><h2>Текущий месяц</h2></div><Button size="sm" variant="secondary" onClick={() => void load()} icon={<RefreshCw size={15}/>}>Обновить</Button></header>
        <div className="chart-summary"><div><span>Выручка</span><strong>{formatMoney(stats.monthRevenueMinor / 100)}</strong><small><TrendingUp size={15}/> реальные платежи</small></div><div><span>Заказы</span><strong>{stats.paidOrders}</strong><small>статус PAID</small></div></div>
        <div className="admin-overview-note">График будет строиться по дневным агрегатам после подключения production-эквайринга; сводные числа уже берутся из PostgreSQL.</div>
      </Card>
      <Card className="system-health-card"><header><div><span className="eyebrow">Инфраструктура</span><h2>Состояние сервисов</h2></div><Link className="text-link" to="/admin?tab=system">Открыть систему</Link></header>{system.length ? system.map((item) => <div className="health-row" key={item.id}><span className={`health-dot health-dot--${item.status === 'ok' ? 'ok' : 'warning'}`}/><span className="health-icon"><Server size={17}/></span><div><strong>{item.name}</strong><small>{item.status === 'ok' ? 'Работает' : 'Требует внимания'}</small></div><b>{item.detail}</b></div>) : <div className="review-empty"><Activity size={20}/><span>Проверка сервисов…</span></div>}</Card>
    </div>
    <div className="admin-bottom-grid">
      <Card className="data-card compact-data-card"><header><div><h2>Последние платежи</h2><p>Реальные заказы backend.</p></div><Link className="text-link" to="/admin?tab=payments">Все платежи</Link></header><div className="data-table-wrap"><table><thead><tr><th>Заказ</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>{orders.length ? orders.map((order)=><tr key={order.id}><td><strong>{order.number}</strong><small>{order.items.map((item) => item.title).join(', ')}</small></td><td>{formatMoney(order.totalMinor / 100)}</td><td><Badge tone={order.status === 'PAID' ? 'green' : 'amber'}>{order.status === 'PAID' ? 'Оплачен' : order.status}</Badge></td></tr>) : <tr><td colSpan={3}>Операций пока нет</td></tr>}</tbody></table></div></Card>
      <Card className="alerts-card"><header><div><h2>Требуют внимания</h2><p>Задачи, по которым есть реальное действие.</p></div><Badge tone={moderationCount ? 'amber' : 'green'}>{moderationCount}</Badge></header>
        <article><AlertTriangle size={18}/><div><strong>{moderationCount} курса ожидают модерации</strong><span>Контент</span></div><Link to="/admin?tab=courses" aria-label="Открыть курсы"><Eye size={17}/></Link></article>
        {system.filter((item) => item.status !== 'ok').map((item) => <article key={item.id}><AlertTriangle size={18}/><div><strong>{item.name}</strong><span>{item.detail}</span></div><Link to="/admin?tab=system" aria-label="Открыть систему"><Eye size={17}/></Link></article>)}
      </Card>
    </div>
  </>;
}

function AdminUsers() {
  const addToast = useAppStore((state) => state.addToast);
  const currentUser = useAppStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [users, setUsers] = useState<BackendAdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (query = search) => {
    setLoading(true);
    try {
      setUsers(await api.admin.users.list(query.trim() || undefined));
    } catch (error) {
      addToast({ title: 'Не удалось загрузить пользователей', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(search); }, 250);
    return () => window.clearTimeout(timer);
    // load intentionally depends on the current search value only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const roleCodes = (user: BackendAdminUser) => user.roles.map((entry) => entry.role.code);
  const primaryRole = (user: BackendAdminUser) => roleCodes(user).includes('ADMIN') ? 'admin' : roleCodes(user).includes('TEACHER') ? 'teacher' : 'student';
  const displayName = (user: BackendAdminUser) => user.profile?.displayName?.trim() || [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.email;
  const avatar = (user: BackendAdminUser) => displayName(user).split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';

  const toggleBlocked = async (user: BackendAdminUser) => {
    try {
      const status = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
      await api.admin.users.setStatus(user.id, status);
      await load();
      addToast({ title: status === 'BLOCKED' ? 'Пользователь заблокирован' : 'Пользователь разблокирован', text: displayName(user), tone: status === 'BLOCKED' ? 'warning' : 'success' });
    } catch (error) {
      addToast({ title: 'Статус не изменён', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setOpenMenu(null);
    }
  };

  const switchRole = async (user: BackendAdminUser) => {
    const current = primaryRole(user);
    if (current === 'admin') {
      addToast({ title: 'Роль администратора защищена', text: 'Административную роль не меняем быстрым переключателем.', tone: 'warning' });
      setOpenMenu(null);
      return;
    }
    const next = current === 'teacher' ? 'STUDENT' : 'TEACHER';
    try {
      await api.admin.users.setRoles(user.id, [next]);
      await load();
      addToast({ title: 'Роль изменена', text: `${displayName(user)}: ${next === 'TEACHER' ? 'преподаватель' : 'ученик'}`, tone: 'success' });
    } catch (error) {
      addToast({ title: 'Роль не изменена', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setOpenMenu(null);
    }
  };

  const resetPassword = async (user: BackendAdminUser) => {
    try {
      const result = await api.auth.forgotPassword(user.email);
      addToast({
        title: 'Сброс пароля создан',
        text: result.token ? `DEV token: ${result.token}` : `Инструкция отправлена на ${user.email}`,
        tone: 'success'
      });
    } catch (error) {
      addToast({ title: 'Не удалось создать сброс пароля', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setOpenMenu(null);
    }
  };

  return <Card className="data-card admin-users-card">
    <header><div><h2>Пользователи</h2><p>Реальные аккаунты PostgreSQL: роли, статусы и доступы.</p></div><div className="data-card__actions"><label><Search size={16}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Поиск"/></label><Button variant="secondary" onClick={() => void load()}>Обновить</Button></div></header>
    <div className="data-table-wrap"><table><thead><tr><th>Пользователь</th><th>Телефон</th><th>Роль</th><th>Статус</th><th>Создан</th><th></th></tr></thead><tbody>
      {loading && users.length === 0 ? <tr><td colSpan={6}>Загрузка пользователей…</td></tr> : null}
      {!loading && users.length === 0 ? <tr><td colSpan={6}>Пользователи не найдены</td></tr> : null}
      {users.map((user) => {
        const role = primaryRole(user);
        const name = displayName(user);
        return <tr key={user.id}><td><div className="person-cell"><Avatar value={avatar(user)} size="sm"/><span><strong>{name}</strong><small>{user.email}</small></span></div></td><td>{user.phone}</td><td><Badge tone={role==='admin'?'red':role==='teacher'?'violet':'neutral'}>{role==='admin'?'Администратор':role==='teacher'?'Преподаватель':'Ученик'}</Badge></td><td><Badge tone={user.status==='ACTIVE'?'green':'red'}>{user.status==='ACTIVE'?'Активен':'Заблокирован'}</Badge></td><td>{formatShortDate(user.createdAt)}</td><td><div className="admin-user-actions"><button className="admin-user-actions__trigger" onClick={() => setOpenMenu((current) => current === user.id ? null : user.id)} aria-label={`Действия: ${name}`}><MoreHorizontal size={18}/></button>{openMenu===user.id?<><button className="admin-user-actions__backdrop" onClick={() => setOpenMenu(null)} aria-label="Закрыть меню"/><div className="admin-user-actions__menu"><button onClick={() => { window.alert(`${name}\n${user.email}\n${user.phone}\nРоли: ${roleCodes(user).join(', ')}\nЧасовой пояс: ${user.profile?.timezone ?? '—'}`); setOpenMenu(null); }}><Eye size={16}/> Открыть карточку</button><button onClick={() => void switchRole(user)} disabled={role==='admin'}><Users size={16}/> {role==='teacher'?'Сделать учеником':'Сделать преподавателем'}</button><button onClick={() => void toggleBlocked(user)} disabled={user.id === currentUser?.id} title={user.id === currentUser?.id ? 'Нельзя заблокировать собственную учётную запись' : undefined}><ShieldCheck size={16}/> {user.id === currentUser?.id ? 'Это ваш аккаунт' : user.status==='ACTIVE'?'Заблокировать':'Разблокировать'}</button><button onClick={() => void resetPassword(user)}><RefreshCw size={16}/> Сбросить пароль</button></div></>:null}</div></td></tr>;
      })}
    </tbody></table></div>
  </Card>;
}

function AdminCourses() {
  const courses = useAppStore((state) => state.managedCourses);
  const loadManagedCourses = useAppStore((state) => state.loadManagedCourses);
  const addToast = useAppStore((state) => state.addToast);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => courses.filter((course) => `${course.title} ${course.instructor} ${course.category} ${course.level}`.toLowerCase().includes(search.toLowerCase())), [courses, search]);

  const publish = async (course: Course) => {
    try {
      await courseBackend.publish(course.id, 'NEW_STUDENTS_ONLY');
      await loadManagedCourses();
      addToast({ title: 'Курс опубликован', text: 'Новая версия доступна новым ученикам. Текущие enrollment сохранены на прежней версии.', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Публикация не выполнена', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    }
  };

  const confirmDelete = async (course: Course) => {
    const message = course.deletionStatus === 'requested'
      ? `Подтвердить запрос преподавателя на архивирование курса «${course.title}»? История обучения и платежей сохранится.`
      : `Архивировать курс «${course.title}»? Исторические данные не удаляются.`;
    if (!window.confirm(message)) return;
    try {
      if (course.deletionStatus === 'requested') await courseBackend.approveDeletion(course.id, 'Подтверждено администратором');
      else await courseBackend.archive(course.id);
      await loadManagedCourses();
      addToast({ title: 'Курс архивирован', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось архивировать курс', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    }
  };

  const rejectDeletion = async (course: Course) => {
    try {
      await courseBackend.rejectDeletion(course.id, 'Запрос отклонён администратором');
      await loadManagedCourses();
      addToast({ title: 'Запрос на удаление отклонён', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось отклонить запрос', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    }
  };

  const requestChanges = async (course: Course) => {
    const comment = window.prompt(`Что нужно доработать в курсе «${course.title}»?`, course.moderationComment ?? '');
    if (comment === null) return;
    if (!comment.trim()) {
      addToast({ title: 'Нужен комментарий', text: 'Укажите преподавателю, что именно требуется исправить.', tone: 'warning' });
      return;
    }
    try {
      await courseBackend.requestChanges(course.id, comment.trim());
      await loadManagedCourses();
      addToast({ title: 'Курс возвращён на доработку', text: 'Преподаватель получил уведомление с вашим комментарием.', tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось вернуть курс', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    }
  };
  return <Card className="data-card"><header><div><h2>Курсы</h2><p>Создание, редактирование, модерация, публикация, цены и подтверждение запросов на удаление.</p></div><div className="data-card__actions"><label><Search size={16}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Поиск курса"/></label><Link to="/admin/course/new"><Button>Создать курс</Button></Link></div></header><div className="data-table-wrap"><table><thead><tr><th>Курс</th><th>Автор</th><th>Статус</th><th>Цена</th><th>Ученики</th><th>Действия</th></tr></thead><tbody>{filtered.map((course)=><tr key={course.id}><td><div className="course-table-cell"><CourseCoverImage course={course} mode="private" alt=""/><span><strong>{course.title}</strong><small>{course.level} · {course.category}</small>{course.moderationComment ? <small className="course-row-comment">{course.moderationComment}</small> : null}{course.deletionStatus==='requested'?<small className="course-row-delete-request">Преподаватель запросил удаление курса</small>:null}</span></div></td><td>{course.instructor}</td><td>{course.deletionStatus==='requested'?<Badge tone="red">Запрос на удаление</Badge>:<AdminCourseStatus course={course}/>}</td><td>{course.accessMode === 'managed' ? <><strong>—</strong><small>{course.managedKind === 'group' ? 'Групповой · по списку' : 'Индивидуальный · по списку'}</small></> : course.accessMode === 'public-free' ? 'Бесплатно' : formatMoney(course.price)}</td><td>{course.students}</td><td><div className="table-actions table-actions--wrap">{course.hasPublishedVersion && course.accessMode === 'managed' ? <Link to={`/admin/course/${course.id}/access`}><Button size="sm" variant="secondary">Доступ</Button></Link> : null}{course.status==='moderation'&&course.deletionStatus!=='requested'?<><Button size="sm" onClick={()=>void publish(course)}>Опубликовать</Button><Button size="sm" variant="secondary" onClick={()=>void requestChanges(course)}>На доработку</Button></>:null}{course.deletionStatus==='requested'?<><Button size="sm" variant="danger" onClick={()=>void confirmDelete(course)}>Подтвердить удаление</Button><Button size="sm" variant="secondary" onClick={()=>void rejectDeletion(course)}>Отклонить</Button></>:null}<Link to={`/admin/course/${course.id}/edit`}><Button size="sm" variant="secondary">Редактировать</Button></Link>{course.deletionStatus!=='requested'?<Button size="sm" variant="ghost" onClick={()=>void confirmDelete(course)}>Удалить</Button>:null}</div></td></tr>)}</tbody></table></div></Card>;
}


function AdminCourseStatus({ course }: { course: Course }) {
  const status = course.status ?? 'draft';
  const label = status === 'published'
    ? 'Опубликован'
    : status === 'moderation'
      ? 'На модерации'
      : status === 'revision'
        ? 'На доработке'
        : status === 'archived'
          ? 'Архив'
          : 'Черновик';
  const tone = status === 'published' ? 'green' : status === 'moderation' ? 'amber' : status === 'revision' ? 'red' : 'neutral';
  return <Badge tone={tone}>{label}</Badge>;
}

function AdminPayments() {
  const addToast = useAppStore((state) => state.addToast);
  const [orders, setOrders] = useState<BackendAdminOrder[]>([]);
  const [stats, setStats] = useState({ todayRevenueMinor: 0, todayPaidCount: 0, averagePaidOrderMinor: 0, refundRate: 0, currency: 'RUB' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (query = search) => {
    setLoading(true);
    try {
      const [nextOrders, nextStats] = await Promise.all([api.admin.payments.list(query.trim() || undefined), api.admin.payments.stats()]);
      setOrders(nextOrders);
      setStats(nextStats);
    } catch (error) {
      addToast({ title: 'Не удалось загрузить платежи', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(search); }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const statusTone = (status: string): 'green' | 'red' | 'amber' => status === 'PAID' ? 'green' : status === 'CANCELLED' || status === 'REFUNDED' ? 'red' : 'amber';
  const statusLabel = (status: string) => status === 'PAID' ? 'Оплачен' : status === 'AWAITING_PAYMENT' ? 'Ожидает' : status === 'PROCESSING' ? 'Обработка' : status === 'REFUNDED' ? 'Возврат' : status;
  const userName = (order: BackendAdminOrder) => order.user?.profile?.displayName || [order.user?.profile?.firstName, order.user?.profile?.lastName].filter(Boolean).join(' ') || order.user?.email || '—';

  return <>
    <div className="payment-summary-grid admin-payment-summary">
      <Card><span><WalletCards size={20}/> Сегодня</span><strong>{formatMoney(stats.todayRevenueMinor / 100)}</strong><small>{stats.todayPaidCount} успешных платежей</small></Card>
      <Card><span><CreditCard size={20}/> Средний чек</span><strong>{formatMoney(stats.averagePaidOrderMinor / 100)}</strong><small>по успешным платежам</small></Card>
      <Card><span><RefreshCw size={20}/> Возвраты</span><strong>{stats.refundRate.toLocaleString('ru-RU')}%</strong><small>от числа оплаченных заказов</small></Card>
    </div>
    <Card className="data-card"><header><div><h2>Платёжные операции</h2><p>Реальные заказы, эквайринг, чеки и выдача доступа.</p></div><div className="data-card__actions"><label><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Заказ, пользователь, курс"/></label><Button variant="secondary" onClick={() => void load()}>Обновить</Button></div></header><div className="data-table-wrap"><table><thead><tr><th>Заказ</th><th>Покупатель</th><th>Наименование</th><th>Дата</th><th>Сумма</th><th>Статус</th><th>Доступ</th></tr></thead><tbody>
      {loading && orders.length === 0 ? <tr><td colSpan={7}>Загрузка операций…</td></tr> : null}
      {!loading && orders.length === 0 ? <tr><td colSpan={7}>Платёжные операции не найдены</td></tr> : null}
      {orders.map((order) => {
        const paid = order.status === 'PAID' || order.payments.some((payment) => payment.status === 'SUCCEEDED');
        return <tr key={order.id}><td><strong>{order.number}</strong></td><td><strong>{userName(order)}</strong><small>{order.user?.email}</small></td><td>{order.items.map((item) => item.title).join(', ')}</td><td>{formatShortDate(order.createdAt)}</td><td><strong>{formatMoney(order.totalMinor / 100)}</strong></td><td><Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge></td><td>{paid?<span className="access-ok"><CheckCircle2 size={16}/> выдан</span>:<span>ожидает</span>}</td></tr>;
      })}
    </tbody></table></div></Card>
  </>;
}

function AdminSystem() {
  const addToast = useAppStore((state) => state.addToast);
  const [status, setStatus] = useState<{ checkedAt: string; services: Array<{ id: string; name: string; status: string; detail: string }>; queues: Record<string, Record<string, number>> } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => {
    setBusy('check');
    try { setStatus(await api.admin.system.status()); addToast({ title: 'Проверка завершена', text: 'Состояние сервисов обновлено.', tone: 'success' }); }
    catch (error) { addToast({ title: 'Проверка не выполнена', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' }); }
    finally { setBusy(null); }
  };
  useEffect(() => { void api.admin.system.status().then(setStatus).catch(() => undefined); }, []);
  const retry = async (name: 'media' | 'notifications') => {
    setBusy(name);
    try { const result = await api.admin.system.retryQueue(name); addToast({ title: 'Очередь обработана', text: `Повторно запущено задач: ${result.retried}`, tone: 'success' }); await load(); }
    catch (error) { addToast({ title: 'Не удалось повторить задачи', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' }); }
    finally { setBusy(null); }
  };
  const backup = async () => {
    setBusy('backup');
    try { const result = await api.admin.system.backup(); addToast({ title: 'Snapshot создан', text: result.fileName, tone: 'success' }); }
    catch (error) { addToast({ title: 'Snapshot не создан', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' }); }
    finally { setBusy(null); }
  };
  const services = status?.services ?? [];
  const queueRows = [
    { id: 'media' as const, label: 'media', values: status?.queues.media },
    { id: 'notifications' as const, label: 'notifications', values: status?.queues.notifications }
  ];
  return <div className="system-page-grid">
    <Card className="system-config-card"><header><div><h2>Интеграции и сервисы</h2><p>Проверяются backend-ом, а не статической заглушкой.</p></div><Button variant="secondary" size="sm" onClick={() => void load()} disabled={busy==='check'}>{busy==='check'?'Проверяем…':'Проверить все'}</Button></header>{services.length ? services.map((item)=><article key={item.id}><span><Server size={19}/></span><div><strong>{item.name}</strong><small>{item.detail}</small></div><Badge tone={item.status==='ok'?'green':'amber'}>{item.status==='ok'?'Работает':'Внимание'}</Badge><button onClick={() => window.alert(`${item.name}\nСтатус: ${item.status}\n${item.detail}\nПроверено: ${status?.checkedAt ?? '—'}`)} aria-label={`Подробнее: ${item.name}`}><MoreHorizontal size={18}/></button></article>) : <div className="review-empty"><Activity size={20}/><span>Получаем состояние сервисов…</span></div>}</Card>
    <Card className="system-config-card"><header><div><h2>Очереди и фоновые задачи</h2><p>Redis / BullMQ</p></div><Badge tone="green">Backend</Badge></header>{queueRows.map((queue)=>{ const v=queue.values ?? {}; const failed=Number(v.failed ?? 0); return <article key={queue.id}><span className="queue-icon"><Activity size={18}/></span><div><strong>{queue.label}</strong><small>waiting {Number(v.waiting ?? 0)} · active {Number(v.active ?? 0)} · completed {Number(v.completed ?? 0)}</small></div><Badge tone={failed?'red':'neutral'}>{failed ? `${failed} ошибок` : 'без ошибок'}</Badge><button onClick={() => void retry(queue.id)} disabled={busy===queue.id} aria-label={`Повторить failed: ${queue.label}`}><RefreshCw size={16}/></button></article>;})}</Card>
    <Card className="system-config-card system-config-card--wide"><header><div><h2>Резервное копирование</h2><p>Кнопка создаёт логический snapshot ключевых данных. Для production дополнительно используем pg_dump + объектное хранилище.</p></div><Button size="sm" icon={<RefreshCw size={16}/>} onClick={() => void backup()} disabled={busy==='backup'}>{busy==='backup'?'Создаём…':'Создать backup'}</Button></header><div className="backup-grid"><div><span><Database size={20}/></span><div><strong>PostgreSQL</strong><small>Snapshot создаётся по запросу администратора</small></div><Badge tone="green">Доступно</Badge></div><div><span><Cloud size={20}/></span><div><strong>Объектное хранилище</strong><small>Медиа не копируются в JSON snapshot: для них используется S3 versioning</small></div><Badge tone="neutral">Отдельно</Badge></div><div><span><ShieldCheck size={20}/></span><div><strong>Production backup</strong><small>Перед релизом подключим pg_dump, шифрование и off-site retention</small></div><Badge tone="amber">Следующий этап</Badge></div></div></Card>
  </div>;
}

