<template>
  <main class="license-demo" aria-labelledby="license-title">
    <div class="license-shell">
      <header class="license-header">
        <span class="license-brand">MedSync<span>Tu consultorio, listo para comenzar</span></span>
        <router-link to="/admin?section=summary" class="license-link">Volver a Configuración</router-link>
      </header>

      <aside class="demo-notice" aria-label="Modo de demostración">
        <strong>Vista de prueba</strong>
        <span>Recorre la activación del plan Profesional. No se realizan cobros ni se modifica tu licencia.</span>
      </aside>

      <ol class="license-steps" aria-label="Pasos de activación">
        <li v-for="(label, index) in steps" :key="label" :aria-current="stepIndex === index ? 'step' : null" :class="{ current: stepIndex === index, done: stepIndex > index }">
          <span aria-hidden="true">{{ index + 1 }}</span>{{ label }}
        </li>
      </ol>

      <div class="license-grid">
        <section class="license-content">
          <p class="license-eyebrow">{{ stage === 'complete' ? 'Siguiente paso' : 'Activa tu consultorio' }}</p>
          <h1 id="license-title" ref="heading" tabindex="-1">{{ title }}</h1>

          <template v-if="stage === 'plan'">
            <p class="license-lead">Comienza con Profesional y después prepara tu consultorio a tu ritmo.</p>
            <article class="professional-card" aria-labelledby="professional-title">
              <span class="plan-label">Plan disponible en este recorrido</span>
              <h2 id="professional-title">Profesional</h2>
              <p>Un punto de partida para organizar tu práctica y configurar tu espacio de trabajo.</p>
              <div class="plan-price">Precio por confirmar<span>El importe y las condiciones se mostrarán antes de contratar.</span></div>
              <ul class="plan-benefits">
                <li>Prepara los datos de tu consultorio.</li>
                <li>Revisa tu perfil, agenda y documentos.</li>
                <li>Continúa con la guía cuando la necesites.</li>
              </ul>
              <button type="button" class="license-primary" @click="go('review')">Continuar con Profesional</button>
            </article>
          </template>

          <template v-else-if="stage === 'review'">
            <p class="license-lead">Antes del pago real podrás revisar el importe, la periodicidad y el contrato de tu plan.</p>
            <dl class="license-review">
              <div><dt>Plan</dt><dd>Profesional</dd></div>
              <div><dt>Importe, impuestos y periodicidad</dt><dd>Pendientes de confirmar</dd></div>
              <div><dt>Cobro en esta prueba</dt><dd>Ninguno</dd></div>
            </dl>
            <div class="legal-preview">
              <h2>Contrato del plan</h2>
              <p>En el flujo definitivo aparecerá aquí el contrato publicado de Profesional. Esta prueba no registra una aceptación legal ni autoriza renovaciones.</p>
            </div>
            <label class="demo-check"><input v-model="reviewed" type="checkbox"> <span>Entiendo que esta activación es una simulación y no genera un cobro.</span></label>
            <p v-if="validationError" class="license-error" role="alert">{{ validationError }}</p>
            <div class="license-actions">
              <button type="button" class="license-primary" @click="simulate">Simular pago y activación</button>
              <button type="button" class="license-secondary" @click="go('plan')">Volver al plan</button>
            </div>
          </template>

          <template v-else-if="stage === 'processing'">
            <div class="license-state" role="status" aria-live="polite">
              <span class="state-symbol" aria-hidden="true">…</span>
              <h2>Procesando la simulación</h2>
              <p>Estamos comprobando el resultado de este recorrido de prueba.</p>
            </div>
          </template>

          <template v-else-if="stage === 'pending'">
            <div class="license-state" role="status">
              <span class="state-symbol" aria-hidden="true">…</span>
              <h2>La confirmación sigue pendiente</h2>
              <p>En un pago real conservaríamos este intento mientras verificamos su resultado. No necesitas iniciar otro pago.</p>
              <p class="simulation-caption">Escenario simulado: no se ha enviado ninguna transacción.</p>
            </div>
          </template>

          <template v-else-if="stage === 'failed'">
            <div class="license-state" role="alert">
              <span class="state-symbol state-symbol--error" aria-hidden="true">!</span>
              <h2>No se pudo completar la simulación</h2>
              <p>Tu selección de Profesional se conserva. Puedes revisar el resumen e intentarlo de nuevo.</p>
            </div>
            <button type="button" class="license-primary" @click="go('review')">Revisar y reintentar</button>
          </template>

          <template v-else-if="stage === 'complete'">
            <div class="license-state">
              <span class="state-symbol state-symbol--success" aria-hidden="true">✓</span>
              <h2>Activación simulada completada</h2>
              <p>Después de confirmar el pago real, llegarás al Resumen de configuración para ver tus pendientes y decidir cuándo comenzar la guía.</p>
              <p class="simulation-caption">Tu licencia actual y el avance de tus guías siguen como estaban.</p>
            </div>
            <router-link to="/admin?section=summary" class="license-primary">Ver Resumen de configuración</router-link>
            <p class="license-footnote">Se abrirá tu configuración habitual, con los permisos de tu sesión. La guía no se inicia automáticamente.</p>
          </template>
        </section>

        <aside class="license-next" aria-labelledby="license-next-title">
          <span class="license-eyebrow">Después de activar</span>
          <h2 id="license-next-title">Todo empieza con tu consultorio</h2>
          <p>En el Resumen encontrarás lo que falta preparar, sin volver a capturar los datos que ya guardaste.</p>
          <ol>
            <li><strong>Revisa tus pendientes</strong><span>Datos del consultorio, perfil y ajustes que te correspondan.</span></li>
            <li><strong>Elige por dónde seguir</strong><span>Abre un apartado o solicita la guía paso a paso.</span></li>
            <li><strong>Retoma cuando quieras</strong><span>La preparación y la ayuda conservan sus avances por separado.</span></li>
          </ol>
        </aside>
      </div>

      <details class="demo-controls" :open="stage === 'pending'">
        <summary>Escenarios de prueba</summary>
        <div class="demo-control-row">
          <label>Resultado de la próxima simulación
            <select v-model="outcome" :disabled="stage === 'processing' || stage === 'pending'">
              <option value="success">Activación completada</option>
              <option value="pending">Confirmación pendiente</option>
              <option value="failure">No se pudo completar</option>
            </select>
          </label>
          <button v-if="stage === 'pending'" type="button" class="license-secondary" @click="go('complete')">Confirmar simulación pendiente</button>
          <button type="button" class="license-secondary" @click="reset">Reiniciar recorrido</button>
        </div>
        <p>Al recargar se reinicia esta demostración. No se guarda información ni se conecta con pagos.</p>
      </details>
    </div>
  </main>
