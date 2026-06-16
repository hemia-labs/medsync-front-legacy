<template>
  <main class="public-signature-page">
    <section v-if="isLoading" class="public-signature-state">
      <v-progress-circular indeterminate color="#1B6B6F" size="42"></v-progress-circular>
      <p>Cargando documento...</p>
    </section>

    <section v-else-if="isUnavailable" class="public-signature-state public-signature-state--notice">
      <v-icon size="42" color="#64748B">mdi-link-off</v-icon>
      <h1>Enlace no disponible</h1>
      <p>{{ unavailableMessage }}</p>
    </section>

    <section v-else-if="isSigned" class="public-signature-state public-signature-state--success">
      <v-icon size="46" color="#12805C">mdi-check-circle-outline</v-icon>
      <h1>Firma registrada</h1>
      <p>Tu firma fue registrada correctamente. Puedes cerrar esta ventana.</p>
    </section>

    <section v-else-if="hasTemporaryError" class="public-signature-state public-signature-state--notice">
      <v-icon size="42" color="#B45309">mdi-wifi-alert</v-icon>
      <h1>No pudimos cargar el documento</h1>
      <p>{{ temporaryErrorMessage }}</p>
      <button class="public-btn public-btn-primary" type="button" @click="loadDocument">
        Reintentar
      </button>
    </section>

    <section v-else class="public-signature-shell">
      <header class="public-signature-header">
        <div class="clinic-brand">
          <img v-if="clinic.logo_url" :src="clinic.logo_url" alt="Logo del consultorio">
          <span v-else>{{ clinicInitial }}</span>
        </div>
        <div>
          <p>{{ clinic.legal_name || clinic.name || 'Consultorio' }}</p>
          <h1>{{ document.title }}</h1>
          <span v-if="doctor.name">Doctor responsable: {{ doctor.name }}</span>
        </div>
      </header>

      <section class="public-signature-summary">
        <div>
          <strong>Paciente</strong>
          <span>{{ patient.display_name || '--' }}</span>
        </div>
        <div>
          <strong>Firma solicitada</strong>
          <span>{{ signatureRoleLabel }}</span>
        </div>
        <div v-if="request.expires_at">
          <strong>Disponible hasta</strong>
          <span>{{ formatDateTime(request.expires_at) }}</span>
        </div>
      </section>

      <section class="public-document-panel">
        <div class="public-document-content" v-html="documentHtml"></div>
      </section>

      <section class="public-signature-form">
        <div class="form-header">
          <p>Firma electrónica</p>
          <span>Traza vinculada a este documento y al consultorio emisor.</span>
        </div>

        <aside class="privacy-brief" aria-label="Aviso de privacidad simplificado">
          <strong>Aviso de privacidad simplificado</strong>
          <p>
            MedSync procesa este enlace, la evidencia técnica mínima y la firma por cuenta del consultorio que emitió
            el documento. Consulta también el aviso de privacidad del consultorio/profesional tratante. Este aviso no
            sustituye consentimientos clínicos sensibles que correspondan al consultorio.
          </p>
          <router-link to="/privacy" target="_blank" rel="noopener noreferrer">
            Ver Aviso de Privacidad Integral de MedSync.mx
          </router-link>
        </aside>

        <v-text-field
          v-model.trim="signedByName"
          label="Nombre de quien firma"
          outlined
          dense
          :error-messages="validationErrors.signedByName"
          color="#1B6B6F"
        ></v-text-field>

        <div class="signature-pad-wrap">
          <da-signature-pad
            ref="signaturePad"
            required
            :show-actions="false"
            height="240px"
            @signed="onSignatureCaptured"
          ></da-signature-pad>
        </div>

        <p v-if="validationErrors.signature" class="field-error">{{ validationErrors.signature }}</p>

        <v-checkbox
          v-model="acceptedElectronicSignature"
          color="#1B6B6F"
          :error-messages="validationErrors.accepted"
          hide-details="auto"
        >
          <template v-slot:label>
            <span class="acceptance-text">He leído el documento y acepto firmarlo electrónicamente.</span>
          </template>
        </v-checkbox>

        <p v-if="submitError" class="submit-error">{{ submitError }}</p>

        <div class="public-actions">
          <button class="public-btn public-btn-secondary" type="button" :disabled="isSubmitting" @click="clearSignature">
            Limpiar firma
          </button>
          <button class="public-btn public-btn-primary" type="button" :disabled="isSubmitting" @click="submitSignature">
            <v-progress-circular v-if="isSubmitting" indeterminate size="18" width="2" color="#FFFFFF"></v-progress-circular>
            <span>{{ isSubmitting ? 'Enviando...' : 'Firmar documento' }}</span>
          </button>
        </div>
      </section>
    </section>
  </main>
