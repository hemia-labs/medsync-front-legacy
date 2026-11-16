<template>
  <div class="pulse-constellation" data-pulse-scene @mouseenter="hoverInside=true" @mouseleave="leavePriorityPreview" @focusout="leavePriorityFocus" @keydown.esc="onPriorityEscape">
    <div v-show="!hidden" class="pulse-sky" :class="{'sky-uncertain':model.uncertain,'sky-priority':hasPriority}">
      <canvas ref="canvas" v-show="engineReady && mode !== 'context-lost' && !failed" aria-hidden="true" tabindex="-1"/>
      <pulse-static v-if="!engineReady || mode === 'context-lost' || failed" :model="model" :phase="staticPhase"/>
      <button v-for="marker in markers" :key="marker.id" type="button" class="sky-marker" :class="{'marker-open':activePriority===marker.id,'marker-priority':marker.priority}" :style="marker.style" :data-priority-id="marker.id" :aria-label="(marker.priority ? 'Atender primero: ' : 'Explorar pendiente: ') + marker.label" :aria-expanded="String(activePriority===marker.id)" :aria-controls="activePriority===marker.id ? panelId : null" :aria-describedby="activePriority===marker.id ? panelId+'-description' : null" @mouseenter="previewPriority(marker.id)" @focus="focusPriority(marker.id)" @click="togglePriority(marker.id)"><span class="marker-outer" aria-hidden="true"/><span v-if="marker.priority" class="marker-inner" aria-hidden="true"/><span class="marker-label">{{ marker.label }}</span></button>
      <div class="sky-signals"><span v-if="hasPriority">◆ Hay algo que atender primero</span><span v-if="model.lastPriority">◆ Hay una prioridad anterior por confirmar</span><span v-if="model.preparation==='blocked'">◇ Falta configurar una herramienta</span><span v-if="model.preparation==='unknown'">◇ Configuración por comprobar</span><span v-if="model.uncertain">┄ Algunos datos no se pudieron revisar</span><span v-if="model.archive">Archivados fuera de la evaluación</span></div>
      <div v-if="activeInfo" class="sky-hover-summary" aria-hidden="true"><strong>{{ activeInfo.title }}</strong><span>{{ activeInfo.description }}</span></div>
      <p class="sky-caption">{{ sceneDescription }}</p>
    </div>
    <div v-show="!hidden" class="sky-signals-outside"><span v-if="hasPriority">◆ Hay algo que atender primero</span><span v-if="model.lastPriority">◆ Hay una prioridad anterior por confirmar</span><span v-if="model.preparation==='blocked'">◇ Falta configurar una herramienta</span><span v-if="model.preparation==='unknown'">◇ Configuración por comprobar</span><span v-if="model.uncertain">┄ Algunos datos no se pudieron revisar</span><span v-if="model.archive">Archivados fuera de la evaluación</span></div>
    <aside v-if="notes.length" class="sky-notes" aria-label="Sobre este resumen"><div v-for="note in notes" :key="note.id" class="sky-note" :data-note-id="note.id"><div><strong>{{ note.title }}</strong><p>{{ note.message }}</p></div><button v-if="note.action==='refresh'" type="button" :disabled="updating" @click="$emit('refresh')">{{ updating ? 'Consultando…' : 'Actualizar Pulso' }}</button><a v-else-if="note.target" :href="'#'+note.target" @click.prevent="$emit('review-note',note.target)">{{ note.actionLabel }} →</a></div></aside>
    <div v-if="activeInfo && !hidden" :id="panelId" class="sky-priority-info" role="region" :aria-labelledby="panelId+'-title'">
      <div class="priority-info-heading"><span class="priority-info-kicker">Qué está pasando aquí</span><button type="button" class="priority-info-close" aria-label="Cerrar información de la señal" @click="dismissPriority(true)">Cerrar <span aria-hidden="true">×</span></button></div>
      <h3 :id="panelId+'-title'">{{ activeInfo.title }}</h3><p :id="panelId+'-description'">{{ activeInfo.description }}</p><p class="priority-info-note">Según el resumen que estás viendo. Actualiza el Pulso para comprobar cambios.</p>
      <button v-if="activeInfo.actionLabel" type="button" class="priority-info-action" @click="reviewPriority">{{ activeInfo.actionLabel }} →</button><p v-else class="priority-info-note">Las causas siguen visibles más abajo. Necesitas acceso al módulo para abrir sus registros.</p>
    </div>
    <p v-if="hidden" class="sky-hidden">Visualización oculta. Puedes seguir consultando los pendientes y sus acciones.</p>
    <div class="sky-toolbar"><div class="sky-controls"><button v-if="!hidden && !failed" type="button" :aria-pressed="String(paused || reduced && !motionOverride)" @click="toggleMotion">{{ motionLabel }}</button><button v-if="failed && !hidden" type="button" @click="retry">Reintentar animación</button><button type="button" :aria-pressed="String(hidden)" @click="toggleHidden">{{ hidden ? 'Mostrar visualización' : 'Ocultar visualización' }}</button></div><p>{{ statusText }}</p></div>
    <p class="sky-legend">Cada zona representa seguimientos, firmas o agenda. Sus trayectorias se separan cuando hay pendientes; el doble diamante marca qué atender primero.</p>
    <span class="sky-announcement" role="status" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
