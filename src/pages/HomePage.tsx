import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Hand,
  MessageCircle,
  Mic,
  PhoneOff,
  Play,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CourseCard } from '../components/CourseCard';
import { PublicFooter } from '../components/PublicFooter';
import { PublicHeader } from '../components/PublicHeader';
import { Avatar, Badge, Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

const method = [
  {
    icon: <Play size={22} />,
    title: 'Короткие понятные уроки',
    text: 'Видео, текст и практика собраны в небольшие шаги, которые легко встроить в обычный день.'
  },
  {
    icon: <BookOpenCheck size={22} />,
    title: 'Слова из живого контекста',
    text: 'Выделяйте слова прямо в уроке, сохраняйте перевод и повторяйте в нужный момент.'
  },
  {
    icon: <Video size={22} />,
    title: 'Занятия с преподавателем',
    text: 'Индивидуальные встречи и разговорные группы проходят прямо на платформе.'
  }
];

export function HomePage() {
  const courses = useAppStore((state) => state.courses).filter((course) => course.status === 'published');
  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        <section className="hero">
          <div className="hero__glow hero__glow--one" />
          <div className="hero__glow hero__glow--two" />
          <div className="container hero__grid">
            <div className="hero__content">
              <Badge tone="green"><Sparkles size={14} /> Английский в комфортном темпе</Badge>
              <h1>Начните говорить — <em>без страха ошибиться</em></h1>
              <p>
                Понятные уроки, умный словарь и живые занятия с преподавателем. Всё, что нужно для уверенного английского, в одной спокойной системе.
              </p>
              <div className="hero__actions">
                <Link to="/catalog"><Button size="lg" icon={<ArrowRight size={19} />}>Выбрать курс</Button></Link>
                <a href="#method"><Button variant="secondary" size="lg" icon={<Play size={19} />}>Как это работает</Button></a>
              </div>
              <div className="hero__proof">
                <div className="avatar-stack">
                  {['АН', 'ИР', 'ЕК', 'МС'].map((item) => <Avatar key={item} value={item} size="sm" />)}
                </div>
                <div>
                  <div className="stars"><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /></div>
                  <span>4,9 · учатся более 3 400 человек</span>
                </div>
              </div>
            </div>
            <div className="hero__visual">
              <div className="hero-card hero-card--lesson">
                <div className="hero-card__top">
                  <span className="mini-logo">L</span>
                  <span>Урок 3 из 24</span>
                  <button><ChevronRight size={17} /></button>
                </div>
                <div className="hero-video">
                  <img src="/course-1.svg" alt="" />
                  <button><Play size={24} fill="currentColor" /></button>
                  <span>08:42</span>
                </div>
                <div className="hero-lesson-copy">
                  <small>Модуль 1 · Начинаем говорить</small>
                  <strong>Знакомство без неловкости</strong>
                  <div className="hero-progress"><span style={{ width: '62%' }} /></div>
                </div>
              </div>
              <div className="hero-card hero-card--word">
                <div className="word-icon">Aa</div>
                <small>Слово дня</small>
                <strong>confidence</strong>
                <span>/ˈkɒnfɪdəns/</span>
                <p>уверенность</p>
                <button><Headphones size={17} /></button>
              </div>
              <div className="hero-card hero-card--session">
                <div className="session-dot" />
                <div>
                  <small>Завтра, 19:00</small>
                  <strong>Разговорная практика</strong>
                </div>
                <div className="avatar-stack"><Avatar value="НО" size="sm" /><Avatar value="+7" size="sm" /></div>
              </div>
            </div>
          </div>
          <div className="container hero__trust">
            <span><ShieldCheck size={18} /> Безопасная оплата</span>
            <span><Clock3 size={18} /> Доступ 24/7</span>
            <span><MessageCircle size={18} /> Поддержка преподавателя</span>
            <span><Users size={18} /> Разговорные группы</span>
          </div>
        </section>

        <section className="section section--courses">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div>
                <span className="eyebrow">Курсы</span>
                <h2>Найдите свой следующий шаг</h2>
                <p>От первого знакомства с английским до свободной разговорной практики.</p>
              </div>
              <Link to="/catalog" className="text-link">Все курсы <ArrowRight size={17} /></Link>
            </div>
            <div className="course-grid">
              {courses.slice(0, 3).map((course) => <CourseCard key={course.id} course={course} />)}
            </div>
          </div>
        </section>

        <section className="section method" id="method">
          <div className="container">
            <div className="section-heading section-heading--center">
              <span className="eyebrow">Методика</span>
              <h2>Учиться спокойно. Запоминать надолго.</h2>
              <p>Платформа подсказывает следующий шаг и не заставляет держать весь учебный процесс в голове.</p>
            </div>
            <div className="method-grid">
              {method.map((item, index) => (
                <Card key={item.title} className="method-card">
                  <span className="method-card__number">0{index + 1}</span>
                  <div className="method-card__icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="section feature-word">
          <div className="container feature-word__grid">
            <div className="feature-word__demo">
              <div className="article-demo">
                <div className="article-demo__line article-demo__line--short" />
                <h3>Your first confident conversation</h3>
                <p>
                  When you meet someone for the first time, keep the conversation simple. Say your name, ask a friendly question and <mark>listen carefully</mark>.
                </p>
                <p>Confidence grows when you use short, clear phrases.</p>
                <div className="translation-card">
                  <div>
                    <small>listen carefully</small>
                    <strong>слушать внимательно</strong>
                  </div>
                  <button><BookOpenCheck size={18} /> В словарь</button>
                </div>
              </div>
            </div>
            <div className="feature-word__copy">
              <Badge tone="violet">Умный словарь</Badge>
              <h2>Сохраняйте слова там, где встретили их</h2>
              <p>
                Не нужно переключаться между переводчиком, заметками и карточками. Выделите слово в уроке — платформа сохранит перевод и целое предложение.
              </p>
              <ul className="check-list">
                <li><Check size={18} /> Перевод с учётом контекста</li>
                <li><Check size={18} /> Произношение и примеры</li>
                <li><Check size={18} /> Интервальные повторения SM-2</li>
                <li><Check size={18} /> Личная статистика запоминания</li>
              </ul>
              <Link to="/register"><Button variant="secondary">Попробовать бесплатно</Button></Link>
            </div>
          </div>
        </section>

        <section className="section live-section">
          <div className="container live-section__grid">
            <div className="live-section__copy">
              <span className="eyebrow">Живые занятия</span>
              <h2>Преподаватель рядом, когда это действительно нужно</h2>
              <p>Практикуйте речь, разбирайте трудные темы и получайте обратную связь прямо внутри платформы.</p>
              <div className="live-points">
                <div><span><Video size={20} /></span><div><strong>Без сторонних сервисов</strong><p>Комната открывается в браузере, без установки Zoom.</p></div></div>
                <div><span><Users size={20} /></span><div><strong>Индивидуально и в группе</strong><p>Личные занятия, клубы и вебинары до 50 участников.</p></div></div>
                <div><span><MessageCircle size={20} /></span><div><strong>Материалы и чат под рукой</strong><p>Экран, сообщения и история занятия связаны с курсом.</p></div></div>
              </div>
              <div className="live-section__actions"><Link to="/teachers"><Button variant="secondary" icon={<Users size={17}/>}>Выбрать преподавателя</Button></Link></div>
            </div>
            <div className="video-room-preview">
              <div className="video-room-preview__header"><span>Conversation Club</span><small>00:24:18</small></div>
              <div className="video-room-preview__grid">
                {['НО', 'АВ', 'МК', 'ДС'].map((value, index) => (
                  <div key={value} className={index === 0 ? 'speaking' : ''}>
                    <Avatar value={value} size="xl" />
                    <span>{['Наталья', 'Анна', 'Михаил', 'Дарья'][index]}</span>
                  </div>
                ))}
              </div>
              <div className="video-room-preview__controls"><span title="Микрофон"><Mic size={17}/></span><span title="Камера"><Video size={17}/></span><span title="Поднять руку"><Hand size={17}/></span><span title="Чат"><MessageCircle size={17}/></span><span className="leave" title="Завершить"><PhoneOff size={17}/></span></div>
            </div>
          </div>
        </section>

        <section className="section reviews" id="reviews">
          <div className="container">
            <div className="section-heading section-heading--center">
              <span className="eyebrow">Отзывы</span>
              <h2>Результат, который чувствуется в жизни</h2>
            </div>
            <div className="reviews-grid">
              {[
                ['Ирина К.', 'Начала отвечать иностранцам, а не просто улыбаться. Очень нравится, что уроки короткие и никогда не кажется, что я отстала.', 'Английский для жизни'],
                ['Марина Л.', 'Словарь — моя любимая функция. Добавляю фразы из урока, а платформа сама напоминает, когда их повторить.', 'Английский для путешествий'],
                ['Дмитрий С.', 'На разговорном клубе впервые говорил почти час. Преподаватель мягко исправляет и помогает продолжить мысль.', 'Разговорная практика B1']
              ].map(([name, text, course]) => (
                <Card className="review-card" key={name}>
                  <Quote size={28} />
                  <p>{text}</p>
                  <div><Avatar value={name.split(' ').map((p) => p[0]).join('')} /><span><strong>{name}</strong><small>{course}</small></span></div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="section final-cta">
          <div className="container">
            <div className="final-cta__inner">
              <div>
                <Badge tone="amber">Первый урок бесплатно</Badge>
                <h2>Ваш английский может стать привычкой</h2>
                <p>Выберите курс, откройте пробный урок и сделайте первый спокойный шаг уже сегодня.</p>
              </div>
              <Link to="/catalog"><Button size="lg" variant="secondary" icon={<ArrowRight size={19} />}>Посмотреть курсы</Button></Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
