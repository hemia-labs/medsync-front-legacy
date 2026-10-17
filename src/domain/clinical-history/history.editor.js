// Snapshots stay in memory: clinical data must not be cached in browser storage.
export const editorSnapshot = (form, doctorId) => JSON.stringify({ form, doctorId: doctorId || null });

// Advance a revision after the allergy editor only when no other saved content changed.
export const canRefreshAllergyRevision = (before, after, allergyRevision) => {
    if (!before || !after || before.id_clinical_history !== after.id_clinical_history || after.status !== 'DRAFT' || before.status !== 'DRAFT') return false;
    if (!Number.isSafeInteger(after.revision) || after.revision < before.revision) return false;
    if (before.doctor_responsible_user_id !== after.doctor_responsible_user_id || before.doctor_responsible_profile_id !== after.doctor_responsible_profile_id) return false;
    if (before.template_version_id !== after.template_version_id || JSON.stringify(before.template_snapshot_json) !== JSON.stringify(after.template_snapshot_json)) return false;
    if (Number((after.clinical_snapshot_json.allergies_medications || {}).allergy_revision) !== Number(allergyRevision)) return false;
    const comparable = snapshot => {
        const value = JSON.parse(JSON.stringify(snapshot || {}));
        const allergy = value.allergies_medications || {};
        ['allergies', 'allergy_status', 'allergy_revision', 'allergy_reviewed_at', 'allergy_reviewed_by', 'legacy_allergies'].forEach(key => { delete allergy[key]; });
        return JSON.stringify(value);
    };
    return comparable(before.clinical_snapshot_json) === comparable(after.clinical_snapshot_json);
};

export const textLengthErrors = (form, sections, limit = 5000) => {
    const errors = [];
    Object.entries(form || {}).forEach(([sectionKey, values]) => {
        const section = sections.find(item => item.key === sectionKey);
        Object.entries(values || {}).forEach(([fieldKey, value]) => {
            if (typeof value !== 'string' || value.length <= limit) return;
            const field = section && (section.fields || []).find(item => item.key === fieldKey);
            errors.push({
                key: `${sectionKey}-${fieldKey}`, sectionKey, fieldKey,
                sectionLabel: section ? section.label : sectionKey,
                fieldLabel: field ? field.label : fieldKey,
                message: `Tiene ${value.length} caracteres; el máximo es ${limit}.`
            });
        });
    });
    return errors;
};
