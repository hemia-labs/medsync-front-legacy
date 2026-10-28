// Presentation helpers for help drafts. Text stays plain: «…» only marks a visible interface label.
const LABEL = /«([^»]+)»/g;
const TROUBLESHOOTING = /^Si .*\b(falla|fallan|falló|error|no carga|no se confirm|no pudo|bloquea|incierto|pendiente de confirmación)/i;

export function textSegments(text) {
  const segments = [];
  let last = 0, match;
  LABEL.lastIndex = 0;
  while ((match = LABEL.exec(text))) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), label: false });
    segments.push({ text: match[1], label: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), label: false });
  return segments;
}

export const plainText = text => String(text || '').replace(/[«»]/g, '');

export const isTroubleshooting = text => TROUBLESHOOTING.test(plainText(text));

// Keeps the editorial order. Paragraphs written after a list become notes; the ones that start
// with a failure condition are grouped as "Si algo falla".
export function sectionBlocks(section) {
  let afterList = false;
  return Object.keys(section).filter(key => ['paragraphs', 'steps', 'items'].includes(key)).map(key => {
    if (key === 'steps' || key === 'items') { afterList = true; return { type: key, entries: section[key] }; }
    if (!afterList) return { type: 'text', entries: section[key] };
    return { type: 'notes', tips: section[key].filter(text => !isTroubleshooting(text)), problems: section[key].filter(isTroubleshooting) };
  });
}
