const stories = {
  'PUL-OP01': { title: 'Hay seguimientos que necesitan retomarse.', text: 'Su fecha prevista ya pasó y todavía falta una cita vinculada. Revisa cada caso para decidir el siguiente paso.', action: 'Retomar seguimientos' },
  'PUL-OP02': { title: 'Hay documentos que esperan una firma.', text: 'Algunas solicitudes vencieron sin completarse. Revisa qué falta para continuar.', action: 'Revisar firmas' },
  'PUL-OP03': { title: 'Hay citas que aún necesitan un cierre.', text: 'Ya pasaron, pero falta registrar cómo quedaron. Aclarar su resultado ayuda a ordenar la agenda.', action: 'Revisar cómo quedaron' }
};
export const appointmentOutcomeText = {
  completed: 'La cita quedó registrada como completada.',
  cancelled: 'La cancelación de la cita quedó registrada.',
  no_show: 'La inasistencia quedó registrada.',
  rescheduled: 'La reprogramación de la cita quedó registrada.'
};
export function storyFor(data) {
  if (!data) return { title: 'Estamos reuniendo tu Pulso.', text: 'Enseguida podrás descubrir qué necesita atención.', action: null };
  const incidents = [...data.incidents].sort((a,b) => Number(b.severity === 'priority') - Number(a.severity === 'priority') || b.oldestAgeDays - a.oldestAgeDays);
  const first = incidents[0];
  if (first) return { ...stories[first.indicatorId], indicatorId: first.indicatorId, severity: first.severity, action: first.action ? stories[first.indicatorId].action : null, priority: first.severity === 'priority' };
  if (data.preparation.state === 'blocked') return { title: 'Falta completar parte de la configuración.', text: 'Revisa abajo qué herramienta necesita un ajuste y cómo completarlo.', action: null };
  if (data.quality.evaluated !== 3) return { title: 'Nos falta una parte de la historia.', text: 'Todavía no podemos confirmar todos los pendientes. Conservamos las señales conocidas mientras comprobamos el resto.', action: null };
  return data.operational.category === 'no_obligations'
    ? { title: 'Tu Pulso empieza con lo que registras.', text: 'Cuando haya seguimientos, firmas o citas por retomar, sus señales aparecerán aquí.', action: null }
    : { title: 'Lo revisado está al día.', text: 'Los seguimientos, las firmas y las citas evaluados no tienen pendientes vencidos. Puedes continuar con tu día.', action: null };
}

export function refreshSummary(data) {
  const labels = { 'PUL-OP01': ['seguimiento', 'seguimientos'], 'PUL-OP02': ['solicitud de firma', 'solicitudes de firma'], 'PUL-OP03': ['cita pasada', 'citas pasadas'] };
  const pending = data.dimensions.filter(d => d.numerator > 0).map(d => `${d.numerator} ${labels[d.id][d.numerator === 1 ? 0 : 1]}`);
  const list = pending.length < 2 ? pending[0] : pending.slice(0,-1).join(', ') + ' y ' + pending[pending.length-1];
  const incomplete = data.quality.evaluated !== 3;
  const result = pending.length ? `Pendientes por revisar: ${list}.` : incomplete ? 'No encontramos pendientes en los datos que pudimos revisar.' : data.operational.category === 'no_obligations' ? 'Aún no hay registros con los que podamos evaluar pendientes.' : 'No encontramos seguimientos, firmas ni citas pasadas con el plazo vencido.';
  return `Pulso actualizado. ${result} ${incomplete ? 'Todavía falta información para comprobar todas las áreas. ' : ''}Las señales reflejan esta revisión.`;
}
