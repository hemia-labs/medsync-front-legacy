<template>
  <v-dialog :value="value" max-width="1040" scrollable @input="handleDialogInput">
    <v-card>
      <div class="signature-dialog-header">
        <div>
          <p class="eyebrow">Firmar documento</p>
          <h3>{{ documentTitle }}</h3>
          <span>{{ patientName }}</span>
        </div>
        <v-btn icon @click="closeDialog">
          <v-icon color="#8A9AA0">mdi-close</v-icon>
        </v-btn>
      </div>

      <v-card-text class="signature-dialog-body">
        <v-alert v-if="errorMessage" dense outlined type="error" class="mb-3">
          {{ errorMessage }}
        </v-alert>
        <v-alert v-if="successMessage" dense outlined type="success" class="mb-3">
          {{ successMessage }}
        </v-alert>

        <section class="signature-options-grid">
          <button class="option-card" type="button" @click="signLocal">
            <span class="option-icon"><v-icon size="22">mdi-draw-pen</v-icon></span>
            <strong>Firmar aqui</strong>
            <small>El paciente firma en este dispositivo.</small>
          </button>

          <section class="option-card option-card-panel" :class="{ disabled: Boolean(whatsappDisabledReason) }">
            <span class="option-icon"><v-icon size="22">mdi-whatsapp</v-icon></span>
            <strong>Enviar por WhatsApp</strong>
            <small>Genera un enlace seguro y abre WhatsApp con mensaje prellenado.</small>

            <div class="remote-fields">
              <v-select
                v-model="selectedRole"
                :items="roleItems"
                item-text="label"
                item-value="value"
                label="Firma solicitada"
                dense
                outlined
                hide-details
                :disabled="!canSelectRemoteRole"
              ></v-select>
              <v-text-field
                v-model="recipientPhone"
                label="Telefono WhatsApp"
                dense
                outlined
                hide-details
                :disabled="!canEditRemoteContact"
              ></v-text-field>
            </div>

            <p v-if="whatsappDisabledReason" class="permission-note">{{ whatsappDisabledReason }}</p>
            <div v-if="whatsappRequest.id_document_signature_request" class="created-note">
              <v-icon size="16" color="#027A48">mdi-check-circle-outline</v-icon>
              <span>Link creado para WhatsApp.</span>
            </div>
            <div class="option-actions">
              <button
                class="dialog-btn primary"
                type="button"
                :disabled="!canCreateWhatsappRequest"
                @click="createWhatsAppRequest"
              >
                <v-progress-circular v-if="isCreating === 'whatsapp'" indeterminate size="16" width="2" color="#FFFFFF"></v-progress-circular>
                <v-icon v-else size="16">mdi-whatsapp</v-icon>
                Generar y abrir WhatsApp
              </button>
              <button
                v-if="whatsappMessage"
                class="dialog-btn"
                type="button"
                :disabled="isCreating"
                @click="openCreatedWhatsApp"
              >
                <v-icon size="16">mdi-open-in-new</v-icon>
                Abrir WhatsApp
              </button>
              <button
                v-if="whatsappMessage"
                class="dialog-btn"
                type="button"
                :disabled="isCreating"
                @click="copyWhatsAppMessage"
              >
                <v-icon size="16">mdi-content-copy</v-icon>
                Copiar mensaje
              </button>
            </div>
          </section>

          <section class="option-card option-card-panel" :class="{ disabled: Boolean(qrDisabledReason) }">
            <span class="option-icon"><v-icon size="22">mdi-qrcode</v-icon></span>
            <strong>Mostrar QR</strong>
            <small>El paciente escanea el QR con su telefono.</small>
            <p v-if="qrDisabledReason" class="permission-note">{{ qrDisabledReason }}</p>
            <div class="option-actions">
              <button
                class="dialog-btn primary"
                type="button"
                :disabled="!canCreateQrRequest"
                @click="createQrRequest"
              >
                <v-progress-circular v-if="isCreating === 'qr'" indeterminate size="16" width="2" color="#FFFFFF"></v-progress-circular>
                <v-icon v-else size="16">mdi-qrcode-plus</v-icon>
                Generar QR
              </button>
            </div>
          </section>

          <section class="option-card option-card-panel" :class="{ disabled: Boolean(emailDisabledReason) }">
            <span class="option-icon"><v-icon size="22">mdi-email-outline</v-icon></span>
            <strong>Enviar por correo</strong>
            <small>Se enviara un enlace seguro para que el paciente revise y firme el documento.</small>

            <div class="remote-fields">
              <v-select
                v-model="selectedRole"
                :items="roleItems"
                item-text="label"
                item-value="value"
                label="Firma solicitada"
                dense
                outlined
                hide-details
                :disabled="!canSelectRemoteRole"
              ></v-select>
              <v-text-field
                v-model.trim="recipientEmail"
                label="Correo del paciente"
                dense
                outlined
                hide-details
                :disabled="!canEditRemoteContact"
              ></v-text-field>
            </div>

            <p v-if="emailDisabledReason" class="permission-note">{{ emailDisabledReason }}</p>
            <div v-if="emailRequest.id_document_signature_request" class="created-note">
              <v-icon size="16" color="#027A48">mdi-check-circle-outline</v-icon>
              <span>Correo enviado correctamente.</span>
            </div>
            <div class="option-actions">
              <button
                class="dialog-btn primary"
                type="button"
                :disabled="!canSendEmailRequest"
                @click="sendEmailRequest"
              >
                <v-progress-circular v-if="isCreating === 'email'" indeterminate size="16" width="2" color="#FFFFFF"></v-progress-circular>
                <v-icon v-else size="16">mdi-email-send-outline</v-icon>
                Enviar correo
              </button>
            </div>
          </section>
        </section>

        <document-signature-qr-panel
          v-if="activeQrRequest.id_document_signature_request"
          class="mt-4"
          :request="activeQrRequest"
          :busy="Boolean(isCreating || revokingId)"
          @revoke="revokeRequest"
          @generate-new="createQrRequest"
          @copy-error="errorMessage = 'No se pudo copiar el enlace. Intenta nuevamente.'"
        ></document-signature-qr-panel>

        <document-signature-requests-list
          class="mt-4"
          :requests="requests"
          :loading="isLoadingRequests"
          :revoking-id="revokingId"
          :can-revoke="canRevokeRemoteRequests"
          @refresh="loadRequests"
          @revoke="revokeRequest"
        ></document-signature-requests-list>
      </v-card-text>

      <v-card-actions class="signature-dialog-actions">
        <button class="dialog-btn" type="button" @click="closeDialog">Cerrar</button>
      </v-card-actions>

      <v-dialog v-model="revokeConfirmDialog.show" max-width="460" persistent>
        <v-card class="revoke-confirm-card">
          <div class="confirm-dialog-header">
            <div class="confirm-icon">
              <v-icon size="24">mdi-link-off</v-icon>
            </div>
            <div>
              <p class="eyebrow">Confirmar revocacion</p>
              <h4>Revocar link de firma</h4>
            </div>
            <v-btn icon :disabled="Boolean(revokingId)" @click="closeRevokeConfirmDialog">
              <v-icon color="#8A9AA0">mdi-close</v-icon>
            </v-btn>
          </div>

          <v-card-text class="confirm-dialog-body">
            <p>El link dejara de estar disponible para el paciente. Esta accion no se puede deshacer.</p>
          </v-card-text>

          <v-card-actions class="confirm-dialog-actions">
            <button class="dialog-btn" type="button" :disabled="Boolean(revokingId)" @click="closeRevokeConfirmDialog">
              Cancelar
            </button>
            <button class="dialog-btn danger" type="button" :disabled="Boolean(revokingId)" @click="confirmRevokeRequest">
              <v-progress-circular v-if="revokingId" indeterminate size="16" width="2" color="#FFFFFF"></v-progress-circular>
              <v-icon v-else size="16">mdi-link-off</v-icon>
              Revocar link
            </button>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-dialog>
