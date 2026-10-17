const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const Vuex = require('vuex');

Vue.use(Vuex);

const load = (relativePath, bindings = {}) => {
    const filename = path.join(__dirname, '../../src', relativePath);
    const source = fs.readFileSync(filename, 'utf8')
        .replace(/^import .+ from .+;?\r?$/gm, '')
        .replace('export default', 'module.exports =');
    const context = { module: { exports: {} }, ...bindings };
    vm.runInNewContext(source, context, { filename });
    return context.module.exports;
};

const types = load('store/modules/common/mutation-types.js');
const fnTypes = load('store/modules/common/fn-types.js');
const DAToothConditionModel = load('models/odontogram/DAToothCondition.model.js');
const DAToothConfigModel = load('models/odontogram/DAToothConfig.model.js', { DAToothConditionModel });
const DAToothModel = load('models/odontogram/DATooth.model.js', { DAToothConfigModel });
const DAOdontogramDetailModel = load('models/odontogram/DAOdontogramDetail.model.js');
const models = { DAToothConfigModel, DAToothModel, DAOdontogramDetailModel };
const state = load('store/modules/odontogram/state.js', models);
const mutations = load('store/modules/odontogram/mutations.js', { types, ...models });
const ok = data => ({ success: true, data });
const noOdontogram = () => ok({ id_odontogramv1: null, type: 'C4CA42', active: 0 });
const active = id => ok({ id_odontogramv1: `odontogram-${id}`, type: 'PERMANENT', active: 1 });
const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));
const fresh = (overrides = {}) => {
    const service = {
        getTypeTooth: async () => ok([{ code: 'PERMANENT', description: 'Permanente' }]),
        validateOdontogram: async () => noOdontogram(),
        getOdontogramDetail: async () => ok([]),
        save: async data => ok({ id_odontogramv1: 'new-odontogram', id_person: data.id_person, type: data.type }),
        saveDetail: async data => ok(data),
        status: async data => ok(data),
        delete: async data => ok(data),
        getHistory: async () => ok([]),
        ...overrides
    };
    const actions = load('store/modules/odontogram/actions.js', { types, fnTypes, ...models, DAOdontogramService: service });
    const store = new Vuex.Store({ modules: { odontogram: { namespaced: true, state, mutations, actions } } });
    return { service, store, data: store.state.odontogram, dispatch: (action, payload) => store.dispatch(`odontogram/${action}`, payload) };
};

