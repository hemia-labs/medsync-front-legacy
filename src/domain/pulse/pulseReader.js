const VERSION = '1.1-p1-draft';
export const INDICATORS = ['PUL-OP01', 'PUL-OP02', 'PUL-OP03'];
export const names = { 'PUL-OP01': 'Seguimientos', 'PUL-OP02': 'Firmas', 'PUL-OP03': 'Agenda' };
export const categories = { clear: 'Todo al día en lo que pudimos revisar', no_obligations: 'Aún no hay pendientes que podamos evaluar', attention: 'Hay asuntos que necesitan retomarse', priority: 'Hay pendientes que conviene atender primero', not_evaluable: 'Nos faltan datos para conocer el estado' };
export function pulseContext(auth) {
  const user = auth.user || {}, business = (auth.business || {}).id_business || user.id_business;
  return { business: String(business || ''), key: JSON.stringify([business, user.id_login, user.id_session, auth.role, auth.accessRevision, [...(auth.permissions || [])].sort()]) };
}
export function acceptable(data, context, previous) {
  if(!data || !data.context || !data.snapshot || !data.operational || !data.preparation || !data.preparation.quality || !Array.isArray(data.preparation.items) || !data.activity || !data.quality || !Array.isArray(data.quality.sources) || !Array.isArray(data.incidents) || !Array.isArray(data.lastKnownUnresolved) || !Number.isFinite(Date.parse(data.snapshot.validUntil))) return false;
  if (!data || data.contractVersion !== VERSION || data.rulesVersion !== 'pulse-r0.2-p1' || data.catalogVersion !== 'pulse-core-0.2'
    || data.context.businessId !== context.business || data.context.scope !== 'business' || !Array.isArray(data.dimensions)
    || JSON.stringify(data.dimensions.map(d => d.id)) !== JSON.stringify(INDICATORS) || !data.visual
    || !Number.isFinite(Date.parse(data.snapshot.calculatedAt)) || !Number.isFinite(Date.parse(data.snapshot.serverNow))) return false;
  if (!previous) return true;
  return Date.parse(data.snapshot.calculatedAt) >= Date.parse(previous.snapshot.calculatedAt)
    && (data.snapshot.serverEpoch !== previous.snapshot.serverEpoch || data.snapshot.sequence >= previous.snapshot.sequence);
}
export function actionTarget(action) {
  const t = action && action.target, q = t && t.query || {};
  if (!t) return null;
  if (t.routeName === 'admin' && ['agenda', 'prescriptions', 'doctor-identity'].includes(q.section)) return { name: 'admin', query: { section: q.section, returnKey: 'pulse' } };
  if (t.routeName === 'ShowPx' && t.params && typeof t.params.id === 'string' && ['PUL-OP01', 'PUL-OP02'].includes(q.indicatorId)) return { name: 'ShowPx', params: { id: t.params.id }, query: { tab: q.indicatorId === 'PUL-OP01' ? 'monitoring' : 'documents', recordId: q.recordId, ...(q.documentId ? { documentId: q.documentId } : {}), returnKey: 'pulse' } };
  if (t.routeName === 'Citas' && /^\d{4}-\d{2}-\d{2}$/.test(q.date || '')) return { name: 'Citas', query: { date: q.date, doctorProfileId: q.doctorProfileId || '', recordId: q.recordId, returnKey: 'pulse' } };
  return null;
}
export function serverTime(clock, monotonic) { return clock ? clock.server + Math.max(0, monotonic - clock.received) : null; }
export function createReader({ service, state, commit, context, now = () => performance.now() }) {
  let active = true, generation = 0, historySequence = 0, listSequence = 0, controller = new AbortController(), pending = null;
  const token = () => ({ context: context().key, generation });
  const current = t => active && t.generation === generation && t.context === context().key && t.context === state().context;
  function failure(t, block, response) {
    if (!current(t)) return;
    if ([401, 403].includes(response && response.status)) { generation++; controller.abort(); controller = new AbortController(); commit('denied'); return; }
    commit('error', { block, message: response && response.message || 'No pudimos consultar esta información. Puedes reintentar.' });
  }
  return {
    activate() { active = true; controller = new AbortController(); },
    stop() { active = false; generation++; controller.abort(); pending = null; },
    async snapshot(apply = false, force = false) {
      const entryToken = token(); if(!current(entryToken) || state().denied) return;
      if (pending) { if (!apply) return pending; await pending; if(!current(entryToken))return; if (state().candidate && !state().candidate.snapshot.refreshPending) { commit('applied', state().candidate); return; } }
      const t = token();
      const request = (async () => {
        try {
          const r = await service.snapshot(force, controller.signal); if (!current(t)) return;
          if (!r.success || r.status !== 200) { failure(t, 'snapshot', r); return; }
          const data = r.data, previous = state().candidate || state().applied;
          if (!acceptable(data, context(), previous)) { failure(t, 'snapshot', { message: 'Este resumen ya no corresponde a tu sesión. Actualiza para consultar el consultorio actual.' }); return; }
          commit('clock', { server: Date.parse(data.snapshot.serverNow), received: now() });
          if (state().savedAt && (Date.parse(data.snapshot.calculatedAt) < state().savedAt || data.snapshot.refreshPending)) { commit('error', { block: 'snapshot', message: 'Tu cambio se guardó; esta lectura todavía no confirma su actualización. Vuelve a actualizar en unos segundos.' }); return; }
          commit(!state().applied || apply ? 'applied' : 'candidate', data);
        } catch (_) { failure(t, 'snapshot'); }
      })();
      pending = request; try { await request; } finally { if (pending === request) pending = null; }
    },
    async verifyAppointment() {
      const t = token(), saved = state().pendingAppointment;
      if (!saved || !current(t) || state().denied) return;
      const matches = () => current(t) && state().pendingAppointment === saved;
      const unverified = message => { if (matches()) commit('appointmentOutcome', { kind: 'unverified', message }); };
      await this.snapshot(true, true);
      if (!matches()) return;
      const applied = state().applied;
      if (state().errors.snapshot || !applied || applied.snapshot.refreshPending || Date.parse(applied.snapshot.calculatedAt) < saved.savedAt) {
        unverified('Tu cambio se guardó. Aún estamos esperando una lectura que lo incluya.'); return;
      }
      try {
        const response = await service.appointmentResult(saved.recordId, controller.signal);
        if (!matches()) return;
        if ([401,403].includes(response && response.status)) { failure(t, 'snapshot', response); return; }
        const result = response && response.data;
        if (!response || !response.success || response.status !== 200 || !result || result.contractVersion !== VERSION || !result.context || result.context.businessId !== context().business || result.context.authorizationRevision !== applied.context.authorizationRevision || result.recordId !== saved.recordId || !Number.isFinite(Date.parse(result.observedAt)) || Date.parse(result.observedAt) < Math.max(saved.savedAt, Date.parse(applied.snapshot.calculatedAt))) {
          unverified('Tu cambio se guardó, pero no pudimos comprobar el resultado de esta cita.'); return;
        }
        if (result.status !== saved.status || !['completed','cancelled','no_show','rescheduled'].includes(result.status)) {
          unverified(result.status === 'unavailable' ? 'La cita ya no está disponible para comprobar su resultado. Puedes revisarlo desde Agenda.' : 'La cita volvió a cambiar. Revisa su estado actual en Agenda.'); return;
        }
        commit('appointmentOutcome', { kind: 'verified', status: result.status, observedAt: result.observedAt });
      } catch (_) { unverified('Tu cambio se guardó, pero no pudimos comprobar el resultado de esta cita.'); }
    },
    async history() { const t = token(), sequence = ++historySequence; try { const r = await service.history(controller.signal); if (!current(t) || sequence !== historySequence) return; if (!r.success || !r.data || r.data.contractVersion !== VERSION) failure(t, 'history', r); else commit('history', r.data); } catch (_) { if(sequence === historySequence)failure(t, 'history'); } },
    async incidents(id, cursor) { const t = token(), sequence = ++listSequence; try { const r = await service.incidents(id, cursor, controller.signal); if (!current(t) || sequence !== listSequence) return null; if (!r.success || !r.data || r.data.contractVersion !== VERSION || r.data.indicatorId !== id) { failure(t, 'list', r); return null; } return r.data; } catch (_) { if(sequence === listSequence)failure(t, 'list'); return null; } }
  };
}
