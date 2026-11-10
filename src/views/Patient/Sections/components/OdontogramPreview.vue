<template>
  <section class="co26" aria-label="Vista previa del odontograma CO26">
    <div class="co26-demo">
      <div>
        <strong>VISTA PREVIA · CO26</strong
        ><span
          >Paciente ficticio. Todo se simula y se reinicia al salir; no
          pertenece al expediente abierto.</span
        >
      </div>
      <button class="co26-button" @click="$emit('close')">
        Volver al odontograma actual
      </button>
    </div>
    <header class="co26-hero">
      <div>
        <p class="co26-eyebrow">EXPEDIENTE CLÍNICO / EXPLORACIÓN DENTAL</p>
        <div class="co26-title">
          <h2>Odontograma</h2>
          <span class="co26-badge" :class="{ 'co26-green': !closed }">{{
            closed ? 'Finalizado' : 'Activo'
          }}</span>
        </div>
        <p>Paciente de ejemplo · {{ recordLabel }} · revisión {{ revision }}</p>
      </div>
      <div class="co26-actions">
        <button class="co26-button" @click="openDialog('history')">
          ◷ Historial
          <span class="co26-badge">{{ history.length }}</span></button
        ><button
          class="co26-button"
          :disabled="role !== 'doctor' || sync !== 'saved'"
          @click="openDialog('new')"
        >
          ＋ Nuevo odontograma</button
        ><button
          class="co26-button co26-primary"
          :disabled="role !== 'doctor' || sync !== 'saved'"
          @click="openDialog(closed ? 'reopen' : 'finalize')"
        >
          {{ closed ? 'Reabrir' : 'Finalizar' }}
        </button>
      </div>
    </header>
    <div class="co26-demo-controls">
      <label
        >Simular acceso<select v-model="role">
          <option value="doctor">Capturar y finalizar</option>
          <option value="assistant">Capturar, sin finalizar</option>
          <option value="read">Solo lectura</option>
        </select></label
      ><label
        >Simular guardado<select v-model="sync">
          <option value="saved">Guardado simulado</option>
          <option value="pending">Cambios pendientes</option>
          <option value="error">Error de conexión</option>
          <option value="conflict">Conflicto de versión</option>
        </select></label
      ><button class="co26-link" @click="openDialog('help')">
        Guía de esta vista</button
      ><span class="co26-sync" :class="{ 'co26-warning': sync !== 'saved' }">{{
        syncText
      }}</span>
    </div>
    <div v-if="sync !== 'saved'" class="co26-alert" role="status">
      <strong>{{ syncText }}</strong>
      <p>
        {{
          sync === 'conflict'
            ? 'La pieza cambió en otra sesión. Revisa la versión antes de volver a aplicar.'
            : 'El cierre espera a que se confirme el guardado. En esta vista no hay conexión real.'
        }}
      </p>
      <button
        class="co26-button"
        @click="sync === 'conflict' ? openDialog('conflict') : (sync = 'saved')"
      >
        {{
          sync === 'conflict'
            ? 'Revisar conflicto'
            : 'Simular reintento correcto'
        }}
      </button>
    </div>
    <div v-if="!canEdit" class="co26-note">
      {{
        closed
          ? 'Odontograma finalizado: consulta sin edición.'
          : role === 'read'
          ? 'Acceso de solo lectura: captura y notas deshabilitadas.'
          : 'Resuelve el estado de guardado simulado para continuar.'
      }}
    </div>
    <div class="co26-capture-grid">
      <section class="co26-card co26-keyboard">
        <div class="co26-row">
          <h3>Captura rápida <span class="co26-muted">/ teclado</span></h3>
          <button class="co26-link" @click="openDialog('help')">
            Ver atajos
          </button>
        </div>
        <form @submit.prevent="runCommand">
          <label for="co26-command" class="co26-sr">Comando de captura</label>
          <div class="co26-command">
            <span>{{ selected }}</span
            ><input
              id="co26-command"
              ref="command"
              v-model="command"
              :disabled="!canEdit"
              autocomplete="off"
              placeholder="16 car mo · 18 aus · res o · ok"
            /><button type="submit" :disabled="!canEdit">
              ↵ <span class="co26-sr">Aplicar comando</span>
            </button>
          </div>
        </form>
        <p>
          Actual <strong>{{ selected }}</strong> → siguiente
          <strong>{{ nextTooth }}</strong
          >. Enter vacío avanza sin marcar sano.
        </p>
        <p class="co26-shortcuts">
          <kbd>Enter</kbd> aplicar <kbd>/</kbd> enfocar captura
          <kbd>Ctrl Z</kbd> deshacer fuera de textos
        </p>
      </section>
      <section class="co26-card co26-progress">
        <p class="co26-eyebrow">EXPLORACIÓN DE EJEMPLO</p>
        <strong
          >{{ reviewedCount }}
          <small>/ {{ visibleNumbers.length }}</small></strong
        >
        <p>piezas revisadas en esta consulta</p>
        <div class="co26-progress-track">
          <span
            :style="{
              width: (reviewedCount / visibleNumbers.length) * 100 + '%'
            }"
          ></span>
        </div>
        <span class="co26-muted"
          >{{ untouchedCount }} sin evaluar · {{ summary.length }} con
          hallazgos</span
        >
      </section>
    </div>
    <section class="co26-card co26-palette">
      <div class="co26-row">
        <div>
          <h3>Pincel <span class="co26-muted">/ tableta y mouse</span></h3>
          <p>Elige un hallazgo, una pieza y sus caras en el panel ampliado.</p>
        </div>
        <div class="co26-actions">
          <label class="co26-check"
            ><input
              v-model="indicated"
              type="checkbox"
              :disabled="!canEdit || activeTool.kind !== 'restoration'"
            />Por realizar</label
          ><button
            class="co26-button"
            :disabled="!canEdit || !undoStack.length"
            @click="undo"
          >
            ↶ Deshacer
          </button>
        </div>
      </div>
      <div class="co26-tools">
        <button
          v-for="tool in tools"
          :key="tool.code"
          :disabled="!canEdit"
          :aria-pressed="toolCode === tool.code"
          @click="
            toolCode = tool.code;
            surfaces = [];
            undefinedSurface = false;
            indicated = false;
          "
        >
          <span class="co26-dot" :class="'co26-bg-' + tool.kind"></span
          >{{ tool.label }}<kbd>{{ tool.code }}</kbd>
        </button>
      </div>
    </section>
    <div class="co26-workspace">
      <section class="co26-card co26-chart-card">
        <div class="co26-row">
          <div>
            <h3>Arcadas dentales</h3>
            <p>Vista desde el profesional · numeración FDI</p>
          </div>
          <div class="co26-segment" aria-label="Dentición">
            <button
              v-for="d in dentitions"
              :key="d.id"
              :aria-pressed="mode === d.id"
              @click="changeMode(d.id)"
            >
              {{ d.label }}
            </button>
          </div>
        </div>
        <p class="co26-scroll-hint">
          ↔ Desliza para recorrer la arcada. Toca una pieza para ver su detalle.
        </p>
        <button class="co26-button co26-panel-jump" @click="focusDetail">
          Pieza {{ selected }} · Ir al panel de captura ↓
        </button>
        <div
          class="co26-chart-scroll"
          tabindex="0"
          aria-label="Arcadas con desplazamiento horizontal"
        >
          <div class="co26-chart">
            <div class="co26-orientation">
              <span>DERECHA DEL PACIENTE</span
              ><span>IZQUIERDA DEL PACIENTE</span>
            </div>
            <div v-for="row in chartRows" :key="row.id" class="co26-arch">
              <span class="co26-arch-label">{{ row.label }}</span>
              <div
                class="co26-teeth-row"
                :class="{ 'co26-primary-row': row.numbers.length === 10 }"
              >
                <button
                  v-for="n in row.numbers"
                  :key="n"
                  class="co26-tooth"
                  :class="{
                    selected: selected === n,
                    reviewed: teeth[n].reviewed
                  }"
                  :aria-label="'Diente ' + n + ': ' + stateLabel(teeth[n])"
                  :aria-pressed="selected === n"
                  @click="selectTooth(n)"
                >
                  <span class="co26-tooth-number"
                    >{{ n
                    }}<span v-if="teeth[n].reviewed" class="co26-tick"
                      >✓</span
                    ></span
                  ><tooth-drawing :number="n" :tooth="teeth[n]" /><span
                    class="co26-tooth-status"
                    >{{ teeth[n].findings.length || '·' }}</span
                  >
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="co26-legend">
          <span
            ><i class="co26-dot co26-bg-condition"></i>Hallazgo / por
            realizar</span
          ><span><i class="co26-dot co26-bg-restoration"></i>Existente</span
          ><span><i class="co26-dot co26-bg-presence"></i>Presencia</span
          ><span>✓ Revisado</span><span>· Sin evaluar</span>
        </div>
      </section>
      <aside
        tabindex="-1"
        ref="detail"
        class="co26-card co26-detail"
        aria-label="Detalle de la pieza seleccionada"
      >
        <div class="co26-detail-title">
          <strong>{{ selected }}</strong>
          <div>
            <h3>{{ toothName(selected) }}</h3>
            <p>{{ position(selected) }}</p>
          </div>
        </div>
        <span class="co26-badge">{{ stateLabel(current) }}</span>
        <div class="co26-enlarged">
          <tooth-drawing :number="selected" :tooth="current" />
          <div>
            <p class="co26-eyebrow">
              {{ activeTool.label }}{{ indicated ? ' · por realizar' : '' }}
            </p>
            <p>
              {{
                activeTool.surface
                  ? 'Selecciona una o varias caras'
                  : 'Aplica a la pieza completa'
              }}
            </p>
            <div class="co26-surfaces">
              <button
                v-for="s in ['M', 'O', 'D', 'V', 'L']"
                :key="s"
                :aria-label="'Cara ' + surfaceLabel(s, selected)"
                :disabled="!canEdit || !activeTool.surface"
                :aria-pressed="surfaces.includes(s)"
                @click="toggleSurface(s)"
              >
                {{ surfaceLabel(s, selected) }}
              </button>
            </div>
            <label v-if="activeTool.surface" class="co26-check"
              ><input
                v-model="undefinedSurface"
                type="checkbox"
                :disabled="!canEdit"
                @change="surfaces = []"
              />Cara por definir</label
            >
          </div>
        </div>
        <button
          class="co26-button co26-primary co26-full"
          :disabled="!canEdit"
          @click="applyFinding"
        >
          Aplicar {{ activeTool.label.toLowerCase() }}
        </button>
        <div class="co26-finding-list">
          <div
            v-for="(f, i) in current.findings"
            :key="f.id + i"
            class="co26-finding"
          >
            <span class="co26-dot" :class="'co26-bg-' + tone(f)"></span
            ><span
              ><strong>{{ f.label }}</strong
              ><small
                >{{
                  f.surfaces
                    ? f.surfaces === '?'
                      ? 'Cara por definir'
                      : f.surfaces
                          .split('')
                          .map((s) => surfaceLabel(s, selected))
                          .join(' · ')
                    : 'Pieza completa'
                }}{{ f.indicated ? ' · por realizar' : '' }}</small
              ></span
            ><button
              class="co26-icon"
              :disabled="!canEdit"
              :aria-label="'Corregir ' + f.label"
              @click="
                correctionIndex = i;
                openDialog('correct');
              "
            >
              ×
            </button>
          </div>
          <p v-if="!current.findings.length" class="co26-muted">
            Sin hallazgos registrados. Esto no significa que esté sano.
          </p>
        </div>
        <label
          >Nota de la pieza <span class="co26-muted">(opcional)</span
          ><textarea
            :key="selected + '-' + revision"
            :value="current.note"
            :disabled="!canEdit"
            maxlength="1000"
            rows="2"
            placeholder="Observaciones de esta pieza"
            @change="updateNote($event.target.value)"
          ></textarea>
        </label>
        <div class="co26-actions co26-detail-actions">
          <button class="co26-button" :disabled="!canEdit" @click="review">
            {{
              current.findings.length ? 'Marcar revisado' : 'Marcar sano'
            }}</button
          ><button
            class="co26-link"
            :disabled="
              !canEdit || !current.findings.some((f) => tone(f) === 'condition')
            "
            @click="
              evolutionOrigin = [];
              openDialog('evolve');
            "
          >
            Registrar evolución
          </button>
        </div>
        <div class="co26-row">
          <button class="co26-button" @click="move(-1)">← Anterior</button
          ><button class="co26-button" @click="move(1)">Siguiente →</button>
        </div>
      </aside>
    </div>
    <section class="co26-card co26-summary">
      <div class="co26-row">
        <div>
          <p class="co26-eyebrow">DE LA EXPLORACIÓN AL PLAN</p>
          <h3>Resumen del odontograma</h3>
          <p>Selecciona el contexto que quieras llevar a un tratamiento.</p>
        </div>
        <button class="co26-button" @click="openPlan([])">
          ＋ Tratamiento manual
        </button>
      </div>
      <div class="co26-summary-grid">
        <label v-for="item in summary" :key="item.n" class="co26-summary-item"
          ><input v-model="picked" type="checkbox" :value="item.n" /><strong>{{
            item.n
          }}</strong
          ><span>{{
            item.tooth.findings
              .map((f) => f.label + (f.surfaces ? ' · ' + f.surfaces : ''))
              .join(' / ')
          }}</span></label
        >
        <p v-if="!summary.length" class="co26-muted">
          Sin hallazgos. El plan manual sigue disponible.
        </p>
      </div>
      <div class="co26-row co26-summary-foot">
        <span class="co26-muted"
          >{{ picked.length }} piezas seleccionadas · no crea tratamientos
          automáticamente</span
        ><button
          class="co26-button co26-primary"
          :disabled="!picked.length"
          @click="openPlan(picked.map((n) => ({ n })))"
        >
          Preparar tratamiento →
        </button>
      </div>
    </section>
    <section v-if="plans.length" class="co26-card">
      <h3>
        Tratamientos de ejemplo
        <span class="co26-badge">{{ plans.length }}</span>
      </h3>
      <div v-for="(p, i) in plans" :key="i" class="co26-saved-plan">
        <strong>{{ p.name }}</strong
        ><span>{{
          Object.keys(p.teeth).join(', ') || 'Sin piezas asociadas'
        }}</span
        ><span class="co26-badge">Pendiente · simulado</span>
      </div>
    </section>
    <p class="co26-footer-note">
      Referencia visual CO26 · datos ficticios · las reglas clínicas, permisos y
      persistencia se implementan conforme al MD.
    </p>
    <div
      class="co26-toast"
      role="status"
      aria-live="polite"
      :class="{ visible: message }"
    >
      {{ message }}
    </div>
    <plan-editor
      v-if="planOpen"
      :teeth="visibleTeeth"
      :revision="revision"
      :initial="planInitial"
      :mode-label="modeLabel"
      @close="planOpen = false"
      @save="savePlan"
    />
    <v-dialog
      :value="Boolean(dialog)"
      max-width="760"
      scrollable
      @input="!$event && (dialog = '')"
      ><div class="co26 co26-modal" role="dialog" aria-modal="true" aria-labelledby="co26-dialog-title">
        <header class="co26-modal-head">
          <div>
            <p class="co26-eyebrow">ODONTOGRAMA · SIMULACIÓN</p>
            <h2 id="co26-dialog-title">{{ dialogTitle }}</h2>
          </div>
          <button
            class="co26-icon"
            aria-label="Cerrar ventana"
            @click="dialog = ''"
          >
            ×
          </button>
        </header>
        <div class="co26-modal-body">
          <template v-if="dialog === 'review'"
            ><p>
              Revisa la pieza <strong>{{ selected }}</strong> antes de
              continuar.
            </p>
            <div class="co26-note">
              {{
                current.findings.map((f) => f.label).join(' · ') ||
                'Sin hallazgos'
              }}
              <p v-if="current.note">Nota previa: {{ current.note }}</p>
            </div>
            <p>
              Se conservan todos los hallazgos, restauraciones y notas. Revisar
              no resuelve un hallazgo ni lo borra.
            </p></template
          >
          <template v-if="dialog === 'correct'"
            ><p>
              Quitar <strong>{{ correctionLabel }}</strong> de la pieza
              <strong>{{ selected }}</strong> como corrección de captura.
            </p>
            <p>
              Los demás hallazgos y la nota se conservan. Si ya fue atendido,
              usa Registrar evolución.
            </p></template
          >
          <template v-if="dialog === 'evolve'"
            ><p>Selecciona el hallazgo de origen en la pieza {{ selected }}.</p>
            <label
              v-for="(f, i) in current.findings.filter(
                (f) => tone(f) === 'condition'
              )"
              :key="i"
              class="co26-import-row"
              ><input
                v-model="evolutionOrigin"
                type="checkbox"
                :value="f.id"
              />{{ f.label }} · {{ f.surfaces || 'Pieza completa' }}</label
            ><label
              >Resultado ilustrativo<select v-model="evolutionResult">
                <option value="res">Resina existente</option>
                <option value="cor">Corona existente</option>
              </select></label
            >
            <p class="co26-note">
              El origen queda en el historial de ejemplo como resuelto por
              evolución. No completa tratamientos del plan.
            </p></template
          >
          <template v-if="dialog === 'finalize'"
            ><p>
              Se finalizará el odontograma de ejemplo en la revisión
              {{ revision }}.
            </p>
            <div class="co26-note">
              <strong>{{ untouchedCount }} piezas sin evaluar</strong>
              <p>No se marcarán sanas. Los hallazgos y notas se conservarán.</p>
            </div>
            <p>
              El permiso de finalizar se administra por puesto. Esta selección
              de acceso es solo una simulación.
            </p></template
          >
          <template v-if="dialog === 'reopen'"
            ><p>
              Continuarás el mismo odontograma de ejemplo. El cierre anterior
              permanece registrado en el historial.
            </p></template
          >
          <template v-if="dialog === 'new'"
            ><p>
              El doctor puede continuar el actual o iniciar uno para otra
              consulta.
            </p>
            <label
              >Dentición<select v-model="newMode">
                <option v-for="d in dentitions" :key="d.id" :value="d.id">
                  {{ d.label }}
                </option>
              </select></label
            ><label class="co26-import-row"
              ><input v-model="copyPrevious" type="checkbox" />Partir del
              odontograma actual</label
            >
            <div v-if="copyPrevious" class="co26-note">
              Se copiarán
              {{
                sequence(newMode).filter((n) => teeth[n].findings.length).length
              }}
              piezas con hallazgos compatibles con la dentición elegida. Se
              reinician las marcas de revisión.
              <p>
                {{
                  sequence('mixed').filter(
                    (n) =>
                      !sequence(newMode).includes(n) && teeth[n].findings.length
                  ).length
                }}
                piezas con hallazgos quedan fuera por la dentición; permanecen
                en el original.
              </p>
              <label class="co26-check"
                ><input v-model="copyNotes" type="checkbox" />Copiar también
                notas, con procedencia</label
              >
            </div>
            <p>
              El actual se conserva en el historial. En blanco es la opción
              predeterminada.
            </p></template
          >
          <template v-if="dialog === 'history'"
            ><p>Documentos de ejemplo. Consultar uno no lo activa.</p>
            <button
              v-for="(h, i) in history"
              :key="i"
              class="co26-history-item"
              @click="
                historical = h;
                dialog = 'historical';
              "
            >
              <span
                ><strong>{{ h.label }}</strong
                ><small
                  >{{ h.modeLabel }} · revisión {{ h.revision }} ·
                  {{ h.reason }}</small
                ></span
              ><span>Consultar →</span>
            </button>
            <p v-if="!history.length">
              Aún no hay registros de ejemplo.
            </p></template
          >
          <template v-if="dialog === 'historical' && historical"
            ><p>
              {{ historical.label }} · revisión {{ historical.revision }} · solo
              consulta
            </p>
            <div
              v-for="n in sequence(historical.mode).filter(
                (n) =>
                  historical.teeth[n].findings.length ||
                  historical.teeth[n].note
              )"
              :key="n"
              class="co26-historical-row"
            >
              <strong>{{ n }}</strong
              ><span
                >{{
                  historical.teeth[n].findings
                    .map((f) => f.label + ' ' + f.surfaces)
                    .join(' / ')
                }}<small>{{ historical.teeth[n].note }}</small></span
              >
            </div></template
          >
          <template v-if="dialog === 'conflict'"
            ><div class="co26-compare">
              <div>
                <h3>Tu captura pendiente</h3>
                <p>Pieza 16 · Caries M O</p>
                <span class="co26-badge">Base r14</span>
              </div>
              <div>
                <h3>Versión recibida</h3>
                <p>Pieza 16 · Resina M O</p>
                <span class="co26-badge">Servidor r15</span>
              </div>
            </div>
            <p>
              Ejemplo visual fijo. En desarrollo se mostrarán las diferencias
              reales antes de decidir qué conservar; no se aplica una mezcla
              automática.
            </p></template
          >
          <template v-if="dialog === 'help'"
            ><p>
              Recorre captura con teclado, pincel, notas, historial, cierre y
              plan manual/importado. Todos los cambios existen solo en memoria.
            </p>
            <dl class="co26-help">
              <dt>16 car mo</dt>
              <dd>Agregar caries en M y O; permanece en 16.</dd>
              <dt>18 aus</dt>
              <dd>Marcar ausente y avanzar a 17.</dd>
              <dt>res o</dt>
              <dd>Agregar resina en la pieza seleccionada.</dd>
              <dt>15 car ?</dt>
              <dd>Mostrar cara por definir explícitamente.</dd>
              <dt>ok</dt>
              <dd>Revisión contextual; conserva hallazgos y notas.</dd>
              <dt>Enter vacío</dt>
              <dd>Avanzar sin modificar la pieza.</dd>
            </dl>
            <p>
              Esta maqueta no implementa el parser completo (rangos, alias y
              lotes), validación clínica, auditoría persistente ni reglas de
              concurrencia. El MD es la especificación de esas funciones. Voz
              queda pendiente.
            </p></template
          >
        </div>
        <footer class="co26-modal-foot">
          <button class="co26-button" @click="dialog = ''">
            {{
              ['history', 'historical', 'help'].includes(dialog)
                ? 'Cerrar'
                : 'Cancelar'
            }}</button
          ><button
            v-if="!['history', 'historical', 'help'].includes(dialog)"
            class="co26-button co26-primary"
            :disabled="dialog === 'evolve' && !evolutionOrigin.length"
            @click="confirmDialog"
          >
            {{ confirmLabel }}
          </button>
        </footer>
      </div></v-dialog
    >
  </section>
