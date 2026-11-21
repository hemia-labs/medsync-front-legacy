// Arnés NC3: monta el componente real EvolutionDrafts contra la API real de prueba (backend scripts/qa/nc3-visual-fixture.js).
// Solo datos sintéticos. Ver docs/normative-compliance/phases/PHASE_NC3_INTEGRIDAD_NOTAS_FIRMADAS_20261121.md.
import Vue from 'vue'
import VueRouter from 'vue-router'
import vuetify from '../../../src/plugins/vuetify'
import store from '../../../src/store'
import '@mdi/font/css/materialdesignicons.css'
import EvolutionDrafts from '../../../src/views/Patient/Sections/EvolutionDrafts.vue'
Vue.use(VueRouter)
const params = new URLSearchParams(location.search)
const api = params.get('api') || 'http://127.0.0.1:3009'
fetch(api + '/qa/state').then(r => r.json()).then(state => {
  Vue.prototype.$session = { get: key => (key === 'token' ? state.token : null) }
  const patient = state.patients[params.get('case') || 'integra'].patient
  new Vue({
    vuetify, store, router: new VueRouter({ routes: [{ path: '*', component: { render: h => h('span') } }] }),
    render: h => h('v-app', [h('main', { style: 'max-width:1100px;margin:12px auto;padding:0 12px' }, [
      h(EvolutionDrafts, { props: { patient, actor: 'doctor', canCreate: true, canCorrect: true, today: '2026-11-21', appointments: [], legacy: [] } })])])
  }).$mount('#app')
})