(async () => {
    // Initializing a different patient clears every patient-specific value synchronously.
    const validation = deferred();
    const missing = fresh({ validateOdontogram: () => validation.promise });
    Object.assign(missing.data, {
        id_odontogram: 'previous', codetypetooth: 'OLD', odontogram: [{ treatment: 'Previous patient' }],
        history: [{ id_odontogramv1: 'previous' }], tooth: { id_person: 'previous' },
        odontogramDetail: { treatment: 'Previous diagnosis' }, odontogramEdit: { id_odontogramv1: 'previous' },
        odontogramPreview: { treatment: 'Previous preview' }, hasError: true
    });
    let initialized = false;
    const initialization = missing.dispatch('initOdontogram', { id: 'patient-a' }).then(response => { initialized = true; return response; });
    assert.equal(missing.data.id_odontogram, null);
    assert.equal(missing.data.odontogram.length, 0);
    assert.equal(missing.data.history.length, 0);
    assert.equal(missing.data.tooth.id_person, '');
    assert.equal(missing.data.odontogramDetail.treatment, '');
    assert.equal(Object.keys(missing.data.odontogramEdit).length, 0);
    assert.equal(missing.data.odontogramPreview.treatment, '');
    assert.equal(missing.data.hasError, false);
    await tick();
    assert.equal(initialized, false, 'Initialization remains pending until patient validation finishes');
    validation.resolve(noOdontogram());
    assert.equal((await initialization).success, true);
    assert.equal(missing.data.id_odontogram, null);
    assert.equal(missing.data.typeTooth.length, 1);

    // Existing charts finish loading their teeth before init can report success.
    const teeth = deferred();
    const existing = fresh({ validateOdontogram: async id => active(id), getOdontogramDetail: () => teeth.promise });
    let loaded = false;
    const loading = existing.dispatch('initOdontogram', { id: 'patient-a' }).then(response => { loaded = true; return response; });
    await tick();
    assert.equal(loaded, false, 'Init must await the detail request');
    const unsortedTeeth = [{ sec: 11 }, { sec: 28 }, { sec: 21 }];
    teeth.resolve(ok(unsortedTeeth));
    assert.equal((await loading).success, true);
    assert.equal(existing.data.id_odontogram, 'odontogram-patient-a');
    assert.equal(existing.data.odontogram.map(tooth => tooth.sec).join(','), '28,21,11');
    assert.equal(unsortedTeeth.map(tooth => tooth.sec).join(','), '11,28,21', 'Sorting must not mutate the service response');

    // Network/catalog failures remain errors rather than an absent chart.
    const failure = { success: false, message: 'QA denied' };
    const denied = fresh({ validateOdontogram: async () => failure });
    const deniedResponse = await denied.dispatch('initOdontogram', { id: 'patient-a' });
    assert.equal(deniedResponse.success, false);
    assert.equal(deniedResponse.message, failure.message);
    assert.equal(denied.data.hasError, true);
    const badDetail = fresh({ validateOdontogram: async id => active(id), getOdontogramDetail: async () => failure });
    assert.equal((await badDetail.dispatch('initOdontogram', { id: 'patient-a' })).success, false);
    assert.equal(badDetail.data.odontogram.length, 0);
    const badCatalog = fresh({ getTypeTooth: async () => failure });
    const catalogResponse = await badCatalog.dispatch('initOdontogram', { id: 'patient-a' });
    assert.equal(catalogResponse.success, false);
    assert.equal(catalogResponse.message, failure.message);
    const malformed = fresh({ validateOdontogram: async () => ok(undefined) });
    assert.equal((await malformed.dispatch('initOdontogram', { id: 'patient-a' })).success, false);

    // A save returns the server result only after the created chart has loaded.
    const createdTeeth = deferred();
    let saves = 0;
    const saved = fresh({
        getOdontogramDetail: () => createdTeeth.promise,
        save: async data => { saves++; return ok({ id_odontogramv1: 'created', id_person: data.id_person, type: data.type }); }
    });
    await saved.dispatch('initOdontogram', { id: 'patient-a' });
    let finishedSaving = false;
    const saving = saved.dispatch('save', { id_person: 'patient-a', type: 'PERMANENT' }).then(response => { finishedSaving = true; return response; });
    await tick();
    assert.equal(finishedSaving, false);
    assert.equal(saved.data.id_odontogram, 'created');
    createdTeeth.resolve(ok([{ sec: 28 }]));
    const saveResponse = await saving;
    assert.equal(saveResponse.success, true);
    assert.equal(saveResponse.refreshSuccess, true);
    assert.equal(saved.data.odontogram.length, 1);
    assert.equal(saves, 1);
    saved.service.getOdontogramDetail = async () => failure;
    const refreshFailure = await saved.dispatch('save', { id_person: 'patient-a', type: 'PERMANENT' });
    assert.equal(refreshFailure.success, true, 'A failed refresh must not invite a second creation');
    assert.equal(refreshFailure.refreshSuccess, false);
    assert.equal(refreshFailure.refreshMessage, 'QA denied');
    assert.equal(saved.data.id_odontogram, 'created');
    assert.equal(saved.data.hasError, true);
    saved.service.getOdontogramDetail = async () => { throw new Error('QA refresh unavailable'); };
    const thrownRefresh = await saved.dispatch('save', { id_person: 'patient-a', type: 'PERMANENT' });
    assert.equal(thrownRefresh.success, true);
    assert.equal(thrownRefresh.refreshSuccess, false);
    saved.service.save = async () => failure;
    assert.equal(await saved.dispatch('save', { id_person: 'patient-a', type: 'PERMANENT' }), failure);

    // Diagnosis, finalization/history activation, and deletion must distinguish a
    // committed write from failed reads so the UI cannot invite duplicate writes.
    for (const operation of [
        { action: 'saveOdontograDetail', service: 'saveDetail', payload: { data: { id_tooth: 'tooth-a', treatment: 'Updated diagnosis' }, id_person: 'patient-a' }, history: false },
        { action: 'status', service: 'status', payload: { data: { id_odontogramv1: 'odontogram-patient-a', active: false }, id: 'patient-a' }, history: true },
        { action: 'delete', service: 'delete', payload: { data: { id_odontogramv1: 'odontogram-patient-a' }, id: 'patient-a' }, history: true }
    ]) {
        const mutation = deferred(), detail = deferred(), history = deferred();
        let refreshCalls = 0;
        const editing = fresh({ validateOdontogram: async id => active(id) });
        await editing.dispatch('initOdontogram', { id: 'patient-a' });
        editing.service[operation.service] = () => mutation.promise;
        editing.service.getOdontogramDetail = () => { refreshCalls++; return detail.promise; };
        editing.service.getHistory = () => history.promise;
        let resolved = false;
        const write = editing.dispatch(operation.action, operation.payload).then(response => { resolved = true; return response; });
        await tick();
        assert.equal(resolved, false, operation.action + ' waits for the write');
        assert.equal(refreshCalls, 0, operation.action + ' never refreshes before write confirmation');
        mutation.resolve(ok({ persisted: true }));
        await tick();
        assert.equal(resolved, false, operation.action + ' also waits for the detail refresh');
        detail.resolve(ok([{ sec: 28, treatment: 'Updated diagnosis' }]));
        await tick();
        if (operation.history) assert.equal(resolved, false, operation.action + ' waits for history as well');
        history.resolve(ok([{ id_odontogramv1: 'updated-history' }]));
        const response = await write;
        assert.equal(response.success, true);
        assert.equal(response.refreshSuccess, true);
        assert.equal(editing.data.odontogram[0].treatment, 'Updated diagnosis');
        if (operation.history) assert.equal(editing.data.history[0].id_odontogramv1, 'updated-history');

        for (const refreshFailure of operation.history ? ['detail', 'history', 'throw'] : ['detail', 'throw']) {
            const committed = fresh({ validateOdontogram: async id => active(id) });
            await committed.dispatch('initOdontogram', { id: 'patient-a' });
            committed.service.getOdontogramDetail = async () => refreshFailure === 'detail' ? failure : ok([]);
            committed.service.getHistory = async () => refreshFailure === 'history' ? failure : ok([]);
            if (refreshFailure === 'throw') committed.service.getOdontogramDetail = async () => { throw Error('QA read interrupted'); };
            const result = await committed.dispatch(operation.action, operation.payload);
            assert.equal(result.success, true, operation.action + ': failed refresh never changes committed write to failure');
            assert.equal(result.refreshSuccess, false, operation.action + ': exposes failed ' + refreshFailure + ' refresh');
        }

        const rejected = fresh({ validateOdontogram: async id => active(id) });
        await rejected.dispatch('initOdontogram', { id: 'patient-a' });
        let rejectedRefreshes = 0;
        rejected.service[operation.service] = async () => failure;
        rejected.service.getOdontogramDetail = async () => { rejectedRefreshes++; return ok([]); };
        rejected.service.getHistory = async () => { rejectedRefreshes++; return ok([]); };
        assert.equal(await rejected.dispatch(operation.action, operation.payload), failure);
        assert.equal(rejectedRefreshes, 0, operation.action + ': rejected write does not reload/erase existing data');
        rejected.service[operation.service] = async () => { throw Error('QA write interrupted'); };
        await assert.rejects(rejected.dispatch(operation.action, operation.payload), /QA write interrupted/);

        const previousWrite = deferred();
        const otherPatient = fresh({ [operation.service]: () => previousWrite.promise });
        await otherPatient.dispatch('initOdontogram', { id: 'patient-a' });
        const departedWrite = otherPatient.dispatch(operation.action, operation.payload);
        await otherPatient.dispatch('initOdontogram', { id: 'patient-b' });
        let staleRefreshes = 0;
        otherPatient.service.getOdontogramDetail = async () => { staleRefreshes++; return ok([{ sec: 28 }]); };
        otherPatient.service.getHistory = async () => { staleRefreshes++; return ok([{ id_odontogramv1: 'stale' }]); };
        previousWrite.resolve(ok({ persisted: true }));
        await departedWrite;
        assert.equal(staleRefreshes, 0, operation.action + ': departed patient mutation never starts a stale refresh');
        assert.equal(otherPatient.data.id_odontogram, null);
        assert.equal(otherPatient.data.odontogram.length, 0);
        assert.equal(otherPatient.data.history.length, 0);
    }
    console.log('PASS diagnosis/status/delete writes: await detail/history, distinguish persisted write from returned/thrown refresh failure, preserve rejected writes, and isolate departed patients.');

    // A slow validation from an earlier patient cannot replace the current chart.
    const oldValidation = deferred();
    const switched = fresh({
        validateOdontogram: id => id === 'patient-a' ? oldValidation.promise : Promise.resolve(active(id)),
        getOdontogramDetail: async id => ok([{ sec: 28, treatment: id }])
    });
    const oldVisit = switched.dispatch('initOdontogram', { id: 'patient-a' });
    await switched.dispatch('initOdontogram', { id: 'patient-b' });
    oldValidation.resolve(active('patient-a'));
    await oldVisit;
    assert.equal(switched.data.id_odontogram, 'odontogram-patient-b');
    assert.equal(switched.data.odontogram[0].treatment, 'patient-b');

    // The same patient can be reopened while a previous visit still has requests in flight.
    const oldTeeth = deferred();
    let detailCalls = 0;
    const reopened = fresh({
        validateOdontogram: async id => active(id),
        getOdontogramDetail: () => ++detailCalls === 1 ? oldTeeth.promise : Promise.resolve(ok([{ sec: 28, treatment: 'Current visit' }]))
    });
    const priorVisit = reopened.dispatch('initOdontogram', { id: 'patient-a' });
    await tick();
    await reopened.dispatch('initOdontogram', { id: 'patient-a' });
    oldTeeth.resolve(ok([{ sec: 28, treatment: 'Previous visit' }]));
    await priorVisit;
    assert.equal(reopened.data.odontogram[0].treatment, 'Current visit');

    // Saves and history from a departed patient must not leak into the next one.
    const pendingSave = deferred();
    const pendingHistory = deferred();
    const departed = fresh({ save: () => pendingSave.promise, getHistory: () => pendingHistory.promise });
    await departed.dispatch('initOdontogram', { id: 'patient-a' });
    const oldSave = departed.dispatch('save', { id_person: 'patient-a', type: 'PERMANENT' });
    const oldHistory = departed.dispatch('getOdontogramHistory', 'patient-a');
    await departed.dispatch('initOdontogram', { id: 'patient-b' });
    pendingSave.resolve(ok({ id_odontogramv1: 'old-created', type: 'PERMANENT' }));
    pendingHistory.resolve(ok([{ id_odontogramv1: 'old-history' }]));
    await Promise.all([oldSave, oldHistory]);
    assert.equal(departed.data.id_odontogram, null);
    assert.equal(departed.data.history.length, 0);
    assert.equal(departed.data.odontogram.length, 0);

    console.log('PASS odontogram flow: awaited initialization and save, absent/existing/error responses, persisted save with failed refresh, state reset, and stale validation/detail/save/history isolation. Real Vuex actions/state/mutations; mocked service, no database writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
