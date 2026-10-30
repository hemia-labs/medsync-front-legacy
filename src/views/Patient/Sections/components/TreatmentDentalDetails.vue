<template>
  <section class="treatment-dental-details">
    <action-confirm ref="confirmation" />
    <h4>Caras y procedencia</h4>
    <div v-for="tooth in teeth" :key="tooth" class="dental-piece">
      <strong>Pieza {{ tooth }}</strong>
      <label><input type="checkbox" :checked="detail(tooth).manual" :disabled="busy" @change="update(tooth, { manual: $event.target.checked, clear_manual: !$event.target.checked })" /> Mantener selección manual independiente del origen</label>
      <p>Caras manuales (los orígenes conservan sus propias caras)</p>
      <div class="dental-faces"><button v-for="face in 'MODVL'" :key="face" type="button" :disabled="busy" :aria-pressed="Boolean(manualFaces(detail(tooth)) && manualFaces(detail(tooth)).includes(face))" @click="toggleFace(tooth, face)">{{ surfaceLabel(face, Number(tooth)) }}</button></div>
      <p>Caras combinadas: {{ detail(tooth).surfaces || 'Sin caras seleccionadas' }}</p>
      <p v-if="detail(tooth).sources_redacted">La procedencia restringida se conservará al guardar.</p>
      <div v-for="source in detail(tooth).sources || []" :key="source.source_key || source.id_chart + ':' + source.finding_id">
        <span>{{ source.context ? source.context.label : 'Origen seleccionado' }} · R{{ source.revision }} · {{ source.context && source.context.surfaces || 'Pieza completa / cara pendiente' }}</span>
        <button v-if="canRead" type="button" :disabled="busy" @click="removeSource(tooth, source)">Retirar este origen</button>
      </div>
    </div>
    <button v-if="canRead" type="button" :disabled="busy || loading" @click="openImport">Traer del odontograma</button>
    <div v-if="importOpen" class="dental-import">
      <h4>Selecciona origen y piezas</h4>
      <label>Odontograma <select v-model="sourceId" :disabled="loading" @change="loadSource"><option value="">Elige uno</option><option v-for="chart in charts" :key="chart.id_chart" :value="chart.id_chart">{{ chart.created_at }} · R{{ chart.revision }} · {{ chart.status === 'active' ? 'Activo' : 'Histórico' }}</option></select></label>
      <label v-if="source">Revisión <input type="number" min="0" :max="maxRevision" v-model.number="sourceRevision" /><button type="button" :disabled="loading" @click="loadSource(true)">Consultar revisión</button></label>
      <label>Selección <select v-model="selectionMode" @change="picked = []"><option value="teeth">Solo dientes</option><option value="findings">Hallazgos vigentes</option></select></label>
      <div v-if="source"><label v-for="option in options" :key="option.key"><input type="checkbox" :value="option.key" v-model="picked" /> {{ option.label }}</label></div>
      <p v-if="linksWarning" role="status">{{ linksWarning }}</p>
      <label><input type="checkbox" v-model="copyContext" /> Copiar el contexto seleccionado a las notas internas</label>
      <p v-if="!charts.length && !loading">No hay odontogramas disponibles. Puedes continuar la captura manual.</p>
      <button type="button" :disabled="busy || loading || !picked.length" @click="importSelection">Agregar selección al formulario</button><button type="button" @click="importOpen = false">Cancelar</button>
    </div>
    <p v-if="error" role="alert">{{ error }} La captura manual se conserva.</p>
  </section>
