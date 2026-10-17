// Real DOMPurify with an inert DOM. No server, DB, browser, network or stored snapshots.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');
const compiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const stripImports = text => text.replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '');
const dom = new JSDOM('', { url: 'https://qa.invalid/' });
const helpersContext = { module: { exports: {} }, DOMPurify, window: dom.window };
vm.runInNewContext(stripImports(read('src/utils/sanitizeHtml.js'))
  .replace(/export default[^;]+;/g, '').replace(/export /g, '')
  + '\nmodule.exports = { sanitizeHtmlForDocumentSnapshot, safeDocumentImageSource };', helpersContext);
const helpers = helpersContext.module.exports;
const sanitize = helpers.sanitizeHtmlForDocumentSnapshot;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
function fragment(html) {
  const element = dom.window.document.createElement('div');
  element.innerHTML = html;
  return element;
}
function assertSafe(html) {
  const element = fragment(html);
  assert.equal(element.querySelector('script,style,iframe,object,embed,form,input,svg,math,meta,link,base'), null);
  for(const node of element.querySelectorAll('*')) {
    for(const attr of node.attributes) {
      assert(!/^on/i.test(attr.name), `No event attribute: ${attr.name}`);
      assert(!['id', 'name', 'srcdoc', 'target'].includes(attr.name), `No active/clobbering attribute: ${attr.name}`);
      if(['href', 'src'].includes(attr.name)) assert(!/^\s*(?:javascript|vbscript|file|data:text|data:image\/svg)/i.test(attr.value));
      if(attr.name === 'style') assert(!/url\(|expression\(|position:|z-index:|margin:\s*-/i.test(attr.value));
    }
  }
  return element;
}
const hostile = [
  '<script>window.securityProbe = true</script><p onclick="securityProbe()">Consentimiento</p>',
  '<img src="x" onerror="securityProbe()"><svg onload="securityProbe()"><a xlink:href="javascript:securityProbe()">x</a></svg>',
  '<iframe srcdoc="<script>securityProbe()</script>"></iframe><object data="javascript:securityProbe()"></object>',
  '<meta http-equiv="refresh" content="0;url=javascript:securityProbe()"><base href="https://attacker.invalid/"><link rel="stylesheet" href="https://attacker.invalid/a.css">',
  '<form id="document" name="location" action="javascript:securityProbe()"><input autofocus onfocus="securityProbe()"></form>',
  '<a href="jav&#x61;script:securityProbe()">Enlace</a><a href="java&#10;script:securityProbe()">Otro</a>',
  '<style>body{display:none}</style><p class="fixed inset-0" style="position:fixed;z-index:999;margin:-200px;background-image:url(https://attacker.invalid/collect);color:#155e75">Texto</p>',
  '<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="><img src="data:text/html;base64,PHNjcmlwdD4=">',
  '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=securityProbe()>">',
  '<svg><foreignObject><p onmouseover="securityProbe()">Contenido</p></foreignObject></svg>',
  '<a href="//attacker.invalid/collect">Externo</a><img src="//attacker.invalid/collect">'
];
for(const html of hostile) {
  const cleaned = sanitize(html);
  assertSafe(cleaned);
  assert.equal(sanitize(cleaned), cleaned, 'Sanitizing is stable');
}
const validHtml = `<h2 style="text-align:center;color:#155e75">Consentimiento informado</h2>
  <p style="font-family:Arial;font-size:12pt;line-height:1.5;margin-bottom:12px">María &amp; José <strong>autorizan</strong> la atención.</p>
  <ol start="2"><li>Información</li><li><em>Revisión</em></li></ol>
  <table style="width:100%;border-collapse:collapse;border:1px solid #cccccc" border="1" cellpadding="6"><thead><tr><th colspan="2">Tratamiento</th></tr></thead>
  <tbody><tr><td>Consulta</td><td>$500.00</td></tr></tbody></table>
  <img src="${png}" alt="Firma" width="200"><a href="https://consultorio.example/aviso">Aviso</a>`;
const valid = assertSafe(sanitize(validHtml));
assert.equal(valid.querySelector('h2').textContent, 'Consentimiento informado');
assert.equal(valid.querySelector('h2').style.textAlign, 'center');
assert.equal(valid.querySelector('p').style.fontSize, '12pt');
assert.equal(valid.querySelector('p').style.lineHeight, '1.5');
assert.equal(valid.querySelector('table').style.width, '100%');
assert.equal(valid.querySelector('table').style.borderCollapse, 'collapse');
assert.equal(valid.querySelector('table').style.borderLeftWidth, '1px');
assert.equal(valid.querySelector('th').getAttribute('colspan'), '2');
assert.equal(valid.querySelectorAll('li').length, 2);
assert.equal(valid.querySelector('img').getAttribute('src'), png);
assert.equal(valid.querySelector('a').getAttribute('rel'), 'noopener noreferrer');
assert(valid.textContent.includes('María & José'));
for(const source of [png, 'https://clinic.example/signature.png', '/images/logo.png', './images/logo.png', '../images/logo.png']) {
  assert.equal(helpers.safeDocumentImageSource(source), source);
}
for(const source of ['javascript:securityProbe()', 'data:image/svg+xml;base64,PHN2Zz4=', '//attacker.invalid/image', 'x" onerror="securityProbe()', 'https://clinic.example/" onload="securityProbe()', '\\attacker.invalid/image']) {
  assert.equal(helpers.safeDocumentImageSource(source), '');
}
function loadComponent(file, extra = {}) {
  const sfc = compiler.parseComponent(read(file));
  assert.deepEqual(compiler.compile(sfc.template.content).errors, [], `${file}: template compiles`);
  const context = { module: { exports: {} }, mapGetters: () => ({}), mapActions: () => ({}), VuexMixin: {}, moduleTypes: {}, fnTypes: {},
    DocumentSignatureOptionsDialog: {}, dialogName: {}, fieldError: {}, localToday: () => '2026-10-14',
    ProfessionalAgendaConfig: {}, PrescriptionConfig: {}, AdminSummary: {}, ClinicalHistoryTemplateConfig: {},
    RolesPermissionsConfig: {}, DAProfessionalProfile: {}, ...helpers, ...extra };
  vm.runInNewContext(stripImports(sfc.script.content).replace('export default', 'module.exports ='), context, { filename: file });
  return context.module.exports;
}
const docsPath = 'src/views/Patient/Sections/DocumentsAndSignatures.vue';
const docs = loadComponent(docsPath);
assert(read(docsPath).includes('v-html="documentContentHtml(selectedDocument)"'), 'Viewer uses the shared sanitizer');
assert(read(docsPath).includes("frame.setAttribute('sandbox', 'allow-same-origin allow-modals')"), 'Print frame cannot execute scripts');
const view = { businessName: '<img src=x onerror=securityProbe()>', patientName: 'Paciente <script>securityProbe()</script>', patientAge: '30 años' };
for(const [name, method] of Object.entries(docs.methods)) view[name] = method.bind(view);
view.visibleSignatures = item => item.signatures;
view.signatureRoleLabel = () => 'Paciente';
view.displayTitle = item => item.title;
view.shortId = value => value;
view.statusLabel = value => value;
view.formatDateTime = value => value;
const document = { title: 'Consentimiento <img src=x onerror=securityProbe()>', id_patient_document: 'historico', status: 'FIRMADO',
  content_html_snapshot: '<p>Borrador anterior</p>', signed_content_html_snapshot: validHtml + hostile.join(''),
  doctor_signature_snapshot: 'x" onerror="securityProbe()', doctor_name_snapshot: 'Doctora <svg onload=securityProbe()>',
  signatures: [{ signature_role: 'PATIENT', signer_name_snapshot: 'Paciente <script>securityProbe()</script>', signature_image: png }] };
const original = JSON.stringify(document);
assertSafe(view.documentContentHtml(document));
const printed = new JSDOM(view.printableHtml(document)).window.document;
assertSafe(printed.querySelector('.content').innerHTML);
assert.equal(printed.querySelectorAll('script,iframe,svg,object').length, 0);
assert.equal(printed.querySelectorAll('[onerror],[onload]').length, 0);
assert.equal(printed.querySelector('.signature-card img').getAttribute('src'), png);
assert(printed.querySelector('style').textContent.includes('@page'), 'Trusted print layout is preserved');
assert.equal(JSON.stringify(document), original, 'A signed snapshot is never changed in memory');
const config = loadComponent('src/views/configuration/index.vue');
const preview = config.computed.documentTemplatePreview.call({ documentTemplateContentForSave: '<p>{{nombrePaciente}}</p>' + hostile.join('') });
assertSafe(preview);
assert(preview.includes('Emili Robles'));
const plan = loadComponent('src/views/Patient/Sections/TreatmentPlan.vue');
const treatment = { px: { person: { name: '<img src=x onerror=securityProbe()>', surname: 'Paciente' } },
  activePlan: { diagnosis: '<strong>texto literal</strong>' }, activeTreatments: [{ name: '<svg onload=securityProbe()>' }],
  currentDoctorName: 'Doctora', currentDoctorProfessionalLicense: '000000' };
for(const [name, method] of Object.entries(plan.methods)) treatment[name] = method.bind(treatment);
const populated = treatment.renderTemplate('<p>{{nombrePaciente}} | {{diagnostico}} | {{planTratamiento}}</p>');
const populatedDom = assertSafe(treatment.textToHtml(populated));
assert.equal(populatedDom.querySelector('img,strong,svg'), null, 'Patient and treatment values remain literal text');
assert(populatedDom.textContent.includes('<img src=x onerror=securityProbe()>'));
const plainTemplate = treatment.renderTemplate('Paciente: {{nombrePaciente}}\nPlan: {{planTratamiento}}');
const plainTemplateDom = assertSafe(treatment.textToHtml(plainTemplate));
assert(plainTemplateDom.textContent.includes('<img src=x onerror=securityProbe()>'), 'A plain-text template preserves literal variable text without double encoding');
assert.equal(plainTemplateDom.querySelectorAll('br').length, 1);
assert.equal(fragment(treatment.textToHtml('Primera línea\nSegunda línea')).querySelectorAll('br').length, 1);
assertSafe(treatment.textToHtml(hostile.join('')));
const publicSignature = loadComponent('src/views/public/PublicDocumentSignature.vue');
const publicView = {};
publicSignature.methods.applyDocumentResponse.call(publicView, { document: { content_html_snapshot: validHtml + hostile.join('') }, patient: { display_name: 'Paciente' } });
assertSafe(publicView.documentHtml);
assert.equal(fragment(publicView.documentHtml).querySelector('img[src^="data:image/png"]').getAttribute('src'), png);
dom.window.close();
console.log('PASS document HTML security: real DOMPurify; stored legacy, internal/public viewers, template preview, print fragments/signatures, treatment substitutions; hostile markup rejected; tables, text styling and raster signatures preserved. No live data or browser used.');
