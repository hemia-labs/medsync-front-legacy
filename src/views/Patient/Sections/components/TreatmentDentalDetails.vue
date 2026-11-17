<template>
  <section class="treatment-dental-details">
    <action-confirm ref="confirmation" />
    <template v-if="!importOpen">
      <div class="dental-toolbar">
        <p>{{ teeth.length ? teeth.length + (teeth.length === 1 ? ' diente seleccionado' : ' dientes seleccionados') : 'Sin dientes seleccionados' }}</p>
        <button v-if="canRead" ref="importButton" type="button" class="dental-button" :disabled="busy || loading" @click="openImport">Usar dientes de un odontograma</button>
      </div>
      <treatment-tooth-picker :teeth="teeth" :busy="busy" @toggle="$emit('toggle-tooth', $event)" />
      <div v-if="teeth.length" class="selected-summary">
        <p class="dental-help">Seleccionados en ambas denticiones. Elige un diente para revisar sus caras o su vínculo.</p>
        <div class="selected-teeth" role="group" aria-label="Revisar dientes seleccionados">
          <button v-for="tooth in teeth" :key="tooth" type="button" class="dental-button tooth-summary" :disabled="busy"
            :aria-expanded="expandedTooth === tooth" :aria-label="'Revisar diente ' + tooth" @click="expandedTooth = expandedTooth === tooth ? '' : tooth">
            <strong>{{ tooth }}</strong><span>{{ faceSummary(detail(tooth).surfaces, tooth) }}</span><span v-if="(detail(tooth).sources || []).length || detail(tooth).sources_redacted" class="source-badge">Odontograma</span>
          </button>
        </div>
      </div>
      <section v-if="expandedTooth && teeth.includes(expandedTooth)" class="dental-piece" :aria-label="'Detalle del diente ' + expandedTooth">
        <div class="dental-toolbar"><h5>Diente {{ expandedTooth }} · Caras a tratar</h5><button class="dental-button" type="button" :disabled="busy" @click="$emit('toggle-tooth', expandedTooth)">Quitar diente</button></div>
        <p class="dental-help">Opcional. Marca las caras que atenderás. Si no necesitas precisarlas, déjalas sin seleccionar.</p>
        <div class="dental-faces" role="group" :aria-label="'Caras del diente ' + expandedTooth">
          <button v-for="face in 'MODVL'" :key="face" class="dental-button" type="button" :disabled="busy" :aria-pressed="Boolean(manualFaces(detail(expandedTooth)) && manualFaces(detail(expandedTooth)).includes(face))" @click="toggleFace(expandedTooth, face)">{{ faceName(face, expandedTooth) }}</button>
        </div>
        <p class="dental-help">Caras incluidas en el tratamiento: <strong>{{ faceSummary(detail(expandedTooth).surfaces, expandedTooth) }}</strong></p>
        <details v-if="(detail(expandedTooth).sources || []).length || detail(expandedTooth).sources_redacted" class="dental-advanced">
          <summary>Vínculos con odontogramas</summary>
          <p class="dental-help">Las caras del odontograma también se incluyen. Quitar un vínculo cambia este tratamiento; no cambia el odontograma.</p>
          <label class="check-label"><input type="checkbox" :checked="detail(expandedTooth).manual" :disabled="busy" @change="update(expandedTooth, { manual: $event.target.checked, clear_manual: !$event.target.checked })" /> Conservar este diente si se quitan sus vínculos</label>
          <p v-if="detail(expandedTooth).sources_redacted" class="dental-help">No tienes acceso a todos los vínculos. Se conservarán al guardar.</p>
          <div v-for="source in detail(expandedTooth).sources || []" :key="source.source_key || source.id_chart + ':' + source.finding_id" class="source-row">
            <span>{{ source.context ? source.context.label : 'Diente seleccionado' }} · Versión {{ source.revision }} · {{ faceSummary(source.context && source.context.surfaces, expandedTooth) }}</span>
            <button v-if="canRead" type="button" class="dental-button" :disabled="busy" @click="removeSource(expandedTooth, source)">Quitar vínculo</button>
          </div>
        </details>
      </section>
    </template>
    <section v-else class="dental-import" aria-label="Usar dientes de un odontograma">
      <p class="dental-help">Elige lo que deseas incluir en este tratamiento. El odontograma original no cambia.</p>
      <label class="import-label">Odontograma
        <select v-model="sourceId" :disabled="loading || busy" @change="loadSource"><option value="">Selecciona un odontograma</option><option v-for="chart in charts" :key="chart.id_chart" :value="chart.id_chart">{{ chartLabel(chart) }}</option></select>
      </label>
      <fieldset class="import-mode"><legend>¿Qué deseas incluir?</legend>
        <label><input type="radio" name="tp3-import-mode" :checked="selectionMode === 'teeth'" :disabled="loading || busy" @click.prevent="changeSelectionMode('teeth')" /> Dientes <small>Solo la selección de dientes.</small></label>
        <label><input type="radio" name="tp3-import-mode" :checked="selectionMode === 'findings'" :disabled="loading || busy" @click.prevent="changeSelectionMode('findings')" /> Hallazgos registrados <small>Solo los vigentes, con sus caras.</small></label>
      </fieldset>
      <p class="import-count" role="status">{{ loading ? 'Consultando odontograma…' : picked.length + (selectionMode === 'teeth' ? (picked.length === 1 ? ' diente seleccionado' : ' dientes seleccionados') : (picked.length === 1 ? ' hallazgo seleccionado' : ' hallazgos seleccionados')) }}</p>
      <div v-if="source && !loading" class="import-options" role="group" aria-label="Selecciona lo que deseas incluir">
        <label v-for="option in options" :key="option.key" class="import-option"><input type="checkbox" :value="option.key" v-model="picked" :disabled="busy" /><span>{{ option.label }}</span></label>
        <p v-if="!options.length" class="dental-help">{{ selectionMode === 'findings' ? 'No hay hallazgos vigentes en esta versión. Puedes elegir Dientes.' : 'Esta versión no contiene dientes disponibles.' }}</p>
      </div>
      <p v-if="linksWarning" class="dental-warning" role="status">{{ linksWarning }}</p>
      <p v-if="!charts.length && !loading && !error" class="dental-help">Este paciente aún no tiene odontogramas. Vuelve al tratamiento para seleccionar los dientes directamente.</p>
      <details v-if="source && !loading" class="dental-advanced"><summary>Opciones avanzadas</summary>
        <label class="import-label">Consultar otra versión <input type="number" min="0" :max="maxRevision" v-model.number="sourceRevision" :disabled="busy" /></label>
        <button class="dental-button" type="button" :disabled="loading || busy" @click="loadSource(true)">Consultar versión</button>
        <label class="check-label"><input type="checkbox" v-model="copyContext" :disabled="busy" /> Copiar también el texto de los hallazgos a las notas internas</label>
        <p class="dental-help">El vínculo ya se conserva. Copiar el texto es opcional y no se actualizará si cambia el odontograma.</p>
      </details>
      <button v-if="error || linksWarning" class="dental-button" type="button" :disabled="loading || busy" @click="sourceId ? loadSource() : openImport()">Reintentar consulta</button>
    </section>
    <p v-if="error" class="dental-error" role="alert">{{ error }} Los datos del tratamiento se conservan.</p>
  </section>
