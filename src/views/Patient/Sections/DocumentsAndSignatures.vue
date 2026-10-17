<template>
  <div class="patient-documents px-5 py-5">
    <da-loader v-bind:overlay="isLoading"></da-loader>

    <section class="documents-hero">
      <div>
        <p class="eyebrow">Documentos y firmas</p>
        <h3>Histórico del paciente</h3>
        <p>Consulta documentos creados, pendientes, firmados, cancelados o con negativa de firma.</p>
      </div>
      <button class="btn-primary btn-create tab-create-action" type="button" @click="openCreate">
        <v-icon size="17">mdi-plus</v-icon>
        Crear documento
      </button>
    </section>

    <section class="document-filters" v-if="documents.length > 0">
      <button
        v-for="filter in documentFilters"
        :key="filter.value"
        type="button"
        class="filter-chip"
        :class="{ active: documentFilter === filter.value }"
        @click="documentFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </section>

    <section class="documents-list">
      <article v-if="filteredDocuments.length === 0" class="empty-card">
        <v-icon size="34" color="var(--color-primary-500)">mdi-file-document-outline</v-icon>
        <h3>{{ documents.length === 0 ? 'Sin documentos' : 'Sin documentos en este filtro' }}</h3>
        <p>{{ documents.length === 0 ? 'Crea consentimiento general, datos sensibles o formatos propios del consultorio.' : 'Cambia el filtro para consultar otros documentos del historial.' }}</p>
      </article>

      <article
        v-for="item in filteredDocuments"
        :key="item.id_patient_document"
        :ref="'document-' + item.id_patient_document"
        class="document-card"
        :class="{ 'document-card--priority': isActionableDocument(item), 'document-card--focused': highlightedDocumentId === item.id_patient_document }"
      >
        <div class="document-main">
          <div class="title-row">
            <strong>{{ displayTitle(item) }}</strong>
            <span class="status-chip" :class="'status-' + item.status">{{ statusLabel(item.status) }}</span>
          </div>
          <div class="meta-row">
            <span>Tipo: {{ typeLabel(item.document_type) }}</span>
            <span>Origen: {{ originLabel(item.origin) }}</span>
          </div>
          <p v-if="item.doctor_name_snapshot" class="doctor-line">Doctor responsable: {{ item.doctor_name_snapshot }}</p>
          <p v-if="item.status === 'NO_FIRMADO_POR_NEGATIVA' && item.refusal_reason" class="refusal-line">
            Motivo de negativa: {{ item.refusal_reason }}
          </p>
          <div class="signature-summary">
            <span v-if="completedSignatureLabels(item).length > 0">Firmas completadas: {{ completedSignatureLabels(item).join(', ') }}</span>
            <span v-if="pendingSignatureLabels(item).length > 0">Firmas pendientes: {{ pendingSignatureLabels(item).join(', ') }}</span>
          </div>
          <div class="date-row">
            <span>Creado: {{ formatDateTime(item.created_at) }}</span>
            <span v-if="item.signed_at">Firmado: {{ formatDateTime(item.signed_at) }}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" type="button" @click="openView(item)">
            <v-icon size="17">mdi-eye-outline</v-icon>
            Ver
          </button>
          <button v-if="canPrint(item)" class="btn-outline" type="button" @click="printDocument(item)">
            <v-icon size="17">mdi-printer-outline</v-icon>
            Imprimir
          </button>
          <button v-if="canDownloadPdf(item)" class="btn-outline" type="button" @click="downloadPdf(item)">
            <v-icon size="17">mdi-file-pdf-box</v-icon>
            Descargar PDF
          </button>
          <button v-if="canSign(item)" class="btn-soft" type="button" @click="openSignatureOptions(item)">
            <v-icon size="17">mdi-draw-pen</v-icon>
            Firmar
          </button>
          <button v-if="canRegisterRefusal(item)" class="btn-outline danger" type="button" @click="openRefusal(item)">
            Registrar negativa
          </button>
          <button v-if="canCancel(item)" class="btn-outline danger" type="button" @click="cancelDocument(item)">
            Cancelar
          </button>
        </div>
      </article>
    </section>

    <v-dialog v-model="showCreateDialog" max-width="860">
      <v-card>
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Nuevo documento</p>
            <h3>Crear desde plantilla</h3>
          </div>
          <v-btn icon @click="showCreateDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <section class="step-card">
            <p class="step-title">1. Tipo de documento</p>
            <v-select
              v-model="createForm.id_document_template"
              :items="activeTemplates"
              item-text="name"
              item-value="id_document_template"
              label="Plantilla"
              dense
              outlined
              :color="themePrimaryColor"
            ></v-select>
            <div v-if="openDocumentWarning" class="soft-warning existing-document-callout">
              <strong>Documento en proceso</strong>
              <p>{{ openDocumentWarning }}</p>
              <div class="inline-actions">
                <button class="btn-outline" type="button" @click="openView(existingOpenDocument)">Ver documento existente</button>
                <button v-if="canSign(existingOpenDocument)" class="btn-soft" type="button" @click="openSignatureOptions(existingOpenDocument)">Continuar firma</button>
              </div>
            </div>
            <div v-if="sensitiveConsentWarning" class="soft-warning">
              <p>{{ sensitiveConsentWarning }}</p>
              <div class="inline-actions">
                <button class="btn-outline" type="button" @click="openView(existingSignedSensitiveConsent)">Ver documento firmado</button>
                <button class="btn-soft" type="button" @click="createForm.force_new_version = true">Generar nueva version</button>
              </div>
            </div>
          </section>

          <section class="step-card">
            <p class="step-title">2. Doctor responsable</p>
            <v-select
              v-model="createForm.responsible_doctor_user_id"
              :items="doctors"
              :item-text="doctorLabel"
              item-value="id_login"
              label="Doctor responsable"
              dense
              outlined
              clearable
              :disabled="Boolean(openDocumentWarning)"
              :color="themePrimaryColor"
            ></v-select>
            <p class="help-text">{{ doctorHelpText }}</p>
            <p v-if="selectedDoctor && !isDoctorProfileReady(selectedDoctor)" class="minor-warning">
              El doctor seleccionado no tiene perfil profesional completo para generar documentos clinicos.
            </p>
          </section>

          <section class="step-card">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="step-title">3. Firma de tutor o representante legal</p>
                <p class="help-text">Activa esta opcion cuando el paciente sea menor de edad o cuando otra persona autorizada firmara en su nombre.</p>
              </div>
              <v-checkbox
                v-if="!isMinor"
                v-model="createForm.use_guardian"
                label="Firmara un tutor o representante legal"
                :color="themePrimaryColor"
                :disabled="Boolean(openDocumentWarning)"
                hide-details
              ></v-checkbox>
            </div>
            <p v-if="isMinor" class="minor-warning">El paciente es menor de edad. La firma debe realizarla el tutor o representante legal.</p>
            <div v-if="showGuardianSection" class="form-grid">
              <v-text-field v-model="createForm.guardian_name" label="Nombre completo del tutor o representante legal" dense outlined :disabled="Boolean(openDocumentWarning)" :color="themePrimaryColor"></v-text-field>
              <v-text-field v-model="createForm.guardian_relationship" label="Parentesco o relacion" dense outlined :disabled="Boolean(openDocumentWarning)" :color="themePrimaryColor"></v-text-field>
              <v-textarea v-model="createForm.guardian_reason" label="Motivo de representacion, opcional" rows="2" outlined :disabled="Boolean(openDocumentWarning)" :color="themePrimaryColor"></v-textarea>
            </div>
          </section>

          <section class="step-card">
            <p class="step-title">4. {{ contextStepTitle }}</p>
            <v-textarea v-model="createForm.diagnosis" :label="contextLabel" rows="2" outlined :disabled="Boolean(openDocumentWarning)" :color="themePrimaryColor"></v-textarea>
            <p class="help-text">{{ contextHelpText }}</p>
          </section>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="showCreateDialog = false">Cancelar</button>
          <button v-if="!openDocumentWarning" class="btn-outline" type="button" @click="createDocument('draft')">Guardar borrador</button>
          <button v-if="!openDocumentWarning" class="btn-primary" type="button" @click="createDocument('sign')">Vista previa y firmar</button>
          <button v-if="openDocumentWarning" class="btn-primary" type="button" @click="openSignatureOptions(existingOpenDocument)">Continuar con el existente</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDocumentDialog" max-width="980">
      <v-card>
        <div class="dialog-header no-print">
          <div>
            <p class="eyebrow">{{ documentMode === 'sign' ? 'Firma digital' : 'Vista previa' }}</p>
            <h3>{{ selectedDocument ? displayTitle(selectedDocument) : '' }}</h3>
          </div>
          <v-btn icon @click="showDocumentDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body document-dialog-body">
          <section v-if="selectedDocument" class="print-sheet" ref="printSheet">
            <header class="sheet-header">
              <div>
                <p class="sheet-brand">{{ businessName }}</p>
                <h2>{{ displayTitle(selectedDocument) }}</h2>
                <span>Folio: {{ shortId(selectedDocument.id_patient_document) }}</span>
              </div>
              <span class="status-chip" :class="'status-' + selectedDocument.status">{{ statusLabel(selectedDocument.status) }}</span>
            </header>

            <section class="sheet-meta">
              <div><strong>Paciente</strong><span>{{ patientName }}</span></div>
              <div><strong>Edad</strong><span>{{ patientAge }}</span></div>
              <div><strong>Doctor responsable</strong><span>{{ selectedDocument.doctor_name_snapshot || '--' }}</span></div>
              <div><strong>Cédula profesional</strong><span>{{ selectedDocument.professional_license_snapshot || '--' }}</span></div>
              <div><strong>Creado</strong><span>{{ formatDateTime(selectedDocument.created_at) }}</span></div>
              <div><strong>Firmado</strong><span>{{ selectedDocument.signed_at ? formatDateTime(selectedDocument.signed_at) : '--' }}</span></div>
            </section>

            <section class="sheet-content" v-html="documentContentHtml(selectedDocument)"></section>

            <section v-if="selectedDocument.status === 'NO_FIRMADO_POR_NEGATIVA'" class="sheet-warning">
              <strong>Negativa de firma registrada</strong>
              <p>{{ selectedDocument.refusal_reason || 'Sin motivo capturado.' }}</p>
            </section>
            <section v-else-if="selectedDocument.status === 'FIRMADO'" class="sheet-success">
              <strong>Documento firmado</strong>
              <p>Las firmas requeridas quedaron capturadas en este documento.</p>
            </section>

            <section class="signature-progress">
              <p class="section-kicker">Estado de firmas</p>
              <div class="signature-progress-grid">
                <span
                  v-for="role in requiredSignatureRoles(selectedDocument)"
                  :key="role"
                  class="signature-progress-chip"
                  :class="{ complete: completedSignatureRoles(selectedDocument).includes(role), pending: !completedSignatureRoles(selectedDocument).includes(role) }"
                >
                  {{ signatureRoleLabel(role) }}: {{ completedSignatureRoles(selectedDocument).includes(role) ? 'Completada' : 'Pendiente' }}
                </span>
              </div>
            </section>

            <section class="signature-section">
              <article v-for="signature in visibleSignatures(selectedDocument)" :key="signature.signature_role + signature.signed_at" class="signature-card">
                <span>{{ signatureRoleLabel(signature.signature_role) }}</span>
                <img v-if="signature.signature_image" :src="signature.signature_image" alt="Firma">
                <p v-else class="empty-signature">Sin imagen de firma.</p>
                <strong>{{ signature.signer_name_snapshot || '--' }}</strong>
                <small v-if="signature.signed_at">{{ formatDateTime(signature.signed_at) }}</small>
              </article>
              <article v-if="selectedDocument.doctor_signature_snapshot" class="signature-card">
                <span>Doctor responsable</span>
                <img :src="selectedDocument.doctor_signature_snapshot" alt="Firma del doctor">
                <strong>{{ selectedDocument.doctor_name_snapshot || '--' }}</strong>
                <small v-if="selectedDocument.signed_at">{{ formatDateTime(selectedDocument.signed_at) }}</small>
              </article>
            </section>
          </section>

          <div v-if="documentMode === 'sign'" class="signature-box no-print">
            <template v-if="canCaptureSignatureForSelectedDocument">
              <p class="m-0 mb-1 font-semibold text-gray-700">{{ signatureCaptureTitle }}</p>
              <p class="help-text">{{ signatureCaptureHelp }}</p>
            </template>
            <template v-else>
              <p class="m-0 mb-1 font-semibold text-gray-700">No hay firma de paciente o tutor pendiente en esta vista.</p>
              <p class="help-text">Revisa las firmas pendientes en el estado del documento.</p>
            </template>
            <div v-if="canCaptureSignatureForSelectedDocument && currentSignRole === 'TUTOR'" class="form-grid mt-3">
              <v-text-field v-model="signForm.guardian_name" label="Nombre completo del tutor o representante legal" dense outlined :color="themePrimaryColor"></v-text-field>
              <v-text-field v-model="signForm.guardian_relationship" label="Parentesco o relacion" dense outlined :color="themePrimaryColor"></v-text-field>
            </div>
            <da-signature-pad
              v-if="signaturePadReady && canCaptureSignatureForSelectedDocument"
              :key="signaturePadKey"
              required
              class="document-signature-pad"
              v-on:signed="onSigned"
            ></da-signature-pad>
            <div v-else-if="canCaptureSignatureForSelectedDocument" class="signature-loading">Preparando area de firma...</div>
          </div>
        </v-card-text>
        <v-card-actions class="dialog-actions no-print">
          <button class="btn-outline" type="button" @click="showDocumentDialog = false">{{ documentMode === 'sign' ? 'Cancelar' : 'Cerrar' }}</button>
          <button class="btn-outline" type="button" @click="printDocument(selectedDocument)">Imprimir</button>
          <button v-if="canDownloadPdf(selectedDocument)" class="btn-outline" type="button" @click="downloadPdf(selectedDocument)">Descargar PDF</button>
          <button v-if="documentMode === 'sign' && canCaptureSignatureForSelectedDocument" class="btn-primary" type="button" @click="signDocument">Guardar firma y finalizar documento</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showRefusalDialog" max-width="620">
      <v-card>
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Negativa</p>
            <h3>Registrar negativa de firma</h3>
          </div>
          <v-btn icon @click="showRefusalDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <p class="help-text">
            Usa esta opcion cuando el paciente, tutor o representante legal no acepta firmar el documento. El documento quedara registrado como no firmado por negativa y se conservara en el historial.
          </p>
          <v-textarea
            v-model="refusalReason"
            label="Motivo de la negativa"
            placeholder="Ejemplo: el paciente desea revisar el documento antes de firmar."
            rows="3"
            outlined
            :color="themePrimaryColor"
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="showRefusalDialog = false">Cancelar</button>
          <button class="btn-outline danger" type="button" @click="registerRefusal">Registrar negativa</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="cancelConfirmDialog.show" max-width="540" persistent>
      <v-card>
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Confirmar cancelacion</p>
            <h3>Cancelar documento</h3>
          </div>
          <v-btn icon :disabled="isLoading" @click="closeCancelConfirmDialog"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <p class="help-text">
            El documento quedara cancelado y se conservara en el historial del paciente. Esta accion no se puede deshacer.
          </p>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" :disabled="isLoading" @click="closeCancelConfirmDialog">Cancelar</button>
          <button class="btn-outline danger" type="button" :disabled="isLoading" @click="confirmCancelDocument">
            <v-progress-circular v-if="isLoading" indeterminate size="16" width="2" color="#C81E1E"></v-progress-circular>
            <v-icon v-else size="16">mdi-file-cancel-outline</v-icon>
            Cancelar documento
          </button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <document-signature-options-dialog
      v-model="showSignatureOptionsDialog"
      :document="signatureOptionsDocument || {}"
      :patient="px && px.person ? px.person : {}"
      :business-name="businessName"
      :can-request-remote-signature="canRequestRemoteSignature"
      @sign-local="openLocalSignatureFromOptions"
      @refresh="refreshDocumentsForSignatureOptions"
    ></document-signature-options-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import VuexMixin from '../../../mixins/VuexMixin';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DADocumentService, DAPrescriptionService } from '../../../services/context/core-proccess-context';