</template>
<script>
import ToothDrawing from './preview/OdontogramPreviewTooth.vue';
import PlanEditor from './preview/OdontogramPreviewPlan.vue';
import {
  dentitions,
  rows,
  sequence,
  tools,
  clone,
  finding,
  makeTeeth,
  toothName,
  position,
  surfaceLabel,
  tone
} from './preview/odontogramPreviewFixtures';
export default {
  components: { ToothDrawing, PlanEditor },
  data() {
    return {
      dentitions,
      tools,
      teeth: makeTeeth(),
      mode: 'permanent',
      selected: 16,
      toolCode: 'car',
      surfaces: [],
      undefinedSurface: false,
      indicated: false,
      role: 'doctor',
      sync: 'saved',
      closed: false,
      revision: 14,
      recordLabel: '29 oct 2026 · consulta de ejemplo',
      command: '',
      message: '',
      undoStack: [],
      picked: [],
      planOpen: false,
      planInitial: [],
      plans: [],
      dialog: '',
      advanceAfterReview: false,
      correctionIndex: 0,
      evolutionOrigin: [],
      evolutionResult: 'res',
      newMode: 'permanent',
      copyPrevious: false,
      copyNotes: false,
      historical: null,
      history: [
        {
          label: '20 sep 2026 · consulta anterior',
          revision: 8,
          mode: 'mixed',
          modeLabel: 'Mixta',
          teeth: makeTeeth(),
          reason: 'Finalizado · ejemplo'
        }
      ]
    };
  },
  computed: {
    current() {
      return this.teeth[this.selected];
    },
    activeTool() {
      return tools.find((t) => t.code === this.toolCode);
    },
    canEdit() {
      return !this.closed && this.role !== 'read' && this.sync === 'saved';
    },
    modeLabel() {
      return dentitions.find((d) => d.id === this.mode).label;
    },
    visibleNumbers() {
      return sequence(this.mode);
    },
    visibleTeeth() {
      const result = {};
      this.visibleNumbers.forEach((n) => {
        result[n] = this.teeth[n];
      });
      return result;
    },
    reviewedCount() {
      return this.visibleNumbers.filter((n) => this.teeth[n].reviewed).length;
    },
    untouchedCount() {
      return this.visibleNumbers.filter(
        (n) =>
          !this.teeth[n].reviewed &&
          !this.teeth[n].findings.length &&
          !this.teeth[n].note
      ).length;
    },
    summary() {
      return this.visibleNumbers
        .filter((n) => this.teeth[n].findings.length)
        .map((n) => ({ n, tooth: this.teeth[n] }));
    },
    nextTooth() {
      return this.visibleNumbers[
        (this.visibleNumbers.indexOf(this.selected) + 1) %
          this.visibleNumbers.length
      ];
    },
    chartRows() {
      const r = [];
      if (this.mode !== 'primary')
        r.push({
          id: 'upper',
          label: 'Superior · permanente',
          numbers: rows.upper
        });
      if (this.mode !== 'permanent')
        r.push(
          {
            id: 'primaryUpper',
            label: 'Superior · temporal',
            numbers: rows.primaryUpper
          },
          {
            id: 'primaryLower',
            label: 'Inferior · temporal',
            numbers: rows.primaryLower
          }
        );
      if (this.mode !== 'primary')
        r.push({
          id: 'lower',
          label: 'Inferior · permanente',
          numbers: rows.lower
        });
      return r;
    },
    syncText() {
      return {
        saved: '✓ Guardado simulado',
        pending: '◷ Cambios pendientes',
        error: 'No se pudo guardar',
        conflict: 'Conflicto por revisar'
      }[this.sync];
    },
    correctionLabel() {
      return (
        this.current.findings[this.correctionIndex] &&
        this.current.findings[this.correctionIndex].label
      );
    },
    dialogTitle() {
      return {
        review: 'Revisar hallazgos y nota',
        correct: 'Corregir captura',
        evolve: 'Registrar evolución',
        finalize: 'Finalizar odontograma',
        reopen: 'Reabrir odontograma',
        new: 'Nuevo odontograma',
        history: 'Historial de odontogramas',
        historical: 'Consulta de un odontograma anterior',
        help: 'Guía del cascarón visual',
        conflict: 'Revisar diferencias'
      }[this.dialog];
    },
    confirmLabel() {
      return {
        review: 'Conservar y marcar revisado',
        correct: 'Confirmar corrección',
        evolve: 'Registrar evolución de ejemplo',
        finalize: 'Finalizar ejemplo',
        reopen: 'Reabrir ejemplo',
        new: 'Crear ejemplo',
        conflict: 'Cerrar simulación de conflicto'
      }[this.dialog];
    }
  },
  mounted() {
    window.addEventListener('keydown', this.shortcut);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.shortcut);
    clearTimeout(this.toastTimer);
  },
  methods: {
    sequence,
    toothName,
    position,
    surfaceLabel,
    tone,
    stateLabel(t) {
      return t.findings.length
        ? t.reviewed
          ? 'Con hallazgos · revisado'
          : 'Con hallazgos'
        : t.note && !t.reviewed
        ? 'Nota pendiente de revisar'
        : t.reviewed
        ? 'Revisado sin hallazgos'
        : 'Sin evaluar';
    },
    notify(text) {
      this.message = text;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.message = '';
      }, 5500);
    },
    changeMode(mode) {
      this.mode = mode;
      if (!sequence(mode).includes(this.selected))
        this.selected = sequence(mode)[0];
      this.picked = [];
      this.surfaces = [];
      this.undefinedSurface = false;
    },
    selectTooth(n) {
      this.selected = n;
      this.surfaces = [];
      this.undefinedSurface = false;
    },
    focusDetail() {
      this.$refs.detail.scrollIntoView({ block: 'start' });
      this.$refs.detail.focus({ preventScroll: true });
    },
    move(direction) {
      const ns = this.visibleNumbers;
      this.selectTooth(
        ns[(ns.indexOf(this.selected) + direction + ns.length) % ns.length]
      );
    },
    toggleSurface(s) {
      this.undefinedSurface = false;
      this.surfaces = this.surfaces.includes(s)
        ? this.surfaces.filter((v) => v !== s)
        : [...this.surfaces, s];
    },
    checkpoint() {
      this.undoStack.push(clone(this.teeth));
      if (this.undoStack.length > 30) this.undoStack.shift();
    },
    changed(text) {
      this.revision++;
      this.notify(text + ' · solo en memoria');
    },
    undo() {
      if (!this.canEdit || !this.undoStack.length) return;
      this.teeth = this.undoStack.pop();
      this.changed('Último cambio deshecho');
    },
    applyFinding() {
      if (!this.canEdit) return;
      const t = this.activeTool;
      const faces = this.undefinedSurface
        ? '?'
        : 'MODVL'
            .split('')
            .filter((s) => this.surfaces.includes(s))
            .join('');
      if (t.surface && !faces)
        return this.notify('Elige una cara o marca Cara por definir.');
      if (
        this.current.findings.some((f) => f.kind === 'presence') &&
        t.kind !== 'presence'
      )
        return this.notify(
          'Revisa la presencia de esta pieza antes de agregar otro hallazgo.'
        );
      if (
        t.kind === 'presence' &&
        this.current.findings.some((f) => f.code !== t.code)
      )
        return this.notify(
          'La pieza tiene hallazgos. Corrige explícitamente antes de cambiar su presencia.'
        );
      if (
        this.current.findings.some(
          (f) =>
            f.code === t.code &&
            f.surfaces === faces &&
            f.indicated === this.indicated
        )
      ) {
        this.notify('Ese hallazgo ya está registrado.');
        if (t.kind === 'presence') this.move(1);
        return;
      }
      this.checkpoint();
      const f = finding(
        t.code,
        t.surface ? faces : '',
        t.kind === 'restoration' && this.indicated
      );
      f.id += '-' + this.revision;
      this.current.findings.push(f);
      this.current.reviewed = false;
      this.changed(t.label + ' en ' + this.selected);
      if (t.kind === 'presence') this.move(1);
    },
    updateNote(value) {
      if (!this.canEdit || value === this.current.note) return;
      this.checkpoint();
      this.current.note = value;
      this.current.reviewed = false;
      this.changed('Nota actualizada');
    },
    review(advance = false) {
      if (!this.canEdit) return;
      this.advanceAfterReview = advance === true;
      if (this.current.findings.length || this.current.note)
        this.openDialog('review');
      else this.markReviewed();
    },
    markReviewed() {
      this.checkpoint();
      this.current.reviewed = true;
      this.changed(
        'Pieza ' + this.selected + ' revisada; contenido conservado'
      );
    },
    runCommand() {
      if (!this.canEdit) return;
      const text = this.command.trim().toLowerCase();
      if (!text) return this.move(1);
      const match = text.match(
        /^(?:(\d{2})\s+)?(ok|car|fx|rr|res|a|sel|cor|endo|imp|ext|aus|ne)(!)?(?:\s+([modvlpi?]+))?$/
      );
      if (!match)
        return this.notify(
          'Ejemplos disponibles: 16 car mo, 18 aus, res o, 15 car ?, ok.'
        );
      const n = match[1] ? Number(match[1]) : this.selected;
      if (!this.visibleNumbers.includes(n))
        return this.notify('La pieza no pertenece a esta dentición.');
      this.selectTooth(n);
      this.command = '';
      if (match[2] === 'ok') {
        this.review(true);
        if (!this.dialog) this.move(1);
        return;
      }
      this.toolCode = match[2];
      this.indicated = Boolean(match[3]);
      this.undefinedSurface = match[4] === '?';
      this.surfaces = (match[4] || '')
        .toUpperCase()
        .replace(/P/g, 'L')
        .replace(/I/g, 'O')
        .split('');
      this.applyFinding();
    },
    shortcut(event) {
      if (this.dialog || this.planOpen || event.defaultPrevented) return;
      if (
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) ||
        event.target.isContentEditable
      )
        return;
      if (event.key === '/' && this.canEdit) {
        event.preventDefault();
        this.$refs.command.focus();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'z' &&
        this.canEdit
      ) {
        event.preventDefault();
        this.undo();
      }
    },
    openDialog(name) {
      if (name === 'new') {
        this.newMode = this.mode;
        this.copyPrevious = false;
        this.copyNotes = false;
      }
      this.dialog = name;
    },
    archive(reason) {
      this.history.unshift({
        label: this.recordLabel,
        revision: this.revision,
        mode: this.mode,
        modeLabel: this.modeLabel,
        teeth: clone(this.teeth),
        reason
      });
    },
    confirmDialog() {
      const action = this.dialog;
      if (['review', 'correct', 'evolve'].includes(action) && !this.canEdit)
        return;
      if (
        ['new', 'finalize', 'reopen'].includes(action) &&
        (this.role !== 'doctor' || this.sync !== 'saved')
      )
        return;
      if (action === 'review') {
        this.markReviewed();
        if (this.advanceAfterReview) this.move(1);
      }
      if (action === 'correct') {
        this.checkpoint();
        this.current.findings.splice(this.correctionIndex, 1);
        this.current.reviewed = false;
        this.changed('Captura corregida; nota conservada');
      }
      if (action === 'evolve') {
        this.archive('Antes de evolución en ' + this.selected);
        this.checkpoint();
        const origins = this.current.findings.filter((f) =>
          this.evolutionOrigin.includes(f.id)
        );
        this.current.findings = this.current.findings.filter(
          (f) => !this.evolutionOrigin.includes(f.id)
        );
        this.current.findings.push(
          finding(
            this.evolutionResult,
            this.evolutionResult === 'res'
              ? [
                  ...new Set(origins.map((f) => f.surfaces || '').join(''))
                ].join('') || '?'
              : ''
          )
        );
        this.current.reviewed = false;
        this.changed('Evolución registrada; origen disponible en historial');
      }
      if (action === 'finalize') {
        this.archive('Cierre de ejemplo');
        this.closed = true;
        this.undoStack = [];
        this.changed('Odontograma finalizado');
      }
      if (action === 'reopen') {
        this.closed = false;
        this.undoStack = [];
        this.changed('Odontograma reabierto');
      }
      if (action === 'new') {
        this.archive('Previo a nueva consulta');
        const previous = this.teeth;
        this.teeth = makeTeeth(false);
        if (this.copyPrevious)
          sequence(this.newMode).forEach((n) => {
            this.teeth[n].findings = clone(previous[n].findings);
            if (this.copyNotes && previous[n].note)
              this.teeth[n].note = 'Copiada del anterior: ' + previous[n].note;
          });
        this.mode = this.newMode;
        this.selected = sequence(this.mode)[0];
        this.recordLabel = 'Nueva consulta de ejemplo';
        this.revision = 1;
        this.closed = false;
        this.undoStack = [];
        this.picked = [];
        this.notify(
          'Nuevo odontograma de ejemplo; el original sigue en historial.'
        );
      }
      if (action === 'conflict') this.sync = 'saved';
      this.dialog = '';
    },
    openPlan(initial) {
      this.planInitial = initial;
      this.planOpen = true;
    },
    savePlan(draft) {
      this.plans.push(draft);
      this.planOpen = false;
      this.picked = [];
      this.notify(
        'Tratamiento agregado al listado de ejemplo. No se guardó en el sistema.'
      );
    }
  }
};
</script>
<style>
.co26 {
  --co-ink: #25364d;
  --co-muted: #62758a;
  --co-surface: #fff;
  --co-bg: #f4f8fa;
  --co-border: #d9e5eb;
  --co-accent: #086783;
  --co-tint: #eaf7fa;
  --co-red: #c84b5c;
  --co-blue: #397ad0;
  color: var(--co-ink);
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
}
.co26 *,
.co26 *::before,
.co26 *::after {
  box-sizing: border-box;
}
.co26 h2,
.co26 h3,
.co26 p {
  margin: 0;
  color: inherit;
}
.co26 h2 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.co26 h3 {
  font-size: 16px;
  font-weight: 700;
}
.co26 p {
  line-height: 1.6;
}
.co26 p + p {
  margin-top: 8px;
}
.co26 .co26-eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--co-accent);
  margin-bottom: 6px;
}
.co26-muted {
  color: var(--co-muted);
  font-size: 12px;
  font-weight: 400;
}
.co26 button {
  cursor: pointer;
  font: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.co26 button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.co26 button:focus-visible,
.co26 input:focus-visible,
.co26 textarea:focus-visible,
.co26 select:focus-visible,
.co26 [tabindex]:focus-visible {
  outline: 3px solid #35a8c8;
  outline-offset: 2px;
}
.co26 button:hover:not(:disabled) {
  border-color: var(--co-accent);
}
.co26-button,
.co26-icon {
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid var(--co-border);
  border-radius: 10px;
  color: var(--co-ink);
  background: var(--co-surface);
  font-size: 12px !important;
  font-weight: 700 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.co26 .co26-primary {
  color: white;
  background: var(--co-accent);
  border-color: var(--co-accent);
}
.co26-icon {
  min-width: 44px;
  padding: 5px;
  font-size: 22px !important;
}
.co26-link {
  min-height: 44px;
  color: var(--co-accent);
  padding: 8px;
  border: 1px solid transparent;
  font-size: 12px !important;
  font-weight: 700 !important;
}
.co26-full {
  width: 100%;
}
.co26-demo {
  padding: 14px 18px;
  border: 1px solid #ead9a5;
  background: #fffae9;
  color: #6b5319;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}
.co26-demo strong {
  font-size: 10px;
  letter-spacing: 0.1em;
  display: block;
  margin-bottom: 4px;
}
.co26-demo span {
  font-size: 12px;
}
.co26-demo .co26-button {
  flex-shrink: 0;
}
.co26-hero,
.co26-row,
.co26-actions,
.co26-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.co26-hero,
.co26-row {
  justify-content: space-between;
}
.co26-hero {
  padding: 10px 0 20px;
  flex-wrap: wrap;
}
.co26-hero p:not(.co26-eyebrow),
.co26-card > .co26-row p {
  color: var(--co-muted);
  font-size: 12px;
  margin-top: 5px;
}
.co26-actions {
  flex-wrap: wrap;
}
.co26-badge {
  display: inline-block;
  font-size: 10px;
  line-height: 1.6;
  border-radius: 20px;
  background: var(--co-tint);
  color: var(--co-accent);
  padding: 3px 9px;
  font-weight: 700;
}
.co26-green {
  background: #e6f5ed;
  color: #187552;
}
.co26 label {
  display: block;
  font-size: 12px;
  font-weight: 600;
}
.co26 input:not([type='checkbox']),
.co26 select,
.co26 textarea {
  display: block;
  width: 100%;
  min-height: 44px;
  background: var(--co-surface);
  color: var(--co-ink);
  border: 1px solid var(--co-border);
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  margin-top: 6px;
}
.co26 select {
  appearance: auto;
  padding-right: 24px;
}
.co26 textarea {
  resize: vertical;
}
.co26 input[type='checkbox'] {
  appearance: auto;
  accent-color: var(--co-accent);
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.co26 .co26-check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 12px;
}
.co26-demo-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 18px;
}
.co26-demo-controls label {
  min-width: 190px;
  font-weight: 400;
  color: var(--co-muted);
}
.co26-demo-controls select {
  font-size: 12px;
}
.co26-sync {
  margin-left: auto;
  align-self: center;
  color: #187552;
  font-size: 12px;
  font-weight: 600;
}
.co26-warning {
  color: #b47512;
}
.co26-card {
  background: var(--co-surface);
  border: 1px solid var(--co-border);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 18px;
}
.co26-capture-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 18px;
}
.co26-keyboard .co26-row {
  margin-bottom: 10px;
}
.co26-command {
  display: flex;
  align-items: center;
  border: 2px solid #68b8ca;
  border-radius: 10px;
  background: var(--co-bg);
  padding: 5px;
}
.co26-command > span {
  min-width: 48px;
  color: var(--co-accent);
  background: var(--co-tint);
  text-align: center;
  padding: 12px 5px;
  border-radius: 6px;
  font-weight: 800;
}
.co26-command input {
  border: 0 !important;
  background: transparent !important;
  margin: 0 !important;
  min-width: 0;
}
.co26-command button {
  min-height: 44px;
  min-width: 44px;
  border-radius: 7px;
  color: var(--co-accent);
}
.co26-keyboard > p {
  font-size: 12px;
  margin-top: 10px;
  color: var(--co-muted);
}
.co26 kbd {
  font-family: monospace;
  font-size: 10px;
  border: 1px solid var(--co-border);
  border-radius: 4px;
  padding: 2px 4px;
  color: var(--co-muted);
  background: var(--co-bg);
  box-shadow: none;
}
.co26-shortcuts kbd {
  margin-left: 8px;
}
.co26-progress {
  background: var(--co-tint);
}
.co26-progress > strong {
  font-size: 32px;
  font-weight: 700;
  color: var(--co-accent);
}
.co26-progress small {
  font-size: 16px;
  font-weight: 400;
  color: var(--co-muted);
}
.co26-progress p:not(.co26-eyebrow) {
  font-size: 12px;
  color: var(--co-muted);
}
.co26-progress-track {
  height: 5px;
  border-radius: 10px;
  background: var(--co-border);
  overflow: hidden;
  margin: 14px 0 10px;
}
.co26-progress-track span {
  display: block;
  height: 100%;
  background: var(--co-accent);
}
.co26-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}
.co26-tools button {
  min-height: 44px;
  padding: 9px 10px;
  border: 1px solid var(--co-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}
.co26 [aria-pressed='true']:not(.co26-tooth) {
  border-color: var(--co-accent);
  color: var(--co-accent);
  background: var(--co-tint);
  box-shadow: inset 0 0 0 1px var(--co-accent);
}
.co26-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 3px;
  flex-shrink: 0;
}
.co26-bg-condition {
  background: var(--co-red);
}
.co26-bg-restoration {
  background: var(--co-blue);
}
.co26-bg-presence {
  background: #8795a5;
}
.co26-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
  align-items: start;
}
.co26-chart-card {
  padding: 20px 14px;
  min-width: 0;
}
.co26-chart-card > .co26-row {
  padding: 0 6px;
  flex-wrap: wrap;
}
.co26-segment {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 3px;
  background: var(--co-bg);
  border-radius: 10px;
  margin: 10px 0;
}
.co26-segment button {
  min-height: 44px;
  padding: 9px 12px;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 7px;
}
.co26-scroll-hint {
  color: var(--co-muted);
  font-size: 11px;
  padding: 4px 6px 12px;
}
.co26-panel-jump { display: none; }
.co26-chart-scroll {
  overflow-x: auto;
  padding-bottom: 12px;
  overscroll-behavior-x: contain;
}
.co26-chart {
  min-width: 820px;
}
.co26-orientation {
  display: flex;
  justify-content: space-between;
  margin: 6px 18px 10px;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--co-muted);
}
.co26-arch + .co26-arch {
  margin-top: 18px;
  border-top: 1px dashed var(--co-border);
  padding-top: 15px;
}
.co26-arch-label {
  display: block;
  text-align: center;
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--co-muted);
  margin-bottom: 8px;
}
.co26-teeth-row {
  display: grid;
  grid-template-columns: repeat(16, minmax(48px, 1fr));
  gap: 2px;
}
.co26-primary-row {
  grid-template-columns: repeat(10, minmax(48px, 1fr));
  max-width: 520px;
  margin: auto;
}
.co26-tooth {
  border: 1px solid transparent;
  border-radius: 9px;
  min-width: 48px;
  padding: 7px 2px 4px;
  color: #8092a2;
  position: relative;
}
.co26-tooth.selected {
  border-color: var(--co-accent);
  background: var(--co-tint);
  color: var(--co-accent);
}
.co26-tooth-number {
  font-size: 12px;
  font-weight: 700;
  color: var(--co-ink);
}
.co26-tick {
  color: #18845a;
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 10px;
}
.co26-tooth-status {
  display: block;
  font-size: 10px;
  color: var(--co-muted);
  height: 16px;
}
.co26-tooth-svg {
  width: 100%;
  max-height: 85px;
  display: block;
}
.co26-root-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
  opacity: 0.7;
}
.co26-fill-empty {
  fill: var(--co-surface);
}
.co26-fill-condition {
  fill: #f4a5ae;
}
.co26-fill-restoration {
  fill: #9cbee9;
}
.co26-presence-mark {
  fill: none;
  stroke: #6e8196;
  stroke-width: 3;
}
.co26-pending-dot {
  fill: var(--co-red);
}
.co26-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 10px;
  padding: 16px 6px 0;
  border-top: 1px solid var(--co-border);
  color: var(--co-muted);
}
.co26-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.co26-detail {
  padding: 18px;
  border-top: 3px solid var(--co-accent);
}
.co26-detail-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.co26-detail-title > strong {
  font-size: 30px;
  font-weight: 700;
  color: var(--co-accent);
  background: var(--co-tint);
  border-radius: 10px;
  padding: 7px 12px;
}
.co26-detail-title p {
  font-size: 11px;
  color: var(--co-muted);
}
.co26-enlarged {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 18px 0;
}
.co26-enlarged > svg {
  flex: 0 0 78px;
  width: 78px;
  max-height: 135px;
}
.co26-enlarged p:not(.co26-eyebrow) {
  font-size: 11px;
  color: var(--co-muted);
}
.co26-surfaces {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.co26-surfaces button {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--co-border);
  border-radius: 8px;
  font-weight: 700;
}
.co26-finding-list {
  padding: 14px 0;
}
.co26-finding {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
}
.co26-finding > span:nth-child(2) {
  flex: 1;
}
.co26-finding strong {
  font-size: 12px;
}
.co26-finding small {
  display: block;
  color: var(--co-muted);
  font-size: 10px;
}
.co26-finding .co26-icon {
  border: 0;
}
.co26-detail-actions {
  margin: 12px 0;
}
.co26-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 18px;
}
.co26-summary-item {
  display: flex !important;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--co-border);
  border-radius: 9px;
  padding: 12px;
  min-height: 60px;
  font-weight: 400 !important;
}
.co26-summary-item strong {
  color: var(--co-accent);
}
.co26-summary-foot {
  border-top: 1px solid var(--co-border);
  margin-top: 18px;
  padding-top: 14px;
}
.co26-saved-plan {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  border-top: 1px solid var(--co-border);
  padding: 14px 0;
  margin-top: 12px;
}
.co26-footer-note {
  font-size: 11px;
  text-align: center;
  color: var(--co-muted) !important;
  padding-bottom: 12px;
}
.co26-modal {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  background: var(--co-surface);
  border-radius: 14px;
  color: var(--co-ink);
}
.co26-modal-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 24px;
  border-bottom: 1px solid var(--co-border);
  background: var(--co-tint);
  flex-shrink: 0;
}
.co26-modal-head h2 {
  font-size: 21px;
}
.co26-modal-head p:not(.co26-eyebrow) {
  font-size: 12px;
  color: var(--co-muted);
  margin-top: 6px;
}
.co26-modal-head .co26-icon {
  align-self: flex-start;
  background: transparent;
  border: none;
}
.co26-modal-body {
  padding: 24px;
  overflow-y: auto;
  min-height: 0;
}
.co26-modal-body > p {
  margin-bottom: 14px;
}
.co26-modal-foot {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 18px 24px;
  border-top: 1px solid var(--co-border);
}
.co26-modal-foot > span {
  margin-right: auto;
}
.co26-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.co26-span {
  grid-column: 1 / -1;
}
.co26-form-grid > p {
  align-self: center;
}
.co26-associations {
  margin-top: 24px;
  padding: 18px;
  border: 1px solid var(--co-border);
  border-radius: 10px;
  background: var(--co-bg);
}
.co26-associations p {
  font-size: 12px;
  color: var(--co-muted);
  margin-top: 5px;
}
.co26-tooth-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 18px;
}
.co26-tooth-options button {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--co-border);
  border-radius: 7px;
  font-weight: 700;
  background: var(--co-surface);
}
.co26-associated-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--co-border);
}
.co26-associated-row > span {
  flex: 1;
  font-size: 11px;
  color: var(--co-muted);
  min-width: 120px;
}
.co26-associated-row select {
  font-size: 12px;
}
.co26-import-row {
  display: flex !important;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--co-border);
  border-radius: 9px;
  margin-top: 8px;
  min-height: 52px;
}
.co26-import-row span {
  flex: 1;
}
.co26-note,
.co26-alert {
  padding: 16px;
  background: var(--co-tint);
  border-left: 3px solid var(--co-accent);
  border-radius: 0 8px 8px 0;
  margin: 14px 0;
  font-size: 13px;
}
.co26-alert {
  background: #fff3e6;
  color: #86551b;
  border-color: #be822c;
}
.co26-alert p {
  margin-bottom: 12px;
}
.co26-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  width: 100%;
  min-height: 70px;
  border: 1px solid var(--co-border);
  border-radius: 9px;
  margin: 10px 0;
  padding: 14px;
  gap: 14px;
}
.co26-history-item small,
.co26-historical-row small {
  display: block;
  color: var(--co-muted);
  margin-top: 5px;
  font-size: 11px;
}
.co26-historical-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 12px;
  border-bottom: 1px solid var(--co-border);
}
.co26-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 20px;
}
.co26-compare > div {
  border: 1px solid var(--co-border);
  border-radius: 10px;
  padding: 18px;
}
.co26-compare p {
  margin: 12px 0;
}
.co26-help {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 12px;
  margin: 18px 0;
}
.co26-help dt {
  font-family: monospace;
  color: var(--co-accent);
}
.co26-help dd {
  margin: 0;
}
.co26-empty {
  padding: 24px;
  background: var(--co-bg);
  border-radius: 12px;
}
.co26-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(600px, 90vw);
  background: #163d4c;
  color: white;
  border-radius: 12px;
  padding: 14px 20px;
  box-shadow: 0 8px 24px #0002;
  z-index: 230;
  opacity: 0;
  pointer-events: none;
  font-size: 13px;
}
.co26-toast.visible {
  opacity: 1;
}
.co26-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
html[data-theme='clinical-night'] .co26 {
  --co-ink: #e2e8f0;
  --co-muted: #acbccf;
  --co-surface: #1e293b;
  --co-bg: #172333;
  --co-border: #415167;
  --co-accent: #7dd3fc;
  --co-tint: #173e50;
  --co-red: #fb8a9b;
  --co-blue: #93b9f2;
}
html[data-theme='clinical-night'] .co26 .co26-primary {
  color: #102a3b;
}
html[data-theme='clinical-night'] .co26-demo {
  background: #352e1b;
  color: #efd795;
  border-color: #65552e;
}
html[data-theme='clinical-night'] .co26-alert {
  background: #3d2f20;
  color: #f2cf98;
}
html[data-theme='clinical-night'] .co26-green {
  background: #163f34;
  color: #8ddbb9;
}
html[data-theme='clinical-night'] .co26-sync {
  color: #8ddbb9;
}
@media (min-width: 1650px) {
  .co26-chart {
    min-width: 0;
  }
}
@media (max-width: 1150px) {
  .co26-panel-jump { display: inline-flex; margin: 0 0 12px; }
  .co26-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
  .co26-detail {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 24px;
  }
  .co26-detail > .co26-badge {
    justify-self: start;
    align-self: center;
  }
  .co26-enlarged > svg {
    width: 96px;
    flex-basis: 96px;
    max-height: 150px;
  }
  .co26-detail > .co26-full {
    align-self: center;
  }
  .co26-summary-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 650px) {
  .co26-demo,
  .co26-row {
    align-items: stretch;
    flex-direction: column;
  }
  .co26-hero {
    gap: 18px;
  }
  .co26-actions {
    gap: 8px;
  }
  .co26-capture-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .co26-card {
    padding: 16px;
  }
  .co26-progress {
    display: none;
  }
  .co26-workspace {
    gap: 0;
  }
  .co26-detail {
    display: block;
  }
  .co26-detail > .co26-row {
    flex-direction: row;
  }
  .co26-demo-controls {
    gap: 10px;
  }
  .co26-demo-controls label {
    flex: 1;
    min-width: 150px;
  }
  .co26-sync {
    margin: 0;
  }
  .co26-summary-grid {
    grid-template-columns: 1fr;
  }
  .co26-form-grid,
  .co26-compare {
    grid-template-columns: 1fr;
  }
  .co26-modal {
    max-height: calc(100dvh - 24px);
  }
  .co26-modal-head,
  .co26-modal-body,
  .co26-modal-foot {
    padding: 16px;
  }
  .co26-modal-foot > span {
    width: 100%;
  }
  .co26-associations {
    padding: 12px;
  }
  .co26-enlarged {
    gap: 24px;
  }
  .co26-enlarged > svg {
    width: 100px;
    flex-basis: 100px;
  }
  .co26-help {
    grid-template-columns: 1fr;
    gap: 5px;
  }
  .co26-help dd {
    margin-bottom: 10px;
  }
  .co26-chart {
    min-width: 820px;
  }
  .co26-import-row {
    flex-wrap: wrap;
  }
  .co26-summary-foot > button {
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .co26 button {
    transition: none;
  }
}
</style>
