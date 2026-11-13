<template>
  <aside v-if="allowed" class="pulse-entry" aria-labelledby="pulse-entry-title">
    <div class="pulse-entry-symbol" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-opacity=".2" />
        <ellipse cx="32" cy="32" rx="25" ry="12" transform="rotate(-35 32 32)" stroke="currentColor" stroke-width="1.5" />
        <ellipse cx="32" cy="32" rx="25" ry="12" transform="rotate(35 32 32)" stroke="currentColor" stroke-opacity=".45" stroke-width="1.5" />
        <circle cx="32" cy="32" r="6" fill="currentColor" />
        <circle cx="51" cy="17" r="3" fill="currentColor" />
      </svg>
    </div>
    <div class="pulse-entry-copy">
      <p class="pulse-entry-eyebrow">Una mirada al consultorio</p>
      <h2 id="pulse-entry-title">Pulso del consultorio</h2>
      <p class="pulse-entry-description">Conoce el estado actual y descubre qué necesita atención.</p>
      <router-link class="pulse-entry-link" :to="{name:'business-pulse'}">
        Explorar Pulso <span aria-hidden="true">→</span>
      </router-link>
    </div>
  </aside>
</template>
<script>
import { canAccessPulse } from '../../security/pulseAccess';
export default { computed: { allowed() { const a = this.$store.state.CORE.AUTH; return canAccessPulse(a.permissions,a.role) && (!a.tenantOperational || a.tenantOperational.allowed !== false); } } };
</script>
<style scoped>
.pulse-entry {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: start;
  gap: 20px;
  margin: 18px 0;
  padding: 24px;
  border: 1px solid #d6e6ea;
  border-radius: 20px;
  background: linear-gradient(120deg, #f0f8f8 0%, #f8fafc 65%, #f1f5fc 100%);
  color: #183d49;
  box-shadow: 0 6px 20px rgba(24, 56, 74, .04);
}
.pulse-entry-symbol { display: grid; place-items: center; width: 72px; height: 72px; border: 1px solid #d4e7e8; border-radius: 22px; background: rgba(255, 255, 255, .8); color: #247781; }
.pulse-entry-symbol svg { width: 58px; height: 58px; }
.pulse-entry-copy { min-width: 0; }
.pulse-entry-eyebrow { margin: 0 0 6px; font-size: 10px; line-height: 1.5; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: #486b78; }
.pulse-entry h2 { margin: 0; font-size: 19px; line-height: 1.35; font-weight: 600; color: inherit; }
.pulse-entry-description { margin: 8px 0 16px; font-size: 14px; line-height: 1.6; color: #526778; }
.pulse-entry-link { display: inline-flex; align-items: center; justify-content: center; gap: 18px; min-height: 44px; padding: 9px 14px; border: 1px solid #bdd6db; border-radius: 11px; background: rgba(255, 255, 255, .8); color: #175b66; font-size: 13px; line-height: 1.5; font-weight: 600; text-decoration: none; }
.pulse-entry-link:hover { border-color: #71a8af; background: #e4f2f3; }
.pulse-entry-link:focus-visible { outline: 3px solid #287588; outline-offset: 4px; }
.theme--dark .pulse-entry, html[data-theme="clinical-night"] .pulse-entry { background: linear-gradient(120deg, #182e36, #1c283d); border-color: #384e61; color: #deedf5; }
.theme--dark .pulse-entry-symbol, html[data-theme="clinical-night"] .pulse-entry-symbol { background: #203a45; border-color: #3c5866; color: #8dcdd1; }
.theme--dark .pulse-entry-eyebrow, html[data-theme="clinical-night"] .pulse-entry-eyebrow { color: #a5cbd4; }
.theme--dark .pulse-entry-description, html[data-theme="clinical-night"] .pulse-entry-description { color: #b6c9d8; }
.theme--dark .pulse-entry-link, html[data-theme="clinical-night"] .pulse-entry-link { background: #243e4a; border-color: #527280; color: #c0ecee; }
.theme--dark .pulse-entry-link:hover, html[data-theme="clinical-night"] .pulse-entry-link:hover { background: #304d5b; }
@media (max-width: 600px) {
  .pulse-entry { grid-template-columns: 48px minmax(0, 1fr); gap: 14px; padding: 18px; }
  .pulse-entry-symbol { width: 48px; height: 48px; border-radius: 15px; }
  .pulse-entry-symbol svg { width: 40px; height: 40px; }
  .pulse-entry h2 { font-size: 18px; }
}
</style>
