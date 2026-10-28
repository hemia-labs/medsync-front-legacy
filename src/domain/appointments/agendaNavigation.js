import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';

// One return per store, in memory only. Never put a draft in route/storage state.
const returns = new WeakMap();
export function clearAgendaReturn(store) {
  const entry = store && returns.get(store);
  if (entry && entry.unsubscribe) entry.unsubscribe();
  if (store) returns.delete(store);
}
export function keepAgendaReturn(store, value) {
  clearAgendaReturn(store);
  const context = authorizationContext(store);
  if (!context.fingerprint) return;
  const entry = { context, value: JSON.parse(JSON.stringify(value)) };
  returns.set(store, entry);
  entry.unsubscribe = store.subscribe(() => {
    if (!isCurrentAuthorization(context, store)) clearAgendaReturn(store);
  });
}
export function peekAgendaReturn(store, patientId) {
  const entry = store && returns.get(store);
  if (!entry) return null;
  if (!isCurrentAuthorization(entry.context, store)) { clearAgendaReturn(store); return null; }
  if (patientId && entry.value.patientId !== patientId) return null;
  return JSON.parse(JSON.stringify(entry.value));
}
export function takeAgendaReturn(store) {
  const value = peekAgendaReturn(store);
  clearAgendaReturn(store);
  return value;
}

export function setAgendaCreatedPatient(store, patient) {
  const entry = peekAgendaReturn(store);
  if (!entry || entry.kind !== 'create-patient') return false;
  keepAgendaReturn(store, { ...entry, createdPatient: patient });
  return true;
}
