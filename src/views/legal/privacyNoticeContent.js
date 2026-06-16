import {
  MEDSYNC_LEGAL_ADDRESS,
  MEDSYNC_LEGAL_NAME,
  MEDSYNC_LAST_UPDATED,
  MEDSYNC_PRIVACY_DEPARTMENT,
  MEDSYNC_PRIVACY_EMAIL,
  MEDSYNC_PRIVACY_PHONE,
  TODO_PRODUCTION_BLOCKER
} from './privacyLegalConfig';

export {
  MEDSYNC_LEGAL_ADDRESS,
  MEDSYNC_LEGAL_NAME,
  MEDSYNC_LAST_UPDATED,
  MEDSYNC_PRIVACY_DEPARTMENT,
  MEDSYNC_PRIVACY_EMAIL,
  MEDSYNC_PRIVACY_PHONE,
  TODO_PRODUCTION_BLOCKER
};

export const TODO_LEGAL_REVIEW = [
  'Completar razón social o nombre legal, domicilio legal, correo ARCO, teléfono de privacidad y área/persona responsable de datos personales.',
  'Confirmar proveedores reales de hosting, base de datos, almacenamiento, SMTP/correo, seguridad, soporte, mensajería, pagos, analítica y CDN antes de publicar.',
  'Validar contratos, anexos de encargado, remisiones, transferencias, subprocesadores y periodos de conservación con asesoría legal.',
  'Definir avisos simplificados en todos los puntos de captura públicos y validar que no sustituyan consentimientos clínicos sensibles del consultorio.',
  'Ajustar este aviso si MedSync activa nuevos módulos, integraciones, finalidades o proveedores no descritos aquí.'
];

export const highlightCards = [
  {
    icon: 'mdi-cloud-check-outline',
    title: 'MedSync como plataforma',
    text: 'MedSync.mx provee tecnología SaaS para operar consultorios. Trata datos de visitantes, clientes y usuarios para prestar, proteger, mantener y mejorar el servicio.'
  },
  {
    icon: 'mdi-stethoscope',
    title: 'Consultorio como responsable clínico',
    text: 'Cada consultorio, médico, dentista o profesional de salud define el tratamiento clínico de sus pacientes y debe entregar su propio aviso de privacidad.'
  },
  {
    icon: 'mdi-shield-alert-outline',
    title: 'Datos sensibles',
    text: 'Los datos de salud presentes o futuros, antecedentes, diagnósticos, tratamientos, recetas, firmas y documentos clínicos pueden ser datos personales sensibles.'
  },
  {
    icon: 'mdi-account-key-outline',
    title: 'Derechos ARCO',
    text: 'Los titulares pueden solicitar acceso, rectificación, cancelación u oposición, así como revocar consentimiento cuando proceda legalmente.'
  },
  {
    icon: 'mdi-lock-check-outline',
    title: 'Seguridad',
    text: 'MedSync aplica medidas administrativas, técnicas y físicas razonables según el riesgo; ninguna plataforma puede prometer seguridad absoluta.'
  }
];

