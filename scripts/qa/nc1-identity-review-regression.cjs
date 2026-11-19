const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const compiler = require('vue-template-compiler');
const read = file => fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
const draft = new Function(read('src/domain/identity/identityDraft.js').replace(/^export function /gm, 'function ') + '\nreturn {editableIdentity,identityPatch,identityFieldError};')();
const defer = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
function editor(api) {
  const sfc = compiler.parseComponent(read('src/components/identity/IdentityEditor.vue'));
  const deps = {IdentityFields:{},DACore:api,authorizationContext:s=>s.epoch,isCurrentAuthorization:(c,s)=>c===s.epoch,...draft};
  const code = sfc.script.content.replace(/^import[^;]+;\s*$/gm, '').replace('export default', 'return');
  const options = new Function(...Object.keys(deps),code)(...Object.values(deps));
  const vm = {...options.data(),url:'synthetic', $store:{epoch:1},$refs:{},$nextTick:fn=>fn(),$emit:()=>{}};
  for(const [key,fn] of Object.entries(options.methods))vm[key]=fn.bind(vm);
  return vm;
}
test('old failed load cannot replace the newer patient result',async()=>{
  const old=defer(), fresh=defer(); let calls=0;
  const vm=editor({get:()=>++calls===1?old.promise:fresh.promise});
  const first=vm.load(),second=vm.load();
  fresh.resolve({success:true,data:{revision:2,givenNames:'Paciente nuevo'}});await second;
  old.reject(new Error('Error del paciente anterior'));await first;
  assert.equal(vm.draft.givenNames,'Paciente nuevo');assert.equal(vm.error,'');assert.equal(vm.loading,false);
});
test('old save error/finally cannot release a newer save or overwrite its error',async()=>{
  const old=defer();const vm=editor({patch:()=>old.promise});vm.loaded=true;
  const pending=vm.save(); vm.sequence++;vm.saving=true;vm.error='Estado actual';
  old.reject(new Error('Error de escritura antigua'));await pending;
  assert.equal(vm.error,'Estado actual');assert.equal(vm.saving,true);
});
test('authorization change also invalidates rejected requests',async()=>{
  const old=defer();const vm=editor({get:()=>old.promise});const pending=vm.load();
  vm.$store.epoch++;vm.error='Contexto nuevo';old.reject(new Error('Error del contexto anterior'));await pending;
  assert.equal(vm.error,'Contexto nuevo');
});
test('only known 400 identity validation errors are presented as editable field errors',()=>{
  for(const status of [401,403,409,500,503])assert.equal(draft.identityFieldError({status,data:{code:'IDENTITY_INVALID',field:'curp'}}),null);
  assert.equal(draft.identityFieldError({status:400,data:{code:'OTHER_ERROR',field:'curp'}}),null);
  assert.ok(draft.identityFieldError({status:400,data:{code:'IDENTITY_INVALID',field:'curp'}}));
});
test('foreign residence with INEGI points to country and explains the correction',()=>{
  const result=draft.identityFieldError({status:400,data:{code:'RESIDENCE_COUNTRY_GEO_MISMATCH',field:'residence.country'}});
  assert.equal(result.label,'País de residencia');assert.match(result.message,/INEGI corresponden a México/);
  assert.deepEqual(result.errors,{'residence.country':[result.message]});
});
