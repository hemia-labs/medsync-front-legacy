import {
  MEDSYNC_APPLICABLE_LAW,
  MEDSYNC_BILLING_STATUS,
  MEDSYNC_JURISDICTION,
  MEDSYNC_LEGAL_ADDRESS,
  MEDSYNC_LEGAL_EMAIL,
  MEDSYNC_LEGAL_NAME,
  MEDSYNC_LEGAL_PHONE,
  MEDSYNC_RETENTION_EXPORT_POLICY,
  MEDSYNC_SLA,
  MEDSYNC_SUPPORT_EMAIL,
  MEDSYNC_SUPPORT_HOURS,
  MEDSYNC_TERMS_LAST_UPDATED,
  TODO_PRODUCTION_BLOCKER
} from './privacyLegalConfig';

export {
  MEDSYNC_LEGAL_ADDRESS,
  MEDSYNC_LEGAL_EMAIL,
  MEDSYNC_LEGAL_NAME,
  MEDSYNC_LEGAL_PHONE,
  MEDSYNC_SUPPORT_EMAIL,
  MEDSYNC_TERMS_LAST_UPDATED,
  TODO_PRODUCTION_BLOCKER
};

export const TERMS_TODO_LEGAL_REVIEW = [
  'Completar razón social o nombre legal, domicilio legal, correo legal/soporte, teléfono, datos fiscales y jurisdicción.',
  'Definir condiciones comerciales de planes, trials, renovaciones, cancelaciones, facturación, impuestos, reembolsos y métodos de pago.',
  'Validar límites de responsabilidad, propiedad intelectual, suspensión, retención/exportación de datos y soporte con asesoría legal.',
  'Validar validez probatoria, conservación y alcance de firma local/remota/electrónica o digital en documentos, recetas y consentimientos.',
  'Definir SLA, horarios de soporte, canales oficiales y políticas de almacenamiento, adjuntos, rate limits e integraciones.'
];

export const termsHeroCards = [
  {
    icon: 'mdi-cloud-outline',
    title: 'MedSync es plataforma, no prestador médico',
    text: 'MedSync.mx ofrece tecnología SaaS para operación de consultorios; no diagnostica, prescribe ni presta tratamientos.'
  },
  {
    icon: 'mdi-account-heart-outline',
    title: 'Consultorio responsable clínico',
    text: 'El tenant responde por atención médica, expediente, consentimiento informado, pacientes y cumplimiento profesional.'
  },
  {
    icon: 'mdi-infinity',
    title: 'Pacientes ilimitados con uso razonable',
    text: 'El registro de pacientes puede ser ilimitado para operación ordinaria, sujeto a límites técnicos, seguridad y prevención de abuso.'
  },
  {
    icon: 'mdi-shield-lock-outline',
    title: 'Seguridad y confidencialidad',
    text: 'Usuarios y tenants deben proteger credenciales, respetar permisos y mantener confidencialidad clínica y administrativa.'
  },
  {
    icon: 'mdi-file-sign',
    title: 'Firma remota y documentos',
    text: 'Recetas, documentos, consentimientos y firmas son responsabilidad del profesional o consultorio que los emite.'
  }
];

export const responsibilityRows = [
  {
    topic: 'Servicio',
    medsync: 'Provee y mantiene herramientas tecnológicas SaaS.',
    tenant: 'Opera el consultorio, define procesos y usa la plataforma conforme a la ley.'
  },
  {
    topic: 'Atención clínica',
    medsync: 'No presta servicios médicos, odontológicos, diagnósticos ni tratamientos.',
    tenant: 'Responde por decisiones clínicas, diagnóstico, tratamiento y relación con pacientes.'
  },
  {
    topic: 'Datos clínicos',
    medsync: 'Procesa datos por cuenta e instrucciones del tenant para prestar el servicio.',
    tenant: 'Define finalidades clínicas, aviso de privacidad, consentimiento, expediente y conservación.'
  },
  {
    topic: 'Usuarios y permisos',
    medsync: 'Ofrece roles, permisos y controles técnicos disponibles en la plataforma.',
    tenant: 'Crea solo usuarios autorizados, evita cuentas compartidas y desactiva accesos innecesarios.'
  },
  {
    topic: 'Documentos y firmas',
    medsync: 'Facilita generación, captura, trazabilidad técnica y enlaces cuando aplique.',
    tenant: 'Verifica identidad, contenido, procedencia, consentimiento, cédulas y validez de uso.'
  }
];

