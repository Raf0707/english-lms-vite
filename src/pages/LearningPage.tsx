import { BookOpen, Clock3, Play, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ProgressRing } from '../components/ProgressRing';
import { Badge, Button, Card } from '../components/ui';
import { courses } from '../data/mock';
import { useAppStore } from '../store/useAppStore';

export function LearningPage() {
  const enrollments = useAppStore((state) => state.enrollments);
  return (
    <AppLayout title="Моё обучение" subtitle="Все ваши курсы и прогресс в одном месте.">
      <div className="learning-toolbar">
        <label><Search size={18} /><input placeholder="Найти курс" /></label>
        <div><button className="active">Все</button><button>В процессе</button><button>Завершённые</button></div>
      </div>
      <div className="learning-list">
        {enrollments.map((enrollment) => {
          const course = courses.find((item) => item.id === enrollment.courseId);
          if (!course) return null;
          const allLessons = course.modules.flatMap((module) => module.lessons);
          const next = allLessons.find((lesson) => lesson.id === enrollment.lastLessonId) ?? allLessons[0];
          return (
            <Card className="learning-card" key={course.id}>
              <div className="learning-card__cover"><img src={course.cover} alt="" /><Badge tone="green">{course.level}</Badge></div>
              <div className="learning-card__body">
                <div className="learning-card__status"><span>В процессе</span><small>Доступ до {enrollment.expiresAt ? new Intl.DateTimeFormat('ru-RU').format(new Date(enrollment.expiresAt)) : 'без ограничений'}</small></div>
                <h2>{course.title}</h2>
                <p>{course.shortDescription}</p>
                <div className="learning-card__meta"><span><BookOpen size={17} /> {enrollment.completedLessonIds.length} из {allLessons.length} уроков</span><span><Clock3 size={17} /> {course.duration}</span></div>
                <div className="learning-card__next"><small>Следующий урок</small><strong>{next?.title}</strong></div>
                <div className="learning-card__actions"><Link to={`/app/course/${course.id}/lesson/${next?.id}`}><Button icon={<Play size={17} />}>Продолжить</Button></Link><Link to={`/course/${course.slug}`}><Button variant="ghost">О курсе</Button></Link></div>
              </div>
              <div className="learning-card__progress"><ProgressRing value={enrollment.progress} size={76} /><span>Общий прогресс</span></div>
            </Card>
          );
        })}
      </div>
      <Card className="learning-discover"><div><span className="eyebrow">Новый навык</span><h2>Добавьте ещё одно направление</h2><p>Курсы по путешествиям, разговорной практике и грамматике.</p></div><Link to="/catalog"><Button variant="secondary">Открыть каталог</Button></Link></Card>
    </AppLayout>
  );
}
