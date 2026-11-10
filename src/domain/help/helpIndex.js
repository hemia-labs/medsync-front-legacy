// Editorial structure only. IDs survive title changes; flow references are not links.
export const helpSections = [
  { id: 'guia', title: 'Guía de uso', order: 10 },
  { id: 'preguntas', title: 'Preguntas frecuentes', order: 20 }
];

export const helpTopics = [
  { id: 'empezar', title: 'Empezar a usar MedSync', order: 10, icon: 'mdi-rocket-launch-outline' },
  { id: 'agenda', title: 'Organizar la agenda', order: 20, icon: 'mdi-calendar-clock' },
  { id: 'pacientes', title: 'Registrar y encontrar pacientes', order: 30, icon: 'mdi-account-search-outline' },
  { id: 'atencion', title: 'Registrar la atención', order: 40, icon: 'mdi-stethoscope' },
  { id: 'documentos', title: 'Trabajar con recetas y documentos', order: 50, icon: 'mdi-file-document-edit-outline' },
  { id: 'equipo', title: 'Preparar el consultorio y el equipo', order: 60, icon: 'mdi-account-group-outline' },
  { id: 'acceso', title: 'Resolver problemas de acceso', order: 70, icon: 'mdi-lock-reset' }
];

export const helpFlows = {
  preparation: { screen: 'Configuración > Resumen / Inicio', route: '/admin?section=summary', source: 'src/views/configuration/components/PreparationChecklist.vue' },
  identity: { screen: 'Configuración > Información del consultorio', route: '/admin?section=identity', source: 'src/views/configuration/index.vue' },
  profile: { screen: 'Configuración > Mi perfil profesional', route: '/admin?section=doctor-identity', source: 'src/views/User/components/DAProfessionalProfile.vue' },
  schedule: { screen: 'Configuración > Mi agenda / Agendas por doctor', route: '/admin?section=agenda', source: 'src/views/configuration/components/ProfessionalAgendaConfig.vue' },
  appointments: { screen: 'Citas', route: '/px/dates', source: 'src/views/dates/dates.vue' },
  patientNew: { screen: 'Nuevo paciente', route: '/px/new', source: 'src/views/Patient/PatientCreate.vue' },
  patients: { screen: 'Pacientes', route: '/px/all', source: 'src/views/Patient/Patients.vue' },
  patientRecord: { screen: 'Expediente del paciente', route: '/px/history/:id', source: 'src/views/Patient/PatientShow.vue' },
  intake: { screen: 'Expediente > Captura inicial', route: '/px/history/:id', source: 'src/views/Patient/Sections/ClinicalIntake.vue' },
  history: { screen: 'Expediente > Historia clínica', route: '/px/history/:id?tab=medical-history', source: 'src/views/Patient/Sections/MedicalHistory.vue' },
  allergy: { screen: 'Expediente > Alergias', route: '/px/history/:id', source: 'src/views/Patient/components/AllergyEditor.vue' },
  followup: { screen: 'Expediente > Seguimiento', route: '/px/history/:id?tab=monitoring', source: 'src/views/Patient/Sections/MonitoringPlan.vue' },
  odontogram: { screen: 'Expediente > Odontograma', route: '/px/history/:id?tab=odontogram', source: 'src/views/Patient/Sections/Odontogram.vue' },
  treatment: { screen: 'Expediente > Tratamiento', route: '/px/history/:id?tab=treatment', source: 'src/views/Patient/Sections/TreatmentPlan.vue' },
  prescription: { screen: 'Expediente > Recetas', route: '/px/history/:id?tab=prescriptions', source: 'src/views/Patient/Sections/Prescriptions.vue' },
  documents: { screen: 'Expediente > Documentos y firmas', route: '/px/history/:id?tab=documents', source: 'src/views/Patient/Sections/DocumentsAndSignatures.vue' },
  users: { screen: 'Configuración > Personal y usuarios', route: '/admin?section=users', source: 'src/views/User/DAUser.vue' },
  permissions: { screen: 'Configuración > Puestos y accesos', route: '/admin?section=roles-permissions', source: 'src/views/configuration/components/RolesPermissionsConfig.vue' },
  templates: { screen: 'Configuración > Documentos y consentimientos', route: '/admin?section=documents', source: 'src/views/configuration/index.vue' },
  prescriptionFormat: { screen: 'Configuración > Mis recetas / Recetas por doctor', route: '/admin?section=prescriptions', source: 'src/views/configuration/components/PrescriptionConfig.vue' },
  historyFormat: { screen: 'Configuración > Plantilla de historia clínica', route: '/admin?section=clinical-history-template', source: 'src/views/configuration/components/ClinicalHistoryTemplateConfig.vue' },
  login: { screen: 'Iniciar sesión > Olvidé mi contraseña', route: '/auth/login', source: 'src/views/Auth/Login.vue' },
  password: { screen: 'Configuración > Cambiar contraseña', route: '/admin?section=change-password', source: 'src/views/configuration/components/ChangePassword.vue' }
};

