'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'src/domain/appointments/mexicoTimeZones.js'), 'utf8');
const parsed = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/configuration/components/ClinicTimeZoneField.vue'), 'utf8'));
assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
const script = parsed.script.content.replace(/^import .*;\r?\n/gm, '');
const evidence = path.resolve(root, '../docs/clinical-operations/evidence/CO19');

(async () => {
  const zones = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const { MEXICO_STATES, MEXICO_TIME_ZONES, timezoneForLocation: location, locationOptions, timezonePreview: preview } = zones;
  assert.equal(MEXICO_STATES.length, 32);
  assert.equal(new Set(MEXICO_STATES.map(state => state.value)).size, 32);
  assert.equal(MEXICO_TIME_ZONES.length, 12);
  for (const zone of MEXICO_TIME_ZONES) assert.equal(zones.supportsTimeZone(zone.value), true, zone.value);
  assert.equal(location('JC'), 'America/Mexico_City');
  assert.equal(location('BC'), 'America/Tijuana');
  assert.equal(location('BS'), 'America/Mazatlan');
  assert.equal(location('QR'), 'America/Cancun');
  assert.equal(location('SO'), 'America/Hermosillo');
  for (const state of ['CH', 'CO', 'NL', 'TM', 'NA']) assert.equal(location(state), '', 'Must ask for municipality: ' + state);
  assert.equal(location('CH', 'Juárez (Ciudad Juárez)'), 'America/Ciudad_Juarez');
  assert.equal(location('CH', 'Ojinaga'), 'America/Ojinaga');
  assert.equal(location('CH', '__other__'), 'America/Chihuahua');
  assert.equal(location('CH', 'unknown'), '');
  assert.equal(location('NA', 'Bahía de Banderas'), 'America/Bahia_Banderas');
  assert.equal(location('NA', '__other__'), 'America/Mazatlan');
  assert.equal(location('CO', 'Piedras Negras'), 'America/Matamoros');
  assert.equal(location('CO', '__other__'), 'America/Monterrey');
  assert.equal(location('NL', 'Anáhuac'), 'America/Matamoros');
  assert.equal(location('TM', 'Reynosa'), 'America/Matamoros');
  assert.equal(location('TM', '__other__'), 'America/Monterrey');
  assert.equal(locationOptions('CO').length, 12);
  assert.equal(locationOptions('CH').length, 9);
  assert.equal(locationOptions('TM').length, 11);
  assert.equal(location('invalid'), '');
  assert.equal(preview('Invalid/Zone'), null);
  assert.equal(preview(''), null);
  const winter = new Date('2026-01-15T12:00:00Z');
  const summer = new Date('2026-07-15T12:00:00Z');
  const offsets = {
    'America/Mexico_City': ['UTC-06:00', 'UTC-06:00'], 'America/Cancun': ['UTC-05:00', 'UTC-05:00'],
    'America/Merida': ['UTC-06:00', 'UTC-06:00'], 'America/Monterrey': ['UTC-06:00', 'UTC-06:00'],
    'America/Matamoros': ['UTC-06:00', 'UTC-05:00'], 'America/Chihuahua': ['UTC-06:00', 'UTC-06:00'],
    'America/Ciudad_Juarez': ['UTC-07:00', 'UTC-06:00'], 'America/Ojinaga': ['UTC-06:00', 'UTC-05:00'],
    'America/Mazatlan': ['UTC-07:00', 'UTC-07:00'], 'America/Bahia_Banderas': ['UTC-06:00', 'UTC-06:00'],
    'America/Hermosillo': ['UTC-07:00', 'UTC-07:00'], 'America/Tijuana': ['UTC-08:00', 'UTC-07:00']
  };
  for (const [zone, [jan, jul]] of Object.entries(offsets)) {
    assert.equal(preview(zone, winter).offset, jan, zone + '/January');
    assert.equal(preview(zone, summer).offset, jul, zone + '/July');
    assert.equal(preview(zone, summer).seasonal, jan !== jul);
  }
  assert.equal(preview('America/Tijuana', new Date('2026-03-08T09:59:00Z')).offset, 'UTC-08:00');
  assert.equal(preview('America/Tijuana', new Date('2026-03-08T10:00:00Z')).offset, 'UTC-07:00');
  assert.equal(preview('America/Tijuana', new Date('2026-11-01T08:59:00Z')).offset, 'UTC-07:00');
  assert.equal(preview('America/Tijuana', new Date('2026-11-01T09:00:00Z')).offset, 'UTC-08:00');

  const timers = new Map(); let nextTimer = 0;
  const context = { component: null, ...zones, setInterval:callback=>{timers.set(++nextTimer,callback);return nextTimer;}, clearInterval:id=>timers.delete(id) };
  vm.runInNewContext(script.replace('export default', 'component ='), context);
  const saved = []; let rejectSave = false;
  const field = Object.assign(context.component.data(), { value: 'America/Mexico_City', canManage: true, disabled: false, saveZone: async zone => { if(rejectSave)throw new Error('QA failure');saved.push(zone); } });
  Object.entries(context.component.methods).forEach(([key, method]) => field[key] = method.bind(field));
  Object.entries(context.component.computed).forEach(([key, getter]) => Object.defineProperty(field, key, { get: getter.bind(field) }));
  field.open(); assert.equal(saved.length, 0, 'Opening never overwrites the saved zone');
  field.state = 'BC'; field.selectState(); assert.equal(field.candidate, 'America/Tijuana');
  field.state = 'CH'; field.selectState(); assert.equal(field.candidate, '');
  field.municipality = 'Ojinaga'; field.selectMunicipality(); field.dialog = false;
  assert.equal(saved.length, 0, 'Cancel discards the location draft');
  field.open(); field.state = 'NA'; field.selectState(); field.municipality = 'Bahía de Banderas'; field.selectMunicipality();
  await field.apply(); assert.equal(saved[0], 'America/Bahia_Banderas');assert.equal(field.dialog,false);
  field.canManage = false; field.candidate = 'America/Tijuana'; await field.apply(); assert.equal(saved.length, 1, 'Only administrators can save the shared zone');
  field.canManage = true; field.disabled = true; await field.apply(); assert.equal(saved.length, 1);
  field.disabled=false;field.open();field.state='BC';field.selectState();rejectSave=true;
  await field.apply();assert.equal(field.dialog,true);assert.equal(field.saveError,'QA failure');assert.equal(field.candidate,'America/Tijuana');assert.equal(field.submitting,false);
  field.open();field.state='CS';field.selectState();assert.equal(field.locationLabel,'Chiapas');assert.ok(field.preview.time);assert.ok(field.preview.date);
  field.stateSearch='Sonora';assert.equal(field.preview,null,'Uncommitted typing cannot save the previously selected state');
  field.toggleAdvanced();assert.equal(field.candidate,'');field.detected='America/Tijuana';field.useDetected();assert.equal(field.preview.offset,'UTC-07:00');
  field.zoneSearch='Cancún';assert.equal(field.preview,null,'Manual search also requires a committed selection');
  field.toggleAdvanced();assert.equal(field.candidate,'');assert.equal(field.preview,null);
  assert.equal(field.searchMunicipality({value:'__other__'},'Saltillo','Otro municipio de Coahuila'),true,'Unlisted municipalities keep the rest-of-state option available');
  context.component.watch.dialog.call(field,true);assert.equal(timers.size,1);
  field.referenceDate=new Date('2000-01-01T00:00:00Z');timers.get(field.clockTimer)();assert.ok(field.referenceDate.getFullYear()>2000,'Open preview refreshes the displayed clock');
  context.component.watch.dialog.call(field,false);assert.equal(timers.size,0);
  context.component.watch.dialog.call(field,true);context.component.beforeDestroy.call(field);assert.equal(timers.size,0,'Leaving the agenda cleans up its clock');
  console.log('PASS CO19 domain/component: 32 states, municipal exceptions, 12 IANA zones, winter/summer, DST boundaries, cancel, explicit apply and inherited permissions.');
  if (!process.argv.includes('--visual')) return;

  const { chromium } = require('@playwright/test');
  const parent = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/configuration/components/ProfessionalAgendaConfig.vue'), 'utf8'));
  assert.deepEqual(compiler.compile(parent.template.content).errors, []);
  const modules = ['src/domain/appointments/appointment.storage.js', 'src/domain/appointments/availability.js', 'src/security/settingsAccess.js'].map(file => fs.readFileSync(path.join(root, file), 'utf8'));
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  let page;
  try {
    page = await browser.newPage({ timezoneId: 'America/Tijuana' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.setContent('<!doctype html><html lang="es"><meta charset="utf-8"><body><div id="app"></div></body></html>');
    await page.addStyleTag({ path: path.join(root, 'node_modules/vuetify/dist/vuetify.min.css') });
    await page.addStyleTag({ content: 'body{margin:0}.qa-wrap{max-width:1248px;margin:24px auto;padding:16px}' + [...parent.styles,...parsed.styles].map(style => style.content.replace(/::v-deep /g, '')).join('\n') });
    await page.addScriptTag({ path: path.join(root, 'node_modules/vue/dist/vue.js') });
    await page.addScriptTag({ path: path.join(root, 'node_modules/vuetify/dist/vuetify.js') });
    await page.evaluate(({ source, script, template, parent, modules }) => {
      (0, eval)(source.replace(/export /g, '') + '\nwindow.zoneHelpers = {MEXICO_STATES,MEXICO_TIME_ZONES,locationOptions,timezoneForLocation,timezoneLabel,timezonePreview,supportsTimeZone};');
      Object.assign(window, window.zoneHelpers);
      (0, eval)(script.replace('export default', 'window.ZoneField ='));
      window.ZoneField.template = template;
      modules.forEach(source => {
        const names = [...source.matchAll(/export (?:const|function) (\w+)/g)].map(match=>match[1]);
        (0,eval)(source.replace(/^import[\s\S]*?;\r?\n/gm,'').replace(/export /g,'') + '\nObject.assign(window,{' + names.join(',') + '});');
      });
      window.fixture = window.Vue.observable({ zone:'America/Mexico_City', fail:false, role:'admin', fullSaves:0, zoneSaves:0 });
      window.moduleTypes={AUTH:{}};window.fnTypes={};window.ClinicTimeZoneField=window.ZoneField;
      window.mapGetters=()=>({authUser:()=>({id_login:'actor'}),role:()=>window.fixture.role,hasPermission:()=>()=>true});
      window.DAAppointmentService={
        doctors:async()=>({success:true,data:[{id_login:'actor',id_doctor_professional_profile:'doctor-a',display_name:'QA Doctor A'},{id_login:'other',id_doctor_professional_profile:'doctor-b',display_name:'QA Doctor B'}]}),
        getConfig:async id=>({success:true,data:{...window.createDefaultAppointmentConfig(),id:'config-'+id,doctorProfileId:id,timezone:window.fixture.zone}}),
        saveConfig:async()=>{window.fixture.fullSaves++;return {success:true};},
        saveTimezone:async timezone=>{window.fixture.zoneSaves++;if(window.fixture.fail)return {success:false,message:'No se pudo guardar. Prueba de error.'};window.fixture.zone=timezone;return {success:true,data:{timezone}};}
      };
      (0,eval)(parent.script.content.replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export default','window.Agenda ='));
      window.Agenda.template=parent.template.content;
      window.Vue.prototype.$router={beforeEach:()=>()=>{}};
      window.Vue.component('router-link',{render(h){return h('a',this.$slots.default);}});
      window.qaApp = new window.Vue({ vuetify: new window.Vuetify(), render(h) {
        return h('v-app', [h('main', { class: 'qa-wrap' }, [h(window.Agenda, { ref:'agenda' })])]);
      } }).$mount('#app');
    }, { source, script, template: parsed.template.content, parent:{script:parent.script,template:parent.template}, modules });
    await page.getByRole('button',{name:'Cambiar zona del consultorio',exact:true}).waitFor();
    for (const [viewport, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(async () => {
        window.fixture.zone='America/Mexico_City';window.fixture.fullSaves=0;window.fixture.role='admin';
        await window.qaApp.$refs.agenda.load();window.qaApp.$refs.agenda.form.defaultAppointmentDuration=45;
      });
      assert.deepEqual(await page.evaluate(()=>window.qaApp.$refs.agenda.options.map(item=>item.id)),['doctor-a','doctor-b']);
      await page.getByRole('button', { name: 'Cambiar zona del consultorio', exact: true }).click();
      assert.deepEqual(await page.evaluate(()=>({selected:window.qaApp.$refs.agenda.selected,leaveOpen:window.qaApp.$refs.agenda.leaveOpen})),{selected:'doctor-a',leaveOpen:false});
      assert.equal(await page.evaluate(() => window.qaApp.$refs.agenda.form.timezone), 'America/Mexico_City');
      assert.equal(await page.getByRole('button',{name:'Usar la hora de este equipo',exact:true}).count(),0);
      assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isDisabled(),true);
      assert.equal(await page.locator('.clinic-timezone-submit').evaluate(button=>{const style=getComputedStyle(button);return style.color!==style.backgroundColor && style.color!=='rgba(255, 255, 255, 0.3)';}),true,'Disabled save remains legible');
      await page.locator('.v-dialog--active').screenshot({path:path.join(evidence,'initial-'+viewport+'.png')});
      await page.getByLabel('Estado del consultorio', { exact: true }).fill('chiapas');
      await page.getByRole('option',{name:'Chiapas',exact:true}).click();
      await page.locator('.clinic-timezone-preview .clinic-timezone-name').filter({hasText:/^Chiapas$/}).waitFor();
      assert.doesNotMatch(await page.locator('.clinic-timezone-preview').innerText(),/Ciudad de México|UTC|America\//);
      await page.locator('.v-dialog--active').screenshot({path:path.join(evidence,'state-'+viewport+'.png')});
      await page.getByLabel('Estado del consultorio',{exact:true}).fill('sonora');
      assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isDisabled(),true);
      assert.equal(await page.locator('.clinic-timezone-clock').count(),0);
      await page.getByRole('option',{name:'Sonora',exact:true}).click();
      await page.getByLabel('Estado del consultorio',{exact:true}).fill('coahuila');
      await page.getByRole('option',{name:'Coahuila',exact:true}).click();
      await page.getByLabel('Municipio del consultorio').fill('saltillo');
      await page.getByRole('option',{name:'Otro municipio de Coahuila',exact:true}).click();
      await page.locator('.clinic-timezone-preview .clinic-timezone-name').filter({hasText:/^Coahuila$/}).waitFor();
      await page.getByLabel('Estado del consultorio', { exact: true }).scrollIntoViewIfNeeded();
      await page.getByLabel('Estado del consultorio', { exact: true }).click();
      await page.getByLabel('Estado del consultorio', { exact: true }).fill('nayarit');
      await page.getByRole('option', { name: 'Nayarit', exact: true }).click();
      assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isDisabled(),true);
      await page.getByLabel('Municipio del consultorio').fill('bahia');
      await page.getByRole('option', { name: 'Bahía de Banderas', exact: true }).click();
      await page.getByText('Bahía de Banderas, Nayarit', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await page.locator('.clinic-timezone-dialog').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(() => window.qaApp.$refs.agenda.form.timezone), 'America/Bahia_Banderas');
      assert.deepEqual(await page.evaluate(()=>({saved:window.fixture.zone,fullSaves:window.fixture.fullSaves,selected:window.qaApp.$refs.agenda.selected,duration:window.qaApp.$refs.agenda.form.defaultAppointmentDuration,dirty:window.qaApp.$refs.agenda.dirty})),{saved:'America/Bahia_Banderas',fullSaves:0,selected:'doctor-a',duration:45,dirty:true});
      await page.getByRole('button', { name: 'Cambiar zona del consultorio', exact: true }).click();
      await page.getByLabel('Estado del consultorio', { exact: true }).fill('chihuahua');
      await page.getByRole('option', { name: 'Chihuahua', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Guardar', exact: true }).isDisabled(), true);
      await page.getByLabel('Municipio del consultorio').fill('ojinaga');
      await page.getByRole('option', { name: 'Ojinaga', exact: true }).click();
      await page.getByText('Ojinaga, Chihuahua', { exact: true }).waitFor();
      await page.getByText('Aquí el reloj cambia en ciertas épocas del año.',{exact:true}).waitFor();
      await page.locator('.clinic-timezone-preview').scrollIntoViewIfNeeded();
      await page.locator('.v-dialog--active').screenshot({ path: path.join(evidence, 'location-' + viewport + '.png') });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      assert.equal(await page.evaluate(() => window.qaApp.$refs.agenda.form.timezone), 'America/Bahia_Banderas');
      await page.getByRole('button', { name: 'Cambiar zona del consultorio', exact: true }).click();
      await page.getByRole('button',{name:'Elegir el horario de otra forma',exact:true}).click();
      await page.getByRole('button', { name: 'Usar la hora de este equipo', exact: true }).click();
      await page.getByText('Hora elegida desde este equipo',{exact:true}).waitFor();
      await page.getByLabel('Elige una zona horaria',{exact:true}).fill('cancun');
      assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isDisabled(),true);
      await page.getByRole('option',{name:'Quintana Roo · Cancún',exact:true}).click();
      await page.locator('.clinic-timezone-preview .clinic-timezone-name').filter({hasText:'Quintana Roo · Cancún'}).waitFor();
      await page.getByRole('button', { name: 'Usar la hora de este equipo', exact: true }).click();
      await page.evaluate(()=>{window.fixture.fail=true;});
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await page.getByRole('alert').filter({hasText:'No se pudo guardar. Prueba de error.'}).waitFor();
      assert.equal(await page.evaluate(() => window.qaApp.$refs.agenda.form.timezone), 'America/Bahia_Banderas');
      await page.evaluate(()=>{window.fixture.fail=false;});
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await page.locator('.clinic-timezone-dialog').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(() => window.qaApp.$refs.agenda.form.timezone), 'America/Tijuana');
      await page.locator('.clinic-timezone').screenshot({ path: path.join(evidence, 'inherited-' + viewport + '.png') });
      await page.locator('.agenda-scope').screenshot({ path: path.join(evidence, 'scope-' + viewport + '.png') });
      await page.getByRole('button',{name:'Cierres del consultorio',exact:true}).click();
      await page.getByText('Cambios sin guardar',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Seguir editando',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.qaApp.$refs.agenda.selected),'doctor-a');
      await page.evaluate(async () => { window.fixture.role='doctor'; await window.Vue.nextTick(); });
      assert.equal(await page.getByRole('button', { name: 'Cambiar zona del consultorio', exact: true }).count(), 0);
      await page.getByText('El administrador puede cambiarla.', { exact: true }).waitFor();
      await page.evaluate(async () => { window.fixture.role='admin'; await window.Vue.nextTick(); });
    }
    assert.deepEqual(errors, []);
    console.log('PASS CO19 visual desktop/mobile: direct modal in real agenda, doctor-only selector, independent zone save, retained dirty hours, cancellation, retry, permissions and closure access. Isolated API fixtures; no real DB writes.');
  } catch(error) {
    if(page) {
      await page.screenshot({path:path.join(evidence,'qa-failure.png')});
      console.error(JSON.stringify(await page.evaluate(()=>({inputs:[...document.querySelectorAll('.clinic-timezone-dialog input')].map(input=>({label:input.getAttribute('id'),value:input.value})),menus:[...document.querySelectorAll('.v-menu__content.menuable__content__active')].map(menu=>menu.innerText)}))));
    }
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
