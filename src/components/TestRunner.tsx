import { CheckCircle2, CircleAlert, Clock3, PlayCircle, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Question, Test } from '../types';
import { api, ApiError, type BackendTestAttemptResult, type BackendTestAttemptStart } from '../services/api';
import { Button, Card } from './ui';

type AnswerValue = string | string[];

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

function isQuestionCorrect(question: Question, answer: AnswerValue | undefined) {
  if (question.gradingMode === 'manual' || question.type === 'essay') return null;
  const expected = Array.isArray(question.correctAnswer) ? question.correctAnswer.map(normalize) : [normalize(question.correctAnswer)];
  if (question.type === 'multiple') {
    const actual = Array.isArray(answer) ? answer.map(normalize).sort() : [];
    return actual.length === expected.length && actual.every((item, index) => item === [...expected].sort()[index]);
  }
  const actual = normalize(Array.isArray(answer) ? answer.join(' ') : (answer ?? ''));
  return expected.includes(actual);
}

export function TestRunner({ test, onPassed }: { test: Test; onPassed?: () => void }) {
  if (test.backendVersionId) return <BackendTestRunner test={test} onPassed={onPassed} />;
  return <LocalTestRunner test={test} onPassed={onPassed} />;
}

function BackendTestRunner({ test, onPassed }: { test: Test; onPassed?: () => void }) {
  const [attempt, setAttempt] = useState<BackendTestAttemptStart | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [result, setResult] = useState<BackendTestAttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    if (!test.backendVersionId) return;
    setBusy(true); setError(''); setResult(null); setAnswers({});
    try {
      setAttempt(await api.tests.start(test.backendVersionId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Не удалось начать тест');
    } finally { setBusy(false); }
  };

  const answeredCount = attempt?.questions.filter((question) => {
    const answer = answers[question.id];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer?.trim());
  }).length ?? 0;

  const submit = async () => {
    if (!attempt) return;
    setBusy(true); setError('');
    try {
      for (const question of attempt.questions) {
        await api.tests.answer(attempt.attemptId, question.id, answers[question.id] ?? '');
      }
      const response = await api.tests.submit(attempt.attemptId);
      setResult(response);
      if (response.passed) onPassed?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Не удалось отправить тест');
    } finally { setBusy(false); }
  };

  if (!attempt) {
    return <Card className="test-runner test-runner--backend-start"><div className="test-backend-start"><PlayCircle size={30}/><div><small>Серверная проверка</small><h3>{test.title}</h3><p>Правильные ответы не передаются в браузер. Попытка создаётся и проверяется на backend.</p></div><Button onClick={() => void start()} disabled={busy}>{busy ? 'Запускаем…' : 'Начать тест'}</Button></div>{error ? <p className="test-backend-error">{error}</p> : null}</Card>;
  }

  const percent = result?.maxScore ? Math.round((result.score / result.maxScore) * 100) : 0;
  return (
    <div className="test-runner">
      <header className="test-runner__header">
        <div><span>Проверка знаний · backend</span><h2>{attempt.title}</h2></div>
        <strong>Проходной балл: {test.passScore}%</strong>
      </header>
      <div className="test-runner__questions">
        {attempt.questions.map((question, index) => {
          const type = question.type.toLowerCase();
          const options = Array.isArray(question.options) ? question.options.map(String) : [];
          const current = answers[question.id] ?? (type === 'multiple' ? [] : '');
          return <Card key={question.id} className="test-question">
            <div className="test-question__number">{index + 1}</div>
            <div className="test-question__content">
              <div className="test-question-title-row"><h3>{question.prompt}</h3></div>
              {type === 'single' && options.length ? <div className="test-options">{options.map((option) => <label key={option}><input type="radio" name={question.id} value={option} checked={current === option} onChange={(event) => setAnswers((state) => ({ ...state, [question.id]: event.target.value }))} disabled={Boolean(result)}/><span>{option}</span></label>)}</div> : null}
              {type === 'multiple' && options.length ? <div className="test-options">{options.map((option) => { const selected = Array.isArray(current) && current.includes(option); return <label key={option}><input type="checkbox" checked={selected} disabled={Boolean(result)} onChange={(event) => setAnswers((state) => { const prev = Array.isArray(state[question.id]) ? state[question.id] as string[] : []; return { ...state, [question.id]: event.target.checked ? [...prev, option] : prev.filter((item) => item !== option) }; })}/><span>{option}</span></label>; })}</div> : null}
              {type === 'essay' ? <textarea className="test-text-answer test-text-answer--essay" rows={6} value={typeof current === 'string' ? current : ''} onChange={(event) => setAnswers((state) => ({ ...state, [question.id]: event.target.value }))} placeholder="Введите развёрнутый ответ" disabled={Boolean(result)}/> : null}
              {!['single','multiple','essay'].includes(type) ? <input className="test-text-answer" value={typeof current === 'string' ? current : ''} onChange={(event) => setAnswers((state) => ({ ...state, [question.id]: event.target.value }))} placeholder={type === 'matching' ? 'Введите соответствия' : 'Введите ответ'} disabled={Boolean(result)}/> : null}
            </div>
          </Card>;
        })}
      </div>
      <footer className="test-runner__footer">
        {result ? (
          result.requiresManualReview ? <div className="test-result test-result--pending"><div><strong>{percent}%</strong><span>автоматическая часть</span></div><p>Ответы сохранены. В тесте есть вопросы, которые должен проверить преподаватель.</p></div>
            : <div className={`test-result ${result.passed ? 'test-result--passed' : 'test-result--failed'}`}><div><strong>{percent}%</strong><span>{result.score} из {result.maxScore} баллов</span></div><p>{result.passed ? 'Тест пройден. Результат сохранён на backend.' : 'Проходной балл не набран. Можно начать новую попытку.'}</p></div>
        ) : <span>{error || 'Ответьте на все вопросы и отправьте результат.'}</span>}
        {result ? <Button variant="secondary" icon={<RotateCcw size={17}/>} onClick={() => { setAttempt(null); setResult(null); setAnswers({}); setError(''); }}>Новая попытка</Button> : <Button onClick={() => void submit()} disabled={busy || answeredCount < attempt.questions.length}>{busy ? 'Отправляем…' : 'Отправить ответы'}</Button>}
      </footer>
    </div>
  );
}

