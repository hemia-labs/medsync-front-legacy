// Pure presentation helpers for the Pulse page. They only reorganize the snapshot/history
// already authorized for the reader; they never infer clinical meaning or rank people.
export const PRIORITY_DAYS = Object.freeze({ 'PUL-OP01': 14, 'PUL-OP02': 7, 'PUL-OP03': 7 });
export const DETAIL_PERMISSIONS = Object.freeze({ 'PUL-OP01': ['px.all', 'px.tab.monitoring'], 'PUL-OP02': ['px.all', 'documents.view'], 'PUL-OP03': ['px.all', 'px.dates'] });
const ORDER = ['PUL-OP01', 'PUL-OP02', 'PUL-OP03'];
export const INVALID_REASONS = Object.freeze({
  'PUL-OP01': { patient_missing: 'El seguimiento no tiene un paciente activo vinculado.', due_date: 'Falta la fecha prevista o no es válida.', appointment_link: 'Tiene una cita vinculada con un estado o una fecha que no podemos interpretar.' },
  'PUL-OP02': { record_missing: 'La solicitud no tiene documento o paciente vinculado.', requirements: 'No sabemos qué firmas requiere el documento.', dates: 'Sus fechas de creación o de vencimiento no son válidas.' },
  'PUL-OP03': { patient_missing: 'La cita no tiene un paciente activo vinculado.', status: 'Tiene un estado que no reconocemos.', time_range: 'Su fecha u horario no son válidos (por ejemplo, termina antes de empezar).', timezone: 'Su horario cae en un cambio de horario y no podemos ubicarlo con certeza.' }
});
const civil = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: '2-digit', month: 'short' });
export function civilDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value || '')) return 'fecha no disponible';
  const date = new Date(String(value).slice(0, 10) + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) ? civil.format(date) : 'fecha no disponible';
}
function localDate(at, zone) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at)); } catch (_) { return null; }
}
const previousDate = date => new Date(Date.parse(date + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);

// One card per indicator: the total, how many already crossed the priority threshold and
// each group's own oldest age. Priority indicators first, then the oldest pending.
export function groupIncidents(incidents) {
  const groups = new Map();
  for (const item of incidents || []) {
    const g = groups.get(item.indicatorId) || { indicatorId: item.indicatorId, count: 0, priorityCount: 0, oldestAgeDays: null, attentionAgeDays: null, action: null };
    g.count += item.count;
    if (item.severity === 'priority') g.priorityCount += item.count;
    else g.attentionAgeDays = item.oldestAgeDays;
    if (item.oldestAgeDays !== null && item.oldestAgeDays !== undefined) g.oldestAgeDays = Math.max(g.oldestAgeDays === null ? 0 : g.oldestAgeDays, item.oldestAgeDays);
    g.action = g.action || item.action || null;
    groups.set(item.indicatorId, g);
  }
  return [...groups.values()].sort((a, b) => Number(b.priorityCount > 0) - Number(a.priorityCount > 0) || (b.oldestAgeDays || 0) - (a.oldestAgeDays || 0) || ORDER.indexOf(a.indicatorId) - ORDER.indexOf(b.indicatorId));
}

// A previous reading only matters when the current one cannot already show those pendings.
export function unresolvedNotShown(data) {
  return (data.lastKnownUnresolved || []).filter(item => {
    const dimension = (data.dimensions || []).find(d => d.id === item.indicatorId);
    const source = dimension && (data.quality.sources || []).find(s => s.id === dimension.sourceId);
    const current = (data.incidents || []).find(i => i.id === item.id);
    return !(source && source.status === 'fresh' && current && current.count >= item.count);
  });
}

export function planningSummary(activity) {
  const p = activity && activity.planning;
  if (!p) return null;
  const upcoming = Number.isFinite(p.pendingConfirmationNext24h) ? p.pendingConfirmationNext24h : 0, running = Number.isFinite(p.inProgressUnresolved) ? p.inProgressUnresolved : 0;
  if (!upcoming && !running) return null;
  const title = upcoming ? (upcoming === 1 ? '1 cita por confirmar en las próximas 24 horas' : upcoming + ' citas por confirmar en las próximas 24 horas') : (running === 1 ? '1 cita en curso todavía sin resultado' : running + ' citas en curso todavía sin resultado');
  const extra = upcoming && running ? ' Además, ' + (running === 1 ? 'hay 1 cita en curso o recién terminada' : 'hay ' + running + ' citas en curso o recién terminadas') + ' sin resultado.' : '';
  return { title, text: (upcoming ? 'Confirmarlas a tiempo ayuda a evitar inasistencias.' : 'Registrar cómo quedan evita que pasen a la lista de pendientes.') + extra + ' Todavía no cuentan como pendientes vencidos.' };
}

const hasPriority = point => (point.dimensions || []).some(d => d.category === 'priority');
const counts = point => point.state !== 'unavailable' && (point.dimensions || []).every(d => d.numerator !== null && d.numerator !== undefined);
const sortedSeries = history => history && Array.isArray(history.series) ? [...history.series].sort((a, b) => a.localDate.localeCompare(b.localDate)) : [];
const today = data => data && data.snapshot ? localDate(data.snapshot.calculatedAt, data.snapshot.timeZone) : null;
const dim = (point, id) => point && (point.dimensions || []).find(d => d.id === id);
function streakWith(series, ok, data, liveBlocked) {
  let best = 0, run = 0, prev = null;
  for (const point of series) {
    const good = ok(point);
    run = good ? (prev && previousDate(point.localDate) === prev ? run + 1 : 1) : 0;
    best = Math.max(best, run); prev = good ? point.localDate : null;
  }
  let current = 0;
  const last = series[series.length - 1], now = today(data);
  if (last && !liveBlocked && now && (last.localDate === now || last.localDate === previousDate(now))) {
    for (let i = series.length - 1; i >= 0; i--) {
      const point = series[i];
      if (!ok(point) || (i < series.length - 1 && previousDate(series[i + 1].localDate) !== point.localDate)) break;
      current++;
    }
  }
  return { current, best, liveBlocked };
}
// Streak of consecutive daily summaries (18:00) without priority pendings. A missing day or a
// summary we could not read interrupts it; the live reading can end it but never extend it.
export function streakFromHistory(history, data) {
  const liveBlocked = Boolean(data && (data.incidents || []).some(i => i.severity === 'priority'));
  return streakWith(sortedSeries(history), point => counts(point) && !hasPriority(point), data, liveBlocked);
}
// Same rule per area: an area keeps its streak while its own summaries stay without priority.
export function areaStreaks(history, data) {
  const series = sortedSeries(history);
  return ORDER.map(id => {
    const live = dim(data, id);
    const ok = point => { const d = dim(point, id); return point.state !== 'unavailable' && Boolean(d) && d.numerator !== null && d.numerator !== undefined && d.category !== 'priority'; };
    return { indicatorId: id, ...streakWith(series, ok, data, Boolean(live && live.category === 'priority')) };
  });
}
// Personal references only: the reader is compared with their own summaries, never with others.
export function personalRecords(history, data) {
  const totals = sortedSeries(history).filter(counts).map(p => ({ date: p.localDate, total: p.dimensions.reduce((n, d) => n + d.numerator, 0) }));
  if (!totals.length) return null;
  const lowest = totals.reduce((a, b) => (b.total < a.total || (b.total === a.total && b.date > a.date) ? b : a));
  const known = data && (data.dimensions || []).length && data.dimensions.every(d => d.numerator !== null && d.numerator !== undefined);
  const live = known ? data.dimensions.reduce((n, d) => n + d.numerator, 0) : null;
  return { lowest, live, beatsLowest: live !== null && live < lowest.total, days: totals.length };
}

const sourceOf = (data, d) => d && ((data.quality && data.quality.sources) || []).find(s => s.id === d.sourceId);
// Pendings that become priority within the next 24 hours, per area. Unknown is not zero.
export function rescueSummary(data) {
  const items = ORDER.map(id => dim(data, id)).filter(d => d && Number.isFinite(d.rescueCount) && d.rescueCount > 0).map(d => ({ indicatorId: d.id, count: d.rescueCount }));
  return items.length ? { total: items.reduce((n, i) => n + i.count, 0), items } : null;
}
// An area earns its stamp when the complete reading shows no overdue pendings. "earned" marks
// that the latest daily summary still had pendings in that area.
export function areaStamps(data, history) {
  const series = sortedSeries(history), last = series[series.length - 1];
  return ORDER.map(id => {
    const d = dim(data, id), source = data ? sourceOf(data, d) : null;
    const checked = Boolean(source && source.status === 'fresh' && source.integrity === 'checked');
    const state = !d || d.numerator === null || d.numerator === undefined ? 'unknown' : !d.denominator ? 'empty' : d.numerator === 0 && checked ? 'clear' : d.numerator === 0 ? 'unknown' : 'open';
    const before = dim(last, id);
    const earned = state === 'clear' && Boolean(before) && Number(before.numerator) > 0;
    return { indicatorId: id, state, remaining: d && Number.isFinite(d.numerator) ? d.numerator : null, earned, before: earned ? before.numerator : null, since: earned ? last.localDate : null };
  });
}
// Checklist for the next 24 hours from the planning counts the snapshot already carries.
export function tomorrowChecklist(activity) {
  const p = activity && activity.planning;
  if (!p) return null;
  const confirm = Number.isFinite(p.pendingConfirmationNext24h) ? p.pendingConfirmationNext24h : null, outcome = Number.isFinite(p.inProgressUnresolved) ? p.inProgressUnresolved : null;
  if (confirm === null && outcome === null) return null;
  const items = [
    { key: 'confirm', count: confirm, done: confirm === 0, label: confirm === null ? 'No pudimos revisar las citas por confirmar' : confirm === 0 ? 'Citas de las próximas 24 horas confirmadas' : 'Confirma ' + (confirm === 1 ? '1 cita' : confirm + ' citas') + ' de las próximas 24 horas' },
    { key: 'outcome', count: outcome, done: outcome === 0, label: outcome === null ? 'No pudimos revisar las citas en curso' : outcome === 0 ? 'Citas en curso sin resultados pendientes' : 'Registra cómo quedó ' + (outcome === 1 ? '1 cita en curso o recién terminada' : 'cada una de las ' + outcome + ' citas en curso o recién terminadas') }
  ];
  return { items, ready: items.every(i => i.done), doneCount: items.filter(i => i.done).length };
}
// Recent work, told in positive terms. It gives context; it is not a target.
export function yesterdaySummary(activity) {
  const y = activity && activity.available && activity.yesterday;
  if (!y || !y.counts) return null;
  const parts = [['appointmentsCreated', 'cita agendada', 'citas agendadas'], ['prescriptionsIssued', 'receta emitida', 'recetas emitidas'], ['clinicalHistoriesFinalized', 'historia clínica cerrada', 'historias clínicas cerradas']]
    .filter(([key]) => Number.isFinite(y.counts[key])).map(([key, one, many]) => ({ key, value: y.counts[key], label: y.counts[key] === 1 ? one : many }));
  return parts.length ? { parts, total: parts.reduce((n, i) => n + i.value, 0) } : null;
}
// Setup as a short mission: only necessary items with a known state count.
export function setupMission(preparation) {
  const items = ((preparation && preparation.items) || []).filter(i => i.class === 'necessary' && typeof i.ready === 'boolean');
  if (!items.length) return null;
  const ready = items.filter(i => i.ready).length;
  return { total: items.length, ready, complete: ready === items.length };
}

// "Cierra 5": a short closing session. Priority first, then rescues, then the oldest.
export const SESSION_SIZE = 5;
const rank = i => (i.severity === 'priority' ? 0 : i.rescue ? 1 : 2);
const dueKey = i => (i.timeBasis === 'business_civil_date' ? i.dueDate : i.overdueSince) || null;
export function buildSessionQueue(lists, size = SESSION_SIZE) {
  const items = [];
  for (const list of lists || []) for (const i of (list && list.items) || []) if (i.action) items.push({ recordId: i.recordId, indicatorId: i.indicatorId || list.indicatorId, severity: i.severity, rescue: Boolean(i.rescue), ageDays: i.oldestAgeDays, due: dueKey(i), item: i, done: false, skipped: false });
  items.sort((a, b) => rank(a) - rank(b) || (b.ageDays || 0) - (a.ageDays || 0) || ORDER.indexOf(a.indicatorId) - ORDER.indexOf(b.indicatorId) || String(a.recordId).localeCompare(String(b.recordId)));
  return items.slice(0, size);
}
// A session item counts as closed only when a fresh first page proves it is no longer pending:
// it is absent and either the page is complete or the item would sort before the page's end.
export function reconcileSession(items, listsById) {
  return (items || []).map(entry => {
    const list = listsById && listsById[entry.indicatorId];
    if (entry.done || !list || !Array.isArray(list.items)) return entry;
    const present = list.items.find(i => i.recordId === entry.recordId);
    if (present) return { ...entry, severity: present.severity, rescue: Boolean(present.rescue), item: present };
    const last = list.items[list.items.length - 1];
    const before = !list.nextCursor || (last && entry.due && dueKey(last) && ((entry.severity === 'priority' && last.severity !== 'priority') || (entry.severity === last.severity && entry.due < dueKey(last))));
    return before ? { ...entry, done: true } : entry;
  });
}

export function progressSinceSummary(history, data) {
  const series = sortedSeries(history);
  const last = series[series.length - 1];
  if (!last || !data || !counts(last) || (data.dimensions || []).some(d => d.numerator === null)) return null;
  const before = last.dimensions.reduce((n, d) => n + d.numerator, 0), now = data.dimensions.reduce((n, d) => n + d.numerator, 0);
  return { from: last.localDate, before, now, delta: now - before };
}

export function trendBars(id, history, data, days, name, format = civilDate) {
  const byDate = new Map(((history && history.series) || []).map(p => [p.localDate, p]));
  const bars = days.map(date => {
    const point = byDate.get(date), d = point && (point.dimensions || []).find(x => x.id === id);
    const value = d && d.numerator !== null && d.numerator !== undefined ? d.numerator : null;
    return { date, value, partial: Boolean(point && point.state !== 'valid'), live: false, tone: !d ? 'gap' : d.category === 'priority' ? 'priority' : value ? 'attention' : 'clear', title: format(date) + ': ' + (value === null ? 'sin resumen' : value + ' vencidos' + (point.state !== 'valid' ? ' (datos incompletos)' : '')) };
  });
  const live = data && (data.dimensions || []).find(x => x.id === id);
  const liveValue = live && live.numerator !== null ? live.numerator : null;
  bars.push({ date: 'live', value: liveValue, partial: false, live: true, tone: !live ? 'gap' : live.category === 'priority' ? 'priority' : liveValue ? 'attention' : 'clear', title: 'Ahora: ' + (liveValue === null ? 'sin dato' : liveValue + ' vencidos') });
  const max = Math.max(1, ...bars.map(b => b.value || 0));
  bars.forEach(b => { b.height = b.value === null ? 0 : Math.round(36 * b.value / max); });
  const lastText = liveValue === null ? 'Ahora: sin dato' : 'Ahora: ' + liveValue;
  return { id, bars, lastText, label: name + '. Pendientes vencidos por día en los últimos ' + days.length + ' días. ' + lastText + '.' };
}
