<template>
  <v-dialog :value="Boolean(request)" max-width="540" :fullscreen="$vuetify.breakpoint.xsOnly" scrollable
    :persistent="sending" content-class="ms-chat-dialog" @input="value => !value && cancel()">
    <section v-if="request" class="ms-chat ms-chat-composer" role="document" aria-labelledby="ms-notice-title">
      <header class="ms-chat-head">
        <div>
          <h2 id="ms-notice-title" ref="title" tabindex="-1" class="ms-chat-title">Avisar al equipo</h2>
          <p class="ms-chat-muted">Solo se comparten datos para coordinar la cita. Tu nota no se envía.</p>
        </div>
        <v-btn icon :disabled="sending" aria-label="Cerrar sin enviar" @click="cancel"><v-icon>mdi-close</v-icon></v-btn>
      </header>

      <div class="ms-chat-body">
        <template v-if="sent">
          <div class="ms-chat-success" role="status">
            <v-icon color="success" aria-hidden="true">mdi-check-circle</v-icon>
            <div>
              <p class="ms-chat-strong">Aviso enviado a {{ sent.recipient.name }}</p>
              <p class="ms-chat-muted">{{ sent.replayed ? 'Ya se había enviado; no se duplicó.' : 'Lo verá en sus mensajes.' }} La firma y la cita no cambian con este aviso.</p>
            </div>
          </div>
        </template>
        <template v-else>
          <recipient-picker v-model="recipientId" legend="¿A quién avisas?" :people="people" :loading="loadingDirectory"
            :error="directoryError" @retry="loadDirectory" />

          <fieldset class="ms-chat-fieldset">
            <legend class="ms-chat-label">Motivo de la cita</legend>
            <div class="ms-chat-chips" role="radiogroup" aria-label="Motivo de la cita">
              <label v-for="item in reasons" :key="item.code" class="ms-chat-chip" :class="{ 'is-selected': reason === item.code }">
                <input type="radio" name="ms-notice-reason" :value="item.code" v-model="reason">{{ item.label }}
              </label>
            </div>
          </fieldset>

          <label class="ms-chat-fieldset">
            <span class="ms-chat-label">Comentario <span class="ms-chat-muted">(opcional)</span></span>
            <textarea v-model="comment" rows="2" maxlength="500" class="ms-chat-input" placeholder="Ej. Prefiere por la mañana"
              aria-describedby="ms-notice-comment-hint"></textarea>
            <span id="ms-notice-comment-hint" class="ms-chat-hint">Lo leerá quien reciba el aviso. No escribas datos clínicos.</span>
          </label>

          <section class="ms-chat-preview" aria-live="polite" aria-labelledby="ms-notice-preview">
            <h3 id="ms-notice-preview" class="ms-chat-label">Vista previa</h3>
            <p v-if="!recipientId" class="ms-chat-muted">Elige a quién avisar para ver lo que recibirá.</p>
            <p v-else-if="previewLoading" class="ms-chat-muted">Preparando vista previa…</p>
            <p v-else-if="previewError" class="ms-chat-error">{{ previewError }}</p>
            <notice-card v-else-if="preview" :notice="preview.notice" :comment="comment.trim()" :viewer-name="preview.recipient.name" preview />
          </section>

          <p v-if="error" class="ms-chat-error" role="alert">{{ error.message }}</p>
        </template>
      </div>

      <footer class="ms-chat-actions">
        <template v-if="sent">
          <v-btn text color="primary" @click="viewConversation">Ver conversación</v-btn>
          <v-btn depressed color="primary" @click="close">Listo</v-btn>
        </template>
        <template v-else>
          <v-btn text :disabled="sending" @click="cancel">Cancelar</v-btn>
          <v-btn depressed color="primary" :loading="sending" :disabled="!canSend" @click="send">
            {{ error && error.retryable ? 'Reintentar envío' : 'Enviar aviso' }}
          </v-btn>
        </template>
      </footer>
    </section>
  </v-dialog>
</template>