</template>
<script>
import TreatmentToothPicker from './TreatmentToothPicker.vue';
import api from '../../../../services/core/odontogram/DAOdontogramV2Service';
import { surfaceLabel, normalizeSurfaces } from '../../../../utils/odontogram/dentalContract';
import ActionConfirm from '../../../../core/components/form/dialog/DAActionConfirm.vue';
import odontogramFeedback from '../../../../mixins/odontogramFeedback';
const copy = value => JSON.parse(JSON.stringify(value));
export default {
  mixins:[odontogramFeedback],
  components:{ActionConfirm, TreatmentToothPicker},
  props: { value: { type: Array, default: () => [] }, teeth: { type: Array, required: true }, patientId: { type: String, required: true }, canRead: { type: Boolean, default: false }, busy: { type: Boolean, default: false } },
  data: () => ({ loading: false, importOpen: false, charts: [], source: null, sourceId: '', loadedSourceId:'', sourceRevision: 0, maxRevision: 0, picked: [], selectionMode: 'teeth', copyContext: false, error: '',links:[],linksWarning:'', expandedTooth:'', loadSequence:0 }),
  watch: {
    importState: { deep: true, immediate: true, handler(value) { this.$emit('import-state', value); } },
    teeth() { if (!this.teeth.includes(this.expandedTooth)) this.expandedTooth = ''; },
    patientId() { this.resetImport(); },
    canRead(value) { if (!value) this.resetImport(); }
  },
  beforeDestroy() { this.loadSequence++; },
  computed: {
    importState() { return { open:this.importOpen, loading:this.loading, count:this.picked.length, canApply:!!(this.source && this.picked.length && !this.loading && !this.busy), pending:this.importOpen && this.picked.length > 0 }; },
    options() {
      if (!this.source) return [];
      return Object.entries(this.source.teeth).flatMap(([tooth, state]) => this.selectionMode === 'teeth'
        ? [{ key: tooth, tooth, label: 'Diente ' + tooth + this.relatedLabel(tooth,null) }]
        : state.findings.filter(f => f.status === 'active').map(f => ({ key: f.id, tooth, finding: f, label: 'Diente ' + tooth + ' · ' + f.label + ' · ' + (f.surface_pending ? 'Cara pendiente' : f.surfaces ? this.faceSummary(f.surfaces, tooth) : 'Pieza completa') + this.relatedLabel(tooth,f.id) })));
    }
  },
  methods: {
    async changeSelectionMode(mode) { if(mode === this.selectionMode)return; if(this.picked.length && !await this.askConfirmation('¿Cambiar lo que deseas incluir? Se limpiará la selección de este paso. Los dientes ya incorporados al tratamiento no cambian.'))return; this.picked=[]; this.selectionMode=mode; },
    faceName(face, tooth) { return { M:'Mesial', O:'Oclusal', I:'Incisal', D:'Distal', V:'Vestibular', L:'Lingual', P:'Palatina' }[surfaceLabel(face, Number(tooth))]; },
    faceSummary(faces, tooth) { return faces ? [...faces].map(face => this.faceName(face, tooth)).join(', ') : 'Sin caras específicas'; },
    chartLabel(chart) { const date = String(chart.created_at || '').slice(0,10).split('-'); return (chart.status === 'active' ? 'Activo' : 'Histórico') + ' · ' + (date.length === 3 ? date.reverse().join('/') : 'Sin fecha') + ' · Versión ' + chart.revision; },
    resetImport() { this.loadSequence++; this.importOpen=false; this.loading=false; this.picked=[]; this.source=null; this.sourceId=''; this.error=''; this.expandedTooth=''; },
    async cancelImport() { if(this.picked.length && !await this.askConfirmation('¿Volver sin aplicar esta selección? Los datos que ya tenías en el tratamiento se conservan.')) return false; this.resetImport(); this.$nextTick(()=>{ if(this.$refs.importButton)this.$refs.importButton.focus(); }); return true; },
    askConfirmation(message) { return this.$refs.confirmation.open(message,'Confirmar cambio en los dientes'); },
    surfaceLabel,
    relatedLabel(tooth,finding) { return this.links.some(link=>String(link.tooth_number)===String(tooth)&&(link.finding_id||null)===(finding||null)) || (this.detail(tooth).sources||[]).some(source=>source.id_chart===this.sourceId&&(source.finding_id||null)===(finding||null)) ? ' · Ya relacionado con un tratamiento' : ''; },
    detail(tooth) { return this.value.find(item => String(item.tooth_number) === String(tooth)) || { tooth_number: String(tooth), surfaces: null, manual: true, sources: [] }; },
    manualFaces(detail) { return Object.prototype.hasOwnProperty.call(detail,'manual_surfaces') ? detail.manual_surfaces : detail.surfaces; },
    combine(detail) { const faces=[this.manualFaces(detail),...(detail.sources||[]).map(source=>source.context && source.context.surfaces)].filter(Boolean).join('');detail.surfaces=faces?normalizeSurfaces(faces):null;return detail; },
    update(tooth, change) { const items = copy(this.value); const index = items.findIndex(item => String(item.tooth_number) === String(tooth)); const old=copy(this.detail(tooth));const detail = this.combine({ ...old, manual_surfaces:this.manualFaces(old), ...change, ...(change.clear_manual?{manual_surfaces:null}:{}) }); if (index < 0) items.push(detail); else items.splice(index, 1, detail); this.$emit('input', items); },
    toggleFace(tooth, face) { const old = this.manualFaces(this.detail(tooth)) || ''; const selected = old.includes(face) ? old.replace(face, '') : old + face; this.update(tooth, { manual:true, manual_surfaces: selected ? normalizeSurfaces(selected) : null }); },
    async removeSource(tooth, source) {
      if (!await this.askConfirmation('¿Quitar este vínculo del tratamiento? El odontograma no cambia. Se conservan los demás vínculos y las caras que marcaste directamente.')) return;
      const detail = this.detail(tooth), sources = (detail.sources || []).filter(item => item !== source && !(source.source_key && item.source_key === source.source_key));
      this.update(tooth, { sources, ...(source.source_key ? { remove_sources: [...(detail.remove_sources || []), source.source_key] } : {}) });
      this.notifyAction('info','Origen retirado del formulario. Guarda el tratamiento para confirmar el cambio.');
    },
    unwrap(response) { if (!response || !response.success) throw Error(response && response.message || 'No se pudo consultar el odontograma.'); return response.data; },
    async openImport() {
      if (!this.canRead || this.busy) return;
      this.resetImport(); this.importOpen=true; this.loading=true; this.copyContext=false;
      const sequence=++this.loadSequence;
      try {
        const result=this.unwrap(await api.list(this.patientId)); if(sequence !== this.loadSequence)return;
        this.charts=result.charts || [];
        const active=this.charts.filter(chart=>chart.status === 'active');
        if(active.length === 1) { this.sourceId=active[0].id_chart; await this.loadSource(); }
      } catch(error) { if(sequence === this.loadSequence)this.error=error.message; }
      finally { if(sequence === this.loadSequence)this.loading=false; }
    },
    async loadSource(exact = false) {
      if(!this.canRead || this.busy)return;
      if(this.picked.length && !await this.askConfirmation('¿Consultar otra versión del odontograma? Se limpiará la selección de este paso. Los dientes ya incorporados al tratamiento no cambian.')) {
        this.sourceId=this.loadedSourceId || this.sourceId;
        if(this.source)this.sourceRevision=this.source.revision;
        return;
      }
      const sequence=++this.loadSequence;
      this.source=null; this.picked=[]; this.error=''; this.links=[]; this.linksWarning='';
      if(!this.sourceId) { this.loading=false; return; }
      const selected=this.charts.find(item=>item.id_chart === this.sourceId);
      if(!selected)return;
      this.loading=true; this.maxRevision=selected.revision;
      try {
        const source=this.unwrap(await api.read(this.sourceId, exact === true ? this.sourceRevision : undefined));
        if(sequence !== this.loadSequence)return;
        this.source=source; this.sourceRevision=source.revision; this.loadedSourceId=this.sourceId;
        try { const response=await api.planLinks(this.sourceId); if(sequence !== this.loadSequence)return; if(response.success)this.links=response.data.links; else this.linksWarning='No se pudo comprobar si estos dientes ya están en otro tratamiento. Los tratamientos existentes se conservan.'; }
        catch(error) { if(sequence === this.loadSequence)this.linksWarning='No se pudo comprobar si estos dientes ya están en otro tratamiento. Los tratamientos existentes se conservan.'; }
      } catch(error) { if(sequence === this.loadSequence) { this.error=error.message; this.source=null; } }
      finally { if(sequence === this.loadSequence)this.loading=false; }
    },
    async importSelection() {
      if(!this.canRead || this.busy || this.loading || !this.source || !this.picked.length)return false;
      if(this.options.some(item=>this.picked.includes(item.key)&&this.relatedLabel(item.tooth,item.finding&&item.finding.id))&&!await this.askConfirmation('Algunos dientes o hallazgos ya se usan en un tratamiento. ¿Incluirlos también aquí? Los tratamientos existentes se conservan.'))return;
      const values = copy(this.value), teeth = new Set(this.teeth.map(String));
      for (const option of this.options.filter(item => this.picked.includes(item.key))) {
        const tooth = String(option.tooth); let detail = values.find(item => String(item.tooth_number) === tooth);
        if (!detail) { detail = { tooth_number: tooth, surfaces: null, manual_surfaces: null, manual: teeth.has(tooth), sources: [] }; values.push(detail); }
        if(!Object.prototype.hasOwnProperty.call(detail,'manual_surfaces')) detail.manual_surfaces=detail.surfaces;
        if (!detail.sources) detail.sources = [];
        const source = { id_chart: this.sourceId, revision: this.source.revision, finding_id: option.finding ? option.finding.id : null,
          is_current: this.source.revision === this.maxRevision && this.charts.find(item => item.id_chart === this.sourceId).status === 'active',
          context:{label:option.finding?option.finding.label:'Pieza '+tooth,surfaces:option.finding?option.finding.surfaces:null} };
        const index=detail.sources.findIndex(item => item.id_chart === source.id_chart && (item.finding_id || null) === source.finding_id);
        if(index<0) detail.sources.push(source);
        else if(detail.sources[index].revision!==source.revision) {
          const old=detail.sources[index];
          if(!await this.askConfirmation('¿Usar la versión '+source.revision+' en lugar de la '+old.revision+'? Las caras de este vínculo se actualizarán. Las que marcaste directamente y los demás vínculos se conservan.'))return;
          detail.sources.splice(index,1,{...source,source_key:old.source_key,replace_revision:old.revision});
        }
        this.combine(detail);
        teeth.add(tooth);
      }
      this.$emit('input', values); this.$emit('selection', [...teeth]);
      if (this.copyContext) this.$emit('context-notes', this.options.filter(item => this.picked.includes(item.key)).map(item => item.label + ' · origen R' + this.source.revision).join('\n'));
      this.importOpen = false; this.picked = []; this.expandedTooth = '';
      this.$nextTick(()=>{ if(this.$refs.importButton)this.$refs.importButton.focus(); });
      this.notifyAction('info','Selección incorporada al formulario. Guarda el tratamiento para confirmarla.');
    }
  }
};
</script>
<style scoped>
.treatment-dental-details { color:var(--color-text,#25364d); }
.dental-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
.dental-toolbar p, h5 { margin:0; font-weight:600; }
.dental-button { min-height:44px; padding:8px 13px; border:1px solid var(--color-border,#b8c9d5); border-radius:10px; color:var(--color-text,#25364d); background:var(--color-surface,#fff); font-weight:600; line-height:1.4; }
.dental-button:hover { border-color:var(--color-primary-500,#147e9c); }
.dental-button[aria-pressed="true"], .tooth-summary[aria-expanded="true"] { background:var(--color-primary-500,#147e9c); color:#fff; border-color:var(--color-primary-500,#147e9c); }
button:disabled { opacity:.55; cursor:default; }
button:focus-visible, select:focus-visible, input:focus-visible, summary:focus-visible { outline:3px solid var(--color-primary-500,#147e9c); outline-offset:2px; }
.dental-help { font-size:13px; line-height:1.55; color:var(--color-text-muted,#52657b); margin:8px 0 12px; }
.selected-summary { border-top:1px solid var(--color-border,#d8e9ef); padding-top:8px; }
.selected-teeth { display:flex; flex-wrap:wrap; gap:8px; max-height:144px; overflow:auto; padding:3px; }
.tooth-summary { display:flex; align-items:center; gap:7px; font-size:12px; }
.tooth-summary strong { font-size:15px; }
.source-badge { border:1px solid currentColor; padding:1px 5px; border-radius:10px; font-size:10px; }
.dental-piece { margin-top:16px; padding:16px; border:1px solid var(--color-border,#d8e9ef); border-radius:12px; background:var(--color-bg,#f8fbfd); }
.dental-faces { display:flex; gap:8px; flex-wrap:wrap; }
.dental-advanced { margin-top:16px; border-top:1px solid var(--color-border,#d8e9ef); padding-top:12px; }
.dental-advanced summary { cursor:pointer; padding:8px 0; font-weight:600; }
.source-row { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:12px 0; border-bottom:1px solid var(--color-border,#d8e9ef); font-size:13px; }
.check-label { display:flex; align-items:flex-start; gap:10px; margin:12px 0; font-size:13px; }
input[type=checkbox], input[type=radio] { width:18px; height:18px; flex-shrink:0; accent-color:var(--color-primary-500,#147e9c); margin-top:2px; }
.import-label { display:flex; flex-direction:column; gap:6px; margin:12px 0; font-weight:600; font-size:14px; }
select, input[type=number] { min-height:44px; border:1px solid var(--color-border,#b8c9d5); border-radius:9px; padding:8px 12px; background:var(--color-surface,#fff); color:inherit; width:100%; }
.import-mode { display:grid; grid-template-columns:1fr 1fr; gap:10px; border:0; padding:0; margin:16px 0; }
.import-mode legend { font-weight:600; font-size:14px; margin-bottom:8px; }
.import-mode label { padding:12px; border:1px solid var(--color-border,#b8c9d5); border-radius:10px; font-weight:600; cursor:pointer; }
.import-mode small { display:block; font-weight:400; color:var(--color-text-muted,#52657b); margin-left:24px; }
.import-count { font-weight:600; font-size:14px; }
.import-options { max-height:270px; overflow:auto; border:1px solid var(--color-border,#b8c9d5); border-radius:10px; padding:4px; }
.import-option { display:flex; gap:12px; padding:12px; min-height:44px; cursor:pointer; border-bottom:1px solid var(--color-border,#d8e9ef); }
.import-option:last-child { border:0; }
.dental-warning, .dental-error { padding:12px; border-radius:8px; font-size:13px; }
.dental-warning { background:#fff7e6; color:#7a4800; }
.dental-error { background:#fff1f2; color:#9f1239; }
@media(max-width:600px) { .import-mode { grid-template-columns:1fr; } .dental-toolbar .dental-button { width:100%; } .dental-piece { padding:12px; } .tooth-summary span:not(.source-badge) { max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } }
</style>
