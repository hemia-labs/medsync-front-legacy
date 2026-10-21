<template><aside v-if="visible" class="pulse-return"><div><strong>Desde el Pulso del consultorio</strong><p>{{ state.pendingAppointment ? 'El resultado se guardó. Vuelve para comprobar cómo cambia la zona de agenda.' : state.savedAt ? 'Tu cambio se guardó. Al regresar podrás verificar una lectura nueva.' : 'Revisa este registro en su contexto. Solo cambia lo que corresponda.' }}</p></div><router-link :to="{name:'business-pulse'}">Volver al Pulso →</router-link></aside></template>
<script>
import { pulseContext } from '../../domain/pulse/pulseReader';
import { canAccessPulse } from '../../security/pulseAccess';
export default {
  computed: {
    state() { return this.$store.state.CORE.PULSE; },
    visible() { const auth = this.$store.state.CORE.AUTH; return this.$route.query.returnKey === 'pulse' && this.state.returnTarget && this.state.returnTarget.context === pulseContext(auth).key && canAccessPulse(auth.permissions,auth.role); }
  }
};
</script>
<style scoped>.pulse-return{display:flex;justify-content:space-between;align-items:center;gap:20px;background:#eef5fb;border:1px solid #b8cde1;border-radius:12px;margin:15px 0;padding:15px 20px;color:#2d4b70}.pulse-return strong{font-size:14px}.pulse-return p{font-size:13px;margin:5px 0}.pulse-return a{flex-shrink:0;text-decoration:underline;font-size:13px;color:#234c72}.pulse-return a:focus-visible{outline:3px solid #277e8e;outline-offset:4px}.theme--dark .pulse-return{background:#182c47;color:#d7e8fa}.theme--dark .pulse-return a{color:#bddcff}@media(max-width:600px){.pulse-return{flex-direction:column;align-items:flex-start}}</style>
