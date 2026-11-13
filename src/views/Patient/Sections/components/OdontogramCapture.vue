<template>
  <section class="co26-live" :aria-busy="String(loading || busy)" @pointerdown="recordPointer" @keydown="recordKeyboard">
    <action-confirm ref="confirmation" @change="confirmationOpen = $event" />
    <header class="co26-live-hero"><div><p class="co26-live-eyebrow">EXPEDIENTE CLÍNICO / EXPLORACIÓN DENTAL</p><div class="co26-live-title"><h2>Odontograma</h2><span v-if="chart" class="co26-live-badge">{{ statusLabel(chart.status) }}</span></div><p>{{ patientName }} · {{ chart ? dentitionLabel(chart.mode) + ' · revisión ' + chart.revision : 'Sin odontograma activo' }}</p></div>
      <div class="co26-live-actions">
        <button :disabled="loading || busy || pending" @click="openHistory">Historial</button>
        <button v-if="captureAllowed" :disabled="loading || busy || pending" @click="openNew">Nuevo odontograma</button>
        <button v-if="chart && chart.status === 'active' && finalizeAllowed" class="co26-live-primary" :disabled="busy || pending" @click="transition('finalize')">Finalizar</button>
        <button v-if="chart && chart.status === 'finalized' && reopenAllowed" class="co26-live-primary" :disabled="busy || pending" @click="transition('reopen')">Reabrir</button>
        <details v-if="chart" class="co26-live-menu">
          <summary>Más opciones</summary>
          <div class="co26-live-menu-panel">
            <button :disabled="pending" @click="printChart">Imprimir</button>
            <button v-if="hasPermission('treatments.create')" :disabled="busy || pending" @click="prepareTreatment">Preparar tratamiento</button>
            <button v-if="hasPermission('treatments.create')" :aria-pressed="pickingPlan" @click="pickingPlan = !pickingPlan">{{ pickingPlan ? 'Terminar selección para plan' : 'Seleccionar piezas para plan' }}</button>
            <button v-if="deleteAllowed" class="co26-live-menu-danger" :disabled="busy || pending" @click="transition('delete')">Eliminar odontograma</button>
          </div>
        </details>
      </div>
    </header>
    <p v-if="mode === 'v2_readonly'" role="status">Solo lectura: se conservan los datos y el historial.</p>
    <div class="co26-live-statusbar"><span role="status" class="co26-live-sync" :class="{'co26-live-unsaved': sync !== 'saved'}">{{ loading ? 'Consultando odontograma…' : chart ? syncLabel : 'Sin captura activa' }}</span><span v-if="chart">{{ dentitionLabel(chart.mode) }} · {{ chart.status === 'active' && captureAllowed ? 'Guardado automático' : 'Consulta sin edición' }}</span></div>
    <p v-if="pending" role="status">{{ pendingSummary }}</p>
    <details v-if="chart" class="co26-live-help"><summary>Ayuda de captura y abreviaturas</summary><p>Enter vacío avanza sin cambiar datos. Los hallazgos comunes permanecen en la pieza; ausente y no erupcionado avanzan al confirmarse. Usa ? para cara pendiente. ok marca revisado conservando hallazgos y notas. pres corrige explícitamente la presencia.</p><p>Ejemplos: 16 car mo; 18 aus, 17 res o; 13-23 ok. / abre la barra. Flechas recorren las piezas y Ctrl+Z deshace fuera de campos de texto. Esc desactiva el pincel. Las caras se eligen en el panel ampliado.</p><p>Recorrido: {{ traversal.join(', ') }}</p><p>Abreviaturas: {{ Object.keys(aliases).map(alias => alias + ' → ' + aliases[alias]).join('; ') }}</p></details>
    <p v-if="walkWarning" role="alert">El recorrido configurado no está disponible; se muestra el recorrido anatómico completo.</p>
    <div v-if="overlapProposal" ref="overlapDialog" class="co26-live-dialog co26-overlap-dialog" role="dialog" aria-modal="true" aria-label="Resolver caras superpuestas" @keydown.esc.prevent="resolveOverlap(null)" @keydown.tab="trapOverlapFocus">
      <h3>Caras superpuestas · pieza {{ overlapProposal.tooth }}</h3><p>{{ overlapProposal.code }} · caras {{ overlapProposal.surfaces }}. Fusionar reúne las caras compatibles y conserva los hallazgos anteriores en el historial. Separar conserva ambos hallazgos vigentes.</p>
      <button autofocus @click="resolveOverlap('merge')">Fusionar caras compatibles</button><button @click="resolveOverlap('separate')">Registrar por separado</button><button @click="resolveOverlap(null)">Cancelar</button>
    </div>
    <p v-if="pendingIntent" role="alert">Hay una acción sin resultado confirmado. <button :disabled="busy" @click="retryIntent">Reintentar esa misma acción</button></p>
    <div v-if="error" role="alert" class="co26-live-error">{{ error }}
      <button v-if="session && pending" :disabled="busy" @click="retry">Reintentar el mismo lote</button>
      <button v-if="sync === 'conflict'" :disabled="busy" @click="compareConflict">Comparar con el servidor</button>
      <button :disabled="busy" @click="reload">Volver a consultar</button>
      <button v-if="pending || noteDirty || pendingIntent" :disabled="busy" @click="discardDraft">Descartar borrador pendiente</button>
    </div>
    <div v-if="conflictServer" class="co26-live-dialog" role="region" aria-label="Comparación del conflicto">
      <h3>Estado del servidor R{{ conflictServer.revision }}</h3>
      <p v-for="tooth in conflictTeeth" :key="tooth">Pieza {{ tooth }} · nota: {{ conflictServer.teeth[tooth] ? conflictServer.teeth[tooth].note : 'Incompatible con la dentición' }} · hallazgos: {{ conflictServer.teeth[tooth] ? conflictServer.teeth[tooth].findings.filter(f => f.status === 'active').map(f => f.label + ' ' + (f.surfaces || '')).join(', ') : '' }}</p>
      <p>Tu propuesta: {{ conflictProposal }}</p><button :disabled="busy || conflictServer.status !== 'active'" @click="reapplyConflict">Reaplicar como una intención nueva</button>
    </div>
    <form v-if="newOpen" class="co26-live-dialog co26-live-new-dialog" @submit.prevent="createChart">
      <div class="co26-live-new-heading"><span>CAPTURA DENTAL</span><h3>Crear odontograma</h3><p>Configura la dentición. Después podrás registrar hallazgos en las piezas.</p></div>
      <label>Dentición <select v-model="newMode" :disabled="busy || Boolean(pendingIntent)"><option value="permanent">Permanente</option><option value="primary">Temporal</option><option value="mixed">Mixta</option></select></label>
      <label><input type="checkbox" v-model="copyPrevious" :disabled="!chart || busy || Boolean(pendingIntent)" /> Partir del odontograma seleccionado (hallazgos vigentes, pendientes de reevaluar)</label>
      <template v-if="copyPrevious && chart"><p>Origen: {{ dentitionLabel(chart.mode) }} · revisión {{ chart.revision }}. Selecciona los hallazgos que deseas copiar:</p>
        <label v-for="option in copyOptions" :key="option.id"><input type="checkbox" :value="option.id" v-model="copyFindingIds" :disabled="!option.compatible || busy || Boolean(pendingIntent)" /> Pieza {{ option.tooth }} · {{ option.label }} · {{ option.faces }} {{ option.compatible ? '' : '(incompatible con la nueva dentición)' }}</label>
        <label v-if="copyIncompatible.length"><input type="checkbox" v-model="omitIncompatible" :disabled="busy || Boolean(pendingIntent)" /> Omitir explícitamente estas posiciones incompatibles: {{ copyIncompatible.join(', ') }}. El origen se conservará intacto.</label>
      </template>
      <label v-if="copyPrevious"><input type="checkbox" v-model="copyNotes" :disabled="busy || Boolean(pendingIntent)" /> Copiar también las notas de las piezas compatibles, con procedencia</label>
      <p v-if="active">Se finalizará el odontograma activo; requiere permiso para finalizar.</p>
      <div class="co26-live-new-actions"><button class="co26-live-primary" :disabled="busy || copyPrevious && copyIncompatible.length > 0 && !omitIncompatible" type="submit">Confirmar creación</button><button type="button" class="co26-live-cancel" :disabled="busy" @click="newOpen = false">Cancelar</button></div>
    </form>
    <section v-if="historyOpen" class="co26-history" aria-labelledby="co26-history-title">
      <div class="co26-history-heading"><div><span class="co26-history-eyebrow">EXPEDIENTE DENTAL</span><h3 id="co26-history-title">Historial de odontogramas <span class="co26-history-count">{{ history.length }}</span></h3><p>Consulta registros anteriores y compara su evolución sin modificar el original.</p></div><button type="button" @click="historyOpen = false">Cerrar historial</button></div>
      <div v-if="!history.length" class="co26-history-empty"><v-icon size="32" aria-hidden="true">mdi-history</v-icon><p>Aún no hay odontogramas en el historial.</p></div>
      <div class="co26-history-list">
        <article v-for="item in history" :key="item.id_chart" class="co26-history-card" :class="{'co26-history-selected':chart && chart.id_chart === item.id_chart}">
          <div class="co26-history-icon"><v-icon color="primary" aria-hidden="true">mdi-tooth-outline</v-icon></div>
          <div class="co26-history-content"><div class="co26-history-card-title"><h4>{{ dentitionLabel(item.dentition) }}</h4><span class="co26-history-status" :class="{'co26-history-active':item.status === 'active'}">{{ statusLabel(item.status) }}</span><span v-if="chart && chart.id_chart === item.id_chart" class="co26-history-viewed">En consulta</span></div><time :datetime="item.created_at">{{ historyDate(item.created_at) }}</time><div class="co26-history-meta"><span>Revisión {{ item.revision }}</span><span v-if="item.updated_at">Último cambio: {{ historyDate(item.updated_at) }}</span></div></div>
          <button class="co26-history-open" :disabled="busy || pending" @click="selectChart(item.id_chart, true)">Ver odontograma <span aria-hidden="true">→</span></button>
        </article>
      </div>
      <p v-if="history.length && !chart" class="co26-history-hint">Abre un odontograma para consultar sus revisiones, compararlo o imprimirlo.</p>
      <div v-if="chart" class="co26-history-tools">
        <form @submit.prevent="loadRevision"><h4>Consultar una revisión</h4><p>Abre el estado guardado en un momento anterior.</p><label>Número de revisión <input type="number" min="0" :max="latestRevision" v-model.number="requestedRevision" /></label><button :disabled="busy || pending">Consultar revisión</button></form>
        <form @submit.prevent="compareOther"><h4>Comparar odontogramas</h4><label>Comparar con <select v-model="comparisonId"><option value="">Elige un odontograma</option><option v-for="item in history" :key="item.id_chart" :value="item.id_chart">{{ historyDate(item.created_at) }} · {{ dentitionLabel(item.dentition) }} · R{{ item.revision }}</option></select></label><label>Revisión (opcional)<input v-model="comparisonRevision" type="number" min="0" placeholder="Última disponible" /></label><button :disabled="busy || pending || !comparisonId">Comparar</button></form>
      </div>
      <p v-if="comparison">{{ comparison }}</p>
      <button v-if="comparisonResult" :disabled="pending || busy" @click="printChart('comparison')">Imprimir comparación</button>
      <table v-if="comparisonResult" class="co26-live-comparison"><thead><tr><th>Pieza</th><th>Cambios de hallazgos</th><th>Nota anterior</th><th>Nota comparada</th><th>Revisión</th></tr></thead><tbody><tr v-for="row in comparisonResult.teeth" :key="row.number"><td>{{ row.number }} {{ row.before_included && row.after_included ? '' : '(no incluida en ambas denticiones)' }}</td><td>{{ comparisonFindingText(row) }}</td><td>{{ row.before_note || '(vacía)' }}</td><td>{{ row.after_note || '(vacía)' }}</td><td>{{ row.review_changed ? 'La evaluación cambió' : 'Sin cambio de evaluación' }}</td></tr></tbody></table>
    </section>
    <template v-if="chart">
      <div class="co26-live-capture-grid">
        <section class="co26-live-card co26-live-keyboard">
          <div class="co26-live-section-heading"><h3>Captura rápida <span>/ teclado</span></h3><span class="co26-live-badge">Pieza {{ selected }}</span></div>
          <form @submit.prevent="runCommand" class="co26-live-command">
            <label for="co26-live-command">Comando de captura</label>
            <div class="co26-live-command-input"><strong>{{ selected }}</strong><input id="co26-live-command" ref="command" v-model="command" :disabled="!canEdit || commandNavigating" @keydown.enter="preventRepeatedEnter" placeholder="16 car mo · 18 aus · res o · ok" autocomplete="off" /><button :disabled="!canEdit || commandNavigating" aria-label="Aplicar comando">↵</button></div>
            <p aria-live="polite">{{ commandPreview }}</p>
          </form>
          <p class="co26-live-shortcuts"><kbd>Enter</kbd> aplicar · <kbd>/</kbd> enfocar · <kbd>Ctrl Z</kbd> deshacer fuera de textos</p>
        </section>
        <section class="co26-live-card co26-live-progress" aria-label="Avance de revisión">
          <p class="co26-live-eyebrow">EXPLORACIÓN DENTAL</p><strong>{{ reviewedCount }} <small>/ {{ printNumbers.length }}</small></strong><p>piezas con revisión vigente</p>
          <progress :value="reviewedCount" :max="printNumbers.length" :aria-label="reviewedCount + ' piezas con revisión vigente'" />
          <span>{{ printNumbers.length - reviewedCount }} pendientes de revisar · {{ summaryTeeth.length }} con hallazgos o notas</span>
        </section>
      </div>
      <section class="co26-live-card co26-live-palette" aria-label="Herramientas de captura">
        <div class="co26-live-section-heading"><div><h3>Pincel <span>/ tableta y mouse</span></h3><p>Elige un hallazgo, una pieza y sus caras en el panel ampliado.</p></div><div class="co26-live-actions"><label v-if="activeTool && ['restoration','procedure'].includes(activeTool.kind)"><input type="checkbox" v-model="indicated" :disabled="!canEdit" /> Por realizar</label><button :disabled="!canEdit || !canUndo" @click="undo">↶ Deshacer</button></div></div>
        <div class="co26-live-tools"><button v-for="tool in catalog" :key="tool.code" :disabled="!canEdit" :aria-pressed="toolCode === tool.code" @click="selectTool(tool.code)"><span class="co26-live-dot" :class="'co26-live-tone-' + toolTone(tool)" />{{ tool.label }}<kbd>{{ tool.code }}</kbd></button></div>
      </section>
      <div class="co26-live-grid">
        <section ref="arches" tabindex="-1" class="co26-live-card co26-live-arches">
          <div class="co26-live-section-heading"><div><h3>Arcadas dentales</h3><p>Vista desde el profesional · numeración FDI</p></div><div v-if="chart.mode === 'mixed'" class="co26-live-filter" aria-label="Filtrar dentición"><button v-for="filter in dentitionFilters" :key="filter.value" :aria-pressed="dentitionFilter === filter.value" @click="dentitionFilter = filter.value">{{ filter.label }}</button></div><span v-else class="co26-live-badge">{{ dentitionLabel(chart.mode) }}</span></div>
          <p class="co26-live-hint">↔ Desliza para recorrer la arcada. Toca una pieza para ver su detalle.</p>
          <button class="co26-live-panel-jump" @click="focusDetail">Pieza {{ selected }} · Ir al panel de captura ↓</button>
          <div class="co26-live-orientation"><span>DERECHA DEL PACIENTE</span><span>IZQUIERDA DEL PACIENTE</span></div>
          <div v-for="row in chartRows" :key="row.id" class="co26-live-row">
            <h3>{{ row.label }}</h3>
            <div class="co26-live-scroll" tabindex="0" :aria-label="row.label">
              <div class="co26-live-teeth"><button v-for="n in row.numbers" :key="n" :data-tooth="n" :tabindex="selected === n ? 0 : -1" :aria-pressed="selected === n" :aria-label="'Pieza ' + n + ', ' + toothState(chart.teeth[n])" @click="selectTooth(n, true)">
                <strong>{{ n }}<span v-if="isReviewed(chart.teeth[n])" class="co26-live-check" aria-hidden="true">✓</span></strong><tooth-drawing :number="n" :tooth="drawing(n)" /><small>{{ chart.teeth[n].findings.filter(f => f.status === 'active').length || '·' }}<span v-if="chart.teeth[n].note" aria-label="Tiene nota"> ✎</span></small>
              </button></div>
            </div>
            <div v-if="pickingPlan && hasPermission('treatments.create')" class="co26-live-plan-picks"><label v-for="n in row.numbers" :key="n"><input type="checkbox" :value="n" v-model="pickedPlanTeeth" /> Plan {{ n }}</label></div>
          </div>
          <div class="co26-live-legend"><span><i class="co26-live-dot co26-live-tone-condition" />Hallazgo / por realizar</span><span><i class="co26-live-dot co26-live-tone-restoration" />Existente</span><span><i class="co26-live-dot co26-live-tone-presence" />Presencia</span><span>✓ Revisado</span><span>· Sin evaluar</span></div>
        </section>
        <aside v-if="current" ref="detail" tabindex="-1" class="co26-live-card co26-live-detail">
          <button class="co26-live-back" @click="$refs.arches.scrollIntoView({ block: 'start' }); $refs.arches.focus({ preventScroll: true })">← Arcadas</button>
          <div class="co26-live-detail-title"><strong>{{ selected }}</strong><div><h3>{{ selectedToothLabel }}</h3><p>{{ selectedQuadrantLabel }}</p></div></div><p class="co26-live-badge co26-live-evaluation">{{ toothState(current) }}</p>
          <template v-if="canEdit">
            <div class="co26-live-tooth-detail"><tooth-drawing :number="selected" :tooth="drawing(selected)" /><div><h4>{{ activeTool ? activeTool.label : 'Selecciona un hallazgo' }}</h4><p>{{ activeTool && activeTool.surface ? 'Selecciona una o varias caras' : 'Hallazgo de pieza completa' }}</p>
            <div class="co26-live-surfaces" v-if="activeTool && activeTool.surface"><button v-for="face in 'MODVL'" :key="face" :aria-pressed="surfaces.includes(face)" @click="toggleFace(face)">{{ surfaceLabel(face, selected) }}</button></div>
            <label v-if="activeTool && activeTool.surface"><input type="checkbox" v-model="surfacePending" @change="pendingSurfaceChanged" /> Cara por definir</label>
            </div></div>
            <button class="co26-live-primary co26-live-apply" :disabled="!activeTool" @click="addFinding">Aplicar {{ activeTool ? activeTool.label.toLowerCase() : 'hallazgo' }}</button>
            <details class="co26-live-advanced" v-if="activeTool && !activeTool.surface">
              <summary>Pincel de pieza completa</summary>
              <button :disabled="!activeTool || activeTool.surface" :aria-pressed="brushMode" @click="brushMode = !brushMode">{{ brushMode ? 'Desactivar pincel' : 'Pincel de pieza completa' }}</button>
            </details>
          </template>
          <ul><li v-for="finding in activeFindings" :key="finding.id">
            {{ finding.label }} · {{ intentLabel(finding.intent) }} · {{ finding.surface_pending ? 'Cara pendiente' : facesLabel(finding.surfaces, selected) || 'Pieza completa' }}
            <details v-if="canEdit || hasPermission('treatments.create')" class="co26-live-finding-menu"><summary>Acciones</summary>
              <button v-if="canEdit" :disabled="pending" @click="removeFinding(finding)">Corregir hallazgo</button>
              <label v-if="canEdit"><input type="checkbox" :value="finding.id" v-model="evolutionOrigins" /> Usar como origen de evolución</label>
              <label v-if="hasPermission('treatments.create')"><input type="checkbox" :value="finding.id" v-model="planFindings" /> Incluir en el plan</label>
            </details>
          </li></ul>
          <label class="co26-live-note">Nota de la pieza (opcional)<textarea :value="noteDraft" maxlength="1000" :disabled="!canEdit" placeholder="Observaciones de esta pieza" @input="changeNote($event.target.value)" /></label>
          <div v-if="canEdit" class="co26-live-piece-actions"><button @click="reviewTooth">Marcar revisado</button><button v-if="activeFindings.length" @click="evolutionOpen = !evolutionOpen">Registrar evolución</button></div>
          <div v-if="canEdit && evolutionOpen" class="co26-live-evolution-picker"><p>Selecciona los hallazgos de origen:</p><label v-for="finding in activeFindings" :key="finding.id"><input type="checkbox" :value="finding.id" v-model="evolutionOrigins" /> {{ finding.label }} · {{ finding.surface_pending ? 'Cara pendiente' : facesLabel(finding.surfaces, selected) || 'Pieza completa' }}</label></div>
          <details v-if="canEdit && evolutionOrigins.length" class="co26-live-evolution"><summary>Registrar evolución ({{ evolutionOrigins.length }})</summary>
            <label>Resultado de evolución <select v-model="evolutionResult"><option value="">Sin nuevo hallazgo</option><option v-for="tool in catalog" :key="tool.code" :value="tool.code">{{ tool.label }}</option></select></label>
            <p>Las caras elegidas arriba se usan en el resultado. No modifica tratamientos del plan.</p><button :disabled="pending" @click="evolve">Registrar evolución</button></details>
          <nav class="co26-live-piece-nav" aria-label="Recorrer piezas"><button @click="moveTooth(-1)">← Anterior</button><button @click="moveTooth(1)">Siguiente →</button></nav>
        </aside>
      </div>
      <section class="co26-live-card co26-live-summary" aria-label="Resumen del odontograma">
        <div class="co26-live-section-heading"><div><h3>Resumen del odontograma</h3><p>Hallazgos vigentes y notas. Seleccionar piezas no crea tratamientos.</p></div><button v-if="hasPermission('treatments.create')" class="co26-live-primary" :disabled="busy || pending || !pickedPlanTeeth.length" @click="prepareTreatment">Preparar tratamiento{{ pickedPlanTeeth.length ? ' (' + pickedPlanTeeth.length + ')' : '' }}</button></div>
        <p v-if="!summaryTeeth.length" class="co26-live-empty">Aún no hay hallazgos ni notas. Las piezas sin evaluar no se consideran sanas.</p>
        <div v-for="item in summaryTeeth" :key="item.number" class="co26-live-summary-row"><label v-if="hasPermission('treatments.create')"><input type="checkbox" :value="item.number" v-model="pickedPlanTeeth" :aria-label="'Incluir pieza ' + item.number + ' en el plan'" /></label><button class="co26-live-summary-tooth" @click="selectTooth(item.number).then(focusDetail)">{{ item.number }}</button><div><strong>{{ printFindings(item.number) || 'Sin hallazgos registrados' }}</strong><p v-if="item.tooth.note">{{ item.tooth.note }}</p><span>{{ toothState(item.tooth) }}</span></div></div>
      </section>
    </template>
    <section v-if="chart && printKind === 'snapshot'" class="co26-live-print">
      <h2>Odontograma · {{ patientName }}</h2><p>{{ dentitionLabel(chart.mode) }} · {{ statusLabel(chart.status) }} · revisión {{ chart.revision }} · {{ printedAt }}</p>
      <p>Autor de creación: {{ chart.created_by || 'No disponible' }} · Última finalización: {{ chart.finalized_by || 'Sin finalización registrada' }}</p>
      <p v-if="chart.baseline">Historia disponible desde la captura inicial de datos anteriores; no representa revisiones previas a esa captura.</p>
      <table><thead><tr><th>Pieza FDI</th><th>Evaluación</th><th>Hallazgos vigentes y caras</th><th>Nota</th></tr></thead><tbody>
        <tr v-for="n in printNumbers" :key="n"><td>{{ n }}</td><td>{{ toothState(chart.teeth[n]) }}</td><td>{{ printFindings(n) }}</td><td>{{ chart.teeth[n].note }}</td></tr>
      </tbody></table><p>Caras: M mesial, O oclusal/I incisal, D distal, V vestibular, L lingual/P palatina. Cara pendiente no equivale a pieza completa.</p>
    </section>
    <section v-if="comparisonResult && printKind === 'comparison'" class="co26-live-print">
      <h2>Comparación de odontogramas · {{ patientName }}</h2><p>Impreso: {{ printedAt }}</p>
      <p>Origen: {{ comparisonResult.from.id_chart }} · R{{ comparisonResult.from.revision }} · {{ statusLabel(comparisonResult.from.status) }}. Comparado: {{ comparisonResult.to.id_chart }} · R{{ comparisonResult.to.revision }} · {{ statusLabel(comparisonResult.to.status) }}.</p>
      <p>Comparación estructural: una pieza no incluida o sin hallazgos no se interpreta como sana ni como mejoría.</p>
      <table><thead><tr><th>Pieza FDI</th><th>Cambios de hallazgos</th><th>Nota de origen</th><th>Nota comparada</th><th>Evaluación</th></tr></thead><tbody><tr v-for="row in comparisonResult.teeth" :key="row.number"><td>{{ row.number }} {{ row.before_included && row.after_included ? '' : '(no incluida en ambas denticiones)' }}</td><td>{{ comparisonFindingText(row) }}</td><td>{{ row.before_note || '(vacía)' }}</td><td>{{ row.after_note || '(vacía)' }}</td><td>{{ row.review_changed ? 'La evaluación cambió' : 'Sin cambio' }}</td></tr></tbody></table>
      <p>Caras: M mesial, O oclusal/I incisal, D distal, V vestibular, L lingual/P palatina. Cara pendiente se conserva explícitamente. Evolución y corrección son cambios distintos.</p>
    </section>
  </section>
