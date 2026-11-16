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
const sfc=compiler.parseComponent(fs.readFileSync(path.join(__dirname,'../../../src/views/Patient/components/PatientAdministrativeForm.vue'),'utf8'));
assert.deepEqual(compiler.compile(sfc.template.content).errors,[]);
assert.ok(!sfc.script.content.includes('window.confirm'));
const ctx={DAPxService:serviceContext.module.exports,...helperContext.module.exports,...authContext.module.exports,module:{exports:{}}};
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
  form=fresh();form.changeSurnameStatus('firstSurname','present');form.identity.firstSurname='De la Cruz';form.changeSurnameStatus('secondSurname','present');form.identity.secondSurname='López';payload=form.buildPayload();assert.equal(payload.person.surname,'De la Cruz López');assert.equal(form.legacySurname,'De la Cruz López');assert.equal(form.surnameStates.length,3);
  const surnameKeys=['firstSurname','secondSurname','firstSurnameStatus','secondSurnameStatus'];
  fixture.patient=clone(original);fixture.outcome='success';
  form=fresh();assert.equal(form.identityGroupStatus,'Identidad por completar');form.changeSurnameStatus('firstSurname','present');form.identity.firstSurname='De la Cruz';
  payload=form.buildPayload();assert.ok(surnameKeys.every(key=>!(key in (payload.identity||{}))));assert.equal(payload.person.surname,'De la Cruz López');assert.equal(form.hasSavableChanges,false);
  let count=fixture.requests.length,eventCount=events.length;await form.save();assert.equal(fixture.requests.length,count);assert.equal(form.identity.firstSurname,'De la Cruz');
  form.identity.givenNames='Marina QA';form.identity.birthDate='2001-12-31';form.identity.biologicalSex='2';form.person.telephone='5500000041';form.address.direction='Domicilio sintético H1';
  payload=form.buildPayload();assert.ok(surnameKeys.every(key=>!(key in payload.identity)));assert.equal(payload.identity.givenNames,'Marina QA');assert.equal(payload.identity.birthDate,payload.person.birthday);assert.equal(payload.identity.biologicalSex,'2');
  assert.equal(validateFixtureAdministrative(payload),'');await form.save();assert.equal(events.length,eventCount);assert.equal(fixture.patient.person.surname,'De la Cruz López');assert.equal(fixture.patient.identity.legacySurname,'De la Cruz López');assert.equal(fixture.patient.identity.firstSurnameStatus,'unknown');assert.equal(fixture.patient.person.telephone,'5500000041');assert.equal(fixture.patient.address.direction,'Domicilio sintético H1');assert.equal(form.identity.firstSurname,'De la Cruz');assert.equal(form.identity.firstSurnameStatus,'present');assert.equal(form.identity.secondSurnameStatus,'unknown');assert.equal(form.identityGroupStatus,'Apellidos por confirmar');assert.equal(form.hasSavableChanges,false);assert.equal(form.dirty,true);
  form.changeSurnameStatus('secondSurname','present');form.identity.secondSurname='López QA';payload=form.buildPayload();assert.ok(surnameKeys.every(key=>key in payload.identity));assert.equal(payload.expectedRevision,fixture.patient.identity.revision);assert.equal(payload.person.surname,'De la Cruz López QA');await form.save();assert.equal(events.length,eventCount+1);assert.equal(fixture.patient.person.surname,'De la Cruz López QA');assert.equal(fixture.patient.identity.legacySurname,'De la Cruz López');assert.equal(fresh().identityGroupStatus,'Identidad confirmada');
  results.push('H1: first surname alone is omitted with both states; no empty write; other groups save while capture stays open; both confirmed send jointly, update mirror and preserve legacy');
  form=fresh();form.applySurnameStatus('secondSurname','absent_declared');payload=form.buildPayload();assert.equal(payload.person.surname,'De la Cruz');await form.save();assert.equal(fixture.patient.person.surname,'De la Cruz');
  form=fresh();form.applySurnameStatus('firstSurname','absent_declared');payload=form.buildPayload();assert.equal(payload.person.surname,'');assert.ok(validateFixtureAdministrative(payload));const beforeAbsent=JSON.stringify(fixture.patient);await form.save();assert.ok(form.error);assert.equal(JSON.stringify(fixture.patient),beforeAbsent);assert.equal(form.identity.firstSurnameStatus,'absent_declared');
  form=fresh();form.applySurnameStatus('firstSurname','unknown');form.person.telephone='5500000042';payload=form.buildPayload();assert.ok(surnameKeys.every(key=>!(key in (payload.identity||{}))));await form.save();assert.equal(fixture.patient.identity.firstSurnameStatus,'present');assert.equal(fixture.patient.person.surname,'De la Cruz');assert.equal(form.identity.firstSurnameStatus,'unknown');
  results.push('H1: present/absent joins only present surname; both absent rejected by equivalent nonempty legacy validator; reverting one to unknown defers all surname changes');
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
  form=fresh();let cancelled=0;form.$on('cancel',()=>cancelled++);form.applySurnameStatus('firstSurname','present');form.identity.firstSurname='De la Cruz';form.changeSurnameStatus('firstSurname','unknown');assert.equal(form.pendingConfirmation.kind,'surname');assert.equal(form.identity.firstSurname,'De la Cruz');form.resolveConfirmation(false);assert.equal(form.identity.firstSurnameStatus,'present');form.changeSurnameStatus('firstSurname','unknown');form.resolveConfirmation(true);assert.equal(form.identity.firstSurnameStatus,'unknown');assert.equal(form.identity.firstSurname,null);form.identity.givenNames='Pendiente';form.cancel();assert.equal(cancelled,0);assert.equal(form.pendingConfirmation.kind,'discard');form.resolveConfirmation(false);assert.equal(cancelled,0);form.cancel();form.resolveConfirmation(true);assert.equal(cancelled,1);
  results.push('P3: identity status reflects pending/complete data; app confirmation supports cancel/accept for surname removal and discard; existing affiliations display and retain references');
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
  assert.equal(form.identity.firstSurnameStatus,'unknown');assert.equal(form.person.birthday,'1992-06-18');
  results.push('UX1I-1 legacy: missing identity remains absent in both emitted DTOs; defaults exist only inside the form');
  const savedGet=serviceContext.DACore.get;form=fresh();form.person.telephone='5500000045';eventCount=events.length;serviceContext.DACore.get=async url=>{const result=await savedGet(url);store.state.CORE.AUTH.accessRevision++;return result;};await form.save();assert.equal(events.length,eventCount);assert.equal(form.awaitingReload,true);serviceContext.DACore.get=savedGet;
  results.push('Authorization generation change during read suppresses saved/refreshed publication');
  const report={scope:'Real Vue 2 administrative component + real DAPxService with synthetic DACore; no HTTP/DB/staging acceptance',results,reads,requests:clone(fixture.requests)};
  if(process.env.NC1_UX1_EVIDENCE)fs.writeFileSync(process.env.NC1_UX1_EVIDENCE,JSON.stringify(report,null,2)+'\n');
  console.log('PASS NC1-UX1 implementation: '+results.join('; '));
})().catch(error=>{console.error(error);process.exitCode=1;});
