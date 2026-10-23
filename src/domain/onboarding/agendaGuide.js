export const GUIDE_VERSION = 1;
export const agendaSteps = Object.freeze([
  {id:'doctor', target:'doctor', title:'¿Qué agenda vamos a preparar?', text:'Elige al doctor que atenderá estas citas. Cada profesional tiene sus propios horarios.'},
  {id:'timezone', target:'timezone', title:'Confirma la zona horaria del consultorio', text:'Comprueba la zona que aparece en esta pantalla; el valor inicial puede no corresponder a tu ubicación. Si necesitas cambiarla, revisa el estado y, cuando se solicite, el municipio. Confirma solo cuando coincida: se usa en todas las agendas.'},
  {id:'duration', target:'duration', title:'¿Cuánto suele durar una consulta?', text:'Esta duración organiza los espacios de tu agenda. Las citas que ya guardaste conservan su duración.'},
  {id:'hours', target:'hours', title:'¿Qué días atiendes?', text:'Elige un día y ajusta los horarios en los que normalmente recibes pacientes. Aplicar horario cambia la captura; después pulsa Guardar cambios en la agenda.'},
  {id:'closures', target:'closures', title:'También hay tiempo para descansar', text:'Puedes reservar vacaciones, días libres o unas horas sin consultas. Es opcional: puedes hacerlo después. Un cierre por fecha es distinto de desactivar el consultorio.'},
  {id:'activation', target:'activation', title:'Cuando estés listo, activa tu agenda', text:'Revisa Agenda activa y guarda los cambios si quieres empezar a reservar. Si la dejas inactiva, puedes seguir preparando otras tareas.'},
  {id:'save', target:'save', title:'Guarda tus horarios', text:'Usa Guardar cambios en esta pantalla. Continuar la explicación no guarda ni activa nada. Puedes conservar los valores que ya te sirven.'},
  {id:'verify', target:'save', title:'Revisemos lo que quedó guardado', text:'Comprobamos la configuración guardada para esta agenda. Cada cita seguirá validando su fecha y horario.'}
]);
export const stepById = id => agendaSteps.find(step => step.id === id) || agendaSteps[0];
export function stepsFor(subject) {
  if(subject!=='business')return agendaSteps;
  return agendaSteps.filter(step=>!['doctor','duration','hours'].includes(step.id)).map(step=>step.id==='activation'
    ? {...step,title:'Revisa la disponibilidad del consultorio',text:'Consultorio disponible permite nuevas citas en las agendas activas. Si lo desactivas, afecta a todos los doctores. Para vacaciones o un día libre, usa los cierres por fecha.'}
    : step.id==='save' ? {...step,title:'Guarda los ajustes del consultorio',text:'Usa Guardar cambios en esta pantalla. La disponibilidad general y los cierres son compartidos. Los horarios de cada doctor se preparan en su propia agenda.'} : step);
}
export function canContinueExplanation(editor, step) {
  if (!editor || editor.loading || editor.saving || editor.pendingModalCapture) return false;
  return step.id === 'doctor' ? !!editor.subject && !!editor.loaded : !!editor.loaded; // Never require a persisted result to reach its Save control.
}
export function agendaPresentation(agenda, error = '') {
  if (error || !agenda) return {label:'No pudimos comprobarla', text:error || 'Revisa el estado guardado para continuar.', available:false};
  if (!agenda.requirements.profile) return {label:'Perfil pendiente', text:'Necesitamos un perfil profesional activo. La firma no es un requisito para preparar horarios.'};
  if (agenda.configurationState === 'absent') return {label:'Sin preparar', text:'Todavía no hay horarios guardados para esta agenda.'};
  if (agenda.configurationState === 'incomplete') {
    const issue=(agenda.issues || [])[0];
    const clinicOnly=issue && issue.field==='timezone' && !agenda.capabilities.configureClinic;
    return {label:'Configuración pendiente',text:issue ? issue.message + (clinicOnly && issue.code!=='BUSINESS_CONFIG_ABSENT' ? ' Pide al administrador que la revise.' : '') : 'Revisa los datos guardados de esta agenda.',target:issue && !clinicOnly ? issue.field : null};
  }
  if (!agenda.activation.individual) return {label:'Guardada · Inactiva', text:'Tus horarios están guardados. Puedes activar la agenda cuando decidas utilizarla.'};
  if (!agenda.activation.business) return {label:'Consultorio desactivado para nuevas citas', text:'Revisa Consultorio disponible o pide al administrador que lo revise. Quitar un cierre por fecha no resuelve esta desactivación.'};
  if (!agenda.hasUsualSlot) return {label:'Sin espacio para la duración habitual', text:'Revisa la duración habitual o amplía un horario. Las citas existentes conservan su duración.'};
  if (!agenda.capabilities.book) return {label:'Configuración guardada', text:'La agenda está preparada. El acceso a Citas depende de tus permisos.'};
  return {label:'Agenda disponible', text:'Ya puedes organizar citas con los horarios guardados. Puedes seguir preparando tu consultorio.', available:true};
}
export function nextPreparation(status, allowedSections) {
  const allowed = new Set(allowedSections);
  const otherDoctor=status && status.agenda && status.agenda.subject && status.agenda.subjectIsOwn===false;
  return ((status && status.steps) || []).find(step => !step.ready && step.id !== 'agenda' && !(otherDoctor && ['profile','authorizations','prescriptions'].includes(step.id)) && step.action && allowed.has(String(step.action.path).split('section=')[1])) || null;
}
export function visualKey(context, subject = '') {
  return `hemia:onboarding:v${GUIDE_VERSION}:${encodeURIComponent(context.business)}:${encodeURIComponent(context.user)}:agenda:${encodeURIComponent(subject || 'own')}`;
}
export function visualRecord(value = {}) {
  const states = ['paused','deferred','completed'];
  return {version:GUIDE_VERSION, state:states.includes(value.state) ? value.state : 'paused', step:stepById(value.step).id,
    seen:agendaSteps.filter(step => Array.isArray(value.seen) && value.seen.includes(step.id)).map(step => step.id), updatedAt:Date.now()};
}
export function readVisual(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return null;
  if (raw.length > 4096) return null;
  const value = JSON.parse(raw);
  if (!value || value.version !== GUIDE_VERSION || !['paused','deferred','completed'].includes(value.state)) return null;
  return visualRecord(value);
}
