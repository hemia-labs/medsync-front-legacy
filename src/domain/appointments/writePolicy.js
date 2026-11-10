export const CANCELLATION_REASONS = [
  { value: 'patient_cancelled', text: 'El paciente canceló' },
  { value: 'doctor_unavailable', text: 'Doctor no disponible' },
  { value: 'entry_error', text: 'Error de captura' },
  { value: 'reschedule_pending', text: 'El paciente solicita reagendar sin fecha' },
  { value: 'other', text: 'Otro' }
];

export function appointmentTemporalError(a, current, now) {
  if (!a || !now) return '';
  const future = a.date > now.date || (a.date === now.date && a.startTime > now.time);
  const changedStart = !current || ['date', 'startTime', 'endTime'].some(key => a[key] !== current[key]);
  if (future && ((!current && !['pending_confirmation', 'confirmed'].includes(a.status))
    || (['completed', 'no_show'].includes(a.status) && (changedStart || a.status !== current.status)))) {
    return 'La cita aún no inicia en la zona del consultorio. Conserva Pendiente o Confirmada.';
  }
  return '';
}

export function cancellationImpactMessage(impact) {
  if (!impact || impact.state === 'none') return 'La cita se conservará en el historial como Cancelada.';
  if (impact.state === 'inactive') return 'La cancelación no reabrirá el seguimiento inactivo ni el expediente archivado.';
  if (impact.state === 'unknown') return 'No se pudo determinar con certeza la cobertura del seguimiento. Revisa sus citas después de cancelar.';
  if (impact.state === 'covered') return 'El seguimiento conserva otra cita que lo cubre.';
  if (impact.state === 'uncovered_overdue') return impact.losesCoverage
    ? 'El seguimiento quedará sin una cita que lo cubra y volverá a pendiente vencido.'
    : 'El seguimiento seguirá sin cobertura y pendiente vencido.';
  return 'El seguimiento quedará sin una cita que lo cubra; su fecha sugerida aún no ha vencido.';
}
