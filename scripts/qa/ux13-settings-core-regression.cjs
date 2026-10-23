/* Real settings SFC/actions/validation/theme with in-memory services and jsdom.
 * No HTTP, database, browser control, uploads, signatures or remote writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const babel=require('@babel/core');
const compiler=require('vue-template-compiler');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://qa.invalid/'});
global.window=dom.window;global.document=dom.window.document;
const copy=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve;return {promise:new Promise(done=>{resolve=done;}),resolve:value=>resolve(value)};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const cache={};
const configService={};
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
function load(file){
    if(cache[file])return cache[file].exports;
    if(file==='src/services/context/core-proccess-context.js')return {DAConfigService:configService};
    const module=cache[file]={exports:{}};
    const code=babel.transformSync(read(file),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
    new Function('require','module','exports',code)(specifier=>{
        if(!specifier.startsWith('.'))return require(specifier);
        const base=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));
        const resolved=[base,base+'.js',base+'/index.js'].find(candidate=>fs.existsSync(path.join(root,candidate)) && fs.statSync(path.join(root,candidate)).isFile());
        assert.ok(resolved,'Resolve '+specifier);return load(resolved);
    },module,module.exports);
    return module.exports;
}
const theme=load('src/plugins/theme.js');
const navigation=load('src/domain/settings/settings.navigation.js');
const {validateBusinessProfile}=load('src/domain/settings/business.validation.js');
const {sanitizeHtmlForDocumentSnapshot}=load('src/utils/sanitizeHtml.js');
const {getSettingsSections}=load('src/security/settingsAccess.js');
const authorization=load('src/security/authorizationContext.js');
const availability=load('src/domain/appointments/availability.js');
const moduleTypes=load('src/store/modules/common/module-types.js').default;
const fnTypes=load('src/store/modules/common/fn-types.js').default;
let businessResponse={success:false},businessSaveResponse={success:false},documentReadResponse={success:false},documentSaveResponse={success:false};
let businessReads=0,businessSaves=0,documentSaves=0,lastBusinessPayload;
const businessService={async getCurrent(){businessReads++;return businessResponse;},async updateCurrent(payload){businessSaves++;lastBusinessPayload=copy(payload);return businessSaveResponse;}};
const documentService={async getTemplates(){return documentReadResponse;},async saveTemplate(){documentSaves++;return documentSaveResponse;}};
const sfc=compiler.parseComponent(read('src/views/configuration/index.vue'));
assert.deepEqual(compiler.compile(sfc.template.content).errors,[],'Real settings template compiles');
const sandbox={component:null,PreparationGuide:{},document:dom.window.document,window:dom.window,URL,console,Promise,
    mapActions:()=>({}),mapGetters:()=>({}),moduleTypes,fnTypes,VuexMixin:{},getSettingsSections,
    ChangePassword:{},AccountLegalDocuments:{},ProfessionalAgendaConfig:{},PrescriptionConfig:{},AdminSummary:{},ClinicalHistoryTemplateConfig:{},RolesPermissionsConfig:{},DAProfessionalProfile:{},
    ...theme,...navigation,...authorization,...availability,validateBusinessProfile,sanitizeHtmlForDocumentSnapshot,
    DABusinessService:businessService,DADocumentService:documentService,DAAppointmentService:{},DAPrescriptionService:{},DAUserService:{},
    buildLicenseLimitMessage:(_response,message)=>message,setStoredLoginLogo:()=>{},resizeImage:()=>{throw Error('Unexpected image read');},
    WEEK_DAYS:[],getAppointmentConfig:()=>({workingDays:[],blockedDates:[],blockedHours:[]}),normalizeAppointmentConfig:value=>value,saveAppointmentConfig:()=>{},createId:()=> 'qa-id'};
vm.runInNewContext(sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export default','component ='),sandbox);
const options=sandbox.component;
function auth(id='tenant-a'){return {authenticated:true,user:{id_login:'qa-actor',id_business:id},business:{id_business:id},role:'admin',permissions:['admin.config','documents.config']};}
function settings(extras={}){
    const guards=[],toasts=[];
    const view={$refs:{},$nextTick:fn=>fn(),$set:(object,key,value)=>{object[key]=value;},$store:{state:{CORE:{AUTH:auth()}}},
        $router:{beforeEach(fn){guards.push(fn);return()=>{guards.splice(guards.indexOf(fn),1);};}},
        $swal:{fire:async()=>({isConfirmed:false})},$emit:()=>{},hasPermission:()=>true,role:'admin',authUser:{id_login:'qa-actor'},authBusiness:{plan:'pro'},activeSection:'identity'};
    Object.entries(options.methods).forEach(([key,fn])=>view[key]=fn.bind(view));
    Object.assign(view,options.data.call(view),extras);
    Object.entries(options.computed).forEach(([key,getter])=>Object.defineProperty(view,key,{configurable:true,get:()=>getter.call(view)}));
    view.toastFunction=(...args)=>toasts.push(args);
    view.toasts=toasts;view.guards=guards;
    return view;
}
const results=[];
async function check(name,run){try{await run();results.push({name,ok:true});console.log('PASS '+name);}catch(error){results.push({name,ok:false});console.error('FAIL '+name+'\n'+error.stack);}}
const savedBusiness={id_business:'tenant-a',name:'Consultorio QA',phone:'0012345678',address:'Domicilio QA',email:'qa@example.test',plan:'pro'};
(async()=>{
    await check('business validation normalizes meaningful required fields, national phone and optional contact/logo',async()=>{
        const valid=validateBusinessProfile({name:'  Consultorio QA  ',phone:'+52 (55) 1234-5678',address:'  Dirección QA  ',email:' qa@example.test ',logoUrl:'https://example.test/logo.png'});
        assert.equal(valid.isValid,true);assert.equal(valid.data.phone,'5512345678');assert.equal(valid.data.name,'Consultorio QA');assert.equal(valid.data.address,'Dirección QA');
        assert.equal(validateBusinessProfile({name:'QA',phone:'0012345678',address:'QA'}).data.phone,'0012345678');
        const invalid=validateBusinessProfile({name:'   ',phone:'abc123',address:' ',email:'correo-invalido',logoUrl:'javascript:alert(1)'});
        assert.deepEqual(Object.keys(invalid.fieldErrors).sort(),['address','email','logoUrl','name','phone']);
        assert.equal(validateBusinessProfile({name:'QA',phone:'5512345678',address:'QA',logoUrl:'https://user:secret@example.test/image'}).isValid,false);
    });
    await check('trial end date uses Mexico City calendar day, 24-hour time and explicit zone with safe fallbacks',async()=>{
        const view=settings();
        const formatted=view.formatBusinessDate('2026-12-16T00:30:00Z');
        assert.match(formatted,/15 de diciembre de 2026/,'UTC midnight must display the preceding date in Mexico City');
        assert.match(formatted,/18:30/,'The time is converted to Mexico City in 24-hour format');
        assert.match(formatted,/\(hora del centro de México\)/);
        assert.doesNotMatch(formatted,/2026-12-16T|\.000Z/,'The account screen must not expose an ISO timestamp');
        assert.equal(view.formatBusinessDate('not-a-date'),'Fecha no disponible');
        for(const empty of ['',null,undefined])assert.equal(view.formatBusinessDate(empty),'Sin periodo de prueba');
    });
    await check('business failed read preserves known capture, blocks edits/save, and retry recovers',async()=>{
        const view=settings();view.businessInfo={...savedBusiness};businessResponse={success:false,message:'Fallo'};
        await view.onGetBusinessInfo();assert.ok(view.businessInfoError);assert.equal(view.businessInfo.name,'Consultorio QA');assert.equal(view.businessInfoOriginal,null);
        const before=businessSaves;view.onStartBusinessInfoEdit();await view.onSaveBusinessInfo();assert.equal(view.businessInfoEditing,false);assert.equal(businessSaves,before);
        businessResponse={success:true,data:savedBusiness};await view.onGetBusinessInfo();assert.equal(view.businessInfoError,'');assert.equal(view.businessInfoOriginal.id_business,'tenant-a');
        view.onStartBusinessInfoEdit();assert.equal(view.businessInfoEditing,true);
    });
    await check('business invalid submit is inline, failure preserves capture, save normalization and reentry lock',async()=>{
        const view=settings();businessResponse={success:true,data:savedBusiness};await view.onGetBusinessInfo();view.onStartBusinessInfoEdit();
        let focused=0;view.$refs.business_name={focus(){focused++;}};
        view.businessInfo.name=' ';view.businessInfo.phone='ABC';const before=businessSaves;await view.onSaveBusinessInfo();assert.equal(businessSaves,before);assert.ok(view.businessFieldErrors.name);assert.ok(view.businessFieldErrors.phone);assert.equal(focused,1);
        view.businessInfo.name='  Cambio QA  ';view.businessInfo.phone='+52 (55) 1234-5678';view.businessInfo.address='  Dirección QA  ';
        businessSaveResponse={success:false,status:400,message:'Revisa el teléfono.',data:{fieldErrors:{phone:'Dato rechazado por servidor.'}}};
        await view.onSaveBusinessInfo();assert.equal(view.businessInfo.name,'  Cambio QA  ');assert.equal(view.businessInfoEditing,true);assert.equal(view.businessFieldErrors.phone,'Dato rechazado por servidor.');assert.match(view.businessSaveError,/teléfono/);
        const gate=deferred();businessSaveResponse=gate.promise;const pending=view.onSaveBusinessInfo();await view.onSaveBusinessInfo();assert.equal(businessSaves,before+2);
        assert.equal(lastBusinessPayload.name,'Cambio QA');assert.equal(lastBusinessPayload.phone,'5512345678');assert.equal(lastBusinessPayload.address,'Dirección QA');
        gate.resolve({success:true,data:{...savedBusiness,...lastBusinessPayload}});await pending;assert.equal(view.businessInfo.name,'Cambio QA');assert.equal(view.businessInfoEditing,false);assert.equal(view.businessInfoSaving,false);assert.equal(view.businessInfoDirty,false);
    });
    await check('business cancel and root navigation guard retain or explicitly discard local capture',async()=>{
        const view=settings();businessResponse={success:true,data:savedBusiness};await view.onGetBusinessInfo();view.onStartBusinessInfoEdit();view.businessInfo.name='Pendiente QA';
        await view.onCancelBusinessInfoEdit();assert.equal(view.businessInfo.name,'Pendiente QA');assert.equal(view.businessInfoEditing,true);
        view.$swal.fire=async()=>({isConfirmed:true});await view.onCancelBusinessInfoEdit();assert.equal(view.businessInfo.name,'Consultorio QA');assert.equal(view.businessInfoEditing,false);
        view.init=async()=>{};options.created.call(view);assert.equal(view.guards.length,1);view.onStartBusinessInfoEdit();view.businessInfo.name='Pendiente otra vez';
        view.$swal.fire=async()=>({isConfirmed:false});let decision;await view.guards[0]({path:'/inicio'},{},value=>{decision=value;});assert.equal(decision,false);assert.equal(view.businessInfo.name,'Pendiente otra vez');
        view.$swal.fire=async()=>({isConfirmed:true});await view.guards[0]({path:'/inicio'},{},value=>{decision=value;});assert.equal(decision,undefined);assert.equal(view.businessInfo.name,'Consultorio QA');options.beforeDestroy.call(view);assert.equal(view.guards.length,0);
    });
    await check('document meaningful content rejects whitespace, invisible text and sanitized-only content',async()=>{
        const view=settings({activeSection:'documents'});view.openDocumentTemplateDialog();const before=documentSaves;
        view.documentTemplateForm.name='   ';view.documentTemplateForm.content_text='   ';await view.saveDocumentTemplate();assert.ok(view.documentTemplateErrors.name);assert.ok(view.documentTemplateErrors.content_html);assert.equal(documentSaves,before);
        view.documentTemplateForm.name='Formato QA';view.documentTemplateForm.advanced_mode=true;
        for(const html of ['<p>&nbsp;\u200b</p>','<script>alert(1)</script>','<img src="javascript:alert(1)">']) {view.documentTemplateForm.content_html=html;await view.saveDocumentTemplate();assert.ok(view.documentTemplateErrors.content_html);assert.equal(documentSaves,before);}
    });
    await check('document cancel/discard, in-flight deduplication and failed save keep draft open',async()=>{
        const view=settings({activeSection:'documents'});view.openDocumentTemplateDialog();view.documentTemplateForm.name='Formato QA';view.documentTemplateForm.content_text='Contenido QA';
        await view.onCancelDocumentTemplate();assert.equal(view.documentTemplateDialog,true);
        const gate=deferred();documentSaveResponse=gate.promise;const before=documentSaves;const pending=view.saveDocumentTemplate();await view.saveDocumentTemplate();await view.onCancelDocumentTemplate();assert.equal(documentSaves,before+1);assert.equal(view.documentTemplateDialog,true);
        gate.resolve({success:false,status:400,message:'Fallo de servicio.',data:{fieldErrors:{name:'Nombre rechazado.'}}});await pending;assert.equal(view.documentTemplateSaving,false);assert.equal(view.documentTemplateForm.content_text,'Contenido QA');assert.equal(view.documentTemplateDialog,true);assert.equal(view.documentTemplateErrors.name,'Nombre rechazado.');assert.match(view.documentTemplateSaveError,/Fallo/);
        view.$swal.fire=async()=>({isConfirmed:true});await view.onCancelDocumentTemplate();assert.equal(view.documentTemplateDialog,false);
    });
    await check('clinical modules read failure does not invent defaults and retry establishes a known baseline',async()=>{
        const view=settings({activeSection:'clinical-modules'});const current={odontogramEnabled:true,treatmentPlanEnabled:false,allowTreatmentToothSelection:true,showTreatmentCosts:false,showTreatmentStatus:true};view.clinicalModules=current;
        let fail=true;view.getClinicalModules=async()=>({success:!fail,data:current});view.clinicalModulesForm={...current};
        await view.onLoadClinicalModules();assert.ok(view.clinicalModulesError);assert.equal(view.clinicalModulesOriginal,null);assert.deepEqual(copy(view.clinicalModulesForm),current);
        fail=false;await view.onLoadClinicalModules();assert.equal(view.clinicalModulesError,'');assert.equal(view.clinicalModulesOriginal,JSON.stringify(current));
    });
    await check('settings late reads ignore changed tenant or disposed views',async()=>{
        for(const kind of ['tenant','disposed']) {
            const view=settings();const gate=deferred();businessResponse=gate.promise;const pending=view.onGetBusinessInfo();
            if(kind==='tenant')view.$store.state.CORE.AUTH=auth('tenant-b');else view.disposed=true;
            gate.resolve({success:true,data:savedBusiness});await pending;assert.equal(view.businessInfo.id_business,'');assert.equal(view.businessInfoOriginal,null);
            const docs=settings({activeSection:'documents'}),docsGate=deferred();documentReadResponse=docsGate.promise;const docsPending=docs.onGetDocumentTemplates();
            if(kind==='tenant')docs.$store.state.CORE.AUTH=auth('tenant-b');else docs.disposed=true;
            docsGate.resolve({success:true,data:[{id_document_template:'late'}]});await docsPending;assert.equal(docs.documentTemplates.length,0);
        }
    });
    await check('appearance failed read is explicit and preserves known image/theme until retry',async()=>{
        const view=settings({activeSection:'appearance'});view.loginImagePreview='known-logo';view.loginImageOriginal='known-logo';view.getLoginImageData={image_data:'fresh-logo',original_name:'qa.png'};
        let fail=true;view.getLoginImage=async()=>({success:!fail});view.getThemeList=async()=>({success:true});view.getTheme=async()=>({success:true});
        await view.onLoadAppearance();assert.ok(view.appearanceError);assert.equal(view.loginImagePreview,'known-logo');assert.equal(view.savedTheme,null);
        fail=false;await view.onLoadAppearance();assert.equal(view.appearanceError,'');assert.equal(view.loginImageOriginal,'fresh-logo');assert.equal(view.savedThemeContext,'tenant:tenant-a');
    });
    await check('optional settings summary never presents generated defaults as queried facts after pending or failed reads',async()=>{
        const view=settings({activeSection:'summary'}),appearanceGate=deferred(),clinicalGate=deferred();
        const summaryValues=()=>copy(view.configurationSummary).map(item=>item.value);
        const assertUnknown=expected=>{
            assert.deepEqual(summaryValues(),[expected,expected,expected]);
            for(const value of summaryValues())assert.doesNotMatch(value,/^(Activo|Oculto|Predeterminado)$/);
        };
        assertUnknown('Consultando…');
        view.getLoginImage=()=>appearanceGate.promise;view.getThemeList=async()=>({success:true});view.getTheme=async()=>({success:true});view.getClinicalModules=()=>clinicalGate.promise;
        const appearancePending=view.onLoadAppearance(),clinicalPending=view.onLoadClinicalModules();
        assert.equal(view.appearanceLoading,true);assert.equal(view.clinicalModulesLoading,true);assertUnknown('Consultando…');
        appearanceGate.resolve({success:false});clinicalGate.resolve({success:false});await Promise.all([appearancePending,clinicalPending]);
        assert.equal(view.savedTheme,null);assert.equal(view.clinicalModulesOriginal,null);assertUnknown('No disponible');
        assert.match(view.appearanceError,/Reintenta/);assert.match(view.clinicalModulesError,/Reintenta/);
        assert.match(sfc.template.content,/v-alert[^>]+activeSection === 'summary'[\s\S]*?@click="init">Reintentar consulta/,'The summary exposes the actual retry action after either failed optional read');
        view.getLoginImage=async()=>({success:true});view.getLoginImageData={};
        view.clinicalModules={odontogramEnabled:true};view.getClinicalModules=async()=>({success:true,data:view.clinicalModules});
        await view.onLoadAppearance();await view.onLoadClinicalModules();
        assert.equal(view.appearanceError,'');assert.equal(view.clinicalModulesError,'');
        assert.equal(view.configurationSummary.find(item=>item.label==='Logo').value,'Predeterminado','A successful query can establish that no custom logo is configured');
        assert.equal(view.configurationSummary.find(item=>item.label==='Odontograma').value,'Activo','A successful query can establish the actual module state');
        view.appearanceLoading=true;view.clinicalModulesLoading=true;assertUnknown('Consultando…');
        view.appearanceLoading=false;view.clinicalModulesLoading=false;view.appearanceError='Fallo al actualizar. Reintenta.';view.clinicalModulesError='Fallo al actualizar. Reintenta.';assertUnknown('No disponible');
    });
    await check('theme preview discard restores CSS and refuses restoring a different tenant',async()=>{
        const view=settings({activeSection:'appearance'});theme.syncThemeContext('tenant:tenant-a');view.savedTheme={...theme.DEFAULT_THEME};view.savedThemeContext='tenant:tenant-a';view.selectedThemeCode=view.savedTheme.code;
        view.onSelectTheme({...theme.DEFAULT_THEME,code:'qa-purple',primary_700:'#123456'});assert.equal(view.appearanceDirty,true);assert.equal(document.documentElement.getAttribute('data-theme'),'qa-purple');
        view.onSelectTheme({...view.savedTheme});assert.equal(theme.themeState.hasPreview,false,'Choosing the saved theme must release the preview lock');assert.equal(view.appearanceDirty,false);
        view.onSelectTheme({...theme.DEFAULT_THEME,code:'qa-purple',primary_700:'#123456'});
        view.discardSettingsChanges();assert.equal(document.documentElement.getAttribute('data-theme'),'medical-blue');assert.equal(theme.themeState.hasPreview,false);
        view.onSelectTheme({...theme.DEFAULT_THEME,code:'qa-orange',primary_700:'#aa3300'});view.$store.state.CORE.AUTH=auth('tenant-b');theme.syncThemeContext('tenant:tenant-b');view.restoreAppearancePreview();assert.equal(theme.themeState.context,'tenant:tenant-b');assert.equal(theme.themeState.currentTheme.code,'medical-blue');
    });
    await check('real theme loader/saver preserves user selection and isolates late tenant responses',async()=>{
        theme.syncThemeContext('tenant:qa-theme');const gate=deferred();const pending=theme.loadTheme('tenant:qa-theme',()=>gate.promise,()=>true,{force:true});
        theme.applyTheme({...theme.DEFAULT_THEME,code:'qa-preview',primary_700:'#223344'});gate.resolve({success:true,data:[{...theme.DEFAULT_THEME,code:'stale-read'}]});const response=await pending;assert.equal(response.themeAccepted,false);assert.equal(theme.themeState.currentTheme.code,'qa-preview');
        const other=deferred();theme.syncThemeContext('tenant:qa-old');const old=theme.loadTheme('tenant:qa-old',()=>other.promise,()=>false,{force:true});theme.syncThemeContext('tenant:qa-new');other.resolve({success:true,data:[{...theme.DEFAULT_THEME,code:'old-tenant'}]});assert.equal((await old).themeAccepted,false);assert.equal(theme.themeState.context,'tenant:qa-new');assert.equal(theme.themeState.currentTheme.code,'medical-blue');
        const failure=await theme.loadTheme('tenant:qa-new',async()=>({success:false}),()=>true,{force:true});assert.equal(failure.themeAccepted,false);assert.equal(theme.themeState.loadError,true);
        const retry=await theme.loadTheme('tenant:qa-new',async()=>({success:true,data:[{...theme.DEFAULT_THEME,code:'qa-saved'}]}),()=>true,{force:true});assert.equal(retry.themeAccepted,true);assert.equal(theme.themeState.loadError,false);
        const saved=await theme.saveTheme('tenant:qa-new',async()=>({success:true,data:[{...theme.DEFAULT_THEME,code:'qa-saved-two'}]}),()=>true);assert.equal(saved.themeAccepted,true);assert.equal(theme.themeState.hasPreview,false);
    });
    await check('configuration actions preserve clinical module state on read failure and commit only accepted themes',async()=>{
        const actions=load('src/store/modules/configuration/actions.js').default;
        const commits=[];const context={commit:(...args)=>commits.push(args),rootState:{CORE:{AUTH:auth('qa-action')}}};
        configService.getClinicalModules=async()=>({success:false,message:'Read failure'});await actions.getClinicalModules(context);assert.equal(commits.some(([type])=>type==='SET_CLINICAL_MODULES'),false,'Failed read must not commit generated module defaults');
        configService.getClinicalModules=async()=>({success:true,data:{odontogramEnabled:true}});await actions.getClinicalModules(context);assert.ok(commits.some(([type,payload])=>type==='SET_CLINICAL_MODULES'&&payload.odontogramEnabled));
        commits.length=0;const gate=deferred();configService.getTheme=()=>gate.promise;theme.syncThemeContext('tenant:qa-action');const pending=actions.getTheme(context,{force:true});context.rootState.CORE.AUTH=auth('qa-action-new');theme.syncThemeContext('tenant:qa-action-new');gate.resolve({success:true,data:[{...theme.DEFAULT_THEME,code:'late-action'}]});await pending;assert.equal(commits.some(([type])=>type==='SET_THEME'),false);
    });
    await check('legacy configuration reads make zero commits after actor/session/permission/revision changes within one tenant',async()=>{
        const actions=load('src/store/modules/configuration/actions.js').default;
        const changes={actor:state=>{state.user.id_login='qa-other-actor';},session:state=>{state.user.id_session='qa-new-session';},permissions:state=>{state.permissions=[];},revision:state=>{state.accessRevision=1;}};
        for(const action of ['getConfiguration','getLoginImage','getThemeList','getClinicalModules']) {
            for(const [label,change] of Object.entries(changes)) {
                const commits=[],gate=deferred();
                const context={commit:(...args)=>commits.push(args),rootState:{CORE:{AUTH:auth('same-tenant')}}};
                configService[action]=()=>gate.promise;
                const pending=actions[action](context);
                change(context.rootState.CORE.AUTH);
                assert.equal(context.rootState.CORE.AUTH.business.id_business,'same-tenant');
                gate.resolve({success:true,data:{oldActorPayload:true}});
                const response=await pending;
                assert.equal(response.success,false,action+' must reject '+label+' changes');
                assert.equal(commits.length,0,action+' cannot commit even stale error state after '+label+' changes');
            }
        }
    });
    await check('all root settings loaders reject same-tenant actor/permission changes and disposed late success',async()=>{
        const changes={actor:view=>{view.$store.state.CORE.AUTH.user.id_login='qa-other-actor';},permissions:view=>{view.$store.state.CORE.AUTH.permissions=[];},disposed:view=>{view.disposed=true;}};
        const loaders={
            onGetBusinessInfo:{errorField:'businessInfoError',prepare:(_view,gate)=>{businessResponse=gate.promise;},payload:savedBusiness,verify:view=>assert.equal(view.businessInfoOriginal,null)},
            onGetDocumentTemplates:{errorField:'documentTemplatesError',prepare:(_view,gate)=>{documentReadResponse=gate.promise;},payload:[{id_document_template:'late'}],verify:view=>assert.equal(view.documentTemplates.length,0)},
            onLoadClinicalModules:{errorField:'clinicalModulesError',prepare:(view,gate)=>{view.getClinicalModules=()=>gate.promise;view.clinicalModules={odontogramEnabled:true};},payload:{odontogramEnabled:true},verify:view=>assert.equal(view.clinicalModulesOriginal,null)},
            onLoadAppearance:{errorField:'appearanceError',prepare:(view,gate)=>{view.getLoginImage=()=>gate.promise;view.getThemeList=async()=>({success:true});view.getTheme=async()=>({success:true});view.getLoginImageData={image_data:'late-logo'};},payload:[],verify:view=>{assert.equal(view.savedTheme,null);assert.equal(view.loginImageOriginal,'');}}
        };
        for(const [name,loader] of Object.entries(loaders))for(const [label,change] of Object.entries(changes)) {
            const view=settings(),gate=deferred();loader.prepare(view,gate);
            const pending=view[name]();change(view);gate.resolve({success:true,data:loader.payload});await pending;
            loader.verify(view);
            if(label==='disposed')assert.equal(view[loader.errorField],'',name+' cannot publish a new error into a destroyed view');
            else assert.match(view[loader.errorField],/sesión o tus accesos cambiaron[\s\S]*Reintenta/,name+' must expose a retryable context-change error instead of silently leaving no baseline');
            assert.equal(view.$store.state.CORE.AUTH.business.id_business,'tenant-a',name+' '+label+' test must stay within one tenant');
        }
    });
    await check('logo processing serializes asymmetric A/B selections and blocks saves/routes until processing finishes',async()=>{
        const originalResize=sandbox.resizeImage;
        try {
            const view=settings({activeSection:'appearance'}),readGate=deferred(),resizeGate=deferred();
            const reads=[],resizes=[];let writes=0;
            const fileA={name:'A.png',type:'image/png',size:100},fileB={name:'B.png',type:'image/png',size:100};
            view.readFileAsDataUrl=file=>{reads.push(file.name);return readGate.promise;};
            view.saveLoginImage=async()=>{writes++;return {success:true};};view.init=async()=>{};
            options.created.call(view);
            sandbox.resizeImage=(data,width,height,type,quality)=>{resizes.push({data,width,height,type,quality});return resizeGate.promise;};
            const first=view.onSelectLoginImage({target:{files:[fileA]}});
            assert.equal(view.loginImageProcessing,true);assert.equal(view.settingsSaving,true);
            await view.onSelectLoginImage({target:{files:[fileB]}});await view.onSaveLoginImage();
            assert.deepEqual(reads,['A.png'],'A pending read ignores selection B');assert.equal(writes,0);
            let decision;await view.guards[0]({path:'/inicio'},{},value=>{decision=value;});assert.equal(decision,false,'The navigation guard treats image processing as pending work');
            readGate.resolve('data:A');await flush();
            assert.equal(resizes.length,1);assert.equal(resizes[0].data,'data:A');assert.equal(resizes[0].width,700);assert.equal(resizes[0].height,250);
            await view.onSelectLoginImage({target:{files:[fileB]}});await view.onSaveLoginImage();assert.deepEqual(reads,['A.png']);assert.equal(writes,0,'Resize pending also prevents save and replacement');
            resizeGate.resolve('data:A-resized');await first;assert.equal(view.loginImageProcessing,false);assert.equal(view.loginImagePreview,'data:A-resized');assert.equal(view.loginImageFileName,'A.png');
            view.readFileAsDataUrl=async file=>{reads.push(file.name);return 'data:B';};sandbox.resizeImage=async()=> 'data:B-resized';
            await view.onSelectLoginImage({target:{files:[fileB]}});assert.equal(view.loginImagePreview,'data:B-resized');assert.equal(view.loginImageFileName,'B.png');assert.equal(writes,0);
            options.beforeDestroy.call(view);
            for(const kind of ['auth','disposed','section','decode-error']) {
                const stale=settings({activeSection:'appearance'}),gate=deferred();stale.loginImagePreview='previous-logo';stale.readFileAsDataUrl=async()=> 'data:A';
                sandbox.resizeImage=kind==='decode-error' ? async()=>{throw Error('Decode failed');} : ()=>gate.promise;
                const pending=stale.onSelectLoginImage({target:{files:[fileA]}});await flush();
                if(kind==='auth')stale.$store.state.CORE.AUTH.permissions=[];
                if(kind==='disposed')stale.disposed=true;
                if(kind==='section')stale.activeSection='summary';
                gate.resolve('stale-logo');await pending;
                assert.equal(stale.loginImageProcessing,false,'Finally releases processing after '+kind);
                assert.equal(stale.loginImagePreview,'previous-logo','Late '+kind+' cannot replace the preview');
                if(kind==='decode-error')assert.ok(stale.loginImageError);
            }
            const moduleControls=(sfc.template.content.match(/<v-(?:checkbox|switch)\b[^>]*>/g)||[]).filter(tag=>tag.includes('v-model="clinicalModulesForm.'));
            assert.equal(moduleControls.length,5);assert.ok(moduleControls.every(tag=>/:disabled="clinicalModulesSaving/.test(tag)),'Vuetify controls explicitly disable while saving');
            assert.match(sfc.template.content,/<v-dialog[^>]*v-model="documentTemplateDialog"[^>]*:retain-focus="false"/,'Discard confirmation may receive focus outside the document dialog');
        } finally {sandbox.resizeImage=originalResize;}
    });
    await check('real image resize rejects corrupt/canvas failures, contains both dimensions and releases a blocked settings route',async()=>{
        const {resizeImage}=load('src/utils/file.js');
        const originalImage=global.Image,originalCreate=document.createElement.bind(document),originalResize=sandbox.resizeImage;
        const images=[],canvases=[];let mode='success',size={width:1000,height:900};
        class TestImage {
            constructor(){this.width=size.width;this.height=size.height;images.push(this);}
            set src(_value){
                assert.equal(typeof this.onload,'function','Register load handler before src can complete');
                assert.equal(typeof this.onerror,'function','Corrupt images must have an error handler');
                if(mode==='manual-error')return;
                queueMicrotask(()=>{if(mode==='decode-error')this.onerror(Error('Corrupt image'));else this.onload();});
            }
        }
        global.Image=TestImage;
        document.createElement=function(tag,...args){
            if(String(tag).toLowerCase()!=='canvas')return originalCreate(tag,...args);
            const canvas={width:0,height:0,getContext(){return mode==='null-context'?null:{drawImage(){}};},toDataURL(){if(mode==='encode-error')throw Error('Encoding failed');return 'data:qa,'+this.width+'x'+this.height;}};
            canvases.push(canvas);return canvas;
        };
        try {
            assert.equal(await resizeImage('data:landscape',700,250),'data:qa,278x250');
            size={width:900,height:1000};assert.equal(await resizeImage('data:portrait',700,250),'data:qa,225x250');
            size={width:100,height:50};assert.equal(await resizeImage('data:small',700,250),'data:qa,100x50');
            assert.ok(canvases.every(canvas=>canvas.width<=700&&canvas.height<=250));
            for(const failure of ['decode-error','null-context','encode-error']) {mode=failure;await assert.rejects(resizeImage('data:bad',700,250));}
            mode='manual-error';sandbox.resizeImage=resizeImage;
            const view=settings({activeSection:'appearance'});view.readFileAsDataUrl=async()=> 'data:corrupt';view.init=async()=>{};options.created.call(view);
            const pending=view.onSelectLoginImage({target:{files:[{name:'corrupt.png',type:'image/png',size:100}]}});await flush();
            assert.equal(view.loginImageProcessing,true);let decision;await view.guards[0]({path:'/inicio'},{},value=>{decision=value;});assert.equal(decision,false);
            images[images.length-1].onerror(Error('Corrupt image'));await pending;
            assert.equal(view.loginImageProcessing,false);assert.ok(view.loginImageError);assert.equal(view.loginImagePreview,'');
            await view.guards[0]({path:'/inicio'},{},value=>{decision=value;});assert.equal(decision,undefined,'A failed decoder cannot leave the user locked in settings');
            options.beforeDestroy.call(view);
        } finally {
            if(originalImage===undefined)delete global.Image;else global.Image=originalImage;
            document.createElement=originalCreate;sandbox.resizeImage=originalResize;
        }
    });
    const failed=results.filter(result=>!result.ok);
    console.log(JSON.stringify({checks:results.length,passed:results.length-failed.length,failed:failed.map(result=>result.name),businessReads},null,2));
    dom.window.close();delete global.window;delete global.document;
    if(failed.length)process.exitCode=1;
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
