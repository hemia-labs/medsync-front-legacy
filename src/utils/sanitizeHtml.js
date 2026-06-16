import DOMPurify from 'dompurify';

const DOCUMENT_SNAPSHOT_SANITIZE_OPTIONS = {
  FORBID_TAGS: [
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'button',
    'textarea',
    'select',
    'option',
    'meta',
    'link'
  ],
  FORBID_ATTR: [
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    'onfocus',
    'onblur'
  ]
};

export function sanitizeHtmlForDocumentSnapshot(html) {
  return DOMPurify.sanitize(String(html || ''), DOCUMENT_SNAPSHOT_SANITIZE_OPTIONS);
}

export default sanitizeHtmlForDocumentSnapshot;