export const useRulesRows = [
  {
    allowed: 'Operar agenda, pacientes, expedientes, recetas, documentos, usuarios, permisos y reportes del consultorio.',
    prohibited: 'Usar la plataforma para fines ilegales, fraudulentos, discriminatorios, abusivos o ajenos al servicio.'
  },
  {
    allowed: 'Registrar información veraz, pertinente y necesaria para la operación clínica o administrativa.',
    prohibited: 'Cargar datos falsos masivos, spam, malware, scraping, pruebas de carga no autorizadas o contenido ajeno al servicio.'
  },
  {
    allowed: 'Usar credenciales propias, respetar roles y mantener confidencialidad.',
    prohibited: 'Compartir contraseñas, eludir permisos, explotar vulnerabilidades, hacer ingeniería inversa o automatización abusiva.'
  },
  {
    allowed: 'Usar pacientes ilimitados para operación ordinaria de consultorios reales.',
    prohibited: 'Reventa, almacenamiento ilimitado, adjuntos masivos, solicitudes automatizadas o uso que afecte costos, seguridad o disponibilidad.'
  }
];

export const termsSections = [
  {
    id: 'aceptacion',
    title: 'A) Aceptación de los términos',
    body: [
      'Al crear una cuenta, acceder o usar MedSync.mx, el usuario acepta estos Términos y Condiciones de Uso.',
      'Si el usuario actúa por cuenta de un consultorio, clínica, empresa o profesional de salud, declara tener facultades suficientes para aceptar estos términos en su nombre.',
      'Si no acepta estos términos, no debe usar la plataforma.'
    ]
  },
  {
    id: 'servicio',
    title: 'B) Descripción del servicio',
    body: [
      'MedSync.mx es una plataforma SaaS para administración de consultorios médicos, odontológicos y de salud.',
      'El servicio puede incluir agenda, pacientes, expedientes o historia clínica, seguimiento, recetas, documentos, firmas, usuarios, permisos, reportes, configuración y soporte.',
      'MedSync no presta servicios médicos, odontológicos, diagnósticos ni tratamientos. Las decisiones clínicas corresponden exclusivamente al profesional de salud o consultorio.'
    ]
  },
  {
    id: 'roles',
    title: 'C) Rol de MedSync y rol del consultorio/tenant',
    body: [
      'MedSync provee tecnología. El consultorio/tenant es responsable de la atención médica, datos clínicos, expediente, consentimiento informado, relación con pacientes y cumplimiento profesional.',
      'MedSync puede procesar datos clínicos por cuenta e instrucciones del tenant para prestar el servicio.',
      'El paciente debe consultar el aviso de privacidad y documentos del consultorio/profesional tratante.'
    ]
  },
  {
    id: 'usuarios',
    title: 'D) Usuarios autorizados y cuentas',
    body: [
      'El cliente/tenant es responsable de crear usuarios solo para personal autorizado. Cada usuario debe usar credenciales propias y queda prohibido compartir contraseñas.',
      'El tenant debe desactivar usuarios que ya no laboren o ya no deban tener acceso.',
      'El usuario es responsable de la información que registre, modifique, consulte, descargue o comparta dentro de la plataforma.'
    ]
  },
  {
    id: 'uso-permitido',
    title: 'E) Uso permitido',
    body: [
      'MedSync debe usarse únicamente para fines legítimos relacionados con la operación clínica, administrativa y profesional del consultorio.',
      'El usuario debe registrar información veraz y pertinente, respetar permisos, confidencialidad, privacidad y legislación aplicable.',
      'Queda prohibido usar la plataforma para fines ilegales, fraudulentos, abusivos, discriminatorios, spam, scraping, ingeniería inversa, explotación de vulnerabilidades, carga de malware o almacenamiento ajeno al servicio.'
    ]
  },
  {
    id: 'pacientes-ilimitados',
    title: 'F) Pacientes ilimitados sujetos a uso razonable',
    body: [
      'Los planes de MedSync pueden ofrecer registro de pacientes ilimitados para la operación ordinaria del consultorio, siempre sujeto a uso razonable, límites técnicos, seguridad, almacenamiento disponible, estabilidad de la plataforma y prevención de abuso.',
      '“Pacientes ilimitados” no significa uso ilimitado de almacenamiento, adjuntos, automatizaciones, solicitudes masivas, scraping, pruebas de carga, reventa del servicio, carga de datos falsos o uso fuera del propósito clínico/administrativo del consultorio.',
      'MedSync podrá aplicar límites técnicos, rate limits, políticas de almacenamiento, revisión de abuso o medidas de mitigación cuando el uso afecte la seguridad, disponibilidad, costos operativos o experiencia de otros usuarios.',
      'El uso razonable está pensado para consultorios reales. Los límites de usuarios/profesionales sí dependen del plan contratado. El número de pacientes no oculta límites de almacenamiento, adjuntos, envío de correos, firma remota, usuarios, profesionales o módulos premium. Si en el futuro hay límites comerciales por plan, deberán mostrarse de forma transparente.'
    ]
  },
  {
    id: 'planes',
    title: 'G) Planes, licencias y funcionalidades',
    body: [
      'El acceso a MedSync puede depender del plan contratado. Algunos módulos pueden estar limitados por plan, rol, permisos, configuración o estado de licencia.',
      'Los planes pueden limitar número de profesionales, auxiliares, usuarios, módulos, almacenamiento, soporte, integraciones o funcionalidades avanzadas.',
      'MedSync puede cambiar, mejorar o retirar funcionalidades, procurando no afectar injustificadamente servicios ya contratados.'
    ]
  },
  {
    id: 'pagos',
    title: 'H) Pagos, pruebas gratuitas y renovaciones',
    body: [
      `Estado comercial actual: ${MEDSYNC_BILLING_STATUS}.`,
      'Si existen trials, promociones o meses gratis, estarán sujetos a condiciones comerciales vigentes. El acceso posterior al trial puede requerir contratación o pago.',
      'No se establecen aquí pasarelas, reembolsos, impuestos, facturación, renovaciones o métodos de pago definitivos. TODO_LEGAL_REVIEW: definir facturación, cancelaciones, renovaciones, reembolsos, impuestos y métodos de pago antes de producción.'
    ]
  },
  {
    id: 'privacidad',
    title: 'I) Datos, privacidad y confidencialidad',
    body: [
      'El tratamiento de datos personales por MedSync se rige por el Aviso de Privacidad Integral de MedSync.mx disponible en /privacy.',
      'El tenant debe contar con su propio aviso de privacidad para pacientes y con autorizaciones, consentimiento informado o bases legales necesarias para registrar datos clínicos.',
      'Los usuarios deben mantener confidencialidad de información clínica y administrativa. MedSync no debe usar datos clínicos identificables para publicidad.'
    ],
    link: { href: '/privacy', label: 'Ver Aviso de Privacidad Integral' }
  },
  {
    id: 'expediente',
    title: 'J) Expediente clínico, historia clínica y documentos',
    body: [
      'El consultorio/profesional es responsable de integrar, revisar, completar y conservar correctamente la información clínica conforme a su normativa aplicable.',
      'MedSync ofrece herramientas tecnológicas, pero no garantiza que por sí solas el expediente cumpla todas las obligaciones legales o profesionales si el usuario captura información incompleta, incorrecta o insuficiente.',
      'El usuario debe revisar documentos, recetas, consentimientos, planes de tratamiento y firmas antes de emitirlos o usarlos.'
    ]
  },
  {
    id: 'recetas-documentos-firmas',
    title: 'K) Recetas, documentos y firmas',
    body: [
      'Las recetas, documentos, consentimientos y firmas generados en MedSync son responsabilidad del profesional o consultorio que los emite.',
      'El profesional debe verificar identidad, datos, cédula, contenido, consentimiento y procedencia del documento.',
      'Firma local/remota/QR/link: el tenant es responsable de usarla adecuadamente y confirmar que el firmante corresponde al paciente o representante autorizado.',
      'MedSync no sustituye firma electrónica avanzada/certificada si una norma o contrato específico exige ese nivel. TODO_LEGAL_REVIEW: validar validez probatoria, conservación y firma digital/electrónica.'
    ]
  },
  {
    id: 'firma-remota',
    title: 'L) Firma remota y enlaces públicos',
    body: [
      'El usuario/tenant es responsable de enviar el enlace al destinatario correcto.',
      'Los enlaces pueden tener vencimiento, token, evidencia técnica, IP, user agent, fecha/hora y estado.',
      'El tenant debe evitar compartir enlaces en canales inseguros o con personas no autorizadas.',
      'MedSync puede aplicar rate limit, expiración, revocación o bloqueo por abuso.'
    ]
  },
  {
    id: 'seguridad-cuenta',
    title: 'M) Seguridad de la cuenta',
    body: [
      'El usuario debe proteger credenciales, cerrar sesión en equipos compartidos y avisar accesos no autorizados.',
      'MedSync puede usar controles como cookies HttpOnly, CSRF, sesiones, roles, permisos, auditoría, rate limit y medidas antiabuso.',
      'Estas medidas reducen riesgos, pero no garantizan seguridad absoluta. MedSync puede suspender sesiones o accesos por riesgo de seguridad.'
    ]
  },
  {
    id: 'disponibilidad',
    title: 'N) Disponibilidad, mantenimiento y cambios',
    body: [
      'La plataforma puede no estar disponible por mantenimiento, fallas, terceros, internet, hosting, fuerza mayor o actualizaciones.',
      'MedSync procurará reducir el impacto operativo cuando sea posible, pero no promete 100% uptime si no existe un SLA contratado.',
      `SLA Enterprise o condiciones especiales: ${MEDSYNC_SLA}.`
    ]
  },
  {
    id: 'soporte',
    title: 'O) Soporte',
    body: [
      `Canales de soporte: ${MEDSYNC_SUPPORT_EMAIL}. Horario: ${MEDSYNC_SUPPORT_HOURS}.`,
      'El soporte no sustituye asesoría médica, legal, fiscal o de cumplimiento.',
      'El acceso de soporte a datos sensibles debe ocurrir solo cuando sea necesario, autorizado, controlado y auditado.'
    ]
  },
  {
    id: 'suspension',
    title: 'P) Suspensión o terminación de acceso',
    body: [
      'MedSync podrá suspender o limitar el acceso por falta de pago si aplica, abuso o uso excesivo no razonable, riesgo de seguridad, uso ilegal, violación de confidencialidad, reventa no autorizada, ataques, scraping, automatización abusiva, carga maliciosa, orden de autoridad o incumplimiento de estos términos.'
    ]
  },
  {
    id: 'cancelacion-datos',
    title: 'Q) Cancelación y conservación/eliminación de datos',
    body: [
      'El cliente puede solicitar cancelación conforme a condiciones comerciales vigentes.',
      'La conservación, bloqueo, exportación o eliminación de datos puede estar sujeta a obligaciones legales, clínicas, fiscales, contractuales, respaldos o seguridad. En datos clínicos, el consultorio puede tener obligaciones propias de conservación.',
      `No se promete eliminación inmediata absoluta. Política de retención y exportación: ${MEDSYNC_RETENTION_EXPORT_POLICY}.`
    ]
  },
  {
    id: 'propiedad-intelectual',
    title: 'R) Propiedad intelectual',
    body: [
      'MedSync conserva derechos sobre software, diseño, marca, código, documentación, flujos, interfaz y tecnología.',
      'El tenant conserva responsabilidad/derechos sobre los datos que registra, sin transferir propiedad clínica a MedSync.',
      'Queda prohibido copiar, modificar, revender, sublicenciar, descompilar o explotar la plataforma sin autorización.'
    ]
  },
  {
    id: 'responsabilidad',
    title: 'S) Limitación de responsabilidad',
    body: [
      'Esta sección queda pendiente de revisión legal. MedSync no es responsable por decisiones clínicas, diagnósticos, tratamientos, errores de captura, omisiones del usuario, uso indebido, falta de consentimiento, entrega a destinatario incorrecto o incumplimiento normativo del consultorio.',
      'MedSync no garantiza continuidad absoluta, ausencia total de errores o compatibilidad con todos los dispositivos/navegadores.',
      'Nada en estos términos pretende excluir responsabilidades que legalmente no puedan excluirse.'
    ]
  },
  {
    id: 'emergencias',
    title: 'T) Prohibición de uso en emergencias',
    body: [
      'MedSync no debe usarse como sistema único para emergencias médicas, urgencias o situaciones donde una falla tecnológica pueda poner en riesgo inmediato la salud o vida.',
      'El consultorio debe contar con procedimientos alternos.'
    ]
  },
  {
    id: 'cambios',
    title: 'U) Cambios a los términos',
    body: [
      'MedSync podrá actualizar estos términos. Los cambios se publicarán en esta ruta.',
      'Si son cambios relevantes, se podrán notificar por medios razonables. El uso continuo implica aceptación cuando legalmente proceda.'
    ]
  },
  {
    id: 'jurisdiccion',
    title: 'V) Legislación aplicable y jurisdicción',
    body: [
      MEDSYNC_APPLICABLE_LAW,
      `Jurisdicción o tribunales competentes: ${MEDSYNC_JURISDICTION}. No debe publicarse una ciudad, estado o tribunal sin asesoría legal.`
    ]
  },
  {
    id: 'contacto',
    title: 'W) Contacto',
    body: [
      `Proveedor: ${MEDSYNC_LEGAL_NAME}.`,
      `Correo legal/soporte: ${MEDSYNC_LEGAL_EMAIL}. Teléfono: ${MEDSYNC_LEGAL_PHONE}.`,
      `Domicilio legal: ${MEDSYNC_LEGAL_ADDRESS}.`
    ]
  }
];
