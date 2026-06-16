<template>
  <div class="patient-treatment px-5 py-5">
    <da-loader v-bind:overlay="isLoading"></da-loader>

    <section v-if="!moduleEnabled" class="treatment-empty">
      <v-icon color="var(--color-primary-500)" size="34">mdi-medical-bag-off-outline</v-icon>
      <h3>Plan de tratamiento deshabilitado</h3>
      <p>Actívalo desde Configuración > Módulos clínicos para usarlo en el expediente.</p>
    </section>

    <template v-else>
      <section class="treatment-hero">
        <div>
          <div class="hero-title-row">
            <p class="eyebrow">Plan de tratamiento</p>
            <span v-if="activePlan" class="plan-badge">Plan activo</span>
          </div>
          <h3>{{ activePlan ? activePlan.title : 'Sin plan activo' }}</h3>
          <p>
            {{ activePlan ? 'Este es el plan activo del paciente. Puedes agregar tratamientos, actualizar su seguimiento y cerrarlo cuando finalice.' : 'Crea un plan para registrar tratamientos y dar seguimiento clínico.' }}
          </p>
        </div>
        <div class="treatment-actions">
          <button v-if="!activePlan" class="btn-primary tab-create-action" type="button" @click="openCreatePlan">
            <v-icon size="18">mdi-plus</v-icon>
            Nuevo plan
          </button>
          <button v-if="activePlan" class="btn-primary" type="button" @click="openTreatmentDialog()">
            <v-icon size="18">mdi-plus</v-icon>
            Agregar tratamiento
          </button>
          <button v-if="activePlan" class="btn-danger-secondary" type="button" @click="openClosePlanDialog">
            <v-icon size="18">mdi-archive-check-outline</v-icon>
            Cerrar plan
          </button>
        </div>
      </section>

      <section class="summary-grid">
        <article>
          <span>Total</span>
          <strong>{{ activeTreatments.length }}</strong>
        </article>
        <article>
          <span>Pendientes</span>
          <strong>{{ countByStatus('pending') }}</strong>
        </article>
        <article>
          <span>En progreso</span>
          <strong>{{ countByStatus('in_progress') }}</strong>
        </article>
        <article>
          <span>Completados</span>
          <strong>{{ countByStatus('completed') }}</strong>
        </article>
        <article v-if="showCosts" class="summary-total-cost">
          <span>Total estimado</span>
          <strong>{{ totalCost | currency }}</strong>
        </article>
      </section>

      <section v-if="activePlan" class="consent-panel" :class="{ signed: hasActiveConsent }">
        <div class="consent-icon">
          <v-icon size="24">{{ hasActiveConsent ? 'mdi-file-check-outline' : 'mdi-file-sign' }}</v-icon>
        </div>
        <div class="consent-copy">
          <div class="consent-status-row">
            <p class="eyebrow">Consentimiento del plan</p>
            <span class="consent-status" :class="{ signed: hasActiveConsent }">{{ hasActiveConsent ? 'Firmado' : 'Pendiente de firma' }}</span>
          </div>
          <h3>{{ hasActiveConsent ? 'Consentimiento del plan firmado' : 'Firma pendiente del paciente' }}</h3>
          <span v-if="hasActiveConsent">Firmado: {{ formatDateTime(activeConsent.signed_at) }}</span>
          <p>
            {{ hasActiveConsent
              ? 'Se guardaron como histórico el texto del consentimiento y las firmas del doctor y del paciente.'
              : 'Captura la firma del paciente cuando se le explique el tratamiento. Se guardara junto con el texto del consentimiento y la firma actual del doctor.' }}
          </p>
        </div>
        <div class="consent-actions">
          <button v-if="hasActiveConsent" class="btn-outline" type="button" @click="openConsentDialog('view')">
            <v-icon size="17">mdi-eye-outline</v-icon>
            Ver consentimiento
          </button>
          <button class="btn-soft" type="button" @click="requestConsentSignature">
            <v-icon size="17">mdi-draw-pen</v-icon>
            {{ hasActiveConsent ? 'Recapturar firma' : 'Capturar firma' }}
          </button>
        </div>
      </section>

      <section v-if="activePlan" class="treatment-toolbar">
        <div>
          <p class="m-0 font-semibold text-gray-700">Tratamientos del plan activo</p>
          <span>Los cambios solo aplican al plan actual. Los planes cerrados se consultan como histórico.</span>
        </div>
        <div class="filter-group">
          <button
            v-for="item in filters"
            :key="item.value"
            type="button"
            :class="{ active: filter === item.value }"
            @click="filter = item.value"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <section v-if="activePlan && filteredTreatments.length > 0" class="treatment-list">
        <article v-for="item in filteredTreatments" :key="item.id_patient_treatment" class="treatment-card">
          <div class="card-main">
            <div class="title-row">
              <h4>{{ item.name }}</h4>
              <span v-if="showStatus" class="status-chip" :class="'status-' + item.status">{{ statusLabel(item.status) }}</span>
            </div>
            <p v-if="item.description" class="description">{{ item.description }}</p>
            <div class="meta-row">
              <span v-if="item.category"><v-icon size="15">mdi-tag-outline</v-icon>{{ item.category }}</span>
              <span v-if="item.estimated_start_date"><v-icon size="15">mdi-calendar-start</v-icon>{{ formatDate(item.estimated_start_date) }}</span>
              <span v-if="item.estimated_end_date"><v-icon size="15">mdi-calendar-check</v-icon>{{ formatDate(item.estimated_end_date) }}</span>
              <span v-if="showCosts && item.cost"><v-icon size="15">mdi-cash</v-icon>{{ Number(item.cost) | currency }}</span>
            </div>
            <div v-if="item.teeth && item.teeth.length" class="tooth-row">
              <span v-for="tooth in item.teeth" :key="tooth">Diente {{ tooth }}</span>
            </div>
            <p v-if="item.notes" class="notes">{{ item.notes }}</p>
          </div>
          <div class="card-actions">
            <button class="icon-action" type="button" title="Editar" @click="openTreatmentDialog(item)">
              <v-icon size="17">mdi-pencil-outline</v-icon>
              Editar
            </button>
            <button v-if="item.status !== 'completed'" class="icon-action complete-action" type="button" title="Completar" @click="changeStatus(item, 'completed')">
              <v-icon size="17">mdi-check-circle-outline</v-icon>
              Completar
            </button>
            <button v-if="item.status !== 'cancelled'" class="icon-action danger subtle" type="button" title="Cancelar tratamiento" @click="requestCancelTreatment(item)">
              <v-icon size="17">mdi-cancel</v-icon>
              Cancelar
            </button>
            <button class="icon-action danger ghost" type="button" title="Eliminar tratamiento" @click="requestDeleteTreatment(item)">
              <v-icon size="17">mdi-trash-can-outline</v-icon>
            </button>
          </div>
        </article>
      </section>

      <section v-if="activePlan && filteredTreatments.length === 0" class="treatment-empty">
        <v-icon color="var(--color-primary-500)" size="34">mdi-clipboard-plus-outline</v-icon>
        <h3>{{ emptyStateTitle }}</h3>
        <p>{{ emptyStateText }}</p>
        <button class="btn-primary" type="button" @click="openTreatmentDialog()">Agregar tratamiento</button>
      </section>

      <section v-if="!activePlan" class="treatment-empty">
        <v-icon color="var(--color-primary-500)" size="34">mdi-clipboard-text-clock-outline</v-icon>
        <h3>No hay plan activo</h3>
        <p>Los planes cerrados permanecen como histórico. Crea un nuevo plan cuando el paciente inicie una etapa de tratamiento.</p>
        <button class="btn-primary" type="button" @click="openCreatePlan">Crear plan activo</button>
      </section>

      <section class="history-section" :class="{ 'history-section--collapsed': !showHistorySection }">
        <button class="history-toggle" type="button" :aria-expanded="String(showHistorySection)" @click="showHistorySection = !showHistorySection">
          <div>
            <p class="eyebrow">Histórico</p>
            <h3>Planes cerrados</h3>
          </div>
          <div class="history-toggle-meta">
            <span>{{ historyPlans.length }} registro(s)</span>
            <v-icon size="22">{{ showHistorySection ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </div>
        </button>
        <transition name="history-expand">
          <div v-show="showHistorySection" class="history-content">
        <div v-if="historyPlans.length === 0" class="history-empty">Aún no hay planes históricos.</div>
        <article v-for="plan in historyPlans" :key="plan.id_treatment_plan" class="history-card history-card--closed">
          <div class="history-card-main">
            <div class="history-card-title">
              <div>
                <strong>{{ plan.title || 'Plan de tratamiento' }}</strong>
                <span>{{ formatDisplayDate(plan.started_at) }} — {{ formatDisplayDate(plan.closed_at) }}</span>
              </div>
              <span class="history-state-chip">Cerrado</span>
            </div>
            <div class="history-metrics">
              <div>
                <small>Tratamientos</small>
                <strong>{{ planTreatments(plan).length }}</strong>
              </div>
              <div v-if="showCosts">
                <small>Total estimado</small>
                <strong>{{ formatCurrencyValue(planTotalCost(plan)) }}</strong>
              </div>
              <div>
                <small>Consentimiento</small>
                <strong>{{ consentStatusLabel(plan) }}</strong>
              </div>
            </div>
            <div class="history-status-summary">
              <span>Pendientes: {{ planStatusCount(plan, 'pending') }}</span>
              <span>En progreso: {{ planStatusCount(plan, 'in_progress') }}</span>
              <span>Completados: {{ planStatusCount(plan, 'completed') }}</span>
              <span>Cancelados: {{ planStatusCount(plan, 'cancelled') }}</span>
            </div>
            <p v-if="plan.close_reason" class="history-reason-inline">
              <strong>Resumen de cierre:</strong>
              {{ formatCloseReason(plan.close_reason) }}
            </p>
          </div>
          <div class="history-card-actions">
            <button class="history-action history-action--view" type="button" @click="openHistory(plan)">
              <v-icon size="17">mdi-clipboard-text-clock-outline</v-icon>
              Ver histórico
            </button>
            <button v-if="hasPlanConsent(plan)" class="history-action history-action--consent" type="button" @click="openHistoryConsent(plan)">
              <v-icon size="17">mdi-file-sign</v-icon>
              Ver consentimiento
            </button>
            <button class="history-action history-action--print" type="button" @click="printHistory(plan)">
              <v-icon size="17">mdi-printer-outline</v-icon>
              Imprimir plan
            </button>
          </div>
            </article>
          </div>
        </transition>
      </section>
    </template>

    <v-dialog v-model="showPlanDialog" max-width="560">
      <v-card>
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Nuevo plan</p>
            <h3>Crear plan activo</h3>
          </div>
          <v-btn icon @click="showPlanDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <v-text-field v-model="planForm.title" label="Nombre del plan" dense outlined :color="themePrimaryColor"></v-text-field>
          <v-text-field v-model="planForm.started_at" type="date" label="Fecha de inicio" dense outlined :color="themePrimaryColor"></v-text-field>
          <v-textarea v-model="planForm.diagnosis" label="Diagnostico general" rows="2" outlined :color="themePrimaryColor"></v-textarea>
          <v-textarea v-model="planForm.notes" label="Notas del plan" rows="2" outlined :color="themePrimaryColor"></v-textarea>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="showPlanDialog = false">Cancelar</button>
          <button class="btn-primary" type="button" @click="createPlan">Crear plan</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showTreatmentDialog" persistent max-width="900">
      <v-card>
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Tratamiento</p>
            <h3>{{ treatmentForm.id_patient_treatment ? 'Editar tratamiento' : 'Agregar tratamiento' }}</h3>
          </div>
          <v-btn icon @click="showTreatmentDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <section class="form-section">
            <div class="form-section-header">
              <h4>Información básica</h4>
            </div>
            <div class="form-grid">
              <v-text-field v-model="treatmentForm.name" label="Nombre del tratamiento" dense outlined :color="themePrimaryColor"></v-text-field>
              <v-text-field v-if="showCosts" v-model="treatmentForm.cost" type="number" min="0" label="Costo estimado" dense outlined :color="themePrimaryColor"></v-text-field>
              <v-text-field v-model="treatmentForm.category" label="Categoria opcional" dense outlined :color="themePrimaryColor"></v-text-field>
              <v-select v-if="showStatus && treatmentForm.id_patient_treatment" v-model="treatmentForm.status" :items="statusOptions" item-text="label" item-value="value" label="Estado" dense outlined :color="themePrimaryColor"></v-select>
            </div>
            <p v-if="!treatmentForm.id_patient_treatment" class="field-help">Los tratamientos nuevos se crean automáticamente como Pendiente.</p>
          </section>

          <section class="form-section">
            <div class="form-section-header">
              <h4>Fechas estimadas</h4>
            </div>
            <div class="form-grid">
              <v-text-field v-model="treatmentForm.estimated_start_date" type="date" label="Inicio estimado" dense outlined :color="themePrimaryColor"></v-text-field>
              <v-text-field v-model="treatmentForm.estimated_end_date" type="date" label="Fin estimado" dense outlined :color="themePrimaryColor"></v-text-field>
            </div>
          </section>

          <section class="form-section">
            <div class="form-section-header">
              <h4>Detalle clínico</h4>
            </div>
            <v-textarea
              v-model="treatmentForm.description"
              label="Descripción del tratamiento"
              hint="Texto visible dentro del plan para identificar que se realizara."
              persistent-hint
              rows="2"
              outlined
              :color="themePrimaryColor"
            ></v-textarea>
            <v-textarea
              v-model="treatmentForm.notes"
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
              <span>Selecciona uno o varios dientes si este tratamiento está relacionado con piezas dentales específicas.</span>
            </div>
            <div class="tooth-grid">
              <button
                v-for="tooth in toothOptions"
                :key="tooth"
                type="button"
                :class="{ selected: treatmentForm.teeth.includes(tooth) }"
                @click="toggleTooth(tooth)"
              >
                {{ tooth }}
              </button>
            </div>
          </section>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="showTreatmentDialog = false">Cancelar</button>
          <button class="btn-primary" type="button" @click="saveTreatment">Guardar tratamiento</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showCloseDialog" max-width="540">
      <v-card>
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Cerrar plan</p>
            <h3>Cerrar plan activo</h3>
          </div>
          <v-btn icon @click="showCloseDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <div class="info-box">
            <strong>Al cerrar este plan:</strong>
            <ul>
              <li>Ya no podrás editar sus tratamientos.</li>
              <li>Quedará disponible solo para consulta.</li>
              <li>Se guardará en el histórico del paciente.</li>
              <li>Podrás crear un nuevo plan activo después.</li>
            </ul>
          </div>
          <div v-if="activeTreatments.length === 0" class="warning-box">
            <v-icon size="20">mdi-alert-circle-outline</v-icon>
            <span>Este plan no tiene tratamientos registrados. Puedes cerrarlo, pero quedará en histórico sin procedimientos.</span>
          </div>
          <div v-if="!hasActiveConsent" class="warning-box">
            <v-icon size="20">mdi-alert-circle-outline</v-icon>
            <span>Este plan aún no tiene consentimiento firmado. Puedes cerrarlo, pero quedará registrado sin consentimiento firmado.</span>
          </div>
          <div v-else class="success-box">
            <v-icon size="20">mdi-file-check-outline</v-icon>
            <span>Consentimiento del plan: Firmado</span>
          </div>
          <v-textarea v-model="closeReason" label="Motivo o resumen de cierre" rows="3" outlined :color="themePrimaryColor"></v-textarea>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="showCloseDialog = false">Cancelar</button>
          <button class="btn-danger" type="button" @click="closePlan">Cerrar plan</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showConsentDialog" persistent max-width="920">
      <v-card>
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Consentimiento de tratamiento</p>
            <h3>{{ consentMode === 'view' ? 'Consentimiento firmado' : 'Capturar firma del paciente' }}</h3>
          </div>
          <v-btn icon @click="showConsentDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body consent-dialog-body">
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
              <div><strong>Paciente</strong><span>{{ patientName || 'No especificado' }}</span></div>
              <div><strong>Edad</strong><span>{{ patientAge || 'No especificado' }}</span></div>
              <div><strong>Doctor responsable</strong><span>{{ currentDoctorName || 'No especificado' }}</span></div>
              <div><strong>Cédula profesional</strong><span>{{ professionalLicenseDisplay }}</span></div>
              <div><strong>Fecha de creación</strong><span>{{ selectedConsent ? formatDisplayDateTime(selectedConsent.created_at) : 'No especificado' }}</span></div>
              <div><strong>Fecha de firma</strong><span>{{ selectedConsent ? formatDisplayDateTime(selectedConsent.signed_at) : 'No especificado' }}</span></div>
            </section>

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
              <div class="document-related">
                <span>Tratamientos: {{ consentPlanTreatments.length }}</span>
                <span v-if="showCosts">Total estimado: {{ formatCurrencyValue(planTotalCost(consentPlan)) }}</span>
              </div>
              <ul v-if="consentPlanTreatments.length" class="document-treatment-list">
                <li v-for="item in consentPlanTreatments" :key="item.id_patient_treatment">
                  {{ item.name }} <span>{{ statusLabel(item.status) }}</span>
                </li>
              </ul>
              <p v-else class="muted-copy">No hay tratamientos relacionados registrados.</p>
            </section>
            <section class="document-signatures">
              <article>
                <span>Firma del doctor</span>
                <img v-if="currentDoctorSignature" :src="currentDoctorSignature" alt="Firma del doctor">
                <p v-else>Sin firma de doctor registrada.</p>
                <strong>{{ currentDoctorName || 'Doctor no especificado' }}</strong>
              </article>
              <article>
                <span>Firma del paciente</span>
                <img v-if="selectedConsent && selectedConsent.patient_signature" :src="selectedConsent.patient_signature" alt="Firma del paciente">
                <p v-else>Sin firma del paciente registrada.</p>
                <strong>{{ patientName || 'Paciente no especificado' }}</strong>
              </article>
            </section>
          </section>
          <section v-else class="consent-preview">
            <div class="consent-text-card" :class="{ 'full-width': planConsentTemplate && consentMode !== 'view' }">
              <p class="eyebrow">Declaro</p>
              <div v-if="planConsentTemplate && consentMode !== 'view'" v-html="currentDeclareText || 'No hay plantilla configurada.'"></div>
              <p v-else>{{ currentDeclareText || 'No hay texto DECLARO configurado.' }}</p>
            </div>
            <div v-if="!(planConsentTemplate && consentMode !== 'view')" class="consent-text-card">
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
                <span>Firma del paciente</span>
                <img v-if="consentMode === 'view' && selectedConsent && selectedConsent.patient_signature" :src="selectedConsent.patient_signature" alt="Firma del paciente">
                <da-signature-pad
                  v-else
                  required
                  v-on:signed="onConsentSigned"
                ></da-signature-pad>
              </article>
            </div>
          </section>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="showConsentDialog = false">Cerrar</button>
          <button v-if="consentMode === 'view' && consentPlan" class="btn-outline" type="button" @click="printConsent(consentPlan)">
            <v-icon size="17">mdi-printer-outline</v-icon>
            Imprimir consentimiento
          </button>
          <button v-if="consentMode !== 'view'" class="btn-primary" type="button" @click="saveConsent">
            <v-icon size="17">mdi-content-save-check-outline</v-icon>
            Guardar firma
          </button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showHistoryDialog" max-width="980">
      <v-card>
        <div class="dialog-header history-dialog-header">
          <div>
            <p class="eyebrow">Histórico de tratamiento</p>
            <h3>{{ selectedHistory ? selectedHistory.title : '' }}</h3>
            <span>Este plan está cerrado y se muestra solo para consulta.</span>
          </div>
          <span class="history-state-chip">Cerrado</span>
          <v-btn icon @click="showHistoryDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text v-if="selectedHistory" class="dialog-body history-dialog-body">
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
                <small>Doctor responsable</small>
                <strong>{{ historyDoctorName(selectedHistory) }}</strong>
              </div>
              <div v-if="selectedHistory.close_reason" class="history-overview-reason">
                <small>Resumen de cierre:</small>
                <p>{{ formatCloseReason(selectedHistory.close_reason) }}</p>
              </div>
            </div>
          </section>

          <section class="history-summary-grid">
            <article><span>Total</span><strong>{{ selectedHistoryTreatments.length }}</strong></article>
            <article><span>Pendientes</span><strong>{{ planStatusCount(selectedHistory, 'pending') }}</strong></article>
            <article><span>En progreso</span><strong>{{ planStatusCount(selectedHistory, 'in_progress') }}</strong></article>
            <article><span>Completados</span><strong>{{ planStatusCount(selectedHistory, 'completed') }}</strong></article>
            <article><span>Cancelados</span><strong>{{ planStatusCount(selectedHistory, 'cancelled') }}</strong></article>
            <article v-if="showCosts" class="summary-total-cost"><span>Total estimado</span><strong>{{ formatCurrencyValue(planTotalCost(selectedHistory)) }}</strong></article>
          </section>

          <section class="history-consent-block" :class="{ signed: hasPlanConsent(selectedHistory) }">
            <div>
              <p class="eyebrow">Consentimiento</p>
              <strong>{{ consentStatusLabel(selectedHistory) }}</strong>
              <span v-if="hasPlanConsent(selectedHistory)">Firmado: {{ formatDisplayDateTime(selectedHistory.consent.signed_at) }}</span>
              <span v-else>Sin consentimiento firmado para este plan.</span>
            </div>
            <button v-if="hasPlanConsent(selectedHistory)" class="btn-outline" type="button" @click="openHistoryConsent(selectedHistory)">
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
                <span v-if="showCosts && item.cost"><v-icon size="15">mdi-cash</v-icon>{{ formatCurrencyValue(item.cost) }}</span>
              </div>
              <p v-if="item.description">{{ item.description }}</p>
              <div v-if="item.teeth && item.teeth.length" class="tooth-row">
                <span v-for="tooth in item.teeth" :key="tooth">Diente {{ tooth }}</span>
              </div>
              <div v-if="item.notes" class="notes-toggle">
                <button class="btn-text" type="button" @click="toggleHistoryNotes(item.id_patient_treatment)">
                  {{ isHistoryNotesOpen(item.id_patient_treatment) ? 'Ocultar notas clínicas' : 'Ver notas clínicas' }}
                </button>
                <p v-if="isHistoryNotesOpen(item.id_patient_treatment)" class="notes history-note">{{ item.notes }}</p>
              </div>
            </article>
            <div v-if="selectedHistoryTreatments.length === 0" class="history-empty">Este plan cerrado no tiene tratamientos registrados.</div>
          </section>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="showHistoryDialog = false">Cerrar</button>
          <button v-if="selectedHistory && hasPlanConsent(selectedHistory)" class="btn-outline" type="button" @click="openHistoryConsent(selectedHistory)">Ver consentimiento</button>
          <button v-if="selectedHistory" class="btn-outline" type="button" @click="printHistory(selectedHistory)">
            <v-icon size="17">mdi-printer-outline</v-icon>
            Imprimir plan
          </button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmDialog.show" max-width="460">
      <v-card>
        <div class="dialog-header compact">
          <div>
            <p class="eyebrow">{{ confirmDialog.eyebrow }}</p>
            <h3>{{ confirmDialog.title }}</h3>
          </div>
          <v-btn icon @click="closeConfirmDialog"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <p class="confirm-message">{{ confirmDialog.message }}</p>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="closeConfirmDialog">Cancelar</button>
          <button :class="confirmDialog.type === 'recaptureConsent' ? 'btn-primary' : 'btn-danger'" type="button" @click="confirmPendingAction">{{ confirmDialog.confirmText }}</button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import VuexMixin from '../../../mixins/VuexMixin';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DADocumentService } from '../../../services/context/core-proccess-context';
import DAPrescriptionService from '../../../services/core/prescription/DAPrescriptionService';
import { isD2AuthMode } from '../../../services/config/authTransport.config';

const today = () => new Date().toISOString().slice(0, 10);

export default {
  mixins: [VuexMixin],
  props: {
    px: {
      type: Object,
      default: function(){return {}}
    }
  },
  data: function() {
    return {
      isLoading: false,
      filter: 'all',
      showPlanDialog: false,
      showTreatmentDialog: false,
      showCloseDialog: false,
      showHistoryDialog: false,
      showHistorySection: false,
      showConsentDialog: false,
      consentMode: 'view',
      consentSignature: '',
      selectedConsentPlan: null,
      documentTemplates: [],
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
      toothOptions: ['11','12','13','14','15','16','17','18','21','22','23','24','25','26','27','28','31','32','33','34','35','36','37','38','41','42','43','44','45','46','47','48']
    }
  },
  created() {
    this.loadPlan();
    this.loadConfiguration();
    this.loadDocumentTemplates();
    this.loadDoctorsForConsent();
  },
  computed: {
    patientId: function() {
      return this.px && this.px.person ? this.px.person.id_person : '';
    },
    planData: function() {
      return this.treatmentPlanData || {};
    },
    config: function() {
      return this.planData.config || {};
    },
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
      return this.config.showTreatmentCosts === undefined ? true : Boolean(this.config.showTreatmentCosts);
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
    emptyStateTitle: function() {
      const messages = {
        all: 'No hay tratamientos en este plan.',
        pending: 'No hay tratamientos pendientes.',
        in_progress: 'No hay tratamientos en progreso.',
        completed: 'No hay tratamientos completados.',
        cancelled: 'No hay tratamientos cancelados.'
      };
      return messages[this.filter] || 'No hay tratamientos en este filtro.';
    },
    emptyStateText: function() {
      if(this.filter === 'all') {
        return 'Agrega procedimientos, planes o indicaciones para dar seguimiento al paciente.';
      }
      return 'Cuando agregues tratamientos o cambies su estado, apareceran aqui.';
    },
    selectedHistoryTreatments: function() {
      return this.selectedHistory && this.selectedHistory.treatments ? this.selectedHistory.treatments : [];
    },
    selectedConsent: function() {
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
      if(this.currentDoctorForConsent && this.currentDoctorForConsent.signature_image) {
        return this.currentDoctorForConsent.signature_image;
      }
      return this.signatureConfig && this.signatureConfig.url_signature ? this.signatureConfig.url_signature : '';
    },
    currentDoctorName: function() {
      if(this.consentMode === 'view' && this.selectedConsent) {
        return this.selectedConsent.doctor_name_snapshot;
      }
      if(this.currentDoctorForConsent && this.currentDoctorForConsent.professional_name) {
        return this.currentDoctorForConsent.professional_name;
      }
      return this.signatureConfig && this.signatureConfig.name ? this.signatureConfig.name : '';
    },
    currentDoctorProfessionalLicense: function() {
      if(this.consentMode === 'view' && this.selectedConsent) {
        return this.selectedConsent.professional_license_snapshot || '';
      }
      if(this.currentDoctorForConsent && this.currentDoctorForConsent.professional_license) {
        return this.currentDoctorForConsent.professional_license;
      }
      const config = this.signatureConfig || {};
      return config.professional_license || config.professionalLicense || config.professional_license_snapshot || '';
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
      const current = this.doctors.find((doctor) => doctor.id_login === this.currentUser.id_login);
      if(this.isDoctorProfileReady(current)) {
        return current;
      }
      if(this.doctors.length === 1 && this.isDoctorProfileReady(this.doctors[0])) {
        return this.doctors[0];
      }
      return null;
    },
    themePrimaryColor: function() {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-primary-500').trim() || '#1BA6C9';
    },
    ...mapGetters(moduleTypes.TREATMENT, {
      treatmentPlanData: fnTypes.treatmentPlan,
      hasErrorTreatment: fnTypes.hasErrorTreatment
    }),
    ...mapGetters(moduleTypes.CONFIGURATION, {
      signatureConfig: fnTypes.getConfiguration
    }),
    ...mapGetters(moduleTypes.AUTH, {
      authUser: fnTypes.getUser,
      authRole: fnTypes.getRole,
      authBusiness: fnTypes.getBusiness
    })
  },
  watch: {
    activePlan: {
      immediate: true,
      handler: function(plan) {
        this.showHistorySection = !plan;
      }
    }
  },
  methods: {
    ...mapActions(moduleTypes.TREATMENT, [
      fnTypes.getTreatmentPlan,
      fnTypes.createTreatmentPlan,
      fnTypes.closeTreatmentPlan,
      fnTypes.savePlanTreatment,
      fnTypes.changePlanTreatmentStatus,
      fnTypes.deletePlanTreatment,
      fnTypes.saveTreatmentPlanConsent
    ]),
    ...mapActions(moduleTypes.CONFIGURATION, {
      loadConfiguration: fnTypes.getConfiguration
    }),
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
        teeth: []
      };
    },
    loadDocumentTemplates: async function() {
      const response = await DADocumentService.getTemplates();
      this.documentTemplates = response && response.success ? response.data || [] : [];
    },
    loadDoctorsForConsent: async function() {
      try {
        const response = await DAPrescriptionService.doctors();
        this.doctors = response && response.success ? response.data || [] : [];
      } catch (error) {
        this.doctors = [];
      }
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
    textToHtml: function(value) {
      const text = String(value || '');
      if(/<[^>]+>/.test(text)) {
        return text;
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
      return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => (
        replacements[key] === undefined || replacements[key] === null ? '' : String(replacements[key])
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
      const config = this.signatureConfig || {};
      return config.professional_license || config.professionalLicense || config.professional_license_snapshot || '';
    },
    validateDoctorLicenseForConsent: function() {
      if(this.signingProfessionalLicense()) {
        return true;
      }
      this.toastFunction('warning', 'Configura la cédula profesional del doctor antes de firmar el consentimiento.');
      return false;
    },
    loadPlan: async function() {
      if(!this.patientId) {
        return;
      }
      this.isLoading = true;
      await this.getTreatmentPlan(this.patientId);
      this.isLoading = false;
    },
    openCreatePlan: function() {
      this.planForm = {
        title: 'Plan de tratamiento',
        started_at: today(),
        diagnosis: '',
        notes: ''
      };
      this.showPlanDialog = true;
    },
    createPlan: async function() {
      this.isLoading = true;
      const response = await this.createTreatmentPlan({
        id_person: this.patientId,
        ...this.planForm
      });
      this.isLoading = false;
      if(response && response.success) {
        this.showPlanDialog = false;
        this.toastFunction('success', 'Plan activo creado.');
      } else {
        this.toastFunction('error', response && response.message ? response.message : 'No se pudo crear el plan.');
      }
    },
    openTreatmentDialog: function(item) {
      this.treatmentForm = item ? {
        id_patient_treatment: item.id_patient_treatment,
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        status: item.status || 'pending',
        estimated_start_date: item.estimated_start_date ? String(item.estimated_start_date).slice(0, 10) : '',
        estimated_end_date: item.estimated_end_date ? String(item.estimated_end_date).slice(0, 10) : '',
        cost: item.cost || '',
        notes: item.notes || '',
        teeth: item.teeth ? [...item.teeth] : []
      } : this.emptyTreatmentForm();
      this.showTreatmentDialog = true;
    },
    openClosePlanDialog: function() {
      this.showCloseDialog = true;
    },
    saveTreatment: async function() {
      if(!this.treatmentForm.name) {
        this.toastFunction('warning', 'Captura el nombre del tratamiento.');
        return;
      }
      this.isLoading = true;
      const payload = {
        id_person: this.patientId,
        id_treatment_plan: this.activePlan ? this.activePlan.id_treatment_plan : null,
        ...this.treatmentForm
      };
      if(!payload.id_patient_treatment) {
        payload.status = 'pending';
      }
      const response = await this.savePlanTreatment(payload);
      this.isLoading = false;
      if(response && response.success) {
        this.showTreatmentDialog = false;
        this.toastFunction('success', 'Tratamiento guardado.');
      } else {
        this.toastFunction('error', response && response.message ? response.message : 'No se pudo guardar el tratamiento.');
      }
    },
    requestCancelTreatment: function(item) {
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
      if(type === 'recaptureConsent') {
        this.openConsentDialog('sign');
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
      if(!this.activePlan) {
        return;
      }
      this.isLoading = true;
      const response = await this.closeTreatmentPlan({
        id_person: this.patientId,
        id_treatment_plan: this.activePlan.id_treatment_plan,
        close_reason: this.closeReason
      });
      this.isLoading = false;
      if(response && response.success) {
        this.showCloseDialog = false;
        this.closeReason = '';
        this.toastFunction('success', 'Plan cerrado y enviado a histórico.');
      } else {
        this.toastFunction('error', response && response.message ? response.message : 'No se pudo cerrar el plan.');
      }
    },
    changeStatus: async function(item, status) {
      this.isLoading = true;
      const response = await this.changePlanTreatmentStatus({
        id_person: this.patientId,
        id_patient_treatment: item.id_patient_treatment,
        status
      });
      this.isLoading = false;
      if(response && response.success) {
        this.toastFunction('success', 'Estado actualizado.');
      } else {
        this.toastFunction('error', response && response.message ? response.message : 'No se pudo actualizar el estado.');
      }
    },
    deleteTreatment: async function(item) {
      this.isLoading = true;
      const response = await this.deletePlanTreatment({
        id_person: this.patientId,
        id_patient_treatment: item.id_patient_treatment
      });
      this.isLoading = false;
      if(response && response.success) {
        this.toastFunction('success', 'Tratamiento eliminado del plan activo.');
      } else {
        this.toastFunction('error', response && response.message ? response.message : 'No se pudo eliminar el tratamiento.');
      }
    },
    toggleTooth: function(tooth) {
      const current = this.treatmentForm.teeth || [];
      this.treatmentForm.teeth = current.includes(tooth)
        ? current.filter((item) => item !== tooth)
        : [...current, tooth];
    },
    openHistory: function(plan) {
      this.selectedHistory = plan;
      this.showHistoryDialog = true;
    },
    openConsentDialog: function(mode) {
      this.selectedConsentPlan = null;
      this.consentMode = mode;
      this.consentSignature = '';
      this.showConsentDialog = true;
    },
    requestConsentSignature: function() {
      if(!this.validateDoctorLicenseForConsent()) {
        return;
      }
      if(this.hasActiveConsent) {
        this.confirmDialog = {
          show: true,
          type: 'recaptureConsent',
          item: null,
          eyebrow: 'Consentimiento del plan',
          title: 'Recapturar firma del consentimiento',
          message: 'Se registrará una nueva firma para el plan activo. La firma anterior debe conservarse en el historial o auditoría del documento.',
          confirmText: 'Continuar'
        };
        return;
      }
      this.openConsentDialog('sign');
    },
    openHistoryConsent: function(plan) {
      this.selectedConsentPlan = plan;
      this.consentMode = 'view';
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
      this.toastFunction('success', 'Firma capturada. Ahora guarda el consentimiento.');
    },
    saveConsent: async function() {
      if(!this.activePlan) {
        return;
      }
      if(!this.validateDoctorLicenseForConsent()) {
        return;
      }
      if(!this.consentSignature) {
        this.toastFunction('warning', 'Primero aplica la firma del paciente.');
        return;
      }
      this.isLoading = true;
      const response = await this.saveTreatmentPlanConsent({
        id_person: this.patientId,
        id_treatment_plan: this.activePlan.id_treatment_plan,
        patient_signature: this.consentSignature,
        declare_text_snapshot: this.currentDeclareText,
        consent_text_snapshot: this.currentConsentText,
        doctor_signature_snapshot: this.currentDoctorSignature,
        doctor_name_snapshot: this.currentDoctorName,
        professional_license_snapshot: this.signingProfessionalLicense()
      });
      this.isLoading = false;
      if(response && response.success) {
        this.showConsentDialog = false;
        this.toastFunction('success', 'Consentimiento del plan guardado.');
      } else {
        this.toastFunction('error', response && response.message ? response.message : 'No se pudo guardar el consentimiento.');
      }
    },
    countByStatus: function(status) {
      return this.activeTreatments.filter((item) => item.status === status).length;
    },
    statusLabel: function(status) {
      const found = this.statusOptions.find((item) => item.value === status);
      return found ? found.label : 'Pendiente';
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
      const amount = Number(value || 0);
      if(!amount) {
        return 'No especificado';
      }
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
          <td>${this.escapeHtml(this.formatCurrencyValue(item.cost))}</td>
          <td>${this.escapeHtml((item.teeth || []).join(', ') || 'No especificado')}</td>
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
              <strong>Firma del paciente</strong>
              ${consent.patient_signature ? `<img src="${this.escapeHtml(consent.patient_signature)}" alt="Firma del paciente">` : '<span>Sin firma registrada.</span>'}
              <small>${this.escapeHtml(this.patientName || 'Paciente no especificado')}</small>
            </div>
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
              .brand { color: #0f766e; font-weight: 700; margin: 0 0 4px; }
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
              <div><strong>Total estimado</strong><br>${this.escapeHtml(this.formatCurrencyValue(this.planTotalCost(plan)))}</div>
              <div><strong>Consentimiento</strong><br>${this.escapeHtml(this.consentStatusLabel(plan))}</div>
              <div><strong>Doctor responsable</strong><br>${this.escapeHtml(this.historyDoctorName(plan))}</div>
            </section>
            ${plan.close_reason ? `<p class="reason"><strong>Resumen de cierre:</strong> ${this.escapeHtml(this.formatCloseReason(plan.close_reason))}</p>` : ''}
            <section>
              <h2>Resumen por estado</h2>
              <p>Pendientes: ${this.planStatusCount(plan, 'pending')} | En progreso: ${this.planStatusCount(plan, 'in_progress')} | Completados: ${this.planStatusCount(plan, 'completed')} | Cancelados: ${this.planStatusCount(plan, 'cancelled')}</p>
            </section>
            <section>
              <h2>Tratamientos</h2>
              <table>
                <thead>
                  <tr><th>Tratamiento</th><th>Estado</th><th>Inicio</th><th>Fin</th><th>Costo</th><th>Dientes</th></tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="6">Sin tratamientos registrados.</td></tr>'}</tbody>
              </table>
            </section>
            ${consentHtml}
          </body>
        </html>
      `;
    },
    printableConsentHtml: function(plan) {
      const consent = plan && plan.consent ? plan.consent : null;
      const treatments = this.planTreatments(plan);
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
              .brand { color: #0f766e; font-weight: 700; margin: 0 0 4px; }
              .status { display: inline-block; border: 1px solid #86efac; background: #f0fdf4; color: #047857; border-radius: 999px; padding: 3px 10px; font-weight: 700; font-size: 12px; }
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
              <div><strong>Paciente</strong><br>${this.escapeHtml(this.patientName || 'No especificado')}</div>
              <div><strong>Doctor responsable</strong><br>${this.escapeHtml(consent && consent.doctor_name_snapshot ? consent.doctor_name_snapshot : 'No especificado')}</div>
              <div><strong>Cédula profesional</strong><br>${this.escapeHtml(consent && consent.professional_license_snapshot ? consent.professional_license_snapshot : 'No registrada al momento de la firma')}</div>
              <div><strong>Fecha de firma</strong><br>${this.escapeHtml(consent ? this.formatDisplayDateTime(consent.signed_at) : 'No especificado')}</div>
              <div><strong>Plan</strong><br>${this.escapeHtml(plan && plan.title ? plan.title : 'Plan de tratamiento')}</div>
              <div><strong>Total estimado</strong><br>${this.escapeHtml(this.formatCurrencyValue(this.planTotalCost(plan)))}</div>
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
              <ul>${treatmentItems || '<li>No hay tratamientos relacionados registrados.</li>'}</ul>
            </section>
            <section class="signatures">
              <div>
                <strong>Firma del doctor</strong>
                ${consent && consent.doctor_signature_snapshot ? `<img src="${this.escapeHtml(consent.doctor_signature_snapshot)}" alt="Firma del doctor">` : '<span>Sin firma registrada.</span>'}
                <small>${this.escapeHtml(consent && consent.doctor_name_snapshot ? consent.doctor_name_snapshot : 'Doctor no especificado')}</small>
              </div>
              <div>
                <strong>Firma del paciente</strong>
                ${consent && consent.patient_signature ? `<img src="${this.escapeHtml(consent.patient_signature)}" alt="Firma del paciente">` : '<span>Sin firma registrada.</span>'}
                <small>${this.escapeHtml(this.patientName || 'Paciente no especificado')}</small>
              </div>
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
      printWindow.document.write(this.printableConsentHtml(plan));
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

.treatment-hero,
.treatment-toolbar,
.history-section,
.treatment-empty {
  border: 1px solid var(--color-border, rgba(14, 84, 104, 0.16));
  background: var(--color-surface, rgba(255, 255, 255, 0.94));
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
}

.treatment-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem;
}

.hero-title-row,
.consent-status-row {
  display: flex;
  align-items: center;
  gap: .55rem;
  flex-wrap: wrap;
}

.plan-badge,
.consent-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, .35);
  background: rgba(34, 197, 94, .1);
  color: #047857;
  padding: .2rem .55rem;
  font-size: .72rem;
  font-weight: 800;
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
  color: var(--color-primary-700, #00728c);
  font-size: .75rem;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.treatment-hero h3,
.history-toggle h3 {
  margin: 0;
  color: var(--color-text, #25364d);
  font-size: 1.2rem;
}

.treatment-hero p,
.treatment-toolbar span,
.history-empty,
.description,
.notes {
  color: var(--color-text-muted, #64748b);
}

.treatment-actions,
.card-actions,
.dialog-actions,
.filter-group {
  display: flex;
  align-items: center;
  gap: .55rem;
  flex-wrap: wrap;
}

button {
  font-weight: 800;
  letter-spacing: .04em;
}

.btn-primary,
.btn-soft,
.btn-outline,
.btn-danger,
.btn-danger-secondary,
.icon-action {
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
  background: var(--color-primary-500, #19a6c9);
  color: #fff;
  box-shadow: 0 8px 18px var(--shadow-primary, rgba(27, 166, 201, .25));
}

.btn-soft {
  background: var(--color-primary-100, #e0f7fc);
  color: var(--color-primary-900, #006077);
  border-color: var(--color-primary-200, #b8edf7);
}

.btn-outline,
.icon-action {
  background: var(--color-surface, #fff);
  color: var(--color-primary-900, #006077);
  border-color: var(--color-border, #d8e9ef);
}

.btn-danger {
  background: #b42318;
  color: #fff;
  border-color: #b42318;
  box-shadow: 0 8px 18px rgba(180, 35, 24, .18);
}

.btn-danger-secondary {
  background: var(--color-surface, #fff);
  color: #b42318;
  border-color: rgba(248, 113, 113, .36);
}

.btn-outline.danger,
.icon-action.danger {
  color: #b42318;
  border-color: rgba(248, 113, 113, .32);
  background: rgba(248, 113, 113, .08);
}

.icon-action.complete-action {
  color: #047857 !important;
  border-color: rgba(34, 197, 94, .3) !important;
  background: #fff !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .06);
}

.icon-action.complete-action:hover {
  color: #047857 !important;
  border-color: rgba(34, 197, 94, .48) !important;
  background: rgba(34, 197, 94, .08) !important;
  box-shadow: 0 10px 22px rgba(34, 197, 94, .13);
}

.icon-action.subtle {
  background: var(--color-surface, #fff);
}

.icon-action.ghost {
  padding: .45rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  gap: .8rem;
  margin: 1rem 0;
}

.summary-grid article {
  border: 1px solid var(--color-border, rgba(14, 84, 104, 0.16));
  background: var(--color-primary-50, rgba(224, 247, 252, .5));
  padding: .8rem;
}

.summary-grid article.summary-total-cost {
  border-color: var(--color-primary-400, #4fc3d7);
  background: var(--color-surface, #fff);
  box-shadow: 0 10px 22px var(--shadow-primary, rgba(27, 166, 201, .16));
}

.summary-grid span {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-size: .8rem;
}

.summary-grid strong {
  display: block;
  color: var(--color-text, #25364d);
  font-size: 1.2rem;
}

.summary-total-cost strong {
  color: var(--color-primary-900, #006077);
  font-size: 1.45rem;
}

.consent-panel {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgba(251, 191, 36, .45);
  background: rgba(251, 191, 36, .10);
  padding: 1rem;
  margin: 0 0 1rem;
}

.consent-panel.signed {
  border-color: rgba(34, 197, 94, .35);
  background: rgba(34, 197, 94, .08);
}

.consent-icon {
  display: grid;
  place-items: center;
  width: 2.7rem;
  height: 2.7rem;
  border-radius: 999px;
  background: var(--color-surface, #fff);
  color: var(--color-primary-700, #00728c);
  border: 1px solid var(--color-border, #d8e9ef);
}

.consent-copy h3 {
  margin: 0;
  color: var(--color-text, #25364d);
  font-size: 1rem;
}

.consent-copy p {
  margin: .15rem 0;
  color: var(--color-text-muted, #64748b);
}

.consent-copy span {
  color: var(--color-text-muted, #64748b);
  font-size: .84rem;
  font-weight: 700;
}

.consent-actions {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.treatment-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.filter-group button {
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-surface, #fff);
  color: var(--color-text-muted, #64748b);
  border-radius: 999px;
  padding: .48rem .85rem;
  box-shadow: 0 7px 16px rgba(15, 23, 42, .055);
  transition: .18s ease;
}

.filter-group button.active {
  color: var(--color-primary-900, #006077);
  border-color: var(--color-primary-400, #4fc3d7);
  background: var(--color-primary-100, #e0f7fc);
  box-shadow: 0 9px 20px var(--shadow-primary, rgba(27, 166, 201, .14));
}

.filter-group button:hover {
  transform: translateY(-1px);
  border-color: var(--color-primary-300, #8bddeb);
}

.treatment-list {
  display: grid;
  gap: .9rem;
}

.treatment-card,
.history-card,
.readonly-treatment {
  border: 1px solid var(--color-border, rgba(14, 84, 104, 0.16));
  background: var(--color-surface, #fff);
  padding: 1rem;
  box-shadow: 0 8px 20px rgba(15, 23, 42, .06);
}

.treatment-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  border-left: 4px solid var(--color-primary-500, #19a6c9);
}

.history-card--closed {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 1rem;
  border-left: 4px solid #64748b;
}

.history-card-main {
  display: grid;
  gap: .8rem;
}

.history-card-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: .75rem;
}

.history-card-title strong {
  display: block;
  color: var(--color-text, #25364d);
  font-size: 1.02rem;
}

.history-card-actions {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  flex-direction: column;
  gap: .5rem;
  width: 13rem;
}

.history-card-actions .history-action {
  width: 100%;
  min-height: 2.75rem;
}

.history-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .38rem;
  border-radius: 999px;
  border: 1px solid var(--color-border, #d8e9ef);
  background: #fff;
  color: var(--color-primary-900, #006077);
  padding: .55rem .9rem;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .055);
  transition: .18s ease;
}

.history-action:hover {
  transform: translateY(-1px);
}

.history-action--view {
  color: var(--color-primary-900, #006077);
  border-color: rgba(79, 195, 215, .36);
  background: rgba(224, 247, 252, .28);
}

.history-action--consent {
  color: #047857;
  border-color: rgba(34, 197, 94, .28);
  background: rgba(34, 197, 94, .06);
}

.history-action--print {
  color: #475569;
  border-color: rgba(100, 116, 139, .26);
  background: rgba(248, 250, 252, .9);
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
  font-weight: 800;
  white-space: nowrap;
}

.history-metrics,
.history-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: .65rem;
}

.history-metrics div,
.history-summary-grid article,
.document-data-grid div {
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-bg, #f8fbfd);
  padding: .7rem;
}

.history-metrics small,
.history-summary-grid span,
.document-data-grid strong,
.history-overview-main small {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-size: .76rem;
  font-weight: 800;
}

.history-metrics strong,
.history-summary-grid strong,
.history-overview-main strong {
  display: block;
  color: var(--color-text, #25364d);
  font-size: .98rem;
}

.history-status-summary {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
}

.history-status-summary span {
  border: 1px solid var(--color-border, #d8e9ef);
  background: var(--color-surface, #fff);
  color: var(--color-text-muted, #64748b);
  padding: .25rem .5rem;
  font-size: .78rem;
  font-weight: 700;
}

.history-reason-inline {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  background: var(--color-bg, #f8fbfd);
  border-left: 3px solid #64748b;
  padding: .6rem .75rem;
}

.title-row,
.meta-row,
.tooth-row,
.history-card {
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
  color: var(--color-primary-900, #006077);
  background: var(--color-primary-100, #e0f7fc);
  border: 1px solid var(--color-primary-200, #b8edf7);
  padding: .25rem .5rem;
  font-size: .78rem;
  font-weight: 700;
}

.status-chip {
  border: 1px solid var(--color-primary-200, #b8edf7);
  background: var(--color-primary-100, #e0f7fc);
  color: var(--color-primary-900, #006077);
  padding: .18rem .45rem;
  font-size: .75rem;
  font-weight: 800;
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

.history-section {
  margin-top: 1rem;
  padding: 1rem;
}

.history-section--collapsed {
  box-shadow: 0 8px 20px rgba(15, 23, 42, .055);
}

.history-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.history-toggle-meta {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: .45rem;
  color: var(--color-text-muted, #64748b);
  white-space: nowrap;
}

.history-toggle-meta span {
  font-size: .85rem;
}

.history-content {
  margin-top: .85rem;
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

.history-card {
  justify-content: space-between;
}

.history-card {
  margin-top: .75rem;
}

.history-card span {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-size: .85rem;
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
  background: var(--color-surface, #fff);
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
  color: var(--color-primary-900, #006077);
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
  background: var(--color-surface, #fff);
  color: var(--color-text, #25364d);
}

.tooth-grid button.selected {
  background: var(--color-primary-500, #19a6c9);
  border-color: var(--color-primary-500, #19a6c9);
  color: #fff;
}

.history-reason {
  border-left: 3px solid var(--color-primary-500, #19a6c9);
  background: var(--color-primary-50, #effbfe);
  color: var(--color-text-muted, #64748b);
  padding: .75rem;
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
.success-box,
.history-consent {
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

.history-consent {
  margin-bottom: 1rem;
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
  color: var(--color-primary-900, #006077);
  font-weight: 900;
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
  color: var(--color-primary-900, #006077);
  background: var(--color-primary-100, #e0f7fc);
  border: 1px solid var(--color-primary-200, #b8edf7);
  padding: .25rem .5rem;
  font-size: .78rem;
  font-weight: 800;
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
  font-weight: 800;
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
  background: var(--color-surface, #fff);
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
  font-weight: 800;
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
  .treatment-hero,
  .treatment-toolbar,
  .consent-panel,
  .treatment-card,
  .history-card--closed,
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

  .card-actions,
  .history-card-actions,
  .document-status-block {
    justify-content: flex-start;
    align-items: stretch;
    justify-items: start;
    width: 100%;
  }
}
</style>
