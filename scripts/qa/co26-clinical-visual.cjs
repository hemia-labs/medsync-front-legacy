// Headless visual QA using synthetic API responses. No backend or network access.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const { buildClient } = require('./odontogram-ui-preview.cjs');
(async () => {
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const capture = process.argv.includes('--capture');
  const browser = await chromium.launch(fs.existsSync(edge) ? { executablePath: edge } : {});
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.abort());
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('dialog',dialog=>{errors.push('Unexpected native dialog: '+dialog.type());dialog.dismiss();});
    const built = buildClient({ includeEditors: true,extraModules:['src/views/Patient/Sections/components/TreatmentDentalDetails.vue'] });
    await page.setContent('<html><body style="margin:0"><div id="app"></div></body></html>');
    await page.addStyleTag({ path: require.resolve('vuetify/dist/vuetify.min.css') });
    await page.addStyleTag({path:require.resolve('sweetalert2/dist/sweetalert2.min.css')});
    await page.addStyleTag({path:path.resolve(__dirname,'../../src/assets/sweetalert.css')});
    await page.addScriptTag({path:require.resolve('sweetalert2/dist/sweetalert2.all.min.js')});
    await page.addStyleTag({ content: built.styles });
    const appCss=path.resolve(__dirname,'../../../_qa/co26-visual-production/css');
    if(fs.existsSync(appCss))for(const file of fs.readdirSync(appCss).filter(file=>/^app\..*\.css$/.test(file)))await page.addStyleTag({path:path.join(appCss,file)});
    for (const file of [require.resolve('vue/dist/vue.js'), path.join(path.dirname(require.resolve('vuex')), 'vuex.js'),
      require.resolve('vuetify/dist/vuetify.js'), require.resolve('vuelidate/dist/vuelidate.min.js'),
      require.resolve('vuelidate/dist/validators.min.js')]) await page.addScriptTag({ path: file });
    // fixtureBootstrap obtains the scenario from the URL; no real network is used.
    await page.evaluate(() => { window.history.replaceState(null, '', 'about:blank'); });
    if (capture) {
      const D = require('./co26-backend-fixture.cjs');
      const initial = D.emptyChart('mixed');
      const chart = { id_chart: 'qa-capture', id_person: 'qa-patient', ...D.applyBatch(initial, {
        batch_id:'qa-batch',base_revision:0,generation:1,catalog_version:D.CATALOG_VERSION,
        ops:[{client_op_id:'qa-car',type:'finding.add',tooth:16,code:'car',surfaces:'MO'},
          {client_op_id:'qa-note',type:'note.set',tooth:16,text:'Nota sintética para revisar.'},
          {client_op_id:'qa-res',type:'finding.add',tooth:55,code:'res',surfaces:'O'}]
      }, 'qa-actor').chart };
      await page.evaluate(({ chart, catalog }) => {
        window.__odontogramPermissions=['px.tab.odontogram','odontogram.capture','odontogram.finalize','treatments.create'];
        window.__odontogramV2Fixture={
          capabilities:async()=>({success:true,data:{mode:'v2',schema_ready:true}}),
          list:async()=>({success:true,data:{catalog,charts:[{id_chart:chart.id_chart,revision:chart.revision,dentition:'mixed',status:'active'}]}}),
          read:async()=>({success:true,data:JSON.parse(JSON.stringify(chart))})
        };
      }, { chart, catalog: D.CATALOG });
    }
    await page.addScriptTag({ content: built.script });
    await page.evaluate(()=>{window.Vue.prototype.$swal=window.Swal;});
    await page.waitForFunction(() => window.__odontogramQA && !window.__odontogramQA.vm.loading);
    // about:blank defaults to the empty scenario; seed synthetic data through the store.
    if (!capture) await page.evaluate(() => {
      const vm = window.__odontogramQA.vm;
      vm.$store.state.CORE.ODONTOGRAM.id_odontogram = 'qa-chart';
      vm.$store.state.CORE.ODONTOGRAM.odontogram = Array.from({ length: 32 }, (_, i) => {
        const sec = (Math.floor(i / 8) + 1) * 10 + i % 8 + 1;
        return { id_tooth: 'qa-' + sec, sec, treatment: sec === 16 ? 'Nota sintética para QA visual.' : '' };
      });
    });
    const output = path.resolve(__dirname, '../../../_qa/co26-review-evidence'); fs.mkdirSync(output, { recursive: true });
    for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet',1024,900], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      const selector = capture ? '.co26-live-teeth button' : '.clinical-chart-teeth button';
      await page.locator(capture ? '.co26-live-teeth button[data-tooth="16"]' : selector).first().click();
      assert.equal(await page.locator(selector).count(), capture ? 52 : 32);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.locator(capture ? '.co26-live' : '.clinical-chart').screenshot({ path: path.join(output, (capture ? 'capture-v2-' : 'clinical-api-') + name + '.png') });
      if(capture){
        const targets=await page.locator('.co26-live-tools button, .co26-live-surfaces button, .co26-live-piece-nav button').evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));
        assert.ok(targets.every(target=>target.width>=44&&target.height>=44),'Capture targets must be at least 44x44 CSS px');
      }
    }
    if(capture){
      await page.evaluate(()=>{const plugin=window.__odontogramQA.require('src/plugins/theme.js');plugin.applyTheme({...plugin.DEFAULT_THEME,code:'clinical-night'});});
      for(const [name,width,height]of [['desktop',1440,1000],['tablet',1024,900],['mobile',390,844]]){
        await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await page.locator('.co26-live').screenshot({path:path.join(output,'capture-v2-'+name+'-night.png')});
      }
      await page.evaluate(()=>{const plugin=window.__odontogramQA.require('src/plugins/theme.js');plugin.applyTheme({...plugin.DEFAULT_THEME,code:'clinical-day'});});
      for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){
        await page.setViewportSize({width,height});await page.evaluate(()=>{const live=window.__odontogramQA.vm.$refs.capture;live._lastOdontogramToast=null;live.confirmedOperations(['note.set']);});
        await page.getByText('Nota guardada.',{exact:true}).waitFor();await page.waitForTimeout(150);
        const toast=await page.locator('.swal2-toast').boundingBox();assert.ok(toast.x>=0&&toast.x+toast.width<=width+1);
        await page.screenshot({path:path.join(output,'save-toast-'+name+'.png')});await page.evaluate(()=>window.Swal.close());
      }
      await page.evaluate(()=>{const live=window.__odontogramQA.vm.$refs.capture;live.selectTooth(16).then(()=>live.reviewTooth());});
      await page.getByText('Confirmar cambio del odontograma',{exact:true}).waitFor();
      for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){
        await page.setViewportSize({width,height});await page.waitForTimeout(200);
        await page.locator('.v-dialog--active').screenshot({path:path.join(output,'review-confirm-'+name+'.png')});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      }
      await page.locator('.v-dialog--active').getByText('Cancelar',{exact:true}).click();
      await page.evaluate(()=>{const live=window.__odontogramQA.vm.$refs.capture;live.command='16 car ov';live.runCommand();});
      await page.locator('[aria-label="Resolver caras superpuestas"]').waitFor();
      assert.equal(await page.evaluate(()=>document.activeElement.textContent.includes('Fusionar')),true);
      await page.locator('.co26-overlap-dialog').screenshot({path:path.join(output,'merge-dialog-mobile.png')});
      await page.getByLabel('Resolver caras superpuestas').getByRole('button',{name:'Cancelar',exact:true}).click();
      await page.evaluate(()=>{const live=window.__odontogramQA.vm.$refs.capture;if(live.session)live.session.dispose();live.session=null;live.chart=null;live.historyOpen=true;live.history=[{id_chart:'qa-history-one',dentition:'permanent',status:'finalized',revision:3,created_at:'2026-10-29T23:26:23.000Z',updated_at:'2026-10-29T23:35:00.000Z'},{id_chart:'qa-history-two',dentition:'primary',status:'finalized',revision:13,created_at:'2026-10-29T23:07:39.000Z',updated_at:'2026-10-29T23:20:00.000Z'}];});
      await page.waitForTimeout(350);
      for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){
        await page.setViewportSize({width,height});assert.equal(await page.locator('.co26-history-card').count(),2);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.co26-history').screenshot({path:path.join(output,'history-'+name+'.png')});
      }
      for(const [id,filename]of [['src/views/Patient/Sections/components/TreatmentDentalDetails.vue','plan-contributions']]){
        await page.evaluate(({id})=>{
          const qa=window.__odontogramQA;qa.app.$destroy();document.body.innerHTML='<div id="extra"></div>';
          const component=qa.require(id).default;
          qa.app=new window.Vue({data:()=>({details:[{tooth_number:'16',manual:true,manual_surfaces:'D',surfaces:'MOD',sources:[{source_key:'qa-source',id_chart:'chart',finding_id:'finding',revision:2,context:{label:'Caries',surfaces:'MO'}}]}]}),render(h){return h(component,{props:{value:this.details,teeth:['16'],patientId:'synthetic',canRead:true},on:{input:value=>{this.details=value;}}});}}).$mount('#extra');
        },{id});
        await page.waitForTimeout(100);
        for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){
          await page.setViewportSize({width,height});
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
          const buttons=await page.locator('button').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));assert.ok(buttons.every(height=>height>=44));
          await page.screenshot({path:path.join(output,filename+'-'+name+'.png'),fullPage:true});
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS desktop/mobile: ' + (capture ? '52 CO26' : '32 v1') + ' API teeth, visible selection, contained horizontal scrolling, no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
