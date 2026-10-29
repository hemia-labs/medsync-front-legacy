<template>
  <v-dialog
    :value="true"
    max-width="920"
    scrollable
    @input="!$event && $emit('close')"
  >
    <div class="co26 co26-modal" role="dialog" aria-modal="true" aria-labelledby="co26-plan-title">
      <header class="co26-modal-head">
        <div>
          <p class="co26-eyebrow">PLAN DE TRATAMIENTO · SIMULACIÓN</p>
          <h2 id="co26-plan-title">
            {{ importing ? 'Traer del odontograma' : 'Agregar tratamiento' }}
          </h2>
          <p>
            {{
              importing
                ? 'Elige qué incorporar. Tu captura manual se conserva.'
                : 'Puedes crear un tratamiento sin capturar un odontograma.'
            }}
          </p>
        </div>
        <button
          class="co26-icon"
          aria-label="Cerrar editor"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>
      <div v-if="!importing" class="co26-modal-body">
        <div class="co26-form-grid">
          <label
            >Nombre del tratamiento <span aria-hidden="true">*</span
            ><input
              v-model="draft.name"
              maxlength="150"
              placeholder="Ej. Restauración con resina"
              required
          /></label>
          <label
            >Costo estimado (opcional)<input
              v-model="draft.cost"
              type="number"
              min="0"
              placeholder="$ 0.00"
          /></label>
          <label
            >Categoría (opcional)<input
              v-model="draft.category"
              placeholder="Ej. Restauradora"
          /></label>
          <p class="co26-muted">Estado inicial: <strong>Pendiente</strong></p>
          <label
            >Inicio estimado<input v-model="draft.start" type="date" /></label
          ><label>Fin estimado<input v-model="draft.end" type="date" /></label>
          <label class="co26-span"
            >Descripción del tratamiento<textarea
              v-model="draft.description"
              rows="2"
              placeholder="Qué se realizará"
            ></textarea>
          </label>
          <label class="co26-span"
            >Notas clínicas internas<textarea
              v-model="draft.notes"
              rows="2"
              placeholder="Observaciones del profesional"
            ></textarea>
          </label>
        </div>
        <section class="co26-associations">
          <div class="co26-row">
            <div>
              <h3>
                Dientes asociados <span class="co26-badge">Opcional</span>
              </h3>
              <p>
                Selección libre o importación revisada; ambas pueden combinarse.
              </p>
            </div>
            <button class="co26-button" @click="openImport">
              ↓ Traer del odontograma
            </button>
          </div>
          <div class="co26-segment" aria-label="Dentición del selector">
            <button
              v-for="d in dentitions"
              :key="d.id"
              :aria-pressed="mode === d.id"
              @click="mode = d.id"
            >
              {{ d.label }}
            </button>
          </div>
          <div class="co26-tooth-options">
            <button
              v-for="n in options"
              :key="n"
              :aria-label="'Asociar diente ' + n"
              :aria-pressed="Boolean(draft.teeth[n])"
              @click="toggle(n)"
            >
              {{ n }}
            </button>
          </div>
          <p v-if="!selected.length" class="co26-muted">
            Sin piezas asociadas. También puedes guardar así.
          </p>
          <div v-for="n in selected" :key="n" class="co26-associated-row">
            <strong>{{ n }}</strong
            ><span>{{
              draft.teeth[n].source ? draft.teeth[n].source : 'Selección manual'
            }}</span
            ><label
              >Caras opcionales<select v-model="draft.teeth[n].surfaces">
                <option value="">Diente completo</option>
                <option
                  v-for="s in ['M', 'O', 'D', 'V', 'L', 'MO', 'OD', 'MOD']"
                  :key="s"
                  :value="s"
                >
                  {{
                    s
                      .split('')
                      .map((c) => surfaceLabel(c, n))
                      .join(' · ')
                  }}
                </option>
              </select></label
            ><button
              class="co26-icon"
              :aria-label="'Quitar asociación ' + n"
              @click="$delete(draft.teeth, n)"
            >
              ×
            </button>
          </div>
        </section>
        <p v-if="error" class="co26-alert" role="alert">{{ error }}</p>
      </div>
      <div v-else class="co26-modal-body">
        <label
          >Odontograma de origen<select v-model="source" @change="picked = []">
            <option value="current">
              Actual · revisión {{ revision }} · {{ modeLabel }}
            </option>
            <option value="previous">
              20 sep 2026 · revisión 8 · ejemplo histórico
            </option>
          </select></label
        >
        <div class="co26-segment">
          <button
            :aria-pressed="importKind === 'teeth'"
            @click="
              importKind = 'teeth';
              picked = [];
            "
          >
            Solo dientes</button
          ><button
            :aria-pressed="importKind === 'findings'"
            @click="
              importKind = 'findings';
              picked = [];
            "
          >
            Hallazgos
          </button>
        </div>
        <p class="co26-muted">
          Consultar este origen no lo activa ni modifica el odontograma actual.
        </p>
        <div v-if="!candidates.length" class="co26-empty">
          Sin hallazgos en este origen. Puedes volver y seleccionar dientes
          manualmente.
        </div>
        <label
          v-for="item in candidates"
          :key="item.key"
          class="co26-import-row"
          ><input
            v-model="picked"
            type="checkbox"
            :value="item.key"
          /><strong>{{ item.n }}</strong
          ><span>{{ item.label }}</span
          ><span v-if="draft.teeth[item.n]" class="co26-badge"
            >Ya asociado</span
          ></label
        >
        <div class="co26-note">
          <strong>Vista previa · {{ picked.length }} selecciones</strong>
          <p>
            Se agregan las piezas nuevas y se conserva el formulario. Las piezas
            ya asociadas conservan sus caras; la selección se registra como
            contexto de origen.
          </p>
        </div>
        <label class="co26-check"
          ><input v-model="copyNotes" type="checkbox" />Copiar el contexto
          seleccionado a notas internas</label
        >
      </div>
      <footer class="co26-modal-foot">
        <span class="co26-muted">Solo ejemplo · no se envía al servidor</span
        ><button
          class="co26-button"
          @click="importing ? (importing = false) : $emit('close')"
        >
          {{ importing ? 'Volver al tratamiento' : 'Cancelar' }}</button
        ><button
          class="co26-button co26-primary"
          :disabled="importing && !picked.length"
          @click="importing ? importSelection() : save()"
        >
          {{
            importing ? 'Agregar selección' : 'Guardar tratamiento de ejemplo'
          }}
        </button>
      </footer>
    </div>
  </v-dialog>
