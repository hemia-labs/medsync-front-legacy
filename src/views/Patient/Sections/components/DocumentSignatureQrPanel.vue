<template>
  <section class="qr-panel">
    <div class="qr-copy">
      <p class="section-kicker">QR temporal</p>
      <h4>{{ title }}</h4>
      <p>Escanea este codigo para revisar y firmar el documento desde tu telefono.</p>
    </div>

    <div v-if="hasActiveQr" class="qr-stage">
      <qrcode-vue :value="request.public_url" :size="220" level="M"></qrcode-vue>
      <span class="qr-status" :class="'status-' + visualStatus">{{ statusLabel }}</span>
    </div>

    <div v-else class="qr-empty">
      <v-icon size="32" color="#7A8A8F">mdi-qrcode-remove</v-icon>
      <span>{{ emptyMessage }}</span>
    </div>

    <div class="qr-details">
      <span>Expira: {{ formatDateTime(request.expires_at) }}</span>
      <span>Tiempo restante: {{ countdownLabel }}</span>
      <span>Estado: {{ statusLabel }}</span>
    </div>

    <p class="security-note">Este enlace es temporal y se cerrara despues de firmar.</p>

    <div class="qr-actions">
      <button
        v-if="canRevokeCurrent"
        class="qr-btn danger"
        type="button"
        :disabled="busy"
        @click="$emit('revoke', request)"
      >
        <v-icon size="16">mdi-link-variant-off</v-icon>
        Revocar link
      </button>
      <button
        v-if="canGenerateNew"
        class="qr-btn"
        type="button"
        :disabled="busy"
        @click="$emit('generate-new')"
      >
        <v-icon size="16">mdi-qrcode-plus</v-icon>
        Generar nuevo QR
      </button>
      <button
        v-if="request.public_url"
        class="qr-btn"
        type="button"
        :disabled="busy"
        @click="copyLink"
      >
        <v-icon size="16">mdi-content-copy</v-icon>
        Copiar enlace
      </button>
    </div>

    <p v-if="copied" class="copy-note">Enlace copiado.</p>
  </section>
</template>

<script>
import QrcodeVue from 'qrcode.vue';

export default {
  name: 'DocumentSignatureQrPanel',
  components: {
    QrcodeVue
  },
  props: {
    request: {
      type: Object,
      default: function() { return {}; }
    },
    busy: {
      type: Boolean,
      default: false
    }
  },
  data: function() {
    return {
      now: Date.now(),
      timer: null,
      copied: false
    };
  },
  computed: {
    normalizedStatus: function() {
      return String(this.request.status || '').toLowerCase();
    },
    expiresAtTime: function() {
      if(!this.request.expires_at) {
        return 0;
      }
      const value = new Date(this.request.expires_at).getTime();
      return Number.isNaN(value) ? 0 : value;
    },
    isExpiredByClock: function() {
      return this.expiresAtTime > 0 && this.expiresAtTime <= this.now;
    },
    visualStatus: function() {
      if(['pending', 'opened'].includes(this.normalizedStatus) && this.isExpiredByClock) {
        return 'expired';
      }
      return this.normalizedStatus || 'pending';
    },
    hasActiveQr: function() {
      return Boolean(this.request.public_url) && ['pending', 'opened'].includes(this.visualStatus);
    },
    statusLabel: function() {
      const labels = {
        pending: 'Pendiente',
        opened: 'Abierta',
        signed: 'Firmada',
        expired: 'Vencida',
        revoked: 'Revocada',
        failed: 'Fallida'
      };
      return labels[this.visualStatus] || 'Sin estado';
    },
    title: function() {
      return this.hasActiveQr ? 'QR listo para escanear' : 'QR no disponible';
    },
    emptyMessage: function() {
      if(this.visualStatus === 'signed') {
        return 'La solicitud ya fue firmada.';
      }
      if(this.visualStatus === 'revoked') {
        return 'El link fue revocado.';
      }
      if(this.visualStatus === 'expired') {
        return 'El QR vencio. Puedes generar uno nuevo.';
      }
      return 'Genera una solicitud QR para mostrar el codigo.';
    },
    countdownLabel: function() {
      if(!this.expiresAtTime) {
        return '--';
      }
      const remaining = Math.max(this.expiresAtTime - this.now, 0);
      if(remaining <= 0) {
        return 'Vencido';
      }
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    canRevokeCurrent: function() {
      return this.request.id_document_signature_request && ['pending', 'opened'].includes(this.visualStatus);
    },
    canGenerateNew: function() {
      return ['expired', 'revoked', 'signed', 'failed'].includes(this.visualStatus);
    }
  },
  watch: {
    request: {
      immediate: true,
      handler: function() {
        this.copied = false;
      }
    }
  },
  mounted: function() {
    this.timer = window.setInterval(() => {
      this.now = Date.now();
    }, 1000);
  },
  beforeDestroy: function() {
    if(this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  },
  methods: {
    copyLink: async function() {
      if(!this.request.public_url) {
        return;
      }
      try {
        if(navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(this.request.public_url);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = this.request.public_url;
          textarea.setAttribute('readonly', 'readonly');
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        this.copied = true;
      } catch (error) {
        this.$emit('copy-error');
      }
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
.qr-panel {
  border: 1px solid #cde4df;
  border-radius: 8px;
  background: #f8fbfb;
  padding: 16px;
}

.qr-copy h4 {
  margin: 0 0 6px;
  color: #123033;
  font-size: 17px;
}

.qr-copy p {
  margin: 0 0 12px;
  color: #5b6f73;
  font-size: 13px;
}

.section-kicker {
  margin: 0 0 3px;
  color: #1b6b6f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.qr-stage,
.qr-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  min-height: 260px;
  background: #ffffff;
  border: 1px solid #dce8e6;
  border-radius: 8px;
  padding: 18px;
  text-align: center;
}

.qr-empty {
  color: #64777b;
}

.qr-status {
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 800;
  background: #edf2f7;
  color: #425466;
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

.qr-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
  color: #5d7074;
  font-size: 12px;
}

.security-note {
  margin: 12px 0 0;
  color: #1b6b6f;
  font-size: 12px;
  font-weight: 800;
}

.qr-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.qr-btn {
  border: 1px solid #c9d9d7;
  background: #ffffff;
  color: #25484b;
  border-radius: 8px;
  padding: 8px 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
}

.qr-btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.qr-btn.danger {
  color: #b42318;
  border-color: #f5b4ad;
  background: #fff8f7;
}

.copy-note {
  margin: 8px 0 0;
  color: #027a48;
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 720px) {
  .qr-details {
    grid-template-columns: 1fr;
  }
}
</style>
