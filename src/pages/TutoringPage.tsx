import { CalendarClock, Check, Clock3, Repeat2, Search, Star, Users, Video } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { PublicFooter } from '../components/PublicFooter';
import { PublicHeader } from '../components/PublicHeader';
import { Avatar, Badge, Button, Card, Modal } from '../components/ui';
import { api, ApiError, type BackendAvailability, type BackendTeacherPublic } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import type { TutoringSlot } from '../types';
import { formatMoney } from '../utils/format';

function slotFromBackend(item: BackendAvailability): TutoringSlot {
  return {
    id: item.id,
    instructorId: item.teacherId,
    type: item.type === 'GROUP' ? 'group' : 'individual',
    startAt: item.startAt,
    duration: Math.max(1, Math.round((+new Date(item.endAt) - +new Date(item.startAt)) / 60000)),
    price: Math.round(item.priceMinor / 100),
    maxAttendees: item.maxParticipants,
    attendees: item.attendees ?? 0,
    booked: Boolean(item.booked)
  };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'PR';
}

type RecurringPattern = { key: string; slots: TutoringSlot[]; weekday: string; time: string; duration: number; price: number };
function recurringPatterns(slots: TutoringSlot[], teacherId: string): RecurringPattern[] {
  const groups = new Map<string, TutoringSlot[]>();
  for (const slot of slots.filter((item) => item.instructorId === teacherId && item.type === 'individual' && !item.booked && item.attendees < item.maxAttendees)) {
    const d = new Date(slot.startAt);
    const key = `${d.getDay()}-${d.getHours()}-${d.getMinutes()}-${slot.duration}-${slot.price}`;
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }
  return [...groups.entries()].map(([key, items]) => {
    items.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    const first = new Date(items[0].startAt);
    return { key, slots: items, weekday: new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(first), time: new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(first), duration: items[0].duration, price: items[0].price };
  }).filter((item) => item.slots.length >= 2).sort((a, b) => +new Date(a.slots[0].startAt) - +new Date(b.slots[0].startAt));
}

