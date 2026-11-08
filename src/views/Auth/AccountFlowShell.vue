<template>
  <main class="medsync-auth-screen auth-clinic-screen account-flow" lang="es">
    <section class="auth-card-panel" aria-labelledby="account-title">
      <div class="auth-card">
        <header class="auth-brand">
          <div class="auth-logo-lockup"><medsync-brand :custom-logo="customLogo" @error="customLogo = ''" /></div>
        </header>
        <nav class="account-steps" aria-label="Pasos del registro">
          <ol>
            <li v-for="(label, index) in ['Crear cuenta', 'Verificar correo', 'Cuenta lista']" :key="label"
              :aria-current="step === index + 1 ? 'step' : null" :class="{ complete: step > index + 1 }">
              <span class="account-steps__number" aria-hidden="true"><v-icon v-if="step > index + 1" x-small>mdi-check</v-icon><template v-else>{{ index + 1 }}</template></span>
              <span class="account-steps__label">{{ label }}</span>
            </li>
          </ol>
        </nav>
        <div class="login-form"><slot /></div>
      </div>
    </section>
    <section class="auth-visual-panel" aria-label="Seguridad clínica MedSync">
      <div class="visual-content">
        <medsync-brand class="clinic-brand" />
        <h2>Control clínico<br>con precisión y <span>trazabilidad.</span></h2>
        <p>
          Acceso protegido para equipos clínicos, sesiones auditables y datos médicos tratados con cuidado operativo.
        </p>
        <div class="trust-strip" aria-label="Controles de confianza">
          <span><v-icon small color="var(--color-primary-200)">mdi-lock-check-outline</v-icon> Acceso seguro</span>
          <span><v-icon small color="var(--color-primary-200)">mdi-clipboard-pulse-outline</v-icon> Control de sesiones</span>
          <span><v-icon small color="var(--color-primary-200)">mdi-shield-account-outline</v-icon> Datos clínicos protegidos</span>
        </div>
      </div>
      <div class="clinical-field" aria-hidden="true">
        <span class="field-curve"></span>
        <span class="blueprint-line line-a"></span>
        <span class="blueprint-line line-b"></span>
        <span class="blueprint-line line-c"></span>
        <span class="grid-node node-a"></span>
        <span class="grid-node node-b"></span>
        <span class="grid-node node-c"></span>
        <span class="grid-node node-d"></span>
        <span class="scan-line"></span>
      </div>
    </section>
  </main>
</template>
<script>
import { getStoredLoginLogo } from '../../utils/branding';
export default {
  props: { step: { type: Number, default: 1 } },
  data: () => ({ customLogo: getStoredLoginLogo() || '' })
};
</script>
<style src="./authPalette.css"></style>
<style scoped src="./authScreen.css"></style>
<style scoped>
/* Registration and activation need document scrolling for their longer forms. */
.account-flow { overflow-y:auto; }
.account-flow .auth-card { flex-shrink:0; }
.account-steps { margin:0 0 28px; }
.account-steps ol { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); list-style:none; margin:0; padding:0; }
.account-steps li { position:relative; display:flex; flex-direction:column; align-items:center; gap:10px; min-width:0; color:var(--color-grey); text-align:center; }
.account-steps li:not(:last-child)::after { content:''; position:absolute; top:17px; left:calc(50% + 24px); width:calc(100% - 48px); height:2px; border-radius:2px; background:var(--auth-border); }
.account-steps li.complete::after { background:var(--color-primary-700); }
.account-steps__number { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border:1px solid var(--auth-border); border-radius:50%; font-size:14px; font-weight:600; background:var(--color-surface); }
.account-steps__label { padding:0 4px; font-size:12px; line-height:1.4; }
.account-steps li[aria-current=step] { color:var(--color-primary-700); font-weight:700; }
.account-steps li[aria-current=step] .account-steps__number { background:var(--color-primary-700); border-color:var(--color-primary-700); color:white; box-shadow:0 0 0 4px var(--color-primary-100); }
.account-steps .complete { color:var(--color-primary-700); }
.account-steps .complete .account-steps__number { background:var(--color-primary-100); border-color:var(--color-primary-200); }
.account-steps .complete .v-icon { color:inherit; font-size:18px!important; }
@media(max-width:360px) { .account-steps__label { font-size:11px; } }
</style>
