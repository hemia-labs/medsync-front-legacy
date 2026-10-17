const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const Vuex = require('vuex');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const load = (file, bindings = {}, component = false) => {
  let source = component ? compiler.parseComponent(read(file)).script.content : read(file);
  source = source.replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export default', 'module.exports =');
  source = source.replace(/export\s*\{([^}]+)\};?\s*$/, 'module.exports = {$1};');
  const context = { module: { exports: {} }, ...bindings };
  vm.runInNewContext(source, context, { filename: file });
  return context.module.exports;
};
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const variables = new Map();
const palettes = [];
const document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {}, documentElement: {
  style: { setProperty: (key, value) => variables.set(key, value) },
  setAttribute: (key, value) => { if(key === 'data-theme') palettes.push(value); }
} };
const window = { addEventListener() {}, removeEventListener() {} };
const theme = load('src/plugins/theme.js', { Vue, document });
const makeTheme = (code, color) => ({ ...theme.DEFAULT_THEME, code, primary_700: color });
const saved = makeTheme('saved-violet', '#663399');
const gold = makeTheme('gold-preview', '#AA8800');
const green = makeTheme('new-green', '#008844');
const pink = makeTheme('latest-preview', '#992266');
const other = makeTheme('other-tenant', '#225599');
const success = value => ({ success: true, data: [value] });
const types = load('src/store/modules/common/mutation-types.js');
const ErrorModel = class { constructor(error = false, message = '') { this.error = error; this.message = message; } };
let getReply = success(saved), saveReply = success(saved), listReply = { success: true, data: [saved, gold] };
let getCalls = 0, saveCalls = 0;
const service = {
  getTheme: () => { getCalls += 1; return typeof getReply === 'function' ? getReply() : getReply; },
  saveTheme: () => { saveCalls += 1; return saveReply; },
  getThemeList: () => listReply
};
const actions = load('src/store/modules/configuration/actions.js', { DAConfigService: service, DAHasErrorModel: ErrorModel, types, ...theme });
const authHydration = deferred();
const authPayload = (tenant = 'A', authenticated = true) => ({ authenticated,
  user: authenticated ? { id_login: 'fixture', id_session: 's', id_business: tenant } : null,
  business: authenticated ? { id_business: tenant } : null, role: authenticated ? 'admin' : null });
const CORE = { namespaced: true, state: () => ({ currentAction: null }), modules: {
  AUTH: { namespaced: true, state: () => ({ ...authPayload(null, false), accessRevision: 0, permissions: [] }),
    mutations: { change(state, payload) { Object.assign(state, payload); state.accessRevision += 1; } },
    getters: { getAccessRevision: state => state.accessRevision },
    actions: { async getToken({ commit }) { await authHydration.promise; commit('change', authPayload()); }, refreshAccess: async () => ({ success: true }) }
  },
  CONFIGURATION: { namespaced: true, actions,
    state: load('src/store/modules/configuration/state.js', { DAHasErrorModel: ErrorModel }),
    mutations: load('src/store/modules/configuration/mutations.js', { types }),
    getters: load('src/store/modules/configuration/getters.js')
  }
} };
const store = load('src/store/index.js', { Vue, Vuex, CORE });
const appDefinition = load('src/App.vue', { ...theme, mapActions: Vuex.mapActions,
  fnTypes: { getToken: 'getToken' }, moduleTypes: { AUTH: 'CORE/AUTH', CONFIGURATION: 'CORE/CONFIGURATION' }, window, document }, true);
const app = new Vue({ ...appDefinition, store });
const dispatch = (action, payload) => store.dispatch('CORE/CONFIGURATION/' + action, payload);
const components = Object.fromEntries(['ProfessionalAgendaConfig', 'PrescriptionConfig', 'AdminSummary',
  'ClinicalHistoryTemplateConfig', 'RolesPermissionsConfig', 'DAProfessionalProfile'].map(name => [name, {}]));
const config = load('src/views/configuration/index.vue', { ...components, ...theme,
  mapActions: () => ({}), mapGetters: () => ({}), VuexMixin: {}, moduleTypes: {}, fnTypes: {} }, true);
const configView = new Vue({ store, data: () => ({ selectedThemeCode: theme.DEFAULT_THEME.code }),
  computed: { activeTheme: config.computed.activeTheme, themeList() { return store.state.CORE.CONFIGURATION.themeList; } },
  methods: { ensureSelectedTheme: config.methods.ensureSelectedTheme, onSelectTheme: config.methods.onSelectTheme },
  watch: { activeTheme: config.watch.activeTheme, themeList: config.watch.themeList }
});

