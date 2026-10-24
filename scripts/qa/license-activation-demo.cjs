'use strict';
// Actual Vue component and Router; isolated synthetic destination, no app API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sfc = compiler.parseComponent(read('src/views/licensing/LicenseActivationDemo.vue'));
const script = sfc.script.content.replace('export default', 'return');
const destination = '<main style="padding:32px;font-family:system-ui;max-width:720px"><p>Destino de prueba</p><h1>Resumen de configuración</h1><p>El recorrido llega a /admin?section=summary, sin abrir una guía. En la aplicación se muestra aquí tu configuración real, según tu sesión.</p><p>Esta vista aislada no consulta ni modifica datos del consultorio.</p><router-link to="/activar-cuenta/demo">Volver a la demostración</router-link></main>';

async function verify() {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window; global.document = dom.window.document;
  Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
  const Vue = require('vue/dist/vue.common.js'), Router = require('vue-router');
  Vue.use(Router); Vue.config.productionTip = false; Vue.config.devtools = false;
  const errors = []; Vue.config.errorHandler = e => errors.push(e.message);
  assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
  const component = { ...new Function(script)(), ...compiler.compileToFunctions(sfc.template.content) };
  const router = new Router({ mode: 'abstract', routes: [
    { path: '/activar-cuenta/demo', component }, { path: '/admin', component: { template: destination } }
  ] });
  const currentStore = { authenticated: false, plan: 'unchanged', onboarding: { step: 4 } };
  const original = JSON.stringify(currentStore);
  window.localStorage.setItem('onboarding-sentinel', 'step4');
  await router.push('/activar-cuenta/demo');
  const host = new Vue({ router, render: h => h('router-view') }).$mount();
  document.body.appendChild(host.$el);
  const view = host.$children[0];
  await view.$nextTick();
  const click = async text => {
    const button = [...view.$el.querySelectorAll('button')].find(b => b.textContent.trim() === text);
    assert.ok(button, text); button.click(); await view.$nextTick();
  };
  await click('Continuar con Profesional');
  await click('Simular pago y activación');
  assert.equal(view.stage, 'review'); assert.ok(view.$el.querySelector('[role=alert]'));
  const check = view.$el.querySelector('input[type=checkbox]'); check.checked = true;
  check.dispatchEvent(new window.Event('change', { bubbles: true })); await view.$nextTick();
  await click('Simular pago y activación');
  assert.equal(view.stage, 'processing'); view.simulate();
  await new Promise(resolve => setTimeout(resolve, 760)); await view.$nextTick();
  assert.equal(view.stage, 'complete');
  assert.equal(document.activeElement.id, 'license-title');
  const finish = [...view.$el.querySelectorAll('a')].find(a => a.textContent.includes('Ver Resumen'));
  assert.equal(finish.getAttribute('href'), '/admin?section=summary');
  assert.equal(finish.getAttribute('href').includes('guide='), false);
  for (const [outcome, expected] of [['failure', 'failed'], ['pending', 'pending']]) {
    view.reset(); view.go('review'); view.reviewed = true; view.outcome = outcome; view.simulate();
    await new Promise(resolve => setTimeout(resolve, 760)); await view.$nextTick();
    assert.equal(view.stage, expected);
    if (expected === 'failed') { await click('Revisar y reintentar'); assert.equal(view.reviewed, true); }
  }
  await click('Confirmar simulación pendiente'); assert.equal(view.stage, 'complete');
  view.go('review'); view.simulate(); view.reset();
  await new Promise(resolve => setTimeout(resolve, 760));
  assert.equal(view.stage, 'plan', 'Reset cancels in-flight result'); assert.equal(view.reviewed, false);
  view.go('review'); view.reviewed = true; view.simulate(); view.$destroy();
  assert.equal(view.timer, null, 'Unmount cancels callback');
  assert.equal(window.localStorage.getItem('onboarding-sentinel'), 'step4');
  assert.equal(JSON.stringify(currentStore), original);
  assert.deepEqual(errors, []);
  host.$destroy();
  const routeSource = read('src/router/routes/licensing-demo.js').replace('export default', 'return');
  for (const mode of ['production', 'test']) assert.equal(new Function('process', routeSource)({ env: { NODE_ENV: mode } }).length, 0);
  assert.equal(new Function('process', routeSource)({ env: { NODE_ENV: 'development' } }).length, 1);
  console.log('PASS: Vue flow, review required, success/failure/pending, retry, reset/unmount, focus, non-guided destination, storage unchanged, dev-only route. No API/DB/payment.');
}

function serve() {
  const assets = { '/vue.js': 'node_modules/vue/dist/vue.js', '/router.js': 'node_modules/vue-router/dist/vue-router.js' };
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profesional · Activación de prueba</title><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif}button,input,select{font:inherit}${sfc.styles.map(s => s.content).join('\n')}</style></head><body><div id="app"></div><script src="/vue.js"></script><script src="/router.js"></script><script>Vue.use(VueRouter);Vue.config.productionTip=false;Vue.config.devtools=false;const component=(function(){${script}})();component.template=${JSON.stringify(sfc.template.content)};const router=new VueRouter({mode:'history',routes:[{path:'/',redirect:'/activar-cuenta/demo'},{path:'/activar-cuenta/demo',component},{path:'/admin',component:{template:${JSON.stringify(destination)}}}]});new Vue({router,render:h=>h('router-view')}).$mount('#app');</script></body></html>`;
  require('node:http').createServer((req, res) => {
    if (req.url === '/qa/mobile' || req.url === '/qa/narrow') {
      const width = req.url === '/qa/mobile' ? 390 : 320;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html lang="es"><title>QA responsive ${width}px</title><body style="margin:0;background:#dce3e6;font-family:system-ui"><p style="margin:12px">Vista responsive: ${width} px</p><iframe title="Demostración de licencias" src="/activar-cuenta/demo" style="width:${width}px;height:844px;border:0;display:block;margin:0 auto"></iframe></body></html>`);
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', assets[req.url] ? 'application/javascript' : 'text/html; charset=utf-8');
    if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return; }
    res.end(assets[req.url] ? fs.readFileSync(path.join(root, assets[req.url])) : html);
  }).listen(4336, '127.0.0.1', () => console.log('Isolated preview: http://127.0.0.1:4336/activar-cuenta/demo'));
}
verify().then(() => { if (process.argv.includes('--serve')) serve(); }).catch(error => { console.error(error); process.exitCode = 1; });
