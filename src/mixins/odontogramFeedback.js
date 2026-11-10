export default {
  watch: {
    error(message) { if(message)this.notifyAction('error',message); },
    message(message) { if(message)this.notifyAction(this.messageType || 'info',message); },
    linksWarning(message) { if(message)this.notifyAction('warning',message); }
  },
  methods: {
    notifyAction(type,message) {
      if(!message)return;
      const key=type+':'+message,now=Date.now();
      if(this._lastOdontogramToast && this._lastOdontogramToast.key===key && now-this._lastOdontogramToast.time<1500)return;
      this._lastOdontogramToast={key,time:now};
      // Use the SweetAlert toast already installed by the application.
      if(this.$swal && typeof this.$swal.fire==='function')this.$swal.fire({toast:true,position:'top-end',icon:type,titleText:message,showConfirmButton:false,timer:4500,timerProgressBar:true});
      else if(this.$toast && typeof this.$toast[type]==='function')this.$toast[type](message);
    }
  }
};
