<template>
  <div class="clinical-history-page" :aria-busy="String(isLoading)">
    <section v-if="isLoading" class="clinical-panel" role="status">Cargando historia clínica, formato y responsables…</section>
    <section v-else-if="loadError && !clinicalHistory" class="clinical-panel warning-panel" role="alert">
      <strong>No se pudo cargar la historia clínica.</strong>
      <span>Reintenta antes de crear un borrador para este paciente.</span>
      <button class="clinical-button secondary" type="button" @click="loadInitialData">Reintentar</button>
    </section>
    <section v-else-if="!clinicalHistory" class="clinical-panel initial-history-panel">
      <div class="initial-history-content">
        <div class="initial-eyebrow-row">
          <span v-if="showCreatePatientNotice" class="positive-note">Nuevo expediente</span>
          <span class="status-pill neutral">Sin historia</span>
        </div>
        <h2>{{ showCreatePatientNotice ? 'Paciente creado correctamente' : 'Inicia la historia clínica' }}</h2>
        <p class="initial-subtitle">
          {{ showCreatePatientNotice ? 'Ahora puedes iniciar la historia clínica del paciente.' : 'Este paciente aún no tiene una historia clínica formal.' }}
        </p>
        <p class="status-copy">Puedes empezar con una historia en blanco o usar los datos básicos del expediente.</p>
        <div class="initial-summary">
          <div>
            <span>Estado</span>
            <strong>Sin historia clínica formal</strong>
          </div>
          <div>
            <span>Doctor responsable sugerido</span>
            <strong>{{ selectedDoctor ? selectedDoctorLabel : 'No seleccionado' }}</strong>
          </div>
          <div>
            <span>Formato</span>
            <strong>{{ activeTemplateLabel }} v{{ activeTemplateVersion }}</strong>
          </div>
        </div>
      </div>
      <div class="initial-actions">
        <button v-if="canCreateDraft" class="primary-cta tab-create-action" type="button" :disabled="isBusy || !contextReady" @click="openStartHistoryDialog">
          Crear historia clínica
        </button>
        <p v-else class="permission-note">No tienes permiso para crear borradores de historia clínica.</p>
        <div class="secondary-link-row">
          <button class="clinical-link-button" type="button" @click="showRegisteredData = !showRegisteredData">
            {{ showRegisteredData ? 'Ocultar datos registrados' : 'Ver datos registrados' }}
          </button>
          <button v-if="canViewVersions" class="clinical-link-button" type="button" :disabled="versionsLoading" @click="toggleVersionsPanel">
            {{ showVersionsPanel ? 'Ocultar versiones' : 'Ver versiones' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="clinicalHistory" :class="['clinical-panel', 'status-panel', { 'draft-status-panel': isDraft }]">
      <div class="status-main">
        <p class="section-kicker">Historia clínica</p>
        <div class="status-title-row">
          <h2>Historia clínica del paciente</h2>
          <span :class="['status-pill', statusTone]">{{ clinicalHistoryStatusLabel }}</span>
          <button v-if="canViewVersions" class="clinical-link-button history-link-button" type="button" :disabled="versionsLoading" @click="toggleVersionsPanel">
            {{ showVersionsPanel ? 'Ocultar historial' : 'Ver Historial' }}
          </button>
        </div>
        <p class="status-copy">{{ clinicalHistoryHelpText }}</p>
      </div>
      <div class="status-grid">
        <div class="status-item">
          <span>Versión</span>
          <strong>{{ metadata.version }}</strong>
        </div>
        <div class="status-item">
          <span>Creación</span>
          <strong>{{ metadata.createdAt }}</strong>
        </div>
        <div class="status-item">
          <span>Última actualización</span>
          <strong>{{ metadata.updatedAt }}</strong>
        </div>
        <div v-if="!isDraft || metadata.finalizedAt !== 'No registrado'" class="status-item">
          <span>Finalización</span>
          <strong>{{ metadata.finalizedAt }}</strong>
        </div>
        <div class="status-item wide">
          <span>Doctor responsable</span>
          <strong>{{ selectedDoctorLabel }}</strong>
        </div>
        <div v-if="!isDraft && clinicalHistory.finalizer_snapshot_json" class="status-item wide">
          <span>Profesional que cerró esta versión</span>
          <strong>{{ doctorLabel(clinicalHistory.finalizer_snapshot_json) }}</strong>
        </div>
        <div class="status-item wide">
          <span>Capturado por</span>
          <strong>{{ metadata.createdBy }}</strong>
        </div>
        <div class="status-item wide">
          <span>Última edición por</span>
          <strong>{{ metadata.updatedBy }}</strong>
        </div>
      </div>
    </section>

    <section v-if="clinicalHistory && historyVersionNotice" class="clinical-panel version-notice-panel">
      <strong>{{ historyVersionNotice }}</strong>
      <span v-if="clinicalHistory.status !== 'DRAFT'">Las versiones cerradas son solo de consulta.</span>
    </section>

    <section v-if="showVersionsPanel" class="clinical-panel versions-panel">
      <header class="versions-header">
        <div>
          <p class="section-kicker">Historial</p>
          <h3>Historial de historia clínica</h3>
          <p>Consulta borradores y versiones anteriores sin modificar la información ya guardada.</p>
        </div>
        <button class="clinical-button secondary" type="button" :disabled="versionsLoading" @click="loadClinicalHistoryVersions">
          Actualizar
        </button>
      </header>

      <p v-if="versionsLoadError" class="form-warning">No fue posible cargar las versiones. Intenta nuevamente.</p>
      <p v-if="versionsLoading" class="versions-empty">Cargando versiones...</p>
      <p v-else-if="!clinicalHistoryVersions.length" class="versions-empty">Aún no hay versiones de historia clínica.</p>

      <div v-else class="versions-list">
        <article
          v-for="version in clinicalHistoryVersions"
          :key="version.id_clinical_history"
          :class="['version-card', { active: clinicalHistory && clinicalHistory.id_clinical_history === version.id_clinical_history }]"
        >
          <div class="version-card-main">
            <div class="version-title-row">
              <h4>Versión {{ version.version_number || 'No registrada' }}</h4>
              <span :class="['status-pill', String(version.status || '').toLowerCase()]">{{ statusLabel(version.status) }}</span>
              <span class="version-indicator">{{ versionIndicator(version) }}</span>
            </div>
            <p>{{ version.summary_short || 'Historia clínica' }}</p>
            <div class="version-meta-grid">
              <div><span>Creada</span><strong>{{ formatDateTime(version.created_at) }}</strong></div>
              <div><span>Finalizada</span><strong>{{ formatDateTime(version.finalized_at) }}</strong></div>
              <div><span>Doctor responsable</span><strong>{{ version.doctor_name_snapshot || 'No registrado' }}</strong></div>
              <div><span>Formato</span><strong>{{ version.template_name || 'No registrado' }} v{{ version.template_version_number || 'N/D' }}</strong></div>
              <div><span>Consentimiento</span><strong>{{ consentVersionLabel(version) }}</strong></div>
            </div>
          </div>
          <div class="version-actions">
            <button class="clinical-button secondary" type="button" :disabled="isBusy" @click="viewHistoryVersion(version)">
              {{ canContinueVersion(version) ? 'Continuar edición' : 'Ver versión' }}
            </button>
            <button class="clinical-button secondary" type="button" :disabled="isBusy || !canPrintClinicalHistory" @click="printHistoryVersion(version)">
              Imprimir historia clínica
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-if="!isLoading" class="clinical-panel consent-panel" :class="{ compact: !clinicalHistory }">
      <div class="consent-copy">
        <div class="consent-title-row">
          <div>
            <p class="section-kicker">Consentimiento de datos personales sensibles</p>
            <h3>Consentimiento de datos personales sensibles</h3>
          </div>
          <span :class="['consent-status-badge', consentStatusTone]">{{ sensitiveConsentTitle }}</span>
        </div>
        <p>{{ sensitiveConsentHelpText }}</p>
      </div>
      <div class="button-row consent-action-row">
        <button v-if="sensitiveConsent" class="clinical-button secondary" type="button" @click="openSensitiveDocument">
          {{ hasConsentRefusal ? 'Ver detalle' : 'Ver consentimiento' }}
        </button>
        <button v-if="!sensitiveConsent" class="clinical-button secondary" type="button" @click="createSensitiveConsent">
          Gestionar consentimiento
        </button>
        <button
          v-if="sensitiveConsent && sensitiveConsent.status !== 'FIRMADO' && sensitiveConsent.status !== 'NO_FIRMADO_POR_NEGATIVA'"
          class="clinical-button danger-soft"
          type="button"
          @click="registerSensitiveRefusal"
        >
          Registrar negativa
        </button>
      </div>
    </section>

    <section v-if="contextError || (templateLoadError && !historyTemplateSchema) || (loadError && clinicalHistory)" class="clinical-panel warning-panel" role="alert">
      <strong>{{ contextError || (templateLoadError ? 'No se pudo verificar el formato configurado.' : 'No se pudo actualizar la historia clínica.') }}</strong>
      <span>Los datos capturados se conservan. Reintenta para verificar el contexto antes de continuar.</span>
      <button class="clinical-button secondary" type="button" :disabled="isLoading || isBusy" @click="loadInitialData">Reintentar</button>
    </section>

    <section v-if="!clinicalHistory && showRegisteredData" class="clinical-panel legacy-panel">
      <div>
        <p class="section-kicker">Datos registrados del paciente</p>
        <h3>Datos actuales del expediente</h3>
        <p>Estos datos pueden ayudarte a iniciar la historia clínica.</p>
      </div>
      <div class="legacy-grid">
        <div><span>Paciente</span><strong>{{ legacyIdentification.full_name }}</strong></div>
        <div><span>Edad</span><strong>{{ legacyIdentification.age }}</strong></div>
        <div><span>Teléfono</span><strong>{{ legacyIdentification.phone }}</strong></div>
        <div><span>Dirección</span><strong>{{ legacyIdentification.address }}</strong></div>
        <div class="wide"><span>Motivo de consulta</span><strong>{{ legacyConsultation.reason }}</strong></div>
        <div class="wide"><span>Padecimiento actual</span><strong>{{ legacyConsultation.currentCondition }}</strong></div>
      </div>
    </section>

    <section v-if="clinicalHistory" class="clinical-panel actions-panel">
      <div>
        <p class="section-kicker">Captura clínica</p>
        <h3>{{ formModeTitle }}</h3>
        <p>{{ formModeHelp }}</p>
        <p v-if="isDraft" class="save-state" role="status">{{ isBusy ? 'Procesando…' : (dirty ? 'Cambios sin guardar' : 'Todos los cambios guardados') }}</p>
        <p v-if="isDraft && !canCurrentUserFinalize" class="permission-note">
          Solo un doctor o administrador con perfil profesional activo puede finalizar esta historia.
        </p>
        <div v-if="useDynamicSchema" class="capture-template-inline">
          <span>Formato</span>
          <strong>{{ activeTemplateLabel }}</strong>
          <em>v{{ activeTemplateVersion }}</em>
        </div>
        <div v-if="isDraft" class="capture-progress-inline">
          <div class="capture-progress-topline">
            <strong>{{ requiredFieldsTotal ? `${requiredFieldsCompleted} / ${requiredFieldsTotal} datos obligatorios completados` : 'Sin campos obligatorios en este formato' }}</strong>
            <span>{{ requiredPendingCount ? `${requiredPendingCount} pendientes` : 'Sin obligatorios pendientes' }}</span>
          </div>
          <div class="capture-progress-track">
            <span :style="{ width: `${captureProgressPercent}%` }"></span>
          </div>
          <div class="capture-progress-footer">
            <small>Los campos opcionales no cuentan en este indicador. Completarlo no sustituye la revisión clínica.</small>
            <button class="clinical-link-button" type="button" @click="openPendingSummary">
              {{ requiredPendingCount ? 'Ver pendientes' : 'Revisar secciones' }}
            </button>
          </div>
        </div>
      </div>
      <div class="button-row capture-action-row">
        <button v-if="isDraft && canEditDraftPermission" class="clinical-button primary" type="button" :disabled="isBusy || !contextReady" @click="saveDraft()">
          Guardar borrador
        </button>
        <button
          v-if="isDraft"
          class="clinical-button success"
          type="button"
          :disabled="isBusy || !contextReady || !canCurrentUserFinalize"
          title="Solo un doctor o administrador con perfil profesional activo puede finalizar esta historia."
          @click="openFinalizeDialog"
        >
          Finalizar historia clínica
        </button>
        <button v-if="isDraft && canCancelDraft" class="clinical-button danger-soft" type="button" :disabled="isBusy || !contextReady" @click="cancelDraft">
          Cancelar borrador
        </button>
        <button v-if="clinicalHistory && canPrintClinicalHistory" class="clinical-button secondary" type="button" :disabled="isBusy" @click="printCurrentClinicalHistory">
          {{ isDraft ? 'Imprimir borrador' : 'Imprimir historia clínica' }}
        </button>
        <button v-if="canCreateNewVersion" class="clinical-button secondary" type="button" :disabled="isBusy" @click="createNewVersion">
          Crear nueva versión
        </button>
      </div>
    </section>

    <section v-if="saveError || validationErrors.length" class="clinical-panel warning-panel" role="alert">
      <strong>{{ saveError || 'Corrige estos campos antes de guardar. Tu texto se conserva.' }}</strong>
      <div v-if="revisionConflict" class="clinical-actions">
        <p>Tu captura sigue en el formulario. Puedes guardar una copia antes de cargar los cambios de la otra sesión.</p>
        <button class="clinical-button secondary" type="button" :disabled="isBusy" @click="downloadLocalCapture">Descargar mi captura</button>
        <button class="clinical-button secondary" type="button" :disabled="isBusy" @click="reloadConflictingHistory">Cargar versión actual</button>
      </div>
      <button v-for="error in validationErrors" :key="error.key" class="clinical-link-button" type="button" @click="focusHistoryField(error)">
        {{ error.sectionLabel }}: {{ error.fieldLabel }}. {{ error.message }}
      </button>
    </section>

    <section v-if="false && clinicalHistory && isDraft" class="clinical-panel capture-guide-panel">
      <div class="capture-guide-main">
        <p class="section-kicker">Progreso de captura</p>
        <h3>{{ requiredFieldsCompleted }} / {{ requiredFieldsTotal }} datos obligatorios completados</h3>
        <p>
          {{ requiredPendingCount ? `Faltan ${requiredPendingCount} datos obligatorios para poder finalizar.` : 'Los datos obligatorios están completos. Puedes revisar y finalizar cuando el consentimiento esté listo.' }}
        </p>
        <div v-if="requiredPendingPreview.length" class="pending-preview-list">
          <span v-for="item in requiredPendingPreview" :key="item.key">{{ item.label }}</span>
        </div>
      </div>
      <div class="capture-guide-actions">
        <button class="clinical-button secondary" type="button" @click="scrollToFirstMissingRequired">
          Ver campos pendientes
        </button>
      </div>
    </section>

    <section v-if="clinicalHistory && isIncomplete" class="clinical-panel warning-panel">
      <strong>Historia clínica incompleta.</strong>
      <span>La historia quedó incompleta porque falta el consentimiento firmado.</span>
    </section>

    <section v-if="clinicalHistory && templateWarningText" class="clinical-panel warning-panel">
      <strong>Formato no disponible.</strong>
      <span>{{ templateWarningText }}</span>
    </section>

    <section v-if="false && clinicalHistory && useDynamicSchema" class="clinical-panel template-panel">
      <div>
          <p class="section-kicker">Formato de historia clínica</p>
          <h3>{{ activeTemplateLabel }}</h3>
        <p>{{ activeTemplateHelp }}</p>
      </div>
      <span class="template-version-pill">v{{ activeTemplateVersion }}</span>
    </section>

    <section v-if="clinicalHistory" class="clinical-form">
      <template v-if="useDynamicSchema">
        <div :class="['clinical-capture-layout', { guided: isDraft }]">
          <aside v-if="isDraft" class="section-navigator">
            <div class="section-navigator-header">
              <p class="section-kicker">Secciones</p>
              <strong>{{ requiredPendingCount ? `${requiredPendingCount} pendientes` : 'Sin pendientes' }}</strong>
            </div>
            <button
              v-for="item in sectionProgressItems"
              :key="item.key"
              type="button"
              :class="['section-nav-item', item.tone, { active: activeClinicalSectionKey === item.key }]"
              @click="scrollToDynamicSection(item.key)"
            >
              <span>{{ item.label }}</span>
              <small>{{ item.status }}</small>
            </button>
          </aside>

          <div class="clinical-section-stack">
        <article class="clinical-section responsible-section">
          <header>
            <p class="section-kicker">Responsable</p>
            <h3>Doctor responsable</h3>
            <span>Este doctor revisará y finalizará la historia clínica.</span>
          </header>
          <div class="doctor-summary">
            <span>Doctor responsable</span>
            <strong>{{ selectedDoctorLabel }}</strong>
            <small>Este doctor revisará y finalizará la historia clínica.</small>
          </div>
          <v-select
            v-model="doctorResponsibleUserId"
            :items="doctorOptions"
            item-text="label"
            item-value="value"
            label="Doctor responsable"
            outlined
            dense
            :readonly="!canEditForm"
            :disabled="!canEditForm"
          />
          <p v-if="doctorResponsibleWarning" class="form-warning">{{ doctorResponsibleWarning }}</p>
        </article>

        <article
          v-for="section in visibleDynamicSections"
          :key="section.key"
          :ref="`dynamic-section-${section.key}`"
          :class="['clinical-section', 'collapsible-section', { 'section-missing': dynamicSectionHasMissing(section), collapsed: isDraft && !isSectionOpen(section) }]"
        >
          <header class="section-accordion-header">
            <div>
              <p class="section-kicker">{{ sectionKicker(section) }}</p>
              <h3>{{ section.label }}</h3>
              <span v-if="section.description">{{ section.description }}</span>
            </div>
            <div class="section-header-status">
              <span :class="['section-state-pill', sectionProgress(section).tone]">{{ sectionProgress(section).status }}</span>
            </div>
          </header>
          <div v-show="!isDraft || isSectionOpen(section)" class="section-body">
          <div v-if="section.key === 'allergies_medications'" class="clinical-panel">
            <strong>{{ allergyStateLabel }}</strong>
            <p>{{ form.allergies_medications.allergies || 'Consulta al paciente para registrar el estado.' }}</p>
            <p v-if="isDraft && form.allergies_medications.legacy_allergies && !form.allergies_medications.allergy_reviewed_at" class="form-warning">Dato previo de esta historia: {{ form.allergies_medications.legacy_allergies }}. Revisa su vigencia al actualizar.</p>
            <p v-if="!isDraft">Información conservada para esta versión histórica.</p>
            <button v-if="isDraft && canReviewAllergies" id="history-allergies_medications-allergy_status" type="button" class="clinical-button secondary" @click="$emit('edit-allergies', form.allergies_medications.legacy_allergies || '')">Revisar alergias</button>
          </div>
          <div v-if="dynamicSectionHasMissing(section)" class="section-inline-warning">
            {{ dynamicSectionMissingCount(section) }} {{ dynamicSectionMissingCount(section) === 1 ? 'campo obligatorio pendiente' : 'campos obligatorios pendientes' }}
          </div>
          <div v-if="canEditForm && quickActionsForSection(section).length" class="quick-action-row">
            <button
              v-for="action in quickActionsForSection(section)"
              :key="action.label"
              class="quick-fill-button"
              type="button"
              :disabled="isBusy"
              @click="applyQuickAction(section, action)"
            >
              {{ action.label }}
            </button>
          </div>
          <p v-if="lastQuickAction && lastQuickAction.sectionKey === section.key" class="quick-action-feedback" role="status">
            Atajo aplicado a {{ lastQuickAction.field.label }}.
            <button class="clinical-link-button" type="button" :disabled="isBusy" @click="undoQuickAction">Deshacer</button>
          </p>
          <p v-if="dynamicSectionHasMissing(section)" class="form-warning section-warning-legacy">
            Completa los datos obligatorios de esta sección antes de finalizar.
          </p>

          <div v-if="section.key === 'identification'" class="read-grid">
            <div
              v-for="field in activeDynamicFields(section)"
              :key="field.key"
              :id="`history-field-${section.key}-${field.key}`"
              tabindex="-1"
              :class="{ 'field-missing': dynamicFieldHasMissing(section, field) }"
            >
              <span>{{ field.label }}</span>
              <strong>{{ displayDynamicFieldValue(section, field) }}</strong>
              <small v-if="field.help_text || field.help">{{ field.help_text || field.help }}</small>
              <small v-if="dynamicFieldHasMissing(section, field)" class="field-required-note">Este campo es obligatorio para finalizar.</small>
            </div>
          </div>

          <div v-else class="form-grid" :class="{ two: activeDynamicFields(section).length > 1 }">
            <div
              v-for="field in activeDynamicFields(section).filter(item => section.key !== 'allergies_medications' || !['allergy_status', 'allergies'].includes(item.key))"
              :key="field.key"
              :id="`history-field-${section.key}-${field.key}`"
              tabindex="-1"
              :class="['dynamic-field', { 'field-missing': dynamicFieldHasMissing(section, field) }]"
            >
              <div v-if="isReadonlyDynamicField(field)" class="readonly-field">
                <span>{{ fieldLabel(field) }}</span>
                <strong>{{ displayDynamicFieldValue(section, field) }}</strong>
                <small v-if="field.help_text || field.help">{{ field.help_text || field.help }}</small>
              </div>

              <v-textarea
                :id="fieldId(section, field)"
                v-field-error="fieldErrorBinding(section, field)"
                :error-messages="dynamicFieldError(section, field)"
                v-else-if="field.type === 'textarea'"
                :value="getDynamicFieldValue(section, field)"
                :label="fieldLabel(field)"
                :placeholder="dynamicFieldPlaceholder(section, field)"
                :hint="field.help_text || field.help || ''"
                :persistent-hint="Boolean(field.help_text || field.help)"
                outlined
                rows="2"
                auto-grow
                :readonly="!canEditForm"
                :counter="5000"
                @input="setDynamicFieldValue(section, field, $event)"
              />

              <v-select
                :id="fieldId(section, field)"
                v-field-error="fieldErrorBinding(section, field)"
                :error-messages="dynamicFieldError(section, field)"
                v-else-if="field.type === 'select'"
                :value="getDynamicFieldValue(section, field)"
                :items="fieldOptions(field)"
                item-text="label"
                item-value="value"
                :label="fieldLabel(field)"
                :hint="field.help_text || field.help || ''"
                :persistent-hint="Boolean(field.help_text || field.help)"
                outlined
                dense
                :readonly="!canEditForm"
                :disabled="!canEditForm"
                @input="setDynamicFieldValue(section, field, $event)"
              />

              <v-select
                :id="fieldId(section, field)"
                v-field-error="fieldErrorBinding(section, field)"
                :error-messages="dynamicFieldError(section, field)"
                v-else-if="field.type === 'multiselect'"
                :value="getDynamicFieldValue(section, field)"
                :items="fieldOptions(field)"
                item-text="label"
                item-value="value"
                :label="fieldLabel(field)"
                :hint="field.help_text || field.help || ''"
                :persistent-hint="Boolean(field.help_text || field.help)"
                outlined
                dense
                multiple
                chips
                small-chips
                :readonly="!canEditForm"
                :disabled="!canEditForm"
                @input="setDynamicFieldValue(section, field, $event)"
              />

              <v-checkbox
                :id="fieldId(section, field)"
                v-field-error="fieldErrorBinding(section, field)"
                :error-messages="dynamicFieldError(section, field)"
                v-else-if="field.type === 'checkbox'"
                :input-value="Boolean(getDynamicFieldValue(section, field))"
                :label="fieldLabel(field)"
                :hint="field.help_text || field.help || ''"
                :persistent-hint="Boolean(field.help_text || field.help)"
                :readonly="!canEditForm"
                :disabled="!canEditForm"
                @change="setDynamicFieldValue(section, field, $event)"
              />

              <v-switch
                :id="fieldId(section, field)"
                v-field-error="fieldErrorBinding(section, field)"
                :error-messages="dynamicFieldError(section, field)"
                v-else-if="field.type === 'boolean'"
                :input-value="Boolean(getDynamicFieldValue(section, field))"
                :label="fieldLabel(field)"
                :hint="field.help_text || field.help || ''"
                :persistent-hint="Boolean(field.help_text || field.help)"
                :readonly="!canEditForm"
                :disabled="!canEditForm"
                inset
                @change="setDynamicFieldValue(section, field, $event)"
              />

              <v-text-field
                :id="fieldId(section, field)"
                v-field-error="fieldErrorBinding(section, field)"
                :error-messages="dynamicFieldError(section, field)"
                v-else
                :value="getDynamicFieldValue(section, field)"
                :type="field.type === 'number' ? 'number' : (field.type === 'date' ? 'date' : 'text')"
                :label="fieldLabel(field)"
                :placeholder="dynamicFieldPlaceholder(section, field)"
                :hint="field.help_text || field.help || ''"
                :persistent-hint="Boolean(field.help_text || field.help)"
                outlined
                dense
                :readonly="!canEditForm"
                :disabled="!canEditForm"
                @input="setDynamicFieldValue(section, field, $event)"
              />
              <small v-if="dynamicFieldHasMissing(section, field)" class="field-required-note">Este campo es obligatorio para finalizar.</small>
            </div>
          </div>
          </div>
          <footer v-if="isDraft" class="section-step-footer">
            <button class="clinical-button secondary" type="button" :disabled="!previousDynamicSection" @click="goToPreviousSection">
              Anterior
            </button>
            <button class="clinical-button primary" type="button" :disabled="isBusy || !contextReady || !canEditDraftPermission" @click="saveDraft()">
              Guardar borrador
            </button>
            <button class="clinical-button secondary" type="button" :disabled="!nextDynamicSection" @click="goToNextSection">
              Siguiente
            </button>
          </footer>
        </article>
          </div>
        </div>
      </template>

      <template v-else>
      <article class="clinical-section">
        <header>
          <p class="section-kicker">Responsable</p>
          <h3>Doctor responsable</h3>
          <span>Este doctor revisará y finalizará la historia clínica.</span>
        </header>
        <div class="doctor-summary">
          <span>Doctor responsable</span>
          <strong>{{ selectedDoctorLabel }}</strong>
          <small>Este doctor revisará y finalizará la historia clínica.</small>
        </div>
        <v-select
          v-model="doctorResponsibleUserId"
          :items="doctorOptions"
          item-text="label"
          item-value="value"
          label="Doctor responsable"
          outlined
          dense
          :readonly="!canEditForm"
          :disabled="!canEditForm"
        />
        <p v-if="doctorResponsibleWarning" class="form-warning">{{ doctorResponsibleWarning }}</p>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Identificación</p>
          <h3>Ficha de identificación clínica</h3>
          <span>Resumen de los datos del paciente guardados en esta historia clínica.</span>
        </header>
        <div class="read-grid">
          <div v-for="item in identificationDisplay" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Consulta</p>
          <h3>Motivo y padecimiento actual</h3>
          <span>Registra el motivo principal de atención y el padecimiento actual.</span>
        </header>
        <div class="form-grid">
          <v-textarea v-model="form.consultation.reason" label="Motivo de consulta" outlined rows="2" :readonly="!canEditForm" :counter="500" />
          <v-textarea v-model="form.consultation.current_condition" label="Padecimiento actual" outlined rows="3" :readonly="!canEditForm" :counter="1500" />
          <v-text-field v-model="form.consultation.evolution_time" label="Tiempo de evolución" outlined dense :readonly="!canEditForm" />
          <v-textarea v-model="form.consultation.main_symptoms" label="Síntomas principales" outlined rows="2" :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Antecedentes</p>
          <h3>Antecedentes heredofamiliares</h3>
          <span>Incluye enfermedades familiares o datos relevantes para el riesgo clínico.</span>
        </header>
        <div class="form-grid">
          <v-textarea v-model="form.family_history.relevant" label="Antecedentes heredofamiliares relevantes" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.family_history.family_diseases" label="Enfermedades familiares" outlined rows="3" :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Antecedentes</p>
          <h3>Antecedentes personales patológicos</h3>
          <span>Registra padecimientos, cirugías, hospitalizaciones y otros antecedentes médicos.</span>
        </header>
        <div class="form-grid two">
          <v-textarea v-model="form.pathological_history.current_or_previous_diseases" label="Enfermedades previas o actuales" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.pathological_history.surgeries" label="Cirugías previas" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.pathological_history.hospitalizations" label="Hospitalizaciones" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.pathological_history.trauma" label="Traumatismos" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.pathological_history.transfusions" label="Transfusiones" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.pathological_history.other" label="Otros antecedentes relevantes" outlined rows="3" :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Antecedentes</p>
          <h3>Antecedentes personales no patológicos</h3>
          <span>Describe hábitos y entorno general del paciente.</span>
        </header>
        <div class="form-grid two">
          <v-textarea v-model="form.non_pathological_history.smoking" label="Tabaquismo" outlined rows="2" :readonly="!canEditForm" />
          <v-textarea v-model="form.non_pathological_history.alcohol" label="Alcohol" outlined rows="2" :readonly="!canEditForm" />
          <v-textarea v-model="form.non_pathological_history.physical_activity" label="Actividad física" outlined rows="2" :readonly="!canEditForm" />
          <v-textarea v-model="form.non_pathological_history.diet" label="Alimentación" outlined rows="2" :readonly="!canEditForm" />
          <v-textarea v-model="form.non_pathological_history.housing_environment" label="Vivienda / entorno" outlined rows="2" :readonly="!canEditForm" />
          <v-textarea v-model="form.non_pathological_history.hygiene_general_habits" label="Higiene / hábitos generales" outlined rows="2" :readonly="!canEditForm" />
          <v-textarea v-model="form.non_pathological_history.other_habits" label="Otros hábitos relevantes" outlined rows="2" :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Seguridad clínica</p>
          <h3>Alergias y medicamentos actuales</h3>
          <span>Datos clave para reducir riesgos durante la atención.</span>
        </header>
        <div class="form-grid">
          <div><strong>{{ allergyStateLabel }}</strong><p>{{ form.allergies_medications.allergies || 'Consulta al paciente para registrar el estado.' }}</p><button v-if="isDraft && canReviewAllergies" type="button" class="clinical-button secondary" @click="$emit('edit-allergies', form.allergies_medications.legacy_allergies || '')">Revisar alergias</button></div>
          <v-textarea v-model="form.allergies_medications.current_medications" label="Medicamentos actuales" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.allergies_medications.known_adverse_reactions" label="Reacciones adversas conocidas" outlined rows="3" :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Interrogatorio</p>
          <h3>Interrogatorio por aparatos y sistemas</h3>
          <span>En esta tanda se captura como texto libre.</span>
        </header>
        <v-textarea v-model="form.systems_review.review" label="Revisión por aparatos y sistemas" outlined rows="4" :readonly="!canEditForm" />
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Exploración</p>
          <h3>Exploración física</h3>
          <span>Describe hallazgos generales y datos relevantes.</span>
        </header>
        <div class="form-grid">
          <v-textarea v-model="form.physical_exam.general" label="Exploración física general" outlined rows="4" :readonly="!canEditForm" />
          <v-textarea v-model="form.physical_exam.relevant_findings" label="Hallazgos relevantes" outlined rows="3" :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Signos vitales</p>
          <h3>Signos vitales</h3>
          <span>Todos los campos son opcionales. No se precargan valores falsos.</span>
        </header>
        <div class="form-grid vitals">
          <v-text-field v-model="form.vital_signs.blood_pressure" label="Presión arterial" outlined dense :readonly="!canEditForm" />
          <v-text-field v-model="form.vital_signs.heart_rate" label="Frecuencia cardiaca" outlined dense :readonly="!canEditForm" />
          <v-text-field v-model="form.vital_signs.respiratory_rate" label="Frecuencia respiratoria" outlined dense :readonly="!canEditForm" />
          <v-text-field v-model="form.vital_signs.temperature" label="Temperatura" outlined dense :readonly="!canEditForm" />
          <v-text-field v-model="form.vital_signs.oxygen_saturation" label="Saturación de oxígeno" outlined dense :readonly="!canEditForm" />
          <v-text-field v-model="form.vital_signs.weight" label="Peso" outlined dense :readonly="!canEditForm" @input="updateBmi" />
          <v-text-field v-model="form.vital_signs.height" label="Talla" outlined dense :readonly="!canEditForm" @input="updateBmi" />
          <v-text-field v-model="form.vital_signs.bmi" label="IMC" outlined dense :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Estudios</p>
          <h3>Estudios y resultados</h3>
          <span>Registra estudios previos, resultados actuales y observaciones.</span>
        </header>
        <div class="form-grid">
          <v-textarea v-model="form.studies_results.previous_studies" label="Estudios previos relevantes" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.studies_results.current_results" label="Resultados actuales" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.studies_results.lab_imaging_observations" label="Observaciones de laboratorio/gabinete" outlined rows="3" :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Diagnóstico</p>
          <h3>Diagnósticos o problemas clínicos</h3>
          <span>Captura el diagnóstico inicial y problemas relevantes.</span>
        </header>
        <div class="form-grid">
          <v-textarea v-model="form.diagnosis.initial_diagnosis" label="Diagnóstico inicial" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.diagnosis.clinical_problems" label="Problemas clínicos identificados" outlined rows="3" :readonly="!canEditForm" />
          <v-text-field v-model="form.diagnosis.diagnostic_code" label="Código diagnóstico (opcional)" outlined dense :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Pronóstico</p>
          <h3>Pronóstico</h3>
          <span>Registra el pronóstico clínico inicial.</span>
        </header>
        <v-textarea v-model="form.prognosis.prognosis" label="Pronóstico" outlined rows="3" :readonly="!canEditForm" />
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Plan inicial</p>
          <h3>Indicación terapéutica / plan inicial</h3>
          <span>Describe indicaciones, tratamiento inicial y recomendaciones generales.</span>
        </header>
        <div class="form-grid">
          <v-textarea v-model="form.therapeutic_plan.initial_indications" label="Indicaciones iniciales" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.therapeutic_plan.initial_plan" label="Plan terapéutico inicial" outlined rows="3" :readonly="!canEditForm" />
          <v-textarea v-model="form.therapeutic_plan.general_recommendations" label="Recomendaciones generales" outlined rows="3" :readonly="!canEditForm" />
        </div>
      </article>

      <article class="clinical-section">
        <header>
          <p class="section-kicker">Observaciones</p>
          <h3>Observaciones generales</h3>
          <span>Notas adicionales que ayudan a contextualizar la historia clínica.</span>
        </header>
        <v-textarea v-model="form.observations.general" label="Observaciones generales" outlined rows="4" :readonly="!canEditForm" />
      </article>
      </template>
    </section>

    <v-dialog content-class="clinical-history-dialog" :persistent="isBusy" v-model="showStartHistoryDialog" max-width="680">
      <div @keydown="trapDialogFocus" v-dialog-name="'Iniciar historia clínica'" class="dialog-card start-history-dialog">
        <header>
          <p class="section-kicker">Iniciar historia clínica</p>
          <h3>Iniciar historia clínica</h3>
          <p>Al continuar se guardará un borrador con {{ activeTemplateLabel }} v{{ activeTemplateVersion }}. Podrás completarlo después.</p>
        </header>
        <div class="start-options">
          <button
            type="button"
            :class="['start-option-card', { selected: startHistoryMode === 'blank' }]"
            :aria-pressed="String(startHistoryMode === 'blank')"
            @click="startHistoryMode = 'blank'"
          >
            <strong>Crear en blanco</strong>
            <span>Incluye la identificación del paciente y deja la captura clínica vacía.</span>
          </button>
          <button
            type="button"
            :class="['start-option-card', { selected: startHistoryMode === 'legacy' }]"
            :aria-pressed="String(startHistoryMode === 'legacy')"
            @click="startHistoryMode = 'legacy'"
          >
            <strong>Usar datos del expediente</strong>
            <span>Usa los datos básicos del paciente como punto de partida.</span>
          </button>
        </div>
        <p v-if="saveError" class="form-warning" role="alert">{{ saveError }}</p>
        <div class="button-row dialog-actions">
          <button class="clinical-button secondary" type="button" :disabled="isBusy" @click="showStartHistoryDialog = false">Cancelar</button>
          <button class="clinical-button primary" type="button" :disabled="isBusy" @click="confirmStartHistory">
            Continuar
          </button>
        </div>
      </div>
    </v-dialog>

    <v-dialog content-class="clinical-history-dialog" v-model="showFinalizeDialog" max-width="620">
      <div @keydown="trapDialogFocus" v-dialog-name="'Finalizar historia clínica'" class="dialog-card">
        <header>
          <p class="section-kicker">Confirmación</p>
          <h3>Finalizar historia clínica</h3>
          <p>Al finalizar, la historia clínica quedará bloqueada para edición y se conservará como versión histórica del paciente.</p>
        </header>
        <div class="finalize-checklist">
          <div v-for="item in finalizeChecklist" :key="item.label" :class="['check-item', item.ok ? 'ok' : 'warn']">
            <v-icon small>{{ item.ok ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}</v-icon>
            <span>{{ item.label }}</span>
            <strong>{{ item.status }}</strong>
          </div>
        </div>
        <p v-if="finalizeBlockReason" class="block-reason">{{ finalizeBlockReason }}</p>
        <p v-if="saveError" class="form-warning" role="alert">{{ saveError }}</p>
        <div class="button-row">
          <button v-if="requiredPendingCount" class="clinical-link-button" type="button" @click="showFinalizeDialog = false; openPendingSummary()">Ir a datos pendientes</button>
          <button v-if="!hasSignedConsent && !hasConsentRefusal" class="clinical-link-button" type="button" @click="reviewConsent">Revisar consentimiento</button>
        </div>
        <div class="button-row dialog-actions">
          <button class="clinical-button secondary" type="button" @click="showFinalizeDialog = false">Cancelar</button>
          <button class="clinical-button success" type="button" :disabled="isBusy || Boolean(finalizeBlockReason)" @click="finalizeHistory">
            {{ hasConsentRefusal ? 'Marcar incompleta' : 'Finalizar historia clínica' }}
          </button>
        </div>
      </div>
    </v-dialog>

    <v-dialog content-class="clinical-history-dialog" v-model="showPendingDialog" max-width="560">
      <div @keydown="trapDialogFocus" v-dialog-name="'Datos obligatorios pendientes'" class="dialog-card pending-dialog">
        <header>
          <p class="section-kicker">Campos pendientes</p>
          <h3>{{ requiredPendingCount ? 'Completa estos datos para finalizar' : 'Sin campos pendientes' }}</h3>
          <p>{{ requiredPendingCount ? 'Selecciona un pendiente para ir al campo.' : 'Los datos obligatorios están completos.' }}</p>
        </header>
        <div v-if="requiredPendingCount" class="pending-dialog-list">
          <button
            v-for="item in requiredPendingDetails"
            :key="item.key"
            type="button"
            @click="goToPendingField(item)"
          >
            <span>{{ item.sectionLabel || 'Sección' }}</span>
            <strong>{{ item.fieldLabel || item.label }}</strong>
          </button>
        </div>
        <div class="button-row dialog-actions">
          <button class="clinical-button secondary" type="button" @click="showPendingDialog = false">Cerrar</button>
        </div>
      </div>
    </v-dialog>
    <v-dialog content-class="clinical-history-dialog" v-model="showLeaveDialog" persistent max-width="680">
      <div @keydown="trapDialogFocus" @keydown.esc.stop="resolveLeave('stay')" v-dialog-name="'Tienes cambios sin guardar'" class="dialog-card">
        <header><p class="section-kicker">Guardar avances</p><h3>Tienes cambios sin guardar</h3><p>Puedes guardar el borrador antes de salir.</p></header>
        <p v-if="saveError || validationErrors.length" class="form-warning" role="alert">{{ saveError || 'Hay campos que exceden 5000 caracteres. Sigue editando para corregirlos.' }}</p>
        <div class="button-row dialog-actions">
          <button class="clinical-button primary" type="button" :disabled="isBusy" @click="resolveLeave('save')">Guardar y salir</button>
          <button class="clinical-button danger-soft" type="button" :disabled="isBusy" @click="resolveLeave('discard')">Descartar cambios</button>
          <button class="clinical-button secondary" type="button" :disabled="isBusy" @click="resolveLeave('stay')">Seguir editando</button>
        </div>
      </div>
    </v-dialog>
    <v-dialog content-class="clinical-history-dialog" v-model="showQuickActionDialog" max-width="560" @input="closeQuickActionDialog">
      <div @keydown="trapDialogFocus" v-dialog-name="'Reemplazar texto capturado'" class="dialog-card">
        <header><p class="section-kicker">Confirmar atajo</p><h3>Reemplazar texto capturado</h3><p>El campo {{ pendingQuickAction ? pendingQuickAction.field.label : '' }} ya tiene contenido. El atajo lo reemplazará; podrás deshacerlo antes de seguir capturando.</p></header>
        <div class="button-row dialog-actions">
          <button class="clinical-button secondary" type="button" @click="closeQuickActionDialog(false)">Conservar texto</button>
          <button class="clinical-button danger-soft" type="button" @click="confirmQuickAction">Reemplazar texto</button>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import dialogName from '../../../core/directives/dialog-name';
import fieldError from '../../../core/directives/field-error';
import { editorSnapshot, textLengthErrors, canRefreshAllergyRevision } from '../../../domain/clinical-history/history.editor';
import { allergySnapshot, allergyLabels } from '../../../domain/patient/allergy';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { isD2AuthMode } from '../../../services/config/authTransport.config';
import {
  DADocumentService,
  DAPrescriptionService,
  DAClinicalHistoryService,
  DAClinicalHistoryTemplateService
} from '../../../services/context/core-proccess-context';

const emptySnapshot = () => ({
  identification: {
    full_name: '',
    age: '',
    birth_date: '',
    sex: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact: ''
  },
  consultation: {
    reason: '',
    current_condition: '',
    evolution_time: '',
    main_symptoms: ''
  },
  family_history: {
    relevant: '',
    family_diseases: ''
  },
  pathological_history: {
    current_or_previous_diseases: '',
    surgeries: '',
    hospitalizations: '',
    trauma: '',
    transfusions: '',
    other: ''
  },
  non_pathological_history: {
    smoking: '',
    alcohol: '',
    physical_activity: '',
    diet: '',
    housing_environment: '',
    hygiene_general_habits: '',
    other_habits: ''
  },
  allergies_medications: {
    allergies: '',
    current_medications: '',
    known_adverse_reactions: ''
  },
  systems_review: {
    review: ''
  },
  physical_exam: {
    general: '',
    relevant_findings: ''
  },
  vital_signs: {
    blood_pressure: '',
    heart_rate: '',
    respiratory_rate: '',
    temperature: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    bmi: ''
  },
  studies_results: {
    previous_studies: '',
    current_results: '',
    lab_imaging_observations: ''
  },
  diagnosis: {
    initial_diagnosis: '',
    clinical_problems: '',
    diagnostic_code: ''
  },
  prognosis: {
    prognosis: ''
  },
  therapeutic_plan: {
    initial_indications: '',
    initial_plan: '',
    general_recommendations: ''
  },
  observations: {
    general: ''
  }
});

const mergeSnapshot = (base, incoming) => {
  const source = incoming && typeof incoming === 'object' ? incoming : {};
  const result = { ...source };
  Object.keys(base).forEach((section) => {
    result[section] = {
      ...(base[section] || {}),
      ...((source && source[section]) || {})
    };
  });
  return result;
};

export default {
  directives: { dialogName, fieldError },
  props: {
    px: {
      type: Object,
      default: function(){ return {}; }
    }
  },
  data() {
    return {
      clinicalHistory: null,
      clinicalHistoryVersions: [],
      form: emptySnapshot(),
      documents: [],
      templates: [],
      doctors: [],
      doctorResponsibleUserId: null,
      currentTemplate: null,
      currentTemplateSource: '',
      currentTemplateSchema: null,
      templateLoadError: false,
      isBusy: false,
      isLoading: true,
      historyLoaded: false,
      contextError: '',
      savedSnapshot: '',
      saveError: '',
      revisionConflict: false,
      showValidation: false,
      showLeaveDialog: false,
      showQuickActionDialog: false,
      pendingQuickAction: null,
      lastQuickAction: null,
      loadRequest: 0,
      versionsLoading: false,
      loadError: false,
      versionsLoadError: false,
      showFinalizeDialog: false,
      showVersionsPanel: false,
      showRegisteredData: false,
      showStartHistoryDialog: false,
      showPendingDialog: false,
      openClinicalSections: [],
      activeClinicalSectionKey: '',
      startHistoryMode: 'blank'
    };
  },
  computed: {
    canReviewAllergies() { return this.hasPermission('clinical_history.edit_draft'); },
    allergyStateLabel() { return allergyLabels[this.form.allergies_medications.allergy_status] || (this.isDraft ? 'Alergias sin revisar' : 'Registro de alergias de esta versión'); },
    ...mapGetters(moduleTypes.AUTH, {
      hasPermission: fnTypes.hasPermission,
      authUser: fnTypes.getUser,
      authRole: fnTypes.getRole
    }),
    patientId() {
      return this.px && this.px.person ? this.px.person.id_person : null;
    },
    isDraft() {
      return this.clinicalHistory && this.clinicalHistory.status === 'DRAFT';
    },
    isFinalized() {
      return this.clinicalHistory && this.clinicalHistory.status === 'FINALIZED';
    },
    isIncomplete() {
      return this.clinicalHistory && this.clinicalHistory.status === 'INCOMPLETE';
    },
    canEditForm() {
      return Boolean(this.clinicalHistory && this.isDraft && this.canEditDraftPermission && !this.isBusy && !this.isLoading);
    },
    contextReady() { return this.historyLoaded && !this.isLoading && !this.loadError && !this.contextError && (!this.templateLoadError || Boolean(this.historyTemplateSchema)); },
    dirty() { return Boolean(this.isDraft && this.savedSnapshot && this.savedSnapshot !== editorSnapshot(this.form, this.doctorResponsibleUserId)); },
    validationErrors() { return this.showValidation ? textLengthErrors(this.form, this.dynamicSections) : []; },
    canCancelDraft() { return this.hasPermission('clinical_history.cancel'); },
    canCreateNewVersion() {
      return Boolean(
        this.clinicalHistory &&
        ['FINALIZED', 'INCOMPLETE'].includes(this.clinicalHistory.status) &&
        this.canCreateDraft
      );
    },
    canViewVersions() {
      return this.hasPermission('clinical_history.view');
    },
    canPrintClinicalHistory() {
      return this.hasPermission('clinical_history.print') || this.hasPermission('clinical_history.view');
    },
    canCreateDraft() {
      return this.hasPermission('clinical_history.create_draft');
    },
    showCreatePatientNotice() {
      return Boolean(this.$route && this.$route.query && this.$route.query.fromCreatePatient === '1');
    },
    canEditDraftPermission() {
      return this.hasPermission('clinical_history.edit_draft');
    },
    latestVersionId() {
      const first = this.clinicalHistoryVersions.find((item) => item.status !== 'CANCELLED') || this.clinicalHistoryVersions[0];
      return first ? first.id_clinical_history : null;
    },
    activeDraftVersion() {
      return this.clinicalHistoryVersions.find((item) => item.status === 'DRAFT') || null;
    },
    historyVersionNotice() {
      if(!this.clinicalHistory) {
        return '';
      }
      if(this.isDraft) {
        return '';
      }
      if(this.latestVersionId && this.clinicalHistory.id_clinical_history !== this.latestVersionId) {
        return 'Estás viendo una versión histórica de la historia clínica.';
      }
      return 'Estás viendo la versión actual.';
    },
    statusTone() {
      if(!this.clinicalHistory) {
        return 'neutral';
      }
      if(this.isDraft) {
        return 'draft';
      }
      if(this.isFinalized) {
        return 'finalized';
      }
      if(this.isIncomplete) {
        return 'incomplete';
      }
      if(this.clinicalHistory.status === 'CANCELLED') {
        return 'cancelled';
      }
      return 'neutral';
    },
    clinicalHistoryStatusLabel() {
      if(!this.clinicalHistory) {
        return 'Sin historia';
      }
      const labels = {
        DRAFT: 'Borrador',
        FINALIZED: 'Finalizada',
        INCOMPLETE: 'Incompleta',
        CANCELLED: 'Cancelada',
        SUPERSEDED: 'Histórica'
      };
      return labels[this.clinicalHistory.status] || 'Sin historia';
    },
    clinicalHistoryHelpText() {
      if(!this.clinicalHistory) {
        return 'Este paciente aún no tiene una historia clínica formal. Puedes crear un borrador sin cambiar los datos del expediente.';
      }
      if(this.isDraft) {
        return 'Puedes guardar avances. Para finalizar, se necesita consentimiento firmado y un doctor responsable.';
      }
      if(this.isFinalized) {
        return 'Esta historia ya está finalizada. Puedes consultarla, pero no editarla.';
      }
      if(this.isIncomplete) {
        return 'La historia quedó incompleta porque falta el consentimiento firmado.';
      }
      return 'Esta historia se muestra solo para consulta.';
    },
    historyTemplateSchema() {
      if(!this.clinicalHistory || !this.clinicalHistory.template_snapshot_json) {
        return null;
      }
      const schema = this.normalizeTemplateSchema(this.clinicalHistory.template_snapshot_json);
      return this.isValidTemplateSchema(schema) ? schema : null;
    },
    activeSchema() {
      if(this.historyTemplateSchema) {
        return this.historyTemplateSchema;
      }
      return this.isValidTemplateSchema(this.currentTemplateSchema) ? this.currentTemplateSchema : null;
    },
    useDynamicSchema() {
      return Boolean(this.activeSchema);
    },
    templateWarningText() {
      if(this.useDynamicSchema) {
        return '';
      }
      if(this.templateLoadError || (this.clinicalHistory && this.clinicalHistory.template_snapshot_json)) {
        return 'No se pudo cargar el formato configurado. Se mostrará el formulario base.';
      }
      return '';
    },
    activeTemplateLabel() {
      if(this.historyTemplateSchema) {
        return this.clinicalHistory.template_name || 'Formato usado al crear esta historia';
      }
      return this.currentTemplate && this.currentTemplate.name ? this.currentTemplate.name : 'Formato actual del consultorio';
    },
    activeTemplateVersion() {
      if(this.historyTemplateSchema) {
        return this.clinicalHistory.template_version_number || '1';
      }
      return this.currentTemplate && this.currentTemplate.version_number ? this.currentTemplate.version_number : '1';
    },
    activeTemplateHelp() {
      if(this.historyTemplateSchema) {
        return 'Esta historia usa el formato con el que fue creada.';
      }
      return 'Esta historia clínica usa el formato actual del consultorio.';
    },
    dynamicSections() {
      const schema = this.activeSchema;
      if(!schema || !Array.isArray(schema.sections)) {
        return [];
      }
      return schema.sections
        .filter((section) => section && section.enabled !== false)
        .slice()
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    },
    activeDynamicSection() {
      if(!this.dynamicSections.length) {
        return null;
      }
      return this.dynamicSections.find((section) => section.key === this.activeClinicalSectionKey) || this.dynamicSections[0];
    },
    visibleDynamicSections() {
      if(!this.isDraft) {
        return this.dynamicSections;
      }
      return this.activeDynamicSection ? [this.activeDynamicSection] : [];
    },
    activeSectionIndex() {
      if(!this.activeDynamicSection) {
        return -1;
      }
      return this.dynamicSections.findIndex((section) => section.key === this.activeDynamicSection.key);
    },
    previousDynamicSection() {
      return this.activeSectionIndex > 0 ? this.dynamicSections[this.activeSectionIndex - 1] : null;
    },
    nextDynamicSection() {
      return this.activeSectionIndex >= 0 && this.activeSectionIndex < this.dynamicSections.length - 1
        ? this.dynamicSections[this.activeSectionIndex + 1]
        : null;
    },
    totalCaptureSections() {
      return this.useDynamicSchema ? this.dynamicSections.length : 7;
    },
    requiredPendingDetails() {
      if(!this.useDynamicSchema) {
        return this.criticalFieldsStatus.map((label, index) => ({
          key: `legacy-${index}`,
          label
        }));
      }
      const missing = [];
      this.dynamicSections.forEach((section) => {
        this.activeDynamicFields(section).forEach((field) => {
          if(field.required && this.isDynamicFieldMissing(section, field)) {
            missing.push({
              key: `${section.key}-${field.key}`,
              sectionKey: section.key,
              sectionLabel: section.label,
              fieldKey: field.key,
              fieldLabel: field.label,
              label: field.label || 'Campo requerido'
            });
          }
        });
      });
      return missing;
    },
    requiredPendingCount() {
      return this.requiredPendingDetails.length;
    },
    requiredPendingPreview() {
      return this.requiredPendingDetails.slice(0, 4);
    },
    sectionProgressItems() {
      return this.dynamicSections.map((section) => ({
        key: section.key,
        label: section.label,
        ...this.sectionProgress(section)
      }));
    },
    requiredFieldsTotal() {
      if(!this.useDynamicSchema) {
        return 7;
      }
      return this.sectionProgressItems.reduce((sum, item) => sum + item.required, 0);
    },
    requiredFieldsCompleted() { return Math.max(0, this.requiredFieldsTotal - this.requiredPendingCount); },
    completedSectionsCount() { return this.sectionProgressItems.filter(item => item.tone === 'complete').length; },
    captureProgressPercent() {
      if(!this.requiredFieldsTotal) {
        return 0;
      }
      return Math.min(100, Math.round((this.requiredFieldsCompleted / this.requiredFieldsTotal) * 100));
    },
    metadata() {
      return {
        version: this.clinicalHistory ? this.clinicalHistory.version_number || 'No registrado' : 'No registrado',
        createdAt: this.formatDateTime(this.clinicalHistory && this.clinicalHistory.created_at),
        updatedAt: this.formatDateTime(this.clinicalHistory && this.clinicalHistory.updated_at),
        finalizedAt: this.formatDateTime(this.clinicalHistory && this.clinicalHistory.finalized_at),
        createdBy: this.clinicalHistory && this.clinicalHistory.created_by_name || 'No registrado',
        updatedBy: this.clinicalHistory && (this.clinicalHistory.updated_by_name || this.clinicalHistory.created_by_name) || 'No registrado'
      };
    },
    sensitiveConsent() {
      return this.documents.find((item) => item.document_type === 'SENSITIVE_DATA_CONSENT' && item.status !== 'CANCELADO') || null;
    },
    sensitiveConsentTemplate() {
      return this.templates.find((item) => item.template_type === 'SENSITIVE_DATA_CONSENT') || null;
    },
    hasSignedConsent() {
      return Boolean(this.sensitiveConsent && this.sensitiveConsent.status === 'FIRMADO');
    },
    hasConsentRefusal() {
      return Boolean(this.sensitiveConsent && this.sensitiveConsent.status === 'NO_FIRMADO_POR_NEGATIVA');
    },
    sensitiveConsentTitle() {
      if(this.hasSignedConsent) {
        return 'Firmado';
      }
      if(this.hasConsentRefusal) {
        return 'Negativa registrada';
      }
      if(this.sensitiveConsent) {
        return 'Pendiente';
      }
      return 'Pendiente';
    },
    consentStatusTone() {
      if(this.hasSignedConsent) {
        return 'signed';
      }
      if(this.hasConsentRefusal) {
        return 'refusal';
      }
      return 'pending';
    },
    sensitiveConsentHelpText() {
      if(this.hasSignedConsent) {
        return 'Ya se cuenta con consentimiento firmado. La historia puede finalizarse cuando esté completa.';
      }
      if(this.hasConsentRefusal) {
        return 'Hay una negativa registrada. La historia podrá guardarse como incompleta, no como finalizada.';
      }
      if(this.sensitiveConsent) {
        return 'Puedes guardar el borrador. Para finalizar, falta capturar la firma o registrar una negativa.';
      }
      return 'Puedes guardar un borrador. Para finalizar la historia será necesario contar con consentimiento firmado o registrar una negativa.';
    },
    doctorOptions() {
      return this.doctors
        .filter((doctor) => doctor && doctor.id_login)
        .map((doctor) => ({
          value: doctor.id_login,
          label: this.doctorLabel(doctor),
          doctor
        }));
    },
    selectedDoctor() {
      const option = this.doctorOptions.find((item) => item.value === this.doctorResponsibleUserId);
      return option ? option.doctor : null;
    },
    selectedDoctorLabel() {
      if(this.clinicalHistory && !this.isDraft) {
        const identity = this.clinicalHistory.responsible_snapshot_json;
        return identity && identity.professional_name ? this.doctorLabel(identity) : 'Identidad histórica no disponible';
      }
      return this.selectedDoctor ? this.doctorLabel(this.selectedDoctor) : 'No registrado';
    },
    selectedDoctorProfileReady() {
      return this.isDoctorProfileReady(this.selectedDoctor);
    },
    doctorResponsibleWarning() {
      if(!this.isDraft) {
        return '';
      }
      if(!this.doctorResponsibleUserId) {
        return 'Selecciona un doctor responsable antes de finalizar.';
      }
      if(!this.selectedDoctor) {
        return 'No se pudo validar el perfil profesional del doctor responsable.';
      }
      if(!this.selectedDoctorProfileReady) {
        return 'El doctor responsable debe tener perfil profesional completo para finalizar.';
      }
      return '';
    },
    currentUserPayload() {
      return this.currentUser();
    },
    currentUserRole() {
      return String(this.currentUserPayload.rol || this.currentUserPayload.role || '').toUpperCase();
    },
    currentDoctorProfile() {
      const currentId = this.currentUserPayload.id_login || this.currentUserPayload.id_user || this.currentUserPayload.user_id;
      return this.doctors.find((doctor) => doctor.id_login === currentId && this.isDoctorProfileReady(doctor)) || null;
    },
    canCurrentUserFinalize() {
      const allowedRoles = ['ADMIN', 'BUSINESS_ADMIN', 'DOCTOR'];
      return this.hasPermission('clinical_history.finalize') && allowedRoles.includes(this.currentUserRole) && Boolean(this.currentDoctorProfile);
    },
    legacyIdentification() {
      return this.buildIdentificationSnapshot();
    },
    legacyConsultation() {
      return {
        reason: this.valueOrEmpty(this.px && this.px.query ? this.px.query.reason_consultation : ''),
        currentCondition: this.valueOrEmpty(this.px && this.px.query ? this.px.query.current_condition : '')
      };
    },
    identificationDisplay() {
      const identification = this.form.identification || {};
      return [
        { label: 'Nombre completo', value: this.valueOrEmpty(identification.full_name) },
        { label: 'Edad', value: this.valueOrEmpty(identification.age) },
        { label: 'Fecha de nacimiento', value: this.valueOrEmpty(identification.birth_date) },
        { label: 'Sexo', value: this.valueOrEmpty(identification.sex) },
        { label: 'Teléfono', value: this.valueOrEmpty(identification.phone) },
        { label: 'Correo', value: this.valueOrEmpty(identification.email) },
        { label: 'Dirección', value: this.valueOrEmpty(identification.address) },
        { label: 'Contacto de emergencia', value: this.valueOrEmpty(identification.emergency_contact) }
      ];
    },
    formModeTitle() {
      if(this.isDraft) {
        return 'Borrador editable';
      }
      if(this.isFinalized) {
        return 'Historia finalizada';
      }
      if(this.isIncomplete) {
        return 'Historia incompleta';
      }
      return 'Historia clínica';
    },
    formModeHelp() {
      if(this.isDraft) {
        return 'Puedes guardar avances las veces que necesites. Al finalizar, esta versión quedará bloqueada.';
      }
      if(this.isFinalized) {
        return 'Esta versión se conserva sin cambios. Para actualizar la historia, crea una nueva versión.';
      }
      if(this.isIncomplete) {
        return 'Se muestra solo para consulta. Cuando se resuelva el consentimiento, puedes crear una nueva versión.';
      }
      return '';
    },
    criticalFieldsStatus() {
      if(this.useDynamicSchema) {
        return this.dynamicMissingRequiredFields();
      }
      const missing = [];
      if(!this.hasText(this.form.consultation.reason)) missing.push('Motivo de consulta');
      if(!this.hasText(this.form.consultation.current_condition)) missing.push('Padecimiento actual');
      if(!this.hasText(this.form.family_history.relevant) && !this.hasText(this.form.pathological_history.current_or_previous_diseases)) missing.push('Antecedentes relevantes');
      if(!['HAS_ALLERGIES', 'NONE_KNOWN', 'UNKNOWN'].includes(this.form.allergies_medications.allergy_status)) missing.push('Estado de alergias');
      if(!this.hasText(this.form.physical_exam.general)) missing.push('Exploración física');
      if(!this.hasText(this.form.diagnosis.initial_diagnosis)) missing.push('Diagnóstico inicial');
      if(!this.hasText(this.form.therapeutic_plan.initial_plan) && !this.hasText(this.form.therapeutic_plan.initial_indications)) missing.push('Plan inicial');
      return missing;
    },
    finalizeChecklist() {
      const consentOk = this.hasSignedConsent || this.hasConsentRefusal;
      const doctorOk = Boolean(this.doctorResponsibleUserId) && this.selectedDoctorProfileReady;
      const permissionOk = this.canCurrentUserFinalize;
      const fieldsOk = this.criticalFieldsStatus.length === 0;
      return [
        {
          label: 'Usuario autorizado',
          ok: permissionOk,
          status: permissionOk ? 'Listo' : 'Debe finalizar un doctor o administrador con perfil activo'
        },
        {
          label: 'Consentimiento de datos personales sensibles',
          ok: consentOk,
          status: this.hasSignedConsent ? 'Firmado' : (this.hasConsentRefusal ? 'Negativa' : 'Pendiente')
        },
        {
          label: 'Doctor responsable',
          ok: doctorOk,
          status: doctorOk ? this.selectedDoctorLabel : 'Falta seleccionar doctor responsable'
        },
        {
          label: 'Datos obligatorios del formato',
          ok: fieldsOk,
          status: fieldsOk ? 'Listos' : `Falta completar: ${this.criticalFieldsStatus.join(', ')}`
        }
      ];
    },
    finalizeBlockReason() {
      if(!this.contextReady) return 'Espera a que cargue el contexto o reintenta la carga antes de finalizar.';
      if(!this.isDraft) {
        return 'Solo se puede finalizar una historia en borrador.';
      }
      if(!this.canCurrentUserFinalize) {
        return 'Solo un doctor o administrador con perfil profesional activo puede finalizar esta historia.';
      }
      if(!this.doctorResponsibleUserId) {
        return 'Selecciona un doctor responsable antes de finalizar.';
      }
      if(this.doctorResponsibleWarning) {
        return this.doctorResponsibleWarning;
      }
      if(!this.hasSignedConsent && !this.hasConsentRefusal) {
        return 'Para finalizar, primero registra el consentimiento firmado o una negativa.';
      }
      if(this.criticalFieldsStatus.length) {
        return `Completa estos datos antes de finalizar: ${this.criticalFieldsStatus.join(', ')}.`;
      }
      return '';
    }
  },
  watch: {
    'px.allergy': function(record) {
      if(!this.isDraft || !record) return;
      this.$set(this.form, 'allergies_medications', allergySnapshot(this.form.allergies_medications, record));
      if(this.savedSnapshot) {
        const saved = JSON.parse(this.savedSnapshot);
        saved.form.allergies_medications = allergySnapshot(saved.form.allergies_medications, record);
        this.savedSnapshot = editorSnapshot(saved.form, saved.doctorId);
      }
      this.refreshAllergyRevision(record);
    },
    px: {
      handler(value, previous) {
        if(this.patientId && (!previous || !previous.person || previous.person.id_person !== this.patientId)) {
          this.loadInitialData();
        }
      },
      deep: false
    }
  },
  mounted() {
    this.$emit('register-navigation-guard', this.confirmLeave);
    this.loadInitialData();
    window.addEventListener('beforeunload', this.beforeUnload);
    this.removeNavigationGuard = this.$router.beforeEach((to, from, next) => {
      this.confirmLeave().then(allowed => next(allowed)).catch(() => next(false));
    });
  },
  beforeDestroy() {
    this.$emit('register-navigation-guard', null);
    this.loadRequest++;
    window.removeEventListener('beforeunload', this.beforeUnload);
    if(this.removeNavigationGuard) this.removeNavigationGuard();
    clearTimeout(this.fieldFocusTimer);
    if(this.leaveResolver) this.leaveResolver(false);
  },
  methods: {
    async loadInitialData() {
      if(!this.patientId || this.isBusy) return;
      const request = ++this.loadRequest;
      const patientId = this.patientId;
      const preserveDraft = this.dirty;
      this.isLoading = true;
      try {
        await Promise.all([
          this.loadConsentStatus(request, patientId),
          this.loadClinicalHistory(request, patientId, preserveDraft),
          this.loadCurrentTemplate(request),
          this.loadClinicalHistoryVersions(request, patientId)
        ]);
        if(request !== this.loadRequest) return;
        if(this.clinicalHistory && this.activeSchema) {
          this.ensureDynamicSnapshotDefaults(this.activeSchema);
          this.initializeOpenClinicalSections();
        }
        if(!preserveDraft && this.clinicalHistory) this.markSaved();
      } finally {
        if(request === this.loadRequest) this.isLoading = false;
      }
    },
    async loadCurrentTemplate(request = this.loadRequest) {
      this.templateLoadError = false;
      try {
        const response = await DAClinicalHistoryTemplateService.getCurrent();
        if(request !== this.loadRequest) return;
        if(response && response.success && response.data && response.data.template) {
          const template = response.data.template;
          const schema = this.normalizeTemplateSchema(template.schema_json || {});
          if(this.isValidTemplateSchema(schema)) {
            this.currentTemplate = template;
            this.currentTemplateSource = response.data.source || '';
            this.currentTemplateSchema = schema;
            if(this.clinicalHistory && !this.historyTemplateSchema) {
              this.ensureDynamicSnapshotDefaults(schema);
            }
            return;
          }
        }
        this.currentTemplate = null;
        this.currentTemplateSource = '';
        this.currentTemplateSchema = null;
        this.templateLoadError = true;
      } catch (error) {
        if(request !== this.loadRequest) return;
        this.currentTemplate = null;
        this.currentTemplateSource = '';
        this.currentTemplateSchema = null;
        this.templateLoadError = true;
      }
    },
    async loadConsentStatus(request = this.loadRequest, patientId = this.patientId) {
      try {
        const documents = await DADocumentService.getPatientDocuments(patientId);
        const templates = await DADocumentService.getTemplates();
        const doctors = await DAPrescriptionService.doctors();
        if(request !== this.loadRequest) return;
        if(!documents || !documents.success || !templates || !templates.success || !doctors || !doctors.success) throw new Error('Context load failed');
        this.documents = documents.data || [];
        this.templates = templates.data || [];
        this.doctors = doctors.data || [];
        this.contextError = '';
        this.applyDefaultResponsibleDoctor();
      } catch (error) {
        if(request === this.loadRequest) this.contextError = 'No se pudieron verificar el consentimiento y los responsables.';
      }
    },
    async loadClinicalHistory(request = this.loadRequest, patientId = this.patientId, preserveDraft = this.dirty) {
      this.loadError = false;
      try {
        const response = await DAClinicalHistoryService.getByPatient(patientId);
        if(request !== this.loadRequest) return;
        if(!response || !response.success || !response.data) throw new Error('History load failed');
        this.historyLoaded = true;
        if(!preserveDraft) {
          this.clinicalHistory = response.data.history || null;
          if(this.clinicalHistory) this.applyHistoryToForm(this.clinicalHistory);
          else this.form = this.buildLegacySnapshot();
        }
      } catch (error) {
        if(request === this.loadRequest) this.loadError = true;
      }
    },
    async loadClinicalHistoryVersions(request = this.loadRequest, patientId = this.patientId) {
      if(!this.patientId || !this.canViewVersions) {
        this.clinicalHistoryVersions = [];
        return;
      }
      this.versionsLoading = true;
      this.versionsLoadError = false;
      try {
        const response = await DAClinicalHistoryService.getVersionsByPatient(patientId);
        if(request !== this.loadRequest) return;
        if(response && response.success && response.data) {
          this.clinicalHistoryVersions = response.data.versions || [];
          return;
        }
        this.versionsLoadError = true;
      } catch (error) {
        if(request === this.loadRequest) this.versionsLoadError = true;
      } finally {
        if(request === this.loadRequest) this.versionsLoading = false;
      }
    },
    applyHistoryToForm(history) {
      this.form = mergeSnapshot(emptySnapshot(), history.clinical_snapshot_json || {});
      if(history.status === 'DRAFT' && this.px.allergy && Number(this.px.allergy.revision || 0) >= Number(this.form.allergies_medications.allergy_revision || 0)) {
        this.form.allergies_medications = allergySnapshot(this.form.allergies_medications, this.px.allergy);
      }
      this.doctorResponsibleUserId = history.doctor_responsible_user_id || this.doctorResponsibleUserId;
      this.applyDefaultResponsibleDoctor();
      if(this.activeSchema) {
        this.ensureDynamicSnapshotDefaults(this.activeSchema);
        this.initializeOpenClinicalSections();
      }
      this.updateBmi();
      this.markSaved();
    },
    markSaved() {
      this.savedSnapshot = editorSnapshot(this.form, this.doctorResponsibleUserId);
      this.lastQuickAction = null;
      this.saveError = '';
      this.revisionConflict = false;
      this.showValidation = false;
    },
    confirmLeave() {
      if(this.isBusy) return Promise.resolve(false);
      if(!this.dirty) return Promise.resolve(true);
      if(this.leavePromise) return this.leavePromise;
      this.showLeaveDialog = true;
      this.leavePromise = new Promise(resolve => { this.leaveResolver = resolve; });
      return this.leavePromise;
    },
    async resolveLeave(action) {
      if(this.isBusy) return;
      if(action === 'save' && !await this.saveDraft(false)) return;
      if(action === 'discard') {
        const saved = JSON.parse(this.savedSnapshot);
        this.form = saved.form;
        this.doctorResponsibleUserId = saved.doctorId;
        this.lastQuickAction = null;
        this.saveError = '';
        this.showValidation = false;
      }
      this.showLeaveDialog = false;
      const resolve = this.leaveResolver;
      this.leaveResolver = null;
      this.leavePromise = null;
      if(resolve) resolve(action !== 'stay');
    },
    beforeUnload(event) {
      if(this.dirty || this.isBusy) { event.preventDefault(); event.returnValue = ''; }
    },
    trapDialogFocus(event) {
      if(event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll('button, a[href], input, textarea, select, [tabindex]')]
        .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
      if(!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if(event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    },
    applyDefaultResponsibleDoctor() {
      if(this.doctorResponsibleUserId || !this.doctors.length) {
        return;
      }
      const currentUser = this.currentUser();
      const currentDoctor = this.doctors.find((doctor) => doctor.id_login === currentUser.id_login && this.isDoctorProfileReady(doctor));
      if(currentDoctor) {
        this.doctorResponsibleUserId = currentDoctor.id_login;
      }
    },
    buildIdentificationSnapshot() {
      const person = (this.px && this.px.person) || {};
      const address = (this.px && this.px.address) || {};
      const addressText = [address.direction, address.residence, address.cp].filter(Boolean).join(', ');
      const fullName = person.fullname || `${person.name || ''} ${person.surname || ''}`.trim();
      return {
        full_name: fullName || 'No registrado',
        age: this.calculateAge(person.birthday) || person.age || 'No registrado',
        birth_date: person.birthday || 'No registrado',
        sex: person.sex || person.gender || 'No registrado',
        phone: person.telephone || person.local_telephone || 'No registrado',
        email: person.email || 'No registrado',
        address: addressText || 'No registrado',
        emergency_contact: person.emergency_contact || 'No registrado'
      };
    },
    buildLegacySnapshot() {
      const snapshot = emptySnapshot();
      const query = (this.px && this.px.query) || {};
      const allergy = (this.px && this.px.allergy) || {};

      snapshot.identification = this.buildIdentificationSnapshot();
      snapshot.consultation.reason = query.reason_consultation || '';
      snapshot.consultation.current_condition = query.current_condition || '';
      snapshot.allergies_medications = allergySnapshot(snapshot.allergies_medications, allergy);
      snapshot.pathological_history.current_or_previous_diseases = this.pathologicalSummary();
      return snapshot;
    },
    async createDraftFromLegacy() {
      this.form = this.buildLegacySnapshot();
      await this.createDraft('LEGACY_PATIENT_DATA');
    },
    async createBlankDraft() {
      this.form = emptySnapshot();
      this.form.identification = this.buildIdentificationSnapshot();
      await this.createDraft('MANUAL');
    },
    openStartHistoryDialog() {
      if(!this.contextReady || this.isBusy || !this.canCreateDraft) return;
      this.startHistoryMode = 'blank';
      this.showStartHistoryDialog = true;
    },
    async confirmStartHistory() {
      if(!this.contextReady || this.isBusy) return;
      if(this.startHistoryMode === 'legacy') {
        await this.createDraftFromLegacy();
        return;
      }
      await this.createBlankDraft();
    },
    async toggleVersionsPanel() {
      this.showVersionsPanel = !this.showVersionsPanel;
      if(this.showVersionsPanel) {
        await this.loadClinicalHistoryVersions();
      }
    },
    async viewHistoryVersion(version) {
      if(!version || !version.id_clinical_history) {
        return;
      }
      if(!await this.confirmLeave()) return;
      this.isBusy = true;
      try {
        const response = await DAClinicalHistoryService.getById(version.id_clinical_history);
        if(response && response.success && response.data && response.data.history) {
          this.clinicalHistory = response.data.history;
          this.applyHistoryToForm(this.clinicalHistory);
          this.notify('success', version.status === 'DRAFT' ? 'Borrador cargado.' : 'Versión cargada para consulta.');
          return;
        }
        this.notify('error', response && response.message ? response.message : 'No se pudo cargar esta versión.');
      } catch (error) {
        this.saveError = 'No se pudo cargar esta versión. La captura actual se conserva.';
      } finally { this.isBusy = false; }
    },
    async printCurrentClinicalHistory() {
      if(!this.clinicalHistory || !this.clinicalHistory.id_clinical_history) {
        return;
      }
      await this.printClinicalHistoryById(this.clinicalHistory.id_clinical_history);
    },
    async printHistoryVersion(version) {
      if(!version || !version.id_clinical_history) {
        return;
      }
      await this.printClinicalHistoryById(version.id_clinical_history);
    },
    async printClinicalHistoryById(historyId) {
      if(this.isBusy) return;
      if(!this.canPrintClinicalHistory) {
        this.notify('warning', 'No tienes permiso para imprimir historias clínicas.');
        return;
      }

      const printWindow = window.open('', '_blank', 'width=920,height=1100');
      if(!printWindow) {
        this.notify('warning', 'No se pudo abrir la ventana de impresión.');
        return;
      }

      this.isBusy = true;
      try {
        const response = await DAClinicalHistoryService.getById(historyId);
        if(!response || !response.success || !response.data || !response.data.history) {
          printWindow.close();
          this.notify('error', response && response.message ? response.message : 'No se pudo cargar la historia clínica para imprimir.');
          return;
        }

        const html = this.printableClinicalHistoryHtml(response.data);
        DAClinicalHistoryService.markPrinted(historyId).catch(() => {});
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
      } catch (error) {
        printWindow.close();
        this.saveError = 'No se pudo cargar la historia para imprimir. Los datos se conservan; puedes reintentar.';
      } finally { this.isBusy = false; }
    },
    async createDraft(source) {
      if(this.isBusy || !this.contextReady || !this.canCreateDraft) return false;
      this.isBusy = true;
      this.saveError = '';
      try {
        const response = await DAClinicalHistoryService.createDraft({
          patient_id: this.patientId,
          doctor_responsible_user_id: this.doctorResponsibleUserId || null,
          source,
          clinical_snapshot_json: this.buildPayloadSnapshot()
        });
        if(response && response.success && response.data && response.data.history) {
          this.clinicalHistory = response.data.history;
          this.applyHistoryToForm(this.clinicalHistory);
          this.showStartHistoryDialog = false;
          await this.loadClinicalHistoryVersions();
          this.notify('success', 'Borrador guardado correctamente.');
          return true;
        }
        this.saveError = response && response.message ? response.message : 'No se pudo crear el borrador. Reintenta; los datos se conservan.';
      } catch (error) { this.saveError = 'No se pudo crear el borrador. Reintenta; los datos se conservan.'; }
      finally { this.isBusy = false; }
      return false;
    },
    async saveDraft(showMessage = true) {
      if(this.isBusy || !this.contextReady || !this.canEditDraftPermission || !this.isDraft || !this.clinicalHistory) {
        if(!this.contextReady) this.saveError = 'Reintenta la carga del contexto antes de guardar. Los cambios se conservan.';
        return false;
      }
      const validation = this.validateTextLengths();
      if(!validation.ok) {
        this.showValidation = true;
        if(!this.showLeaveDialog) this.focusHistoryField(validation.errors[0]);
        return false;
      }
      this.showValidation = false;
      this.saveError = '';
      this.isBusy = true;
      try {
        const response = await DAClinicalHistoryService.updateDraft(this.clinicalHistory.id_clinical_history, {
          expected_revision: this.clinicalHistory.revision,
          doctor_responsible_user_id: this.doctorResponsibleUserId || null,
          clinical_snapshot_json: this.buildPayloadSnapshot()
        });
        if(response && response.success && response.data && response.data.history) {
          this.clinicalHistory = response.data.history;
          this.applyHistoryToForm(this.clinicalHistory);
          await this.loadClinicalHistoryVersions();
          if(showMessage) {
            this.notify('success', 'Borrador guardado correctamente.');
          }
          return true;
        }
        this.handleRevisionConflict(response);
        this.saveError = response && response.message ? response.message : 'No se pudo guardar el borrador. Reintenta; los cambios se conservan.';
      } catch (error) { this.saveError = 'No se pudo guardar el borrador. Reintenta; los cambios se conservan.'; }
      finally { this.isBusy = false; }
      return false;
    },
    openFinalizeDialog() {
      if(this.isBusy || !this.contextReady) return;
      this.saveError = '';
      this.showFinalizeDialog = true;
    },
    reviewConsent() {
      this.showFinalizeDialog = false;
      this.$nextTick(() => {
        clearTimeout(this.fieldFocusTimer);
        this.fieldFocusTimer = setTimeout(() => {
          const action = this.$el.querySelector('.consent-action-row button');
          if(action) { action.scrollIntoView({ block: 'center' }); action.focus(); }
        }, 300);
      });
    },
    async finalizeHistory() {
      if(this.criticalFieldsStatus.length) {
        this.scrollToFirstMissingRequired();
      }
      if(this.finalizeBlockReason) {
        this.notify('warning', this.finalizeBlockReason);
        return;
      }
      const saved = await this.saveDraft(false);
      if(!saved) {
        return;
      }
      this.isBusy = true;
      try {
        const response = await DAClinicalHistoryService.finalize(this.clinicalHistory.id_clinical_history, this.clinicalHistory.revision);
        if(response && response.success && response.data && response.data.history) {
          this.showFinalizeDialog = false;
          this.clinicalHistory = response.data.history;
          this.applyHistoryToForm(this.clinicalHistory);
          await this.loadClinicalHistoryVersions();
            this.notify('success', this.clinicalHistory.status === 'INCOMPLETE' ? 'Historia guardada como incompleta.' : 'Historia clínica finalizada correctamente.');
          return;
        }
        this.handleRevisionConflict(response);
        this.saveError = response && response.message ? response.message : 'No se pudo finalizar. El borrador guardado se conserva; puedes reintentar.';
      } catch (error) { this.saveError = 'No se pudo finalizar. El borrador guardado se conserva; puedes reintentar.'; }
      finally { this.isBusy = false; }
    },
    async cancelDraft() {
      if(!this.canCancelDraft || !this.isDraft || this.isBusy || !this.contextReady) return;
      const result = await this.confirmDialog('Cancelar borrador', 'El borrador dejará de estar disponible para editarse. Esta acción no cambia historias finalizadas ni documentos firmados.');
      if(!result) {
        return;
      }
      this.isBusy = true;
      try {
        const response = await DAClinicalHistoryService.cancel(this.clinicalHistory.id_clinical_history, {
          expected_revision: this.clinicalHistory.revision,
          reason: 'Cancelado desde Historia clínica'
        });
        if(response && response.success) {
          this.notify('success', 'Borrador cancelado.');
          await Promise.all([
            this.loadClinicalHistory(this.loadRequest, this.patientId, false),
            this.loadClinicalHistoryVersions()
          ]);
          return;
        }
        this.handleRevisionConflict(response);
        this.saveError = response && response.message ? response.message : 'No se pudo cancelar el borrador.';
      } catch (error) { this.saveError = 'No se pudo cancelar el borrador. Puedes reintentar.'; }
      finally { this.isBusy = false; }
    },
    handleRevisionConflict(response) {
      if(response && response.data && response.data.code === 'HISTORY_REVISION_CONFLICT') {
        this.revisionConflict = true;
        this.showFinalizeDialog = false;
        this.showLeaveDialog = false;
        const resolve = this.leaveResolver;
        this.leaveResolver = null;
        this.leavePromise = null;
        if(resolve) resolve(false);
      }
    },
    async refreshAllergyRevision(record) {
      if(this.isBusy || !this.isDraft) return;
      const before = this.clinicalHistory;
      const request = this.loadRequest;
      try {
        const response = await DAClinicalHistoryService.getById(before.id_clinical_history);
        if(request !== this.loadRequest || this.clinicalHistory !== before || this.isBusy) return;
        const after = response && response.success && response.data && response.data.history;
        if(canRefreshAllergyRevision(before, after, record.revision)) this.clinicalHistory = after;
      } catch(error) { /* A later save still checks the server revision and preserves local text. */ }
    },
    downloadLocalCapture() {
      const sections = this.dynamicSections || [];
      const lines = ['Copia de captura local sin guardar', `Doctor responsable: ${this.selectedDoctorLabel}`, ''];
      Object.entries(this.form).forEach(([key, values]) => {
        const section = sections.find(item => item.key === key);
        lines.push(section ? section.label : key.replace(/_/g, ' '));
        Object.entries(values || {}).forEach(([fieldKey, value]) => {
          const field = section && (section.fields || []).find(item => item.key === fieldKey);
          lines.push(`${field ? field.label : fieldKey.replace(/_/g, ' ')}: ${Array.isArray(value) ? value.join(', ') : (value === null || value === undefined ? '' : value)}`);
        });
        lines.push('');
      });
      const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'historia-captura-sin-guardar.txt';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async reloadConflictingHistory() {
      if(this.isBusy || !this.clinicalHistory) return;
      if(!await this.confirmDialog('Cargar versión actual', 'Se reemplazará la captura de este formulario por la versión guardada. Descarga primero tu captura si necesitas conservar o comparar tus cambios.')) return;
      this.isBusy = true;
      try {
        const response = await DAClinicalHistoryService.getById(this.clinicalHistory.id_clinical_history);
        if(response && response.success && response.data && response.data.history) {
          this.clinicalHistory = response.data.history;
          this.applyHistoryToForm(this.clinicalHistory);
          await this.loadClinicalHistoryVersions();
        } else this.saveError = 'No se pudo cargar la versión actual. Tu captura se conserva.';
      } catch(error) { this.saveError = 'No se pudo cargar la versión actual. Tu captura se conserva.'; }
      finally { this.isBusy = false; }
    },
    async createNewVersion() {
      if(this.activeDraftVersion) {
        const resultDraft = await this.confirmDialog('Borrador existente', 'Ya existe un borrador de historia clínica. Puedes continuar editando ese borrador.');
        if(resultDraft) {
          await this.viewHistoryVersion(this.activeDraftVersion);
          this.showVersionsPanel = true;
        }
        return;
      }
      const result = await this.confirmDialog('Crear nueva versión', 'Se creará un nuevo borrador basado en la última historia. La versión anterior se conservará sin cambios.');
      if(!result) {
        return;
      }
      const latestSnapshot = this.buildPayloadSnapshot();
      this.form = mergeSnapshot(emptySnapshot(), latestSnapshot);
      if(!this.selectedDoctor) {
        this.doctorResponsibleUserId = null;
        this.applyDefaultResponsibleDoctor();
      }
      await this.createDraft('MANUAL');
    },
    buildPayloadSnapshot() {
      if(this.activeSchema) {
        this.ensureDynamicSnapshotDefaults(this.activeSchema);
      }
      const snapshot = mergeSnapshot(emptySnapshot(), this.form);
      snapshot.identification = {
        ...snapshot.identification,
        ...this.buildIdentificationSnapshot()
      };
      return snapshot;
    },
    normalizeTemplateSchema(rawSchema) {
      let parsed = rawSchema;
      if(typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (error) {
          parsed = {};
        }
      }
      const schema = parsed && typeof parsed === 'object' ? { ...parsed } : {};
      schema.sections = Array.isArray(schema.sections) ? schema.sections : [];
      schema.sections = schema.sections.map((section, sectionIndex) => ({
        ...section,
        key: section.key || `section_${sectionIndex + 1}`,
        label: section.label || 'Sección sin nombre',
        description: section.description || '',
        enabled: section.enabled !== false,
        order: Number(section.order || sectionIndex + 1),
        fields: Array.isArray(section.fields)
          ? section.fields.map((field, fieldIndex) => ({
            ...field,
            key: field.key || `field_${fieldIndex + 1}`,
            label: field.label || 'Campo sin nombre',
            type: field.type || 'text',
            required: Boolean(field.required),
            enabled: field.enabled !== false
          }))
          : []
      }));
      return schema;
    },
    isValidTemplateSchema(schema) {
      return Boolean(
        schema &&
        typeof schema === 'object' &&
        Array.isArray(schema.sections) &&
        schema.sections.length > 0 &&
        schema.sections.every((section) => section && section.key && section.label && Array.isArray(section.fields))
      );
    },
    ensureDynamicSnapshotDefaults(schema) {
      if(!schema || !Array.isArray(schema.sections)) {
        return;
      }
      schema.sections.forEach((section) => {
        if(!this.form[section.key] || typeof this.form[section.key] !== 'object') {
          this.$set(this.form, section.key, {});
        }
        (section.fields || []).forEach((field) => {
          if(!Object.prototype.hasOwnProperty.call(this.form[section.key], field.key)) {
            this.$set(this.form[section.key], field.key, this.defaultDynamicFieldValue(field));
          }
        });
      });
    },
    defaultDynamicFieldValue(field) {
      if(field.type === 'multiselect') {
        return [];
      }
      if(field.type === 'checkbox' || field.type === 'boolean') {
        return false;
      }
      return '';
    },
    activeDynamicFields(section) {
      return (section.fields || [])
        .filter((field) => field && field.enabled !== false)
        .map(field => section.key === 'allergies_medications' && field.key === 'allergies'
          ? { ...field, required: ['HAS_ALLERGIES', 'UNKNOWN'].includes(this.form.allergies_medications.allergy_status) } : field)
        .slice()
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    },
    sectionKicker(section) {
      if(!section || !(section.system || section.locked)) {
        return 'Sección del consultorio';
      }
      const labels = {
        identification: 'Datos del paciente',
        consultation: 'Consulta inicial',
        family_history: 'Antecedentes',
        pathological_history: 'Antecedentes',
        non_pathological_history: 'Hábitos y entorno',
        allergies_medications: 'Seguridad clínica',
        systems_review: 'Interrogatorio',
        physical_exam: 'Exploración',
        vital_signs: 'Signos vitales',
        studies_results: 'Estudios',
        diagnosis: 'Diagnóstico',
        prognosis: 'Pronóstico',
        therapeutic_plan: 'Plan de atención',
        observations: 'Notas finales'
      };
      return labels[section.key] || 'Historia clínica';
    },
    sectionProgress(section) {
      const fields = this.activeDynamicFields(section);
      const requiredFields = fields.filter((field) => field.required);
      const missingRequired = requiredFields.filter((field) => this.isDynamicFieldMissing(section, field));
      if(requiredFields.length === 0) {
        return { tone: 'optional', status: 'Opcional', missing: 0, required: 0 };
      }
      if(missingRequired.length === 0) {
        return { tone: 'complete', status: 'Obligatorios listos', missing: 0, required: requiredFields.length };
      }
      return {
        tone: 'missing',
        status: `${missingRequired.length} pendiente${missingRequired.length === 1 ? '' : 's'}`,
        missing: missingRequired.length,
        required: requiredFields.length
      };
    },
    dynamicSectionMissingCount(section) {
      return this.sectionProgress(section).missing || 0;
    },
    isSectionOpen(section) {
      return !this.isDraft || this.openClinicalSections.includes(section.key);
    },
    toggleClinicalSection(section) {
      if(!section || !section.key) return;
      if(this.openClinicalSections.includes(section.key)) {
        this.openClinicalSections = this.openClinicalSections.filter((key) => key !== section.key);
        return;
      }
      this.openClinicalSections = [...this.openClinicalSections, section.key];
    },
    initializeOpenClinicalSections() {
      if(!this.useDynamicSchema || !this.isDraft) return;
      const activeKeys = this.dynamicSections.map((section) => section.key);
      if(this.activeClinicalSectionKey && activeKeys.includes(this.activeClinicalSectionKey)) {
        this.openClinicalSections = [this.activeClinicalSectionKey];
        return;
      }
      const missing = this.firstMissingDynamicRequiredField();
      const firstSection = missing && missing.section ? missing.section : this.dynamicSections[0];
      this.activeClinicalSectionKey = firstSection ? firstSection.key : '';
      this.openClinicalSections = firstSection ? [firstSection.key] : [];
    },
    scrollToDynamicSection(sectionKey) {
      const section = this.dynamicSections.find((item) => item.key === sectionKey);
      if(section) {
        this.activeClinicalSectionKey = section.key;
        this.openClinicalSections = [section.key];
      }
      this.$nextTick(() => {
        const ref = this.$refs[`dynamic-section-${sectionKey}`];
        const target = Array.isArray(ref) ? ref[0] : ref;
        const element = target && target.$el ? target.$el : target;
        if(element && element.scrollIntoView) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    goToPreviousSection() {
      if(this.previousDynamicSection) {
        this.scrollToDynamicSection(this.previousDynamicSection.key);
      }
    },
    goToNextSection() {
      if(this.nextDynamicSection) {
        this.scrollToDynamicSection(this.nextDynamicSection.key);
      }
    },
    openPendingSummary() {
      if(this.requiredPendingCount) {
        this.showPendingDialog = true;
        return;
      }
      if(this.activeDynamicSection) {
        this.scrollToDynamicSection(this.activeDynamicSection.key);
      }
    },
    goToPendingField(item) {
      this.showPendingDialog = false;
      this.focusHistoryField(item);
    },
    fieldId(section, field) { return `history-${section.key}-${field.key}`; },
    fieldErrorBinding(section, field) {
      return { id: this.fieldId(section, field), required: Boolean(field.required), invalid: Boolean(this.dynamicFieldError(section, field)) };
    },
    dynamicFieldError(section, field) {
      const error = this.validationErrors.find(item => item.sectionKey === section.key && item.fieldKey === field.key);
      return error ? error.message : '';
    },
    focusHistoryField(item) {
      if(item && item.sectionKey) {
        this.scrollToDynamicSection(item.sectionKey);
        this.$nextTick(() => {
          clearTimeout(this.fieldFocusTimer);
          this.fieldFocusTimer = setTimeout(() => {
            const container = item.sectionKey === 'allergies_medications' && ['allergy_status', 'allergies'].includes(item.fieldKey)
              ? document.getElementById('history-allergies_medications-allergy_status') : document.getElementById(`history-field-${item.sectionKey}-${item.fieldKey}`);
            const input = container && (container.querySelector('textarea, input:not([type="hidden"]), select, [tabindex="0"]') || container);
            if(input) { input.scrollIntoView({ block: 'center' }); input.focus({ preventScroll: true }); }
          }, 300);
        });
      }
    },
    quickActionsForSection(section) {
      if(!section || !this.canEditForm) return [];
      const fieldKeys = this.activeDynamicFields(section).map((field) => field.key);
      const actions = [];
      if(section.key === 'allergies_medications') {
        if(fieldKeys.includes('current_medications')) actions.push({ label: 'No toma medicamentos', fieldKey: 'current_medications', value: 'No toma medicamentos actualmente.' });
      }
      if(['family_history', 'pathological_history'].includes(section.key)) {
        const targetField = fieldKeys.includes('relevant') ? 'relevant' : (fieldKeys.includes('current_or_previous_diseases') ? 'current_or_previous_diseases' : fieldKeys[0]);
        if(targetField) actions.push({ label: 'Sin antecedentes relevantes', fieldKey: targetField, value: 'Sin antecedentes relevantes.' });
      }
      return actions;
    },
    applyQuickAction(section, action) {
      if(!this.canEditForm) return;
      const field = this.activeDynamicFields(section).find((item) => item.key === action.fieldKey);
      if(!field) return;
      const previous = this.getDynamicFieldValue(section, field);
      const replacement = { sectionKey: section.key, field, previous, value: action.value };
      if(this.hasText(previous) && previous !== action.value) {
        this.pendingQuickAction = replacement;
        this.showQuickActionDialog = true;
      } else this.commitQuickAction(replacement);
    },
    closeQuickActionDialog(open) {
      if(!open) { this.showQuickActionDialog = false; this.pendingQuickAction = null; }
    },
    confirmQuickAction() {
      if(this.pendingQuickAction) this.commitQuickAction(this.pendingQuickAction);
      this.closeQuickActionDialog(false);
    },
    commitQuickAction(replacement) {
      const section = this.dynamicSections.find(item => item.key === replacement.sectionKey);
      this.setDynamicFieldValue(section, replacement.field, replacement.value);
      this.lastQuickAction = replacement;
    },
    undoQuickAction() {
      const previous = this.lastQuickAction;
      if(!previous) return;
      this.lastQuickAction = null;
      const section = this.dynamicSections.find(item => item.key === previous.sectionKey);
      this.setDynamicFieldValue(section, previous.field, previous.previous);
    },
    dynamicFieldPlaceholder(section, field) {
      if(field.placeholder) return field.placeholder;
      const placeholders = {
        'consultation.reason': 'Ejemplo: Dolor abdominal desde hace 3 días.',
        'consultation.current_condition': 'Describe evolución, síntomas asociados y duración.',
        'family_history.relevant': 'Ejemplo: diabetes, hipertensión, cáncer u otros antecedentes familiares.',
        'allergies_medications.allergies': 'Registra alergias conocidas o indica si las niega.',
        'diagnosis.initial_diagnosis': 'Diagnóstico clínico inicial o impresión diagnóstica.',
        'therapeutic_plan.initial_plan': 'Indicaciones, tratamiento inicial o conducta a seguir.'
      };
      return placeholders[`${section.key}.${field.key}`] || '';
    },
    fieldLabel(field) {
      return `${field.label || 'Campo'}${field.required ? ' *' : ''}`;
    },
    isReadonlyDynamicField(field) {
      return field.type === 'readonly';
    },
    getDynamicFieldValue(section, field) {
      if(this.isReadonlyDynamicField(field)) {
        return this.resolveReadonlyFieldValue(section, field);
      }
      const sectionValues = this.form[section.key] || {};
      const value = sectionValues[field.key];
      if(value === undefined || value === null) {
        return this.defaultDynamicFieldValue(field);
      }
      return value;
    },
    displayDynamicFieldValue(section, field) {
      const value = this.getDynamicFieldValue(section, field);
      if(section.key === 'allergies_medications' && field.key === 'allergy_status') return allergyLabels[value] || 'Sin revisar';
      if(Array.isArray(value)) {
        return value.length ? value.join(', ') : 'No registrado';
      }
      if(typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
      }
      return this.valueOrEmpty(value);
    },
    setDynamicFieldValue(section, field, value) {
      if(!this.canEditForm || this.isReadonlyDynamicField(field)) {
        return;
      }
      if(!this.form[section.key] || typeof this.form[section.key] !== 'object') {
        this.$set(this.form, section.key, {});
      }
      this.$set(this.form[section.key], field.key, value);
      this.saveError = '';
      if(this.lastQuickAction && this.lastQuickAction.sectionKey === section.key && this.lastQuickAction.field.key === field.key) this.lastQuickAction = null;
      if(section.key === 'vital_signs' && ['weight', 'height'].includes(field.key)) {
        this.updateBmi();
      }
    },
    fieldOptions(field) {
      const options = Array.isArray(field.options) ? field.options : [];
      return options.map((option) => {
        if(option && typeof option === 'object') {
          return {
            label: option.label || option.text || option.value || 'Opción',
            value: option.value !== undefined ? option.value : (option.label || option.text)
          };
        }
        return { label: String(option), value: option };
      });
    },
    resolveReadonlyFieldValue(section, field) {
      const source = field.source || '';
      const identification = {
        ...this.buildIdentificationSnapshot(),
        ...((this.form && this.form.identification) || {})
      };
      const sourceMap = {
        'patient.full_name': identification.full_name,
        'patient.age': identification.age,
        'patient.birth_date': identification.birth_date,
        'patient.sex': identification.sex,
        'patient.gender': identification.sex,
        'patient.phone': identification.phone,
        'patient.email': identification.email,
        'patient.address': identification.address,
        'patient.emergency_contact': identification.emergency_contact
      };
      if(source && Object.prototype.hasOwnProperty.call(sourceMap, source)) {
        return sourceMap[source] || 'No registrado';
      }
      const sectionValues = this.form[section.key] || {};
      return sectionValues[field.key] || 'No registrado';
    },
    dynamicMissingRequiredFields() {
      const missing = [];
      this.dynamicSections.forEach((section) => {
        this.activeDynamicFields(section).forEach((field) => {
          if(!field.required) {
            return;
          }
          if(this.isDynamicFieldMissing(section, field)) {
            missing.push(`${section.label}: ${field.label}`);
          }
        });
      });
      return missing;
    },
    firstMissingDynamicRequiredField() {
      for(const section of this.dynamicSections) {
        const fields = this.activeDynamicFields(section);
        for(const field of fields) {
          if(field.required && this.isDynamicFieldMissing(section, field)) {
            return { section, field };
          }
        }
      }
      return null;
    },
    dynamicSectionHasMissing(section) {
      if(!this.isDraft || !this.useDynamicSchema) {
        return false;
      }
      return this.activeDynamicFields(section)
        .some((field) => field.required && this.isDynamicFieldMissing(section, field));
    },
    dynamicFieldHasMissing(section, field) {
      return Boolean(this.isDraft && this.useDynamicSchema && field.required && this.isDynamicFieldMissing(section, field));
    },
    scrollToFirstMissingRequired() {
      this.$nextTick(() => {
      if(this.useDynamicSchema) {
        const missing = this.firstMissingDynamicRequiredField();
        if(missing && missing.section) {
            this.activeClinicalSectionKey = missing.section.key;
            this.openClinicalSections = [missing.section.key];
            const ref = this.$refs[`dynamic-section-${missing.section.key}`];
            const target = Array.isArray(ref) ? ref[0] : ref;
            const element = target && target.$el ? target.$el : target;
            if(element && element.scrollIntoView) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
          }
        }

        const form = this.$el && this.$el.querySelector ? this.$el.querySelector('.clinical-form') : null;
        if(form && form.scrollIntoView) {
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    isDynamicFieldMissing(section, field) {
      const value = this.getDynamicFieldValue(section, field);
      if(field.type === 'multiselect') {
        return !Array.isArray(value) || value.length === 0;
      }
      if(field.type === 'boolean') {
        return value !== true && value !== false;
      }
      if(field.type === 'checkbox') {
        return value !== true;
      }
      return !this.hasText(value) || (typeof value === 'string' && value.length > 5000);
    },
    validateTextLengths() {
      const errors = textLengthErrors(this.form, this.dynamicSections);
      return { ok: errors.length === 0, errors };
    },
    updateBmi() {
      const weight = Number(String(this.form.vital_signs.weight || '').replace(',', '.'));
      const heightRaw = Number(String(this.form.vital_signs.height || '').replace(',', '.'));
      const height = heightRaw > 3 ? heightRaw / 100 : heightRaw;
      if(weight > 0 && height > 0) {
        this.form.vital_signs.bmi = (weight / (height * height)).toFixed(2);
      }
    },
    async createSensitiveConsent() {
      if(!this.sensitiveConsentTemplate) {
        this.notify('warning', 'No hay formato activo de consentimiento de datos personales sensibles.');
        return;
      }
      const doctor = this.selectedDoctor || this.currentDoctorForDocuments();
      if(!doctor) {
        this.notify('warning', 'Selecciona un doctor responsable para crear este consentimiento.');
        return;
      }
      const response = await DADocumentService.createDocument({
        id_person: this.patientId,
        id_document_template: this.sensitiveConsentTemplate.id_document_template,
        responsible_doctor_user_id: doctor.id_login,
        origin: 'CLINICAL_HISTORY',
        status: 'PENDIENTE_FIRMA'
      });
      if(response && response.success) {
        this.documents = response.data || [];
        this.notify('success', 'Consentimiento creado correctamente.');
        const createdConsent = this.documents.find((item) => item.document_type === 'SENSITIVE_DATA_CONSENT' && item.status !== 'CANCELADO') || null;
        if(createdConsent) {
          this.$emit('open-documents', {
            id_patient_document: createdConsent.id_patient_document,
            document_type: 'SENSITIVE_DATA_CONSENT',
            open: true
          });
        }
      } else {
        this.notify('error', response && response.message ? response.message : 'No se pudo crear el consentimiento.');
      }
    },
    async registerSensitiveRefusal() {
      if(!this.sensitiveConsent) {
        return;
      }
      const result = await this.$swal.fire({
        icon: 'warning',
        title: 'Registrar negativa',
        text: 'La negativa quedará registrada en documentos. La historia clínica no podrá quedar como finalizada.',
        input: 'textarea',
        inputPlaceholder: 'Motivo de negativa',
        showCancelButton: true,
        confirmButtonText: 'Registrar negativa',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#b42318'
      });
      if(!result.isConfirmed) {
        return;
      }
      const response = await DADocumentService.registerRefusal({
        id_patient_document: this.sensitiveConsent.id_patient_document,
        refusal_reason: result.value || 'Negativa de firma'
      });
      if(response && response.success) {
        this.documents = response.data || [];
        this.notify('success', 'Negativa registrada.');
      } else {
        this.notify('error', response && response.message ? response.message : 'No se pudo registrar negativa.');
      }
    },
    openSensitiveDocument() {
      this.$emit('open-documents', {
        id_patient_document: this.sensitiveConsent ? this.sensitiveConsent.id_patient_document : null,
        document_type: 'SENSITIVE_DATA_CONSENT',
        open: true
      });
    },
    currentDoctorForDocuments() {
      const currentUser = this.currentUser();
      return this.doctors.find((doctor) => doctor.id_login === currentUser.id_login && this.isDoctorProfileReady(doctor)) || null;
    },
    currentUser() {
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
    isDoctorProfileReady(doctor) {
      return Boolean(
        doctor &&
        doctor.id_doctor_professional_profile &&
        doctor.professional_profile_active !== 0 &&
        doctor.professional_name &&
        doctor.professional_license
      );
    },
    doctorLabel(doctor) {
      const name = doctor.professional_name || doctor.user_name || doctor.name || 'Doctor sin nombre';
      const license = doctor.professional_license ? `Cédula ${doctor.professional_license}` : 'Cédula no registrada';
      return `${name} - ${license}`;
    },
    pathologicalSummary() {
      const sections = Array.isArray(this.px && this.px.pathological_data) ? this.px.pathological_data : [];
      const notes = [];
      sections.forEach((section) => {
        (section.child || []).forEach((child) => {
          if(child.value || child.text) {
            notes.push(`${child.description || section.description}: ${child.text || 'Sí'}`);
          }
          (child.options || []).forEach((option) => {
            if(option.value && !String(option.description || '').toLowerCase().includes('no')) {
              notes.push(`${child.description || section.description}: ${option.description}`);
            }
          });
        });
      });
      return notes.join('\n');
    },
    printableClinicalHistoryHtml(payload) {
      const history = payload.history || {};
      const snapshot = history.clinical_snapshot_json || {};
      const schema = this.normalizeTemplateSchema(history.template_snapshot_json || {});
      const patient = this.printablePatient(payload.patient || {}, snapshot.identification || {});
      const business = payload.business || (this.$session ? this.$session.get('business') : null) || {};
      const doctor = payload.doctor || {};
      const finalizer = payload.finalizer || null;
      const consent = payload.consent_document || null;
      const sections = this.printableSections(schema, snapshot, patient);
      const printedBy = this.currentUserPayload.name || this.currentUserPayload.email || this.currentUserPayload.id_login || 'No registrado';
      const mark = this.printableStatusMark(history.status);
      const businessLogo = business.logoUrl || business.logo_url || '';

      return `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Historia clínica - Versión ${this.escapeHtml(history.version_number || '')}</title>
            <style>
              @page { margin: 16mm; }
              * { box-sizing: border-box; }
              body { margin: 0; background: #fff; color: #172033; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.48; }
              .sheet { width: 100%; }
              .header { display: flex; justify-content: space-between; gap: 18px; border-bottom: 2px solid #d8e9ef; padding-bottom: 14px; margin-bottom: 14px; break-inside: avoid; }
              .brand-row { display: flex; gap: 12px; align-items: flex-start; }
              .logo { max-width: 82px; max-height: 58px; object-fit: contain; }
              .brand { margin: 0 0 4px; color: #00728c; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
              h1 { margin: 0 0 6px; font-size: 22px; color: #101828; }
              h2 { margin: 24px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #d8e9ef; color: #0f172a; font-size: 15px; break-after: avoid; }
              .status { display: inline-block; border: 1px solid #b8edf7; background: #f0fbff; color: #006487; padding: 5px 9px; font-weight: 800; text-align: center; }
              .status.draft { border-color: #fbbf24; background: #fffbeb; color: #92400e; }
              .status.incomplete { border-color: #f59e0b; background: #fff7ed; color: #9a3412; }
              .status.finalized { border-color: #86efac; background: #f0fdf4; color: #047857; }
              .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; break-inside: avoid; }
              .meta div, .field { border: 1px solid #e5eef4; padding: 8px; background: #fff; }
              .meta strong, .field strong { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 3px; }
              .notice { border: 1px solid #d8e9ef; background: #f8fbfd; padding: 10px; margin: 12px 0; break-inside: avoid; }
              .section { break-inside: avoid; page-break-inside: avoid; }
              .fields { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
              .field.wide { grid-column: 1 / -1; }
              .field span { white-space: pre-wrap; overflow-wrap: anywhere; }
              .footer { border-top: 1px solid #d8e9ef; margin-top: 24px; padding-top: 10px; color: #64748b; font-size: 11px; break-inside: avoid; }
              @media print {
                body { margin: 0; }
                .section, .header, .meta, .notice, .footer { break-inside: avoid; page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <main class="sheet">
              <header class="header">
                <div class="brand-row">
                  ${businessLogo ? `<img class="logo" src="${this.escapeHtml(businessLogo)}" alt="Logo">` : ''}
                  <div>
                    <p class="brand">${this.escapeHtml(business.name || business.legalName || 'Consultorio')}</p>
                    <h1>Historia clínica</h1>
                    <span>Folio: ${this.escapeHtml(history.id_clinical_history || 'No registrado')}</span>
                  </div>
                </div>
                <div>
                  <span class="status ${this.escapeHtml(String(history.status || '').toLowerCase())}">${this.escapeHtml(mark)}</span>
                </div>
              </header>

              <section class="meta">
                <div><strong>Versión</strong><span>Versión ${this.escapeHtml(history.version_number || 'No registrada')}</span></div>
                <div><strong>Estado</strong><span>${this.escapeHtml(this.statusLabel(history.status))}</span></div>
                <div><strong>Creación</strong><span>${this.escapeHtml(this.formatDateTime(history.created_at))}</span></div>
                <div><strong>Finalización</strong><span>${this.escapeHtml(this.formatDateTime(history.finalized_at))}</span></div>
                <div><strong>Formato</strong><span>${this.escapeHtml(this.printableTemplateLabel(history))}</span></div>
                <div><strong>Fuente</strong><span>${this.escapeHtml(history.source || 'MANUAL')}</span></div>
              </section>

              <section class="section">
                <h2>Datos del paciente</h2>
                <div class="fields">${this.printableFieldsHtml(patient)}</div>
              </section>

              <section class="section">
                <h2>Doctor responsable</h2>
                <div class="fields">${this.printableFieldsHtml(this.printableDoctorFields(doctor, history))}</div>
                ${doctor.identity_source === 'LEGACY_UNVERIFIED' ? '<p class="notice">Esta versión anterior no conserva una copia histórica del perfil profesional. No se han sustituido esos datos por los del perfil actual.</p>' : ''}
              </section>

              ${finalizer ? `<section class="section"><h2>Profesional que cerró esta versión</h2><div class="fields">${this.printableFieldsHtml(this.printableDoctorFields(finalizer, history))}</div></section>` : ''}

              <section class="section">
                <h2>Consentimiento</h2>
                <div class="fields">${this.printableFieldsHtml(this.printableConsentFields(consent, history))}</div>
              </section>

              ${sections}

              <footer class="footer">
                <p>Impreso: ${this.escapeHtml(this.formatDateTime(new Date()))}</p>
                <p>Usuario que imprimió: ${this.escapeHtml(printedBy)}</p>
                <p>Documento generado desde el sistema. La información corresponde a la versión indicada de la historia clínica.</p>
              </footer>
            </main>
          </body>
        </html>
      `;
    },
    printablePatient(patient, identification) {
      const address = identification.address || [patient.direction, patient.residence, patient.cp].filter(Boolean).join(', ');
      return [
        { label: 'Nombre completo', value: identification.full_name || patient.full_name || `${patient.name || ''} ${patient.surname || ''}`.trim() },
        { label: 'Edad', value: identification.age || patient.age },
        { label: 'Fecha de nacimiento', value: identification.birth_date || patient.birthday },
        { label: 'Sexo', value: identification.sex },
        { label: 'Teléfono', value: identification.phone || patient.telephone || patient.local_telephone },
        { label: 'Correo', value: identification.email },
        { label: 'Dirección', value: address },
        { label: 'Contacto de emergencia', value: identification.emergency_contact }
      ];
    },
    printableDoctorFields(doctor, history) {
      const historicalLicenseText = history && history.status !== 'DRAFT' ? 'Sin copia histórica disponible.' : 'No registrada';
      return [
        { label: 'Nombre', value: doctor.professional_name || doctor.user_name || 'No registrado' },
        { label: 'Cédula profesional', value: doctor.professional_license || historicalLicenseText },
        { label: 'Especialidad', value: doctor.specialty || 'No registrada' },
        { label: 'Cédula de especialidad', value: doctor.specialty_license || 'No registrada' }
      ];
    },
    printableConsentFields(consent, history) {
      if(!history || !history.consent_document_id) {
        return [
          { label: 'Consentimiento de datos personales sensibles', value: 'No vinculado' }
        ];
      }
      return [
        { label: 'Consentimiento de datos personales sensibles', value: this.printableConsentStatus(consent) },
        { label: 'Fecha', value: consent ? this.formatDateTime(consent.signed_at || consent.created_at) : 'No registrado' },
        { label: 'Motivo de negativa', value: consent && consent.refusal_reason ? consent.refusal_reason : 'No aplica' }
      ];
    },
    printableConsentStatus(consent) {
      if(!consent) {
        return 'Vinculado';
      }
      const labels = {
        FIRMADO: 'Firmado',
        PENDIENTE_FIRMA: 'Pendiente',
        NO_FIRMADO_POR_NEGATIVA: 'Negativa',
        BORRADOR: 'Pendiente'
      };
      return labels[consent.status] || 'Vinculado';
    },
    printableSections(schema, snapshot, patientFields) {
      if(!this.isValidTemplateSchema(schema)) {
        return this.printableFallbackSections(snapshot);
      }

      return schema.sections
        .filter((section) => section && section.enabled !== false && section.key !== 'identification')
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((section) => {
          const fields = (section.fields || [])
            .filter((field) => field && field.enabled !== false)
            .map((field) => this.printableField(section, field, snapshot, patientFields))
            .filter((field) => field.required || this.hasPrintableValue(field.value));

          if(!fields.length) {
            return '';
          }

          return `
            <section class="section">
              <h2>${this.escapeHtml(section.label || 'Sección')}</h2>
              ${section.description ? `<p class="notice">${this.escapeHtml(section.description)}</p>` : ''}
              <div class="fields">${this.printableFieldsHtml(fields)}</div>
            </section>
          `;
        })
        .join('');
    },
    printableField(section, field, snapshot, patientFields) {
      const sectionValues = snapshot[section.key] || {};
      let value = field.type === 'readonly'
        ? this.printableReadonlyValue(field, patientFields, sectionValues)
        : sectionValues[field.key];
      if(section.key === 'allergies_medications' && field.key === 'allergy_status') value = allergyLabels[value] || 'Sin revisar';
      return {
        label: `${field.label || field.key}${field.required ? ' *' : ''}`,
        value: this.printableFieldValue(value, field.type),
        wide: field.type === 'textarea'
      };
    },
    printableFallbackSections(snapshot) {
      const sections = Object.keys(snapshot || {})
        .filter((key) => key !== 'identification' && snapshot[key] && typeof snapshot[key] === 'object')
        .map((key) => {
          const fields = Object.keys(snapshot[key])
            .filter(fieldKey => key !== 'allergies_medications' || !['legacy_allergies', 'allergy_revision', 'allergy_reviewed_at', 'allergy_reviewed_by'].includes(fieldKey))
            .map((fieldKey) => ({ label: fieldKey === 'allergy_status' ? 'Estado de alergias' : fieldKey, value: this.printableFieldValue(fieldKey === 'allergy_status' ? allergyLabels[snapshot[key][fieldKey]] || 'Sin revisar' : snapshot[key][fieldKey]), wide: true }))
            .filter((field) => this.hasPrintableValue(field.value));
          if(!fields.length) {
            return '';
          }
          return `
            <section class="section">
              <h2>${this.escapeHtml(key.replace(/_/g, ' '))}</h2>
              <div class="fields">${this.printableFieldsHtml(fields)}</div>
            </section>
          `;
        });
      return sections.join('');
    },
    printableFieldsHtml(fields) {
      return (fields || []).map((field) => `
        <div class="field ${field.wide ? 'wide' : ''}">
          <strong>${this.escapeHtml(field.label)}</strong>
          <span>${this.textToHtml(this.valueOrEmpty(field.value))}</span>
        </div>
      `).join('');
    },
    printableReadonlyValue(field, patientFields, sectionValues) {
      const sourceMap = patientFields.reduce((map, item) => {
        const key = String(item.label || '').toLowerCase();
        map[key] = item.value;
        return map;
      }, {});
      const source = field.source || '';
      const values = {
        'patient.full_name': sourceMap['nombre completo'],
        'patient.age': sourceMap.edad,
        'patient.birth_date': sourceMap['fecha de nacimiento'],
        'patient.sex': sourceMap.sexo,
        'patient.gender': sourceMap.sexo,
        'patient.phone': sourceMap['teléfono'],
        'patient.email': sourceMap.correo,
        'patient.address': sourceMap['dirección'],
        'patient.emergency_contact': sourceMap['contacto de emergencia']
      };
      return values[source] || sectionValues[field.key] || '';
    },
    printableFieldValue(value, type = 'text') {
      if(Array.isArray(value)) {
        return value.length ? value.join(', ') : '';
      }
      if(typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
      }
      if(value && typeof value === 'object') {
        return JSON.stringify(value);
      }
      if(type === 'date') {
        return value || '';
      }
      return value;
    },
    hasPrintableValue(value) {
      return value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== 'No registrado';
    },
    printableStatusMark(status) {
      const labels = {
        DRAFT: 'BORRADOR — No finalizada',
        FINALIZED: 'Historia clínica finalizada',
        INCOMPLETE: 'HISTORIA INCOMPLETA',
        CANCELLED: 'Historia cancelada',
        SUPERSEDED: 'Versión histórica'
      };
      return labels[status] || this.statusLabel(status);
    },
    printableTemplateLabel(history) {
      if(history.template_version_id) {
        return `Versión de formato ${history.template_version_id}`;
      }
      return 'No registrada';
    },
    escapeHtml(value) {
      return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },
    textToHtml(value) {
      return this.escapeHtml(value).replace(/\n/g, '<br>');
    },
    calculateAge(rawBirthDate) {
      if(!rawBirthDate) {
        return '';
      }
      const parts = String(rawBirthDate).includes('-') ? String(rawBirthDate).split('-') : [];
      let birthDate = new Date(rawBirthDate);
      if(parts.length === 3 && parts[0].length === 2) {
        birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      if(Number.isNaN(birthDate.getTime())) {
        return '';
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const month = today.getMonth() - birthDate.getMonth();
      if(month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
      }
      return age > 0 ? `${age} años` : '';
    },
    formatDateTime(value) {
      if(!value) {
        return 'No registrado';
      }
      const date = new Date(value);
      if(Number.isNaN(date.getTime())) {
        return 'No registrado';
      }
      return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    statusLabel(status) {
      const labels = {
        DRAFT: 'Borrador',
        FINALIZED: 'Finalizada',
        INCOMPLETE: 'Incompleta',
        CANCELLED: 'Cancelada',
        SUPERSEDED: 'Histórica'
      };
      return labels[status] || 'No registrado';
    },
    versionIndicator(version) {
      if(!version) {
        return '';
      }
      if(version.status === 'DRAFT') {
        return version.id_clinical_history === this.latestVersionId ? 'Borrador actual' : 'Borrador';
      }
      if(version.id_clinical_history === this.latestVersionId) {
        return 'Versión actual';
      }
      return 'Versión histórica';
    },
    consentVersionLabel(version) {
      if(!version || !version.consent_document_id) {
        return 'No vinculado';
      }
      const labels = {
        FIRMADO: 'Firmado',
        PENDIENTE_FIRMA: 'Pendiente',
        NO_FIRMADO_POR_NEGATIVA: 'Negativa',
        BORRADOR: 'Pendiente'
      };
      return labels[version.consent_status] || 'Vinculado';
    },
    canContinueVersion(version) {
      return Boolean(version && version.status === 'DRAFT' && this.canEditDraftPermission);
    },
    valueOrEmpty(value) {
      return value === undefined || value === null || value === '' ? 'No registrado' : value;
    },
    hasText(value) {
      return value !== null && value !== undefined && Boolean(String(value).trim());
    },
    notify(icon, text) {
      if(this.$swal) {
        this.$swal.fire({
          icon,
          text,
          timer: icon === 'success' ? 1800 : undefined,
          showConfirmButton: icon !== 'success'
        });
      }
    },
    async confirmDialog(title, text) {
      if(!this.$swal) {
        return false;
      }
      const result = await this.$swal.fire({
        icon: 'warning',
        title,
        text,
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar'
      });
      return result.isConfirmed;
    }
  }
};
</script>

<style scoped>
.clinical-history-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.clinical-panel,
.clinical-section {
  border: 1px solid #cfe7f3;
  background: #fff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, .06);
}

.clinical-panel {
  padding: 1.15rem;
}

.status-panel,
.consent-panel,
.actions-panel,
.empty-panel {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.initial-history-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(15rem, auto);
  gap: 1.5rem;
  align-items: center;
  border-color: #bfeaf4;
  background:
    linear-gradient(135deg, rgba(240, 251, 255, .92), rgba(255, 255, 255, .98) 55%),
    #fff;
  box-shadow: 0 16px 38px rgba(15, 23, 42, .06);
}

.initial-history-content {
  display: grid;
  gap: .55rem;
}

.initial-eyebrow-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .5rem;
}

.positive-note {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin: 0;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  background: #f0fdf4;
  color: #047857 !important;
  padding: .35rem .7rem;
  font-size: .78rem;
  font-weight: 900;
}

.initial-subtitle {
  margin: 0;
  color: #0f172a !important;
  font-size: 1rem;
  font-weight: 800;
}

.initial-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .65rem;
  margin-top: .35rem;
}

.initial-summary div {
  border: 1px solid #e2f0f6;
  border-radius: 10px;
  background: rgba(255, 255, 255, .72);
  padding: .75rem;
}

.initial-summary span {
  display: block;
  color: #64748b;
  font-size: .72rem;
  font-weight: 800;
}

.initial-summary strong {
  display: block;
  color: #0f172a;
  font-size: .9rem;
  overflow-wrap: anywhere;
}

.initial-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: .75rem;
  min-width: 15rem;
}

.primary-cta {
  background: var(--color-primary-900);
  color: #fff;
  border-radius: 999px;
  justify-content: center;
  min-height: 2.85rem;
  font-size: .98rem;
}

.secondary-link-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: .25rem .8rem;
}

.clinical-link-button {
  border: 0;
  background: transparent;
  color: #006487;
  padding: .25rem .15rem;
  font-size: .88rem;
  font-weight: 900;
  text-decoration: none;
  cursor: pointer;
  transition: color .14s ease, text-decoration-color .14s ease;
}

.clinical-link-button:hover:not(:disabled) {
  color: #0a8ead;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

.clinical-link-button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.history-link-button {
  border: 1px solid #cfe7f3;
  border-radius: 999px;
  background: rgba(255, 255, 255, .72);
  padding: .35rem .78rem;
  box-shadow: 0 6px 14px rgba(15, 23, 42, .04);
}

.status-panel {
  display: grid;
  grid-template-columns: minmax(18rem, .8fr) minmax(26rem, 1.2fr);
  align-items: stretch;
  gap: 1.15rem;
  border-color: #bfeaf4;
  background:
    radial-gradient(circle at top left, rgba(23, 167, 201, .10), transparent 32%),
    linear-gradient(135deg, rgba(248, 253, 255, .98), rgba(255, 255, 255, .98));
  box-shadow: 0 14px 34px rgba(15, 23, 42, .06);
}

.draft-status-panel {
  border-left: 4px solid var(--color-primary-500);
}

.consent-panel,
.actions-panel,
.empty-panel,
.template-panel {
  align-items: center;
}

.template-panel {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.consent-panel.compact {
  box-shadow: 0 6px 16px rgba(15, 23, 42, .04);
}

.consent-copy {
  display: grid;
  gap: .45rem;
  max-width: 46rem;
}

.consent-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: .9rem;
}

.consent-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  padding: .25rem .7rem;
  white-space: nowrap;
  font-size: .78rem;
  font-weight: 900;
}

.consent-status-badge.pending {
  color: #92400e;
  background: #fffbeb;
  border-color: #fcd34d;
}

.consent-status-badge.signed {
  color: #047857;
  background: #ecfdf5;
  border-color: #86efac;
}

.consent-status-badge.refusal {
  color: #b42318;
  background: #fff5f5;
  border-color: #fecaca;
}

.template-version-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  height: 2rem;
  border: 1px solid #b6e2f1;
  border-radius: 999px;
  background: #f0fbff;
  color: #006487;
  font-weight: 900;
}

.status-main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: none;
  min-height: 9rem;
}

.section-kicker {
  margin: 0 0 .25rem;
  color: var(--color-primary-900);
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
}

h2,
h3,
p {
  letter-spacing: 0;
}

h2,
h3 {
  color: #0f172a;
  margin: 0;
}

.status-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .65rem;
}

.status-copy,
.clinical-panel p,
.clinical-section header span {
  color: #52637a;
}

.permission-note {
  margin: .45rem 0 0;
  color: #92400e !important;
  font-weight: 700;
}

.status-grid,
.legacy-grid,
.read-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(10rem, 1fr));
  gap: .6rem;
}

.status-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-width: 0;
  align-content: start;
}

.status-item,
.legacy-grid div,
.read-grid div {
  border: 1px solid #d7e8f1;
  border-radius: 12px;
  background: #f8fbfd;
  padding: .75rem;
}

.status-panel .status-item {
  background: rgba(255, 255, 255, .78);
  box-shadow: 0 8px 20px rgba(15, 23, 42, .035);
}

.status-panel .status-item.wide {
  grid-column: span 2;
}

.status-panel .clinical-button {
  align-self: end;
  min-height: 2.4rem;
}

.status-item span,
.legacy-grid span,
.read-grid span {
  display: block;
  color: #64748b;
  font-size: .72rem;
  font-weight: 800;
}

.status-item strong,
.legacy-grid strong,
.read-grid strong {
  display: block;
  color: #0f172a;
  font-size: .95rem;
  overflow-wrap: anywhere;
}

.wide {
  grid-column: 1 / -1;
}

.status-pill {
  border-radius: 999px;
  padding: .35rem .7rem;
  font-size: .75rem;
  font-weight: 900;
}

.status-pill.neutral {
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
}

.status-pill.draft {
  color: #075985;
  background: #e0f2fe;
  border: 1px solid #7dd3fc;
}

.status-pill.finalized {
  color: #047857;
  background: #dcfce7;
  border: 1px solid #86efac;
}

.status-pill.incomplete {
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fcd34d;
}

.status-pill.cancelled {
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fecaca;
}

.status-pill.superseded {
  color: #475569;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
}

.version-notice-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.version-notice-panel strong {
  color: #075985;
}

.versions-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.versions-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: .75rem;
}

.version-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  border: 1px solid #d7e8f1;
  border-left: 4px solid #8aa0bd;
  background: #fbfdff;
  padding: .9rem;
}

.version-card.active {
  border-left-color: #17a7c9;
  background: #f0fbff;
}

.version-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .5rem;
}

.version-title-row h4 {
  margin: 0;
  color: #0f172a;
}

.version-card-main p,
.versions-empty {
  margin: .35rem 0 0;
  color: #52637a;
}

.version-indicator {
  border: 1px solid #cfe7f3;
  border-radius: 999px;
  background: #fff;
  color: #006487;
  font-size: .72rem;
  font-weight: 900;
  padding: .28rem .55rem;
}

.version-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(9rem, 1fr));
  gap: .55rem;
  margin-top: .75rem;
}

.version-meta-grid div {
  border: 1px solid #dbeafe;
  background: #fff;
  padding: .6rem;
}

.version-meta-grid span {
  display: block;
  color: #64748b;
  font-size: .7rem;
  font-weight: 800;
}

.version-meta-grid strong {
  color: #0f172a;
  font-size: .86rem;
}

.version-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: .5rem;
  min-width: 11rem;
}

.start-history-dialog {
  display: grid;
  gap: 1rem;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(191, 234, 244, .95);
  border-radius: 18px;
  padding: 0;
  background:
    radial-gradient(circle at top left, rgba(23, 167, 201, .14), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8fdff 100%);
  box-shadow: 0 24px 70px rgba(15, 23, 42, .22);
}

.start-history-dialog::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary-500), #5eead4);
}

