// Real edit methods: uncertain writes and partial profile saves must preserve surname partition.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const source = compiler.parseComponent(fs.readFileSync('src/views/User/DAEditUser.vue','utf8')).script.content;
const ast = babel.parseSync(source,{babelrc:false,configFile:false,sourceType:'module'});
const component = ast.program.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
const methods = component.properties.find(n=>n.key.name==='methods').value;
const exportsObject={exports:{}};
const domain=babel.transformSync(fs.readFileSync('src/domain/user/userSurnames.js','utf8'),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
new Function('module','exports',domain)(exportsObject,exportsObject.exports);
const actual = {id_login:'qa',first_name:'Ana',first_surname:'De la Cruz',second_surname:null,last_name:'De la Cruz',email:'qa@example.invalid',phone:'5500000091',id_rol:'r',active:1};
const bindings={...exportsObject.exports,authorizationContext:()=>({}),isCurrentAuthorization:()=>true,DAUserService:{getUser:async()=>({success:true,data:actual})},buildLicenseLimitMessage:()=>''};
const selected=methods.properties.filter(n=>['onSave','acceptContactSave'].includes(n.key?.name));
const code=babel.transformFromAstSync(babel.types.file(babel.types.program([babel.types.expressionStatement(babel.types.objectExpression(selected))])),null,{babelrc:false,configFile:false}).code.replace(/;\s*$/,'');
const real=new Function(...Object.keys(bindings),'return ('+code+')')(...Object.values(bindings));
function vm(extra={}){const instance={...real,id:'qa',loadedUserId:'qa',disposed:false,isWorking:()=>false,isLoading:false,loadError:'',isSaving:false,baseline:'old',storedStructured:false,storedLastName:'Old surname',user:{...actual},$store:{},$v:{$touch(){},$anyError:false},...extra};return instance;}
(async()=>{
 const expected={...actual,first_surname:'De la',second_surname:'Cruz'};
 const uncertain=vm({pendingContact:expected,pendingSnapshot:JSON.stringify(expected)});
 await uncertain.onSave();
 assert.equal(uncertain.baseline,'old','same joined surnames cannot confirm a different partition');
 assert.ok(uncertain.pendingContact,'uncertain capture retained');
 const partial=vm({user:{...expected,last_name:'Old surname'},dirty:true,update:async()=>({success:true}),saveProfessionalProfileIfNeeded:async()=>false,$emit(){throw Error('must stay open');}});
 await partial.onSave();
 assert.equal(partial.storedStructured,true,'successful contact save advances structured state even when profile fails');
 assert.equal(partial.user.last_name,'De la Cruz','historical join cannot return on a second save');
 partial.user.first_surname='';partial.user.second_surname='';
 assert.ok(Object.keys(exportsObject.exports.surnameErrors(partial.user,{storedStructured:partial.storedStructured})).length,'clearing both remains invalid after partial save');
 assert.deepEqual(JSON.parse(partial.baseline),{...expected,last_name:'De la Cruz'});
 console.log('PASS uncertain surname partition and partial profile save (real SFC methods)');
})().catch(error=>{console.error(error);process.exitCode=1;});
