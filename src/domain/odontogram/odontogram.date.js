const DEFAULT_CLINIC_TIMEZONE = 'America/Mexico_City';

function clinicTimezone(value) {
    try {
        new Intl.DateTimeFormat('es-MX', { timeZone: value || DEFAULT_CLINIC_TIMEZONE }).format();
        return value || DEFAULT_CLINIC_TIMEZONE;
    } catch (_) { return DEFAULT_CLINIC_TIMEZONE; }
}

// New API responses carry an unambiguous instant. Keep legacy date-only values
// as calendar dates: inventing a UTC offset would change an unknown stored day.
export function formatOdontogramCreatedAt(record = {}) {
    const value = record.created_at_utc || record.created_at;
    if(!value) return 'fecha no registrada';
    const text = String(value);
    const isInstant = /T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
    let date;
    if(isInstant) date = new Date(text);
    else {
        const legacy = text.match(/^(\d{2})-(\d{2})-(\d{4})/);
        const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
        const parts = legacy ? [legacy[3], legacy[2], legacy[1]] : iso ? iso.slice(1) : null;
        if(parts) date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12));
    }
    if(!date || Number.isNaN(date.getTime())) return text;
    return new Intl.DateTimeFormat('es-MX', {
        day: 'numeric', month: 'short', year: 'numeric',
        timeZone: isInstant ? clinicTimezone(record.timezone) : 'UTC'
    }).format(date);
}
