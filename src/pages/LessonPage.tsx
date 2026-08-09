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
import { sanitizeRichTextHtml } from '../utils/richText';
import { SAFE_STUDENT_ATTACHMENT_ACCEPT, validateAttachmentForRole } from '../utils/fileUploadPolicy';
import { api } from '../services/api';

export function LessonPage() {
  const courses = useAppStore((state) => state.courses);
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [videoPlayed, setVideoPlayed] = useState(false);
  const [selectedSpeechText, setSelectedSpeechText] = useState('');
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const course = courses.find((item) => item.id === courseId);
  const enrollment = useAppStore((state) => state.enrollments.find((item) => item.courseId === courseId));
  const learningStatus = useAppStore((state) => state.learningStatus);
  const loadEnrollments = useAppStore((state) => state.loadEnrollments);
  const completeLesson = useAppStore((state) => state.completeLesson);
  const addToast = useAppStore((state) => state.addToast);

  const flatLessons = useMemo(() => course?.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module }))) ?? [], [course]);
  const currentIndex = flatLessons.findIndex((item) => item.lesson.id === lessonId);
  const current = flatLessons[currentIndex];
  const previous = flatLessons[currentIndex - 1];
  const next = flatLessons[currentIndex + 1];
  const videoBlock = current?.lesson.blocks.find((block) => block.type === 'video');
  const [primaryVideoUrl, setPrimaryVideoUrl] = useState<string | null>(videoBlock?.url ?? null);
  const hasTestBlock = current?.lesson.blocks.some((block) => block.type === 'test');

  useEffect(() => {
    if ((!course || !enrollment) && (learningStatus === 'idle' || learningStatus === 'error')) {
      void loadEnrollments().catch(() => undefined);
    }
  }, [course, enrollment, learningStatus, loadEnrollments]);

  useEffect(() => {
    setSpeakingKey(null);
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [current?.lesson.id]);

  useEffect(() => {
    let cancelled = false;
    setPrimaryVideoUrl(videoBlock?.url ?? null);
    if (!videoBlock?.assetId || videoBlock.url) return () => { cancelled = true; };
    void api.media.url(videoBlock.assetId).then((asset) => {
      if (!cancelled) setPrimaryVideoUrl(asset.url);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [videoBlock?.assetId, videoBlock?.url, current?.lesson.id]);

  const speakText = (text: string, key: string) => {
    const clean = text.trim();
    if (!clean) return;
    if (!('speechSynthesis' in window)) {
      addToast({ title: 'Озвучивание недоступно', text: 'Ваш браузер не поддерживает Web Speech API.', tone: 'warning' });
      return;
    }
    if (speakingKey === key) {
      window.speechSynthesis.cancel();
      setSpeakingKey(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    const cyrillic = (clean.match(/[А-Яа-яЁё]/g) ?? []).length;
    const latin = (clean.match(/[A-Za-z]/g) ?? []).length;
    utterance.lang = latin > cyrillic ? 'en-US' : 'ru-RU';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingKey((current) => current === key ? null : current);
    utterance.onerror = () => setSpeakingKey((current) => current === key ? null : current);
    setSpeakingKey(key);
    window.speechSynthesis.speak(utterance);
  };

  const captureSelectedText = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    const anchor = selection?.anchorNode;
    if (!text || !anchor || !articleRef.current?.contains(anchor)) {
      setSelectedSpeechText('');
      return;
    }
    setSelectedSpeechText(text.slice(0, 1200));
  };

  if ((!course || !enrollment) && learningStatus === 'loading') {
    return <AppLayout title="Загружаем курс"><div className="not-found-simple"><h2>Получаем ваш доступ к курсу…</h2><p>Проверяем Enrollment и закреплённую за ним версию курса.</p></div></AppLayout>;
  }

  if (!course || !current || !enrollment) {
    return <AppLayout title="Урок недоступен"><div className="not-found-simple"><h2>Урок не найден или у вас нет доступа.</h2><p>{learningStatus === 'error' ? 'Не удалось проверить доступ на backend.' : 'Для этого курса нет активного Enrollment.'}</p><div style={{display:'flex',gap:8,justifyContent:'center'}}>{learningStatus === 'error' ? <Button onClick={() => void loadEnrollments().catch(() => undefined)}>Проверить ещё раз</Button> : null}<Link to="/app/learning"><Button variant="secondary">К моим курсам</Button></Link></div></div></AppLayout>;
  }

  const completed = enrollment.completedLessonIds.includes(current.lesson.id);
  const handleComplete = () => {
    if (completed) return;
    completeLesson(course.id, current.lesson.id);
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

          <article ref={articleRef} className="lesson-article" onMouseUp={captureSelectedText} onKeyUp={captureSelectedText}>
            <div className="lesson-article__heading">
              <div className="lesson-heading-meta"><div><Badge tone="green">{current.lesson.type === 'video' ? 'Видеоурок' : current.lesson.type === 'test' ? 'Тест' : 'Материал'}</Badge><span><Clock3 size={15} /> {current.lesson.duration} минут</span></div></div>
              <h1>{current.lesson.title}</h1>
              <p>Выделяйте английские слова в тексте — перевод можно сразу сохранить в личный словарь. Любой выделенный фрагмент можно озвучить отдельно.</p>
              {selectedSpeechText ? <div className="lesson-selection-speech"><span>Выделено: {selectedSpeechText.length > 90 ? `${selectedSpeechText.slice(0, 90)}…` : selectedSpeechText}</span><button type="button" className={`lesson-selection-speak-icon ${speakingKey === 'selection' ? 'is-speaking' : ''}`} onClick={() => speakText(selectedSpeechText, 'selection')} title={speakingKey === 'selection' ? 'Остановить озвучивание' : 'Озвучить выделенный текст'} aria-label={speakingKey === 'selection' ? 'Остановить озвучивание' : 'Озвучить выделенный текст'}>{speakingKey === 'selection' ? <Square size={14} fill="currentColor"/> : <Volume2 size={17}/>}</button></div> : null}
            </div>

            {current.lesson.type === 'video' ? (
              <div className="lesson-video-wrap">
                <video
                  controls
                  poster={course.cover}
                  onPlay={() => setVideoPlayed(true)}
                  preload="metadata"
                >
                  <source src={primaryVideoUrl ?? 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'} type={videoBlock?.fileName?.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
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
                  if (block.type === 'heading') return <div className="lesson-speakable lesson-speakable--heading" key={block.id}><h2>{block.title}</h2><SpeakTextButton text={block.title ?? ''} speechKey={block.id} speakingKey={speakingKey} onSpeak={speakText}/></div>;
                  if (block.type === 'text') return <div className="lesson-speakable" key={block.id}><LessonTextBlock block={block}/><SpeakTextButton text={block.content ?? ''} speechKey={block.id} speakingKey={speakingKey} onSpeak={speakText}/></div>;
                  if (block.type === 'quote') return <div className="lesson-speakable" key={block.id}><blockquote>{block.content}</blockquote><SpeakTextButton text={block.content ?? ''} speechKey={block.id} speakingKey={speakingKey} onSpeak={speakText}/></div>;
                  if (block.type === 'callout') return <div className="lesson-speakable" key={block.id}><div className="lesson-callout"><Volume2 size={21} /><div><strong>{block.title}</strong><p>{block.content}</p></div></div><SpeakTextButton text={`${block.title ?? ''}. ${block.content ?? ''}`} speechKey={block.id} speakingKey={speakingKey} onSpeak={speakText}/></div>;
                  if (block.type === 'table' && block.table) return <div className="lesson-table-wrap" key={block.id}><table><thead><tr>{block.table.headers.map((header, index) => <th key={`${block.id}-h-${index}`}>{header}</th>)}</tr></thead><tbody>{block.table.rows.map((row, rowIndex) => <tr key={`${block.id}-r-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${block.id}-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
                  if (block.type === 'video' || block.type === 'image' || block.type === 'audio' || block.type === 'file') return <LessonMediaBlock key={block.id} block={block}/>;
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
                {completed
                  ? <span className="lesson-completed"><Check size={18} /> Урок завершён</span>
                  : current.lesson.test
                    ? <span><Circle size={17} /> Урок завершится после успешного прохождения теста</span>
                    : <span><Circle size={17} /> После изучения отметьте урок завершённым</span>}
              </div>
              <div className="lesson-footer-actions__buttons">
                {!completed && !current.lesson.test ? <Button onClick={handleComplete} icon={<Check size={18} />}>Отметить завершённым</Button> : null}
                {completed && next ? <Button onClick={() => navigate(`/app/course/${course.id}/lesson/${next.lesson.id}`)} icon={<ChevronRight size={18} />}>Следующий урок</Button> : null}
                {completed && !next ? <Button variant="secondary" disabled icon={<CheckCircle2 size={18}/>}>Курс завершён</Button> : null}
              </div>
            </footer>
          </article>
          <DictionaryPopover courseId={course.id} lessonId={current.lesson.id} containerRef={articleRef} />
        </section>
      </div>
    </AppLayout>
  );
}



function LessonMediaBlock({ block }: { block: LessonBlock }) {
  const [url, setUrl] = useState(block.url ?? '');
  const [loading, setLoading] = useState(Boolean(block.assetId && !block.url));

  useEffect(() => {
    let cancelled = false;
    setUrl(block.url ?? '');
    if (!block.assetId || block.url) {
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    void api.media.url(block.assetId).then((asset) => {
      if (!cancelled) setUrl(asset.url);
    }).catch(() => {
      if (!cancelled) setUrl('');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [block.assetId, block.url]);

  if (loading) return <div className="lesson-media-loading">Загружаем материал…</div>;
  if (!url) return <div className="lesson-media-loading lesson-media-loading--error">Материал временно недоступен</div>;
  if (block.type === 'video') return <div className="lesson-inline-video"><video controls src={url}/>{block.title ? <strong>{block.title}</strong> : null}</div>;
  if (block.type === 'image') return <figure className="lesson-inline-image"><img src={url} alt={block.title ?? ''}/>{block.title ? <figcaption>{block.title}</figcaption> : null}</figure>;
  if (block.type === 'audio') return <div className="lesson-inline-audio"><strong>{block.title ?? block.fileName ?? 'Аудиоматериал'}</strong><audio controls src={url}/></div>;
  return <a className="lesson-file-card" href={url} target="_blank" rel="noreferrer"><FileText size={22}/><div><strong>{block.title ?? block.fileName ?? 'Материал к уроку'}</strong><span>{block.fileName ?? 'Файл'}</span></div><UploadCloud size={18}/></a>;
}

function SpeakTextButton({ text, speechKey, speakingKey, onSpeak }: { text: string; speechKey: string; speakingKey: string | null; onSpeak: (text: string, key: string) => void }) {
  if (!text.trim()) return null;
  const active = speakingKey === speechKey;
  return <button type="button" className={`lesson-speak-button ${active ? 'is-speaking' : ''}`} onClick={() => onSpeak(text, speechKey)} title={active ? 'Остановить озвучивание' : 'Озвучить этот текст'} aria-label={active ? 'Остановить озвучивание' : 'Озвучить этот текст'}>{active ? <Square size={14} fill="currentColor"/> : <Volume2 size={17}/>}</button>;
}

function LessonTextBlock({ block }: { block: LessonBlock }) {
  if (block.richTextHtml?.trim()) {
    return <div className="lesson-custom-text lesson-rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(block.richTextHtml) }} />;
  }
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
  const [fileAssetId, setFileAssetId] = useState('');
  const [fileUploading, setFileUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submit = async () => {
    if (!answer.trim() && !fileAssetId) {
      onToast({ title: 'Добавьте ответ', text: 'Введите текст или прикрепите файл.', tone: 'warning' });
      return;
    }
    try {
      const result = await submitAssignment({ assignmentId: assignment.id, courseId, lessonId, answer: answer || undefined, fileName: fileName || undefined, fileAssetId: fileAssetId || undefined, status: 'pending' });
      if (!result) return;
      setSubmitted(result.status !== 'revision');
      if (result.status === 'approved') {
        onToast({ title: 'Ответ проверен', text: result.feedback || `Начислено ${result.score ?? assignment.maxScore} баллов.`, tone: 'success' });
      } else {
        onToast({ title: 'Задание отправлено', text: 'Ответ сохранён на backend и появился в очереди преподавателя.', tone: 'success' });
      }
    } catch (error) {
      onToast({ title: 'Не удалось отправить задание', text: error instanceof Error ? error.message : 'Ошибка backend', tone: 'warning' });
    }
  };
  return <Card className="lesson-assignment-card"><header><span><FileText size={21}/></span><div><small>{assignment.gradingMode === 'auto' ? 'Автоматическая проверка' : 'Ручная проверка преподавателем'}</small><h3>{assignment.title}</h3></div><Badge tone={submitted ? 'green' : 'neutral'}>{submitted ? 'Отправлено' : `${assignment.maxScore} баллов`}</Badge></header><p>{assignment.instructions}</p>{assignment.allowTextAnswer ? <textarea rows={5} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Введите ответ…" disabled={submitted && assignment.gradingMode === 'manual'}/> : null}{assignment.allowFileUpload ? <label className="lesson-assignment-upload"><UploadCloud size={17}/><span>{fileUploading ? 'Загружаем файл…' : fileName || 'Прикрепить файл'}</span><input type="file" accept={SAFE_STUDENT_ATTACHMENT_ACCEPT} disabled={fileUploading || (submitted && assignment.gradingMode === 'manual')} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const policyError = validateAttachmentForRole(file, 'student'); if (policyError) { onToast({ title: 'Файл запрещён', text: policyError, tone: 'warning' }); event.currentTarget.value = ''; return; } setFileUploading(true); setFileName(file.name); void api.media.upload(file, 'FILE').then((asset) => setFileAssetId(asset.assetId)).catch((error) => { setFileAssetId(''); onToast({ title: 'Файл не загружен', text: error instanceof Error ? error.message : 'Ошибка S3/MinIO', tone: 'warning' }); }).finally(() => setFileUploading(false)); }}/></label> : null}<Button onClick={() => void submit()} disabled={fileUploading || (submitted && assignment.gradingMode === 'manual')}>{submitted && assignment.gradingMode === 'manual' ? 'Ожидает проверки' : 'Отправить задание'}</Button></Card>;
}
