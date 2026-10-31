import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify';
import router from './router';
import store from './store';
import '@mdi/font/css/materialdesignicons.css'
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import VueSession from 'vue-session';
import '@/libs/filters';
import '@/libs/directive';
import VueSignature from 'vue-signature-pad';
import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import './assets/sweetalert.css';
import registerGlobalComponents from './plugins/global-components';
import Analytics from './plugins/analytics';

import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'

Vue.use(VueViewer)
var options = {
  persist: true
}
Vue.use(VueSignature)
Vue.use(VueSession, options)
Vue.use(VueSweetalert2, { buttonsStyling: false });
library.add(fas);

Vue.config.productionTip = false

registerGlobalComponents(Vue);
Vue.use(Analytics, { store });

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount('#app')