</template>

<script>
import { DADocumentService } from '../../../../services/context/core-proccess-context';
import {
  normalizePhoneForWhatsApp,
  buildWhatsAppSignatureMessage,
  buildWhatsAppUrl,
  openWhatsAppUrl
} from '../../../../utils/whatsapp';
import DocumentSignatureQrPanel from './DocumentSignatureQrPanel.vue';
import DocumentSignatureRequestsList from './DocumentSignatureRequestsList.vue';

export default {
  name: 'DocumentSignatureOptionsDialog',
  components: {
    DocumentSignatureQrPanel,
    DocumentSignatureRequestsList
  },
  props: {
    value: {
      type: Boolean,
      default: false
    },
    document: {
      type: Object,
      default: function() { return {}; }
    },
    patient: {
      type: Object,
      default: function() { return {}; }
    },
    businessName: {
      type: String,
      default: 'Consultorio'
    },
    canRequestRemoteSignature: {
      type: Boolean,
      default: false
    }
  },
  data: function() {
    return {
      selectedRole: '',
      recipientPhone: '',
      recipientEmail: '',
      requests: [],
      isLoadingRequests: false,
      isCreating: '',
      revokingId: '',
      errorMessage: '',
      successMessage: '',
      activeQrRequest: {},
      whatsappRequest: {},
      emailRequest: {},
      whatsappMessage: '',
      signedRefreshRequestIds: [],
      pollingTimer: null,
      revokeConfirmDialog: {
        show: false,
        request: null
      }
    };
  },
  computed: {
    documentTitle: function() {
      return this.document.title || this.typeLabel(this.document.document_type);
    },
    patientName: function() {
      return this.patient.fullname || `${this.patient.name || ''} ${this.patient.surname || ''}`.trim() || 'Paciente';
    },
    patientPhone: function() {
      return this.patient.telephone || this.patient.mobilePhone || this.patient.local_telephone || this.patient.phone || '';
    },
    patientEmail: function() {
      return this.patient.email || this.patient.mail || '';
    },
    roleItems: function() {
      return this.pendingRemoteRoles(this.document).map((role) => ({
        value: role,
        label: this.roleLabel(role)
      }));
    },
    normalizedRecipientPhone: function() {
      return normalizePhoneForWhatsApp(this.recipientPhone);
    },
    normalizedRecipientEmail: function() {
      return this.normalizedEmail(this.recipientEmail);
    },
    isRemoteActionBusy: function() {
      return Boolean(this.isCreating || this.revokingId);
    },
    isDocumentFirmable: function() {
      return Boolean(
        this.document &&
        this.document.id_patient_document &&
        this.isFirmableStatus(this.document.status)
      );
    },
    hasSelectedPendingRemoteRole: function() {
      return this.roleItems.some((item) => item.value === this.selectedRole);
    },
    remoteDisabledReason: function() {
      if(!this.canRequestRemoteSignature) {
        return 'No tienes permiso para solicitar firma remota.';
      }
      if(!this.isDocumentFirmable) {
        return 'Este documento ya no esta disponible para firma remota.';
      }
      if(this.roleItems.length === 0 || !this.selectedRole || !this.hasSelectedPendingRemoteRole) {
        return 'La firma seleccionada ya no esta pendiente.';
      }
      if(this.isRemoteActionBusy) {
        return 'Espera a que termine la accion en curso.';
      }
      return '';
    },
    whatsappDisabledReason: function() {
      if(this.remoteDisabledReason) {
        return this.remoteDisabledReason;
      }
      if(!this.isValidWhatsAppPhone(this.normalizedRecipientPhone)) {
        return 'Captura un telefono valido para abrir WhatsApp.';
      }
      return '';
    },
    qrDisabledReason: function() {
      return this.remoteDisabledReason;
    },
    emailDisabledReason: function() {
      if(this.remoteDisabledReason) {
        return this.remoteDisabledReason;
      }
      if(!this.isValidEmail(this.normalizedRecipientEmail)) {
        return 'Captura un correo valido para enviar el enlace.';
      }
      return '';
    },
    canSelectRemoteRole: function() {
      return this.canRequestRemoteSignature && this.isDocumentFirmable && this.roleItems.length > 0 && !this.isRemoteActionBusy;
    },
    canEditRemoteContact: function() {
      return this.canRequestRemoteSignature && this.isDocumentFirmable && this.hasSelectedPendingRemoteRole && !this.isRemoteActionBusy;
    },
    canCreateWhatsappRequest: function() {
      return !this.whatsappDisabledReason;
    },
    canCreateQrRequest: function() {
      return !this.qrDisabledReason;
    },
    canSendEmailRequest: function() {
      return !this.emailDisabledReason;
    },
    canRevokeRemoteRequests: function() {
      return this.canRequestRemoteSignature && !this.isRemoteActionBusy;
    },
    canUseRemote: function() {
      return !this.remoteDisabledReason;
    },
    remoteDisabledMessage: function() {
      return this.remoteDisabledReason;
    }
  },
  watch: {
    value: function(open) {
      if(open) {
        this.initializeDialog();
      } else {
        this.stopPolling();
        this.clearSensitiveState();
      }
    },
    document: function() {
      if(this.value) {
        this.initializeDialog();
      }
    }
  },
  beforeDestroy: function() {
    this.stopPolling();
    this.clearSensitiveState();
  },
  methods: {
    initializeDialog: function() {
      this.errorMessage = '';
      this.successMessage = '';
      this.recipientPhone = this.patientPhone;
      this.recipientEmail = this.patientEmail;
      this.selectedRole = this.roleItems[0] ? this.roleItems[0].value : '';
      this.whatsappRequest = {};
      this.emailRequest = {};
      this.whatsappMessage = '';
      this.activeQrRequest = {};
      if(this.canRequestRemoteSignature && this.document.id_patient_document) {
        this.loadRequests();
      } else {
        this.requests = [];
      }
    },
    handleDialogInput: function(open) {
      if(!open) {
        this.closeDialog();
      }
    },
    closeDialog: function() {
      this.stopPolling();
      this.clearSensitiveState();
      this.$emit('input', false);
      this.$emit('close');
    },
    signLocal: function() {
      this.closeDialog();
      this.$emit('sign-local', this.document);
    },
    loadRequests: async function(silent = false) {
      if(!this.canRequestRemoteSignature || !this.document.id_patient_document) {
        return;
      }
      if(!silent) {
        this.isLoadingRequests = true;
      }
      try {
        const response = await DADocumentService.listSignatureRequests(this.document.id_patient_document);
        if(response && response.success) {
          this.requests = Array.isArray(response.data) ? response.data.map((item) => this.sanitizeRequest(item)) : [];
          this.syncActiveQrRequest();
          this.maybeEmitSignedRefresh();
          return;
        }
        if(!silent) {
          this.errorMessage = this.friendlyError(response);
        }
      } catch (error) {
        if(!silent) {
          this.errorMessage = 'No se pudo completar la accion. Intenta nuevamente.';
        }
      } finally {
        if(!silent) {
          this.isLoadingRequests = false;
        }
      }
    },
    createWhatsAppRequest: async function() {
      if(!this.ensureRemoteReady('whatsapp')) {
        return;
      }
      this.errorMessage = '';
      this.successMessage = '';
      this.isCreating = 'whatsapp';
      let response = null;
      try {
        response = await DADocumentService.createSignatureRequest(this.createRequestPayload('whatsapp'));
      } catch (error) {
        this.errorMessage = 'No se pudo completar la accion. Intenta nuevamente.';
        return;
      } finally {
        this.isCreating = '';
      }

      if(!response || !response.success || !response.data || !response.data.public_url) {
        this.errorMessage = this.friendlyError(response);
        return;
      }

      this.whatsappRequest = this.sanitizeRequest(response.data);
      this.whatsappMessage = buildWhatsAppSignatureMessage({
        patientName: this.patientName,
        clinicName: this.businessName,
        expiresAt: this.formatDateTime(response.data.expires_at),
        publicUrl: response.data.public_url
      });

      const opened = this.openCreatedWhatsApp(true);
      this.successMessage = opened
        ? 'WhatsApp abierto con mensaje prellenado.'
        : 'Link creado. Captura un telefono para abrir WhatsApp o copia el mensaje.';
      await this.loadRequests(true);
      this.$emit('created', this.whatsappRequest);
    },
    createQrRequest: async function() {
      if(!this.ensureRemoteReady('qr')) {
        return;
      }
      this.errorMessage = '';
      this.successMessage = '';
      this.isCreating = 'qr';
      let response = null;
      try {
        response = await DADocumentService.createSignatureRequest(this.createRequestPayload('qr'));
      } catch (error) {
        this.errorMessage = 'No se pudo completar la accion. Intenta nuevamente.';
        return;
      } finally {
        this.isCreating = '';
      }

      if(!response || !response.success || !response.data || !response.data.public_url) {
        this.errorMessage = this.friendlyError(response);
        return;
      }

      this.activeQrRequest = this.sanitizeRequest(response.data, true);
      this.successMessage = 'QR generado. El paciente puede escanearlo desde su telefono.';
      await this.loadRequests(true);
      this.startPolling();
      this.$emit('created', this.sanitizeRequest(response.data));
    },
    sendEmailRequest: async function() {
      if(!this.ensureRemoteReady('email')) {
        return;
      }
      const email = this.normalizedRecipientEmail;

      this.errorMessage = '';
      this.successMessage = '';
      this.isCreating = 'email';
      let response = null;
      try {
        response = await DADocumentService.sendSignatureRequestEmail({
          id_patient_document: this.document.id_patient_document,
          signature_role: this.selectedRole,
          recipient_email: email
        });
      } catch (error) {
        this.errorMessage = 'No se pudo completar la accion. Intenta nuevamente.';
        return;
      } finally {
        this.isCreating = '';
      }

      if(!response || !response.success || !response.data || !response.data.email_sent) {
        this.errorMessage = this.friendlyError(response);
        return;
      }

      this.emailRequest = this.sanitizeRequest(response.data);
      this.successMessage = 'Correo enviado correctamente.';
      await this.loadRequests(true);
      this.$emit('created', this.emailRequest);
    },
    createRequestPayload: function(channel) {
      return {
        id_patient_document: this.document.id_patient_document,
        signature_role: this.selectedRole,
        channel,
        recipient_phone: channel === 'whatsapp' ? this.normalizedRecipientPhone || null : null,
        recipient_email: null,
        expires_in_minutes: null
      };
    },
    ensureRemoteReady: function(channel) {
      const reasons = {
        whatsapp: this.whatsappDisabledReason,
        qr: this.qrDisabledReason,
        email: this.emailDisabledReason
      };
      const reason = reasons[channel] || this.remoteDisabledReason;
      if(reason) {
        this.errorMessage = reason;
        this.successMessage = '';
        return false;
      }
      return true;
    },
    openCreatedWhatsApp: function(silent = false) {
      if(!this.whatsappMessage) {
        return false;
      }
      if(!this.isValidWhatsAppPhone(this.normalizedRecipientPhone)) {
        if(!silent) {
          this.errorMessage = 'Captura un telefono valido para abrir WhatsApp.';
        }
        return false;
      }
      const url = buildWhatsAppUrl({
        phone: this.normalizedRecipientPhone,
        text: this.whatsappMessage
      });
      if(!url) {
        if(!silent) {
          this.errorMessage = 'Captura un telefono valido para abrir WhatsApp.';
        }
        return false;
      }
      openWhatsAppUrl(url);
      if(!silent) {
        this.successMessage = 'WhatsApp abierto con mensaje prellenado.';
      }
      return true;
    },
    copyWhatsAppMessage: async function() {
      if(!this.whatsappMessage) {
        return;
      }
      const copied = await this.copyText(this.whatsappMessage);
      this.successMessage = copied ? 'Mensaje copiado.' : '';
      this.errorMessage = copied ? '' : 'No se pudo copiar el mensaje. Intenta nuevamente.';
    },
    revokeRequest: async function(request) {
      if(!request || !request.id_document_signature_request) {
        return;
      }
      if(!['pending', 'opened'].includes(String(request.status || '').toLowerCase())) {
        this.errorMessage = 'Esta solicitud de firma no se puede revocar.';
        return;
      }
      this.errorMessage = '';
      this.successMessage = '';
      this.revokeConfirmDialog = {
        show: true,
        request
      };
    },
    closeRevokeConfirmDialog: function() {
      if(this.revokingId) {
        return;
      }
      this.resetRevokeConfirmDialog();
    },
    resetRevokeConfirmDialog: function() {
      this.revokeConfirmDialog = {
        show: false,
        request: null
      };
    },
    confirmRevokeRequest: async function() {
      const request = this.revokeConfirmDialog.request;
      if(!request || !request.id_document_signature_request) {
        this.resetRevokeConfirmDialog();
        return;
      }
      this.errorMessage = '';
      this.successMessage = '';
      this.revokingId = request.id_document_signature_request;
      let response = null;
      try {
        response = await DADocumentService.revokeSignatureRequest({
          id_document_signature_request: request.id_document_signature_request,
          reason: 'Revocado desde Documentos y firmas.'
        });
      } catch (error) {
        this.errorMessage = 'No se pudo completar la accion. Intenta nuevamente.';
        return;
      } finally {
        this.revokingId = '';
        this.resetRevokeConfirmDialog();
      }

      if(response && response.success) {
        if(this.activeQrRequest.id_document_signature_request === request.id_document_signature_request) {
          this.activeQrRequest = {
            ...this.activeQrRequest,
            status: 'revoked',
            revoked_at: response.data && response.data.revoked_at ? response.data.revoked_at : new Date().toISOString()
          };
        }
        this.successMessage = 'Solicitud revocada.';
        await this.loadRequests(true);
        this.$emit('revoked', this.sanitizeRequest(response.data || request));
        return;
      }

      this.errorMessage = this.friendlyError(response);
    },
    syncActiveQrRequest: function() {
      if(!this.activeQrRequest.id_document_signature_request) {
        return;
      }
      const latest = this.requests.find((request) => (
        request.id_document_signature_request === this.activeQrRequest.id_document_signature_request
      ));
      if(latest) {
        this.activeQrRequest = {
          ...this.activeQrRequest,
          ...this.sanitizeRequest(latest),
          public_url: this.activeQrRequest.public_url
        };
      }
    },
    maybeEmitSignedRefresh: function() {
      const signedRequest = this.requests.find((request) => (
        request.id_document_signature_request &&
        String(request.status || '').toLowerCase() === 'signed' &&
        !this.signedRefreshRequestIds.includes(request.id_document_signature_request)
      ));
      if(!signedRequest) {
        return;
      }
      this.signedRefreshRequestIds.push(signedRequest.id_document_signature_request);
      this.$emit('refresh');
    },
    startPolling: function() {
      this.stopPolling();
      this.pollingTimer = window.setInterval(() => {
        this.loadRequests(true);
      }, 15000);
    },
    stopPolling: function() {
      if(this.pollingTimer) {
        window.clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
    },
    clearSensitiveState: function() {
      this.activeQrRequest = {};
      this.whatsappRequest = {};
      this.emailRequest = {};
      this.whatsappMessage = '';
      this.recipientPhone = '';
      this.recipientEmail = '';
      this.selectedRole = '';
      this.errorMessage = '';
      this.successMessage = '';
      this.requests = [];
      this.revokingId = '';
      this.isCreating = '';
      this.isLoadingRequests = false;
      this.resetRevokeConfirmDialog();
    },
    pendingRemoteRoles: function(document) {
      if(!document || !this.isFirmableStatus(document.status)) {
        return [];
      }
      const required = [];
      if(document.guardian_name_snapshot || document.requires_tutor_signature === 1) {
        required.push('TUTOR');
      } else if(document.requires_patient_signature !== 0) {
        required.push('PATIENT');
      }
      const completed = this.completedSignatureRoles(document);
      return required.filter((role) => !completed.includes(role));
    },
    completedSignatureRoles: function(document) {
      const signatures = Array.isArray(document.signatures) ? document.signatures : [];
      const roles = signatures
        .filter((signature) => Boolean(signature.signature_image || signature.signed_at))
        .map((signature) => signature.signature_role);
      return [...new Set(roles)];
    },
    isFirmableStatus: function(status) {
      return ['BORRADOR', 'PENDIENTE_FIRMA'].includes(status);
    },
    sanitizeRequest: function(request, keepPublicUrl = false) {
      if(!request || typeof request !== 'object') {
        return {};
      }
      const clean = { ...request };
      delete clean.token;
      delete clean.token_hash;
      delete clean.token_fingerprint;
      if(!keepPublicUrl) {
        delete clean.public_url;
      }
      return clean;
    },
    roleLabel: function(role) {
      const labels = {
        PATIENT: 'Paciente',
        TUTOR: 'Tutor o representante'
      };
      return labels[String(role || '').toUpperCase()] || 'Firmante';
    },
    typeLabel: function(type) {
      const labels = {
        SENSITIVE_DATA_CONSENT: 'Consentimiento de datos personales sensibles',
        TREATMENT_PLAN_CONSENT: 'Consentimiento del plan de tratamiento',
        GENERAL_ATTENTION_CONSENT: 'Consentimiento general de atencion',
        CUSTOM_DOCUMENT: 'Documento personalizado',
        CUSTOM: 'Documento personalizado'
      };
      return labels[type] || 'Documento clinico';
    },
    friendlyError: function(response) {
      const message = response && response.message ? String(response.message) : '';
      const lower = message.toLowerCase();
      if(lower.includes('permiso')) {
        return 'No tienes permiso para solicitar firma remota.';
      }
      if(lower.includes('no esta disponible') || lower.includes('no encontrado')) {
        return 'Este documento ya no esta disponible para firma remota.';
      }
      if(lower.includes('ya fue capturada') || lower.includes('no aplica') || lower.includes('rol')) {
        return 'La firma seleccionada ya no esta pendiente para este documento.';
      }
      if((response && response.status === 429) || lower.includes('demasiadas')) {
        return 'Demasiados intentos. Intenta mas tarde.';
      }
      if((response && response.code === 'SIGNATURE_EMAIL_SEND_FAILED') || lower.includes('correo')) {
        return message || 'No se pudo enviar el correo de firma. Verifica el email o intenta mas tarde.';
      }
      return message || 'No se pudo completar la accion. Intenta nuevamente.';
    },
    normalizedEmail: function(value) {
      return String(value || '').trim().toLowerCase();
    },
    isValidEmail: function(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) && String(value || '').length <= 255;
    },
    isValidWhatsAppPhone: function(value) {
      const digits = String(value || '').replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    copyText: async function(text) {
      try {
        if(navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch (error) {
        return false;
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
.signature-dialog-header {
  border-bottom: 1px solid #e3edeb;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.signature-dialog-header h3 {
  margin: 0;
  color: #123033;
  font-size: 21px;
  line-height: 1.25;
}

.signature-dialog-header span {
  display: block;
  color: #5f7478;
  font-size: 13px;
  margin-top: 3px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #1b6b6f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.signature-dialog-body {
  background: #f7faf9;
  padding: 18px 20px;
}

.signature-options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.option-card {
  border: 1px solid #dce8e6;
  border-radius: 8px;
  background: #ffffff;
  color: #183d41;
  min-height: 146px;
  padding: 14px;
  text-align: left;
  transition: border-color .18s ease, box-shadow .18s ease;
}

button.option-card:hover {
  border-color: #1ba6c9;
  box-shadow: 0 10px 26px rgba(13, 84, 104, .08);
}

.option-card.disabled {
  opacity: .72;
}

.option-card-panel {
  display: flex;
  flex-direction: column;
}

.option-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #1b6b6f;
  background: #e8f5f2;
  margin-bottom: 10px;
}

.option-card strong,
.option-card small {
  display: block;
}

.option-card strong {
  font-size: 16px;
  margin-bottom: 4px;
}

.option-card small {
  color: #607174;
  font-size: 13px;
  line-height: 1.35;
}

.remote-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.permission-note {
  margin: 10px 0 0;
  color: #9a6700;
  font-size: 12px;
  font-weight: 700;
}

.created-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  color: #027a48;
  font-size: 12px;
  font-weight: 800;
}

.option-actions,
.signature-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-actions {
  margin-top: 12px;
}

.signature-dialog-actions {
  border-top: 1px solid #e3edeb;
  justify-content: flex-end;
  padding: 13px 20px;
}

.dialog-btn {
  border: 1px solid #c9d9d7;
  background: #ffffff;
  color: #25484b;
  border-radius: 8px;
  padding: 9px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 800;
}

.dialog-btn.primary {
  border-color: #1b6b6f;
  background: #1b6b6f;
  color: #ffffff;
}

.dialog-btn.danger {
  border-color: #d92d20;
  background: #d92d20;
  color: #ffffff;
}

.dialog-btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.revoke-confirm-card {
  border-radius: 8px;
  overflow: hidden;
}

.confirm-dialog-header {
  border-bottom: 1px solid #e3edeb;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 18px 20px;
}

.confirm-dialog-header h4 {
  margin: 0;
  color: #123033;
  font-size: 19px;
  line-height: 1.25;
}

.confirm-icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #b42318;
  background: #fff1f0;
}

.confirm-dialog-body {
  color: #435d61;
  padding: 18px 20px 8px;
}

.confirm-dialog-body p {
  margin: 0;
  line-height: 1.45;
}

.confirm-dialog-actions {
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 18px;
}

@media (max-width: 820px) {
  .signature-options-grid {
    grid-template-columns: 1fr;
  }

  .remote-fields {
    grid-template-columns: 1fr;
  }
}
</style>
