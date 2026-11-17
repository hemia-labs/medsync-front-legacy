// NC1 identidad simple/integrada: one place to turn a stored identity into an editable draft, build the
// differential patch and present field errors. Names are three plain values; surname statuses are derived by
// the server and never captured or sent.

const META = ['contractVersion', 'revision', 'updatedAt', 'provenance', 'qualityIssues', 'legacySurname', 'legacyProfessionalName', 'catalogValidation', 'curpSex'];
const DERIVED = ['firstSurnameStatus', 'secondSurnameStatus'];
const NAMES = ['givenNames', 'firstSurname', 'secondSurname'];

const clone = value => JSON.parse(JSON.stringify(value == null ? null : value));

// Stored identity (API view) -> editable draft: metadata and derived statuses removed.
export function editableIdentity(view) {
    const draft = clone(view || {}) || {};
    [...META, ...DERIVED].forEach(key => delete draft[key]);
    if (draft.curp) delete draft.curp.validationStatus;
    NAMES.forEach(key => { if (!(key in draft)) draft[key] = null; });
    return draft;
}

// Names are trimmed and an empty name is null (pending), never a declaration of absence.
export function normalizedDraft(draft) {
    const next = clone(draft || {}) || {};
    NAMES.forEach(key => { const text = typeof next[key] === 'string' ? next[key].trim() : next[key]; next[key] = text ? text : null; });
    DERIVED.forEach(key => delete next[key]);
    return next;
}

// Only changed keys travel; the server merges with the stored identity under expectedRevision.
export function identityPatch(draft, baseline) {
    const next = normalizedDraft(draft), base = normalizedDraft(baseline), patch = {};
    Object.keys({ ...next, ...base }).forEach(key => {
        if (JSON.stringify(next[key] == null ? null : next[key]) !== JSON.stringify(base[key] == null ? null : base[key])) patch[key] = next[key] == null ? null : next[key];
    });
    return patch;
}

// The display name the server derives: names joined, no titles, nothing split.
export function composedName(identity) {
    const value = normalizedDraft(identity);
    return NAMES.map(key => value[key]).filter(Boolean).join(' ');
}

const FIELD_LABELS = {
    givenNames: 'Nombre(s)', firstSurname: 'Primer apellido', secondSurname: 'Segundo apellido', birthDate: 'Fecha de nacimiento',
    biologicalSex: 'Sexo biológico', genderIdentity: 'Género', indigenousSelfIdentification: 'Autodenominación indígena',
    afromexicanSelfIdentification: 'Autodenominación afromexicana', migrantStatus: 'Situación migratoria', curp: 'CURP', 'curp.reason': 'Motivo de CURP genérica',
    birthCountry: 'País de nacimiento', birthEntity: 'Entidad de nacimiento', nationality: 'Nacionalidad', originCountry: 'País de procedencia',
    'residence.country': 'País de residencia', 'residence.entity': 'Entidad de residencia', 'residence.municipality': 'Municipio', 'residence.locality': 'Localidad',
    'residence.postalCode': 'Código postal', affiliations: 'Afiliaciones', authorizedPersonnelTypes: 'Tipos de personal autorizados'
};

// Presentation adapter for { status, message, data: { code, field } }. Only known fields of the identity
// contract map to a control; 401/403/409 and unknown fields stay in the general alert. Contract unchanged.
export function identityFieldError(response) {
    const data = response && response.data;
    const field = data && data.field;
    if (!field || !FIELD_LABELS[field] || response.status !== 400 || !['IDENTITY_INVALID', 'CATALOG_SENTINEL_NOT_STORABLE', 'BIOLOGICAL_SEX_REQUIRED'].includes(data.code)) return null;
    const message = data.code === 'CATALOG_SENTINEL_NOT_STORABLE' ? 'Esta clave no se puede guardar; deja el dato pendiente.' : 'Revisa este dato.';
    return { field, label: FIELD_LABELS[field], message, errors: { [field]: [message] } };
}
