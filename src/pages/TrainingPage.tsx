import { ArrowLeft, CheckCircle2, Headphones, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Button, Card } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function TrainingPage() {
  const dictionary = useAppStore((state) => state.dictionary);
  const rateReview = useAppStore((state) => state.rateReview);
  const queue = useMemo(() => {
    const due = dictionary.filter((entry) => new Date(entry.nextReviewAt) <= new Date());
    return due.length ? due : dictionary.filter((entry) => entry.status !== 'mastered').slice(0, 5);
  }, [dictionary]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const current = queue[index];

  const speak = () => {
    if (!current || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(current.word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const answer = (quality: number) => {
    if (!current) return;
    rateReview(current.id, quality);
    if (quality >= 3) setCorrect((value) => value + 1);
    if (index >= queue.length - 1) {
      setFinished(true);
    } else {
      setIndex((value) => value + 1);
      setRevealed(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setRevealed(false);
    setCorrect(0);
    setFinished(false);
  };

  return (
    <AppLayout wide>
      <div className="training-page">
        <header className="training-header">
          <Link to="/app/dictionary"><ArrowLeft size={19} /> В словарь</Link>
          <div><strong>Ежедневное повторение</strong><span>{finished ? queue.length : index + 1} / {queue.length}</span></div>
          <div className="training-progress"><span style={{ width: `${queue.length ? ((finished ? queue.length : index) / queue.length) * 100 : 0}%` }} /></div>
        </header>

        {!queue.length ? (
          <Card className="training-empty"><Sparkles size={38} /><h2>На сегодня всё</h2><p>Новых повторений нет. Добавьте слова из уроков, чтобы сформировать следующую тренировку.</p><Link to="/app/learning"><Button>Перейти к урокам</Button></Link></Card>
        ) : finished ? (
          <Card className="training-result-card">
            <div className="training-result-card__icon"><CheckCircle2 size={46} /></div>
            <span className="eyebrow">Тренировка завершена</span>
            <h1>Отличная работа!</h1>
            <p>Сегодня вы повторили {queue.length} слов. Алгоритм уже рассчитал новые интервалы.</p>
            <div className="training-result-stats"><div><strong>{correct}</strong><span>вспомнили</span></div><div><strong>{queue.length - correct}</strong><span>нужно повторить</span></div><div><strong>{Math.round((correct / queue.length) * 100)}%</strong><span>точность</span></div></div>
            <div className="training-result-actions"><Button variant="secondary" icon={<RotateCcw size={18} />} onClick={restart}>Повторить ещё раз</Button><Link to="/app"><Button>На главную</Button></Link></div>
          </Card>
        ) : current ? (
          <div className="training-stage">
            <Card className={`flashcard ${revealed ? 'flashcard--revealed' : ''}`} onClick={() => setRevealed(true)}>
              <div className="flashcard__top"><span>Переведите слово</span><button onClick={(event) => { event.stopPropagation(); speak(); }}><Headphones size={20} /></button></div>
              <div className="flashcard__front"><strong>{current.word}</strong><small>Нажмите на карточку, чтобы увидеть ответ</small></div>
              {revealed ? <div className="flashcard__answer"><span>Перевод</span><h2>{current.translation}</h2><p>{current.context}</p></div> : null}
            </Card>
            {revealed ? (
              <div className="review-buttons">
                <button onClick={() => answer(1)}><span><XCircle size={20} /></span><strong>Не помню</strong><small>через 1 день</small></button>
                <button onClick={() => answer(3)}><span>😓</span><strong>С трудом</strong><small>короткий интервал</small></button>
                <button onClick={() => answer(4)}><span>🙂</span><strong>Помню</strong><small>обычный интервал</small></button>
                <button onClick={() => answer(5)}><span>✨</span><strong>Очень легко</strong><small>длинный интервал</small></button>
              </div>
            ) : <Button size="lg" onClick={() => setRevealed(true)}>Показать перевод</Button>}
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
