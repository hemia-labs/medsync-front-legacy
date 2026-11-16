// NC1-FIX1 regression: real component methods; synthetic service persistence, no E2E claims.
// No credentials, network, database or browser session are used.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const clone = value => JSON.parse(JSON.stringify(value));
async function main() {
  const root = path.resolve(__dirname, '../..');
  const out = path.resolve(process.env.NC1_SMOKE_OUTPUT || path.join(root, '.tmp-nc1-fix1-build'));
  fs.mkdirSync(out, { recursive: true });
  const modules = {};
  for (const file of ['domain/clinical-history/history.identification.js', 'domain/clinical-history/history.editor.js', 'domain/clinical-history/vitalSigns.validation.js', 'security/settingsAccess.js', 'domain/patient/allergy.js']) {
    Object.assign(modules, await import(`data:text/javascript;base64,${Buffer.from(fs.readFileSync(path.join(root,'src',file),'utf8')).toString('base64')}`));
  }
  const source = fs.readFileSync(path.join(root, 'src/views/Patient/Sections/MedicalHistory.vue'), 'utf8');
  const script = source.split('<script>')[1].split('</script>')[0].replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component =');
  const service = {};
  const context = { component: null, mapGetters: () => ({}), moduleTypes: { AUTH: {} }, fnTypes: {}, isD2AuthMode: () => true,
    dialogName: {}, fieldError: {}, ...modules, DAClinicalHistoryService: service, DADocumentService: {}, DAPrescriptionService: {}, DAClinicalHistoryTemplateService: {}, window: {}, document: {}, setTimeout, clearTimeout };
  vm.runInNewContext(script, context);
  const options = context.component;
  function fresh(status = 'DRAFT', identification) {
    const state = options.data();
    Object.assign(state, { px: { person: { id_person: 'synthetic-nc1', name: 'Paciente Sintético', surname: 'Prueba', birthday: '2000-01-31', telephone: '5500000001' }, address: { direction: 'Calle Sintética A', residence: 'Ciudad QA', cp: '00000' }, identity: { biologicalSex: '1' } },
      authUser: { id_login: 'synthetic-doctor', name: 'Profesional QA', rol: 'DOCTOR' }, hasPermission: () => true,
      $set: (obj,key,value) => { obj[key] = value; }, $nextTick: fn => fn ? fn() : Promise.resolve(), $route: { query: {} }, notify: () => {} });
    for (const [key, method] of Object.entries(options.methods)) state[key] = method.bind(state);
    for (const [key, getter] of Object.entries(options.computed)) Object.defineProperty(state, key, {get: getter.bind(state), configurable: true});
    state.historyLoaded = true; state.isLoading = false;
    state.clinicalHistory = { id_clinical_history: 'synthetic-history', status, revision: 1, version_number: 1,
      clinical_snapshot_json: { identification: identification === undefined ? state.buildIdentificationSnapshot() : identification, consultation: { reason: 'Motivo guardado' } } };
    state.applyHistoryToForm(state.clinicalHistory);
    state.loadClinicalHistoryVersions = async () => {};
    return state;
  }
  const row = (state, stage, stored = state.clinicalHistory) => ({ stage, status: stored.status, adminPhone: state.px.person.telephone,
    visiblePhone: state.resolveReadonlyFieldValue({key:'identification'}, {source:'patient.phone'}),
    storedPhone: stored.clinical_snapshot_json.identification.phone ?? null,
    printedPhone: state.printablePatient(stored.clinical_snapshot_json.identification).find(x=>x.label==='Teléfono').value,
    visibleAddress: state.form.identification.address, storedReason: stored.clinical_snapshot_json.consultation.reason });
  let state = fresh(); let stored = clone(state.clinicalHistory); const results = [];
  results.push(row(state,'draft-original'));
  state.px.person.telephone = '5500000002'; state.px.address.direction = 'Calle Sintética B';
  state.form.consultation.reason = 'Captura clínica pendiente NC1';
  results.push(row(state,'draft-after-admin-change-before-save'));
  assert.equal(results.at(-1).visiblePhone,'5500000001');
  assert.equal(results.at(-1).printedPhone,'5500000001');
  service.updateDraft = async (id, payload) => { assert.equal(payload.expected_revision, stored.revision); stored = {...stored, revision:stored.revision+1, clinical_snapshot_json:clone(payload.clinical_snapshot_json)}; return {success:true,data:{history:clone(stored)}}; };
  assert.equal(await state.saveDraft(false), true);
  results.push(row(state,'draft-after-save',stored));
  assert.equal(stored.clinical_snapshot_json.identification.phone,'5500000001');
  assert.equal(stored.clinical_snapshot_json.consultation.reason,'Captura clínica pendiente NC1');
  const reopened = fresh(); reopened.px = clone(state.px); reopened.clinicalHistory=clone(stored); reopened.applyHistoryToForm(stored);
  assert.equal(reopened.form.identification.phone,'5500000001');
  results.push(row(reopened,'draft-reopened',stored));
  // Exercise the real finalize method with simulated successful prerequisites/API.
  // This does not prove legal consent, DAO validation or staging finalization.
  state.px.person.telephone='5500000003';
  Object.defineProperty(state,'finalizeBlockReason',{get:()=>'', configurable:true});
  Object.defineProperty(state,'criticalFieldsStatus',{get:()=>[], configurable:true});
  const visibleBeforeFinalize=state.form.identification.phone;
  // STG-C05-1: closing re-reads the server's effective consent and requires the reviewed one.
  service.getByPatient = async () => ({ success:true, data:{ history:{ status:'DRAFT' }, consent_status:'FIRMADO', consent_document_id:'synthetic-consent' } });
  state.reviewedConsentKey = 'FIRMADO|synthetic-consent';
  state.showFinalizeDialog = true; // C05-R2: closing only proceeds while the confirmation is still open
  service.finalize = async(id,revision) => { assert.equal(revision,stored.revision); stored={...stored,status:'FINALIZED',revision:stored.revision+1};return {success:true,data:{history:clone(stored)}}; };
  await state.finalizeHistory();
  results.push({...row(state,'after-finalize-simulated',stored),visibleBeforeFinalize});
  assert.equal(visibleBeforeFinalize,stored.clinical_snapshot_json.identification.phone);
  state.px.person.telephone='5500000004';
  results.push(row(state,'finalized-after-next-admin-change',stored));
  assert.equal(results.at(-1).printedPhone,'5500000001');
  assert.equal(await state.saveDraft(false),false);
  fs.writeFileSync(path.join(out,'finalized-synthetic.html'),state.printableClinicalHistoryHtml({history:stored,patient:{...state.px.person,...state.px.address},business:{name:'Consultorio QA'}}));
  for (const status of ['DRAFT','FINALIZED']) {
    const old=fresh(status,{full_name:'Paciente histórico sintético'});
    const before=JSON.stringify(old.clinicalHistory);
    results.push(row(old,`legacy-${status.toLowerCase()}-missing-fields`));
    assert.equal(results.at(-1).visiblePhone,'No registrado en esta versión');
    assert.equal(results.at(-1).storedPhone,null);
    assert.equal(results.at(-1).printedPhone,'No registrado en esta versión');
    const html=old.printableClinicalHistoryHtml({history:old.clinicalHistory,patient:{...old.px.person,...old.px.address},business:{name:'Consultorio QA'}});
    assert.ok(!html.includes('5500000001'));
    assert.equal(JSON.stringify(old.clinicalHistory),before,'printing does not mutate storage but changes presented historical content');
    fs.writeFileSync(path.join(out,`legacy-${status.toLowerCase()}-synthetic.html`),html);
  }
  const checks = [];
  const clinicalOnly = form => { const value=clone(form); delete value.identification; return JSON.stringify(value); };
  function persistence(s) {
    let record=clone(s.clinicalHistory);
    service.updateDraft=async(id,payload)=>{
      assert.equal(payload.expected_revision,record.revision);
      record={...record,revision:record.revision+1,doctor_responsible_user_id:payload.doctor_responsible_user_id,clinical_snapshot_json:clone(payload.clinical_snapshot_json)};
      return {success:true,data:{history:clone(record)}};
    };
    service.finalize=async(id,revision)=>{
      assert.equal(revision,record.revision);
      record={...record,status:'FINALIZED',revision:record.revision+1};
      return {success:true,data:{history:clone(record)}};
    };
    Object.defineProperty(s,'finalizeBlockReason',{get:()=>'',configurable:true});
    Object.defineProperty(s,'criticalFieldsStatus',{get:()=>[],configurable:true});
    s.reviewedConsentKey='FIRMADO|synthetic-consent'; // matches the service.getByPatient stub above
    s.showFinalizeDialog=true; // C05-R2: closing only proceeds while the confirmation is still open
    return ()=>record;
  }
  state=fresh(); persistence(state);
  state.form.consultation.reason='Pending exact clinical capture';
  const pending=clinicalOnly(state.form);
  state.px.person.telephone='5500000020';state.px.address.direction='Changed address';
  state.keepHistoryIdentification();assert.equal(state.identificationKept,true);
  assert.equal(state.identificationChanges.length,2,'Keeping does not hide differences from the finalization dialog');
  state.px.person.telephone='5500000021';assert.equal(state.identificationKept,false,'A later administrative change needs a new decision');
  state.openIdentificationReview();state.selectedIdentificationFields=['phone'];state.updateHistoryIdentification();
  assert.equal(state.form.identification.phone,'5500000021');
  assert.equal(state.form.identification.address.includes('Calle Sintética A'),true,'Unselected address is preserved');
  assert.equal(clinicalOnly(state.form),pending);assert.equal(state.dirty,true);
  state.openIdentificationReview();state.updateHistoryIdentification();
  assert.equal(state.identificationChanges.length,0);assert.equal(clinicalOnly(state.form),pending);
  await state.finalizeHistory();assert.equal(state.isFinalized,true);
  assert.equal(state.clinicalHistory.clinical_snapshot_json.identification.phone,'5500000021');
  assert.equal(state.printablePatient(state.form.identification).find(x=>x.label==='Teléfono').value,'5500000021');
  assert.equal(clinicalOnly(state.form),pending);checks.push('explicit field selection, keep decision, save/finalize B, all clinical sections preserved');

  assert.equal(modules.identificationDifferences({phone:'55 0000-0001',full_name:'  QA  Patient ',age:0},{phone:'5500000001',full_name:'QA Patient',age:40}).length,0);
  for(const missing of [undefined,null,'','No registrado']) {
    assert.equal(modules.identificationDifferences({phone:missing},{phone:''}).length,0);
    for(const status of ['DRAFT','FINALIZED','INCOMPLETE']) {
      const s=fresh(status,{full_name:missing,phone:missing,age:0,birth_date:missing,address:missing});
      const original=JSON.stringify(s.clinicalHistory);
      const fields=s.printablePatient(s.form.identification);
      assert.equal(fields.find(x=>x.label==='Edad').value,0);
      assert.equal(s.resolveReadonlyFieldValue({key:'identification'},{source:'patient.age'}),0);
      assert.equal(s.printableReadonlyValue({source:'patient.age'},fields,{age:99}),0);
      assert.equal(s.printableReadonlyValue({source:'patient.phone'},fields,{phone:'CURRENT-DATA-MUST-NOT-APPEAR'}),'No registrado en esta versión');
      const html=s.printableClinicalHistoryHtml({history:s.clinicalHistory,patient:{...s.px.person,telephone:'CURRENT-DATA-MUST-NOT-APPEAR',age:99,direction:'CURRENT-ADDRESS'}});
      assert.ok(!html.includes('CURRENT-DATA-MUST-NOT-APPEAR'));assert.ok(!html.includes('CURRENT-ADDRESS'));
      assert.ok(html.includes('No registrado en esta versión'));
      assert.equal(JSON.stringify(s.clinicalHistory),original);
      if(status!=='DRAFT') { assert.equal(s.identificationChanges.length,0);s.selectedIdentificationFields=['phone'];s.updateHistoryIdentification();assert.equal(s.form.identification.phone,missing); }
    }
  }
  state=fresh();state.px={person:{id_person:'synthetic',age:0},address:{}};
  assert.equal(state.buildIdentificationSnapshot().age,0);
  assert.ok(!Object.values(state.buildIdentificationSnapshot()).includes('No registrado'));
  assert.equal(state.calculateAge(new Date().toISOString().slice(0,10)),'0 años');
  checks.push('all four historical absence forms and age zero; no administrative fallback or historical mutation');

  state=fresh('FINALIZED');state.px.person.telephone='5500000099';
  const originalFinalized=JSON.stringify(state.clinicalHistory);
  state.confirmDialog=async()=>true;
  service.createDraft=async payload=>({success:true,data:{history:{...clone(state.clinicalHistory),id_clinical_history:'new-draft',status:'DRAFT',revision:1,clinical_snapshot_json:clone(payload.clinical_snapshot_json)}}});
  await state.createNewVersion();assert.equal(state.isDraft,true);
  assert.equal(state.form.identification.phone,'5500000001');assert.ok(state.identificationChanges.some(x=>x.key==='phone'));
  assert.equal(JSON.parse(originalFinalized).clinical_snapshot_json.identification.phone,'5500000001');
  checks.push('new version retains historical identification and offers reconciliation');

  for(const kind of ['409-response','409-thrown','401','network']) {
    state=fresh();state.form.consultation.reason='Exact pending text '+kind;
    const before=JSON.stringify(state.form),baseline=state.savedSnapshot;
    service.updateDraft=async()=>{
      if(kind==='409-response') return {success:false,status:409,data:{code:'HISTORY_REVISION_CONFLICT'}};
      const error=new Error(kind);if(kind!=='network')error.response={status:kind==='401'?401:409};throw error;
    };
    assert.equal(await state.saveDraft(false),false);assert.equal(JSON.stringify(state.form),before);assert.equal(state.savedSnapshot,baseline);
    assert.equal(state.revisionConflict,kind.startsWith('409'));assert.ok(state.saveError);
    if(!state.revisionConflict) { persistence(state);assert.equal(await state.saveDraft(false),true);assert.equal(JSON.stringify(state.form),before); }
  }
  checks.push('409 (returned/thrown), 401 and network preserve capture; permitted retries preserve text');

  for(const section of ['identification','consultation','allergies_medications']) {
    state=fresh();persistence(state);let finalized=0;
    const originalUpdate=service.updateDraft;
    service.updateDraft=async(id,payload)=>{
      const response=await originalUpdate(id,payload);
      response.data.history.clinical_snapshot_json[section][section==='identification'?'phone':section==='consultation'?'reason':'allergies']='canonical change';
      return response;
    };
    service.finalize=async()=>{finalized++;throw Error('must not finalize');};
    await state.finalizeHistory();assert.equal(finalized,0);assert.equal(state.isDraft,true);
    assert.match(state.saveError,/Revisa los datos/);assert.equal(state.showFinalizeDialog,false);
  }
  checks.push('canonical identification, clinical section and allergy change require re-review');

  state=fresh();persistence(state);state.form.consultation.reason='Allergy race pending clinical text';
  const beforeRace=clinicalOnly(state.form);
  service.finalize=async()=>({success:false,status:409,data:{code:'HISTORY_REVISION_CONFLICT'},message:'Allergy synchronization advanced draft revision'});
  await state.finalizeHistory();assert.equal(state.revisionConflict,true);assert.equal(state.isDraft,true);assert.equal(clinicalOnly(state.form),beforeRace);
  checks.push('allergy change after save: revision conflict blocks closing, preserves capture (server response simulated)');

  const report={date:'2026-11-15',evidenceType:'real Vue component methods; service persistence and finalize prerequisites simulated; no DB/network',baselineSha:'26f450434b08e3de5390a278601d6e2abcc4dbb6',results,checks,
    findings:{visibleEqualsFinalized:true,missingHistoricalFieldsPrintCurrentAdmin:false,pendingClinicalCapturePreservedOnSave:true,completeFinalizedSnapshotPreserved:true}};
  fs.writeFileSync(path.join(out,'characterization.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