export const dataCategories = [
  {
    group: 'Visitantes y prospectos',
    data: 'Nombre, correo, teléfono, consultorio o empresa, mensajes de contacto, fecha/hora de interacción, IP, user agent y datos técnicos necesarios cuando existan formularios, logs o controles antiabuso.',
    source: 'Formularios/contacto si se habilitan, logs técnicos, rate limiting público.'
  },
  {
    group: 'Clientes, tenants y dueños de consultorio',
    data: 'Nombre, correo, teléfono, datos del negocio o consultorio, razón social del tenant, dirección, logo, slug, plan, estado activo, estado de licencia, suscripción o trial y usuarios asociados.',
    source: 'Tablas business, login; módulos super admin, configuración y licenciamiento.'
  },
  {
    group: 'Usuarios internos del tenant',
    data: 'Nombre, correo, teléfono, rol, permisos, estado activo o bloqueado, sesiones, tenant asociado, actividad administrativa y eventos auditables.',
    source: 'Tablas login, rol, session; módulos de usuarios, permisos, sesiones y auditoría.'
  },
  {
    group: 'Datos profesionales',
    data: 'Nombre profesional, cédula profesional, universidad, especialidad, cédula de especialidad, teléfono profesional, firma o imagen de firma y permisos para emitir recetas o firmar documentos.',
    source: 'Tabla doctor_professional_profile y configuraciones de recetas/documentos.'
  },
  {
    group: 'Autenticación y seguridad',
    data: 'Email, teléfono o identificador de acceso, hash de contraseña, sesiones activas, cookies HttpOnly de acceso/refresh cuando este modo esté habilitado, cookie CSRF, tokens internos, IP, user agent, logs de login, refresh, restablecimiento y acciones críticas.',
    source: 'Auth, cookies D2, refresh_token, auth_password_reset_tokens, security logger.'
  },
  {
    group: 'Datos clínicos procesados por cuenta del tenant',
    data: 'Pacientes, datos de identificación y contacto, fecha de nacimiento, edad, ocupación, RFC si el tenant lo captura, dirección, historia clínica, antecedentes, alergias, signos vitales, diagnósticos, odontograma, tratamientos, citas, seguimiento, recetas, documentos, consentimientos, firmas, fotografías, radiografías y adjuntos.',
    source: 'Tablas person, address, query, allergy, odontogram, treatment, appointment, prescription, patient_documents, files.'
  },
  {
    group: 'Firma remota, links públicos y QR',
    data: 'Token o identificador del enlace, hash/fingerprint del token, documento a firmar, nombre del paciente o firmante, firma capturada, fecha/hora de apertura y firma, IP, user agent, vencimiento, canal y evidencia técnica mínima.',
    source: 'document_signature_requests, patient_document_signatures, eventos públicos de firma.'
  }
];

export const primaryPurposes = [
  'Crear, administrar y autenticar cuentas de clientes y usuarios de la plataforma.',
  'Operar funcionalidades SaaS de agenda, pacientes, expedientes, recetas, documentos, firmas, configuración, reportes operativos y soporte.',
  'Procesar datos clínicos por cuenta e instrucciones del consultorio o tenant que usa MedSync.',
  'Mantener sesiones, permisos, roles, seguridad, prevención de abuso, registros técnicos y auditoría de acciones críticas.',
  'Gestionar licencias, planes, trials, disponibilidad, soporte, comunicaciones operativas y cumplimiento contractual.',
  'Generar links públicos o QR de firma remota cuando el tenant lo solicite.',
  'Cumplir obligaciones legales, fiscales, contractuales, regulatorias o requerimientos de autoridad competente.'
];

export const secondaryPurposes = [
  'Enviar comunicaciones comerciales o informativas sobre mejoras, funcionalidades o servicios relacionados, cuando proceda.',
  'Realizar mediciones estadísticas, análisis de uso o mejora de producto con información agregada, disociada o anonimizada cuando sea posible.',
  'Solicitar retroalimentación sobre el servicio o experiencia de soporte.'
];

