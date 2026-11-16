import Vue from 'vue';
export const clone = value => JSON.parse(JSON.stringify(value));
// Independent name/date/age/CP subset of px.validator.js:14-26; no frontend age-helper reuse.
// This synthetic adapter does not replace the complete API/identity validators.
export const validateFixtureAdministrative = ({person,address}, today = new Date()) => {
  if(!String(person.name||'').trim() || !String(person.surname||'').trim())return 'El nombre y el apellido del paciente son obligatorios.';
  const date=person.birthday, birth=new Date(`${date}T00:00:00`);
  const formatted=Number.isFinite(birth.getTime())?`${birth.getFullYear()}-${String(birth.getMonth()+1).padStart(2,'0')}-${String(birth.getDate()).padStart(2,'0')}`:'';
  if(typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || formatted!==date || birth>today)return 'La fecha de nacimiento debe ser real y no puede ser futura.';
  let age=today.getFullYear()-birth.getFullYear();
  if(today.getMonth()<birth.getMonth() || (today.getMonth()===birth.getMonth() && today.getDate()<birth.getDate()))age--;
  if(!Number.isInteger(Number(person.age)) || Number(person.age)!==age || age<0 || age>150)return 'La edad debe corresponder con la fecha de nacimiento y ser de hasta 150 años.';
  if(address.cp!=null && address.cp!=='' && !/^\d{5}$/.test(address.cp))return 'El código postal debe tener 5 dígitos.';
  return '';
};
export const fixture = Vue.observable({
  patient:{person:{id_person:'nc1-local-only',name:'Marina',surname:'De la Cruz López',fullname:'Marina De la Cruz López',birthday:'1992-06-18',age:34,code:'QA LOCAL',active:1,telephone:'5500000018',local_telephone:'',ocupation:'',rfc:''},address:{direction:'Calle Sintética 18, Colonia Pruebas',residence:'Ciudad QA',cp:'00000',place_birth:''},identity:{givenNames:'Marina',birthDate:'1992-06-18',firstSurname:null,secondSurname:null,firstSurnameStatus:'unknown',secondSurnameStatus:'unknown',legacySurname:'De la Cruz López',revision:0,biologicalSex:null,affiliations:[{family:'sis.affiliation',code:'QA-A'},{family:'sis.affiliation',code:'QA-B'}]},access:{clinical:true},query:{current_condition:'NA'},allergy:{status:'unknown',revision:0}},
  outcome:'success',requests:[],notice:'Propuesta local · datos sintéticos · sin conexión a staging',
});
export const fixtureTransport={
  async get(){return clone(fixture.patient);},
  async put(payload){fixture.requests.push({method:'PUT',url:'/api/px/administrative',payload:clone(payload),outcome:fixture.outcome});
    const validation=validateFixtureAdministrative(payload);
    if(validation)return {success:false,status:400,message:validation};
    if(fixture.outcome==='409'){
      fixture.patient.identity={...clone(fixture.patient.identity),givenNames:'Marina Elena',revision:fixture.patient.identity.revision+1};
      fixture.patient.person={...fixture.patient.person,name:'Marina Elena',fullname:'Marina Elena '+fixture.patient.person.surname};
      return {success:false,status:409,data:{code:'IDENTITY_CONFLICT',field:'expectedRevision'}};
    }
    if(payload.identity && payload.expectedRevision!==fixture.patient.identity.revision)return {success:false,status:409,data:{code:'IDENTITY_CONFLICT',field:'expectedRevision'}};
    if(fixture.outcome!=='success')return {success:false,status:Number(fixture.outcome)||500,message:'Simulación local: no se guardó ningún grupo. Tu captura se conserva.'};
    const identity=payload.identity?{...fixture.patient.identity,...clone(payload.identity),revision:(payload.expectedRevision||0)+1}:fixture.patient.identity;
    if(payload.identity && payload.identity.residence)identity.residence={...(fixture.patient.identity.residence||{}),...clone(payload.identity.residence)};
    fixture.patient={...fixture.patient,person:{...payload.person,fullname:[payload.person.name,payload.person.surname].join(' ')},address:clone(payload.address),identity};
    fixture.notice='Simulación local: ficha guardada y releída. Una petición de escritura.';
    return {success:true,data:{id_person:fixture.patient.person.id_person}};
  }
};
