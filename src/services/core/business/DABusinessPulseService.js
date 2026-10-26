import { DACore } from '../../config/axios.context';
function get(resource, params, signal) {
  const query = new URLSearchParams({ contractVersion: '1.1-p1-draft', ...params });
  return DACore.get(`api/business/pulse/${resource}?${query}`, { signal });
}
export default {
  snapshot(refresh, signal) { return get('snapshot', { refresh: refresh ? '1' : '0' }, signal); },
  history(signal) { return get('history', { days: '30' }, signal); },
  appointmentResult(recordId, signal) { return get('appointment-result', { recordId }, signal); },
  incidents(indicatorId, cursor, signal, kind = 'pending', limit = '20') { return get('incidents', kind === 'invalid' ? { indicatorId, limit: '50', kind } : { indicatorId, limit: String(limit), ...(cursor ? { cursor } : {}) }, signal); }
};