</template>

<script>
export default {
  name: 'LicenseActivationDemo',
  data: () => ({ stage: 'plan', reviewed: false, outcome: 'success', validationError: '', timer: null,
    steps: ['Tu plan', 'Revisar y confirmar', 'Preparar consultorio'] }),
  computed: {
    stepIndex() { return this.stage === 'plan' ? 0 : this.stage === 'complete' ? 2 : 1; },
    title() { return ({ plan: 'Tu siguiente paso, Profesional', review: 'Revisa tu elección', processing: 'Verificando la activación',
      pending: 'Conservamos tu intento', failed: 'Puedes volver a intentarlo', complete: 'Ahora, prepara tu consultorio' })[this.stage]; }
  },
  beforeDestroy() { this.clearTimer(); },
  methods: {
    clearTimer() { if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; } },
    go(stage) {
      this.clearTimer();
      this.stage = stage;
      this.validationError = '';
      this.$nextTick(() => { if (this.$refs.heading) this.$refs.heading.focus(); });
    },
    simulate() {
      if (this.stage !== 'review') return;
      if (!this.reviewed) { this.validationError = 'Confirma que entiendes el carácter de prueba para continuar.'; return; }
      const outcome = this.outcome;
      this.go('processing');
      this.timer = setTimeout(() => { this.timer = null; this.go(({ success: 'complete', pending: 'pending', failure: 'failed' })[outcome] || 'failed'); }, 700);
    },
    reset() { this.reviewed = false; this.outcome = 'success'; this.go('plan'); }
  }
};
</script>

