import {
  Award,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Globe2,
  Lock,
  Play,
  ShieldCheck,
  Star,
  Users,
  Video
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PublicFooter } from '../components/PublicFooter';
import { PublicHeader } from '../components/PublicHeader';
import { Avatar, Badge, Button, Card, Modal } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { formatMoney } from '../utils/format';
import type { Course } from '../types';
import { courseBackend, publicCourseToCourse } from '../services/courseBackend';
import { useCourseCoverUrl } from '../hooks/useCourseCoverUrl';
import { api } from '../services/api';

export function CoursePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const enrollments = useAppStore((state) => state.enrollments);
  const purchase = useAppStore((state) => state.purchaseCourse);
  const loadEnrollments = useAppStore((state) => state.loadEnrollments);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const coverUrl = useCourseCoverUrl(course?.coverAssetId, course?.cover ?? '/course-1.svg', 'public');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    void courseBackend.publicBySlug(slug)
      .then((result) => {
        if (cancelled) return;
        const mapped = publicCourseToCourse(result);
        setCourse(mapped);
        setOpenModule(mapped.modules[0]?.id ?? null);
        setLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setCourse(null);
        setLoadError(error instanceof Error ? error.message : 'Курс не найден');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return <div className="public-page"><PublicHeader /><main className="not-found-simple"><h1>Загружаем курс…</h1><p>Получаем опубликованную версию из backend.</p></main><PublicFooter /></div>;
  }

  if (!course) {
    return (
      <div className="public-page">
        <PublicHeader />
        <main className="not-found-simple"><h1>Курс не найден</h1>{loadError ? <p>{loadError}</p> : null}<Link to="/catalog"><Button>Вернуться в каталог</Button></Link></main>
        <PublicFooter />
      </div>
    );
  }

  const enrollment = enrollments.find((item) => item.courseId === course.id);
  const firstLesson = course.modules[0]?.lessons[0];
  const lessonsCount = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);

  const handlePrimary = () => {
    if (enrollment) {
      navigate(`/app/course/${course.id}/lesson/${enrollment.lastLessonId}`);
      return;
    }
    if (!user) {
      navigate('/login', { state: { from: `/course/${course.slug}` } });
      return;
    }
    if (user.role !== 'student') return;
    if (course.accessMode === 'public-free') {
      void (async () => {
        setPaying(true);
        setPaymentError(null);
        try {
          await api.learning.enrollFree(course.id);
          const enrollments = await loadEnrollments();
          const granted = enrollments.find((item) => item.courseId === course.id);
          const first = granted?.lastLessonId || course.modules[0]?.lessons[0]?.id;
          navigate(first ? `/app/course/${course.id}/lesson/${first}` : '/app/learning');
        } catch (error) {
          setPaymentError(error instanceof Error ? error.message : 'Не удалось записаться на курс');
        } finally {
          setPaying(false);
        }
      })();
      return;
    }
    setCheckoutOpen(true);
  };

  const handlePurchase = async () => {
    setPaying(true);
    setPaymentError(null);
    try {
      const enrollment = await purchase(course);
      setCheckoutOpen(false);
      const first = enrollment.lastLessonId || course.modules[0]?.lessons[0]?.id;
      if (first) navigate(`/app/course/${course.id}/lesson/${first}`);
      else navigate('/app/learning');
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Не удалось завершить оплату');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        <section className="course-detail-hero" style={{ '--course-accent': course.accent } as CSSProperties}>
          <div className="container course-detail-hero__grid">
            <div className="course-detail-hero__content">
              <div className="course-breadcrumbs"><Link to="/catalog">Курсы</Link><span>/</span><span>{course.category}</span></div>
              <div className="course-detail-badges"><Badge tone="green">Уровень {course.level}</Badge><Badge>{course.category}</Badge></div>
              <h1>{course.title}</h1>
              <p>{course.description}</p>
              <div className="course-detail-meta">
                <span><Star size={18} fill="currentColor" /> <strong>{course.rating}</strong> ({course.reviews} отзывов)</span>
                <span><Users size={18} /> {course.students.toLocaleString('ru-RU')} учеников</span>
                <span><Clock3 size={18} /> {course.duration}</span>
              </div>
              <div className="course-instructor-line">
                <Avatar value={course.instructorAvatar} />
                <div><small>Автор курса</small><strong>{course.instructor}</strong></div>
              </div>
            </div>
            <Card className="course-purchase-card">
              <div className="course-purchase-card__cover">
                <img src={coverUrl} alt="" />
                {firstLesson ? <button onClick={() => user ? navigate(`/app/course/${course.id}/lesson/${firstLesson.id}`) : navigate('/login')}><Play size={23} fill="currentColor" /></button> : null}
              </div>
              <div className="course-purchase-card__body">
                <div className="course-price-row">
                  <strong>{course.accessMode === 'public-free' ? 'Бесплатно' : formatMoney(course.price)}</strong>
                  {course.accessMode !== 'public-free' && course.oldPrice ? <s>{formatMoney(course.oldPrice)}</s> : null}
                </div>
                <Button size="lg" loading={paying && course.accessMode === 'public-free'} onClick={handlePrimary}>{enrollment ? 'Продолжить обучение' : course.accessMode === 'public-free' ? 'Записаться бесплатно' : 'Купить курс'}</Button>
                {firstLesson?.isPreview ? <button className="preview-link" onClick={() => user ? navigate(`/app/course/${course.id}/lesson/${firstLesson.id}`) : navigate('/login')}><Play size={16} /> Открыть пробный урок</button> : null}
                <div className="purchase-includes">
                  <strong>В курс входит</strong>
                  <span><Video size={17} /> {lessonsCount} уроков с практикой</span>
                  <span><BookOpen size={17} /> Умный словарь и тренировки</span>
                  <span><Users size={17} /> Живые групповые занятия</span>
                  <span><Globe2 size={17} /> Доступ с любого устройства</span>
                  <span><Award size={17} /> Сертификат после завершения</span>
                </div>
                <small className="secure-note"><ShieldCheck size={15} /> {course.accessMode === 'public-free' ? 'Бесплатный доступ после записи' : 'Безопасная оплата · возврат по условиям оферты'}</small>
              </div>
            </Card>
          </div>
        </section>

        <section className="section course-about">
          <div className="container course-about__grid">
            <div>
              <span className="eyebrow">Результат курса</span>
              <h2>После обучения вы сможете</h2>
              <div className="outcomes-grid">
                {course.outcomes.map((outcome) => <div key={outcome}><Check size={19} /><span>{outcome}</span></div>)}
              </div>
            </div>
            <Card className="course-facts">
              <h3>Подойдёт вам, если</h3>
              <ul>
                <li>хочется понятной последовательности, а не набора случайных тем;</li>
                <li>важно учиться в своём темпе и не терять прогресс;</li>
                <li>нужна разговорная практика с поддержкой преподавателя;</li>
                <li>хочется запоминать лексику прямо из уроков.</li>
              </ul>
            </Card>
          </div>
        </section>

        <section className="section course-program">
          <div className="container course-program__grid">
            <div>
              <span className="eyebrow">Программа</span>
              <h2>{course.modules.length} модуля · {lessonsCount} уроков</h2>
              <p>Уроки открываются последовательно. Пробные материалы отмечены отдельно.</p>
            </div>
            <div className="module-list">
              {course.modules.map((module, moduleIndex) => {
                const isOpen = openModule === module.id;
                return (
                  <article className="module-item" key={module.id}>
                    <button className="module-item__header" onClick={() => setOpenModule(isOpen ? null : module.id)}>
                      <span className="module-index">{String(moduleIndex + 1).padStart(2, '0')}</span>
                      <div><strong>{module.title}</strong><small>{module.description}</small></div>
                      <span>{module.lessons.length} уроков</span>
                      <ChevronDown size={20} className={isOpen ? 'rotate' : ''} />
                    </button>
                    {isOpen ? (
                      <div className="module-item__lessons">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div key={lesson.id}>
                            <span>{lesson.type === 'video' ? <Play size={16} /> : lesson.type === 'test' ? <BookOpen size={16} /> : <Check size={16} />}</span>
                            <div><strong>{lessonIndex + 1}. {lesson.title}</strong><small>{lesson.duration} минут</small></div>
                            {lesson.isPreview ? <Badge tone="green">Пробный</Badge> : <Lock size={15} />}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section instructor-section">
          <div className="container">
            <Card className="instructor-card">
              <Avatar value={course.instructorAvatar} size="xl" />
              <div>
                <span className="eyebrow">Преподаватель</span>
                <h2>{course.instructor}</h2>
                <p>Преподаватель английского языка и автор практических программ. Помогает взрослым начать говорить спокойно, без перегрузки правилами и страха ошибки.</p>
                <div><span><Star size={17} fill="currentColor" /> 4,9 рейтинг</span><span><Users size={17} /> 1 800+ учеников</span><span><Video size={17} /> 6 лет онлайн</span></div>
              </div>
            </Card>
          </div>
        </section>
      </main>
      <PublicFooter />

      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Оформление курса"
        actions={<><Button variant="ghost" onClick={() => setCheckoutOpen(false)}>Отмена</Button><Button loading={paying} onClick={handlePurchase}>Оплатить {formatMoney(course.price)}</Button></>}
      >
        <div className="checkout-summary">
          <img src={coverUrl} alt="" />
          <div><strong>{course.title}</strong><span>Доступ на 6 месяцев</span></div>
          <strong>{formatMoney(course.price)}</strong>
        </div>
        <div className="checkout-method">
          <span className="checkout-method__radio" />
          <div><strong>Банковская карта</strong><small>Демо-оплата без передачи платёжных данных</small></div>
          <span>МИР · VISA</span>
        </div>
        <label className="checkout-consent"><input type="checkbox" defaultChecked /> <span>Я принимаю условия оферты и согласен на обработку персональных данных.</span></label>
        {paymentError ? <p className="checkout-error">{paymentError}</p> : null}
        <p className="checkout-demo-note">В development создаётся настоящий Order/Payment в backend, затем mock-провайдер подтверждает оплату и сервер создаёт Enrollment. В production подтверждение придёт через webhook эквайринга.</p>
      </Modal>
    </div>
  );
}
