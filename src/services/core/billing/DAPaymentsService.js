import axios from 'axios';
import context from '../../config/axios.url';
import axiosHelper from '../../config/axios.helper';
import store from '../../../store';
import { authorizationContext, isCurrentAuthorization } from '../../../security/authorizationContext';
import { canRecoverCsrf, recoverCsrfRequest, readableCsrfError } from '../../config/csrfRecovery';

const client = axios.create({ baseURL: context.APP_CORE_URL, withCredentials: true, timeout: 20000 });
client.interceptors.response.use(undefined, error => canRecoverCsrf(error)
  ? recoverCsrfRequest(error, config => client.request(config)) : Promise.reject(readableCsrfError(error)));
async function request(method, path, data, signal) {
  const owner = authorizationContext(store);
  try {
    const config = await axiosHelper.buildRequestConfig(method, { signal });
    if (!isCurrentAuthorization(owner, store)) throw { code: 'AUTH_CONTEXT_CHANGED' };
    const response = await client.request({ ...config, method, url: 'api/payments/' + path, data });
    if (!isCurrentAuthorization(owner, store)) throw { code: 'AUTH_CONTEXT_CHANGED' };
    return response.data;
  } catch (error) {
    if (!isCurrentAuthorization(owner, store)) throw { code: 'AUTH_CONTEXT_CHANGED' };
    const response = error.response;
    const payload = response && response.data || {};
    throw {
      code: error.code === 'AUTH_CONTEXT_CHANGED' ? error.code : payload.code || payload.data && payload.data.code || 'NETWORK_ERROR',
      status: response && response.status,
      retryAfterSeconds: Math.max(0, Number(payload.retryAfterSeconds || response && response.headers && response.headers['retry-after']) || 0)
    };
  }
}
const segment = value => encodeURIComponent(String(value));
export default {
  watchSubscription({ updated, ended }) {
    const owner = authorizationContext(store);
    const url = new URL('api/payments/subscription/events', context.APP_CORE_URL).href;
    // Native EventSource cannot send the Authorization header used by legacy sessions.
    if (axiosHelper.getToken().headers) {
      const controller = new AbortController(); let closed = false, reader;
      const close = () => { if (closed) return; closed = true; controller.abort(); if (reader) reader.cancel().catch(() => {}); };
      const finish = () => { if (closed) return; close(); if (isCurrentAuthorization(owner, store) && ended) ended(); };
      (async () => {
        try {
          const config = await axiosHelper.buildRequestConfig('get');
          if (closed || !isCurrentAuthorization(owner, store)) { close(); return; }
          const response = await fetch(url, { headers: { ...config.headers, Accept: 'text/event-stream' }, credentials: 'include', cache: 'no-store', signal: controller.signal });
          if (!response.ok || !response.body || !(response.headers.get('content-type') || '').includes('text/event-stream')) throw new Error('STREAM_UNAVAILABLE');
          reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
          while (!closed) {
            const chunk = await reader.read(); if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            let boundary;
            while (!closed && (boundary = /\r?\n\r?\n/.exec(buffer))) {
              const block = buffer.slice(0, boundary.index); buffer = buffer.slice(boundary.index + boundary[0].length);
              if (!isCurrentAuthorization(owner, store)) { close(); return; }
              const lines = block.split(/\r?\n/), event = lines.find(line => line.startsWith('event: '));
              if (event === 'event: settled') { finish(); return; }
              if (event !== 'event: snapshot') continue;
              let snapshot; try { snapshot = JSON.parse(lines.filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n')); } catch (_) { continue; }
              updated(snapshot);
            }
          }
        } catch (_) { /* Session renewal reopens the stream; no polling fallback. */ }
        finally { finish(); }
      })();
      return close;
    }
    if (typeof EventSource === 'undefined') return null;
    const source = new EventSource(url, { withCredentials: true });
    let closed = false;
    const close = () => { if (closed) return; closed = true; source.close(); };
    const finish = () => { if (closed) return; close(); if (isCurrentAuthorization(owner, store) && ended) ended(); };
    source.addEventListener('snapshot', event => {
      if (closed) return;
      if (!isCurrentAuthorization(owner, store)) { close(); return; }
      let snapshot;
      try { snapshot = JSON.parse(event.data); } catch (_) { return; }
      updated(snapshot);
    });
    source.addEventListener('settled', finish);
    source.onerror = () => { if (source.readyState === EventSource.CLOSED) finish(); };
    return close;
  },
  history: (cursor, signal) => request('get', 'history' + (cursor ? '?' + new URLSearchParams({ cursor }).toString() : ''), undefined, signal),
  plans: signal => request('get', 'plans', undefined, signal),
  create: (payload, signal) => request('post', 'checkout-attempts', payload, signal),
  attempt: (id, signal) => request('get', 'checkout-attempts/' + segment(id), undefined, signal),
  savedSnapshot: signal => request('get', 'subscription/snapshot', undefined, signal),
  subscription: signal => request('get', 'subscription', undefined, signal),
  cancelSubscription: (payload, signal) => request('post', 'subscription/cancel', payload, signal),
  planChangeQuote: (input, signal) => request('get', 'subscription/plan-change-quote?' + new URLSearchParams(input).toString(), undefined, signal),
  changePlan: (payload, signal) => request('post', 'subscription/change-plan', payload, signal),
  confirm: (id, signal) => request('post', 'checkout-attempts/' + segment(id) + '/confirm', {}, signal),
  cancel: (id, signal) => request('post', 'checkout-attempts/' + segment(id) + '/cancel', {}, signal),
  license: signal => request('get', 'license', undefined, signal),
  prepareLegal: (idempotencyKey, signal) => request('post', 'legal/prepare', { idempotencyKey }, signal),
  acceptLegal: (payload, signal) => request('post', 'legal/accept', payload, signal)
};
