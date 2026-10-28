// Only confirmed writes arm verification. Retain only the selected appointment ID/status in route memory, never a body.
const writers = /^(?:appointment\/(?:save|reschedule|delete|[^/]+\/link-patient|config\/(?:save|timezone))|tracing\/(?:save|update|cancel|delete)|document\/(?:create|sign|refusal|cancel|signature-request\/(?:create|email|revoke))|prescription\/(?:config\/save|save|issue|cancel|draft)|px\/(?:save|update|administrative|restore|delete|force-delete)|user\/(?:professional-profile|update)\/[^/]+|config\/signatureconten\/(?:save|update)|treatment\/plan\/.+|clinical-history\/.+)$/;
export function notifyPulseWrite(store, method, endpoint, response) {
  const state = store && store.state && store.state.CORE && store.state.CORE.PULSE;
  if (!state || !state.applied || !state.returnTarget || !['post','put','patch','delete'].includes(method) || !response || !response.data || response.status !== 200 || response.data.status !== 200 || !writers.test(endpoint.toLowerCase().replace(/^api\//,'').split('?')[0])) return;
  const clock = state.clock, estimate = clock ? clock.server + Math.max(0,performance.now() - clock.received) : null;
  const date = Date.parse(response.headers && response.headers.date);
  const savedAt = Number.isFinite(date) ? date : estimate;
  if (savedAt !== null) {
    const confirmedAt = Math.max(savedAt,Date.parse(state.applied.snapshot.calculatedAt) + 1);
    store.commit('CORE/PULSE/saved',confirmedAt);
    const rows = response.data.data, selected = state.returnTarget.appointmentId;
    const record = selected && /^(?:api\/)?appointment\/save$/i.test(endpoint) && Array.isArray(rows) && rows.find(row => row && String(row.id) === selected);
    if (selected && /^(?:api\/)?appointment\/reschedule$/i.test(endpoint) && Array.isArray(rows) && rows.some(row => row && String(row.rescheduledFromAppointmentId) === selected)) {
      store.commit('CORE/PULSE/appointmentSaved',{ recordId: selected, status: 'rescheduled', savedAt: confirmedAt });
    }
    if (record && ['completed','cancelled','no_show','rescheduled'].includes(record.status)) {
      store.commit('CORE/PULSE/appointmentSaved',{ recordId: selected, status: record.status, savedAt: confirmedAt });
    }
  }
}
