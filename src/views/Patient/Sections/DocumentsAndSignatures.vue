<template>
  <div class="patient-documents px-5 py-5">
    <da-loader v-bind:overlay="isLoading"></da-loader>
    <div v-if="notification.message && !showCreateDialog && !showDocumentDialog && !showRefusalDialog" class="document-feedback" :class="{ 'document-feedback--error': notification.type !== 'success' }" :role="notification.type === 'success' ? 'status' : 'alert'">{{ notification.message }}</div>
    <div v-if="loadError" class="document-feedback document-feedback--error" role="alert"><p>{{ loadError }}</p><button class="btn-outline" type="button" :disabled="isLoading" @click="load">Reintentar carga</button></div>

    <section class="documents-hero">
      <div>
        <p class="eyebrow">Documentos y firmas</p>
        <h3>Histórico del paciente</h3>
        <p>Consulta documentos creados, pendientes, firmados, cancelados o con negativa de firma.</p>
      </div>
      <button class="btn-primary btn-create tab-create-action" type="button" :disabled="isLoading || Boolean(loadError)" @click="openCreate">
        <v-icon size="17">mdi-plus</v-icon>
        Crear documento
      </button>
    </section>

    <section class="document-filters" v-if="documents.length > 0 || documentPagination" aria-label="Filtrar documentos por estado">
      <button
        v-for="filter in documentFilters"
        :key="filter.value"
        type="button"
        class="filter-chip"
        :class="['filter-' + filter.value, { active: documentFilter === filter.value }]"
        :aria-pressed="documentFilter === filter.value"
        @click="changeDocumentFilter(filter.value)"
      >
        <span class="filter-indicator" aria-hidden="true">{{ documentFilter === filter.value ? '✓' : '●' }}</span>
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

    <list-page-nav :pagination="documentPagination" :busy="isLoading" @change="changeDocumentPage" />

    <v-dialog v-model="showCreateDialog" max-width="860" content-class="patient-document-dialog">
      <v-card v-dialog-name="'Crear documento desde plantilla'" class="document-modal">
        <div class="dialog-header">
          <span class="dialog-icon" aria-hidden="true"><v-icon>mdi-file-document-plus-outline</v-icon></span>
          <div>
            <p class="eyebrow">Nuevo documento</p>
            <h3>Crear desde plantilla</h3>
          </div>
          <v-btn icon aria-label="Cerrar creación de documento" @click="showCreateDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <div v-if="createErrors.length || notification.message" ref="createErrorSummary" class="document-feedback document-feedback--error" role="alert" tabindex="-1">
            <strong>{{ notification.message || 'Revisa estos datos para continuar:' }}</strong>
            <ul v-if="createErrors.length"><li v-for="(entry, index) in createErrors" :key="`${entry.key}-${index}`"><button type="button" @click="focusCreateField(entry.key)">{{ entry.message }}</button></li></ul>
          </div>
          <section v-if="!activeTemplates.length" class="empty-card preparation-empty" role="status">
            <v-icon size="36" aria-hidden="true">mdi-file-document-alert-outline</v-icon>
            <h3>Aún no hay formatos activos para este consultorio</h3>
            <p>Primero prepara y activa una plantilla. Para finalizar la historia clínica necesitas el consentimiento de datos personales sensibles; otros documentos utilizan su propio formato.</p>
            <p v-if="!canManageTemplates">Solicita a la administración del consultorio que prepare los formatos antes de crear documentos.</p>
            <div class="inline-actions">
              <a v-if="canManageTemplates" class="btn-primary" href="/admin?section=documents" target="_blank" rel="noopener">Configurar formatos <span class="sr-only">(abre otra pestaña)</span></a>
              <button class="btn-outline" type="button" :disabled="isLoading" @click="refreshCreateOptions">Actualizar formatos y doctores</button>
            </div>
          </section>
          <template v-else>
          <div v-if="!hasReadyDoctor || (selectedDoctor && !isDoctorProfileReady(selectedDoctor))" class="soft-warning" role="status">
            <strong>{{ !hasReadyDoctor ? 'Primero prepara el perfil profesional del doctor' : 'Faltan datos del perfil profesional del doctor responsable' }}</strong>
            <p>El documento necesita un doctor activo con nombre profesional y cédula. Para firmar también requiere firma profesional y autorización del consultorio.</p>
            <p v-if="selectedDoctor && selectedDoctor.id_login !== currentUser.id_login">Pide al doctor que complete Mi perfil profesional con su propia cuenta.</p>
            <p v-else-if="!canOpenOwnProfile">Solicita a la administración que prepare el doctor responsable.</p>
            <div class="inline-actions">
              <a v-if="canOpenOwnProfile && (!selectedDoctor || selectedDoctor.id_login === currentUser.id_login)" class="btn-outline" href="/admin?section=doctor-identity" target="_blank" rel="noopener">Completar mi perfil <span class="sr-only">(abre otra pestaña)</span></a>
              <a v-if="canManageUsers" class="btn-outline" href="/admin?section=users" target="_blank" rel="noopener">Revisar doctores y autorizaciones <span class="sr-only">(abre otra pestaña)</span></a>
              <button class="btn-outline" type="button" :disabled="isLoading" @click="refreshCreateOptions">Actualizar formatos y doctores</button>
            </div>
          </div>
          <div v-if="selectedDoctor && isDoctorProfileReady(selectedDoctor) && !canDoctorSignDocuments(selectedDoctor)" class="soft-warning" role="status">
            <strong>Falta preparar la firma del doctor responsable</strong>
            <p>El doctor debe agregar su firma en Mi perfil profesional y la administración debe autorizarlo como firmante en Personal y usuarios. Puedes guardar el documento como borrador.</p>
            <div class="inline-actions">
              <a v-if="canOpenOwnProfile && selectedDoctor.id_login === currentUser.id_login" class="btn-outline" href="/admin?section=doctor-identity" target="_blank" rel="noopener">Revisar mi firma <span class="sr-only">(abre otra pestaña)</span></a>
              <a v-if="canManageUsers" class="btn-outline" href="/admin?section=users" target="_blank" rel="noopener">Revisar autorización de firma <span class="sr-only">(abre otra pestaña)</span></a>
              <button class="btn-outline" type="button" :disabled="isLoading" @click="refreshCreateOptions">Actualizar formatos y doctores</button>
            </div>
          </div>
          <section class="step-card">
            <p class="step-title">1. Tipo de documento</p>
            <v-select
              v-model="createForm.id_document_template"
              :id="createFieldId('template')"
              v-field-error="{ id: createFieldId('template'), invalid: Boolean(createFieldErrors('template').length) }"
              :items="activeTemplates"
              item-text="name"
              item-value="id_document_template"
              label="Plantilla *"
              no-data-text="No hay formatos activos"
              :error-messages="createFieldErrors('template')"
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
              :id="createFieldId('doctor')"
              v-field-error="{ id: createFieldId('doctor'), invalid: Boolean(createFieldErrors('doctor').length) }"
              :items="doctors"
              :item-text="doctorLabel"
              item-value="id_login"
              label="Doctor responsable *"
              no-data-text="No hay doctores disponibles; revisa la preparación del consultorio"
              :error-messages="createFieldErrors('doctor')"
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
              <v-text-field :id="createFieldId('guardian_name')" v-model="createForm.guardian_name" label="Nombre completo del tutor o representante legal *" :error-messages="createFieldErrors('guardian_name')" dense outlined :disabled="Boolean(openDocumentWarning)" :color="themePrimaryColor"></v-text-field>
              <v-text-field :id="createFieldId('guardian_relationship')" v-model="createForm.guardian_relationship" label="Parentesco o relación *" :error-messages="createFieldErrors('guardian_relationship')" dense outlined :disabled="Boolean(openDocumentWarning)" :color="themePrimaryColor"></v-text-field>
              <v-textarea v-model="createForm.guardian_reason" label="Motivo de representacion, opcional" rows="2" outlined :disabled="Boolean(openDocumentWarning)" :color="themePrimaryColor"></v-textarea>
            </div>
          </section>

          <section class="step-card">
            <p class="step-title">4. {{ contextStepTitle }}</p>
            <v-textarea v-model="createForm.diagnosis" :label="contextLabel" rows="2" outlined :disabled="Boolean(openDocumentWarning)" :color="themePrimaryColor"></v-textarea>
            <p class="help-text">{{ contextHelpText }}</p>
          </section>
          <p class="help-text">* Campo obligatorio. Los cambios de configuración se abren en otra pestaña; vuelve aquí y actualiza las opciones para conservar tu captura.</p>
          </template>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="showCreateDialog = false">Cancelar</button>
          <button v-if="activeTemplates.length && !openDocumentWarning" class="btn-outline" type="button" :disabled="isLoading" @click="createDocument('draft')">Guardar borrador</button>
          <button v-if="activeTemplates.length && !openDocumentWarning" class="btn-primary" type="button" :disabled="isLoading" @click="createDocument('sign')">Vista previa y firmar</button>
          <button v-if="openDocumentWarning" class="btn-primary" type="button" @click="openSignatureOptions(existingOpenDocument)">Continuar con el existente</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDocumentDialog" max-width="980" content-class="patient-document-dialog">
      <v-card v-dialog-name="documentMode === 'sign' ? 'Firmar documento' : 'Vista previa de documento'" class="document-modal">
        <div class="dialog-header no-print">
          <span class="dialog-icon" aria-hidden="true"><v-icon>{{ documentMode === 'sign' ? 'mdi-draw-pen' : 'mdi-file-document-outline' }}</v-icon></span>
          <div>
            <p class="eyebrow">{{ documentMode === 'sign' ? 'Firma digital' : 'Vista previa' }}</p>
            <h3>{{ selectedDocument ? displayTitle(selectedDocument) : '' }}</h3>
          </div>
          <v-btn icon :aria-label="documentMode === 'sign' ? 'Cerrar firma de documento' : 'Cerrar vista previa'" @click="showDocumentDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body document-dialog-body">
          <div v-if="notification.message" class="document-feedback" :class="{ 'document-feedback--error': notification.type !== 'success' }" :role="notification.type === 'success' ? 'status' : 'alert'">{{ notification.message }}</div>
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

    <v-dialog v-model="showRefusalDialog" max-width="620" content-class="patient-document-dialog">
      <v-card v-dialog-name="'Registrar negativa de firma'" class="document-modal">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Negativa</p>
            <h3>Registrar negativa de firma</h3>
          </div>
          <v-btn icon aria-label="Cerrar registro de negativa de firma" @click="showRefusalDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <div v-if="notification.message" class="document-feedback" :class="{ 'document-feedback--error': notification.type !== 'success' }" :role="notification.type === 'success' ? 'status' : 'alert'">{{ notification.message }}</div>
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
      <v-card v-dialog-name="'Cancelar documento'" class="document-modal">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Confirmar cancelacion</p>
            <h3>Cancelar documento</h3>
          </div>
          <v-btn icon :disabled="isLoading" aria-label="Cerrar confirmación de cancelación" @click="closeCancelConfirmDialog"><v-icon>mdi-close</v-icon></v-btn>
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
import dialogName from '../../../core/directives/dialog-name';
import fieldError from '../../../core/directives/field-error';
import { getSettingsSections } from '../../../security/settingsAccess';

