// A selection retains its exact version. Typing a code is always an unverified candidate.
export const referenceAt = (identity, key) => key.startsWith('residence.') ? (identity.residence || {})[key.slice(10)] || null : identity[key] || null;
export const withCatalogReference = (identity, key, value) => key.startsWith('residence.')
    ? { ...identity, residence: { ...identity.residence, [key.slice(10)]: value } } : { ...identity, [key]: value };
export const catalogParent = (identity, key) => {
    const parent = key === 'residence.municipality' ? 'residence.entity' : key === 'residence.locality' ? 'residence.municipality' : null;
    return parent ? (referenceAt(identity, parent) || {}).code || '' : '';
};
export const cleanReference = ref => ref ? { family: ref.family, ...(ref.releaseId ? { releaseId: ref.releaseId } : {}), code: ref.code } : null;
// Contract §4: manual CLUES input is normalized with trim + uppercase. Other families keep the literal code.
export const candidateReference = (family, text) => text && text.trim()
    ? { family, code: family === 'sis.establishments' ? text.trim().toUpperCase() : text.trim() } : null;
export const referenceKey = ref => ref ? [ref.family, ref.releaseId || '', ref.code].join('|') : '';