</template>

<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../../../store/modules/common/module-types';
import fnTypes from '../../../../store/modules/common/fn-types';
import api from '../../../../services/core/odontogram/DAOdontogramV2Service';
import { CaptureSession } from '../../../../domain/odontogram/captureSession';
import { parseCommand } from '../../../../domain/odontogram/commandParser';
import { compareSnapshots } from '../../../../domain/odontogram/compareSnapshots';
import { UsageAggregate } from '../../../../domain/odontogram/usageAggregate';
import { sequence, surfaceLabel } from '../../../../utils/odontogram/dentalContract';
import ToothDrawing from './preview/OdontogramPreviewTooth.vue';
import ActionConfirm from '../../../../core/components/form/dialog/DAActionConfirm.vue';
import odontogramFeedback from '../../../../mixins/odontogramFeedback';
const copy = value => JSON.parse(JSON.stringify(value));
export default {
  mixins:[odontogramFeedback],
  components: { ToothDrawing, ActionConfirm },
  props: { patientId: { type: String, required: true }, patientName: { type: String, default: '' }, mode: { type: String, required: true } },
  data: () => ({ loading: true, busy: false, confirmationOpen:false, error: '', chart: null, session: null, sync: 'saved', pending: false, canUndo: false,
    catalog: [], aliases: {}, walks: {}, walkWarning: false, metricsEnabled: false, overlapProposal:null, printKind:'snapshot', history: [], active: null, historyOpen: false, selected: null, noteDraft: '', noteDirty: false,
    command: '', commandNavigating: false, brushMode: false, pickingPlan: false, toolCode: 'car', surfaces: [], surfacePending: false, indicated: false, evolutionOrigins: [], evolutionOpen: false, evolutionResult: 'res', planFindings: [], pickedPlanTeeth: [], dentitionFilter: 'all',
    newOpen: false, newMode: 'permanent', copyPrevious: false, copyNotes: false, copyFindingIds: [], omitIncompatible: false, requestedRevision: 0, latestRevision: 0, comparison: '', comparisonId: '', comparisonRevision: '', comparisonResult: null, requestId: null, pendingIntent: null, conflictServer: null, printedAt: '', requiresReload: false }),
  computed: {
    ...mapGetters(moduleTypes.AUTH, { hasPermission: fnTypes.hasPermission }),
    captureAllowed() { return this.mode === 'v2' && this.hasPermission('odontogram.capture'); },
    finalizeAllowed() { return this.mode === 'v2' && this.hasPermission('odontogram.finalize'); },
    reopenAllowed() { return this.mode === 'v2' && this.hasPermission('odontogram.reopen'); },
    deleteAllowed() { return this.mode === 'v2' && this.hasPermission('odontogram.delete'); },
    canEdit() { return this.captureAllowed && this.session && this.chart && this.chart.status === 'active' && !this.busy && !['error','offline','conflict'].includes(this.sync) && this.chart.revision === this.latestRevision; },
    current() { return this.chart && this.chart.teeth[this.selected]; },
    activeFindings() { return this.current ? this.current.findings.filter(f => f.status === 'active') : []; },
    activeTool() { return this.catalog.find(tool => tool.code === this.toolCode); },
    printNumbers() { return this.chart ? sequence(this.chart.mode) : []; },
    reviewedCount() { return this.chart ? Object.values(this.chart.teeth).filter(this.isReviewed).length : 0; },
    summaryTeeth() { return this.printNumbers.map(number => ({number, tooth: this.chart.teeth[number]})).filter(item => item.tooth.note || item.tooth.findings.some(f => f.status === 'active')); },
    dentitionFilters() { return [{value:'permanent',label:'Permanente'}, {value:'primary',label:'Temporal'}, {value:'all',label:'Mixta'}]; },
    selectedToothLabel() { const primary = this.selected >= 51; const names = primary ? ['Incisivo central','Incisivo lateral','Canino','Primer molar','Segundo molar'] : ['Incisivo central','Incisivo lateral','Canino','Primer premolar','Segundo premolar','Primer molar','Segundo molar','Tercer molar']; return names[this.selected % 10 - 1] || 'Pieza dental'; },
    selectedQuadrantLabel() { const q = Math.floor(this.selected / 10); return ([1,2,5,6].includes(q) ? 'Superior' : 'Inferior') + ' ' + ([1,4,5,8].includes(q) ? 'derecho' : 'izquierdo') + ' · ' + (q > 4 ? 'temporal' : 'permanente'); },
    traversal() { return this.chart ? this.walks[this.chart.mode] || sequence(this.chart.mode) : []; },
    copyIncompatible() { const target = sequence(this.newMode); return this.chart ? Object.keys(this.chart.teeth).map(Number).filter(n=>!target.includes(n)) : []; },
    copyOptions() { if(!this.chart) return []; const target=sequence(this.newMode); return Object.entries(this.chart.teeth).flatMap(([n,tooth])=>tooth.findings.filter(f=>f.status==='active').map(f=>({id:f.id,tooth:n,label:f.label,faces:f.surface_pending?'Cara pendiente':this.facesLabel(f.surfaces,n)||'Pieza completa',compatible:target.includes(Number(n))}))); },
    syncLabel() { return { saved: 'Guardado confirmado', discarded: 'Borrador descartado; consulta nuevamente antes de seguir capturando', pending: 'Cambios pendientes', saving: 'Guardando…', error: 'Error de guardado', offline: 'Sin confirmación de guardado', conflict: 'Conflicto: conserva tu propuesta y revisa el estado del servidor' }[this.sync]; },
    chartRows() {
      if (!this.chart) return [];
      const order = sequence(this.chart.mode);
      return [{ id: 'upper', label: 'Superior permanente', qs: [1,2] }, { id: 'pu', label: 'Superior temporal', qs: [5,6] },
        { id: 'pl', label: 'Inferior temporal', qs: [7,8], reverse: true }, { id: 'lower', label: 'Inferior permanente', qs: [3,4], reverse: true }]
        .map(row => { const numbers = order.filter(n => row.qs.includes(Math.floor(n/10))); return { ...row, numbers: row.reverse ? numbers.reverse() : numbers }; }).filter(row => row.numbers.length && (this.chart.mode !== 'mixed' || this.dentitionFilter === 'all' || (this.dentitionFilter === 'primary') === (row.qs[0] > 4)));
    },
    commandPreview() {
      if (!this.chart) return '';
      try { const parsed = parseCommand(this.command, this.selected, this.chart.mode, this.catalog, this.aliases, this.traversal); return (parsed.ops.length ? parsed.ops.map(op => 'Pieza ' + op.tooth + ': ' + this.operationLabel(op)).join('; ') : 'Enter vacío: avanzar sin cambios') + ' · Siguiente: ' + parsed.nextTooth; }
      catch (error) { return error.message; }
    }
    ,conflictTeeth() { return this.session && this.session.inflight ? [...new Set(this.session.inflight.ops.map(op => op.tooth))] : []; },
    conflictProposal() { return this.session && this.session.inflight ? this.session.inflight.ops.map(op => 'Pieza ' + op.tooth + ': ' + this.operationLabel(op) + (op.type === 'note.set' ? ' · ' + op.text : '')).join('; ') : ''; },
    pendingSummary() { return this.session ? [...(this.session.inflight ? this.session.inflight.ops : []), ...this.session.pending].map(op => 'Pieza ' + op.tooth + ': ' + this.operationLabel(op)).join('; ') : ''; }
  },
  watch: { toolCode() { if (this.activeTool && this.activeTool.surface) this.brushMode = false; }, copyPrevious() { this.resetCopyChoices(); }, newMode() { this.resetCopyChoices(); }, metricsEnabled(value) { clearInterval(this.usageTimer);this._usage=value?new UsageAggregate():null;if(this._usage){this._usage.visibility(document.hidden);this.usageTimer=setInterval(this.flushUsage,60000);} } },
  mounted() { this.reload(); window.addEventListener('beforeunload', this.beforeUnload); window.addEventListener('keydown', this.shortcut); document.addEventListener('visibilitychange', this.visibilityChanged); },
  beforeDestroy() { this.resolveOverlap(null);this.flushUsage();clearInterval(this.usageTimer);clearTimeout(this.noteTimer); if (this.session) this.session.dispose(); window.removeEventListener('beforeunload', this.beforeUnload); window.removeEventListener('keydown', this.shortcut); document.removeEventListener('visibilitychange', this.visibilityChanged); },
  methods: {
    isReviewed(tooth) { return tooth.reviewed_revision !== null && !tooth.review_invalidated && tooth.reviewed_revision >= tooth.version; },
    toolTone(tool) { return tool.kind === 'presence' ? 'presence' : tool.kind === 'condition' || tool.intent === 'indicated' || this.indicated && this.toolCode === tool.code ? 'condition' : 'restoration'; },
    selectTool(code) { this.toolCode = code; this.surfaces = []; this.surfacePending = false; this.indicated = false; this.brushMode = false; },
    async moveTooth(direction) { const order = this.traversal; await this.selectTooth(order[(order.indexOf(this.selected) + direction + order.length) % order.length]); },
    askConfirmation(message) { return this.$refs.confirmation.open(message,'Confirmar cambio del odontograma'); },
    surfaceLabel,
    recordPointer(event) { if(this._usage)this._usage.interact(['touch','pen'].includes(event.pointerType)?'touch':'mouse'); },
    recordKeyboard() { if(this._usage)this._usage.interact('keyboard'); },
    flushUsage() { if(!this.metricsEnabled||!this._usage||!this.chart)return;const data=this._usage.take(this.chart.mode);if(data.operations||data.errors||data.active_seconds||data.paused_seconds)api.metrics(data).catch(()=>{}); },
    confirmedMetrics(types) { if(this._usage)this._usage.record(types.length,types.filter(type=>['finding.remove','finding.restore','finding.surface','presence.correct','operation.undo'].includes(type)).length); },
    confirmedOperations(types) {
      this.confirmedMetrics(types);
      const labels={'note.set':'Nota guardada.','finding.add':'Hallazgo registrado.','finding.remove':'Corrección guardada.','finding.restore':'Hallazgo restaurado.','finding.surface':'Caras actualizadas.','finding.evolve':'Evolución registrada.','finding.evolve.undo':'Evolución deshecha.','tooth.review':'Revisión guardada.','tooth.unreview':'Revisión retirada.','presence.correct':'Corrección de presencia guardada.','operation.undo':'Cambio deshecho.'};
      this.notifyAction(types.length?'success':'info',types.length===1?labels[types[0]]||'Cambio guardado.':types.length?'Cambios guardados.':'No hay cambios nuevos que guardar.');
    },
    resetCopyChoices() { this.omitIncompatible=false; this.copyFindingIds=this.copyPrevious?this.copyOptions.filter(option=>option.compatible).map(option=>option.id):[]; },
    openNew() { if(this.pendingIntent) { this.error='Primero confirma o descarta la acción pendiente.'; return; } this.newMode=this.chart?this.chart.mode:'permanent'; this.copyPrevious=false; this.copyNotes=false; this.copyFindingIds=[]; this.omitIncompatible=false; this.newOpen=true; },
    operationLabel(op) { if(op.type === 'finding.add') { const tool = this.catalog.find(tool => tool.code === op.code); return (tool ? tool.label : op.code) + ' · ' + (op.surface_pending ? 'cara pendiente' : this.facesLabel(op.surfaces,op.tooth) || 'pieza completa'); } return { 'note.set':'Actualizar nota', 'finding.remove':'Corregir hallazgo', 'finding.restore':'Restaurar captura', 'finding.surface':'Cambiar caras', 'finding.evolve':'Registrar evolución', 'tooth.review':'Marcar revisado conservando contenido', 'tooth.unreview':'Retirar revisión', 'presence.correct':'Corregir presencia', 'operation.undo':'Deshacer' }[op.type] || 'Cambio pendiente'; },
    dentitionLabel(mode) { return { permanent: 'Permanente', primary: 'Temporal', mixed: 'Mixta' }[mode] || mode; },
    historyDate(value) { if(!value)return 'Fecha no disponible';const date=new Date(value);return Number.isNaN(date.getTime())?'Fecha no disponible':new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(date); },
    statusLabel(status) { return { active: 'Activo', finalized: 'Finalizado', deleted: 'Eliminado' }[status] || status; },
    intentLabel(intent) { return { observed: 'Observado', existing: 'Existente', indicated: 'Indicado' }[intent] || intent; },
    focusDetail() { if (this.$refs.detail) { this.$refs.detail.scrollIntoView({ block: 'start' }); this.$refs.detail.focus({ preventScroll: true }); } },
    unwrap(response) { if (!response || !response.success) throw Object.assign(Error(response && response.message || 'No se pudo completar la solicitud.'), { status: response && response.status || 0 }); return response.data; },
    async reload() {
      if ((this.noteDirty || this.session && this.session.hasPending()) && !await this.askConfirmation('La propuesta local pendiente se conserva solo mientras esta vista esté abierta. Una solicitud en vuelo todavía puede confirmarse. ¿Descartar y consultar el servidor?')) return;
      this.loading = true; this.error = '';
      try { const result = this.unwrap(await api.list(this.patientId)); this.metricsEnabled=Boolean(result.metrics_enabled); this.catalog = result.catalog; this.aliases = result.aliases || {}; this.history = result.charts; this.active = result.charts.find(item => item.status === 'active'); this.requiresReload = false;
        if (this.active) await this.selectChart(this.active.id_chart); else { if (this.session) this.session.dispose(); this.session = null; this.chart = null; this.pending = false; this.sync = 'saved'; this.canUndo = false; this.noteDirty = false; }
      } catch (error) { this.error = error.message; } finally { this.loading = false; }
    },
    install(chart, historical = false) {
      if(this._usage&&(!this.chart||this.chart.id_chart!==chart.id_chart)){this.flushUsage();this._usage=new UsageAggregate();this._usage.visibility(document.hidden);}
      if (this.session) this.session.dispose();
      this.chart = chart; this.walks = chart.capture_preferences ? chart.capture_preferences.traversal : this.walks; this.walkWarning = Boolean(chart.capture_preferences && !chart.capture_preferences.valid); this.requiresReload = false; this.aliases = chart.aliases || this.aliases; this.selected = this.traversal[0]; this.noteDraft = chart.teeth[this.selected].note; this.noteDirty = false; this.pending = false; this.sync = 'saved';
      this.latestRevision = historical ? (this.history.find(item => item.id_chart === chart.id_chart) || {}).revision : chart.revision;
      this.requestedRevision = chart.revision; this.evolutionOrigins = []; this.planFindings = []; this.pickedPlanTeeth = []; this.canUndo = false;
      if (!historical && chart.status === 'active') this.session = new CaptureSession(chart, api.operations, session => {
        this.chart = copy(session.chart); this.aliases = this.chart.aliases || this.aliases; this.sync = session.state; this.pending = session.hasPending(); this.canUndo = session.undoStack.length > 0 || session.pending.length > 0 || Boolean(session.inflight);
        if (this.active && this.active.id_chart === this.chart.id_chart) this.active.revision = this.chart.revision;
        this.latestRevision = this.chart.revision; if (!this.noteDirty) this.noteDraft = this.displayNote(this.selected);
        this.error = session.error || ''; if(session.error&&this._usage&&this.metricErrorAttempt!==session.attempts){this.metricErrorAttempt=session.attempts;this._usage.error();}
      }, undefined, this.confirmedOperations); else this.session = null;
    },
    async selectChart(id, keepHistory = false) { try { if(keepHistory && !await this.confirmLeave())return;const chart = this.unwrap(await api.read(id)); this.install(chart); this.historyOpen = keepHistory; } catch (error) { this.error = error.message; } },
    toothState(tooth) { const findings = tooth.findings.some(f => f.status === 'active'); if (this.isReviewed(tooth)) return findings ? 'Revisado · con hallazgos' : 'Revisado sin hallazgos'; if (tooth.reviewed_revision !== null) return findings ? 'Con hallazgos · cambios posteriores' : 'Cambios posteriores'; if (findings) return 'Con hallazgos'; return tooth.note ? 'Nota por revisar' : 'Sin evaluar'; },
    drawing(n) { return { findings: this.chart.teeth[n].findings.filter(f => f.status === 'active').map(f => ({ ...f, indicated: f.intent === 'indicated', surfaces: f.surface_pending ? '?' : f.surfaces })) }; },
    displayNote(n) { if (this.session) { const queued = [...(this.session.inflight ? this.session.inflight.ops : []), ...this.session.pending].filter(op => op.type === 'note.set' && Number(op.tooth) === Number(n)); if (queued.length) return queued[queued.length-1].text; } return this.chart.teeth[n].note; },
    async selectTooth(n, applyBrush = false) { if (!this.stageNote()) return; this.selected = n; this.noteDraft = this.displayNote(n); this.surfaces = []; this.surfacePending = false; this.evolutionOrigins = []; this.evolutionOpen = false; this.planFindings = []; if (applyBrush && this.brushMode && this.canEdit && this.activeTool && !this.activeTool.surface) this.addFinding(); },
    changeNote(text) { this.noteDraft = text; this.noteDirty = true; clearTimeout(this.noteTimer); this.noteTimer = setTimeout(() => { if (this.stageNote() && this.session) this.session.flush(); }, 400); },
    stageNote() { clearTimeout(this.noteTimer); if (!this.noteDirty) return true; if (!this.session) return false;
      try { this.session.enqueue([{ type: 'note.set', tooth: this.selected, text: this.noteDraft }]); this.noteDirty = false; return true; }
      catch (error) { this.error = error.message; return false; }
    },
    enqueue(ops) { try { if (!this.stageNote()) return; this.session.enqueue(ops); this.error = ''; } catch (error) { this.error = error.message; } },
    toggleFace(face) { this.surfacePending = false; this.surfaces = this.surfaces.includes(face) ? this.surfaces.filter(item => item !== face) : [...this.surfaces, face]; },
    pendingSurfaceChanged() { if(this.surfacePending) this.surfaces = []; },
    location(tool) { if (!tool.surface) return { surfaces: null, surface_pending: false }; if (this.surfacePending) return { surfaces: null, surface_pending: true }; if (!this.surfaces.length) throw Error('Selecciona caras o cara por definir.'); return { surfaces: [...'MODVL'].filter(face => this.surfaces.includes(face)).join(''), surface_pending: false }; },
    resolveOverlap(choice) { const resolve=this._overlapResolve;this._overlapResolve=null;this.overlapProposal=null;if(resolve)resolve(choice); },
    trapOverlapFocus(event) { const buttons=this.$refs.overlapDialog.querySelectorAll('button');const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();} },
    async chooseOverlaps(ops) {
      if(this.overlapProposal) return null;
      const proposed=[];
      for(const op of ops) {
        const definition=this.catalog.find(tool=>tool.code===op.code),intent=op.intent||(definition&&definition.intent);
        const findings=[...this.chart.teeth[op.tooth].findings.filter(f=>f.status==='active'),...proposed.filter(item=>item.tooth===op.tooth&&item.type==='finding.add')];
        if(op.type==='finding.add'&&op.surfaces&&findings.some(f=>f.code===op.code&&(f.intent||intent)===intent&&f.surfaces&&f.surfaces!==op.surfaces&&[...op.surfaces].some(face=>f.surfaces.includes(face)))) {
          this.overlapProposal={...op};
          this.$nextTick(()=>{if(this.$refs.overlapDialog)this.$refs.overlapDialog.querySelector('button').focus();});
          const choice=await new Promise(resolve=>{this._overlapResolve=resolve;});if(!choice)return null;op.overlap_choice=choice;
        }
        proposed.push({...op,intent});
      }
      return proposed;
    },
    async addFinding() { try { if(this.overlapProposal)return;const tool = this.activeTool, location = this.location(tool);
      const ops=await this.chooseOverlaps([{ type: 'finding.add', tooth: this.selected, code: tool.code, intent: this.indicated && ['restoration','procedure'].includes(tool.kind) ? 'indicated' : tool.intent, ...location }]);if(ops)this.enqueue(ops);
    } catch (error) { this.error = error.message; } },
    async reviewTooth() { if ((this.noteDraft || this.activeFindings.length) && !await this.askConfirmation('Revisar la pieza ' + this.selected + ' conservará todos sus hallazgos y esta nota: ' + this.noteDraft)) return; this.enqueue([{ type: 'tooth.review', tooth: this.selected }]); },
    async removeFinding(finding) { if (this.pending) return; if (await this.askConfirmation('Corregir ' + finding.label + ' en pieza ' + this.selected + ', caras ' + (finding.surfaces || 'pieza completa') + '. La nota y el historial se conservarán.')) this.enqueue([{ type: 'finding.remove', tooth: this.selected, finding_id: finding.id }]); },
    async evolve() { if (this.pending || !this.evolutionOrigins.length) return; try { const tool = this.catalog.find(item => item.code === this.evolutionResult); const results = tool ? [{ code: tool.code, intent: tool.intent, ...this.location(tool) }] : [];
      if (!await this.askConfirmation('Registrar evolución de ' + this.evolutionOrigins.length + ' hallazgos en pieza ' + this.selected + '. Orígenes conservados en historial; no modifica el plan.')) return;
      this.enqueue([{ type: 'finding.evolve', tooth: this.selected, origins: [...this.evolutionOrigins], results }]); this.evolutionOrigins = [];
    } catch (error) { this.error = error.message; } },
    preventRepeatedEnter(event) { if (event.repeat) event.preventDefault(); },
    async runCommand() { if (!this.canEdit || this.commandNavigating) return; try { const parsed = parseCommand(this.command, this.selected, this.chart.mode, this.catalog, this.aliases, this.traversal);
      if (parsed.ops.some(op => op.type === 'presence.correct') && !await this.askConfirmation(parsed.ops.filter(op => op.type === 'presence.correct').map(op => 'Pieza ' + op.tooth + ': corregir presencia ' + this.chart.teeth[op.tooth].findings.filter(f => f.kind === 'presence' && f.status === 'active').map(f => f.label).join(', ') + '. Nota conservada: ' + this.chart.teeth[op.tooth].note).join('\n'))) return;
      if (parsed.ops.some(op => op.type === 'tooth.review' && (this.displayNote(op.tooth) || this.chart.teeth[op.tooth].findings.some(f => f.status === 'active'))) && !await this.askConfirmation(parsed.ops.filter(op => op.type === 'tooth.review').map(op => 'Pieza ' + op.tooth + ': ' + this.chart.teeth[op.tooth].findings.filter(f=>f.status==='active').map(f=>f.label+' '+(f.surfaces||'')).join(', ') + '. Nota: ' + (op.tooth === this.selected && this.noteDirty ? this.noteDraft : this.displayNote(op.tooth))).join('\n') + '\nMarcar revisadas conserva todo este contenido.')) return;
      if (parsed.ops.length) { const ops=await this.chooseOverlaps(parsed.ops);if(!ops)return; await this.selectTooth(parsed.targets[parsed.targets.length-1]); this.enqueue(ops); }
      this.command = '';
      if (parsed.advance) { this.commandNavigating = true; await this.session.flush(); if (this.pending) return; await this.selectTooth(parsed.nextTooth); }
    } catch (error) { this.error = error.message; } finally { this.commandNavigating = false; } },
    async retry() { if (this.session) { await this.session.retry(); this.pending = this.session.hasPending(); } },
    async discardDraft() {
      if (!await this.askConfirmation('Se descartará la propuesta local. Una solicitud enviada puede haberse guardado aunque no recibieras respuesta. Deberás consultar el servidor antes de continuar. ¿Descartar?')) return;
      clearTimeout(this.noteTimer); if(this.session) this.session.dispose(); this.session = null; this.pendingIntent = null; this.requestId = null; this.pending = false; this.noteDirty = false; this.sync = 'discarded'; this.requiresReload = true; this.conflictServer = null; this.canUndo = false;
      this.notifyAction('warning','Borrador local descartado. Consulta el servidor para comprobar qué quedó guardado.');
    },
    visibilityChanged() { if(this._usage){this._usage.visibility(document.hidden);if(document.hidden)this.flushUsage();} if(document.hidden && this.session && !['error','conflict','offline'].includes(this.session.state) && this.stageNote()) this.session.flush(); },
    async compareConflict() { try { this.conflictServer = this.unwrap(await api.read(this.chart.id_chart)); } catch (error) { this.error = error.message; } },
    async reapplyConflict() {
      if (!this.conflictServer || !this.session || !this.session.inflight || !await this.askConfirmation('Revalidar tu propuesta sobre R' + this.conflictServer.revision + ' como una nueva intención. No sobrescribe sin comprobar las reglas.')) return;
      const ops = [...this.session.inflight.ops, ...this.session.pending].map(op => { const next = { ...op }; delete next.client_op_id; return next; });
      if (ops.length > 100) { this.error = 'La propuesta supera 100 operaciones. Se conserva para revisión; no se dividirá ni aplicará parcialmente.'; return; }
      const server = this.conflictServer; this.install(server); this.conflictServer = null;
      // A rejected batch and its queued dependent intentions are revalidated together.
      this.enqueue(ops);
    },
    async confirmLeave(allowPendingIntent = false) { if(this.overlapProposal || this.confirmationOpen)return false;if (!this.stageNote()) return false; if (this.session) { await this.session.flush(); if (this.session.hasPending()) return false; } return !this.busy && (allowPendingIntent || !this.pendingIntent); },
    beforeUnload(event) { if (this.noteDirty || this.pendingIntent || this.session && this.session.hasPending()) { event.preventDefault(); event.returnValue = ''; } },
    shortcut(event) { if (this.overlapProposal || this.confirmationOpen || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable || this.historyOpen || this.newOpen) return;
      if(event.repeat) return;
      if(event.key === 'Escape') { this.brushMode = false; return; }
      if(['ArrowLeft','ArrowRight'].includes(event.key) && this.chart) { event.preventDefault(); const order = this.traversal, direction = event.key === 'ArrowRight' ? 1 : -1; const n = order[(order.indexOf(this.selected)+direction+order.length)%order.length]; this.selectTooth(n).then(() => { const button = this.$el.querySelector('button[data-tooth="'+n+'"]'); if(button) button.focus(); }); return; }
      if (event.key === '/' && this.canEdit) { event.preventDefault(); this.$refs.command.focus(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && this.canEdit) { event.preventDefault(); this.undo(); }
    },
    async undo() {
      if (!this.session || !this.canEdit) return;
      if (this.session.pending.length) { this.session.cancelLastPending();this.notifyAction('info','Último cambio pendiente retirado; aún no se había guardado.'); return; }
      await this.session.flush(); if (this.session.hasPending()) return;
      const entry = this.session.undoStack.pop(); if (!entry) return;
      const ops = [...entry.ops].reverse().map(original => ({ type: 'operation.undo', tooth: original.tooth, target_op_id: original.client_op_id }));
      if (ops.length) this.enqueue(ops);
    },
    async createChart() { if (this.requiresReload) { this.error = 'Consulta el servidor antes de continuar.'; return; } if (this.busy || !this.captureAllowed || this.active && !this.finalizeAllowed) return; if (!await this.confirmLeave(true)) return;
      if (this.pendingIntent && this.pendingIntent.kind !== 'create') { this.error = 'Primero reintenta la transición pendiente para confirmar su resultado.'; return; }
      let body = { request_id: this.requestId || crypto.randomUUID(), mode: this.newMode };
      if (this.active) Object.assign(body, { replace_active_id: this.active.id_chart, replace_active_revision: this.active.revision });
      if (this.copyPrevious && this.chart) Object.assign(body, { copy_from: this.chart.id_chart, copy_revision: this.chart.revision, copy_notes: this.copyNotes, copy_findings:[...this.copyFindingIds], ...(this.omitIncompatible?{incompatible_decision:'omit'}:{}) });
      if (this.pendingIntent) body = copy(this.pendingIntent.body);
      this.pendingIntent = { kind: 'create', body: copy(body) };
      this.requestId = body.request_id; this.busy = true; try { this.unwrap(await api.create(this.patientId, body)); this.notifyAction('success','Odontograma creado.'); this.pendingIntent = null; this.requestId = null; this.newOpen = false; this.copyPrevious = false; this.copyNotes = false; await this.reload(); } catch (error) { this.error = error.message; if (error.status >= 400 && error.status < 500) { this.pendingIntent = null; this.requestId = null; } } finally { this.busy = false; }
    },
    async transition(action) { if (this.requiresReload) { this.error = 'Consulta el servidor antes de continuar.'; return; } if (this.busy || !await this.confirmLeave(true) || !this.chart) return; const unevaluated = Object.values(this.chart.teeth).filter(tooth => tooth.reviewed_revision === null || tooth.review_invalidated || tooth.reviewed_revision < tooth.version).length; const pendingFaces = Object.values(this.chart.teeth).reduce((count,tooth) => count + tooth.findings.filter(f=>f.status==='active'&&f.surface_pending).length,0); if (!await this.askConfirmation('Confirmar ' + ({ finalize: 'finalización', reopen: 'reapertura', delete: 'eliminación' }[action]) + ' del odontograma R' + this.chart.revision + '. Las notas y revisiones se conservarán. Pendientes de evaluar: ' + unevaluated + '. Caras por definir: ' + pendingFaces + '. No se convertirán piezas vacías en sanas.')) return;
      if (this.pendingIntent && (this.pendingIntent.kind !== action || this.pendingIntent.chart !== this.chart.id_chart)) { this.error = 'Primero reintenta la acción pendiente para confirmar su resultado.'; return; }
      if (action === 'reopen' && this.active && !this.finalizeAllowed) { this.error = 'Necesitas permiso para finalizar el activo.'; return; }
      let body = { request_id: this.requestId || crypto.randomUUID(), expected_revision: this.chart.revision, generation: this.chart.generation };
      if (action === 'reopen' && this.active) Object.assign(body, { replace_active_id: this.active.id_chart, replace_active_revision: this.active.revision });
      if (this.pendingIntent) body = copy(this.pendingIntent.body);
      this.pendingIntent = { kind: action, chart: this.chart.id_chart, body: copy(body) };
      this.requestId = body.request_id; this.busy = true; try { this.unwrap(await api.transition(this.chart.id_chart, action, body)); this.notifyAction('success',({finalize:'Odontograma finalizado.',reopen:'Odontograma reabierto.',delete:'Odontograma eliminado.'})[action]); this.pendingIntent = null; this.requestId = null; await this.reload(); } catch (error) { this.error = error.message; if (error.status >= 400 && error.status < 500) { this.pendingIntent = null; this.requestId = null; } } finally { this.busy = false; }
    },
    async openHistory() { if (!await this.confirmLeave()) return; try { const result = this.unwrap(await api.list(this.patientId)); this.history = result.charts; this.active = result.charts.find(item => item.status === 'active'); this.historyOpen = true; } catch (error) { this.error = error.message; } },
    async retryIntent() {
      if (!this.pendingIntent || this.busy) return;
      const intent = copy(this.pendingIntent); this.busy = true;
      try { this.unwrap(await (intent.kind === 'create' ? api.create(this.patientId, intent.body) : api.transition(intent.chart, intent.kind, intent.body))); this.notifyAction('success','Acción confirmada por el servidor.'); this.pendingIntent = null; this.requestId = null; this.newOpen = false; await this.reload(); }
      catch (error) { this.error = error.message; if (error.status >= 400 && error.status < 500) { this.pendingIntent = null; this.requestId = null; } } finally { this.busy = false; }
    },
    setComparison(before,after) { this.comparisonResult=compareSnapshots(before,after); this.comparison='R'+before.revision+' ('+this.statusLabel(before.status)+') → R'+after.revision+' ('+this.statusLabel(after.status)+'). Comparación estructural; no infiere mejoría de datos ausentes.'; },
    comparisonLocation(f,n) { return f.surface_pending?'Cara pendiente':this.facesLabel(f.surfaces,n)||'Pieza completa'; },
    comparisonFindingText(row) { return [...row.added.map(f=>'Alta/restauración de captura: '+f.label+' '+this.comparisonLocation(f,row.number)),...row.removed.map(f=>(f.resulting_status==='resolved'?'Evolución: ':f.resulting_status==='corrected'?'Corrección: ':'No vigente en la instantánea: ')+f.label+' '+this.comparisonLocation(f,row.number)),...row.changed.map(f=>'Caras/intención: '+f.label+' '+this.comparisonLocation(f.before,row.number)+' ('+this.intentLabel(f.before.intent)+') → '+this.comparisonLocation(f,row.number)+' ('+this.intentLabel(f.intent)+')')].join('; ')||'Sin cambio de hallazgos'; },
    async compareOther() { try { if(!await this.confirmLeave()) return; const revision=this.comparisonRevision===''?undefined:Number(this.comparisonRevision); const other=this.unwrap(await api.read(this.comparisonId,revision)); this.setComparison(this.chart,other); } catch(error) { this.error=error.message; } },
    async loadRevision() { try { if(!await this.confirmLeave())return;const previous = this.chart; const chart = this.unwrap(await api.read(this.chart.id_chart, this.requestedRevision)); this.install(chart, true); this.setComparison(previous,chart); } catch (error) { this.error = error.message; } },
    facesLabel(faces,n) { return faces ? [...faces].map(face => surfaceLabel(face,Number(n))).join('') : ''; },
    printFindings(n) { return this.chart.teeth[n].findings.filter(f => f.status === 'active').map(f => f.label + ' (' + this.intentLabel(f.intent) + ') · ' + (f.surface_pending ? 'Cara pendiente' : this.facesLabel(f.surfaces,n) || 'Pieza completa')).join('; '); },
    async prepareTreatment() {
      if (!await this.confirmLeave()) return;
      const teeth = this.pickedPlanTeeth.length ? this.pickedPlanTeeth : [this.selected];
      const tooth_details = teeth.map(tooth => {
        const findings = tooth === this.selected ? this.activeFindings.filter(f => this.planFindings.includes(f.id)) : [];
        const sources = (findings.length ? findings : [null]).map(finding => ({ id_chart: this.chart.id_chart, revision: this.chart.revision,
          finding_id: finding ? finding.id : null, is_current: this.chart.status === 'active' && this.chart.revision === this.latestRevision,
          context:{label:finding?finding.label:'Pieza '+tooth,surfaces:finding?finding.surfaces:null} }));
        const faces = [...'MODVL'].filter(face => findings.some(finding => finding.surfaces && finding.surfaces.includes(face))).join('');
        return { tooth_number: String(tooth), surfaces: faces || null, manual_surfaces:null, manual: false, sources };
      });
      this.$emit('prepare-treatment', { id_person: this.patientId, tooth_details });
      this.notifyAction('info','Selección preparada en el plan. Revisa y guarda el tratamiento para confirmarlo.');
    },
    async printChart(kind) {
      if (!await this.confirmLeave()) return;
      this.printKind=kind==='comparison'?'comparison':'snapshot';this.printedAt=new Date().toLocaleString('es-MX');await this.$nextTick();
      const content=this.$el.querySelector('.co26-live-print');if(!content)return;
      // Print outside Vuetify/layout ancestors: hidden elements still occupied
      // space and positioned/transformed ancestors displaced the old print block.
      const root=document.createElement('div');root.id='co26-print-root';root.appendChild(content.cloneNode(true));document.body.appendChild(root);
      document.body.classList.add('co26-printing');
      try { window.print(); } catch(error) { this.error='No se pudo abrir la impresión. Vuelve a intentarlo.'; }
      finally { document.body.classList.remove('co26-printing');root.remove(); }
    }
  }
};
</script>