.start-history-dialog > header {
  padding: 1.35rem 1.45rem .85rem;
  border-bottom: 1px solid rgba(207, 231, 243, .76);
  background: linear-gradient(180deg, rgba(239, 251, 255, .92), rgba(255, 255, 255, .55));
}

.start-history-dialog > header .section-kicker {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border: 1px solid rgba(23, 167, 201, .18);
  border-radius: 999px;
  padding: .28rem .6rem;
  background: rgba(23, 167, 201, .08);
  color: var(--color-primary-700);
}

.start-history-dialog > header h3 {
  margin-top: .65rem;
  font-size: 1.35rem;
}

.start-history-dialog > header p:last-child {
  margin: .25rem 0 0;
  color: #52637a;
  font-size: .96rem;
}

.start-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .75rem;
  padding: 0 1.45rem;
}

.start-option-card {
  display: grid;
  gap: .35rem;
  min-height: 7.5rem;
  border: 1px solid #d7e8f1;
  background: #fff;
  padding: 1rem;
  text-align: left;
  transition: border-color .14s ease, box-shadow .14s ease, transform .14s ease;
}

.start-option-card:hover,
.start-option-card.selected {
  border-color: #17a7c9;
  box-shadow: 0 12px 26px rgba(15, 23, 42, .08);
  transform: translateY(-1px);
}

