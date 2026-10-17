// Keep dates in the doctor's device calendar, rather than the UTC calendar.
export const localDate = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

export const coreFields = [
    { key: 'generic_name', label: 'Medicamento / nombre genérico' },
    { key: 'dose', label: 'Dosis' },
    { key: 'administration_route', label: 'Vía de administración' },
    { key: 'frequency', label: 'Frecuencia' },
    { key: 'duration', label: 'Duración' }
];
export const detailFields = [
    { key: 'commercial_name', label: 'Nombre comercial' },
    { key: 'presentation', label: 'Presentación' },
    { key: 'concentration', label: 'Concentración' },
    { key: 'pharmaceutical_form', label: 'Forma farmacéutica' },
    { key: 'quantity', label: 'Cantidad' }
];
const textFields = [...coreFields, ...detailFields, { key: 'indications' }];
export const emptyItem = (values = {}) => ({
    ...Object.fromEntries(textFields.map(({ key }) => [key, ''])),
    ...values,
    local_id: values.id_prescription_item || `rx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    detailsOpen: detailFields.some(({ key }) => Boolean(values[key]))
});
export const emptyForm = (idPerson, createRequestId = '') => ({
    id_prescription: '', create_request_id: createRequestId, id_person: idPerson, issuer_doctor_id: '', issue_date: localDate(),
    diagnosis: '', notes: '', items: [emptyItem()]
});
export const payload = (form) => ({
    id_prescription: form.id_prescription || '', id_person: form.id_person,
    ...(form.create_request_id ? { create_request_id: form.create_request_id } : {}),
    issuer_doctor_id: form.issuer_doctor_id, issue_date: form.issue_date,
    diagnosis: (form.diagnosis || '').trim(), notes: (form.notes || '').trim(),
    items: form.items.map(item => Object.fromEntries(textFields.map(({ key }) => [key, String(item[key] || '').trim()])))
});
export const snapshot = (form) => JSON.stringify(payload(form));
export const validate = (form, forIssue = false) => {
    const errors = [];
    if (!form.id_person) errors.push({ key: 'patient', message: 'No se pudo identificar al paciente. Reintenta la carga.' });
    if (!form.issuer_doctor_id) errors.push({ key: 'doctor', message: 'Selecciona el doctor emisor.' });
    if (!form.issue_date) errors.push({ key: 'date', message: 'Selecciona la fecha de receta.' });
    if (forIssue) {
        if (!form.items.length) errors.push({ key: 'items', message: 'Agrega al menos un medicamento.' });
        form.items.forEach((item, index) => coreFields.forEach(({ key, label }) => {
            if (!String(item[key] || '').trim()) errors.push({ key: `${index}-${key}`, message: `Medicamento ${index + 1}: completa ${label.toLowerCase()}.` });
        }));
    }
    return errors;
};

// Store the saved ID before issuing. A failed/lost issue response must never create a new draft.
export async function saveAndIssue(service, form, onDraft) {
    if (form.id_prescription) {
        const current = await service.getById(form.id_prescription);
        if (!current.success) return current;
        if (current.data.status === 'issued') return current;
        if (current.data.status !== 'draft') return { success: false, message: 'La receta ya no es un borrador. Cierra la hoja y consulta su estado.' };
    }
    const draft = await service.save(payload(form));
    if (!draft.success) return draft;
    form.id_prescription = draft.data.id_prescription;
    if (draft.data.status === 'issued') return draft;
    onDraft(draft.data);
    let result;
    try { result = await service.issue(form.id_prescription); }
    catch (error) { result = { success: false, message: 'Se perdió la respuesta de emisión.' }; }
    if (result.success) return result;
    // The server may have committed even if its response was lost.
    const current = await service.getById(form.id_prescription);
    if (current.success && current.data.status === 'issued') return current;
    return { ...result, message: `Borrador ${draft.data.folio || ''} guardado. ${result.message || 'No se pudo confirmar la emisión.'} Puedes reintentar sobre esta misma receta.` };
}
