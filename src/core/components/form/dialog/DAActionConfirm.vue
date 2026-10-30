<template>
  <da-dialog :value="opened" :persist="true" max-width="520px">
    <template #body>
      <da-sweet-confirm :title="title" :confirmbtntext="confirmLabel" calcelbtntext="Cancelar" @confirm="settle(true)" @close="settle(false)">
        <template #icon><v-icon size="64" color="primary" aria-hidden="true">mdi-help-circle-outline</v-icon></template>
        <template #content><p class="action-confirm-message">{{ message }}</p></template>
      </da-sweet-confirm>
    </template>
  </da-dialog>
</template>
<script>
import DADialog from './DADialog.vue';
import DASweetConfirm from './components/DASweetConfirm.vue';
export default {
  components:{'da-dialog':DADialog,'da-sweet-confirm':DASweetConfirm},
  data:()=>({opened:false,title:'Confirmar acción',message:'',confirmLabel:'Confirmar'}),
  beforeDestroy(){this.settle(false);},
  methods:{
    open(message,title='Confirmar acción',confirmLabel='Confirmar'){
      if(this.opened||this._isBeingDestroyed||this._isDestroyed)return Promise.resolve(false);
      this.message=message;this.title=title;this.confirmLabel=confirmLabel;this.opened=true;this.$emit('change',true);
      return new Promise(resolve=>{this.resolveConfirmation=resolve;});
    },
    settle(accepted){const resolve=this.resolveConfirmation;this.resolveConfirmation=null;this.opened=false;this.$emit('change',false);if(resolve)resolve(accepted);}
  }
};
</script>
<style scoped>
.action-confirm-message { white-space:pre-wrap;overflow-wrap:anywhere;max-height:45vh;overflow:auto;text-align:left;margin:16px 0; }
</style>