<style scoped>
.co26-live { padding: 20px; color: var(--color-text,#25364d); background: var(--color-surface); }
.co26-overlap-dialog { position:fixed; z-index:10000; top:20%; left:5%; width:90%; max-height:70vh; overflow:auto; background:var(--color-surface); box-shadow:0 0 0 100vmax rgba(0,0,0,.5); }
.co26-live header,.co26-live-actions { display:flex; gap:12px; flex-wrap:wrap; justify-content:space-between; }
.co26-live header { align-items:center; }.co26-live-actions { justify-content:flex-start;align-items:center;gap:8px; }
.co26-live h2 { font-size:24px; }.co26-live h3 { font-size:16px; margin:12px 0; }
.co26-live button { min-height:44px; padding:8px 12px; border:1px solid var(--color-border,#d8e9ef); border-radius:8px; }
.co26-live-primary { background:var(--color-primary-800,#086783);border-color:var(--color-primary-800,#086783)!important;color:#fff; }.co26-live-back { border:0!important;padding:4px 0!important;min-height:36px!important;color:var(--color-primary-800,#086783);font-weight:600; }
.co26-live-menu,.co26-live-advanced,.co26-live-finding-menu,.co26-live-evolution { position:relative; }.co26-live-menu summary,.co26-live-advanced summary,.co26-live-finding-menu summary,.co26-live-evolution summary { cursor:pointer;color:var(--color-primary-800,#086783);font-weight:600;min-height:40px;display:flex;align-items:center; }.co26-live-menu summary { padding:0 12px;border:1px solid var(--color-border,#d8e9ef);border-radius:8px; }.co26-live-menu-panel { position:absolute;right:0;top:calc(100% + 6px);z-index:5;min-width:230px;padding:8px;display:grid;gap:4px;background:var(--color-surface);border:1px solid var(--color-border,#d8e9ef);border-radius:10px;box-shadow:0 8px 24px rgba(27,55,75,.14); }.co26-live-menu-panel button { text-align:left;border:0;min-height:40px; }.co26-live-menu-panel button:hover,.co26-live-advanced button:hover,.co26-live-finding-menu button:hover { background:var(--color-primary-50,#effbfe); }.co26-live-menu-danger { color:#b42335; }
.co26-live-advanced,.co26-live-evolution { margin-top:8px; }.co26-live-advanced button,.co26-live-finding-menu button,.co26-live-evolution button { min-height:38px;margin:2px 4px 2px 0; }.co26-live-finding-menu { display:inline-block;margin-left:8px;vertical-align:middle; }.co26-live-finding-menu summary { min-height:32px;font-size:12px; }.co26-live aside ul { padding-left:18px; }.co26-live aside li { margin:10px 0; }
.co26-live button:disabled { opacity:.5; }.co26-live button:focus-visible,.co26-live input:focus-visible,.co26-live textarea:focus-visible { outline:2px solid var(--color-primary-700); outline-offset:2px; }
.co26-live-grid { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:20px; }.co26-live aside { border:1px solid var(--color-border,#d8e9ef); padding:16px; border-radius:12px; }
.co26-live-scroll { overflow-x:auto; padding:4px; }.co26-live-teeth { display:flex; gap:6px; width:max-content; }
.co26-live-teeth button { display:flex; flex-direction:column; align-items:center; width:68px; }.co26-live-teeth small { font-size:10px; }
.co26-live button[aria-pressed=true] { background:var(--color-primary-50,#effbfe); border-color:var(--color-primary-700); }
.co26-live ::v-deep svg { width:44px; height:66px; }.co26-live ::v-deep .co26-root-line { fill:none; stroke:currentColor; }
.co26-live ::v-deep .co26-fill-empty { fill:var(--color-surface); }.co26-live ::v-deep .co26-fill-condition { fill:#f4c7cb; }.co26-live ::v-deep .co26-fill-restoration { fill:#c2daf7; }.co26-live ::v-deep .co26-fill-presence { fill:#d7dce3; }.co26-live ::v-deep .co26-presence-mark { stroke:currentColor; fill:none; stroke-width:3; }
.co26-live label { display:block; margin:10px 0; }.co26-live textarea,.co26-live select,.co26-live input:not([type=checkbox]) { width:100%; border:1px solid var(--color-border,#d8e9ef); padding:10px; border-radius:6px; background:var(--color-surface); color:inherit; }.co26-live textarea { min-height:100px; }
.co26-live-surfaces { display:flex; flex-wrap:wrap; gap:6px; }.co26-live-surfaces button { min-width:44px; }
.co26-live-plan-picks { display:flex; gap:8px; flex-wrap:wrap; }.co26-live-plan-picks label { min-height:44px; min-width:44px; display:flex; align-items:center; gap:4px; font-size:12px; }
.co26-live-error { padding:12px; border:1px solid #c84b5c; margin:12px 0; }.co26-live-dialog { padding:16px; margin:16px 0; border:1px solid var(--color-border,#d8e9ef); }.co26-live-command { margin:20px 0; }
.co26-live-new-dialog { position:relative;margin:24px 0 32px;padding:24px 28px 20px;border:1px solid var(--color-primary-300);border-left:5px solid var(--color-primary-700);border-radius:14px;background:linear-gradient(135deg,var(--color-primary-50,#f0fbfd),var(--color-surface) 72%);box-shadow:0 8px 24px rgba(15,92,111,.09); }.co26-live-new-heading { margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--color-border,#d8e9ef); }.co26-live-new-heading>span { color:var(--color-primary-700);font-size:11px;font-weight:600;letter-spacing:1.2px; }.co26-live-new-heading h3 { margin:5px 0;font-size:20px; }.co26-live-new-heading p { margin:0;color:var(--color-text-secondary,#64748b);font-size:13px; }.co26-live-new-dialog>label { font-weight:600; }.co26-live-new-actions { display:flex;align-items:center;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border,#d8e9ef); }.co26-live-new-actions .co26-live-primary { min-width:180px; }.co26-live-new-actions .co26-live-cancel { border-color:transparent;background:transparent;color:var(--color-text-secondary,#64748b); }
.co26-live-print { display:none; }.co26-live-print table { width:100%; border-collapse:collapse; }.co26-live-print td,.co26-live-print th { border:1px solid #555; padding:6px; white-space:pre-wrap; overflow-wrap:anywhere; }
.co26-history { margin:24px 0;padding:24px;border:1px solid var(--color-border,#d8e9ef);border-radius:16px;background:var(--color-surface); }
.co26-history-heading { display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px; }.co26-history-eyebrow { color:var(--color-primary-700);font-size:11px;font-weight:600;letter-spacing:1.3px; }.co26-history-heading h3 { display:flex;align-items:center;gap:10px;font-size:20px;margin:6px 0; }.co26-history-heading p,.co26-history-hint { font-size:13px;color:var(--color-text-secondary,#64748b); }.co26-history-count { font-size:12px;padding:3px 9px;border-radius:20px;background:var(--color-primary-50,#effbfe);color:var(--color-primary-700); }
.co26-history-list { display:grid;gap:12px; }.co26-history-card { display:flex;align-items:center;gap:16px;border:1px solid var(--color-border,#d8e9ef);border-radius:12px;padding:18px; }.co26-history-selected { border-color:var(--color-primary-500);background:var(--color-primary-50,#effbfe); }.co26-history-icon { flex-shrink:0;display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--color-primary-50,#effbfe); }.co26-history-content { flex:1;min-width:0; }.co26-history-card-title { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }.co26-history-card h4 { font-size:16px;font-weight:600;margin:0; }.co26-history-status,.co26-history-viewed { font-size:11px;border-radius:16px;padding:4px 9px;background:var(--color-gray98);color:var(--color-text-secondary,#64748b); }.co26-history-active { background:#e7f6ed;color:#166534; }.co26-history-viewed { background:var(--color-primary-100);color:var(--color-primary-800,#086783); }.co26-history-content time { display:block;font-size:14px;margin-top:7px; }.co26-history-meta { display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--color-text-secondary,#64748b);margin-top:5px; }.co26-history-open { color:var(--color-primary-800,#086783);font-weight:600;white-space:nowrap; }.co26-history-open span { margin-left:8px; }.co26-history-hint { margin-top:16px; }.co26-history-empty { text-align:center;padding:30px; }
.co26-history-tools { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px;border-top:1px solid var(--color-border,#d8e9ef);padding-top:20px; }.co26-history-tools form { border-radius:10px;padding:16px;background:var(--color-primary-50,#f5fafc); }.co26-history-tools h4 { font-size:15px;font-weight:600; }.co26-history-tools p { font-size:12px;color:var(--color-text-secondary,#64748b);margin-top:6px; }
@media(max-width:650px) { .co26-history { padding:16px; }.co26-history-heading { flex-wrap:wrap; }.co26-history-card { flex-wrap:wrap;padding:14px;gap:12px; }.co26-history-open { width:100%; }.co26-history-tools { grid-template-columns:1fr; }.co26-history-meta { gap:6px; } }
.co26-live-comparison { width:100%; border-collapse:collapse; table-layout:fixed; }.co26-live-comparison td,.co26-live-comparison th { padding:8px; border:1px solid var(--color-border,#d8e9ef); white-space:pre-wrap; overflow-wrap:anywhere; }
@media(max-width:1000px) { .co26-live-grid { grid-template-columns:minmax(0,1fr); } }
@media(max-width:650px) { .co26-live { padding:14px; }.co26-live header { align-items:flex-start; }.co26-live-actions { width:100%; }.co26-live-menu-panel { left:0;right:auto; }.co26-live aside { padding:12px; }.co26-live-new-dialog { margin:20px 0 28px;padding:18px 16px 14px; }.co26-live-new-actions { align-items:stretch;flex-direction:column; }.co26-live-new-actions button { width:100%; } }
@media print { .co26-live-actions,.co26-live-command,.co26-live aside button,.co26-live aside select,.co26-live-dialog { display:none!important; }.co26-live-scroll { overflow:visible; }.co26-live-teeth { flex-wrap:wrap; width:auto; }.co26-live-grid { display:block; } }
/* Capture layout follows the CO26 handoff; all controls use the live session. */
.co26-live { --co26-muted:var(--color-text-secondary,#64748b); --co26-accent:var(--color-primary-700); padding:24px; border:1px solid var(--color-border,#d8e9ef); border-radius:16px; }
.co26-live-hero { padding:0 0 20px; border-bottom:1px solid var(--color-border,#d8e9ef); }
.co26-live-title { display:flex; align-items:center; gap:12px; margin:4px 0; }
.co26-live-title h2 { font-size:28px; font-weight:600; margin:0; }
.co26-live .co26-live-eyebrow { margin:0; font-size:10px; font-weight:600; letter-spacing:1.4px; color:var(--co26-accent); }
.co26-live-hero p:not(.co26-live-eyebrow),.co26-live-section-heading p { font-size:12px; color:var(--co26-muted); margin:4px 0 0; }
.co26-live-badge { display:inline-flex; align-items:center; width:fit-content; padding:4px 10px; border-radius:20px; background:var(--color-primary-50,#effbfe); color:var(--co26-accent); font-size:11px; font-weight:600; }
.co26-live-statusbar { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:14px 0; font-size:12px; color:var(--co26-muted); }
.co26-live-sync { display:flex; align-items:center; gap:7px; color:var(--co26-accent); }.co26-live-sync::before { content:''; width:7px; height:7px; border-radius:50%; background:currentColor; }.co26-live-unsaved { color:#a66b08; }
.co26-live-help { margin-bottom:16px; font-size:12px; color:var(--co26-muted); }.co26-live-help summary { cursor:pointer; min-height:44px; display:flex; align-items:center; }.co26-live-help p { margin:8px 0; }
.co26-live-card { border:1px solid var(--color-border,#d8e9ef); border-radius:14px; padding:20px; background:var(--color-surface); min-width:0; }
.co26-live-capture-grid { display:grid; grid-template-columns:minmax(0,1fr) 280px; gap:16px; margin-bottom:16px; }
.co26-live-section-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:16px; }.co26-live-section-heading h3 { font-size:15px; font-weight:600; margin:0; }.co26-live-section-heading h3 span { font-size:12px; font-weight:400; color:var(--co26-muted); }
.co26-live-command { margin:0; }.co26-live-command label { margin:0 0 6px; font-size:12px; }.co26-live-command-input { display:flex; align-items:stretch; border:1px solid var(--color-border,#d8e9ef); border-radius:8px; overflow:hidden; }.co26-live-command-input strong { display:flex; align-items:center; padding:0 14px; color:var(--co26-accent); background:var(--color-primary-50,#effbfe); }.co26-live-command-input input { border:0!important; border-radius:0!important; min-width:0; }.co26-live-command-input button { border:0; border-radius:0; min-width:48px; font-size:22px; }.co26-live-command p { margin:8px 0; font-size:12px; color:var(--co26-muted); overflow-wrap:anywhere; }
.co26-live-shortcuts { font-size:11px; color:var(--co26-muted); margin:12px 0 0; }.co26-live kbd { font:10px monospace; padding:3px 5px; background:var(--color-primary-50,#f0f6f8); border:1px solid var(--color-border,#d8e9ef); border-radius:4px; color:var(--co26-muted); }
.co26-live-progress > strong { font-size:36px; font-weight:600; color:var(--co26-accent); }.co26-live-progress strong small { font-size:16px; font-weight:400; color:var(--co26-muted); }.co26-live-progress > p { font-size:12px; margin:0 0 8px; }.co26-live-progress > span { font-size:11px; color:var(--co26-muted); }.co26-live-progress progress { display:block; width:100%; height:7px; margin:10px 0; accent-color:var(--co26-accent); border:0; border-radius:20px; overflow:hidden; background:var(--color-border,#d8e9ef); }.co26-live-progress progress::-webkit-progress-bar { background:var(--color-border,#d8e9ef); }.co26-live-progress progress::-webkit-progress-value { background:var(--co26-accent); }
.co26-live-palette { margin-bottom:18px; }.co26-live-palette label { font-size:12px; margin:0; }.co26-live-tools { display:flex; flex-wrap:wrap; gap:8px; }.co26-live-tools button { display:flex; align-items:center; gap:7px; font-size:12px; }.co26-live-tools kbd { margin-left:3px; }.co26-live-dot { display:inline-block; width:8px; height:8px; border-radius:3px; flex-shrink:0; }.co26-live-tone-condition,.co26-live-tone-procedure { background:#cf526c; }.co26-live-tone-restoration { background:#3985b9; }.co26-live-tone-presence { background:#8896a5; }
.co26-live-grid { grid-template-columns:minmax(0,1fr) 320px; gap:18px; align-items:start; }.co26-live-arches { padding:20px 16px; }.co26-live-hint { font-size:11px; color:var(--co26-muted); margin:0 0 12px; }.co26-live-orientation { display:flex; justify-content:space-between; gap:12px; font-size:9px; letter-spacing:.5px; color:var(--co26-muted); margin:16px 4px 0; }
.co26-live-filter { display:flex; border-radius:8px; padding:3px; background:var(--color-primary-50,#effbfe); }.co26-live-filter button { border-color:transparent; font-size:11px; padding:6px 8px; }.co26-live-filter button[aria-pressed=true] { border-color:var(--co26-accent); }
.co26-live-row { padding:8px 0 18px; border-bottom:1px dashed var(--color-border,#d8e9ef); }.co26-live-row > h3 { text-align:center; text-transform:uppercase; letter-spacing:1px; font-size:10px; color:var(--co26-muted); font-weight:400; margin:12px 0; }.co26-live-teeth { margin:0 auto; gap:3px; }.co26-live-teeth button { width:50px; min-width:50px; padding:8px 1px; border-color:transparent; color:var(--co26-muted); }.co26-live-teeth button > strong { position:relative; font-size:11px; color:var(--color-text,#25364d); }.co26-live-check { position:absolute; left:20px; top:-6px; color:var(--co26-accent); font-size:10px; }.co26-live-teeth button:hover { background:var(--color-primary-50,#effbfe); }.co26-live-teeth small { font-size:10px; }.co26-live-teeth ::v-deep svg { width:44px; height:70px; }
.co26-live-legend { display:flex; flex-wrap:wrap; gap:12px; padding-top:18px; font-size:10px; color:var(--co26-muted); }.co26-live-legend span { display:flex; gap:5px; align-items:center; }
.co26-live aside.co26-live-detail { border-top:3px solid var(--co26-accent); padding:18px; }.co26-live-detail-title { display:flex; align-items:center; gap:12px; }.co26-live-detail-title > strong { display:grid; place-items:center; width:56px; height:56px; font-size:28px; color:var(--co26-accent); background:var(--color-primary-50,#effbfe); border-radius:12px; }.co26-live-detail-title h3 { margin:0 0 4px; font-size:13px; font-weight:600; }.co26-live-detail-title p { margin:0; font-size:11px; color:var(--co26-muted); }.co26-live-evaluation { margin:12px 0; }
.co26-live-tooth-detail { display:grid; grid-template-columns:64px minmax(0,1fr); gap:12px; align-items:center; margin:10px 0 16px; }.co26-live-tooth-detail ::v-deep svg { width:64px; height:96px; }.co26-live-tooth-detail h4 { font-size:12px; font-weight:600; color:var(--co26-accent); }.co26-live-tooth-detail p { font-size:10px; color:var(--co26-muted); margin:5px 0 8px; }.co26-live-tooth-detail label { font-size:11px; }.co26-live-surfaces { gap:4px; }.co26-live-surfaces button { padding:8px; font-size:12px; }.co26-live-apply { width:100%; }.co26-live-note { font-size:12px; font-weight:600; }.co26-live-note textarea { margin-top:6px; min-height:72px; font-size:12px; font-weight:400; }
.co26-live-detail ul { list-style:none; padding:0!important; font-size:12px; }.co26-live-detail li { padding:10px 0; border-bottom:1px solid var(--color-border,#d8e9ef); overflow-wrap:anywhere; }.co26-live-piece-actions,.co26-live-piece-nav { display:flex; gap:8px; justify-content:space-between; margin-top:12px; }.co26-live-piece-actions button,.co26-live-piece-nav button { font-size:11px; }.co26-live-evolution-picker { font-size:12px; margin-top:12px; }.co26-live-back { display:none; }.co26-live-panel-jump { display:none; }
.co26-live summary,.co26-live .co26-live-menu-panel button,.co26-live .co26-live-advanced button,.co26-live .co26-live-finding-menu button,.co26-live .co26-live-evolution button { min-height:44px; }.co26-live button { cursor:pointer; }.co26-live button:disabled { cursor:default; }.co26-live input[type=checkbox] { width:18px; height:18px; accent-color:var(--co26-accent); vertical-align:middle; margin-right:4px; }.co26-live label:has(input[type=checkbox]) { min-height:44px; display:flex; align-items:center; gap:5px; }
.co26-live-summary { margin-top:18px; }.co26-live-summary-row { display:flex; align-items:center; gap:12px; padding:14px 0; border-top:1px solid var(--color-border,#d8e9ef); }.co26-live-summary-row > div { min-width:0; }.co26-live-summary-row strong { font-size:12px; font-weight:500; overflow-wrap:anywhere; }.co26-live-summary-row p { font-size:12px; margin:4px 0; white-space:pre-wrap; overflow-wrap:anywhere; color:var(--co26-muted); }.co26-live-summary-row span { font-size:10px; color:var(--co26-muted); }.co26-live-summary-row label { display:grid; place-items:center; min-width:44px; margin:0; }.co26-live-summary-tooth { min-width:44px; font-weight:600; color:var(--co26-accent); background:var(--color-primary-50,#effbfe); }.co26-live-empty { padding:18px 0; font-size:13px; color:var(--co26-muted); }
.co26-live-summary-row > div > span { display:block; margin-top:4px; }
.co26-live ::v-deep .co26-pending-dot { fill:#a66b08; }
.co26-live select:focus-visible,.co26-live summary:focus-visible { outline:2px solid var(--co26-accent); outline-offset:2px; }
@media(min-width:1200px) { .co26-live-detail { position:sticky; top:20px; } }
@media(max-width:1199px) { .co26-live-grid { grid-template-columns:minmax(0,1fr); }.co26-live-panel-jump { display:block; margin:10px 0; }.co26-live .co26-live-back { display:block; min-height:44px!important; margin-bottom:12px; }.co26-live-tooth-detail { grid-template-columns:80px minmax(0,1fr); } }
@media(max-width:700px) { .co26-live { padding:14px; }.co26-live-capture-grid { grid-template-columns:minmax(0,1fr); }.co26-live-card { padding:16px; }.co26-live-progress > strong { font-size:28px; }.co26-live-title h2 { font-size:24px; }.co26-live-actions { width:auto; }.co26-live-tools button { flex:1 0 140px; justify-content:flex-start; }.co26-live-tools kbd { margin-left:auto; }.co26-live-section-heading { align-items:flex-start; }.co26-live-menu-panel { left:auto; right:0; min-width:210px; }.co26-live-arches { padding:14px 10px; }.co26-live-filter { flex-wrap:wrap; }.co26-live-summary-row { gap:6px; }.co26-live-shortcuts { line-height:2; } }
</style>
<style>
html[data-theme='clinical-night'] .co26-live {
  --co26-muted:#b4c3d6;
  --co26-accent:#8dd4e8;
  --color-text:#e2e8f0;
  --color-text-secondary:#b4c3d6;
  --color-surface:#1e293b;
  --color-border:#405369;
  --color-primary-50:#163b47;
  --color-primary-100:#163b47;
  --color-primary-700:#8dd4e8;
  --color-primary-800:#086783;
}
html[data-theme='clinical-night'] .co26-live-menu summary,
html[data-theme='clinical-night'] .co26-live-advanced summary,
html[data-theme='clinical-night'] .co26-live-finding-menu summary,
html[data-theme='clinical-night'] .co26-live-evolution summary,
html[data-theme='clinical-night'] .co26-live-back { color:var(--co26-accent); }
#co26-print-root { display:none; }
@media print {
  body.co26-printing > :not(#co26-print-root) { display:none!important; }
  body.co26-printing { margin:0!important;padding:0!important;background:#fff!important; }
  body.co26-printing #co26-print-root { display:block!important;color:#111;background:#fff;font:10pt/1.35 Arial,sans-serif; }
  #co26-print-root .co26-live-print { display:block!important;position:static!important;width:100%;margin:0!important;padding:0!important; }
  #co26-print-root h2 { font-size:16pt;margin:0 0 6pt; }
  #co26-print-root p { margin:0 0 6pt;overflow-wrap:anywhere; }
  #co26-print-root table { width:100%;border-collapse:collapse;table-layout:fixed;font-size:9pt; }
  #co26-print-root th,#co26-print-root td { border:1px solid #555;padding:4pt;white-space:pre-wrap;overflow-wrap:anywhere;vertical-align:top; }
  #co26-print-root th:first-child { width:12%; }
  #co26-print-root thead { display:table-header-group; }
  #co26-print-root tr { break-inside:avoid;page-break-inside:avoid; }
}
</style>
