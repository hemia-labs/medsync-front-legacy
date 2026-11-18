<template>
  <div class="dental-settings">
    <p v-if="loading" role="status">Consultando el tipo de odontograma…</p>
    <div v-else-if="!ready" class="dental-notice" role="status"><p>{{ loadError || 'La selección del tipo de odontograma aún no está disponible en este consultorio.' }}</p><button type="button" class="dental-button" @click="loadMode">Volver a consultar</button></div>
    <template v-else>
      <fieldset class="dental-modes" :disabled="allBusy || disabled">
        <legend><span class="dental-eyebrow">2 · Elige cómo registrar</span><span class="dental-heading">¿Qué odontograma necesita tu equipo?</span></legend>
        <p>Selecciona una opción para compararla. El cambio se aplica solo al pulsar «Guardar tipo de odontograma» y confirmarlo.</p>
        <div class="dental-mode-grid">
          <label v-for="option in modeOptions" :key="option.value" class="dental-mode" :class="{ 'is-selected': selected === option.value }">
            <div class="dental-mode-title"><input v-model="selected" type="radio" name="dental-capture-mode" :value="option.value" /><strong>{{ option.label }}</strong></div>
            <span class="dental-mode-use">{{ option.use }}</span><span>{{ option.description }}</span><span class="dental-limit">{{ option.limit }}</span><span v-if="current === option.value" class="dental-saved">En uso ahora</span>
          </label>
        </div>
      </fieldset>
      <details class="dental-preview">
        <summary>Ver un ejemplo de {{ captureLabel(selected).toLowerCase() }}</summary>
        <div class="dental-preview-content">
          <div class="dental-teeth" aria-hidden="true"><div v-for="tooth in [18,17,16,15]" :key="tooth" :class="{ 'is-selected': tooth === 16 }"><span>{{ tooth }}</span><tooth-drawing :number="tooth" :tooth="previewTooth(tooth)" /></div></div>
          <div><strong>Diente 16</strong>
            <template v-if="selected === 'v1'"><p>Diagnóstico escrito: «Caries en la cara oclusal».</p><p>Seleccionas el diente y escribes la nota. El texto no se convierte automáticamente en marcas por cara.</p></template>
            <template v-else><p>Caries · cara oclusal</p><p v-if="selected === 'v2'">Seleccionas el diente y su cara para registrar el hallazgo. También puedes escribir <code>16 car o</code> en la barra de captura rápida.</p><p v-else>Puedes consultar los hallazgos y el historial de esta captura. No podrás agregar ni modificar registros en este modo.</p></template>
          </div>
        </div>
        <p class="dental-caption">Ejemplo ilustrativo, sin datos de pacientes. La vista del expediente ofrece más herramientas.</p>
      </details>
      <div class="dental-actions"><button type="button" class="dental-button dental-button--primary" :disabled="allBusy || disabled || selected === current" @click="save">{{ busy ? 'Guardando…' : 'Guardar tipo de odontograma' }}</button><button v-if="selected !== current" type="button" class="dental-button" :disabled="allBusy || disabled" @click="selected = current">Cancelar selección</button><span class="dental-caption">En uso: {{ captureLabel(current) }}.</span></div>
      <p class="dental-caption">Cambiar de tipo conserva los registros. Las notas del odontograma con notas no se convierten en hallazgos por caras; puedes volver al tipo anterior para consultarlas.</p>
      <v-alert v-if="message" ref="feedback" :type="messageType" outlined role="alert" class="mt-3">{{ message }}<ol v-if="operatorBlocked"><li>Abre Puestos y accesos y elige el puesto de quien usará el odontograma.</li><li>Habilita el acceso a Odontograma y los permisos Capturar odontograma y Finalizar odontograma. Pueden corresponder a personas distintas.</li><li>Guarda los permisos, vuelve aquí y pulsa «Volver a consultar permisos».</li></ol></v-alert>
      <details class="dental-details" :open="operatorBlocked">
        <summary><span>Quién puede registrar y finalizar</span><span v-if="activation" class="dental-summary-hint">{{ activation.ready ? 'Equipo habilitado' : 'Requiere revisión' }}</span></summary>
        <div class="dental-detail-body">
          <p>Registrar permite agregar o corregir hallazgos. Finalizar cierra el odontograma cuando la revisión está lista. Cada permiso se asigna en <router-link to="/admin?section=roles-permissions">Puestos y accesos</router-link>.</p>
          <p v-if="adminErrors.activation" role="alert">{{ adminErrors.activation }}</p>
          <template v-else-if="activation"><p>{{ operatorCount(activation.capture_operators, 'registrar hallazgos') }}. {{ operatorCount(activation.finalize_operators, 'finalizar el odontograma') }}.</p><p v-if="!activation.ready">Para habilitar la captura por piezas y caras hace falta al menos una persona con cada permiso. Puede ser la misma persona.</p><ul class="dental-roles"><li v-for="role in activation.roles" :key="role.id_rol"><strong>{{ roleLabel(role) }}</strong><span>Registrar: {{ role.capture ? 'permitido' : 'sin permiso' }} · Finalizar: {{ role.finalize ? 'permitido' : 'sin permiso' }}</span></li></ul></template>
          <button type="button" class="dental-button" :disabled="adminLoading || allBusy" @click="refreshAdministration">{{ adminLoading ? 'Consultando…' : 'Volver a consultar permisos' }}</button>
        </div>
      </details>
      <div class="dental-optional-heading"><p class="dental-eyebrow">3 · Personaliza si lo necesitas</p><h3>Menos pasos al registrar</h3><p>Estas opciones son para <strong>Piezas y caras · captura rápida</strong>. Puedes empezar con los ajustes incluidos y cambiarlos después.</p><p v-if="current !== 'v2'" class="dental-notice">Para editar estos ajustes, guarda primero el tipo «Piezas y caras · captura rápida». Mientras tanto puedes consultar la ayuda.</p></div>
      <details class="dental-details">
        <summary><span>Palabras para la captura rápida</span><span class="dental-summary-hint">Atajos opcionales</span></summary>
        <div class="dental-detail-body">
          <p>Son palabras que escribes en la barra de captura rápida del odontograma para indicar una acción. Por ejemplo, <code>16 caries o</code> registra caries en la cara oclusal del diente 16.</p><p>Puedes crear una palabra que tu equipo recuerde fácilmente y asociarla a una acción existente. Se comparte solo en este consultorio; no crea un diagnóstico nuevo.</p>
          <p v-if="adminErrors.aliases" role="alert">{{ adminErrors.aliases }}</p>
          <template v-if="aliasState">
            <h4>Palabras de tu consultorio</h4><p v-if="!localAliases.length">Aún no has agregado palabras propias. Puedes usar las que ya vienen incluidas.</p>
            <ul v-else class="dental-alias-list"><li v-for="item in localAliases" :key="item.alias"><span><code>{{ item.alias }}</code><span> {{ item.label }}</span></span><button type="button" class="dental-button" :disabled="!canCustomize" :aria-label="'Quitar palabra ' + item.alias" @click="saveAlias(item.alias, null)">Quitar</button></li></ul>
            <form v-if="aliasState.schema_ready" class="dental-alias-form" @submit.prevent="saveAlias(aliasWord, aliasTarget)">
              <label>Palabra que quieres usar<input v-model="aliasWord" maxlength="30" placeholder="Ej. revisar" autocomplete="off" required :disabled="!canCustomize" aria-describedby="alias-word-help" /></label>
              <label>Qué hará esa palabra<select v-model="aliasTarget" :disabled="!canCustomize"><option v-for="tool in aliasTargets" :key="tool.code" :value="tool.code">{{ tool.label }}</option></select></label>
              <p id="alias-word-help" class="dental-caption">Una sola palabra, de hasta 30 letras, sin espacios ni números. Por ejemplo: «revisar» → «Marcar revisado».</p><button class="dental-button" :disabled="!canCustomize || !aliasWord.trim()">{{ aliasBusy ? 'Guardando…' : 'Agregar palabra' }}</button>
            </form><p v-else>La creación de palabras propias aún no está disponible en este consultorio.</p>
            <v-alert v-if="aliasMessage" :type="aliasMessageType" outlined role="alert" class="mt-3">{{ aliasMessage }}</v-alert>
            <details class="dental-included"><summary>Consultar palabras incluidas ({{ includedAliases.length }})</summary><p>Ya están disponibles para todo el equipo. Aquí puedes consultarlas; las palabras incluidas no se reemplazan ni se eliminan.</p><label>Buscar una palabra o acción<input v-model="aliasSearch" type="search" placeholder="Ej. caries o resina" /></label><ul class="dental-catalog"><li v-for="item in filteredAliases" :key="item.alias"><code>{{ item.alias }}</code><span>{{ item.label }}</span></li></ul><p v-if="!filteredAliases.length" role="status">No encontramos esa palabra. Prueba con el nombre de la acción.</p></details>
          </template>
          <button type="button" class="dental-button" :disabled="adminLoading || allBusy" @click="refreshAdministration">{{ adminLoading ? 'Consultando…' : 'Volver a consultar palabras' }}</button>
        </div>
      </details>
      <details class="dental-details">
        <summary><span>Orden para recorrer los dientes</span><span class="dental-summary-hint">Navegación con teclado</span></summary>
        <div class="dental-detail-body">
          <p>Define a qué diente pasarás al avanzar con las flechas o al pulsar Enter con la barra de captura vacía. Es útil si tu equipo revisa los dientes en un orden particular.</p><p>El dibujo y la posición de los dientes no cambian. Si el orden habitual te funciona, no necesitas configurar nada.</p>
          <p v-if="adminErrors.preferences" role="alert">{{ adminErrors.preferences }} <button type="button" class="dental-button" :disabled="adminLoading" @click="refreshAdministration">Reintentar consulta</button></p>
          <template v-if="preferenceState && preferenceState.schema_ready">
            <label>Qué dentición quieres ordenar<select v-model="walkMode"><option v-for="mode in dentitions" :key="mode" :value="mode">{{ modeLabel(mode) }}</option></select></label>
            <label :for="'dental-walk-' + walkMode">Números de los dientes, en el orden que prefieras</label><textarea :id="'dental-walk-' + walkMode" v-model="walkTexts[walkMode]" :disabled="!canCustomize" rows="3" :aria-invalid="String(Boolean(walkError(walkMode)))" aria-describedby="dental-walk-help dental-walk-error" />
            <p id="dental-walk-help" class="dental-caption">Separa los números con comas. Deben aparecer los {{ defaultSequence(walkMode).length }} dientes de esta dentición, sin repetir ninguno.</p><p v-if="walkError(walkMode)" id="dental-walk-error" role="alert" class="dental-error">{{ walkError(walkMode) }}</p>
            <div class="dental-walk-preview" aria-label="Inicio del recorrido"><span v-for="(tooth, index) in walkPreview" :key="index">{{ index ? '→ ' : '' }}{{ tooth }}</span><span>…</span></div><button type="button" class="dental-button" :disabled="!canCustomize" @click="restoreWalk">Usar el orden habitual en esta dentición</button>
            <details class="dental-included"><summary>¿Qué pasa cuando selecciono varios dientes a la vez?</summary><p>Un rango como <code>13-23</code> siempre incluye los dientes que están entre esos dos números en la arcada: 13, 12, 11, 21, 22 y 23. Tu recorrido personalizado solo cambia a qué diente avanzas después.</p></details>
            <v-alert v-if="walkMessage" :type="walkMessageType" outlined role="alert" class="mt-3">{{ walkMessage }} <button v-if="walkConflict" type="button" class="dental-button" :disabled="allBusy" @click="reloadWalk">Descartar mi recorrido y cargar el guardado</button></v-alert>
            <div class="dental-actions"><button type="button" class="dental-button dental-button--primary" :disabled="!canCustomize || !walkDirty || hasWalkErrors || walkConflict" @click="savePreferences">{{ savingPreferences ? 'Guardando…' : 'Guardar recorrido' }}</button><button v-if="walkDirty" type="button" class="dental-button" :disabled="allBusy" @click="resetWalk">Descartar cambios del recorrido</button></div><p class="dental-caption">Guarda el orden de las tres denticiones. Se usará al volver a abrir la captura del odontograma.</p>
          </template><p v-else-if="!adminErrors.preferences && !adminLoading">El recorrido personalizado aún no está disponible en este consultorio.</p>
        </div>
      </details>
    </template>
    <da-dialog v-model="showModeConfirm" :persist="true" max-width="540px"><template #body><da-sweet-confirm title="Cambiar el tipo de odontograma" :message="'Se usará ' + captureLabel(pendingMode) + ' en este consultorio. Los registros se conservan, pero las notas anteriores no se convierten en hallazgos por caras. Vuelve a abrir el expediente después del cambio.'" confirmbtntext="Confirmar cambio" calcelbtntext="Seguir como antes" @confirm="applyMode" @close="cancelMode"><template #icon><v-icon size="64" color="primary" aria-hidden="true">mdi-tooth-outline</v-icon></template></da-sweet-confirm></template></da-dialog>
  </div>
