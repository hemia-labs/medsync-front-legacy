/* Browser fixture: real agenda, return breadcrumb, router, Vuex and button components.
 * Patient clinical sections/session bootstrap are outside this isolated UI suite. */
window.mountCo25A3 = function(sources) {
  function load(file, bindings = {}) {
    let source = sources[file];
    const sfc = source.includes('<script>');
    if (sfc) source = source.split('<script>')[1].split('</script>')[0];
    const names = [...source.matchAll(/export (?:const|function|class) (\w+)/g)].map(m => m[1]);
    const isDefault = source.includes('export default');
    source = source.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\r?\n/gm, '').replace(/export (const|function|class)/g, '$1').replace('export default', 'const component =');
    const value = new Function(...Object.keys(bindings), source + '\nreturn ' + (isDefault ? 'component' : '{' + names.join(',') + '}'))(...Object.values(bindings));
    if (sfc) value.template = sources[file].slice(sources[file].indexOf('<template>') + 10, sources[file].lastIndexOf('</template>', sources[file].indexOf('<script>')));
    return value;
  }
  Vue.use(VueRouter); Vue.use(Vuex); Vue.use(Vuetify);
  const store = new Vuex.Store({ state: { CORE: { AUTH: { authenticated: true, accessRevision: 1, user: { id_login: 'qa-actor', id_business: 'qa-clinic', id_session: 'qa-session' }, permissions: ['px.dates', 'px.all'] } } }, mutations: {
    revoke(state) { state.CORE.AUTH.accessRevision++; state.CORE.AUTH.permissions = ['px.dates']; }
  } });
  const request = async (method, url, data) => { const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) }); return { ...await response.json(), success: response.ok }; };
  const DACore = Object.fromEntries(['get', 'post', 'delete'].map(method => [method, (url, data) => request(method.toUpperCase(), url, data)]));
  const service = load('DAAppointmentService.js', { DACore, DAC_APPOINTMENT_CONFIG_GET: '/api/appointment/config', DAC_APPOINTMENT_CONFIG_SAVE: '/api/appointment/config/save', DAC_APPOINTMENT_LIST: '/api/appointment/list', DAC_APPOINTMENT_PATIENT_HISTORY: id => '/api/appointment/patient/' + id + '/history', DAC_APPOINTMENT_SAVE: '/api/appointment/save', DAC_APPOINTMENT_DELETE: '/api/appointment/delete' });
  const patients = { getById: id => DACore.get('/api/qa-patient/' + id) };
  const storage = load('appointment.storage.js');
  const navigation = load('agendaNavigation.js', load('authorizationContext.js'));
  const bindings = { ...storage, ...load('availability.js', storage), ...load('agendaInteraction.js'), ...load('writePolicy.js'), ...navigation, VuexMixin: {}, ProfessionalAgendaConfig: {}, AgendaLinkPatient: {}, mapActions: () => ({}), mapGetters: () => ({}), moduleTypes: {}, fnTypes: {}, DAAppointmentService: service, DAPxService: patients, getSettingsSections: () => [], buildAppointmentWhatsAppMessage: () => '', buildWhatsAppUrl: () => '', openWhatsAppUrl: () => {} };
  const agenda = load('dates.vue', bindings);
  Object.assign(agenda.computed, { hasPermission: () => permission => store.state.CORE.AUTH.permissions.includes(permission), authUser: () => store.state.CORE.AUTH.user, role: () => 'assistant', allMonitorings: () => [] });
  const record = load('PatientShow.vue', { ...bindings, DAHistoryHeader: {}, DAAlergyAlert: {}, AllergyEditor: {}, PatientAdministrativeForm: {}, DASweetConfirm: {}, DocumentsAndSignatures: {}, DELETE: '', buildProfilePhotoPayload: () => ({}) });
  record.methods.init = function() { this.loadingPatient = false; };
  Object.assign(record.computed, { hasPermission: agenda.computed.hasPermission, patientReady: () => false, px: () => ({}), clinicalModules: () => ({}) });
  const mixins = { roundeable: load('roundeable.js', { Vue }), elevatable: load('elevatable.js', { Vue }) };
  for (const [tag, file] of [['da-button-primary', 'DAPrimaryButton.vue'], ['da-button-secondary', 'DASecondaryButton.vue'], ['da-button-900', 'DAPrimary900Button.vue']]) Vue.component(tag, load(file, mixins));
  const router = new VueRouter({ mode: 'history', routes: [
    { path: '/px/dates', name: 'Citas', component: agenda },
    { path: '/px/history/:id', name: 'ShowPx', props: true, component: record },
    { path: '*', redirect: '/px/dates' }
  ] });
  const root = new Vue({ store, router, vuetify: new Vuetify(), render: h => h('v-app', [h('router-view', { ref: 'screen' })]) }).$mount('#app');
  window.qa = { store, router, navigation };
  Object.defineProperty(window.qa, 'vm', { get: () => root.$refs.screen });
};
