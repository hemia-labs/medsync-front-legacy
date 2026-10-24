/* Isolated real SFC methods/validators. No browser, login request, or user save. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const validators = require('vuelidate/lib/validators');
const repo = path.resolve(__dirname, '../..');
function component(file) {
    const sfc = compiler.parseComponent(fs.readFileSync(path.join(repo,file), 'utf8'));
    assert.deepEqual(compiler.compile(sfc.template.content).errors, [], file + ' compiles');
    const ast = babel.parseSync(sfc.script.content, {sourceType:'module',babelrc:false,configFile:false});
    return ast.program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration;
}
function pick(object, key) {return object.properties.find(node => node.key && (node.key.name || node.key.value) === key);}
function value(expression, bindings = {}) {
    const ast = babel.types.file(babel.types.program([babel.types.expressionStatement(expression)]));
    const code = babel.transformFromAstSync(ast, null, {babelrc:false,configFile:false}).code.replace(/;\s*$/, '');
    return new Function(...Object.keys(bindings), 'return (' + code + ');')(...Object.values(bindings));
}
function methods(object, keys, bindings) {return value(babel.types.objectExpression(keys.map(key => pick(pick(object,'methods').value,key))),bindings);}
const login = methods(component('src/views/Auth/Login.vue'), ['safeLoginErrorMessage']);
for(const message of ['No fue posible preparar la solicitud segura.','Network Error','timeout','No fue posible completar la solicitud.']) {
    assert.match(login.safeLoginErrorMessage(message), /conectar con MedSync.*conexión.*nuevamente/i, 'Connection failure must explain reconnect/retry, not credentials');
}
assert.match(login.safeLoginErrorMessage('AUTH_RATE_LIMITED'), /temporalmente.*más tarde/);
assert.equal(login.safeLoginErrorMessage('Usuario o contraseña incorrectos.'), 'No pudimos iniciar sesión con esos datos.');
assert.doesNotMatch(login.safeLoginErrorMessage('Database SQL error password=private'), /Database|SQL|private/);
console.log('PASS login: secure-request offline/network/timeout messages explain connection and retry; credentials/rate-limit remain distinct; internal errors sanitized.');

const staffComponent = component('src/views/User/DAAddUser.vue');
const regexSource = fs.readFileSync(path.join(repo,'src/utils/common/regex.js'),'utf8');
const regexCode = babel.transformSync(regexSource,{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
const moduleObject = {exports:{}};
new Function('require','module','exports',regexCode)(() => validators,moduleObject,moduleObject.exports);
const staffValidation = value(pick(staffComponent,'validations').value, {...validators,...moduleObject.exports});
assert.equal(staffValidation.user.phone.required(''),false);
assert.equal(staffValidation.user.phone.phonePattern('123'),false);
assert.equal(staffValidation.user.phone.phonePattern('12345678901'),false);
assert.equal(staffValidation.user.phone.phonePattern('abc1234567'),false);
assert.equal(staffValidation.user.phone.phonePattern('5512345678'),true);
assert.equal(staffValidation.user.email.emailPattern('correo incorrecto'),false);
assert.equal(staffValidation.user.email.emailPattern('qa@example.test'),true);
let response = {success:true,data:{business:{planName:'Profesional'},license:{professionals:{used:1,limit:1},staffUsers:{used:1,limit:3}}}};
const staff = methods(staffComponent,['fieldErrors','formatLicenseUsage','loadLicenseSummary','onSave'],{
    // This fixture only submits an invalid form; session behavior is covered by S18.
    authorizationContext:()=>({}), isCurrentAuthorization:()=>true,
    DABusinessService:{getLicenseUsage:async () => {if(response instanceof Error)throw response;return response;}}
});
assert.equal(staff.formatLicenseUsage(undefined),'No disponible');
assert.equal(staff.formatLicenseUsage({}),'No disponible');
assert.equal(staff.formatLicenseUsage({used:1,limit:1}),'1 de 1');
assert.equal(staff.formatLicenseUsage({used:0,limit:0}),'0 de 0');
assert.equal(staff.formatLicenseUsage({used:2,limit:null}),'Sin límite');
const context = {licenseSummary:null,licenseLoading:false,licenseError:false};
(async () => {
    await staff.loadLicenseSummary.call(context);
    assert.equal(context.licenseError,false);
    assert.equal(context.licenseSummary.business.planName,'Profesional');
    response = {success:false,message:'El plan requiere revisión.'};
    await staff.loadLicenseSummary.call(context);
    assert.equal(context.licenseSummary,null,'Failed plan lookup must clear stale counts');
    assert.equal(context.licenseError,true);
    assert.equal(context.licenseLoading,false);
    response = Error('Offline');
    await staff.loadLicenseSummary.call(context);
    assert.equal(context.licenseError,true);
    assert.equal(context.licenseLoading,false);
    const validationContext = {$v:{user:{phone:{$dirty:true,$invalid:true}}}};
    assert.deepEqual(staff.fieldErrors.call(validationContext,'phone'), ['Ingresa un teléfono de 10 dígitos.']);
    let saveCalls = 0, touched = 0, focused = 0;
    const invalidForm = {saving:false,$v:{$touch(){touched++;},$anyError:true},$nextTick:callback => callback(),$refs:{validationSummary:{focus(){focused++;}}},save:async () => {saveCalls++;}};
    await staff.onSave.call(invalidForm);
    assert.equal(touched,1); assert.equal(focused,1); assert.equal(saveCalls,0,'Invalid staff form cannot call save');
    console.log('PASS staff: actual phone/email validators, actionable phone error, finite/unknown/unlimited license states, failed lookup clears stale counts, invalid submit focuses summary and never saves.');
})().catch(error => {console.error(error);process.exitCode=1;});