</template>

<script>
import api from '../../../services/core/odontogram/DAOdontogramV2Service';
import { sequence } from '../../../utils/odontogram/dentalContract';
import DADialog from '../../../core/components/form/dialog/DADialog.vue';
import DASweetConfirm from '../../../core/components/form/dialog/components/DASweetConfirm.vue';
import ToothDrawing from '../../Patient/Sections/components/preview/OdontogramPreviewTooth.vue';
const normalizeWord = value => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const dentitions = ['permanent', 'primary', 'mixed'];
export default {
  components: { 'da-dialog': DADialog, 'da-sweet-confirm': DASweetConfirm, ToothDrawing },
  props: { disabled: Boolean },
  data: () => ({
    loading: true, ready: false, loadError: '', busy: false, showModeConfirm: false, pendingMode: null, selected: 'v1', current: 'v1', message: '', messageType: 'info', operatorBlocked: false,
    aliasState: null, aliasWord: '', aliasTarget: 'car', aliasSearch: '', aliasBusy: false, aliasMessage: '', aliasMessageType: 'info', activation: null,
    preferenceState: null, walkTexts: { permanent: '', primary: '', mixed: '' }, walkOriginal: '', walkMode: 'permanent', savingPreferences: false, walkMessage: '', walkMessageType: 'info', walkConflict: false,
    adminLoading: false, adminErrors: { aliases: '', activation: '', preferences: '' }, dentitions,
    modeOptions: [
      { value: 'v1', label: 'Odontograma con notas', use: 'Para registrar diagnósticos escritos por diente.', description: 'Selecciona una pieza y escribe su diagnóstico. Conserva la forma de trabajo de la captura anterior.', limit: 'Sin acciones rápidas ni registro estructurado por caras.' },
      { value: 'v2', label: 'Piezas y caras · captura rápida', use: 'Para marcar hallazgos con mayor detalle.', description: 'Registra por diente y cara con herramientas visuales o palabras en la barra de captura. Permite personalizar atajos y recorrido.', limit: 'Requiere permisos para registrar y finalizar. Las notas anteriores no se convierten automáticamente.' },
      { value: 'v2_readonly', label: 'Piezas y caras · solo consulta', use: 'Para revisar lo registrado sin editarlo.', description: 'Consulta los hallazgos y el historial del odontograma por piezas y caras.', limit: 'No permite agregar ni modificar registros en esta captura.' }
    ]
  }),
  computed: {
    allBusy() { return this.busy || this.showModeConfirm || this.aliasBusy || this.savingPreferences; },
    canCustomize() { return this.current === 'v2' && !this.allBusy && !this.disabled && !this.adminLoading; },
    walkDirty() { return Boolean(this.walkOriginal) && JSON.stringify(this.walkTexts) !== this.walkOriginal; },
    dirty() { return this.selected !== this.current || Boolean(this.aliasWord.trim()) || this.walkDirty; },
    aliasTargets() { return [...((this.aliasState && this.aliasState.catalog) || []), { code: 'ok', label: 'Marcar revisado' }, { code: 'pres', label: 'Corregir presencia' }]; },
    localAliases() { return this.aliasEntries(this.aliasState && this.aliasState.local_aliases); },
    includedAliases() { return this.aliasEntries(this.aliasState && this.aliasState.global_aliases); },
    filteredAliases() { const search = normalizeWord(this.aliasSearch); return this.includedAliases.filter(item => normalizeWord(item.alias + ' ' + item.label).includes(search)); },
    walkPreview() { return this.parseWalk(this.walkMode).slice(0, 8); },
    hasWalkErrors() { return dentitions.some(mode => Boolean(this.walkError(mode))); }
  },
  watch: { dirty: { immediate: true, handler(value) { this.$emit('dirty', value); } }, allBusy: { immediate: true, handler(value) { this.$emit('busy', value); } } },
  async mounted() { await this.loadMode(); await this.refreshAdministration(); },
  beforeDestroy() { this.$emit('dirty', false); this.$emit('busy', false); },
  methods: {
    captureLabel(mode) { const option = this.modeOptions.find(item => item.value === mode); return option ? option.label : 'Odontograma'; },
    previewTooth(tooth) { return { findings: tooth === 16 && this.selected !== 'v1' ? [{ code: 'car', kind: 'condition', surfaces: 'O' }] : [] }; },
    modeLabel(mode) { return { permanent: 'Permanente · 32 dientes', primary: 'Temporal (de leche) · 20 dientes', mixed: 'Mixta · permanentes y temporales' }[mode]; },
    roleLabel(role) { return role.role_name || role.name || { admin: 'Administración', doctor: 'Doctor', assistant: 'Asistente', receptionist: 'Recepción' }[role.role_code] || role.role_code; },
    operatorCount(count, action) { return Number(count) === 1 ? '1 persona puede ' + action : count + ' personas pueden ' + action; },
    defaultSequence(mode) { return sequence(mode); },
    defaultWalk(mode) { return sequence(mode).join(', '); },
    parseWalk(mode) { return this.walkTexts[mode].split(/[,\s]+/).filter(Boolean).map(Number); },
    walkError(mode) {
      if (!this.walkOriginal) return '';
      const expected = sequence(mode), actual = this.parseWalk(mode);
      if (actual.some(n => !Number.isInteger(n) || !expected.includes(n))) return 'Hay un número que no pertenece a esta dentición. Revisa la lista antes de guardar.';
      const repeated = [...new Set(actual.filter((n, i) => actual.indexOf(n) !== i))];
      if (repeated.length) return 'Estos dientes aparecen más de una vez: ' + repeated.join(', ') + '.';
      const missing = expected.filter(n => !actual.includes(n));
      return missing.length ? 'Faltan estos dientes: ' + missing.join(', ') + '.' : '';
    },
    restoreWalk() { this.$set(this.walkTexts, this.walkMode, this.defaultWalk(this.walkMode)); this.walkMessage = 'Orden habitual preparado. Pulsa «Guardar recorrido» para aplicarlo.'; this.walkMessageType = 'info'; },
    resetWalk() { if (this.walkOriginal) this.walkTexts = JSON.parse(this.walkOriginal); if (!this.walkConflict) this.walkMessage = ''; },
    discardChanges() { this.selected = this.current; this.aliasWord = ''; this.resetWalk(); },
    showFeedback() { this.$nextTick(() => { const alert = this.$refs.feedback; const element = alert && (alert.$el || alert); if (element && element.scrollIntoView) element.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }); },
    operatorError() { this.operatorBlocked = true; this.messageType = 'error'; this.message = 'Falta habilitar a tu equipo para registrar y finalizar odontogramas. El tipo en uso no cambió.'; this.showFeedback(); },
    async loadMode() {
      this.loading = true; this.loadError = '';
      try { const response = await api.capabilities(); if (!response.success) throw Error(); this.ready = response.data.schema_ready; this.selected = this.current = response.data.mode; }
      catch (_) { this.loadError = 'No pudimos consultar el tipo guardado. Vuelve a intentarlo.'; } finally { this.loading = false; }
    },
    acceptPreferences(data) { this.preferenceState = data; if (data.schema_ready) { for (const mode of dentitions) this.$set(this.walkTexts, mode, data.traversal[mode].join(', ')); this.walkOriginal = JSON.stringify(this.walkTexts); } },
    async refreshAdministration() {
      if (this.adminLoading || this.allBusy) return; this.adminLoading = true;
      const reads = [
        ['aliases', () => api.aliases(), data => { this.aliasState = data; }],
        ['activation', () => api.activationCheck(), data => { this.activation = data; if (this.operatorBlocked && data.ready) { this.operatorBlocked = false; this.messageType = 'success'; this.message = 'Tu equipo ya tiene los permisos necesarios. Puedes guardar el tipo de odontograma.'; } }],
        ['preferences', () => api.preferences(), data => { if (!this.walkDirty && !this.walkConflict) this.acceptPreferences(data); }]
      ];
      for (const [key, read, accept] of reads) {
        try { const result = await read(); if (!result.success) throw Error(); accept(result.data); this.$set(this.adminErrors, key, ''); }
        catch (_) { this.$set(this.adminErrors, key, 'No pudimos consultar ' + { aliases: 'las palabras guardadas.', activation: 'los permisos de tu equipo.', preferences: 'el recorrido guardado.' }[key]); }
      }
      this.adminLoading = false;
    },
    async reloadWalk() {
      if (this.allBusy) return; this.savingPreferences = true;
      try { const result = await api.preferences(); if (!result.success) throw Error(); this.acceptPreferences(result.data); this.walkConflict = false; this.walkMessageType = 'success'; this.walkMessage = 'Cargamos el recorrido guardado. Ya puedes revisarlo y editarlo.'; }
      catch (_) { this.walkMessageType = 'error'; this.walkMessage = 'No pudimos cargar el recorrido. Tu edición sigue aquí; vuelve a intentarlo.'; } finally { this.savingPreferences = false; }
    },
    async savePreferences() {
      if (!this.canCustomize || !this.walkDirty || this.hasWalkErrors || this.walkConflict) return;
      this.savingPreferences = true; this.walkMessage = '';
      try {
        const result = await api.savePreferences({ expected_revision: this.preferenceState.revision, traversal: Object.fromEntries(dentitions.map(mode => [mode, this.parseWalk(mode)])) });
        if (!result.success) { this.walkConflict = Number(result.status) === 409 || /cambi|revisi|conflict/i.test(result.message || ''); throw Error(result.message); }
        this.acceptPreferences(result.data); this.walkMessageType = 'success'; this.walkMessage = 'Recorrido guardado. Se usará al volver a abrir la captura del odontograma.';
      } catch (error) { this.walkMessageType = 'error'; this.walkMessage = this.walkConflict ? 'Otra persona cambió el recorrido. Conservamos tu edición. Revisa los números antes de cargar la versión guardada y volver a editar.' : error.message || 'No se pudo guardar. Conservamos el recorrido para que lo intentes de nuevo.'; } finally { this.savingPreferences = false; }
    },
    targetLabel(code) { const tool = this.aliasTargets.find(item => item.code === code); return tool ? tool.label : code; },
    aliasEntries(aliases) { return Object.entries(aliases || {}).map(([alias, target]) => ({ alias, label: this.targetLabel(target) })); },
    async saveAlias(alias, target) {
      if (!this.canCustomize || !this.aliasState || !this.aliasState.schema_ready) return;
      const word = normalizeWord(alias); this.aliasMessageType = 'error';
      if (target !== null && !/^[a-z]{1,30}$/.test(word)) { this.aliasMessage = 'Escribe una sola palabra de hasta 30 letras, sin espacios ni números.'; return; }
      if (target !== null && (Object.prototype.hasOwnProperty.call(this.aliasState.aliases || {}, word) || this.aliasTargets.some(item => item.code === word))) { this.aliasMessage = 'Esa palabra ya existe. Elige otra para evitar confusiones.'; return; }
      this.aliasBusy = true; this.aliasMessage = '';
      try {
        const result = await api.saveAlias({ alias: word, target, expected_version: this.aliasState.alias_version });
        if (!result.success) throw Error(result.message || 'No se pudo guardar la palabra.');
        this.aliasState = { ...this.aliasState, ...result.data };
        if (target !== null) this.aliasWord = '';
        this.aliasMessageType = 'success'; this.aliasMessage = target === null ? 'Palabra retirada. Los registros ya capturados se conservan.' : 'Palabra agregada para tu equipo. Si hay una captura abierta, vuelve a abrirla antes de usarla.';
      } catch (error) { this.aliasMessageType = 'error'; this.aliasMessage = (error.message || 'No se pudo guardar.') + ' Tu palabra sigue aquí. Si otra persona cambió la lista, vuelve a consultarla antes de reintentar.'; } finally { this.aliasBusy = false; }
    },
    save() { if (this.allBusy || this.disabled || this.selected === this.current) return; if (this.selected === 'v2' && this.activation && !this.activation.ready) { this.operatorError(); return; } this.pendingMode = this.selected; this.showModeConfirm = true; },
    cancelMode() { this.showModeConfirm = false; this.pendingMode = null; },
    async applyMode() {
      if (this.busy || !this.showModeConfirm || !this.pendingMode || this.disabled) return;
      const mode = this.pendingMode; this.cancelMode(); this.busy = true; this.message = ''; this.operatorBlocked = false;
      try { const response = await api.setMode(mode); if (!response.success) { if (response.code === 'CO26_OPERATORS_REQUIRED') { this.operatorError(); return; } throw Error(response.message); } this.current = this.selected = response.data.mode; this.messageType = 'success'; this.message = 'Tipo de odontograma guardado. Vuelve a abrir el expediente para usarlo.'; }
      catch (error) { this.messageType = 'error'; this.message = error.message || 'No se pudo cambiar el tipo. Tu selección sigue aquí para volver a intentarlo.'; } finally { this.busy = false; this.showFeedback(); }
    }
  }
};
</script>