</template>

<script>
import DAPublicDocumentSignatureService from '@/services/core/public/DAPublicDocumentSignatureService';
import { sanitizeHtmlForDocumentSnapshot } from '@/utils/sanitizeHtml';

const unavailableMessage = 'Este enlace ya no esta disponible. Solicita uno nuevo al consultorio.';

export default {
  name: 'PublicDocumentSignature',
  data() {
    return {
      isLoading: true,
      isSubmitting: false,
      isUnavailable: false,
      isSigned: false,
      hasTemporaryError: false,
      temporaryErrorMessage: 'Revisa tu conexion e intenta de nuevo.',
      unavailableMessage,
      request: {},
      document: {},
      patient: {},
      clinic: {},
      doctor: {},
      documentHtml: '',
      signedByName: '',
      signatureImage: '',
      acceptedElectronicSignature: false,
      validationErrors: {},
      submitError: ''
    };
  },
  computed: {
    token() {
      return this.$route.params.token || '';
    },
    clinicInitial() {
      const value = this.clinic.name || this.clinic.legal_name || 'H';
      return value.slice(0, 1).toUpperCase();
    },
    signatureRoleLabel() {
      const role = this.request.signature_role;
      if (role === 'TUTOR') {
        return 'Tutor o representante';
      }
      return 'Paciente';
    }
  },
  created() {
    this.loadDocument();
  },
  beforeDestroy() {
    this.clearSensitiveState();
  },
  methods: {
    async loadDocument() {
      this.isLoading = true;
      this.hasTemporaryError = false;
      this.isUnavailable = false;
      this.submitError = '';

      const response = await DAPublicDocumentSignatureService.getDocumentByToken(this.token);

      this.isLoading = false;
      if (response.success && response.data) {
        this.applyDocumentResponse(response.data);
        return;
      }

      if (response.code === 'SIGNATURE_LINK_NOT_AVAILABLE') {
        this.isUnavailable = true;
        this.clearSensitiveState();
        return;
      }

      this.hasTemporaryError = true;
      this.temporaryErrorMessage = response.message || 'Revisa tu conexion e intenta de nuevo.';
    },
    applyDocumentResponse(data) {
      this.request = data.request || {};
      this.document = data.document || {};
      this.patient = data.patient || {};
      this.clinic = data.clinic || {};
      this.doctor = data.doctor || {};
      this.documentHtml = sanitizeHtmlForDocumentSnapshot(this.document.content_html_snapshot);
      this.signedByName = this.patient.display_name || '';
      this.signatureImage = '';
      this.acceptedElectronicSignature = false;
      this.validationErrors = {};
    },
    onSignatureCaptured(signatureImage) {
      this.signatureImage = signatureImage || '';
      if (this.signatureImage) {
        this.validationErrors = { ...this.validationErrors, signature: '' };
      }
    },
    clearSignature() {
      if (this.$refs.signaturePad && this.$refs.signaturePad.clear) {
        this.$refs.signaturePad.clear();
      }
      this.signatureImage = '';
    },
    validateForm() {
      const errors = {};
      if (!this.signedByName) {
        errors.signedByName = ['Captura el nombre de quien firma.'];
      }
      if (!this.acceptedElectronicSignature) {
        errors.accepted = ['Debes aceptar la firma electrónica.'];
      }
      if (!this.signatureImage) {
        errors.signature = 'Captura tu firma antes de continuar.';
      }
      this.validationErrors = errors;
      return Object.keys(errors).length === 0;
    },
    submitSignature() {
      this.submitError = '';
      if (!this.signatureImage && this.$refs.signaturePad && this.$refs.signaturePad.save) {
        this.$refs.signaturePad.save();
      }

      this.$nextTick(() => {
        if (!this.validateForm()) {
          return;
        }
        this.sendSignature();
      });
    },
    async sendSignature() {
      this.isSubmitting = true;
      const payload = {
        signature_image: this.signatureImage,
        signed_by_name: this.signedByName,
        accepted_electronic_signature: true
      };
      const response = await DAPublicDocumentSignatureService.signDocumentByToken(this.token, payload);
      this.isSubmitting = false;

      if (response.success) {
        this.isSigned = true;
        this.clearSensitiveState();
        return;
      }

      if (response.code === 'SIGNATURE_LINK_NOT_AVAILABLE') {
        this.isUnavailable = true;
        this.clearSensitiveState();
        return;
      }

      if (response.status === 429 || response.code === 'PUBLIC_RATE_LIMITED') {
        this.submitError = 'Detectamos demasiados intentos. Intenta mas tarde o solicita apoyo al consultorio.';
        return;
      }

      this.submitError = response.message || 'No fue posible registrar la firma. Intenta de nuevo.';
    },
    clearSensitiveState() {
      this.documentHtml = '';
      this.signatureImage = '';
      this.request = {};
      this.document = {};
      this.patient = {};
      this.clinic = {};
      this.doctor = {};
      this.signedByName = '';
      this.acceptedElectronicSignature = false;
      this.validationErrors = {};
    },
    formatDateTime(value) {
      if (!value) {
        return '--';
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '--';
      }
      return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    }
  }
};
</script>

