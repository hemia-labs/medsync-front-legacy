import { DACore } from '../../config/axios.context';
const base = 'api/odontogram/v2/';
const key = value => encodeURIComponent(value);
export default {
  globalAliases: () => DACore.get('api/super-admin/odontogram-aliases'),
  saveGlobalAlias: body => DACore.put('api/super-admin/odontogram-aliases',body),
  capabilities: () => DACore.get(base + 'capabilities'),
  setMode: mode => DACore.put(base + 'mode', { mode }),
  aliases: () => DACore.get(base + 'aliases'),
  saveAlias: body => DACore.put(base + 'aliases', body),
  activationCheck: () => DACore.get(base + 'activation-check'),
  preferences: () => DACore.get(base + 'preferences'),
  savePreferences: body => DACore.put(base + 'preferences',body),
  metrics: body => DACore.post(base + 'metrics',body),
  list: patient => DACore.get(base + 'charts/' + key(patient)),
  planLinks: id => DACore.get(base+'chart/'+key(id)+'/plan-links'),
  read: (id, revision) => DACore.get(base + 'chart/' + key(id) + (revision === undefined ? '' : '?revision=' + key(revision))),
  create: (patient, body) => DACore.post(base + 'charts/' + key(patient), body),
  operations: (id, body) => DACore.post(base + 'chart/' + key(id) + '/ops', body),
  transition: (id, action, body) => DACore.post(base + 'chart/' + key(id) + '/' + key(action), body)
};
