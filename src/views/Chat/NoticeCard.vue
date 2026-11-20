<template>
  <div class="ms-chat-notice" :class="{ 'is-preview': preview }">
    <p class="ms-chat-notice-kicker"><v-icon size="16" aria-hidden="true">mdi-calendar-clock</v-icon> Aviso de seguimiento</p>
    <dl class="ms-chat-notice-data">
      <div><dt>Paciente</dt><dd>{{ notice.patient.name }}<span v-if="notice.patient.code" class="ms-chat-muted"> · {{ notice.patient.code }}</span></dd></div>
      <div v-if="notice.professional"><dt>Profesional</dt><dd>{{ notice.professional }}</dd></div>
      <div><dt>Motivo</dt><dd>{{ notice.reason.label }}</dd></div>
      <div v-if="notice.attentionDate"><dt>Atención</dt><dd>{{ date(notice.attentionDate) }}</dd></div>
    </dl>
    <p v-if="comment" class="ms-chat-notice-comment">«{{ comment }}»</p>
    <p v-if="notice.patient.restricted" class="ms-chat-hint">
      {{ preview ? (viewerName || 'Esta persona') + ' verá solo las iniciales porque no tiene acceso a pacientes.' : 'Ves solo las iniciales porque tu puesto no tiene acceso a pacientes.' }}
      Alguien con acceso a Agenda debe coordinar la cita.
    </p>
    <p v-else-if="preview && !notice.canCoordinate" class="ms-chat-hint">{{ viewerName || 'Esta persona' }} no tiene acceso a Agenda: podrá leer el aviso, pero no reservar la cita.</p>
    <router-link v-if="!preview && notice.canCoordinate" class="ms-chat-link" :to="{ name: 'Citas' }">Coordinar en Agenda</router-link>
  </div>
</template>

<script>
export default {
  name: 'NoticeCard',
  props: {
    notice: { type: Object, required: true },
    comment: { type: String, default: '' },
    viewerName: { type: String, default: '' },
    preview: Boolean
  },
  methods: {
    date(value) {
      const [y, m, d] = String(value).split('-').map(Number);
      if (!y || !m || !d) return value;
      return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
};
</script>
