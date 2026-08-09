const ALLOWED_TAGS = new Set([
  'P', 'DIV', 'BR', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H2', 'H3', 'H4', 'A'
]);
const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'META', 'LINK']);

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export function plainTextToRichHtml(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n');
  if (!normalized.trim()) return '<p><br></p>';
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function legacyTextToRichHtml(value: string, style?: {
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  listStyle?: 'none' | 'bullet' | 'numbered';
}) {
  const size = style?.fontSize === 'sm' ? '14px' : style?.fontSize === 'lg' ? '18px' : style?.fontSize === 'xl' ? '22px' : '16px';
  const declarations = [
    `font-size:${size}`,
    `text-align:${style?.align ?? 'left'}`,
    style?.bold ? 'font-weight:700' : '',
    style?.italic ? 'font-style:italic' : '',
    style?.underline ? 'text-decoration:underline' : ''
  ].filter(Boolean).join(';');
  const lines = value.replace(/\r\n?/g, '\n').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (style?.listStyle === 'bullet' || style?.listStyle === 'numbered') {
    const tag = style.listStyle === 'bullet' ? 'ul' : 'ol';
    return `<${tag} style="${declarations}">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</${tag}>`;
  }
  return `<p style="${declarations}">${escapeHtml(value).replace(/\n/g, '<br>')}</p>`;
}

function safeHref(value: string) {
  const href = value.trim();
  if (!href) return '';
  if (href.startsWith('#') || href.startsWith('/') || /^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href;
  return '';
}

export function sanitizeRichTextHtml(html: string) {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  if (!root) return '';

  const elements = Array.from(root.querySelectorAll('*')).reverse();
  for (const element of elements) {
    const tag = element.tagName;
    if (DROP_TAGS.has(tag)) {
      element.remove();
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const sourceStyle = (element as HTMLElement).style;
    const allowedStyleValues: Array<[string, string]> = [
      ['font-family', sourceStyle.fontFamily],
      ['font-size', sourceStyle.fontSize],
      ['color', sourceStyle.color],
      ['background-color', sourceStyle.backgroundColor],
      ['text-align', sourceStyle.textAlign],
      ['font-weight', sourceStyle.fontWeight],
      ['font-style', sourceStyle.fontStyle],
      ['text-decoration', sourceStyle.textDecoration],
      ['text-decoration-line', sourceStyle.textDecorationLine],
      ['line-height', /^(?:1(?:\.\d+)?|2(?:\.0+)?)$/.test(sourceStyle.lineHeight) ? sourceStyle.lineHeight : ''],
      ['display', ['block', 'inline-block'].includes(sourceStyle.display) ? sourceStyle.display : ''],
      ['width', sourceStyle.width === '100%' ? '100%' : '']
    ];

    const href = tag === 'A' ? safeHref(element.getAttribute('href') ?? '') : '';
    Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
    const target = element as HTMLElement;
    for (const [property, value] of allowedStyleValues) {
      if (value) target.style.setProperty(property, value);
    }
    if (tag === 'A' && href) {
      element.setAttribute('href', href);
      element.setAttribute('rel', 'noopener noreferrer');
      if (/^https?:\/\//i.test(href)) element.setAttribute('target', '_blank');
    }
  }
  return root.innerHTML;
}

export function richTextToPlainText(html: string) {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  if (!root) return '';
  root.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  root.querySelectorAll('p,div,li,blockquote,h2,h3,h4').forEach((node) => node.append('\n'));
  return (root.textContent ?? '').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
