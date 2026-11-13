<template>
  <div class="odontogram-mode-settings">
    <p v-if="loading" role="status">Consultando captura dental…</p>
    <p v-else-if="!ready">La actualización de captura dental está pendiente de instalación.</p>
    <template v-else>
      <label>Captura dental <select v-model="selected" :disabled="busy || showModeConfirm">
        <option value="v1">Captura anterior</option><option value="v2">Captura por piezas y caras</option><option value="v2_readonly">Piezas y caras: solo lectura</option>
      </select></label>
      <button type="button" :disabled="busy || showModeConfirm || selected === current" @click="save">{{ busy ? 'Guardando…' : 'Aplicar captura dental' }}</button>
      <p>Captura guardada: <strong>{{ captureLabel(current) }}</strong>.</p>
      <v-alert v-if="message" ref="feedback" :type="messageType" outlined role="alert" class="mt-3">
        {{ message }}
        <template v-if="operatorBlocked">
          <ol class="operator-steps"><li>En Puestos y accesos, selecciona el puesto del usuario que hará la prueba.</li><li>Habilita acceso a Odontograma, Capturar odontograma y Finalizar odontograma. Pueden asignarse al mismo puesto o a operadores distintos.</li><li>Guarda los permisos, vuelve aquí y pulsa Actualizar permisos y abreviaturas. Después aplica la captura dental.</li></ol>
          <router-link to="/admin?section=roles-permissions">Ir a Puestos y accesos</router-link>
          <p>Se mantiene {{ captureLabel(current).toLowerCase() }}. No se modificaron las notas ni el historial.</p>
        </template>
      </v-alert>
      <p>La captura y la finalización se autorizan por separado en Puestos y accesos.</p>
      <div v-if="activation"><p>Operadores con captura: {{ activation.capture_operators }}. Con finalización: {{ activation.finalize_operators }}.</p><p v-if="!activation.ready">Revisa los permisos de los puestos antes de activar la captura nueva.</p><ul><li v-for="role in activation.roles" :key="role.id_rol">{{ role.role_code }} · captura: {{ role.capture ? 'sí' : 'no' }} · finalizar: {{ role.finalize ? 'sí' : 'no' }}. Propuesta inicial: captura {{ role.candidates.capture ? 'sí' : 'no' }}, finalizar {{ role.candidates.finalize ? 'sí' : 'no' }}, reabrir {{ role.candidates.reopen ? 'sí' : 'no' }}, eliminar {{ role.candidates.delete ? 'sí' : 'no' }}.</li></ul></div>
      <button type="button" :disabled="busy" @click="refreshAdministration">Actualizar permisos y abreviaturas</button>
    </template>
    <da-dialog v-model="showModeConfirm" :persist="true" max-width="500px">
      <template #body>
        <da-sweet-confirm title="Cambiar captura dental" message="Cambiar la captura dental de este consultorio conservará sus notas e historial. ¿Deseas continuar?" confirmbtntext="Aplicar cambio" calcelbtntext="Cancelar" @confirm="applyMode" @close="cancelMode">
          <template #icon><v-icon size="72" color="primary" aria-hidden="true">mdi-tooth-outline</v-icon></template>
        </da-sweet-confirm>
      </template>
    </da-dialog>
    <v-alert v-if="!ready && message" :type="messageType" outlined role="alert">{{ message }}</v-alert>
    <details v-if="aliasState"><summary>Abreviaturas globales y del consultorio</summary>
      <p v-if="!aliasState.schema_ready">Las abreviaturas locales están pendientes de instalación.</p>
      <ul><li v-for="(target,alias) in aliasState.global_aliases" :key="'global-'+alias">{{ alias }} → {{ targetLabel(target) }} (global)</li></ul>
      <ul><li v-for="(target,alias) in aliasState.local_aliases" :key="alias">{{ alias }} → {{ targetLabel(target) }} <button type="button" :disabled="aliasBusy" @click="saveAlias(alias, null)">Retirar</button></li></ul>
      <form v-if="aliasState.schema_ready" @submit.prevent="saveAlias(aliasWord,aliasTarget)">
        <label>Abreviatura local <input v-model="aliasWord" maxlength="30" required :disabled="aliasBusy" /></label>
        <label>Acción <select v-model="aliasTarget" :disabled="aliasBusy"><option v-for="tool in aliasState.catalog" :key="tool.code" :value="tool.code">{{ tool.label }}</option><option value="ok">Marcar revisado</option><option value="pres">Corregir presencia</option></select></label>
        <button :disabled="aliasBusy">Guardar abreviatura</button><p>Los códigos, comandos y abreviaturas globales se conservan.</p>
      </form>
    </details>
    <details v-if="preferenceState && preferenceState.schema_ready"><summary>Recorrido de captura del consultorio</summary>
      <label v-for="mode in ['permanent','primary','mixed']" :key="mode">{{ modeLabel(mode) }}<textarea v-model="walkTexts[mode]" :disabled="savingPreferences" /><button type="button" :disabled="savingPreferences" @click="walkTexts[mode] = defaultWalk(mode)">Restaurar orden anatómico</button></label>
      <p>Incluye una sola vez cada pieza. Los rangos dentales conservan el orden anatómico aunque personalices la navegación.</p>
      <button type="button" :disabled="savingPreferences" @click="savePreferences">Guardar recorrido</button>
    </details>
  </div>
