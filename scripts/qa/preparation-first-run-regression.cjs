// First-run component state, permissions and request races. No browser, API or DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const importSource = file => import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`);
const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; };
const load = (file, context) => {
    const sfc = compiler.parseComponent(read(file));
    assert.deepEqual(compiler.compile(sfc.template.content).errors, [], `${file}: compiles`);
    vm.runInNewContext(sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
    return context.component;
};
const state = (options, extras) => {
    const view = { ...options.data(), ...extras };
    Object.entries(options.methods).forEach(([key, method]) => { view[key] = method.bind(view); });
    Object.entries(options.computed).forEach(([key, getter]) => Object.defineProperty(view, key, { get: () => getter.call(view) }));
    return view;
};
(async () => {
    const { getSettingsSections } = await importSource('src/security/settingsAccess.js');
    let calls = 0, response = null;
    const service = { getPreparation: () => { calls++; return typeof response === 'function' ? response() : response; } };
    const context = { component: null, mapGetters: () => ({}), moduleTypes: { AUTH: {} }, fnTypes: {}, DABusinessService: service, getSettingsSections, window: { removeEventListener: () => {} } };
    const options = load('src/views/configuration/components/PreparationChecklist.vue', context);
    let permissions = new Set(['documents.view']);
    const make = extras => state(options, { user: { id_login: 'qa-user', id_business: 'qa-tenant' }, role: 'admin', showCompleted: false, hasPermission: code => permissions.has(code), ...extras });
    const view = make();
    const payload = { success: true, data: { completed: 0, pending: 1, steps: [{ id: 'consent', title: 'Consentimiento', ready: false, action: { path: '/admin?section=documents', label: 'Completar' } }] } };
    response = payload;
    await view.load();
    assert.equal(view.status.steps[0].action, null, 'An API action cannot expose a forbidden settings section');
    assert.equal(view.nextStep.id, 'consent');
    permissions.add('documents.config'); await view.load();
    assert.equal(view.status.steps[0].action.path, '/admin?section=documents');

    const old = deferred(), current = deferred();
    response = () => old.promise; const oldLoad = view.load();
    view.user = { id_login: 'qa-new-user', id_business: 'qa-new-tenant' };
    response = () => current.promise; const newLoad = view.load();
    current.resolve({ success: true, data: { completed: 1, pending: 0, steps: [{ id: 'new', ready: true }] } }); await newLoad;
    old.resolve(payload); await oldLoad;
    assert.equal(view.status.steps[0].id, 'new', 'An older tenant response cannot replace the current checklist');
    assert.equal(view.loading, false);

    const signingOut = deferred(); response = () => signingOut.promise;
    const signedInLoad = view.load(); view.user = null; await view.load();
    signingOut.resolve(payload); await signedInLoad;
    assert.equal(view.status, null, 'Logout cancels an in-flight checklist response');
    const beforeSuper = calls; view.user = { id_login: 'qa-super' }; view.role = 'super_admin'; await view.load();
    assert.equal(calls, beforeSuper, 'Super admin does not query tenant preparation');
    const unmount = make(), late = deferred(); response = () => late.promise;
    const pending = unmount.load(); options.beforeDestroy.call(unmount);
    late.resolve(payload); await pending;
    assert.equal(unmount.status, null, 'Destroyed instances ignore late responses');

    response = { success: false }; const failed = make(); await failed.load();
    assert.match(failed.error, /Actualizar preparación/); assert.equal(failed.loading, false); assert.equal(failed.status, null);
    response = payload; await failed.load(); assert.equal(failed.error, ''); assert.ok(failed.status);

    // These rights change which prerequisites the API returns, even when no settings right changes.
    for(const code of ['documents.create', 'clinical_history.finalize']) {
        permissions = new Set(); const permissionView = make();
        const keyBefore = permissionView.sessionKey;
        permissions.add(code);
        assert.notEqual(permissionView.sessionKey, keyBefore, `${code}: grant/revoke must invalidate preparation`);
    }

    let profileResponse = { success: true, data: null }, saveResponse = null, saves = 0;
    const userService = { getProfessionalProfile: () => typeof profileResponse === 'function' ? profileResponse() : profileResponse,
        saveProfessionalProfile: () => { saves++; return saveResponse; } };
    const profileOptions = load('src/views/User/components/DAProfessionalProfile.vue', { component: null, mapGetters: () => ({}), moduleTypes: { AUTH: {} }, fnTypes: {}, getSettingsSections, DAUserService: userService, buildLicenseLimitMessage: (_response, fallback) => fallback });
    const events = [];
    const profile = state(profileOptions, { idLogin: 'qa-doctor', adminControlsOnly: false, showAdminControls: false, hideSaveButton: false, role: 'doctor', hasPermission: () => false, $emit: (...args) => events.push(args) });
    await profile.load();
    assert.equal(profile.hasProfile, false); assert.match(profile.professionalProfileLicenseMessage, /sin crear/);
    assert.equal(profile.form.can_issue_prescriptions, false); assert.equal(profile.form.can_sign_documents, false);
    assert.equal(profile.canManageAuthorizations, false, 'A professional cannot grant their own authorization');
    profileResponse = { success: false }; await profile.load(); await profile.save();
    assert.match(profile.loadError, /Reintenta/); assert.equal(saves, 0, 'A failed profile read cannot silently overwrite it');
    const firstRead = deferred(), secondRead = deferred();
    profileResponse = () => firstRead.promise; const readA = profile.load();
    profile.idLogin = 'qa-new-doctor'; profileResponse = () => secondRead.promise; const readB = profile.load();
    secondRead.resolve({ success: true, data: { id_doctor_professional_profile: 'qa-current', professional_name: 'Actual', is_active: 1, can_issue_prescriptions: 0, can_sign_documents: 0 } }); await readB;
    firstRead.resolve({ success: true, data: { id_doctor_professional_profile: 'qa-old', professional_name: 'Anterior' } }); await readA;
    assert.equal(profile.form.professional_name, 'Actual', 'The current profile wins over an older request');
    assert.equal(profile.hasProfile, true); assert.equal(profile.form.can_issue_prescriptions, false);
    profile.form.professional_name = 'Captura sin perder';
    const saving = deferred(); saveResponse = saving.promise;
    const firstSave = profile.save(); await profile.save(); assert.equal(saves, 1, 'Duplicate save clicks are blocked');
    saving.resolve({ success: false, message: 'Error de prueba' }); await firstSave;
    assert.equal(profile.saving, false); assert.equal(profile.form.professional_name, 'Captura sin perder');
    assert.equal(events[0][0], 'error');
    console.log('PASS first-run checklist/profile: scoped actions, old tenant/logout/unmount responses, super-admin exclusion, retry, permission invalidation, new-profile state, profile request races, duplicate saves and capture retention. Mocked services; no database writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
