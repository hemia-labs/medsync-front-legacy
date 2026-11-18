// Only meanings documented in the source's own «Descripción Catalogo» sheet; other codes are shown literally.
export const UNIT_TYPES = { 1: 'Consulta externa', 2: 'Hospitalización', 3: 'De apoyo', 4: 'Asistencia social' };
export const CLUES_ERRORS = { CLUES_NOT_OPERATING: 'La CLUES no está en operación en esa versión del catálogo SIS.', CLUES_NOT_IN_SIS_RELEASE: 'La CLUES no aparece en esa versión del catálogo SIS. Puedes capturarla manualmente sin verificar.' };
export const empty = () => ({ displayName: '', cluesRef: null, active: true, validFrom: null, validTo: null });
export const pick = d => ({ displayName: d.displayName || '', cluesRef: d.cluesRef || null, active: d.active !== false, validFrom: d.validFrom || null, validTo: d.validTo || null });
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function cluesStatus(unit) {
  const ref = unit && unit.cluesRef, check = unit && (unit.catalogChecks || []).find(c => c.field === 'cluesRef');
  if (!ref) return { key: 'none', text: 'Sin CLUES registrada' };
  if (!ref.releaseId) return { key: 'manual', text: 'Capturada manualmente · sin verificar' };
  if (check && check.result === 'valid') return { key: 'valid', text: 'Coincide con el catálogo SIS vigente' };
  if (check && check.result === 'invalid') return { key: 'invalid', text: 'No aparece en operación en el catálogo SIS' };
  return { key: 'unverified', text: 'Sin verificar · catálogo no disponible o versión no vigente' };
}