<script>
import DAChatService from '../../services/core/chat/DAChatService';
import { chatState, REASONS, failure, openPanel, markChanged } from '../../domain/chat/chatState';
import RecipientPicker from './RecipientPicker.vue';
import NoticeCard from './NoticeCard.vue';

export default {
  name: 'TeamNoticeComposer',
  components: { RecipientPicker, NoticeCard },
  data() {
    return {
      people: [], loadingDirectory: false, directoryError: '',
      recipientId: '', reason: '', comment: '',
      preview: null, previewLoading: false, previewError: '', previewTicket: 0,
      sending: false, error: null, sent: null, attempted: false
    };
  },
  computed: {
    request() { return chatState.composer; },
    reasons() { return REASONS; },
    canSend() { return Boolean(this.recipientId && this.reason && this.preview && !this.previewLoading && !this.sending && this.people.length); }
  },
  watch: {
    request: { immediate: true, handler(value) { if (value) this.start(value); } },
    recipientId() { this.loadPreview(); },
    reason() { this.loadPreview(); }
  },
  methods: {
    start(value) {
      Object.assign(this, { recipientId: '', comment: '', preview: null, previewError: '', error: null, sent: null, sending: false, attempted: false });
      this.reason = REASONS.some(item => item.code === value.context.reason) ? value.context.reason : '';
      this.loadDirectory();
      this.$nextTick(() => setTimeout(() => this.$refs.title && this.$refs.title.focus(), 60));
    },
    async loadDirectory() {
      this.loadingDirectory = true; this.directoryError = '';
      const response = await DAChatService.directory();
      this.loadingDirectory = false;
      if (!this.request) return;
      if (response.success) this.people = (response.data || {}).items || [];
      else this.directoryError = 'No se pudo cargar el equipo.';
    },
    async loadPreview() {
      const ticket = ++this.previewTicket;
      this.preview = null; this.previewError = '';
      if (!this.request || !this.recipientId || !this.reason) return;
      this.previewLoading = true;
      const response = await DAChatService.previewNotice(this.recipientId, this.request.context, this.reason);
      if (ticket !== this.previewTicket) return;
      this.previewLoading = false;
      if (response.success) this.preview = response.data;
      else this.previewError = failure(response).message;
    },
    async send() {
      if (!this.canSend) return;
      const request = this.request;
      this.sending = true; this.error = null; this.attempted = true;
      const response = await DAChatService.sendNotice({
        recipientId: this.recipientId, clientRequestId: request.clientRequestId, context: request.context,
        reason: this.reason, comment: this.comment.trim()
      });
      this.sending = false;
      if (request !== this.request) return;
      if (response.success) return this.settle(response.data);
      this.error = failure(response);
    },
    settle(message) {
      this.sent = message;
      markChanged();
      this.request.resolve({ status: 'sent', messageId: message.messageId, recipient: message.recipient, sentAt: message.sentAt, replayed: Boolean(message.replayed) });
    },
    async cancel() {
      if (this.sending || !this.request) return;
      if (this.sent) return this.close();
      const request = this.request;
      if (this.attempted && this.error) {
        // Tras un fallo el resultado es incierto: se consulta antes de informar a Notas.
        const response = await DAChatService.request(request.clientRequestId);
        const data = response.success ? response.data || {} : {};
        if (data.found) request.resolve({ status: 'sent', messageId: data.message.messageId, recipient: data.message.recipient, sentAt: data.message.sentAt, replayed: true });
        else request.resolve({ status: 'failed', retryable: this.error.retryable, code: this.error.code, message: this.error.message });
      } else request.resolve({ status: 'cancelled' });
      this.close();
    },
    close() {
      const target = this.request && this.request.returnFocus;
      chatState.composer = null;
      this.$nextTick(() => { if (target && document.contains(target) && target.focus) target.focus(); });
    },
    viewConversation() {
      const peer = this.sent && this.sent.recipient;
      this.close();
      if (peer) openPanel({ id: peer.id, name: peer.name });
    }
  }
};
</script>
