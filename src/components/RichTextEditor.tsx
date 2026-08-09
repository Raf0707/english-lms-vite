import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Mic,
  MicOff,
  Redo2,
  Strikethrough,
  Underline,
  Undo2
} from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { plainTextToRichHtml, richTextToPlainText, sanitizeRichTextHtml } from '../utils/richText';

type RichTextEditorProps = {
  html?: string;
  plainText?: string;
  onChange: (value: { html: string; plainText: string }) => void;
};

const FONT_FAMILIES = [
  ['Manrope', 'Manrope'],
  ['Arial', 'Arial'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Verdana', 'Verdana'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Courier New', 'Courier New']
] as const;

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40];

export function RichTextEditor({ html, plainText = '', onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [fontFamily, setFontFamily] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [blockType, setBlockType] = useState('');
  const [textColor, setTextColor] = useState('#24312a');
  const [highlightColor, setHighlightColor] = useState('#fff2a8');

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const next = sanitizeRichTextHtml(html?.trim() ? html : plainTextToRichHtml(plainText));
    if (editor.innerHTML !== next) editor.innerHTML = next;
  }, [html, plainText]);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer as Element
      : range.commonAncestorContainer.parentElement;
    if (container && editor.contains(container)) savedRangeRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = savedRangeRef.current;
    if (!selection || !range) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };


  const getActiveRange = () => {
    const editor = editorRef.current;
    restoreSelection();
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const startNode = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as Element : range.startContainer.parentElement;
    const endNode = range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer as Element : range.endContainer.parentElement;
    if (!startNode || !endNode || !editor.contains(startNode) || !editor.contains(endNode)) return null;
    return range;
  };

  const closestTextBlock = (node: Node | null) => {
    const editor = editorRef.current;
    if (!editor || !node) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
    const block = element?.closest('p,div,h2,h3,h4,blockquote,li') as HTMLElement | null;
    return block && editor.contains(block) ? block : null;
  };

  const normalizeLegacyFontTags = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll('font').forEach((font) => {
      const span = document.createElement('span');
      const face = font.getAttribute('face');
      const color = font.getAttribute('color');
      if (face) span.style.fontFamily = face;
      if (color) span.style.color = color;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    });
  };

  const emit = () => {
    const editor = editorRef.current;
    if (!editor) return;
    normalizeLegacyFontTags();

    // Important: do not replace editor.innerHTML while the user is editing.
    // Re-parsing the DOM on every input/format action invalidates the live Range
    // and makes the next font-size operation jump to another fragment. We still
    // persist only sanitized HTML; the live DOM is normalized on blur.
    const safeHtml = sanitizeRichTextHtml(editor.innerHTML);
    onChange({ html: safeHtml, plainText: richTextToPlainText(safeHtml) });
    saveSelection();
  };

  const sanitizeLiveEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const safeHtml = sanitizeRichTextHtml(editor.innerHTML);
    if (editor.innerHTML !== safeHtml) editor.innerHTML = safeHtml;
    onChange({ html: safeHtml, plainText: richTextToPlainText(safeHtml) });
    savedRangeRef.current = null;
  };

  const command = (name: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    try { document.execCommand('styleWithCSS', false, 'true'); } catch { /* older browsers */ }
    document.execCommand(name, false, value);
    emit();
  };

  const applyAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    const editor = editorRef.current;
    editor?.focus();
    const range = getActiveRange();
    if (!editor || !range) return;

    const startBlock = closestTextBlock(range.startContainer);
    const endBlock = closestTextBlock(range.endContainer);

    if (range.collapsed) {
      if (startBlock) {
        startBlock.style.textAlign = align;
        emit();
      }
      return;
    }

    // When the selection spans more than one paragraph, only the paragraphs
    // touched by the selection are aligned. Unselected paragraphs are unchanged.
    if (startBlock && endBlock && startBlock !== endBlock) {
      const blocks = Array.from(editor.querySelectorAll<HTMLElement>('p,div,h2,h3,h4,blockquote,li'))
        .filter((block) => {
          try { return range.intersectsNode(block); } catch { return false; }
        })
        .filter((block) => !Array.from(block.children).some((child) => child.matches?.('p,div,h2,h3,h4,blockquote,li')));
      blocks.forEach((block) => { block.style.textAlign = align; });
      emit();
      return;
    }

    if (startBlock && startBlock === endBlock) {
      const blockText = (startBlock.textContent ?? '').replace(/\s+/g, ' ').trim();
      const selectedText = range.toString().replace(/\s+/g, ' ').trim();
      if (selectedText && selectedText === blockText) {
        startBlock.style.textAlign = align;
        emit();
        return;
      }
    }

    // Browser justify commands align the whole containing paragraph even when
    // only a few words are selected. For a partial selection we deliberately
    // create a full-width inline fragment, so only the selected text changes
    // its position on the page.
    const fragment = range.extractContents();
    const wrapper = document.createElement('span');
    wrapper.style.display = 'block';
    wrapper.style.width = '100%';
    wrapper.style.textAlign = align;
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);

    const selection = window.getSelection();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();
    emit();
  };

  const applyInlineStyle = (property: 'font-size' | 'font-family', value: string) => {
    const editor = editorRef.current;
    editor?.focus();
    const range = getActiveRange();
    if (!editor || !range) return;

    // execCommand(fontSize/fontName) is browser-dependent. Chromium can emit
    // CSS keywords or legacy FONT tags. Wrap only selected text nodes so the
    // exact value survives saving, sanitizing and lesson rendering.
    if (range.collapsed) return;

    const startContainer = range.startContainer;
    const startRangeOffset = range.startOffset;
    const endContainer = range.endContainer;
    const endRangeOffset = range.endOffset;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      const text = current as Text;
      if (text.data.length) {
        try {
          if (range.intersectsNode(text)) nodes.push(text);
        } catch {
          // Ignore transient/detached nodes.
        }
      }
      current = walker.nextNode();
    }

    const wrappers: HTMLElement[] = [];
    nodes.forEach((text) => {
      let startOffset = 0;
      let endOffset = text.data.length;
      if (text === startContainer) startOffset = startRangeOffset;
      if (text === endContainer) endOffset = endRangeOffset;
      if (startOffset >= endOffset) return;

      if (endOffset < text.data.length) text.splitText(endOffset);
      const selectedNode = startOffset > 0 ? text.splitText(startOffset) : text;
      const parent = selectedNode.parentElement;
      const coversWholeParent = parent?.tagName === 'SPAN'
        && parent.childNodes.length === 1
        && parent.firstChild === selectedNode;
      if (coversWholeParent && parent) {
        parent.style.setProperty(property, value);
        if (property === 'font-size') parent.style.lineHeight = '1.35';
        wrappers.push(parent);
        return;
      }

      const span = document.createElement('span');
      span.style.setProperty(property, value);
      // Keep large and small inline sizes visually predictable both in the
      // editor and in the student's lesson page instead of inheriting 1.7.
      if (property === 'font-size') span.style.lineHeight = '1.35';
      selectedNode.replaceWith(span);
      span.appendChild(selectedNode);
      wrappers.push(span);
    });

    if (!wrappers.length) return;
    const nextRange = document.createRange();
    nextRange.setStartBefore(wrappers[0]);
    nextRange.setEndAfter(wrappers[wrappers.length - 1]);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();
    emit();
  };

  const applyFontSize = (size: number) => applyInlineStyle('font-size', `${size}px`);

  const applyFontFamily = (family: string) => applyInlineStyle('font-family', family);

  const insertVoiceText = (transcript: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertText', false, transcript);
    emit();
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const scope = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
    if (!Recognition) {
      window.alert('Голосовой ввод не поддерживается этим браузером. Используйте актуальный Chrome, Edge или Яндекс Браузер.');
      return;
    }
    saveSelection();
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'ru-RU';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) insertVoiceText(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const keepSelection = (event: ReactMouseEvent<HTMLButtonElement>) => event.preventDefault();

  return (
    <div className="selection-rich-editor">
      <div className="selection-rich-editor__toolbar" aria-label="Редактор форматирования выделенного текста">
        <select value={blockType} onPointerDown={saveSelection} onChange={(event) => {
          const value = event.target.value;
          setBlockType('');
          if (value) command('formatBlock', value);
        }} aria-label="Тип абзаца">
          <option value="">Абзац</option>
          <option value="p">Обычный текст</option>
          <option value="h2">Заголовок 2</option>
          <option value="h3">Заголовок 3</option>
          <option value="blockquote">Цитата</option>
        </select>
        <select value={fontFamily} onPointerDown={saveSelection} onChange={(event) => {
          const value = event.target.value;
          setFontFamily('');
          if (value) applyFontFamily(value);
        }} aria-label="Шрифт">
          <option value="">Шрифт</option>
          {FONT_FAMILIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={fontSize} onPointerDown={saveSelection} onChange={(event) => {
          const value = event.target.value;
          setFontSize('');
          if (value) applyFontSize(Number(value));
        }} aria-label="Размер шрифта">
          <option value="">Размер</option>
          {FONT_SIZES.map((size) => <option key={size} value={size}>{size}px</option>)}
        </select>

        <span className="selection-rich-editor__group">
          <button type="button" onMouseDown={keepSelection} onClick={() => command('bold')} title="Полужирный"><Bold size={16}/></button>
          <button type="button" onMouseDown={keepSelection} onClick={() => command('italic')} title="Курсив"><Italic size={16}/></button>
          <button type="button" onMouseDown={keepSelection} onClick={() => command('underline')} title="Подчёркивание"><Underline size={16}/></button>
          <button type="button" onMouseDown={keepSelection} onClick={() => command('strikeThrough')} title="Зачёркивание"><Strikethrough size={16}/></button>
        </span>

        <span className="selection-rich-editor__group">
          <button type="button" onMouseDown={keepSelection} onClick={() => applyAlignment('left')} title="По левому краю"><AlignLeft size={16}/></button>
          <button type="button" onMouseDown={keepSelection} onClick={() => applyAlignment('center')} title="По центру"><AlignCenter size={16}/></button>
          <button type="button" onMouseDown={keepSelection} onClick={() => applyAlignment('right')} title="По правому краю"><AlignRight size={16}/></button>
          <button type="button" onMouseDown={keepSelection} onClick={() => applyAlignment('justify')} title="По ширине"><AlignJustify size={16}/></button>
        </span>

        <span className="selection-rich-editor__group">
          <button type="button" onMouseDown={keepSelection} onClick={() => command('insertUnorderedList')} title="Маркированный список"><List size={16}/></button>
          <button type="button" onMouseDown={keepSelection} onClick={() => command('insertOrderedList')} title="Нумерованный список"><ListOrdered size={16}/></button>
        </span>

        <label className="selection-rich-editor__color" title="Цвет текста">
          <span><span className="selection-rich-editor__color-letter">A</span></span>
          <input type="color" value={textColor} onPointerDown={saveSelection} onChange={(event) => { setTextColor(event.target.value); command('foreColor', event.target.value); }} aria-label="Цвет текста"/>
        </label>
        <label className="selection-rich-editor__color" title="Цвет выделения">
          <Highlighter size={16}/>
          <input type="color" value={highlightColor} onPointerDown={saveSelection} onChange={(event) => { setHighlightColor(event.target.value); command('hiliteColor', event.target.value); }} aria-label="Цвет фона текста"/>
        </label>

        <span className="selection-rich-editor__group selection-rich-editor__group--end">
          <button type="button" onMouseDown={keepSelection} onClick={() => command('removeFormat')} title="Очистить форматирование"><Eraser size={16}/></button>
          <button type="button" onMouseDown={keepSelection} onClick={() => command('undo')} title="Отменить"><Undo2 size={16}/></button>
          <button type="button" onMouseDown={keepSelection} onClick={() => command('redo')} title="Повторить"><Redo2 size={16}/></button>
          <button type="button" className={listening ? 'is-listening' : ''} onMouseDown={keepSelection} onClick={toggleVoice} title={listening ? 'Остановить голосовой ввод' : 'Голосовой ввод'}>{listening ? <MicOff size={16}/> : <Mic size={16}/>}</button>
        </span>
      </div>

      <div
        ref={editorRef}
        className="selection-rich-editor__surface"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Введите текст урока…"
        onInput={emit}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onFocus={saveSelection}
        onBlur={sanitizeLiveEditor}
      />
      <div className="selection-rich-editor__hint">Выделите фрагмент текста и примените к нему шрифт, размер, цвет или начертание. Выравнивание меняет только выделенный фрагмент; без выделения — текущий абзац.</div>
    </div>
  );
}
