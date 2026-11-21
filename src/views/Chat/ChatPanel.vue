<template>
  <aside v-if="open" ref="panel" id="ms-chat-panel" class="ms-chat ms-chat-panel" :class="{ 'is-mobile': mobile }"
    :role="mobile ? 'dialog' : 'complementary'" :aria-modal="mobile ? 'true' : null" aria-labelledby="ms-chat-panel-title"
    tabindex="-1" @keydown.esc.stop="close">
    <header class="ms-chat-head">
      <v-btn v-if="view !== 'inbox'" icon aria-label="Volver a mensajes" @click="showInbox"><v-icon>mdi-arrow-left</v-icon></v-btn>
      <div class="ms-chat-head-text">
        <h2 id="ms-chat-panel-title" ref="title" tabindex="-1" class="ms-chat-title">{{ title }}</h2>
        <p v-if="view === 'thread' && thread.peer && !thread.peer.active" class="ms-chat-muted">Ya no está activa en el consultorio</p>
      </div>
      <v-btn icon aria-label="Cerrar mensajes" @click="close"><v-icon>mdi-close</v-icon></v-btn>
    </header>

    <div v-if="view === 'inbox'" class="ms-chat-body">
      <v-btn depressed color="primary" class="ms-chat-new" @click="startNew"><v-icon left>mdi-message-plus-outline</v-icon>Nueva conversación</v-btn>
      <p v-if="inbox.loading && !inbox.items.length" class="ms-chat-muted" role="status">Cargando conversaciones…</p>
      <p v-if="inbox.error" class="ms-chat-error" role="alert">{{ inbox.error }} <button type="button" class="ms-chat-link" @click="loadInbox">Reintentar</button></p>
      <p v-if="!inbox.loading && !inbox.error && !inbox.items.length" class="ms-chat-empty">Aún no tienes conversaciones. Escribe a un colega del consultorio para coordinar el día.</p>
      <ul v-if="inbox.items.length" class="ms-chat-list" aria-label="Conversaciones">
        <li v-for="item in inbox.items" :key="item.peer.id">
          <button type="button" class="ms-chat-row" :class="{ 'is-unread': item.unread }" @click="openThread(item.peer)">
            <span class="ms-chat-avatar" aria-hidden="true">{{ item.peer.initials }}</span>
            <span class="ms-chat-row-text">
              <span class="ms-chat-row-top"><span class="ms-chat-strong">{{ item.peer.name }}</span><time class="ms-chat-muted">{{ when(item.lastMessage && item.lastMessage.sentAt) }}</time></span>
              <span class="ms-chat-row-preview">{{ item.lastMessage && item.lastMessage.mine ? 'Tú: ' : '' }}{{ item.lastMessage ? item.lastMessage.preview : '' }}</span>
            </span>
            <span v-if="item.unread" class="ms-chat-badge" :aria-label="item.unread + ' sin leer'">{{ item.unread }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div v-else-if="view === 'new'" class="ms-chat-body">
      <recipient-picker :value="''" :people="directory.items" :loading="directory.loading" :error="directory.error"
        @retry="loadDirectory" @input="pickNew" />
    </div>

    <template v-else>
      <div ref="scroller" class="ms-chat-body ms-chat-thread">
        <button v-if="thread.hasMore" type="button" class="ms-chat-link ms-chat-older" :disabled="thread.loadingOlder" @click="loadOlder">
          {{ thread.loadingOlder ? 'Cargando…' : 'Ver mensajes anteriores' }}
        </button>
        <p v-if="thread.loading && !thread.items.length" class="ms-chat-muted" role="status">Cargando conversación…</p>
        <p v-else-if="thread.error" class="ms-chat-error" role="alert">{{ thread.error }}</p>
        <p v-else-if="!thread.items.length && !pendingForPeer.length" class="ms-chat-empty">Escribe el primer mensaje a {{ peerName }}.</p>
        <ol class="ms-chat-messages" aria-label="Mensajes de la conversación">
          <li v-for="message in thread.items" :key="message.id" class="ms-chat-message" :class="{ 'is-mine': message.mine }">
            <span class="ms-chat-sr">{{ message.mine ? 'Tú' : message.sender.name }}:</span>
            <notice-card v-if="message.notice" :notice="message.notice" :comment="message.body" />
            <p v-else class="ms-chat-bubble">{{ message.body }}</p>
            <span class="ms-chat-meta">{{ when(message.sentAt) }}<template v-if="message.mine && message.id <= thread.readUpTo"> · Leído</template></span>
          </li>
          <li v-for="item in pendingForPeer" :key="item.clientRequestId" class="ms-chat-message is-mine">
            <p class="ms-chat-bubble is-pending">{{ item.body }}</p>
            <span v-if="item.status === 'sending'" class="ms-chat-meta">Enviando…</span>
            <span v-else class="ms-chat-meta ms-chat-error" role="alert">{{ item.message }}
              <button v-if="item.retryable" type="button" class="ms-chat-link" @click="retry(item)">Reintentar</button>
              <button type="button" class="ms-chat-link" @click="discard(item)">Descartar</button>
            </span>
          </li>
        </ol>
        <p class="ms-chat-sr" aria-live="polite">{{ announcement }}</p>
      </div>
      <form v-if="thread.peer && thread.peer.canWrite" class="ms-chat-compose" @submit.prevent="send">
        <label class="ms-chat-sr" for="ms-chat-draft">Mensaje para {{ peerName }}</label>
        <textarea id="ms-chat-draft" ref="draft" v-model="draft" class="ms-chat-input" rows="2" maxlength="2000"
          :placeholder="'Escribe a ' + peerName" @keydown.enter.exact.prevent="send"></textarea>
        <v-btn type="submit" depressed color="primary" :disabled="!draft.trim()" aria-label="Enviar mensaje"><v-icon>mdi-send</v-icon></v-btn>
      </form>
      <p v-else-if="thread.peer" class="ms-chat-compose ms-chat-muted">Puedes leer el historial, pero ya no es posible escribirle.</p>
    </template>
  </aside>
</template>

<script>
import DAChatService from '../../services/core/chat/DAChatService';
import { chatState, closePanel, failure, newRequestId, markChanged } from '../../domain/chat/chatState';
import { containNavigationFocus } from '../../utils/mobileNavigationFocus';
import RecipientPicker from './RecipientPicker.vue';
import NoticeCard from './NoticeCard.vue';

const PANEL_POLL_MS = 4000;
const emptyThread = () => ({ peer: null, items: [], readUpTo: 0, hasMore: false, loading: false, loadingOlder: false, error: '' });

export default {
  name: 'ChatPanel',
  components: { RecipientPicker, NoticeCard },
  data() {
    return {
      inbox: { items: [], loading: false, error: '' },
      directory: { items: [], loading: false, error: '' },
      thread: emptyThread(),
      drafts: {}, pending: [], announcement: '', mobile: false, opener: null, timer: null, ticket: 0
    };
  },
  computed: {
    open() { return chatState.panelOpen; },
    view() { return chatState.panelView; },
    peerId() { return chatState.peer && chatState.peer.id; },
    peerName() { return (this.thread.peer && this.thread.peer.name) || (chatState.peer && chatState.peer.name) || ''; },
    title() { return this.view === 'thread' ? this.peerName : this.view === 'new' ? 'Nueva conversación' : 'Mensajes'; },
    pendingForPeer() { return this.pending.filter(item => item.peerId === this.peerId); },
    draft: {
      get() { return this.drafts[this.peerId] || ''; },
      set(value) { this.$set(this.drafts, this.peerId, value); }
    },
    scope() { return chatState.scope; },
    changes() { return chatState.changes; }
  },
  watch: {
    open(value) { value ? this.onOpen() : this.onClose(); },
    view() { this.onView(); },
    peerId() { if (this.view === 'thread') this.onView(); },
    scope() { Object.assign(this, { drafts: {}, pending: [], thread: emptyThread() }); this.inbox.items = []; },
    changes() { if (this.open && this.view === 'inbox') this.loadInbox(); if (this.open && this.view === 'thread') this.poll(); }
  },
  mounted() {
    this.media = window.matchMedia('(max-width: 1023px)');
    this.onMedia = () => { this.mobile = this.media.matches; if (this.open) this.trapFocus(); };
    this.onMedia();
    this.media.addEventListener ? this.media.addEventListener('change', this.onMedia) : this.media.addListener(this.onMedia);
    this.onVisible = () => {
      if (!this.open || document.visibilityState !== 'visible') return;
      if (this.view === 'inbox') this.loadInbox();
      if (this.view === 'thread') this.poll();
    };
    document.addEventListener('visibilitychange', this.onVisible);
  },
  beforeDestroy() {
    this.stopTimer(); this.releaseTrap();
    this.media.removeEventListener ? this.media.removeEventListener('change', this.onMedia) : this.media.removeListener(this.onMedia);
    document.removeEventListener('visibilitychange', this.onVisible);
  },
  methods: {
    onOpen() {
      const active = document.activeElement;
      this.opener = active && active !== document.body && !active.closest('.ms-chat-dialog') ? active : null;
      this.onView();
      this.$nextTick(() => { this.trapFocus(); this.focusTitle(); });
    },
    onClose() {
      this.stopTimer(); this.releaseTrap();
      const target = this.opener && document.contains(this.opener) ? this.opener : document.getElementById('ms-chat-launcher');
      this.opener = null;
      if (target && target.focus) this.$nextTick(() => target.focus());
    },
    trapFocus() {
      this.releaseTrap();
      // En escritorio el panel no es modal: la nota sigue editable a la izquierda.
      if (this.mobile && this.$refs.panel) this.release = containNavigationFocus(this.$refs.panel, this.close);
    },
    releaseTrap() { if (this.release) { this.release(); this.release = null; } },
    focusTitle() { this.$nextTick(() => this.$refs.title && this.$refs.title.focus()); },
    close() { closePanel(); },
    showInbox() { chatState.panelView = 'inbox'; chatState.peer = null; this.focusTitle(); },
    startNew() { chatState.panelView = 'new'; this.focusTitle(); },
    pickNew(id) {
      const person = this.directory.items.find(item => item.id === id);
      if (person) this.openThread({ id: person.id, name: person.name });
    },
    openThread(peer) { chatState.peer = { id: peer.id, name: peer.name }; chatState.panelView = 'thread'; this.focusTitle(); },
    onView() {
      this.stopTimer();
      if (!this.open) return;
      if (this.view === 'inbox') {
        this.loadInbox();
        this.timer = setInterval(() => this.loadInbox(), PANEL_POLL_MS);
      } else if (this.view === 'new') this.loadDirectory();
      else if (this.peerId) this.loadThread();
    },
    stopTimer() { this.ticket++; this.inbox.loading = false; if (this.timer) { clearInterval(this.timer); this.timer = null; } },
    async loadInbox() {
      if (!this.open || this.view !== 'inbox' || this.inbox.loading || document.visibilityState !== 'visible') return;
      const ticket = this.ticket, scope = this.scope;
      this.inbox.loading = true;
      try {
        const response = await DAChatService.conversations();
        if (ticket !== this.ticket || scope !== this.scope) return;
        if (!response.success) throw new Error();
        this.inbox.items = (response.data || {}).items || [];
        this.inbox.error = '';
      } catch {
        if (ticket === this.ticket && scope === this.scope) this.inbox.error = 'No se pudieron actualizar tus conversaciones.';
      } finally {
        if (ticket === this.ticket) this.inbox.loading = false;
      }
    },
    async loadDirectory() {
      this.directory.loading = true; this.directory.error = '';
      const response = await DAChatService.directory();
      this.directory.loading = false;
      if (response.success) this.directory.items = (response.data || {}).items || [];
      else this.directory.error = 'No se pudo cargar el equipo.';
    },
    async loadThread() {
      const ticket = ++this.ticket, peerId = this.peerId;
      this.thread = { ...emptyThread(), loading: true };
      const response = await DAChatService.messages(peerId);
      if (ticket !== this.ticket) return;
      this.thread.loading = false;
      if (!response.success) { this.thread.error = failure(response).code === 'CHAT_RECIPIENT_INVALID' ? 'Esta conversación no pertenece a este consultorio.' : 'No se pudo cargar la conversación.'; return; }
      const data = response.data || {};
      Object.assign(this.thread, { peer: data.peer, items: data.items || [], readUpTo: data.readUpTo || 0, hasMore: Boolean(data.hasMore) });
      this.scrollToEnd();
      this.markRead();
      this.timer = setInterval(() => this.poll(), PANEL_POLL_MS);
    },
    async poll() {
      if (document.visibilityState !== 'visible' || !this.thread.peer || this.thread.loading) return;
      const ticket = this.ticket, peerId = this.peerId;
      const last = this.thread.items.length ? this.thread.items[this.thread.items.length - 1].id : 0;
      const response = await DAChatService.messages(peerId, { after: last });
      if (ticket !== this.ticket || !response.success) return;
      const data = response.data || {};
      const known = new Set(this.thread.items.map(item => item.id));
      const fresh = (data.items || []).filter(item => !known.has(item.id));
      this.thread.readUpTo = data.readUpTo || this.thread.readUpTo;
      this.thread.peer = data.peer || this.thread.peer;
      if (!fresh.length) return;
      this.thread.items = this.thread.items.concat(fresh);
      const incoming = fresh.filter(item => !item.mine);
      if (incoming.length) this.announcement = `${incoming.length === 1 ? 'Nuevo mensaje' : incoming.length + ' mensajes nuevos'} de ${this.peerName}`;
      this.scrollToEnd();
      this.markRead();
    },
    async loadOlder() {
      if (!this.thread.items.length) return;
      this.thread.loadingOlder = true;
      const ticket = this.ticket;
      const response = await DAChatService.messages(this.peerId, { before: this.thread.items[0].id });
      if (ticket !== this.ticket) return;
      this.thread.loadingOlder = false;
      if (!response.success) return;
      const data = response.data || {};
      this.thread.items = (data.items || []).concat(this.thread.items);
      this.thread.hasMore = Boolean(data.hasMore);
    },
    async markRead() {
      const unread = this.thread.items.filter(item => !item.mine && !item.readAt);
      if (!this.open || this.view !== 'thread' || !unread.length || document.visibilityState !== 'visible') return;
      const upTo = unread[unread.length - 1].id;
      const scope = this.scope;
      const response = await DAChatService.markRead(this.peerId, upTo);
      if (!response.success) return;
      if (this._isDestroyed || scope !== this.scope) return;
      unread.forEach(item => { item.readAt = item.readAt || new Date().toISOString(); });
      chatState.unread = (response.data || {}).unread || 0;
    },
    send() {
      const body = this.draft.trim();
      if (!body || !this.thread.peer) return;
      const item = { clientRequestId: newRequestId(), peerId: this.peerId, body, status: 'sending', message: '', retryable: false };
      this.pending.push(item);
      this.draft = '';
      this.deliver(item);
    },
    async deliver(item) {
      item.status = 'sending';
      this.scrollToEnd();
      const scope = this.scope;
      const response = await DAChatService.sendText(item.peerId, item.clientRequestId, item.body);
      if (this._isDestroyed || scope !== this.scope) return;
      if (response.success) {
        this.pending = this.pending.filter(entry => entry !== item);
        if (this.peerId === item.peerId) {
          const message = response.data;
          if (!this.thread.items.some(entry => entry.id === message.id)) this.thread.items.push({ ...message, mine: true });
          this.thread.items.sort((a, b) => a.id - b.id);
          this.scrollToEnd();
        }
        markChanged();
        return;
      }
      Object.assign(item, { status: 'failed' }, failure(response));
    },
    retry(item) { this.deliver(item); },
    discard(item) { this.pending = this.pending.filter(entry => entry !== item); },
    scrollToEnd() { this.$nextTick(() => { const el = this.$refs.scroller; if (el) el.scrollTop = el.scrollHeight; }); },
    when(value) {
      if (!value) return '';
      const date = new Date(value), now = new Date();
      const sameDay = date.toDateString() === now.toDateString();
      return sameDay ? date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ' ' + date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }
  }
};
</script>
