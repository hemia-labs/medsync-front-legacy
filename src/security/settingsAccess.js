const PROFESSIONAL_ROLES = ['doctor','dentist','odontologist','specialist','professional','medico','odontologo','especialista'];
export const isTenantAdministrator = role => ['admin','business_admin'].includes(String(role || '').toLowerCase());

export function getSettingsSections(role, hasPermission) {
  if(String(role || '').toLowerCase()==='super_admin') return [];
  const admin = isTenantAdministrator(role);
  const professional = admin || PROFESSIONAL_ROLES.includes(String(role || '').toLowerCase());
  const entries = [
    {key:'summary',title:'Resumen',description:'Vista general del consultorio',icon:'mdi-view-dashboard-outline',scope:'Consultorio',allowed:admin && hasPermission('admin.config')},
    {key:'identity',title:'Informacion del consultorio',description:'Datos del consultorio',icon:'mdi-card-account-details-outline',scope:'Consultorio',allowed:admin && hasPermission('admin.config')},
    {key:'account-legal',title:'Cuenta y legal',description:'Documentos de MedSync y mis aceptaciones',icon:'mdi-file-certificate-outline',scope:'Mi cuenta',allowed:Boolean(role)},
    {key:'users',title:'Personal y usuarios',description:'Doctores, asistentes y recepcion',icon:'mdi-account-group-outline',scope:'Consultorio',allowed:admin && hasPermission('admin.users')},
    {key:'roles-permissions',title:'Puestos y accesos',description:'Accesos dentro de este consultorio',icon:'mdi-shield-key-outline',scope:'Consultorio',allowed:admin && hasPermission('admin.users')},
    {key:'clinical-modules',title:'Secciones clinicas',description:'Apartados visibles del expediente',icon:'mdi-view-module-outline',scope:'Consultorio',allowed:admin && hasPermission('admin.config')},
    {key:'appearance',title:'Apariencia',description:'Logo y colores del consultorio',icon:'mdi-palette-outline',scope:'Consultorio',allowed:admin && hasPermission('admin.config')},
    {key:'doctor-identity',title:'Mi perfil profesional',description:'Mi cedula, especialidad y firma',icon:'mdi-doctor',scope:'Mis ajustes',allowed:professional},
    {key:'prescriptions',title:admin ? 'Recetas por doctor' : 'Mis recetas',description:admin ? 'Formato independiente por doctor' : 'Datos que aparecen en mis recetas',icon:'mdi-file-document-edit',scope:'Mis ajustes',allowed:professional && hasPermission('prescriptions.config')},
    {key:'agenda',title:admin ? 'Agendas por doctor' : 'Mi agenda',description:admin ? 'Horarios por doctor y cierres generales' : 'Mis horarios y dias no disponibles',icon:'mdi-calendar-clock',scope:'Mis ajustes',allowed:professional && (hasPermission('px.dates') || (admin && hasPermission('admin.config')))},
    {key:'clinical-history-template',title:'Plantilla de historia clinica',description:'Preguntas para el consultorio',icon:'mdi-clipboard-text-outline',scope:'Plantillas clinicas',allowed:hasPermission('clinical_history_template.manage') || (admin && hasPermission('clinical_history_template.view'))},
    {key:'documents',title:'Documentos y consentimientos',description:'Plantillas para pacientes del consultorio',icon:'mdi-file-document-outline',scope:'Plantillas clinicas',allowed:hasPermission('documents.config')}
  ];
  return entries.filter(entry=>entry.allowed).map(entry=>({...entry,mobileTitle:`${entry.scope} · ${entry.title}`}));
}

export const canAccessSettings = (role, hasPermission) => getSettingsSections(role, hasPermission).length > 0;