<style scoped>
.dental-teeth ::v-deep .co26-root-line { fill:none; stroke:currentColor; }
.dental-teeth ::v-deep .co26-fill-empty { fill:var(--color-surface); }
.dental-teeth ::v-deep .co26-fill-condition { fill:#f4c7cb; }
.dental-settings { margin-top:30px; color:var(--color-primary-900); }.dental-settings p { margin:8px 0 14px; font-size:14px; line-height:1.65; color:var(--color-grey); }.dental-settings h3,.dental-settings h4 { font-weight:600; margin:0 0 8px; }.dental-settings h3 { font-size:19px; }.dental-settings h4 { margin-top:22px; font-size:16px; }
.dental-modes { border:0; padding:0; min-width:0; }.dental-eyebrow { display:block; font-size:11px!important; text-transform:uppercase; font-weight:600; letter-spacing:.09em; color:var(--color-primary-700)!important; margin:0 0 8px!important; }.dental-heading { font-size:20px; font-weight:600; }.dental-settings legend { margin-bottom:6px; }
.dental-mode-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin:20px 0 16px; }.dental-mode { display:flex; flex-direction:column; gap:10px; padding:20px; border:1px solid var(--color-forty-500); border-radius:12px; cursor:pointer; font-size:13px; line-height:1.6; color:var(--color-grey); }.dental-mode.is-selected { border-color:var(--color-primary-700); box-shadow:inset 0 0 0 1px var(--color-primary-700); background:var(--color-gray98); }.dental-mode-title { display:flex; align-items:start; gap:8px; color:var(--color-primary-900); font-size:15px; line-height:1.45; }.dental-mode input { width:18px; height:18px; margin-top:2px; flex-shrink:0; accent-color:var(--color-primary-700); }.dental-mode-use { font-weight:600; color:var(--color-primary-900); }.dental-limit { padding-top:10px; border-top:1px solid var(--color-forty-500); }.dental-saved { align-self:start; margin-top:auto; font-size:11px; font-weight:600; color:var(--color-primary-700); background:var(--color-surface); border:1px solid var(--color-primary-700); border-radius:20px; padding:2px 10px; }
.dental-preview { background:var(--color-gray98); border:1px solid var(--color-forty-500); border-radius:10px; margin:14px 0; }.dental-settings summary { min-height:48px; padding:14px 16px; cursor:pointer; font-weight:600; font-size:14px; line-height:1.5; }.dental-settings summary::marker { color:var(--color-primary-700); }.dental-preview-content { display:grid; grid-template-columns:minmax(200px,.75fr) 1fr; gap:24px; padding:8px 20px; align-items:center; }.dental-teeth { display:flex; justify-content:center; gap:10px; }.dental-teeth > div { width:52px; padding:5px; text-align:center; font-size:12px; border:1px solid transparent; border-radius:8px; }.dental-teeth .is-selected { border-color:var(--color-primary-700); }.dental-teeth svg { width:100%; height:64px; }.dental-settings .dental-caption { font-size:12px; color:var(--color-grey); line-height:1.6; }.dental-preview > p { padding:0 20px 12px; }.dental-settings code { font-family:inherit; font-weight:600; background:var(--color-gray98); color:var(--color-primary-700); padding:2px 5px; border-radius:4px; overflow-wrap:anywhere; }
.dental-actions { display:flex; flex-wrap:wrap; gap:10px 16px; align-items:center; margin:18px 0 10px; }.dental-button { min-height:44px; padding:9px 16px; border:1px solid var(--color-primary-700); border-radius:24px; color:var(--color-primary-700); font-weight:600; font-size:13px; line-height:1.5; }.dental-button--primary { background:var(--color-primary-700); color:var(--color-surface); }.dental-settings button:disabled { opacity:.5; cursor:not-allowed; }.dental-settings input:disabled,.dental-settings select:disabled,.dental-settings textarea:disabled { opacity:.65; cursor:not-allowed; }
.dental-details { border:1px solid var(--color-forty-500); border-radius:10px; margin-top:12px; }.dental-details[open] > summary { border-bottom:1px solid var(--color-forty-500); }.dental-summary-hint { margin-left:12px; font-size:12px; font-weight:400; color:var(--color-grey); }.dental-detail-body { padding:6px 20px 20px; }.dental-detail-body a { color:var(--color-primary-700); text-decoration:underline; }.dental-optional-heading { border-top:1px solid var(--color-forty-500); margin-top:28px; padding-top:24px; }.dental-notice { border-left:3px solid var(--color-primary-700); padding:12px 16px; background:var(--color-gray98); border-radius:4px; font-size:14px; }
.dental-roles,.dental-alias-list,.dental-catalog { list-style:none; padding:0; margin:12px 0; }.dental-roles li { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; padding:10px 0; font-size:13px; border-bottom:1px solid var(--color-forty-500); }.dental-alias-list li { display:flex; gap:12px; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--color-forty-500); }.dental-alias-form { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:18px; background:var(--color-gray98); padding:18px; border-radius:10px; }.dental-alias-form p { grid-column:1/-1; margin:0; }.dental-alias-form button { justify-self:start; }.dental-settings label:not(.dental-mode) { display:block; font-size:13px; font-weight:600; margin-top:12px; }.dental-settings select,.dental-settings input:not([type=radio]),.dental-settings textarea { display:block; width:100%; min-height:44px; border:1px solid var(--color-forty-500); background:var(--color-surface); color:var(--color-primary-900); border-radius:8px; padding:10px 12px; margin-top:6px; font-weight:400; font-size:14px; }.dental-settings textarea { resize:vertical; line-height:1.7; }
.dental-included { margin:18px 0; }.dental-included summary { padding-left:0; }.dental-catalog { display:grid; grid-template-columns:1fr 1fr; gap:0 24px; max-height:300px; overflow:auto; }.dental-catalog li { display:flex; flex-wrap:wrap; justify-content:space-between; gap:6px; padding:10px 0; border-bottom:1px solid var(--color-forty-500); font-size:13px; }.dental-walk-preview { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }.dental-walk-preview span { border-radius:6px; background:var(--color-gray98); padding:6px; font-size:13px; }.dental-settings .dental-error { color:var(--color-secondary-700); }.dental-settings button:focus-visible,.dental-settings input:focus-visible,.dental-settings select:focus-visible,.dental-settings textarea:focus-visible,.dental-settings summary:focus-visible { outline:3px solid var(--color-primary-500); outline-offset:3px; }
@media(max-width:1000px) { .dental-mode-grid { grid-template-columns:1fr; }.dental-mode { gap:7px; padding:16px; }.dental-preview-content { grid-template-columns:1fr; gap:12px; } }
@media(max-width:600px) { .dental-detail-body { padding:4px 14px 16px; }.dental-summary-hint { display:block; margin:4px 0 0 16px; }.dental-alias-form,.dental-catalog { grid-template-columns:1fr; }.dental-alias-form { padding:12px; }.dental-actions > button { width:100%; }.dental-heading { font-size:19px; }.dental-settings summary { padding:14px 12px; }.dental-alias-list li { align-items:start; }.dental-alias-list li > span { display:grid; gap:4px; } }
</style>
