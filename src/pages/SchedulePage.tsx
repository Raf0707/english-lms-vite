import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Download, Filter, Plus, Search, UserRoundSearch, Users, Video, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Avatar, Badge, Button, Card, Modal } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import type { Session } from '../types';

type ScheduleView = 'list' | 'calendar';
type TypeFilter = 'all' | Session['type'];
type SourceFilter = 'all' | 'course' | 'tutoring';

const timezones = [
  ['Europe/Moscow', 'Москва, UTC+3'],
  ['Europe/Berlin', 'Берлин'],
  ['Europe/Amsterdam', 'Амстердам'],
  ['Europe/London', 'Лондон'],
  ['Asia/Dubai', 'Дубай, UTC+4'],
  ['Asia/Tbilisi', 'Тбилиси, UTC+4'],
  ['Asia/Almaty', 'Алматы, UTC+5'],
  ['Asia/Tokyo', 'Токио, UTC+9'],
  ['America/New_York', 'Нью-Йорк'],
  ['America/Los_Angeles', 'Лос-Анджелес']
] as const;

function dateKeyInTimezone(value: string | Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function formatInTimezone(value: string, timeZone: string, includeDate = true) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    ...(includeDate ? { day: 'numeric', month: 'long' as const } : {}),
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function toIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function downloadCalendar(sessions: Session[]) {
  const events = sessions.map((session) => {
    const start = new Date(session.startAt);
    const end = new Date(start.getTime() + session.duration * 60_000);
    return [
      'BEGIN:VEVENT',
      `UID:${session.id}@lingua-lms.local`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
      `DTSTART:${toIcsDate(start.toISOString())}`,
      `DTEND:${toIcsDate(end.toISOString())}`,
      `SUMMARY:${escapeIcs(session.title)}`,
      `DESCRIPTION:${escapeIcs(`Занятие с ${session.instructor}`)}`,
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');
  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Lingua LMS//Schedule//RU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n${events}\r\nEND:VCALENDAR\r\n`;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lingua-schedule.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SchedulePage() {
  const sessions = useAppStore((state) => state.sessions);
  const user = useAppStore((state) => state.user)!;
  const updateProfile = useAppStore((state) => state.updateProfile);
  const addToast = useAppStore((state) => state.addToast);
  const [view, setView] = useState<ScheduleView>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [query, setQuery] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [draftTimezone, setDraftTimezone] = useState(user.timezone);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesType = typeFilter === 'all' || session.type === typeFilter;
      const matchesSource = sourceFilter === 'all' || session.source === sourceFilter;
      const matchesQuery = !q || `${session.title} ${session.instructor}`.toLowerCase().includes(q);
      return matchesType && matchesSource && matchesQuery;
    }).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  }, [query, sessions, sourceFilter, typeFilter]);

  const selectedFiltered = useMemo(() => selectedDay ? filtered.filter((session) => dateKeyInTimezone(session.startAt, user.timezone) === selectedDay) : filtered, [filtered, selectedDay, user.timezone]);
  const upcoming = selectedFiltered.filter((session) => session.status === 'scheduled' || session.status === 'live');
  const completed = selectedFiltered.filter((session) => session.status === 'completed');

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(calendarMonth);
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPrevMonth = new Date(year, month, 0).getDate();
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const rawDay = index - firstDayIndex + 1;
    if (rawDay < 1) return { day: daysPrevMonth + rawDay, date: new Date(year, month - 1, daysPrevMonth + rawDay), muted: true };
    if (rawDay > daysInMonth) return { day: rawDay - daysInMonth, date: new Date(year, month + 1, rawDay - daysInMonth), muted: true };
    return { day: rawDay, date: new Date(year, month, rawDay), muted: false };
  });
  const sessionDates = new Set(filtered.filter((session) => session.status !== 'cancelled').map((session) => dateKeyInTimezone(session.startAt, user.timezone)));
  const todayKey = dateKeyInTimezone(new Date(), user.timezone);

  const saveTimezone = () => {
    updateProfile({ name: user.name, email: user.email, phone: user.phone, timezone: draftTimezone });
    setTimezoneOpen(false);
    addToast({ title: 'Часовой пояс изменён', text: 'Время занятий пересчитано автоматически.', tone: 'success' });
  };

  const exportCalendar = () => {
    const exportable = filtered.filter((session) => session.status === 'scheduled' || session.status === 'live');
    if (!exportable.length) {
      addToast({ title: 'Нет будущих занятий', text: 'Для текущих фильтров нечего добавлять в календарь.', tone: 'warning' });
      return;
    }
    downloadCalendar(exportable);
    addToast({ title: 'Календарь подготовлен', text: 'Файл .ics можно открыть в Google Calendar, Apple Calendar или Outlook.', tone: 'success' });
  };

  const activeFilters = Number(typeFilter !== 'all') + Number(sourceFilter !== 'all') + Number(Boolean(query.trim()));

  return (
    <AppLayout title="Расписание" subtitle="Занятия, разговорные клубы и консультации.">
      <div className="schedule-toolbar">
        <div className="schedule-view-switch"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Список</button><button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Календарь</button></div>
        <div><button className={activeFilters ? 'filter-button filter-button--active' : 'filter-button'} onClick={() => setFiltersOpen((value) => !value)}><Filter size={17} /> Фильтры {activeFilters ? <b>{activeFilters}</b> : null}</button><Button size="sm" variant="secondary" icon={<Download size={17} />} onClick={exportCalendar}>Добавить в календарь</Button><Link className="schedule-book-cta" to="/app/teachers"><Button size="sm" icon={<UserRoundSearch size={17}/>}>Записаться к преподавателю</Button></Link></div>
      </div>

      {filtersOpen ? (
        <Card className="schedule-filters-panel">
          <label><span>Поиск</span><div><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название или преподаватель"/></div></label>
          <label><span>Формат</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}><option value="all">Все форматы</option><option value="individual">Индивидуальные</option><option value="group">Групповые</option><option value="webinar">Вебинары</option></select></label>
          <label><span>Источник</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}><option value="all">Все занятия</option><option value="course">По курсам</option><option value="tutoring">Отдельные занятия</option></select></label>
          <Button size="sm" variant="ghost" icon={<X size={15}/>} onClick={() => { setQuery(''); setTypeFilter('all'); setSourceFilter('all'); setSelectedDay(null); }}>Сбросить</Button>
        </Card>
      ) : null}

      <div className={view === 'calendar' ? 'schedule-layout schedule-layout--calendar-view' : 'schedule-layout'}>
        <section>
          {view === 'calendar' ? (
            <Card className="full-calendar">
              <header><button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}><ChevronLeft size={18}/></button><div><strong>{monthName}</strong><small>{selectedDay ? `Выбран день: ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${selectedDay}T12:00:00`))}` : 'Выберите день, чтобы отфильтровать занятия'}</small></div><div><button className="calendar-today-button" onClick={() => { const now = new Date(); setCalendarMonth(now); setSelectedDay(todayKey); }}>Сегодня</button><button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}><ChevronRight size={18}/></button></div></header>
              <div className="full-calendar__week">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="full-calendar__grid">{calendarCells.map((cell, index) => {
                const key = dateKeyInTimezone(cell.date, user.timezone);
                const daySessions = filtered.filter((session) => dateKeyInTimezone(session.startAt, user.timezone) === key && session.status !== 'cancelled');
                return <button key={`${key}-${index}`} className={`${cell.muted ? 'muted ' : ''}${key === todayKey ? 'today ' : ''}${key === selectedDay ? 'selected ' : ''}${daySessions.length ? 'has-session' : ''}`} onClick={() => { setSelectedDay(key); if (cell.muted) setCalendarMonth(cell.date); }}><span>{cell.day}</span>{daySessions.slice(0,3).map((session) => <i key={session.id} title={session.title}>{new Intl.DateTimeFormat('ru-RU', { timeZone: user.timezone, hour: '2-digit', minute: '2-digit' }).format(new Date(session.startAt))}</i>)}{daySessions.length > 3 ? <em>+{daySessions.length - 3}</em> : null}</button>;
              })}</div>
            </Card>
          ) : null}

          <div className="section-title-row"><div><span className="eyebrow">Предстоящие</span><h2>{selectedDay ? 'Занятия выбранного дня' : 'Ближайшие занятия'}</h2></div><Badge tone="green">{upcoming.length}</Badge></div>
          <div className="session-list">
            {upcoming.map((session) => {
              const start = new Date(session.startAt);
              return (
                <Card className="session-card" key={session.id}>
                  <div className="session-card__date"><strong>{new Intl.DateTimeFormat('ru-RU', { timeZone: user.timezone, day: 'numeric' }).format(start)}</strong><span>{new Intl.DateTimeFormat('ru-RU', { timeZone: user.timezone, month: 'short' }).format(start)}</span><small>{new Intl.DateTimeFormat('ru-RU', { timeZone: user.timezone, weekday: 'short' }).format(start)}</small></div>
                  <div className="session-card__content">
                    <div><Badge tone={session.type === 'individual' ? 'amber' : 'violet'}>{session.type === 'individual' ? 'Индивидуальное' : session.type === 'group' ? 'Группа' : 'Вебинар'}</Badge><span><Clock3 size={15} /> {formatInTimezone(session.startAt, user.timezone)} · {session.duration} мин</span></div>
                    <h3>{session.title}</h3>
                    <div className="session-card__teacher"><Avatar value={session.instructor.split(' ').map((part) => part[0]).join('').slice(0, 2)} size="sm" /><span>{session.instructor}</span><span><Users size={15} /> {session.attendees}/{session.maxAttendees}</span></div>
                  </div>
                  <div className="session-card__actions"><Link to={`/app/video/${session.id}`}><Button icon={<Video size={17} />}>Войти в комнату</Button></Link><button onClick={() => setSelectedDay(dateKeyInTimezone(session.startAt, user.timezone))}>Показать в календаре</button></div>
                </Card>
              );
            })}
            {!upcoming.length ? <Card className="schedule-empty"><CalendarDays size={28}/><h3>Занятий не найдено</h3><p>Измените фильтры или выберите другой день в календаре.</p>{selectedDay ? <Button size="sm" variant="secondary" onClick={() => setSelectedDay(null)}>Показать все дни</Button> : null}</Card> : null}
          </div>

          <div className="section-title-row schedule-history-heading"><div><span className="eyebrow">История</span><h2>Прошедшие занятия</h2></div></div>
          <div className="session-list session-list--past">
            {completed.map((session) => (
              <Card className="session-card" key={session.id}>
                <div className="session-card__date"><CalendarDays size={25} /><small>{new Intl.DateTimeFormat('ru-RU', { timeZone: user.timezone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(session.startAt))}</small></div>
                <div className="session-card__content"><div><Badge>Завершено</Badge><span>{session.duration} мин</span></div><h3>{session.title}</h3><p>Посещение отмечено · материалы доступны в курсе</p></div>
                <div className="session-card__actions"><Button variant="ghost">Материалы</Button></div>
              </Card>
            ))}
          </div>
        </section>
        <aside>
          <Card className="mini-calendar">
            <header><button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}>‹</button><strong>{monthName}</strong><button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}>›</button></header>
            <div className="mini-calendar__week">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="mini-calendar__days">{calendarCells.slice(0,35).map((cell, index) => { const key = dateKeyInTimezone(cell.date, user.timezone); return <button key={`${key}-${index}`} onClick={() => setSelectedDay(selectedDay === key ? null : key)} className={`${cell.muted ? 'muted ' : ''}${key === todayKey ? 'today ' : ''}${sessionDates.has(key) ? 'has-session ' : ''}${selectedDay === key ? 'selected' : ''}`}>{cell.day}</button>; })}</div>
          </Card>
          <Card className="timezone-card"><Clock3 size={20} /><div><strong>Часовой пояс</strong><span>{timezones.find(([value]) => value === user.timezone)?.[1] ?? user.timezone}</span></div><button onClick={() => { setDraftTimezone(user.timezone); setTimezoneOpen(true); }}>Изменить</button></Card>
        </aside>
      </div>

      <Modal open={timezoneOpen} onClose={() => setTimezoneOpen(false)} title="Часовой пояс" actions={<><Button variant="secondary" onClick={() => setTimezoneOpen(false)}>Отмена</Button><Button onClick={saveTimezone}>Сохранить</Button></>}>
        <div className="timezone-modal"><p>Все занятия хранятся как абсолютное время и автоматически отображаются в выбранном часовом поясе.</p><label><span>Часовой пояс</span><select value={draftTimezone} onChange={(event) => setDraftTimezone(event.target.value)}>{timezones.map(([value, label]) => <option value={value} key={value}>{label} · {value}</option>)}</select></label><div className="timezone-preview"><Clock3 size={18}/><div><small>Текущее локальное время</small><strong>{new Intl.DateTimeFormat('ru-RU', { timeZone: draftTimezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}</strong></div></div></div>
      </Modal>
    </AppLayout>
  );
}