.start-option-card strong {
  color: #0f172a;
  font-size: 1rem;
}

.start-option-card span {
  color: #52637a;
  font-size: .9rem;
}

.ghost-disabled {
  opacity: .65;
}

.button-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: .55rem;
}

.clinical-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  appearance: none;
  border-radius: 999px;
  border: 1px solid #cfe7f3;
  padding: .55rem 1rem;
  font-weight: 900;
  color: var(--color-primary-900);
  background: #fff !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .05);
  transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease;
}

.clinical-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(15, 23, 42, .09);
}

.clinical-button:disabled {
  opacity: .58;
  cursor: not-allowed;
}

.clinical-button.primary {
  color: #fff !important;
  background: var(--color-primary-900) !important;
  border-color: var(--color-primary-900) !important;
  box-shadow: 0 12px 24px rgba(23, 167, 201, .24);
}

.clinical-button.success {
  color: #047857 !important;
  background: #ecfdf5 !important;
  border-color: #86efac !important;
}

.clinical-button.secondary {
  color: var(--color-primary-900) !important;
  background: #f8fdff !important;
  background-color: #f8fdff !important;
  border-color: #bfeaf4 !important;
  box-shadow: 0 6px 14px rgba(23, 167, 201, .08);
}

.clinical-button.danger-soft {
  color: #b42318 !important;
  background: #fff5f5 !important;
  background-color: #fff5f5 !important;
  border-color: #fecaca !important;
}

