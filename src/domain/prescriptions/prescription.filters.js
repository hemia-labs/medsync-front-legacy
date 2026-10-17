const validCalendarDate = value => {
    if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const validatePrescriptionDateRange = (filters = {}) => {
    for(const [key, label] of [['date_from', 'Desde'], ['date_to', 'Hasta']]) {
        if(filters[key] && !validCalendarDate(filters[key])) return `La fecha ${label} debe ser una fecha válida con formato AAAA-MM-DD.`;
    }
    if(filters.date_from && filters.date_to && filters.date_from > filters.date_to) return 'La fecha Hasta debe ser igual o posterior a Desde. Corrige el rango para buscar recetas.';
    return '';
};
