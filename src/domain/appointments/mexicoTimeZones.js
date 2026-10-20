// Sources checked 2026-10-20: LHHEUM arts. 3/5 and IANA tzdb zone1970.tab/northamerica.
// Location is a selection aid; only the IANA identifier is persisted in appointment_config.
export const MEXICO_TIME_ZONES = [
  { value: 'America/Mexico_City', label: 'Centro · Ciudad de México' },
  { value: 'America/Cancun', label: 'Quintana Roo · Cancún' },
  { value: 'America/Merida', label: 'Campeche y Yucatán · Mérida' },
  { value: 'America/Monterrey', label: 'Noreste y Durango · sin horario estacional' },
  { value: 'America/Matamoros', label: 'Frontera de Coahuila, Nuevo León y Tamaulipas' },
  { value: 'America/Chihuahua', label: 'Chihuahua · excepto municipios fronterizos' },
  { value: 'America/Ciudad_Juarez', label: 'Chihuahua · frontera de Ciudad Juárez' },
  { value: 'America/Ojinaga', label: 'Chihuahua · frontera de Ojinaga' },
  { value: 'America/Mazatlan', label: 'Baja California Sur, Sinaloa y mayor parte de Nayarit' },
  { value: 'America/Bahia_Banderas', label: 'Nayarit · Bahía de Banderas' },
  { value: 'America/Hermosillo', label: 'Sonora · Hermosillo' },
  { value: 'America/Tijuana', label: 'Baja California · Tijuana' }
];

const central = 'America/Mexico_City';
const northeast = 'America/Monterrey';
const border = 'America/Matamoros';
const municipalities = (names, timezone) => names.map(label => ({ label, timezone }));
export const MEXICO_STATES = [
  ['AG', 'Aguascalientes', central], ['BC', 'Baja California', 'America/Tijuana'],
  ['BS', 'Baja California Sur', 'America/Mazatlan'], ['CM', 'Campeche', 'America/Merida'],
  ['CS', 'Chiapas', central], ['CH', 'Chihuahua', 'America/Chihuahua', [
    ...municipalities(['Janos', 'Ascensión', 'Juárez (Ciudad Juárez)', 'Praxedis G. Guerrero', 'Guadalupe'], 'America/Ciudad_Juarez'),
    ...municipalities(['Coyame del Sotol', 'Ojinaga', 'Manuel Benavides'], 'America/Ojinaga')
  ]],
  ['CX', 'Ciudad de México', central], ['CO', 'Coahuila', northeast,
    municipalities(['Acuña', 'Allende', 'Guerrero', 'Hidalgo', 'Jiménez', 'Morelos', 'Nava', 'Ocampo', 'Piedras Negras', 'Villa Unión', 'Zaragoza'], border)],
  ['CL', 'Colima', central], ['DG', 'Durango', northeast], ['GT', 'Guanajuato', central],
  ['GR', 'Guerrero', central], ['HG', 'Hidalgo', central], ['JC', 'Jalisco', central],
  ['MC', 'Estado de México', central], ['MI', 'Michoacán', central], ['MO', 'Morelos', central],
  ['NA', 'Nayarit', 'America/Mazatlan', municipalities(['Bahía de Banderas'], 'America/Bahia_Banderas')],
  ['NL', 'Nuevo León', northeast, municipalities(['Anáhuac'], border)],
  ['OA', 'Oaxaca', central], ['PU', 'Puebla', central], ['QT', 'Querétaro', central],
  ['QR', 'Quintana Roo', 'America/Cancun'], ['SL', 'San Luis Potosí', central],
  ['SI', 'Sinaloa', 'America/Mazatlan'], ['SO', 'Sonora', 'America/Hermosillo'],
  ['TB', 'Tabasco', central], ['TM', 'Tamaulipas', northeast,
    municipalities(['Nuevo Laredo', 'Guerrero', 'Mier', 'Miguel Alemán', 'Camargo', 'Gustavo Díaz Ordaz', 'Reynosa', 'Río Bravo', 'Valle Hermoso', 'Matamoros'], border)],
  ['TL', 'Tlaxcala', central], ['VE', 'Veracruz', central], ['YU', 'Yucatán', 'America/Merida'],
  ['ZA', 'Zacatecas', central]
].map(([value, label, timezone, exceptions = []]) => ({ value, label, timezone, exceptions }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es'));

export function locationOptions(stateId) {
  const state = MEXICO_STATES.find(item => item.value === stateId);
  if (!state || !state.exceptions.length) return [];
  return [...state.exceptions.map(item => ({ ...item, value: item.label })),
    { value: '__other__', label: 'Otro municipio de ' + state.label, timezone: state.timezone }];
}

export function timezoneForLocation(stateId, municipality = '') {
  const state = MEXICO_STATES.find(item => item.value === stateId);
  if (!state) return '';
  if (!state.exceptions.length) return state.timezone;
  return (locationOptions(stateId).find(item => item.value === municipality) || {}).timezone || '';
}

export function supportsTimeZone(timezone) {
  if (typeof timezone !== 'string' || !timezone.trim()) return false;
  try { new Intl.DateTimeFormat('es-MX', { timeZone: timezone }).format(); return true; }
  catch (_) { return false; }
}

export function timezoneLabel(timezone) {
  return (MEXICO_TIME_ZONES.find(item => item.value === timezone) || {}).label || timezone || 'Sin configurar';
}

export function timezonePreview(timezone, date = new Date()) {
  if (!supportsTimeZone(timezone)) return null;
  const offset = instant => new Intl.DateTimeFormat('es-MX', { timeZone: timezone, timeZoneName: 'longOffset' })
    .formatToParts(instant).find(part => part.type === 'timeZoneName').value.replace('GMT', 'UTC');
  const year = date.getUTCFullYear();
  const winter = offset(new Date(Date.UTC(year, 0, 15, 12)));
  const summer = offset(new Date(Date.UTC(year, 6, 15, 12)));
  return {
    now: new Intl.DateTimeFormat('es-MX', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' }).format(date),
    time: new Intl.DateTimeFormat('es-MX', { timeZone: timezone, timeStyle: 'short', hour12: true }).format(date),
    date: new Intl.DateTimeFormat('es-MX', { timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date),
    offset: offset(date),
    seasonal: winter !== summer,
    rule: winter === summer ? winter + ' todo el año' : winter + ' en enero · ' + summer + ' en julio'
  };
}
