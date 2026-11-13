<template>
  <section class="signature-requests">
    <div class="requests-heading">
      <div>
        <p class="section-kicker">Solicitudes remotas</p>
        <h4>Historial del documento</h4>
      </div>
      <button class="mini-action" type="button" :disabled="loading" @click="$emit('refresh')">
        <v-icon size="15">mdi-refresh</v-icon>
        Actualizar
      </button>
    </div>

    <div v-if="loading" class="requests-empty">
      <v-progress-circular indeterminate size="22" width="2" color="#1BA6C9"></v-progress-circular>
      <span>Cargando solicitudes...</span>
    </div>

    <div v-else-if="items.length === 0" class="requests-empty">
      <v-icon size="24" color="#7A8A8F">mdi-link-off</v-icon>
      <span>Este documento aun no tiene solicitudes remotas.</span>
    </div>

    <div v-else class="requests-list">
      <article v-for="request in items" :key="request.id_document_signature_request" class="request-row">
        <div class="request-main">
          <div class="request-title">
            <strong>{{ channelLabel(request.channel) }}</strong>
            <span class="request-status" :class="'status-' + normalizedStatus(request.status)">
              {{ statusLabel(request.status) }}
            </span>
          </div>
          <div class="request-meta">
            <span>Rol: {{ roleLabel(request.signature_role) }}</span>
            <span>Creada: {{ formatDateTime(request.created_at) }}</span>
            <span>Expira: {{ formatDateTime(request.expires_at) }}</span>
            <span v-if="request.opened_at">Abierta: {{ formatDateTime(request.opened_at) }}</span>
            <span v-if="request.signed_at">Firmada: {{ formatDateTime(request.signed_at) }}</span>
            <span v-if="request.revoked_at">Revocada: {{ formatDateTime(request.revoked_at) }}</span>
            <span v-if="request.recipient_phone">Telefono: {{ request.recipient_phone }}</span>
            <span v-if="request.recipient_email">Correo: {{ request.recipient_email }}</span>
          </div>
        </div>
        <button
          v-if="canRevokeRequest(request)"
          class="mini-action danger"
          type="button"
          :disabled="revokingId === request.id_document_signature_request"
          @click="$emit('revoke', request)"
        >
          <v-progress-circular
            v-if="revokingId === request.id_document_signature_request"
            indeterminate
            size="14"
            width="2"
            color="#B42318"
          ></v-progress-circular>
          <v-icon v-else size="15">mdi-link-variant-off</v-icon>
          Revocar
        </button>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'DocumentSignatureRequestsList',
  props: {
    requests: {
      type: Array,
      default: function() { return []; }
    },
    loading: {
      type: Boolean,
      default: false
    },
    revokingId: {
      type: String,
      default: ''
    },
    canRevoke: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    items: function() {
      return Array.isArray(this.requests) ? this.requests : [];
    }
  },
  methods: {
    canRevokeRequest: function(request) {
      return this.canRevoke && ['pending', 'opened'].includes(this.normalizedStatus(request.status));
    },
    normalizedStatus: function(status) {
      return String(status || '').toLowerCase();
    },
    channelLabel: function(channel) {
      const labels = {
        whatsapp: 'WhatsApp',
        qr: 'QR',
        email: 'Correo'
      };
      return labels[this.normalizedStatus(channel)] || 'Solicitud';
    },
    statusLabel: function(status) {
      const labels = {
        pending: 'Pendiente',
        opened: 'Abierta',
        signed: 'Firmada',
        expired: 'Vencida',
        revoked: 'Revocada',
        failed: 'Fallida'
      };
      return labels[this.normalizedStatus(status)] || 'Sin estado';
    },
    roleLabel: function(role) {
      const labels = {
        PATIENT: 'Paciente',
        TUTOR: 'Tutor o representante'
      };
      return labels[String(role || '').toUpperCase()] || 'Firmante';
    },
    formatDateTime: function(value) {
      if(!value) {
        return '--';
      }
      const date = new Date(value);
      if(Number.isNaN(date.getTime())) {
        return String(value).replace('T', ' ').slice(0, 16);
      }
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }
  }
};
</script>

<style scoped>
.signature-requests {
  border: 1px solid #dce8e6;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.requests-heading,
.request-title,
.request-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.requests-heading {
  margin-bottom: 12px;
}

.section-kicker {
  margin: 0 0 2px;
  color: #1b6b6f;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.requests-heading h4 {
  margin: 0;
  font-size: 15px;
  color: #123033;
}

.mini-action {
  border: 1px solid #c9d9d7;
  background: #f8fbfb;
  color: #25484b;
  border-radius: 8px;
  padding: 7px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.mini-action:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.mini-action.danger {
  color: #b42318;
  border-color: #f5b4ad;
  background: #fff8f7;
}

.requests-empty {
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #5f7478;
  font-size: 13px;
  text-align: center;
}

.requests-list {
  display: grid;
  gap: 9px;
}

.request-row {
  align-items: flex-start;
  border: 1px solid #e3edeb;
  border-radius: 8px;
  padding: 11px;
}

.request-main {
  min-width: 0;
}

.request-title {
  justify-content: flex-start;
  margin-bottom: 7px;
}

.request-title strong {
  color: #183d41;
  font-size: 14px;
}

.request-status {
  border-radius: 999px;
  padding: 3px 8px;
  background: #edf2f7;
  color: #425466;
  font-size: 11px;
  font-weight: 600;
}

.status-pending,
.status-opened {
  background: #fff7ed;
  color: #b45309;
}

.status-signed {
  background: #ecfdf3;
  color: #027a48;
}

.status-expired,
.status-revoked,
.status-failed {
  background: #fef3f2;
  color: #b42318;
}

.request-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px 14px;
  color: #5d7074;
  font-size: 12px;
}

@media (max-width: 640px) {
  .requests-heading,
  .request-row {
    align-items: stretch;
    flex-direction: column;
  }

  .request-meta {
    grid-template-columns: 1fr;
  }
}
</style>
