import { BookOpenCheck, Download, Edit3, Headphones, Languages, MoreHorizontal, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { EmptyState } from '../components/EmptyState';
import { Badge, Button, Card, Modal } from '../components/ui';
import { api, apiRequest, type BackendDictionaryEntry } from '../services/api';
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
  const loadDictionary = useAppStore((state) => state.loadDictionary);
  const addToast = useAppStore((state) => state.addToast);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [context, setContext] = useState('');
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationAlternatives, setTranslationAlternatives] = useState<string[]>([]);
  const [translationSenses, setTranslationSenses] = useState<Array<{ partOfSpeech: string; translations: string[] }>>([]);

  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null);
  const [editWord, setEditWord] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editContext, setEditContext] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editTranslationLoading, setEditTranslationLoading] = useState(false);

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
      addToast({ title: 'Автоперевод недоступен', text: error instanceof Error ? error.message : 'Провайдер перевода не настроен', tone: 'warning' });
    } finally {
      setTranslationLoading(false);
    }
  };

  const addManual = async () => {
    if (!word.trim() || !translation.trim()) return;
    try {
      await add({ word: word.trim(), translation: translation.trim(), context: context.trim() || word.trim() });
      setWord('');
      setTranslation('');
      setContext('');
      setTranslationAlternatives([]);
      setTranslationSenses([]);
      setModalOpen(false);
    } catch (error) {
      addToast({ title: 'Не удалось сохранить слово', text: error instanceof Error ? error.message : 'Ошибка сохранения', tone: 'warning' });
    }
  };

  const openEdit = (entry: DictionaryEntry) => {
    setRowMenuId(null);
    setEditingEntry(entry);
    setEditWord(entry.word);
    setEditTranslation(entry.translation);
    setEditContext(entry.context ?? '');
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditingEntry(null);
    setEditWord('');
    setEditTranslation('');
    setEditContext('');
  };

  const translateEdit = async () => {
    if (!editWord.trim() || editTranslationLoading) return;
    setEditTranslationLoading(true);
    try {
      const result = await api.dictionary.translate(editWord.trim(), editContext.trim() || undefined);
      setEditTranslation(result.translation);
    } catch (error) {
      addToast({ title: 'Автоперевод недоступен', text: error instanceof Error ? error.message : 'Не удалось получить перевод', tone: 'warning' });
    } finally {
      setEditTranslationLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editingEntry || !editWord.trim() || !editTranslation.trim() || editSaving) return;
    setEditSaving(true);
    try {
      await apiRequest<BackendDictionaryEntry>(`/dictionary/entries/${encodeURIComponent(editingEntry.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sourceText: editWord.trim(),
          translation: editTranslation.trim(),
          contextSentence: editContext.trim()
        })
      });
      await loadDictionary();
      addToast({ title: 'Слово обновлено', text: `${editWord.trim()} — ${editTranslation.trim()}`, tone: 'success' });
      setEditingEntry(null);
    } catch (error) {
      addToast({ title: 'Не удалось сохранить изменения', text: error instanceof Error ? error.message : 'Ошибка сохранения', tone: 'warning' });
    } finally {
      setEditSaving(false);
    }
  };

  const autoTranslateExisting = async (entry: DictionaryEntry) => {
    setRowMenuId(null);
    try {
      const result = await api.dictionary.translate(entry.word, entry.context || undefined);
      await apiRequest<BackendDictionaryEntry>(`/dictionary/entries/${encodeURIComponent(entry.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ translation: result.translation })
      });
      await loadDictionary();
      addToast({ title: 'Перевод обновлён', text: `${entry.word} — ${result.translation}`, tone: 'success' });
    } catch (error) {
      addToast({ title: 'Не удалось обновить перевод', text: error instanceof Error ? error.message : 'Автоперевод недоступен', tone: 'warning' });
    }
  };

  const removeEntry = async (entry: DictionaryEntry) => {
    setRowMenuId(null);
    try {
      await remove(entry.id);
      addToast({ title: 'Слово удалено', text: entry.word, tone: 'info' });
    } catch (error) {
      addToast({ title: 'Не удалось удалить слово', text: error instanceof Error ? error.message : 'Ошибка удаления', tone: 'warning' });
    }
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
                const menuOpen = rowMenuId === entry.id;
                return (
                  <tr key={entry.id}>
                    <td><div className="dictionary-word"><button onClick={() => speak(entry.word)}><Headphones size={16} /></button><span><strong>{entry.word}</strong><small>{course?.title ?? 'Добавлено вручную'}</small></span></div></td>
                    <td><strong>{entry.translation}</strong></td>
                    <td><p>{entry.context}</p></td>
                    <td><Badge tone={entry.status === 'mastered' ? 'green' : entry.status === 'new' ? 'amber' : 'violet'}>{statusLabels[entry.status]}</Badge></td>
                    <td>{formatDate(entry.nextReviewAt)}</td>
                    <td>
                      <div className="dictionary-row-actions" style={{ position: 'relative' }}>
                        <button title="Удалить" onClick={() => void removeEntry(entry)}><Trash2 size={16} /></button>
                        <button
                          type="button"
                          aria-label={`Действия для ${entry.word}`}
                          aria-expanded={menuOpen}
                          onClick={() => setRowMenuId((current) => current === entry.id ? null : entry.id)}
                        >
                          <MoreHorizontal size={17} />
                        </button>
                        {menuOpen ? (
                          <>
                            <button
                              type="button"
                              aria-label="Закрыть меню"
                              onClick={() => setRowMenuId(null)}
                              style={{ position: 'fixed', inset: 0, zIndex: 80, width: '100vw', height: '100vh', border: 0, background: 'transparent', cursor: 'default' }}
                            />
                            <div
                              role="menu"
                              style={{
                                position: 'absolute',
                                zIndex: 81,
                                right: 0,
                                top: 'calc(100% + 8px)',
                                minWidth: 210,
                                padding: 6,
                                border: '1px solid rgba(148, 163, 184, .28)',
                                borderRadius: 12,
                                background: 'rgba(15, 23, 42, .98)',
                                boxShadow: '0 18px 45px rgba(2, 6, 23, .42)'
                              }}
                            >
                              <button type="button" role="menuitem" onClick={() => openEdit(entry)} style={{ width: '100%', justifyContent: 'flex-start' }}><Edit3 size={15} /> Редактировать</button>
                              <button type="button" role="menuitem" onClick={() => void autoTranslateExisting(entry)} style={{ width: '100%', justifyContent: 'flex-start' }}><Languages size={15} /> Автоперевести</button>
                              <button type="button" role="menuitem" onClick={() => void removeEntry(entry)} style={{ width: '100%', justifyContent: 'flex-start' }}><Trash2 size={15} /> Удалить</button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<BookOpenCheck size={28} />} title="Слов пока нет" text="Выделяйте английские слова в уроках или добавьте первое слово вручную." action={<Button onClick={() => setModalOpen(true)}>Добавить слово</Button>} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Добавить слово" actions={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button><Button onClick={() => void addManual()}>Сохранить</Button></>}>
        <div className="manual-word-form">
          <label><span>Слово или выражение</span><input value={word} onChange={(event) => setWord(event.target.value)} placeholder="confidence" /></label>
          <label><span>Перевод</span><div className="dictionary-manual-translate-row"><input value={translation} onChange={(event) => setTranslation(event.target.value)} placeholder="уверенность" /><Button type="button" size="sm" variant="secondary" icon={<Languages size={15}/>} loading={translationLoading} onClick={() => void translateWord()}>Автоперевод</Button></div></label>
          {translationAlternatives.length ? <div className="dictionary-alternatives"><small>Другие варианты перевода</small><div>{translationAlternatives.map((item) => <button type="button" key={item} onClick={() => setTranslation(item)}>{item}</button>)}</div></div> : null}
          {translationSenses.length ? <div className="dictionary-senses">{translationSenses.map((sense) => <div key={sense.partOfSpeech}><strong>{sense.partOfSpeech}</strong><span>{sense.translations.join(', ')}</span></div>)}</div> : null}
          <label><span>Контекст</span><textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Confidence grows with practice." /></label>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingEntry)}
        onClose={closeEdit}
        title="Редактирование слова"
        actions={<><Button variant="ghost" onClick={closeEdit} disabled={editSaving}>Отмена</Button><Button loading={editSaving} onClick={() => void saveEdit()}>Сохранить</Button></>}
      >
        <div className="manual-word-form">
          <label><span>Слово или выражение</span><input value={editWord} onChange={(event) => setEditWord(event.target.value)} /></label>
          <label>
            <span>Перевод</span>
            <div className="dictionary-manual-translate-row">
              <input value={editTranslation} onChange={(event) => setEditTranslation(event.target.value)} />
              <Button type="button" size="sm" variant="secondary" icon={<Languages size={15} />} loading={editTranslationLoading} onClick={() => void translateEdit()}>Автоперевод</Button>
            </div>
          </label>
          <label><span>Контекст</span><textarea value={editContext} onChange={(event) => setEditContext(event.target.value)} /></label>
          <small>Прогресс интервального повторения при редактировании не сбрасывается.</small>
        </div>
      </Modal>
    </AppLayout>
  );
}