import { isD2AuthMode } from '../../../services/config/authTransport.config';
import DocumentSignatureOptionsDialog from './components/DocumentSignatureOptionsDialog.vue';
import { sanitizeHtmlForDocumentSnapshot, safeDocumentImageSource } from '../../../utils/sanitizeHtml';

export default {
  mixins: [VuexMixin],
  components: {
    DocumentSignatureOptionsDialog
  },
  props: {
    px: {
      type: Object,
      default: function(){ return {}; }
    },
    documentFocusRequest: {
      type: Object,
      default: null
    }
  },
  data: function() {
    return {
      isLoading: false,
      documents: [],
      documentsLoaded: false,
      handledDocumentFocusRequest: null,
      documentFocusAlive: true,
      documentHighlightTimer: null,
      templates: [],
      doctors: [],
      showCreateDialog: false,
      showDocumentDialog: false,
      showRefusalDialog: false,
      showSignatureOptionsDialog: false,
      documentMode: 'view',
      documentFilter: 'ALL',
      documentFilters: [
        { value: 'ALL', label: 'Todos' },
        { value: 'PENDING', label: 'Pendientes' },
        { value: 'SIGNED', label: 'Firmados' },
        { value: 'REFUSAL', label: 'Negativas' },
        { value: 'CANCELLED', label: 'Cancelados' }
      ],
      selectedDocument: null,
      signatureOptionsDocument: null,
      highlightedDocumentId: null,
      refusalDocument: null,
      refusalReason: '',
      cancelConfirmDialog: {
        show: false,
        document: null
      },
      patientSignature: '',
      signaturePadReady: false,
      signaturePadKey: 0,
      createForm: this.emptyCreateForm(),
      signForm: {
        use_guardian: false,
        guardian_name: '',
        guardian_relationship: ''
      }
    };
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, {
      hasPermission: fnTypes.hasPermission,
      authUser: fnTypes.getUser,
      authRole: fnTypes.getRole,
      authBusiness: fnTypes.getBusiness
    }),
    patientId: function() {
      return this.px && this.px.person ? this.px.person.id_person : '';
    },
    patientName: function() {
      const person = this.px && this.px.person ? this.px.person : {};
      return person.fullname || `${person.name || ''} ${person.surname || ''}`.trim() || '--';
    },
    patientAge: function() {
      const age = this.px && this.px.person ? this.px.person.age : '';
      return age === null || age === undefined || age === '' ? '--' : `${age} años`;
    },
    isMinor: function() {
      const age = Number(this.px && this.px.person ? this.px.person.age : 0);
      return age > 0 && age < 18;
    },
    showGuardianSection: function() {
      return this.isMinor || this.createForm.use_guardian;
    },
    selectedTemplate: function() {
      return this.templates.find((item) => item.id_document_template === this.createForm.id_document_template) || null;
    },
    selectedDoctor: function() {
      return this.doctors.find((doctor) => doctor.id_login === this.createForm.responsible_doctor_user_id) || null;
    },
    existingSignedSensitiveConsent: function() {
      return this.documents.find((item) => item.document_type === 'SENSITIVE_DATA_CONSENT' && item.status === 'FIRMADO' && item.active !== 0) || null;
    },
    existingOpenDocument: function() {
      if(!this.selectedTemplate) {
        return null;
      }
      return this.asArray(this.documents).find((item) => (
        item.id_document_template === this.selectedTemplate.id_document_template &&
        ['BORRADOR', 'PENDIENTE_FIRMA'].includes(item.status) &&
        item.active !== 0
      )) || null;
    },
    openDocumentWarning: function() {
      if(!this.existingOpenDocument) {
        return '';
      }
      return 'Ya existe un borrador o documento pendiente de firma de este formato. Continua con el documento existente.';
    },
    sensitiveConsentWarning: function() {
      if(!this.selectedTemplate || this.selectedTemplate.template_type !== 'SENSITIVE_DATA_CONSENT') {
        return '';
      }
      if(!this.existingSignedSensitiveConsent || this.createForm.force_new_version) {
        return '';
      }
      return 'Este paciente ya tiene un consentimiento de datos personales sensibles firmado.';
    },
    contextStepTitle: function() {
      return this.selectedTemplate && this.selectedTemplate.template_type === 'SENSITIVE_DATA_CONSENT'
        ? 'Observaciones internas'
        : 'Contexto del documento';
    },
    contextLabel: function() {
      const type = this.selectedTemplate ? this.selectedTemplate.template_type : '';
      if(type === 'GENERAL_ATTENTION_CONSENT') {
        return 'Observaciones o contexto de atencion';
      }
      if(type === 'SENSITIVE_DATA_CONSENT') {
        return 'Observaciones internas, opcional';
      }
      return 'Contexto del documento';
    },
    contextHelpText: function() {
      return 'Este texto puede usarse dentro del documento si la plantilla incluye el dato automatico correspondiente.';
    },
    requiresGuardianSignature: function() {
      return this.isMinor || (this.selectedDocument && this.selectedDocument.guardian_name_snapshot);
    },
    currentSignRole: function() {
      if(!this.selectedDocument) {
        return '';
      }
      const pending = this.pendingSignatureRoles(this.selectedDocument);
      if(pending.includes('TUTOR')) {
        return 'TUTOR';
      }
      if(pending.includes('PATIENT')) {
        return 'PATIENT';
      }
      return pending[0] || '';
    },
    canCaptureSignatureForSelectedDocument: function() {
      return ['PATIENT', 'TUTOR'].includes(this.currentSignRole);
    },
    signatureCaptureTitle: function() {
      return this.currentSignRole === 'TUTOR' ? 'Firma del tutor o representante legal' : 'Firma del paciente';
    },
    signatureCaptureHelp: function() {
      if(this.currentSignRole === 'TUTOR') {
        return 'Captura y aplica la firma del tutor o representante legal. Despues usa el boton final para guardar el documento.';
      }
      return 'Captura y aplica la firma del paciente. El boton Aplicar solo coloca la firma visualmente; despues guarda para finalizar.';
    },
    activeTemplates: function() {
      return this.asArray(this.templates).filter((item) => item.is_active !== 0);
    },
    sortedDocuments: function() {
      const priority = {
        BORRADOR: 0,
        PENDIENTE_FIRMA: 0,
        NO_FIRMADO_POR_NEGATIVA: 1,
        FIRMADO: 2,
        CANCELADO: 3,
        REVOCADO: 3,
        REEMPLAZADO: 3
      };
      return this.asArray(this.documents).slice().sort((a, b) => {
        const first = priority[a.status] === undefined ? 2 : priority[a.status];
        const second = priority[b.status] === undefined ? 2 : priority[b.status];
        if(first !== second) {
          return first - second;
        }
        return this.documentTimestamp(b) - this.documentTimestamp(a);
      });
    },
    filteredDocuments: function() {
      if(this.documentFilter === 'PENDING') {
        return this.sortedDocuments.filter((item) => ['BORRADOR', 'PENDIENTE_FIRMA'].includes(item.status));
      }
      if(this.documentFilter === 'SIGNED') {
        return this.sortedDocuments.filter((item) => item.status === 'FIRMADO');
      }
      if(this.documentFilter === 'REFUSAL') {
        return this.sortedDocuments.filter((item) => item.status === 'NO_FIRMADO_POR_NEGATIVA');
      }
      if(this.documentFilter === 'CANCELLED') {
        return this.sortedDocuments.filter((item) => ['CANCELADO', 'REVOCADO', 'REEMPLAZADO'].includes(item.status));
      }
      return this.sortedDocuments;
    },
    currentUser: function() {
      if(isD2AuthMode()) {
        return {
          ...(this.authUser || {}),
          rol: this.authRole || (this.authUser && this.authUser.rol) || null
        };
      }

      const token = this.$session ? this.$session.get('token') : '';
      if(!token) {
        return {};
      }
      try {
        const payload = token.split('.')[1] || '';
        return JSON.parse(decodeURIComponent(escape(window.atob(payload.replace(/-/g, '+').replace(/_/g, '/')))));
      } catch (error) {
        return {};
      }
    },
    currentDoctor: function() {
      const candidate = this.doctors.find((doctor) => doctor.id_login === this.currentUser.id_login) || null;
      return candidate && this.isDoctorProfileReady(candidate) ? candidate : null;
    },
    businessName: function() {
      if(isD2AuthMode()) {
        const business = this.authBusiness || {};
        return business.name || business.legalName || 'Consultorio';
      }

      const business = this.$session ? this.$session.get('business') : null;
      return business && business.name ? business.name : 'Consultorio';
    },
    canRequestRemoteSignature: function() {
      const role = String(this.currentUser.rol || this.currentUser.role || '').toLowerCase();
      if(role === 'super_admin') {
        return false;
      }
      return typeof this.hasPermission === 'function' && this.hasPermission('documents.signature.request');
    },
    doctorHelpText: function() {
      const role = this.currentUser.rol || '';
      if(['assistant', 'receptionist', 'reception', 'ASSISTANT', 'RECEPTIONIST'].includes(role)) {
        return 'Selecciona el doctor que sera responsable del documento.';
      }
      return 'El documento se generara con los datos profesionales de este doctor.';
    },
    themePrimaryColor: function() {
      return 'var(--color-primary-500)';
    }
  },
  watch: {
    patientId: {
      immediate: true,
      handler: function(value) {
        if(value) {
          this.load();
        }
      }
    },
    documentFocusRequest: {
      handler: function(value) {
        if(value) {
          this.$nextTick(() => this.focusRequestedDocument(value));
        }
      },
      deep: false
    },
    documents: function() {
      if(this.documentFocusRequest) {
        this.$nextTick(() => this.focusRequestedDocument(this.documentFocusRequest));
      }
    }
  },
  beforeDestroy() {
    this.documentFocusAlive = false;
    if(this.documentHighlightTimer) window.clearTimeout(this.documentHighlightTimer);
  },
  methods: {
    emptyCreateForm: function() {
      return {
        id_document_template: '',
        responsible_doctor_user_id: '',
        use_guardian: false,
        guardian_name: '',
        guardian_relationship: '',
        guardian_reason: '',
        diagnosis: '',
        force_new_version: false
      };
    },
    load: async function() {
      this.isLoading = true;
      this.documentsLoaded = false;
      try {
        const docs = await DADocumentService.getPatientDocuments(this.patientId);
        const templates = await DADocumentService.getTemplates();
        const doctors = await DAPrescriptionService.doctors();
        this.documents = docs && docs.success ? this.asArray(docs.data) : [];
        this.documentsLoaded = Boolean(docs && docs.success);
        this.templates = templates && templates.success ? this.asArray(templates.data) : [];
        this.doctors = doctors && doctors.success ? this.asArray(doctors.data) : [];
      } catch (error) {
        this.documentsLoaded = false;
        this.documents = [];
        this.templates = [];
        this.doctors = [];
        this.notify('error', 'No se pudo cargar Documentos y firmas.');
      } finally {
        this.isLoading = false;
      }
    },
    openCreate: function() {
      this.createForm = this.emptyCreateForm();
      this.createForm.id_document_template = this.activeTemplates[0] ? this.activeTemplates[0].id_document_template : '';
      this.createForm.use_guardian = this.isMinor;
      this.createForm.responsible_doctor_user_id = this.currentDoctor ? this.currentDoctor.id_login : '';
      this.showCreateDialog = true;
    },
    validateCreateForm: function(mode) {
      if(!this.createForm.id_document_template) {
        this.notify('warning', 'Selecciona una plantilla.');
        return false;
      }
      if(this.sensitiveConsentWarning) {
        this.notify('warning', 'Este paciente ya tiene un consentimiento de datos personales sensibles firmado.');
        return false;
      }
      if(this.openDocumentWarning) {
        this.notify('warning', 'Ya existe un borrador o documento pendiente de firma de este formato.');
        return false;
      }
      if(!this.createForm.responsible_doctor_user_id) {
        this.notify('warning', 'Selecciona el doctor responsable.');
        return false;
      }
      if(!this.selectedDoctor || !this.isDoctorProfileReady(this.selectedDoctor)) {
        this.notify('warning', 'El doctor responsable necesita perfil profesional completo.');
        return false;
      }
      if(mode === 'sign' && !this.canDoctorSignDocuments(this.selectedDoctor)) {
        this.notify('warning', 'Para continuar a firma, el doctor debe tener firma profesional y permiso para firmar documentos.');
        return false;
      }
      if(this.showGuardianSection && (!this.createForm.guardian_name || !this.createForm.guardian_relationship)) {
        this.notify('warning', 'Captura nombre y parentesco del tutor o representante legal.');
        return false;
      }
      return true;
    },
    createDocument: async function(mode = 'draft') {
      if(!this.validateCreateForm(mode)) {
        return;
      }
      const previousIds = this.documents.map((item) => item.id_patient_document);
      this.isLoading = true;
      const response = await DADocumentService.createDocument({
        id_person: this.patientId,
        origin: 'DOCUMENT_CENTER',
        ...this.createForm
      });
      this.isLoading = false;
      if(response && response.success) {
        this.documents = response.data || [];
        this.showCreateDialog = false;
        const createdDocument = this.findCreatedDocument(previousIds);
        if(mode === 'sign' && createdDocument) {
          this.notify('success', 'Documento creado. Revisa y firma.');
          this.openSignatureOptions(createdDocument);
          return;
        }
        this.notify('success', 'Documento creado como borrador.');
      } else {
        this.notify('error', response && response.message ? response.message : 'No se pudo crear documento.');
      }
    },
    openView: async function(item) {
      this.selectedDocument = item;
      this.documentMode = 'view';
      this.showDocumentDialog = true;
      DADocumentService.auditAction({ id_patient_document: item.id_patient_document, event_type: 'VIEWED' });
    },
    focusRequestedDocument: function(request) {
      if(!request || !this.documentFocusAlive || !this.documentsLoaded || request === this.handledDocumentFocusRequest
          || request.id_person && request.id_person !== this.patientId) {
        return;
      }
      const requestedDocument = this.findRequestedDocument(request);
      // Consume before queued DOM work so reloads/remounts cannot replay a completed request.
      this.handledDocumentFocusRequest = request;
      this.$emit('document-focus-consumed', request);
      if(!requestedDocument) {
        this.documentFilter = 'ALL';
        this.notify('warning', 'No se encontró el consentimiento solicitado en Documentos y firmas.');
        return;
      }
      this.documentFilter = this.filterForDocument(requestedDocument);
      this.highlightedDocumentId = requestedDocument.id_patient_document;
      this.$nextTick(() => {
        if(!this.documentFocusAlive || this.handledDocumentFocusRequest !== request || request.id_person && request.id_person !== this.patientId) return;
        const ref = this.$refs[`document-${requestedDocument.id_patient_document}`];
        const element = Array.isArray(ref) ? ref[0] : ref;
        if(element && typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if(request.open !== false) {
          this.openView(requestedDocument);
        }
        if(this.documentHighlightTimer) window.clearTimeout(this.documentHighlightTimer);
        this.documentHighlightTimer = window.setTimeout(() => {
          if(this.highlightedDocumentId === requestedDocument.id_patient_document) {
            this.highlightedDocumentId = null;
          }
        }, 3800);
      });
    },
    findRequestedDocument: function(request) {
      return this.documents.find((item) => (
        request.id_patient_document && item.id_patient_document === request.id_patient_document
      )) || this.documents.find((item) => (
        request.document_type && item.document_type === request.document_type && item.active !== 0
      )) || null;
    },
    filterForDocument: function(item) {
      if(['BORRADOR', 'PENDIENTE_FIRMA'].includes(item.status)) {
        return 'PENDING';
      }
      if(item.status === 'FIRMADO') {
        return 'SIGNED';
      }
      if(item.status === 'NO_FIRMADO_POR_NEGATIVA') {
        return 'REFUSAL';
      }
      if(['CANCELADO', 'REVOCADO', 'REEMPLAZADO'].includes(item.status)) {
        return 'CANCELLED';
      }
      return 'ALL';
    },
    openSign: function(item) {
      if(!this.canSign(item)) {
        this.notify('warning', 'Este documento no esta disponible para firma.');
        return;
      }
      this.selectedDocument = item;
      this.documentMode = 'sign';
      this.patientSignature = '';
      this.signaturePadReady = false;
      this.signaturePadKey += 1;
      this.signForm = {
        use_guardian: this.isMinor || Boolean(item.guardian_name_snapshot),
        guardian_name: item.guardian_name_snapshot || '',
        guardian_relationship: item.guardian_relationship_snapshot || ''
      };
      this.showDocumentDialog = true;
      this.$nextTick(() => {
        window.setTimeout(() => {
          this.signaturePadReady = true;
        }, 180);
      });
    },
    openSignatureOptions: function(item) {
      if(!this.canSign(item)) {
        this.notify('warning', 'Este documento no esta disponible para firma.');
        return;
      }
      this.signatureOptionsDocument = item;
      this.showSignatureOptionsDialog = true;
    },
    openLocalSignatureFromOptions: function(item) {
      const target = item && item.id_patient_document ? item : this.signatureOptionsDocument;
      this.showSignatureOptionsDialog = false;
      this.signatureOptionsDocument = null;
      this.openSign(target);
    },
    refreshDocumentsForSignatureOptions: async function() {
      const activeId = this.signatureOptionsDocument ? this.signatureOptionsDocument.id_patient_document : '';
      await this.load();
      if(activeId) {
        this.signatureOptionsDocument = this.documents.find((item) => item.id_patient_document === activeId) || this.signatureOptionsDocument;
      }
    },
    openRefusal: function(item) {
      if(!this.canRegisterRefusal(item)) {
        this.notify('warning', 'No se puede registrar negativa en este documento.');
        return;
      }
      this.refusalDocument = item;
      this.refusalReason = '';
      this.showRefusalDialog = true;
    },
    onSigned: function(signature) {
      this.patientSignature = signature;
      this.notify('success', 'Firma aplicada. Ahora guarda para finalizar.');
    },
    signDocument: async function() {
      if(!this.selectedDocument || !this.canSign(this.selectedDocument)) {
        this.notify('warning', 'Este documento no esta disponible para firma.');
        return;
      }
      if(!this.canCaptureSignatureForSelectedDocument) {
        this.notify('warning', 'No hay firma de paciente o tutor pendiente en esta vista.');
        return;
      }
      if(!this.patientSignature) {
        this.notify('warning', 'Captura y aplica la firma antes de guardar.');
        return;
      }
      const usesGuardian = this.currentSignRole === 'TUTOR';
      if(usesGuardian && (!this.signForm.guardian_name || !this.signForm.guardian_relationship)) {
        this.notify('warning', 'Captura nombre y parentesco del representante.');
        return;
      }
      this.isLoading = true;
      const signerName = usesGuardian ? this.signForm.guardian_name : this.patientName;
      const response = await DADocumentService.signDocument({
        id_patient_document: this.selectedDocument.id_patient_document,
        patient_signature: this.patientSignature,
        signer_name: signerName,
        signature_role: this.currentSignRole,
        responsible_doctor_user_id: this.selectedDocument.responsible_doctor_user_id
      });
      this.isLoading = false;
      if(response && response.success) {
        this.documents = response.data || [];
        this.selectedDocument = this.documents.find((item) => item.id_patient_document === this.selectedDocument.id_patient_document) || this.selectedDocument;
        this.documentMode = this.selectedDocument.status === 'FIRMADO' ? 'view' : this.documentMode;
        this.patientSignature = '';
        this.signaturePadReady = false;
        this.signaturePadKey += 1;
        this.notify('success', this.selectedDocument.status === 'FIRMADO' ? 'Documento firmado.' : 'Firma guardada. Quedan firmas pendientes.');
      } else {
        this.notify('error', response && response.message ? response.message : 'No se pudo firmar documento.');
      }
    },
    registerRefusal: async function() {
      if(!this.refusalDocument) {
        return;
      }
      if(!this.canRegisterRefusal(this.refusalDocument)) {
        this.notify('warning', 'No se puede registrar negativa en este documento.');
        return;
      }
      if(!this.refusalReason || this.refusalReason.trim().length < 5) {
        this.notify('warning', 'Captura un motivo de al menos 5 caracteres.');
        return;
      }
      this.isLoading = true;
      const response = await DADocumentService.registerRefusal({
        id_patient_document: this.refusalDocument.id_patient_document,
        refusal_reason: this.refusalReason.trim()
      });
      this.isLoading = false;
      if(response && response.success) {
        this.documents = response.data || [];
        this.showRefusalDialog = false;
        this.notify('success', 'Negativa de firma registrada.');
      } else {
        this.notify('error', response && response.message ? response.message : 'No se pudo registrar negativa.');
      }
    },
    cancelDocument: async function(item) {
      if(!this.canCancel(item)) {
        return;
      }
      this.cancelConfirmDialog = {
        show: true,
        document: item
      };
    },
    closeCancelConfirmDialog: function() {
      if(this.isLoading) {
        return;
      }
      this.resetCancelConfirmDialog();
    },
    resetCancelConfirmDialog: function() {
      this.cancelConfirmDialog = {
        show: false,
        document: null
      };
    },
    confirmCancelDocument: async function() {
      const item = this.cancelConfirmDialog.document;
      if(!item || !this.canCancel(item)) {
        this.resetCancelConfirmDialog();
        return;
      }
      this.isLoading = true;
      const response = await DADocumentService.cancelDocument({
        id_patient_document: item.id_patient_document,
        reason: 'Cancelado desde Documentos y firmas.'
      });
      this.isLoading = false;
      this.resetCancelConfirmDialog();
      if(response && response.success) {
        this.documents = response.data || [];
        this.notify('success', 'Documento cancelado.');
      } else {
        this.notify('error', response && response.message ? response.message : 'No se pudo cancelar documento.');
      }
    },
    notify: function(type, message) {
      if(typeof this.toastFunction === 'function') {
        this.toastFunction(type, message);
        return;
      }
      if(this.$toast && typeof this.$toast[type] === 'function') {
        this.$toast[type](message);
      }
    },
    asArray: function(value) {
      return Array.isArray(value) ? value : [];
    },
    printDocument: function(item) {
      if(!item) {
        return;
      }
      const html = this.printableHtml(item);
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      document.body.appendChild(frame);
      frame.contentDocument.open();
      frame.contentDocument.write(html);
      frame.contentDocument.close();
      DADocumentService.auditAction({ id_patient_document: item.id_patient_document, event_type: 'PRINTED' });
      frame.onload = function() {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(function() {
          document.body.removeChild(frame);
        }, 500);
      };
    },
    printableHtml: function(item) {
      const signatures = this.visibleSignatures(item).map((signature) => `
        <article class="signature-card">
          <span>${this.escapeHtml(this.signatureRoleLabel(signature.signature_role))}</span>
          ${signature.signature_image ? `<img src="${this.escapeHtml(safeDocumentImageSource(signature.signature_image))}" alt="Firma">` : '<p>Sin imagen de firma.</p>'}
          <strong>${this.escapeHtml(signature.signer_name_snapshot || '--')}</strong>
          <small>${signature.signed_at ? this.escapeHtml(this.formatDateTime(signature.signed_at)) : ''}</small>
        </article>
      `).join('');
      const doctorSignature = item.doctor_signature_snapshot ? `
        <article class="signature-card">
          <span>Doctor responsable</span>
          <img src="${this.escapeHtml(safeDocumentImageSource(item.doctor_signature_snapshot))}" alt="Firma del doctor">
          <strong>${this.escapeHtml(item.doctor_name_snapshot || '--')}</strong>
          <small>${item.signed_at ? this.escapeHtml(this.formatDateTime(item.signed_at)) : ''}</small>
        </article>
      ` : '';
      const warning = item.status === 'NO_FIRMADO_POR_NEGATIVA'
        ? `<section class="warning danger"><strong>No firmado por negativa</strong><p>${this.escapeHtml(item.refusal_reason || 'Sin motivo capturado.')}</p></section>`
        : item.status !== 'FIRMADO'
          ? `<section class="warning"><strong>${this.escapeHtml(this.pendingSignatureTitle(item))}</strong><p>${this.escapeHtml(this.pendingSignatureMessage(item))}</p></section>`
          : '';

      return `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${this.escapeHtml(this.displayTitle(item))}</title>
            <style>
              @page { margin: 18mm; }
              * { box-sizing: border-box; }
              body { margin: 0; background: #fff; color: #1f2a44; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; }
              .sheet { width: 100%; }
              .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d8e9ef; padding-bottom: 14px; margin-bottom: 16px; break-inside: avoid; }
              .brand { margin: 0 0 4px; color: #00728c; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
              h1 { margin: 0 0 6px; font-size: 20px; }
              .status { border: 1px solid #b8edf7; padding: 4px 8px; font-weight: 800; height: max-content; }
              .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 18px; border: 1px solid #d8e9ef; padding: 12px; margin-bottom: 18px; break-inside: avoid; }
              .meta strong { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
              .content { margin-bottom: 22px; font-size: 13px; }
              .warning { border: 1px solid #fbbf24; background: #fffbeb; padding: 10px; margin-bottom: 16px; break-inside: avoid; }
              .warning.danger { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
              .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; break-inside: avoid; }
              .signature-card { border-top: 1px solid #1f2a44; padding-top: 8px; min-height: 120px; break-inside: avoid; }
              .signature-card span { display: block; color: #64748b; font-weight: 800; margin-bottom: 6px; }
              .signature-card img { display: block; max-width: 220px; max-height: 90px; object-fit: contain; margin: 0 auto 8px; }
              .signature-card strong, .signature-card small { display: block; text-align: center; }
            </style>
          </head>
          <body>
            <main class="sheet">
              <header class="header">
                <div>
                  <p class="brand">${this.escapeHtml(this.businessName)}</p>
                  <h1>${this.escapeHtml(this.displayTitle(item))}</h1>
                  <span>Folio: ${this.escapeHtml(this.shortId(item.id_patient_document))}</span>
                </div>
                <span class="status">${this.escapeHtml(this.statusLabel(item.status))}</span>
              </header>
              <section class="meta">
                <div><strong>Paciente</strong><span>${this.escapeHtml(this.patientName)}</span></div>
                <div><strong>Edad</strong><span>${this.escapeHtml(this.patientAge)}</span></div>
                <div><strong>Doctor responsable</strong><span>${this.escapeHtml(item.doctor_name_snapshot || '--')}</span></div>
                <div><strong>Cédula profesional</strong><span>${this.escapeHtml(item.professional_license_snapshot || '--')}</span></div>
                <div><strong>Creado</strong><span>${this.escapeHtml(this.formatDateTime(item.created_at))}</span></div>
                <div><strong>Firmado</strong><span>${item.signed_at ? this.escapeHtml(this.formatDateTime(item.signed_at)) : '--'}</span></div>
              </section>
              <section class="content">${this.documentContentHtml(item)}</section>
              ${warning}
              <section class="signatures">${signatures}${doctorSignature}</section>
            </main>
          </body>
        </html>
      `;
    },
    documentContentHtml: function(item) {
      return sanitizeHtmlForDocumentSnapshot(item && (item.signed_content_html_snapshot || item.content_html_snapshot) || '');
    },
    canSign: function(item) {
      if(!item) {
        return false;
      }
      return ['BORRADOR', 'PENDIENTE_FIRMA'].includes(item.status);
    },
    canRegisterRefusal: function(item) {
      if(!item) {
        return false;
      }
      return ['BORRADOR', 'PENDIENTE_FIRMA'].includes(item.status);
    },
    canCancel: function(item) {
      if(!item) {
        return false;
      }
      return ['BORRADOR', 'PENDIENTE_FIRMA'].includes(item.status);
    },
    canPrint: function(item) {
      if(!item) {
        return false;
      }
      return ['BORRADOR', 'PENDIENTE_FIRMA', 'FIRMADO', 'NO_FIRMADO_POR_NEGATIVA'].includes(item.status);
    },
    canDownloadPdf: function(item) {
      return item && item.status === 'FIRMADO' && Boolean(item.pdf_url);
    },
    downloadPdf: function(item) {
      if(item && item.pdf_url) {
        window.open(item.pdf_url, '_blank');
      }
    },
    isActionableDocument: function(item) {
      if(!item) {
        return false;
      }
      return ['BORRADOR', 'PENDIENTE_FIRMA'].includes(item.status);
    },
    documentTimestamp: function(item) {
      const raw = item.updated_at || item.created_at || item.signed_at;
      const value = new Date(raw);
      return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    },
    findCreatedDocument: function(previousIds) {
      const previous = new Set(previousIds || []);
      return this.sortedDocuments.find((item) => !previous.has(item.id_patient_document)) || null;
    },
    isDoctorProfileReady: function(doctor) {
      return Boolean(
        doctor &&
        doctor.id_doctor_professional_profile &&
        doctor.professional_profile_active !== 0 &&
        doctor.professional_name &&
        doctor.professional_license
      );
    },
    canDoctorSignDocuments: function(doctor) {
      return Boolean(
        this.isDoctorProfileReady(doctor) &&
        doctor.can_sign_documents === 1 &&
        doctor.signature_image
      );
    },
    requiredSignatureRoles: function(item) {
      const roles = [];
      if(item.guardian_name_snapshot || item.requires_tutor_signature === 1) {
        roles.push('TUTOR');
      } else if(item.requires_patient_signature !== 0) {
        roles.push('PATIENT');
      }
      if(item.requires_doctor_signature !== 0) {
        roles.push('DOCTOR');
      }
      if(item.requires_witness1_signature === 1) {
        roles.push('WITNESS1');
      }
      if(item.requires_witness2_signature === 1) {
        roles.push('WITNESS2');
      }
      return roles;
    },
    completedSignatureRoles: function(item) {
      const roles = this.visibleSignatures(item)
        .filter((signature) => Boolean(signature.signature_image || signature.signed_at))
        .map((signature) => signature.signature_role);
      if(item.doctor_signature_snapshot) {
        roles.push('DOCTOR');
      }
      return [...new Set(roles)];
    },
    pendingSignatureRoles: function(item) {
      if(['FIRMADO', 'NO_FIRMADO_POR_NEGATIVA', 'CANCELADO'].includes(item.status)) {
        return [];
      }
      const completed = this.completedSignatureRoles(item);
      return this.requiredSignatureRoles(item)
        .filter((role) => !completed.includes(role));
    },
    pendingSignatureLabels: function(item) {
      return this.pendingSignatureRoles(item).map((role) => this.signatureRoleLabel(role));
    },
    completedSignatureLabels: function(item) {
      return this.completedSignatureRoles(item).map((role) => this.signatureRoleLabel(role));
    },
    pendingSignatureTitle: function(item) {
      const pendingLabels = this.pendingSignatureLabels(item);
      if(item.status === 'FIRMADO' || pendingLabels.length === 0) {
        return 'Documento firmado';
      }
      return `Faltan firmas por completar: ${this.joinLabels(pendingLabels)}`;
    },
    pendingSignatureMessage: function(item) {
      const pendingLabels = this.pendingSignatureLabels(item);
      if(pendingLabels.length === 0) {
        return 'Las firmas requeridas quedaron capturadas en este documento.';
      }
      return `Este documento aun requiere ${this.joinLabels(pendingLabels).toLowerCase()}.`;
    },
    joinLabels: function(labels) {
      if(!labels || labels.length === 0) {
        return '';
      }
      if(labels.length === 1) {
        return labels[0];
      }
      return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
    },
    displayTitle: function(item) {
      return item.title || this.typeLabel(item.document_type);
    },
    doctorLabel: function(item) {
      return item.professional_name || item.name || 'Doctor sin nombre profesional';
    },
    visibleSignatures: function(item) {
      return item && Array.isArray(item.signatures) ? item.signatures : [];
    },
    statusLabel: function(status) {
      const labels = {
        BORRADOR: 'Borrador',
        PENDIENTE_FIRMA: 'Pendiente de firma',
        FIRMADO: 'Firmado',
        CANCELADO: 'Cancelado',
        REVOCADO: 'Revocado',
        REEMPLAZADO: 'Reemplazado',
        NO_FIRMADO_POR_NEGATIVA: 'No firmado por negativa'
      };
      return labels[status] || status;
    },
    originLabel: function(origin) {
      const labels = {
        DOCUMENT_CENTER: 'Documento del paciente',
        CLINICAL_HISTORY: 'Historia clínica',
        TREATMENT_PLAN: 'Plan de tratamiento',
        PRESCRIPTION: 'Recetas',
        MANUAL: 'Documento manual'
      };
      return labels[origin] || 'Documento del paciente';
    },
    typeLabel: function(type) {
      const labels = {
        SENSITIVE_DATA_CONSENT: 'Consentimiento de datos personales sensibles',
        TREATMENT_PLAN_CONSENT: 'Consentimiento del plan de tratamiento',
        GENERAL_ATTENTION_CONSENT: 'Consentimiento general de atención',
        CUSTOM_DOCUMENT: 'Documento personalizado',
        CUSTOM: 'Documento personalizado'
      };
      return labels[type] || 'Documento clínico';
    },
    signatureRoleLabel: function(role) {
      const labels = {
        PATIENT: 'Paciente',
        TUTOR: 'Tutor o representante legal',
        DOCTOR: 'Doctor',
        WITNESS1: 'Testigo 1',
        WITNESS2: 'Testigo 2'
      };
      return labels[role] || 'Firmante';
    },
    shortId: function(id) {
      return id ? String(id).slice(0, 8).toUpperCase() : '--';
    },
    formatDateTime: function(date) {
      if(!date) {
        return '--';
      }
      const value = new Date(date);
      if(Number.isNaN(value.getTime())) {
        return String(date).replace('T', ' ').slice(0, 16);
      }
      const dd = String(value.getDate()).padStart(2, '0');
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const yyyy = value.getFullYear();
      const hh = String(value.getHours()).padStart(2, '0');
      const min = String(value.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    },
    escapeHtml: function(value) {
      return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }
};
</script>

<style scoped>
.patient-documents {
  color: var(--color-text, #25364d);
}

.documents-hero,
.document-card,
.empty-card,
.step-card {
  border: 1px solid var(--color-border, rgba(14, 84, 104, 0.16));
  background: var(--color-surface, #fff);
}

.documents-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0 0 .25rem;
  color: var(--color-primary-700, #00728c);
  font-size: .75rem;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.documents-hero h3,
.empty-card h3 {
  margin: 0;
  color: var(--color-text, #25364d);
}

.documents-hero p,
.document-card p,
.document-card span,
.empty-card p,
.help-text {
  color: var(--color-text-muted, #64748b);
}

.documents-list {
  display: grid;
  gap: .85rem;
}

.document-filters {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin: 0 0 1rem;
}

.filter-chip {
  border: 1px solid var(--color-primary-200, #b8edf7);
  background: var(--color-surface, #fff);
  color: var(--color-primary-900, #006077);
  border-radius: 999px;
  min-height: 2rem;
  padding: .38rem .9rem;
  font-weight: 800;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .05);
  transition: box-shadow .16s ease, transform .16s ease, border-color .16s ease, background .16s ease;
}

.filter-chip:hover {
  border-color: var(--color-primary-300, #7dddec);
  background: var(--color-primary-50, #effbfe);
  box-shadow: 0 7px 16px rgba(15, 23, 42, .10);
  transform: translateY(-1px);
}

.filter-chip.active {
  background: var(--color-primary-100, #e0f7fc);
  box-shadow: 0 8px 18px rgba(27, 166, 201, .16);
}

.document-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  padding: 1rem;
}

.document-card--priority {
  border-color: var(--color-primary-200, #b8edf7);
  background: linear-gradient(0deg, rgba(27, 166, 201, .04), rgba(27, 166, 201, .04)), var(--color-surface, #fff);
}

.document-card--focused {
  border-color: var(--color-primary-400, #45c3dd);
  box-shadow: 0 14px 28px rgba(27, 166, 201, .16);
  background: linear-gradient(0deg, rgba(27, 166, 201, .08), rgba(27, 166, 201, .08)), var(--color-surface, #fff);
}

.document-main {
  display: grid;
  gap: .45rem;
}

.title-row,
.actions,
.meta-row,
.date-row {
  display: flex;
  align-items: center;
  gap: .65rem;
  flex-wrap: wrap;
}

.meta-row span,
.date-row span,
.signature-summary span {
  font-size: .9rem;
}

.signature-summary {
  display: flex;
  flex-wrap: wrap;
  gap: .55rem;
}

.signature-summary span {
  border: 1px solid var(--color-border, #d8e9ef);
  background: rgba(255, 255, 255, .6);
  color: var(--color-text-muted, #64748b);
  padding: .22rem .45rem;
}

.doctor-line,
.refusal-line {
  margin: 0;
}

.refusal-line {
  color: #b42318 !important;
}

.actions {
  justify-content: flex-end;
}

.empty-card {
  display: grid;
  place-items: center;
  text-align: center;
  padding: 2rem;
}

.btn-primary,
.btn-soft,
.btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: .5rem .85rem;
  font-weight: 800;
  letter-spacing: .03em;
}

.btn-create {
  min-height: 2.35rem;
  padding: .48rem .9rem;
  white-space: nowrap;
}

.btn-primary {
  background: var(--color-primary-500, #19a6c9);
  color: #fff;
}

.btn-soft {
  background: var(--color-primary-100, #e0f7fc);
  color: var(--color-primary-900, #006077);
  border-color: var(--color-primary-200, #b8edf7);
}

.btn-outline {
  background: #fff;
  color: var(--color-primary-900, #006077);
  border-color: var(--color-border, #d8e9ef);
}

.btn-outline.danger {
  color: #b42318;
  border-color: rgba(248, 113, 113, .32);
  background: rgba(248, 113, 113, .08);
}

.status-chip {
  border: 1px solid var(--color-primary-200, #b8edf7);
  background: var(--color-primary-100, #e0f7fc);
  color: var(--color-primary-900, #006077);
  display: inline-flex;
  align-items: center;
  width: max-content;
  min-height: 1.45rem;
  padding: .14rem .42rem;
  font-size: .75rem;
  font-weight: 800;
  line-height: 1.1;
}

.status-FIRMADO { border-color: rgba(34, 197, 94, .45); background: rgba(34, 197, 94, .12); color: #047857; }
.status-CANCELADO,
.status-NO_FIRMADO_POR_NEGATIVA { border-color: rgba(248, 113, 113, .45); background: rgba(248, 113, 113, .12); color: #b42318; }

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.2rem 1.4rem;
  border-bottom: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-primary-50, #effbfe);
}

.dialog-body {
  padding: 1.2rem 1.4rem !important;
}

.dialog-actions {
  justify-content: flex-end;
  gap: .75rem;
  padding: 0 1.4rem 1.2rem !important;
}

.step-card {
  padding: 1rem;
  margin-bottom: .85rem;
}

.step-title {
  margin: 0 0 .55rem;
  color: var(--color-text, #25364d);
  font-weight: 800;
}

.help-text {
  margin: .2rem 0 0;
  font-size: .9rem;
}

.minor-warning,
.sheet-warning,
.soft-warning {
  border: 1px solid rgba(251, 191, 36, .45);
  background: rgba(251, 191, 36, .10);
  color: #92400e;
  padding: .7rem;
  margin: .75rem 0;
}

.sheet-success {
  border: 1px solid rgba(34, 197, 94, .35);
  background: rgba(34, 197, 94, .10);
  color: #047857;
  padding: .7rem;
  margin: .75rem 0;
}

.sheet-success p,
.sheet-warning p {
  margin: .25rem 0 0;
}

.soft-warning p {
  margin: 0 0 .6rem;
}

.existing-document-callout {
  display: grid;
  gap: .65rem;
}

.existing-document-callout strong {
  color: #92400e;
}

.existing-document-callout p {
  margin: 0;
}

.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .8rem;
}

.form-grid .v-textarea {
  grid-column: 1 / -1;
}

.document-dialog-body {
  background: #f8fbfd;
}

.print-sheet {
  width: min(100%, 780px);
  margin: 0 auto;
  background: #fff;
  border: 1px solid var(--color-border, #d8e9ef);
  padding: 1.4rem;
  color: #1f2a44;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  border-bottom: 1px solid var(--color-border, #d8e9ef);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.sheet-header > .status-chip {
  align-self: flex-start;
  min-height: 1.65rem;
  padding: .22rem .5rem;
  font-size: .72rem;
}

.sheet-brand {
  margin: 0 0 .25rem;
  color: var(--color-primary-700, #00728c);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.sheet-header h2 {
  margin: 0;
  font-size: 1.35rem;
}

.sheet-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .7rem 1rem;
  border: 1px solid var(--color-border, #d8e9ef);
  padding: .85rem;
  margin-bottom: 1rem;
}

.sheet-meta strong {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.sheet-content {
  margin-bottom: 1.2rem;
  line-height: 1.55;
}

.section-kicker {
  margin: 0 0 .55rem;
  color: var(--color-primary-700, #00728c);
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.signature-progress {
  border: 1px solid var(--color-border, #d8e9ef);
  background: rgba(255, 255, 255, .7);
  padding: .85rem;
  margin: 1rem 0;
}

.signature-progress-grid {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}

.signature-progress-chip {
  border: 1px solid var(--color-border, #d8e9ef);
  padding: .32rem .55rem;
  font-size: .82rem;
  font-weight: 800;
}

.signature-progress-chip.complete {
  border-color: rgba(34, 197, 94, .42);
  background: rgba(34, 197, 94, .10);
  color: #047857;
}

.signature-progress-chip.pending {
  border-color: rgba(251, 191, 36, .55);
  background: rgba(251, 191, 36, .12);
  color: #92400e;
}

.signature-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.signature-card {
  border-top: 1px solid #1f2a44;
  padding-top: .55rem;
  min-height: 8rem;
  text-align: center;
}

.signature-card span {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-weight: 800;
  margin-bottom: .5rem;
}

.signature-card img {
  display: block;
  max-width: 13rem;
  max-height: 5.5rem;
  object-fit: contain;
  margin: 0 auto .5rem;
}

.signature-card strong,
.signature-card small {
  display: block;
}

.empty-signature {
  color: var(--color-text-muted, #64748b);
}

.signature-box {
  width: min(100%, 780px);
  margin: 1rem auto 0;
  border: 1px solid var(--color-border, #d8e9ef);
  background: #fff;
  padding: 1rem;
}

.document-signature-pad {
  display: block;
  margin-top: .75rem;
  touch-action: none;
}

.signature-loading {
  display: grid;
  place-items: center;
  min-height: 300px;
  margin-top: .75rem;
  border: 1px dashed var(--color-border, #d8e9ef);
  color: var(--color-text-muted, #64748b);
  background: #fff;
}

@media (max-width: 768px) {
  .documents-hero,
  .document-card,
  .form-grid,
  .sheet-meta,
  .signature-section {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .actions {
    justify-content: flex-start;
  }
}
</style>
