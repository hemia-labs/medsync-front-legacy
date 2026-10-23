<template>
  <aside v-if="$route.query.guide === '1' && state.continuation" class="onboarding-continuity" aria-label="Continuar preparación">
    <p>{{ state.continuation }}</p><button type="button" @click="dismiss">Entendido</button>
  </aside>
</template>
<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { guideContext, ONBOARDING } from '../../../domain/onboarding/context';
export default {
  computed:{
    ...mapGetters(moduleTypes.AUTH,{user:fnTypes.getUser,role:fnTypes.getRole,hasPermission:fnTypes.hasPermission}),
    state(){return this.$store.state.CORE.ONBOARDING;},
    context(){return guideContext(this.user,this.role,this.hasPermission,this.$store.state.CORE.AUTH.accessRevision,this.$store.state.CORE.AUTH.business);},
    section(){return this.$route.path==='/admin' ? this.$route.query.section : '';}
  },
  watch:{
    context:{immediate:true,async handler(value){await this.$store.dispatch(ONBOARDING+'context',value);if(this.$route.query.guide!=='1' && this.state.guide==='active')this.pause();}},
    '$route.fullPath'(){
      this.dismiss();
      if(this.state.guide==='active' && (this.$route.query.guide!=='1' || this.section!=='agenda')) this.pause();
    }
  },
  mounted(){window.addEventListener('focus',this.refreshActive);},
  beforeDestroy(){window.removeEventListener('focus',this.refreshActive);},
  methods:{
    check(){return this.$store.dispatch(ONBOARDING+'refresh',{force:true});},
    refreshActive(){if(this.$route.query.guide==='1' && this.state.guide==='active')this.check();},
    pause(){return this.$store.dispatch(ONBOARDING+'pause');},
    dismiss(){this.$store.commit(ONBOARDING+'patch',{continuation:''});}
  }
};
</script>
<style scoped>
.onboarding-continuity{padding:18px;margin-bottom:20px;background:#f0f8f8;border:1px solid #8ab9ba;border-radius:12px;color:#173f48}.onboarding-continuity h2{font-size:20px}.onboarding-continuity p{line-height:1.6}.onboarding-continuity button,.onboarding-continuity a{display:inline-block;padding:10px;min-height:44px;text-decoration:underline}.onboarding-continuity :focus-visible{outline:3px solid #996000;outline-offset:3px}
</style>
