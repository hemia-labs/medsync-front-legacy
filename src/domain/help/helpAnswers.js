// Editorial drafts; question IDs and related guides live in helpIndex.js.
export const helpAnswers = {
  'preparacion-pendiente': [
    'Terminar de leer la guía no guarda la configuración. La preparación comprueba los datos guardados y los requisitos de cada tarea.',
    'Revisa que hayas guardado los cambios y selecciona Actualizar preparación. Si sigue pendiente, consulta el requisito indicado; algunos dependen del perfil o de una autorización de la administración.'
  ],
  'perfil-autorizacion': [
    'No. Completar tu identidad y firma es distinto de recibir autorización como doctor emisor o firmante profesional.',
    'La administración revisa esas autorizaciones en Personal y usuarios. También deben cumplirse los permisos y requisitos del formato y de la operación.'
  ],
  'preparacion-responsable': [
    'Pide a quien administra el consultorio que revise el requisito indicado desde su cuenta. Leer el tutorial o completar otro pendiente no te concede ese acceso.',
    'Cuando se guarde la configuración necesaria, vuelve a consultar la preparación. Puedes avanzar con las tareas disponibles para tu cuenta.'
  ],
  'sin-horarios': [
    'Comprueba el doctor y la fecha seleccionados. La disponibilidad depende de que el perfil esté activo, de sus horarios, de los bloqueos y cierres del consultorio y de las citas que ya ocupan espacios.',
    'Revisa también la zona horaria. Próximo libre busca dentro de un periodo de 30 días; que no encuentre un espacio no significa que no exista disponibilidad después de ese periodo. Si aparece un error de carga, reintenta antes de cambiar la configuración.'
  ],
  'agenda-cerrada': [
    'Las citas ya guardadas se conservan. Cerrar horarios o bloquear fechas no cancela automáticamente esas citas.',
    'Consulta la lista y el historial de la agenda: una cita puede aparecer fuera del horario actual. Si necesita cambiarse o cancelarse, revisa esa reserva por separado.'
  ],
  'cita-reprogramada': [
    'Es el registro del horario anterior. Al reprogramar, se conserva la cita original como Reprogramada y se crea la reserva que la reemplaza.',
    'Usa Ver cita destino para consultar la nueva reserva y Ver cita original para revisar de dónde proviene. El registro original queda para consulta.'
  ],
  'cita-sin-confirmacion': [
    'Si el mensaje indica que no se confirmó el resultado, usa Reintentar operacion en la misma captura antes de crear otra reserva.',
    'Si dice que la cita se guardó pero falló la actualización de la vista, usa Reintentar en la agenda para recargarla. Comprueba paciente, doctor, fecha, hora y estado antes de dar la reserva por terminada.'
  ],
  'paciente-archivado': [
    'No. Archivar retira al paciente de la búsqueda habitual, pero conserva su expediente y sus citas. Tampoco cancela las citas existentes.',
    'Con el acceso correspondiente, activa Incluir archivados en Pacientes, abre la ficha y usa Restaurar paciente. Mostrar los archivados no los restaura por sí solo.'
  ],
  'acceso-historia': [
    'Consultar la ficha administrativa y consultar la historia clínica son accesos diferentes. La historia requiere permisos de consulta clínica y de datos sensibles, además del acceso clínico correspondiente al paciente.',
    'Pide a la administración que revise tus accesos. No crees otro expediente para intentar abrir la información. Si aparece un error de carga, usa Reintentar antes de concluir que se trata de un problema de permisos.'
  ],
  'intake-historia': [
    'No. La captura inicial guarda lo que refiere el paciente como borrador para que el doctor lo revise y complete.',
    'No finaliza la historia ni firma documentos. El cierre requiere los accesos y requisitos clínicos indicados en la pantalla.'
  ],
  'historia-bloqueada': [
    'Revisa la lista del diálogo de finalización: usuario autorizado, doctor responsable, consentimiento de datos personales sensibles y campos obligatorios del formato. También debe haber terminado la carga de esos requisitos y la historia debe estar en borrador.',
    'Usa Ir a datos pendientes o Revisar consentimiento según el aviso. Una negativa registrada permite el cierre como incompleta; no equivale a consentimiento firmado ni debe usarse para sustituir una firma pendiente. Una versión ya cerrada es de consulta y los cambios se registran en una nueva versión.'
  ],
  'alergias-estado': [
    'No. No encontrar una alergia registrada no confirma que el paciente no tenga alergias. En la revisión, Sin alergias conocidas y No se pudo confirmar son estados distintos.',
    'Registra el resultado de la revisión con el paciente. Con alergias registradas requiere el detalle; No se pudo confirmar requiere el motivo y mantiene el aviso de información pendiente de aclarar.'
  ],
  'seguimiento-reserva': [
    'No. La fecha sugerida y el próximo procedimiento describen el seguimiento; por sí solos no reservan un espacio.',
    'Para reservar desde ese flujo necesitas Agendar próxima cita, doctor, fecha, horario disponible y un guardado confirmado. Comprueba la reserva en Historial de citas. Si el seguimiento se guardó pero falló la cita, usa Reintentar cita sin registrar otro seguimiento.'
  ],
  'odontograma-visible': [
    'Estas secciones dependen de los módulos habilitados para el consultorio y de los permisos de tu cuenta. El estado archivado del paciente también puede limitar las secciones disponibles.',
    'Pide a la administración que revise la configuración y tus accesos. No cambies el estado del paciente ni crees otra ficha solo para intentar mostrar una sección.'
  ],
  'receta-borrador': [
    'Un borrador conserva la captura para revisarla y completarla; todavía no es una receta emitida. La emisión requiere revisar el contenido y confirmar la operación con los permisos y requisitos correspondientes.',
    'Comprueba el estado Emitida antes de imprimir o entregar la receta. Una receta emitida conserva los datos de su emisión; cambiar después el perfil o formato no la corrige.'
  ],
  'receta-no-emite': [
    'Guardar un borrador y emitir una receta tienen permisos y requisitos distintos. Revisa el doctor emisor, su perfil, su autorización para emitir y la preparación de su formato de recetas.',
    'Consulta los avisos de la pantalla y pide a la administración que revise lo que no puedes resolver desde tu cuenta. Guardar varias veces el borrador no concede autorización para emitir.'
  ],
  'plantilla-documento': [
    'No. La plantilla es el formato que se usará para crear documentos. Guardarla o activarla no crea un documento en el expediente ni recoge firmas.',
    'Abre Documentos y firmas del paciente, crea el documento desde una plantilla activa y revisa sus datos. Después comprueba las firmas y el estado que correspondan.'
  ],
  'documento-pendiente': [
    'Revisa el resumen de firmas completadas y pendientes. El formato puede requerir más de una firma; una captura parcial no completa necesariamente el documento.',
    'Compartir un enlace, abrir WhatsApp o mostrar la vista previa no equivale a una firma guardada. Consulta el resultado de la operación y el estado del documento antes de repetirla.'
  ],
  'negativa-firma': [
    'Cuando corresponde registrar una negativa y tienes la acción disponible, captura su motivo. El documento se conserva con el estado No firmado por negativa; no se presenta como firmado.',
    'No registres una negativa para resolver un enlace fallido o una firma que aún no llega. En la historia clínica, una negativa registrada tiene un resultado de cierre distinto: la versión queda incompleta.'
  ],
  'puesto-autorizacion': [
    'No. El puesto define los accesos compartidos por las personas que lo tienen. Las autorizaciones profesionales permiten a un doctor actuar como emisor de recetas o firmante profesional.',
    'Se revisan por separado en Puestos y accesos y en Personal y usuarios. Modificar los accesos de un puesto afecta a todas las personas con ese puesto; no sustituye la preparación del perfil del doctor.'
  ],
  'plantilla-version': [
    'Guardar una nueva versión de la plantilla no reescribe las historias existentes. Cada historia conserva la versión del formato con la que se creó.',
    'Comprueba el formato y la versión que muestra la historia antes de capturar. Aplicar cambios dentro del editor de plantilla solo modifica el borrador local; falta Guardar nueva versión para conservarlos.'
  ],
  'codigo-recuperacion': [
    'El código se envía al correo asociado a tu cuenta, aunque inicies la recuperación con tu teléfono. Revisa ese correo y la carpeta de no deseado; no esperes un SMS.',
    'Comprueba el teléfono ingresado y el aviso de envío. Cuando la pantalla lo permita, usa Reenviar código. Si no tienes acceso al correo registrado o el envío sigue fallando, solicita ayuda a la administración. No compartas contraseñas ni códigos.'
  ],
  'codigo-vencido': [
    'Solicita otro código desde Reenviar código cuando el control esté disponible. Si la pantalla indica una espera, deja que termine antes de volver a solicitarlo.',
    'Usa el código del envío más reciente y continúa la verificación. Recibir un código no cambia la contraseña: todavía necesitas completar y confirmar la nueva contraseña.'
  ]
};