<style scoped>
.public-signature-page {
  min-height: 100vh;
  background: #f7faf9;
  color: #123033;
  padding: 16px;
}

.public-signature-shell {
  max-width: 980px;
  margin: 0 auto;
}

.public-signature-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 0 14px;
}

.clinic-brand {
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  background: #e6f2ef;
  border: 1px solid #cae2db;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-weight: 800;
  color: #1b6b6f;
}

.clinic-brand img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.public-signature-header p {
  margin: 0;
  color: #4b686b;
  font-size: 13px;
}

.public-signature-header h1 {
  margin: 2px 0;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 800;
}

.public-signature-header span {
  display: block;
  color: #607174;
  font-size: 13px;
}

.public-signature-summary {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin: 8px 0 16px;
}

.public-signature-summary div {
  background: #ffffff;
  border: 1px solid #dce8e6;
  border-radius: 8px;
  padding: 12px;
}

.public-signature-summary strong,
.public-signature-summary span {
  display: block;
}

.public-signature-summary strong {
  font-size: 12px;
  color: #5d7375;
  text-transform: uppercase;
}

.public-signature-summary span {
  margin-top: 3px;
  font-size: 15px;
  color: #153b3f;
}

.public-document-panel,
.public-signature-form {
  background: #ffffff;
  border: 1px solid #dce8e6;
  border-radius: 8px;
}

.public-document-panel {
  padding: 18px;
}

.public-document-content {
  color: #152f32;
  font-size: 15px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.public-document-content >>> img,
.public-document-content ::v-deep img {
  max-width: 100%;
  height: auto;
}

.public-document-content >>> table,
.public-document-content ::v-deep table {
  max-width: 100%;
  border-collapse: collapse;
}

.public-signature-form {
  margin-top: 16px;
  padding: 16px;
}

.form-header p {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.form-header span {
  display: block;
  color: #5b7073;
  font-size: 13px;
  margin: 2px 0 14px;
}

.privacy-brief {
  margin: 0 0 16px;
  border: 1px solid #cde5df;
  border-radius: 8px;
  padding: 12px;
  background: #f0fbf8;
  color: #203f42;
}

.privacy-brief strong {
  display: block;
  color: #145f63;
  font-size: 13px;
  text-transform: uppercase;
}

.privacy-brief p {
  margin: 6px 0 8px;
  color: #40595c;
  font-size: 13px;
  line-height: 1.55;
}

.privacy-brief a {
  color: #145f63;
  font-size: 13px;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.signature-pad-wrap {
  margin-top: 6px;
}

.acceptance-text {
  color: #243f42;
  font-size: 14px;
}

.field-error,
.submit-error {
  margin: 8px 0 0;
  color: #b42318;
  font-size: 13px;
}

.public-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.public-btn {
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.public-btn:disabled {
  opacity: .72;
}

.public-btn-primary {
  background: #1b6b6f;
  color: #ffffff;
}

.public-btn-secondary {
  background: #ffffff;
  border-color: #bcd5d0;
  color: #1b6b6f;
}

.public-signature-state {
  min-height: 100vh;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
}

.public-signature-state h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}

.public-signature-state p {
  margin: 0;
  color: #53676a;
}

.public-signature-state--success h1 {
  color: #12805c;
}

@media (min-width: 700px) {
  .public-signature-page {
    padding: 28px;
  }

  .public-signature-header h1 {
    font-size: 30px;
  }

  .public-signature-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .public-actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  .public-btn {
    min-width: 180px;
  }
}
</style>
