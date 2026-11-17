// Closed histories are read from their own snapshot and schema only. Never accept current patient/profile data.
const sectionLabels = { identification:'Identificación al cierre', consultation:'Motivo de consulta', family_history:'Antecedentes familiares', pathological_history:'Antecedentes patológicos', non_pathological_history:'Antecedentes no patológicos', allergies_medications:'Alergias y medicamentos', systems_review:'Interrogatorio por sistemas', physical_exam:'Exploración física', vital_signs:'Signos vitales', studies_results:'Estudios y resultados', diagnosis:'Diagnóstico', prognosis:'Pronóstico', therapeutic_plan:'Plan terapéutico', observations:'Observaciones' };
const fieldLabels = { full_name:'Nombre completo', age:'Edad', birth_date:'Fecha de nacimiento', sex:'Sexo', phone:'Teléfono', email:'Correo', address:'Dirección', emergency_contact:'Contacto de emergencia', reason:'Motivo de consulta', current_condition:'Padecimiento actual', blood_pressure:'Presión arterial', heart_rate:'Frecuencia cardiaca', respiratory_rate:'Frecuencia respiratoria', temperature:'Temperatura', oxygen_saturation:'Saturación de oxígeno', weight:'Peso', height:'Talla', height_unit:'Unidad de talla', bmi:'IMC', current_or_previous_diseases:'Enfermedades actuales o previas', current_medications:'Medicamentos actuales', known_adverse_reactions:'Reacciones adversas conocidas', initial_diagnosis:'Diagnóstico inicial', clinical_problems:'Problemas clínicos', diagnostic_code:'Código diagnóstico', initial_indications:'Indicaciones iniciales', initial_plan:'Plan inicial', general_recommendations:'Recomendaciones generales', allergy_status:'Estado de alergias' };
const sourceKeys = { full_name:'full_name', age:'age', birth_date:'birth_date', sex:'sex', gender:'sex', phone:'phone', email:'email', address:'address', emergency_contact:'emergency_contact' };
const allergyLabels = { UNREVIEWED:'Alergias sin revisar', HAS_ALLERGIES:'Con alergias registradas', NONE_KNOWN:'Sin alergias conocidas', UNKNOWN:'No se pudo confirmar' };
const owns = (object,key) => Object.prototype.hasOwnProperty.call(object || {},key);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const humanize = key => fieldLabels[key] || String(key).replace(/[_-]+/g,' ').replace(/^./,letter=>letter.toUpperCase());
export function closedConsent(history) {
  if(!history || !history.consent_document_id) return {label:'Documento del cierre no registrado en esta versión',documentId:null};
  const labels = { FINALIZED:'Consentimiento firmado', INCOMPLETE:'Negativa registrada · por eso esta versión quedó incompleta' };
  return {label:labels[history.status] || 'Estado del consentimiento al cierre no disponible',documentId:history.consent_document_id};
}
export function closedValue(value) {
  if(value === null || value === undefined || value === '')return 'No registrado';
  if(typeof value === 'boolean')return value ? 'Sí' : 'No';
  return String(value);
}
function appendFields(target,label,value,key) {
  if(Array.isArray(value) && value.length) {
    value.forEach((item,index)=>appendFields(target,`${label} · ${index+1}`,item,`${key}.${index}`));return;
  }
  if(object(value) && Object.keys(value).length) {
    Object.entries(value).forEach(([child,item])=>appendFields(target,`${label} · ${humanize(child)}`,item,`${key}.${child}`));return;
  }
  target.push({key,label,value:closedValue(typeof value==='object' && value!==null ? null : value)});
}
function displayValue(field,value) {
  const choices=Array.isArray(field.options)?field.options:[];
  const label=item=>{const choice=choices.find(option=>object(option) && String(option.value)===String(item));return choice && (choice.label || choice.text) || item;};
  if(field.key==='allergy_status' && allergyLabels[value])return allergyLabels[value];
  return Array.isArray(value)?value.map(label):label(value);
}
function fieldUnit(section,key,values,field,metadata) {
  if(section!=='vital_signs')return field.unit || '';
  if(key==='height')return values && values.height_unit || field.unit || (Number(values && values[key])>0 && Number(values[key])<=3 ? 'm' : metadata[key] && metadata[key].unit) || '';
  return field.unit || metadata[key] && metadata[key].unit || '';
}
export function closedSections(history, vitalMetadata = {}) {
  const snapshot = object(history && history.clinical_snapshot_json) ? history.clinical_snapshot_json : {};
  let schema = history && history.template_snapshot_json;
  if(typeof schema === 'string') {try {schema=JSON.parse(schema);} catch (_) {schema=null;}}
  // Both stored shapes have existed. No fallback to the current template.
  if(schema && schema.schema_json) {schema=schema.schema_json;if(typeof schema==='string'){try{schema=JSON.parse(schema);}catch(_){schema=null;}}}
  const definitions = schema && Array.isArray(schema.sections) ? schema.sections.filter(s=>s && s.key).slice().sort((a,b)=>Number(a.order||0)-Number(b.order||0)) : [];
  const sections = [], usedSections = new Set();
  for(const definition of definitions) {
    if(usedSections.has(definition.key))continue;
    usedSections.add(definition.key);
    const values = snapshot[definition.key], fields=[], usedFields=new Set();
    for(const field of (Array.isArray(definition.fields)?definition.fields:[])) {
      if(!field || !field.key || usedFields.has(field.key))continue;
      if((definition.enabled===false || field.enabled===false) && !owns(values,field.key))continue;
      usedFields.add(field.key);
      let value=object(values)?values[field.key]:undefined;
      if(!owns(values,field.key) && field.type==='readonly' && String(field.source||'').startsWith('patient.')) value=(snapshot.identification||{})[sourceKeys[field.source.slice(8)]];
      const unit=fieldUnit(definition.key,field.key,values,field,vitalMetadata);
      appendFields(fields,`${field.label || humanize(field.key)}${unit ? ` (${unit})` : ''}`,displayValue(field,value),field.key);
    }
    if(object(values)) { for(const [key,value] of Object.entries(values))if(!usedFields.has(key)){const unit=fieldUnit(definition.key,key,values,{},vitalMetadata);appendFields(fields,humanize(key)+(unit?` (${unit})`:''),displayValue({key},value),`stored.${key}`);} }
    else if(values!==undefined && !object(values))appendFields(fields,'Contenido registrado',values,'stored');
    if(fields.length)sections.push({key:definition.key,label:definition.label || sectionLabels[definition.key] || humanize(definition.key),description:definition.description || '',fields});
  }
  for(const [key,value] of Object.entries(snapshot)) {
    if(usedSections.has(key))continue;
    const fields=[];
    if(object(value))Object.entries(value).forEach(([field,item])=>{const unit=fieldUnit(key,field,value,{},vitalMetadata);appendFields(fields,humanize(field)+(unit?` (${unit})`:''),displayValue({key:field},item),field);});
    else appendFields(fields,'Contenido registrado',value,'stored');
    if(fields.length)sections.push({key,label:sectionLabels[key] || `Otros datos registrados · ${humanize(key)}`,description:'',fields});
  }
  return sections;
}
