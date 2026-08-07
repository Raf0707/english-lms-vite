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
  UploadCloud,
  Video,
  Volume2,
  Square
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { DictionaryPopover } from '../components/DictionaryPopover';
import { TestRunner } from '../components/TestRunner';
import { Badge, Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import type { LessonBlock } from '../types';
import { classNames } from '../utils/format';

export function LessonPage() {
  const courses = useAppStore((state) => state.courses);
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [videoPlayed, setVideoPlayed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const course = courses.find((item) => item.id === courseId);
  const enrollment = useAppStore((state) => state.enrollments.find((item) => item.courseId === courseId));
  const completeLesson = useAppStore((state) => state.completeLesson);
  const addToast = useAppStore((state) => state.addToast);

  const flatLessons = useMemo(() => course?.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module }))) ?? [], [course]);
  const currentIndex = flatLessons.findIndex((item) => item.lesson.id === lessonId);
  const current = flatLessons[currentIndex];
  const previous = flatLessons[currentIndex - 1];
  const next = flatLessons[currentIndex + 1];
  const videoBlock = current?.lesson.blocks.find((block) => block.type === 'video');
  const hasTestBlock = current?.lesson.blocks.some((block) => block.type === 'test');

  const lessonSpeechText = useMemo(() => {
    if (!current) return '';
    const parts = [current.lesson.title];
    current.lesson.blocks.forEach((block) => {
      if (block.title) parts.push(block.title);
      if (block.content) parts.push(block.content);
      if (block.table) {
        parts.push(block.table.headers.join('. '));
        block.table.rows.forEach((row) => parts.push(row.join('. ')));
      }
      if (block.assignment) {
        parts.push(block.assignment.title, block.assignment.instructions);
      }
    });
    return parts.filter(Boolean).join('. ');
  }, [current]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [current?.lesson.id]);

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      addToast({ title: 'Озвучивание недоступно', text: 'Ваш браузер не поддерживает Web Speech API.', tone: 'warning' });
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!lessonSpeechText.trim()) {
      addToast({ title: 'Нет текста для озвучивания', tone: 'warning' });
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lessonSpeechText);
    const cyrillic = (lessonSpeechText.match(/[А-Яа-яЁё]/g) ?? []).length;
    const latin = (lessonSpeechText.match(/[A-Za-z]/g) ?? []).length;
    utterance.lang = latin > cyrillic ? 'en-US' : 'ru-RU';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

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
              <div className="lesson-heading-meta"><div><Badge tone="green">{current.lesson.type === 'video' ? 'Видеоурок' : current.lesson.type === 'test' ? 'Тест' : 'Материал'}</Badge><span><Clock3 size={15} /> {current.lesson.duration} минут</span></div><Button size="sm" variant="secondary" icon={speaking ? <Square size={15}/> : <Volume2 size={16}/>} onClick={toggleSpeech}>{speaking ? 'Остановить' : 'Озвучить урок'}</Button></div>
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
                  <source src={videoBlock?.url ?? 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'} type="video/mp4" />
                  Ваш браузер не поддерживает видео.
                </video>
                {!videoPlayed ? <div className="video-hint"><Play size={18} /> Пробный видеоматериал</div> : null}
              </div>
            ) : null}

            {current.lesson.test && !hasTestBlock ? (
              <TestRunner test={current.lesson.test} onPassed={() => completeLesson(course.id, current.lesson.id)} />
            ) : (
              <div className="lesson-blocks">
                {current.lesson.blocks.map((block) => {
                  if (block.type === 'heading') return <h2 key={block.id}>{block.title}</h2>;
                  if (block.type === 'text') return <LessonTextBlock key={block.id} block={block}/>;
                  if (block.type === 'quote') return <blockquote key={block.id}>{block.content}</blockquote>;
                  if (block.type === 'callout') return <div className="lesson-callout" key={block.id}><Volume2 size={21} /><div><strong>{block.title}</strong><p>{block.content}</p></div></div>;
                  if (block.type === 'table' && block.table) return <div className="lesson-table-wrap" key={block.id}><table><thead><tr>{block.table.headers.map((header, index) => <th key={`${block.id}-h-${index}`}>{header}</th>)}</tr></thead><tbody>{block.table.rows.map((row, rowIndex) => <tr key={`${block.id}-r-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${block.id}-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
                  if (block.type === 'video') return block.url ? <div className="lesson-inline-video" key={block.id}><video controls src={block.url}/>{block.title ? <strong>{block.title}</strong> : null}</div> : null;
                  if (block.type === 'image') return block.url ? <figure className="lesson-inline-image" key={block.id}><img src={block.url} alt={block.title ?? ''}/>{block.title ? <figcaption>{block.title}</figcaption> : null}</figure> : null;
                  if (block.type === 'audio') return block.url ? <div className="lesson-inline-audio" key={block.id}><strong>{block.title ?? block.fileName ?? 'Аудиоматериал'}</strong><audio controls src={block.url}/></div> : null;
                  if (block.type === 'file') return <a className="lesson-file-card" key={block.id} href={block.url ?? '#'} download={block.fileName}><FileText size={22}/><div><strong>{block.title ?? block.fileName ?? 'Материал к уроку'}</strong><span>{block.fileName ?? 'Файл'}</span></div><UploadCloud size={18}/></a>;
                  if (block.type === 'assignment' && block.assignment) return <LessonAssignmentBlock key={block.id} assignment={block.assignment} courseId={course.id} lessonId={current.lesson.id} onToast={addToast}/>;
                  if (block.type === 'conference') return <Card className="lesson-conference-card" key={block.id}><span><Video size={22}/></span><div><strong>{block.title || 'Видеоконференция'}</strong><p>{block.content || 'Живая встреча с преподавателем по расписанию курса.'}</p></div><Link to="/app/schedule"><Button size="sm">Открыть расписание</Button></Link></Card>;
                  if (block.type === 'test' && current.lesson.test) return <TestRunner key={block.id} test={current.lesson.test} onPassed={() => completeLesson(course.id, current.lesson.id)} />;
                  return block.content ? <p key={block.id}>{block.content}</p> : null;
                })}
                <div className="lesson-vocab-tip">
                  <BookOpen size={21} />
                  <div><strong>Попробуйте умный словарь</strong><p>Выделите английское слово в тексте выше — перевод можно сразу сохранить.</p></div>
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


function LessonTextBlock({ block }: { block: LessonBlock }) {
  const style = block.textStyle ?? {};
  const className = [
    'lesson-custom-text',
    `lesson-custom-text--${style.fontSize ?? 'md'}`,
    `lesson-custom-text--${style.align ?? 'left'}`,
    style.bold ? 'is-bold' : '',
    style.italic ? 'is-italic' : '',
    style.underline ? 'is-underlined' : ''
  ].filter(Boolean).join(' ');
  const lines = (block.content ?? '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (style.listStyle === 'bullet') return <ul className={`${className} lesson-custom-list`}>{lines.map((line, index) => <li key={`${block.id}-${index}`}>{line}</li>)}</ul>;
  if (style.listStyle === 'numbered') return <ol className={`${className} lesson-custom-list`}>{lines.map((line, index) => <li key={`${block.id}-${index}`}>{line}</li>)}</ol>;
  return <p className={className}>{block.content}</p>;
}


function LessonAssignmentBlock({ assignment, courseId, lessonId, onToast }: {
  assignment: NonNullable<import('../types').LessonBlock['assignment']>;
  courseId: string;
  lessonId: string;
  onToast: (toast: { title: string; text?: string; tone?: 'success' | 'warning' | 'info' }) => void;
}) {
  const submitAssignment = useAppStore((state) => state.submitAssignment);
  const [answer, setAnswer] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submit = () => {
    if (!answer.trim() && !fileName) {
      onToast({ title: 'Добавьте ответ', text: 'Введите текст или прикрепите файл.', tone: 'warning' });
      return;
    }
    if (assignment.gradingMode === 'auto' && assignment.autoAnswer) {
      const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
      const ok = normalize(answer) === normalize(assignment.autoAnswer);
      if (ok) {
        submitAssignment({ assignmentId: assignment.id, courseId, lessonId, answer, fileName: fileName || undefined, status: 'approved', score: assignment.maxScore, feedback: 'Проверено автоматически.' });
      }
      onToast({ title: ok ? 'Ответ принят' : 'Ответ пока неверный', text: ok ? `Начислено ${assignment.maxScore} баллов.` : 'Проверьте формулировку и попробуйте ещё раз.', tone: ok ? 'success' : 'warning' });
      setSubmitted(ok);
      return;
    }
    submitAssignment({ assignmentId: assignment.id, courseId, lessonId, answer: answer || undefined, fileName: fileName || undefined, status: 'pending' });
    setSubmitted(true);
    onToast({ title: 'Задание отправлено', text: 'Преподаватель получил его в очередь на ручную проверку.', tone: 'success' });
  };
  return <Card className="lesson-assignment-card"><header><span><FileText size={21}/></span><div><small>{assignment.gradingMode === 'auto' ? 'Автоматическая проверка' : 'Ручная проверка преподавателем'}</small><h3>{assignment.title}</h3></div><Badge tone={submitted ? 'green' : 'neutral'}>{submitted ? 'Отправлено' : `${assignment.maxScore} баллов`}</Badge></header><p>{assignment.instructions}</p>{assignment.allowTextAnswer ? <textarea rows={5} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Введите ответ…" disabled={submitted && assignment.gradingMode === 'manual'}/> : null}{assignment.allowFileUpload ? <label className="lesson-assignment-upload"><UploadCloud size={17}/><span>{fileName || 'Прикрепить файл'}</span><input type="file" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}/></label> : null}<Button onClick={submit} disabled={submitted && assignment.gradingMode === 'manual'}>{submitted && assignment.gradingMode === 'manual' ? 'Ожидает проверки' : 'Отправить задание'}</Button></Card>;
}
