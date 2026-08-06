import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  FileCheck2,
  GraduationCap,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Users,
  Video,
  WalletCards
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { StatCard } from '../components/StatCard';
import { Avatar, Badge, Button, Card } from '../components/ui';
import { courses, sessions } from '../data/mock';
import { formatDate, formatMoney } from '../utils/format';

const teacherCourses = courses.slice(0, 2);

export function TeacherPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const setTab = (value: string) => setParams(value === 'overview' ? {} : { tab: value });

  return (
    <AppLayout title="Кабинет преподавателя" subtitle="Курсы, ученики, занятия и вознаграждение.">
      <div className="workspace-tabs">
        {[['overview', 'Обзор'], ['courses', 'Курсы'], ['students', 'Ученики'], ['sessions', 'Занятия'], ['finance', 'Финансы']].map(([value, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}
      </div>

      {tab === 'overview' ? <TeacherOverview /> : null}
      {tab === 'courses' ? <TeacherCourses /> : null}
      {tab === 'students' ? <TeacherStudents /> : null}
      {tab === 'sessions' ? <TeacherSessions /> : null}
      {tab === 'finance' ? <TeacherFinance /> : null}
    </AppLayout>
  );
}

function TeacherOverview() {
  return <>
    <div className="dashboard-stats teacher-stats">
      <StatCard icon={<Users size={22} />} label="Активные ученики" value="1 248" note="+38 за месяц" />
      <StatCard icon={<FileCheck2 size={22} />} label="На проверке" value="17" note="5 с высоким приоритетом" />
      <StatCard icon={<CalendarClock size={22} />} label="Занятий на неделе" value="8" note="Следующее завтра" />
      <StatCard icon={<WalletCards size={22} />} label="К начислению" value="184 650 ₽" note="за июль" />
    </div>
    <div className="teacher-overview-grid">
      <section>
        <div className="section-title-row"><div><span className="eyebrow">Курсы</span><h2>Активные программы</h2></div><Button size="sm" icon={<Plus size={16} />}>Создать курс</Button></div>
        <div className="teacher-course-list">{teacherCourses.map((course, index) => <Card className="teacher-course-row" key={course.id}><img src={course.cover} alt="" /><div><div><Badge tone={index === 0 ? 'green' : 'violet'}>{index === 0 ? 'Опубликован' : 'На модерации'}</Badge><span>{course.level}</span></div><h3>{course.title}</h3><p>{course.students} учеников · {course.modules.length} модуля</p><div className="teacher-course-progress"><span><i style={{ width: `${index === 0 ? 92 : 68}%` }} /></span><small>{index === 0 ? 'Контент готов на 92%' : 'Контент готов на 68%'}</small></div></div><div className="teacher-course-row__actions"><button><Eye size={17} /></button><button><Edit3 size={17} /></button><button><MoreHorizontal size={17} /></button></div></Card>)}</div>
      </section>
      <aside>
        <Card className="review-queue-card"><header><div><span className="eyebrow">Задания</span><h2>Нужно проверить</h2></div><Badge tone="amber">17</Badge></header>{[['Анна Воронцова','Письмо о себе','2 ч назад','АВ'],['Михаил Кузнецов','My daily routine','5 ч назад','МК'],['Ирина Петрова','Travel story','вчера','ИП']].map(([name,title,time,avatar]) => <article key={name}><Avatar value={avatar} size="sm"/><div><strong>{title}</strong><span>{name}</span><small>{time}</small></div><Button size="sm" variant="secondary">Проверить</Button></article>)}<button className="text-link">Открыть все <ArrowUpRight size={16}/></button></Card>
        <Card className="teacher-next-session"><header><Video size={20}/><span>Следующее занятие</span></header><strong>Разговорная практика: знакомство</strong><p>Завтра, 19:00 · 8 участников</p><div className="avatar-stack">{['АВ','МК','ИП','+5'].map((item) => <Avatar key={item} value={item} size="sm" />)}</div><Button>Открыть комнату</Button></Card>
      </aside>
    </div>
  </>;
}

function TeacherCourses() {
  return <div className="workspace-section"><div className="workspace-section__header"><div><h2>Мои курсы</h2><p>Создавайте материалы, управляйте публикацией и следите за прогрессом.</p></div><Button icon={<Plus size={17}/>}>Новый курс</Button></div><div className="teacher-course-grid">{teacherCourses.map((course, index) => <Card className="teacher-course-tile" key={course.id}><img src={course.cover} alt=""/><div><div><Badge tone={index === 0 ? 'green' : 'amber'}>{index === 0 ? 'Опубликован' : 'Черновик'}</Badge><button><MoreHorizontal size={18}/></button></div><h3>{course.title}</h3><p>{course.shortDescription}</p><dl><div><dt>Учеников</dt><dd>{course.students}</dd></div><div><dt>Уроков</dt><dd>{course.modules.flatMap((m)=>m.lessons).length}</dd></div><div><dt>Рейтинг</dt><dd>{course.rating}</dd></div></dl><div className="teacher-course-tile__footer"><Button size="sm" icon={<Edit3 size={16}/>}>Редактировать</Button><Button size="sm" variant="ghost" icon={<Eye size={16}/>}>Предпросмотр</Button></div></div></Card>)}</div></div>;
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

function TeacherSessions() {
  return <div className="workspace-section"><div className="workspace-section__header"><div><h2>Занятия</h2><p>Управляйте расписанием и комнатами видеосвязи.</p></div><Button icon={<Plus size={17}/>}>Создать занятие</Button></div><div className="teacher-session-grid">{sessions.map((session) => <Card key={session.id} className="teacher-session-card"><div className="teacher-session-card__time"><strong>{new Date(session.startAt).getDate()}</strong><span>{new Intl.DateTimeFormat('ru-RU',{month:'short'}).format(new Date(session.startAt))}</span></div><div><Badge tone={session.status === 'completed' ? 'neutral' : session.type === 'individual' ? 'amber' : 'violet'}>{session.status === 'completed' ? 'Завершено' : session.type === 'individual' ? 'Индивидуальное' : 'Группа'}</Badge><h3>{session.title}</h3><p>{formatDate(session.startAt,true)} · {session.duration} мин</p><span><Users size={15}/> {session.attendees}/{session.maxAttendees} участников</span></div><div><button><Edit3 size={17}/></button><button><MoreHorizontal size={17}/></button></div></Card>)}</div></div>;
}

function TeacherFinance() {
  const rows = [
    ['Июль 2026','82 продажи','369 300 ₽','184 650 ₽','К выплате'],
    ['Июнь 2026','74 продажи','341 800 ₽','170 900 ₽','Выплачено'],
    ['Май 2026','69 продаж','318 600 ₽','159 300 ₽','Выплачено']
  ];
  return <><div className="finance-hero-card"><div><span className="eyebrow eyebrow--light">Текущий период</span><h2>{formatMoney(184650)}</h2><p>Предварительное вознаграждение за июль</p></div><div><span>Продажи</span><strong>82</strong><small><TrendingUp size={15}/> +10,8%</small></div><div><span>Ваша доля</span><strong>50%</strong><small>по действующему договору</small></div><Button variant="secondary">Скачать отчёт</Button></div><Card className="data-card"><header><div><h2>История начислений</h2><p>Расчёты, возвраты и статусы выплат.</p></div></header><div className="data-table-wrap"><table><thead><tr><th>Период</th><th>Продажи</th><th>База расчёта</th><th>Вознаграждение</th><th>Статус</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell,index) => <td key={cell}>{index===4?<Badge tone={cell==='Выплачено'?'green':'amber'}>{cell}</Badge>:<strong>{cell}</strong>}</td>)}</tr>)}</tbody></table></div></Card></>;
}
