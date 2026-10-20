/* Real Vue 2 + VueSweetalert2 prompts in jsdom. No API, database or external writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const parse = code => parser.parse(code, { sourceType: 'module' });
function pluginOptionsCode() {
    const calls = parse(read('src/main.js')).program.body;
    const statement = calls.find(item => types.isExpressionStatement(item) && types.isCallExpression(item.expression)
        && types.isMemberExpression(item.expression.callee) && item.expression.callee.object.name === 'Vue'
        && item.expression.callee.property.name === 'use' && item.expression.arguments[0].name === 'VueSweetalert2');
    assert.ok(statement, 'Use the production VueSweetalert2 installation');
    return generate(statement.expression.arguments[1]).code;
}
function methodCode(file, method) {
    const script = compiler.parseComponent(read(file)).script.content;
    const exported = parse(script).program.body.find(types.isExportDefaultDeclaration).declaration;
    const methods = exported.properties.find(item => item.key.name === 'methods').value;
    const node = methods.properties.find(item => item.key && item.key.name === method);
    assert.ok(node, `Production method ${method}`);
    return generate(types.isObjectMethod(node)
        ? types.functionExpression(null, node.params, node.body, node.generator, node.async)
        : node.value).code;
}
function moduleCode(file) {
    return babel.transformSync(read(file), { babelrc: false, configFile: false,
        plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
}
function sourceParts() {
    return {
        defaults: pluginOptionsCode(),
        navigation: moduleCode('src/domain/settings/settings.navigation.js'),
        theme: moduleCode('src/plugins/theme.js'),
        confirmLeave: methodCode('src/views/prescriptions/components/PrescriptionForm.vue', 'confirmLeave'),
        toast: methodCode('src/views/configuration/index.vue', 'toastFunction')
    };
}
module.exports = { root, read, sourceParts };

async function run() {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!doctype html><html><body><button id="launch">Abrir prueba</button></body></html>', { url: 'http://qa.invalid/' });
    for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'DOMParser', 'HTMLVideoElement', 'HTMLAudioElement', 'MutationObserver']) {
        Object.defineProperty(global, key, { configurable: true, value: dom.window[key], writable: true });
    }
    window.scrollTo = () => {};
    // jsdom has no layout; visibility geometry is the only browser primitive supplied here.
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return this.style.display === 'none' ? 0 : 120; } });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.style.display === 'none' ? 0 : 44; } });
    const Vue = require('vue');
    Vue.config.productionTip = false; Vue.config.devtools = false;
    const parts = sourceParts();
    const defaults = Function(`return (${parts.defaults})`)();
    assert.equal(defaults.buttonsStyling, false);
    Vue.use(require('vue-sweetalert2'), defaults);
    const view = new Vue();
    const swal = view.$swal;
    function load(code) { const module = { exports: {} }; Function('require', 'module', 'exports', code)(name => name === 'vue' ? Vue : require(name), module, module.exports); return module.exports; }
    const navigation = load(parts.navigation), theme = load(parts.theme);
    const confirmLeave = Function(`return (${parts.confirmLeave})`)();
    const toast = Function(`return (${parts.toast})`)();
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const open = async action => { const result = action(); await delay(35); assert.ok(swal.getPopup(), 'Real popup opened'); return { result }; };
    const click = name => { const button = swal[`get${name}Button`](); assert.ok(button, name + ' button'); button.click(); };
    const checks = [];
    async function check(name, action) { try { await action(); checks.push({ name, ok: true }); console.log('PASS ' + name); } catch (error) { checks.push({ name, ok: false }); console.error('FAIL ' + name + '\n' + error.stack); swal.close(); await delay(30); } }
    await check('production plugin defaults apply to callable, fire, mixin and three-button prompts', async () => {
        const opened = await open(() => swal({ title: 'Prueba', showCancelButton: true, showDenyButton: true }));
        for (const name of ['Confirm', 'Cancel', 'Deny']) assert.equal(swal[`get${name}Button`]().classList.contains('swal2-styled'), false);
        click('Cancel'); await opened.result;
        const second = await open(() => swal.fire({ title: 'Prueba fire' }));
        assert.equal(swal.getConfirmButton().classList.contains('swal2-styled'), false); click('Confirm'); await second.result;
    });
    await check('exact settings discard prompt focuses cancel and preserves capture until explicit discard', async () => {
        let discarded = 0;
        const local = { ...view, $swal: swal, capture: 'Cambios de prueba' };
        const first = await open(async () => { if (await navigation.confirmSettingsDiscard(local)) { local.capture = ''; discarded++; } });
        assert.equal(swal.getTitle().textContent, 'Tienes cambios sin guardar');
        assert.equal(document.activeElement, swal.getCancelButton());
        assert.ok(swal.getConfirmButton().classList.contains('medsync-alert-danger'));
        const parallel = navigation.confirmSettingsDiscard(local);
        assert.equal(document.querySelectorAll('.swal2-popup').length, 1, 'Repeated requests share one dialog');
        click('Cancel'); await first.result; assert.equal(await parallel, false);
        assert.equal(local.capture, 'Cambios de prueba'); assert.equal(discarded, 0);
        const second = await open(async () => { if (await navigation.confirmSettingsDiscard(local)) { local.capture = ''; discarded++; } });
        click('Confirm'); await second.result; assert.equal(discarded, 1); assert.equal(local.capture, '');
    });
    await check('prescription three decisions retain save/discard/cancel semantics and failure/busy guards', async () => {
        let saves = 0;
        const local = { $swal: swal, $nextTick: () => Vue.nextTick(), internalShow: true, busy: false, dirty: true,
            saveDraft: async closeAfter => { assert.equal(closeAfter, false); saves++; return true; } };
        for (const [decision, expected, expectedSaves] of [['Cancel', false, 0], ['Deny', true, 0], ['Confirm', true, 1]]) {
            const prompt = await open(() => confirmLeave.call(local));
            assert.equal(document.activeElement, swal.getCancelButton());
            click(decision); assert.equal(await prompt.result, expected); assert.equal(saves, expectedSaves); assert.equal(local.leaveDialogOpen, false);
        }
        local.saveDraft = async () => false;
        const failed = await open(() => confirmLeave.call(local)); click('Confirm'); assert.equal(await failed.result, false);
        local.busy = true; assert.equal(await confirmLeave.call(local), false); assert.equal(swal.getPopup(), null);
        local.busy = false; local.dirty = false; assert.equal(await confirmLeave.call(local), true);
    });
    await check('input validation remains visible and prevents the confirmation callback until valid', async () => {
        let changed = 0;
        const prompt = await open(() => swal({ title: 'Motivo de prueba', input: 'text', inputLabel: 'Motivo',
            inputValidator: value => !value.trim() ? 'Escribe un motivo para continuar.' : undefined,
            showCancelButton: true }).then(result => { if (result.isConfirmed) changed++; return result; }));
        click('Confirm'); await delay(30);
        assert.match(swal.getValidationMessage().textContent, /Escribe un motivo/); assert.equal(changed, 0);
        swal.getInput().value = 'Prueba local'; swal.getInput().dispatchEvent(new window.Event('input', { bubbles: true }));
        click('Confirm'); assert.equal((await prompt.result).value, 'Prueba local'); assert.equal(changed, 1);
    });
    await check('Escape dismisses the settings prompt without discarding', async () => {
        const prompt = await open(() => navigation.confirmSettingsDiscard({ $swal: swal }));
        document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        assert.equal(await prompt.result, false);
    });
    await check('real toast mixin preserves timer, hover pause and resume with hidden action buttons', async () => {
        await open(() => toast.call({ $swal: swal }, 'success', 'Prueba local completada'));
        assert.ok(swal.getPopup().classList.contains('swal2-toast')); assert.equal(swal.getConfirmButton().style.display, 'none');
        await delay(60); const popup = swal.getPopup(); popup.dispatchEvent(new window.Event('mouseenter'));
        const paused = swal.getTimerLeft(); assert.ok(paused > 0 && paused <= 3000);
        await delay(90); assert.equal(swal.getTimerLeft(), paused);
        popup.dispatchEvent(new window.Event('mouseleave')); await delay(90); assert.ok(swal.getTimerLeft() < paused); swal.close();
    });
    await check('production theme API changes CSS variables while an existing popup stays open', async () => {
        theme.applyTheme(theme.DEFAULT_THEME);
        const prompt = await open(() => swal.fire({ title: 'Cambio de tema en vivo' }));
        const popup = swal.getPopup();
        theme.applyTheme({ code: 'qa-green', primary_700: '#047857', primary_900: '#065f46', primary_1000: '#064e3b' });
        assert.equal(document.documentElement.style.getPropertyValue('--color-primary-900'), '#065f46'); assert.equal(swal.getPopup(), popup);
        theme.applyTheme({ code: 'clinical-night', primary_700: '#0369a1', primary_900: '#075985', primary_1000: '#0c4a6e' });
        assert.equal(document.documentElement.dataset.theme, 'clinical-night'); click('Confirm'); await prompt.result;
    });
    const failures = checks.filter(item => !item.ok);
    console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failures.length, failed: failures.length, runtime: process.version,
        plugin: JSON.parse(read('node_modules/vue-sweetalert2/package.json')).version }, null, 2));
    dom.window.close();
    if (failures.length) process.exitCode = 1;
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
