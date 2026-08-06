import { BookPlus, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui';

const translations: Record<string, string> = {
  confidence: 'уверенность',
  carefully: 'внимательно, осторожно',
  friendly: 'дружелюбный',
  conversation: 'разговор, беседа',
  simple: 'простой',
  sentence: 'предложение',
  welcome: 'добро пожаловать',
  usually: 'обычно',
  rarely: 'редко',
  suitcase: 'чемодан',
  arrive: 'прибывать',
  aisle: 'проход между рядами',
  curiosity: 'любопытство',
  listening: 'слушание',
  project: 'проект'
};

export function DictionaryPopover({ courseId, lessonId, containerRef }: { courseId: string; lessonId: string; containerRef: RefObject<HTMLElement | null> }) {
  const [selection, setSelection] = useState<{ word: string; context: string; x: number; y: number } | null>(null);
  const [translation, setTranslation] = useState('');
  const add = useAppStore((state) => state.addDictionaryEntry);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const handleSelection = () => {
      const selected = window.getSelection();
      const text = selected?.toString().trim() ?? '';
      if (!selected || !text || text.length > 48 || /\n/.test(text)) {
        setSelection(null);
        return;
      }
      const range = selected.getRangeAt(0);
      if (!element.contains(range.commonAncestorContainer)) return;
      const rect = range.getBoundingClientRect();
      const sentence = range.commonAncestorContainer.parentElement?.textContent?.trim() ?? text;
      const normalized = text.toLowerCase().replace(/[^a-z' -]/g, '');
      if (!normalized || !/[a-z]/i.test(normalized)) return;
      setSelection({ word: text, context: sentence, x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY + 10 });
      setTranslation(translations[normalized] ?? 'перевод можно уточнить');
    };
    element.addEventListener('mouseup', handleSelection);
    element.addEventListener('touchend', () => window.setTimeout(handleSelection, 50));
    return () => {
      element.removeEventListener('mouseup', handleSelection);
    };
  }, [containerRef]);

  const style = useMemo(() => selection ? ({ left: Math.min(window.innerWidth - 330, Math.max(16, selection.x - 150)), top: selection.y }) : undefined, [selection]);
  if (!selection) return null;

  const speak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(selection.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="dictionary-popover" style={style}>
      <button className="dictionary-popover__close" onClick={() => setSelection(null)}><X size={15} /></button>
      <div className="dictionary-popover__word"><strong>{selection.word}</strong><button onClick={speak}><Volume2 size={18} /></button></div>
      <label>Перевод<input value={translation} onChange={(event) => setTranslation(event.target.value)} /></label>
      <p>{selection.context}</p>
      <Button size="sm" icon={<BookPlus size={16} />} onClick={() => { add({ word: selection.word, translation, context: selection.context, courseId, lessonId }); setSelection(null); }}>Добавить в словарь</Button>
    </div>
  );
}
