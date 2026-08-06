import { CalendarDays, Clock3, Filter, Plus, Users, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Avatar, Badge, Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../utils/format';

export function SchedulePage() {
  const sessions = useAppStore((state) => state.sessions);
  const upcoming = sessions.filter((session) => session.status === 'scheduled');
  const completed = sessions.filter((session) => session.status === 'completed');

  return (
    <AppLayout title="Расписание" subtitle="Занятия, разговорные клубы и консультации.">
      <div className="schedule-toolbar">
        <div className="schedule-view-switch"><button className="active">Список</button><button>Календарь</button></div>
        <div><button className="filter-button"><Filter size={17} /> Фильтры</button><Button size="sm" variant="secondary" icon={<Plus size={17} />}>Добавить в календарь</Button></div>
      </div>

      <div className="schedule-layout">
        <section>
          <div className="section-title-row"><div><span className="eyebrow">Предстоящие</span><h2>Ближайшие занятия</h2></div><Badge tone="green">{upcoming.length}</Badge></div>
          <div className="session-list">
            {upcoming.map((session) => {
              const start = new Date(session.startAt);
              return (
                <Card className="session-card" key={session.id}>
                  <div className="session-card__date"><strong>{start.getDate()}</strong><span>{new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(start)}</span><small>{new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(start)}</small></div>
                  <div className="session-card__content">
                    <div><Badge tone={session.type === 'individual' ? 'amber' : 'violet'}>{session.type === 'individual' ? 'Индивидуальное' : session.type === 'group' ? 'Группа' : 'Вебинар'}</Badge><span><Clock3 size={15} /> {formatDate(session.startAt, true)} · {session.duration} мин</span></div>
                    <h3>{session.title}</h3>
                    <div className="session-card__teacher"><Avatar value={session.instructor.split(' ').map((part) => part[0]).join('').slice(0, 2)} size="sm" /><span>{session.instructor}</span><span><Users size={15} /> {session.attendees}/{session.maxAttendees}</span></div>
                  </div>
                  <div className="session-card__actions"><Link to={`/app/video/${session.id}`}><Button icon={<Video size={17} />}>Войти в комнату</Button></Link><button>Подробнее</button></div>
                </Card>
              );
            })}
          </div>

          <div className="section-title-row schedule-history-heading"><div><span className="eyebrow">История</span><h2>Прошедшие занятия</h2></div></div>
          <div className="session-list session-list--past">
            {completed.map((session) => (
              <Card className="session-card" key={session.id}>
                <div className="session-card__date"><CalendarDays size={25} /><small>{formatDate(session.startAt)}</small></div>
                <div className="session-card__content"><div><Badge>Завершено</Badge><span>{session.duration} мин</span></div><h3>{session.title}</h3><p>Посещение отмечено · материалы доступны в курсе</p></div>
                <div className="session-card__actions"><Button variant="ghost">Материалы</Button></div>
              </Card>
            ))}
          </div>
        </section>
        <aside>
          <Card className="mini-calendar">
            <header><button>‹</button><strong>Август 2026</strong><button>›</button></header>
            <div className="mini-calendar__week">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="mini-calendar__days">{Array.from({ length: 35 }, (_, i) => i - 2).map((day, index) => <button key={index} className={day === 7 ? 'today' : day === 8 || day === 10 ? 'has-session' : day < 1 || day > 31 ? 'muted' : ''}>{day < 1 ? 31 + day : day > 31 ? day - 31 : day}</button>)}</div>
          </Card>
          <Card className="timezone-card"><Clock3 size={20} /><div><strong>Часовой пояс</strong><span>Москва, UTC+3</span></div><button>Изменить</button></Card>
        </aside>
      </div>
    </AppLayout>
  );
}
