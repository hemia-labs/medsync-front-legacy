import axios from 'axios';
import context from '../../config/axios.url';
import { isCsrfEnabled } from '../../config/authTransport.config';
import DACsrfService from './DACsrfService';
import store from '../../../store';
import { authorizationContext, isCurrentAuthorization, authorizationChangedError } from '../../../security/authorizationContext';
import axiosHelper from '../../config/axios.helper';
import { canRecoverCsrf, recoverCsrfRequest, readableCsrfError } from '../../config/csrfRecovery';
import { TERMINAL_AUTH_CODES } from '../../../security/ambiguousUnauthorized';
import types from '../../../store/modules/common/mutation-types';
import { clearLegacyAuthStorageForD2 } from '../../../utils/authStorageCleanup';
import { clearD2ClientAuthArtifacts, redirectToAuthIfNeeded } from '../../../utils/d2AuthCleanup';

// Registration uses plain DTOs, unlike the legacy API envelope. Never persist
// its body or retry a write whose outcome is unknown in this transport layer.
const client = axios.create({ baseURL: context.APP_CORE_URL, withCredentials: true, timeout: 20000 });
// An answer of another authorization context is discarded before CSRF recovery (or any other effect).
client.interceptors.response.use(undefined, error => {
  if (error.config && error.config.authOwner && !isCurrentAuthorization(error.config.authOwner, store)) return Promise.reject(authorizationChangedError());
  return canRecoverCsrf(error) ? recoverCsrfRequest(error, config => client.request(config)) : Promise.reject(readableCsrfError(error));
});

// NC1-AUTH-ACTIVATION-NO-REPLAY: a 401 of an authenticated account/activation operation recovers the session
// with the existing shared action, then the ORIGINAL call still fails. It is never sent again by this layer:
// repeating it takes another explicit action of the user. The outcome tells the screen what happened.
// Known codes as in the global contract (#93): a terminal code ends the session with the existing cleanup;
// AUTH_ACCESS_EXPIRED and ambiguous answers (AUTH_REQUIRED, no code, unknown codes) go through the shared
// refreshAccess check, which renews, confirms or ends the session.
async function recoverSession(owner, serverCode) {
  if (TERMINAL_AUTH_CODES.includes(serverCode)) {
    store.commit('CORE/AUTH/' + types.SET_AUTH_ACCESS_SESSION, null);
    clearLegacyAuthStorageForD2();
    clearD2ClientAuthArtifacts();
    redirectToAuthIfNeeded();
    return { code: 'AUTH_REQUIRED', sessionRecovery: 'invalid' };
  }
  let session = null;
  try { session = await store.dispatch('CORE/AUTH/refreshAccess', { hydrate: true }); } catch (_) { session = null; }
  const auth = store.state.CORE.AUTH;
  if (!auth.authenticated) return { code: 'AUTH_REQUIRED', sessionRecovery: 'invalid' };
  // From an anonymous owner (session established by the signup itself) there is no earlier authorization to protect.
  if (owner.fingerprint && !isCurrentAuthorization(owner, store)) return { code: 'AUTH_CONTEXT_CHANGED', sessionRecovery: 'changed' };
  if (session && session.success && session.data && session.data.authenticated) return { code: 'AUTH_SESSION_RECOVERED', sessionRecovery: 'valid' };
  return { code: 'AUTH_SESSION_UNCONFIRMED', sessionRecovery: 'uncertain' };
}

async function request(method, url, data, headers = {}, authenticated = false) {
  const owner = authorizationContext(store);
  try {
    const config = await axiosHelper.buildRequestConfig(method, { headers });
    if (!isCurrentAuthorization(owner, store)) throw { code: 'AUTH_CONTEXT_CHANGED' };
    const response = await client.request({ ...config, method, url: `api/${url}`, data, authOwner: owner });
    if (!isCurrentAuthorization(owner, store)) throw { code: 'AUTH_CONTEXT_CHANGED' };
    return response.data;
  } catch (error) {
    if (!isCurrentAuthorization(owner, store)) throw { code: 'AUTH_CONTEXT_CHANGED' };
    const response = error.response;
    const serverCode = response && response.data && (response.data.code || response.data.data && response.data.data.code);
    if (authenticated && response && response.status === 401) {
      throw { ...(await recoverSession(owner, serverCode)), serverCode: serverCode || null, status: 401, retryAfterSeconds: 0 };
    }
    throw {
      code: error.code === 'AUTH_CONTEXT_CHANGED' ? error.code : serverCode || 'NETWORK_ERROR',
      status: response && response.status,
      retryAfterSeconds: Math.max(0, Number(response && (response.data.retryAfterSeconds || response.headers && response.headers['retry-after'])) || 0)
    };
  }
}

export default {
  async context() {
    if (!isCsrfEnabled()) return { enabled: false, legalDocuments: [] };
    const result = await request('get', 'registration/context');
    DACsrfService.clearCsrfToken();
    return result;
  },
  async register(data, attemptId) {
    const result = await request('post', 'auth/register', data, { 'Idempotency-Key': attemptId });
    DACsrfService.clearCsrfToken();
    return result;
  },
  async recoverSession() {
    // Refresh CSRF only; do not hydrate auth/store or remount the capture view.
    DACsrfService.clearCsrfToken();
    const result = await request('post', 'registration/recover-session', {});
    DACsrfService.clearCsrfToken();
    return result;
  },
  publicPlans: () => request('get', 'registration/plans'),
  activation: () => request('get', 'account/activation', undefined, {}, true),
  plans: () => request('get', 'account/activation/plans', undefined, {}, true),
  acknowledgeWelcome: () => request('post', 'account/setup-welcome/acknowledge', { acknowledged: true }, {}, true),
  sendCode: () => request('post', 'account/contact-verifications', { channel: 'email' }, {}, true),
  confirm: (challengeId, code) => request('post', 'account/contact-verifications/confirm', { challengeId, code }, {}, true),
  changeEmail: value => request('patch', 'account/activation/contact', { channel: 'email', value }, {}, true)
};
