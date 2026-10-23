/* Real SFC methods/computed and print renderer with in-memory doubles.
 * No HTTP, database, uploads, signatures or prescription emissions. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const clone = value => JSON.parse(JSON.stringify(value));
const deferred = () => {let resolve; const promise = new Promise(done => {resolve=done;}); return {promise,resolve};};
function source(file) {return fs.readFileSync(path.join(root,file),'utf8');}
function component(file, bindings={}) {
    const sfc=compiler.parseComponent(source(file));
    assert.deepEqual(compiler.compile(sfc.template.content).errors,[],file+' compiles');
    const sandbox={...require('./agenda-test-helpers.cjs'),ClinicTimeZoneField:{},component:null,PreparationGuide:{},authorizationContext:()=>({}),isCurrentAuthorization:()=>true, mapGetters:()=>({}),moduleTypes:{AUTH:{}},fnTypes:{},...bindings};
    vm.runInNewContext(sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export default','component ='),sandbox);
    return {options:sandbox.component,template:sfc.template.content};
}
function view(options, extras={}) {
    const result={$emit(...args){result.events.push(args);},events:[],$nextTick:fn=>fn(),$set:(object,key,value)=>{object[key]=value;},$refs:{},...extras};
    Object.entries(options.methods||{}).forEach(([key,fn])=>result[key]=fn.bind(result));
    Object.assign(result,options.data ? options.data.call(result) : {},extras);
    Object.entries(options.computed||{}).forEach(([key,getter])=>Object.defineProperty(result,key,{configurable:true,get:()=>getter.call(result)}));
    return result;
}
function loadPrint() {
    const module={exports:{}};
    const code=babel.transformSync(source('src/domain/prescriptions/prescription.print.js'),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
    new Function('module','exports',code)(module,module.exports);
    return module.exports;
}
const {buildPrescriptionPrintHtml:print,buildPrescriptionPreviewHtml:preview}=loadPrint();
const issued={status:'issued',university_snapshot:'QA UNIVERSITY',specialty_snapshot:'QA SPECIALTY',specialty_license_snapshot:'QA SPECIALTY LICENSE',footer_note_snapshot:'QA FOOTER',header_image_snapshot:'QA_HEADER_IMAGE',background_image_snapshot:'QA_BACKGROUND_IMAGE',items:[]};
for(const flags of [{show_university:false,show_specialty:false,show_footer_note:false},{show_university:0,show_specialty:'0',show_footer_note:'false'}]) {
    for(const snapshot of [flags,JSON.stringify(flags)]) {
        const html=print({...issued,template_snapshot:snapshot},{show_university:true,show_specialty:true,show_footer_note:true});
        assert.doesNotMatch(html,/QA UNIVERSITY|QA SPECIALTY|QA FOOTER/,'Saved visibility must override current configuration');
    }
}
for(const template_snapshot of [undefined,null,'invalid legacy JSON',{}]) assert.match(print({...issued,template_snapshot},{show_university:false}),/QA UNIVERSITY/,'Legacy missing preferences preserve previously visible content');
const header=print({...issued,template_snapshot:{template_mode:'header'}});
assert.match(header,/QA_HEADER_IMAGE/);assert.doesNotMatch(header,/QA_BACKGROUND_IMAGE/);
const background=print({...issued,template_snapshot:{template_mode:'background',background_opacity:0.25}});
assert.doesNotMatch(background,/QA_HEADER_IMAGE/);assert.match(background,/QA_BACKGROUND_IMAGE/);assert.match(background,/rgba\(255,255,255,0.75\)/);
assert.match(print({...issued,template_snapshot:{template_mode:'background',background_opacity:0}}),/rgba\(255,255,255,1\)/);
assert.match(print({...issued,template_snapshot:{template_mode:'background',background_opacity:1}}),/rgba\(255,255,255,0\)/);
assert.equal(print({...issued,status:'draft'}),'','A draft cannot enter the print flow');
const previewHtml=preview({clinic_address:'Domicilio QA visible',clinic_phone:'5512345678',show_university:false,show_specialty:false,show_footer_note:false,footer_note:'QA FOOTER',template_mode:'background',background_image:'QA_BACKGROUND_IMAGE',background_opacity:0.25},{professional_name:'Doctor QA',university:'QA UNIVERSITY',specialty:'QA SPECIALTY'});
assert.match(previewHtml,/Domicilio QA visible/);assert.match(previewHtml,/QA_BACKGROUND_IMAGE/);assert.match(previewHtml,/rgba\(255,255,255,0.75\)/);assert.doesNotMatch(previewHtml,/QA UNIVERSITY|QA SPECIALTY|QA FOOTER/);
console.log('PASS UX12 print/preview: false flags, saved snapshot priority, legacy defaults, header/background modes, opacity boundaries, address and draft restriction.');

(async()=>{
    let saveCalls=0, response={success:false,status:400,message:'No se pudo guardar.'};
    const recipe=component('src/views/configuration/components/PrescriptionConfig.vue',{buildPrescriptionPreviewHtml:preview,isTenantAdministrator:role=>role==='admin',DAPrescriptionService:{saveConfig:async()=>{saveCalls++;return response;}}});
    const recipeView=view(recipe.options,{selectedDoctorId:'qa-doctor',loading:false,hasPermission:()=>true,authUser:{id_login:'qa-actor'},role:'admin'});
    let focused=0;recipeView.$refs.validationSummary={focus(){focused++;}};
    recipeView.form.clinic_phone='ABC';recipeView.form.clinic_address='   ';
    assert.ok(recipeView.configErrors.clinic_phone);assert.ok(recipeView.configErrors.clinic_address);
    await recipeView.save();assert.equal(saveCalls,0);assert.equal(focused,1);
    recipeView.form.clinic_phone='+52 (55) 1234-5678';recipeView.form.clinic_address='Domicilio QA';
    assert.equal(recipeView.isFormatReady,true);
    await recipeView.save();assert.equal(saveCalls,1);assert.equal(recipeView.saving,false);assert.match(recipeView.saveError,/No se pudo guardar/);assert.equal(recipeView.form.clinic_address,'Domicilio QA');
    const gate=deferred();response=gate.promise;
    const pending=recipeView.save();await recipeView.save();assert.equal(saveCalls,2,'A pending save blocks reentry');
    recipeView.form.clinic_address='Edición posterior';
    gate.resolve({success:true,data:{clinic_address:'Domicilio QA',clinic_phone:'+52 (55) 1234-5678',show_university:1,show_specialty:1,show_footer_note:1}});
    await pending;assert.equal(recipeView.form.clinic_address,'Edición posterior');assert.equal(recipeView.dirty,true,'Late edits stay pending after the submitted snapshot succeeds');
    assert.match(recipe.template,/<iframe[^>]+sandbox=""[^>]+:srcdoc="previewHtml"/);
    assert.match(recipe.template,/label="Domicilio completo del consultorio \(obligatorio\)"/);
    console.log('PASS UX12 recipe form: invalid input blocks save/focuses errors, valid international format, failed save retention, double-submit lock and late-edit preservation.');

    let loadCalls=0;
    const appointmentService={doctors:async()=>({success:true,data:[{id_login:'colleague',id_doctor_professional_profile:'colleague-profile',display_name:'Colleague'}]})};
    const agenda=component('src/views/configuration/components/ProfessionalAgendaConfig.vue',{
        isTenantAdministrator:()=>false,getSettingsSections:()=>[{key:'doctor-identity'}],DAAppointmentService:appointmentService,
        normalizeAppointmentConfig:value=>({workingDays:[],blockedDates:[],blockedHours:[],...value}),WEEK_DAYS:[{value:1,label:'Lunes'}],createId:()=>Math.random().toString(36),
        timeToMinutes:value=>{const [h,m]=String(value).split(':').map(Number);return h*60+m;}
    });
    const agendaView=view(agenda.options,{authUser:{id_login:'new-doctor'},hasPermission:()=>false,role:'doctor'});
    agendaView.load=async()=>{loadCalls++;};await agendaView.init();
    assert.equal(agendaView.options.length,0);assert.equal(agendaView.selected,'');assert.equal(loadCalls,0,'An excluded colleague cannot be auto-selected');
    agendaView.form.defaultAppointmentDuration=30;
    agendaView.editingDay={timeRanges:[{startTime:'08:00',endTime:'12:00'}]};agendaView.addEditingRange();
    assert.equal(agendaView.editingDay.timeRanges[1].startTime,'12:00');assert.equal(agendaView.validateRanges(agendaView.editingDay.timeRanges),'');
    agendaView.editingDay={timeRanges:[{startTime:'00:00',endTime:'23:59'}]};agendaView.addEditingRange();assert.equal(agendaView.editingDay.timeRanges.length,1);assert.match(agendaView.editingDayError,/No queda/);
    agendaView.blocks=[];agendaView.editingBlockIndex=-1;agendaView.editingBlock={repeats:false,allDay:true,date:''};
    assert.equal(agendaView.applyBlock(),false);assert.equal(agendaView.blocks.length,0);
    agendaView.editingBlock.date='2026-02-31';assert.equal(agendaView.applyBlock(),false);
    agendaView.editingBlock.date='2026-10-16';assert.equal(agendaView.applyBlock(),true);assert.equal(agendaView.blocks.length,1);
    agendaView.editingBlock={repeats:true,allDay:true,dayOfWeek:1};assert.equal(agendaView.applyBlock(),true);
    console.log('PASS UX12 agenda: allowed options only, nonoverlapping range insertion, no-gap explanation, required real calendar date and weekly blocks.');

    let reads=0, versions=0, allowDiscard=false, guardRegistered=0, guardRemoved=0, versionResponse={success:false,status:400,message:'Fallo simulado.'};
    const serverSchema={sections:Array.from({length:3},(_,index)=>({key:'custom_'+index,label:'Sección '+index,order:index+1,enabled:true,system:false,fields:Array.from({length:8},(_,field)=>({key:'custom_field_'+field,label:'Campo '+field,type:'text',required:false,enabled:true,system:false}))}))};
    const templateResponse=()=>({success:true,data:{source:'BUSINESS',template:{id_clinical_history_template:'qa-template',schema_json:clone(serverSchema),name:'QA',version_number:1,is_active:true}}});
    let readResponse=templateResponse();
    const clinical=component('src/views/configuration/components/ClinicalHistoryTemplateConfig.vue',{
        dialogName:{},buildLicenseLimitMessage:(_response,fallback)=>fallback,confirmSettingsDiscard:async()=>allowDiscard,
        registerSettingsNavigationGuard:()=>{guardRegistered++;return()=>{guardRemoved++;};},
        DAClinicalHistoryTemplateService:{getCurrent:async()=>{reads++;return readResponse;},createVersion:async(_id,body)=>{versions++;assert.notEqual(body.schema_json,clinicalView.schema);return versionResponse;}}
    });
    const clinicalView=view(clinical.options,{hasPermission:()=>true,authBusiness:{plan:'pro'}});
    assert.equal(clinicalView.countLabel(0,'campo','campos'),'0 campos');
    assert.equal(clinicalView.countLabel(1,'campo','campos'),'1 campo');
    assert.equal(clinicalView.countLabel(2,'campo','campos'),'2 campos');
    assert.equal(clinicalView.countLabel(1,'obligatorio','obligatorios'),'1 obligatorio');
    assert.equal(clinicalView.countLabel(1,'campo visible','campos visibles'),'1 campo visible');
    assert.equal(clinicalView.countLabel(1,'sección','secciones'),'1 sección');
    assert.match(clinical.template,/countLabel\(section.fields.length, 'campo', 'campos'\)/);
    assert.match(clinical.template,/countLabel\(requiredFieldCount\(section\), 'obligatorio', 'obligatorios'\)/);
    assert.match(clinical.template,/countLabel\(selectedSection.fields.length, 'campo visible', 'campos visibles'\)/);
    await clinicalView.loadTemplate();assert.equal(clinicalView.canEditTemplate,true);assert.equal(clinicalView.selectedPreviewFields.length,8);assert.equal(clinicalView.previewVisibleFields(clinicalView.schema.sections[0]).length,8);
    clinicalView.schema.sections[0].description='Edición local';
    const priorReads=reads;await clinicalView.reloadTemplate();assert.equal(reads,priorReads);assert.equal(clinicalView.schema.sections[0].description,'Edición local');
    allowDiscard=true;await clinicalView.reloadTemplate();assert.equal(reads,priorReads+1);assert.equal(clinicalView.hasUnsavedChanges,false);
    clinicalView.openSectionDialog(clinicalView.schema.sections[0],0);
    for(const order of [-1,0,1.5,4]) {clinicalView.sectionForm.order=order;assert.equal(clinicalView.saveSectionDialog(),false);assert.equal(clinicalView.schema.sections[0].order,1);}
    clinicalView.sectionForm.order=3;clinicalView.saveSectionDialog();
    assert.deepEqual(clone(clinicalView.orderedSections.map(section=>section.order)),[1,2,3]);assert.equal(clinicalView.schema.sections[0].order,3);assert.equal(clinicalView.hasUnsavedChanges,true);
    readResponse={success:false,message:'Fallo de lectura'};const local=JSON.stringify(clinicalView.schema);await clinicalView.loadTemplate();assert.equal(JSON.stringify(clinicalView.schema),local);assert.ok(clinicalView.loadError);assert.equal(clinicalView.canEditTemplate,false);assert.equal(clinicalView.isLoading,false);
    readResponse=templateResponse();await clinicalView.loadTemplate();
    clinicalView.schema.sections[0].description='Pendiente';await clinicalView.saveNewVersion();assert.equal(versions,1);assert.equal(clinicalView.isSaving,false);assert.equal(clinicalView.hasUnsavedChanges,true);
    const versionGate=deferred();versionResponse=versionGate.promise;const saveVersion=clinicalView.saveNewVersion();await new Promise(resolve=>setImmediate(resolve));await clinicalView.saveNewVersion();assert.equal(versions,2);
    clinicalView.schema.sections[0].description='Edición posterior al envío';versionGate.resolve({success:true});await saveVersion;assert.equal(clinicalView.schema.sections[0].description,'Edición posterior al envío');assert.equal(clinicalView.hasUnsavedChanges,true);
    clinical.options.mounted.call(clinicalView);assert.equal(guardRegistered,1);clinical.options.beforeDestroy.call(clinicalView);assert.equal(guardRemoved,1);
    assert.equal((clinical.template.match(/v-dialog-name=/g)||[]).length,5);assert.equal((clinical.template.match(/aria-label="Cerrar /g)||[]).length,5);
    assert.match(clinical.template,/Aplicar al borrador/);assert.match(clinical.template,/\$emit\('contact-plan'/);
    console.log('PASS UX12 clinical template: reload cancel/discard, all preview fields, local apply/reorder, failed-load capture retention, save double-submit/failure/late-edit retention, navigation cleanup and named dialogs.');
})().catch(error=>{console.error(error);process.exitCode=1;});
