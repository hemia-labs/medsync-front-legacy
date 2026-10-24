<template>

  <div id="app" style="height: 100%">
    <v-app style="height: 100%;">
      <component v-bind:is="layout" style="height: 100%">
          <router-view :key="authorizationRevision" />
      </component>

    </v-app>
  </div>
</template>

<script>

const default_layout = "default";

import { mapActions } from 'vuex';
import fnTypes from './store/modules/common/fn-types';
import moduleTypes from './store/modules/common/module-types';
import { getThemeContext, syncThemeContext, themeState } from './plugins/theme';
import { isPendingActivation } from './utils/registration';
export default {
  name: 'App',
  data: () => ({ lastAccessCheck: 0, authBootstrapped: false }),
  async created() {
    window.addEventListener('focus', this.recheckAccess);
    document.addEventListener('visibilitychange', this.recheckAccess);
    try { await this.getToken(); } catch { /* Auth owns its recovery and messages. */ }
    this.authBootstrapped = true;
    await this.loadTheme({ allowAnonymous: true });
  },
  beforeDestroy() {
    window.removeEventListener('focus', this.recheckAccess);
    document.removeEventListener('visibilitychange', this.recheckAccess);
  },
  methods: {
    ...mapActions(moduleTypes.AUTH, [
      fnTypes.getToken
    ]),
    async recheckAccess() {
      if(document.visibilityState === 'hidden' || Date.now() - this.lastAccessCheck < 5000) return;
      this.lastAccessCheck = Date.now();
      try {
        await this.$store.dispatch(moduleTypes.AUTH + '/refreshAccess');
        if(this.authBootstrapped && (!themeState.loaded || themeState.loadError) && !themeState.loading) {
          await this.loadTheme({ force: themeState.loadError });
        }
      } catch { /* Keep the last valid palette during a transient failure. */ }
    },
    loadTheme: async function({ allowAnonymous = false, force = false } = {}) {
      const auth = this.$store.state.CORE.AUTH;
      syncThemeContext(getThemeContext(auth));
      if(isPendingActivation(auth.tenantOperational, auth.business)) return;
      if(!auth.authenticated && !allowAnonymous) return;
      return this.$store.dispatch(moduleTypes.CONFIGURATION + '/getTheme', { allowAnonymous, force });
    }
  },
  watch: {
    authorizationRevision() {
      if(this.authBootstrapped) this.loadTheme();
    }
  },
  computed: {
    authorizationRevision() {
      return this.$store.getters[moduleTypes.AUTH + '/getAccessRevision'];
    },
    layout: function() {
      return (this.$route.meta.layout || default_layout) + "-layout";
    },
  }
};
</script>

<style src="./assets/tailwind.css" />