const guide = (id, topic, order, title, flow, intent = 'tarea', prerequisites = []) => ({
  id, section: 'guia', topic, order, title, flow, intent, prerequisites,
  type: 'guide', editorialStatus: 'title-only'
});
const question = (id, topic, order, title, flow, relatedArticle, intent = 'problema') => ({
  id, section: 'preguntas', topic, order, title, flow, relatedArticle, intent,
  type: 'question', editorialStatus: 'draft', validationStatus: 'proposed'
});

export const helpEntries = [
  { ...guide('revisar-preparacion', 'empezar', 10, 'Revisar qué falta para empezar', 'preparation', 'empezar'), editorialStatus: 'draft' },
  { ...guide('datos-consultorio', 'empezar', 20, 'Completar los datos del consultorio', 'identity', 'empezar'), editorialStatus: 'draft' },
  { ...guide('perfil-profesional', 'empezar', 30, 'Completar tu perfil profesional y firma', 'profile', 'empezar'), editorialStatus: 'draft' },
  { ...guide('horarios-atencion', 'empezar', 40, 'Configurar los horarios de atención', 'schedule', 'empezar', ['perfil-profesional']), editorialStatus: 'draft' },

  { ...guide('consultar-agenda', 'agenda', 10, 'Consultar las citas de un doctor', 'appointments', 'tarea', ['horarios-atencion']), editorialStatus: 'draft' },
  { ...guide('agendar-cita', 'agenda', 20, 'Agendar una cita', 'appointments', 'tarea', ['horarios-atencion']), editorialStatus: 'draft' },
  { ...guide('vincular-paciente-cita', 'agenda', 25, 'Vincular una cita al expediente del paciente', 'appointments', 'tarea', ['agendar-cita']), editorialStatus: 'draft' },
  { ...guide('cambiar-cita', 'agenda', 30, 'Reprogramar o cancelar una cita', 'appointments', 'tarea', ['agendar-cita']), editorialStatus: 'draft' },
  { ...guide('estado-cita', 'agenda', 40, 'Registrar la confirmación o el resultado de una cita', 'appointments', 'tarea', ['agendar-cita']), editorialStatus: 'draft' },

  { ...guide('registrar-paciente', 'pacientes', 10, 'Registrar un paciente', 'patientNew'), editorialStatus: 'draft' },
  { ...guide('encontrar-paciente', 'pacientes', 20, 'Encontrar un paciente y abrir su expediente', 'patients'), editorialStatus: 'draft' },
  { ...guide('datos-paciente', 'pacientes', 30, 'Actualizar los datos de contacto de un paciente', 'patientRecord', 'tarea', ['encontrar-paciente']), editorialStatus: 'draft' },
  { ...guide('archivar-paciente', 'pacientes', 40, 'Archivar o restaurar un paciente', 'patientRecord', 'tarea', ['encontrar-paciente']), editorialStatus: 'draft' },

  { ...guide('captura-inicial', 'atencion', 10, 'Preparar la captura inicial desde recepción', 'intake', 'tarea', ['registrar-paciente']), editorialStatus: 'draft' },
  { ...guide('alergias-paciente', 'atencion', 20, 'Revisar y registrar las alergias del paciente', 'allergy', 'tarea', ['encontrar-paciente']), editorialStatus: 'draft' },
  { ...guide('historia-clinica', 'atencion', 30, 'Guardar y finalizar una historia clínica', 'history', 'tarea', ['perfil-profesional', 'documento-paciente']), editorialStatus: 'draft' },
  { ...guide('consultar-historia', 'atencion', 40, 'Consultar versiones de la historia clínica', 'history', 'tarea', ['encontrar-paciente']), editorialStatus: 'draft' },
  { ...guide('seguimiento', 'atencion', 50, 'Registrar un seguimiento y su próxima cita', 'followup', 'tarea', ['encontrar-paciente', 'horarios-atencion']), editorialStatus: 'draft' },
  { ...guide('odontograma', 'atencion', 60, 'Registrar hallazgos en el odontograma', 'odontogram', 'tarea', ['encontrar-paciente']), editorialStatus: 'draft' },
  { ...guide('plan-tratamiento', 'atencion', 70, 'Preparar un plan de tratamiento', 'treatment', 'tarea', ['encontrar-paciente']), editorialStatus: 'draft' },

  { ...guide('preparar-receta', 'documentos', 10, 'Preparar y emitir una receta', 'prescription', 'tarea', ['perfil-profesional', 'autorizaciones-profesionales', 'formato-receta']), editorialStatus: 'draft' },
  { ...guide('consultar-receta', 'documentos', 20, 'Consultar e imprimir una receta emitida', 'prescription'), editorialStatus: 'draft' },
  { ...guide('cancelar-receta', 'documentos', 30, 'Cancelar una receta emitida', 'prescription'), editorialStatus: 'draft' },
  { ...guide('documento-paciente', 'documentos', 40, 'Crear un documento para un paciente', 'documents', 'tarea', ['formatos-documentos']), editorialStatus: 'draft' },
  { ...guide('firmar-documento', 'documentos', 50, 'Recoger las firmas de un documento', 'documents', 'tarea', ['documento-paciente', 'perfil-profesional', 'autorizaciones-profesionales']), editorialStatus: 'draft' },
  { ...guide('revisar-documentos', 'documentos', 60, 'Consultar el estado de los documentos del paciente', 'documents', 'concepto'), editorialStatus: 'draft' },

  { ...guide('agregar-equipo', 'equipo', 10, 'Agregar a una persona a tu equipo', 'users'), editorialStatus: 'draft' },
  { ...guide('revisar-accesos', 'equipo', 20, 'Revisar los accesos de cada puesto', 'permissions'), editorialStatus: 'draft' },
  { ...guide('autorizaciones-profesionales', 'equipo', 30, 'Autorizar a un doctor para emitir recetas y firmar', 'users', 'tarea', ['perfil-profesional']), editorialStatus: 'draft' },
  { ...guide('formatos-documentos', 'equipo', 40, 'Preparar formatos de documentos y consentimientos', 'templates'), editorialStatus: 'draft' },
  { ...guide('formato-receta', 'equipo', 50, 'Configurar el formato de recetas de un doctor', 'prescriptionFormat', 'tarea', ['perfil-profesional']), editorialStatus: 'draft' },
  { ...guide('formato-historia', 'equipo', 60, 'Revisar la plantilla de historia clínica', 'historyFormat', 'concepto'), editorialStatus: 'draft' },

  { ...guide('recuperar-acceso', 'acceso', 10, 'Recuperar el acceso si olvidaste tu contraseña', 'login', 'problema'), editorialStatus: 'draft' },
  { ...guide('cambiar-contrasena', 'acceso', 20, 'Cambiar tu contraseña desde tu cuenta', 'password'), editorialStatus: 'draft' },

  question('preparacion-pendiente', 'empezar', 10, '¿Por qué sigue pendiente la preparación si terminé la guía?', 'preparation', 'revisar-preparacion'),
  question('perfil-autorizacion', 'empezar', 20, '¿Completar mi perfil me permite emitir recetas y firmar?', 'profile', 'autorizaciones-profesionales', 'concepto'),
  question('preparacion-responsable', 'empezar', 30, '¿Qué hago si un pendiente solo puede resolverlo la administración?', 'preparation', 'revisar-preparacion'),

  question('sin-horarios', 'agenda', 10, '¿Por qué no aparecen horarios disponibles para un doctor?', 'appointments', 'horarios-atencion'),
  question('agenda-cerrada', 'agenda', 20, '¿Qué pasa con las citas guardadas si se cierra la agenda?', 'appointments', 'consultar-agenda', 'concepto'),
  question('cita-reprogramada', 'agenda', 30, '¿Por qué la cita original aparece como Reprogramada?', 'appointments', 'cambiar-cita', 'concepto'),
  question('vinculo-telefono', 'agenda', 50, '¿Un teléfono compartido vincula automáticamente al paciente?', 'appointments', 'vincular-paciente-cita', 'concepto'),
  question('vinculo-pendiente', 'agenda', 60, '¿Qué hago si no se confirmó el vínculo con el paciente?', 'appointments', 'vincular-paciente-cita'),
  question('registro-desde-cita', 'agenda', 70, '¿Registrar al paciente también guarda su cita?', 'appointments', 'vincular-paciente-cita', 'concepto'),
  question('cita-sin-confirmacion', 'agenda', 40, '¿Qué hago si no se confirmó que mi cita se guardó?', 'appointments', 'agendar-cita'),

  question('paciente-archivado', 'pacientes', 10, '¿Archivar un paciente elimina su expediente?', 'patientRecord', 'archivar-paciente', 'concepto'),
  question('acceso-historia', 'pacientes', 20, '¿Por qué puedo ver al paciente pero no su historia clínica?', 'patientRecord', 'revisar-accesos'),

  question('intake-historia', 'atencion', 10, '¿La captura de recepción ya es una historia clínica finalizada?', 'intake', 'captura-inicial', 'concepto'),
  question('historia-bloqueada', 'atencion', 20, '¿Por qué no puedo finalizar la historia clínica?', 'history', 'historia-clinica'),
  question('alergias-estado', 'atencion', 30, '¿Sin alergias registradas significa lo mismo que sin confirmar?', 'allergy', 'alergias-paciente', 'concepto'),
  question('seguimiento-reserva', 'atencion', 40, '¿Una fecha sugerida en Seguimiento ya reserva una cita?', 'followup', 'seguimiento', 'concepto'),
  question('odontograma-visible', 'atencion', 50, '¿Por qué no veo Odontograma o Tratamiento en el expediente?', 'patientRecord', 'revisar-accesos'),

  question('receta-borrador', 'documentos', 10, '¿Qué diferencia hay entre una receta en borrador y una emitida?', 'prescription', 'preparar-receta', 'concepto'),
  question('receta-no-emite', 'documentos', 20, '¿Por qué puedo guardar una receta pero no emitirla?', 'prescription', 'preparar-receta'),
  question('plantilla-documento', 'documentos', 30, '¿Una plantilla guardada ya es un documento del paciente?', 'documents', 'documento-paciente', 'concepto'),
  question('documento-pendiente', 'documentos', 40, '¿Por qué un documento sigue pendiente de firma?', 'documents', 'firmar-documento'),
  question('negativa-firma', 'documentos', 50, '¿Qué pasa si el paciente o su tutor no acepta firmar?', 'documents', 'revisar-documentos', 'concepto'),

  question('puesto-autorizacion', 'equipo', 10, '¿El puesto y las autorizaciones profesionales son lo mismo?', 'permissions', 'autorizaciones-profesionales', 'concepto'),
  question('plantilla-version', 'equipo', 20, '¿Cambiar la plantilla modifica las historias ya creadas?', 'historyFormat', 'formato-historia', 'concepto'),

  question('codigo-recuperacion', 'acceso', 10, '¿Qué hago si no recibo el código de recuperación?', 'login', 'recuperar-acceso'),
  question('codigo-vencido', 'acceso', 20, '¿Qué hago si mi código de recuperación venció?', 'login', 'recuperar-acceso')
];
