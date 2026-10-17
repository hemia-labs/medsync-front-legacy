/* Rendered Vue 2/Vuetify regression, using real odontogram SFCs/Vuex and fake services.
 * Uses jsdom 30: execute with Node 22.12+ or the bundled Codex Node runtime.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { buildClient, childId } = require('./odontogram-ui-preview.cjs');

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function until(predicate, label) {
    const deadline = Date.now() + 5000;
    while (!predicate()) {
        if (Date.now() >= deadline) throw Error('Timed out: ' + label);
        await pause(15);
    }
}

function fixture(scenario = 'empty', options = {}) {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error.message));
    virtualConsole.on('warn', message => errors.push(String(message)));
    virtualConsole.on('error', message => errors.push(String(message)));
    const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
        url: 'http://127.0.0.1/preview?scenario=' + scenario,
        runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole
    });
    const window = dom.window;
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    window.scrollTo = () => {};
    // Browser DOM interaction belongs to CUA. This fixture only renders in jsdom.
    [require.resolve('vue/dist/vue.js'),
        path.join(path.dirname(require.resolve('vuex')), 'vuex.js'),
        require.resolve('vuetify/dist/vuetify.js'),
        ...(options.includeEditors ? [require.resolve('vuelidate/dist/vuelidate.min.js'),
            require.resolve('vuelidate/dist/validators.min.js')] : [])]
        .forEach(filename => window.eval(fs.readFileSync(filename, 'utf8')));
    window.eval(buildClient(options).script);
    const qa = window.__odontogramQA;
    const query = selector => window.document.querySelector(selector);
    const click = selector => {
        const element = query(selector);
        assert.ok(element, 'Missing rendered element: ' + selector);
        element.click();
    };
    return { dom, window, qa, query, click, errors, close: () => {
        qa.app.$destroy();
        assert.equal(qa.routeGuards.length, 0, 'Unmount removes the route guard');
        assert.equal(qa.sectionGuard, null, 'Unmount clears the patient-section guard');
        window.close();
    } };
}

async function loaded(f) { await until(() => !f.qa.vm.loading, 'initial odontogram load'); await f.window.Vue.nextTick(); }
async function select(f, index = 0) {
    const input = f.window.document.querySelectorAll('.dentition-option input')[index];
    assert.ok(input, 'Expected dentition option');
    input.click();
    await f.window.Vue.nextTick();
}
function noWarnings(f) { assert.deepEqual(f.errors, [], 'Rendered fixture must not emit Vue/prop/directive errors'); }

(async () => {
    let f = fixture();
    try {
        assert.equal(f.qa.vm.loading, true);
        assert.equal(f.qa.vm.addOdontograma, false, 'Creation must wait for a successful absence check');
        await loaded(f);
        assert.equal(f.qa.vm.addOdontograma, true);
        assert.equal(f.query('[role="dialog"]').getAttribute('aria-label'), 'Crear odontograma');
        assert.equal(f.query('.create-submit').disabled, true, 'Dentition must be selected before creation');
        assert.equal(f.qa.calls.save, 0);
        f.click('.create-cancel');
        await f.window.Vue.nextTick();
        assert.equal(f.qa.vm.addOdontograma, false);
        assert.equal(f.qa.calls.save, 0, 'Cancel never writes');
        f.click('[aria-label="Crear odontograma"]');
        await f.window.Vue.nextTick();
        assert.equal(f.qa.vm.addOdontograma, true);
        await f.qa.vm.onSaveParent('missing-type');
        assert.equal(f.qa.calls.save, 0, 'Unknown catalog values never reach the service');
        await select(f, 1);
        assert.equal(f.query('.create-submit').disabled, false);
        f.qa.delay = 160;
        f.click('.create-submit'); f.click('.create-submit');
        await f.window.Vue.nextTick();
        assert.equal(f.qa.vm.saving, true);
        assert.equal(f.qa.calls.save, 1, 'Double activation is deduplicated while pending');
        assert.equal(f.query('.create-cancel').disabled, true);
        assert.equal(f.query('.dentition-options').disabled, true);
        assert.equal(await f.qa.sectionGuard(), false, 'Section navigation waits while creation is pending');
        let nextResult;
        f.qa.routeGuards[0]({}, {}, value => { nextResult = value; });
        assert.equal(nextResult, false, 'Route navigation waits while creation is pending');
        await until(() => !f.qa.vm.saving, 'successful creation and detail refresh');
        assert.equal(f.qa.vm.addOdontograma, false);
        assert.equal(f.qa.vm.id_odontogram, 'qa-odontogram');
        assert.equal(f.qa.vm.odontogram.length, 1);
        assert.match(f.qa.vm.feedback, /creado correctamente/);
        assert.equal(f.qa.calls.detail, 1);
        assert.equal(f.qa.payloads[0].type, '2');
        assert.equal(f.qa.payloads[0].id_person, 'qa-patient');
        assert.equal(await f.qa.sectionGuard(), true);
        noWarnings(f);
        console.log('PASS rendered dialog: absence waits for load, accessible name, cancel/reopen, selection validation, duplicate-submit lock, correct patient/type, success/detail refresh.');
    } finally { f.close(); }

    f = fixture('existing');
    try {
        await loaded(f);
        assert.equal(f.qa.vm.addOdontograma, false, 'Existing active odontogram does not trigger creation');
        f.click('[aria-label="Crear odontograma"]');
        await f.window.Vue.nextTick();
        assert.match(f.query('.odontogram-create').textContent, /actual se desactivará/);
        noWarnings(f);
        console.log('PASS existing record: no automatic creation; explicit replacement shows history/deactivation notice.');
    } finally { f.close(); }

    for (const scenario of ['load-error', 'catalog-error']) {
        f = fixture(scenario);
        try {
            await loaded(f);
            assert.equal(f.qa.vm.addOdontograma, false, 'A failed lookup must not imply absence');
            assert.ok(f.qa.vm.loadError);
            assert.equal(f.query('[aria-label="Crear odontograma"]').disabled, true);
            f.qa.scenario = 'empty';
            const retry = [...f.window.document.querySelectorAll('button')].find(button => /Reintentar/.test(button.textContent));
            assert.ok(retry); retry.click();
            await loaded(f);
            assert.equal(f.qa.vm.addOdontograma, true);
            assert.equal(f.qa.calls.save, 0);
            noWarnings(f);
        } finally { f.close(); }
    }
    console.log('PASS initial/catalog errors: error state blocks creation; explicit retry can recover.');

    f = fixture('save-error');
    try {
        await loaded(f); await select(f);
        f.click('.create-submit');
        await until(() => !f.qa.vm.saving, 'failed creation');
        await f.window.Vue.nextTick();
        assert.equal(f.qa.vm.addOdontograma, true);
        assert.ok(f.qa.vm.createError);
        assert.equal(f.query('.dentition-option input').checked, true, 'Failed create preserves choice');
        assert.equal(f.query('.create-submit').disabled, false);
        assert.equal(f.qa.vm.id_odontogram, null);
        assert.equal(f.qa.vm.createNeedsReload, true);
        assert.match(f.query('.create-submit').textContent, /Volver a cargar/);
        await f.qa.vm.onSaveParent('1');
        assert.equal(f.qa.calls.save, 1, 'An uncertain save cannot be retried before checking persisted state');
        f.qa.scenario = 'empty';
        f.click('.create-submit');
        await loaded(f);
        assert.equal(f.qa.vm.createNeedsReload, false);
        assert.equal(f.qa.calls.save, 1, 'Recovery queries state before offering a new creation');
        await select(f);
        f.click('.create-submit');
        await until(() => !f.qa.vm.saving, 'retry creation');
        assert.equal(f.qa.calls.save, 2);
        assert.equal(f.qa.vm.addOdontograma, false);
        noWarnings(f);
        console.log('PASS failed save: error preserves dialog/selection; reload checks state before allowing a second creation.');
    } finally { f.close(); }

    f = fixture('refresh-error');
    try {
        await loaded(f); await select(f);
        f.click('.create-submit');
        await until(() => !f.qa.vm.saving, 'persisted creation with failed detail refresh');
        assert.equal(f.qa.vm.addOdontograma, false, 'Persisted creation never leaves a retryable create dialog');
        assert.equal(f.qa.calls.save, 1);
        assert.equal(f.qa.vm.id_odontogram, 'qa-odontogram');
        assert.match(f.qa.vm.loadError, /se creó/);
        f.qa.scenario = 'empty';
        await f.qa.vm.init();
        assert.equal(f.qa.vm.loadError, '');
        assert.equal(f.qa.vm.odontogram.length, 1);
        assert.equal(f.qa.calls.save, 1, 'Refreshing an existing persisted record never creates again');
        noWarnings(f);
        console.log('PASS persisted create/refresh failure: closes modal, preserves ID, reloads detail without duplicate write.');
    } finally { f.close(); }

    f = fixture();
    try {
        await loaded(f); await select(f, 1);
        f.qa.service.save = async payload => {
            f.qa.calls.save++;
            f.qa.saved = true;
            f.qa.savedType = payload.type;
            throw Error('Transport interrupted after persistence');
        };
        f.click('.create-submit');
        await until(() => !f.qa.vm.saving, 'transport interruption');
        await f.window.Vue.nextTick();
        assert.equal(f.qa.vm.addOdontograma, true);
        assert.equal(f.qa.vm.createNeedsReload, true);
        assert.match(f.query('.create-submit').textContent, /Volver a cargar/);
        await f.qa.vm.onSaveParent('2');
        assert.equal(f.qa.calls.save, 1);
        f.click('.create-submit');
        await loaded(f);
        assert.equal(f.qa.vm.id_odontogram, 'qa-odontogram');
        assert.equal(f.qa.vm.addOdontograma, false, 'Reload discovers a persisted record after a lost response');
        assert.equal(f.qa.calls.save, 1, 'A lost save response never duplicates the persisted record');
        noWarnings(f);
        console.log('PASS interrupted response: keeps dialog, checks persisted state, discovers saved record without duplicate creation.');
    } finally { f.close(); }

    f = fixture('existing');
    try {
        await loaded(f);
        let resolveStatus, writes = 0, payload;
        const pendingStatus = new Promise(resolve => { resolveStatus = resolve; });
        f.qa.service.status = data => { writes++; payload = data; return pendingStatus; };
        f.qa.service.validateOdontogram = async () => ({ success: true, data: { id_odontogramv1: null, active: false, type: '' } });
        f.qa.vm.isChangeActive = true;
        const finishing = f.qa.vm.onChangeActive('qa-odontogram', true);
        await f.window.Vue.nextTick();
        assert.equal(f.qa.vm.saving, true);
        assert.equal(f.qa.vm.isChangeActive, true, 'Finalization confirmation remains open while saving');
        assert.equal(f.query('[aria-label="Crear odontograma"]').disabled, true);
        assert.equal(f.query('[aria-label="Ver historial de odontogramas"]').disabled, true);
        assert.equal(await f.qa.sectionGuard(), false, 'Section navigation waits for finalization');
        let routeResult;
        f.qa.routeGuards[0]({}, {}, result => { routeResult = result; });
        assert.equal(routeResult, false, 'Route navigation waits for finalization');
        await f.qa.vm.onChangeActive('qa-odontogram', true);
        await f.qa.vm.onChangeActive('qa-odontogram', false);
        assert.equal(writes, 1, 'Repeated confirm/cancel cannot duplicate or dismiss a pending finalization');
        assert.equal(f.qa.vm.isChangeActive, true);
        assert.equal(payload.id_odontogramv1, 'qa-odontogram');
        assert.equal(payload.active, false);
        resolveStatus({ success: true, data: {} });
        await finishing;
        assert.equal(f.qa.vm.saving, false);
        assert.equal(f.qa.vm.isChangeActive, false);
        assert.equal(f.qa.vm.id_odontogram, null);
        assert.equal(f.qa.vm.addOdontograma, false, 'Finalizing does not automatically start creating a replacement');
        assert.match(f.qa.vm.feedback, /finalizado correctamente/);
        assert.equal(await f.qa.sectionGuard(), true);
        f.qa.vm.isChangeActive = true;
        await f.qa.vm.onChangeActive(null, false);
        assert.equal(f.qa.vm.isChangeActive, false);
        assert.equal(writes, 1, 'Cancel never changes odontogram status');
        noWarnings(f);
        console.log('PASS finalization: waits for write/refresh, keeps confirmation open, blocks competing actions/navigation, deduplicates requests, and shows saved success.');
    } finally { f.close(); }

    for (const failure of ['response', 'throw', 'refresh']) {
        f = fixture('existing');
        try {
            await loaded(f);
            f.qa.vm.isChangeActive = true;
            f.qa.service.status = async () => {
                if (failure === 'throw') throw Error('QA transport unavailable');
                return { success: failure !== 'response', message: 'QA denied', data: {} };
            };
            if (failure === 'refresh') f.qa.service.getHistory = async () => ({ success: false, message: 'QA history unavailable' });
            await f.qa.vm.onChangeActive('qa-odontogram', true);
            await f.window.Vue.nextTick();
            assert.equal(f.qa.vm.saving, false, 'Finalization always releases the pending lock');
            assert.equal(f.qa.vm.feedback, '', 'Failed writes/refreshes never announce full success');
            if (failure === 'refresh') {
                assert.equal(f.qa.vm.isChangeActive, false, 'Persisted finalization closes confirmation to prevent repeating the write');
                assert.match(f.qa.vm.loadError, /se guardó/);
                assert.ok([...f.window.document.querySelectorAll('[role="alert"]')].some(element => /se guardó/.test(element.textContent)), 'Refresh recovery is visible in the rendered parent');
            } else {
                assert.equal(f.qa.vm.isChangeActive, true, 'Failed/unconfirmed finalization retains confirmation');
                assert.ok(f.qa.vm.operationError);
                assert.equal(f.qa.vm.loadError, '');
            }
            assert.equal(await f.qa.sectionGuard(), true);
            noWarnings(f);
        } finally { f.close(); }
    }
    console.log('PASS finalization failures: returned/thrown errors retain dialog; persisted write with failed refresh closes confirmation and offers recovery.');

    f = fixture('existing');
    try {
        await loaded(f);
        f.qa.vm.sectionBusy = true;
        assert.equal(await f.qa.sectionGuard(), false, 'Diagnosis/history busy events block section navigation');
        let routeResult;
        f.qa.routeGuards[0]({}, {}, result => { routeResult = result; });
        assert.equal(routeResult, false, 'Diagnosis/history busy events block route navigation');
        f.qa.vm.sectionBusy = false;
        f.qa.vm.openOdontogramTreatment = true;
        f.qa.vm.onDiagnosisSaved({ refreshSuccess: false });
        await f.window.Vue.nextTick();
        assert.equal(f.qa.vm.openOdontogramTreatment, false);
        assert.match(f.qa.vm.loadError, /diagnóstico se guardó/);
        assert.equal(f.qa.vm.feedback, '', 'Diagnosis refresh failure must not appear as ordinary save success');
        noWarnings(f);
        console.log('PASS parent recovery: child busy state protects navigation and persisted diagnosis with failed refresh closes editor and exposes retry.');
    } finally { f.close(); }

    // Exercise parent -> real editor/history -> real Vuex with isolated full dentitions.
    // This verifies the same complete fixture used for responsive visual review.
    f = fixture('existing', { includeEditors: true });
    try {
        await loaded(f);
        assert.equal(f.qa.live, false, 'Full editor preview remains independent of the live API');
        assert.equal(f.qa.vm.odontogram.length, 32);
        const selected = f.qa.vm.odontogram[0];
        f.click('.odontogram-edit-button');
        await until(() => Boolean(f.query('.editor-field textarea')), 'real diagnosis editor open');
        const diagnosis = 'Diagnóstico persistente en la vista de prueba';
        const input = f.query('.editor-field textarea');
        input.value = diagnosis;
        input.dispatchEvent(new f.window.Event('input', { bubbles: true }));
        await f.window.Vue.nextTick();
        f.click('.editor-submit');
        await until(() => !f.qa.vm.openOdontogramTreatment, 'real diagnosis saves and closes');
        assert.equal(f.qa.calls.detailSave, 1);
        assert.equal(f.qa.vm.odontogram.find(tooth => tooth.id_tooth === selected.id_tooth).treatment, diagnosis);
        assert.match(f.query('.odontogram-table').textContent, /Diagnóstico persistente/);
        const search = f.query('.odontogram-search input');
        search.value = diagnosis; search.dispatchEvent(new f.window.Event('input', { bubbles: true }));
        await f.window.Vue.nextTick();
        assert.equal(f.query('.odontogram-table tbody').querySelectorAll('tr').length, 1, 'Search finds persisted diagnosis');
        search.value = ''; search.dispatchEvent(new f.window.Event('input', { bubbles: true }));
        await f.window.Vue.nextTick();
        f.click('[aria-label="Ver historial de odontogramas"]');
        await until(() => f.window.document.querySelectorAll('.history-record').length === 2, 'real history records load');
        const activation = [...f.window.document.querySelectorAll('.record-status-action')].find(button => /Activar/.test(button.textContent));
        assert.ok(activation); activation.click(); await f.window.Vue.nextTick();
        assert.equal(f.qa.calls.status, 0, 'History state change waits for confirmation');
        f.click('[role="dialog"][aria-label="Activar odontograma"] .confirm-button--primary');
        await until(() => f.qa.vm.id_odontogram === 'qa-previous' && !f.qa.vm.sectionBusy, 'history activation refreshes parent');
        assert.equal(f.qa.vm.odontogram.length, 20, 'Primary dentition replaces permanent teeth after activation');
        assert.equal(f.qa.records.filter(record => record.active).length, 1);
        assert.equal(f.qa.calls.status, 1);
        assert.equal(f.qa.vm.isOpenHistory, false);
        f.click('[aria-label="Ver historial de odontogramas"]');
        await f.window.Vue.nextTick();
        await until(() => f.window.document.querySelectorAll('.history-record').length === 2, 'reopen real history');
        const previousRecord = [...f.window.document.querySelectorAll('.history-record')].find(record => /Permanente/.test(record.textContent));
        assert.ok(previousRecord); previousRecord.querySelector('.record-delete').click(); await f.window.Vue.nextTick();
        f.click('[role="dialog"][aria-label="Eliminar odontograma"] .confirm-button--primary');
        await until(() => f.qa.records.length === 1 && !f.qa.vm.sectionBusy, 'history deletion refreshes without changing active odontogram');
        assert.equal(f.qa.calls.delete, 1);
        assert.equal(f.qa.vm.id_odontogram, 'qa-previous');
        assert.equal(f.qa.vm.odontogram.length, 20);
        noWarnings(f);
        console.log('PASS full module integration: 32 permanent/20 primary teeth, real editor save and search, history confirmation/activation refresh, one active record, and delete retaining the active dentition.');
    } finally { f.close(); }

    // The reusable child also handles catalogs with a single supported type.
    f = fixture('existing');
    try {
        await loaded(f);
        const Child = f.qa.require(childId).default;
        const component = new f.window.Vue({
            vuetify: new f.window.Vuetify({}),
            render: h => h('v-app', [h(Child, { ref: 'child', props: { value: true, types: [{ code: 'only', description: 'Mixta' }] } })])
        }).$mount();
        f.window.document.body.appendChild(component.$el);
        assert.equal(component.$refs.child.selectedType, 'only');
        assert.equal(component.$refs.child.typeDescription('Mixta'), 'Dientes temporales y permanentes.');
        component.$destroy();
        noWarnings(f);
        console.log('PASS single-option catalog: preselects the only available type and renders mixed-dentition guidance.');
    } finally { f.close(); }
    console.log('PASS all odontogram UI regressions. No real services, browser storage, authentication, or database writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
