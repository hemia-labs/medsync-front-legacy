<template>
    <section class="settings-summary">
        <aside v-if="licenseDemoAvailable" class="settings-demo settings-panel">
            <p>Plan Profesional · Vista de prueba</p>
            <p class="settings-summary-muted">Revisa el recorrido de activación sin cobros ni cambios en tu licencia.</p>
            <router-link to="/activar-cuenta/demo" class="settings-summary-link">Probar activación de Profesional</router-link>
        </aside>
        <preparation-checklist show-completed />
        <div v-if="canView('identity') || canView('plan-billing')" class="settings-overview">
            <article v-if="canView('identity')" class="settings-panel">
                <div class="settings-panel-heading"><h2>Tu consultorio</h2><v-icon size="19" color="inherit" aria-hidden="true">mdi-office-building-outline</v-icon></div>
                <h3>{{ business.name || 'Consultorio' }}</h3>
                <p class="settings-summary-muted">Identidad y datos de contacto</p>
                <p class="settings-overview-copy">Revisa el nombre, logo, teléfono y domicilio que utiliza tu consultorio.</p>
                <router-link to="/admin?section=identity" class="settings-summary-link">Ver información <v-icon size="16" color="inherit" aria-hidden="true">mdi-arrow-right</v-icon></router-link>
            </article>
            <article v-if="canView('plan-billing')" class="settings-panel">
                <div class="settings-panel-heading"><h2>Tu suscripción</h2><span class="settings-summary-badge">{{ statusLabel }}</span></div>
                <h3>{{ planLabel }}</h3>
                <p class="settings-summary-muted">Plan del consultorio</p>
                <p class="settings-overview-copy">Consulta los detalles de tu suscripción, el último pago confirmado y las opciones disponibles.</p>
                <router-link to="/admin?section=plan-billing" class="settings-summary-link">Administrar plan <v-icon size="16" color="inherit" aria-hidden="true">mdi-arrow-right</v-icon></router-link>
            </article>
        </div>
        <article class="settings-panel settings-personalization">
            <div class="settings-panel-heading"><div><h2>Personalización</h2><p class="settings-summary-muted">Ajustes opcionales para tu forma de trabajar.</p></div></div>
            <div v-for="item in items" :key="item.label" class="settings-summary-row">
                <div class="settings-summary-label"><h3>{{ item.label }}</h3><p class="settings-summary-muted">{{ item.detail }}</p></div>
                <span class="settings-summary-value">{{ item.value }}</span>
                <router-link :to="item.path" class="settings-summary-link">Configurar<span class="sr-only"> {{ item.label.toLowerCase() }}</span><v-icon size="16" color="inherit" aria-hidden="true">mdi-arrow-right</v-icon></router-link>
            </div>
        </article>
    </section>
</template>

<script>
import PreparationChecklist from './PreparationChecklist.vue';
export default {
    components: { PreparationChecklist },
    props: {
        items: { type:Array, default:()=>[] },
        business: { type:Object, default:()=>({}) },
        sections: { type:Array, default:()=>[] }
    },
    computed: {
        licenseDemoAvailable() { return process.env.NODE_ENV === 'development' && !this.business.registrationActivationConfirmed },
        planLabel() { return ({basic:'Individual',pro:'Profesional',professional:'Profesional',enterprise:'Clínica'})[this.business.plan] || 'Consultar plan' },
        statusLabel() { return ({trial:'En prueba',trialing:'En prueba',active:'Activa',past_due:'Pago pendiente',suspended:'Suspendida',cancelled:'Cancelada',canceled:'Cancelada',expired:'Vencida'})[this.business.subscriptionStatus || this.business.subscription_status] || 'Consultar estado' }
    },
    methods: { canView(key) { return this.sections.some(section=>section.key===key) } }
}
</script>

<style scoped>
.settings-summary { min-width:0; }
.settings-panel { padding:22px; border:1px solid var(--settings-border); border-radius:10px; background:var(--settings-surface); color:var(--settings-ink); min-width:0; }
.settings-demo { margin-bottom:20px; }
.settings-overview { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-bottom:20px; }
.settings-panel-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
.settings-panel-heading h2 { margin:0; font-size:15px; line-height:1.4; font-weight:600; }
.settings-panel-heading>.v-icon { color:var(--settings-muted)!important; }
.settings-panel h3 { margin:0; font-size:20px; font-weight:600; line-height:1.4; letter-spacing:-.02em; overflow-wrap:anywhere; }
.settings-summary-muted { margin:4px 0 0; font-size:13px; color:var(--settings-muted); line-height:1.6; }
.settings-overview-copy { margin:18px 0 12px; font-size:13px; color:var(--settings-muted); line-height:1.7; }
.settings-summary-link { display:inline-flex; align-items:center; gap:7px; min-height:36px; color:var(--color-primary-700); font-size:13px; font-weight:600; }
.settings-summary-link:hover { text-decoration:underline; }
.settings-summary-badge { border-radius:5px; padding:4px 8px; background:var(--settings-soft); color:var(--settings-muted); font-size:11px; font-weight:600; }
.settings-personalization .settings-panel-heading { margin-bottom:4px; }
.settings-summary-row { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:18px; align-items:center; padding:18px 0; }
.settings-summary-row + .settings-summary-row { border-top:1px solid var(--settings-border); }
.settings-summary-row:last-child { padding-bottom:0; }
.settings-summary-label h3 { font-size:14px; letter-spacing:0; font-weight:500; }
.settings-summary-value { font-size:13px; color:var(--settings-muted); overflow-wrap:anywhere; }
.settings-summary-label { min-width:0; }
@media(max-width:750px) { .settings-overview { grid-template-columns:minmax(0,1fr); } }
@media(max-width:639px) { .settings-panel { padding:18px; } .settings-summary-row { grid-template-columns:minmax(0,1fr) auto; gap:8px 12px; } .settings-summary-row>.settings-summary-link { grid-column:1/-1; justify-self:start; } .settings-summary-link { min-height:44px; } }
</style>
