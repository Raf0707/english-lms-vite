import { BookOpenCheck, Download, Headphones, Languages, MoreHorizontal, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { EmptyState } from '../components/EmptyState';
import { Badge, Button, Card, Modal } from '../components/ui';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import type { DictionaryEntry } from '../types';
import { formatDate } from '../utils/format';

const statusLabels: Record<DictionaryEntry['status'], string> = {
  new: 'Новое',
  learning: 'Изучается',
  review: 'На повторении',
  mastered: 'Выучено',
  paused: 'Приостановлено'
};

export function DictionaryPage() {
  const courses = useAppStore((state) => state.courses);
  const dictionary = useAppStore((state) => state.dictionary);
  const remove = useAppStore((state) => state.removeDictionaryEntry);
  const add = useAppStore((state) => state.addDictionaryEntry);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [context, setContext] = useState('');
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationAlternatives, setTranslationAlternatives] = useState<string[]>([]);
  const [translationSenses, setTranslationSenses] = useState<Array<{ partOfSpeech: string; translations: string[] }>>([]);

  const filtered = useMemo(() => dictionary.filter((entry) => {
    const searchMatch = `${entry.word} ${entry.translation} ${entry.context}`.toLowerCase().includes(search.toLowerCase());
    return searchMatch && (status === 'all' || entry.status === status);
  }), [dictionary, search, status]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };


  const translateWord = async () => {
    if (!word.trim() || translationLoading) return;
    setTranslationLoading(true);
    try {
      const result = await api.dictionary.translate(word.trim(), context.trim() || undefined);
      setTranslation(result.translation);
      setTranslationAlternatives((result.alternatives ?? []).filter((item) => item && item !== result.translation));
      setTranslationSenses(result.partsOfSpeech ?? []);
    } catch (error) {
      useAppStore.getState().addToast({ title: 'Автоперевод недоступен', text: error instanceof Error ? error.message : 'Провайдер перевода не настроен', tone: 'warning' });
    } finally { setTranslationLoading(false); }
  };

  const addManual = () => {
    if (!word.trim() || !translation.trim()) return;
    add({ word: word.trim(), translation: translation.trim(), context: context.trim() || word.trim() });
    setWord('');
    setTranslation('');
    setContext('');
    setTranslationAlternatives([]);
    setTranslationSenses([]);
    setModalOpen(false);
  };

  return (
    <AppLayout title="Мой словарь" subtitle="Слова и выражения из ваших уроков.">
      <div className="dictionary-stats">
        <Card><span>Всего слов</span><strong>{dictionary.length}</strong><small>из всех курсов</small></Card>
        <Card><span>К повторению</span><strong>{dictionary.filter((entry) => new Date(entry.nextReviewAt) <= new Date()).length}</strong><small>на сегодня</small></Card>
        <Card><span>Выучено</span><strong>{dictionary.filter((entry) => entry.status === 'mastered').length}</strong><small>устойчивый результат</small></Card>
        <Card className="dictionary-action-card"><div><BookOpenCheck size={22} /><span><strong>Тренировка</strong><small>4 минуты</small></span></div><Link to="/app/training"><Button size="sm">Начать</Button></Link></Card>
      </div>

      <div className="dictionary-toolbar">
        <label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти слово или перевод" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Все статусы</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className="dictionary-toolbar__actions">
          <button><Upload size={17} /> Импорт</button>
          <button><Download size={17} /> Экспорт</button>
          <Button size="sm" icon={<Plus size={17} />} onClick={() => setModalOpen(true)}>Добавить слово</Button>
        </div>
      </div>

      {filtered.length ? (
        <div className="dictionary-table-wrap">
          <table className="dictionary-table">
            <thead><tr><th>Слово</th><th>Перевод</th><th>Контекст</th><th>Статус</th><th>Следующее повторение</th><th /></tr></thead>
            <tbody>
              {filtered.map((entry) => {
                const course = courses.find((item) => item.id === entry.courseId);
                return (
                  <tr key={entry.id}>
                    <td><div className="dictionary-word"><button onClick={() => speak(entry.word)}><Headphones size={16} /></button><span><strong>{entry.word}</strong><small>{course?.title ?? 'Добавлено вручную'}</small></span></div></td>
                    <td><strong>{entry.translation}</strong></td>
                    <td><p>{entry.context}</p></td>
                    <td><Badge tone={entry.status === 'mastered' ? 'green' : entry.status === 'new' ? 'amber' : 'violet'}>{statusLabels[entry.status]}</Badge></td>
                    <td>{formatDate(entry.nextReviewAt)}</td>
                    <td><div className="dictionary-row-actions"><button title="Удалить" onClick={() => remove(entry.id)}><Trash2 size={16} /></button><button><MoreHorizontal size={17} /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<BookOpenCheck size={28} />} title="Слов пока нет" text="Выделяйте английские слова в уроках или добавьте первое слово вручную." action={<Button onClick={() => setModalOpen(true)}>Добавить слово</Button>} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Добавить слово" actions={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button><Button onClick={addManual}>Сохранить</Button></>}>
        <div className="manual-word-form">
          <label><span>Слово или выражение</span><input value={word} onChange={(event) => setWord(event.target.value)} placeholder="confidence" /></label>
          <label><span>Перевод</span><div className="dictionary-manual-translate-row"><input value={translation} onChange={(event) => setTranslation(event.target.value)} placeholder="уверенность" /><Button type="button" size="sm" variant="secondary" icon={<Languages size={15}/>} loading={translationLoading} onClick={() => void translateWord()}>Автоперевод</Button></div></label>
          {translationAlternatives.length ? <div className="dictionary-alternatives"><small>Другие варианты перевода</small><div>{translationAlternatives.map((item) => <button type="button" key={item} onClick={() => setTranslation(item)}>{item}</button>)}</div></div> : null}
          {translationSenses.length ? <div className="dictionary-senses">{translationSenses.map((sense) => <div key={sense.partOfSpeech}><strong>{sense.partOfSpeech}</strong><span>{sense.translations.join(', ')}</span></div>)}</div> : null}
          <label><span>Контекст</span><textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Confidence grows with practice." /></label>
        </div>
      </Modal>
    </AppLayout>
  );
}
