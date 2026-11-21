<template>
  <button id="ms-chat-launcher" type="button" class="ms-chat-launcher" :aria-expanded="String(open)" aria-controls="ms-chat-panel"
    :aria-label="label" :title="label" @click="toggle">
    <v-icon size="22" aria-hidden="true">mdi-message-text-outline</v-icon>
    <span class="ms-chat-launcher-text">Mensajes</span>
    <span v-if="unread" class="ms-chat-badge" aria-hidden="true">{{ unread > 99 ? '99+' : unread }}</span>
  </button>
</template>

<script>
import './chat.css';
import { chatState, openPanel, closePanel } from '../../domain/chat/chatState';

export default {
  name: 'ChatLauncher',
  computed: {
    open() { return chatState.panelOpen; },
    unread() { return chatState.unread; },
    label() { return this.unread ? `Mensajes, ${this.unread} sin leer` : 'Mensajes'; }
  },
  methods: {
    toggle() { this.open ? closePanel() : openPanel(); }
  }
};
</script>
