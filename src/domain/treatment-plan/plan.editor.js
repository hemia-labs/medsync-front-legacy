export const localToday = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export const requestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export const snapshot = value => JSON.stringify(value);
const validDate = value => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
export const treatmentErrors = form => {
    const errors = {};
    if (!String(form.name || '').trim() || [...String(form.name)].length > 255) errors.name = 'Escribe un nombre de tratamiento de hasta 255 caracteres.';
    if ([...String(form.category || '')].length > 120) errors.category = 'La categoría admite hasta 120 caracteres.';
    if (form.cost !== '' && form.cost !== null && form.cost !== undefined && (!/^\d+(\.\d{1,2})?$/.test(String(form.cost)) || !Number.isFinite(Number(form.cost)) || Number(form.cost) >= 1e16)) errors.cost = 'Usa un costo no negativo con hasta dos decimales.';
    for (const key of ['estimated_start_date', 'estimated_end_date']) if (!validDate(form[key])) errors[key] = 'Usa una fecha válida.';
    if (form.estimated_start_date && form.estimated_end_date && form.estimated_end_date < form.estimated_start_date) errors.estimated_end_date = 'El fin no puede ser anterior al inicio.';
    for (const key of ['description', 'notes']) if (new Blob([form[key] || '']).size > 65535) errors[key] = 'El texto supera el tamaño permitido.';
    return errors;
};
export const planErrors = form => {
    const errors = {};
    if (!String(form.title || '').trim() || [...String(form.title)].length > 255) errors.title = 'Escribe un nombre del plan de hasta 255 caracteres.';
    if ([...String(form.diagnosis || '')].length > 1000) errors.diagnosis = 'El diagnóstico admite hasta 1000 caracteres.';
    if (new Blob([form.notes || '']).size > 65535) errors.notes = 'Las notas superan el tamaño permitido.';
    if (!validDate(form.started_at)) errors.started_at = 'Usa una fecha de inicio válida.';
    return errors;
};
