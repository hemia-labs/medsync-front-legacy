/* Actual TreatmentPlan SFC + settings policy + DOMPurify/jsdom.
 * Only synthetic service doubles; no HTTP, DB, signatures or delivery. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const strip = source => source.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '');
const copy = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; return {promise:new Promise(done => { resolve=done; }),resolve:value => resolve(value)}; };
const flush = () => new Promise(resolve => setImmediate(resolve));
const dom = new JSDOM('', {url:'https://qa.invalid/'});
const sanitizerContext = {module:{exports:{}},DOMPurify,window:dom.window};
vm.runInNewContext(strip(read('src/utils/sanitizeHtml.js')).replace(/export default[^;]+;/g, '').replace(/export /g, '')
    + '\nmodule.exports = { sanitizeHtmlForDocumentSnapshot };', sanitizerContext);
const results=[];
async function check(name, run) {
    try { await run(); results.push({name,ok:true}); console.log('PASS '+name); }
    catch(error) { results.push({name,ok:false}); console.error('FAIL '+name+'\n'+error.stack); }
}

(async () => {
    const importPure = file => import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`);
    const settingsPolicy = await importPure('src/security/settingsAccess.js');
    const editor = await importPure('src/domain/treatment-plan/plan.editor.js');
    let contextResponse={success:false},contextCalls=0,prepareCalls=0;
    const services={
        async getSigningDoctors(patientId) { contextCalls++; return typeof contextResponse==='function' ? contextResponse(patientId) : contextResponse; },
        async prepareConsentDocument() { prepareCalls++; throw Error('Unexpected consent preparation'); }
    };
    const sfc=compiler.parseComponent(read('src/views/Patient/Sections/TreatmentPlan.vue'));
    assert.deepEqual(compiler.compile(sfc.template.content).errors,[],'The real treatment template compiles');
    const context={component:null,...editor,...settingsPolicy,...sanitizerContext.module.exports,
        mapActions:()=>({}),mapGetters:()=>({}),VuexMixin:{},moduleTypes:{TREATMENT:{},CONFIGURATION:{},AUTH:{}},fnTypes:{},
        isD2AuthMode:()=>true,DocumentSignatureOptionsDialog:{},DATreatmentService:services,dialogName:{},fieldError:{},
        Blob,window:dom.window,document:dom.window.document};
    vm.runInNewContext(strip(sfc.script.content).replace('export default','component ='),context,{filename:'TreatmentPlan.vue'});
    const options=context.component;
    const doctor=id=>({id_login:id,id_doctor_professional_profile:'profile-'+id,professional_name:'Doctor '+id,professional_license:'QA-LICENSE',professional_profile_active:1,can_sign_documents:1});
    const planTemplate=content=>({id_document_template:'qa-plan-template',template_type:'TREATMENT_PLAN_CONSENT',is_active:1,content_html:content});
    const planData=(patient='qa-patient')=>({patient:{id_person:patient,name:'Synthetic',surname:'Patient'},
        permissions:{view:true,consentSign:true,consentView:true,remoteRequest:true,costView:false},
        config:{consentVersioningAvailable:true,consentDocumentAvailable:true,showTreatmentCosts:true},
        activePlan:{id_treatment_plan:'plan-'+patient,title:'Synthetic plan',review_token:'synthetic-review',treatments:[]},history:[]});
    const basePermissions=['treatments.view','treatments.consent.sign','treatments.consent.view','documents.signature.request'];
    function fresh({role='doctor',permissions=basePermissions}={}) {
        const granted=new Set(permissions);
        const view={px:{person:{id_person:'qa-patient',name:'Synthetic',surname:'Patient'}},authUser:{id_login:'doctor-a'},authRole:role,
            hasPermission:permission=>granted.has(permission),granted,$refs:{},$emit(){},$nextTick:callback=>callback ? callback() : Promise.resolve()};
        for(const [name,method] of Object.entries(options.methods))view[name]=method.bind(view);
        Object.assign(view,options.data.call(view));
        for(const [name,getter] of Object.entries(options.computed))Object.defineProperty(view,name,{get:getter.bind(view),configurable:true});
        view.localPlanData=planData();view.planLoaded=true;view.doctors=[doctor('doctor-a'),doctor('doctor-b')];view.doctorUserId='doctor-a';
        return view;
    }
    const pending=(view,{status='PENDIENTE_FIRMA',doctorId='doctor-a',costs=false}={})=>{
        view.activePlan.consent_document={id_patient_document:'qa-prepared',treatment_plan_id:view.activePlan.id_treatment_plan,status,
            responsible_doctor_user_id:doctorId,includes_costs:costs};
    };

    await check('doctor can sign/request but general attention is not a plan consent and missing setup never prepares a document',async()=>{
        const view=fresh();
        assert.equal(view.canSign,true);assert.equal(view.canRequestRemoteSignature,true);assert.equal(view.canViewConsent,true);
        for(const type of ['GENERAL_ATTENTION_CONSENT','CONSENTIMIENTO_GENERAL_ATENCION']) {
            view.documentTemplates=[{template_type:type,is_active:1,content_html:'Consentimiento general distinto.'}];
            assert.equal(view.planConsentTemplate,null);assert.equal(view.hasConsentText,false);assert.equal(view.needsConsentConfiguration,true);
            assert.equal(view.canConfigurePlanConsent,false);assert.match(view.consentPrerequisite,/administrador/);assert.match(view.consentPrerequisite,/Actualizar requisitos/);
            assert.equal(view.validateDoctorLicenseForConsent(),false);view.requestConsentSignature();assert.equal(prepareCalls,0);
        }
        assert.match(sfc.template.content,/formato activo de tipo «Consentimiento del plan de tratamiento»/);
        assert.match(sfc.template.content,/consentimiento general de atención es un formato distinto/);
        assert.match(sfc.template.content,/v-if="needsConsentConfiguration && canConfigurePlanConsent"/);
        assert.match(sfc.template.content,/:aria-describedby="consentPrerequisite \? 'plan-consent-prerequisite' : null"/);
    });
    await check('configuration CTA follows the actual settings policy rather than sign rights, admin label or admin.config',async()=>{
        assert.equal(fresh({role:'admin',permissions:[...basePermissions,'admin.config']}).canConfigurePlanConsent,false);
        assert.equal(fresh({role:'doctor',permissions:[...basePermissions,'documents.config']}).canConfigurePlanConsent,true);
        assert.equal(fresh({role:'admin',permissions:[...basePermissions,'documents.config']}).canConfigurePlanConsent,true);
        assert.equal(fresh({role:'super_admin',permissions:[...basePermissions,'documents.config','admin.config']}).canConfigurePlanConsent,false);
        const manager=fresh({permissions:[...basePermissions,'documents.config']});
        assert.match(manager.consentPrerequisite,/tipo «Consentimiento del plan de tratamiento»/);assert.match(manager.consentPrerequisite,/guárdalo activo/);
    });
    await check('refreshing real signing context after configuration enables signing without losing the local capture or preparing anything',async()=>{
        const view=fresh();view.treatmentForm.notes='Unsaved treatment notes';view.planForm.title='Unsaved plan title';
        contextResponse={success:true,data:{doctors:[doctor('doctor-a')],template:planTemplate('<p>Texto revisable del consentimiento.</p>'),legacyText:{}}};
        const before=contextCalls;await view.loadConsentContext();
        assert.equal(contextCalls,before+1);assert.equal(view.contextError,'');assert.equal(view.contextLoading,false);
        assert.equal(view.hasConsentText,true);assert.equal(view.needsConsentConfiguration,false);assert.equal(view.consentPrerequisite,'');assert.equal(view.validateDoctorLicenseForConsent(),true);
        assert.equal(view.doctorUserId,'doctor-a');assert.equal(view.treatmentForm.notes,'Unsaved treatment notes');assert.equal(view.planForm.title,'Unsaved plan title');assert.equal(prepareCalls,0);
    });
    await check('loading and context errors block signing and remain distinct from missing configuration',async()=>{
        const view=fresh(),gate=deferred();contextResponse=gate.promise;
        const pendingRead=view.loadConsentContext();assert.equal(view.contextLoading,true);assert.match(view.consentPrerequisite,/Cargando/);assert.equal(view.needsConsentConfiguration,false);
        assert.equal(view.validateDoctorLicenseForConsent(),false);gate.resolve({success:false});await pendingRead;
        assert.match(view.contextError,/No se pudieron cargar/);assert.equal(view.consentPrerequisite,view.contextError);assert.equal(view.needsConsentConfiguration,false);assert.equal(view.contextLoading,false);
        contextResponse={success:true,data:{doctors:[doctor('doctor-a')],template:planTemplate('<p>Texto válido.</p>'),legacyText:{}}};await view.loadConsentContext();
        assert.equal(view.consentPrerequisite,'');assert.equal(view.contextError,'');assert.equal(prepareCalls,0);
    });
    await check('actual sanitizer rejects empty markup, spaces, invisible characters and unsafe-only content while keeping genuine text or image scans',async()=>{
        const view=fresh();
        for(const html of ['', ' \n ', '<p></p>', '<p>&nbsp;&#32;\u200b</p>', '<script>alert(1)</script>', '<img src="javascript:alert(1)">']) {
            view.documentTemplates=[planTemplate(html)];assert.equal(view.hasConsentText,false,'No meaningful consent: '+JSON.stringify(html));assert.equal(view.needsConsentConfiguration,true);assert.ok(view.consentPrerequisite);
        }
        for(const html of ['<p>Consentimiento para {{nombrePaciente}}.</p>','<img src="https://qa.invalid/synthetic-scan.png">']) {
            view.documentTemplates=[planTemplate(html)];assert.equal(view.hasConsentText,true,'Meaningful consent: '+html);
        }
        view.documentTemplates=[];
        for(const legacy of [{state:' \u200b ',consent:'\ufeff'},{state:'',consent:''}]) {view.consentConfig=legacy;assert.equal(view.hasConsentText,false);}
        for(const legacy of [{state:'Texto DECLARO.',consent:''},{state:'',consent:'Texto CONSIENTO.'},{state:'<p></p>',consent:''}]) {
            view.consentConfig=legacy;assert.equal(view.hasConsentText,true,'Legacy text is escaped as literal text by the backend');assert.equal(view.consentPrerequisite,'');
        }
    });
    await check('matching pending snapshots remain reusable without the current template, but doctor and final statuses cannot bypass setup',async()=>{
        for(const status of ['BORRADOR','PENDIENTE_FIRMA']) {
            const view=fresh();pending(view,{status});assert.equal(view.hasConsentText,false);assert.equal(view.canReuseConsentDocument,true);
            assert.equal(view.needsConsentConfiguration,false);assert.equal(view.consentPrerequisite,'');assert.equal(view.validateDoctorLicenseForConsent(),true);
            view.doctorUserId='doctor-b';assert.equal(view.canReuseConsentDocument,false);assert.equal(view.needsConsentConfiguration,true);assert.ok(view.consentPrerequisite);
        }
        for(const status of ['CANCELADO','FIRMADO']) {const view=fresh();pending(view,{status});assert.equal(view.canReuseConsentDocument,false);assert.equal(view.needsConsentConfiguration,true);}
        const view=fresh();pending(view);view.doctors=[];assert.equal(view.canReuseConsentDocument,true);assert.match(view.consentPrerequisite,/doctor con perfil activo/);
        view.doctors=[doctor('doctor-a')];view.localPlanData.config.consentVersioningAvailable=false;assert.match(view.consentPrerequisite,/historial de versiones/);
        view.localPlanData.config.consentVersioningAvailable=true;view.localPlanData.config.consentDocumentAvailable=false;assert.match(view.consentPrerequisite,/integración de documentos/);
    });
    await check('reusing a prepared snapshot requires the current cost visibility scope in both directions',async()=>{
        const view=fresh();pending(view,{costs:true});assert.equal(view.showCosts,false);assert.equal(view.canReuseConsentDocument,false);assert.ok(view.consentPrerequisite);
        view.granted.add('treatments.cost_view');view.localPlanData.permissions.costView=true;
        assert.equal(view.showCosts,true);assert.equal(view.canReuseConsentDocument,true);assert.equal(view.consentPrerequisite,'');
        view.activeConsentDocument.includes_costs=false;assert.equal(view.canReuseConsentDocument,false);
        view.localPlanData.config.showTreatmentCosts=false;assert.equal(view.showCosts,false);assert.equal(view.canReuseConsentDocument,true);
    });
    await check('late signing-context responses for the previous patient cannot overwrite the current patient or doctor selection',async()=>{
        const view=fresh(),oldGate=deferred(),newGate=deferred();
        contextResponse=patient=>patient==='qa-patient' ? oldGate.promise : newGate.promise;
        view.getTreatmentPlan=async patient=>({success:true,data:planData(patient)});
        await view.loadPlan();assert.equal(view.contextLoading,true);
        view.px={person:{id_person:'qa-next-patient'}};await view.loadPlan();
        newGate.resolve({success:true,data:{doctors:[doctor('doctor-new')],template:planTemplate('<p>Current patient context.</p>'),legacyText:{}}});await flush();
        view.doctorUserId='doctor-new';assert.equal(view.contextLoading,false);assert.equal(view.contextError,'');
        oldGate.resolve({success:true,data:{doctors:[doctor('doctor-old')],template:planTemplate('<p>Old patient context.</p>'),legacyText:{state:'Old legacy'}}});await flush();
        assert.equal(view.patientId,'qa-next-patient');assert.equal(view.localPlanData.patient.id_person,'qa-next-patient');
        assert.equal(view.doctors[0].id_login,'doctor-new');assert.equal(view.doctorUserId,'doctor-new');assert.equal(view.planConsentTemplate.content_html,'<p>Current patient context.</p>');assert.deepEqual(copy(view.consentConfig),{});
        assert.equal(view.contextError,'');assert.equal(view.contextLoading,false);assert.equal(prepareCalls,0);
    });
    const failed=results.filter(result=>!result.ok);
    console.log(JSON.stringify({checks:results.length,passed:results.length-failed.length,failed:failed.map(result=>result.name),contextCalls,prepareCalls},null,2));
    if(failed.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>dom.window.close());
