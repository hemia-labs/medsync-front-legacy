// Only non-sensitive operation identifiers live here; appointment drafts stay in component memory.
export function newAgendaRequestId() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

export function clinicClock(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function appointmentPhone(value, country = 'MX') {
  const raw = String(value || '').trim();
  if (!raw) return { valid: false, e164: '', message: 'Captura el telefono de contacto.' };
  if (!/^[+\d\s().-]+$/.test(raw)) return { valid: false, e164: '', message: 'Usa numeros y el codigo de pais; no extensiones.' };
  const digits = raw.replace(/\D/g, '');
  let e164 = '';
  if (raw.startsWith('+') && raw.indexOf('+', 1) < 0 && /^[1-9]\d{7,14}$/.test(digits)) e164 = '+' + digits;
  else if (!raw.includes('+') && country === 'MX' && /^\d{10}$/.test(digits)) e164 = '+52' + digits;
  else if (!raw.includes('+') && country === 'MX' && /^52\d{10}$/.test(digits)) e164 = '+' + digits;
  else if (!raw.includes('+') && country === 'US' && /^[2-9]\d{9}$/.test(digits)) e164 = '+1' + digits;
  // Existing international numbers must keep their explicit prefix; never assume +52 for them.
  return { valid: !!e164, e164, message: e164 ? '' : 'Revisa el pais y el numero. Para otro pais escribe + y su codigo.' };
}