<script>
import PulseStatic from './PulseStatic.vue';
import { visualModel, signalPoints } from '../../domain/pulse/visualModel';
const KEY = 'medsync.pulse.display.v1';
function preference() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    return {
      paused: Boolean(p && p.paused === true),
      hidden: Boolean(p && p.hidden === true)
    };
  } catch (_) {
    return {
      paused: false,
      hidden: false
    };
  }
}
export default {
  name: 'PulseConstellation',
  components: {
    PulseStatic
  },
  props: {
    recognition: { type: Number, default: 0 },
    visual: {
      type: Object,
      required: true
    },
    priorities: {
      type: Array,
      default: () => []
    },
    notes: {
      type: Array,
      default: () => []
    },
    expired: {
      type: Boolean,
      default: false
    },
    updating: {
      type: Boolean,
      default: false
    }
  },
  data() {
    const p = preference();
    return {
      ...p,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      motionOverride: false,
      engineReady: false,
      failed: false,
      mode: 'static',
      qualityReduced: false,
      announcement: '',
      staticPhase: 0,
      activePriority: null,
      pinnedPriority: false,
      hoverInside: false,
      panelId: 'pulse-priority-info-' + this._uid
    };
  },
  computed: {
    model() {
      return visualModel(this.visual);
    },
    signature() {
      return JSON.stringify(this.model);
    },
    hasPriority() {
      return this.model.causes.some(c => c.priority);
    },
    markers() {
      return signalPoints(this.model).map(p => ({id:['PUL-OP01','PUL-OP02','PUL-OP03'][p.index],priority:p.priority,label:['Seguimientos','Firmas','Agenda'][p.index],style:{left:`clamp(64px, ${p.x/10}%, calc(100% - 64px))`,top:`clamp(88px, ${p.y/4.4}%, calc(100% - 78px))`}}));
    },
    activeInfo() {
      const marker=this.markers.find(m=>m.id===this.activePriority);
      if(!marker)return null;
      return this.priorities.find(p=>p.indicatorId===marker.id) || {indicatorId:marker.id,title:'Prioridad en '+marker.label,description:'Hay un pendiente prioritario en el resumen que estás viendo. Puedes revisar su causa más abajo.',actionLabel:null};
    },
    motionLabel() {
      return this.reduced && !this.motionOverride ? 'Activar animación' : this.paused ? 'Reanudar animación' : 'Pausar animación';
    },
    sceneDescription() {
      return this.markers.length ? 'Explora una señal para entender qué pasa y dar el siguiente paso.' : this.expired ? 'Así estaba tu consultorio en la última lectura.' : this.model.uncertain ? 'Conservamos lo conocido mientras comprobamos el resto.' : this.model.category === 'no_obligations' ? 'Tu Pulso toma forma con lo que registras.' : 'Un ritmo compartido: lo revisado está al día.';
    },
    statusText() {
      return this.hidden ? 'Puedes seguir revisando los pendientes.' : this.failed ? 'El movimiento no está disponible. La imagen conserva las mismas señales.' : this.reduced && !this.motionOverride ? 'Sin movimiento, según tu preferencia.' : this.paused ? 'En pausa. Puedes seguir consultando y actualizar el resumen.' : this.mode === 'context-lost' ? 'Mostramos una imagen mientras recuperamos el movimiento.' : this.mode === 'loading' ? 'Preparando el movimiento. Ya puedes revisar tu resumen.' : this.mode === 'running' ? this.qualityReduced ? 'Movimiento adaptado a este dispositivo.' : 'El movimiento acompaña tu resumen; puedes pausarlo.' : 'El movimiento espera mientras no estás viendo la escena.';
    }
  },
  watch: {
    recognition() { this.acknowledgeResult(); },
    signature() {
      if (this._pulseEngine) this._pulseEngine.setVisual(this.model);
      if(this.activePriority && !this.markers.some(m=>m.id===this.activePriority)) {
        const restore=this.$el && this.$el.contains(document.activeElement);
        this.dismissPriority(false);
        if(restore)this.$nextTick(()=>{if(this._pulseActive){const control=this.$el.querySelector('.sky-controls button');if(control)control.focus();}});
      }
    }
  },
  created() {
    this._pulseEngine = null;
    this._pulseGeneration = 0;
    this._pulseActive = false;
    this._pulseImporting = false;
    this._pulseElapsed = 0;
    this._pulseLastStats = null;
  },
  mounted() {
    this.activateScene();
  },
  activated() {
    this.activateScene();
  },
  deactivated() {
    this.deactivateScene();
  },
  beforeDestroy() {
    this.deactivateScene();
  },
  methods: {
    acknowledgeResult() { if (this.recognition && this.recognition !== this._recognized && this._pulseEngine && this._pulseActive) { this._recognized = this.recognition; this._pulseEngine.acknowledge(2); } },
    previewPriority(id) { if(!this._pulseSuppressFocus && !this.pinnedPriority)this.activePriority=id; },
    focusPriority(id) { if(!this._pulseSuppressFocus && this.activePriority!==id){this.activePriority=id;this.pinnedPriority=false;} },
    togglePriority(id) {
      if(this.activePriority===id && this.pinnedPriority)this.dismissPriority(false);
      else { this.activePriority=id;this.pinnedPriority=true;this.$nextTick(()=>{if(this._pulseActive){const panel=document.getElementById(this.panelId);if(panel)panel.scrollIntoView({block:'nearest',behavior:'auto'});}}); }
    },
    dismissPriority(restore = false) {
      const id=this.activePriority;
      this.activePriority=null;this.pinnedPriority=false;
      if(restore && id)this.$nextTick(()=>{if(this._pulseActive){const marker=this.$el.querySelector('[data-priority-id="'+id+'"]');if(marker){this._pulseSuppressFocus=true;marker.focus();this._pulseSuppressFocus=false;this.activePriority=null;}}});
    },
    leavePriorityPreview() { this.hoverInside=false;if(!this.pinnedPriority && !this.$el.contains(document.activeElement))this.dismissPriority(false); },
    leavePriorityFocus() { this.$nextTick(()=>{if(this._pulseActive && !this.pinnedPriority && !this.hoverInside && !this.$el.contains(document.activeElement))this.dismissPriority(false);}); },
    onPriorityEscape(event) { if(this.activePriority){event.preventDefault();event.stopPropagation();this.dismissPriority(true);} },
    reviewPriority() { const info=this.activeInfo;if(info && info.actionLabel){this.dismissPriority(false);this.$emit('review-priority',info.indicatorId);} },
    activateScene() {
      if (this._pulseActive) return;
      this._pulseActive = true;
      this.motionOverride = false;
      this._pulseMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = this._pulseMedia.matches;
      this._pulseMotion = event => {
        this.reduced = event.matches;
        this.motionOverride = false;
        this.syncScene();
      };
      this._pulseMedia.addEventListener('change', this._pulseMotion);
      this.syncScene();
    },
    deactivateScene() {
      if (!this._pulseActive) return;
      this._pulseActive = false;
      this.dismissPriority(false);
      this.hoverInside = false;
      this._pulseGeneration++;
      this._pulseImporting = false;
      if (this._pulseMedia) this._pulseMedia.removeEventListener('change', this._pulseMotion);
      this.releaseEngine();
    },
    releaseEngine() {
      if (this._pulseEngine) {
        const e = this._pulseEngine;
        this._pulseElapsed = e.elapsed;
        this.staticPhase = this._pulseElapsed / 1000;
        e.dispose();
        this._pulseLastStats = e.inspect();
        this._pulseEngine = null;
      }
      this.engineReady = false;
    },
    persist() {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          paused: Boolean(this.paused),
          hidden: Boolean(this.hidden)
        }));
      } catch (_) {/* Storage is optional. */}
    },
    syncScene() {
      if (!this._pulseActive) return;
      if (this.hidden || this.reduced && !this.motionOverride) {
        this._pulseGeneration++;
        this._pulseImporting = false;
        this.releaseEngine();
        this.mode = 'static';
        return;
      }
      if (this._pulseEngine) {
        this._pulseEngine.suspend('owner', this.paused);
        if (this.paused) this._pulseEngine.renderStill();
        return;
      }
      if (this.paused || this.failed || this._pulseImporting) return;
      const generation = ++this._pulseGeneration;
      this._pulseImporting = true;
      this.mode = 'loading';
      import(/* webpackChunkName: "pulse-engine", webpackPrefetch: false */'../../domain/pulse/constellationEngine').then(module => {
        if (!this._pulseActive || generation !== this._pulseGeneration) return;
        const canvas = this.$refs.canvas;
        this.engineReady = true;
        this.$nextTick(() => {
          if (!this._pulseActive || generation !== this._pulseGeneration) return;
          try {
            this._pulseEngine = new module.ConstellationEngine(canvas, this.model, {
              elapsed: this._pulseElapsed,
              onState: state => {
                this.mode = state;
              },
              onQuality: () => {
                this.qualityReduced = true;
              },
              onFailure: () => {
                this.failed = true;
                this.releaseEngine();
              }
            });
            this._pulseEngine.suspend('owner', this.paused);
            this.acknowledgeResult();
          } catch (_) {
            this.failed = true;
            this.releaseEngine();
          }
        });
      }).catch(() => {
        if (this._pulseActive && generation === this._pulseGeneration) {
          this.failed = true;
          this.mode = 'static';
        }
      }).finally(() => {
        if (generation === this._pulseGeneration) this._pulseImporting = false;
      });
    },
    toggleMotion() {
      if (this.reduced && !this.motionOverride) {
        this.motionOverride = true;
        this.paused = false;
      } else this.paused = !this.paused;
      this.persist();
      this.syncScene();
      this.announcement = this.paused ? 'Animación pausada. Los datos continúan disponibles.' : 'Animación activada.';
    },
    toggleHidden() {
      this.dismissPriority(false);
      this.hidden = !this.hidden;
      this.persist();
      this.syncScene();
      this.announcement = this.hidden ? 'Visualización oculta.' : 'Visualización visible.';
    },
    retry() {
      this.releaseEngine();
      this.failed = false;
      this.paused = false;
      this.motionOverride = true;
      this.persist();
      this.syncScene();
      this.announcement = 'Reintentando la animación.';
    }
  }
};
</script>
<style scoped>
.pulse-constellation{min-width:0;align-self:stretch}.pulse-sky{position:relative;overflow:hidden;border:1px solid #465779;border-radius:20px;background:radial-gradient(ellipse at 18% 75%,#153a414d,transparent 64%),radial-gradient(ellipse at 72% 25%,#4535744d,transparent 67%),#091222;height:clamp(300px,32vw,420px)}
.pulse-sky canvas{display:block;position:absolute;inset:0;width:100%;height:100%}.sky-uncertain{border-style:dashed;border-color:#b6c3db}.sky-priority{border-color:#b79278}.sky-signals{position:absolute;top:16px;left:16px;right:16px;display:flex;flex-wrap:wrap;gap:8px;pointer-events:none}.sky-signals span{font-size:11px;font-weight:600;color:#f3dfc6;background:#101a2ee6;border:1px solid #b5987673;padding:5px 8px;border-radius:6px}.sky-caption{position:absolute;bottom:12px;left:16px;right:16px;font-size:12px;line-height:1.6;color:#d8e6fd;pointer-events:none;background:#091222cc;border-radius:6px;padding:5px 8px;margin:0}.sky-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}.sky-toolbar p,.sky-legend,.sky-hidden{color:#4e6076;font-size:12px;line-height:1.65;margin:0}.sky-toolbar p{flex:1;min-width:170px}.sky-controls{display:flex;flex-wrap:wrap;gap:8px}.sky-controls button{background:#fff;border:1px solid #73859b;border-radius:8px;color:#264460;font-weight:600;font-size:12px;line-height:1.4;min-height:44px;padding:9px 12px}.sky-controls button:focus-visible{outline:3px solid #167689;outline-offset:3px}.sky-legend{margin-top:10px}.sky-hidden{padding:28px;border:1px dashed #889bb5;border-radius:15px;background:#edf2f9}.sky-announcement{display:block;font-size:12px;color:#295a59;margin-top:6px}.sky-announcement:empty{display:none}.theme--dark .sky-toolbar p,.theme--dark .sky-legend,.theme--dark .sky-announcement{color:#c6d7ec}.theme--dark .sky-hidden{background:#162338;color:#c6d7ec}
@media(max-width:600px){.pulse-sky{height:300px;border-radius:16px}.sky-toolbar{align-items:flex-start}.sky-toolbar p{min-width:100%}.sky-signals{top:11px;left:11px;right:11px}.sky-caption{left:11px;right:11px;font-size:11px}}
.pulse-sky{height:clamp(340px,33vw,440px);border-color:#34445e;background:radial-gradient(ellipse at 28% 68%,#19525136,transparent 52%),radial-gradient(ellipse at 72% 27%,#5c3b833d,transparent 54%),radial-gradient(ellipse at 50% 50%,#15213a,transparent 78%),#070f20}.sky-caption{background:transparent;text-align:center;bottom:14px;color:#ccd8ec;font-size:12px}.sky-signals span{font-size:12px;background:#0e192dcc;border-color:#b5987659}.sky-toolbar{justify-content:space-between}.sky-toolbar p{flex:initial}.sky-legend{font-size:12px;max-width:780px}
@media(max-width:600px){.pulse-sky{height:310px}.sky-caption{bottom:9px;font-size:11px}.sky-signals span{font-size:11px}.sky-toolbar p{flex:1}}
.sky-marker{position:absolute;z-index:2;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;border:0;border-radius:50%;background:#101a2e99;color:#ffe1ba;transform:translate(-50%,-50%);cursor:pointer;display:grid;place-items:center}.sky-marker:hover,.sky-marker.marker-open{background:#29374dcc}.sky-marker:focus-visible{outline:3px solid #c4e7ff;outline-offset:3px}.marker-outer,.marker-inner{grid-area:1/1;border:1.5px solid currentColor;transform:rotate(45deg);pointer-events:none}.marker-outer{width:19px;height:19px}.marker-inner{width:9px;height:9px}.sky-signals{z-index:3}.sky-priority-info{margin-top:14px;padding:18px 20px;background:#fff8ec;border:1px solid #c7a274;border-radius:14px;color:#473d30}.priority-info-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.priority-info-kicker{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#725230}.sky-priority-info h3{font-size:18px;line-height:1.4;margin:8px 0}.sky-priority-info p{font-size:14px;line-height:1.7;margin:6px 0}.sky-priority-info .priority-info-note{font-size:12px;color:#685944}.sky-priority-info button{min-height:44px;padding:9px 12px;border:1px solid #8d734e;background:white;color:#634823;border-radius:8px;font-size:13px;font-weight:600}.sky-priority-info button:focus-visible{outline:3px solid #167689;outline-offset:3px}.sky-priority-info .priority-info-close{font-size:12px;background:transparent;white-space:nowrap}.priority-info-action{margin-top:10px}.theme--dark .sky-priority-info{background:#342e27;border-color:#ae906a;color:#f4e4ce}.theme--dark .priority-info-kicker,.theme--dark .sky-priority-info .priority-info-note{color:#dec6a6}@media(max-width:600px){.sky-priority-info{padding:14px}.priority-info-heading{align-items:flex-start}.priority-info-kicker{max-width:150px}}
.sky-hover-summary{position:absolute;z-index:4;bottom:50px;left:18px;right:18px;max-width:480px;padding:12px 14px;border:1px solid #ad906d;border-radius:10px;background:#101a2ef2;color:#ffe9cf;pointer-events:none}.sky-hover-summary strong,.sky-hover-summary span{display:block;font-size:13px;line-height:1.6}.sky-hover-summary span{font-size:12px;color:#e0d9d0;margin-top:4px}@media(max-width:600px){.sky-hover-summary{left:12px;right:12px;bottom:45px;padding:9px 11px}.sky-hover-summary strong{font-size:12px}.sky-hover-summary span{font-size:11px}}
.sky-notes{margin-top:14px;padding:0 16px;border-left:2px solid #92a7bf;color:#384f69}.sky-note{padding:12px 0;display:flex;align-items:center;justify-content:space-between;gap:16px}.sky-note+.sky-note{border-top:1px solid #dce4ee}.sky-note strong{display:block;font-size:13px;line-height:1.6}.sky-note p{font-size:12px;line-height:1.7;margin:5px 0 0;color:#52627a}.sky-note button,.sky-note a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 10px;font-size:12px;font-weight:600;border:1px solid #73859b;border-radius:8px;background:white;color:#264460;text-decoration:none;flex-shrink:0}.sky-note button:disabled{opacity:.65}.sky-note button:focus-visible,.sky-note a:focus-visible{outline:3px solid #167689;outline-offset:3px}.theme--dark .sky-notes{color:#d7e4f6}.theme--dark .sky-note p{color:#c6d3e5}.theme--dark .sky-note+.sky-note{border-color:#43516b}@media(max-width:600px){.sky-notes{padding:0 12px}.sky-note{align-items:flex-start;flex-direction:column;gap:8px}.sky-note a,.sky-note button{max-width:100%}}
.marker-label{position:absolute;top:44px;left:50%;transform:translateX(-50%);border-radius:5px;background:#091222ed;color:#f2deca;font-size:12px;line-height:1.4;font-weight:600;padding:3px 6px;white-space:nowrap}.sky-marker.marker-priority{box-shadow:0 0 0 5px #eaba7622}.marker-priority .marker-label{color:#ffe3af}.sky-hover-summary{display:none}.sky-priority-info{scroll-margin-top:90px}
</style>
<style scoped>
/* On small screens the signal legend sits below the scene so it never covers its markers. */
.sky-signals-outside{display:none}
@media(max-width:600px){.pulse-sky .sky-signals{display:none}.sky-signals-outside{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.sky-signals-outside span{font-size:11px;font-weight:600;line-height:1.4;color:#5a4223;background:#fff6e8;border:1px solid #e2c9a3;padding:5px 8px;border-radius:6px}.theme--dark .sky-signals-outside span{background:#2c261f;color:#f3dfc6;border-color:#7d6648}}
</style>
