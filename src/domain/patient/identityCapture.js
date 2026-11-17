// Patient identity capture for the «Nuevo paciente» form (NC1).
// Same catalogs and value shape as components/identity/IdentityFields.vue; the
// nc1-ux6 regression keeps both in step. Values left empty stay pending (null):
// nothing is deduced from names or other documents.

const DECLARATION = { yes: 'Sí', no: 'No', declined: 'No responde', unknown_to_patient: 'No sabe' };

export const BIOLOGICAL_SEX = { 1: 'Hombre', 2: 'Mujer', 3: 'Intersexual' };

export const PATIENT_IDENTITY_ENUMS = [
    { key: 'genderIdentity', label: 'Género', options: { 0: 'No especificado', 1: 'Masculino', 2: 'Femenino', 3: 'Transgénero', 4: 'Transexual', 5: 'Travesti', 6: 'Intersexual', 88: 'Otro' } },
    { key: 'indigenousSelfIdentification', label: '¿Se autodenomina indígena?', options: DECLARATION },
    { key: 'afromexicanSelfIdentification', label: '¿Se autodenomina afromexicano/a?', options: DECLARATION },
    { key: 'migrantStatus', label: 'Situación migratoria', options: { none: 'No migrante', national: 'Nacional', international: 'Internacional', returned: 'Retornado' } }
];

export const PATIENT_IDENTITY_REFERENCES = [
    { key: 'birthCountry', family: 'sis.country', label: 'País de nacimiento: clave' },
    { key: 'birthEntity', family: 'sis.federal_entity', label: 'Entidad de nacimiento: clave DGIS' },
    { key: 'nationality', family: 'renapo.nationality', label: 'Nacionalidad: clave RENAPO' },
    { key: 'originCountry', family: 'sis.country', label: 'País de procedencia: clave' },
    { key: 'residence.country', family: 'sis.country', label: 'País de residencia: clave' },
    { key: 'residence.entity', family: 'inegi.state', label: 'Entidad de residencia: EE' },
    { key: 'residence.municipality', family: 'inegi.municipality', label: 'Municipio: EEMMM' },
    { key: 'residence.locality', family: 'inegi.locality', label: 'Localidad: EEMMMLLLL' },
    { key: 'residence.postalCode', family: 'sepomex.postal_code', label: 'Código postal' }
];

export const PENDING_LABEL = 'Sin capturar';

// Vuetify select items; the first one keeps the value pending.
export const selectItems = options => [{ text: PENDING_LABEL, value: '' }].concat(Object.keys(options).map(value => ({ text: options[value], value })));

const nullable = value => (value === '' || value === undefined ? null : value);

export const withField = (identity, key, value) => ({ ...identity, [key]: nullable(value) });

export const withCurp = (identity, text) => {
    const current = identity.curp || {};
    const value = String(text || '').trim().toUpperCase();
    return { ...identity, curp: value ? { value, kind: current.kind || 'real', ...(current.reason ? { reason: current.reason } : {}) } : null };
};

export const withCurpDetail = (identity, key, value) => ({ ...identity, curp: { ...identity.curp, [key]: value } });

export const referenceCode = (identity, key) => {
    const reference = key.startsWith('residence.') ? (identity.residence || {})[key.split('.')[1]] : identity[key];
    return reference ? reference.code : '';
};

export const withReference = (identity, reference, text) => {
    const code = String(text || '').trim();
    const value = code ? { family: reference.family, code } : null;
    if (!reference.key.startsWith('residence.')) return { ...identity, [reference.key]: value };
    return { ...identity, residence: { ...identity.residence, [reference.key.split('.')[1]]: value } };
};

export const listCodes = (identity, key) => (identity[key] || []).map(item => item.code).join(', ');

export const withList = (identity, key, family, text) => {
    const codes = String(text || '').split(',').map(code => code.trim()).filter(Boolean);
    return { ...identity, [key]: codes.length ? codes.map(code => ({ family, code })) : null };
};