.clinical-history-page button.clinical-button.secondary:not(:disabled) {
  color: var(--color-primary-900) !important;
  background: #f8fdff !important;
  background-color: #f8fdff !important;
}

.clinical-history-page button.clinical-button.secondary:hover:not(:disabled) {
  color: #005f80 !important;
  background: #eefbff !important;
  background-color: #eefbff !important;
  border-color: #7dd8ee !important;
}

.warning-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: #92400e;
  background: #fffbeb;
  border-color: #fcd34d;
}

.actions-panel {
  position: sticky;
  top: .75rem;
  z-index: 6;
  border-color: #bfeaf4;
  background: rgba(255, 255, 255, .96);
  backdrop-filter: blur(10px);
}

.actions-panel > div:first-child {
  display: grid;
  gap: .35rem;
  min-width: 18rem;
}

.consent-action-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: .65rem;
  min-width: fit-content;
}

.consent-action-row .clinical-button {
  min-width: 12rem;
}

.capture-action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(10.5rem, 1fr));
  align-content: center;
  align-items: center;
  justify-content: end;
  gap: .65rem;
  min-width: 27rem;
  max-width: 31rem;
}

.capture-action-row .clinical-button {
  width: 100%;
  min-height: 2.65rem;
  white-space: nowrap;
}

