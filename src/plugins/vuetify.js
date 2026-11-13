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
// Vuetify components (color="primary", error states, date pickers) use the MedSync
// palette instead of Vuetify's default blue. theme.js keeps these in sync with tenant themes.
const theme = {
    themes: {
        light: {
            primary: '#1C7FA7',
            error: '#D64545',
            success: '#2FA36B',
            info: '#3B82C4'
        }
    }
};
const options = { lang: { locales: { es: spanishLocale }, current: 'es' }, theme }

export default new Vuetify(options);