function LocalTestRunner({ test, onPassed }: { test: Test; onPassed?: () => void }) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitted, setSubmitted] = useState(false);
  const result = useMemo(() => {
    const autoQuestions = test.questions.filter((question) => question.gradingMode !== 'manual' && question.type !== 'essay');
    const manualQuestions = test.questions.filter((question) => question.gradingMode === 'manual' || question.type === 'essay');
    const correct = autoQuestions.filter((question) => isQuestionCorrect(question, answers[question.id]) === true).length;
    const score = autoQuestions.length ? Math.round((correct / autoQuestions.length) * 100) : 0;
    return { correct, totalAuto: autoQuestions.length, manual: manualQuestions.length, score, passed: manualQuestions.length === 0 && score >= test.passScore };
  }, [answers, test]);

  const answeredCount = test.questions.filter((question) => {
    const answer = answers[question.id];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer?.trim());
  }).length;

  const submit = () => { setSubmitted(true); if (result.passed) onPassed?.(); };
  const reset = () => { setAnswers({}); setSubmitted(false); };

  return (
    <div className="test-runner">
      <header className="test-runner__header"><div><span>Проверка знаний</span><h2>{test.title}</h2></div><strong>Проходной балл: {test.passScore}%</strong></header>
      <div className="test-runner__questions">
        {test.questions.map((question, index) => {
          const current = answers[question.id] ?? (question.type === 'multiple' ? [] : '');
          const correct = isQuestionCorrect(question, current);
          const expected = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
          const manual = correct === null;
          return <Card key={question.id} className={`test-question ${submitted && !manual ? (correct ? 'test-question--correct' : 'test-question--wrong') : ''}`}>
            <div className="test-question__number">{index + 1}</div>
            <div className="test-question__content">
              <div className="test-question-title-row"><h3>{question.prompt}</h3>{manual ? <span className="manual-check-badge"><Clock3 size={13}/> ручная проверка</span> : null}</div>
              {question.type === 'single' && question.options ? <div className="test-options">{question.options.map((option) => <label key={option}><input type="radio" name={question.id} value={option} checked={current === option} onChange={(event) => setAnswers((state) => ({ ...state, [question.id]: event.target.value }))} disabled={submitted}/><span>{option}</span></label>)}</div> : question.type === 'multiple' && question.options ? <div className="test-options">{question.options.map((option) => { const selected = Array.isArray(current) && current.includes(option); return <label key={option}><input type="checkbox" value={option} checked={selected} disabled={submitted} onChange={(event) => setAnswers((state) => { const prev = Array.isArray(state[question.id]) ? state[question.id] as string[] : []; return { ...state, [question.id]: event.target.checked ? [...prev, option] : prev.filter((item) => item !== option) }; })}/><span>{option}</span></label>; })}</div> : question.type === 'essay' ? <textarea className="test-text-answer test-text-answer--essay" rows={6} value={typeof current === 'string' ? current : ''} onChange={(event) => setAnswers((state) => ({ ...state, [question.id]: event.target.value }))} placeholder="Введите развёрнутый ответ" disabled={submitted}/> : <input className="test-text-answer" value={typeof current === 'string' ? current : ''} onChange={(event) => setAnswers((state) => ({ ...state, [question.id]: event.target.value }))} placeholder={question.type === 'matching' ? 'Введите соответствия' : 'Введите ответ'} disabled={submitted}/>} 
              {submitted ? <div className={`test-feedback ${manual ? 'test-feedback--manual' : ''}`}>{manual ? <Clock3 size={18}/> : correct ? <CheckCircle2 size={18}/> : <CircleAlert size={18}/>}<span>{manual ? 'Ответ отправлен преподавателю на ручную проверку.' : correct ? 'Верно' : `Правильный ответ: ${expected.join(', ')}`}{!manual && question.explanation ? ` · ${question.explanation}` : ''}</span></div> : null}
            </div>
          </Card>;
        })}
      </div>
      <footer className="test-runner__footer">{submitted ? (result.manual > 0 ? <div className="test-result test-result--pending"><div><strong>{result.totalAuto ? `${result.score}%` : '✓'}</strong><span>автоматическая часть</span></div><p>{result.manual} ответ(а) отправлено на ручную проверку. Итоговый статус появится после проверки преподавателем.</p></div> : <div className={`test-result ${result.passed ? 'test-result--passed' : 'test-result--failed'}`}><div><strong>{result.score}%</strong><span>{result.correct} из {result.totalAuto} ответов</span></div><p>{result.passed ? 'Отлично! Тест пройден, можно переходить дальше.' : 'Попробуйте ещё раз. Перед новой попыткой можно вернуться к материалам урока.'}</p></div>) : <span>Ответьте на все вопросы и отправьте результат.</span>}{submitted ? <Button variant="secondary" icon={<RotateCcw size={17}/>} onClick={reset}>Пройти ещё раз</Button> : <Button onClick={submit} disabled={answeredCount < test.questions.length}>Отправить ответы</Button>}</footer>
    </div>
  );
}
