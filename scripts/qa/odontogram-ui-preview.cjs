/*
 * Isolated UI fixture: real Vue 2/Vuetify, SFC templates, and odontogram Vuex module.
 * All clinical services are replaced before evaluation. No env, authentication,
 * browser storage, external requests, or real patient records are used.
 * Start: node scripts/qa/odontogram-ui-preview.cjs [port=4324]
 * Visual: / (1440/390 iframe controls), /preview?scenario=empty|existing|load-error|
 * catalog-error|save-error|refresh-error&theme=clinical-night
 * Complete in-memory editor/history preview: node scripts/qa/odontogram-ui-preview.cjs 4324 --editors
 * Includes 32 permanent/20 primary teeth and two synthetic history records.
 * Live module QA: node scripts/qa/odontogram-ui-preview.cjs 4324 --live
 * Requires the backend co15-odontogram-live.js --serve on loopback port 3019.
 * This mode uses real module editors/routes/SQL with an exclusively owned
 * synthetic fixture. The backend injects QA identity/CSRF, not a real login.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { compileStyle } = require('@vue/component-compiler-utils');

const repo = path.resolve(__dirname, '../..');
const parentId = 'src/views/Patient/Sections/Odontogram.vue';
const childId = 'src/views/Patient/Sections/components/OdontogramCreateDialog.vue';
const serviceId = 'src/services/context/core-proccess-context.js';
const excludedComponents = new Set([
    'src/core/components/form/dialog/components/DASweetConfirm.vue',
    'src/views/Patient/components/DAOdontogramTreatment.vue',
    'src/views/Patient/components/DAOdontogramHistory.vue'
]);

function resolveLocal(id, specifier) {
    if (!specifier.startsWith('.')) return specifier;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(id), specifier));
    const found = [base, base + '.js', base + '.vue', base + '/index.js']
        .find(candidate => fs.existsSync(path.join(repo, candidate)) && fs.statSync(path.join(repo, candidate)).isFile());
    if (!found) throw Error(`Cannot resolve ${specifier} from ${id}`);
    return found;
}

function buildModules(options = {}) {
    const modules = {};
    const styles = [];
    function add(id) {
        if (modules[id]) return;
        if (id === serviceId) {
            modules[id] = 'exports.DAOdontogramService = window.__odontogramQA.service;';
            return;
        }
        if (!options.includeEditors && excludedComponents.has(id)) {
            modules[id] = 'exports.__esModule = true; exports.default = { render: function(h) { return h("div"); } };';
            return;
        }
        let source = fs.readFileSync(path.join(repo, id), 'utf8');
        let template = null;
        let scopeId = null;
        if (id.endsWith('.vue')) {
            const descriptor = compiler.parseComponent(source);
            source = descriptor.script ? descriptor.script.content : 'export default {}';
            template = descriptor.template && compiler.compile(descriptor.template.content, { whitespace: 'condense' });
            if (template && template.errors.length) throw Error(`${id}: ${template.errors.join('; ')}`);
            scopeId = 'data-v-qa-' + crypto.createHash('sha256').update(id).digest('hex').slice(0, 8);
            descriptor.styles.forEach(style => {
                if (!style.content.trim()) return;
                const result = compileStyle({ source: style.content, filename: id, id: scopeId, scoped: !!style.scoped });
                if (result.errors.length) throw Error(`${id}: ${result.errors.join('; ')}`);
                styles.push(result.code);
            });
        }
        source = source.replace(/process\.env\.NODE_ENV/g, JSON.stringify(options.production ? 'production' : 'development'));
        source = source.replace(/import\(\/\*[^*]*\*\/\s*([^)]*)\)/g, 'Promise.resolve(require($1))');
        source = source.replace(/import\(([^)]+)\)/g, 'Promise.resolve(require($1))');
        let code = babel.transformSync(source, {
            filename: id, babelrc: false, configFile: false,
            plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')]
        }).code;
        const dependencies = [];
        code = code.replace(/require\(["']([^"']+)["']\)/g, (match, specifier) => {
            const resolved = resolveLocal(id, specifier);
            if (resolved.startsWith('src/')) dependencies.push(resolved);
            else if (!['vuex', 'vue', 'vuelidate', 'vuelidate/lib/validators'].includes(resolved)) throw Error(`Unmocked external dependency: ${resolved}`);
            return `require(${JSON.stringify(resolved)})`;
        });
        if (template) {
            code += '\nexports.default.render = new Function(' + JSON.stringify(template.render) + ');';
            code += '\nexports.default.staticRenderFns = [' + template.staticRenderFns.map(render => `new Function(${JSON.stringify(render)})`).join(',') + '];';
            code += '\nexports.default._scopeId = ' + JSON.stringify(scopeId) + ';';
        }
        modules[id] = code;
        dependencies.forEach(add);
    }
    [parentId, childId, 'src/store/modules/odontogram/index.js', 'src/plugins/theme.js',
        'src/core/components/form/dialog/DADialog.vue',
        'src/core/components/form/table/DADatatable.vue',
        'src/core/components/form/table/DAScopedColumn.vue',
        'src/core/components/form/header/DAHeaderTitle.vue',
        ...(options.includeEditors ? [
            'src/core/components/form/buttons/DAPrimaryButton.vue',
            'src/core/components/form/buttons/DASecondaryButton.vue',
            'src/core/components/form/buttons/DACancelButton.vue',
            'src/core/components/form/buttons/DAGrayButton.vue',
            'src/core/components/form/input/DATextAreaPrimary.vue'
        ] : [])].forEach(add);
    return { modules, styles: styles.join('\n') };
}

function fixtureBootstrap() {
    const Vue = window.Vue, Vuex = window.Vuex, Vuetify = window.Vuetify;
    Vue.use(Vuex); Vue.use(Vuetify);
    Vue.config.productionTip = false;
    Vue.config.devtools = false;
    const params = new URLSearchParams(window.location.search);
    const qa = window.__odontogramQA = {
        scenario: params.get('scenario') || 'empty',
        calls: { catalog: 0, validate: 0, detail: 0, save: 0, detailSave: 0, history: 0, status: 0, delete: 0 },
        payloads: [], delay: 60, saved: false, savedType: '1', notifications: [], routeGuards: []
    };
    qa.includeEditors = Boolean(window.__odontogramIncludeEditors);
    qa.live = Boolean(window.__odontogramLiveContext);
    qa.patient = qa.live ? window.__odontogramLiveContext.patient : { id_person: 'qa-patient', name: 'Paciente', surname: 'de prueba' };
    const ok = data => ({ success: true, data });
    const failed = message => ({ success: false, message });
    const wait = result => new Promise(resolve => setTimeout(() => resolve(result), qa.delay));
    const copy = value => JSON.parse(JSON.stringify(value));
    const makeTeeth = (recordId, type, withDiagnoses = false) => {
        const quadrants = type === '2' ? [5, 6, 7, 8] : [1, 2, 3, 4];
        const count = type === '2' ? 5 : 8;
        const diagnoses = {
            11: 'Restauración de resina en buen estado. Sin signos de filtración.',
            16: 'Caries oclusal. Se indica restauración y control de higiene.',
            26: 'Sensibilidad al frío. Vigilar evolución en la siguiente consulta.',
            36: 'Restauración de amalgama. Revisar contacto oclusal.',
            51: 'Sin lesiones visibles. Higiene adecuada.'
        };
        return quadrants.flatMap(quadrant => Array.from({ length: count }, (_, index) => {
            const sec = quadrant * 10 + index + 1;
            return { id_odontogram_detailv1: recordId + '-detail-' + sec, id_tooth: 'qa-tooth-' + sec,
                sec, treatment: withDiagnoses && diagnoses[sec] || '' };
        }));
    };
    const current = { id_odontogramv1: 'qa-odontogram', type: '1', description: 'Permanente',
        code: 'ODO-2026-0042', created_at: '2026-10-16', active: qa.scenario !== 'history' };
    const previous = { id_odontogramv1: 'qa-previous', type: '2', description: 'Temporal',
        code: 'ODO-2026-0018', created_at: '2026-08-20', active: false };
    const records = qa.records = qa.includeEditors && ['existing', 'history'].includes(qa.scenario) ? [current, previous] : [];
    let recordSequence = records.length;
    const details = qa.details = {
        'qa-odontogram': makeTeeth('qa-odontogram', '1', true),
        'qa-previous': makeTeeth('qa-previous', '2', true)
    };
    const activeRecord = () => records.find(record => record.active);
    qa.service = {
        getTypeTooth: () => {
            qa.calls.catalog++;
            return wait(qa.scenario === 'catalog-error' ? failed('No se pudo cargar el catálogo de prueba.') : ok([
                { code: '1', description: 'Permanente' }, { code: '2', description: 'Temporal' }
            ]));
        },
        validateOdontogram: () => {
            qa.calls.validate++;
            if (qa.scenario === 'load-error') return wait(failed('No se pudo consultar el odontograma de prueba.'));
            if (qa.includeEditors) return wait(ok(copy(activeRecord() || { id_odontogramv1: null, type: '', active: false })));
            return wait(ok(qa.saved || qa.scenario === 'existing'
                ? { id_odontogramv1: 'qa-odontogram', type: qa.savedType, active: true }
                : { id_odontogramv1: null, type: '', active: false }));
        },
        getOdontogramDetail: () => {
            qa.calls.detail++;
            if (qa.includeEditors) return wait(qa.scenario === 'refresh-error' && qa.saved
                ? failed('No se pudo cargar el detalle de prueba.')
                : ok(copy(details[(activeRecord() || {}).id_odontogramv1] || [])));
            return wait(qa.scenario === 'refresh-error' && qa.saved
                ? failed('No se pudo cargar el detalle de prueba.')
                : ok([{ id_odontogram_detailv1: 'qa-tooth', id_tooth: 'qa-tooth', sec: 11, treatment: 'Diagnóstico de ejemplo' }]));
        },
        save: payload => {
            qa.calls.save++;
            qa.payloads.push(JSON.parse(JSON.stringify(payload)));
            if (qa.scenario === 'save-error') return wait(failed('No se pudo crear el odontograma de prueba. Intenta de nuevo.'));
            qa.saved = true; qa.savedType = payload.type;
            if (qa.includeEditors) {
                records.forEach(record => { record.active = false; });
                const sequence = ++recordSequence;
                const id = 'qa-odontogram-new-' + sequence;
                const record = { id_odontogramv1: id, type: payload.type, active: true,
                    code: 'ODO-2026-' + String(42 + sequence).padStart(4, '0'),
                    description: payload.type === '2' ? 'Temporal' : 'Permanente', created_at: '2026-10-16' };
                records.unshift(record);
                details[id] = makeTeeth(id, payload.type);
                return wait(ok(copy(record)));
            }
            return wait(ok({ id_odontogramv1: 'qa-odontogram', type: payload.type, active: true }));
        },
        saveDetail: payload => {
            qa.calls.detailSave++;
            qa.payloads.push(copy(payload));
            const tooth = Object.values(details).flat().find(row => row.id_odontogram_detailv1 === payload.id_odontogram_detailv1);
            if (!tooth) return wait(failed('No se encontró la región dental de prueba.'));
            tooth.treatment = payload.treatment;
            return wait(ok({}));
        },
        getHistory: () => { qa.calls.history++; return wait(ok(qa.includeEditors ? copy(records) : [])); },
        status: payload => {
            qa.calls.status++;
            const selected = records.find(record => record.id_odontogramv1 === payload.id_odontogramv1);
            if (!selected && qa.includeEditors) return wait(failed('No se encontró el odontograma de prueba.'));
            if (selected) {
                if (payload.active) records.forEach(record => { record.active = false; });
                selected.active = Boolean(payload.active);
            }
            return wait(ok({}));
        },
        delete: payload => {
            qa.calls.delete++;
            const index = records.findIndex(record => record.id_odontogramv1 === payload.id_odontogramv1);
            if (index < 0) return wait(failed('No se encontró el odontograma de prueba.'));
            records.splice(index, 1);
            delete details[payload.id_odontogramv1];
            return wait(ok({}));
        }
    };
    if(qa.live) {
        const request = async (path, method = 'GET', body) => {
            try {
                const response = await fetch('/api/odontogram/' + path, {
                    method, headers: {'Content-Type': 'application/json'},
                    ...(body ? {body: JSON.stringify(body)} : {})
                });
                const result = await response.json();
                return {...result, success: response.ok};
            }catch(error) { return {success: false, message: 'No se pudo completar la solicitud de prueba.'}; }
        };
        qa.service = {
            getTypeTooth: () => request('getcatypetooth'),
            validateOdontogram: id => request('v1/validate/' + encodeURIComponent(id)),
            getOdontogramDetail: id => request('v1/odontogram/' + encodeURIComponent(id)),
            save: data => request('v1/save', 'POST', data),
            saveDetail: data => request('v1/detail', 'POST', data),
            getHistory: id => request('v1/history/' + encodeURIComponent(id)),
            status: data => request('v1/status', 'PUT', data),
            delete: data => request('v1/delete', 'DELETE', data)
        };
    }
    const cache = { vuex: { exports: Vuex }, vue: { exports: Vue },
        vuelidate: {exports: window.vuelidate}, 'vuelidate/lib/validators': {exports: window.validators} };
    function require(id) {
        if (cache[id]) return cache[id].exports;
        const code = window.__odontogramModules[id];
        if (!code) throw Error('Module unavailable in isolated fixture: ' + id);
        const module = cache[id] = { exports: {} };
        new Function('require', 'module', 'exports', code)(require, module, module.exports);
        return module.exports;
    }
    qa.require = require;
    const odontogram = require('src/store/modules/odontogram/index.js').default;
    const store = qa.store = new Vuex.Store({ modules: { CORE: {
        namespaced: true,
        actions: { ActionWrapper: (context, { module, action, payload }) => store.dispatch(module + '/' + action, payload) },
        modules: { ODONTOGRAM: odontogram, PX: {namespaced: true, state: {id_person: qa.patient.id_person}} }
    } } });
    Vue.component('da-dialog', require('src/core/components/form/dialog/DADialog.vue').default);
    Vue.component('da-datatable', require('src/core/components/form/table/DADatatable.vue').default);
    Vue.component('da-scoped-column', require('src/core/components/form/table/DAScopedColumn.vue').default);
    Vue.component('da-header-title', require('src/core/components/form/header/DAHeaderTitle.vue').default);
    if(qa.includeEditors) {
        const registrations = {
            'da-button-primary': 'src/core/components/form/buttons/DAPrimaryButton.vue',
            'da-button-secondary': 'src/core/components/form/buttons/DASecondaryButton.vue',
            'da-button-cancel': 'src/core/components/form/buttons/DACancelButton.vue',
            'da-button-gray': 'src/core/components/form/buttons/DAGrayButton.vue',
            'da-text-area-primary': 'src/core/components/form/input/DATextAreaPrimary.vue'
        };
        Object.entries(registrations).forEach(([name, id]) => Vue.component(name, require(id).default));
        Vue.component('lottie-animation', {render: h => h('span', {'aria-hidden': true}, '?')});
    }
    Vue.prototype.$toast = {
        success: message => qa.notifications.push({ type: 'success', message }),
        error: message => qa.notifications.push({ type: 'error', message }),
        warning: message => qa.notifications.push({ type: 'warning', message })
    };
    Vue.prototype.$router = { beforeEach: guard => {
        qa.routeGuards.push(guard);
        return () => { qa.routeGuards = qa.routeGuards.filter(current => current !== guard); };
    } };
    const theme = params.get('theme') || 'clinical-day';
    const themePlugin = require('src/plugins/theme.js');
    themePlugin.applyTheme({ ...themePlugin.DEFAULT_THEME, code: theme });
    const Parent = require('src/views/Patient/Sections/Odontogram.vue').default;
    const app = qa.app = new Vue({
        store, vuetify: new Vuetify({}),
        render: h => h('v-app', [h('main', { class: 'qa-fixture' }, [
            h('p', { class: 'qa-fixture-note' }, qa.live ? 'QA funcional · Paciente ficticio propio · API y MySQL reales' : 'Vista de prueba · Paciente ficticio · Sin conexión a datos reales'),
            h(Parent, { ref: 'odontogram', props: { px: { person: qa.patient } },
                on: { 'register-navigation-guard': guard => { qa.sectionGuard = guard; } } })
        ])])
    }).$mount('#app');
    qa.vm = app.$refs.odontogram;
    qa.ready = true;
}

function buildClient(options = {}) {
    const compiled = buildModules(options);
    const script = 'window.__odontogramIncludeEditors = ' + Boolean(options.includeEditors) + ';\nwindow.__odontogramModules = ' + JSON.stringify(compiled.modules) + ';\n(' + fixtureBootstrap.toString() + ')();';
    return { script: options.live ? 'fetch("/qa/context").then(response => {if(!response.ok) throw Error("QA context unavailable"); return response.json();}).then(context => { window.__odontogramLiveContext=context;' + script + '});' : script, styles: compiled.styles };
}

async function startServer(port = 4324, options = {}) {
    const postcss = require('postcss');
    const tailwind = require('tailwindcss');
    const css = await postcss([tailwind({ ...require(path.join(repo, 'tailwind.config.js')), purge: false })])
        .process(fs.readFileSync(path.join(repo, 'src/assets/tailwind.css'), 'utf8'), { from: undefined });
    const assets = {
        '/vue.js': [require.resolve('vue/dist/vue.js'), 'text/javascript'],
        '/vuex.js': [path.join(path.dirname(require.resolve('vuex')), 'vuex.js'), 'text/javascript'],
        '/vuetify.js': [require.resolve('vuetify/dist/vuetify.js'), 'text/javascript'],
        '/vuetify.css': [require.resolve('vuetify/dist/vuetify.min.css'), 'text/css'],
        '/mdi.css': [require.resolve('@mdi/font/css/materialdesignicons.css'), 'text/css'],
        '/vuelidate.js': [path.join(repo, 'node_modules/vuelidate/dist/vuelidate.min.js'), 'text/javascript'],
        '/validators.js': [path.join(repo, 'node_modules/vuelidate/dist/validators.min.js'), 'text/javascript']
    };
    const server = http.createServer((request, response) => {
        try {
            const url = new URL(request.url, 'http://127.0.0.1');
            const route = url.pathname;
            if(options.live && (route.startsWith('/api/') || route === '/qa/context')) {
                const upstream = http.request({hostname: '127.0.0.1', port: 3019, path: url.pathname + url.search,
                    method: request.method, headers: {'content-type': 'application/json'}}, result => {
                    response.writeHead(result.statusCode, {'content-type': 'application/json', 'cache-control': 'no-store'});
                    result.pipe(response);
                });
                upstream.on('error', () => { response.statusCode = 502; response.end('{"message":"QA backend unavailable"}'); });
                request.pipe(upstream); return;
            }
            response.setHeader('Cache-Control', 'no-store');
            if (assets[route]) {
                response.setHeader('Content-Type', assets[route][1]);
                response.end(fs.readFileSync(assets[route][0])); return;
            }
            if (route.startsWith('/fonts/')) {
                const filename = path.basename(route);
                if (!/^materialdesignicons-webfont\.(woff2?|ttf|eot)$/.test(filename)) throw Error('Unknown font');
                response.setHeader('Content-Type', 'font/woff2');
                response.end(fs.readFileSync(path.join(repo, 'node_modules/@mdi/font/fonts', filename))); return;
            }
            if (route === '/fixture.js') {
                response.setHeader('Content-Type', 'text/javascript'); response.end(buildClient({includeEditors: options.includeEditors || options.live, live: options.live}).script); return;
            }
            if (route === '/fixture.css') {
                response.setHeader('Content-Type', 'text/css'); response.end(css.css + '\n' + buildClient({includeEditors: options.includeEditors || options.live, live: options.live}).styles + '\n' +
                    'body{margin:0}.qa-fixture{padding:32px;max-width:1380px;margin:auto;width:100%}.qa-fixture-note{font:12px/1.5 Arial,sans-serif;color:#64748b;margin:0 0 16px}@media(max-width:600px){.qa-fixture{padding:12px}}'); return;
            }
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            if (route === '/preview') {
                response.end('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Odontograma · QA aislado</title><link rel="stylesheet" href="/vuetify.css"><link rel="stylesheet" href="/mdi.css"><link rel="stylesheet" href="/fixture.css"></head><body><div id="app"></div><script src="/vue.js"></script><script src="/vuex.js"></script><script src="/vuetify.js"></script><script src="/vuelidate.js"></script><script src="/validators.js"></script><script src="/fixture.js"></script></body></html>'); return;
            }
            response.end('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Odontograma QA · Vista responsive</title><style>body{margin:0;background:#e2e8f0;font:14px Arial}nav{display:flex;gap:10px;align-items:center;padding:12px;flex-wrap:wrap;background:#fff}button,select{padding:8px}iframe{display:block;border:0;background:white;margin:16px auto;box-shadow:0 3px 18px #0002}</style></head><body><nav><strong>QA aislado · Odontograma</strong><button onclick="resizeFrame(1440)">Escritorio 1440</button><button onclick="resizeFrame(390)">Móvil 390</button><label>Escenario <select id="scenario" onchange="loadFrame()"><option value="empty">Sin odontograma</option><option value="existing">Con odontograma</option><option value="history">Solo historial</option><option value="load-error">Error de consulta</option><option value="catalog-error">Error de catálogo</option><option value="save-error">Error al crear</option><option value="refresh-error">Error al actualizar detalle</option></select></label><label><input id="night" type="checkbox" onchange="loadFrame()">Tema nocturno</label></nav><iframe id="preview" title="Vista real del odontograma" width="1440" height="900"></iframe><script>function resizeFrame(width){document.getElementById("preview").width=width}function loadFrame(){document.getElementById("preview").src="/preview?scenario="+document.getElementById("scenario").value+"&theme="+(document.getElementById("night").checked?"clinical-night":"clinical-day")}loadFrame()</script></body></html>');
        } catch (error) { response.statusCode = 500; response.end(error.stack); }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });
    console.log(`Odontogram QA: http://127.0.0.1:${port}/ (${options.live ? 'real API/MySQL with own synthetic patient' : 'fake service, no clinical data'})`);
    return server;
}

module.exports = { buildClient, startServer, parentId, childId };
if (require.main === module) startServer(Number(process.argv[2]) || 4324, {
    live: process.argv.includes('--live'), includeEditors: process.argv.includes('--editors')
}).catch(error => { console.error(error); process.exitCode = 1; });
