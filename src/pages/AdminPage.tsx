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
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { StatCard } from '../components/StatCard';
import { Avatar, Badge, Button, Card } from '../components/ui';
import { courses, demoUsers, payments } from '../data/mock';
import { formatMoney, formatShortDate } from '../utils/format';

export function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const setTab = (value: string) => setParams(value === 'overview' ? {} : { tab: value });

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
  return <>
    <div className="dashboard-stats admin-stats">
      <StatCard icon={<Users size={22}/>} label="Пользователи" value="10 284" note="+428 за 30 дней" />
      <StatCard icon={<GraduationCap size={22}/>} label="Активные ученики" value="3 416" note="33,2% от базы" />
      <StatCard icon={<CreditCard size={22}/>} label="Выручка за месяц" value="4,82 млн ₽" note="+14,6% к июню" />
      <StatCard icon={<Video size={22}/>} label="Занятий сегодня" value="46" note="8 идут сейчас" />
    </div>
    <div className="admin-overview-grid">
      <Card className="revenue-chart-card">
        <header><div><span className="eyebrow">Финансы</span><h2>Выручка и продажи</h2></div><select><option>Последние 30 дней</option></select></header>
        <div className="chart-summary"><div><span>Выручка</span><strong>4 823 600 ₽</strong><small><TrendingUp size={15}/> 14,6%</small></div><div><span>Заказы</span><strong>382</strong><small>конверсия 6,8%</small></div></div>
        <div className="fake-chart"><div className="fake-chart__grid"/><svg viewBox="0 0 800 240" preserveAspectRatio="none"><path d="M0 210 C80 190 100 155 180 170 S300 140 360 115 S480 150 550 92 S680 74 800 28" fill="none" stroke="currentColor" strokeWidth="5"/><path d="M0 210 C80 190 100 155 180 170 S300 140 360 115 S480 150 550 92 S680 74 800 28 L800 240 L0 240 Z" fill="currentColor" opacity=".08"/></svg><div className="fake-chart__labels"><span>8 июл</span><span>15 июл</span><span>22 июл</span><span>29 июл</span><span>7 авг</span></div></div>
      </Card>
      <Card className="system-health-card"><header><div><span className="eyebrow">Инфраструктура</span><h2>Состояние сервисов</h2></div><Badge tone="green">Все системы работают</Badge></header>{([
        { name: 'API и frontend', uptime: '99,99%', value: '38 мс', Icon: Server, status: 'ok' },
        { name: 'PostgreSQL', uptime: '99,98%', value: '12 мс', Icon: Database, status: 'ok' },
        { name: 'Redis и очереди', uptime: '99,97%', value: '7 задач', Icon: Activity, status: 'ok' },
        { name: 'S3 и медиа', uptime: '99,99%', value: '4,2 ТБ', Icon: Cloud, status: 'ok' },
        { name: 'WebRTC SFU', uptime: '99,95%', value: '8 комнат', Icon: Video, status: 'warning' }
      ] satisfies Array<{ name: string; uptime: string; value: string; Icon: LucideIcon; status: string }>).map(({ name, uptime, value, Icon, status }) => <div className="health-row" key={name}><span className={`health-dot health-dot--${status}`}/><span className="health-icon"><Icon size={17}/></span><div><strong>{name}</strong><small>Uptime {uptime}</small></div><b>{value}</b></div>)}</Card>
    </div>
    <div className="admin-bottom-grid">
      <Card className="data-card compact-data-card"><header><div><h2>Последние платежи</h2><p>Обновляются через webhook.</p></div><button className="text-link">Все платежи</button></header><div className="data-table-wrap"><table><thead><tr><th>Заказ</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>{payments.map((payment)=><tr key={payment.id}><td><strong>{payment.number}</strong><small>{payment.title}</small></td><td>{formatMoney(payment.amount)}</td><td><Badge tone="green">Оплачен</Badge></td></tr>)}</tbody></table></div></Card>
      <Card className="alerts-card"><header><div><h2>Требуют внимания</h2><p>Ошибки и задачи модерации.</p></div><Badge tone="amber">4</Badge></header>{[
        ['3 курса ожидают модерации','Контент','amber'],
        ['1 webhook не обработан','Платежи','red'],
        ['Сертификат TURN истекает через 18 дней','Инфраструктура','amber'],
        ['2 файла не прошли конвертацию','Медиа','amber']
      ].map(([title,area,tone])=><article key={title}><AlertTriangle size={18}/><div><strong>{title}</strong><span>{area}</span></div><button><Eye size={17}/></button></article>)}</Card>
    </div>
  </>;
}