import ListPageNav from '../../../components/common/ListPageNav.vue';

export default {
  directives: { dialogName, fieldError },
  mixins: [VuexMixin],
  components: {
    ListPageNav,
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
      documentPage: 1,
      documentPagination: null,
      creationHints: [],
      documentLoadRequest: 0,
      documentDetailRequest: 0,
      resolvingDocumentFocus: null,
      documentsLoaded: false,
      handledDocumentFocusRequest: null,
      documentFocusAlive: true,
      documentHighlightTimer: null,
      templates: [],
      doctors: [],
      loadError: '',
      createErrors: [],
      notification: { type: '', message: '' },
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
    documentIdentity: function() { return JSON.stringify([this.authUser, this.authBusiness]); },
    patientId: function() {
      return this.px && this.px.person ? this.px.person.id_person : '';
    },
    settingsSections: function() {
      const role = typeof this.authRole === 'object' ? this.authRole && this.authRole.code : this.authRole;
      return getSettingsSections(role || this.currentUser.rol, this.hasPermission);
    },
    canManageTemplates: function() { return this.settingsSections.some(item => item.key === 'documents'); },
    canOpenOwnProfile: function() { return this.settingsSections.some(item => item.key === 'doctor-identity'); },
    canManageUsers: function() { return this.settingsSections.some(item => item.key === 'users'); },
    hasReadyDoctor: function() { return this.doctors.some(doctor => this.isDoctorProfileReady(doctor)); },
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
      return [...this.documents, ...this.creationHints].find((item) => item.document_type === 'SENSITIVE_DATA_CONSENT' && item.status === 'FIRMADO' && item.active !== 0) || null;
    },
    existingOpenDocument: function() {
      if(!this.selectedTemplate) {
        return null;
      }
      return [...this.asArray(this.documents), ...this.creationHints].find((item) => (
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
      return this.asArray(this.templates).filter((item) => Number(item.is_active) === 1);
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
    documentIdentity: function() { this.documentPage = 1; this.documents = []; this.creationHints = []; this.documentPagination = null; this.selectedDocument = null; this.showDocumentDialog = false; this.load(); },
    patientId: {
      immediate: true,
      handler: function(value) {
        this.documentLoadRequest++;
        this.documentDetailRequest++;
        if(value) {
          this.documentPage = 1;
          this.documentFilter = 'ALL';
          this.documents = [];
          this.documentPagination = null;
          this.creationHints = [];
          this.selectedDocument = null;
          this.showDocumentDialog = false;
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
    this.documentLoadRequest++;
    this.documentDetailRequest++;
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
    documentPageParams: function() { return { page: this.documentPage, page_size: 10, document_filter: this.documentFilter }; },
    applyDocumentPage: function(data) {
      this.documents = Array.isArray(data) ? data : this.asArray(data && data.items);
      this.documentPagination = data && data.pagination || null;
      this.creationHints = data && data.creationHints || [];
      if(this.documentPagination) this.documentPage = this.documentPagination.page;
    },
    changeDocumentPage: function(page) { this.documentPage = page; return this.load(); },
    changeDocumentFilter: function(filter) { this.documentFilter = filter; this.documentPage = 1; return this.load(); },
    documentScope: function() { return JSON.stringify([this.patientId, this.authUser, this.authBusiness]); },
    ensureFullDocument: async function(item) {
      if(!item || !item._summary) return item;
      const request = ++this.documentDetailRequest, scope = this.documentScope();
      try {
        const response = await DADocumentService.getPatientDocument(this.patientId, item.id_patient_document);
        if(!this.documentFocusAlive || request !== this.documentDetailRequest || scope !== this.documentScope()) return null;
        if(!response || !response.success || !response.data || !response.data[0]) throw new Error('No se pudo consultar el documento. Reintenta.');
        return response.data[0];
      } catch(error) { if(this.documentFocusAlive && scope === this.documentScope()) this.notify('error', error.message || 'No se pudo consultar el documento.'); return null; }
    },
    load: async function(focus) {
      const request = ++this.documentLoadRequest, scope = this.documentScope();
      const optionsReady = this.documentsLoaded;
      const focusParams = focus && (focus.id_patient_document || focus.document_type) ? { document_filter: 'ALL', ...(focus.id_patient_document ? { focus_document: focus.id_patient_document } : { focus_type: focus.document_type }) } : {};
      const current = () => this.documentFocusAlive && request === this.documentLoadRequest && scope === this.documentScope();
      this.isLoading = true;
      this.loadError = '';
      this.documentsLoaded = false;
      try {
        const docs = await DADocumentService.getPatientDocuments(this.patientId, { ...this.documentPageParams(), ...focusParams });
        const templates = optionsReady ? { success: true, data: this.templates } : await DADocumentService.getTemplates();
        const doctors = optionsReady ? { success: true, data: this.doctors } : await DAPrescriptionService.doctors();
        if(!current()) return;
        if(!docs || !docs.success || !templates || !templates.success || !doctors || !doctors.success) {
          throw new Error('No se pudieron cargar los documentos, formatos o doctores. Reintenta antes de crear un documento.');
        }
        this.applyDocumentPage(docs.data);
        this.documentsLoaded = Boolean(docs && docs.success);
        this.templates = templates && templates.success ? this.asArray(templates.data) : [];
        this.doctors = doctors && doctors.success ? this.asArray(doctors.data) : [];
      } catch (error) {
        if(!current()) return;
        this.documentsLoaded = false;
        this.documents = [];
        this.templates = [];
        this.doctors = [];
        this.loadError = error.message || 'No se pudo cargar Documentos y firmas. Reintenta cuando tengas conexión.';
      } finally {
        if(current()) this.isLoading = false;
      }
    },
    openCreate: function() {
      this.createErrors = [];
      this.notification = { type: '', message: '' };
      this.createForm = this.emptyCreateForm();
      this.createForm.id_document_template = this.activeTemplates[0] ? this.activeTemplates[0].id_document_template : '';
      this.createForm.use_guardian = this.isMinor;
      this.createForm.responsible_doctor_user_id = this.currentDoctor ? this.currentDoctor.id_login : '';
      this.showCreateDialog = true;
    },
    refreshCreateOptions: async function() {
      if(this.isLoading) return;
      this.isLoading = true;
      this.notification = { type: '', message: '' };
      try {
        const [templates, doctors] = await Promise.all([DADocumentService.getTemplates(), DAPrescriptionService.doctors()]);
        if(!templates || !templates.success || !doctors || !doctors.success) throw new Error('No se pudieron actualizar formatos y doctores. Tu captura sigue aquí; reintenta.');
        this.templates = this.asArray(templates.data);
        this.doctors = this.asArray(doctors.data);
        this.createErrors = [];
      } catch(error) { this.notify('error', error.message || 'No se pudieron actualizar las opciones. Tu captura sigue aquí; reintenta.'); }
      finally { this.isLoading = false; }
    },
    createFieldId: function(key) { return `document-create-${this._uid}-${key}`; },
    createFieldErrors: function(key) { return this.createErrors.filter(entry => entry.key === key).map(entry => entry.message); },
    focusCreateField: function(key) {
      this.$nextTick(() => { const field = document.getElementById(this.createFieldId(key)); if(field) { field.focus(); field.scrollIntoView({ block: 'center' }); } });
    },
    focusCreateErrors: function() {
      this.$nextTick(() => { const summary = this.$refs.createErrorSummary; if(summary) { summary.focus(); summary.scrollIntoView({ block: 'center' }); } });
    },
    validateCreateForm: function(mode) {
      this.createErrors = [];
      this.notification = { type: '', message: '' };
      const add = (key, message) => this.createErrors.push({ key, message });
      if(!this.selectedTemplate || !this.activeTemplates.some(item => item.id_document_template === this.createForm.id_document_template)) add('template', this.activeTemplates.length ? 'Selecciona una plantilla activa.' : 'Primero configura y activa un formato para este consultorio.');
      if(this.sensitiveConsentWarning) add('template', 'Este paciente ya tiene un consentimiento de datos personales sensibles firmado. Revisa el existente o elige generar una nueva versión.');
      if(this.openDocumentWarning) add('template', 'Ya existe un documento en proceso de este formato. Continúa con el existente.');
      if(!this.createForm.responsible_doctor_user_id) add('doctor', this.doctors.length ? 'Selecciona el doctor responsable.' : 'Primero prepara el perfil profesional de un doctor del consultorio.');
      else if(!this.selectedDoctor || !this.isDoctorProfileReady(this.selectedDoctor)) add('doctor', 'El doctor responsable necesita un perfil activo con nombre profesional y cédula. Completa su perfil y actualiza las opciones.');
      else if(mode === 'sign' && !this.canDoctorSignDocuments(this.selectedDoctor)) add('doctor', 'Para firmar, el doctor debe completar su firma profesional y la administración debe autorizarlo como firmante en Personal y usuarios. Puedes guardar el borrador.');
      if(this.showGuardianSection) {
        if(!String(this.createForm.guardian_name || '').trim()) add('guardian_name', 'Captura el nombre completo del tutor o representante legal.');
        if(!String(this.createForm.guardian_relationship || '').trim()) add('guardian_relationship', 'Captura el parentesco o relación del tutor o representante legal.');
      }
      if(this.createErrors.length) this.focusCreateErrors();
      return this.createErrors.length === 0;
    },
    createDocument: async function(mode = 'draft') {
      if(this.isLoading) return;
      if(!this.validateCreateForm(mode)) {
        return;
      }
      const previousIds = this.documents.map((item) => item.id_patient_document);
      this.isLoading = true;
      let response;
      try {
        response = await DADocumentService.createDocument({ id_person: this.patientId, origin: 'DOCUMENT_CENTER', ...this.createForm, page: 1, page_size: 10, document_filter: 'ALL' });
      } catch(error) {
        this.notify('error', 'No se pudo crear el documento. Tu captura sigue aquí; revisa la conexión y reintenta.');
        return;
      } finally { this.isLoading = false; }
      if(response && response.success) {
        this.documentFilter = 'ALL';
        this.applyDocumentPage(response.data);
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
      const scope = this.documentScope();
      item = await this.ensureFullDocument(item);
      if(!item || !this.documentFocusAlive || scope !== this.documentScope()) return;
      this.selectedDocument = item;
      this.documentMode = 'view';
      this.showDocumentDialog = true;
      DADocumentService.auditAction({ id_patient_document: item.id_patient_document, event_type: 'VIEWED' });
    },
    focusRequestedDocument: async function(request) {
      if(!request || !this.documentFocusAlive || !this.documentsLoaded || request === this.handledDocumentFocusRequest
          || request.id_person && request.id_person !== this.patientId) {
        return;
      }
      if(this.resolvingDocumentFocus === request) return;
      const focusScope = this.documentScope();
      let requestedDocument = this.findRequestedDocument(request);
      if(!requestedDocument && this.documentPagination) {
        this.resolvingDocumentFocus = request;
        this.documentFilter = 'ALL';
        await this.load(request);
        if(this.resolvingDocumentFocus !== request || focusScope !== this.documentScope()) return;
        this.resolvingDocumentFocus = null;
        if(!this.documentFocusAlive || request.id_person && request.id_person !== this.patientId) return;
        if(this.loadError) return;
        requestedDocument = this.findRequestedDocument(request);
      }
      // Consume before queued DOM work so reloads/remounts cannot replay a completed request.
      this.handledDocumentFocusRequest = request;
      this.$emit('document-focus-consumed', request);
      if(!requestedDocument) {
        this.documentFilter = 'ALL';
        this.notify('warning', 'No se encontró el consentimiento solicitado en Documentos y firmas.');
        return;
      }
      this.documentFilter = 'ALL';
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
    openSignatureOptions: async function(item) {
      const scope = this.documentScope();
      item = await this.ensureFullDocument(item);
      if(!item || !this.documentFocusAlive || scope !== this.documentScope()) return;
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
        ...this.documentPageParams(),
        id_patient_document: this.selectedDocument.id_patient_document,
        patient_signature: this.patientSignature,
        signer_name: signerName,
        signature_role: this.currentSignRole,
        responsible_doctor_user_id: this.selectedDocument.responsible_doctor_user_id
      });
      this.isLoading = false;
      if(response && response.success) {
        this.applyDocumentPage(response.data);
        this.selectedDocument = this.documents.find((item) => item.id_patient_document === this.selectedDocument.id_patient_document)
          || await this.ensureFullDocument({ ...this.selectedDocument, _summary: true });
        if(!this.selectedDocument) { this.showDocumentDialog = false; return; }
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
        ...this.documentPageParams(),
        id_patient_document: this.refusalDocument.id_patient_document,
        refusal_reason: this.refusalReason.trim()
      });
      this.isLoading = false;
      if(response && response.success) {
        this.applyDocumentPage(response.data);
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
        ...this.documentPageParams(),
        reason: 'Cancelado desde Documentos y firmas.'
      });
      this.isLoading = false;
      this.resetCancelConfirmDialog();
      if(response && response.success) {
        this.applyDocumentPage(response.data);
        this.notify('success', 'Documento cancelado.');
      } else {
        this.notify('error', response && response.message ? response.message : 'No se pudo cancelar documento.');
      }
    },
    notify: function(type, message) {
      this.notification = { type, message };
      if(this.showCreateDialog && type !== 'success') this.focusCreateErrors();
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
        Number(doctor.professional_profile_active) === 1 &&
        doctor.professional_name &&
        doctor.professional_license
      );
    },
    canDoctorSignDocuments: function(doctor) {
      return Boolean(
        this.isDoctorProfileReady(doctor) &&
        Number(doctor.can_sign_documents) === 1 &&
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
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  border: 1px solid var(--state-border);
  background: var(--state-bg);
  color: var(--state-text);
  border-radius: 999px;
  min-height: 2.5rem;
  padding: .38rem .9rem;
  font-weight: 800;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .05);
  transition: box-shadow .16s ease, transform .16s ease, border-color .16s ease, background .16s ease;
}

.filter-chip:hover {
  border-color: var(--state-text);
  box-shadow: 0 7px 16px rgba(15, 23, 42, .10);
  transform: translateY(-1px);
}

.filter-chip.active {
  background: var(--state-text);
  border-color: var(--state-text);
  color: var(--state-on-active, #fff);
  box-shadow: 0 3px 8px rgba(15, 23, 42, .12);
}

.filter-indicator { width: 1em; text-align: center; font-size: .8em; }
.filter-chip:focus-visible { outline: 3px solid var(--state-text); outline-offset: 3px; }

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

.filter-chip, .status-chip { --state-bg: #f0fdfa; --state-text: #115e59; --state-border: #99ded6; }
.filter-PENDING, .status-BORRADOR, .status-PENDIENTE_FIRMA { --state-bg: #fff3cd; --state-text: #8a5a00; --state-border: #ffd972; }
.filter-SIGNED, .status-FIRMADO { --state-bg: #cdeed6; --state-text: #0f5132; --state-border: #7ccb91; }
.filter-REFUSAL, .status-NO_FIRMADO_POR_NEGATIVA { --state-bg: #fce7f3; --state-text: #9d174d; --state-border: #f9a8d4; }
.filter-CANCELLED, .status-CANCELADO, .status-REVOCADO { --state-bg: #fde2e2; --state-text: #b42318; --state-border: #f8b4b4; }
.status-REEMPLAZADO { --state-bg: #efe3ff; --state-text: #6d28d9; --state-border: #c4a5fd; }
.status-chip { border-color: var(--state-border); background: var(--state-bg); color: var(--state-text); }
html[data-theme="clinical-night"] .filter-chip, html[data-theme="clinical-night"] .status-chip { --state-bg: #183a39; --state-text: #99e4d9; --state-border: #427d77; --state-on-active: #0f172a; }
html[data-theme="clinical-night"] .filter-PENDING, html[data-theme="clinical-night"] .status-BORRADOR, html[data-theme="clinical-night"] .status-PENDIENTE_FIRMA { --state-bg: #3b301a; --state-text: #fcd779; --state-border: #8a6c29; }
html[data-theme="clinical-night"] .filter-SIGNED, html[data-theme="clinical-night"] .status-FIRMADO { --state-bg: #193b2b; --state-text: #9fe3b3; --state-border: #427c58; }
html[data-theme="clinical-night"] .filter-REFUSAL, html[data-theme="clinical-night"] .status-NO_FIRMADO_POR_NEGATIVA { --state-bg: #412139; --state-text: #f9b8dc; --state-border: #965074; }
html[data-theme="clinical-night"] .filter-CANCELLED, html[data-theme="clinical-night"] .status-CANCELADO, html[data-theme="clinical-night"] .status-REVOCADO { --state-bg: #442523; --state-text: #ffb8b2; --state-border: #9c514b; }
html[data-theme="clinical-night"] .status-REEMPLAZADO { --state-bg: #33264a; --state-text: #d5bcff; --state-border: #8063ac; }

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border, #d8e9ef);
  background: linear-gradient(180deg, var(--color-primary-100, #e6f7fb), #fff);
}
.document-modal { border-radius: 16px; overflow: hidden; color: var(--color-text, #25364d); }
.dialog-header > div { flex: 1; min-width: 0; }
.dialog-header h3 { margin: .25rem 0 0; font-size: 1.25rem; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.dialog-header > .v-btn { flex-shrink: 0; margin: -4px -8px 0 0; color: var(--color-text-muted, #64748b); }
.dialog-icon { display: flex; align-items: center; justify-content: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 12px; background: var(--color-primary-100, #e6f7fb); }
.dialog-icon .v-icon { color: var(--color-primary-900, #086783); }
.document-feedback { margin: 0 0 1rem; padding: 1rem; border: 1px solid var(--color-primary-200, #cdeef7); border-radius: 10px; background: var(--color-primary-100, #e6f7fb); color: var(--color-primary-900, #086783); }
.document-feedback--error { color: #991b1b; background: #fff1f2; border-color: #fecdd3; }
.document-feedback ul { margin: .5rem 0 0; padding-left: 1.2rem; }
.document-feedback li button { padding: .25rem 0; text-decoration: underline; text-align: left; }
.document-feedback:focus { outline: 3px solid var(--color-primary-900, #086783); outline-offset: 3px; }
.document-modal button:focus-visible, .document-modal a:focus-visible { outline: 3px solid var(--color-primary-900, #086783); outline-offset: 3px; }
.preparation-empty { border-radius: 12px; padding: 1.5rem; text-align: left; }
.preparation-empty h3 { margin-top: .75rem; }
.preparation-empty .inline-actions { justify-content: flex-start; }

.dialog-body {
  padding: 1.2rem 1.4rem !important;
  max-height: 65vh;
  overflow-y: auto;
  background: var(--color-bg, #f8fbfd);
}

.dialog-actions {
  justify-content: flex-end;
  gap: .75rem;
  flex-wrap: wrap;
  padding: 1rem 1.4rem !important;
  border-top: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-surface, #fff);
}

.step-card {
  padding: 1rem;
  margin-bottom: .85rem;
  border-radius: 12px;
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
  .document-modal .dialog-header { padding: 20px 16px; gap: 10px; }
  .document-modal .dialog-header h3 { font-size: 1.1rem; }
  .dialog-icon { flex-basis: 36px; width: 36px; height: 36px; border-radius: 10px; }
  .document-modal .dialog-body { padding: 20px 16px !important; }
  .document-modal .dialog-actions { padding: 16px !important; }
  .document-modal .dialog-actions > button { flex: 1 1 auto; min-height: 44px; }
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