.capture-action-row .clinical-button.primary {
  grid-column: 1 / 2;
}

.capture-action-row .clinical-button.success {
  grid-column: 2 / 3;
}

.capture-action-row .clinical-button.danger-soft {
  grid-column: 1 / 2;
}

.capture-action-row .clinical-button.secondary {
  grid-column: 2 / 3;
}

.capture-progress-inline {
  display: grid;
  gap: .35rem;
  max-width: 34rem;
  margin-top: .35rem;
}

.capture-template-inline {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .4rem;
  width: fit-content;
  max-width: 100%;
  margin-top: .15rem;
  border: 1px solid #cfe7f3;
  border-radius: 999px;
  background: rgba(248, 253, 255, .9);
  padding: .32rem .65rem;
  color: #52637a;
  font-size: .82rem;
}

.capture-template-inline span {
  color: #64748b;
  font-weight: 900;
}

.capture-template-inline strong {
  color: #0f172a;
  font-weight: 900;
}

.capture-template-inline em {
  border-radius: 999px;
  background: #e0f7ff;
  color: #006487;
  padding: .14rem .42rem;
  font-style: normal;
  font-weight: 900;
}

.capture-progress-topline,
.capture-progress-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: .5rem;
}

.capture-progress-topline strong {
  color: #0f172a;
  font-size: .88rem;
}

