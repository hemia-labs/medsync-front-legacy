import DOMPurify from 'dompurify';

// Only document formatting is accepted, including for snapshots saved before
// server-side sanitizing. Never change the persisted/signed snapshot here.
const DOCUMENT_SNAPSHOT_SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    'a', 'p', 'br', 'hr', 'div', 'span', 'section', 'article', 'header', 'footer',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's',
    'small', 'del', 'sub', 'sup', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup',
    'col', 'img', 'figure', 'figcaption'
  ],
  ALLOWED_ATTR: [
    'href', 'rel', 'title', 'src', 'alt', 'width', 'height', 'style',
    'colspan', 'rowspan', 'scope', 'align', 'valign', 'border', 'cellpadding',
    'cellspacing', 'start', 'type', 'reversed', 'value', 'span', 'dir', 'lang'
  ],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false
};

const length = '(?:0|\\d+(?:\\.\\d+)?(?:px|pt|pc|cm|mm|in|em|rem|%))';
const spacing = new RegExp(`^(?:${length}|auto)(?:\\s+(?:${length}|auto)){0,3}$`, 'i');
const color = /^(?:#[0-9a-f]{3,8}|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d\s.,%]+\))$/i;
const DOCUMENT_STYLES = {
  color, 'background-color': color,
  'font-family': /^[\w\s,"'-]+$/,
  'font-size': new RegExp(`^(?:${length}|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$`, 'i'),
  'font-weight': /^(?:normal|bold|bolder|lighter|[1-9]00)$/i,
  'font-style': /^(?:normal|italic|oblique)$/i,
  'text-align': /^(?:left|right|center|justify|start|end)$/i,
  'text-decoration': /^(?:none|underline|overline|line-through)(?:\s+(?:underline|overline|line-through))*$/i,
  'text-transform': /^(?:none|capitalize|uppercase|lowercase)$/i,
  'line-height': new RegExp(`^(?:normal|\\d+(?:\\.\\d+)?|${length})$`, 'i'),
  'white-space': /^(?:normal|pre|pre-wrap|pre-line|break-spaces)$/i,
  'word-break': /^(?:normal|break-all|keep-all|break-word)$/i,
  'overflow-wrap': /^(?:normal|break-word|anywhere)$/i,
  'vertical-align': /^(?:baseline|sub|super|top|text-top|middle|bottom|text-bottom)$/i,
  'border-collapse': /^(?:collapse|separate)$/i,
  'border-spacing': spacing, 'table-layout': /^(?:auto|fixed)$/i,
  'page-break-before': /^(?:auto|always|avoid|left|right)$/i,
  'page-break-after': /^(?:auto|always|avoid|left|right)$/i,
  'page-break-inside': /^(?:auto|avoid)$/i,
  'break-inside': /^(?:auto|avoid|avoid-page)$/i
};
for(const property of ['margin', 'padding', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'text-indent',
  'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height']) DOCUMENT_STYLES[property] = spacing;
for(const property of ['border', 'border-top', 'border-right', 'border-bottom', 'border-left']) {
  DOCUMENT_STYLES[property] = /^(?:none|0|(?:\d+(?:\.\d+)?(?:px|pt|em|rem)\s+)?(?:solid|dashed|dotted|double)\s+(?:#[0-9a-f]{3,8}|[a-z]+))$/i;
  DOCUMENT_STYLES[`${property}-width`] = spacing;
  DOCUMENT_STYLES[`${property}-style`] = /^(?:none|solid|dashed|dotted|double)$/i;
  DOCUMENT_STYLES[`${property}-color`] = color;
}

const hasUrlWhitespaceOrControls = value => /\s/.test(value)
  || Array.from(value).some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127);

export function safeDocumentImageSource(value) {
  const source = String(value || '').trim();
  if(!source || hasUrlWhitespaceOrControls(source) || /[\\<>"']/.test(source)) return '';
  if(/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/]+={0,2}$/i.test(source)) return source;
  if(/^https?:\/\//i.test(source)) return source;
  if(/^(?:\/(?!\/)|\.{1,2}\/)/.test(source)) return source;
  return '';
}

// A private instance keeps this document policy out of other DOMPurify users.
let documentSanitizer;
function getDocumentSanitizer() {
  if(documentSanitizer) return documentSanitizer;
  documentSanitizer = DOMPurify(window);
  documentSanitizer.addHook('uponSanitizeAttribute', (node, attribute) => {
    if(attribute.attrName === 'src') {
      attribute.attrValue = safeDocumentImageSource(attribute.attrValue);
      attribute.keepAttr = node.nodeName === 'IMG' && Boolean(attribute.attrValue);
    }
    if(attribute.attrName === 'href') {
      attribute.keepAttr = /^(?:https?:\/\/|mailto:|tel:|#)/i.test(attribute.attrValue)
        && !hasUrlWhitespaceOrControls(attribute.attrValue) && !/\\/.test(attribute.attrValue);
    }
    if(attribute.attrName === 'style') {
      const style = node.ownerDocument.createElement('span').style;
      style.cssText = attribute.attrValue;
      const declarations = [];
      for(let index = 0; index < style.length; index++) {
        const property = style.item(index);
        const value = style.getPropertyValue(property);
        if(DOCUMENT_STYLES[property] && DOCUMENT_STYLES[property].test(value)) {
          declarations.push(`${property}: ${value}`);
        }
      }
      attribute.attrValue = declarations.join('; ');
      attribute.keepAttr = Boolean(attribute.attrValue);
    }
  });
  documentSanitizer.addHook('afterSanitizeAttributes', node => {
    if(node.nodeName === 'A') node.setAttribute('rel', 'noopener noreferrer');
  });
  return documentSanitizer;
}

export function sanitizeHtmlForDocumentSnapshot(html) {
  return getDocumentSanitizer().sanitize(String(html || ''), DOCUMENT_SNAPSHOT_SANITIZE_OPTIONS);
}

export default sanitizeHtmlForDocumentSnapshot;
