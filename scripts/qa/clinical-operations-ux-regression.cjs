/* Focused UX9/UX10 regressions. Pure component/domain checks, no HTTP or DB. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const cache = {};
function load(id) {
    if(cache[id]) return cache[id].exports;
    if(!id.startsWith('src/')) return require(id);
    if(id.endsWith('core-proccess-context.js')) return {};
    if(id.endsWith('.vue') && id !== datesId && id !== monitoringId) return { default: {} };
    let source = fs.readFileSync(path.join(root, id), 'utf8');
    if(id.endsWith('.vue')) {
        const sfc = compiler.parseComponent(source);
        const template = compiler.compile(sfc.template.content);
        assert.deepEqual(template.errors, [], id + ' template compiles');
        source = sfc.script.content;
    }
    const module = cache[id] = { exports: {} };
    const code = babel.transformSync(source, { filename: id, babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
    new Function('require', 'module', 'exports', code)(specifier => {
        if(!specifier.startsWith('.')) return load(specifier);
        const base = path.posix.normalize(path.posix.join(path.posix.dirname(id), specifier));
        const next = [base, base + '.js', base + '.vue', base + '/index.js'].find(file => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile());
        assert.ok(next, 'Resolve ' + specifier);
        return load(next);
    }, module, module.exports);
    return module.exports;
}
const datesId = 'src/views/dates/dates.vue';
const monitoringId = 'src/views/Patient/Sections/MonitoringPlan.vue';
const { formatOdontogramCreatedAt: format } = load('src/domain/odontogram/odontogram.date.js');
const instant = '2026-10-17T02:48:06.000Z';
assert.match(format({created_at_utc: instant, timezone: 'America/Mexico_City'}), /^16.*oct.*2026$/);
assert.match(format({created_at_utc: instant, timezone: 'Asia/Tokyo'}), /^17.*oct.*2026$/);
assert.match(format({created_at_utc: instant, timezone: 'invalid-zone'}), /^16.*oct.*2026$/);
assert.match(format({created_at: '17-10-2026 02:48:06'}), /^17.*oct.*2026$/, 'Legacy day is not guessed as UTC');
assert.match(format({created_at: '2026-10-17'}), /^17.*oct.*2026$/, 'Calendar-only values never shift');
assert.equal(format({}), 'fecha no registrada');
assert.equal(format({created_at: 'fecha histórica'}), 'fecha histórica');
console.log('PASS odontogram: clinic timezone, UTC day boundary, invalid timezone fallback, compatible legacy/calendar dates.');

const dates = load(datesId).default;
const access = (role, permissions) => ({role, hasPermission: value => permissions.includes(value)});
assert.equal(dates.computed.canCompleteOwnProfile.call(access('admin', ['admin.config'])), true);
assert.equal(dates.computed.canCompleteOwnProfile.call(access('doctor', ['px.dates'])), true);
assert.equal(dates.computed.canCompleteOwnProfile.call(access('assistant', ['px.dates'])), false);
assert.equal(dates.computed.canConfigureDoctors.call(access('admin', ['admin.users'])), true);
assert.equal(dates.computed.canConfigureDoctors.call(access('assistant', ['admin.users'])), false, 'Delegated staff must not be sent to an inaccessible settings section');
const slot = {startTime: '09:30', endTime: '10:00', status: 'available'};
const label = dates.methods.slotAccessibleName.call(dates.methods, '2026-10-16', slot);
assert.match(label, /viernes 16-10-2026, 09:30 a 10:00, Disponible/);
const secondDay = dates.methods.slotAccessibleName.call(dates.methods, '2026-10-17', slot);
assert.notEqual(label, secondDay, 'Same hour on different days has a different accessible name');
const template = compiler.parseComponent(fs.readFileSync(path.join(root, datesId), 'utf8')).template.content;
assert.match(template, /aria-label="Consultar semana anterior"/);
assert.match(template, /aria-label="Consultar semana siguiente"/);
assert.match(template, /!agendaLoading && !agendaError && !doctors.length/);
assert.match(template, /returnTo: '\/px\/dates'/);
console.log('PASS appointments: permission-aware setup actions, no empty state on API failure/loading, unique day/hour/status labels and week navigation names.');

const monitoring = load(monitoringId).default;
const field = monitoring.methods.newMonitoringFieldError;
const form = { newMonitoringSubmitted: false, savedNewMonitoring: null, showtto2: false, showtto3: false,
    getAllTreatments: [{id: 'one', name: 'Revisión'}], ttoSelecionado1: '', ttoSelecionado: '',
    objCita3: {id_cat_treatment_now: '', id_cat_treatment_after: ''} };
assert.deepEqual(field.call(form, 'performed'), []);
form.newMonitoringSubmitted = true;
assert.equal(field.call(form, 'performed').length, 1);
assert.equal(field.call(form, 'next').length, 1);
form.objCita3.id_cat_treatment_now = '   ';
assert.equal(field.call(form, 'performed').length, 1);
form.objCita3.id_cat_treatment_now = 'Revisión';
form.objCita3.id_cat_treatment_after = 'Sin retorno previsto';
assert.deepEqual(field.call(form, 'performed'), []);
assert.deepEqual(field.call(form, 'next'), []);
form.showtto2 = true; form.ttoSelecionado1 = 'not-in-catalog';
assert.equal(field.call(form, 'performed').length, 1);
form.ttoSelecionado1 = 'one';
assert.deepEqual(field.call(form, 'performed'), []);
const monitoringTemplate = compiler.parseComponent(fs.readFileSync(path.join(root, monitoringId), 'utf8')).template.content;
assert.doesNotMatch(monitoringTemplate, /<(?:span|svg)[^>]*@click=/, 'Interactive text/icons must use keyboard-capable controls');
assert.match(monitoringTemplate, /aria-label="Cerrar nuevo seguimiento"/);
assert.match(monitoringTemplate, /aria-label="Cerrar detalle del seguimiento"/);
assert.match(monitoringTemplate, /label="Tratamiento realizado \(obligatorio\)"/);
console.log('PASS follow-up: required field errors in text/catalog modes, whitespace rejected, native close/select controls.');
