import { BookOpen, Clock3, Play, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ProgressRing } from '../components/ProgressRing';
import { Badge, Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

type LearningFilter = 'all' | 'progress' | 'completed';

export function LearningPage() {
  const courses = useAppStore((state) => state.courses);
  const enrollments = useAppStore((state) => state.enrollments);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LearningFilter>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrollments.filter((enrollment) => {
      const course = courses.find((item) => item.id === enrollment.courseId);
      if (!course) return false;
      const matchesQuery = !q || `${course.title} ${course.shortDescription} ${course.category} ${course.level} ${course.instructor}`.toLowerCase().includes(q);
      const matchesFilter = filter === 'all' || (filter === 'completed' ? enrollment.progress >= 100 : enrollment.progress < 100);
      return matchesQuery && matchesFilter;
    });
  }, [courses, enrollments, filter, query]);

  return (
    <AppLayout title="Моё обучение" subtitle="Все ваши курсы и прогресс в одном месте.">
      <div className="learning-toolbar">
        <label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти курс по названию, уровню или преподавателю" /></label>
        <div>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Все</button>
          <button className={filter === 'progress' ? 'active' : ''} onClick={() => setFilter('progress')}>В процессе</button>
          <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Завершённые</button>
        </div>
      </div>
      <div className="learning-list">
        {visible.map((enrollment) => {
          const course = courses.find((item) => item.id === enrollment.courseId);
          if (!course) return null;
          const allLessons = course.modules.flatMap((module) => module.lessons);
          const next = allLessons.find((lesson) => lesson.id === enrollment.lastLessonId) ?? allLessons[0];
          const isCompleted = enrollment.progress >= 100;
          return (
            <Card className="learning-card" key={course.id}>
              <div className="learning-card__cover"><img src={course.cover} alt="" /><Badge tone="green">{course.level}</Badge></div>
              <div className="learning-card__body">
                <div className="learning-card__status"><span>{isCompleted ? 'Завершён' : 'В процессе'}</span><small>Доступ до {enrollment.expiresAt ? new Intl.DateTimeFormat('ru-RU').format(new Date(enrollment.expiresAt)) : 'без ограничений'}</small></div>
                <h2>{course.title}</h2>
                <p>{course.shortDescription}</p>
                <div className="learning-card__meta"><span><BookOpen size={17} /> {enrollment.completedLessonIds.length} из {allLessons.length} уроков</span><span><Clock3 size={17} /> {course.duration}</span></div>
                <div className="learning-card__next"><small>{isCompleted ? 'Последний урок' : 'Следующий урок'}</small><strong>{next?.title ?? 'Программа завершена'}</strong></div>
                <div className="learning-card__actions">{next ? <Link to={`/app/course/${course.id}/lesson/${next.id}`}><Button icon={<Play size={17} />}>{isCompleted ? 'Повторить' : 'Продолжить'}</Button></Link> : null}<Link to={`/course/${course.slug}`}><Button variant="ghost">О курсе</Button></Link></div>
              </div>
              <div className="learning-card__progress"><ProgressRing value={enrollment.progress} size={76} /><span>Общий прогресс</span></div>
            </Card>
          );
        })}
        {!visible.length ? <Card className="learning-search-empty"><Search size={26}/><h3>Курсы не найдены</h3><p>Измените поисковый запрос или выберите другой фильтр.</p><Button size="sm" variant="secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Сбросить поиск</Button></Card> : null}
      </div>
      <Card className="learning-discover"><div><span className="eyebrow">Новый навык</span><h2>Добавьте ещё одно направление</h2><p>Курсы по путешествиям, разговорной практике и грамматике.</p></div><Link to="/catalog"><Button variant="secondary">Открыть каталог</Button></Link></Card>
    </AppLayout>
  );
}
