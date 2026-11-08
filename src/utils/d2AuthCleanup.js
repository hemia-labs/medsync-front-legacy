import DACsrfService from '../services/core/auth/DACsrfService';
import { isD2AuthMode } from '../services/config/authTransport.config';
import { clearLegacyAuthStorageForD2 } from './authStorageCleanup';
import { isPublicAuthPath } from './publicAuthRoute';

export const D2_UNAUTHORIZED_REDIRECT_SKIP_ENDPOINTS = Object.freeze([
  'api/auth/login',
  'api/auth/session',
  'api/auth/csrf'
]);

const AUTH_LOGIN_PATH = '/login';

const normalizeRequestUrl = (url) => {
  if (!url) {
    return '';
  }

  return String(url)
    .split('?')[0]
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .toLowerCase();
};

export const shouldSkipD2UnauthorizedRedirect = (error) => {
  const url = error && error.config ? error.config.url : '';
  const normalizedUrl = normalizeRequestUrl(url);

  return D2_UNAUTHORIZED_REDIRECT_SKIP_ENDPOINTS.some((endpoint) => (
    normalizedUrl === endpoint || normalizedUrl.endsWith(`/${endpoint}`)
  ));
};

export const clearD2ClientAuthArtifacts = (session) => {
  if (!isD2AuthMode()) {
    return {
      cleared: false
    };
  }

  DACsrfService.clearCsrfToken();
  const storageCleanup = clearLegacyAuthStorageForD2(session);

  return {
    cleared: true,
    csrfCleared: true,
    ...storageCleanup
  };
};

export const redirectToAuthIfNeeded = () => {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }

  const currentPath = window.location.pathname || '';
  if (isPublicAuthPath(currentPath)) {
    return false;
  }

  window.location.href = AUTH_LOGIN_PATH;
  return true;
};

export default {
  D2_UNAUTHORIZED_REDIRECT_SKIP_ENDPOINTS,
  clearD2ClientAuthArtifacts,
  redirectToAuthIfNeeded,
  shouldSkipD2UnauthorizedRedirect
};
