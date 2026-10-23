<template>
  <section v-if="journey && journey.total" class="preparation-journey" aria-label="Tu avance de configuración">
    <header><h4>Tu avance de configuración</h4><span>{{ journey.completed.length }} de {{ journey.total }} completos</span></header>
    <p v-if="scopeNote" class="journey-note">{{ scopeNote }}</p>
    <p v-if="journey.completed.length" class="journey-completed"><strong>Ya completaste:</strong> {{ journey.completed.map(step=>step.title).join(' · ') }}. No necesitas repetir estos pasos.</p>
    <div v-if="journey.suggested" class="journey-recommendation">
      <p class="journey-label">{{ journey.suggested.current ? 'Estás aquí · Pendiente' : 'Siguiente paso recomendado' }}</p>
      <h5>{{ journey.suggested.title }}</h5><p>{{ journey.reason }}</p>
      <button v-if="!journey.suggested.current" type="button" class="journey-primary" @click="$emit('open',journey.suggested)">Continuar: {{ journey.suggested.title }}</button>
      <template v-else><button v-if="currentActionLabel" type="button" class="journey-primary" @click="$emit('current')">{{ currentActionLabel }}</button><p class="journey-note">Puedes seguir con esta tarea o elegir otro pendiente y volver después.</p></template>
    </div>
    <p v-else-if="journey.pending.length"><strong>Tu parte está preparada.</strong> Los pendientes siguientes necesitan al administrador. Puedes volver a Inicio; cerrar la guía no completa esos requisitos.</p>
    <p v-else><strong>La preparación inicial está completa.</strong> Puedes volver a Inicio y empezar a trabajar con tus accesos.</p>
    <ul v-if="journey.remaining.length" class="journey-pending" aria-label="Otros pasos pendientes">
      <li v-for="step in journey.remaining" :key="step.id">
        <div><strong>{{ step.title }}</strong><span class="journey-state">{{ step.blocked ? 'Pendiente del administrador' : 'Pendiente' }}</span><p>{{ step.blocked ? step.help || step.detail : step.detail }}</p></div>
        <button v-if="step.path" type="button" @click="$emit('open',step)">Continuar<span class="journey-sr">: {{ step.title }}</span></button>
        <p v-else-if="step.id==='consent'" class="journey-note">Pide al administrador que prepare y active la plantilla en Configuración → Documentos y consentimientos. Cuenta y legal no sustituye ese formato.</p>
      </li>
    </ul>
    <details v-if="journey.completed.length"><summary>Revisar pasos completos</summary><ul class="journey-reviewed"><li v-for="step in journey.completed" :key="step.id"><span>{{ step.title }} · Completo{{ step.current ? ' · Estás aquí' : '' }}</span><button v-if="step.path && !step.current" type="button" @click="$emit('open',step)">Revisar<span class="journey-sr"> {{ step.title }}</span></button></li></ul></details>
    <router-link v-if="!journey.suggested" class="journey-primary" to="/inicio">Volver a Inicio</router-link>
  </section>
</template>
<script>
import { preparationJourney } from '../../../domain/onboarding/preparationJourney';
export default {
  props:{status:Object,sections:{type:Array,default:()=>[]},currentId:String,goal:String,scopeNote:String,currentActionLabel:String},
  computed:{journey(){return preparationJourney(this.status,this.sections,this.currentId,this.goal);}}
};
</script>
<style scoped>
.preparation-journey{margin-top:18px;padding:18px;border:1px solid #b9d9d6;border-radius:12px;background:#fff;color:#23474b;min-width:0;overflow-wrap:anywhere}.preparation-journey header{display:flex;align-items:center;justify-content:space-between;gap:12px}.preparation-journey h4{font-size:17px;margin:0}.preparation-journey header span{font-size:13px;white-space:nowrap}.preparation-journey p{margin:8px 0;line-height:1.5}.journey-completed{color:#286348;font-size:14px}.journey-recommendation{background:#f0f8f6;border-left:3px solid #087f80;padding:12px 16px;margin:16px 0}.journey-label{font-size:12px;font-weight:700;text-transform:uppercase;color:#08716b}.preparation-journey h5{font-size:18px;margin:0}.preparation-journey button,.preparation-journey a{min-height:44px;display:inline-flex;align-items:center;padding:8px 12px;border-radius:8px;font-weight:600;color:#075d61;text-align:left}.preparation-journey .journey-primary{background:#075d61;color:#fff;text-decoration:none;margin-top:6px}.preparation-journey ul{padding:0;margin:12px 0;list-style:none}.journey-pending li{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid #dce9e7}.journey-pending li>div{flex:1 1 240px}.journey-pending p{font-size:14px}.journey-state{display:inline-block;margin-left:8px;font-size:12px;color:#576a71}.journey-note{font-size:13px}.preparation-journey summary{cursor:pointer;font-weight:600;padding:10px 0;min-height:44px}.journey-reviewed li{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px}.preparation-journey :focus-visible{outline:3px solid #087f80;outline-offset:3px}.journey-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@media(max-width:600px){.preparation-journey{padding:14px}.preparation-journey header{align-items:flex-start;flex-direction:column;gap:4px}.journey-recommendation{padding:12px}.journey-reviewed li{flex-wrap:wrap}}
</style>