<style scoped>
.license-demo { min-height:100vh; background:#f3f7f8; color:#18333b; padding:28px 24px 48px; font-family:inherit; }
.license-shell { max-width:1060px; margin:0 auto; }
.license-header { display:flex; align-items:center; justify-content:space-between; gap:24px; margin-bottom:24px; }
.license-brand { font-size:25px; font-weight:600; letter-spacing:-.7px; color:#0d5258; }
.license-brand span { display:block; font-size:12px; font-weight:500; letter-spacing:0; margin-top:2px; color:#52656c; }
.license-link { color:#155e65; font-size:14px; text-decoration:underline; }
.demo-notice { display:flex; align-items:baseline; gap:14px; padding:14px 18px; background:#fff6db; border:1px solid #e8d399; border-radius:12px; color:#66501c; font-size:14px; }
.demo-notice strong { flex-shrink:0; }
.license-steps { display:flex; gap:24px; list-style:none; padding:0; margin:28px 0; color:#54696e; font-size:13px; }
.license-steps li { display:flex; align-items:center; gap:9px; }
.license-steps li > span { display:grid; place-items:center; width:28px; height:28px; flex-shrink:0; border-radius:50%; border:1px solid #9bafb4; }
.license-steps .current { font-weight:600; color:#0c5d60; }
.license-steps .current > span,.license-steps .done > span { background:#0c6265; border-color:#0c6265; color:white; }
.license-grid { display:grid; grid-template-columns:minmax(0,1.65fr) minmax(0,1fr); gap:28px; align-items:start; }
.license-content { background:white; padding:32px; border:1px solid #d9e4e7; border-radius:20px; box-shadow:0 8px 28px #18333b07; min-width:0; }
.license-eyebrow { display:block; margin:0 0 9px; color:#397076; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1.4px; }
.license-content h1 { font-size:30px; line-height:1.2; letter-spacing:-.8px; margin:0 0 14px; color:#173840; }
.license-lead { font-size:15px; line-height:1.65; color:#51676e; margin:0 0 24px; }
.professional-card { padding:25px; border:2px solid #388a88; border-radius:15px; background:linear-gradient(135deg,#f2fbf8,white 65%); }
.plan-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.7px; color:#226b69; }
.professional-card h2 { font-size:28px; margin:9px 0; }
.professional-card p { color:#52686f; font-size:14px; line-height:1.6; }
.plan-price { font-size:22px; font-weight:600; margin:24px 0; }
.plan-price span { display:block; font-size:12px; font-weight:400; line-height:1.5; color:#52686f; margin-top:5px; }
.plan-benefits { margin:0 0 24px; padding-left:20px; font-size:14px; line-height:1.7; }
.plan-benefits li { margin-bottom:7px; }
.license-primary,.license-secondary { display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:11px 18px; border-radius:9px; font:inherit; font-size:14px; font-weight:600; line-height:1.4; cursor:pointer; text-decoration:none; text-align:center; }
.license-primary { background:#0d6465; color:white!important; border:1px solid #0d6465; }
.license-primary:hover { background:#084d4e; }
.professional-card .license-primary { width:100%; }
.license-secondary { border:1px solid #afc3c8; background:white; color:#29545c; }
.license-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:20px; }
.license-next { padding:25px 12px; }
.license-next h2 { font-size:23px; line-height:1.3; margin:0 0 14px; letter-spacing:-.4px; }
.license-next p,.license-next li span { font-size:14px; color:#52686f; line-height:1.65; }
.license-next ol { list-style:none; margin:28px 0 0; padding:0; counter-reset:next; }
.license-next li { position:relative; padding-left:36px; margin-bottom:24px; counter-increment:next; }
.license-next li::before { content:counter(next); position:absolute; left:0; color:#307b79; font-size:14px; font-weight:600; }
.license-next li strong,.license-next li span { display:block; }
.license-next li strong { font-size:14px; margin-bottom:5px; }
.license-review { margin:24px 0; }
.license-review > div { display:flex; justify-content:space-between; gap:20px; padding:14px 0; border-bottom:1px solid #e0e8ea; font-size:14px; }
.license-review dt { color:#52686f; }
.license-review dd { margin:0; font-weight:600; text-align:right; }
.legal-preview { background:#f2f6f7; padding:18px; border-radius:10px; margin:24px 0; }
.legal-preview h2 { font-size:16px; margin:0 0 8px; }
.legal-preview p,.license-state p { font-size:14px; line-height:1.65; margin:0; color:#52686f; }
.demo-check { display:flex; align-items:flex-start; gap:12px; cursor:pointer; font-size:14px; line-height:1.6; padding:10px 0; }
.demo-check input { flex-shrink:0; width:20px; height:20px; margin-top:2px; accent-color:#0d6465; }
.license-error { color:#a32323; font-size:14px; margin:10px 0; }
.license-state { padding:24px 0; }
.state-symbol { display:grid; place-items:center; width:52px; height:52px; font-size:27px; background:#edf2f4; color:#3c626b; border-radius:16px; margin-bottom:20px; }
.state-symbol--success { background:#e0f4e9; color:#1a6b44; }
.state-symbol--error { background:#fff0e6; color:#914712; }
.license-state h2 { font-size:20px; margin:0 0 12px; }
.license-state .simulation-caption { margin-top:14px; font-size:12px; }
.license-footnote { font-size:12px; line-height:1.6; color:#52686f; margin:16px 0 0; }
.demo-controls { margin-top:26px; padding:16px 20px; border:1px dashed #9db2b8; border-radius:12px; color:#455f67; font-size:13px; }
.demo-controls summary { cursor:pointer; padding:5px 0; font-weight:600; }
.demo-control-row { display:flex; flex-wrap:wrap; align-items:flex-end; gap:16px; margin:18px 0; }
.demo-control-row label { display:flex; flex-direction:column; gap:6px; }
.demo-control-row select { appearance:auto; border:1px solid #9db2b8; border-radius:6px; padding:10px; background:white; font:inherit; min-height:44px; max-width:100%; }
.demo-controls p { margin:0; line-height:1.6; }
.license-demo :focus-visible { outline:3px solid #bd7309; outline-offset:4px; }
.license-demo h1:focus { outline:none; }
@media(max-width:720px) {
  .license-demo { padding:20px 16px 32px; }
  .license-grid { grid-template-columns:minmax(0,1fr); gap:6px; }
  .license-content { padding:24px 20px; }
  .license-content h1 { font-size:27px; }
  .license-steps { gap:12px; justify-content:space-between; font-size:11px; }
  .license-steps li { flex:1; align-items:flex-start; flex-direction:column; }
  .demo-notice { flex-direction:column; gap:5px; font-size:13px; }
  .professional-card { padding:20px; }
  .license-header { align-items:flex-start; gap:16px; }
  .license-brand span { max-width:170px; }
  .license-link { max-width:110px; text-align:right; font-size:12px; }
  .license-actions > * { width:100%; }
  .license-review > div { flex-direction:column; gap:5px; }
  .license-review dd { text-align:left; }
  .demo-control-row label { width:100%; }
}
</style>