export const providerGroups = [
  {
    id: 'encargados',
    title: 'A) Encargados, subprocesadores o remisiones',
    note: 'Proveedores que podrían tratar datos por cuenta de MedSync para prestar, alojar, proteger, soportar o mantener la plataforma. No se listan como definitivos hasta confirmar producción.',
    rows: [
      {
        type: 'Hosting e infraestructura',
        status: '[PENDIENTE DE CONFIRMAR]',
        notes: 'Alojamiento de aplicación, red, cómputo, respaldos o componentes operativos del SaaS.'
      },
      {
        type: 'Base de datos',
        status: '[PENDIENTE DE CONFIRMAR]',
        notes: 'Procesamiento y almacenamiento de cuentas, tenants, usuarios, expedientes y datos operativos.'
      },
      {
        type: 'Almacenamiento de archivos',
        status: 'Integración técnica compatible con buckets tipo S3; proveedor real [PENDIENTE DE CONFIRMAR].',
        notes: 'Puede alojar firmas, fotografías, radiografías, documentos o adjuntos según configuración.'
      },
      {
        type: 'Correo transaccional',
        status: 'SMTP vía nodemailer detectado; host/proveedor [PENDIENTE DE CONFIRMAR].',
        notes: 'Comunicaciones operativas como enlaces de firma remota, recuperación o notificaciones.'
      },
      {
        type: 'Seguridad y monitoreo',
        status: '[PENDIENTE DE CONFIRMAR]',
        notes: 'Logs, alertas, rate limiting, monitoreo de disponibilidad o eventos de seguridad.'
      },
      {
        type: 'Soporte técnico',
        status: '[PENDIENTE DE CONFIRMAR]',
        notes: 'Acceso restringido, justificado y auditado cuando sea necesario para soporte.'
      }
    ]
  },
  {
    id: 'terceros',
    title: 'B) Terceros responsables o posibles transferencias',
    note: 'Supuestos donde podría existir comunicación a un tercero responsable. Deben validarse contratos, consentimiento, excepción legal o fundamento aplicable.',
    rows: [
      {
        type: 'Proveedores de pago',
        status: 'PayPal detectado técnicamente / pendiente de confirmar si aplica en producción.',
        notes: 'Si está activo, puede tratar identificadores de pago, suscripción o metadata de transacción bajo sus propios términos.'
      },
      {
        type: 'Autoridades competentes',
        status: 'Aplicable cuando exista mandato, requerimiento o fundamento legal.',
        notes: 'No se realiza de forma ordinaria; depende del caso y la legislación aplicable.'
      },
      {
        type: 'Integraciones externas configuradas por el tenant',
        status: '[PENDIENTE DE CONFIRMAR]',
        notes: 'El consultorio puede activar o solicitar integraciones externas; debe informar a sus titulares cuando corresponda.'
      }
    ]
  },
  {
    id: 'herramientas-usuario',
    title: 'C) Herramientas iniciadas por el usuario',
    note: 'Herramientas donde MedSync puede generar una acción o enlace, pero el envío o uso final ocurre desde el dispositivo, cuenta o decisión del usuario del consultorio.',
    rows: [
      {
        type: 'WhatsApp / api.whatsapp.com',
        status: 'El frontend genera enlaces; alcance y uso final [PENDIENTE DE CONFIRMAR].',
        notes: 'Si el envío ocurre desde la cuenta/dispositivo del consultorio, el consultorio debe valorar su aviso, consentimiento y configuración.'
      }
    ]
  }
];

export const simplifiedNoticeRows = [
  {
    point: 'Firma remota pública (/sign/d/:token)',
    status: 'Implementado en esta iteración.',
    note: 'Se agregó aviso simplificado visible junto al formulario, con link a /privacy y aclaración de que no sustituye el aviso ni consentimiento clínico del consultorio.'
  },
  {
    point: 'Landing, contacto o prerregistro',
    status: 'No se encontró formulario público activo en el frontend revisado.',
    note: 'TODO: si se habilita, mostrar aviso simplificado cerca del formulario y enlazar /privacy.'
  },
  {
    point: 'Login y recuperación de acceso',
    status: 'Pendiente sin tocar flujo auth.',
    note: 'TODO: evaluar un aviso simplificado en auth sin modificar lógica de autenticación, cookies, CSRF ni recuperación.'
  },
  {
    point: 'Formularios internos del tenant',
    status: 'Fuera de alcance de esta iteración.',
    note: 'No deben usar aceptación del aviso de MedSync como sustituto de consentimiento clínico sensible del consultorio.'
  }
];