.capture-progress-topline span {
  border: 1px solid #cfe7f3;
  border-radius: 999px;
  background: #f8fdff;
  color: #006487;
  padding: .22rem .55rem;
  font-size: .76rem;
  font-weight: 900;
}

.capture-progress-track {
  height: .48rem;
  overflow: hidden;
  border-radius: 999px;
  background: #e2edf3;
}

.capture-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary-500), #2dd4bf);
  transition: width .2s ease;
}

.capture-progress-footer small {
  color: #64748b;
  font-weight: 700;
}

.capture-guide-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-color: #bfeaf4;
  background:
    linear-gradient(135deg, rgba(240, 251, 255, .92), rgba(255, 255, 255, .98) 58%),
    #fff;
}

.capture-guide-main {
  display: grid;
  gap: .35rem;
}

.capture-guide-main h3 {
  font-size: 1.08rem;
}

.pending-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
  margin-top: .25rem;
}

.pending-preview-list span {
  border: 1px solid #fde68a;
  border-radius: 999px;
  background: #fffbeb;
  color: #92400e;
  padding: .28rem .6rem;
  font-size: .78rem;
  font-weight: 800;
}

.clinical-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.clinical-capture-layout {
  display: grid;
  grid-template-columns: minmax(13rem, 16rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.clinical-capture-layout:not(.guided) {
  grid-template-columns: 1fr;
}

.clinical-section-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.section-navigator {
  position: sticky;
  top: 6.75rem;
  display: flex;
  flex-direction: column;
  gap: .45rem;
  border: 1px solid #d7e8f1;
  background: rgba(248, 251, 253, .92);
  padding: .8rem;
  box-shadow: 0 8px 22px rgba(15, 23, 42, .04);
}

.section-navigator-header {
  display: grid;
  gap: .1rem;
  margin-bottom: .25rem;
}

.section-navigator-header strong {
  color: #0f172a;
  font-size: .92rem;
}

.section-nav-item {
  display: grid;
  gap: .15rem;
  width: 100%;
  border: 1px solid #d7e8f1;
  border-radius: 10px;
  background: #fff;
  padding: .62rem .7rem;
  text-align: left;
  cursor: pointer;
  transition: transform .14s ease, border-color .14s ease, box-shadow .14s ease;
}

.section-nav-item:hover {
  transform: translateY(-1px);
  border-color: #7dd8ee;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .06);
}

.section-nav-item.active {
  border-color: #17a7c9;
  background: #f0fbff;
  box-shadow: 0 10px 22px rgba(23, 167, 201, .10);
}

.section-nav-item span {
  color: #0f172a;
  font-size: .86rem;
  font-weight: 900;
}

.section-nav-item small {
  color: #64748b;
  font-size: .75rem;
  font-weight: 800;
}

.section-nav-item.missing small {
  color: #92400e;
}

.section-nav-item.complete small {
  color: #047857;
}

.responsible-section {
  padding: .85rem;
}

.responsible-section header {
  margin-bottom: .55rem;
}

.clinical-section {
  padding: 1rem;
}

.clinical-section header {
  margin-bottom: .9rem;
}

.collapsible-section {
  padding: 0;
  overflow: hidden;
}

.section-accordion-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 !important;
  padding: 1rem;
  cursor: pointer;
}

.section-body {
  padding: 0 1rem 1rem;
}

.section-header-status {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: .45rem;
  min-width: fit-content;
}

.section-state-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: .28rem .62rem;
  font-size: .76rem;
  font-weight: 900;
}

