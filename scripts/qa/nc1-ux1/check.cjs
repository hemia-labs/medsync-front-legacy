// Actual administrative Vue component AND DAPxService; only DACore transport is synthetic.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const Vue=require('vue'),compiler=require('vue-template-compiler');
const clone=v=>JSON.parse(JSON.stringify(v));
const fixtureContext={Vue,module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'fixture.js'),'utf8').replace(/^import.*$/gm,'').replace(/export const /g,'const ')+'\nmodule.exports={fixture,fixtureTransport,validateFixtureAdministrative};',fixtureContext);
const {fixture,fixtureTransport,validateFixtureAdministrative}=fixtureContext.module.exports;
const helperContext={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../../src/domain/patient/administrative.validation.js'),'utf8').replace(/export const /g,'const ')+'\nmodule.exports={patientAge,localDateString,normalizePatientPhone};',helperContext);
const {patientAge}=helperContext.module.exports;
const authContext={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../../src/security/authorizationContext.js'),'utf8').replace(/export function /g,'function ')+'\nmodule.exports={authorizationContext,isCurrentAuthorization};',authContext);
const store={state:{CORE:{AUTH:{authenticated:true,user:{id_login:'qa'},permissions:['px.new'],accessRevision:1}}}};
let readFailure=false,reads=0,lastApiPatient=null;
// Exercise the demo's actual adapter too, so its GET shape cannot drift from this regression.
const demoContext={DACore:{},fixtureTransport};
const demoSource=fs.readFileSync(path.join(__dirname,'main.js'),'utf8');
vm.runInNewContext(demoSource.slice(demoSource.indexOf('DACore.get='),demoSource.indexOf('Vue.use(')),demoContext);
const serviceContext={DAC_PX_BY_ID:'api/px/get/',module:{exports:{}},DACore:{async put(url,payload){assert.equal(url,'api/px/administrative');return fixtureTransport.put(payload);},async get(url){assert.equal(url,'api/px/get/nc1-local-only');reads++;if(readFailure)return {success:false,status:503};const response=await demoContext.DACore.get(url);lastApiPatient=response.data;return response;}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../../src/services/core/px/DAPxService.js'),'utf8').replace(/^import.*$/gm,'').replace('export default','module.exports ='),serviceContext);
const sfc=compiler.parseComponent(fs.readFileSync(process.env.NC1_SHEET_SOURCE || path.join(__dirname,'../../../src/views/Patient/components/PatientAdministrativeForm.vue'),'utf8'));
const identityErrors=new Function(fs.readFileSync(path.join(__dirname,'../../../src/domain/identity/identityDraft.js'),'utf8').replace(/export function /g,'function ')+';return {identityFieldError};')();
assert.deepEqual(compiler.compile(sfc.template.content).errors,[]);
assert.ok(!sfc.script.content.includes('window.confirm'));
const ctx={CatalogReferenceField:{},CatalogReferenceList:{},...identityErrors,DASweetConfirm:{render:h=>h("div")},DAPxService:serviceContext.module.exports,...helperContext.module.exports,...authContext.module.exports,module:{exports:{}}};
vm.runInNewContext(sfc.script.content.replace(/^import.*$/gm,'').replace('export default','module.exports ='),ctx);
const original=clone(fixture.patient),events=[];
function fresh(){const component=new Vue({...ctx.module.exports,propsData:{patient:clone(fixture.patient)}});component.$store=store;component.$refs.form={validate:()=>true};component.$refs.conflict={$el:{focus(){}}};component.$on('saved',()=>events.push('saved'));return component;}
const results=[];
(async()=>{
  let form=fresh();form.person.telephone='5500000025';
  const emitted=[];
  for(const event of ['refreshed','saved'])form.$on(event,patient=>emitted.push({event,patient}));
  let payload=form.buildPayload();assert.equal(payload.identity,undefined);assert.equal(payload.expectedRevision,undefined);assert.equal(payload.person.surname,original.person.surname);
  await form.save();assert.equal(fixture.requests.length,1);assert.equal(events.length,1);assert.equal(fixture.patient.identity.revision,0);assert.equal(fixture.patient.identity.biologicalSex,null);assert.equal(fresh().person.telephone,'5500000025');
  assert.deepEqual(emitted.map(item=>item.event),['refreshed','saved']);
  for(const {patient} of emitted){assert.equal(patient,lastApiPatient);assert.equal(patient.person.birthday,'18-06-1992');}
  assert.equal(form.person.birthday,'1992-06-18');assert.notEqual(form.person,lastApiPatient.person);
  // The demo store can already hold an API-formatted DTO: a second GET must not reverse it.
  const apiDateFixture=clone(fixture.patient);fixture.patient=clone(lastApiPatient);
  assert.equal((await demoContext.DACore.get('api/px/get/nc1-local-only')).data.person.birthday,'18-06-1992');fixture.patient=apiDateFixture;
  results.push('UX1I-1: refreshed/saved emit original API DTO with DD-MM-YYYY; form alone uses ISO; demo GET preserves API format on repeated reads');
  results.push('single simulated PUT for contact only; no identity/revision; legacy surname and missing sex preserved; reopen matches');
  for(const outcome of ['400','401','network']){
    form=fresh();form.identity.givenNames='Nombre pendiente';form.person.telephone='5500000026';form.address.direction='Domicilio pendiente';const capture=JSON.stringify(form.buildPayload()),saved=JSON.stringify(fixture.patient),count=fixture.requests.length,eventCount=events.length;
    fixture.outcome=outcome;await form.save();assert.equal(fixture.requests.length,count+1);assert.equal(JSON.stringify(fixture.patient),saved);assert.equal(JSON.stringify(form.buildPayload()),capture);assert.equal(events.length,eventCount);assert.ok(form.error);
  }
  results.push('400/401/network: one attempted simulated write, no fixture changes, capture unchanged, no success event');
  for(const keep of [true,false]){
    const phone=keep?'5500000027':'5500000028';
    form=fresh();form.identity.givenNames='Captura propia';form.person.telephone=phone;form.address.direction='Domicilio R19 pendiente';fixture.outcome='409';await form.save();await Vue.nextTick();assert.equal(form.conflict,true);const revision=fixture.patient.identity.revision;form.reconcile(keep);
    assert.equal(form.person.telephone,phone);assert.equal(form.address.direction,'Domicilio R19 pendiente');assert.equal(form.identity.givenNames,keep?'Captura propia':'Marina Elena');assert.equal(form.conflict,false);
    payload=form.buildPayload();if(keep){assert.equal(payload.expectedRevision,revision);assert.equal(payload.identity.givenNames,payload.person.name);}
    fixture.outcome='success';await form.save();assert.equal(fixture.patient.person.name,keep?'Captura propia':'Marina Elena');assert.equal(fixture.patient.person.telephone,phone);
  }
  results.push('R19 both explicit choices preserve contact/address; refreshed revision for own identity; no automatic retry');
  // NC1 identidad simple: surnames are direct fields; no statuses, no deferral until both are filled.
  form=fresh();assert.equal(form.surnames.secondSurname,'Segundo apellido, opcional');assert.equal(form.surnameStates,undefined);
  fixture.patient=clone(original);fixture.outcome='success';let count,eventCount;const surnameKeys=['firstSurname','secondSurname','firstSurnameStatus','secondSurnameStatus'];
  form=fresh();assert.equal(form.identityGroupStatus,'Identidad por completar');form.setSurnameText('firstSurname','De la Cruz');
  payload=form.buildPayload();assert.equal(payload.identity.firstSurname,'De la Cruz');assert.equal(payload.identity.secondSurname,null);assert.ok(!/Status/.test(JSON.stringify(payload.identity)));assert.equal(payload.person.surname,'De la Cruz');
  form.identity.givenNames='Marina QA';form.identity.birthDate='2001-12-31';form.identity.biologicalSex='2';form.person.telephone='5500000041';form.address.direction='Domicilio sintético H1';
  payload=form.buildPayload();assert.equal(validateFixtureAdministrative(payload),'');eventCount=events.length;await form.save();assert.equal(events.length,eventCount+1);
  assert.equal(fixture.patient.person.surname,'De la Cruz');assert.equal(fixture.patient.identity.firstSurname,'De la Cruz');assert.equal(fixture.patient.identity.secondSurname,null);assert.equal(fixture.patient.identity.secondSurnameStatus,'unknown');assert.equal(fixture.patient.identity.legacySurname,'De la Cruz López');assert.equal(fixture.patient.person.telephone,'5500000041');
  form=fresh();assert.equal(form.identity.firstSurname,'De la Cruz');assert.equal(form.identityGroupStatus,'Identidad confirmada');form.setSurnameText('secondSurname','López QA');payload=form.buildPayload();assert.equal(payload.person.surname,'De la Cruz López QA');assert.equal(payload.expectedRevision,fixture.patient.identity.revision);await form.save();assert.equal(fixture.patient.person.surname,'De la Cruz López QA');
  results.push('Identidad simple: one surname saves at once (second pending, never a declaration); compound surnames kept; both travel together and update the record surname; legacy kept');
  form=fresh();form.setSurnameText('secondSurname','');payload=form.buildPayload();assert.equal(payload.identity.secondSurname,null);assert.equal(payload.person.surname,'De la Cruz');await form.save();form=fresh();assert.equal(form.identity.secondSurname,null);assert.equal(fixture.patient.person.surname,'De la Cruz');
  form=fresh();form.setSurnameText('firstSurname','   ');count=fixture.requests.length;const beforeEmpty=JSON.stringify(fixture.patient);await form.save();assert.equal(fixture.requests.length,count);assert.equal(JSON.stringify(fixture.patient),beforeEmpty);assert.equal(form.surnameHint,'Registra al menos un apellido.');assert.ok(form.error);
  results.push('Identidad simple: explicit clearing of a surname persists without the old value coming back; clearing both is blocked before any request');
  fixture.patient=clone(original);form=fresh();form.identity.birthDate='1980-12-31';payload=form.buildPayload();assert.equal(payload.person.age,patientAge('1980-12-31'));assert.equal(validateFixtureAdministrative(payload),'');assert.ok(validateFixtureAdministrative({...payload,person:{...payload.person,age:original.person.age}}));await form.save();assert.equal(fresh().person.age,payload.person.age);
  for(const [birthday,expected] of [['2000-11-16',25],['2000-11-15',26],['2000-11-14',26],['2026-11-15',0]]){const today=new Date('2026-11-15T12:00:00');assert.equal(patientAge(birthday,today),expected);assert.equal(validateFixtureAdministrative({...payload,person:{...payload.person,birthday,age:expected}},today),'');}
  for(const birthday of ['2027-01-01','2001-02-29']){assert.ok(validateFixtureAdministrative({...payload,person:{...payload.person,birthday,age:0}},new Date('2026-11-15T12:00:00')));}
  results.push('H2: changed birthday recalculates age; independent backend-equivalent validator rejects stale age, future and invalid dates; birthday boundaries and age zero pass');
  form=fresh();form.identity.birthDate='2000-01-01';await Vue.nextTick();assert.equal(form.person.age,patientAge('2000-01-01'));
  fixture.patient=clone(original);fixture.patient.identity.residence={postalCode:{family:'sepomex.postal_code',code:'00000'},entity:{family:'inegi.state',code:'QA'}};
  form=fresh();form.address.cp='01234';payload=form.buildPayload();assert.equal(payload.identity.residence.postalCode.code,'01234');assert.equal(payload.expectedRevision,0);assert.ok(surnameKeys.every(key=>!(key in payload.identity)));await form.save();assert.equal(fixture.patient.identity.residence.postalCode.code,fixture.patient.address.cp);assert.equal(fixture.patient.identity.residence.entity.code,'QA');
  form=fresh();form.address.cp='';payload=form.buildPayload();assert.equal(payload.identity.residence.postalCode,null);await form.save();assert.equal(fixture.patient.address.cp,'');assert.equal(fixture.patient.identity.residence.postalCode,null);
  fixture.patient.identity.residence.postalCode={family:'sepomex.postal_code',code:'54321'};form=fresh();form.address.direction='Solo calle QA';assert.equal(form.buildPayload().identity.residence.postalCode,null);await form.save();assert.equal(fixture.patient.identity.residence.postalCode,null);
  form=fresh();form.address.cp='12345';fixture.outcome='409';await form.save();assert.equal(form.conflict,true);assert.equal(form.address.cp,'12345');assert.equal(fixture.patient.address.cp,'');assert.equal(fixture.patient.identity.residence.postalCode,null);form.reconcile(true);fixture.outcome='success';await form.save();assert.equal(fixture.patient.address.cp,'12345');assert.equal(fixture.patient.identity.residence.postalCode.code,'12345');
  results.push('H3: CP change and clear are mirrored in same revision-controlled write; other residence references retained; address-only legacy mismatch repaired; 409 preserves CP capture before explicit retry');
  fixture.patient=clone(original);fixture.patient.identity.affiliations=[{family:'sis.affiliation',code:'QA-A',releaseId:'qa-local'},{family:'sis.affiliation',code:'QA-B'}];
  form=fresh();assert.equal(form.affiliations,'QA-A,QA-B');assert.equal(form.dirty,false);form.person.telephone='5500000043';assert.equal(form.buildPayload().identity,undefined);form.affiliations='QA-A,QA-C';payload=form.buildPayload();assert.equal(payload.identity.affiliations[0].releaseId,'qa-local');assert.equal(payload.identity.affiliations[1].code,'QA-C');form.affiliations='';assert.equal(form.buildPayload().identity.affiliations,null);
  form=fresh();let cancelled=0;form.$on('cancel',()=>cancelled++);assert.equal(form.confirmationCopy.title,'¿Salir sin guardar?');form.identity.givenNames='Pendiente';form.cancel();assert.equal(cancelled,0);assert.equal(form.pendingConfirmation.kind,'discard');form.resolveConfirmation(false);assert.equal(cancelled,0);form.cancel();form.resolveConfirmation(true);assert.equal(cancelled,1);
  results.push('P3: identity status reflects pending/complete data; app confirmation supports cancel/accept for discard; existing affiliations display and retain references');
  fixture.patient=clone(original);form=fresh();form.identity.birthDate='2000-01-01';await Vue.nextTick();assert.equal(form.contactChanged,false);assert.equal(form.identityChanged,true);form.person.ocupation='QA';assert.equal(form.personalDetailsChanged,true);assert.equal(form.contactChanged,false);
  const beforeInvalid=fixture.requests.length;form.identity.birthDate='2999-01-01';await form.save();assert.equal(fixture.requests.length,beforeInvalid);assert.ok(form.error);form.identity.birthDate='2001-02-29';assert.notEqual(form.validBirthDate(form.identity.birthDate),true);form.identity.birthDate='';assert.notEqual(form.validBirthDate(''),true);
  results.push('O6/O7: date and occupation do not mark contact; invalid/future/missing birth date blocked before PUT');
  fixture.patient=clone(original);form=fresh();form.address.direction='Solo calle legacy';payload=form.buildPayload();assert.equal(payload.identity,undefined);await form.save();assert.equal(fixture.patient.identity.revision,0);assert.equal(fixture.patient.identity.residence,undefined);
  form=fresh();form.address.cp='01234';payload=form.buildPayload();assert.equal(payload.expectedRevision,0);assert.equal(payload.identity.residence.postalCode.code,'01234');await form.save();assert.equal(fixture.patient.identity.revision,1);assert.equal(fixture.patient.identity.residence.postalCode.code,fixture.patient.address.cp);
  results.push('O8: legacy street-only does not create identity or promote filler CP; explicit CP change creates revision 1 and mirrors CP');
  form=fresh();form.person.telephone='5500000044';readFailure=true;count=fixture.requests.length;eventCount=events.length;await form.save();assert.equal(fixture.requests.length,count+1);assert.equal(form.awaitingReload,true);assert.equal(events.length,eventCount);await form.save();assert.equal(fixture.requests.length,count+1);readFailure=false;await form.reloadSaved();assert.equal(form.awaitingReload,false);assert.equal(fixture.requests.length,count+1);assert.equal(events.length,eventCount+1);
  form=fresh();form.address.cp='54321';fixture.outcome='409';readFailure=true;await form.save();assert.equal(form.conflict,true);assert.equal(form.currentIdentity,null);form.reconcile(true);assert.equal(form.conflict,true);readFailure=false;await form.loadConflict();form.reconcile(false);assert.equal(form.address.cp,'54321');fixture.outcome='success';await form.save();assert.equal(fixture.patient.identity.residence.postalCode.code,'54321');
  results.push('Actual API shape: 409 has no current DTO; fresh GET required. Failed GET after successful PUT locks writes and retries only read; pending capture retained');
  fixture.patient=clone(original);delete fixture.patient.identity;form=fresh();form.person.telephone='5500000044';
  const legacyEvents=[];for(const event of ['refreshed','saved'])form.$on(event,patient=>legacyEvents.push(patient));
  await form.save();assert.equal(legacyEvents.length,2);
  for(const patient of legacyEvents){assert.equal(patient,lastApiPatient);assert.equal(patient.person.birthday,'18-06-1992');assert.equal('identity' in patient,false);}
  assert.equal(form.identity.firstSurname,null);assert.equal(form.identity.firstSurnameStatus,undefined);assert.equal(form.person.birthday,'1992-06-18');
  results.push('UX1I-1 legacy: missing identity remains absent in both emitted DTOs; defaults exist only inside the form');
  const savedGet=serviceContext.DACore.get;form=fresh();form.person.telephone='5500000045';eventCount=events.length;serviceContext.DACore.get=async url=>{const result=await savedGet(url);store.state.CORE.AUTH.accessRevision++;return result;};await form.save();assert.equal(events.length,eventCount);assert.equal(form.awaitingReload,true);serviceContext.DACore.get=savedGet;
  results.push('Authorization generation change during read suppresses saved/refreshed publication');
  // NC1 identidad simple: the legacy record surname stays until a surname is typed; nothing is split by spaces.
  fixture.patient=clone(original);form=fresh();assert.equal(form.storedSurnamesPresent,false);assert.equal(form.legacySurname,'De la Cruz López');
  form.person.telephone='5500000046';payload=form.buildPayload();assert.equal(payload.identity,undefined);assert.equal(payload.person.surname,'De la Cruz López');
  form.setSurnameText('firstSurname','  De la Cruz ');assert.equal(form.surnameHint,'');payload=form.buildPayload();assert.equal(payload.identity.firstSurname,'De la Cruz');assert.equal(payload.identity.secondSurname,null);assert.equal(payload.person.surname,'De la Cruz');assert.ok(!/Status/.test(JSON.stringify(payload)));
  assert.equal(typeof form.toggleSurnameAbsent,'undefined');assert.equal(typeof form.changeSurnameStatus,'undefined');
  results.push('Identidad simple: legacy surname kept until a surname is typed; typed values trimmed; no status or «No tiene» control');
  fixture.patient=clone(original);fixture.patient.identity.affiliations=[{family:'sis.affiliation',code:'QA-A'}];form=fresh();assert.deepEqual(Array.from(form.storedCodes),['Afiliación QA-A']);
  form.person.ocupation='Docente QA';assert.equal(form.optionalChanged,true);assert.equal(form.identityGroupStatus,'Identidad por completar');assert.equal(form.hasSavableChanges,true);
  form=fresh();form.address.place_birth='Ciudad QA';assert.equal(form.addressGroupChanged,false);assert.equal(form.optionalChanged,true);form.identity.migrantStatus='none';assert.equal(form.identityGroupStatus,'Identidad por completar');
  form=fresh();form.identity.givenNames='Otra';form.cancel();assert.equal(form.confirmationCopy.title,'¿Salir sin guardar?');form.resolveConfirmation(false);fixture.patient=clone(original);
  results.push('UX3 optional group: occupation, place of birth and NOM-024 extras mark only Información adicional; existing codes are summarised read-only; system confirm copy for discard');
  // NC1-EC1: optional emergency contact inside Contacto; sent only when it changes.
  fixture.patient=clone(original);delete fixture.patient.emergencyContact;form=fresh();assert.equal(form.hasEmergencyContact,false);form.person.telephone='5500000050';payload=form.buildPayload();assert.equal('emergencyContact' in payload,false);
  form=fresh();form.emergency.relationship='Hermana';assert.equal(form.contactChanged,true);assert.ok(form.inputErrors.some(error=>/nombre del contacto de emergencia/.test(error)));count=fixture.requests.length;await form.save();assert.equal(fixture.requests.length,count,'name is required before any PUT');
  form.emergency.name='  Ana   Prueba ';form.emergency.phone='(55) 1111-2222';assert.equal(form.inputErrors.length,0);payload=form.buildPayload();assert.deepEqual(clone(payload.emergencyContact),{name:'Ana Prueba',phone:'5511112222',relationship:'Hermana'});assert.equal(payload.identity,undefined,'no identity revision for a contact-only change');
  await form.save();assert.deepEqual(clone(fixture.patient.emergencyContact),{name:'Ana Prueba',phone:'5511112222',relationship:'Hermana'});assert.equal(form.dirty,false);assert.equal(form.emergency.name,'Ana Prueba');
  form=fresh();assert.equal(form.hasEmergencyContact,true);assert.equal(form.contactChanged,false);form.person.telephone='5500000051';assert.equal('emergencyContact' in form.buildPayload(),false,'unchanged contact is never resent');
  form=fresh();form.emergency.phone='123';assert.ok(form.inputErrors.some(error=>/contacto de emergencia debe tener 10/.test(error)));
  form=fresh();form.clearEmergency();assert.equal(form.contactChanged,true);payload=form.buildPayload();assert.equal(payload.emergencyContact,null);await form.save();assert.equal(fixture.patient.emergencyContact,null);assert.equal(fresh().hasEmergencyContact,false);
  results.push('NC1-EC1: emergency contact marks Contacto, needs a name, validates phone, is trimmed and normalised, sent only when changed, saved without identity revision, cleared as null');
  const historyContext={module:{exports:{}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../../src/domain/clinical-history/history.identification.js'),'utf8').replace(/export const /g,'const ')+'\nmodule.exports={emergencyContactText,identificationDifferences};',historyContext);
  const {emergencyContactText,identificationDifferences}=historyContext.module.exports;
  assert.equal(emergencyContactText({name:'Ana Prueba',relationship:'Hermana',phone:'5511112222'}),'Ana Prueba (Hermana) · 5511112222');assert.equal(emergencyContactText({name:'Ana'}),'Ana');assert.equal(emergencyContactText({phone:'5511112222'}),'');assert.equal(emergencyContactText(null),'');
  assert.deepEqual(clone(identificationDifferences({emergency_contact:''},{emergency_contact:'Ana (Hermana)'}).map(item=>item.key)),['emergency_contact']);
  results.push('NC1-EC1 history: contact formatted as one line for the versioned identification; a new contact is detected as an identification difference');
  fixture.patient=clone(original);
  // CAT-R9: the actual active patient sheet (not the legacy standalone editor).
  fixture.patient=clone(original);fixture.patient.identity.revision=4;fixture.patient.address.cp='';fixture.patient.identity.residence={postalCode:{family:'sepomex.postal_code',code:'01234'},entity:{family:'inegi.state',releaseId:'qa-state',code:'09'},municipality:{family:'inegi.municipality',releaseId:'qa-municipality',code:'09010'}};fixture.patient.identity.catalogChecks=[{field:'residence.entity',result:'valid'}];
  form=fresh();assert.match(sfc.template.content,/<catalog-reference-field/);assert.doesNotMatch(sfc.template.content,/se elegirán de listas oficiales cuando/);
  const country={family:'sis.country',releaseId:'qa-country-v2',code:'142'};
  form.setCatalogReference('birthCountry',country);form.setCatalogReference('residence.entity',{family:'inegi.state',releaseId:'qa-state',code:'15'});
  assert.equal(form.catalogValue('residence.municipality').code,'09010');assert.equal(form.catalogParent('residence.municipality'),'15');assert.equal(form.catalogParent('residence.locality'),'09010');
  form.setCatalogAffiliations([{family:'sis.affiliation',releaseId:'qa-aff-v2',code:'1'}]);payload=form.buildPayload();
  assert.equal(payload.identity.birthCountry.releaseId,'qa-country-v2');assert.equal(payload.identity.affiliations[0].releaseId,'qa-aff-v2');assert.equal(payload.identity.residence.postalCode.code,'01234');assert.equal(payload.expectedRevision,4);assert.equal(payload.identity.catalogChecks,undefined);
  fixture.outcome='success';count=fixture.requests.length;await form.save();assert.equal(fixture.requests.length,count+1);form=fresh();assert.equal(form.identity.birthCountry.releaseId,'qa-country-v2');assert.equal(form.identity.affiliations[0].releaseId,'qa-aff-v2');assert.equal(form.residence.postalCode.code,'01234');
  form.saving=true;const disabled=JSON.stringify(form.formIdentity());form.setCatalogReference('birthCountry',null);form.setCatalogAffiliations(null);assert.equal(JSON.stringify(form.formIdentity()),disabled);form.saving=false;
  results.push('CAT-R9: active sheet selects and reopens exact versions in one write; parent changes keep descendants; unrelated identity edits keep CP; metadata excluded; saving disables changes');
  form=fresh();form.setCatalogReference('residence.country',{...country,code:'228'});form.person.telephone='5500000061';form.panels=[0];let focused=0,scrolled=0;form.$refs['catalog-residence.country']=[{$el:{querySelector:()=>({focus(){focused++;},scrollIntoView(){scrolled++;}})}}];
  const originalUpdate=serviceContext.module.exports.updateAdministrative,captured=JSON.stringify(form.buildPayload());let attempts=0;
  serviceContext.module.exports.updateAdministrative=async()=>{attempts++;return{success:false,status:400,message:'internal residence.country',data:{code:'RESIDENCE_COUNTRY_GEO_MISMATCH',field:'residence.country'}};};
  await form.save();await Vue.nextTick();assert.equal(attempts,1);assert.equal(JSON.stringify(form.buildPayload()),captured);assert.ok(form.panels.includes(3));assert.equal(focused,1);assert.equal(scrolled,1);assert.match(form.error,/País de residencia/);assert.doesNotMatch(form.error,/residence.country/);assert.equal(form.catalogErrors['residence.country'].length,1);serviceContext.module.exports.updateAdministrative=originalUpdate;
  results.push('CAT-R9: real sheet maps400 to catalog field, expands/focuses/scrolls, retains draft and sends once');
  for(const keep of [false,true]){fixture.outcome='409';form=fresh();form.setCatalogReference('birthCountry',{...country,code:'228'});form.person.telephone='5500000062';await form.save();assert.equal(form.conflict,true);assert.ok(form.reviewDifferences.some(x=>x.key==='birthCountry'&&x.saved.includes('142')&&x.draft.includes('228')));form.reconcile(keep);assert.equal(form.identity.birthCountry.code,keep?'228':'142');assert.equal(form.person.telephone,'5500000062');}
  fixture.outcome='success';fixture.patient=clone(original);
  results.push('CAT-R9:409 review includes catalog differences; both choices preserve contact and never automatically save');
  const report={scope:'Real Vue 2 administrative component + real DAPxService with synthetic DACore; no HTTP/DB/staging acceptance',results,reads,requests:clone(fixture.requests)};
  if(process.env.NC1_UX1_EVIDENCE)fs.writeFileSync(process.env.NC1_UX1_EVIDENCE,JSON.stringify(report,null,2)+'\n');
  console.log('PASS NC1-UX1 implementation: '+results.join('; '));
})().catch(error=>{console.error(error);process.exitCode=1;});
