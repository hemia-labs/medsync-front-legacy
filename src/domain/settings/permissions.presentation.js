// Presentation only: codes, grants, dependencies and plan checks remain server-owned.
const COPY = {
  dashboard: ['Abrir el Dashboard', 'Entrar al Dashboard. Los indicadores que puede ver se autorizan por separado.'],
  'dashboard.operations': ['Ver indicadores de citas y actividad', 'Consultar cifras de citas y actividad administrativa, sin abrir información clínica.'],
  'dashboard.clinical': ['Ver indicadores clínicos', 'Consultar cifras de historias, recetas y tratamientos. No permite leer el expediente.'],
  'dashboard.financial': ['Ver indicadores económicos', 'Consultar importes estimados y estadísticas económicas del consultorio.'],
  'dashboard.scope.all': ['Ver indicadores de todo el consultorio', 'Ampliar a todo el consultorio los tipos de indicadores ya autorizados. No activa otros indicadores.'],
  'px.new': ['Registrar pacientes', 'Crear la ficha de un paciente nuevo.'],
  'px.all': ['Buscar pacientes y abrir su expediente', 'Encontrar al paciente y entrar a su expediente. Cada apartado tiene sus propios accesos.'],
  'px.dates': ['Consultar y gestionar citas', 'Entrar a la agenda y trabajar con las citas del paciente.'],
  'px.tab.history': ['Abrir la historia clínica', 'Entrar al apartado de historia clínica. Consultar, capturar y finalizar se autorizan por separado.'],
  'px.tab.odontogram': ['Acceder al odontograma', 'Entrar al odontograma del paciente.'],
  'px.tab.photos': ['Ver fotografías del paciente', 'Entrar al apartado de fotografías del expediente.'],
  'px.tab.monitoring': ['Consultar seguimientos', 'Ver los seguimientos del paciente. Registrar, corregir y anular requieren sus propios accesos.'],
  'px.tab.treatment': ['Abrir los tratamientos del paciente', 'Entrar al apartado de tratamientos. Las acciones y los costos se autorizan por separado.'],
  'px.photos.manager': ['Administrar fotografías', 'Usar las herramientas de gestión de fotografías del paciente.'],
  'px.radiography': ['Acceder a radiografías', 'Entrar al apartado de radiografías del paciente.'],
  'px.tab.prescriptions': ['Abrir las recetas del paciente', 'Entrar al apartado de recetas del expediente. Las acciones sobre recetas se autorizan por separado.'],
  'admin.users': ['Administrar al equipo y sus accesos', 'Gestionar las cuentas del personal, sus puestos y los accesos de cada puesto.'],
  'admin.config': ['Configurar el consultorio', 'Cambiar la configuración general del consultorio.'],
  'tracing.create': ['Registrar seguimientos', 'Añadir un seguimiento clínico del paciente.'],
  'tracing.correct': ['Corregir seguimientos', 'Registrar una corrección con su motivo, conservando las versiones anteriores.'],
  'tracing.cancel': ['Anular seguimientos', 'Anular un seguimiento con su motivo, sin borrar el contenido.'],
  'clinical_history.intake': ['Capturar el motivo de consulta en recepción', 'Ver y registrar solo el motivo y lo que relata el paciente en el borrador. No permite ver el resto de la historia, diagnosticar, finalizar ni firmar.'],
  'clinical_history.view': ['Consultar historias clínicas', 'Leer las historias clínicas del paciente.'],
  'clinical_history.create_draft': ['Crear borradores de historia clínica', 'Comenzar una historia clínica sin finalizarla.'],
  'clinical_history.edit_draft': ['Editar borradores de historia clínica', 'Modificar una historia clínica mientras sigue en borrador.'],
  'clinical_history.finalize': ['Finalizar historias clínicas', 'Pasar una historia de borrador a finalizada. Se mantienen los requisitos profesionales del sistema.'],
  'clinical_history.cancel': ['Anular historias clínicas', 'Anular una historia clínica, conservando su registro.'],
  'clinical_history.view_sensitive': ['Consultar datos sensibles de la historia', 'Ver la información de la historia clínica que tiene acceso restringido.'],
  'clinical_history.print': ['Imprimir historias clínicas', 'Obtener una copia para impresión de la historia clínica.'],
  'clinical_history_template.view': ['Consultar plantillas de historia clínica', 'Ver las plantillas disponibles para la historia clínica.'],
  'clinical_history_template.manage': ['Editar plantillas de historia clínica', 'Administrar las preguntas y el contenido de las plantillas clínicas.'],
  'documents.view': ['Consultar documentos y firmas', 'Ver los documentos del paciente y las firmas registradas.'],
  'documents.create': ['Crear documentos para pacientes', 'Preparar un documento para un paciente.'],
  'documents.sign': ['Firmar documentos como profesional', 'Firmar documentos cuando el perfil profesional esté autorizado.'],
  'documents.signature.request': ['Solicitar firmas de documentos', 'Enviar una solicitud para que se firme un documento a distancia.'],
  'documents.cancel': ['Anular documentos', 'Cancelar un documento existente.'],
  'documents.config': ['Editar plantillas de documentos', 'Administrar las plantillas de documentos y consentimientos.'],
  'prescriptions.view.own': ['Consultar sus propias recetas', 'Ver las recetas del profesional que usa esta cuenta.'],
  'prescriptions.view.all': ['Consultar las recetas de todos los profesionales', 'Ver las recetas de los distintos profesionales del consultorio.'],
  'prescriptions.create': ['Crear borradores de recetas', 'Preparar una receta. Emitirla requiere un acceso adicional.'],
  'prescriptions.edit_draft': ['Editar borradores de recetas', 'Modificar una receta que todavía no se ha emitido.'],
  'prescriptions.issue': ['Emitir recetas', 'Emitir una receta cuando el perfil profesional esté autorizado.'],
  'prescriptions.cancel': ['Anular recetas', 'Cancelar una receta existente.'],
  'prescriptions.print': ['Imprimir recetas', 'Obtener una copia para impresión de una receta.'],
  'prescriptions.download': ['Descargar recetas', 'Guardar una copia de la receta como archivo.'],
  'prescriptions.config': ['Configurar el formato de recetas', 'Editar el formato y los datos que aparecen en las recetas.'],
  'prescriptions.global': ['Abrir la sección general de recetas', 'Entrar a Recetas desde el menú principal. Los demás accesos determinan qué puede consultar y hacer.'],
  'treatments.view': ['Consultar tratamientos', 'Ver los tratamientos registrados para el paciente.'],
  'treatments.create': ['Crear tratamientos', 'Añadir tratamientos al plan del paciente.'],
  'treatments.edit': ['Editar tratamientos', 'Modificar los tratamientos del paciente.'],
  'treatments.cancel': ['Cancelar tratamientos', 'Cancelar un tratamiento registrado.'],
  'treatments.complete': ['Marcar tratamientos como realizados', 'Registrar que un tratamiento se ha completado.'],
  'treatments.close_plan': ['Cerrar planes de tratamiento', 'Cerrar el plan de tratamiento del paciente.'],
  'treatments.config': ['Configurar tratamientos', 'Administrar la configuración de tratamientos.'],
  'treatments.cost_view': ['Consultar costos de tratamientos', 'Ver los importes registrados para los tratamientos.'],
  'treatments.cost_edit': ['Modificar costos de tratamientos', 'Cambiar los importes de los tratamientos.'],
  'treatments.consent.view': ['Consultar el consentimiento del tratamiento', 'Ver el consentimiento asociado al plan de tratamiento.'],
  'treatments.consent.sign': ['Gestionar la firma del consentimiento', 'Usar las opciones de firma del consentimiento del plan de tratamiento.']
};

export function permissionText(permission) {
  const copy = COPY[permission.code];
  return copy ? { name: copy[0], description: copy[1] } : {
    name: permission.name || 'Acceso sin nombre', description: permission.description || 'Revisa esta función antes de habilitarla.'
  };
}

export function permissionGroupLabel(name) {
  return ({ Administracion: 'Administración del consultorio', 'Historia clinica': 'Historia clínica', General: 'Navegación', Indicadores: 'Dashboard e indicadores', Seguimiento: 'Seguimientos' })[name] || name;
}

export function roleLabel(role) {
  return ({ admin: 'Administrador', business_admin: 'Administrador', assistant: 'Asistente', doctor: 'Doctor', reception: 'Recepción' })[role.code] || role.desc_rol || role.code;
}

export function normalizePermissionSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
