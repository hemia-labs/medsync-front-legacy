// These are versioned values, never fallbacks to the current patient record.
export const identificationFields = [
    ['full_name', 'Nombre completo'], ['age', 'Edad'], ['birth_date', 'Fecha de nacimiento'],
    ['sex', 'Sexo'], ['phone', 'Teléfono'], ['email', 'Correo'],
    ['address', 'Dirección'], ['emergency_contact', 'Contacto de emergencia']
];

export const identificationValue = value => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string' && (!value.trim() || value.trim().toLowerCase() === 'no registrado')) return '';
    return value;
};

// NC1-EC1: the primary emergency contact as one readable line for the versioned snapshot.
export const emergencyContactText = contact => {
    if (!contact || typeof contact !== 'object') return '';
    const name = String(contact.name || '').trim();
    if (!name) return '';
    const relationship = String(contact.relationship || '').trim();
    const phone = String(contact.phone || '').trim();
    return [relationship ? name + ' (' + relationship + ')' : name, phone].filter(Boolean).join(' · ');
};

export const identificationLabel = value => {
    const captured = identificationValue(value);
    return captured === '' ? 'No registrado en esta versión' : captured;
};

export const comparableIdentificationValue = (key, value) => {
    const text = String(identificationValue(value)).trim().replace(/\s+/g, ' ');
    if (key === 'phone') return text.replace(/\D/g, '');
    if (key === 'birth_date') return text.replace(/^(\d{2})-(\d{2})-(\d{4})$/, '$3-$2-$1');
    return text;
};

export const identificationDifferences = (captured = {}, current = {}) => identificationFields
    .filter(([key]) => key !== 'age' && comparableIdentificationValue(key, captured[key]) !== comparableIdentificationValue(key, current[key]))
    .map(([key, label]) => ({ key, label, captured: captured[key], current: current[key] }));

// Order-independent comparison; clinical values are deliberately NOT normalized.
// A canonical change to any reviewed section requires another review before closing.
const ordered = value => {
    if (Array.isArray(value)) return value.map(ordered);
    if (value && typeof value === 'object') return Object.keys(value).sort().reduce((result, key) => {
        result[key] = ordered(value[key]);
        return result;
    }, {});
    return value;
};
export const reviewedHistorySnapshot = (snapshot, doctorId) => JSON.stringify(ordered({ snapshot, doctorId: doctorId || null }));
