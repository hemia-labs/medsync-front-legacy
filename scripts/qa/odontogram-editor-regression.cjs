/* Real Vue 2/Vuetify/Vuelidate SFC regression with in-memory services.
 * No browser storage, authentication, HTTP, or database access. Node 22.12+.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { JSDOM, VirtualConsole } = require('jsdom');

const repo = path.resolve(__dirname, '../..');
const treatmentId = 'src/views/Patient/components/DAOdontogramTreatment.vue';
const historyId = 'src/views/Patient/components/DAOdontogramHistory.vue';
const serviceId = 'src/services/context/core-proccess-context.js';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const json = value => JSON.parse(JSON.stringify(value));
async function until(predicate, label) {
    const deadline = Date.now() + 5000;
    while (!predicate()) {
        if (Date.now() > deadline) throw Error('Timed out: ' + label);
        await pause(10);
    }
}
function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

function fixture(componentId = treatmentId) {
    const warnings = [];
    const virtualConsole = new VirtualConsole();
    ['jsdomError', 'warn', 'error'].forEach(event => virtualConsole.on(event, error => warnings.push(String(error))));
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
        url: 'http://127.0.0.1/odontogram-editor-qa', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole
    });
    const w = dom.window;
    w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    w.scrollTo = () => {};
    [require.resolve('vue/dist/vue.js'), path.join(path.dirname(require.resolve('vuex')), 'vuex.js'),
        require.resolve('vuetify/dist/vuetify.js'), require.resolve('vuelidate/dist/vuelidate.min.js'),
        require.resolve('vuelidate/dist/validators.min.js')].forEach(file => w.eval(fs.readFileSync(file, 'utf8')));
    const Vue = w.Vue, Vuex = w.Vuex;
    Vue.config.productionTip = false; Vue.config.devtools = false;
    Vue.use(Vuex); Vue.use(w.Vuetify);
    Vue.component('lottie-animation', { render: h => h('span') });
    const calls = { save: [], status: [], delete: [], history: 0 };
    const qa = { scenario: 'ok', gate: null, wrote: false };
    let records = [
        { id_odontogramv1: 'qa-odontogram', code: 'QA-ACTUAL', description: 'Permanente', created_at: '2026-10-16', active: true },
        { id_odontogramv1: 'qa-previous', code: 'QA-ANTERIOR', description: 'Temporal', created_at: '2026-10-15', active: false }
    ];
    const tooth = { id_odontogram_detailv1: 'qa-detail', id_tooth: 'qa-tooth', treatment: 'Diagnóstico inicial', sec: 11 };
    const ok = data => ({ success: true, data });
    const result = async (kind, payload) => {
        calls[kind].push(json(payload));
        if (qa.gate) await qa.gate.promise;
        if (qa.scenario === 'throw') throw Error('Simulated network failure');
        if (qa.scenario === 'fail') return { success: false, message: 'No se pudo completar la operación de prueba.' };
        qa.wrote = true;
        return ok({});
    };
    const service = {
        getHistory: async () => {
            calls.history++;
            if (qa.scenario === 'load-fail' || qa.scenario === 'refresh-fail' && qa.wrote) return { success: false, message: 'No se pudo cargar el historial de prueba.' };
            if (qa.scenario === 'load-throw') throw Error('Simulated history network failure');
            return ok(json(records));
        },
        getOdontogramDetail: async () => qa.scenario === 'refresh-fail' && qa.wrote ? { success: false, message: 'No se pudo actualizar el detalle.' } : ok([json(tooth)]),
        validateOdontogram: async () => ok(records.find(row => row.active) || { id_odontogramv1: null, active: false }),
        saveDetail: payload => result('save', payload),
        status: async payload => {
            const response = await result('status', payload);
            if (response.success) records = records.map(row => ({ ...row, active: payload.active ? row.id_odontogramv1 === payload.id_odontogramv1 : row.id_odontogramv1 === payload.id_odontogramv1 ? false : row.active }));
            return response;
        },
        delete: async payload => {
            const response = await result('delete', payload);
            if (response.success) records = records.filter(row => row.id_odontogramv1 !== payload.id_odontogramv1);
            return response;
        }
    };
    const cache = { vue: { exports: Vue }, vuex: { exports: Vuex }, vuelidate: { exports: w.vuelidate }, 'vuelidate/lib/validators': { exports: w.validators }, [serviceId]: { exports: { DAOdontogramService: service } } };
    function resolveLocal(id, specifier) {
        if (!specifier.startsWith('.')) return specifier;
        const base = path.posix.normalize(path.posix.join(path.posix.dirname(id), specifier));
        const resolved = [base, base + '.js', base + '.vue', base + '/index.js'].find(candidate => fs.existsSync(path.join(repo, candidate)) && fs.statSync(path.join(repo, candidate)).isFile());
        if (!resolved) throw Error(`Cannot resolve ${specifier} from ${id}`);
        return resolved;
    }
    function load(id) {
        if (cache[id]) return cache[id].exports;
        if (!id.startsWith('src/')) throw Error('Unmocked dependency: ' + id);
        let source = fs.readFileSync(path.join(repo, id), 'utf8');
        let template;
        if (id.endsWith('.vue')) {
            const sfc = compiler.parseComponent(source);
            source = sfc.script.content;
            template = compiler.compile(sfc.template.content, { whitespace: 'condense' });
            assert.deepEqual(template.errors, [], 'SFC must compile: ' + id);
        }
        const code = babel.transformSync(source, { filename: id, babelrc: false, configFile: false,
            plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
        const module = cache[id] = { exports: {} };
        new w.Function('require', 'module', 'exports', code)(specifier => load(resolveLocal(id, specifier)), module, module.exports);
        if (template) {
            module.exports.default.render = new w.Function(template.render);
            module.exports.default.staticRenderFns = template.staticRenderFns.map(render => new w.Function(render));
        }
        return module.exports;
    }
    const modules = { ODONTOGRAM: load('src/store/modules/odontogram/index.js').default, PX: { namespaced: true, state: { id_person: 'qa-patient' } } };
    const store = new Vuex.Store({ modules: { CORE: { namespaced: true, modules,
        actions: { ActionWrapper: (context, { module, action, payload }) => store.dispatch(module + '/' + action, payload) } } } });
    store.dispatch('CORE/ODONTOGRAM/setOdontogramDetail', tooth);
    [
        ['da-text-area-primary', 'input/DATextAreaPrimary.vue'], ['da-button-primary', 'buttons/DAPrimaryButton.vue'],
        ['da-button-secondary', 'buttons/DASecondaryButton.vue'], ['da-button-cancel', 'buttons/DACancelButton.vue'],
        ['da-button-gray', 'buttons/DAGrayButton.vue'], ['da-dialog', 'dialog/DADialog.vue'], ['da-datatable', 'table/DADatatable.vue']
    ].forEach(([name, file]) => Vue.component(name, load('src/core/components/form/' + file).default));
    const events = { close: 0, saved: [], refresh: 0, busy: [] };
    const Component = load(componentId).default;
    const app = new Vue({ store, vuetify: new w.Vuetify({}), render: h => h('v-app', [h(Component, {
        ref: 'editor', props: { item: tooth, id: 'qa-patient', open: true }, on: {
            close: () => events.close++, saved: response => events.saved.push(response), 'refresh-error': () => events.refresh++, busy: value => events.busy.push(value)
        }
    })]) }).$mount('#app');
    const vm = app.$refs.editor;
    const query = selector => w.document.querySelector(selector);
    const clickText = text => {
        const button = [...w.document.querySelectorAll('button')].find(element => element.textContent.trim() === text);
        assert.ok(button, 'Missing rendered button: ' + text); button.click();
    };
    const close = () => { app.$destroy(); w.close(); assert.deepEqual(warnings, [], 'No rendered Vue/Vuetify errors'); };
    return { w, Vue, store, vm, calls, qa, events, query, clickText, close, load };
}

(async () => {
    let f = fixture();
    try {
        assert.equal(f.vm.odontogramDetail.id_person, '', 'Real setOdontogramDetail reproduces the empty nested patient ID');
        assert.equal(f.w.validators.required(f.vm.odontogramDetail.id_person), false, 'Original nested required validation rejected every valid diagnosis');
        assert.equal(f.vm.$v.$invalid, false, 'Patient validation uses the current PX patient ID supplied to the payload');
        const text = f.query('textarea'); text.value = 'Caries oclusal de prueba'; text.dispatchEvent(new f.w.Event('input', { bubbles: true }));
        await f.Vue.nextTick(); await f.Vue.nextTick();
        f.qa.gate = deferred();
        f.clickText('Guardar diagnóstico'); f.vm.onSave();
        await f.Vue.nextTick();
        assert.equal(f.calls.save.length, 1, 'Save is deduplicated while pending');
        assert.deepEqual(f.events.busy, [true], 'Pending diagnosis informs parent navigation guard');
        assert.equal(f.query('textarea').disabled, true);
        assert.equal([...f.w.document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cancelar').disabled, true);
        f.vm.onClose(); assert.equal(f.events.close, 0, 'Pending save cannot be closed');
        assert.equal(f.calls.save[0].id_person, 'qa-patient');
        assert.equal(f.calls.save[0].id_tooth, 'qa-tooth');
        assert.equal(f.calls.save[0].id_odontogram_detailv1, 'qa-detail');
        assert.equal(f.calls.save[0].treatment, 'Caries oclusal de prueba');
        f.qa.gate.resolve(); await until(() => !f.vm.saving, 'successful diagnosis save');
        assert.equal(f.events.close, 1); assert.equal(f.events.saved.length, 1);
        assert.equal(f.events.saved[0].refreshSuccess, true);
        assert.deepEqual(f.events.busy, [true, false]);
        console.log('PASS diagnosis: missing nested patient regression, real textarea/Vuelidate, correct patient/tooth/payload, single save, busy/close lock and successful refresh.');
    } finally { f.close(); }

    for (const scenario of ['fail', 'throw']) {
        f = fixture();
        try {
            f.qa.scenario = scenario;
            await f.vm.onSave();
            assert.equal(f.events.close, 0); assert.equal(f.events.saved.length, 0);
            assert.ok(f.vm.saveError); assert.equal(f.vm.saving, false);
            await f.Vue.nextTick(); assert.ok(f.query('[role="alert"]'));
            f.qa.scenario = 'ok'; await f.vm.onSave(); assert.equal(f.events.close, 1);
        } finally { f.close(); }
    }
    f = fixture();
    try {
        f.vm.odontogramDetail.treatment = '   ';
        await f.vm.onSave(); assert.equal(f.calls.save.length, 0, 'Whitespace diagnosis is rejected');
        f.vm.odontogramDetail.treatment = 'Diagnóstico';
        f.store.state.CORE.PX.id_person = '';
        await f.vm.onSave(); assert.equal(f.calls.save.length, 0, 'Missing PX patient is rejected');
    } finally { f.close(); }
    f = fixture();
    try {
        f.qa.scenario = 'refresh-fail'; await f.vm.onSave();
        assert.equal(f.events.close, 1); assert.equal(f.events.saved[0].refreshSuccess, false);
        assert.equal(f.calls.save.length, 1, 'Persisted save with failed refresh is reported as persisted');
    } finally { f.close(); }
    console.log('PASS diagnosis validation/errors: empty diagnosis/patient blocked, service/network failures stay open, retry works, persisted write with refresh failure signals parent.');

    f = fixture(historyId);
    try {
        await until(() => !f.vm.loading, 'history load'); await f.Vue.nextTick();
        const search = f.query('input[type="text"]'); assert.ok(search, 'History exposes search');
        search.value = 'QA-ANTERIOR'; search.dispatchEvent(new f.w.Event('input', { bubbles: true })); await f.Vue.nextTick();
        assert.match(f.query('.history-list').textContent, /QA-ANTERIOR/); assert.doesNotMatch(f.query('.history-list').textContent, /QA-ACTUAL/);
        search.value = ''; search.dispatchEvent(new f.w.Event('input', { bubbles: true })); await f.Vue.nextTick();
        const statusAction = f.query('.record-status-action'); assert.equal(statusAction.textContent.trim(), 'Finalizar');
        statusAction.click(); await f.Vue.nextTick();
        assert.equal(f.vm.isChangeActive, true); assert.equal(f.vm.history[0].active, true, 'Proposal does not mutate Vuex record');
        assert.equal(f.vm.odontogramEdit.active, false, 'Confirmation receives proposed state');
        await f.vm.onChangeActive(f.vm.odontogramEdit, false); await f.Vue.nextTick();
        assert.equal(f.calls.status.length, 0); assert.equal(f.vm.history[0].active, true);
        assert.equal(f.query('.record-status-action').textContent.trim(), 'Finalizar', 'Cancel preserves rendered current status/action');
        f.vm.onEvent(f.vm.history[0], f.vm.actions.DELETE); f.vm.onCancelDelete();
        assert.equal(f.calls.delete.length, 0, 'Delete cancel never writes');
        f.vm.onEvent({ ...f.vm.history[0], active: false }, f.vm.actions.CHANGEACTIVE);
        f.qa.gate = deferred(); const change = f.vm.onChangeActive(f.vm.odontogramEdit, true);
        f.vm.onChangeActive(f.vm.odontogramEdit, true); f.vm.onClose();
        assert.equal(f.calls.status.length, 1); assert.equal(f.events.close, 0);
        assert.deepEqual(f.events.busy, [true], 'Pending status informs parent navigation guard');
        f.qa.gate.resolve(); await change;
        assert.equal(f.events.close, 1); assert.equal(f.vm.history[0].active, false);
        assert.deepEqual(f.events.busy, [true, false]);
        console.log('PASS history: real records/search, status proposal/cancel leaves data intact, delete cancel never writes, status busy/double-submit lock and refresh.');
    } finally { f.close(); }

    for (const operation of ['status', 'delete']) for (const scenario of ['fail', 'throw', 'refresh-fail']) {
        f = fixture(historyId);
        try {
            await until(() => !f.vm.loading, 'history load');
            f.qa.scenario = scenario;
            const isStatus = operation === 'status';
            f.vm.onEvent({ ...f.vm.history[0], active: false }, isStatus ? f.vm.actions.CHANGEACTIVE : f.vm.actions.DELETE);
            if (isStatus) await f.vm.onChangeActive(f.vm.odontogramEdit, true);
            else await f.vm.onDelete(f.vm.odontogramEdit);
            assert.equal(f.vm.pending, false);
            if (scenario === 'refresh-fail') {
                assert.equal(f.events.refresh, 1); assert.equal(f.vm.isChangeActive, false); assert.equal(f.vm.isDelete, false);
            } else {
                assert.equal(f.events.close, 0); assert.equal(f.vm.history[0].active, true);
                assert.ok(f.vm.actionError); assert.equal(isStatus ? f.vm.isChangeActive : f.vm.isDelete, true);
                f.qa.scenario = 'ok'; f.qa.gate = deferred();
                const pending = isStatus ? f.vm.onChangeActive(f.vm.odontogramEdit, true) : f.vm.onDelete(f.vm.odontogramEdit);
                if (isStatus) f.vm.onChangeActive(f.vm.odontogramEdit, true); else f.vm.onDelete(f.vm.odontogramEdit);
                assert.equal(f.calls[operation].length, 2, 'Pending retry cannot be duplicated');
                f.qa.gate.resolve(); await pending;
                if (!isStatus) assert.equal(f.vm.history.length, 1, 'Confirmed delete refreshes the table');
            }
        } finally { f.close(); }
    }
    for (const scenario of ['load-fail', 'load-throw']) {
        f = fixture(historyId);
        try {
            await until(() => !f.vm.loading, 'initial history load');
            f.qa.scenario = scenario; await f.vm.init();
            assert.ok(f.vm.loadError); f.vm.onEvent(f.vm.history[0], f.vm.actions.DELETE);
            assert.equal(f.vm.isDelete, false, 'Failed history load blocks stale-record mutations');
            f.qa.scenario = 'ok'; await f.vm.init(); assert.equal(f.vm.loadError, '');
        } finally { f.close(); }
    }
    console.log('PASS history failures: load/network errors recover; status/delete errors preserve data and confirmation; duplicate retries blocked; refresh failure signals parent without repeating persisted writes.');
    console.log('PASS all odontogram editor regressions. In-memory records only.');
})().catch(error => { console.error(error); process.exitCode = 1; });