.section-state-pill.complete {
  color: #047857;
  background: #ecfdf5;
  border-color: #86efac;
}

.section-state-pill.missing {
  color: #92400e;
  background: #fffbeb;
  border-color: #fcd34d;
}

.section-state-pill.optional {
  color: #475569;
  background: #f8fafc;
  border-color: #cbd5e1;
}

.section-toggle-button {
  border: 1px solid #cfe7f3;
  border-radius: 999px;
  background: #f8fdff;
  color: #006487;
  padding: .28rem .62rem;
  font-size: .76rem;
  font-weight: 900;
}

.section-inline-warning {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border: 1px solid #fde68a;
  border-radius: 999px;
  background: #fffbeb;
  color: #92400e;
  padding: .34rem .68rem;
  margin: 0 0 .75rem;
  font-size: .82rem;
  font-weight: 900;
}

.section-warning-legacy {
  display: none;
}

.quick-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: .45rem;
  margin: 0 0 .85rem;
}

.quick-fill-button {
  border: 1px solid #cfe7f3;
  border-radius: 999px;
  background: #f8fdff;
  color: #006487;
  padding: .38rem .72rem;
  font-size: .8rem;
  font-weight: 900;
}

.field-required-note {
  display: block;
  margin-top: -.35rem;
  color: #b45309 !important;
  font-size: .76rem;
  font-weight: 800;
}