export const sections = [
  {
    id: 'identidad',
    title: 'Identidad y domicilio del responsable',
    body: [
      `Para los datos personales de visitantes, prospectos, clientes y usuarios de la plataforma, el responsable es ${MEDSYNC_LEGAL_NAME}, con domicilio en ${MEDSYNC_LEGAL_ADDRESS}.`,
      `Área/persona responsable de datos personales: ${MEDSYNC_PRIVACY_DEPARTMENT}. Contacto para privacidad y derechos ARCO: ${MEDSYNC_PRIVACY_EMAIL}. Teléfono: ${MEDSYNC_PRIVACY_PHONE}.`,
      `TODO_PRODUCTION_BLOCKER: ${TODO_PRODUCTION_BLOCKER}`
    ]
  },
  {
    id: 'alcance',
    title: 'Alcance del aviso',
    body: [
      'Este Aviso de Privacidad Integral aplica al sitio público MedSync.mx, a los formularios o medios de contacto de la plataforma, a las cuentas de clientes y usuarios, a la operación del SaaS y a los servicios de soporte, seguridad, comunicación y administración relacionados.',
      'No sustituye el aviso de privacidad que cada consultorio, médico, dentista, clínica o profesional de salud debe entregar a sus pacientes conforme a su propia operación.'
    ]
  },
  {
    id: 'diferencia',
    title: 'Diferencia entre MedSync y los consultorios',
    body: [
      'MedSync.mx es proveedor de una plataforma tecnológica. MedSync no presta directamente servicios médicos, odontológicos, diagnósticos ni tratamientos a pacientes.',
      'Los consultorios, profesionales de salud o tenants que usan MedSync son responsables del tratamiento clínico que realizan con sus pacientes. Ellos definen qué datos recaban, con qué finalidades clínicas, bajo qué consentimiento y durante cuánto tiempo deben conservarlos.',
      'Cuando MedSync aloja, transmite, muestra o procesa información clínica dentro de la plataforma, lo hace por cuenta del cliente/tenant y bajo sus instrucciones, para poder prestar el servicio contratado.'
    ]
  },
  {
    id: 'datos',
    title: 'Datos personales que recabamos',
    body: [
      'Las categorías identificadas en el código actual se muestran en la tabla de inventario de datos. La información concreta puede variar según los módulos contratados, configuración del tenant y datos que el consultorio decida registrar.'
    ]
  },
  {
    id: 'sensibles',
    title: 'Datos personales sensibles',
    body: [
      'Los datos sobre estado de salud presente o futuro, antecedentes, alergias, signos vitales, diagnósticos, tratamientos, recetas, imágenes clínicas, documentos de consentimiento y firmas pueden ser datos personales sensibles.',
      'MedSync no debe usar datos clínicos identificables para publicidad. Cualquier uso estadístico o de mejora deberá realizarse de forma agregada, disociada o anonimizada cuando sea posible, salvo consentimiento o fundamento aplicable.'
    ]
  },
  {
    id: 'clinicos',
    title: 'Datos clínicos tratados por cuenta de clientes',
    body: [
      'Los expedientes, historias clínicas, odontogramas, recetas, documentos, consentimientos, firmas, imágenes, radiografías, notas y planes de tratamiento pertenecen a la operación del consultorio/tenant.',
      'El acceso de personal Super Admin o soporte de MedSync a datos clínicos identificables debe limitarse a soporte estrictamente necesario, controlado, auditado y justificado.'
    ]
  },
  {
    id: 'finalidades',
    title: 'Finalidades del tratamiento',
    body: [
      'Las finalidades primarias son necesarias para prestar el servicio, administrar cuentas, proteger la plataforma, dar soporte y cumplir obligaciones. Las finalidades secundarias son opcionales y no deben condicionar el servicio principal cuando legalmente corresponda.'
    ]
  },
  {
    id: 'cookies',
    title: 'Cookies, sesiones y tecnologías similares',
    body: [
      'La plataforma puede usar cookies técnicas, cookies HttpOnly de autenticación, cookies o tokens CSRF, almacenamiento de sesión y registros técnicos para mantener sesiones, seguridad, preferencias operativas y continuidad del servicio.',
      'Estas tecnologías no deben usarse para explotar datos clínicos identificables con fines publicitarios.'
    ]
  },
  {
    id: 'seguridad',
    title: 'Seguridad de la información',
    body: [
      'MedSync implementa medidas administrativas, técnicas y físicas razonables para proteger datos contra daño, pérdida, alteración, destrucción, uso, acceso o tratamiento no autorizado, considerando sensibilidad, riesgos y tecnología disponible.',
      'Entre las medidas técnicas encontradas se incluyen contraseñas hasheadas, controles de sesión, roles/permisos, cookies HttpOnly cuando el modo cookie está habilitado, CSRF, rate limiting para rutas públicas de firma, logs de seguridad y auditoría de acciones críticas. Estas medidas reducen riesgos, pero no garantizan seguridad absoluta.'
    ]
  },
  {
    id: 'vulneraciones',
    title: 'Vulneraciones de seguridad',
    body: [
      'En caso de que MedSync confirme una vulneración de seguridad que afecte de forma significativa los derechos patrimoniales o morales de los titulares, realizará las notificaciones que correspondan conforme a la legislación aplicable.',
      'Cuando sea posible y procedente, la notificación indicará la naturaleza del incidente, datos comprometidos, recomendaciones al titular, acciones correctivas realizadas o en curso y medios de contacto. Esto no implica prometer detección perfecta ni seguridad absoluta.'
    ]
  },
  {
    id: 'conservacion',
    title: 'Conservación de datos',
    body: [
      'Los datos se conservarán durante el tiempo necesario para cumplir las finalidades descritas, la relación contractual, soporte, seguridad, auditoría y obligaciones legales aplicables.',
      'La cancelación o eliminación puede estar sujeta a periodos de bloqueo, prescripción, obligaciones fiscales, contractuales, regulatorias o clínicas. En datos clínicos, el consultorio/tenant puede tener obligaciones propias de conservación.'
    ]
  },
  {
    id: 'transferencias',
    title: 'Transferencias, remisiones y proveedores',
    body: [
      'MedSync puede comunicar o permitir el tratamiento de datos a proveedores de infraestructura, hosting, base de datos, almacenamiento, correo, soporte, seguridad, monitoreo, pagos o integraciones externas cuando sea necesario para prestar y proteger el servicio.',
      'No se debe afirmar que no hay transferencias o remisiones. Los proveedores no confirmados se marcan como pendientes y no deben tratarse como lista definitiva hasta completar revisión legal y operativa.'
    ]
  },
  {
    id: 'arco',
    title: 'Derechos ARCO y revocación del consentimiento',
    body: [
      `Medio de recepción: las solicitudes ARCO o de revocación podrán enviarse a ${MEDSYNC_PRIVACY_EMAIL}, dirigidas a ${MEDSYNC_PRIVACY_DEPARTMENT}.`,
      'Datos mínimos de solicitud: nombre del titular, medio para comunicar respuesta, derecho que desea ejercer, descripción clara de los datos o tratamiento relacionado, documentos o información que faciliten la localización de los datos y, en su caso, instrucciones específicas.',
      'Identidad o representación: la solicitud deberá acompañarse de documento para acreditar identidad del titular o, cuando aplique, personalidad del representante legal. MedSync podrá solicitar información adicional cuando sea necesaria para atender la solicitud.',
      'Plazos: MedSync comunicará la determinación en un plazo de hasta 20 días hábiles contados desde la recepción de la solicitud completa. Si resulta procedente, hará efectiva la solicitud dentro de los 15 días hábiles siguientes a la comunicación de respuesta. Estos plazos podrán ampliarse cuando la legislación aplicable lo permita.',
      'El ejercicio de derechos ARCO es gratuito. Solo podrán cobrarse costos justificados de reproducción, envío o certificación cuando legalmente proceda.',
      'Si la solicitud se relaciona con expediente clínico o datos capturados por un consultorio, MedSync podrá orientar al titular para acudir también con el consultorio/profesional responsable, sin perjuicio de atender lo que legalmente corresponda.'
    ]
  },
  {
    id: 'limitar',
    title: 'Medios para limitar uso o divulgación',
    body: [
      'Puedes solicitar la limitación del uso o divulgación de tus datos personales mediante el contacto de privacidad indicado en este aviso. Las limitaciones se aplicarán cuando sean procedentes y no impidan cumplir obligaciones legales, contractuales, de seguridad o de prestación del servicio.'
    ]
  },
  {
    id: 'avisos-simplificados',
    title: 'Avisos simplificados en puntos de captura',
    body: [
      'En formularios públicos o puntos de captura futuros, MedSync deberá mostrar un aviso de privacidad simplificado cerca del formulario y enlazar este aviso integral.',
      'La aceptación o lectura del aviso de MedSync no sustituye automáticamente el consentimiento clínico sensible ni el aviso de privacidad que corresponda al consultorio/profesional tratante.'
    ]
  },
  {
    id: 'cambios',
    title: 'Cambios al aviso de privacidad',
    body: [
      'MedSync podrá actualizar este aviso para reflejar cambios legales, operativos, de proveedores, módulos, finalidades o medidas de seguridad. Los cambios se publicarán en esta misma ruta y, cuando sea necesario, se comunicarán por medios razonables.'
    ]
  },
  {
    id: 'pacientes',
    title: 'Nota específica para pacientes',
    body: [
      'Si eres paciente, consulta también el aviso de privacidad del consultorio, médico, dentista o profesional que te atiende. Ese consultorio define las finalidades clínicas, integra el expediente, obtiene consentimientos, determina periodos de conservación y responde por su operación clínica.',
      'MedSync procesa datos clínicos por cuenta del consultorio para prestar la plataforma y no usa datos clínicos identificables para publicidad.'
    ]
  }
];

export const legalSources = [
  {
    label: 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares, texto vigente Cámara de Diputados',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf'
  },
  {
    label: 'Lineamientos del Aviso de Privacidad publicados en el DOF',
    url: 'https://www.dof.gob.mx/nota_detalle.php?codigo=5284966&fecha=17/01/2013'
  }
];
