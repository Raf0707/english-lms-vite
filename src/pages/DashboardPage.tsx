import { ArrowRight, BookOpenCheck, CalendarClock, CheckCircle2, Clock3, Flame, Headphones, Play, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ProgressRing } from '../components/ProgressRing';
import { StatCard } from '../components/StatCard';
import { Avatar, Badge, Button, Card } from '../components/ui';
import { courses } from '../data/mock';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../utils/format';

export function DashboardPage() {
  const user = useAppStore((state) => state.user)!;
  const enrollments = useAppStore((state) => state.enrollments);
  const dictionary = useAppStore((state) => state.dictionary);
  const sessions = useAppStore((state) => state.sessions);
  const activeCourses = enrollments.map((enrollment) => ({
    enrollment,
    course: courses.find((course) => course.id === enrollment.courseId)
  })).filter((item) => item.course);
  const nextSession = sessions.filter((session) => session.status === 'scheduled').sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0];
  const dueWords = dictionary.filter((entry) => new Date(entry.nextReviewAt) <= new Date()).length;

  return (
    <AppLayout title={`Добрый вечер, ${user.name.split(' ')[0]}!`} subtitle="Продолжим с того места, где остановились.">
      <div className="dashboard-stats">
        <StatCard icon={<Flame size={22} />} label="Серия занятий" value="7 дней" note="Личный рекорд: 12" />
        <StatCard icon={<Clock3 size={22} />} label="Время за неделю" value="2 ч 45 мин" note="На 18% больше" />
        <StatCard icon={<BookOpenCheck size={22} />} label="Слов в словаре" value={String(dictionary.length)} note={`${dueWords} к повторению`} />
        <StatCard icon={<Trophy size={22} />} label="Средний результат" value="86%" note="По последним тестам" />
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-main-column">
          <div className="section-title-row"><div><span className="eyebrow">Моё обучение</span><h2>Продолжить курс</h2></div><Link to="/app/learning" className="text-link">Все курсы <ArrowRight size={16} /></Link></div>
          {activeCourses.map(({ course, enrollment }) => course && (
            <Card className="continue-course" key={course.id}>
              <img src={course.cover} alt="" />
              <div className="continue-course__content">
                <div className="continue-course__top"><Badge tone="green">{course.level}</Badge><span>{course.category}</span></div>
                <h3>{course.title}</h3>
                <p>{course.shortDescription}</p>
                <div className="continue-course__lesson"><Play size={16} /><span>Следующий урок: {course.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === enrollment.lastLessonId)?.title}</span></div>
                <div className="continue-course__footer">
                  <Link to={`/app/course/${course.id}/lesson/${enrollment.lastLessonId}`}><Button icon={<Play size={17} />}>Продолжить</Button></Link>
                  <div><ProgressRing value={enrollment.progress} size={54} /><span>{enrollment.completedLessonIds.length} урока завершено</span></div>
                </div>
              </div>
            </Card>
          ))}

          <div className="section-title-row dashboard-recommend-heading"><div><span className="eyebrow">Рекомендации</span><h2>На сегодня</h2></div></div>
          <div className="daily-actions">
            <Link to="/app/training" className="daily-action daily-action--words">
              <span><BookOpenCheck size={23} /></span>
              <div><strong>Повторить {dueWords || 3} слова</strong><p>Около 4 минут · интервальный тренажёр</p></div>
              <ArrowRight size={20} />
            </Link>
            <Link to="/app/schedule" className="daily-action daily-action--audio">
              <span><Headphones size={23} /></span>
              <div><strong>Послушать диалог</strong><p>Тема: знакомство · 6 минут</p></div>
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>

        <aside className="dashboard-side-column">
          <Card className="next-session-card">
            <div className="next-session-card__header"><CalendarClock size={20} /><span>Ближайшее занятие</span></div>
            {nextSession ? <>
              <div className="session-date-block"><strong>{new Date(nextSession.startAt).getDate()}</strong><span>{new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(new Date(nextSession.startAt))}</span></div>
              <h3>{nextSession.title}</h3>
              <p>{formatDate(nextSession.startAt, true)} · {nextSession.duration} минут</p>
              <div className="next-session-card__teacher"><Avatar value="НО" size="sm" /><span><small>Преподаватель</small><strong>{nextSession.instructor}</strong></span></div>
              <Link to={`/app/video/${nextSession.id}`}><Button variant="secondary" size="sm">Проверить оборудование</Button></Link>
            </> : <p>Ближайших занятий нет.</p>}
          </Card>
          <Card className="weekly-goal">
            <div className="weekly-goal__header"><span><CheckCircle2 size={20} /> Цель недели</span><strong>3/5</strong></div>
            <div className="weekly-goal__bar"><span style={{ width: '60%' }} /></div>
            <p>Ещё два коротких занятия — и недельная цель выполнена.</p>
            <div className="week-dots">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => <span key={day} className={index < 3 ? 'done' : index === 3 ? 'today' : ''}><i>{index < 3 ? '✓' : ''}</i>{day}</span>)}</div>
          </Card>
        </aside>
      </div>
    </AppLayout>
  );
}
