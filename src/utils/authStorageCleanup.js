import Vue from 'vue';
import { REMEMBERED_IDENTIFIER_KEY } from './authRememberedIdentifier';

export const LEGACY_CONTINUITY_CACHE_KEY = 'medsync.home.continuitySummary.v1';

export const clearClinicalContinuityCache = () => {
  if (typeof window === 'undefined') return;
  ['localStorage', 'sessionStorage'].forEach((name) => {
    try {
      window[name].removeItem(LEGACY_CONTINUITY_CACHE_KEY);
    } catch (error) {
      // Storage may be unavailable. Clinical payloads are no longer read or written here.
    }
  });
};

export const LEGACY_AUTH_STORAGE_KEYS = Object.freeze([
  'token',
  'refreshtoken',
  'refresh_token',
  'id_refresh_token',
  'user',
  'permissions',
  'tenantOperational',
  'business',
  'authenticated',
  'role',
  'accessExpiresAt',
  'sessionState',
  'security',
  'unauthorized',
  LEGACY_CONTINUITY_CACHE_KEY
]);

const removeSessionKey = (session, key) => {
  if (!session) {
    return;
  }

  if (typeof session.remove === 'function') {
    session.remove(key);
    return;
  }

  if (typeof session.set === 'function') {
    session.set(key, null);
  }
};

const removeStorageKey = (storage, key) => {
  if (!storage || key === REMEMBERED_IDENTIFIER_KEY) {
    return;
  }

  storage.removeItem(key);
};

export const clearLegacyAuthSessionKeys = (session = Vue.prototype.$session) => {
  LEGACY_AUTH_STORAGE_KEYS.forEach((key) => removeSessionKey(session, key));
};

export const clearLegacyAuthWebStorageKeys = () => {
  if (typeof window === 'undefined') {
    return;
  }

  LEGACY_AUTH_STORAGE_KEYS.forEach((key) => {
    removeStorageKey(window.localStorage, key);
    removeStorageKey(window.sessionStorage, key);
  });
};

export const clearLegacyAuthStorageForD2 = (session = Vue.prototype.$session) => {
  clearLegacyAuthSessionKeys(session);
  clearLegacyAuthWebStorageKeys();

  return {
    removedKeys: LEGACY_AUTH_STORAGE_KEYS,
    preservedKeys: [REMEMBERED_IDENTIFIER_KEY]
  };
};

export default {
  LEGACY_AUTH_STORAGE_KEYS,
  clearLegacyAuthSessionKeys,
  clearLegacyAuthStorageForD2,
  clearLegacyAuthWebStorageKeys
};
