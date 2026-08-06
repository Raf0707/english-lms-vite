import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  FileText,
  ListChecks,
  Lock,
  Menu,
  Play,
  Volume2
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { DictionaryPopover } from '../components/DictionaryPopover';
import { TestRunner } from '../components/TestRunner';
import { Badge, Button } from '../components/ui';
import { courses } from '../data/mock';
import { useAppStore } from '../store/useAppStore';
import { classNames } from '../utils/format';

export function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [videoPlayed, setVideoPlayed] = useState(false);
  const course = courses.find((item) => item.id === courseId);
  const enrollment = useAppStore((state) => state.enrollments.find((item) => item.courseId === courseId));
  const completeLesson = useAppStore((state) => state.completeLesson);

  const flatLessons = useMemo(() => course?.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module }))) ?? [], [course]);
  const currentIndex = flatLessons.findIndex((item) => item.lesson.id === lessonId);
  const current = flatLessons[currentIndex];
  const previous = flatLessons[currentIndex - 1];
  const next = flatLessons[currentIndex + 1];

  if (!course || !current || !enrollment) {
    return <AppLayout title="Урок недоступен"><div className="not-found-simple"><h2>Урок не найден или у вас нет доступа.</h2><Link to="/app/learning"><Button>К моим курсам</Button></Link></div></AppLayout>;
  }

  const completed = enrollment.completedLessonIds.includes(current.lesson.id);
  const handleComplete = () => {
    completeLesson(course.id, current.lesson.id);
    if (next) navigate(`/app/course/${course.id}/lesson/${next.lesson.id}`);
  };

  return (
    <AppLayout wide>
      <div className="lesson-shell">
        <aside className={classNames('lesson-outline', outlineOpen && 'lesson-outline--open')}>
          <div className="lesson-outline__header">
            <Link to="/app/learning"><ArrowLeft size={18} /></Link>
            <div><small>Курс</small><strong>{course.title}</strong></div>
            <button className="icon-button lesson-outline__mobile-close" onClick={() => setOutlineOpen(false)}>×</button>
          </div>
          <div className="lesson-outline__progress">
            <div><span>Прогресс</span><strong>{enrollment.progress}%</strong></div>
            <div><span style={{ width: `${enrollment.progress}%` }} /></div>
          </div>
          <div className="lesson-outline__modules">
            {course.modules.map((module, moduleIndex) => (
              <section key={module.id}>
                <header><span>{moduleIndex + 1}</span><div><strong>{module.title}</strong><small>{module.lessons.length} уроков</small></div></header>
                <nav>
                  {module.lessons.map((lesson) => {
                    const isCompleted = enrollment.completedLessonIds.includes(lesson.id);
                    const isCurrent = lesson.id === current.lesson.id;
                    const isAvailable = isCompleted || isCurrent || lesson.isPreview || flatLessons.findIndex((item) => item.lesson.id === lesson.id) <= enrollment.completedLessonIds.length + 1;
                    return (
                      <Link
                        to={isAvailable ? `/app/course/${course.id}/lesson/${lesson.id}` : '#'}
                        key={lesson.id}
                        className={classNames(isCurrent && 'active', !isAvailable && 'locked')}
                        onClick={(event) => { if (!isAvailable) event.preventDefault(); else setOutlineOpen(false); }}
                      >
                        <span>{isCompleted ? <CheckCircle2 size={17} /> : isAvailable ? lesson.type === 'video' ? <Play size={16} /> : lesson.type === 'test' ? <ListChecks size={16} /> : <FileText size={16} /> : <Lock size={15} />}</span>
                        <div><strong>{lesson.title}</strong><small>{lesson.duration} мин</small></div>
                      </Link>
                    );
                  })}
                </nav>
              </section>
            ))}
          </div>
        </aside>
        {outlineOpen ? <button className="lesson-outline-overlay" onClick={() => setOutlineOpen(false)} /> : null}

        <section className="lesson-content">
          <header className="lesson-content__top">
            <button className="lesson-outline-toggle" onClick={() => setOutlineOpen(true)}><Menu size={19} /> Содержание</button>
            <div className="lesson-step"><span>{current.module.title}</span><strong>Урок {currentIndex + 1} из {flatLessons.length}</strong></div>
            <div className="lesson-navigation">
              <button disabled={!previous} onClick={() => previous && navigate(`/app/course/${course.id}/lesson/${previous.lesson.id}`)}><ChevronLeft size={18} /></button>
              <button disabled={!next} onClick={() => next && navigate(`/app/course/${course.id}/lesson/${next.lesson.id}`)}><ChevronRight size={18} /></button>
            </div>
          </header>

          <article ref={articleRef} className="lesson-article">
            <div className="lesson-article__heading">
              <div><Badge tone="green">{current.lesson.type === 'video' ? 'Видеоурок' : current.lesson.type === 'test' ? 'Тест' : 'Материал'}</Badge><span><Clock3 size={15} /> {current.lesson.duration} минут</span></div>
              <h1>{current.lesson.title}</h1>
              <p>Выделяйте английские слова в тексте — перевод можно сразу сохранить в личный словарь.</p>
            </div>

            {current.lesson.type === 'video' ? (
              <div className="lesson-video-wrap">
                <video
                  controls
                  poster={course.cover}
                  onPlay={() => setVideoPlayed(true)}
                  preload="metadata"
                >
                  <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4" />
                  Ваш браузер не поддерживает видео.
                </video>
                {!videoPlayed ? <div className="video-hint"><Play size={18} /> Пробный видеоматериал</div> : null}
              </div>
            ) : null}

            {current.lesson.test ? (
              <TestRunner test={current.lesson.test} onPassed={() => completeLesson(course.id, current.lesson.id)} />
            ) : (
              <div className="lesson-blocks">
                {current.lesson.blocks.map((block) => {
                  if (block.type === 'heading') return <h2 key={block.id}>{block.title}</h2>;
                  if (block.type === 'quote') return <blockquote key={block.id}>{block.content}</blockquote>;
                  if (block.type === 'callout') return <div className="lesson-callout" key={block.id}><Volume2 size={21} /><div><strong>{block.title}</strong><p>{block.content}</p></div></div>;
                  return <p key={block.id}>{block.content}</p>;
                })}
                <div className="lesson-vocab-tip">
                  <BookOpen size={21} />
                  <div><strong>Попробуйте умный словарь</strong><p>Выделите слово <em>confidence</em> или <em>carefully</em> в тексте выше.</p></div>
                </div>
              </div>
            )}

            <footer className="lesson-footer-actions">
              <div>
                {completed ? <span className="lesson-completed"><Check size={18} /> Урок завершён</span> : <span><Circle size={17} /> После изучения отметьте урок завершённым</span>}
              </div>
              {current.lesson.test ? (
                next ? <Button onClick={() => navigate(`/app/course/${course.id}/lesson/${next.lesson.id}`)} icon={<ChevronRight size={18} />}>Следующий урок</Button> : null
              ) : (
                <Button onClick={handleComplete} icon={next ? <ChevronRight size={18} /> : <Check size={18} />}>{completed ? (next ? 'Следующий урок' : 'Курс завершён') : (next ? 'Завершить и продолжить' : 'Завершить урок')}</Button>
              )}
            </footer>
          </article>
          <DictionaryPopover courseId={course.id} lessonId={current.lesson.id} containerRef={articleRef} />
        </section>
      </div>
    </AppLayout>
  );
}
