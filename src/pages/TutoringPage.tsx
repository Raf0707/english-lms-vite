import { CalendarClock, Check, Clock3, Search, Star, Users, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { PublicFooter } from '../components/PublicFooter';
import { PublicHeader } from '../components/PublicHeader';
import { Avatar, Badge, Button, Card, Modal } from '../components/ui';
import { instructors } from '../data/mock';
import { useAppStore } from '../store/useAppStore';
import type { TutoringSlot } from '../types';
import { formatMoney } from '../utils/format';

export function TutoringPage({ publicMode = false }: { publicMode?: boolean }) {
  const user = useAppStore((state) => state.user);
  const slots = useAppStore((state) => state.tutoringSlots);
  const bookSlot = useAppStore((state) => state.bookTutoringSlot);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'individual' | 'group'>('all');
  const [selected, setSelected] = useState<TutoringSlot | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const filtered = useMemo(() => instructors.filter((teacher) => {
    const q = search.trim().toLowerCase();
    const matches = !q || `${teacher.name} ${teacher.headline} ${teacher.specialties.join(' ')}`.toLowerCase().includes(q);
    const hasType = type === 'all' || slots.some((slot) => slot.instructorId === teacher.id && slot.type === type && !slot.booked && slot.attendees < slot.maxAttendees);
    return matches && hasType;
  }), [search, slots, type]);

  const confirmBooking = () => {
    if (!selected) return;
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (user.role !== 'student') return;
    bookSlot(selected.id);
    setSelected(null);
  };

  const content = (
    <>
      <div className={publicMode ? 'container tutoring-container' : 'tutoring-container'}>
        {publicMode ? <div className="tutoring-public-head"><span className="eyebrow">Живые занятия</span><h1>Выберите преподавателя и удобное время</h1><p>Индивидуальные занятия и небольшие разговорные группы можно бронировать отдельно от курсов.</p></div> : null}
        <div className="tutoring-toolbar">
          <label><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя, направление или навык"/></label>
          <div className="schedule-view-switch"><button className={type === 'all' ? 'active' : ''} onClick={() => setType('all')}>Все</button><button className={type === 'individual' ? 'active' : ''} onClick={() => setType('individual')}>Индивидуальные</button><button className={type === 'group' ? 'active' : ''} onClick={() => setType('group')}>Групповые</button></div>
        </div>
        <div className="teacher-market-grid">
          {filtered.map((teacher) => {
            const teacherSlots = slots.filter((slot) => slot.instructorId === teacher.id && !slot.booked && slot.attendees < slot.maxAttendees).slice(0, 5);
            return (
              <Card className="teacher-market-card" key={teacher.id}>
                <div className="teacher-market-card__profile">
                  <Avatar value={teacher.avatar} size="xl" />
                  <div><h2>{teacher.name}</h2><p>{teacher.headline}</p><span className="teacher-rating"><Star size={15} fill="currentColor"/> {teacher.rating} · {teacher.reviews} отзывов</span></div>
                </div>
                <p className="teacher-market-card__bio">{teacher.bio}</p>
                <div className="teacher-specialties">{teacher.specialties.map((item) => <Badge key={item}>{item}</Badge>)}</div>
                <div className="teacher-prices"><div><span>Индивидуально</span><strong>{formatMoney(teacher.individualPrice)}</strong><small>50 минут</small></div><div><span>В группе</span><strong>{formatMoney(teacher.groupPrice)}</strong><small>за занятие</small></div></div>
                <div className="teacher-slots">
                  <header><strong>Ближайшие свободные окна</strong><small>Ваш часовой пояс</small></header>
                  {teacherSlots.length ? teacherSlots.map((slot) => <button key={slot.id} onClick={() => setSelected(slot)}><div><strong>{new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(slot.startAt))}</strong><span>{new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(slot.startAt))}</span></div><Badge tone={slot.type === 'individual' ? 'amber' : 'violet'}>{slot.type === 'individual' ? '1-на-1' : `Группа ${slot.attendees}/${slot.maxAttendees}`}</Badge><strong>{formatMoney(slot.price)}</strong></button>) : <div className="teacher-slots-empty">Нет свободных окон по выбранному фильтру.</div>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Подтверждение занятия" actions={<><Button variant="secondary" onClick={() => setSelected(null)}>Отмена</Button><Button onClick={confirmBooking}>{user ? 'Оплатить и забронировать' : 'Войти и продолжить'}</Button></>}>
        {selected ? (() => {
          const teacher = instructors.find((item) => item.id === selected.instructorId)!;
          return <div className="booking-modal"><div className="booking-teacher"><Avatar value={teacher.avatar}/><div><strong>{teacher.name}</strong><span>{selected.type === 'individual' ? 'Индивидуальное занятие' : 'Групповое занятие'}</span></div></div><div className="booking-summary"><p><CalendarClock size={17}/><span>{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(selected.startAt))}</span></p><p><Clock3 size={17}/><span>{selected.duration} минут</span></p><p>{selected.type === 'group' ? <Users size={17}/> : <Video size={17}/>}<span>{selected.type === 'group' ? `${selected.attendees + 1}/${selected.maxAttendees} участников после бронирования` : 'Персональная видеокомната'}</span></p></div><div className="booking-price"><span>К оплате</span><strong>{formatMoney(selected.price)}</strong></div><small className="booking-note"><Check size={15}/> После бронирования занятие появится в разделе «Расписание», а оплата — в истории платежей.</small></div>;
        })() : null}
      </Modal>
    </>
  );

  if (publicMode) return <div className="public-page"><PublicHeader/><main className="tutoring-public-page">{content}</main><PublicFooter/></div>;
  return <AppLayout title="Преподаватели" subtitle="Индивидуальные и групповые занятия вне курсов.">{content}</AppLayout>;
}
