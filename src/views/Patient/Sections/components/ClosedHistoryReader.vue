<template>
  <div class="closed-history-reader">
    <section class="closed-summary" :aria-busy="String(busy)">
      <p class="closed-kicker">Historia clínica · Solo consulta</p>
      <div class="closed-title-row">
        <h2 ref="versionTitle" tabindex="-1">Historia clínica · Versión {{ metadata.version }}</h2>
        <span class="closed-state">{{ statusLabel }}</span>
      </div>
      <p role="status">{{ versionLabel }}</p>
      <div class="closed-links">
        <button v-if="canViewVersions" type="button" :disabled="busy" @click="$emit('versions')">{{ versionsOpen ? 'Ocultar historial' : 'Ver historial' }}</button>
        <button v-if="canViewVersions && latestId && latestId !== history.id_clinical_history" type="button" :disabled="busy" @click="$emit('latest')">Ir a la versión actual</button>
      </div>
      <slot name="versions" />
      <dl class="closed-metadata">
        <div><dt>Responsable al cierre</dt><dd>{{ responsible }}</dd></div>
        <div v-if="finalizer"><dt>Profesional que cerró esta versión</dt><dd>{{ finalizer }}</dd></div>
        <div><dt>Fecha de cierre</dt><dd>{{ metadata.finalizedAt }}</dd></div>
        <div><dt>Formato utilizado</dt><dd>{{ history.template_name || 'Nombre de formato no registrado' }} · {{ history.template_version_number ? 'v' + history.template_version_number : 'Versión no registrada' }}</dd></div>
        <div><dt>Creación</dt><dd>{{ metadata.createdAt }}</dd></div>
        <div><dt>Capturado por</dt><dd>{{ metadata.createdBy }}</dd></div>
        <div><dt>Última edición</dt><dd>{{ metadata.updatedAt }}</dd></div>
        <div><dt>Última edición por</dt><dd>{{ metadata.updatedBy }}</dd></div>
      </dl>
      <div class="closed-consents">
        <div>
          <h3>Utilizado al cerrar</h3><p><strong>{{ historicalConsent.label }}</strong></p>
          <button v-if="historicalConsent.documentId && canViewConsent" type="button" :disabled="busy || documentBusy" @click="$emit('historical-document')">{{ documentBusy ? 'Consultando documento…' : 'Ver documento del cierre' }}</button>
          <p v-else-if="historicalConsent.documentId">Sin permiso para consultar el documento.</p>
          <p v-if="documentError" role="alert">{{ documentError }}</p>
        </div>
        <div>
          <h3>Vigente hoy</h3><p><strong>{{ currentConsentTitle }}</strong></p>
          <p>El estado actual del consentimiento no modifica esta versión cerrada.</p>
          <p v-if="consentError" role="status">{{ consentError }}</p>
          <button v-if="canViewConsent" type="button" :disabled="busy" @click="$emit('current-documents')">Revisar documentos actuales</button>
          <button v-if="canViewConsent && !consentVerified" type="button" :disabled="busy || consentChecking" @click="$emit('retry-consent')">{{ consentChecking ? 'Verificando…' : 'Reintentar verificación' }}</button>
        </div>
      </div>
      <div class="closed-actions">
        <button v-if="canPrint" class="closed-action" type="button" :disabled="busy" @click="$emit('print')">Imprimir esta versión</button>
        <button v-if="canCreate" class="closed-action" type="button" :disabled="busy" @click="$emit('create')">Crear nueva versión</button>
      </div>
    </section>
    <div class="closed-content-layout">
      <nav v-if="sections.length" class="closed-index" aria-label="Secciones de esta historia cerrada">
        <p class="closed-kicker">En esta versión</p>
        <div class="closed-desktop-index">
          <a v-for="(section,index) in sections" :key="section.key" :href="'#' + sectionId(index)" :aria-current="active===index ? 'location' : null" @click.prevent="jump(index)">{{ section.label }}</a>
        </div>
        <div class="closed-mobile-index">
          <label :for="uid + '-select'">Ir a sección</label>
          <select :id="uid + '-select'" v-model.number="selected"><option v-for="(section,index) in sections" :key="section.key" :value="index">{{ section.label }}</option></select>
          <button type="button" @click="jump(selected)">Ir</button>
        </div>
      </nav>
      <div class="closed-sections">
        <section v-for="(section,index) in sections" :key="section.key" class="closed-section">
          <h3 :id="sectionId(index)" ref="sectionTitles" tabindex="-1">{{ section.label }}</h3>
          <p v-if="section.description">{{ section.description }}</p>
          <dl><div v-for="field in section.fields" :key="field.key" class="closed-field"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></div></dl>
        </section>
        <p v-if="!sections.length" class="closed-section">Esta versión no contiene datos clínicos registrados.</p>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    history:{type:Object,required:true},metadata:{type:Object,required:true},sections:{type:Array,default:()=>[]},historicalConsent:{type:Object,required:true},
    responsible:String,finalizer:String,statusLabel:String,latestId:String,canViewVersions:Boolean,versionsOpen:Boolean,busy:Boolean,
    canPrint:Boolean,canCreate:Boolean,canViewConsent:Boolean,currentConsentTitle:String,consentError:String,consentVerified:Boolean,consentChecking:Boolean,documentBusy:Boolean,documentError:String
  },
  data(){return {uid:'closed-'+this._uid,active:0,selected:0,scrollFrame:null,jumping:false};},
  computed:{versionLabel(){return !this.latestId ? 'Versión consultada' : this.latestId===this.history.id_clinical_history ? 'Última versión registrada' : 'Versión anterior';}},
  watch:{'history.id_clinical_history'(next,previous){this.active=0;this.selected=0;if(next!==previous)this.$nextTick(()=>{const title=this.$refs.versionTitle;if(title){title.focus({preventScroll:true});title.scrollIntoView({block:'start'});}});}},
  mounted(){window.addEventListener('scroll',this.onScroll,true);['wheel','touchmove','pointerdown','keydown'].forEach(event=>window.addEventListener(event,this.onManualNavigation,true));},
  beforeDestroy(){window.removeEventListener('scroll',this.onScroll,true);['wheel','touchmove','pointerdown','keydown'].forEach(event=>window.removeEventListener(event,this.onManualNavigation,true));if(this.scrollFrame)cancelAnimationFrame(this.scrollFrame);},
  methods:{
    sectionId(index){return `${this.uid}-section-${index}`;},
    jump(index){const title=(this.$refs.sectionTitles||[])[index];if(!title)return;this.jumping=true;title.focus({preventScroll:true});title.scrollIntoView({block:'start'});this.active=index;this.selected=index;},
    onManualNavigation(event){if(event.type==='keydown' && !['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;this.jumping=false;},
    onScroll(){if(this.jumping || this.scrollFrame)return;this.scrollFrame=requestAnimationFrame(()=>{this.scrollFrame=null;if(this.jumping)return;const titles=this.$refs.sectionTitles||[];let index=0;titles.forEach((title,i)=>{if(title.getBoundingClientRect().top<=150)index=i;});this.active=index;});}
  }
};
</script>
<style scoped>
.closed-history-reader{--reader-border:#dce5e9;--reader-bg:#fff;--reader-ink:#203c48;--reader-muted:#52656f;--reader-accent:#007b96;color:var(--reader-ink);min-width:0}
.closed-summary,.closed-section{background:var(--reader-bg);border:1px solid var(--reader-border);border-radius:12px;padding:24px;margin-bottom:18px;min-width:0;overflow-wrap:anywhere}
.closed-kicker{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--reader-muted);margin:0 0 8px}
.closed-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}.closed-title-row h2{font-size:23px;margin:0;scroll-margin-top:120px}.closed-state{background:#eef6f8;border:1px solid var(--reader-border);border-radius:20px;padding:6px 12px;font-size:13px}
.closed-links{display:flex;flex-wrap:wrap;gap:18px;margin:12px 0}.closed-history-reader button{cursor:pointer;color:var(--reader-accent);min-height:44px;background:transparent;text-align:left}.closed-history-reader button:disabled{opacity:.6;cursor:default}.closed-history-reader button:focus-visible,.closed-history-reader a:focus-visible,.closed-history-reader select:focus-visible{outline:2px solid var(--reader-accent);outline-offset:3px}
.closed-metadata{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:24px 0}.closed-history-reader dt{font-size:13px;color:var(--reader-muted);margin-bottom:6px}.closed-history-reader dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px}.closed-consents{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;border-top:1px solid var(--reader-border);padding:20px 0}.closed-consents h3{font-size:14px;color:var(--reader-muted);font-weight:400;margin:0}.closed-consents p{font-size:14px;margin:10px 0}.closed-consents button{display:block;text-decoration:underline}.closed-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;border-top:1px solid var(--reader-border);padding-top:16px}.closed-actions .closed-action{border:1px solid var(--reader-accent);border-radius:8px;padding:10px 16px;font-weight:600}
.closed-content-layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:20px;align-items:start}.closed-index{position:sticky;top:100px;border:1px solid var(--reader-border);background:var(--reader-bg);padding:14px;border-radius:10px;max-height:calc(100vh - 130px);overflow:auto}.closed-index a{display:block;min-height:44px;padding:10px;color:var(--reader-muted);border-radius:5px;text-decoration:none;font-size:14px;overflow-wrap:anywhere}.closed-index a[aria-current]{background:#e6f5f7;color:var(--reader-accent);font-weight:600}.closed-mobile-index{display:none}.closed-section h3{font-size:18px;margin:0 0 18px;scroll-margin-top:150px}.closed-section dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.closed-field{min-width:0}.closed-section p{white-space:pre-wrap}
html[data-theme="clinical-night"] .closed-history-reader{--reader-border:#3b5362;--reader-bg:#182d3b;--reader-ink:#e8f0f6;--reader-muted:#b7c7d3;--reader-accent:#81d4ec}html[data-theme="clinical-night"] .closed-state,html[data-theme="clinical-night"] .closed-index a[aria-current]{background:#233f4f}
@media(max-width:767px){.closed-summary,.closed-section{padding:16px}.closed-title-row h2{font-size:21px}.closed-metadata,.closed-consents,.closed-section dl{grid-template-columns:minmax(0,1fr)}.closed-content-layout{display:block}.closed-index{top:60px;z-index:3;max-height:none;overflow:visible;margin-bottom:14px}.closed-index>.closed-kicker,.closed-desktop-index{display:none}.closed-mobile-index{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;align-items:center}.closed-mobile-index label{grid-column:1/-1;font-size:13px}.closed-mobile-index select{width:100%;min-width:0;min-height:44px;background:var(--reader-bg);color:var(--reader-ink);border:1px solid var(--reader-border);border-radius:6px;padding:6px}.closed-mobile-index button{padding:8px}.closed-actions .closed-action{flex:1 1 180px;text-align:center}}
</style>