</template>
<script>
import {
  dentitions,
  sequence,
  clone,
  makeTeeth,
  surfaceLabel
} from './odontogramPreviewFixtures';
export default {
  props: {
    teeth: { type: Object, required: true },
    revision: Number,
    initial: { type: Array, default: () => [] },
    modeLabel: String
  },
  data() {
    const draft = {
      name: '',
      cost: '',
      category: '',
      start: '',
      end: '',
      description: '',
      notes: '',
      teeth: {}
    };
    this.initial.forEach((item) => {
      draft.teeth[item.n] = {
        surfaces: item.surfaces === '?' ? '' : item.surfaces || '',
        source: 'Odontograma actual · r' + this.revision
      };
    });
    return {
      dentitions,
      draft,
      mode: 'permanent',
      importing: false,
      importKind: 'teeth',
      picked: [],
      source: 'current',
      copyNotes: false,
      previous: makeTeeth(),
      error: ''
    };
  },
  computed: {
    options() {
      return sequence(this.mode);
    },
    selected() {
      return Object.keys(this.draft.teeth)
        .map(Number)
        .sort((a, b) => a - b);
    },
    candidates() {
      const teeth = this.source === 'current' ? this.teeth : this.previous;
      return Object.keys(teeth).flatMap((n) =>
        teeth[n].findings.length
          ? this.importKind === 'teeth'
            ? [
                {
                  key: n,
                  n: Number(n),
                  label: teeth[n].findings.map((f) => f.label).join(', '),
                  surfaces: ''
                }
              ]
            : teeth[n].findings.map((f, i) => ({
                key: n + '-' + i,
                n: Number(n),
                label: f.label + (f.surfaces ? ' · ' + f.surfaces : ''),
                surfaces: f.surfaces
              }))
          : []
      );
    }
  },
  methods: {
    surfaceLabel,
    toggle(n) {
      if (this.draft.teeth[n]) this.$delete(this.draft.teeth, n);
      else this.$set(this.draft.teeth, n, { surfaces: '', source: '' });
    },
    openImport() {
      this.importing = true;
      this.picked = [];
      this.copyNotes = false;
    },
    importSelection() {
      const selected = this.candidates.filter((i) =>
        this.picked.includes(i.key)
      );
      selected.forEach((i) => {
        const manual = Boolean(
          this.draft.teeth[i.n] && !this.draft.teeth[i.n].source
        );
        if (!this.draft.teeth[i.n])
          this.$set(this.draft.teeth, i.n, {
            surfaces: i.surfaces === '?' ? '' : i.surfaces,
            source: ''
          });
        const item = this.draft.teeth[i.n];
        const source =
          this.source === 'current'
            ? 'Odontograma actual · r' + this.revision
            : '20 sep 2026 · r8';
        item.source = item.source
          ? item.source.includes(source)
            ? item.source
            : item.source + ' / ' + source
          : (manual ? 'Manual + ' : '') + source;
      });
      if (this.copyNotes)
        this.draft.notes = [
          this.draft.notes,
          selected.map((i) => i.n + ': ' + i.label).join('; ')
        ]
          .filter(Boolean)
          .join('\n');
      this.importing = false;
    },
    save() {
      this.error = '';
      if (!this.draft.name.trim()) {
        this.error = 'Escribe el nombre del tratamiento.';
        return;
      }
      if (
        this.draft.end &&
        this.draft.start &&
        this.draft.end < this.draft.start
      ) {
        this.error = 'La fecha final debe ser igual o posterior al inicio.';
        return;
      }
      this.$emit('save', clone(this.draft));
    }
  }
};
</script>