.section-step-footer {
  display: grid;
  grid-template-columns: minmax(8rem, auto) minmax(10rem, 1fr) minmax(8rem, auto);
  gap: .55rem;
  padding: .85rem 1rem 1rem;
  border-top: 1px solid #d7e8f1;
  background: #fbfdff;
}

.section-step-footer .clinical-button {
  width: 100%;
}

.pending-dialog {
  display: grid;
  gap: 1rem;
}

.pending-dialog-list {
  display: grid;
  gap: .55rem;
}

.pending-dialog-list button {
  display: grid;
  gap: .12rem;
  border: 1px solid #d7e8f1;
  border-radius: 10px;
  background: #fff;
  padding: .75rem;
  text-align: left;
}

.pending-dialog-list button:hover {
  border-color: #17a7c9;
  background: #f0fbff;
}

.pending-dialog-list span {
  color: #64748b;
  font-size: .76rem;
  font-weight: 900;
  text-transform: uppercase;
}

.pending-dialog-list strong {
  color: #0f172a;
}

.doctor-summary {
  display: grid;
  gap: .16rem;
  border: 1px solid #d7e8f1;
  background: #f8fbfd;
  padding: .8rem;
  margin-bottom: .85rem;
}

.doctor-summary span,
.doctor-summary small {
  color: #64748b;
}

.doctor-summary span {
  font-size: .72rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.doctor-summary strong {
  color: #0f172a;
}

.form-warning {
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #92400e !important;
  padding: .7rem;
  margin: .5rem 0 0;
  font-weight: 700;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: .75rem;
}

.form-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid.vitals {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dynamic-field {
  min-width: 0;
}

.section-missing {
  border-color: #f8d58a;
  box-shadow: 0 8px 22px rgba(245, 158, 11, .06);
}

.field-missing {
  border-radius: 6px;
  outline: 1px solid rgba(245, 158, 11, .25);
  outline-offset: 3px;
}

.readonly-field {
  display: flex;
  flex-direction: column;
  gap: .25rem;
  min-height: 4.25rem;
  border: 1px solid #dbeafe;
  background: #f8fbff;
  padding: .75rem;
}

.readonly-field span {
  color: #52637a;
  font-size: .76rem;
  font-weight: 800;
}

.readonly-field strong {
  color: #0f172a;
  font-size: .95rem;
}

.readonly-field small,
.read-grid small {
  color: #64748b;
}

.dialog-card {
  background: #fff;
  padding: 1.25rem;
  border: 1px solid var(--color-primary-200);
  border-radius: 16px;
  color: #334155;
}

.dialog-card header h3 {
  margin: .3rem 0 .6rem;
  font-size: 1.25rem;
  font-weight: 800;
}

.dialog-card header p:not(.section-kicker) {
  line-height: 1.6;
  color: #475569;
}

.finalize-checklist {
  display: flex;
  flex-direction: column;
  gap: .55rem;
  margin-top: 1rem;
}

.check-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: .55rem;
  border: 1px solid #dbeafe;
  padding: .75rem;
}

.check-item.ok {
  color: #047857;
  background: #ecfdf5;
  border-color: #bbf7d0;
}

.check-item.warn {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.block-reason {
  margin: 1rem 0 0;
  color: #b42318;
  font-weight: 800;
}

.dialog-actions {
  margin-top: .25rem;
  padding: 1rem 1.45rem 1.35rem;
  border-top: 1px solid rgba(207, 231, 243, .64);
  background: rgba(248, 253, 255, .72);
}

@media (max-width: 900px) {
  .status-panel,
  .initial-history-panel,
  .consent-panel,
  .actions-panel,
  .empty-panel,
  .warning-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .status-grid {
    min-width: 0;
  }

  .status-panel {
    grid-template-columns: 1fr;
  }

  .status-main {
    min-height: auto;
  }

  .status-panel .status-item.wide {
    grid-column: 1 / -1;
  }

  .form-grid.two,
  .form-grid.vitals,
  .status-grid,
  .legacy-grid,
  .read-grid {
    grid-template-columns: 1fr;
  }

  .button-row {
    justify-content: flex-start;
  }

  .capture-action-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
    max-width: none;
    width: 100%;
  }

  .consent-action-row {
    justify-content: flex-start;
    width: 100%;
  }

  .actions-panel {
    position: static;
  }

  .capture-progress-inline {
    max-width: none;
  }

  .capture-guide-panel,
  .section-accordion-header {
    flex-direction: column;
    align-items: stretch;
  }

  .clinical-capture-layout {
    grid-template-columns: 1fr;
  }

  .section-navigator {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-navigator-header {
    grid-column: 1 / -1;
  }

  .initial-history-panel {
    grid-template-columns: 1fr;
  }

  .initial-summary,
  .start-options {
    grid-template-columns: 1fr;
  }

  .initial-actions {
    width: 100%;
  }

  .secondary-link-row {
    justify-content: flex-start;
  }

  .consent-title-row {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 620px) {
  .section-navigator {
    grid-template-columns: 1fr;
  }

  .actions-panel .clinical-button,
  .consent-action-row .clinical-button,
  .capture-guide-actions .clinical-button {
    width: 100%;
  }

  .capture-action-row {
    grid-template-columns: 1fr;
  }

  .capture-action-row .clinical-button.primary,
  .capture-action-row .clinical-button.success,
  .capture-action-row .clinical-button.danger-soft,
  .capture-action-row .clinical-button.secondary {
    grid-column: 1 / -1;
  }

  .section-step-footer {
    grid-template-columns: 1fr;
  }
}

.save-state { font-weight: 700; color: var(--color-primary-900); }
.quick-action-feedback { padding: .6rem; background: #f0f9ff; color: #334155; }
.dynamic-field { scroll-margin-top: 10rem; }
.clinical-history-page button:focus-visible, .dialog-card button:focus-visible { outline: 3px solid var(--color-primary-900); outline-offset: 3px; }
.dialog-actions { flex-wrap: wrap; }
@media (max-width: 620px) { .dialog-actions { display: grid; grid-template-columns: 1fr; } }
</style>

<style>
.v-dialog.clinical-history-dialog { border-radius: 16px; }
</style>
