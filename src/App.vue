<template>

  <div id="app" style="height: 100%">
    <v-app style="height: 100%;">
      <component v-bind:is="layout" style="height: 100%">
          <router-view />
      </component>

    </v-app>
  </div>
</template>

<script>

const default_layout = "default";

import { mapActions } from 'vuex';
import fnTypes from './store/modules/common/fn-types';
import moduleTypes from './store/modules/common/module-types';
import { DAConfigService } from './services/context/core-proccess-context';
import { applyTheme } from './plugins/theme';
export default {
  name: 'App',
  created() {
    this.getToken();
    this.loadTheme();
  },
  methods: {
    ...mapActions(moduleTypes.AUTH, [
      fnTypes.getToken
    ]),
    loadTheme: async function() {
      const response = await DAConfigService.getTheme();
      if(response.success && response.data && response.data.length > 0) {
        applyTheme(response.data[0]);
      }
    }
  },
  computed: {
    layout: function() {
      return (this.$route.meta.layout || default_layout) + "-layout";
    },
  }
};
</script>

<style src="./assets/tailwind.css" />