function AdminUsers() {
  const users = [
    demoUsers.student,
    demoUsers.teacher,
    demoUsers.admin,
    { id:'u4',name:'Михаил Кузнецов',email:'m.k@example.com',role:'student' as const,avatar:'МК',timezone:'Europe/Moscow' },
    { id:'u5',name:'Мария Белова',email:'maria.teacher@example.com',role:'teacher' as const,avatar:'МБ',timezone:'Europe/Moscow' }
  ];
  return <Card className="data-card"><header><div><h2>Пользователи</h2><p>Роли, статусы и доступы.</p></div><div className="data-card__actions"><label><Search size={16}/><input placeholder="Поиск"/></label><Button>Добавить пользователя</Button></div></header><div className="data-table-wrap"><table><thead><tr><th>Пользователь</th><th>Роль</th><th>Статус</th><th>Последний вход</th><th></th></tr></thead><tbody>{users.map((user,index)=><tr key={user.id}><td><div className="person-cell"><Avatar value={user.avatar??'U'} size="sm"/><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td><td><Badge tone={user.role==='admin'?'red':user.role==='teacher'?'violet':'neutral'}>{user.role==='admin'?'Администратор':user.role==='teacher'?'Преподаватель':'Ученик'}</Badge></td><td><Badge tone="green">Активен</Badge></td><td>{index===0?'сегодня, 20:14':index===1?'сегодня, 18:42':'вчера'}</td><td><button><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table></div></Card>;
}

function AdminCourses() {
  return <Card className="data-card"><header><div><h2>Курсы</h2><p>Публикация, авторы, цены и зачисления.</p></div><Button>Создать курс</Button></header><div className="data-table-wrap"><table><thead><tr><th>Курс</th><th>Автор</th><th>Статус</th><th>Цена</th><th>Ученики</th><th></th></tr></thead><tbody>{courses.map((course,index)=><tr key={course.id}><td><div className="course-table-cell"><img src={course.cover} alt=""/><span><strong>{course.title}</strong><small>{course.level} · {course.category}</small></span></div></td><td>{course.instructor}</td><td><Badge tone={index===3?'amber':'green'}>{index===3?'На модерации':'Опубликован'}</Badge></td><td>{formatMoney(course.price)}</td><td>{course.students}</td><td><button><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table></div></Card>;
}

function AdminPayments() {
  const extended = [
    ...payments,
    { id:'p3',number:'LNG-2026-00482',title:'Разговорная практика B1',amount:14900,date:'2026-08-06T16:20:00.000Z',status:'paid' as const },
    { id:'p4',number:'LNG-2026-00483',title:'Английский для путешествий',amount:8900,date:'2026-08-07T08:10:00.000Z',status:'pending' as const }
  ];
  return <><div className="payment-summary-grid admin-payment-summary"><Card><span><WalletCards size={20}/> Сегодня</span><strong>286 400 ₽</strong><small>24 успешных платежа</small></Card><Card><span><CreditCard size={20}/> Средний чек</span><strong>11 933 ₽</strong><small>+8,2% к прошлому месяцу</small></Card><Card><span><RefreshCw size={20}/> Возвраты</span><strong>1,7%</strong><small>ниже целевого уровня</small></Card></div><Card className="data-card"><header><div><h2>Платёжные операции</h2><p>Статусы эквайринга, чеков и выдачи доступа.</p></div><Button variant="secondary">Экспорт реестра</Button></header><div className="data-table-wrap"><table><thead><tr><th>Заказ</th><th>Наименование</th><th>Дата</th><th>Сумма</th><th>Эквайринг</th><th>Доступ</th><th></th></tr></thead><tbody>{extended.map((payment)=><tr key={payment.id}><td><strong>{payment.number}</strong></td><td>{payment.title}</td><td>{formatShortDate(payment.date)}</td><td><strong>{formatMoney(payment.amount)}</strong></td><td><Badge tone={payment.status==='paid'?'green':'amber'}>{payment.status==='paid'?'success':'pending'}</Badge></td><td>{payment.status==='paid'?<span className="access-ok"><CheckCircle2 size={16}/> открыт</span>:<span>ожидает</span>}</td><td><button><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table></div></Card></>;
}

function AdminSystem() {
  return <div className="system-page-grid">
    <Card className="system-config-card"><header><div><h2>Интеграции</h2><p>Ключи скрыты после сохранения.</p></div><Button variant="secondary" size="sm">Проверить все</Button></header>{([
      { name: 'ЮKassa', desc: 'Платежи и webhook', status: 'Подключено', Icon: CreditCard },
      { name: 'CloudKassir', desc: 'Онлайн-чеки 54-ФЗ', status: 'Подключено', Icon: ShieldCheck },
      { name: 'Yandex Translate', desc: 'Перевод слов', status: 'Подключено', Icon: Activity },
      { name: 'S3 Storage', desc: 'Видео и документы', status: 'Подключено', Icon: HardDrive },
      { name: 'LiveKit SFU', desc: 'Видеозанятия', status: 'Предупреждение', Icon: Video }
    ] satisfies Array<{ name: string; desc: string; status: string; Icon: LucideIcon }>).map(({ name, desc, status, Icon })=><article key={name}><span><Icon size={19}/></span><div><strong>{name}</strong><small>{desc}</small></div><Badge tone={status==='Подключено'?'green':'amber'}>{status}</Badge><button><MoreHorizontal size={18}/></button></article>)}</Card>
    <Card className="system-config-card"><header><div><h2>Очереди и фоновые задачи</h2><p>Redis / BullMQ</p></div><Badge tone="green">Работает</Badge></header>{[
      ['media-transcoding','4 активных','12 завершено/час'],
      ['email-delivery','0 активных','184 завершено/час'],
      ['payment-webhooks','1 ошибка','96 завершено/час'],
      ['daily-reviews','0 активных','последний запуск 08:00']
    ].map(([name,active,rate])=><article key={name}><span className="queue-icon"><Activity size={18}/></span><div><strong>{name}</strong><small>{rate}</small></div><Badge tone={active.includes('ошибка')?'red':'neutral'}>{active}</Badge><button><RefreshCw size={16}/></button></article>)}</Card>
    <Card className="system-config-card system-config-card--wide"><header><div><h2>Резервное копирование</h2><p>Последние операции и целевые показатели восстановления.</p></div><Button size="sm" icon={<RefreshCw size={16}/>}>Создать backup</Button></header><div className="backup-grid"><div><span><Database size={20}/></span><div><strong>PostgreSQL</strong><small>Последняя копия: сегодня, 03:00</small></div><Badge tone="green">Успешно</Badge></div><div><span><Cloud size={20}/></span><div><strong>Объектное хранилище</strong><small>Версионирование включено</small></div><Badge tone="green">Активно</Badge></div><div><span><ShieldCheck size={20}/></span><div><strong>Тест восстановления</strong><small>Последний: 1 августа 2026</small></div><Badge tone="green">Пройден</Badge></div></div></Card>
  </div>;
}
