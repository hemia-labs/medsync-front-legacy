'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const component = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/super-admin/businesses/BusinessList.vue'), 'utf8'));
const script = component.script.content.replace(/^import .*;\r?\n/gm, '').replace('export default', 'return');
let requests = 0;
const options = new Function('DASuperAdminService', script)({ createBusiness: async () => { requests += 1; } });
const model = {};
for (const [name, method] of Object.entries(options.methods)) model[name] = method.bind(model);
Object.assign(model, options.data.call(model));
const password = randomBytes(24).toString('hex');
Object.assign(model.createForm.business, { name: 'QA contact email', plan: 'pro' });
Object.assign(model.createForm.adminUser, { create: true, name: 'QA administrator', telephone: '0099999999', password, confirmPassword: password });

async function main() {
    for (const email of [undefined, null, '', '   ', 'invalid', 'a@b', 'a b@example.test', `${'a'.repeat(250)}@example.test`]) {
        model.createForm.adminUser.email = email;
        model.openCreateConfirmDialog();
        assert.equal(model.createConfirmDialog.show, false);
        await model.confirmCreateBusiness();
        assert.equal(requests, 0, 'Invalid contact email must never reach the API');
        assert.ok(model.createDialog.errors.some(error => error.includes('correo del administrador')));
    }
    model.createForm.adminUser.email = ' admin@example.test ';
    model.openCreateConfirmDialog();
    assert.equal(model.createConfirmDialog.show, true);
    assert.equal(model.buildCreatePayload().adminUser.email, 'admin@example.test');
    model.createForm.adminUser.create = false;
    model.createForm.adminUser.email = '';
    assert.equal(model.validateCreateForm(), true, 'No account is created when initial admin is disabled');
    console.log('PASS: required/valid contact email blocks both review and API submission; valid email trimmed; no-admin path preserved');
    if (!process.argv.includes('--serve')) return;

    // Optional isolated UI fixture: actual dialogs/styles, synthetic form values,
    // no authenticated session and no requests to the application API.
    const dialogs = component.template.content.split('<v-dialog v-model="createDialog.show"')[1].split('<v-dialog v-model="editDialog.show"')[0];
    const template = `<div><v-dialog v-model="createDialog.show"${dialogs}</div>`;
    const html = `<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA correo obligatorio</title>
      <link rel="stylesheet" href="/vuetify.css"><style>${component.styles.map(style => style.content).join('\n')}</style>
      <body><div id="app"></div><script src="/vue.js"></script><script src="/vuetify.js"></script><script>
      const c = (function(){${script}})(); c.template = ${JSON.stringify(template)};
      c.created = undefined; c.mounted = undefined; c.watch = {}; c.beforeDestroy = undefined;
      const data = c.data; c.data = function(){ const state = data.call(this);
        state.createDialog.show = true; state.createForm.business.name = 'Consultorio QA'; state.createForm.business.plan = 'pro';
        Object.assign(state.createForm.adminUser, {name:'Administrador QA', telephone:'0099999999', password:crypto.randomUUID()});
        state.createForm.adminUser.confirmPassword = state.createForm.adminUser.password; return state; };
      const DASuperAdminService = {createBusiness:async()=>({success:false,status:400,message:'QA: envio detenido, sin crear registros.'})};
      new Vue({vuetify:new Vuetify(),render:h=>h('v-app',[h(c)])}).$mount('#app');
      </script></body></html>`;
    const assets = { '/vue.js': ['node_modules/vue/dist/vue.js', 'application/javascript'],
        '/vuetify.js': ['node_modules/vuetify/dist/vuetify.js', 'application/javascript'],
        '/vuetify.css': ['node_modules/vuetify/dist/vuetify.min.css', 'text/css'] };
    require('node:http').createServer((req, res) => {
        const asset = assets[req.url];
        res.setHeader('Content-Type', asset ? asset[1] : 'text/html; charset=utf-8');
        res.end(asset ? fs.readFileSync(path.join(root, asset[0])) : html);
    }).listen(4331, '127.0.0.1', () => console.log('Isolated QA UI: http://127.0.0.1:4331'));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
