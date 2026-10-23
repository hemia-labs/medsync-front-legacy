// First-run component state, permissions and request races. No browser, API or DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const importSource = file => import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`);
const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; };
const load = (file, context) => {
    const sfc = compiler.parseComponent(read(file));
    assert.deepEqual(compiler.compile(sfc.template.content).errors, [], `${file}: compiles`);
    vm.runInNewContext(sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
    return context.component;
};
const state = (options, extras) => {
    const view = { ...options.data(), ...extras };
    Object.entries(options.methods).forEach(([key, method]) => { view[key] = method.bind(view); });
    Object.entries(options.computed).forEach(([key, getter]) => Object.defineProperty(view, key, { get: () => getter.call(view) }));
    return view;
};
(async () => {
    const branches=await importSource('src/domain/onboarding/preparationGuide.js');
    assert.equal(Object.keys(branches.preparationBranches).length,6);
    const branchContext={business:'tenant-a',user:'u'};
    assert.notEqual(branches.branchKey(branchContext,'prescriptions','a'),branches.branchKey(branchContext,'prescriptions','b'));
    assert.notEqual(branches.branchKey(branchContext,'identity',''),branches.branchKey({...branchContext,business:'tenant-b'},'identity',''));
    assert.deepEqual(Object.keys(branches.branchRecord('prescriptions',{version:1,step:999,state:'completed',form:{secret:1},agendaReady:true})).sort(),['state','step','updatedAt','version']);
    assert.equal(branches.branchRecord('prescriptions',{version:1,step:999}).step,3);
    assert.equal(branches.branchRecord('prescriptions',{version:2}),null);
    for(const file of ['PreparationGuide.vue','PrescriptionConfig.vue','ClinicalHistoryTemplateConfig.vue']){
      const template=compiler.parseComponent(read('src/views/configuration/components/'+file)).template.content;
      assert.deepEqual(compiler.compile(template).errors,[],file+' compiles');
    }
    console.log('PASS F/G registry: six real branches, tenant/doctor visual isolation, allowlisted metadata and Vue2 template compilation.');
    {
    const guide = await importSource('src/domain/onboarding/agendaGuide.js');
    const {guideContext}=await importSource('src/domain/onboarding/context.js');
    assert.equal(guideContext({id_login:'a'},'admin',()=>true,1,{id_business:'clinic'}).business,'clinic','D2 carries business separately from user');
    assert.notEqual(guideContext({id_login:'a'},'admin',()=>true,1,{id_business:'clinic'}).key,guideContext({id_login:'a'},'admin',()=>true,1,{id_business:'other'}).key);
    const moduleSource=read('src/store/modules/onboarding/index.js').replace(/^import[^\n]*\n/gm,'').replace('export function createOnboardingModule','function createOnboardingModule').replace(/export default createOnboardingModule[^;]+;/,'moduleFactory = createOnboardingModule;');
    const sandbox={...guide,moduleFactory:null,DABusinessService:{},window:{},Date,Set};
    vm.runInNewContext(moduleSource,sandbox);
    let apiCalls=0, pendingRead;
    const memory=new Map(), storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
    const module=sandbox.moduleFactory({getPreparation:()=>{apiCalls++;return pendingRead.promise;}},()=>storage);
    const model=module.state(), context={state:model,commit:(name,value)=>module.mutations[name](model,value),dispatch:(name,value)=>Promise.resolve(module.actions[name](context,value))};
    await context.dispatch('context',{key:'a:clinic:1',user:'a',business:'clinic'});
    await context.dispatch('subject','doctor-a');
    pendingRead=deferred();const initial=context.dispatch('begin');const duplicate=context.dispatch('refresh');
    assert.equal(apiCalls,1,'Read is coalesced for the same context');
    const status={success:true,data:{steps:[],pending:0,completed:0,agenda:{subject:'doctor-a',configurationState:'absent'}}};
    pendingRead.resolve(status);await initial;await duplicate;
    await context.dispatch('subject','doctor-fresh');
    assert.equal(model.step,'timezone','A newly selected profile requires explicit timezone review');
    await context.dispatch('move',1);assert.equal(model.step,'duration');
    await context.dispatch('pause');await context.dispatch('subject','doctor-a');await context.dispatch('subject','doctor-fresh');
    assert.equal(model.step,'duration','Timezone review does not overwrite the resumed step');
    context.commit('patch',{status:status.data});
    assert.equal(guide.canContinueExplanation({loaded:true,dirty:true,draftValidation:'unknown'},guide.stepById('activation')),true);
    assert.equal(guide.canContinueExplanation({loaded:true,pendingModalCapture:true},guide.stepById('hours')),false);
    assert.match(guide.stepsFor('business').find(step=>step.id==='activation').text,/Consultorio disponible/);
    assert.match(guide.stepsFor('business').find(step=>step.id==='activation').text,/cierres por fecha/);
    assert.equal(guide.stepsFor('business').some(step=>step.id==='duration'),false);
    context.commit('patch',{step:'activation'});await context.dispatch('move',1);assert.equal(model.step,'save','Absent server config cannot prevent reaching Save');
    await context.dispatch('pause','deferred');assert.equal(model.status.agenda.configurationState,'absent');
    const saved=JSON.parse([...memory.values()].pop());assert.equal(saved.state,'deferred');assert.equal(saved.step,'save');assert.equal(saved.version,1);
    assert.doesNotMatch(JSON.stringify(saved),/configurationState|agendaReady|dirty|signature|"timezone":|America\/|permissions/);
    await context.dispatch('restore');assert.equal(model.guide,'deferred');
    pendingRead=deferred();const stale=pendingRead;const requestA=context.dispatch('refresh');
    await context.dispatch('context',{key:'b:other:2',user:'b',business:'other'});
    stale.resolve(status);await requestA;assert.equal(model.status,null,'A prior tenant response cannot enter a new context');
    await context.dispatch('subject','doctor-b');pendingRead=deferred();const requestB=context.dispatch('refresh');
    pendingRead.resolve(status);await requestB;assert.equal(model.status,null);assert.ok(model.error,'Mismatched doctor result is rejected');
    storage.setItem=()=>{throw Error('quota');};await context.dispatch('pause','paused');assert.equal(model.storageFailed,true);assert.equal(model.guide,'paused');
    assert.notEqual(guide.visualKey({user:'a',business:'clinic'},'A'),guide.visualKey({user:'a',business:'clinic'},'B'));
    for(const raw of [JSON.stringify({version:0,state:'completed'}),JSON.stringify({version:1,state:'agendaReady'}),'x'.repeat(4097)])assert.equal(guide.readVisual({getItem:()=>raw},'key'),null);
    assert.throws(()=>guide.readVisual({getItem:()=>'{bad'},'key'));
    const ownTask={id:'profile',ready:false,action:{path:'/admin?section=doctor-identity'}},sharedTask={id:'business',ready:false,action:{path:'/admin?section=identity'}};
    assert.equal(guide.nextPreparation({agenda:{subject:'b',subjectIsOwn:false},steps:[ownTask,sharedTask]},['doctor-identity','identity']),sharedTask,'Preparing another doctor never requires the administrators own profile');
    context.commit('editor',{instanceId:'current',requestSequence:4,subject:'doctor-b',contextKey:model.context.key});
    const before=apiCalls;await context.dispatch('saved',{instanceId:'current',requestSequence:3,subject:'doctor-b',contextKey:model.context.key,kind:'schedule'});assert.equal(apiCalls,before,'Old editor request cannot verify a later draft');
    await context.dispatch('restore');assert.equal(model.guide,'paused','Failed storage uses scoped memory');
    console.log('PASS CO23 CP1: visual/draft/persisted separation, Save reachable, scoped recovery, quota fallback, coalescing and stale/mismatched doctor results (domain and service doubles).');
    }
    const { getSettingsSections } = await importSource('src/security/settingsAccess.js');
    {
      let answer=deferred(),reads=0;
      const storage={getItem:()=>null,setItem:()=>{throw Error('quota');}};
      const guideOptions=load('src/views/configuration/components/PreparationGuide.vue',{GuideSpotlight:{},PreparationJourney:{},journeyRequirement:()=>'',component:null,mapGetters:()=>({}),moduleTypes:{AUTH:{}},fnTypes:{},...branches,guideContext:()=>({key:'ctx',user:'actor',business:'clinic'}),getSettingsSections,DABusinessService:{getPreparation:()=>{reads++;return answer.promise;}},localStorage:storage});
      const guide=state(guideOptions,{branch:'identity',stage:'edit',subject:'',dirty:true,busy:false,user:{},role:'admin',hasPermission:()=>true,$store:{state:{CORE:{AUTH:{}}}},$route:{query:{}},$nextTick:fn=>fn(),$refs:{}});
      guide.start();guide.goTo('save');assert.equal(guide.step[0],'save','Dirty capture does not prevent reaching Save explanation');assert.equal(guide.storageFailed,true);assert.equal(reads,1);
      answer.resolve({success:true,data:{steps:[{id:'identity',detail:'Persisted result'}]}});await new Promise(resolve=>setImmediate(resolve));assert.equal(guide.result,'Persisted result');
      answer=deferred();const pending=guide.verify();guide.request++;guide.result='New context';answer.resolve({success:false});await pending;assert.equal(guide.result,'New context');assert.equal(guide.error,'');
      console.log('PASS F/G guide: dirty explanation advance, storage quota fallback, persisted read and obsolete failure ignored (doubles).');
    }

    let calls = 0, response = null;
    const service = { getPreparation: () => { calls++; return typeof response === 'function' ? response() : response; } };
    const context = { component: null, ...branches, mapGetters: () => ({}), moduleTypes: { AUTH: {} }, fnTypes: {}, DABusinessService: service, getSettingsSections, window: { removeEventListener: () => {} } };
    const options = load('src/views/configuration/components/PreparationChecklist.vue', context);
    // Render the real template while the response is delayed: a prepared clinic
    // must not briefly mount the onboarding card on entry or focus refresh.
    const Vue = require('vue');
    const template = compiler.parseComponent(read('src/views/configuration/components/PreparationChecklist.vue')).template.content;
    const render = compiler.compileToFunctions(template);
    const card = new Vue({ ...render, data: () => ({ ...options.data(), user: { id_login: 'qa', id_business: 'qa' }, role: 'admin', showCompleted: false, hasPermission: () => false }), computed: options.computed, methods: options.methods });
    const visible = () => !card._render().isComment;
    const delayed = deferred(); response = () => delayed.promise;
    const firstLoad = card.load();
    assert.equal(visible(), false, 'Home does not mount preparation before its response');
    delayed.resolve({ success: true, data: { pending: 0, completed: 0, steps: [] } }); await firstLoad;
    assert.equal(visible(), true, 'A configured clinic receives a confirmed completion message');
    card.dismissCompletion();
    assert.equal(visible(), false, 'Completion can be dismissed');
    const refresh = deferred(); response = () => refresh.promise;
    const refreshing = card.load();
    assert.equal(visible(), false, 'Refreshing a configured clinic does not flash the card');
    refresh.resolve({ success: true, data: { pending: 1, completed: 0, steps: [{ id: 'pending', ready: false }] } }); await refreshing;
    assert.equal(visible(), true, 'Actual pending configuration is shown after confirmation');
    card.status = null; card.loading = true; card.showCompleted = true;
    assert.equal(visible(), true, 'Settings retains its explicit loading feedback');
    card.showCompleted = false; card.loading = false; card.error = 'Error de consulta';
    assert.equal(visible(), true, 'A query failure remains visible for retry');
    card.$destroy();
    let permissions = new Set(['documents.view']);
    const make = extras => state(options, { user: { id_login: 'qa-user', id_business: 'qa-tenant' }, role: 'admin', showCompleted: false, hasPermission: code => permissions.has(code), ...extras });
    const view = make();
    view.$store={state:{CORE:{AUTH:{business:{id_business:'d2-a'},accessRevision:1}}}};
    const d2Key=view.sessionKey;view.$store.state.CORE.AUTH.business.id_business='d2-b';assert.notEqual(view.sessionKey,d2Key,'D2 checklist context includes tenant outside user');
    const payload = { success: true, data: { completed: 0, pending: 1, steps: [{ id: 'consent', title: 'Consentimiento', ready: false, action: { path: '/admin?section=documents', label: 'Completar' } }] } };
    response = payload;
    await view.load();
    assert.equal(view.status.steps[0].action, null, 'An API action cannot expose a forbidden settings section');
    assert.equal(view.nextStep, null, 'A forbidden requirement is an administrator dependency, not a personal next step');assert.equal(view.dependencies[0].id,'consent');
    permissions.add('documents.config'); await view.load();
    assert.equal(view.status.steps[0].action.path, '/admin?section=documents');

    permissions.add('admin.config');permissions.add('px.dates');
    const profileFirst={success:true,data:{completed:0,pending:3,steps:[
      {id:'identity',ready:false,action:{path:'/admin?section=identity'}},
      {id:'profile',ready:false,action:{path:'/admin?section=doctor-identity'}},
      {id:'agenda',ready:false,action:{path:'/admin?section=doctor-identity'}}
    ]}};
    response=profileFirst;await view.load();
    assert.equal(view.nextStep.id,'profile','Active doctor prerequisite precedes clinic details');
    assert.equal(view.needsAgendaProfile,true);
    let destination='';view.$router={push:async path=>{destination=path;}};
    await view.startGuide();assert.equal(destination,'/admin?section=doctor-identity&guide=1&goal=agenda','Resume resolves the persisted profile prerequisite through the minimal agenda journey');
    profileFirst.data.steps[2].action.path='/admin?section=agenda';await view.load();
    assert.equal(view.needsAgendaProfile,false,'Missing signature must not block Agenda once profile is active');
    assert.equal(view.nextStep.id,'identity');
    console.log('PASS profile-first priority/resume and active profile without signature (service doubles).');

    const old = deferred(), current = deferred();
    response = () => old.promise; const oldLoad = view.load();
    view.user = { id_login: 'qa-new-user', id_business: 'qa-new-tenant' };
    response = () => current.promise; const newLoad = view.load();
    current.resolve({ success: true, data: { completed: 1, pending: 0, steps: [{ id: 'new', ready: true }] } }); await newLoad;
    old.resolve(payload); await oldLoad;
    assert.equal(view.status.steps[0].id, 'new', 'An older tenant response cannot replace the current checklist');
    assert.equal(view.loading, false);

    const signingOut = deferred(); response = () => signingOut.promise;
    const signedInLoad = view.load(); view.user = null; await view.load();
    signingOut.resolve(payload); await signedInLoad;
    assert.equal(view.status, null, 'Logout cancels an in-flight checklist response');
    const beforeSuper = calls; view.user = { id_login: 'qa-super' }; view.role = 'super_admin'; await view.load();
    assert.equal(calls, beforeSuper, 'Super admin does not query tenant preparation');
    const unmount = make(), late = deferred(); response = () => late.promise;
    const pending = unmount.load(); options.beforeDestroy.call(unmount);
    late.resolve(payload); await pending;
    assert.equal(unmount.status, null, 'Destroyed instances ignore late responses');

    response = { success: false }; const failed = make(); await failed.load();
    assert.match(failed.error, /Actualizar preparación/); assert.equal(failed.loading, false); assert.equal(failed.status, null);
    response = payload; await failed.load(); assert.equal(failed.error, ''); assert.ok(failed.status);

    // These rights change which prerequisites the API returns, even when no settings right changes.
    for(const code of ['documents.create', 'clinical_history.finalize']) {
        permissions = new Set(); const permissionView = make();
        const keyBefore = permissionView.sessionKey;
        permissions.add(code);
        assert.notEqual(permissionView.sessionKey, keyBefore, `${code}: grant/revoke must invalidate preparation`);
    }

    let profileResponse = { success: true, data: null }, saveResponse = null, saves = 0;
    const userService = { getProfessionalProfile: () => typeof profileResponse === 'function' ? profileResponse() : profileResponse,
        saveProfessionalProfile: () => { saves++; return saveResponse; } };
    const profileOptions = load('src/views/User/components/DAProfessionalProfile.vue', { PreparationGuide:{}, component: null, mapGetters: () => ({}), moduleTypes: { AUTH: {} }, fnTypes: {}, getSettingsSections, DAUserService: userService, buildLicenseLimitMessage: (_response, fallback) => fallback });
    const events = [];
    const profile = state(profileOptions, { idLogin: 'qa-doctor', adminControlsOnly: false, showAdminControls: false, hideSaveButton: false, role: 'doctor', hasPermission: () => false, $emit: (...args) => events.push(args) });
    await profile.load();
    assert.equal(profile.hasProfile, false); assert.match(profile.professionalProfileLicenseMessage, /sin crear/);
    assert.equal(profile.form.can_issue_prescriptions, false); assert.equal(profile.form.can_sign_documents, false);
    assert.equal(profile.canManageAuthorizations, false, 'A professional cannot grant their own authorization');
    profileResponse = { success: false }; await profile.load(); await profile.save();
    assert.match(profile.loadError, /Reintenta/); assert.equal(saves, 0, 'A failed profile read cannot silently overwrite it');
    const firstRead = deferred(), secondRead = deferred();
    profileResponse = () => firstRead.promise; const readA = profile.load();
    profile.idLogin = 'qa-new-doctor'; profileResponse = () => secondRead.promise; const readB = profile.load();
    secondRead.resolve({ success: true, data: { id_doctor_professional_profile: 'qa-current', professional_name: 'Actual', is_active: 1, can_issue_prescriptions: 0, can_sign_documents: 0 } }); await readB;
    firstRead.resolve({ success: true, data: { id_doctor_professional_profile: 'qa-old', professional_name: 'Anterior' } }); await readA;
    assert.equal(profile.form.professional_name, 'Actual', 'The current profile wins over an older request');
    assert.equal(profile.hasProfile, true); assert.equal(profile.form.can_issue_prescriptions, false);
    profile.form.professional_name = 'Captura sin perder';
    const saving = deferred(); saveResponse = saving.promise;
    const firstSave = profile.save(); await profile.save(); assert.equal(saves, 1, 'Duplicate save clicks are blocked');
    saving.resolve({ success: false, message: 'Error de prueba' }); await firstSave;
    assert.equal(profile.saving, false); assert.equal(profile.form.professional_name, 'Captura sin perder');
    assert.equal(events[0][0], 'error');
    console.log('PASS first-run checklist/profile: scoped actions, old tenant/logout/unmount responses, super-admin exclusion, retry, permission invalidation, new-profile state, profile request races, duplicate saves and capture retention. Mocked services; no database writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
