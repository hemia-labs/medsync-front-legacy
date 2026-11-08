import Vue from 'vue';
import Vuetify from 'vuetify';
import es from 'vuetify/lib/locale/es';
import 'vuetify/dist/vuetify.min.css'

Vue.use(Vuetify);

// Vuetify 2's Spanish bundle leaves these input/loading labels in English.
const spanishLocale = { ...es, loading: 'Cargando...', input: {
    ...es.input,
    clear: 'Limpiar {0}',
    prependAction: 'Acción inicial de {0}',
    appendAction: 'Acción final de {0}'
} };
const options = { lang: { locales: { es: spanishLocale }, current: 'es' } }

export default new Vuetify(options);
