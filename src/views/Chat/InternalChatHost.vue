<template>
  <div v-if="enabled" class="ms-chat-host">
    <chat-panel :key="activeScope" />
    <team-notice-composer :key="activeScope + '/composer'" />
  </div>
</template>

<script>
// NC5 · Chat interno. Se monta una vez en el layout autenticado; el negocio y el usuario de la sesión definen su alcance.
import './chat.css';
import DAChatService from '../../services/core/chat/DAChatService';
import { chatState, resetChat, markChanged } from '../../domain/chat/chatState';
import '../../domain/chat/teamNotice';
import ChatPanel from './ChatPanel.vue';
import TeamNoticeComposer from './TeamNoticeComposer.vue';

const SUMMARY_POLL_MS = 20000;

export default {
  name: 'InternalChatHost',
  components: { ChatPanel, TeamNoticeComposer },
  props: {
    scope: { type: String, default: '' },
    enabled: Boolean
  },
  watch: {
    activeScope: { immediate: true, handler(value) { this.restart(value); } }
  },
  computed: {
    activeScope() { return this.enabled && this.scope ? this.scope : null; }
  },
  mounted() {
    this.onVisible = () => { if (document.visibilityState === 'visible') this.refresh(); };
    window.addEventListener('focus', this.onVisible);
    document.addEventListener('visibilitychange', this.onVisible);
  },
  beforeDestroy() {
    this.stop();
    window.removeEventListener('focus', this.onVisible);
    document.removeEventListener('visibilitychange', this.onVisible);
    resetChat(null);
  },
  methods: {
    restart(scope) {
      this.stop();
      if (chatState.scope !== scope) resetChat(scope);
      if (!scope) return;
      this.refresh();
      this.timer = setInterval(() => { if (document.visibilityState === 'visible') this.refresh(); }, SUMMARY_POLL_MS);
    },
    stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.ticket = (this.ticket || 0) + 1; },
    async refresh() {
      const scope = chatState.scope;
      if (!scope || this.loading) return;
      this.loading = true;
      const ticket = this.ticket;
      const response = await DAChatService.summary();
      this.loading = false;
      // Una respuesta de otra sesión o negocio se descarta.
      if (ticket !== this.ticket || scope !== chatState.scope || !response.success) return;
      const data = response.data || {};
      const changed = Number(data.lastId) !== chatState.lastId;
      chatState.unread = Number(data.unread) || 0;
      chatState.lastId = Number(data.lastId) || 0;
      if (changed && chatState.panelOpen) markChanged();
    }
  }
};
</script>
