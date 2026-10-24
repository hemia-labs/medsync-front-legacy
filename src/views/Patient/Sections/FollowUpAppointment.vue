<template>
  <div v-if="record.linked_appointment_id" class="follow-up-appointment" role="status">
    <strong>{{ statusLabel }}</strong>
    <span>{{ record.linked_appointment_date }} · {{ record.linked_appointment_time }}</span>
    <span>{{ record.linked_appointment_title || 'Sin motivo registrado' }}</span>
    <small>La fecha sugerida y la indicación originales se conservan como antecedente.</small>
  </div>
</template>

<script>
export default {
  props: { record: { type: Object, required: true } },
  computed: {
    statusLabel() {
      return {
        confirmed: 'Cita confirmada',
        pending_confirmation: 'Cita por confirmar',
        completed: 'Cita completada'
      }[this.record.linked_appointment_status] || 'Cita vinculada'
    }
  }
}
</script>

<style scoped>
.follow-up-appointment { display: grid; gap: 0.25rem; margin: 0.5rem 0; padding: 0.75rem; border: 1px solid #99e2d5; border-radius: 12px; background: #f0fdfa; color: #134e4a; overflow-wrap: anywhere; }
.follow-up-appointment small { color: #475569; }
</style>
