export const REMEMBERED_IDENTIFIER_KEY = 'medsync.auth.rememberedIdentifier.v1';

export function normalizeRememberedIdentifier(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 15);
}

export function getRememberedIdentifier() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return '';
  }

  return normalizeRememberedIdentifier(window.localStorage.getItem(REMEMBERED_IDENTIFIER_KEY));
}

export function setRememberedIdentifier(value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const normalized = normalizeRememberedIdentifier(value);
  if (!normalized) {
    clearRememberedIdentifier();
    return;
  }

  window.localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, normalized);
}

export function clearRememberedIdentifier() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
}
