import { CheckCircle2, CircleAlert, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Test } from '../types';
import { Button, Card } from './ui';

export function TestRunner({ test, onPassed }: { test: Test; onPassed?: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const result = useMemo(() => {
    let correct = 0;
    test.questions.forEach((question) => {
      const answer = (answers[question.id] ?? '').trim().toLowerCase();
      const expected = Array.isArray(question.correctAnswer)
        ? question.correctAnswer.map((item) => item.trim().toLowerCase())
        : [question.correctAnswer.trim().toLowerCase()];
      if (expected.includes(answer)) correct += 1;
    });
    const score = Math.round((correct / test.questions.length) * 100);
    return { correct, score, passed: score >= test.passScore };
  }, [answers, test]);

  const submit = () => {
    setSubmitted(true);
    if (result.passed) onPassed?.();
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="test-runner">
      <header className="test-runner__header">
        <div><span>Итоговый тест</span><h2>{test.title}</h2></div>
        <strong>Проходной балл: {test.passScore}%</strong>
      </header>
      <div className="test-runner__questions">
        {test.questions.map((question, index) => {
          const current = answers[question.id] ?? '';
          const expected = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
          const correct = expected.map((item) => item.toLowerCase()).includes(current.trim().toLowerCase());
          return (
            <Card key={question.id} className={`test-question ${submitted ? (correct ? 'test-question--correct' : 'test-question--wrong') : ''}`}>
              <div className="test-question__number">{index + 1}</div>
              <div className="test-question__content">
                <h3>{question.prompt}</h3>
                {question.type === 'single' && question.options ? (
                  <div className="test-options">
                    {question.options.map((option) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={current === option}
                          onChange={(event) => setAnswers((state) => ({ ...state, [question.id]: event.target.value }))}
                          disabled={submitted}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    className="test-text-answer"
                    value={current}
                    onChange={(event) => setAnswers((state) => ({ ...state, [question.id]: event.target.value }))}
                    placeholder="Введите ответ"
                    disabled={submitted}
                  />
                )}
                {submitted ? (
                  <div className="test-feedback">
                    {correct ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
                    <span>{correct ? 'Верно' : `Правильный ответ: ${expected.join(', ')}`}{question.explanation ? ` · ${question.explanation}` : ''}</span>
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
      <footer className="test-runner__footer">
        {submitted ? (
          <div className={`test-result ${result.passed ? 'test-result--passed' : 'test-result--failed'}`}>
            <div><strong>{result.score}%</strong><span>{result.correct} из {test.questions.length} ответов</span></div>
            <p>{result.passed ? 'Отлично! Тест пройден, можно переходить дальше.' : 'Попробуйте ещё раз. Перед новой попыткой можно вернуться к материалам урока.'}</p>
          </div>
        ) : <span>Ответьте на все вопросы и отправьте результат.</span>}
        {submitted ? <Button variant="secondary" icon={<RotateCcw size={17} />} onClick={reset}>Пройти ещё раз</Button> : <Button onClick={submit} disabled={Object.keys(answers).length < test.questions.length}>Проверить ответы</Button>}
      </footer>
    </div>
  );
}