</template>
<script>
import api from '../../../../services/core/odontogram/DAOdontogramV2Service';
import { surfaceLabel, normalizeSurfaces } from '../../../../utils/odontogram/dentalContract';
import ActionConfirm from '../../../../core/components/form/dialog/DAActionConfirm.vue';
import odontogramFeedback from '../../../../mixins/odontogramFeedback';
const copy = value => JSON.parse(JSON.stringify(value));
export default {
  mixins:[odontogramFeedback],
  components:{ActionConfirm},
  props: { value: { type: Array, default: () => [] }, teeth: { type: Array, required: true }, patientId: { type: String, required: true }, canRead: { type: Boolean, default: false }, busy: { type: Boolean, default: false } },
  data: () => ({ loading: false, importOpen: false, charts: [], source: null, sourceId: '', sourceRevision: 0, maxRevision: 0, picked: [], selectionMode: 'teeth', copyContext: false, error: '',links:[],linksWarning:'' }),
  computed: {
    options() {
      if (!this.source) return [];
      return Object.entries(this.source.teeth).flatMap(([tooth, state]) => this.selectionMode === 'teeth'
        ? [{ key: tooth, tooth, label: 'Pieza ' + tooth + this.relatedLabel(tooth,null) }]
        : state.findings.filter(f => f.status === 'active').map(f => ({ key: f.id, tooth, finding: f, label: 'Pieza ' + tooth + ' · ' + f.label + ' · ' + (f.surface_pending ? 'Cara pendiente' : f.surfaces ? [...f.surfaces].map(face => surfaceLabel(face,Number(tooth))).join('') : 'Pieza completa') + this.relatedLabel(tooth,f.id) })));
    }
  },
  methods: {
    askConfirmation(message) { return this.$refs.confirmation.open(message,'Confirmar procedencia dental'); },
    surfaceLabel,
    relatedLabel(tooth,finding) { return this.links.some(link=>String(link.tooth_number)===String(tooth)&&(link.finding_id||null)===(finding||null)) || (this.detail(tooth).sources||[]).some(source=>source.id_chart===this.sourceId&&(source.finding_id||null)===(finding||null)) ? ' · Ya relacionado con un tratamiento' : ''; },
    detail(tooth) { return this.value.find(item => String(item.tooth_number) === String(tooth)) || { tooth_number: String(tooth), surfaces: null, manual: true, sources: [] }; },
    manualFaces(detail) { return Object.prototype.hasOwnProperty.call(detail,'manual_surfaces') ? detail.manual_surfaces : detail.surfaces; },
    combine(detail) { const faces=[this.manualFaces(detail),...(detail.sources||[]).map(source=>source.context && source.context.surfaces)].filter(Boolean).join('');detail.surfaces=faces?normalizeSurfaces(faces):null;return detail; },
    update(tooth, change) { const items = copy(this.value); const index = items.findIndex(item => String(item.tooth_number) === String(tooth)); const old=copy(this.detail(tooth));const detail = this.combine({ ...old, manual_surfaces:this.manualFaces(old), ...change, ...(change.clear_manual?{manual_surfaces:null}:{}) }); if (index < 0) items.push(detail); else items.splice(index, 1, detail); this.$emit('input', items); },
    toggleFace(tooth, face) { const old = this.manualFaces(this.detail(tooth)) || ''; const selected = old.includes(face) ? old.replace(face, '') : old + face; this.update(tooth, { manual:true, manual_surfaces: selected ? normalizeSurfaces(selected) : null }); },
    async removeSource(tooth, source) {
      if (!await this.askConfirmation('Retirar esta procedencia conservará la selección manual de la pieza y el resto de sus orígenes.')) return;
      const detail = this.detail(tooth), sources = (detail.sources || []).filter(item => item !== source && !(source.source_key && item.source_key === source.source_key));
      this.update(tooth, { sources, ...(source.source_key ? { remove_sources: [...(detail.remove_sources || []), source.source_key] } : {}) });
      this.notifyAction('info','Origen retirado del formulario. Guarda el tratamiento para confirmar el cambio.');
    },
    unwrap(response) { if (!response || !response.success) throw Error(response && response.message || 'No se pudo consultar el odontograma.'); return response.data; },
    async openImport() { if (!this.canRead) return; this.loading = true; this.error = ''; this.copyContext = false; try { const result = this.unwrap(await api.list(this.patientId)); this.charts = result.charts; this.importOpen = true; this.picked = []; } catch (error) { this.error = error.message; } finally { this.loading = false; } },
    async loadSource(exact = false) { if (!this.sourceId) { this.source = null; return; } this.loading = true; this.error = ''; this.picked = [];
      try { const selected = this.charts.find(item => item.id_chart === this.sourceId); this.maxRevision = selected.revision; this.source = this.unwrap(await api.read(this.sourceId, exact === true ? this.sourceRevision : undefined)); this.sourceRevision = this.source.revision;
        this.links=[];this.linksWarning='';try{const response=await api.planLinks(this.sourceId);if(response.success)this.links=response.data.links;else this.linksWarning='No se pudo comprobar si el origen ya está relacionado. Puedes continuar sin modificar otros tratamientos.';}catch(error){this.linksWarning='No se pudo comprobar si el origen ya está relacionado. Puedes continuar sin modificar otros tratamientos.';}
      }
      catch (error) { this.error = error.message; this.source = null; } finally { this.loading = false; }
    },
    async importSelection() {
      if(this.options.some(item=>this.picked.includes(item.key)&&this.relatedLabel(item.tooth,item.finding&&item.finding.id))&&!await this.askConfirmation('Parte de esta selección ya está relacionada. Se conservarán los tratamientos existentes y se evitarán duplicados en este formulario. ¿Continuar?'))return;
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
          if(!await this.askConfirmation('Actualizar este origen de R'+old.revision+' a R'+source.revision+' recalculará sus caras. Las caras manuales y otros orígenes se conservan. ¿Continuar?'))return;
          detail.sources.splice(index,1,{...source,source_key:old.source_key,replace_revision:old.revision});
        }
        this.combine(detail);
        teeth.add(tooth);
      }
      this.$emit('input', values); this.$emit('selection', [...teeth]);
      if (this.copyContext) this.$emit('context-notes', this.options.filter(item => this.picked.includes(item.key)).map(item => item.label + ' · origen R' + this.source.revision).join('\n'));
      this.importOpen = false; this.picked = [];
      this.notifyAction('info','Selección incorporada al formulario. Guarda el tratamiento para confirmarla.');
    }
  }
};
</script>
<style scoped>
.treatment-dental-details { margin-top:16px; }.dental-piece { border-bottom:1px solid var(--color-border,#d8e9ef); padding:12px 0; }.dental-faces { display:flex; gap:6px; flex-wrap:wrap; }.treatment-dental-details button,.treatment-dental-details select { min-height:44px; min-width:44px; padding:8px; border:1px solid var(--color-border,#d8e9ef); border-radius:6px; margin:4px 0; }.treatment-dental-details button[aria-pressed=true] { background:var(--color-primary-100,#e8f5f2); }.dental-import { border:1px solid var(--color-border,#d8e9ef); padding:12px; }.dental-import label { display:block; margin:8px 0; }.dental-import input[type=number] { width:80px; border:1px solid var(--color-border,#d8e9ef); }
</style>
