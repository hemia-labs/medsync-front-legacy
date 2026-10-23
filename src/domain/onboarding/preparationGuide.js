// Explanation order is not an operational gate. Editors alone validate and save.
export const preparationBranches = Object.freeze({
  identity: { title:'Dale identidad a tu consultorio', steps:[
    ['identity','Revisa cómo aparece tu consultorio','Nombre, teléfono y domicilio ayudan a identificar tu consultorio. Usa Editar datos si necesitas corregirlos.'],
    ['save','Conserva tus datos','Usa Guardar cambios en esta pantalla. Si ya están correctos, puedes conservarlos sin volver a guardar.']
  ], requirement:'identity' },
  'doctor-identity': { title:'Tu identidad profesional', steps:[
    ['identity','Empecemos por tu nombre','Escribe aquí el nombre con el que atiendes a tus pacientes. Así identificaremos tu perfil y tu agenda. Si ya está correcto, puedes continuar.'],
    ['license','Ahora, tu cédula profesional','Escribe tu cédula en este campo. Se utilizará en tus documentos profesionales. Puedes completar el perfil por partes; avanzar en la guía no guarda los cambios.'],
    ['signature-capture','Abre la captura de tu firma','Pulsa Capturar firma y dibújala en el espacio que se abrirá. Si ya tienes una firma, puedes conservarla o usar Cambiar firma. También puedes dejarla para después.'],
    ['signature-apply','Aplica la firma que dibujaste','Cuando termines de dibujar, pulsa Aplicar. La firma pasará al perfil, pero todavía no estará guardada. Si quieres empezar de nuevo, usa Limpiar.'],
    ['save','Guarda tu perfil','Pulsa Guardar perfil para conservar tus datos. La autorización para emitir recetas o firmar documentos se revisa por separado.']
  ], requirement:'profile' },
  users: { title:'Prepara a tu equipo, si lo necesitas', steps:[
    ['users','¿Trabajas con alguien más?','Agregar personal es opcional. Usa el listado para agregar o editar un usuario. Un asistente no necesita un perfil clínico para ayudarte.'],
    ['access','Revisa quién puede hacer cada tarea','El puesto determina los accesos. Al editar un doctor puedes revisar sus autorizaciones; su identidad y firma las completa desde su sesión. Guardar contacto y autorizaciones son operaciones distintas.'],
    ['save','Comprueba el resultado','Después de Guardar usuario, comprueba el listado. Si hubo un error de conexión, revisa si ya existe antes de volver a crearlo. Puedes trabajar sin asistente por ahora.']
  ] },
  documents: { title:'Prepara tus documentos y consentimientos', steps:[
    ['documents','Revisa los formatos del consultorio','Elige un formato existente o crea uno para tus necesidades. Preparar una plantilla no crea un documento de paciente ni recoge su consentimiento.'],
    ['content','Revisa el contenido y las firmas','En el editor, revisa nombre, tipo, contenido, datos automáticos y firmas requeridas. Los ejemplos no sustituyen la revisión del texto que utilizará tu consultorio.'],
    ['save','Guarda y revisa si está activo','Usa Guardar plantilla. Guardada pero inactiva significa que todavía no está disponible para nuevos documentos. Si lo dejas pendiente, los documentos que necesitan ese formato seguirán pendientes.']
  ], requirement:'consent' },
  'clinical-history-template': { title:'Conoce tu historia clínica inicial', steps:[
    ['template','Así empezarás una historia clínica','Revisa el formato y su vista previa. Cada nueva historia conserva la versión con la que se creó; cambiar la plantilla no reescribe las historias anteriores.'],
    ['customize','Adáptala solo si lo necesitas','Si el formato inicial ya te sirve, continúa con él. Personalizar preguntas y secciones es opcional y depende de tus accesos y plan. Aplicar al borrador no guarda una versión.'],
    ['save','Puedes continuar con este formato','No necesitas personalizar ni guardar de nuevo un formato disponible. Si hiciste cambios, usa Guardar nueva versión. Ver esta explicación no habilita ni bloquea actos clínicos.']
  ] },
  prescriptions: { title:'Prepara las recetas de este doctor', steps:[
    ['doctor','Elige el doctor','Cada doctor tiene su formato. Preparar el formato de otro profesional no requiere que tengas una agenda propia ni que captures su firma.'],
    ['contact','Revisa los datos de contacto','Revisa domicilio y teléfono. Usa Guardar recetas para conservar el formato de este doctor.'],
    ['preview','Comprueba cómo se verá','Revisa la vista previa y las imágenes opcionales. La identidad, cédula y firma vienen del perfil del profesional.'],
    ['save','Guarda el formato del doctor','Usa Guardar recetas. Si ya hay un formato propio válido, no necesitas guardarlo otra vez. Emitir también requiere autorización, firma y los datos de cada receta. Puedes dejar esta función para después.']
  ] }
});
// Each editor stage has its own steps. Opening an editor never replays a list instruction.
export function preparationDefinition(branch, { stage = '', goal = '', actionLabel = 'Guardar plantilla', signatureOpen = false, signatureHasInk = false } = {}) {
  const base = preparationBranches[branch];
  if (!base) return null;
  if (branch === 'identity' && stage !== 'edit') return { ...base, steps:[base.steps[0]] };
  if (branch === 'doctor-identity' && goal === 'agenda') return { ...base, title:'Prepara tu perfil para agendar', steps:[
    ['identity','Primero, tu nombre profesional','Escribe el nombre con el que atiendes. Con esto identificaremos tu agenda. La cédula y la firma podrás completarlas al preparar recetas o documentos.'],
    ['save','Guarda tu nombre y continúa','Pulsa Guardar perfil. Cuando confirmemos el perfil activo, podrás continuar con tus horarios.']
  ] };
  if (branch === 'doctor-identity') return { ...base, steps:base.steps.map(step => step[0] === 'signature-capture' && signatureOpen
    ? ['signature-capture','Dibuja tu firma','Dibuja dentro del recuadro. Cuando termines, pulsa Siguiente: Aplicar para localizar el botón, o pulsa Aplicar directamente. Cancelar firma descarta este dibujo.']
    : step[0] === 'signature-apply' && !signatureHasInk ? ['signature-apply','Dibuja antes de aplicar','El recuadro está vacío. Dibuja tu firma; después pulsa Aplicar y guarda el perfil.'] : step) };
  if (branch === 'identity' && stage === 'edit') return { ...base, steps:[
    ['identity','Escribe el nombre del consultorio','Este nombre aparecerá en los datos del consultorio. Revisa que tus pacientes puedan reconocerlo.'],
    ['phone','Revisa el teléfono de contacto','Escribe el teléfono del consultorio. Puedes pegarlo con +52; revisaremos los 10 dígitos nacionales.'],
    ['address','Completa el domicilio','Indica calle, número, colonia y localidad para identificar dónde atiendes.'],
    ['save','Guarda los datos del consultorio','Pulsa Guardar cambios. Cancelar descarta esta edición y vuelve a los datos guardados.']
  ] };
  if (branch === 'users') {
    if (goal === 'authorizations') return { ...base, requirement:'authorizations', title:'Autorizaciones profesionales', steps:stage === 'edit' ? [
      ['issuer','Revisa la autorización para recetas','En el perfil del doctor, Autorizado como doctor emisor permite emitir recetas cuando también cumple los requisitos de identidad y firma. Marca la opción solo si corresponde.'],
      ['signer','Revisa la autorización para firmar','Autorizado como firmante profesional permite firmar documentos. Cada profesional completa su identidad y firma desde su cuenta.'],
      ['save','Guarda las autorizaciones','Pulsa Guardar cambios. Revisa el resultado del contacto y del perfil profesional: si alguno falla, la pantalla indica cuál requiere atención.']
    ] : [['users','Revisa tus autorizaciones profesionales','Este pendiente corresponde a tu cuenta. Pulsa Revisar mis autorizaciones para abrirla; si ese acceso no aparece, busca tu usuario y pulsa Editar. Para otro profesional, usa Editar en su fila. No hace falta agregar personal ni cambiar de puesto.']] };
    if (stage === 'edit' || stage === 'create') return { ...base, title:stage === 'edit' ? 'Revisa este usuario' : 'Agrega a tu equipo', steps:[
      ['users','Escribe el nombre de esta persona','Completa Nombre para identificar a quien usará esta cuenta. Los campos marcados con * son obligatorios.'],
      ['phone','Completa su teléfono','Escribe un teléfono de 10 dígitos en Teléfono.'],
      ['email','Completa su correo','Escribe la dirección de correo de esta persona en Correo y revisa que esté correcta.'],
      ['access','Revisa su puesto y accesos','El puesto determina las tareas que esta persona puede realizar. Elige el que corresponda a su trabajo.'],
      ...(stage === 'create' ? [['password','Define la contraseña inicial','Completa Contraseña inicial para que esta persona pueda entrar con su cuenta. Este campo también es obligatorio.']] : []),
      ['save',stage === 'edit' ? 'Guarda los cambios del usuario' : 'Guarda el nuevo usuario',stage === 'edit' ? 'Pulsa Guardar cambios y revisa la confirmación. Si contacto y perfil tienen resultados distintos, la pantalla te indicará qué falta.' : 'Pulsa Guardar usuario. Si hay un error de conexión, revisa el listado antes de volver a crearlo.']
    ] };
    return { ...base, steps:[base.steps[0]] };
  }
  if (branch === 'documents') return { ...base, title:goal === 'consent' ? 'Prepara el consentimiento de datos sensibles' : base.title, steps:stage === 'edit' ? [
    ['documents','Ponle un nombre al formato','Usa un nombre que permita encontrar este formato en el listado. Esto prepara una plantilla; no crea un documento de paciente.'],
    ['type','Revisa el tipo de documento',goal === 'consent' ? 'Elige Consentimiento de datos personales sensibles. Revisa el texto que utilizará tu consultorio antes de activarlo.' : 'Elige el tipo que corresponda al uso de este formato.'],
    ['content','Revisa el contenido','Edita el texto y revisa los datos automáticos. Los ejemplos necesitan revisión antes de usarlos con pacientes.'],
    ['signatures','Revisa quién debe firmar','Selecciona las firmas requeridas para este documento. Preparar el formato no recoge ninguna firma.'],
    ['active','Comprueba su disponibilidad','Plantilla activa permite usar el formato en nuevos documentos. Déjala inactiva si aún necesita revisión.'],
    ['save','Guarda el formato',`Pulsa ${actionLabel} y revisa el resultado. Guardada pero inactiva significa que todavía no está disponible para nuevos documentos.`]
  ] : [['documents',goal === 'consent' ? 'Prepara el consentimiento de datos sensibles' : base.steps[0][1],goal === 'consent' ? 'Pulsa Crear formato o edita un consentimiento existente. Revisaremos tipo, contenido, firmas y activación antes de guardar.' : base.steps[0][2]]] };
  if (branch === 'prescriptions') return { ...base, steps:[base.steps[0],
    ['contact','Revisa el teléfono de la receta','Escribe un teléfono de contacto de 10 a 15 dígitos. Puedes usar +, espacios, paréntesis o guiones.'],
    ['address','Revisa el domicilio de la receta','Completa el domicilio del consultorio. Estos datos se guardan en el formato de este doctor.'],
    base.steps[2],base.steps[3]] };
  return base;
}
// Labels name the editor's registered control. They never imply that moving saves data.
export function preparationControlLabel(branch, id, {stage = '', actionLabel = '', signatureOpen = false, signatureCaptureLabel = 'Capturar firma'} = {}) {
  const labels = {
    identity:{identity:stage === 'edit' ? 'Nombre comercial' : 'Editar datos',phone:'Teléfono del consultorio',address:'Domicilio',save:'Guardar cambios'},
    'doctor-identity':{identity:'Nombre profesional',license:'Cédula profesional','signature-capture':signatureOpen ? 'Recuadro de firma' : signatureCaptureLabel,'signature-apply':signatureOpen ? 'Aplicar' : signatureCaptureLabel,save:actionLabel || 'Guardar perfil'},
    users:{users:stage ? 'Nombre' : 'Buscar usuarios',phone:'Teléfono',email:'Correo',access:'Puesto',password:'Contraseña inicial',issuer:'Autorizado como doctor emisor',signer:'Autorizado como firmante profesional',save:stage === 'create' ? 'Guardar usuario' : 'Guardar cambios'},
    documents:{documents:stage === 'edit' ? 'Nombre del formato' : 'Crear formato',type:'Tipo de documento',content:'Contenido',signatures:'Firmas requeridas',active:'Plantilla activa',save:actionLabel || 'Guardar plantilla'},
    prescriptions:{doctor:'Configuración de recetas del doctor',contact:'Teléfono de contacto',address:'Domicilio completo del consultorio',preview:'Vista previa',save:'Guardar recetas'},
    'clinical-history-template':{template:'Plantilla actual',customize:'Personalizar plantilla',save:'Guardar nueva versión'}
  };
  return (labels[branch] || {})[id] || '';
}
export function preparationPath(step) {
  if (!step || !step.action) return '';
  const goal = step.id === 'authorizations' ? 'authorizations' : step.id === 'consent' ? 'consent' : step.id === 'agenda' && step.action.path.includes('doctor-identity') ? 'agenda' : '';
  return step.action.path + '&guide=1&resume=1' + (goal ? '&goal=' + goal : '');
}
export function branchKey(context, branch, subject) {
  return `hemia:onboarding:v1:${encodeURIComponent(context.business)}:${encodeURIComponent(context.user)}:${branch}:${encodeURIComponent(subject || 'shared')}`;
}
export function branchRecord(branch, value, definition=preparationBranches[branch]) {
  if(!definition || !value || value.version!==1) return null;
  return {version:1,step:Math.max(0,Math.min(definition.steps.length-1,Number.isInteger(value.step)?value.step:0)),state:['active','deferred','completed'].includes(value.state)?value.state:'paused',updatedAt:Number(value.updatedAt)||0};
}
