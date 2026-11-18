'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const compiler=require('vue-template-compiler');
const read=f=>fs.readFileSync(path.join(__dirname,'../..',f),'utf8');
const src=read('src/domain/identity/catalogCapture.js'),names=[...src.matchAll(/export const (\w+)/g)].map(m=>m[1]);
const helpers=new Function(src.replace(/export const /g,'const ')+'\nreturn {'+names.join(',')+'};')();
const context=s=>({revision:s.revision}),current=(owner,s)=>owner.revision===s.revision;
function component(api){
    const sfc=compiler.parseComponent(read('src/components/identity/CatalogReferenceField.vue'));
    assert.deepEqual(compiler.compile(sfc.template.content).errors,[]);
    const deps={DACore:api,authorizationContext:context,isCurrentAuthorization:current,...helpers};
    const options=new Function(...Object.keys(deps),sfc.script.content.replace(/^import[^;]+;\s*$/gm,'').replace('export default','return'))(...Object.values(deps));
    const events=[],vm={...options.data(),$store:{revision:1},active:true,disabled:false,value:null,parent:'',family:'inegi.state',_uid:1,$emit:(event,value)=>events.push([event,value])};
    for(const [k,fn]of Object.entries(options.methods))vm[k]=fn.bind(vm);
    for(const [k,fn]of Object.entries(options.computed))Object.defineProperty(vm,k,{get:()=>fn.call(vm)});
    return {vm,events,options};
}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const ref={family:'inegi.state',releaseId:'qa-2026',code:'01'};
const response=(label='Entidad QA')=>({success:true,data:{available:true,hasMore:false,items:[{ref,label}]}});
test('selection preserves the version but discards presentation metadata; manual code is a candidate',()=>{
    const {vm,events}=component({});vm.select({ref:{...ref,label:'not payload',status:'verified'}});assert.deepEqual(events[0],['input',ref]);
    vm.typeCode(' 01 ');assert.deepEqual(events.at(-1),['input',{family:'inegi.state',code:'01'}]);vm.select(null);assert.deepEqual(events.at(-1),['commit',null]);
    vm.disabled=true;const count=events.length;vm.typeCode('02');vm.select({ref});assert.equal(events.length,count);
});
test('opening, resolving and searching never silently changes a saved reference',async()=>{
    const {vm,events}=component({get:async(_url,config)=>config.params.code?{success:true,data:{check:{result:'valid',label:'Entidad QA',source:{sourceVersion:'QA'}}}}:response()});
    vm.value=ref;await vm.resolve();await vm.load();assert.equal(events.length,0);assert.equal(vm.value.releaseId,'qa-2026');assert.match(vm.hint,/Coincide/);assert.equal(vm.options[0].ref.code,'01');
});
test('last search wins including older failures and authorization changes',async()=>{
    const first=deferred(),second=deferred();let n=0;const {vm}=component({get:()=>++n===1?first.promise:second.promise});
    const a=vm.load(),b=vm.load();second.resolve(response('Actual'));await b;first.resolve({success:false});await a;assert.equal(vm.rows[0].text,'Actual · 01');assert.equal(vm.failure,false);
    const late=deferred();const c=component({get:()=>late.promise});const pending=c.vm.load();c.vm.$store.revision++;late.resolve(response());await pending;assert.equal(c.vm.rows.length,0);
});
test('a late verification cannot label a new value or another login as valid',async()=>{
    const late=deferred(),{vm}=component({get:()=>late.promise});vm.value=ref;const pending=vm.resolve();vm.value={family:'inegi.state',code:'02'};await vm.resolve();late.resolve({success:true,data:{check:{result:'valid',source:{sourceVersion:'old'}}}});await pending;assert.equal(vm.check,null);assert.match(vm.hint,/No verificado/);
});
test('unavailable catalogs and network failure preserve capture without validating it',async()=>{
    const {vm,events}=component({get:async()=>({success:true,data:{available:false,items:[],hasMore:false}})});await vm.load();assert.match(vm.hint,/Catálogo no disponible/);assert.equal(events.length,0);
    const bad=component({get:async()=>{throw Error('offline');}});bad.vm.value=ref;await bad.vm.resolve();await bad.vm.load();assert.equal(bad.vm.failure,true);assert.deepEqual(bad.vm.value,ref);assert.match(bad.vm.hint,/No verificado/);
});
test('pagination carries the selected parent and does not fetch while collapsed or disabled',async()=>{
    const calls=[],{vm}=component({get:async(url,config)=>{calls.push(config.params);return response();}});vm.family='inegi.municipality';vm.parent='01';await vm.load();await vm.load(true);assert.equal(calls[1].offset,1);assert.equal(calls[0].parent,'01');
    vm.active=false;await vm.load();vm.active=true;vm.disabled=true;await vm.load();assert.equal(calls.length,2);
});
test('changing a parent preserves descendants until the user resolves them; backend validates compatibility',()=>{
    const identity={residence:{entity:ref,municipality:{family:'inegi.municipality',releaseId:'qa',code:'01001'}}};
    const next=helpers.withCatalogReference(identity,'residence.entity',{...ref,code:'02'});assert.equal(next.residence.municipality.code,'01001');assert.equal(helpers.catalogParent(next,'residence.municipality'),'02');assert.equal(identity.residence.entity.code,'01');
});
test('manual list entry commits the complete code; list is a versioned array, not comma text',()=>{
    const sfc=compiler.parseComponent(read('src/components/identity/CatalogReferenceList.vue'));assert.deepEqual(compiler.compile(sfc.template.content).errors,[]);
    const options=new Function('CatalogReferenceField',sfc.script.content.replace(/^import[^;]+;\s*$/gm,'').replace('export default','return'))({});let emitted;
    const vm={...options.data(),value:null,$emit:(_e,v)=>{emitted=v;}};options.methods.add.call(vm,ref);assert.deepEqual(emitted,[ref]);vm.value=emitted;options.methods.replace.call(vm,0,null);assert.equal(emitted,null);
    assert.match(sfc.template.content,/@commit="add"/);
});
test('all entry points use the same selector; metadata is never sent back in the patch',()=>{
    for(const file of ['src/components/identity/IdentityFields.vue','src/views/Patient/components/PatientIdentityFields.vue','src/components/identity/Establishments.vue'])assert.match(read(file),/<catalog-reference-field/);
    const draft=new Function(read('src/domain/identity/identityDraft.js').replace(/^export function /gm,'function ')+';return {editableIdentity};')();
    const value=draft.editableIdentity({birthCountry:ref,catalogChecks:[{result:'valid'}],catalogValidation:'verified'});assert.equal(value.catalogChecks,undefined);assert.deepEqual(value.birthCountry,ref);
});
// Independent review (Claude, 2026-11-17): manual CLUES follows the contract normalization (trim + uppercase)
// and a rejected CLUES is shown at its own field with the capture preserved.
test('manual CLUES is normalized to the contract form; other families stay literal',()=>{
    assert.deepEqual(helpers.candidateReference('sis.establishments',' dfssa001234 '),{family:'sis.establishments',code:'DFSSA001234'});
    assert.deepEqual(helpers.candidateReference('inegi.state',' 01 '),{family:'inegi.state',code:'01'});
    assert.deepEqual(helpers.candidateReference('sis.affiliation','a1'),{family:'sis.affiliation',code:'a1'});
    assert.equal(helpers.candidateReference('sis.establishments','  '),null);
});
test('a rejected CLUES maps to the CLUES field, keeps the capture and hides internal field keys',async()=>{
    const sfc=compiler.parseComponent(read('src/components/identity/Establishments.vue'));assert.deepEqual(compiler.compile(sfc.template.content).errors,[]);
    assert.match(sfc.template.content,/<catalog-reference-field v-model="cluesRef"[^>]*:errors="cluesErrors"/);
    const clues={family:'sis.establishments',releaseId:'qa-sis',code:'DFSSA001234'};
    for(const [code,pattern] of [['CLUES_NOT_OPERATING',/no está en operación/],['CLUES_NOT_IN_SIS_RELEASE',/no aparece/],['IDENTITY_INVALID',/11 letras o números/]]){
        const api={patch:async()=>({success:false,status:400,message:'Revisa el campo de identidad: cluesRef',data:{code,field:'cluesRef'}})};
        const deps={CatalogReferenceField:{},DACore:api,authorizationContext:()=>({}),isCurrentAuthorization:()=>true};
        const options=new Function(...Object.keys(deps),sfc.script.content.replace(/^import[^;]+;\s*$/gm,'').replace('export default','return'))(...Object.values(deps));
        const vm={...options.data(),$store:{},id:'est-qa',revision:2,editing:true,form:{displayName:'Consultorio QA',active:true,validFrom:null,validTo:null},cluesRef:clues};
        for(const [k,fn]of Object.entries(options.methods))vm[k]=fn.bind(vm);
        await vm.save();
        assert.equal(vm.cluesErrors.length,1);assert.match(vm.cluesErrors[0],pattern);
        assert.doesNotMatch(vm.error,/cluesRef/);assert.match(vm.error,/Conservamos/);assert.deepEqual(vm.cluesRef,clues);assert.equal(vm.revision,2);
    }
});