</template>
<script>
import api from '../../../services/core/odontogram/DAOdontogramV2Service';
import { sequence } from '../../../utils/odontogram/dentalContract';
import DADialog from '../../../core/components/form/dialog/DADialog.vue';
import DASweetConfirm from '../../../core/components/form/dialog/components/DASweetConfirm.vue';
import odontogramFeedback from '../../../mixins/odontogramFeedback';
export default {
  mixins:[odontogramFeedback],
  components: { 'da-dialog': DADialog, 'da-sweet-confirm': DASweetConfirm },
  data: () => ({ loading: true, ready: false, busy: false, showModeConfirm:false, pendingMode:null, selected: 'v1', current: 'v1', message: '', messageType:'info', operatorBlocked:false, aliasState: null, aliasWord: '', aliasTarget: 'car', aliasBusy: false, activation: null, preferenceState: null, walkTexts:{permanent:'',primary:'',mixed:''}, savingPreferences:false }),
  async mounted() {
    try { const response = await api.capabilities(); if (!response.success) throw Error(response.message); this.ready = response.data.schema_ready; this.selected = this.current = response.data.mode; }
    catch (error) { this.messageType='error'; this.message = error.message; } finally { this.loading = false; }
    await this.refreshAdministration();
  },
  methods: {
    captureLabel(mode) { return {v1:'Captura anterior',v2:'Captura por piezas y caras',v2_readonly:'Piezas y caras: solo lectura'}[mode] || mode; },
    showFeedback() { this.$nextTick(()=>{const alert=this.$refs.feedback;const element=alert&&(alert.$el||alert);if(element&&element.scrollIntoView)element.scrollIntoView({block:'nearest',behavior:'smooth'});}); },
    operatorError() { this.operatorBlocked=true;this.messageType='error';this.message='No se pudo activar la captura por piezas y caras: faltan operadores activos con permisos de lectura/captura y lectura/finalización.';this.showFeedback(); },
    async refreshAdministration() { const aliases = await api.aliases(); if(aliases.success) this.aliasState = aliases.data; const activation = await api.activationCheck(); if(activation.success) { this.activation = activation.data; if(this.operatorBlocked && activation.data.ready) { this.operatorBlocked=false;this.messageType='success';this.message='Los operadores ya tienen los permisos necesarios. Ahora puedes aplicar la captura dental.'; } } const preferences = await api.preferences(); if(preferences.success) { this.preferenceState=preferences.data; for(const mode of ['permanent','primary','mixed'])this.walkTexts[mode]=preferences.data.traversal[mode].join(', '); } },
    modeLabel(mode) { return {permanent:'Permanente',primary:'Temporal',mixed:'Mixta'}[mode]; },
    defaultWalk(mode) { return sequence(mode).join(', '); },
    async savePreferences() { if(this.savingPreferences) return; this.savingPreferences=true; this.message=''; try { const traversal=Object.fromEntries(Object.entries(this.walkTexts).map(([mode,text])=>[mode,text.split(/[,\s]+/).filter(Boolean).map(Number)])); const result=await api.savePreferences({expected_revision:this.preferenceState.revision,traversal}); if(!result.success)throw Error(result.message); this.preferenceState=result.data; this.messageType='success'; this.message='Recorrido guardado; se usará al volver a abrir la captura.'; } catch(error) { this.messageType='error'; this.message=error.message; } finally { this.savingPreferences=false; } },
    targetLabel(code) { const tool = this.aliasState && this.aliasState.catalog.find(tool => tool.code === code); return tool ? tool.label : code === 'ok' ? 'Marcar revisado' : code === 'pres' ? 'Corregir presencia' : code; },
    async saveAlias(alias,target) {
      if(this.aliasBusy) return; this.aliasBusy = true; this.message = '';
      try { const response = await api.saveAlias({ alias, target, expected_version:this.aliasState.alias_version }); if(!response.success) throw Error(response.message); const refreshed = await api.aliases(); if(!refreshed.success) throw Error(refreshed.message); this.aliasState = refreshed.data; this.aliasWord = ''; this.messageType='success'; this.message = 'Abreviaturas actualizadas. Las capturas abiertas deberán revisar sus comandos.'; }
      catch(error) { this.messageType='error'; this.message = error.message; } finally { this.aliasBusy = false; }
    },
    save() { if(this.busy || this.showModeConfirm || this.selected === this.current)return;if(this.selected==='v2' && this.activation && !this.activation.ready){this.operatorError();return;}this.pendingMode=this.selected;this.showModeConfirm=true; },
    cancelMode() { this.showModeConfirm=false;this.pendingMode=null; },
    async applyMode() {
      if (this.busy || !this.showModeConfirm || !this.pendingMode) return;
      const mode=this.pendingMode;this.cancelMode();
      this.busy = true; this.message = '';this.operatorBlocked=false;
      try { const response = await api.setMode(mode); if (!response.success) { if(response.code==='CO26_OPERATORS_REQUIRED'){this.operatorError();return;}throw Error(response.message || 'No se pudo cambiar la captura dental. Intenta de nuevo.'); } this.current = response.data.mode;this.messageType='success';this.message = 'Captura dental actualizada. Vuelve a abrir el expediente.';this.showFeedback(); }
      catch (error) { this.messageType='error';this.message = error.message || 'No se pudo cambiar la captura dental. Intenta de nuevo.';this.showFeedback(); } finally { this.busy = false; }
    }
  }
};
</script>
<style scoped>
.odontogram-mode-settings { margin-top:16px; }.odontogram-mode-settings label { display:block; }.odontogram-mode-settings select,.odontogram-mode-settings input,.odontogram-mode-settings textarea,.odontogram-mode-settings button { min-height:44px; border:1px solid var(--color-border,#d8e9ef); border-radius:6px; padding:8px; margin-top:8px; }.odontogram-mode-settings select,.odontogram-mode-settings textarea { width:100%; background:var(--color-surface); color:var(--color-text,#25364d); }.odontogram-mode-settings p { margin-top:8px; font-size:13px; }
.operator-steps { padding-left:20px;margin:12px 0; }.operator-steps li { margin:8px 0; }
</style>
