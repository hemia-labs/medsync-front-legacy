import { DACore } from './config/axios.context';

const tenant = 'api/saas-legal';
const segment = value => encodeURIComponent(String(value || ''));

export default {
  current() { return DACore.get(tenant); },
  notice() { return DACore.get(`${tenant}/notice`); },
  history(cursor) { return DACore.get(`${tenant}/history`, { params: cursor ? { cursor } : {} }); },
  centralContext(documentSetKey) { return DACore.get(`${tenant}/central/context`, { params: documentSetKey ? { documentSetKey } : {} }); },
  acceptCentral(payload) { return DACore.post(`${tenant}/central/accept`, payload); },
  centralDocument(versionId, cursor, documentSetKey) { return DACore.get(`${tenant}/central/documents/${segment(versionId)}`, { params: { ...(cursor ? { cursor } : {}), ...(documentSetKey ? { documentSetKey } : {}) } }); },
  accept(idVersion) { return DACore.post(`${tenant}/accept`, { id_version: idVersion, acknowledged: true }); },
  publicCurrent(documentKey) { return DACore.get(`${tenant}/public/${segment(documentKey)}`); },
};
