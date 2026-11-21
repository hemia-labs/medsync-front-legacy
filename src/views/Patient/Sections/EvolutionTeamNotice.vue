<template>
  <section aria-label="Avisos al equipo">
    <button type="button" class="notice-link" :aria-disabled="opening" @click="notify">
      {{ pending ? 'Reintentar aviso' : 'Avisar al equipo' }}
    </button>
    <p v-if="feedback" role="status">{{ feedback }}</p>
    <p v-for="notice in notices" :key="notice.id">
      Enviado a {{ notice.recipient.name }} · {{ localDate(notice.sentAt) }}
      <span v-if="notice.readAt"> · Leído {{ localDate(notice.readAt) }}</span>
      <span v-else> · Pendiente de lectura</span>
    </p>
    <button v-if="loadError" class="notice-link" type="button" @click="refresh">Volver a consultar los avisos</button>
  </section>
</template>

<script>
import { openTeamNotice, teamNoticeStatus, teamNoticesForContext } from '../../../domain/chat/teamNotice'
import { chatState, newRequestId } from '../../../domain/chat/chatState'

export default {
  name: 'EvolutionTeamNotice',
  props: { patient: { type: String, required: true }, noteId: { type: String, required: true } },
  data() { return { notices: [], pending: '', feedback: '', opening: false, loadError: false, generation: 0 } },
  computed: {
    storageKey() { return JSON.stringify(['nc5-notice', chatState.scope, this.patient, this.noteId]) }
  },
  watch: {
    storageKey: { immediate: true, handler() {
      this.generation++
      this.notices = []
      this.feedback = ''
      this.opening = false
      this.pending = ''
      try { this.pending = sessionStorage.getItem(this.storageKey) || '' } catch { /* Storage can be disabled. */ }
      this.refresh()
    } }
  },
  mounted() {
    window.addEventListener('focus', this.refresh)
    this.onScreen = true
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(([entry]) => { this.onScreen = entry.isIntersecting })
      this.observer.observe(this.$el)
    }
    this.timer = setInterval(() => {
      if (this.onScreen && !document.hidden && this.notices.some(n => !n.readAt)) this.refresh()
    }, 20000)
  },
  beforeDestroy() {
    this.generation++
    if (this.observer) this.observer.disconnect()
    clearInterval(this.timer)
    window.removeEventListener('focus', this.refresh)
  },
  methods: {
    localDate(value) { return new Date(value).toLocaleString('es-MX') },
    remember(id) {
      this.pending = id
      try {
        if (id) sessionStorage.setItem(this.storageKey, id)
        else sessionStorage.removeItem(this.storageKey)
      } catch { /* The current view still retains the request ID. */ }
    },
    async refresh() {
      const generation = this.generation
      const ticket = this.refreshTicket = (this.refreshTicket || 0) + 1
      try {
        const notices = await teamNoticesForContext('evolution_note', this.noteId, { reportErrors: true })
        if (generation !== this.generation || ticket !== this.refreshTicket) return
        this.notices = notices
        this.loadError = false
      } catch {
        if (generation === this.generation && ticket === this.refreshTicket) this.loadError = true
      }
    },
    async notify(event) {
      if (this.opening) return
      const generation = this.generation
      const returnFocus = event.currentTarget
      this.opening = true
      try {
        if (this.pending) {
          const previous = await teamNoticeStatus(this.pending)
          if (generation !== this.generation) return
          if (previous.error) {
            this.feedback = 'Aún no se pudo confirmar el envío anterior. Vuelve a intentarlo.'
            return
          }
          if (previous.found) {
            this.remember('')
            this.feedback = 'El aviso ya se había enviado.'
            await this.refresh()
            return
          }
        }
        const clientRequestId = this.pending || newRequestId()
        this.remember(clientRequestId)
        const result = await openTeamNotice({
          context: { kind: 'evolution_note', patientId: this.patient, noteId: this.noteId },
          clientRequestId, returnFocus
        })
        if (generation !== this.generation) return
        if (result.status === 'failed') {
          this.feedback = result.message
          if (!result.retryable) this.remember('')
          return
        }
        this.remember('')
        this.feedback = result.status === 'sent' ? 'Aviso enviado a '+result.recipient.name+'.' : ''
        if (result.status === 'sent') await this.refresh()
      } catch {
        if (generation === this.generation) this.feedback = 'No se pudo confirmar el aviso. Puedes reintentar.'
      } finally {
        if (generation === this.generation) this.opening = false
      }
    }
  }
}
</script>

<style scoped>
.notice-link { color: var(--color-primary, #116961); font-weight: 600; text-decoration: underline; padding: .5rem 0; }
</style>
