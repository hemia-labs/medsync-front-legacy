<template>
  <div class="patient-treatment px-5 py-5">
    <da-loader v-bind:overlay="isLoading"></da-loader>
    <div v-if="notice.message" :role="notice.type === 'error' || notice.type === 'warning' ? 'alert' : 'status'" class="plan-feedback" :class="'feedback-' + notice.type">{{ notice.message }}</div>
    <div v-if="treatmentFocusRequest && treatmentFocusRequest.id_person === patientId" class="plan-feedback" role="status">
      Selección del odontograma pendiente. {{ activePlan ? 'Se abrirá el mismo editor de tratamiento cuando termines la edición actual.' : 'Crea un plan para conservar esta selección y preparar el tratamiento.' }}
      <button v-if="!activePlan && ready && canCreate" type="button" :disabled="isBusy" @click="openCreatePlan()">Crear plan</button>
      <button type="button" :disabled="isBusy" @click="$emit('treatment-focus-consumed', treatmentFocusRequest)">Descartar selección</button>
    </div>

    <section v-if="loadError" class="treatment-empty" role="alert">
      <h3>No se pudo actualizar el plan</h3>
      <p>{{ loadError }}</p>
      <button class="btn-outline" type="button" :disabled="isLoading || isBusy" @click="loadPlan">Reintentar consulta</button>
    </section>
    <section v-else-if="!planLoaded" class="treatment-empty" role="status">Cargando plan de tratamiento…</section>
    <section v-else-if="!moduleEnabled" class="treatment-empty">
      <v-icon color="var(--color-primary-500)" size="34">mdi-medical-bag-off-outline</v-icon>
      <h3>Plan de tratamiento deshabilitado</h3>
      <p>Actívalo desde Configuración > Módulos clínicos para usarlo en el expediente.</p>
    </section>

    <template v-else>
      <section v-if="!activePlan" class="tp-start">
        <div class="tp-start-icon" aria-hidden="true"><v-icon size="30">mdi-clipboard-text-clock-outline</v-icon></div>
        <p class="eyebrow">Plan de tratamiento</p>
        <h3 ref="sectionTitle" tabindex="-1">Sin plan activo</h3>
        <p>Crea un plan cuando el paciente inicie una etapa de tratamiento para registrar procedimientos, presupuesto y consentimiento. Los planes cerrados se conservan en el histórico.</p>
        <button v-if="canCreate" :disabled="isBusy" class="btn-primary tp-start-action" type="button" @click="openCreatePlan()">
          <v-icon size="18">mdi-plus</v-icon>
          Crear plan
        </button>
        <p v-else class="field-help">Tu acceso permite consultar planes, pero no crearlos.</p>
      </section>

      <template v-else>
        <section class="tp-plan" aria-labelledby="tp-plan-title">
          <header class="tp-plan-header">
            <div class="tp-plan-heading">
              <div class="tp-plan-kicker">
                <p class="eyebrow">Plan de tratamiento</p>
                <span class="tp-plan-state">Activo</span>
              </div>
              <h3 id="tp-plan-title" ref="sectionTitle" tabindex="-1">{{ activePlan.title }}</h3>
              <p class="tp-plan-meta">
                <span><v-icon size="15">mdi-calendar-start</v-icon>Inicio {{ formatLongDate(activePlan.started_at) }}</span>
                <span><v-icon size="15">mdi-account-outline</v-icon>{{ activePlan.created_by_name || 'Usuario no disponible' }}</span>
                <span v-if="activePlan.updated_by_name && activePlan.updated_by_name !== activePlan.created_by_name">Actualizado por {{ activePlan.updated_by_name }}</span>
              </p>
            </div>
            <div class="tp-plan-actions">
              <button :disabled="isBusy" v-if="canCreate" class="btn-primary" type="button" @click="openTreatmentDialog()">
                <v-icon size="18">mdi-plus</v-icon>
                Agregar tratamiento
              </button>
              <button :disabled="isBusy" v-if="canEdit" class="btn-outline" type="button" @click="openCreatePlan(true)">
                <v-icon size="17">mdi-pencil-outline</v-icon>
                Editar plan
              </button>
              <v-menu v-if="canClose" offset-y left>
                <template v-slot:activator="{ on, attrs }">
                  <button :disabled="isBusy" class="tp-icon-button" type="button" aria-label="Más acciones del plan" title="Más acciones del plan" v-bind="attrs" v-on="on">
                    <v-icon size="20">mdi-dots-horizontal</v-icon>
                  </button>
                </template>
                <v-list dense class="tp-menu">
                  <v-list-item class="tp-menu-danger" @click="openClosePlanDialog">
                    <v-list-item-icon><v-icon size="18">mdi-archive-check-outline</v-icon></v-list-item-icon>
                    <v-list-item-title>Cerrar plan</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </header>

          <dl v-if="activePlan.diagnosis || activePlan.notes" class="tp-plan-notes">
            <div v-if="activePlan.diagnosis">
              <dt>Diagnóstico general</dt>
              <dd>{{ activePlan.diagnosis }}</dd>
            </div>
            <div v-if="activePlan.notes">
              <dt>Notas del plan</dt>
              <dd class="preserve-lines">{{ activePlan.notes }}</dd>
            </div>
          </dl>

          <div v-if="activeTreatments.length" class="tp-progress">
            <div class="tp-progress-head">
              <p class="tp-progress-title">
                <strong>{{ countByStatus('completed') }} de {{ trackedTreatmentCount }}</strong>
                {{ trackedTreatmentCount === 1 ? 'tratamiento completado' : 'tratamientos completados' }}
              </p>
              <p v-if="showCosts" class="tp-budget">
                <span>Presupuesto</span>
                <strong>{{ formatCurrencyValue(totalCost) }}</strong>
              </p>
            </div>
            <div class="tp-progress-bar" role="img" :aria-label="progressLabel">
              <span v-for="segment in progressSegments" :key="segment.status" class="tp-progress-segment" :class="'tp-tone-' + segment.status" :style="{ flexGrow: segment.count }"></span>
            </div>
            <ul class="tp-legend">
              <li v-for="segment in progressSegments" :key="segment.status">
                <i class="tp-legend-dot" :class="'tp-tone-' + segment.status" aria-hidden="true"></i>
                {{ statusGroupLabel(segment.status) }} <strong>{{ segment.count }}</strong>
              </li>
            </ul>
            <p v-if="showCosts" class="tp-footnote">El presupuesto suma todos los tratamientos del plan, incluidos los cancelados. No representa saldo por cobrar.</p>
          </div>
          <p v-if="!canCreate && !canEdit && !canComplete && !canCancel && !canClose" class="field-help tp-readonly">Tu acceso permite consultar este plan. Las acciones dependen de tus permisos.</p>
        </section>

        <section v-if="canViewConsent || canManageSignature" class="tp-consent" :class="{ 'tp-consent--signed': hasActiveConsent, 'tp-consent--blocked': needsConsentConfiguration }">
          <div class="tp-consent-icon" aria-hidden="true">
            <v-icon size="22">{{ hasActiveConsent ? 'mdi-file-check-outline' : 'mdi-file-sign' }}</v-icon>
          </div>
          <div class="tp-consent-copy">
            <div class="tp-consent-title">
              <h4>{{ !canViewConsent ? 'Capturar consentimiento del plan' : hasActiveConsent ? 'Consentimiento firmado' : needsConsentConfiguration ? 'Falta el formato de consentimiento' : 'Consentimiento pendiente de firma' }}</h4>
              <span class="tp-consent-status">{{ !canViewConsent ? 'Sin acceso de consulta' : hasActiveConsent ? 'Firmado' : needsConsentConfiguration ? 'Falta configurar' : 'Pendiente' }}</span>
            </div>
            <p v-if="hasActiveConsent">Firmado el {{ formatDisplayDateTime(activeConsent.signed_at) }}. Se conservaron el texto, la firma del paciente y los datos del doctor.</p>
            <p v-else>
              {{ !canViewConsent ? 'Puedes capturar una nueva versión según tus permisos. El contenido de versiones anteriores no está disponible para consulta con tu acceso.'
                : needsConsentConfiguration ? 'Antes de solicitar una firma, el consultorio debe guardar un formato activo de tipo «Consentimiento del plan de tratamiento». El consentimiento general de atención es un formato distinto.'
                : 'El paciente puede revisar el consentimiento y firmar aquí o desde un enlace por QR, correo o WhatsApp.' }}
            </p>
            <p v-if="hasPendingConsentDocument" class="field-help">Hay un documento preparado pendiente de firma. Si actualizas el plan, deberás preparar una nueva versión y sus enlaces.</p>
            <p v-if="canManageSignature && consentPrerequisite" id="plan-consent-prerequisite" class="field-help" role="status">{{ consentPrerequisite }}</p>
          </div>
          <div class="tp-consent-actions">
            <v-select v-if="canManageSignature && !needsConsentConfiguration" v-model="doctorUserId" :items="eligibleDoctors" item-text="professional_name" item-value="id_login" label="Doctor que firma" outlined dense :disabled="contextLoading || isBusy" hide-details class="tp-doctor-select"></v-select>
            <div class="tp-consent-buttons">
              <router-link v-if="needsConsentConfiguration && canConfigurePlanConsent" class="btn-outline" :to="{ path: '/admin', query: { section: 'documents' } }">Configurar consentimiento</router-link>
              <button v-if="needsConsentConfiguration" class="btn-outline" type="button" :disabled="contextLoading || isBusy" @click="loadConsentContext()">Actualizar requisitos</button>
              <button :disabled="isBusy" v-if="canManageSignature && contextError" class="btn-outline" type="button" @click="loadConsentContext()">Reintentar doctores y texto</button>
              <button :disabled="isBusy" v-if="hasActiveConsent && canViewConsent" class="btn-outline" type="button" @click="openConsentDialog('view')">
                <v-icon size="17">mdi-eye-outline</v-icon>
                Ver
              </button>
              <button v-if="canManageSignature && !needsConsentConfiguration" :class="hasActiveConsent ? 'btn-outline' : 'btn-primary'" type="button" :disabled="Boolean(consentPrerequisite) || isBusy" :aria-describedby="consentPrerequisite ? 'plan-consent-prerequisite' : null" @click="requestConsentSignature">
                <v-icon size="17">mdi-draw-pen</v-icon>
                {{ canReuseConsentDocument ? 'Continuar firma' : !canViewConsent ? 'Preparar firma' : hasActiveConsent ? 'Nueva versión' : 'Solicitar firma' }}
              </button>
            </div>
          </div>
        </section>

        <section class="tp-treatments" aria-labelledby="tp-treatments-title">
          <header class="tp-treatments-header">
            <h4 id="tp-treatments-title">Tratamientos <span class="tp-count">{{ activeTreatments.length }}</span></h4>
            <div v-if="activeTreatments.length" class="tp-filters" role="group" aria-label="Filtrar tratamientos por estado">
              <button
                v-for="item in visibleFilters"
                :key="item.value"
                :disabled="isBusy"
                type="button"
                :class="{ active: filter === item.value }"
                :aria-pressed="String(filter === item.value)"
                @click="filter = item.value"
              >
                {{ item.label }}
                <span class="tp-filter-count">{{ item.value === 'all' ? activeTreatments.length : countByStatus(item.value) }}</span>
              </button>
            </div>
          </header>

          <ul v-if="filteredTreatments.length > 0" class="tp-list">
            <li v-for="item in filteredTreatments" :key="item.id_patient_treatment" class="tp-card" :class="'tp-card--' + item.status">
              <div class="tp-card-body">
                <div class="tp-card-top">
                  <h5>{{ item.name }}</h5>
                  <span v-if="showStatus" class="tp-status" :class="'tp-tone-' + item.status">{{ statusLabel(item.status) }}</span>
                  <strong v-if="showCosts && hasCost(item)" class="tp-cost">{{ formatCurrencyValue(item.cost) }}</strong>
                </div>
                <p v-if="item.description" class="tp-description">{{ item.description }}</p>
                <div v-if="item.category || dateRange(item) || (item.teeth && item.teeth.length)" class="tp-meta">
                  <span v-if="item.category"><v-icon size="15">mdi-tag-outline</v-icon>{{ item.category }}</span>
                  <span v-if="dateRange(item)"><v-icon size="15">mdi-calendar-range</v-icon>{{ dateRange(item) }}</span>
                  <span v-for="tooth in item.teeth || []" :key="tooth" class="tp-tooth"><v-icon size="14">mdi-tooth-outline</v-icon>{{ dentalLabel(item, tooth) }}</span>
                </div>
                <p v-if="item.notes" class="tp-note"><v-icon size="15">mdi-note-text-outline</v-icon><span>{{ item.notes }}</span></p>
              </div>
              <div class="tp-card-actions">
                <button v-if="primaryStatusAction(item)" :disabled="isBusy" class="tp-action tp-action--primary" type="button" @click="changeStatus(item, primaryStatusAction(item).status)">
                  <v-icon size="17">{{ primaryStatusAction(item).icon }}</v-icon>
                  {{ primaryStatusAction(item).label }}
                </button>
                <button :disabled="isBusy" v-if="canEdit" class="tp-action" type="button" :aria-label="`Editar tratamiento ${item.name}`" @click="openTreatmentDialog(item)">
                  <v-icon size="17">mdi-pencil-outline</v-icon>
                  Editar
                </button>
                <v-menu v-if="secondaryStatusActions(item).length || canEdit" offset-y left>
                  <template v-slot:activator="{ on, attrs }">
                    <button :disabled="isBusy" class="tp-icon-button" type="button" :aria-label="`Más acciones para ${item.name}`" :title="`Más acciones para ${item.name}`" v-bind="attrs" v-on="on">
                      <v-icon size="20">mdi-dots-horizontal</v-icon>
                    </button>
                  </template>
                  <v-list dense class="tp-menu">
                    <v-subheader v-if="secondaryStatusActions(item).length">Cambiar estado a</v-subheader>
                    <v-list-item v-for="option in secondaryStatusActions(item)" :key="option.value" :class="{ 'tp-menu-danger': option.value === 'cancelled' }" @click="option.value === 'cancelled' ? requestCancelTreatment(item) : changeStatus(item, option.value)">
                      <v-list-item-icon><i class="tp-legend-dot" :class="'tp-tone-' + option.value" aria-hidden="true"></i></v-list-item-icon>
                      <v-list-item-title>{{ option.label }}</v-list-item-title>
                    </v-list-item>
                    <v-divider v-if="canEdit && secondaryStatusActions(item).length"></v-divider>
                    <v-list-item v-if="canEdit" class="tp-menu-danger" @click="requestDeleteTreatment(item)">
                      <v-list-item-icon><v-icon size="18">mdi-trash-can-outline</v-icon></v-list-item-icon>
                      <v-list-item-title>Eliminar tratamiento</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </li>
          </ul>

          <div v-else class="tp-list-empty">
            <v-icon size="30">mdi-clipboard-plus-outline</v-icon>
            <h5>{{ emptyStateTitle }}</h5>
            <p>{{ emptyStateText }}</p>
            <div class="tp-list-empty-actions">
              <button :disabled="isBusy" v-if="filter !== 'all'" class="btn-outline" type="button" @click="filter = 'all'">Ver todos</button>
              <button :disabled="isBusy" v-if="canCreate && filter === 'all'" class="btn-primary" type="button" @click="openTreatmentDialog()">
                <v-icon size="18">mdi-plus</v-icon>
                Agregar tratamiento
              </button>
            </div>
          </div>
        </section>
      </template>

      <section v-if="historyTotal > 0" class="tp-history" :class="{ 'tp-history--open': showHistorySection }">
        <button :disabled="isBusy" class="tp-history-toggle" type="button" :aria-expanded="String(showHistorySection)" @click="showHistorySection = !showHistorySection">
          <span class="tp-history-heading">
            <v-icon size="20">mdi-history</v-icon>
            Planes cerrados
            <span class="tp-count">{{ historyTotal }}</span>
          </span>
          <v-icon size="22">{{ showHistorySection ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </button>
        <transition name="history-expand">
          <div v-show="showHistorySection" class="tp-history-content">
            <p v-if="historyPlans.length === 0" class="tp-history-empty">Aún no hay planes cerrados.</p>
            <article v-for="plan in historyPlans" :key="plan.id_treatment_plan" class="tp-history-card">
              <div class="tp-history-main">
                <div class="tp-history-title">
                  <strong>{{ plan.title || 'Plan de tratamiento' }}</strong>
                  <span>{{ formatLongDate(plan.started_at) }} – {{ formatLongDate(plan.closed_at) }}</span>
                </div>
                <ul class="tp-history-facts">
                  <li><strong>{{ planTreatments(plan).length }}</strong> {{ planTreatments(plan).length === 1 ? 'tratamiento' : 'tratamientos' }}</li>
                  <li><strong>{{ planStatusCount(plan, 'completed') }}</strong> completados</li>
                  <li v-if="planStatusCount(plan, 'cancelled')"><strong>{{ planStatusCount(plan, 'cancelled') }}</strong> cancelados</li>
                  <li v-if="showCosts">Presupuesto <strong>{{ formatCurrencyValue(planTotalCost(plan)) }}</strong></li>
                  <li>Consentimiento: <strong>{{ consentStatusLabel(plan) }}</strong></li>
                </ul>
                <p v-if="plan.close_reason" class="tp-history-reason">{{ formatCloseReason(plan.close_reason) }}</p>
              </div>
              <div class="tp-history-actions">
                <button :disabled="isBusy" class="tp-action" type="button" @click="openHistory(plan)">
                  <v-icon size="17">mdi-eye-outline</v-icon>
                  Ver plan
                </button>
                <button :disabled="isBusy" v-if="hasPlanConsent(plan)" class="tp-action" type="button" @click="openHistoryConsent(plan)">
                  <v-icon size="17">mdi-file-sign</v-icon>
                  Consentimiento
                </button>
                <button :disabled="isBusy" class="tp-action" type="button" :aria-label="`Imprimir ${plan.title || 'plan de tratamiento'}`" @click="printHistory(plan)">
                  <v-icon size="17">mdi-printer-outline</v-icon>
                  Imprimir
                </button>
              </div>
            </article>
            <list-page-nav v-if="historyPageCount > 1" :pagination="localPlanData && localPlanData.historyPagination" :busy="isLoading || isBusy" label="Páginas de planes anteriores" @change="changeHistoryPage" />
          </div>
        </transition>
      </section>
    </template>

    <v-dialog v-model="showPlanDialog" persistent max-width="560">
      <v-card v-dialog-name="planEditing ? 'Editar datos del plan activo' : 'Crear plan activo'" class="plan-editor-card" @keydown="trapDialogFocus" ref="planEditor">
        <div class="dialog-header plan-editor-header">
          <span class="plan-editor-icon"><v-icon size="26">mdi-medical-bag</v-icon></span>
          <div class="plan-editor-heading">
            <p class="eyebrow">Expediente clínico · {{ planEditing ? 'Datos del plan' : 'Nuevo plan' }}</p>
            <h3>{{ planEditing ? 'Editar datos del plan activo' : 'Crear plan activo' }}</h3>
            <p class="plan-editor-description">Organiza los procedimientos y da seguimiento a la atención del paciente.</p>
            <span v-if="dirty" class="unsaved-state">Sin guardar</span>
          </div>
          <v-btn icon aria-label="Cerrar datos del plan" :disabled="isBusy" @click="closeEditor"><v-icon>mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <div v-if="notice.message" :role="notice.type === 'error' || notice.type === 'warning' ? 'alert' : 'status'" class="plan-feedback" :class="'feedback-' + notice.type">{{ notice.message }}</div>
          <p class="field-help">{{ planEditing ? 'Puedes corregir estos datos mientras el plan está activo. Se conserva un registro del cambio.' : 'Crear guarda un plan activo de inmediato. La captura sin guardar no es un borrador persistido. Cada tratamiento nuevo comenzará Pendiente.' }}</p>
          <v-text-field :disabled="isBusy" v-model="planForm.title" v-field-error="{ id: 'plan-title', invalid: Boolean(fieldErrors('title').length) }" :error-messages="fieldErrors('title')" label="Nombre del plan (obligatorio)" dense outlined :color="themePrimaryColor"></v-text-field>
          <v-text-field v-field-error="{ id: 'plan-field-started_at', required: false, invalid: Boolean(fieldErrors('started_at').length) }" :disabled="isBusy" v-model="planForm.started_at" :error-messages="fieldErrors('started_at')" type="date" label="Fecha de inicio" dense outlined :color="themePrimaryColor"></v-text-field>
          <v-textarea v-field-error="{ id: 'plan-field-diagnosis', required: false, invalid: Boolean(fieldErrors('diagnosis').length) }" :disabled="isBusy" v-model="planForm.diagnosis" :error-messages="fieldErrors('diagnosis')" label="Diagnóstico general (opcional)" rows="2" outlined :color="themePrimaryColor"></v-textarea>
          <v-textarea v-field-error="{ id: 'plan-field-notes', required: false, invalid: Boolean(fieldErrors('notes').length) }" :disabled="isBusy" v-model="planForm.notes" :error-messages="fieldErrors('notes')" label="Notas del plan (opcional)" rows="2" outlined :color="themePrimaryColor"></v-textarea>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button :disabled="isBusy" class="btn-outline" type="button" @click="closeEditor">Cancelar</button>
          <button :disabled="isBusy" class="btn-primary" type="button" @click="createPlan">{{ isBusy ? 'Guardando…' : planEditing ? 'Guardar datos del plan' : 'Crear plan activo' }}</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showTreatmentDialog" persistent max-width="900">
      <v-card v-dialog-name="treatmentForm.id_patient_treatment ? 'Editar tratamiento' : 'Agregar tratamiento'" @keydown="trapDialogFocus" ref="treatmentEditor">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Tratamiento</p>
            <h3>{{ treatmentForm.id_patient_treatment ? 'Editar tratamiento' : 'Agregar tratamiento' }}</h3>
            <span v-if="dirty" class="unsaved-state">Sin guardar</span>
          </div>
          <v-btn icon aria-label="Cerrar ventana" :disabled="isBusy" @click="closeEditor"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <div v-if="notice.message" :role="notice.type === 'error' || notice.type === 'warning' ? 'alert' : 'status'" class="plan-feedback" :class="'feedback-' + notice.type">{{ notice.message }}</div>
          <section class="form-section">
            <div class="form-section-header">
              <h4>Información básica</h4>
            </div>
            <div class="form-grid">
              <v-text-field :disabled="isBusy" v-model="treatmentForm.name" v-field-error="{ id: 'treatment-name', invalid: Boolean(fieldErrors('name').length) }" :error-messages="fieldErrors('name')" label="Nombre del tratamiento (obligatorio)" dense outlined :color="themePrimaryColor"></v-text-field>
              <v-text-field v-field-error="{ id: 'plan-field-cost', required: false, invalid: Boolean(fieldErrors('cost').length) }" v-if="showCosts" v-model="treatmentForm.cost" :disabled="!canEditCosts || isBusy" :error-messages="fieldErrors('cost')" type="number" min="0" step="0.01" label="Costo estimado (opcional)" dense outlined :color="themePrimaryColor"></v-text-field>
              <v-text-field v-field-error="{ id: 'plan-field-category', required: false, invalid: Boolean(fieldErrors('category').length) }" :disabled="isBusy" v-model="treatmentForm.category" :error-messages="fieldErrors('category')" label="Categoría (opcional)" dense outlined :color="themePrimaryColor"></v-text-field>
              <v-select :disabled="isBusy" v-if="showStatus && treatmentForm.id_patient_treatment" v-model="treatmentForm.status" :items="statusOptions" item-text="label" item-value="value" label="Estado" dense outlined :color="themePrimaryColor"></v-select>
            </div>
            <p v-if="!treatmentForm.id_patient_treatment" class="field-help">Los tratamientos nuevos se crean automáticamente como Pendiente.</p>
          </section>

          <section class="form-section">
            <div class="form-section-header">
              <h4>Fechas estimadas</h4>
            </div>
            <div class="form-grid">
              <v-text-field v-field-error="{ id: 'plan-field-estimated_start_date', required: false, invalid: Boolean(fieldErrors('estimated_start_date').length) }" :disabled="isBusy" v-model="treatmentForm.estimated_start_date" :error-messages="fieldErrors('estimated_start_date')" type="date" label="Inicio estimado (opcional)" dense outlined :color="themePrimaryColor"></v-text-field>
              <v-text-field v-field-error="{ id: 'plan-field-estimated_end_date', required: false, invalid: Boolean(fieldErrors('estimated_end_date').length) }" :disabled="isBusy" v-model="treatmentForm.estimated_end_date" :error-messages="fieldErrors('estimated_end_date')" type="date" :min="treatmentForm.estimated_start_date || undefined" label="Fin estimado (opcional)" dense outlined :color="themePrimaryColor"></v-text-field>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section-header">
              <h4>Detalle clínico</h4>
            </div>
            <v-textarea v-field-error="{ id: 'plan-field-description', required: false, invalid: Boolean(fieldErrors('description').length) }" :disabled="isBusy"
              v-model="treatmentForm.description"
              :error-messages="fieldErrors('description')"
              label="Descripción del tratamiento"
              hint="Texto visible dentro del plan para identificar que se realizara."
              persistent-hint
              rows="2"
              outlined
              :color="themePrimaryColor"
            ></v-textarea>
            <v-textarea v-field-error="{ id: 'plan-field-notes', required: false, invalid: Boolean(fieldErrors('notes').length) }" :disabled="isBusy"
              v-model="treatmentForm.notes"
              :error-messages="fieldErrors('notes')"
              label="Notas clínicas internas"
              hint="Observaciones del profesional. Úsalas para detalles internos del seguimiento clínico."
              persistent-hint
              rows="2"
              outlined
              :color="themePrimaryColor"
            ></v-textarea>
          </section>

          <section v-if="showToothSelector" class="tooth-selector form-section">
            <div>
              <h4>Dientes asociados</h4>
              <span>Selecciona piezas permanentes (11–48) o temporales (51–85). La selección es opcional y no requiere odontograma.</span>
            </div>
            <div class="tooth-grid">
              <button :disabled="isBusy"
                v-for="tooth in toothOptions"
                :key="tooth"
                type="button"
                :class="{ selected: treatmentForm.teeth.includes(tooth) }"
                :aria-pressed="String(treatmentForm.teeth.includes(tooth))"
                :aria-label="`Diente ${tooth}`"
                @click="toggleTooth(tooth)"
              >
                {{ tooth }}
              </button>
            </div>
            <treatment-dental-details v-if="config.dentalSchemaAvailable" v-model="treatmentForm.tooth_details" :teeth="treatmentForm.teeth" :patient-id="patientId" :busy="isBusy" :can-read="Boolean(planData.permissions && planData.permissions.odontogramRead)" @selection="treatmentForm.teeth = $event" @context-notes="appendDentalContext" />
          </section>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button :disabled="isBusy" class="btn-outline" type="button" @click="closeEditor">Cancelar</button>
          <button :disabled="isBusy" class="btn-primary" type="button" @click="saveTreatment">{{ isBusy ? 'Guardando…' : 'Guardar tratamiento' }}</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showCloseDialog" persistent max-width="540">
      <v-card v-dialog-name="'Cerrar plan activo'" @keydown="trapDialogFocus">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Cerrar plan</p>
            <h3>Cerrar plan activo</h3>
          </div>
          <v-btn icon aria-label="Cerrar ventana" :disabled="isBusy" @click="closeEditor"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <div v-if="notice.message" :role="notice.type === 'error' || notice.type === 'warning' ? 'alert' : 'status'" class="plan-feedback" :class="'feedback-' + notice.type">{{ notice.message }}</div>
          <div class="info-box">
            <strong>Al cerrar este plan:</strong>
            <ul>
              <li>Ya no podrás editar sus tratamientos.</li>
              <li>Quedará disponible solo para consulta.</li>
              <li>Se guardará en el histórico del paciente.</li>
              <li>Podrás crear un nuevo plan activo después.</li>
              <li v-if="hasPendingConsentDocument">Se invalidará el consentimiento pendiente y sus enlaces de firma. Los consentimientos ya firmados se conservan.</li>
            </ul>
          </div>
          <div v-if="activeTreatments.length === 0" class="warning-box">
            <v-icon size="20">mdi-alert-circle-outline</v-icon>
            <span>Este plan no tiene tratamientos registrados. Puedes cerrarlo, pero quedará en histórico sin procedimientos.</span>
          </div>
          <div v-if="unfinishedCount" class="warning-box" role="status">
            <div><strong>{{ unfinishedCount }} tratamiento(s) sin terminar</strong><p>Pendientes: {{ countByStatus('pending') }} · En progreso: {{ countByStatus('in_progress') }} · Pausados: {{ countByStatus('paused') }}.</p><p>Conservarán estos estados en el histórico. Cerrar no los completa ni cancela.</p></div>
          </div>
          <p class="field-help">Completados: {{ countByStatus('completed') }} · Cancelados: {{ countByStatus('cancelled') }}.</p>
          <div v-if="canViewConsent && !hasActiveConsent" class="warning-box">
            <v-icon size="20">mdi-alert-circle-outline</v-icon>
            <span>Este plan aún no tiene consentimiento firmado. Puedes cerrarlo, pero quedará registrado sin consentimiento firmado.</span>
          </div>
          <div v-else-if="canViewConsent && hasActiveConsent" class="success-box">
            <v-icon size="20">mdi-file-check-outline</v-icon>
            <span>Consentimiento del plan: Firmado</span>
          </div>
          <p v-else class="field-help">Tu acceso no permite consultar el consentimiento de este plan.</p>
          <v-textarea :disabled="isBusy" v-model="closeReason" label="Motivo o resumen de cierre" rows="3" outlined :color="themePrimaryColor"></v-textarea>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button :disabled="isBusy" class="btn-outline" type="button" @click="closeEditor">Cancelar</button>
          <button :disabled="isBusy" class="btn-danger" type="button" @click="closePlan">Cerrar plan</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showConsentDialog" persistent max-width="920">
      <v-card v-dialog-name="consentMode === 'view' ? 'Consultar consentimiento firmado' : 'Capturar firma del paciente'" @keydown="trapDialogFocus">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Consentimiento de tratamiento</p>
            <h3>{{ consentMode === 'view' ? 'Consentimiento firmado' : 'Capturar firma del paciente' }}</h3>
          </div>
          <v-btn icon aria-label="Cerrar ventana" :disabled="isBusy" @click="closeEditor"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body consent-dialog-body">
          <div v-if="notice.message" :role="notice.type === 'error' || notice.type === 'warning' ? 'alert' : 'status'" class="plan-feedback" :class="'feedback-' + notice.type">{{ notice.message }}</div>
          <section v-if="consentMode === 'view'" class="clinical-document">
            <header class="document-header">
              <div>
                <p class="sheet-brand">{{ businessName }}</p>
                <h3>Consentimiento del plan de tratamiento</h3>
                <span class="document-subtitle">Documento clínico firmado</span>
              </div>
              <div class="document-status-block">
                <span class="consent-status signed">Firmado</span>
                <small>Folio: {{ consentFolio }}</small>
                <small>Firmado: {{ selectedConsent ? formatDateTime(selectedConsent.signed_at) : 'No especificado' }}</small>
              </div>
            </header>

            <section class="document-data-grid">
              <div><strong>Paciente</strong><span>{{ consentPatientName || 'No especificado' }}</span></div>
              <div><strong>Edad</strong><span>{{ consentPatientAge === '' ? 'No especificado' : consentPatientAge }}</span></div>
              <div><strong>Doctor firmante</strong><span>{{ currentDoctorName || 'No especificado' }}</span></div>
              <div><strong>Cédula profesional</strong><span>{{ professionalLicenseDisplay }}</span></div>
              <div><strong>Fecha de creación</strong><span>{{ selectedConsent ? formatDisplayDateTime(selectedConsent.created_at) : 'No especificado' }}</span></div>
              <div><strong>Fecha de firma</strong><span>{{ selectedConsent ? formatDisplayDateTime(selectedConsent.signed_at) : 'No especificado' }}</span></div>
            </section>
            <v-select :disabled="isBusy" v-if="consentVersions.length > 1" v-model="selectedConsentVersion" :items="consentVersions" :item-text="version => `Versión ${version.revision} · ${formatDisplayDateTime(version.signed_at)}`" item-value="id_consent_version" return-object label="Consultar versión firmada" outlined dense></v-select>

            <section class="document-section">
              <p class="eyebrow">Declaro</p>
              <div class="document-text" v-html="documentDeclareText"></div>
            </section>
            <section v-if="documentConsentText" class="document-section">
              <p class="eyebrow">Consiento</p>
              <div class="document-text" v-html="documentConsentText"></div>
            </section>
            <section class="document-section">
              <p class="eyebrow">Plan relacionado</p>
              <div v-if="selectedConsent && selectedConsent.plan_snapshot" class="document-related">
                <span>Tratamientos: {{ consentPlanTreatments.length }}</span>
                <span v-if="showCosts">Presupuesto al firmar: {{ formatCurrencyValue(planTotalCost(selectedConsent.plan_snapshot)) }}</span>
              </div>
              <ul v-if="consentPlanTreatments.length" class="document-treatment-list">
                <li v-for="item in consentPlanTreatments" :key="item.id_patient_treatment">
                  {{ item.name }} <span>{{ statusLabel(item.status) }}</span>
                </li>
              </ul>
              <p v-else class="muted-copy">{{ selectedConsent && selectedConsent.plan_snapshot ? 'No había tratamientos registrados al firmar.' : 'Consentimiento anterior: no se guardó una copia de los tratamientos al firmar. Se conservan el texto y las firmas originales.' }}</p>
            </section>
            <section class="document-signatures">
              <article>
                <span>Firma del doctor</span>
                <img v-if="currentDoctorSignature" :src="currentDoctorSignature" alt="Firma del doctor">
                <p v-else>Sin firma de doctor registrada.</p>
                <strong>{{ currentDoctorName || 'Doctor no especificado' }}</strong>
              </article>
              <article>
                <span>{{ selectedConsent && selectedConsent.patient_signature_role === 'TUTOR' ? 'Firma del tutor o representante' : 'Firma del paciente' }}</span>
                <img v-if="selectedConsent && selectedConsent.patient_signature" :src="selectedConsent.patient_signature" :alt="selectedConsent.patient_signature_role === 'TUTOR' ? 'Firma del tutor o representante' : 'Firma del paciente'">
                <p v-else>Sin firma del paciente registrada.</p>
                <strong>{{ selectedConsent && selectedConsent.patient_signer_name_snapshot || consentPatientName || 'Paciente no especificado' }}</strong>
              </article>
              <article v-for="signature in additionalConsentSignatures" :key="signature.signature_role"><span>{{ signature.signature_role === 'WITNESS1' ? 'Testigo 1' : 'Testigo 2' }}</span><img :src="signature.signature_image" alt="Firma de testigo"><strong>{{ signature.signer_name_snapshot }}</strong></article>
            </section>
          </section>
          <section v-else class="consent-preview" @pointerdown="onSignatureStroke">
            <p class="field-help">Doctor: {{ currentDoctorName }} · Cédula: {{ currentDoctorProfessionalLicense }}. Revisa el texto y los tratamientos. Aplicar captura el trazo; Guardar consentimiento lo registra.</p>
            <p v-if="!currentDoctorSignature" class="warning-box">El doctor no tiene una imagen de firma profesional registrada. Se guardarán sus datos y la firma del paciente, sin imagen de firma del doctor.</p>
            <p v-if="dirty" class="unsaved-state" role="status">Firma sin guardar</p>
            <div v-if="preparedConsentDocument" class="consent-text-card" v-html="textToHtml(preparedConsentDocument.content_html_snapshot)"></div>
            <v-select v-if="preparedConsentDocument" v-model="localSignatureRole" :items="localSignatureRoles" item-text="label" item-value="value" label="Persona que firma" dense outlined :disabled="isBusy" @change="onLocalSignatureRoleChanged"></v-select>
            <v-text-field v-if="preparedConsentDocument && localSignatureRole !== 'PATIENT'" v-model="localSignerName" label="Nombre de quien firma (obligatorio)" dense outlined :disabled="isBusy"></v-text-field>
            <div v-if="!preparedConsentDocument" class="consent-text-card"><strong>{{ activePlan ? activePlan.title : '' }}</strong><ul><li v-for="item in consentPlanTreatments" :key="item.id_patient_treatment">{{ item.name }} · {{ statusLabel(item.status) }}</li></ul></div>
            <div v-if="!preparedConsentDocument" class="consent-text-card" :class="{ 'full-width': planConsentTemplate && consentMode !== 'view' }">
              <p class="eyebrow">Declaro</p>
              <div v-if="planConsentTemplate && consentMode !== 'view'" v-html="textToHtml(currentDeclareText || 'No hay plantilla configurada.')"></div>
              <p v-else>{{ currentDeclareText || 'No hay texto DECLARO configurado.' }}</p>
            </div>
            <div v-if="!preparedConsentDocument && !(planConsentTemplate && consentMode !== 'view')" class="consent-text-card">
              <p class="eyebrow">Consiento</p>
              <p>{{ currentConsentText || 'No hay texto CONSIENTO configurado.' }}</p>
            </div>
            <div class="signature-grid">
              <article>
                <span>Firma del doctor</span>
                <img v-if="currentDoctorSignature" :src="currentDoctorSignature" alt="Firma del doctor">
                <p v-else>Sin firma de doctor configurada.</p>
                <strong>{{ currentDoctorName || 'Doctor no configurado' }}</strong>
              </article>
              <article>
                <span>{{ localSignatureRoles.find(role => role.value === localSignatureRole) ? `Firma: ${localSignatureRoles.find(role => role.value === localSignatureRole).label}` : 'Firma del paciente' }}</span>
                <img v-if="consentMode === 'view' && selectedConsent && selectedConsent.patient_signature" :src="selectedConsent.patient_signature" alt="Firma del paciente">
                <da-signature-pad
                  v-else
                  :key="consentRequestId"
                  required
                  track-changes
                  v-on:changed="onConsentChanged"
                  v-on:signed="onConsentSigned"
                ></da-signature-pad>
              </article>
            </div>
          </section>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button :disabled="isBusy" class="btn-outline" type="button" @click="closeEditor">Cerrar</button>
          <button :disabled="isBusy" v-if="consentMode === 'view' && consentPlan" class="btn-outline" type="button" @click="printConsent(consentPlan)">
            <v-icon size="17">mdi-printer-outline</v-icon>
            Imprimir consentimiento
          </button>
          <button :disabled="isBusy" v-if="consentMode !== 'view' && canSign" class="btn-primary" type="button" @click="saveConsent">
            <v-icon size="17">mdi-content-save-check-outline</v-icon>
            {{ isBusy ? 'Guardando…' : 'Guardar consentimiento' }}
          </button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showHistoryDialog" max-width="980">
      <v-card v-dialog-name="'Consultar plan cerrado'" @keydown="trapDialogFocus">
        <div class="dialog-header history-dialog-header">
          <div>
            <p class="eyebrow">Histórico de tratamiento</p>
            <h3>{{ selectedHistory ? selectedHistory.title : '' }}</h3>
            <span>Este plan está cerrado y se muestra solo para consulta.</span>
          </div>
          <span class="history-state-chip">Cerrado</span>
          <v-btn icon aria-label="Cerrar ventana" :disabled="isBusy" @click="showHistoryDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text v-if="selectedHistory" class="dialog-body history-dialog-body">
          <div v-if="notice.message" :role="notice.type === 'error' || notice.type === 'warning' ? 'alert' : 'status'" class="plan-feedback" :class="'feedback-' + notice.type">{{ notice.message }}</div>
          <section class="history-overview">
            <div class="history-overview-main">
              <div>
                <small>Inicio</small>
                <strong>{{ formatDisplayDate(selectedHistory.started_at) }}</strong>
              </div>
              <div>
                <small>Cierre</small>
                <strong>{{ formatDisplayDateTime(selectedHistory.closed_at) }}</strong>
              </div>
              <div>
                <small>Creado por</small>
                <strong>{{ selectedHistory.created_by_name || 'Usuario no disponible' }}</strong>
              </div>
              <div v-if="selectedHistory.close_reason" class="history-overview-reason">
                <small>Resumen de cierre:</small>
                <p>{{ formatCloseReason(selectedHistory.close_reason) }}</p>
              </div>
            </div>
          </section>
          <section class="plan-details">
            <p v-if="selectedHistory.diagnosis"><strong>Diagnóstico general:</strong> {{ selectedHistory.diagnosis }}</p>
            <p v-if="selectedHistory.notes" class="preserve-lines"><strong>Notas del plan:</strong> {{ selectedHistory.notes }}</p>
            <p v-if="selectedHistory.closed_by_name" class="field-help">Cerrado por {{ selectedHistory.closed_by_name }}</p>
          </section>

          <section class="history-summary-grid">
            <article><span>Total</span><strong>{{ selectedHistoryTreatments.length }}</strong></article>
            <article><span>Pendientes</span><strong>{{ planStatusCount(selectedHistory, 'pending') }}</strong></article>
            <article><span>En progreso</span><strong>{{ planStatusCount(selectedHistory, 'in_progress') }}</strong></article>
            <article><span>Pausados</span><strong>{{ planStatusCount(selectedHistory, 'paused') }}</strong></article>
            <article><span>Completados</span><strong>{{ planStatusCount(selectedHistory, 'completed') }}</strong></article>
            <article><span>Cancelados</span><strong>{{ planStatusCount(selectedHistory, 'cancelled') }}</strong></article>
            <article v-if="showCosts" class="summary-total-cost"><span>Presupuesto del plan</span><strong>{{ formatCurrencyValue(planTotalCost(selectedHistory)) }}</strong></article>
          </section>

          <section v-if="canViewConsent" class="history-consent-block" :class="{ signed: hasPlanConsent(selectedHistory) }">
            <div>
              <p class="eyebrow">Consentimiento</p>
              <strong>{{ consentStatusLabel(selectedHistory) }}</strong>
              <span v-if="hasPlanConsent(selectedHistory)">Firmado: {{ formatDisplayDateTime(selectedHistory.consent.signed_at) }}</span>
              <span v-else>Sin consentimiento firmado para este plan.</span>
            </div>
            <button :disabled="isBusy" v-if="hasPlanConsent(selectedHistory)" class="btn-outline" type="button" @click="openHistoryConsent(selectedHistory)">
              <v-icon size="17">mdi-eye-outline</v-icon>
              Ver consentimiento
            </button>
          </section>

          <section class="history-treatment-section">
            <div class="section-heading-row">
              <div>
                <p class="eyebrow">Tratamientos del plan cerrado</p>
                <h4>Consulta clínica</h4>
              </div>
            </div>
            <article v-for="item in selectedHistoryTreatments" :key="item.id_patient_treatment" class="readonly-treatment history-treatment-card">
              <div class="title-row">
                <strong>{{ item.name }}</strong>
                <span class="status-chip" :class="'status-' + item.status">{{ statusLabel(item.status) }}</span>
              </div>
              <div class="meta-row">
                <span v-if="item.estimated_start_date"><v-icon size="15">mdi-calendar-start</v-icon>{{ formatDisplayDate(item.estimated_start_date) }}</span>
                <span v-if="item.estimated_end_date"><v-icon size="15">mdi-calendar-check</v-icon>{{ formatDisplayDate(item.estimated_end_date) }}</span>
                <span v-if="showCosts && item.cost !== null && item.cost !== undefined && item.cost !== ''"><v-icon size="15">mdi-cash</v-icon>{{ formatCurrencyValue(item.cost) }}</span>
              </div>
              <p v-if="item.description">{{ item.description }}</p>
              <div v-if="item.teeth && item.teeth.length" class="tooth-row">
                <span v-for="tooth in item.teeth" :key="tooth">{{ dentalLabel(item, tooth) }}</span>
              </div>
              <div v-if="item.notes" class="notes-toggle">
                <button :disabled="isBusy" class="btn-text" type="button" @click="toggleHistoryNotes(item.id_patient_treatment)">
                  {{ isHistoryNotesOpen(item.id_patient_treatment) ? 'Ocultar notas clínicas' : 'Ver notas clínicas' }}
                </button>
                <p v-if="isHistoryNotesOpen(item.id_patient_treatment)" class="notes history-note">{{ item.notes }}</p>
              </div>
            </article>
            <div v-if="selectedHistoryTreatments.length === 0" class="history-empty">Este plan cerrado no tiene tratamientos registrados.</div>
          </section>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button :disabled="isBusy" class="btn-outline" type="button" @click="showHistoryDialog = false">Cerrar</button>
          <button :disabled="isBusy" v-if="selectedHistory && hasPlanConsent(selectedHistory)" class="btn-outline" type="button" @click="openHistoryConsent(selectedHistory)">Ver consentimiento</button>
          <button :disabled="isBusy" v-if="selectedHistory" class="btn-outline" type="button" @click="printHistory(selectedHistory)">
            <v-icon size="17">mdi-printer-outline</v-icon>
            Imprimir plan
          </button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmDialog.show" persistent max-width="460">
      <v-card v-dialog-name="confirmDialog.title" @keydown="trapDialogFocus">
        <div class="dialog-header compact">
          <div>
            <p class="eyebrow">{{ confirmDialog.eyebrow }}</p>
            <h3>{{ confirmDialog.title }}</h3>
          </div>
          <v-btn icon aria-label="Cerrar ventana" :disabled="isBusy" @click="closeConfirmDialog"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <div v-if="notice.message" :role="notice.type === 'error' || notice.type === 'warning' ? 'alert' : 'status'" class="plan-feedback" :class="'feedback-' + notice.type">{{ notice.message }}</div>
          <p class="confirm-message">{{ confirmDialog.message }}</p>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button :disabled="isBusy" class="btn-outline" type="button" @click="closeConfirmDialog">Cancelar</button>
          <button :disabled="isBusy" :class="confirmDialog.type === 'recaptureConsent' ? 'btn-primary' : 'btn-danger'" type="button" @click="confirmPendingAction">{{ confirmDialog.confirmText }}</button>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showLeaveDialog" persistent max-width="580">
      <v-card v-dialog-name="'Tienes cambios sin guardar'" class="leave-card" @keydown="trapDialogFocus" @keydown.esc.stop="resolveLeave('stay')">
        <div class="dialog-header"><div><p class="eyebrow">Continuidad de captura</p><h3>Tienes cambios sin guardar</h3></div></div>
        <v-card-text class="dialog-body">
          <p>{{ editorKind === 'close' ? 'Guardar confirmará el cierre y dejará el plan como histórico de solo lectura.' : editorKind === 'plan' && !planEditing ? 'Guardar creará el plan activo antes de salir.' : 'Puedes guardar antes de salir o continuar con tu captura.' }}</p>
          <div v-if="notice.message" role="status" class="plan-feedback" :class="'feedback-' + notice.type">{{ notice.message }}</div>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-primary" type="button" :disabled="isBusy" @click="resolveLeave('save')">{{ editorKind === 'close' ? 'Cerrar plan y salir' : 'Guardar y salir' }}</button>
          <button class="btn-danger-secondary" type="button" :disabled="isBusy" @click="resolveLeave('discard')">Descartar cambios</button>
          <button class="btn-outline" type="button" :disabled="isBusy" @click="resolveLeave('stay')">Seguir editando</button>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <document-signature-options-dialog
      v-model="showSignatureOptionsDialog"
      :document="signatureOptionsDocument || {}"
      :patient="px && px.person ? px.person : {}"
      :business-name="businessName"
      :can-sign-local="canSign"
      :can-request-remote-signature="canRequestRemoteSignature"
      @sign-local="openPreparedConsentSignature"
      @refresh="refreshConsentSignatureOptions"
      @busy="signatureDeliveryBusy = $event"
    ></document-signature-options-dialog>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import VuexMixin from '../../../mixins/VuexMixin';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { isD2AuthMode } from '../../../services/config/authTransport.config';
import { DATreatmentService } from '../../../services/context/core-proccess-context';
import dialogName from '../../../core/directives/dialog-name';
import fieldError from '../../../core/directives/field-error';
import { sanitizeHtmlForDocumentSnapshot } from '../../../utils/sanitizeHtml';
import DocumentSignatureOptionsDialog from './components/DocumentSignatureOptionsDialog.vue';
import { localToday, requestId, snapshot, treatmentErrors, planErrors } from '../../../domain/treatment-plan/plan.editor';
import { surfaceLabel as dentalSurfaceLabel } from '../../../utils/odontogram/dentalContract';
import { getSettingsSections } from '../../../security/settingsAccess';

const today = localToday;

import ListPageNav from '../../../components/common/ListPageNav.vue';

export default {
  mixins: [VuexMixin],
  directives: { dialogName, fieldError },
  components: { DocumentSignatureOptionsDialog, ListPageNav, TreatmentDentalDetails: () => import('./components/TreatmentDentalDetails.vue') },
  props: {
    treatmentFocusRequest: { type: Object, default: null },
    px: {
      type: Object,
      default: function(){return {}}
    }
  },
  data: function() {
    return {
      isLoading: false,
      isBusy: false,
      localPlanData: null,
      planLoaded: false,
      loadError: '',
      loadRequest: 0,
      historyPage: 1,
      notice: { type: 'info', message: '' },
      validationErrors: {},
      showValidation: false,
      savedEditor: '',
      editorKind: '',
      editorRequestId: '',
      doctorUserId: '',
      contextLoading: false,
      contextError: '',
      consentDirty: false,
      consentReviewToken: '',
      consentRequestId: '',
      selectedConsentVersion: null,
      showLeaveDialog: false,
      leavePromise: null,
      leaveResolver: null,
      removeNavigationGuard: null,
      opener: null,
      leaveOpener: null,
      planEditing: false,
      filter: 'all',
      showPlanDialog: false,
      showTreatmentDialog: false,
      showCloseDialog: false,
      showHistoryDialog: false,
      showHistorySection: false,
      showConsentDialog: false,
      showSignatureOptionsDialog: false,
      signatureOptionsDocument: null,
      preparedConsentDocument: null,
      localSignatureRole: 'PATIENT',
      localSignerName: '',
      localSignatureBaseline: '',
      signatureDeliveryBusy: false,
      consentMode: 'view',
      consentSignature: '',
      selectedConsentPlan: null,
      documentTemplates: [],
      consentConfig: {},
      doctors: [],
      closeReason: '',
      selectedHistory: null,
      expandedHistoryNotes: {},
      confirmDialog: {
        show: false,
        type: '',
        item: null,
        eyebrow: 'Confirmar acción',
        title: '',
        message: '',
        confirmText: 'Confirmar'
      },
      planForm: {
        title: 'Plan de tratamiento',
        started_at: today(),
        diagnosis: '',
        notes: ''
      },
      treatmentForm: this.emptyTreatmentForm(),
      filters: [
        { label: 'Todos', value: 'all' },
        { label: 'Pendientes', value: 'pending' },
        { label: 'En progreso', value: 'in_progress' },
        { label: 'Pausados', value: 'paused' },
        { label: 'Completados', value: 'completed' },
        { label: 'Cancelados', value: 'cancelled' }
      ],
      statusOptions: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'En progreso', value: 'in_progress' },
        { label: 'Completado', value: 'completed' },
        { label: 'Cancelado', value: 'cancelled' },
        { label: 'Pausado', value: 'paused' }
      ],
      toothOptions: ['11','12','13','14','15','16','17','18','21','22','23','24','25','26','27','28','31','32','33','34','35','36','37','38','41','42','43','44','45','46','47','48','51','52','53','54','55','61','62','63','64','65','71','72','73','74','75','81','82','83','84','85']
    }
  },
  created() {
    this.$emit('register-navigation-guard', this.confirmLeave);
    window.addEventListener('beforeunload', this.beforeUnload);
    this.removeNavigationGuard = this.$router.beforeEach((to, from, next) => {
      this.confirmLeave().then(allowed => next(allowed)).catch(() => next(false));
    });
  },
  beforeDestroy() {
    this.loadRequest++;
    this.$emit('register-navigation-guard', null);
    window.removeEventListener('beforeunload', this.beforeUnload);
    if(this.removeNavigationGuard) this.removeNavigationGuard();
    if(this.leaveResolver) this.leaveResolver(false);
  },
  computed: {
    patientId: function() {
      return this.px && this.px.person ? this.px.person.id_person : '';
    },
    planData: function() {
      return this.localPlanData || {};
    },
    canCreate() { return this.allowed('create', 'treatments.create'); },
    canEdit() { return this.allowed('edit', 'treatments.edit'); },
    canComplete() { return this.canEdit || this.allowed('complete', 'treatments.complete'); },
    canCancel() { return this.canEdit || this.allowed('cancel', 'treatments.cancel'); },
    canClose() { return this.allowed('closePlan', 'treatments.close_plan'); },
    canSign() { return this.allowed('consentSign', 'treatments.consent.sign'); },
    canRequestRemoteSignature() { return this.allowed('remoteRequest', 'documents.signature.request'); },
    canManageSignature() { return this.canSign || this.canRequestRemoteSignature; },
    canViewConsent() { return this.allowed('consentView', 'treatments.consent.view'); },
    canEditCosts() { return this.allowed('costEdit', 'treatments.cost_edit'); },
    ready() { return this.planLoaded && !this.loadError && !this.isLoading; },
    dirty() {
      if(this.editorKind === 'consent') return this.consentDirty || Boolean(this.consentSignature) || Boolean(this.preparedConsentDocument && this.localSignatureBaseline && snapshot({ role: this.localSignatureRole, name: this.localSignerName }) !== this.localSignatureBaseline);
      return Boolean(this.editorKind && this.savedEditor && snapshot(this.currentEditorForm()) !== this.savedEditor);
    },
    unfinishedCount() { return this.activeTreatments.filter(item => ['pending', 'in_progress', 'paused'].includes(item.status)).length; },
    eligibleDoctors() { return this.doctors.filter(doctor => this.isDoctorProfileReady(doctor)); },
    canConfigurePlanConsent() { return getSettingsSections(this.currentUser.rol, this.hasPermission).some(section => section.key === 'documents'); },
    hasConsentText() {
      if(this.planConsentTemplate) {
        const content = document.createElement('div');
        content.innerHTML = sanitizeHtmlForDocumentSnapshot(this.planConsentTemplate.content_html || '');
        return Boolean(String(content.textContent || '').replace(/[\s\u200b-\u200d\ufeff]/g, '') || content.querySelector('img[src]'));
      }
      return Boolean(String(this.signatureConfig.state || '').replace(/[\s\u200b-\u200d\ufeff]/g, '') || String(this.signatureConfig.consent || '').replace(/[\s\u200b-\u200d\ufeff]/g, ''));
    },
    canReuseConsentDocument() {
      return Boolean(this.hasPendingConsentDocument && this.activeConsentDocument.responsible_doctor_user_id === this.doctorUserId
        && Number(this.activeConsentDocument.includes_costs) === Number(this.showCosts));
    },
    needsConsentConfiguration() { return this.canManageSignature && !this.contextLoading && !this.contextError && !this.hasConsentText && !this.canReuseConsentDocument; },
    consentPrerequisite() {
      if(this.contextLoading) return 'Cargando doctores y texto del consentimiento…';
      if(this.contextError) return this.contextError;
      if(!this.config.consentVersioningAvailable) return 'Falta habilitar el historial de versiones antes de guardar una firma.';
      if(this.config.consentDocumentAvailable === false) return 'Falta habilitar la integración de documentos del plan antes de solicitar una firma.';
      if(!this.currentDoctorForConsent) return 'Selecciona un doctor con perfil activo, cédula y autorización de firma. Si no aparece, revisa su perfil en Configuración.';
      if(!this.hasConsentText && !this.canReuseConsentDocument) return this.canConfigurePlanConsent
        ? 'Ve a Configuración > Documentos y consentimientos, crea un formato de tipo «Consentimiento del plan de tratamiento» y guárdalo activo. Después vuelve y actualiza los requisitos.'
        : 'Pide a un administrador que configure «Consentimiento del plan de tratamiento» en Configuración > Documentos y consentimientos. Después pulsa «Actualizar requisitos». Tu usuario sí tiene permiso para solicitar la firma.';
      return '';
    },
    consentVersions() { return this.consentPlan && this.consentPlan.consent_versions || []; },
    additionalConsentSignatures() { return (this.selectedConsent && this.selectedConsent.signatures_snapshot || []).filter(signature => ['WITNESS1', 'WITNESS2'].includes(signature.signature_role)); },
    activeConsentDocument() { return this.activePlan && this.activePlan.consent_document || null; },
    hasPendingConsentDocument() { return this.activeConsentDocument && ['BORRADOR', 'PENDIENTE_FIRMA'].includes(this.activeConsentDocument.status); },
    localSignatureRoles() {
      const doc = this.preparedConsentDocument;
      if(!doc) return [{ value: 'PATIENT', label: 'Paciente' }];
      const required = [];
      if(doc.guardian_name_snapshot || doc.requires_tutor_signature === 1) required.push('TUTOR'); else if(doc.requires_patient_signature !== 0) required.push('PATIENT');
      if(doc.requires_doctor_signature !== 0) required.push('DOCTOR');
      if(doc.requires_witness1_signature === 1) required.push('WITNESS1');
      if(doc.requires_witness2_signature === 1) required.push('WITNESS2');
      const completed = new Set((doc.signatures || []).map(signature => signature.signature_role));
      if(doc.doctor_signature_snapshot) completed.add('DOCTOR');
      const labels = { PATIENT: 'Paciente', TUTOR: 'Tutor o representante', DOCTOR: 'Doctor', WITNESS1: 'Testigo 1', WITNESS2: 'Testigo 2' };
      return required.filter(role => !completed.has(role)).map(role => ({ value: role, label: labels[role] }));
    },
    config: function() {
      return this.planData.config || {};
    },
    signatureConfig() { return this.consentConfig; },
    moduleEnabled: function() {
      return this.config.treatmentPlanEnabled === undefined ? true : Boolean(this.config.treatmentPlanEnabled);
    },
    activePlan: function() {
      return this.planData.activePlan || null;
    },
    activeConsent: function() {
      return this.activePlan && this.activePlan.consent ? this.activePlan.consent : null;
    },
    hasActiveConsent: function() {
      return Boolean(this.activeConsent && this.activeConsent.patient_signature);
    },
    historyPlans: function() {
      return this.planData.history || [];
    },
    patientData: function() {
      if(this.planData && this.planData.patient) {
        return this.planData.patient;
      }
      return this.px && this.px.person ? this.px.person : {};
    },
    patientName: function() {
      const person = this.patientData || {};
      return person.fullname || `${person.name || ''} ${person.surname || ''}`.trim();
    },
    patientAge: function() {
      return this.patientData && this.patientData.age ? this.patientData.age : '';
    },
    consentPatientName() {
      const person = this.selectedConsent && this.selectedConsent.plan_snapshot && this.selectedConsent.plan_snapshot.patient;
      return person ? person.fullname || `${person.name || ''} ${person.surname || ''}`.trim() : this.patientName;
    },
    consentPatientAge() {
      const person = this.selectedConsent && this.selectedConsent.plan_snapshot && this.selectedConsent.plan_snapshot.patient;
      return person && person.age !== null && person.age !== undefined ? person.age : this.patientAge;
    },
    businessName: function() {
      if(isD2AuthMode()) {
        const business = this.authBusiness || {};
        return business.name || business.legalName || 'Consultorio';
      }

      const business = this.$session ? this.$session.get('business') : null;
      return business && business.name ? business.name : 'Consultorio';
    },
    activeTreatments: function() {
      return this.activePlan && this.activePlan.treatments ? this.activePlan.treatments : [];
    },
    filteredTreatments: function() {
      if(this.filter === 'all') {
        return this.activeTreatments;
      }
      return this.activeTreatments.filter((item) => item.status === this.filter);
    },
    showCosts: function() {
      return this.allowed('costView', 'treatments.cost_view') && (this.config.showTreatmentCosts === undefined || Boolean(this.config.showTreatmentCosts));
    },
    showStatus: function() {
      return this.config.showTreatmentStatus === undefined ? true : Boolean(this.config.showTreatmentStatus);
    },
    allowToothSelection: function() {
      return Boolean(this.config.odontogramEnabled && this.config.allowTreatmentToothSelection);
    },
    showToothSelector: function() {
      return this.allowToothSelection || Boolean(this.treatmentForm && this.treatmentForm.teeth && this.treatmentForm.teeth.length);
    },
    totalCost: function() {
      return this.activeTreatments.reduce((total, item) => total + Number(item.cost || 0), 0);
    },
    // Cancelled treatments stay in the plan but do not count toward progress.
    trackedTreatmentCount: function() {
      return this.activeTreatments.length - this.countByStatus('cancelled');
    },
    progressSegments: function() {
      return ['completed', 'in_progress', 'paused', 'pending', 'cancelled']
        .map(status => ({ status, count: this.countByStatus(status) }))
        .filter(segment => segment.count > 0);
    },
    progressLabel: function() {
      const parts = this.progressSegments.map(segment => `${this.statusGroupLabel(segment.status).toLowerCase()}: ${segment.count}`);
      return `Avance del plan. ${parts.join(', ')}.`;
    },
    visibleFilters: function() {
      return this.filters.filter(item => item.value === 'all' || item.value === this.filter || this.countByStatus(item.value) > 0);
    },
    historyTotal: function() {
      const pagination = this.localPlanData && this.localPlanData.historyPagination;
      return pagination && pagination.total !== undefined ? Number(pagination.total) : this.historyPlans.length;
    },
    historyPageCount: function() {
      const pagination = this.localPlanData && this.localPlanData.historyPagination;
      return pagination && pagination.totalPages ? Number(pagination.totalPages) : 1;
    },
    emptyStateTitle: function() {
      const messages = {
        all: 'No hay tratamientos en este plan.',
        pending: 'No hay tratamientos pendientes.',
        in_progress: 'No hay tratamientos en progreso.',
        paused: 'No hay tratamientos pausados.',
        completed: 'No hay tratamientos completados.',
        cancelled: 'No hay tratamientos cancelados.'
      };
      return messages[this.filter] || 'No hay tratamientos en este filtro.';
    },
    emptyStateText: function() {
      if(this.filter === 'all') {
        return 'Agrega procedimientos, planes o indicaciones para dar seguimiento al paciente.';
      }
      return 'Este filtro no muestra tratamientos en otros estados. Puedes ver todos sin agregar uno nuevo.';
    },
    selectedHistoryTreatments: function() {
      return this.selectedHistory && this.selectedHistory.treatments ? this.selectedHistory.treatments : [];
    },
    selectedConsent: function() {
      if(this.selectedConsentVersion) return this.selectedConsentVersion;
      if(this.selectedConsentPlan && this.selectedConsentPlan.consent) {
        return this.selectedConsentPlan.consent;
      }
      return this.activeConsent;
    },
    consentPlan: function() {
      if(this.selectedConsentPlan) {
        return this.selectedConsentPlan;
      }
      return this.activePlan;
    },
    consentPlanTreatments: function() {
      if(this.consentMode === 'view') return this.selectedConsent && this.selectedConsent.plan_snapshot ? this.selectedConsent.plan_snapshot.treatments || [] : [];
      return this.consentPlan && this.consentPlan.treatments ? this.consentPlan.treatments : [];
    },
    consentFolio: function() {
      return this.selectedConsent && this.selectedConsent.id_patient_document
        ? this.selectedConsent.id_patient_document
        : (this.selectedConsent && this.selectedConsent.id_treatment_plan_consent ? this.selectedConsent.id_treatment_plan_consent : 'No especificado');
    },
    documentDeclareText: function() {
      const text = this.currentDeclareText || 'No hay texto DECLARO configurado.';
      return this.textToHtml(text);
    },
    documentConsentText: function() {
      const text = this.currentConsentText || '';
      return text ? this.textToHtml(text) : '';
    },
    currentDeclareText: function() {
      if(this.consentMode === 'view' && this.selectedConsent) {
        return this.selectedConsent.declare_text_snapshot;
      }
      if(this.planConsentTemplate) {
        return this.renderTemplate(this.planConsentTemplate.content_html || '');
      }
      return this.signatureConfig && this.signatureConfig.state ? this.signatureConfig.state : '';
    },
    currentConsentText: function() {
      if(this.consentMode === 'view' && this.selectedConsent) {
        return this.selectedConsent.consent_text_snapshot;
      }
      if(this.planConsentTemplate) {
        return '';
      }
      return this.signatureConfig && this.signatureConfig.consent ? this.signatureConfig.consent : '';
    },
    planConsentTemplate: function() {
      return (this.documentTemplates || []).find((item) => item.template_type === 'TREATMENT_PLAN_CONSENT' && item.is_active !== 0) || null;
    },
    currentDoctorSignature: function() {
      if(this.consentMode === 'view' && this.selectedConsent) {
        return this.selectedConsent.doctor_signature_snapshot;
      }
      if(this.preparedConsentDocument) return this.preparedConsentDocument.doctor_signature_snapshot || '';
      if(this.currentDoctorForConsent && this.currentDoctorForConsent.signature_image) {
        return this.currentDoctorForConsent.signature_image;
      }
      return '';
    },
    currentDoctorName: function() {
      if(this.consentMode === 'view' && this.selectedConsent) {
        return this.selectedConsent.doctor_name_snapshot;
      }
      if(this.preparedConsentDocument) return this.preparedConsentDocument.doctor_name_snapshot || '';
      if(this.currentDoctorForConsent && this.currentDoctorForConsent.professional_name) {
        return this.currentDoctorForConsent.professional_name;
      }
      return '';
    },
    currentDoctorProfessionalLicense: function() {
      if(this.consentMode === 'view' && this.selectedConsent) {
        return this.selectedConsent.professional_license_snapshot || '';
      }
      if(this.preparedConsentDocument) return this.preparedConsentDocument.professional_license_snapshot || '';
      if(this.currentDoctorForConsent && this.currentDoctorForConsent.professional_license) {
        return this.currentDoctorForConsent.professional_license;
      }
      return '';
    },
    professionalLicenseDisplay: function() {
      return this.currentDoctorProfessionalLicense || 'No registrada al momento de la firma';
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
    currentDoctorForConsent: function() {
      return this.eligibleDoctors.find(doctor => doctor.id_login === this.doctorUserId) || null;
    },
    themePrimaryColor: function() {
      return 'var(--color-primary-500)';
    },
    ...mapGetters(moduleTypes.TREATMENT, {
      treatmentPlanData: fnTypes.treatmentPlan,
      hasErrorTreatment: fnTypes.hasErrorTreatment
    }),
    ...mapGetters(moduleTypes.AUTH, {
      authUser: fnTypes.getUser,
      authRole: fnTypes.getRole,
      authBusiness: fnTypes.getBusiness,
      hasPermission: fnTypes.hasPermission
    })
  },
  watch: {
    treatmentFocusRequest: { immediate: true, handler() { this.$nextTick(this.applyDentalPreparation); } },
    ready(value) { if(value) this.$nextTick(this.applyDentalPreparation); },
    editorKind(value) { if(!value) this.$nextTick(this.applyDentalPreparation); },
    isBusy(value) { if(!value) this.$nextTick(this.applyDentalPreparation); },
    patientId: { immediate: true, handler() {
      this.historyPage = 1;
      this.localPlanData = null;
      this.planLoaded = false;
      this.closeEditors();
      this.loadPlan();
    } },
    showPlanDialog(value) { if(!value) this.restoreFocus(); },
    showTreatmentDialog(value) { if(!value) this.restoreFocus(); },
    showConsentDialog(value) { if(!value) this.restoreFocus(); },
    showCloseDialog(value) { if(!value) this.restoreFocus(); },
    showHistoryDialog(value) { if(!value) this.restoreFocus(); },
    activePlan: {
      immediate: true,
      handler: function(plan) {
        this.showHistorySection = !plan;
      }
    }
  },
  methods: {
    applyDentalPreparation() {
      const request = this.treatmentFocusRequest;
      if(!request || request.id_person !== this.patientId || this.consumedDentalRequest === request.requestId || !this.ready || !this.activePlan || !this.canCreate || this.isBusy || this.editorKind) return;
      if(!this.config.dentalSchemaAvailable || !this.allowToothSelection) { this.notice = { type: 'warning', message: 'La selección dental no está habilitada. La preparación se conserva y puedes usar el formulario manual.' }; return; }
      this.openTreatmentDialog();
      if(!this.showTreatmentDialog) return;
      this.treatmentForm.tooth_details = JSON.parse(JSON.stringify(request.tooth_details || []));
      this.treatmentForm.teeth = this.treatmentForm.tooth_details.map(detail => String(detail.tooth_number));
      this.consumedDentalRequest = request.requestId;
      this.$emit('treatment-focus-consumed', request);
    },
    allowed(flag, permission) {
      return this.planLoaded && this.hasPermission(permission) && Boolean(this.planData.permissions && this.planData.permissions[flag]);
    },
    toastFunction(type, message) {
      this.notice = { type, message };
      if(this.$toast && typeof this.$toast[type] === 'function') this.$toast[type](message);
      else if(this.$swal && typeof this.$swal.fire === 'function') this.$swal.fire({toast:true,position:'top-end',icon:type,titleText:message,showConfirmButton:false,timer:4500,timerProgressBar:true});
    },
    rememberFocus() { this.opener = document.activeElement; this.notice = { type: 'info', message: '' }; },
    restoreFocus() {
      this.$nextTick(() => {
        if(this.showLeaveDialog || this.showHistoryDialog || this.showConsentDialog || this.showPlanDialog || this.showTreatmentDialog || this.showCloseDialog) return;
        if(this.opener && document.contains(this.opener) && this.opener.getClientRects().length) this.opener.focus();
        else if(this.$refs.sectionTitle) this.$refs.sectionTitle.focus();
      });
    },
    trapDialogFocus(event) {
      if(event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll('button, a[href], input, textarea, select, [tabindex]')]
        .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if(!first) return;
      if(event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    },
    currentEditorForm() {
      return this.editorKind === 'plan' ? this.planForm : this.editorKind === 'treatment' ? this.treatmentForm : { closeReason: this.closeReason };
    },
    beginEditor(kind) {
      this.editorKind = kind;
      this.editorRequestId = requestId();
      this.savedEditor = snapshot(this.currentEditorForm());
      this.validationErrors = {};
      this.showValidation = false;
      this.rememberFocus();
    },
    closeEditors() {
      this.showPlanDialog = false; this.showTreatmentDialog = false; this.showCloseDialog = false; this.showConsentDialog = false;
      this.showSignatureOptionsDialog = false; this.signatureOptionsDocument = null; this.preparedConsentDocument = null;
      this.editorKind = ''; this.savedEditor = ''; this.consentDirty = false; this.consentSignature = '';
    },
    confirmLeave() {
      if(this.isBusy || this.signatureDeliveryBusy) return Promise.resolve(false);
      if(!this.dirty) return Promise.resolve(true);
      if(this.leavePromise) return this.leavePromise;
      this.showLeaveDialog = true;
      this.leaveOpener = document.activeElement;
      this.leavePromise = new Promise(resolve => { this.leaveResolver = resolve; });
      return this.leavePromise;
    },
    async resolveLeave(action) {
      if(this.isBusy) return;
      if(action === 'save') {
        const save = { plan: this.createPlan, treatment: this.saveTreatment, consent: this.saveConsent, close: this.closePlan }[this.editorKind];
        if(!save || !await save()) return;
      }
      if(action === 'discard') this.closeEditors();
      this.showLeaveDialog = false;
      const resolve = this.leaveResolver;
      this.leaveResolver = null; this.leavePromise = null;
      if(resolve) resolve(action !== 'stay');
      if(action === 'stay') this.$nextTick(() => {
        if(this.leaveOpener && document.contains(this.leaveOpener)) this.leaveOpener.focus();
      });
    },
    async closeEditor() { if(await this.confirmLeave()) this.closeEditors(); },
    beforeUnload(event) { if(this.dirty || this.isBusy || this.signatureDeliveryBusy) { event.preventDefault(); event.returnValue = ''; } },
    async performAction(action, payload, message) {
      if(this.isBusy) return false;
      this.isBusy = true;
      this.notice = { type: 'info', message: 'Guardando…' };
      try {
        const result = await action({ ...payload, page: this.historyPage, page_size: 5 });
        if(!result || !result.success) {
          this.toastFunction('error', result && result.message || 'No se guardaron los cambios. Reintenta conservando la captura.');
          if(result && result.data && result.data.errors) this.validationErrors = result.data.errors;
          return false;
        }
        if(payload.id_person !== this.patientId) return true;
        if(result.data && result.data.patient && result.data.patient.id_person === this.patientId) {
          this.localPlanData = result.data;
          if(result.data.historyPagination) this.historyPage = result.data.historyPagination.page;
        }
        if(result.data && result.data.refreshRequired) {
          this.loadError = 'Los cambios se guardaron, pero no se pudo actualizar la consulta. Reintenta para verlos.';
          this.toastFunction('warning', this.loadError);
        } else this.toastFunction('success', message);
        return true;
      } catch(error) {
        this.toastFunction('error', 'No se pudo confirmar el guardado. Conservamos tu captura; reintenta cuando haya conexión.');
        return false;
      } finally { this.isBusy = false; }
    },
    fieldErrors(key) { return this.showValidation && this.validationErrors[key] ? [this.validationErrors[key]] : []; },
    async showFieldErrors() {
      this.toastFunction('warning', 'Revisa los campos indicados. Conservamos el resto de tu captura.');
      await this.$nextTick();
      const root = this.editorKind === 'plan' ? this.$refs.planEditor : this.$refs.treatmentEditor;
      const node = root && (root.$el || root);
      const field = node && node.querySelector('.error--text input, .error--text textarea');
      if(field) field.focus();
    },
    statusActions(item) {
      return this.statusOptions.filter(option => option.value !== item.status && (this.canEdit || option.value === 'completed' && this.canComplete || option.value === 'cancelled' && this.canCancel));
    },
    statusSaved(item, status) {
      if(this.filter !== 'all' && this.filter !== status) this.filter = status;
      this.toastFunction('success', `${item.name}: ${this.statusLabel(status)}. Mostrando su estado actualizado.`);
    },
    onSignatureStroke(event) { if(event.target && event.target.tagName === 'CANVAS') this.consentDirty = true; },
    ...mapActions(moduleTypes.TREATMENT, [
      fnTypes.getTreatmentPlan,
      fnTypes.createTreatmentPlan,
      fnTypes.updateTreatmentPlan,
      fnTypes.closeTreatmentPlan,
      fnTypes.savePlanTreatment,
      fnTypes.changePlanTreatmentStatus,
      fnTypes.deletePlanTreatment,
      fnTypes.saveTreatmentPlanConsent
    ]),
    emptyTreatmentForm: function() {
      return {
        id_patient_treatment: '',
        name: '',
        description: '',
        category: '',
        status: 'pending',
        estimated_start_date: '',
        estimated_end_date: '',
        cost: '',
        notes: '',
        teeth: [],
        tooth_details: [],
        dental_revision: 0,
        treatment_revision: 0
      };
    },
    loadConsentContext: async function(request = this.loadRequest, patientId = this.patientId) {
      if(!this.canManageSignature) return;
      this.contextLoading = true;
      this.contextError = '';
      try {
        const response = await DATreatmentService.getSigningDoctors(patientId);
        if(request !== this.loadRequest) return;
        if(!response || !response.success || !response.data) throw new Error('Consent context unavailable');
        this.doctors = response.data.doctors || [];
        this.documentTemplates = response.data.template ? [response.data.template] : [];
        this.consentConfig = response.data.legacyText || {};
        if(!this.eligibleDoctors.some(doctor => doctor.id_login === this.doctorUserId)) {
          const pendingDoctor = this.hasPendingConsentDocument && this.activeConsentDocument.responsible_doctor_user_id;
          this.doctorUserId = this.eligibleDoctors.some(doctor => doctor.id_login === pendingDoctor) ? pendingDoctor : this.eligibleDoctors.some(doctor => doctor.id_login === this.currentUser.id_login) ? this.currentUser.id_login : '';
        }
      } catch (error) {
        if(request !== this.loadRequest) return;
        this.doctors = [];
        this.contextError = 'No se pudieron cargar los doctores o el texto del consentimiento. Reintenta.';
      } finally { if(request === this.loadRequest) this.contextLoading = false; }
    },
    isDoctorProfileReady: function(doctor) {
      return Boolean(
        doctor &&
        doctor.id_doctor_professional_profile &&
        doctor.professional_profile_active !== 0 &&
        doctor.can_sign_documents &&
        doctor.professional_name &&
        doctor.professional_license
      );
    },
    textToHtml: function(value) {
      const text = String(value || '');
      if(/<[^>]+>/.test(text)) {
        return sanitizeHtmlForDocumentSnapshot(text);
      }
      return this.escapeHtml(text).replace(/\n/g, '<br>');
    },
    escapeHtml: function(value) {
      return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },
    renderTemplate: function(template) {
      const person = this.px && this.px.person ? this.px.person : {};
      const patientName = person.fullname || `${person.name || ''} ${person.surname || ''}`.trim();
      const replacements = {
        nombrePaciente: patientName,
        edadPaciente: person.age || '',
        fechaNacimientoPaciente: person.birthday || '',
        nombreDoctor: this.currentDoctorName || '',
        cedulaDoctor: this.currentDoctorProfessionalLicense || '',
        nombreConsultorio: '',
        fechaActual: today(),
        diagnostico: this.activePlan ? this.activePlan.diagnosis || '' : '',
        planTratamiento: this.activeTreatments.map((item) => item.name).join(', ')
      };
      const source = String(template || '');
      const html = /<[^>]+>/.test(source) ? source : `<span>${this.escapeHtml(source).replace(/\n/g, '<br>')}</span>`;
      return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => (
        replacements[key] === undefined || replacements[key] === null ? '' : this.escapeHtml(replacements[key])
      ));
    },
    planTreatments: function(plan) {
      return plan && Array.isArray(plan.treatments) ? plan.treatments : [];
    },
    planStatusCount: function(plan, status) {
      return this.planTreatments(plan).filter((item) => item.status === status).length;
    },
    planTotalCost: function(plan) {
      return this.planTreatments(plan).reduce((total, item) => total + Number(item.cost || 0), 0);
    },
    hasPlanConsent: function(plan) {
      return Boolean(plan && plan.consent && plan.consent.patient_signature);
    },
    consentStatusLabel: function(plan) {
      if(!this.canViewConsent) return 'Sin acceso de consulta';
      if(plan && plan.consent && plan.consent.refusal_reason) {
        return 'No firmado por negativa';
      }
      if(this.hasPlanConsent(plan)) {
        return 'Firmado';
      }
      if(plan && plan.consent) {
        return 'Pendiente';
      }
      return 'Sin consentimiento';
    },
    historyDoctorName: function(plan) {
      return plan && plan.consent && plan.consent.doctor_name_snapshot ? plan.consent.doctor_name_snapshot : 'No especificado';
    },
    formatCloseReason: function(reason) {
      const text = String(reason || '').trim().replace(/\btermino\b/gi, 'terminó');
      if(!text) {
        return '';
      }
      return /[.!?]$/.test(text) ? text : `${text}.`;
    },
    signingProfessionalLicense: function() {
      if(this.currentDoctorForConsent && this.currentDoctorForConsent.professional_license) {
        return this.currentDoctorForConsent.professional_license;
      }
      return '';
    },
    validateDoctorLicenseForConsent: function() {
      if(this.canManageSignature && !this.consentPrerequisite) return true;
      this.toastFunction('warning', this.consentPrerequisite || 'No tienes permiso para guardar una firma.');
      return false;
    },
    changeHistoryPage: async function(page) {
      if(this.isBusy || !await this.confirmLeave()) return;
      this.historyPage = page;
      await this.loadPlan();
    },
    loadPlan: async function() {
      const request = ++this.loadRequest, patientId = this.patientId;
      if(!patientId) return;
      this.isLoading = true;
      this.loadError = '';
      try {
        const result = await this.getTreatmentPlan({ idPerson: patientId, params: { page: this.historyPage, page_size: 5 } });
        if(request !== this.loadRequest) return;
        if(!result || !result.success || !result.data || !result.data.patient || result.data.patient.id_person !== patientId) throw new Error(result && result.message || 'No se pudo consultar el plan.');
        this.localPlanData = result.data;
        if(result.data.historyPagination) this.historyPage = result.data.historyPagination.page;
        this.planLoaded = true;
        this.loadConsentContext(request, patientId);
      } catch(error) {
        if(request === this.loadRequest) this.loadError = error.message || 'No se pudo consultar el plan. Reintenta.';
      } finally { if(request === this.loadRequest) this.isLoading = false; }
    },
    openCreatePlan: function(edit = false) {
      if(!this.ready || this.isBusy || (edit ? !this.canEdit : !this.canCreate)) return;
      this.planEditing = edit === true;
      this.planForm = this.planEditing ? {
        title: this.activePlan.title || '', started_at: this.formatDate(this.activePlan.started_at) === '--' ? '' : this.formatDate(this.activePlan.started_at),
        diagnosis: this.activePlan.diagnosis || '', notes: this.activePlan.notes || ''
      } : {
        title: 'Plan de tratamiento',
        started_at: today(),
        diagnosis: '',
        notes: ''
      };
      this.beginEditor('plan');
      this.showPlanDialog = true;
    },
    createPlan: async function() {
      if(this.planEditing ? !this.canEdit : !this.canCreate) return false;
      this.validationErrors = planErrors(this.planForm); this.showValidation = true;
      if(Object.keys(this.validationErrors).length) { await this.showFieldErrors(); return false; }
      const saved = await this.performAction(this.planEditing ? this.updateTreatmentPlan : this.createTreatmentPlan, {
        id_person: this.patientId,
        id_treatment_plan: this.planEditing ? this.activePlan.id_treatment_plan : undefined,
        request_id: this.editorRequestId,
        ...this.planForm
      }, this.planEditing ? 'Datos del plan actualizados.' : 'Plan activo creado.');
      if(saved) this.closeEditors();
      return saved;
    },
    openTreatmentDialog: function(item) {
      if(!this.ready || this.isBusy || (item ? !this.canEdit : !this.canCreate)) return;
      this.treatmentForm = item ? {
        id_patient_treatment: item.id_patient_treatment,
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        status: item.status || 'pending',
        estimated_start_date: item.estimated_start_date ? String(item.estimated_start_date).slice(0, 10) : '',
        estimated_end_date: item.estimated_end_date ? String(item.estimated_end_date).slice(0, 10) : '',
        cost: item.cost === null || item.cost === undefined ? '' : item.cost,
        notes: item.notes || '',
        teeth: item.teeth ? [...item.teeth] : [],
        tooth_details: item.tooth_details ? JSON.parse(JSON.stringify(item.tooth_details)) : (item.teeth || []).map(tooth => ({ tooth_number: String(tooth), surfaces: null, manual: true, sources: [] })),
        dental_revision: item.dental_revision || 0,
        treatment_revision: item.treatment_revision || 0
      } : this.emptyTreatmentForm();
      this.beginEditor('treatment');
      this.showTreatmentDialog = true;
    },
    openClosePlanDialog: function() {
      if(!this.ready || !this.canClose || this.isBusy) return;
      this.closeReason = '';
      this.beginEditor('close');
      this.showCloseDialog = true;
    },
    saveTreatment: async function() {
      if(this.treatmentForm.id_patient_treatment ? !this.canEdit : !this.canCreate) return false;
      this.validationErrors = treatmentErrors(this.treatmentForm); this.showValidation = true;
      if(Object.keys(this.validationErrors).length) { await this.showFieldErrors(); return false; }
      const payload = {
        id_person: this.patientId,
        id_treatment_plan: this.activePlan ? this.activePlan.id_treatment_plan : null,
        ...this.treatmentForm,
        request_id: this.editorRequestId
      };
      if(!this.canEditCosts) delete payload.cost;
      if(!this.config.dentalSchemaAvailable) { delete payload.tooth_details; delete payload.dental_revision; delete payload.treatment_revision; }
      if(!payload.id_patient_treatment) {
        payload.status = 'pending';
      }
      const saved = await this.performAction(this.savePlanTreatment, payload, 'Tratamiento guardado.');
      if(saved) { this.statusSaved(payload, payload.status); this.closeEditors(); }
      return saved;
    },
    requestCancelTreatment: function(item) {
      if(!this.canCancel || this.isBusy) return;
      this.confirmDialog = {
        show: true,
        type: 'cancel',
        item,
        eyebrow: 'Cancelar tratamiento',
        title: 'Cancelar tratamiento',
        message: 'El tratamiento quedará marcado como cancelado dentro del plan activo. Esta acción se conservará en el seguimiento del plan.',
        confirmText: 'Cancelar tratamiento'
      };
    },
    requestDeleteTreatment: function(item) {
      if(!this.canEdit || this.isBusy) return;
      this.confirmDialog = {
        show: true,
        type: 'delete',
        item,
        eyebrow: 'Eliminar tratamiento',
        title: 'Eliminar tratamiento',
        message: 'Esta acción quitará el tratamiento del plan activo. Si el tratamiento ya no se realizará, usa Cancelar tratamiento en lugar de eliminarlo.',
        confirmText: 'Eliminar tratamiento'
      };
    },
    closeConfirmDialog: function() {
      this.confirmDialog = {
        show: false,
        type: '',
        item: null,
        eyebrow: 'Confirmar acción',
        title: '',
        message: '',
        confirmText: 'Confirmar'
      };
    },
    confirmPendingAction: async function() {
      const item = this.confirmDialog.item;
      const type = this.confirmDialog.type;
      this.closeConfirmDialog();
      if(type === 'dentalTooth') {
        if((this.treatmentForm.teeth || []).includes(item)) { this.toggleTooth(item, true);this.toastFunction('info','Pieza retirada del formulario. Guarda el tratamiento para confirmar el cambio.'); }
        return;
      }
      if(type === 'recaptureConsent') {
        await this.openSignatureOptions();
        return;
      }
      if(!item) {
        return;
      }
      if(type === 'cancel') {
        await this.changeStatus(item, 'cancelled');
        return;
      }
      if(type === 'delete') {
        await this.deleteTreatment(item);
      }
    },
    closePlan: async function() {
      if(!this.activePlan || !this.canClose) return false;
      if([...this.closeReason].length > 1000) { this.toastFunction('warning', 'El motivo de cierre admite hasta 1000 caracteres.'); return false; }
      const saved = await this.performAction(this.closeTreatmentPlan, {
        id_person: this.patientId,
        id_treatment_plan: this.activePlan.id_treatment_plan,
        close_reason: this.closeReason
      }, 'Plan cerrado y disponible como histórico de solo lectura.');
      if(saved) {
        this.closeEditors();
        this.closeReason = '';
      }
      return saved;
    },
    changeStatus: async function(item, status) {
      if(!this.statusActions(item).some(option => option.value === status) || this.isBusy) return false;
      const saved = await this.performAction(this.changePlanTreatmentStatus, {
        id_person: this.patientId,
        id_patient_treatment: item.id_patient_treatment,
        status,
        ...(item.treatment_revision !== undefined ? { treatment_revision: item.treatment_revision } : {})
      }, 'Estado actualizado.');
      if(saved) this.statusSaved(item, status);
      return saved;
    },
    deleteTreatment: async function(item) {
      if(!this.canEdit || this.isBusy) return false;
      return this.performAction(this.deletePlanTreatment, {
        id_person: this.patientId,
        id_patient_treatment: item.id_patient_treatment,
        ...(item.treatment_revision !== undefined ? { treatment_revision: item.treatment_revision } : {})
      }, 'Tratamiento eliminado del plan activo.');
    },
    toggleTooth: function(tooth, confirmed = false) {
      const current = this.treatmentForm.teeth || [];
      const detail = this.treatmentForm.tooth_details.find(item => String(item.tooth_number) === tooth);
      if(current.includes(tooth) && detail && detail.sources && detail.sources.length && !confirmed) {
        this.confirmDialog={show:true,type:'dentalTooth',item:tooth,eyebrow:'Selección dental',title:'Retirar pieza '+tooth,message:'Retirar la pieza '+tooth+' también retirará sus orígenes de este tratamiento. El odontograma no cambiará.',confirmText:'Retirar pieza'};
        return;
      }
      this.treatmentForm.teeth = current.includes(tooth)
        ? current.filter((item) => item !== tooth)
        : [...current, tooth];
      if(current.includes(tooth)) this.treatmentForm.tooth_details = this.treatmentForm.tooth_details.filter(item => String(item.tooth_number) !== tooth);
      else this.treatmentForm.tooth_details.push({ tooth_number: tooth, surfaces: null, manual: true, sources: [] });
    },
    appendDentalContext(text) { this.treatmentForm.notes = [this.treatmentForm.notes, text].filter(Boolean).join('\n'); },
    dentalLabel(item, tooth) { const detail = (item.tooth_details || []).find(detail => String(detail.tooth_number) === String(tooth)); return 'Diente ' + tooth + (detail && detail.surfaces && detail.surfaces.length ? ' · ' + [...detail.surfaces].map(face=>dentalSurfaceLabel(face,Number(tooth))).join('') : ''); },
    openHistory: function(plan) {
      this.rememberFocus();
      this.selectedHistory = plan;
      this.showHistoryDialog = true;
    },
    openConsentDialog: function(mode) {
      if(mode === 'view' && !this.canViewConsent) return;
      if(mode !== 'view' && !this.canSign) return;
      this.rememberFocus();
      this.selectedConsentPlan = null;
      this.selectedConsentVersion = null;
      this.consentMode = mode;
      if(mode === 'view' && this.activePlan && this.activePlan.consent_versions && this.activePlan.consent_versions.length) this.selectedConsentVersion = this.activePlan.consent_versions[0];
      this.consentSignature = '';
      this.consentDirty = false;
      this.editorKind = mode === 'view' ? '' : 'consent';
      this.consentReviewToken = this.activePlan && this.activePlan.review_token || '';
      this.consentRequestId = requestId();
      this.showConsentDialog = true;
    },
    requestConsentSignature: function() {
      if(this.isBusy || !this.ready) return;
      this.consentMode = 'sign';
      if(!this.validateDoctorLicenseForConsent()) {
        return;
      }
      if(this.hasActiveConsent && !this.hasPendingConsentDocument) {
        this.confirmDialog = {
          show: true,
          type: 'recaptureConsent',
          item: null,
          eyebrow: 'Consentimiento del plan',
          title: 'Recapturar firma del consentimiento',
          message: 'Se guardará una nueva versión con el texto y los tratamientos revisados. La versión firmada anterior seguirá disponible para consulta.',
          confirmText: 'Continuar'
        };
        return;
      }
      this.openSignatureOptions();
    },
    async openSignatureOptions() {
      if(!this.activePlan || !this.canManageSignature || this.isBusy) return false;
      this.preparedConsentDocument = null;
      const saved = await this.performAction(DATreatmentService.prepareConsentDocument, {
        id_person: this.patientId, id_treatment_plan: this.activePlan.id_treatment_plan,
        doctor_user_id: this.doctorUserId, review_token: this.activePlan.review_token
      }, 'Consentimiento preparado. Elige cómo quiere firmar el paciente.');
      if(!saved) return false;
      const document = this.activeConsentDocument;
      if(!document || !['BORRADOR', 'PENDIENTE_FIRMA'].includes(document.status)) { this.toastFunction('warning', 'El documento se preparó. Reintenta la consulta para continuar.'); return false; }
      this.signatureOptionsDocument = document;
      this.showSignatureOptionsDialog = true;
      return true;
    },
    openPreparedConsentSignature(document) {
      if(!this.canSign || !document || !['BORRADOR', 'PENDIENTE_FIRMA'].includes(document.status)) return;
      this.preparedConsentDocument = document;
      this.localSignatureRole = this.localSignatureRoles[0] ? this.localSignatureRoles[0].value : '';
      this.localSignerName = this.localSignatureRole === 'PATIENT' ? this.patientName : '';
      this.localSignatureBaseline = snapshot({ role: this.localSignatureRole, name: this.localSignerName });
      this.openConsentDialog('sign');
    },
    onLocalSignatureRoleChanged() {
      this.localSignerName = this.localSignatureRole === 'PATIENT' ? this.patientName : '';
      this.consentSignature = ''; this.consentDirty = false; this.consentRequestId = requestId();
    },
    async refreshConsentSignatureOptions() {
      await this.loadPlan();
      const document = this.activeConsentDocument;
      if(!document) return;
      if(document.status === 'FIRMADO') {
        this.showSignatureOptionsDialog = false;
        this.signatureOptionsDocument = null;
        this.toastFunction('success', 'Consentimiento firmado. Su versión ya está disponible en el plan.');
      } else this.signatureOptionsDocument = document;
    },
    openHistoryConsent: function(plan) {
      if(!this.canViewConsent) return;
      this.rememberFocus();
      this.selectedConsentPlan = plan;
      this.selectedConsentVersion = null;
      this.consentMode = 'view';
      if(plan.consent_versions && plan.consent_versions.length) this.selectedConsentVersion = plan.consent_versions[0];
      this.consentSignature = '';
      this.showHistoryDialog = false;
      this.showConsentDialog = true;
    },
    toggleHistoryNotes: function(id) {
      this.$set(this.expandedHistoryNotes, id, !this.expandedHistoryNotes[id]);
    },
    isHistoryNotesOpen: function(id) {
      return Boolean(this.expandedHistoryNotes[id]);
    },
    onConsentSigned: function(signature) {
      this.consentSignature = signature;
      this.consentDirty = Boolean(signature);
      this.toastFunction('success', 'Firma capturada. Ahora guarda el consentimiento.');
    },
    onConsentChanged(event) {
      this.consentSignature = '';
      this.consentDirty = !event.isEmpty;
      if(!event.isEmpty) this.toastFunction('info', 'Trazo cambiado. Aplica la firma y después guarda el consentimiento.');
    },
    saveConsent: async function() {
      if(!this.canSign) { this.toastFunction('warning', 'No tienes permiso para capturar una firma presencial.'); return false; }
      if(!this.activePlan) {
        return false;
      }
      if(!this.validateDoctorLicenseForConsent()) {
        return false;
      }
      if(!this.consentSignature) {
        this.toastFunction('warning', 'Primero aplica la firma del paciente.');
        return false;
      }
      if(this.preparedConsentDocument) {
        if(!this.localSignatureRoles.some(role => role.value === this.localSignatureRole)) { this.toastFunction('warning', 'Selecciona una firma pendiente.'); return false; }
        if(this.localSignatureRole !== 'PATIENT' && !this.localSignerName.trim()) { this.toastFunction('warning', 'Escribe el nombre de quien firma.'); return false; }
        const saved = await this.performAction(DATreatmentService.signPreparedConsent, {
          id_person: this.patientId, id_patient_document: this.preparedConsentDocument.id_patient_document,
          patient_signature: this.consentSignature, signature_role: this.localSignatureRole,
          signer_name: this.localSignerName || this.patientName
        }, 'Firma registrada en el documento del plan.');
        if(saved) {
          const completed = this.activeConsentDocument && this.activeConsentDocument.status === 'FIRMADO';
          this.closeEditors();
          this.preparedConsentDocument = null;
          this.toastFunction('success', completed ? 'Consentimiento firmado y versión guardada.' : 'Firma registrada. Quedan otras firmas pendientes; puedes continuar desde el plan.');
        }
        return saved;
      }
      const saved = await this.performAction(this.saveTreatmentPlanConsent, {
        id_person: this.patientId,
        id_treatment_plan: this.activePlan.id_treatment_plan,
        patient_signature: this.consentSignature,
        doctor_user_id: this.doctorUserId,
        request_id: this.consentRequestId,
        review_token: this.consentReviewToken,
        declare_text_snapshot: this.currentDeclareText,
        consent_text_snapshot: this.currentConsentText,
        doctor_signature_snapshot: this.currentDoctorSignature,
        doctor_name_snapshot: this.currentDoctorName,
        professional_license_snapshot: this.signingProfessionalLicense()
      }, 'Versión del consentimiento guardada.');
      if(saved) this.closeEditors();
      return saved;
    },
    countByStatus: function(status) {
      return this.activeTreatments.filter((item) => item.status === status).length;
    },
    statusLabel: function(status) {
      const found = this.statusOptions.find((item) => item.value === status);
      return found ? found.label : 'Pendiente';
    },
    statusGroupLabel: function(status) {
      const found = this.filters.find((item) => item.value === status);
      return found ? found.label : this.statusLabel(status);
    },
    // The one next step shown as a button on each card; other moves live in its menu.
    primaryStatusAction: function(item) {
      if(this.canEdit && ['pending', 'paused'].includes(item.status)) {
        return { status: 'in_progress', label: item.status === 'paused' ? 'Reanudar' : 'Iniciar', icon: 'mdi-play-outline' };
      }
      if(this.canComplete && item.status === 'in_progress') {
        return { status: 'completed', label: 'Completar', icon: 'mdi-check' };
      }
      return null;
    },
    secondaryStatusActions: function(item) {
      const primary = this.primaryStatusAction(item);
      return this.statusActions(item).filter(option => !primary || option.value !== primary.status);
    },
    hasCost: function(item) {
      return item.cost !== null && item.cost !== undefined && item.cost !== '';
    },
    formatLongDate: function(date) {
      if(!date) return 'Sin fecha';
      const parts = String(date).slice(0, 10).split('-').map(Number);
      if(parts.length !== 3 || parts.some(Number.isNaN)) return this.formatDisplayDate(date);
      return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    dateRange: function(item) {
      const start = item.estimated_start_date, end = item.estimated_end_date;
      if(start && end) return start.slice(0, 10) === end.slice(0, 10) ? this.formatLongDate(start) : `${this.formatLongDate(start)} – ${this.formatLongDate(end)}`;
      if(start) return `Desde ${this.formatLongDate(start)}`;
      if(end) return `Hasta ${this.formatLongDate(end)}`;
      return '';
    },
    formatDate: function(date) {
      if(!date) {
        return '--';
      }
      return String(date).slice(0, 10);
    },
    formatDisplayDate: function(date) {
      if(!date) {
        return 'No especificado';
      }
      const value = String(date).slice(0, 10);
      const parts = value.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
    },
    formatDateTime: function(date) {
      if(!date) {
        return '--';
      }
      return String(date).replace('T', ' ').slice(0, 16);
    },
    formatDisplayDateTime: function(date) {
      if(!date) {
        return 'No especificado';
      }
      const value = String(date).replace('T', ' ');
      const datePart = this.formatDisplayDate(value.slice(0, 10));
      const timePart = value.slice(11, 16);
      return timePart ? `${datePart} ${timePart}` : datePart;
    },
    formatCurrencyValue: function(value) {
      if(value === null || value === undefined || value === '') {
        return 'No especificado';
      }
      const amount = Number(value);
      return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    },
    printableHistoryHtml: function(plan) {
      const treatments = this.planTreatments(plan);
      const consent = plan && plan.consent ? plan.consent : null;
      const rows = treatments.map((item) => `
        <tr>
          <td>${this.escapeHtml(item.name || 'Sin nombre')}</td>
          <td>${this.escapeHtml(this.statusLabel(item.status))}</td>
          <td>${this.escapeHtml(this.formatDisplayDate(item.estimated_start_date))}</td>
          <td>${this.escapeHtml(this.formatDisplayDate(item.estimated_end_date))}</td>
          ${this.showCosts ? `<td>${this.escapeHtml(this.formatCurrencyValue(item.cost))}</td>` : ''}
          <td>${this.escapeHtml((item.teeth || []).map(tooth => this.dentalLabel(item, tooth)).join(', ') || 'No especificado')}</td>
        </tr>
      `).join('');
      const consentHtml = consent ? `
        <section>
          <h2>Consentimiento</h2>
          <p><strong>Estado:</strong> ${this.escapeHtml(this.consentStatusLabel(plan))}</p>
          <p><strong>Fecha de firma:</strong> ${this.escapeHtml(this.formatDisplayDateTime(consent.signed_at))}</p>
          <p><strong>Doctor:</strong> ${this.escapeHtml(consent.doctor_name_snapshot || 'No especificado')}</p>
          <div class="signatures">
            <div>
              <strong>Firma del doctor</strong>
              ${consent.doctor_signature_snapshot ? `<img src="${this.escapeHtml(consent.doctor_signature_snapshot)}" alt="Firma del doctor">` : '<span>Sin firma registrada.</span>'}
              <small>${this.escapeHtml(consent.doctor_name_snapshot || 'Doctor no especificado')}</small>
            </div>
            <div>
              <strong>${this.consentPatientSignatureLabel(consent)}</strong>
              ${consent.patient_signature ? `<img src="${this.escapeHtml(consent.patient_signature)}" alt="${this.consentPatientSignatureLabel(consent)}">` : '<span>Sin firma registrada.</span>'}
              <small>${this.escapeHtml(consent.patient_signer_name_snapshot || this.patientName || 'Paciente no especificado')}</small>
            </div>
            ${this.printableAdditionalConsentSignatures(consent)}
          </div>
        </section>
      ` : '<section><h2>Consentimiento</h2><p>Sin consentimiento firmado.</p></section>';
      return `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Histórico de plan de tratamiento</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; margin: 32px; }
              h1, h2 { margin: 0 0 8px; }
              h1 { font-size: 24px; }
              h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
              .brand { color: #0f766e; font-weight: 600; margin: 0 0 4px; }
              .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 18px 0; }
              .meta div { border: 1px solid #e5e7eb; padding: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
              th { background: #f3f4f6; }
              .reason { background: #f9fafb; border-left: 3px solid #0f766e; padding: 10px; }
              .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 22px; }
              .signatures div { border-top: 1px solid #9ca3af; padding-top: 10px; text-align: center; }
              .signatures strong, .signatures small, .signatures span { display: block; }
              .signatures img { display: block; max-width: 260px; max-height: 110px; object-fit: contain; margin: 8px auto; }
              .signatures span { color: #6b7280; margin: 18px 0; font-size: 12px; }
              @media print { body { margin: 18mm; } }
            </style>
          </head>
          <body>
            <p class="brand">${this.escapeHtml(this.businessName)}</p>
            <h1>${this.escapeHtml(plan.title || 'Plan de tratamiento')}</h1>
            <p>Histórico de plan cerrado. Paciente: ${this.escapeHtml(this.patientName || 'No especificado')}</p>
            <section class="meta">
              <div><strong>Inicio</strong><br>${this.escapeHtml(this.formatDisplayDate(plan.started_at))}</div>
              <div><strong>Cierre</strong><br>${this.escapeHtml(this.formatDisplayDateTime(plan.closed_at))}</div>
              <div><strong>Tratamientos</strong><br>${treatments.length}</div>
              ${this.showCosts ? `<div><strong>Presupuesto del plan (incluye cancelados)</strong><br>${this.escapeHtml(this.formatCurrencyValue(this.planTotalCost(plan)))}</div>` : ''}
              <div><strong>Consentimiento</strong><br>${this.escapeHtml(this.consentStatusLabel(plan))}</div>
              <div><strong>Creado por</strong><br>${this.escapeHtml(plan.created_by_name || 'Usuario no disponible')}</div>
            </section>
            ${plan.diagnosis ? `<p><strong>Diagnóstico general:</strong> ${this.escapeHtml(plan.diagnosis)}</p>` : ''}
            ${plan.notes ? `<p style="white-space:pre-wrap"><strong>Notas del plan:</strong> ${this.escapeHtml(plan.notes)}</p>` : ''}
            ${plan.close_reason ? `<p class="reason"><strong>Resumen de cierre:</strong> ${this.escapeHtml(this.formatCloseReason(plan.close_reason))}</p>` : ''}
            <section>
              <h2>Resumen por estado</h2>
              <p>Pendientes: ${this.planStatusCount(plan, 'pending')} | En progreso: ${this.planStatusCount(plan, 'in_progress')} | Pausados: ${this.planStatusCount(plan, 'paused')} | Completados: ${this.planStatusCount(plan, 'completed')} | Cancelados: ${this.planStatusCount(plan, 'cancelled')}</p>
            </section>
            <section>
              <h2>Tratamientos</h2>
              <table>
                <thead>
                  <tr><th>Tratamiento</th><th>Estado</th><th>Inicio</th><th>Fin</th>${this.showCosts ? '<th>Costo</th>' : ''}<th>Dientes</th></tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="6">Sin tratamientos registrados.</td></tr>'}</tbody>
              </table>
            </section>
            ${consentHtml}
          </body>
        </html>
      `;
    },
    consentPatientSignatureLabel(consent) { return consent && consent.patient_signature_role === 'TUTOR' ? 'Firma del tutor o representante' : 'Firma del paciente'; },
    printableAdditionalConsentSignatures(consent) {
      return (consent && consent.signatures_snapshot || []).filter(signature => ['WITNESS1', 'WITNESS2'].includes(signature.signature_role)).map(signature => {
        const label = signature.signature_role === 'WITNESS1' ? 'Firma del testigo 1' : 'Firma del testigo 2';
        return `<div><strong>${label}</strong><img src="${this.escapeHtml(signature.signature_image)}" alt="${label}"><small>${this.escapeHtml(signature.signer_name_snapshot || '')}</small></div>`;
      }).join('');
    },
    printableConsentHtml: function(plan) {
      const consent = plan && plan.consent ? plan.consent : null;
      const signedPlan = consent && consent.plan_snapshot;
      const signedPatient = signedPlan && signedPlan.patient;
      const signedPatientName = signedPatient ? signedPatient.fullname || `${signedPatient.name || ''} ${signedPatient.surname || ''}`.trim() : this.patientName;
      const treatments = this.planTreatments(signedPlan);
      const treatmentItems = treatments.map((item) => `<li>${this.escapeHtml(item.name || 'Sin nombre')} <span>${this.escapeHtml(this.statusLabel(item.status))}</span></li>`).join('');
      return `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Consentimiento del plan de tratamiento</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; margin: 32px; line-height: 1.45; }
              h1, h2 { margin: 0 0 8px; }
              h1 { font-size: 24px; }
              h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
              .brand { color: #0f766e; font-weight: 600; margin: 0 0 4px; }
              .status { display: inline-block; border: 1px solid #86efac; background: #f0fdf4; color: #047857; border-radius: 999px; padding: 3px 10px; font-weight: 600; font-size: 12px; }
              .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 18px 0; }
              .meta div { border: 1px solid #e5e7eb; padding: 8px; }
              .document-text { white-space: pre-wrap; }
              ul { margin: 8px 0 0 18px; padding: 0; }
              li span { color: #6b7280; font-size: 12px; }
              .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px; margin-top: 34px; }
              .signatures div { border-top: 1px solid #9ca3af; padding-top: 10px; text-align: center; min-height: 150px; }
              .signatures strong, .signatures small, .signatures span { display: block; }
              .signatures img { display: block; max-width: 280px; max-height: 120px; object-fit: contain; margin: 8px auto; }
              .signatures span { color: #6b7280; margin: 18px 0; font-size: 12px; }
              @media print { body { margin: 18mm; } }
            </style>
          </head>
          <body>
            <p class="brand">${this.escapeHtml(this.businessName)}</p>
            <h1>Consentimiento del plan de tratamiento</h1>
            <span class="status">Firmado</span>
            <section class="meta">
              <div><strong>Paciente</strong><br>${this.escapeHtml(signedPatientName || 'No especificado')}</div>
              <div><strong>Doctor firmante</strong><br>${this.escapeHtml(consent && consent.doctor_name_snapshot ? consent.doctor_name_snapshot : 'No especificado')}</div>
              <div><strong>Cédula profesional</strong><br>${this.escapeHtml(consent && consent.professional_license_snapshot ? consent.professional_license_snapshot : 'No registrada al momento de la firma')}</div>
              <div><strong>Fecha de firma</strong><br>${this.escapeHtml(consent ? this.formatDisplayDateTime(consent.signed_at) : 'No especificado')}</div>
              <div><strong>Plan</strong><br>${this.escapeHtml(signedPlan && signedPlan.title || plan.title || 'Plan de tratamiento')}</div>
              ${this.showCosts && signedPlan ? `<div><strong>Presupuesto al firmar</strong><br>${this.escapeHtml(this.formatCurrencyValue(this.planTotalCost(signedPlan)))}</div>` : ''}
            </section>
            <section>
              <h2>Declaro</h2>
              <div class="document-text">${this.textToHtml(consent && consent.declare_text_snapshot ? consent.declare_text_snapshot : 'No hay texto DECLARO registrado.')}</div>
            </section>
            ${consent && consent.consent_text_snapshot ? `
              <section>
                <h2>Consiento</h2>
                <div class="document-text">${this.textToHtml(consent.consent_text_snapshot)}</div>
              </section>
            ` : ''}
            <section>
              <h2>Tratamientos relacionados</h2>
              <ul>${treatmentItems || `<li>${signedPlan ? 'No había tratamientos registrados al firmar.' : 'Consentimiento anterior: no se guardó una copia del plan al firmar. Se conservan el texto y las firmas originales.'}</li>`}</ul>
            </section>
            <section class="signatures">
              <div>
                <strong>Firma del doctor</strong>
                ${consent && consent.doctor_signature_snapshot ? `<img src="${this.escapeHtml(consent.doctor_signature_snapshot)}" alt="Firma del doctor">` : '<span>Sin firma registrada.</span>'}
                <small>${this.escapeHtml(consent && consent.doctor_name_snapshot ? consent.doctor_name_snapshot : 'Doctor no especificado')}</small>
              </div>
              <div>
                <strong>${this.consentPatientSignatureLabel(consent)}</strong>
                ${consent && consent.patient_signature ? `<img src="${this.escapeHtml(consent.patient_signature)}" alt="${this.consentPatientSignatureLabel(consent)}">` : '<span>Sin firma registrada.</span>'}
                <small>${this.escapeHtml(consent && consent.patient_signer_name_snapshot || signedPatientName || 'Paciente no especificado')}</small>
              </div>
              ${this.printableAdditionalConsentSignatures(consent)}
            </section>
          </body>
        </html>
      `;
    },
    printHistory: function(plan) {
      if(!plan) {
        return;
      }
      const printWindow = window.open('', '_blank', 'width=900,height=1100');
      if(!printWindow) {
        this.toastFunction('warning', 'No se pudo abrir la ventana de impresión.');
        return;
      }
      printWindow.document.open();
      printWindow.document.write(this.printableHistoryHtml(plan));
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
    },
    printConsent: function(plan) {
      if(!plan || !plan.consent) {
        return;
      }
      const printWindow = window.open('', '_blank', 'width=900,height=1100');
      if(!printWindow) {
        this.toastFunction('warning', 'No se pudo abrir la ventana de impresión.');
        return;
      }
      printWindow.document.open();
      const selected = this.showConsentDialog ? this.selectedConsent : plan.consent;
      printWindow.document.write(this.printableConsentHtml({ ...plan, consent: selected }));
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
    }
  }
}
</script>

<style scoped>
.patient-treatment {
  color: var(--color-text, #25364d);
}

.plan-feedback { margin-bottom: .8rem; padding: .75rem 1rem; border-radius: .75rem; border: 1px solid #bae6fd; background: #effaff; color: #075985; line-height: 1.5; }
.plan-feedback.feedback-error { background: #fff1f2; border-color: #fecdd3; color: #9f1239; }
.plan-feedback.feedback-warning { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.plan-feedback.feedback-success { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
.plan-details { padding: .85rem 1.2rem; border: 1px solid var(--color-border, #d8e9ef); background: var(--color-surface); }
.preserve-lines { white-space: pre-wrap; overflow-wrap: anywhere; }
.unsaved-state { display: inline-block; color: #92400e; background: #fffbeb; border-radius: 1rem; padding: .2rem .65rem; font-size: .85rem; }
button:focus-visible { outline: 3px solid #0e7490; outline-offset: 3px; }
button:disabled { opacity: .55; cursor: default; }

.treatment-empty {
  border: 1px solid var(--color-border, rgba(14, 84, 104, 0.16));
  background: var(--color-surface);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
}

.consent-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, .35);
  background: rgba(34, 197, 94, .1);
  color: #047857;
  padding: .2rem .55rem;
  font-size: .72rem;
  font-weight: 600;
}

.consent-status {
  border-color: rgba(251, 191, 36, .45);
  background: rgba(251, 191, 36, .12);
  color: #b7791f;
}

.consent-status.signed {
  border-color: rgba(34, 197, 94, .35);
  background: rgba(34, 197, 94, .1);
  color: #047857;
}

.eyebrow {
  margin: 0 0 .25rem;
  color: var(--color-primary-700);
  font-size: .75rem;
  font-weight: 600;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.history-empty,
.description,
.notes {
  color: var(--color-text-muted, #64748b);
}

.dialog-actions {
  display: flex;
  align-items: center;
  gap: .55rem;
  flex-wrap: wrap;
}

button {
  font-weight: 600;
  letter-spacing: .04em;
}

.btn-primary,
.btn-outline,
.btn-danger,
.btn-danger-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: .55rem .95rem;
  transition: .18s ease;
}

.btn-primary {
  background: var(--color-primary-500);
  color: #fff;
  box-shadow: 0 8px 18px var(--shadow-primary, rgba(27, 166, 201, .25));
}

.btn-outline {
  background: var(--color-surface);
  color: var(--color-primary-900);
  border-color: var(--color-border, #d8e9ef);
}

.btn-danger {
  background: #b42318;
  color: #fff;
  border-color: #b42318;
  box-shadow: 0 8px 18px rgba(180, 35, 24, .18);
}

.btn-danger-secondary {
  background: var(--color-surface);
  color: #b42318;
  border-color: rgba(248, 113, 113, .36);
}

.summary-total-cost strong {
  color: var(--color-primary-900);
  font-size: 1.45rem;
}

.readonly-treatment {
  border: 1px solid var(--color-border, rgba(14, 84, 104, 0.16));
  background: var(--color-surface);
  padding: 1rem;
  box-shadow: 0 8px 20px rgba(15, 23, 42, .06);
}

.history-state-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(100, 116, 139, .35);
  background: rgba(100, 116, 139, .1);
  color: #475569;
  padding: .2rem .55rem;
  font-size: .72rem;
  font-weight: 600;
  white-space: nowrap;
}

.history-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: .65rem;
}

.history-summary-grid article,
.document-data-grid div {
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-bg, #f8fbfd);
  padding: .7rem;
}

.history-summary-grid span,
.document-data-grid strong,
.history-overview-main small {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-size: .76rem;
  font-weight: 600;
}

.history-summary-grid strong,
.history-overview-main strong {
  display: block;
  color: var(--color-text, #25364d);
  font-size: .98rem;
}

.title-row,
.meta-row,
.tooth-row {
  display: flex;
  align-items: center;
  gap: .55rem;
  flex-wrap: wrap;
}

.title-row h4 {
  margin: 0;
  color: var(--color-text, #25364d);
  font-size: 1.05rem;
}

.meta-row span {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  color: var(--color-text-muted, #64748b);
  font-size: .86rem;
}

.tooth-row span {
  color: var(--color-primary-900);
  background: var(--color-primary-100);
  border: 1px solid var(--color-primary-200);
  padding: .25rem .5rem;
  font-size: .78rem;
  font-weight: 600;
}

.status-chip {
  border: 1px solid var(--color-primary-200);
  background: var(--color-primary-100);
  color: var(--color-primary-900);
  padding: .18rem .45rem;
  font-size: .75rem;
  font-weight: 600;
}

.status-pending { border-color: rgba(251, 191, 36, .45); background: rgba(251, 191, 36, .12); color: #b7791f; }
.status-in_progress { border-color: rgba(96, 165, 250, .45); background: rgba(96, 165, 250, .12); color: #1d4ed8; }
.status-completed { border-color: rgba(34, 197, 94, .45); background: rgba(34, 197, 94, .12); color: #047857; }
.status-cancelled { border-color: rgba(248, 113, 113, .45); background: rgba(248, 113, 113, .12); color: #b42318; }
.status-paused { border-color: rgba(148, 163, 184, .45); background: rgba(148, 163, 184, .14); color: #475569; }

.treatment-empty {
  display: grid;
  place-items: center;
  text-align: center;
  gap: .45rem;
  padding: 2rem;
}

.treatment-empty h3 {
  margin: 0;
  color: var(--color-text, #25364d);
}

.history-expand-enter-active,
.history-expand-leave-active {
  transition: opacity .16s ease, transform .16s ease;
}

.history-expand-enter,
.history-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.history-dialog-header {
  align-items: center;
}

.history-dialog-header > div:first-child span {
  display: block;
  color: var(--color-text-muted, #64748b);
  margin-top: .25rem;
}

.history-dialog-body {
  display: grid;
  gap: 1rem;
}

.history-overview,
.history-consent-block,
.history-treatment-section {
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-surface);
  padding: 1rem;
}

.history-overview-main {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
  gap: .75rem;
}

.history-overview-reason {
  grid-column: 1 / -1;
}

.history-overview-reason p {
  margin: .2rem 0 0;
  color: var(--color-text, #25364d);
}

.history-consent-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-color: rgba(148, 163, 184, .35);
  background: rgba(148, 163, 184, .08);
}

.history-consent-block.signed {
  border-color: rgba(34, 197, 94, .35);
  background: rgba(34, 197, 94, .08);
}

.history-consent-block strong {
  display: block;
  color: var(--color-text, #25364d);
}

.history-consent-block span {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-size: .86rem;
}

.section-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: .8rem;
}

.section-heading-row h4 {
  margin: 0;
  color: var(--color-text, #25364d);
}

.history-treatment-card {
  box-shadow: none;
  border-left: 3px solid #94a3b8;
}

.history-treatment-card p {
  color: var(--color-text-muted, #64748b);
}

.notes-toggle {
  margin-top: .65rem;
}

.btn-text {
  border: none;
  background: transparent;
  color: var(--color-primary-900);
  padding: 0;
}

.history-note {
  margin: .55rem 0 0;
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-bg, #f8fbfd);
  padding: .7rem;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.2rem 1.4rem;
  border-bottom: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-primary-50, #effbfe);
}

.plan-editor-card { overflow: hidden; border-radius: 12px !important; color: var(--color-text, #25364d); background: var(--color-surface); }
.plan-editor-header.dialog-header { gap: 14px; padding: 24px; background: var(--color-surface); }
.plan-editor-icon { display: flex; align-items: center; justify-content: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 12px; color: var(--color-primary-700); background: var(--color-primary-100); }
.plan-editor-icon .v-icon { color: inherit; }
.plan-editor-heading { flex: 1; min-width: 0; }
.plan-editor-heading h3 { font-size: 1.2rem; font-weight: 600; line-height: 1.4; }
.plan-editor-description { margin: 7px 0 0; color: var(--color-text-muted, #64748b); font-size: .82rem; line-height: 1.6; }
.plan-editor-header > .v-btn { flex-shrink: 0; margin: -4px -8px 0 0; color: var(--color-text-muted, #64748b); }
.plan-editor-card .dialog-body { padding: 24px !important; background: var(--color-bg, #f8fbfd); color: var(--color-text, #25364d); }
.plan-editor-card .dialog-actions { gap: 8px; flex-wrap: wrap; padding: 16px 24px !important; border-top: 1px solid var(--color-border, #d8e9ef); }
@media (max-width: 600px) {
  .plan-editor-header.dialog-header { padding: 20px 16px; gap: 10px; }
  .plan-editor-card .dialog-body { padding: 20px 16px !important; }
  .plan-editor-card .dialog-actions { padding: 16px !important; }
  .plan-editor-card .dialog-actions button { flex: 1 1 auto; }
}

.dialog-header.compact {
  padding: 1rem 1.2rem;
}

.dialog-header h3 {
  margin: 0;
  color: var(--color-text, #25364d);
}

.dialog-body {
  padding: 1.2rem 1.4rem !important;
}

.dialog-actions {
  justify-content: flex-end;
  padding: 0 1.4rem 1.2rem !important;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .8rem;
}

.form-section {
  display: grid;
  gap: .75rem;
  margin-bottom: 1rem;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section-header h4,
.tooth-selector h4 {
  margin: 0;
  color: var(--color-text, #25364d);
  font-size: .95rem;
}

.field-help {
  margin: -.25rem 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: .82rem;
}

.tooth-selector {
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-primary-50, #effbfe);
  padding: 1rem;
}

.tooth-selector span {
  color: var(--color-text-muted, #64748b);
}

.tooth-grid {
  display: flex;
  flex-wrap: wrap;
  gap: .45rem;
  margin-top: .8rem;
}

.tooth-grid button {
  width: 2.5rem;
  height: 2.1rem;
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-surface);
  color: var(--color-text, #25364d);
}

.tooth-grid button.selected {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: #fff;
}

.info-box {
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-primary-50, #effbfe);
  color: var(--color-text, #25364d);
  padding: .85rem;
  margin-bottom: .8rem;
}

.info-box strong {
  display: block;
  margin-bottom: .4rem;
}

.info-box ul {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--color-text-muted, #64748b);
}

.warning-box,
.success-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  border: 1px solid rgba(251, 191, 36, .45);
  background: rgba(251, 191, 36, .10);
  color: var(--color-text, #25364d);
  padding: .75rem;
  margin-bottom: .8rem;
}

.warning-box {
  justify-content: flex-start;
}

.success-box {
  justify-content: flex-start;
  border-color: rgba(34, 197, 94, .35);
  background: rgba(34, 197, 94, .10);
}

.consent-dialog-body {
  background: var(--color-bg, #f8fbfd);
}

.clinical-document {
  background: #fff;
  border: 1px solid var(--color-border, #d8e9ef);
  padding: 1.2rem;
}

.document-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--color-border, #d8e9ef);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.sheet-brand {
  margin: 0 0 .25rem;
  color: var(--color-primary-900);
  font-weight: 600;
}

.document-header h3 {
  margin: 0;
  color: var(--color-text, #25364d);
}

.document-subtitle,
.muted-copy {
  color: var(--color-text-muted, #64748b);
}

.document-status-block {
  display: grid;
  justify-items: end;
  gap: .25rem;
  color: var(--color-text-muted, #64748b);
  font-size: .78rem;
}

.document-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: .7rem;
  margin-bottom: 1rem;
}

.document-data-grid span {
  display: block;
  color: var(--color-text, #25364d);
  margin-top: .2rem;
}

.document-section {
  border-top: 1px solid var(--color-border, #d8e9ef);
  padding-top: 1rem;
  margin-top: 1rem;
}

.document-text {
  color: var(--color-text, #25364d);
  line-height: 1.55;
}

.document-related {
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
  margin-bottom: .6rem;
}

.document-related span,
.document-treatment-list li span {
  color: var(--color-primary-900);
  background: var(--color-primary-100);
  border: 1px solid var(--color-primary-200);
  padding: .25rem .5rem;
  font-size: .78rem;
  font-weight: 600;
}

.document-treatment-list {
  margin: 0;
  padding-left: 1.1rem;
}

.document-treatment-list li {
  margin-bottom: .35rem;
  color: var(--color-text, #25364d);
}

.document-signatures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.2rem;
}

.document-signatures article {
  border-top: 1px solid var(--color-border, #d8e9ef);
  padding-top: .9rem;
  text-align: center;
}

.document-signatures article span {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-weight: 600;
  margin-bottom: .5rem;
}

.document-signatures img {
  display: block;
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
  margin: 0 auto .6rem;
  border: 1px solid var(--color-border, #d8e9ef);
  padding: .5rem;
}

.consent-preview {
  display: grid;
  gap: .85rem;
}

.consent-text-card,
.signature-grid article {
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-surface);
  padding: 1rem;
}

.consent-text-card.full-width {
  grid-column: 1 / -1;
}

.consent-text-card p:last-child {
  margin: 0;
  white-space: pre-wrap;
  color: var(--color-text, #25364d);
  line-height: 1.5;
}

.signature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .85rem;
}

.signature-grid article span {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-weight: 600;
  margin-bottom: .5rem;
}

.signature-grid img {
  display: block;
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
  background: #fff;
  border: 1px solid var(--color-border, #d8e9ef);
  padding: .5rem;
  margin-bottom: .5rem;
}

.signature-grid article p {
  color: var(--color-text-muted, #64748b);
}

.confirm-message {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  line-height: 1.5;
}

.readonly-treatment + .readonly-treatment {
  margin-top: .75rem;
}

@media (max-width: 768px) {
  .history-consent-block,
.document-header {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .form-grid,
  .signature-grid,
  .document-signatures {
    grid-template-columns: 1fr;
  }

  .document-status-block {
    justify-content: flex-start;
    align-items: stretch;
    justify-items: start;
    width: 100%;
  }
}
</style>

<style scoped>
/* Treatment plan main view (redesign). Dialogs keep the styles above. */
.tp-tone-pending { --tone: #f59e0b; --tone-bg: #fff7e0; --tone-text: #92400e; }
.tp-tone-in_progress { --tone: #3b82f6; --tone-bg: #eaf2ff; --tone-text: #1d4ed8; }
.tp-tone-paused { --tone: #94a3b8; --tone-bg: #f1f5f9; --tone-text: #475569; }
.tp-tone-completed { --tone: #10b981; --tone-bg: #e7f7ef; --tone-text: #047857; }
.tp-tone-cancelled { --tone: #f87171; --tone-bg: #fdecec; --tone-text: #b42318; }

.tp-start,
.tp-plan,
.tp-consent,
.tp-history {
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: #fff;
}

/* No active plan */
.tp-start {
  padding: 40px 24px;
  text-align: center;
}
.tp-start-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: var(--color-primary-100);
}
.tp-start-icon .v-icon { color: var(--color-primary-700); }
.tp-start h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--color-text); }
.tp-start p:not(.eyebrow) { max-width: 520px; margin: 8px auto 0; color: var(--color-text-muted); font-size: .9rem; line-height: 1.6; }
.tp-start-action { margin-top: 20px; }

/* Plan header */
.tp-plan { padding: 20px 24px; }
.tp-plan-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.tp-plan-heading { min-width: 0; flex: 1 1 320px; }
.tp-plan-kicker { display: flex; align-items: center; gap: 8px; }
.tp-plan-kicker .eyebrow { margin: 0; }
.tp-plan-state { padding: 2px 10px; border-radius: 999px; background: #e7f7ef; color: #047857; font-size: .75rem; font-weight: 600; }
.tp-plan-heading h3 { margin: 6px 0 0; font-size: 1.375rem; line-height: 1.3; font-weight: 600; color: var(--color-text); overflow-wrap: anywhere; }
.tp-plan-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 6px 0 0; color: var(--color-text-muted); font-size: .82rem; }
.tp-plan-meta span { display: inline-flex; align-items: center; gap: 4px; }
.tp-plan-meta .v-icon { color: inherit; }
.tp-plan-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

.tp-icon-button {
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: #fff;
  color: var(--color-text-muted);
  transition: background-color .16s ease, color .16s ease, border-color .16s ease;
}
.tp-icon-button .v-icon { color: inherit; }
.tp-icon-button:hover:not(:disabled) { background: var(--color-primary-100); color: var(--color-primary-900); }

.tp-plan-notes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px 24px;
  margin: 16px 0 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--color-bg);
}
.tp-plan-notes dt { color: var(--color-text-muted); font-size: .75rem; font-weight: 600; letter-spacing: .02em; }
.tp-plan-notes dd { margin: 2px 0 0; color: var(--color-text); font-size: .9rem; line-height: 1.5; overflow-wrap: anywhere; }

/* Progress */
.tp-progress { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--color-border); }
.tp-progress-head { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px 16px; }
.tp-progress-title { margin: 0; color: var(--color-text-muted); font-size: .9rem; }
.tp-progress-title strong { color: var(--color-text); font-size: 1rem; font-weight: 600; }
.tp-budget { display: flex; align-items: baseline; gap: 8px; margin: 0; }
.tp-budget span { color: var(--color-text-muted); font-size: .82rem; }
.tp-budget strong { color: var(--color-text); font-size: 1.15rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.tp-progress-bar { display: flex; gap: 2px; height: 10px; margin-top: 10px; overflow: hidden; border-radius: 999px; background: var(--color-bg); }
.tp-progress-segment { min-width: 6px; background: var(--tone); }
.tp-legend { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 10px 0 0; padding: 0; list-style: none; color: var(--color-text-muted); font-size: .82rem; }
.tp-legend strong { color: var(--color-text); font-weight: 600; }
.tp-legend-dot { display: inline-block; width: 9px; height: 9px; margin-right: 6px; border-radius: 50%; background: var(--tone); vertical-align: 0; }
.tp-footnote { margin: 8px 0 0; color: var(--color-text-muted); font-size: .75rem; }
.tp-readonly { margin-top: 12px; }

/* Consent */
.tp-consent {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 16px 20px;
  border-color: #f6e2b0;
  background: #fffaf0;
}
.tp-consent--signed { border-color: #bfe6cf; background: #f3fbf6; }
.tp-consent--blocked { border-color: var(--color-border); background: var(--color-bg); }
.tp-consent-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: #fff; border: 1px solid currentColor; color: #b7791f; }
.tp-consent--signed .tp-consent-icon { color: #047857; }
.tp-consent--blocked .tp-consent-icon { color: var(--color-text-muted); }
.tp-consent-icon .v-icon { color: inherit; }
.tp-consent-title { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.tp-consent-title h4 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--color-text); }
.tp-consent-status { padding: 2px 10px; border-radius: 999px; background: #fff3cd; color: #8a5a00; font-size: .75rem; font-weight: 600; }
.tp-consent--signed .tp-consent-status { background: #cdeed6; color: #0f5132; }
.tp-consent--blocked .tp-consent-status { background: #fff; color: var(--color-text-muted); border: 1px solid var(--color-border); }
.tp-consent-copy p { margin: 4px 0 0; color: var(--color-text-muted); font-size: .85rem; line-height: 1.5; }
.tp-consent-copy .field-help { margin-top: 6px; }
.tp-consent-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; min-width: 240px; }
.tp-doctor-select { width: 260px; max-width: 100%; flex: 0 0 auto; }
.tp-consent-buttons { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }

/* Treatments */
.tp-treatments { margin-top: 24px; }
.tp-treatments-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
.tp-treatments-header h4 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--color-text); }
.tp-count { padding: 1px 8px; border-radius: 999px; background: var(--color-primary-100); color: var(--color-primary-900); font-size: .75rem; font-weight: 600; }
.tp-filters { display: flex; flex-wrap: wrap; gap: 6px; }
.tp-filters button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #fff;
  color: var(--color-text-muted);
  font-size: .82rem;
  letter-spacing: 0;
  transition: background-color .16s ease, color .16s ease, border-color .16s ease;
}
.tp-filters button:hover:not(:disabled) { border-color: var(--color-primary-500); color: var(--color-primary-900); }
.tp-filters button.active { border-color: var(--color-primary-900); background: var(--color-primary-900); color: #fff; }
.tp-filter-count { min-width: 18px; padding: 0 5px; border-radius: 999px; background: var(--color-bg); color: var(--color-text); font-size: .72rem; text-align: center; }
.tp-filters button.active .tp-filter-count { background: rgba(255, 255, 255, .18); color: #fff; }

.tp-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.tp-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: #fff;
  transition: box-shadow .16s ease, border-color .16s ease;
}
.tp-card:hover { border-color: #c5dde6; box-shadow: 0 6px 18px rgba(15, 23, 42, .06); }
.tp-card--cancelled { background: var(--color-bg); }
.tp-card--cancelled h5,
.tp-card--cancelled .tp-cost { color: var(--color-text-muted); }
.tp-card-top { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.tp-card-top h5 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--color-text); overflow-wrap: anywhere; }
.tp-status { padding: 2px 10px; border-radius: 999px; background: var(--tone-bg); color: var(--tone-text); font-size: .75rem; font-weight: 600; }
.tp-cost { margin-left: auto; color: var(--color-text); font-size: .95rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.tp-description { margin: 4px 0 0; color: var(--color-text-muted); font-size: .88rem; line-height: 1.5; }
.tp-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; color: var(--color-text-muted); font-size: .82rem; }
.tp-meta span { display: inline-flex; align-items: center; gap: 4px; }
.tp-meta .v-icon { color: inherit; }
.tp-meta .tp-tooth { padding: 1px 8px; border-radius: 999px; background: var(--color-primary-100); color: var(--color-primary-900); }
.tp-note { display: flex; gap: 6px; margin: 10px 0 0; padding: 8px 10px; border-radius: 8px; background: var(--color-bg); color: var(--color-text); font-size: .85rem; line-height: 1.5; }
.tp-note .v-icon { flex-shrink: 0; margin-top: 1px; color: var(--color-text-muted); }

.tp-card-actions { display: flex; align-items: center; gap: 6px; }
.tp-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #fff;
  color: var(--color-primary-900);
  font-size: .85rem;
  letter-spacing: 0;
  white-space: nowrap;
  transition: background-color .16s ease, border-color .16s ease, color .16s ease;
}
.tp-action .v-icon { color: inherit; }
.tp-action:hover:not(:disabled) { background: var(--color-primary-100); }
.tp-action--primary { border-color: var(--color-primary-500); background: var(--color-primary-500); color: #fff; }
.tp-action--primary:hover:not(:disabled) { border-color: var(--color-primary-700); background: var(--color-primary-700); }

.tp-list-empty { padding: 32px 20px; border: 1px dashed var(--color-border); border-radius: 14px; text-align: center; }
.tp-list-empty .v-icon { color: var(--color-primary-500); }
.tp-list-empty h5 { margin: 8px 0 0; font-size: 1rem; font-weight: 600; color: var(--color-text); }
.tp-list-empty p { margin: 4px 0 0; color: var(--color-text-muted); font-size: .88rem; }
.tp-list-empty-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-top: 16px; }

/* Menus (rendered by Vuetify outside the card) */
.tp-menu .v-list-item__icon { align-self: center; margin: 0 12px 0 0 !important; }
.tp-menu .v-subheader { height: 32px; font-size: .75rem; font-weight: 600; }
.tp-menu-danger .v-list-item__title,
.tp-menu-danger .v-icon { color: #b42318 !important; }

/* History */
.tp-history { margin-top: 24px; overflow: hidden; }
.tp-history-toggle { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 14px 18px; background: transparent; color: var(--color-text); letter-spacing: 0; text-align: left; }
.tp-history-toggle .v-icon { color: var(--color-text-muted); }
.tp-history-heading { display: inline-flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 600; }
.tp-history-content { padding: 0 18px 8px; }
.tp-history-empty { margin: 0 0 12px; color: var(--color-text-muted); font-size: .88rem; }
.tp-history-card { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px 16px; padding: 14px 0; border-top: 1px solid var(--color-border); }
.tp-history-main { flex: 1 1 320px; min-width: 0; }
.tp-history-title strong { display: block; color: var(--color-text); font-size: .95rem; font-weight: 600; overflow-wrap: anywhere; }
.tp-history-title span { color: var(--color-text-muted); font-size: .82rem; }
.tp-history-facts { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 8px 0 0; padding: 0; list-style: none; color: var(--color-text-muted); font-size: .82rem; }
.tp-history-facts strong { color: var(--color-text); font-weight: 600; }
.tp-history-reason { margin: 8px 0 0; color: var(--color-text-muted); font-size: .82rem; }
.tp-history-actions { display: flex; flex-wrap: wrap; gap: 6px; }

@media (max-width: 760px) {
  .tp-plan { padding: 16px; }
  .tp-plan-actions { width: 100%; }
  .tp-consent { grid-template-columns: auto minmax(0, 1fr); }
  .tp-consent-actions { grid-column: 1 / -1; align-items: stretch; min-width: 0; }
  .tp-doctor-select { width: 100%; }
  .tp-consent-buttons { justify-content: flex-start; }
  .tp-card { grid-template-columns: minmax(0, 1fr); }
  .tp-card-actions { flex-wrap: wrap; }
  .tp-filters { flex-wrap: nowrap; width: 100%; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
  .tp-filters button { flex-shrink: 0; }
}

/* Clinical night */
html[data-theme="clinical-night"] .tp-tone-pending { --tone-bg: #3b301a; --tone-text: #fcd779; }
html[data-theme="clinical-night"] .tp-tone-in_progress { --tone-bg: #1e2b4a; --tone-text: #93c5fd; }
html[data-theme="clinical-night"] .tp-tone-paused { --tone-bg: #263449; --tone-text: #cbd5e1; }
html[data-theme="clinical-night"] .tp-tone-completed { --tone-bg: #193b2b; --tone-text: #9fe3b3; }
html[data-theme="clinical-night"] .tp-tone-cancelled { --tone-bg: #442523; --tone-text: #ffb8b2; }
html[data-theme="clinical-night"] .tp-start,
html[data-theme="clinical-night"] .tp-plan,
html[data-theme="clinical-night"] .tp-history,
html[data-theme="clinical-night"] .tp-card,
html[data-theme="clinical-night"] .tp-filters button,
html[data-theme="clinical-night"] .tp-action,
html[data-theme="clinical-night"] .tp-icon-button { border-color: #334155; background: #1e293b; }
html[data-theme="clinical-night"] .tp-start h3,
html[data-theme="clinical-night"] .tp-plan-heading h3,
html[data-theme="clinical-night"] .tp-plan-notes dd,
html[data-theme="clinical-night"] .tp-progress-title strong,
html[data-theme="clinical-night"] .tp-budget strong,
html[data-theme="clinical-night"] .tp-legend strong,
html[data-theme="clinical-night"] .tp-consent-title h4,
html[data-theme="clinical-night"] .tp-treatments-header h4,
html[data-theme="clinical-night"] .tp-card-top h5,
html[data-theme="clinical-night"] .tp-cost,
html[data-theme="clinical-night"] .tp-note,
html[data-theme="clinical-night"] .tp-list-empty h5,
html[data-theme="clinical-night"] .tp-history-toggle,
html[data-theme="clinical-night"] .tp-history-title strong,
html[data-theme="clinical-night"] .tp-history-facts strong { color: #e5e7eb; }
html[data-theme="clinical-night"] .tp-start p:not(.eyebrow),
html[data-theme="clinical-night"] .tp-plan-meta,
html[data-theme="clinical-night"] .tp-plan-notes dt,
html[data-theme="clinical-night"] .tp-progress-title,
html[data-theme="clinical-night"] .tp-budget span,
html[data-theme="clinical-night"] .tp-legend,
html[data-theme="clinical-night"] .tp-footnote,
html[data-theme="clinical-night"] .tp-consent-copy p,
html[data-theme="clinical-night"] .tp-description,
html[data-theme="clinical-night"] .tp-meta,
html[data-theme="clinical-night"] .tp-list-empty p,
html[data-theme="clinical-night"] .tp-history-title span,
html[data-theme="clinical-night"] .tp-history-facts,
html[data-theme="clinical-night"] .tp-history-reason,
html[data-theme="clinical-night"] .tp-history-empty,
html[data-theme="clinical-night"] .tp-filters button,
html[data-theme="clinical-night"] .tp-icon-button { color: #cbd5e1; }
html[data-theme="clinical-night"] .tp-plan-notes,
html[data-theme="clinical-night"] .tp-progress-bar,
html[data-theme="clinical-night"] .tp-note,
html[data-theme="clinical-night"] .tp-card--cancelled,
html[data-theme="clinical-night"] .tp-filter-count { background: #0f172a; color: #e5e7eb; }
html[data-theme="clinical-night"] .tp-progress,
html[data-theme="clinical-night"] .tp-history-card { border-color: #334155; }
html[data-theme="clinical-night"] .tp-list-empty { border-color: #334155; }
html[data-theme="clinical-night"] .tp-plan-state { background: #193b2b; color: #9fe3b3; }
html[data-theme="clinical-night"] .tp-count,
html[data-theme="clinical-night"] .tp-meta .tp-tooth { background: rgba(56, 189, 248, .14); color: #bae6fd; }
html[data-theme="clinical-night"] .tp-action { color: #bae6fd; }
html[data-theme="clinical-night"] .tp-action:hover:not(:disabled),
html[data-theme="clinical-night"] .tp-icon-button:hover:not(:disabled) { background: rgba(56, 189, 248, .12); color: #f8fafc; }
html[data-theme="clinical-night"] .tp-action--primary,
html[data-theme="clinical-night"] .tp-filters button.active { border-color: #38bdf8; background: #38bdf8; color: #0f172a; }
html[data-theme="clinical-night"] .tp-action--primary:hover:not(:disabled) { border-color: #7dd3fc; background: #7dd3fc; color: #0f172a; }
html[data-theme="clinical-night"] .tp-filters button.active .tp-filter-count { background: rgba(15, 23, 42, .18); color: #0f172a; }
html[data-theme="clinical-night"] .tp-card:hover { border-color: #475569; box-shadow: 0 10px 24px rgba(2, 6, 23, .28); }
html[data-theme="clinical-night"] .tp-consent { border-color: rgba(251, 191, 36, .35); background: rgba(251, 191, 36, .08); }
html[data-theme="clinical-night"] .tp-consent--signed { border-color: rgba(34, 197, 94, .32); background: rgba(34, 197, 94, .08); }
html[data-theme="clinical-night"] .tp-consent--blocked { border-color: #334155; background: #111827; }
html[data-theme="clinical-night"] .tp-consent-icon { background: #0f172a; color: #fcd779; }
html[data-theme="clinical-night"] .tp-consent--signed .tp-consent-icon { color: #9fe3b3; }
html[data-theme="clinical-night"] .tp-consent-status { background: #3b301a; color: #fcd779; }
html[data-theme="clinical-night"] .tp-consent--signed .tp-consent-status { background: #193b2b; color: #9fe3b3; }
html[data-theme="clinical-night"] .tp-start-icon { background: rgba(56, 189, 248, .14); }
html[data-theme="clinical-night"] .tp-start-icon .v-icon,
html[data-theme="clinical-night"] .tp-list-empty .v-icon { color: #38bdf8; }
</style>