export function TutoringPage({ publicMode = false }: { publicMode?: boolean }) {
  const user = useAppStore((state) => state.user);
  const loadSchedule = useAppStore((state) => state.loadSchedule);
  const loadPayments = useAppStore((state) => state.loadPayments);
  const addToast = useAppStore((state) => state.addToast);
  const [teachers, setTeachers] = useState<BackendTeacherPublic[]>([]);
  const [slots, setSlots] = useState<TutoringSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'individual' | 'group'>('all');
  const [selected, setSelected] = useState<TutoringSlot | null>(null);
  const [booking, setBooking] = useState(false);
  const [seriesTeacher, setSeriesTeacher] = useState<BackendTeacherPublic | null>(null);
  const [seriesPatternKey, setSeriesPatternKey] = useState('');
  const [seriesCount, setSeriesCount] = useState(4);
  const navigate = useNavigate();
  const location = useLocation();

  const loadMarket = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await api.teachers.list();
      setTeachers(rows);
      const from = new Date(Date.now() - 60_000).toISOString();
      const to = new Date(Date.now() + 400 * 86400000).toISOString();
      const availability = await Promise.all(rows.map(async (teacher) => {
        try {
          return (await api.teachers.availability(teacher.id, from, to)).map(slotFromBackend);
        } catch {
          return [] as TutoringSlot[];
        }
      }));
      setSlots(availability.flat());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Не удалось загрузить преподавателей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMarket(); }, [loadMarket]);

  const filtered = useMemo(() => teachers.filter((teacher) => {
    const q = search.trim().toLowerCase();
    const matches = !q || `${teacher.name} ${teacher.headline} ${teacher.specialties.join(' ')}`.toLowerCase().includes(q);
    const hasType = type === 'all' || slots.some((slot) => slot.instructorId === teacher.id && slot.type === type && !slot.booked && slot.attendees < slot.maxAttendees);
    return matches && hasType;
  }), [search, slots, teachers, type]);

  const confirmBooking = async () => {
    if (!selected) return;
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (user.role !== 'student') {
      addToast({ title: 'Запись доступна ученику', text: 'Переключитесь на аккаунт ученика.', tone: 'info' });
      return;
    }
    setBooking(true);
    try {
      const booked = await api.schedule.bookAvailability(selected.id);
      if (booked.needsPayment) {
        const order = await api.payments.createBookingOrder(booked.bookingId);
        if (order.provider === 'mock') await api.payments.mockSucceed(order.paymentId);
        else if (order.confirmationUrl) window.location.assign(order.confirmationUrl);
      }
      await Promise.allSettled([loadSchedule(), loadPayments(), loadMarket()]);
      addToast({ title: 'Занятие забронировано', text: booked.needsPayment ? 'Оплата подтверждена, занятие появилось в расписании.' : 'Занятие появилось в расписании.', tone: 'success' });
      setSelected(null);
    } catch (e) {
      addToast({ title: 'Не удалось забронировать', text: e instanceof Error ? e.message : 'Ошибка backend', tone: 'warning' });
    } finally {
      setBooking(false);
    }
  };

  const seriesPatterns = useMemo(() => seriesTeacher ? recurringPatterns(slots, seriesTeacher.id) : [], [seriesTeacher, slots]);
  const selectedPattern = seriesPatterns.find((item) => item.key === seriesPatternKey) ?? seriesPatterns[0];
  const effectiveSeriesCount = selectedPattern ? Math.max(2, Math.min(seriesCount, selectedPattern.slots.length)) : 2;

  const openSeries = (teacher: BackendTeacherPublic) => {
    const patterns = recurringPatterns(slots, teacher.id);
    setSeriesTeacher(teacher);
    setSeriesPatternKey(patterns[0]?.key ?? '');
    setSeriesCount(Math.min(4, patterns[0]?.slots.length ?? 2));
  };

  const confirmSeriesBooking = async () => {
    if (!seriesTeacher || !selectedPattern) return;
    if (!user) { navigate('/login', { state: { from: location.pathname } }); return; }
    if (user.role !== 'student') { addToast({ title: 'Запись доступна ученику', tone: 'info' }); return; }
    setBooking(true);
    try {
      const chosen = selectedPattern.slots.slice(0, effectiveSeriesCount);
      const result = await api.schedule.bookAvailabilitySeries(chosen.map((item) => item.id), user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (result.needsPayment) {
        const order = await api.payments.createBookingSeriesOrder(result.seriesId);
        if (order.provider === 'mock') await api.payments.mockSucceed(order.paymentId);
        else if (order.confirmationUrl) { window.location.assign(order.confirmationUrl); return; }
      }
      await Promise.allSettled([loadSchedule(), loadPayments(), loadMarket()]);
      addToast({ title: 'Серия занятий забронирована', text: `${result.lessons} занятий добавлены в расписание${result.needsPayment ? ' и оплачены одним заказом' : ''}.`, tone: 'success' });
      setSeriesTeacher(null);
    } catch (error) {
      addToast({ title: 'Не удалось забронировать серию', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    } finally { setBooking(false); }
  };

  const content = (
    <>
      <div className={publicMode ? 'container tutoring-container' : 'tutoring-container'}>
        {publicMode ? <div className="tutoring-public-head"><span className="eyebrow">Живые занятия</span><h1>Выберите преподавателя и удобное время</h1><p>Индивидуальные занятия и небольшие разговорные группы можно бронировать отдельно от курсов.</p></div> : null}
        <div className="tutoring-toolbar">
          <label><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя, направление или навык"/></label>
          <div className="schedule-view-switch"><button className={type === 'all' ? 'active' : ''} onClick={() => setType('all')}>Все</button><button className={type === 'individual' ? 'active' : ''} onClick={() => setType('individual')}>Индивидуальные</button><button className={type === 'group' ? 'active' : ''} onClick={() => setType('group')}>Групповые</button></div>
        </div>
        {loading ? <Card className="teacher-market-loading"><h3>Загружаем преподавателей…</h3><p>Профили и свободные окна приходят с backend.</p></Card> : null}
        {error ? <Card className="teacher-market-loading"><h3>Не удалось загрузить преподавателей</h3><p>{error}</p><Button size="sm" onClick={() => void loadMarket()}>Повторить</Button></Card> : null}
        {!loading && !error ? <div className="teacher-market-grid">
          {filtered.map((teacher) => {
            const teacherSlots = slots.filter((slot) => slot.instructorId === teacher.id && !slot.booked && slot.attendees < slot.maxAttendees).slice(0, 5);
            return (
              <Card className="teacher-market-card" key={teacher.id}>
                <div className="teacher-market-card__profile">
                  <Avatar value={initials(teacher.name)} size="xl" />
                  <div><h2>{teacher.name}</h2><p>{teacher.headline}</p><span className="teacher-rating"><Star size={15} fill="currentColor"/> {teacher.rating} · {teacher.reviews} отзывов</span></div>
                </div>
                <p className="teacher-market-card__bio">{teacher.bio || 'Преподаватель пока не добавил описание профиля.'}</p>
                <div className="teacher-specialties">{teacher.specialties.map((item) => <Badge key={item}>{item}</Badge>)}</div>
                <div className="teacher-prices"><div><span>Индивидуально</span><strong>{formatMoney(teacher.individualPriceMinor / 100)}</strong><small>за занятие</small></div><div><span>В группе</span><strong>{formatMoney(teacher.groupPriceMinor / 100)}</strong><small>за занятие</small></div></div>
                <div className="teacher-slots">
                  <header><strong>Ближайшие свободные окна</strong><small>Ваш часовой пояс</small></header>
                  {teacherSlots.length ? teacherSlots.map((slot) => <button key={slot.id} onClick={() => setSelected(slot)}><div><strong>{new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(slot.startAt))}</strong><span>{new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(slot.startAt))}</span></div><Badge tone={slot.type === 'individual' ? 'amber' : 'violet'}>{slot.type === 'individual' ? '1-на-1' : `Группа ${slot.attendees}/${slot.maxAttendees}`}</Badge><strong>{formatMoney(slot.price)}</strong></button>) : <div className="teacher-slots-empty">Нет свободных окон по выбранному фильтру.</div>}
                </div>
                {recurringPatterns(slots, teacher.id).length ? <button className="teacher-recurring-cta" onClick={() => openSeries(teacher)}><Repeat2 size={16}/><span><strong>Записаться регулярно</strong><small>Несколько индивидуальных занятий в одно время, одна оплата</small></span></button> : null}
              </Card>
            );
          })}
        </div> : null}
      </div>

      <Modal open={Boolean(selected)} onClose={() => !booking && setSelected(null)} title="Подтверждение занятия" actions={<><Button variant="secondary" onClick={() => setSelected(null)} disabled={booking}>Отмена</Button><Button onClick={() => void confirmBooking()} disabled={booking}>{booking ? 'Оформляем…' : user ? 'Оплатить и забронировать' : 'Войти и продолжить'}</Button></>}>
        {selected ? (() => {
          const teacher = teachers.find((item) => item.id === selected.instructorId);
          return <div className="booking-modal"><div className="booking-teacher"><Avatar value={initials(teacher?.name ?? 'PR')}/><div><strong>{teacher?.name ?? 'Преподаватель'}</strong><span>{selected.type === 'individual' ? 'Индивидуальное занятие' : 'Групповое занятие'}</span></div></div><div className="booking-summary"><p><CalendarClock size={17}/><span>{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(selected.startAt))}</span></p><p><Clock3 size={17}/><span>{selected.duration} минут</span></p><p>{selected.type === 'group' ? <Users size={17}/> : <Video size={17}/>}<span>{selected.type === 'group' ? `${selected.attendees + 1}/${selected.maxAttendees} участников после бронирования` : 'Персональная видеокомната'}</span></p></div><div className="booking-price"><span>К оплате</span><strong>{formatMoney(selected.price)}</strong></div><small className="booking-note"><Check size={15}/> После бронирования занятие появится в разделе «Расписание», а заказ — в истории платежей.</small></div>;
        })() : null}
      </Modal>

      <Modal open={Boolean(seriesTeacher)} onClose={() => !booking && setSeriesTeacher(null)} title="Регулярные индивидуальные занятия" actions={<><Button variant="secondary" onClick={() => setSeriesTeacher(null)} disabled={booking}>Отмена</Button><Button onClick={() => void confirmSeriesBooking()} disabled={booking || !selectedPattern}>{booking ? 'Оформляем…' : user ? 'Оплатить пакет и забронировать' : 'Войти и продолжить'}</Button></>}>
        {seriesTeacher ? <div className="recurring-booking-modal"><div className="booking-teacher"><Avatar value={initials(seriesTeacher.name)}/><div><strong>{seriesTeacher.name}</strong><span>Выберите постоянный день и количество занятий</span></div></div>{seriesPatterns.length ? <><div className="recurring-pattern-list">{seriesPatterns.map((pattern) => <button key={pattern.key} className={selectedPattern?.key === pattern.key ? 'active' : ''} onClick={() => { setSeriesPatternKey(pattern.key); setSeriesCount(Math.min(4, pattern.slots.length)); }}><Repeat2 size={16}/><span><strong>{pattern.weekday}, {pattern.time}</strong><small>{pattern.duration} мин · доступно {pattern.slots.length} дат</small></span><b>{formatMoney(pattern.price)} / занятие</b></button>)}</div>{selectedPattern ? <><label className="recurring-count"><span>Количество занятий</span><input type="number" min="2" max={selectedPattern.slots.length} value={effectiveSeriesCount} onChange={(event) => setSeriesCount(Number(event.target.value))}/><small>Занятия сразу резервируются на конкретные даты.</small></label><div className="recurring-dates">{selectedPattern.slots.slice(0, effectiveSeriesCount).map((slot, index) => <span key={slot.id}><b>{index + 1}</b>{new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(slot.startAt))}</span>)}</div><div className="booking-price"><span>За {effectiveSeriesCount} занятий</span><strong>{formatMoney(selectedPattern.slots.slice(0, effectiveSeriesCount).reduce((sum, item) => sum + item.price, 0))}</strong></div></> : null}</> : <p>У преподавателя пока нет повторяющихся свободных окон.</p>}</div> : null}
      </Modal>
    </>
  );

  if (publicMode) return <div className="public-page"><PublicHeader/><main className="tutoring-public-page">{content}</main><PublicFooter/></div>;
  return <AppLayout title="Преподаватели" subtitle="Индивидуальные и групповые занятия вне курсов.">{content}</AppLayout>;
}
