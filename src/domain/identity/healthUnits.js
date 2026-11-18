// NC1-CLUES-UX helpers. Only meanings documented in the source's own «Descripción Catalogo» sheet are
// translated; every other official code is shown literally.
export const UNIT_TYPES = { 1: 'Consulta externa', 2: 'Hospitalización', 3: 'De apoyo', 4: 'Asistencia social' };
export const OPERATION = { 1: 'En operación', 2: 'Pendiente de entrar en operación', 3: 'Fuera de operación', 4: 'En proceso de construcción' };
export const CLUES_ERRORS = { CLUES_NOT_OPERATING: 'La CLUES no está en operación en esa versión del catálogo SIS.', CLUES_NOT_IN_SIS_RELEASE: 'La CLUES no aparece en esa versión del catálogo SIS. Puedes capturarla manualmente sin verificar.' };
export const empty = () => ({ displayName: '', cluesRef: null, active: true, validFrom: null, validTo: null });
export const pick = d => ({ displayName: d.displayName || '', cluesRef: d.cluesRef || null, active: d.active !== false, validFrom: d.validFrom || null, validTo: d.validTo || null });
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const cluesCheck = unit => (unit && unit.catalogChecks || []).find(c => c.field === 'cluesRef') || null;

export function cluesStatus(unit) {
  const ref = unit && unit.cluesRef, check = cluesCheck(unit);
  if (!ref) return { key: 'none', text: 'Sin CLUES registrada' };
  if (!ref.releaseId) return { key: 'manual', text: 'Capturada manualmente · sin verificar' };
  if (check && check.result === 'valid') return { key: 'valid', text: 'Coincide con el catálogo SIS vigente' };
  if (check && check.code === 'RELEASE_NOT_EFFECTIVE') return { key: 'stale', text: 'Guardada con una versión anterior del catálogo · sin comprobar con la vigente' };
  if (check && check.result === 'invalid') return { key: 'invalid', text: 'No aparece en operación en la versión guardada del catálogo SIS' };
  return { key: 'unverified', text: 'Sin verificar · catálogo no disponible' };
}

// D-5: rows of a saved-versus-current comparison. Both sides keep their exact release; nothing here is written.
export const COMPARED = [['nombre_unidad', 'Nombre oficial'], ['institucion', 'Institución'], ['tipo_unidad', 'Tipo de establecimiento'],
  ['tip_abreviacion', 'Tipología'], ['sub_abreviacion', 'Subtipología'], ['id_entidad_federativa', 'Entidad federativa'], ['en_operacion', 'Situación']];
export function describeAttribute(key, value) {
  if (value == null || value === '') return 'Sin dato';
  if (key === 'tipo_unidad') return UNIT_TYPES[value] || 'Clave ' + value;
  if (key === 'en_operacion') return OPERATION[value] || 'Clave ' + value;
  return String(value);
}
export function compareAttributes(saved, current) {
  return COMPARED.map(([key, label]) => {
    const before = saved ? saved[key] : null, after = current ? current[key] : null;
    return { key, label, before: describeAttribute(key, before), after: describeAttribute(key, after), changed: String(before == null ? '' : before) !== String(after == null ? '' : after) };
  });
}

// R1: an uncertain create keeps one stable operation identity (sent as Idempotency-Key) and the exact payload that
// was sent, apart from any later edits. It survives Cancel and re-entry to this view within the SPA session, keyed
// by the authorization context, so it is never replayed under another user or business. A full page reload loses
// it. Keyed creation requires the CLUES-F1 backend contract; reload/another-tab recovery remains a separate scope.
const pendingCreates = new Map();
export const pendingCreate = owner => pendingCreates.get(owner) || null;
export const rememberCreate = (owner, operation) => { pendingCreates.set(owner, operation); };
export const forgetCreate = owner => { pendingCreates.delete(owner); };
export function newOperationKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
}
