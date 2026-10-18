// Real settings guard/profile methods with local services; no browser, server or DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const importSource = file => import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`);
const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; };
(async () => {
    const navigation = await importSource('src/domain/settings/settings.navigation.js');
    const handlers = new Map();
    global.window = { addEventListener: (name, handler) => handlers.set(name, handler), removeEventListener: (name, handler) => { if(handlers.get(name) === handler) handlers.delete(name); } };
    let guard, removed = 0, dirty = true, saving = false, prompts = 0, discarded = 0, answer = false;
    const view = { $store: { state: { CORE: { AUTH: { authenticated: true, user: { id_login: 'qa' } } } } },
        $router: { beforeEach(fn) { guard = fn; return () => removed++; } },
        $swal: { async fire(options) { prompts++; assert.equal(options.cancelButtonText, 'Seguir editando'); return { isConfirmed: answer }; } } };
    const cleanup = navigation.registerSettingsNavigationGuard(view, { hasChanges: () => dirty, isSaving: () => saving, onDiscard: () => discarded++ });
    const route = async path => { let result = 'not-called'; await guard({ path }, {}, value => { result = value === undefined ? 'allowed' : value; }); return result; };
    assert.equal(await route('/admin'), false); assert.equal(discarded, 0);
    answer = true; assert.equal(await route('/admin'), 'allowed'); assert.equal(discarded, 1);
    saving = true; const beforeSaving = prompts; assert.equal(await route('/inicio'), false); assert.equal(prompts, beforeSaving);
    assert.equal(await route('/auth/login'), false, 'An active session cannot silently discard via login');
    view.$store.state.CORE.AUTH = { authenticated: false, user: null };
    assert.equal(await route('/auth/login'), 'allowed', 'Expired/cleared sessions can reach login even if a save was pending');
    let prevented = false; const event = { preventDefault() { prevented = true; } };
    handlers.get('beforeunload')(event); assert.equal(prevented, true); assert.equal(event.returnValue, '');
    dirty = false; saving = false; prevented = false; handlers.get('beforeunload')({ preventDefault() { prevented = true; } }); assert.equal(prevented, false);
    cleanup(); cleanup(); assert.equal(removed, 1); assert.equal(handlers.size, 0);
    const pending = deferred(); prompts = 0;
    const deduped = { $swal: { fire() { prompts++; return pending.promise; } } };
    const firstPrompt = navigation.confirmSettingsDiscard(deduped), secondPrompt = navigation.confirmSettingsDiscard(deduped);
    assert.equal(prompts, 1); pending.resolve({ isConfirmed: true }); assert.equal(await firstPrompt, true); assert.equal(await secondPrompt, true);
    assert.equal(await navigation.confirmSettingsDiscard({ $swal: { fire: async () => { throw new Error('unavailable'); } } }), false);
    delete global.window;

    let readResult = { success: true, data: null }, saveResult = null, saveCalls = 0, guardCalls = 0, cleanupCalls = 0, lastPayload;
    const service = { getProfessionalProfile: async () => readResult, saveProfessionalProfile: (_id, payload) => { saveCalls++; lastPayload = payload; assert.notEqual(payload, profile.form, 'The request owns a snapshot, not the mutable form'); return saveResult; } };
    const sfc = compiler.parseComponent(read('src/views/User/components/DAProfessionalProfile.vue'));
    assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
    const context = { component: null, mapGetters: () => ({}), moduleTypes: { AUTH: {} }, fnTypes: {}, getSettingsSections: () => [], DAUserService: service,
        buildLicenseLimitMessage: (_response, fallback) => fallback, confirmSettingsDiscard: async () => false,
        registerSettingsNavigationGuard: () => { guardCalls++; return () => cleanupCalls++; } };
    vm.runInNewContext(sfc.script.content.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'component ='), context);
    const options = context.component, events = [];
    const profile = { ...options.data(), idLogin: 'qa-profile-user', adminControlsOnly: false, $emit: (...values) => events.push(values), $refs: {}, $nextTick: fn => fn() };
    Object.entries(options.methods).forEach(([key, method]) => profile[key] = method.bind(profile));
    Object.entries(options.computed).forEach(([key, getter]) => Object.defineProperty(profile, key, { get: () => getter.call(profile) }));
    await profile.load(); assert.equal(profile.hasUnsavedChanges, false); assert.equal(profile.form.can_issue_prescriptions, false);
    options.mounted.call(profile); assert.equal(guardCalls, 1);
    profile.form.professional_name = 'Nombre enviado'; assert.equal(profile.hasUnsavedChanges, true);
    const save = deferred(); saveResult = save.promise; const inFlight = profile.save();
    assert.equal(profile.saving, true); await profile.save(); assert.equal(saveCalls, 1);
    // An input event queued before controls disabled must also survive a late response.
    profile.form.professional_name = 'Edición posterior';
    save.resolve({ success: true, data: { id_doctor_professional_profile: 'qa-profile', professional_name: 'Nombre enviado', can_issue_prescriptions: 0, can_sign_documents: 0, is_active: 1 } });
    await inFlight; assert.equal(profile.form.professional_name, 'Edición posterior'); assert.equal(profile.hasUnsavedChanges, true); assert.equal(profile.saving, false);
    profile.discardChanges(); assert.equal(profile.form.professional_name, 'Nombre enviado'); assert.equal(profile.hasUnsavedChanges, false);
    profile.form.professional_name = 'Pendiente por fallo'; saveResult = { success: false, message: 'No se pudo guardar.' };
    await profile.save(); assert.equal(profile.form.professional_name, 'Pendiente por fallo'); assert.equal(profile.hasUnsavedChanges, true); assert.match(profile.saveError, /No se pudo guardar/);
    let focusedPhone = 0; profile.$refs.professionalPhone = { focus() { focusedPhone++; } };
    for(const invalidPhone of ['abc123', '123456789', '1234567890123456', '5512345678 ext 2', 5512345678]) {
        profile.form.professional_phone = invalidPhone;
        const before = saveCalls; await profile.save();
        assert.equal(saveCalls, before, 'Invalid professional phone never reaches API');
        assert.match(profile.professionalPhoneError, /10 a 15/);
        assert.equal(profile.form.professional_phone, invalidPhone, 'Rejected capture remains editable');
    }
    assert.equal(focusedPhone, 5);
    for(const [input, normalized] of [['', ''], ['   ', ''], ['0012345678', '0012345678'], ['+52 (55) 1234-5678', '+525512345678'], ['+001 (234) 567-8901', '+0012345678901']]) {
        profile.form.professional_phone = input;
        saveResult = { success: true, data: { ...profile.form, professional_phone: normalized, id_doctor_professional_profile: 'qa-profile' } };
        await profile.save(); assert.equal(lastPayload.professional_phone, normalized);
        assert.equal(profile.form.professional_phone, normalized); assert.equal(profile.professionalPhoneError, '');
    }
    profile.form.professional_phone = '5512345678';
    saveResult = { success: false, message: 'Revisa el teléfono profesional.', data: { fieldErrors: { professional_phone: 'Teléfono rechazado por la API.' } } };
    await profile.save(); assert.equal(profile.professionalPhoneError, 'Teléfono rechazado por la API.'); assert.equal(profile.form.professional_phone, '5512345678');
    profile.adminControlsOnly = true; profile.form.professional_phone = 'dato histórico';
    await profile.save(); assert.deepEqual(Object.keys(lastPayload).sort(), ['can_issue_prescriptions', 'can_sign_documents', 'is_active'], 'Authorization-only edits omit hidden identity, phone and signature');
    profile.adminControlsOnly = false;
    profile.form.signature_image = 'firma previa'; profile.saving = true; profile.onSigned('firma tardía'); assert.equal(profile.form.signature_image, 'firma previa'); profile.saving = false;
    profile.discardChanges(); profile.signaturePadVisible = true; assert.equal(profile.hasUnsavedChanges, true);
    const beforeSignatureSave = saveCalls; await profile.save(); assert.equal(saveCalls, beforeSignatureSave); assert.match(profile.saveError, /Aplica la firma/); profile.signaturePadVisible = false;
    const embedded = { adminControlsOnly: true }; options.mounted.call(embedded); assert.equal(guardCalls, 1, 'Embedded authorization editor delegates its guard to the parent');
    options.beforeDestroy.call(profile); assert.equal(cleanupCalls, 1);
    const editable = (sfc.template.content.match(/<v-(?:text-field|checkbox)[\s\S]*?>/g) || []);
    assert.equal(editable.length, 9); assert.ok(editable.every(tag => tag.includes(':disabled="saving"')), 'All profile identity/authorization inputs disable during saving');
    console.log('PASS UX12 settings/profile: navigation guards, snapshots, preserved capture, optional professional phone validation/normalization/API errors, authorization-only payload and disabled inputs. No network or database.');
})().catch(error => { console.error(error); process.exitCode = 1; });