(async () => {
  assert.equal(getCalls, 0, 'App must await auth hydration before requesting tenant theme');
  authHydration.resolve(); await tick();
  assert.equal(getCalls, 1); assert.equal(theme.themeState.currentTheme.code, saved.code);
  const appliedBeforeReset = palettes.length;
  store.commit('CORE/AUTH/change', { permissions: ['px.show'] }); await tick();
  assert.equal(theme.themeState.currentTheme.code, saved.code, 'S18 protected-state reset retains same-tenant palette');
  assert.equal(getCalls, 1, 'Same-tenant authorization refresh reuses palette');
  assert.equal(palettes.slice(appliedBeforeReset).includes('medical-blue'), false, 'Empty Vuex does not apply default');

  const beforeHydrationRace = getCalls;
  const earlierAccess = deferred(); let raceReads = 0;
  getReply = () => ++raceReads === 1 ? earlierAccess.promise : success(saved);
  store.commit('CORE/AUTH/change', authPayload('new-scope')); await tick();
  assert.equal(theme.themeState.loaded, false);
  store.commit('CORE/AUTH/change', { permissions: ['px.show', 'px.new'] }); await tick();
  assert.equal(getCalls, beforeHydrationRace + 1, 'Same-tenant access change joins pending read');
  earlierAccess.resolve({ success: false, status: 409, data: { code: 'AUTH_CONTEXT_CHANGED' } }); await tick();
  assert.equal(getCalls, beforeHydrationRace + 2, 'Discarded earlier authorization read is retried once');
  assert.equal(theme.themeState.loaded, true);
  assert.equal(theme.themeState.currentTheme.code, saved.code, 'Theme recovers without waiting for another focus');

  const oldRead = deferred(); getReply = oldRead.promise;
  const reading = dispatch('getTheme', { force: true });
  configView.onSelectTheme(gold);
  oldRead.resolve(success(saved)); await reading; await tick();
  assert.equal(theme.themeState.currentTheme.code, gold.code, 'Late GET cannot replace selected preview');
  await dispatch('getThemeList'); await tick();
  assert.equal(theme.themeState.currentTheme.code, gold.code, 'Catalog loading cannot apply fallback or replace preview');
  assert.equal(configView.selectedThemeCode, gold.code);

  saveReply = success(gold); await dispatch('saveTheme', { code: gold.code });
  const beforeSaveRead = deferred(); getReply = beforeSaveRead.promise;
  const readBeforeSave = dispatch('getTheme', { force: true });
  configView.onSelectTheme(green);
  const saving = deferred(); saveReply = saving.promise;
  const write = dispatch('saveTheme', { code: green.code });
  beforeSaveRead.resolve(success(gold)); await readBeforeSave;
  saving.resolve(success(green)); await write;
  assert.equal(theme.themeState.currentTheme.code, green.code, 'Saved palette beats GET started before save');
  assert.equal(theme.themeState.hasPreview, false);

  configView.onSelectTheme(gold); const earlierSave = deferred(); saveReply = earlierSave.promise;
  const earlierWriting = dispatch('saveTheme', { code: gold.code });
  configView.onSelectTheme(pink); earlierSave.resolve(success(gold)); await earlierWriting; await tick();
  assert.equal(theme.themeState.currentTheme.code, pink.code, 'Save response cannot overwrite a newer preview');
  assert.equal(theme.themeState.hasPreview, true);

  // Finish the preview, then force a tenant switch while its read is pending.
  saveReply = success(pink); await dispatch('saveTheme', { code: pink.code });
  const foreign = deferred(); getReply = foreign.promise; const foreignRead = dispatch('getTheme', { force: true });
  getReply = success(other); store.commit('CORE/AUTH/change', authPayload('B')); await tick();
  assert.equal(theme.themeState.currentTheme.code, other.code);
  foreign.resolve(success(saved)); await foreignRead;
  assert.equal(theme.themeState.currentTheme.code, other.code, 'Previous tenant response is ignored');

  const expiry = { success: false, status: 401, data: { code: 'AUTH_ACCESS_EXPIRED' } };
  let attempt = 0; getReply = () => ++attempt === 1 ? expiry : success(other);
  await dispatch('getTheme', { force: true }); assert.equal(attempt, 2, 'One read retry after interceptor renewal');
  getReply = expiry; const beforeFailedRetry = getCalls;
  await dispatch('getTheme', { force: true });
  assert.equal(getCalls - beforeFailedRetry, 2, 'Expired retry is bounded');
  assert.equal(theme.themeState.currentTheme.code, other.code, 'Transient failure retains last palette');
  assert.equal(theme.themeState.loadError, true);
  getReply = success(other); app.lastAccessCheck = 0; await app.recheckAccess();
  assert.equal(theme.themeState.loadError, false, 'Return to focus can recover theme loading');

  const late = deferred(); getReply = late.promise; const lateRead = dispatch('getTheme', { force: true });
  const beforeLogout = getCalls; store.commit('CORE/AUTH/change', authPayload(null, false)); await tick();
  assert.equal(theme.themeState.currentTheme.code, theme.DEFAULT_THEME.code, 'Logout resets palette explicitly');
  assert.equal(getCalls, beforeLogout, 'Logout does not fetch theme with closing-session cookies');
  late.resolve(success(other)); await lateRead;
  assert.equal(theme.themeState.currentTheme.code, theme.DEFAULT_THEME.code, 'Late tenant read cannot undo logout reset');
  await dispatch('getTheme', { force: true }); assert.equal(getCalls, beforeLogout, 'Destroyed config cannot fetch anonymous theme');
  getReply = success(saved); store.commit('CORE/AUTH/change', authPayload()); await tick();
  assert.equal(theme.themeState.currentTheme.code, saved.code, 'Login reloads the new authenticated tenant palette');
  assert.equal(saveCalls, 4);
  assert.equal(config.computed.themePrimaryColor(), 'var(--color-primary-700)');
  assert.deepEqual(compiler.compile(compiler.parseComponent(read('src/App.vue')).template.content).errors, []);
  configView.$destroy(); app.$destroy();
  console.log('PASS theme: actual Vue/Vuex/App/config methods, hydration order, S18 reset, preview/save/catalog races, tenant/logout isolation, bounded expired-access retry and focus recovery. No DB/browser.');
})().catch(error => { console.error(error); process.exitCode = 1; });
