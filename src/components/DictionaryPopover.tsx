import { BookPlus, GripHorizontal, LoaderCircle, Square, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { api } from '../services/api';
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

type PopoverSelection = {
  word: string;
  context: string;
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

const WORD_CHAR = /[A-Za-zÀ-ÖØ-öø-ÿ'’-]/;
const POPOVER_WIDTH = 310;
const POPOVER_ESTIMATED_HEIGHT = 245;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function textElementFromNode(node: Node) {
  return node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
}

function closestContextText(node: Node, fallback: string) {
  const element = textElementFromNode(node);
  const contextNode = element?.closest('p, li, blockquote, td, th, h1, h2, h3, h4, figcaption, .lesson-callout, .lesson-vocab-tip');
  const text = contextNode?.textContent?.replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function expandRangeToWholeWords(range: Range) {
  const next = range.cloneRange();
  const startNode = next.startContainer;
  const endNode = next.endContainer;

  if (startNode.nodeType === Node.TEXT_NODE) {
    const value = startNode.textContent ?? '';
    let offset = next.startOffset;
    while (offset > 0 && WORD_CHAR.test(value[offset - 1] ?? '')) offset -= 1;
    next.setStart(startNode, offset);
  }

  if (endNode.nodeType === Node.TEXT_NODE) {
    const value = endNode.textContent ?? '';
    let offset = next.endOffset;
    while (offset < value.length && WORD_CHAR.test(value[offset] ?? '')) offset += 1;
    next.setEnd(endNode, offset);
  }

  return next;
}

export function DictionaryPopover({ courseId, lessonId, containerRef }: { courseId: string; lessonId: string; containerRef: RefObject<HTMLElement | null> }) {
  const [selection, setSelection] = useState<PopoverSelection | null>(null);
  const [translation, setTranslation] = useState('');
  const [dragging, setDragging] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [partsOfSpeech, setPartsOfSpeech] = useState<Array<{ partOfSpeech: string; translations: string[] }>>([]);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const add = useAppStore((state) => state.addDictionaryEntry);

  const placeInsideViewport = (x: number, y: number, width = POPOVER_WIDTH, height = POPOVER_ESTIMATED_HEIGHT) => ({
    x: clamp(x, 12, window.innerWidth - width - 12),
    y: clamp(y, 12, window.innerHeight - height - 12)
  });

  const openFromCurrentSelection = (clientX?: number, clientY?: number) => {
    const element = containerRef.current;
    const selected = window.getSelection();
    if (!element || !selected || selected.rangeCount === 0 || selected.isCollapsed) return;

    const originalRange = selected.getRangeAt(0);
    if (!element.contains(originalRange.commonAncestorContainer)) return;

    const range = expandRangeToWholeWords(originalRange);
    const text = range.toString().replace(/\s+/g, ' ').trim();
    const normalized = text.toLowerCase().replace(/[^a-zà-öø-ÿ'’ -]/gi, '').trim();
    if (!text || text.length > 180 || !/[a-z]/i.test(normalized)) return;

    // Keep the visible browser selection aligned to complete word boundaries.
    selected.removeAllRanges();
    selected.addRange(range);

    const rect = range.getBoundingClientRect();
    const desiredX = typeof clientX === 'number' ? clientX + 14 : rect.left + Math.min(rect.width / 2, 120);
    const desiredY = typeof clientY === 'number' ? clientY + 16 : rect.bottom + 10;
    const position = placeInsideViewport(desiredX, desiredY);
    const context = closestContextText(range.commonAncestorContainer, text);

    setSelection({ word: text, context, ...position });
    setTranslation(translations[normalized] ?? 'перевод можно уточнить');
    setAlternatives([]);
    setPartsOfSpeech([]);
    setTranslationLoading(true);
    void api.dictionary.translate(text, context).then((result) => {
      setTranslation(result.translation);
      setAlternatives((result.alternatives ?? []).filter((item) => item && item !== result.translation));
      setPartsOfSpeech(result.partsOfSpeech ?? []);
    }).catch(() => undefined).finally(() => setTranslationLoading(false));

    // A second pass uses the real rendered popup height, so it never jumps off-screen.
    window.requestAnimationFrame(() => {
      const popup = popoverRef.current;
      if (!popup) return;
      const popupRect = popup.getBoundingClientRect();
      setSelection((current) => {
        if (!current) return current;
        const next = placeInsideViewport(current.x, current.y, popupRect.width, popupRect.height);
        return next.x === current.x && next.y === current.y ? current : { ...current, ...next };
      });
    });
  };

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handlePointerUp = (event: PointerEvent) => {
      // Let the browser finalize the native selection before reading it.
      window.setTimeout(() => openFromCurrentSelection(event.clientX, event.clientY), event.pointerType === 'touch' ? 80 : 0);
    };
    const handleKeyUp = () => window.setTimeout(() => openFromCurrentSelection(), 0);
    const handleScroll = () => {
      if (!dragRef.current) setSelection(null);
    };

    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('keyup', handleKeyUp);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [containerRef]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const active = dragRef.current;
      if (!active || event.pointerId !== active.pointerId) return;
      event.preventDefault();
      const x = active.originX + event.clientX - active.startX;
      const y = active.originY + event.clientY - active.startY;
      const rect = popoverRef.current?.getBoundingClientRect();
      const next = placeInsideViewport(x, y, rect?.width ?? POPOVER_WIDTH, rect?.height ?? POPOVER_ESTIMATED_HEIGHT);
      setSelection((current) => current ? { ...current, ...next } : current);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  if (!selection) return null;

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(selection.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: selection.x,
      originY: selection.y
    };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  return (
    <div ref={popoverRef} className={`dictionary-popover ${dragging ? 'dictionary-popover--dragging' : ''}`} style={{ left: selection.x, top: selection.y }}>
      <div className="dictionary-popover__dragbar" onPointerDown={startDrag} title="Перетащить окно">
        <GripHorizontal size={16} />
        <span>Перевод</span>
      </div>
      <button className="dictionary-popover__close" onClick={() => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setSpeaking(false); setSelection(null); }} aria-label="Закрыть"><X size={15} /></button>
      <div className="dictionary-popover__word"><strong>{selection.word}</strong><button className={speaking ? 'is-speaking' : ''} onClick={toggleSpeech} title={speaking ? 'Остановить озвучивание' : 'Озвучить'}>{speaking ? <Square size={14} fill="currentColor" /> : <Volume2 size={18} />}</button></div>
      <label>Перевод<div className="dictionary-auto-translation-input"><input value={translation} onChange={(event) => setTranslation(event.target.value)} />{translationLoading ? <LoaderCircle size={16} className="spin"/> : null}</div></label>
      {alternatives.length ? <div className="dictionary-alternatives"><small>Другие варианты</small><div>{alternatives.map((item) => <button key={item} onClick={() => setTranslation(item)}>{item}</button>)}</div></div> : null}
      {partsOfSpeech.length ? <div className="dictionary-senses">{partsOfSpeech.map((sense) => <div key={sense.partOfSpeech}><strong>{sense.partOfSpeech}</strong><span>{sense.translations.join(', ')}</span></div>)}</div> : null}
      <p>{selection.context}</p>
      <Button size="sm" icon={<BookPlus size={16} />} onClick={() => { add({ word: selection.word, translation, context: selection.context, courseId, lessonId }); setSelection(null); }}>Добавить в словарь</Button>
    </div>
  );
}
