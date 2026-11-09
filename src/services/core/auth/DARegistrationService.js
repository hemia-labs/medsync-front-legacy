import axios from 'axios';
import context from '../../config/axios.url';
import { isCsrfEnabled } from '../../config/authTransport.config';
import DACsrfService from './DACsrfService';
import store from '../../../store';
import { authorizationContext, isCurrentAuthorization } from '../../../security/authorizationContext';
import axiosHelper from '../../config/axios.helper';
import { canRecoverCsrf, recoverCsrfRequest, readableCsrfError } from '../../config/csrfRecovery';

// Registration uses plain DTOs, unlike the legacy API envelope. Never persist
// its body or retry a write whose outcome is unknown in this transport layer.
const client = axios.create({ baseURL: context.APP_CORE_URL, withCredentials: true, timeout: 20000 });
client.interceptors.response.use(undefined, error => canRecoverCsrf(error)
  ? recoverCsrfRequest(error, config => client.request(config)) : Promise.reject(readableCsrfError(error)));
async function request(method, url, data, headers = {}, authenticated = false, renewed = false) {
  const owner = authorizationContext(store);
  try {
    const config = await axiosHelper.buildRequestConfig(method, { headers });
    if (!isCurrentAuthorization(owner, store)) throw { code: 'AUTH_CONTEXT_CHANGED' };
    const response = await client.request({ ...config, method, url: `api/${url}`, data });
    if (!isCurrentAuthorization(owner, store)) throw { code: 'AUTH_CONTEXT_CHANGED' };
    return response.data;
  } catch (error) {
    if (!isCurrentAuthorization(owner, store)) throw { code: 'AUTH_CONTEXT_CHANGED' };
    const response = error.response;
    if (authenticated && !renewed && response && response.status === 401) {
      await store.dispatch('CORE/AUTH/getToken');
      if (store.getters['CORE/AUTH/isAuthorized'] && isCurrentAuthorization(owner, store)) {
        return request(method, url, data, headers, true, true);
      }
    }
    throw {
      code: error.code === 'AUTH_CONTEXT_CHANGED' ? error.code : (response && response.data && (response.data.code || response.data.data && response.data.data.code)) || 'NETWORK_ERROR',
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
  publicPlans: () => request('get', 'registration/plans'),
  activation: () => request('get', 'account/activation', undefined, {}, true),
  plans: () => request('get', 'account/activation/plans', undefined, {}, true),
  acknowledgeWelcome: () => request('post', 'account/setup-welcome/acknowledge', { acknowledged: true }, {}, true),
  sendCode: () => request('post', 'account/contact-verifications', { channel: 'email' }, {}, true),
  confirm: (challengeId, code) => request('post', 'account/contact-verifications/confirm', { challengeId, code }, {}, true),
  changeEmail: value => request('patch', 'account/activation/contact', { channel: 'email', value }, {}, true)
};
