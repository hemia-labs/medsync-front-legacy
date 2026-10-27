// Local editorial drafts. Plain text only; no HTML or automatic product actions.
// «…» marks a visible interface label (button, field, screen); HelpCenter renders it as a chip.
export const helpArticles = {
  'preparar-receta': {
    summary: 'Prepara una receta, revisa sus datos y emítela con el doctor autorizado.',
    sections: [
      { id: 'abrir-receta', title: 'Revisa el paciente y el doctor', paragraphs: ['Abre el expediente correcto, entra a «Recetas» y selecciona «Nueva receta». Comprueba la identidad del paciente, «Doctor emisor» y «Fecha de receta».', 'La emisión requiere permisos, perfil profesional y autorización del doctor, además de su formato de recetas preparado. Si aparece un requisito pendiente, resuélvelo antes de emitir. La cuenta de un doctor puede tener su emisor fijo.'] },
      { id: 'capturar-receta', title: 'Completa y guarda el borrador', steps: ['Captura los campos obligatorios de cada medicamento conforme a la indicación del profesional. Usa «Agregar medicamento» para incluir otro.', 'Agrega «Indicaciones para el paciente» cuando corresponda. Presentación, concentración y otros detalles se despliegan desde su control; «Diagnóstico» y notas generales son opcionales.', 'Selecciona «Guardar borrador» y comprueba que la receta aparezca como borrador.'], paragraphs: ['La captura no se guarda solo por escribir. «Guardar borrador» conserva el trabajo, pero todavía no emite la receta.'] },
      { id: 'emitir', title: 'Revisa y confirma la emisión', steps: ['Selecciona «Revisar y emitir» y comprueba paciente, doctor, fecha, medicamentos e indicaciones.', 'Si necesitas corregir algo, usa «Volver a editar». Cuando la información sea correcta, selecciona «Confirmar emisión».', 'Comprueba que la receta quede emitida antes de imprimir o entregarla.'], paragraphs: ['Si falla la operación, revisa el mensaje y el estado guardado antes de repetirla. No supongas que un borrador se emitió porque se cerró la ventana.'] }
    ]
  },
  'consultar-receta': {
    summary: 'Localiza una receta emitida y abre su impresión.',
    sections: [
      { id: 'localizar', title: 'Localiza la receta correcta', steps: ['Abre el expediente del paciente y entra a «Recetas».', 'Revisa los registros y elige la receta por sus datos y estado. Abre su vista previa.', 'Comprueba paciente, doctor, fecha y contenido antes de imprimir.'], paragraphs: ['La vista previa permite revisar el documento; no cambia un borrador a emitido. Las acciones disponibles dependen de tus permisos y del estado de la receta.'] },
      { id: 'imprimir', title: 'Imprime la receta emitida', steps: ['Selecciona «Imprimir» en la receta emitida.', 'Revisa la ventana de impresión, el destino y las páginas antes de confirmar la impresión.', 'Cierra la vista previa cuando termines.'], paragraphs: ['Si el navegador bloquea la ventana, revisa su aviso y vuelve a abrir la impresión. Si falla la consulta del documento, reintenta antes de entregar una copia.', 'La receta emitida conserva la información de su emisión. Cambiar después el perfil o formato del doctor no equivale a corregir esa receta.'] }
    ]
  },
  'cancelar-receta': {
    summary: 'Cancela una receta emitida y registra el motivo sin confundirlo con cerrar la ventana.',
    sections: [
      { id: 'revisar', title: 'Comprueba qué receta vas a cancelar', paragraphs: ['Abre «Recetas» dentro del expediente y revisa paciente, fecha, doctor y contenido de la receta emitida. La acción «Cancelar» requiere el permiso correspondiente.', 'Si solo quieres salir de la vista previa, usa su control de cierre. «Cancelar receta» cambia el estado del registro.'] },
      { id: 'cancelar', title: 'Registra el motivo y confirma', steps: ['Selecciona «Cancelar» en la receta emitida.', 'Escribe el motivo en el diálogo y vuelve a comprobar que elegiste la receta correcta.', 'Confirma «Cancelar receta». Si decides no hacerlo, selecciona «Cerrar».', 'Comprueba que el registro aparezca cancelado.'], paragraphs: ['La cancelación queda registrada; no retira copias que ya se hayan impreso o entregado. Si el resultado no se confirma, consulta el estado antes de repetir la operación.'] }
    ]
  },
  'documento-paciente': {
    summary: 'Crea un documento del paciente usando una plantilla activa del consultorio.',
    sections: [
      { id: 'preparar', title: 'Elige la plantilla y el responsable', steps: ['Abre el expediente correcto y entra a «Documentos y firmas». Selecciona «Crear documento».', 'Selecciona «Plantilla» y revisa el tipo de documento. Si no hay una plantilla activa adecuada, solicita su preparación en «Configuración → Documentos y consentimientos».', 'Revisa «Doctor responsable» y completa los datos adicionales que pida el formato.'], paragraphs: ['Si firmará un tutor o representante, indícalo y completa su nombre y relación cuando se soliciten. No sustituyas la identidad del paciente por la del representante.'] },
      { id: 'crear', title: 'Guarda el documento y revisa el resultado', steps: ['Revisa el contenido antes de continuar.', 'Usa «Guardar borrador» para conservarlo pendiente, o «Vista previa y firmar» para pasar a la revisión y firma.', 'Comprueba el documento y su estado en el histórico del paciente.'], paragraphs: ['Crear el documento no significa que todas sus firmas estén completas. Si aparece un aviso de documento abierto existente, usa «Continuar con el existente» y revísalo antes de generar otro.', 'Si falla la carga o el guardado, revisa el mensaje y el histórico antes de repetir la creación.'] }
    ]
  },
  'firmar-documento': {
    summary: 'Revisa las firmas requeridas y utiliza la opción disponible para cada persona que debe firmar.',
    sections: [
      { id: 'revisar-firmas', title: 'Comprueba el documento y las firmas pendientes', paragraphs: ['En «Documentos y firmas», abre el documento correcto y revisa paciente, contenido, responsable y resumen de firmas pendientes. Selecciona «Firmar» cuando esté disponible.', 'Las firmas dependen del formato y del estado del documento. Tener una firma guardada en el perfil no sustituye la autorización profesional ni las firmas pendientes del paciente, tutor o testigos.'] },
      { id: 'firma-local', title: 'Recoge la firma en este dispositivo', steps: ['Elige «Firmar aquí» cuando la persona correspondiente esté presente.', 'Permite que revise el documento. Si firma un tutor, comprueba su nombre y relación en los campos disponibles.', 'La persona debe realizar su propia firma en el área indicada. Revisa la captura y selecciona «Guardar firma y finalizar documento».', 'Comprueba el estado y las firmas que todavía estén pendientes.'], paragraphs: ['El nombre del botón no sustituye la comprobación del resultado: revisa si se completaron todas las firmas requeridas.'] },
      { id: 'firma-remota', title: 'Revisa las opciones de firma a distancia', paragraphs: ['Las opciones de firma permiten elegir el canal disponible y la «Firma solicitada». Comprueba el destinatario antes de compartir un enlace.', '«Enviar por WhatsApp» genera un enlace y abre un mensaje prellenado; abrir WhatsApp no confirma que el mensaje se haya enviado ni que el documento esté firmado.', 'Después, consulta el estado del documento. Una negativa de firma registrada es distinta de una firma y requiere su motivo; no la uses para resolver un envío fallido.'] }
    ]
  },
  'revisar-documentos': {
    summary: 'Consulta el histórico y distingue documentos pendientes, firmados, cancelados o con negativa de firma.',
    sections: [
      { id: 'consultar', title: 'Revisa el histórico del paciente', steps: ['Abre «Documentos y firmas» en el expediente correcto.', 'Usa los filtros por estado para localizar los registros y recorre las páginas cuando estén disponibles.', 'Revisa título, tipo, origen y doctor responsable. Abre el documento que necesitas consultar.'], paragraphs: ['Si no hay resultados en un filtro, cambia el filtro antes de concluir que no existen documentos. Si falla la carga, usa «Reintentar carga».'] },
      { id: 'interpretar', title: 'Comprueba el estado y las firmas', items: ['Un borrador o documento pendiente todavía requiere acciones antes de considerarlo terminado.', 'Revisa «Firmas completadas» y las pendientes: un enlace compartido o una firma parcial no confirma todas las firmas.', 'Un documento con negativa conserva el motivo registrado; no equivale a uno firmado.', 'Un documento cancelado conserva ese estado en el histórico.'], paragraphs: ['Consulta el texto del estado, no solo el color. Imprimir o «Descargar PDF» permiten obtener una copia cuando estén disponibles; no cambian el estado del documento.'] }
    ]
  },
  'agregar-equipo': {
    summary: 'Crea el acceso de una persona con el puesto que corresponde a su trabajo.',
    sections: [
      { id: 'preparar', title: 'Revisa los usuarios antes de agregar otro', paragraphs: ['Entra a «Configuración → Personal y usuarios» con una cuenta autorizada. Busca a la persona antes de crear otro acceso.', 'Revisa los cupos y avisos de licencia disponibles. El puesto determina los accesos; no elijas uno más amplio solo para completar el alta.'] },
      { id: 'registrar', title: 'Completa y guarda el usuario', steps: ['Selecciona «Agregar personal».', 'Captura «Nombre», «Teléfono» de 10 dígitos y «Correo».', 'Selecciona «Puesto» y revisa sus accesos. Captura la «Contraseña inicial».', 'Selecciona «Guardar usuario» y comprueba que aparezca en el listado con el puesto correcto.'], paragraphs: ['Si no se confirma el alta, conserva la captura y revisa el listado antes de crear otro usuario. Sigue el aviso de comprobación del guardado.', 'Los profesionales completan su identidad y firma desde su propia cuenta. Crear el usuario no sustituye las autorizaciones para emitir recetas o firmar documentos.'] }
    ]
  },
  'revisar-accesos': {
    summary: 'Comprueba qué puede hacer cada puesto y guarda únicamente los cambios que correspondan.',
    sections: [
      { id: 'consultar', title: 'Selecciona el puesto que vas a revisar', steps: ['Entra a «Configuración → Puestos y accesos» con una cuenta autorizada.', 'Selecciona un puesto y revisa las categorías de accesos.', 'Usa «Buscar un acceso» para localizar una tarea, como citas, recetas o costos.'], paragraphs: ['Los cambios afectan a todas las personas que tienen ese puesto. Para revisar el puesto asignado a una persona, consulta «Personal y usuarios».'] },
      { id: 'guardar', title: 'Revisa el alcance antes de guardar', steps: ['Activa o desactiva solo los accesos que corresponden al trabajo del puesto.', 'Comprueba el puesto seleccionado y los cambios pendientes.', 'Selecciona «Guardar cambios» y espera la confirmación. Vuelve a revisar los accesos guardados.'], paragraphs: ['Mover un interruptor prepara un cambio; todavía falta guardarlo. Si hay un error, conserva la edición y sigue el aviso antes de salir.', 'Los accesos del puesto no sustituyen las autorizaciones profesionales, los módulos habilitados ni las restricciones del estado de un registro.'] }
    ]
  },
  'autorizaciones-profesionales': {
    summary: 'Revisa por separado si un doctor puede emitir recetas y actuar como firmante profesional.',
    sections: [
      { id: 'elegir-doctor', title: 'Abre al profesional correcto', paragraphs: ['En «Configuración → Personal y usuarios», localiza al doctor y abre su edición. Comprueba nombre y puesto antes de cambiar sus autorizaciones.', 'Si no tiene un perfil profesional guardado, debe completarlo desde «Mi perfil profesional» en su propia cuenta. Este apartado administra autorizaciones; no sustituye la captura de identidad y firma.'] },
      { id: 'autorizar', title: 'Guarda las autorizaciones que correspondan', steps: ['Revisa «Autorizado como doctor emisor» y «Autorizado como firmante profesional».', 'Activa únicamente las autorizaciones que corresponden al profesional.', 'Selecciona «Guardar cambios» en la edición del usuario y espera el resultado.', 'Vuelve a revisar las autorizaciones guardadas. Si el contacto se guardó pero falta confirmar el perfil, sigue el aviso antes de dar la tarea por terminada.'], paragraphs: ['Autorizar no emite recetas ni firma documentos automáticamente. Para usarlas se revisan también perfil, firma, formato y permisos de la operación.'] }
    ]
  },
  'formatos-documentos': {
    summary: 'Prepara una plantilla que el consultorio pueda usar para crear documentos de pacientes.',
    sections: [
      { id: 'elegir-formato', title: 'Revisa el tipo de documento', paragraphs: ['Entra a «Configuración → Documentos y consentimientos». Revisa las plantillas existentes y abre la creación o edición del formato que necesitas.', 'Distingue el consentimiento general, el de datos personales sensibles y el del plan de tratamiento. Un formato no sustituye automáticamente a otro. El contenido debe revisarse antes de usarlo con pacientes.'] },
      { id: 'preparar-contenido', title: 'Completa el contenido y las firmas requeridas', steps: ['Completa «Nombre del formato» y revisa «Tipo de documento» y «Clasificación del formato».', 'Edita el «Contenido del documento». Usa los datos automáticos disponibles cuando necesites información del paciente o del consultorio.', 'Revisa las firmas requeridas: paciente, tutor o representante, doctor y testigos, según corresponda.', 'Comprueba la vista previa y marca «Plantilla activa» solo cuando deba estar disponible para crear documentos.'], paragraphs: ['La edición con apoyo técnico es una opción separada; no es necesaria para completar un formato desde los controles habituales. Una vista previa no confirma el guardado.'] },
      { id: 'guardar', title: 'Guarda y comprueba la versión', steps: ['Selecciona «Crear plantilla» si es nueva o «Guardar nueva versión» si estás editando una existente.', 'Espera la confirmación y revisa el formato y su estado en el listado.'], paragraphs: ['Guardar una plantilla no crea ni firma documentos para pacientes. Conserva el control de versiones y revisa cuál se utilizará antes de generar un documento.'] }
    ]
  },
  'formato-receta': {
    summary: 'Prepara los datos de contacto y la presentación de las recetas del doctor seleccionado.',
    sections: [
      { id: 'seleccionar', title: 'Elige el doctor cuyo formato revisarás', paragraphs: ['Entra a «Configuración» y abre «Mis recetas» o «Recetas por doctor», según tus accesos. Revisa «Configuración de recetas del doctor» antes de editar.', 'Si no aparece un doctor, revisa el aviso de perfil activo. Si falla la consulta, usa «Reintentar» antes de cambiar datos.'] },
      { id: 'configurar', title: 'Completa el contacto y revisa la vista previa', steps: ['Completa «Teléfono de contacto» y «Domicilio completo del consultorio». El teléfono admite de 10 a 15 dígitos con los separadores indicados.', 'Revisa «Consultorio o clínica» y «Plantilla». Ajusta las opciones visibles de universidad, especialidad y nota inferior cuando correspondan.', 'Comprueba la vista previa y selecciona «Guardar recetas».', 'Espera la confirmación y revisa que los datos se hayan conservado.'], paragraphs: ['Los controles modifican la vista previa; solo «Guardar recetas» conserva el formato. La emisión también requiere perfil y autorización del doctor.', 'La configuración no cambia por sí sola una receta emitida anteriormente.'] }
    ]
  },
  'formato-historia': {
    summary: 'Revisa las secciones y campos del formato usado para crear historias clínicas.',
    sections: [
      { id: 'revisar', title: 'Consulta la plantilla actual', steps: ['Entra a «Configuración → Plantilla de historia clínica».', 'Revisa el nombre, la versión y el estado de la plantilla.', 'Selecciona una sección para consultar sus campos y usa la vista previa para revisar su presentación.'], paragraphs: ['La plantilla base se conserva. Las posibilidades de personalización dependen del acceso y de las restricciones que muestra la pantalla.'] },
      { id: 'personalizar', title: 'Distingue la edición local de una versión guardada', paragraphs: ['Si tienes disponible Personalizar plantilla, puedes preparar una versión propia. Revisa secciones, campos y requisitos; algunos campos del sistema no permiten cambios.', 'Aplicar dentro de un editor solo actualiza el borrador local. Después necesitas «Guardar nueva versión» para conservarlo.', 'Comprueba la versión resultante y sus campos. Los cambios no modifican las historias ya finalizadas; revisa el formato que muestra cada historia antes de capturar.'] }
    ]
  },
  'recuperar-acceso': {
    summary: 'Solicita un código al correo de tu cuenta para recuperar el acceso desde la pantalla de inicio de sesión.',
    sections: [
      { id: 'solicitar-codigo', title: 'Solicita el código de recuperación', steps: ['En «Iniciar sesión», selecciona «Olvidé mi contraseña».', 'Captura el teléfono asociado a tu cuenta y selecciona «Enviar código».', 'Revisa el correo asociado a la cuenta y sigue la pantalla de verificación para introducir el código.'], paragraphs: ['El teléfono identifica la cuenta; el código se entrega por correo, no por SMS. Revisa también la carpeta de correo no deseado. Si no tienes acceso al correo registrado, solicita ayuda a la administración.'] },
      { id: 'restablecer', title: 'Confirma una nueva contraseña', steps: ['Después de verificar el código, captura la nueva contraseña y repítela.', 'Cumple los requisitos que muestra la pantalla y selecciona «Actualizar contraseña».', 'Espera la confirmación y vuelve a iniciar sesión con la nueva contraseña.'], paragraphs: ['Un código solicitado o recibido no cambia la contraseña por sí solo. Si aparece un error o el código ya no sirve, sigue el aviso de la pantalla antes de volver a intentarlo.', 'No compartas el código de recuperación ni tu contraseña con otras personas.'] }
    ]
  },
  'cambiar-contrasena': {
    summary: 'Cambia la contraseña de tu cuenta con la contraseña actual y un código de verificación por correo.',
    sections: [
      { id: 'preparar', title: 'Captura la contraseña actual y la nueva', steps: ['Entra a «Configuración → Cambiar contraseña».', 'Completa «Contraseña actual», «Nueva contraseña» y «Confirmar nueva contraseña».', 'Usa una nueva contraseña de 8 a 128 caracteres, con al menos una letra y un número. Comprueba que ambas capturas coincidan.', 'Selecciona «Enviar código» de verificación y revisa el correo indicado.'], paragraphs: ['Si olvidaste la contraseña actual, usa la recuperación desde «Iniciar sesión». «Limpiar campos» borra la captura del formulario; no cambia la contraseña guardada.'] },
      { id: 'confirmar', title: 'Confirma el cambio con el código', steps: ['Introduce los seis dígitos del código recibido antes del vencimiento que indica la pantalla.', 'Selecciona Confirmar cambio y espera el mensaje de actualización correcta.', 'Si necesitas otro código, usa «Reenviar código» y sigue el resultado que muestre el formulario.'], paragraphs: ['La contraseña actual sigue vigente hasta que se confirma el cambio. Si hay un error, no des por actualizado el acceso: revisa el mensaje y vuelve a intentarlo según lo indicado.', 'No compartas el código ni la nueva contraseña.'] }
    ]
  },
  'captura-inicial': {
    summary: 'Guarda lo que refiere el paciente para que el doctor revise y complete la historia clínica.',
    sections: [
      { id: 'abrir-captura', title: 'Abre la captura inicial', paragraphs: ['Busca al paciente, comprueba su identidad y entra a «Historia clínica». Si tu cuenta tiene acceso de captura inicial y no de consulta clínica completa, verás «Motivo y relato del paciente».', 'Si aparece un aviso de captura cerrada o no editable, respétalo y pide revisión al personal clínico. No crees otra ficha para continuar.'] },
      { id: 'registrar-relato', title: 'Registra el relato y el doctor que lo revisará', steps: ['Selecciona Doctor que revisará el borrador. Si ya está asignado y el campo no permite cambios, su modificación corresponde al editor clínico autorizado.', 'Completa los campos disponibles: «Motivo de consulta» referido por el paciente, «Relato del padecimiento actual», «Tiempo de evolución referido» y «Síntomas referidos» por el paciente.', 'Revisa la captura y selecciona «Guardar borrador». Espera el mensaje que confirma para qué doctor se guardó.'], paragraphs: ['Captura lo que refiere la persona sin convertirlo en un diagnóstico. Los campos disponibles pueden variar según la configuración. Si el doctor asignado ya no está disponible, solicita su cambio antes de guardar.', 'Esta captura no finaliza la historia ni firma documentos. El doctor debe revisarla y completar los apartados clínicos.'] },
      { id: 'conservar-captura', title: 'Revisa los avisos antes de salir', paragraphs: ['Si falla la carga, usa «Reintentar». Si falla el guardado, conserva la captura y revisa el mensaje antes de intentarlo otra vez.', 'Si otra sesión cambió el borrador, «Cargar versión actual» pide descartar tu edición antes de traer los datos nuevos. Revisa lo que necesitas conservar antes de elegir «Descartar y cargar».', 'Al salir con cambios, puedes elegir «Guardar y salir», «Descartar cambios» o «Seguir editando». Espera la confirmación de guardado antes de dar la tarea por terminada.'] }
    ]
  },
  'alergias-paciente': {
    summary: 'Revisa el estado de alergias y guarda la información confirmada o el motivo por el que sigue pendiente.',
    sections: [
      { id: 'abrir-revision', title: 'Abre la revisión de alergias', paragraphs: ['Abre el expediente correcto y revisa el aviso de alergias. Selecciona «Actualizar» en ese aviso o «Revisar alergias» dentro del borrador de historia clínica.', 'La edición requiere acceso clínico autorizado y un paciente activo. Si no aparece el control, pide apoyo a quien pueda revisar esta información.'] },
      { id: 'registrar-estado', title: 'Elige el estado y completa el detalle', steps: ['Revisa la información con el paciente y selecciona «Con alergias registradas», «Sin alergias conocidas» o «No se pudo confirmar», según corresponda a la revisión.', 'Para «Con alergias registradas», completa «Alergias y detalles conocidos». Para «No se pudo confirmar», escribe el «Motivo por el que no se pudo confirmar».', 'Selecciona «Guardar alergias» y comprueba el estado y el texto en el expediente.'], paragraphs: ['Una respuesta pendiente no equivale a «Sin alergias conocidas». Si aparece un dato previo de la historia pendiente de revisión, revísalo antes de guardar.', 'La información se comparte con el expediente y los borradores de historia clínica. No asumas que modifica el contenido de una versión ya cerrada.'] },
      { id: 'resolver-conflicto', title: 'Compara los cambios si otra persona ya guardó', paragraphs: ['Si aparece un conflicto, usa «Consultar estado actual». Compara ese estado con tu captura antes de elegir «Usar estado actual» o «Conservar mi captura».', '«Conservar mi captura» permite revisarla y volver a guardar; no confirma por sí solo el cambio. Si falla el guardado, el texto se conserva en la ventana. Cancelar cierra sin guardar esa edición.'] }
    ]
  },
  'historia-clinica': {
    summary: 'Prepara un borrador, revisa los requisitos y cierra la historia clínica cuando corresponda.',
    sections: [
      { id: 'iniciar-historia', title: 'Abre o inicia el borrador', steps: ['Abre el expediente y entra a «Historia clínica». Comprueba el paciente y espera a que carguen la historia, el formato y los responsables.', 'Si todavía no hay historia, selecciona «Crear historia clínica». Elige «Crear en blanco» o «Usar datos del expediente» y revisa el formato indicado.', 'Selecciona Continuar para guardar el borrador inicial. Si ya existe uno, continúa con ese borrador.'], paragraphs: ['«Crear en blanco» incluye la identificación del paciente y deja vacía la captura clínica. «Usar datos del expediente» aporta información como punto de partida; revísala antes de conservarla.', 'Ver, editar y finalizar requieren accesos distintos. Si falla la carga, reintenta antes de iniciar otra historia.'] },
      { id: 'guardar-avances', title: 'Completa el formato y guarda los avances', steps: ['Revisa «Doctor responsable» y selecciona al profesional que revisará y finalizará la historia.', 'Completa los apartados del formato con la información de la atención. Revisa los campos obligatorios y el estado de alergias.', 'Selecciona «Guardar borrador» y comprueba que no queden errores de guardado. Puedes continuar después sin finalizar todavía.'], paragraphs: ['El formato determina los campos que necesitas completar. Usa los avisos de campos pendientes para ubicarlos; no sustituyas información faltante por texto de relleno.', 'Si aparece un conflicto con otra sesión, puedes usar «Descargar mi captura» antes de «Cargar versión actual». Esa copia local no sustituye una historia guardada.'] },
      { id: 'revisar-cierre', title: 'Revisa los requisitos para finalizar', paragraphs: ['En el apartado Consentimiento de datos personales sensibles, revisa su estado. «Gestionar consentimiento» permite continuar el flujo correspondiente según tus accesos. Si falta el formato, la administración debe prepararlo en «Configuración → Documentos y consentimientos».', 'Antes del cierre, el sistema comprueba usuario autorizado, doctor responsable, consentimiento y datos obligatorios. Tener permiso de captura no significa poder finalizar. Revisa los avisos de preparación del perfil profesional si aparecen.', 'Una negativa registrada no equivale a consentimiento firmado: en ese caso la acción se llama «Marcar incompleta» y la versión queda incompleta. No registres una negativa como sustituto de una firma pendiente.'] },
      { id: 'finalizar', title: 'Confirma el cierre de la versión', steps: ['Selecciona «Finalizar historia clínica» y revisa la lista de requisitos del diálogo.', 'Si falta información, usa «Ir a datos pendientes» o «Revisar consentimiento». Corrige lo indicado antes de continuar.', 'Cuando todo corresponda, confirma «Finalizar historia clínica», o «Marcar incompleta» si existe una negativa registrada y ese es el cierre que procede.', 'Comprueba el estado de la historia y la versión que quedó registrada.'], paragraphs: ['Al cerrar, la versión queda bloqueada para edición. Los cambios posteriores se trabajan en una nueva versión; no se sobrescribe la anterior.', 'Si el resultado no se confirma, revisa el aviso y consulta el estado guardado antes de repetir el cierre. Al salir con cambios de borrador, revisa las opciones de guardar, descartar o seguir editando.'] }
    ]
  },
  'consultar-historia': {
    summary: 'Localiza una versión de la historia clínica y distingue un borrador editable de una versión cerrada.',
    sections: [
      { id: 'abrir-versiones', title: 'Abre el historial de versiones', steps: ['Busca al paciente, comprueba su identidad y abre «Historia clínica».', 'Selecciona «Ver Historial» o «Ver versiones», según el estado de la pantalla.', 'Revisa la versión, el estado, las fechas y el doctor responsable para localizar el registro que necesitas.'], paragraphs: ['La consulta depende de tus permisos de historia clínica y versiones. Si no aparece el historial o falla la carga, revisa el aviso; no interpretes esa situación como ausencia de registros.'] },
      { id: 'consultar-version', title: 'Consulta la versión seleccionada', steps: ['Selecciona «Ver versión». Si es un borrador editable y tienes acceso, el control puede decir «Continuar edición».', 'Comprueba el estado y el número de versión antes de leer o editar.', 'Si necesitas imprimir y tienes disponible la acción, usa «Imprimir historia clínica» para la versión correspondiente. Un borrador se identifica como tal.'], paragraphs: ['Las versiones cerradas son de consulta. El doctor responsable y el consentimiento utilizados en el cierre corresponden a ese registro histórico; no asumas que reflejan los datos actuales del perfil.'] },
      { id: 'nueva-version', title: 'Continúa el registro sin sobrescribir el anterior', paragraphs: ['Cuando necesites registrar cambios y la acción esté disponible, selecciona «Crear nueva versión» y revisa la confirmación. Se crea un borrador basado en la última historia y se conserva la anterior.', 'Antes de escribir, comprueba qué versión se abrió. Crear una nueva versión no la finaliza; debes revisar y guardar su contenido y completar el cierre cuando corresponda.'] }
    ]
  },
  'seguimiento': {
    summary: 'Registra la atención de seguimiento y, si corresponde, reserva una próxima cita con doctor y horario.',
    sections: [
      { id: 'capturar-seguimiento', title: 'Registra el seguimiento', steps: ['Abre el expediente correcto y entra a «Seguimiento». Selecciona «Nuevo seguimiento».', 'Revisa «Fecha» actual y completa «Tratamiento realizado». Puedes escribirlo o seleccionarlo cuando el control esté disponible.', 'Completa «Próximo procedimiento o indicación» y agrega «Notas» si corresponde.'], paragraphs: ['El próximo procedimiento o indicación es obligatorio. Usa una descripción que corresponda a lo indicado; la pantalla admite opciones como «Revisión de rutina» o «Sin retorno previsto». Ese texto no agenda una cita.'] },
      { id: 'proxima-cita', title: 'Decide si también reservarás una cita', steps: ['Si necesitas reservar y tienes acceso a «Agenda», activa «Agendar próxima cita» (opcional).', 'Elige Doctor de la proxima cita, fecha y un horario disponible. Revisa la reserva antes de guardar.', 'Si solo vas a registrar el seguimiento, deja desmarcada esa opción. Selecciona «Guardar».'], paragraphs: ['Una fecha sugerida de próxima atención no equivale a una cita reservada. Sin acceso a «Agenda» puedes guardar el seguimiento y pedir a recepción que programe la cita.', 'La cita creada desde este flujo queda pendiente de confirmar. Consulta «Historial de citas» para comprobar el horario y el estado efectivos.'] },
      { id: 'verificar-seguimiento', title: 'Comprueba por separado el seguimiento y la cita', paragraphs: ['Revisa que el seguimiento aparezca en la lista. Si solicitaste cita, comprueba también su registro vinculado y el horario en la agenda.', 'Si el seguimiento se guardó pero falló la reserva, el mensaje lo indica y ofrece «Reintentar cita». Ese intento conserva el seguimiento ya guardado; no lo registres otra vez. «Cerrar sin agendar» permite terminar sin crear la cita.', 'Corregir un seguimiento no modifica automáticamente las citas existentes. El flujo de corrección pide motivo y ofrece «Modificar cita vinculada» o «Agendar nueva cita» cuando corresponde. «Anular seguimiento» conserva sus cambios y no cancela las citas de «Agenda».'] }
    ]
  },
  'odontograma': {
    summary: 'Registra los hallazgos y diagnósticos por región dental en el odontograma del paciente.',
    sections: [
      { id: 'abrir-odontograma', title: 'Revisa el odontograma activo', paragraphs: ['Abre el expediente correcto y selecciona «Odontograma». La sección depende de los accesos y de que esté habilitada para el consultorio.', 'Espera a que termine la consulta. Si aparece un error, usa «Reintentar» antes de crear otro registro. Los odontogramas anteriores se consultan desde «Historial».'] },
      { id: 'crear-odontograma', title: 'Crea un odontograma cuando sea necesario', steps: ['Si no hay uno activo, selecciona «Crear odontograma». Si necesitas uno nuevo, usa «Nuevo odontograma».', 'Comprueba el paciente y selecciona el Tipo de dentición que corresponde.', 'Revisa el aviso y selecciona «Crear odontograma». Espera a que aparezcan las regiones dentales.'], paragraphs: ['Crear uno nuevo desactiva el odontograma que estaba activo y lo conserva en el historial. Si solo necesitas agregar un diagnóstico al actual, usa ese registro en lugar de crear otro.'] },
      { id: 'guardar-diagnostico', title: 'Registra el diagnóstico en la región correcta', steps: ['Localiza la región en la tabla. Puedes usar «Buscar región o diagnóstico».', 'Selecciona Registrar o «Editar» junto a esa región y comprueba el número que muestra la ventana.', 'Escribe el «Diagnóstico» y selecciona «Guardar diagnóstico».', 'Comprueba el texto en la fila correspondiente antes de pasar a otra región.'], paragraphs: ['El formulario registra la descripción que introduces; la selección de región no determina un diagnóstico por sí sola. Si el guardado falla, revisa el aviso antes de cerrar o repetirlo.'] },
      { id: 'finalizar-odontograma', title: 'Conserva el registro al finalizar', paragraphs: ['Finalizar abre una confirmación. Si confirmas «Finalizar odontograma», deja de estar activo y sus diagnósticos se conservan.', 'Puedes consultarlo o reactivarlo desde «Historial» según las acciones disponibles. Finalizar el odontograma es una acción distinta del cierre de la historia clínica.'] }
    ]
  },
  'plan-tratamiento': {
    summary: 'Crea un plan activo y agrega los tratamientos que se han indicado para el paciente.',
    sections: [
      { id: 'abrir-plan', title: 'Revisa si ya hay un plan activo', paragraphs: ['Abre el expediente correcto y entra a «Tratamiento». La sección requiere que el consultorio la tenga habilitada y que tu cuenta tenga los accesos correspondientes.', 'Si ya existe un plan activo, revísalo antes de agregar tratamientos. Si falla la carga, usa «Reintentar consulta»; una pantalla con error no confirma que no exista plan.'] },
      { id: 'crear-plan', title: 'Crea el plan con sus datos generales', steps: ['Selecciona Nuevo plan o Crear plan activo cuando no haya uno activo.', 'Completa «Nombre del plan» y revisa «Fecha de inicio». Agrega «Diagnóstico general» y «Notas del plan» si corresponde.', 'Selecciona Crear plan activo y comprueba el nombre y los datos en la pantalla.'], paragraphs: ['Esta acción guarda un plan activo de inmediato. La captura que aún no has guardado no es un borrador conservado por el sistema.', 'Si necesitas corregir un plan activo y tienes permiso, usa «Editar datos del plan» y luego «Guardar datos» del plan.'] },
      { id: 'agregar-tratamientos', title: 'Agrega y revisa los tratamientos', steps: ['Selecciona «Agregar tratamiento» y completa «Nombre» del tratamiento.', 'Revisa los campos disponibles de categoría, fechas estimadas y «Descripción del tratamiento». Completa lo que corresponda.', 'Si tienes habilitados los costos y permiso para editarlos, registra «Costo estimado» cuando lo necesites.', 'Selecciona «Guardar tratamiento» y comprueba que aparezca en el plan. Cada tratamiento nuevo comienza «Pendiente».'], paragraphs: ['El presupuesto del plan incluye tratamientos cancelados y no representa un saldo por cobrar. No lo uses como comprobación de pagos.', 'Consulta los filtros por estado para revisar el avance. Editar, completar, cancelar y cerrar tienen permisos propios; no todas las cuentas muestran las mismas acciones.'] },
      { id: 'consentimiento-plan', title: 'Revisa el consentimiento y el estado del plan', paragraphs: ['Revisa el apartado Consentimiento del plan. Crear el plan no obtiene automáticamente la firma del paciente. El formato de consentimiento del plan de tratamiento es distinto del consentimiento general de atención.', 'Si falta configurar el formato, solicita su preparación antes de gestionar la firma. Cuando haya un documento pendiente y cambies el plan, revisa la necesidad de preparar una nueva versión y sus enlaces.', 'Cerrar plan es una acción aparte con confirmación. Revisa el aviso y los tratamientos antes de cerrar; no lo uses solo para salir de la pantalla.'] }
    ]
  },
  'registrar-paciente': {
    summary: 'Crea la ficha del paciente con sus datos básicos para poder identificarlo y continuar después con su atención.',
    sections: [
      {
        id: 'buscar-antes', title: 'Comprueba si ya está registrado',
        paragraphs: ['Antes de crear una ficha, busca a la persona en «Pacientes» por nombre, teléfono o folio. Si ya existe, abre ese expediente para continuar. Si tienes disponible «Incluir archivados», úsalo para revisar también los registros archivados.', 'El registro del paciente y la creación de su historia clínica son tareas distintas. No necesitas capturar la historia clínica en este formulario.']
      },
      {
        id: 'datos-obligatorios', title: 'Completa los datos básicos',
        steps: [
          'Selecciona «Nuevo paciente» desde la navegación o desde «Pacientes». Si no aparece, pide a la administración que revise tu acceso para registrar pacientes.',
          'Captura «Nombre» y «Apellido paterno». Agrega el «Apellido materno» si corresponde; es opcional.',
          'Selecciona «Fecha de nacimiento». Revisa que sea una fecha real y que no sea posterior a hoy; la «Edad» se calcula automáticamente.',
          'Completa «Teléfono / celular» con 10 dígitos. Puedes usar espacios, guiones o paréntesis; no agregues +52 en este formulario.'
        ]
      },
      {
        id: 'datos-opcionales', title: 'Agrega otros datos cuando los tengas',
        paragraphs: ['«Teléfono local», «Ocupación» y «RFC» son opcionales. También puedes completar «Calle / domicilio», «Ciudad / municipio», «Estado» y «Código postal», o dejar la dirección para después.', 'Si capturas teléfono local, usa 10 dígitos; el código postal debe tener 5. El formulario registra teléfonos del paciente y no tiene un campo para contacto de emergencia.']
      },
      {
        id: 'crear-y-verificar', title: 'Crea la ficha y comprueba el resultado',
        steps: [
          'Revisa la identidad y el teléfono y selecciona «Crear paciente» una sola vez. Espera a que termine la operación.',
          'Si aparecen errores, revisa el resumen y selecciona el mensaje para ir al campo que debes corregir.',
          'Cuando se abra el expediente, comprueba que el nombre y los datos correspondan a la persona registrada. Las secciones disponibles dependen de tus accesos.'
        ],
        paragraphs: ['Si aparece «No se pudo confirmar» el alta, busca al paciente en «Pacientes» antes de volver a crearlo. Un fallo de conexión no confirma que el registro haya fallado.', 'Cancelar sale del formulario sin crear al paciente. Conserva los datos que necesites antes de salir.']
      }
    ]
  },
  'encontrar-paciente': {
    summary: 'Busca a una persona en el directorio y comprueba su identidad antes de abrir el expediente.',
    sections: [
      {
        id: 'buscar', title: 'Busca por un dato que conozcas',
        steps: [
          'Entra a «Pacientes» y ubica «Buscar paciente».',
          'Escribe el nombre, teléfono o folio y espera a que se actualicen las coincidencias.',
          'Compara nombre, folio y contacto en los resultados. Si hay más de una persona con un nombre parecido, confirma otro dato antes de elegir.',
          'Usa las páginas del listado cuando haya más resultados. Para quitar el texto de búsqueda, selecciona «Limpiar».'
        ]
      },
      {
        id: 'abrir-expediente', title: 'Abre el expediente correcto',
        steps: [
          'Selecciona «Historial» en la fila del paciente; en la vista móvil el botón se llama «Abrir expediente».',
          'Comprueba el nombre y el folio de la cabecera antes de consultar o cambiar información.',
          'Elige la sección disponible que necesitas. Para regresar al listado, selecciona «Pacientes» en la parte superior.'
        ],
        paragraphs: ['Poder consultar la ficha administrativa no significa tener acceso a la historia clínica. Las secciones visibles dependen de los permisos, del acceso clínico y del estado del paciente. Si falta una sección, pide a la administración que revise el acceso correspondiente.']
      },
      {
        id: 'sin-resultados', title: 'Revisa la búsqueda si no aparece',
        items: [
          'Comprueba la escritura o prueba con otro dato, como teléfono o folio.',
          'Si tienes disponible «Incluir archivados», actívalo. La etiqueta «Archivado» identifica esos registros; mostrarlos no los restaura.',
          'Si el listado muestra un error, selecciona «Actualizar». Si falla la apertura del expediente, usa «Reintentar» en esa pantalla.',
          'Antes de crear otra ficha, descarta que el paciente ya esté registrado o archivado. Si no puedes consultar archivados, pide ayuda a quien tenga ese acceso.'
        ]
      }
    ]
  },
  'datos-paciente': {
    summary: 'Actualiza los teléfonos y el domicilio desde la ficha administrativa del paciente.',
    sections: [
      {
        id: 'acceso-edicion', title: 'Ubica la edición administrativa',
        paragraphs: ['Busca al paciente en «Pacientes», abre su expediente y comprueba su nombre y folio. En la «Ficha administrativa», selecciona «Editar datos administrativos».', 'Esta opción requiere acceso para administrar pacientes. En la vista clínica de un paciente activo puede no aparecer: pide a una persona con acceso a la ficha administrativa que haga el cambio. No necesitas archivar al paciente para cambiar sus datos.', 'Actualizar foto modifica la imagen del perfil; no abre los datos de contacto.']
      },
      {
        id: 'editar-contacto', title: 'Corrige los teléfonos y el domicilio',
        steps: [
          'En «Datos administrativos», revisa «Celular» y captura los 10 dígitos del teléfono de contacto.',
          'Completa «Teléfono local», opcional si corresponde. También debe tener 10 dígitos; puedes dejarlo vacío.',
          'Revisa «Dirección», opcional y «Lugar de residencia», opcional. Si agregas «Código postal», opcional, usa 5 dígitos.',
          'Comprueba que los demás datos de identidad sean correctos y selecciona «Guardar datos».'
        ],
        paragraphs: ['Los teléfonos admiten espacios, guiones o paréntesis. Usa el número nacional sin +52. Si hay un campo inválido, corrígelo antes de guardar, aunque no sea el dato que querías actualizar.']
      },
      {
        id: 'comprobar-contacto', title: 'Verifica los datos guardados',
        paragraphs: ['Cuando cierre la edición y se recargue el expediente, comprueba el teléfono y el domicilio en la ficha administrativa. Puedes volver a abrir la edición para revisar el teléfono local o los demás campos.', 'Si aparece un error al guardar, la captura se conserva. Revisa el mensaje y vuelve a intentar «Guardar datos». Si no necesitas conservar la edición, selecciona «Cancelar».', 'Actualizar la ficha no reescribe los documentos clínicos ya registrados. Revisa por separado los datos que deban constar en una nueva atención.']
      }
    ]
  },
  'archivar-paciente': {
    summary: 'Retira a un paciente de la búsqueda habitual o restaura su ficha sin eliminar su expediente.',
    sections: [
      {
        id: 'antes-archivar', title: 'Revisa qué cambia al archivar',
        paragraphs: ['Archivar oculta al paciente de la búsqueda habitual y conserva su expediente y sus citas. No equivale a cancelar las citas ni a eliminar la información.', 'Necesitas acceso para administrar pacientes. Antes de continuar, comprueba el nombre y el folio del expediente para evitar archivar a otra persona.']
      },
      {
        id: 'archivar', title: 'Archiva la ficha',
        steps: [
          'Abre el expediente desde «Pacientes».',
          'Selecciona el control «Archivar paciente» en la cabecera o el botón con ese nombre en la ficha administrativa, según tu vista.',
          'Lee el aviso de conservación del expediente y las citas. Selecciona «ACEPTAR» para archivar o «CANCELAR» para volver sin hacerlo.',
          'Espera a que se recargue el expediente y comprueba el aviso «Paciente archivado». La cabecera también lo identifica como «Paciente inactivo».'
        ],
        paragraphs: ['Algunas secciones dejan de estar disponibles mientras está archivado. Si no se confirma el cambio o aparece un error, revisa el estado actual antes de repetir la operación.']
      },
      {
        id: 'restaurar', title: 'Encuentra y restaura al paciente',
        steps: [
          'Vuelve a «Pacientes» y activa «Incluir archivados». Este filtro solo muestra los registros; no los reactiva.',
          'Busca por nombre, teléfono o folio y abre el expediente marcado «Archivado».',
          'Comprueba la identidad y selecciona «Restaurar paciente». Este botón inicia la restauración directamente.',
          'Espera la recarga y comprueba que la cabecera muestre «Paciente activo». Vuelve al listado y verifica que puedas encontrarlo sin «Incluir archivados».'
        ],
        paragraphs: ['Si no ves el filtro o la opción de restauración, pide ayuda a quien administra pacientes. Restaurar no concede permisos nuevos: cada persona sigue viendo las secciones autorizadas para su cuenta.', 'Si aparece No se pudo restaurar, revisa el mensaje y el estado de la ficha. No crees otro expediente para sustituir al archivado.']
      }
    ]
  },
  'consultar-agenda': {
    summary: 'Ubica las citas de un doctor, revisa su estado y abre los detalles de la atención programada.',
    sections: [
      {
        id: 'elegir-agenda', title: 'Elige el doctor y la fecha',
        steps: [
          'Entra a «Citas» y revisa «Agenda del doctor». Si tienes acceso a varias agendas, selecciona la que necesitas consultar.',
          'Usa «Fecha» para ir al día que buscas o «Hoy» para volver al día actual. Las flechas de la barra superior avanzan o retroceden una semana.',
          'Comprueba la zona horaria del consultorio que aparece en la agenda antes de comunicar una hora al paciente.'
        ],
        paragraphs: ['Si solo tienes una agenda disponible, el doctor ya aparece seleccionado. Si no aparece ninguno, pide a la administración que revise los perfiles activos y tus accesos.']
      },
      {
        id: 'elegir-vista', title: 'Consulta el día, la semana o la lista',
        items: [
          'Día: revisa los espacios y las citas de la fecha seleccionada.',
          'Semana: compara los espacios del calendario semanal y consulta las citas debajo de la cuadrícula.',
          'Lista: recorre las citas y el historial de la semana sin usar la cuadrícula.'
        ],
        paragraphs: ['Lee las etiquetas de estado junto a las citas; el color solo ayuda a distinguirlas. La lista incluye citas canceladas y reprogramadas, por lo que no todos sus registros representan una reserva vigente.']
      },
      {
        id: 'abrir-cita', title: 'Revisa los detalles y los cambios',
        steps: [
          'Selecciona una cita en el calendario o en la lista para abrirla.',
          'Revisa el doctor, paciente, fecha, hora y «Estado». Si necesitas consultar modificaciones anteriores, abre «Historial de cambios».',
          'Selecciona «Cerrar» cuando termines. Si modificaste algún dato, revisa el aviso antes de descartar la edición.'
        ],
        paragraphs: ['Una cita marcada Fuera del horario actual sigue registrada aunque los horarios hayan cambiado. Una agenda cerrada o un doctor inactivo pueden conservar citas para consulta; no interpretes la falta de espacios disponibles como ausencia de citas.', 'Si la agenda no carga, usa «Reintentar». No tomes una pantalla con error como confirmación de disponibilidad.']
      }
    ]
  },
  'agendar-cita': {
    summary: 'Reserva un espacio para un paciente registrado o captura los datos de contacto de una persona que aún no tiene expediente.',
    sections: [
      {
        id: 'antes-de-reservar', title: 'Revisa la agenda disponible',
        paragraphs: ['Entra a «Citas» y selecciona «Agenda del doctor». Para reservar, el doctor debe estar activo y tener horarios disponibles. Si aún no están preparados, consulta Configurar los horarios de atención en el tema Empezar a usar MedSync.', 'Comprueba la zona horaria del consultorio y la fecha antes de elegir un espacio.']
      },
      {
        id: 'elegir-espacio', title: 'Elige el espacio de la cita',
        steps: [
          'Selecciona un espacio «Disponible» en el calendario o usa «Nueva cita».',
          'Revisa «Doctor que atenderá», «Fecha» y «Hora». El campo «Fin» se calcula con la duración de la cita.',
          'Si cambias de doctor o de fecha, vuelve a revisar la hora disponible antes de continuar.'
        ],
        paragraphs: ['También puedes usar «Próximo libre» para abrir una cita en el siguiente espacio disponible. La búsqueda abarca 30 días desde la fecha consultada, o desde hoy si aquella ya pasó; no busca indefinidamente.']
      },
      {
        id: 'identificar-paciente', title: 'Identifica a la persona que acudirá',
        items: [
          'Si ya tiene expediente, búscala en «Paciente registrado (opcional)» y selecciónala. Revisa que sea la persona correcta antes de guardar: ese vínculo no se puede cambiar desde una cita ya guardada.',
          'Si aún no tiene expediente, completa «Nombre del paciente» y «Teléfono de contacto / WhatsApp». Para una cita nueva sin paciente registrado, el teléfono es obligatorio.',
          'Revisa «País del teléfono» y el número de contacto. El contacto capturado se usa para esta cita.',
          'Completa «Motivo o título» y «Descripción» si necesitas agregar información para organizar la cita.'
        ],
        paragraphs: ['Capturar un nombre para la cita no equivale a registrar un expediente clínico. Guardar la cita tampoco envía automáticamente un mensaje de WhatsApp.']
      },
      {
        id: 'guardar-reserva', title: 'Guarda y comprueba la reserva',
        steps: [
          'Revisa el «Estado». Una cita nueva comienza como «Pendiente»; cámbialo solo si corresponde a lo que ya confirmó el paciente.',
          'Selecciona «Guardar» y espera a que termine la operación.',
          'Comprueba que la cita aparezca con el paciente, doctor, fecha, hora y estado correctos en la agenda.'
        ],
        paragraphs: ['Si se indica que no se confirmó el resultado, usa «Reintentar operación» en la misma captura antes de crear otra cita. Si el mensaje dice que la cita se guardó pero la vista no pudo actualizarse, usa «Reintentar» para recargar la agenda.', 'Si el espacio dejó de estar disponible, revisa el aviso y elige otro horario. La disponibilidad puede cambiar mientras completas los datos.']
      }
    ]
  },
  'cambiar-cita': {
    summary: 'Cambia una reserva de horario o cancélala conservando el registro de lo que ocurrió.',
    sections: [
      {
        id: 'revisar-reserva', title: 'Abre la cita que necesitas cambiar',
        paragraphs: ['En «Citas», selecciona el doctor y localiza la cita. Ábrela y comprueba paciente, fecha, hora y «Estado» antes de modificarla.', 'Si la cita ya aparece «Reprogramada», consulta «Ver cita destino» para localizar la reserva que la reemplazó. El registro original se conserva para consulta.']
      },
      {
        id: 'reprogramar', title: 'Reprograma para otro espacio',
        steps: [
          'Selecciona Reprogramar dentro de la cita.',
          'Elige el nuevo doctor, fecha u hora. Si cambias de doctor, revisa de nuevo su disponibilidad.',
          'Comprueba el nuevo horario y selecciona «Guardar».',
          'Consulta la agenda de destino y verifica la nueva reserva. En los detalles puedes usar «Ver cita original» o «Ver cita destino» para seguir la relación entre ambas.'
        ],
        paragraphs: ['La cita original queda como «Reprogramada» y la nueva reserva se guarda junto con ella. Usa esta acción cuando quieras conservar la relación entre el horario anterior y el nuevo.']
      },
      {
        id: 'cancelar', title: 'Cancela una cita que ya no se realizará',
        steps: [
          'Abre la cita y selecciona «Cancelada» en «Estado» para mostrar el campo del motivo.',
          'Registra el motivo de cancelación cuando corresponda y selecciona «Guardar».',
          'Comprueba que aparezca como «Cancelada» en la lista. El registro permanece en el historial y deja de reservar el espacio.'
        ],
        paragraphs: ['El botón «Cancelar cita» también guarda la cancelación directamente; no lo uses solo para cerrar la ventana. Para salir, selecciona «Cerrar».', 'Liberar la reserva no garantiza que el horario quede disponible: aún puede coincidir con un cierre, un bloqueo o una configuración de horarios distinta.']
      },
      {
        id: 'revisar-avisos', title: 'Resuelve los avisos antes de repetir el cambio',
        paragraphs: ['Si la cita ya estaba «Completada», el sistema pide revisar y confirmar la modificación. Verifica que elegiste la cita correcta antes de continuar.', 'Si no se confirma el resultado del guardado, usa «Reintentar operación» en la misma captura. Evita crear otra reserva mientras no sepas si el cambio quedó guardado.', 'Si aparece una versión más reciente de la cita, compara los datos. «Descartar captura y usar versión vigente» reemplaza tu edición por esa versión; revisa lo que perderías antes de seleccionarlo.']
      }
    ]
  },
  'estado-cita': {
    summary: 'Registra si una cita está pendiente de confirmación, fue confirmada, se completó o el paciente no asistió.',
    sections: [
      {
        id: 'revisar-estado', title: 'Identifica la cita antes de cambiar el estado',
        paragraphs: ['En «Citas», abre la cita y comprueba paciente, doctor, fecha y hora. Revisa su «Estado actual» antes de modificarlo. Los estados describen lo ocurrido con esa cita; no sustituyen el registro de la atención clínica.']
      },
      {
        id: 'elegir-estado', title: 'Elige el estado que corresponde',
        items: [
          'Pendiente: la cita está registrada y su confirmación sigue pendiente.',
          'Confirmada: registra que la cita ya fue confirmada.',
          'Completada: registra que la cita se llevó a cabo.',
          'No asistió: registra que el paciente no acudió.'
        ],
        paragraphs: ['Para cancelar o cambiar el horario conservando la relación entre reservas, consulta Reprogramar o cancelar una cita en este mismo tema.']
      },
      {
        id: 'guardar-estado', title: 'Guarda el cambio de estado',
        steps: [
          'Selecciona el valor en «Estado» y revisa los demás datos de la captura.',
          'Selecciona «Guardar» y espera a que termine.',
          'Comprueba la etiqueta de estado en la agenda. Puedes volver a abrir la cita y consultar «Historial de cambios».'
        ],
        paragraphs: ['Los botones «Confirmada», «Completada» y «No asistió» son atajos que intentan guardar inmediatamente, incluidos los demás cambios de la captura. Revisa todo antes de usarlos; no requieren pulsar «Guardar después».', 'Cambiar una cita que ya estaba «Completada» requiere una confirmación adicional. Si no estás seguro, vuelve a revisar los datos antes de aceptar.']
      },
      {
        id: 'confirmar-resultado', title: 'Comprueba que el resultado quedó registrado',
        paragraphs: ['Si el guardado no pudo confirmarse, usa «Reintentar operación». Si la cita se guardó y solo falló la recarga, usa «Reintentar» en la agenda. No des por actualizado el estado mientras la operación siga pendiente.', 'Marcar «Completada» no redacta una nota ni completa la historia clínica. Registra la atención en la pantalla correspondiente.', 'La cita original de una reprogramación se conserva como «Reprogramada». Usa «Ver cita destino» para revisar y actualizar la reserva que la reemplazó.']
      }
    ]
  },
  'datos-consultorio': {
    summary: 'Registra el nombre, teléfono y domicilio con los que se identifica tu consultorio y comprueba que queden guardados.',
    sections: [
      {
        id: 'antes-de-empezar', title: 'Antes de empezar',
        paragraphs: [
          'Esta tarea corresponde a quien administra el consultorio y tiene acceso a sus ajustes. Entra a «Configuración → Información del consultorio». Si no aparece esa sección, pide a la administración que revise o complete los datos.',
          'Ten a la mano el nombre comercial, un teléfono nacional de 10 dígitos y el domicilio. Son los campos obligatorios. Si los datos guardados ya están correctos, puedes conservarlos sin volver a editarlos.'
        ]
      },
      {
        id: 'editar-datos', title: 'Completa los datos del consultorio',
        steps: [
          'Selecciona «Editar» datos para abrir los campos.',
          'Escribe el «Nombre comercial» que identifica al consultorio. Agrega la «Razón social» si corresponde.',
          'Completa «Teléfono» del consultorio y «Domicilio». El teléfono debe tener 10 dígitos nacionales; también puedes pegarlo con +52, espacios, guiones o paréntesis.',
          'Si deseas registrar un correo de contacto, completa «Email contacto» (opcional). Si lo dejas vacío, puedes continuar.',
          'Revisa los campos marcados con asterisco y selecciona «Guardar cambios». Si aparece un mensaje junto a un campo, corrígelo y vuelve a guardar.'
        ]
      },
      {
        id: 'logo-opcional', title: 'Agrega el enlace del logo solo si lo necesitas',
        paragraphs: [
          'Enlace del logo del consultorio (opcional) permite indicar una dirección completa que empiece con http:// o https://. Puedes dejarlo vacío; no es necesario para completar los datos básicos.',
          'Ese logo se usa al imprimir historias clínicas y en firmas públicas. El logo de la pantalla de acceso se configura por separado en «Apariencia».'
        ]
      },
      {
        id: 'confirmar-datos', title: 'Comprueba que se guardaron',
        paragraphs: [
          'Espera el mensaje de confirmación y revisa el nombre, teléfono y domicilio en la vista de consulta. Después puedes volver a «Configuración → Resumen» y seleccionar «Actualizar preparación» para comprobar el requisito «Datos del consultorio».',
          'Si la pantalla indica que no pudo confirmar el guardado, conserva la captura y vuelve a seleccionar «Guardar cambios»: el siguiente intento comprobará los datos guardados antes de reenviarlos. No des por guardada la información mientras siga pendiente de confirmación.',
          'Si decides salir sin conservar la edición, usa «Cancelar» y revisa la confirmación de descarte cuando aparezca.'
        ]
      }
    ]
  },
  'perfil-profesional': {
    summary: 'Completa tu identidad profesional, captura tu firma y guarda el perfil desde tu propia cuenta.',
    sections: [
      {
        id: 'abrir-perfil', title: 'Abre tu perfil profesional',
        paragraphs: [
          'Entra a «Configuración → Mi perfil profesional». Esta sección está disponible para perfiles profesionales y administración; si tu cuenta no la muestra, pide que revisen tus accesos.',
          'Cada profesional completa su identidad y firma desde su cuenta. «Personal y usuarios» permite a la administración revisar las autorizaciones del doctor; no sustituye esta captura.',
          'Para empezar a preparar tu agenda puedes guardar tu nombre profesional y continuar cuando tengas un perfil activo. La cédula y la firma se necesitan para preparar otras tareas, como recetas y documentos; puedes completarlas después.'
        ]
      },
      {
        id: 'completar-identidad', title: 'Revisa tu identidad profesional',
        steps: [
          'Completa «Nombre profesional» con el nombre con el que atiendes a tus pacientes.',
          'Registra tu «Cédula profesional». Revisa «Universidad», «Especialidad» y «Cédula de especialidad» y completa los datos que correspondan.',
          'Si agregas «Teléfono profesional» (opcional), usa de 10 a 15 dígitos. Puedes escribir + al inicio, espacios, paréntesis o guiones, o dejarlo vacío.'
        ]
      },
      {
        id: 'capturar-firma', title: 'Captura y aplica tu firma',
        steps: [
          'En «Firma profesional», selecciona «Capturar firma». Si ya hay una imagen, el control se llama «Cambiar firma».',
          'Dibuja tu firma en el recuadro. Usa «Deshacer» para corregir el último trazo o «Limpiar» para empezar de nuevo.',
          'Selecciona Aplicar y revisa la imagen que aparece en el perfil. Aplicar coloca la firma en la edición; todavía falta guardar el perfil.'
        ],
        paragraphs: [
          'Si no quieres usar el dibujo que estás haciendo, selecciona «Cancelar firma». Antes de guardar el perfil, aplica el dibujo o cancela su captura.'
        ]
      },
      {
        id: 'guardar-perfil', title: 'Guarda y revisa el resultado',
        steps: [
          'Selecciona «Guardar perfil» y espera la confirmación del resultado antes de salir.',
          'Comprueba que tus datos y la imagen de firma permanezcan visibles y que no haya cambios pendientes. Revisa cualquier aviso de datos incompletos.',
          'Vuelve a «Inicio» y selecciona «Actualizar preparación» para comprobar el requisito «Tu perfil profesional».'
        ],
        paragraphs: [
          'Si aparece que el guardado está pendiente de confirmación, usa «Comprobar guardado» para consultar el resultado sin reenviar tus datos. Si falla la carga del perfil, usa «Reintentar» antes de editar.',
          'Si la pantalla informa que el perfil está inactivo o que no hay cupo disponible, pide a la administración que revise la situación. No basta con capturar una firma para resolver esos avisos.'
        ]
      },
      {
        id: 'revisar-autorizaciones', title: 'Revisa las autorizaciones por separado',
        paragraphs: [
          'Comprueba los estados «Autorizado como doctor emisor» y «Autorizado como firmante profesional». Si falta alguna autorización que necesitas para tu trabajo, solicita su revisión a la administración en «Personal y usuarios».',
          'Guardar tu nombre, cédula y firma no concede esas autorizaciones. Las recetas y los documentos también revisan sus propios requisitos al emitir o firmar.'
        ]
      }
    ]
  },
  'horarios-atencion': {
    summary: 'Prepara la disponibilidad de un doctor: duración de las citas, días de atención y bloqueos. Revisa el resultado antes de guardar.',
    sections: [
      {
        id: 'elegir-agenda', title: 'Elige la agenda que vas a preparar',
        paragraphs: [
          'Entra a «Configuración → Mi agenda». Si administras el consultorio, la sección se llama «Agendas por doctor». El acceso depende de tu puesto y permisos.',
          'En Doctor, comprueba a quién corresponde la agenda. Un profesional configura su propia agenda; la administración con acceso puede elegir otro doctor.',
          'Si no aparece el doctor, revisa que tenga un perfil profesional activo. Si tú atenderás las citas, guarda primero tu nombre en «Mi perfil profesional». No necesitas capturar tu firma para empezar a preparar horarios.'
        ]
      },
      {
        id: 'duracion-y-zona', title: 'Revisa la duración y la hora del consultorio',
        steps: [
          'En la pestaña «Horarios», elige la «Duración habitual» de las citas de ese doctor.',
          'Revisa la Zona horaria del consultorio. Todas las agendas usan esa misma zona; si es incorrecta y no puedes cambiarla, solicita la revisión a la administración.'
        ],
        paragraphs: [
          'Si tienes acceso para corregirla, selecciona «Cambiar zona del consultorio», elige el estado y, cuando se solicite, el municipio. Comprueba la hora mostrada y selecciona «Guardar».',
          'La zona horaria se guarda en ese momento y se aplica a todas las agendas. Los cambios de horarios se guardan por separado con «Guardar cambios». Las citas existentes conservan su fecha y hora.'
        ]
      },
      {
        id: 'semana-atencion', title: 'Configura los días y rangos de atención',
        steps: [
          'En «Horarios» semanales, revisa los siete días y selecciona «Editar» en el día que quieras cambiar.',
          'Activa «Día laboral» para un día con atención y completa «Inicio» y «Fin» de cada rango. Usa «Agregar rango» si necesitas separar, por ejemplo, mañana y tarde. Deja «Día laboral» desactivado cuando no haya atención.',
          'Selecciona Aplicar horario para volver a la agenda. Esto actualiza la edición, pero todavía no guarda los cambios.',
          'Si varios días tendrán el mismo horario, usa «Copiar en el día de origen», elige los días de destino y selecciona «Copiar horario». Revisa los destinos: la copia reemplaza sus rangos dentro de esta agenda.',
          'Comprueba «Agenda» activa. Déjala activada cuando quieras ofrecer horarios; los cierres del consultorio también deben permitir la atención.'
        ]
      },
      {
        id: 'bloquear-disponibilidad', title: 'Agrega los periodos sin atención',
        steps: [
          'En la pestaña «Bloqueos», selecciona «Bloquear día» o «Bloquear horario» para registrar vacaciones, descansos u otros periodos no disponibles.',
          'Elige la fecha del bloqueo. Si se repetirá, marca «Repetir cada semana» y selecciona el día de la semana.',
          'Marca «Todo el día» para bloquear la jornada completa; en caso contrario, indica «Inicio del bloqueo» y «Fin del bloqueo». Puedes agregar un motivo.',
          'Selecciona «Aplicar bloqueo» y comprueba que aparezca en la lista. También requiere «Guardar cambios» para conservarlo.'
        ],
        items: [
          'Un bloqueo en la agenda del doctor afecta a esa agenda.',
          '«Cierres del consultorio» permite a la administración definir bloqueos para todos los doctores y revisar «Consultorio disponible». Estos cierres no sustituyen los horarios individuales.'
        ]
      },
      {
        id: 'previsualizar-y-guardar', title: 'Revisa la disponibilidad y guarda',
        steps: [
          'Abre Vista previa y elige una fecha. Comprueba los rangos y los bloqueos. Esta vista muestra la disponibilidad de la configuración que estás editando; no incluye las citas ya reservadas.',
          'Selecciona «Guardar cambios». Si modificaste la agenda, revisa el aviso «Revisar cambio de agenda» y las citas que quedarían fuera del nuevo horario.',
          'Selecciona «Guardar configuración» para confirmar o «Seguir editando» si necesitas corregir algo. Espera el mensaje «Agenda guardada».',
          'Consulta «Citas» para revisar la agenda con las reservas existentes. Si estás completando la preparación inicial, vuelve a «Inicio» y selecciona «Actualizar preparación».'
        ],
        paragraphs: [
          'Cambiar horarios o bloquear un periodo no mueve ni cancela las citas ya creadas: conservan su horario. Revisa las citas afectadas desde «Citas».',
          'Si el resultado del guardado es incierto, usa «Comprobar guardado». Si otra persona cambió la agenda mientras editabas, usa «Revisar versión guardada» y lee la confirmación antes de descartar tu captura.',
          'Guarda antes de cambiar de doctor. Si tienes cambios pendientes, puedes elegir «Guardar y cambiar», «Descartar cambios» o «Seguir editando».'
        ]
      }
    ]
  },
  'revisar-preparacion': {
    summary: 'Identifica qué falta configurar, qué puedes resolver tú y qué necesita revisar la administración del consultorio.',
    sections: [
      {
        id: 'donde-revisar', title: 'Encuentra tus pendientes',
        paragraphs: [
          'Entra a «Inicio» y busca el bloque de preparación del consultorio. Si administras el consultorio y tienes acceso a «Resumen», también puedes revisarlo en «Configuración → Resumen».',
          'Las tareas que aparecen dependen de tu puesto y tus accesos. Por eso, otra persona del equipo puede ver una lista distinta.',
          'Si cerraste la bienvenida y solo ves el resumen del avance, selecciona «Ver tareas y retomar guías» para desplegar tus tareas.'
        ]
      },
      {
        id: 'revisar-estado', title: 'Revisa el estado de cada tarea',
        paragraphs: [
          'Consulta cuántos requisitos están completos y lee el detalle de los pendientes. Según tus accesos, puedes encontrar datos del consultorio, perfil profesional, autorizaciones, agenda, consentimiento de datos personales sensibles y formato de recetas.'
        ],
        items: [
          'Completo: la preparación de ese requisito está guardada. Puedes usar «Revisar» para consultar sus ajustes cuando el acceso esté disponible.',
          'Pendiente: lee qué falta y busca «Configurar» para abrir los ajustes que puedes modificar.',
          'Pendientes del administrador: identifica la tarea y solicita su revisión a quien administra el consultorio. Ver cómo resolver muestra la orientación disponible para ese pendiente.'
        ]
      },
      {
        id: 'resolver-tarea', title: 'Resuelve una tarea y comprueba el resultado',
        steps: [
          'Elige una tarea pendiente que tenga la opción «Configurar». Si prefieres acompañamiento dentro de la pantalla, selecciona «Revisar con guía».',
          'Revisa los datos y guarda los cambios con el botón de esa pantalla. Avanzar o terminar una guía no guarda la configuración.',
          'Vuelve al bloque de preparación y selecciona «Actualizar preparación». Comprueba si la tarea aparece como Completo o si el detalle indica algo más por resolver.'
        ],
        paragraphs: [
          'Si el pendiente corresponde a la administración, vuelve a comprobarlo después de que esa persona confirme los cambios. Si aparece «No pudimos revisar la preparación», usa «Actualizar preparación para reintentar»; ese mensaje no confirma que los requisitos estén completos.'
        ]
      },
      {
        id: 'continuar-despues', title: 'Continúa después si lo necesitas',
        paragraphs: [
          'Guarda tus cambios antes de salir. En «Inicio», «Continuar después» cierra la bienvenida; si ya resolviste lo que permiten tus accesos, puede aparecer «Terminar bienvenida». Los requisitos pendientes siguen vigentes.',
          'Para volver a una guía pausada, usa la opción «Retomar» cuando aparezca. Para revisar los ajustes sin abrir la guía, usa «Configurar» o «Revisar».'
        ]
      },
      {
        id: 'preparacion-completa', title: 'Comprueba que la preparación esté completa',
        paragraphs: [
          'Cuando los requisitos que muestra tu cuenta estén completos, verás «Preparación inicial completa». En «Configuración → Resumen», la administración puede desplegar «Revisar configuración y guías» para consultar lo preparado.',
          'Cada receta, firma y finalización de historia clínica seguirá comprobando los datos del paciente y las autorizaciones necesarias. Completar la preparación no concede nuevos accesos.'
        ]
      }
    ]
  }
};
