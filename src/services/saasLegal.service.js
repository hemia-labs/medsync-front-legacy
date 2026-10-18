import { DACore } from './config/axios.context';

const tenant = 'api/saas-legal';
const admin = 'api/super-admin/saas-legal';
const segment = value => encodeURIComponent(String(value || ''));

export default {
  current() { return DACore.get(tenant); },
  history() { return DACore.get(`${tenant}/history`); },
  accept(idVersion) { return DACore.post(`${tenant}/accept`, { id_version: idVersion, acknowledged: true }); },
  publicCurrent(documentKey) { return DACore.get(`${tenant}/public/${segment(documentKey)}`); },
  adminList() { return DACore.get(admin); },
  saveDraft(documentKey, payload) { return DACore.put(`${admin}/${segment(documentKey)}`, payload); },
  publish(documentKey, expectedRevision) { return DACore.post(`${admin}/${segment(documentKey)}/publish`, { expected_revision: expectedRevision }); },
  version(documentKey, idVersion) { return DACore.get(`${admin}/${segment(documentKey)}/versions/${segment(idVersion)}`); }
};
