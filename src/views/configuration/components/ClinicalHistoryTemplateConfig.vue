<template>
  <section class="clinical-template-config bg-white bg-opacity-95 border border-primary-200 shadow-xl" :aria-busy="String(isLoading || isSaving)">
    <preparation-guide branch="clinical-history-template" :control-labels="{customize:usesSystemTemplate && canManageTemplate && !isCustomTemplateLocked ? 'Personalizar plantilla' : 'Plantilla actual',save:canEditTemplate ? 'Guardar nueva versión' : 'Plantilla actual'}" :dirty="hasPendingCapture" :busy="isLoading || isSaving" @focus-control="focusGuideControl" />
    <div ref="guideControls" class="section-header">
      <div class="header-copy">
        <p class="eyebrow">Configuración clínica</p>
        <h2>Plantilla de historia clínica</h2>
        <p class="header-subtitle">
          Configura las secciones y campos que usará tu consultorio al crear nuevas historias clínicas.
        </p>
        <p class="header-note">
          Selecciona una sección para revisar sus campos. Los cambios se guardan como una nueva versión y no modifican historias ya finalizadas.
        </p>
      </div>
      <div class="header-actions">
        <span v-if="hasUnsavedChanges && canEditTemplate" class="unsaved-indicator">
          Cambios sin guardar
        </span>
        <button class="btn-outline" type="button" :disabled="isLoading || isSaving" @click="reloadTemplate">
          <v-icon size="17">mdi-refresh</v-icon>
          Recargar
        </button>
        <button
          ref="guideCustomize" v-if="usesSystemTemplate && canManageTemplate && !isCustomTemplateLocked"
          class="btn-primary"
          type="button"
          :disabled="isSaving || isLoading || !!loadError"
          @click="createBusinessTemplate"
        >
          <v-icon size="17">mdi-content-copy</v-icon>
          Personalizar plantilla
        </button>
        <button
          ref="guideSave" v-if="canEditTemplate"
          class="btn-primary cta"
          type="button"
          :disabled="isSaving || isLoading"
          @click="saveNewVersion"
        >
          <v-icon size="17">mdi-content-save-outline</v-icon>
          Guardar nueva versión
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-card">
      Cargando plantilla de historia clínica...
    </div>
    <p v-if="isSaving" role="status" class="loading-card">Guardando la versión de la plantilla…</p>
    <p v-if="loadError" role="alert" class="notice-card">{{ loadError }} <button type="button" :disabled="isLoading || isSaving" @click="reloadTemplate">Reintentar</button></p>

    <template v-else>
      <section ref="guideSummary" class="template-status compact-summary">
        <div class="summary-primary">
          <span>Plantilla actual</span>
          <strong>{{ templateName }}</strong>
        </div>
        <div class="summary-details">
          <span><strong>Tipo de plantilla:</strong> {{ usesSystemTemplate ? 'Plantilla base' : 'Del consultorio' }}</span>
          <span><strong>Versión:</strong> {{ currentVersion }}</span>
          <span><strong>Última actualización:</strong> {{ lastUpdated }}</span>
          <span class="status-value">
            <i :class="['status-dot', templateActive ? 'active' : 'inactive']"></i>
            {{ templateActive ? 'Activa' : 'Inactiva' }}
          </span>
        </div>
      </section>

      <section v-if="usesSystemTemplate" class="notice-card">
        <div>
          <strong>Estás usando la plantilla base.</strong>
          <p>Para adaptarla a tu consultorio, crea una versión propia. La plantilla base se conserva sin cambios.</p>
        </div>
      </section>

      <section v-if="isCustomTemplateLocked" class="notice-card locked">
        <div>
          <strong>Disponible en Profesional.</strong>
          <p>{{ customTemplateLockedMessage }}</p>
          <button type="button" class="locked-cta" @click="$emit('contact-plan', { feature: 'clinical_history_templates', minimumPlan: 'pro', section: 'clinical-history-template' })">Contactar para cambiar plan</button>
        </div>
      </section>

      <section v-if="!canManageTemplate" class="notice-card muted">
        <div>
          <strong>Consulta sin edición.</strong>
          <p>Puedes revisar la plantilla, pero tu usuario no puede modificarla.</p>
        </div>
      </section>

      <section class="help-guide">
        <button class="guide-toggle" type="button" @click="showTemplateHelp = !showTemplateHelp">
          <span>
            <v-icon size="17">mdi-help-circle-outline</v-icon>
            ¿Cómo funciona esta plantilla?
          </span>
          <v-icon size="18">{{ showTemplateHelp ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </button>
        <div v-if="showTemplateHelp" class="guide-body">
          <p v-if="!canManageTemplate">Tu usuario puede consultar la plantilla y su vista previa. Pide a una persona con permiso de administrar plantillas que ajuste los campos del consultorio.</p>
          <p v-else-if="isCustomTemplateLocked">Tu plan permite usar y consultar la plantilla vigente. La personalización está disponible desde Profesional.</p>
          <p v-else>
            Esta plantilla define qué secciones y campos aparecerán al crear una historia clínica.
            Puedes activar o desactivar secciones, agregar campos propios y guardar una nueva versión para el consultorio.
          </p>
          <div v-if="canManageTemplate && !isCustomTemplateLocked" class="guide-steps">
            <span>1. Selecciona una sección</span>
            <span>2. Ajusta sus campos</span>
            <span>3. Guarda una nueva versión</span>
          </div>
        </div>
      </section>

      <section :class="['editor-grid', !showPreviewPanel ? 'preview-hidden' : '']">
        <aside class="sections-pane">
          <div class="pane-header compact-title">
            <div>
              <h3>Secciones</h3>
              <p>{{ countLabel(orderedSections.length, 'sección', 'secciones') }} · {{ countLabel(totalFieldCount, 'campo', 'campos') }} en la plantilla</p>
            </div>
            <button v-if="canEditTemplate" class="btn-icon" type="button" title="Agregar sección" @click="openSectionDialog()">
              <v-icon size="17">mdi-plus</v-icon>
            </button>
          </div>

          <button
            v-for="section in orderedSections"
            :key="section.key"
            type="button"
            :class="['section-list-item', selectedSectionKey === section.key ? 'is-selected' : '', section.enabled === false ? 'is-inactive' : '']"
            @click="selectSection(section.key)"
          >
            <span :class="['status-dot', section.enabled !== false ? 'active' : 'inactive']"></span>
            <span class="section-list-copy">
              <strong>{{ section.label || 'Sección sin nombre' }}</strong>
              <small>
                {{ activeFieldCount(section) }} de {{ countLabel(section.fields.length, 'campo', 'campos') }}
                <template v-if="requiredFieldCount(section) > 0"> · {{ countLabel(requiredFieldCount(section), 'obligatorio', 'obligatorios') }}</template>
                · {{ section.system ? 'Sección base' : 'Propia' }}
              </small>
            </span>
          </button>

          <article v-if="orderedSections.length === 0" class="empty-state large">
            No hay secciones configuradas todavía.
          </article>
        </aside>

        <main class="detail-pane">
          <template v-if="selectedSection">
            <div :class="['selected-section-card', selectedSection.enabled === false ? 'is-inactive' : '']">
              <div class="detail-head">
                <div class="section-title-block">
                  <div class="section-title-line">
                    <span :class="['status-dot', selectedSection.enabled !== false ? 'active' : 'inactive']"></span>
                    <h3>{{ selectedSection.label || 'Sección sin nombre' }}</h3>
                  </div>
                  <p>{{ selectedSection.description || 'Sin descripción.' }}</p>
                  <div class="section-meta-line">
                    <span>{{ selectedSection.enabled !== false ? 'Activa' : 'Inactiva' }}</span>
                    <span>{{ activeFieldCount(selectedSection) }} de {{ countLabel(selectedSection.fields.length, 'campo visible', 'campos visibles') }}</span>
                    <span>{{ selectedSection.system ? 'Sección base' : 'Propia' }}</span>
                    <span v-if="selectedSection.locked">No eliminable</span>
                    <span>Posición {{ selectedSection.order }}</span>
                  </div>
                </div>
                <div class="section-actions">
                  <button class="btn-outline compact" type="button" :disabled="!canEditTemplate" @click="openSectionDialog(selectedSection, selectedSectionIndex)">
                    <v-icon size="17">mdi-pencil-outline</v-icon>
                    Editar sección
                  </button>
                  <button
                    v-if="canEditTemplate && !selectedSection.locked"
                    :class="['btn-ghost', 'muted-action', 'compact', selectedSection.enabled !== false ? 'danger-action' : 'success-action']"
                    type="button"
                    @click="toggleSectionEnabled(selectedSection)"
                  >
                    {{ selectedSection.enabled !== false ? 'Desactivar' : 'Activar' }}
                  </button>
                  <button v-if="canEditTemplate" class="btn-soft compact" type="button" @click="openCustomFieldDialog(selectedSectionIndex)">
                    <v-icon size="17">mdi-plus</v-icon>
                    Agregar campo propio
                  </button>
                  <button class="btn-outline compact" type="button" @click="openSectionPreview">
                    <v-icon size="17">mdi-eye-outline</v-icon>
                    Mostrar vista previa
                  </button>
                </div>
              </div>

              <p v-if="selectedSection.locked" class="help-note">
                Esta sección viene de la plantilla base. Puedes ajustar su texto visible y sus campos disponibles.
              </p>
            </div>

            <section class="fields-panel">
              <div class="fields-toolbar">
                <div>
                  <strong>Campos de la sección</strong>
                  <span>{{ countLabel(selectedSection.fields.length || 0, 'campo', 'campos') }}</span>
                </div>
              </div>

              <div
                v-for="(field, fieldIndex) in selectedSection.fields"
                :key="field.key"
                :class="['field-row', field.enabled === false ? 'is-inactive' : '']"
              >
                <div>
                  <div class="field-main-line">
                    <strong>{{ field.label || 'Campo sin nombre' }}<em v-if="field.required">*</em></strong>
                    <span v-if="field.enabled === false" class="quiet-pill">Inactivo</span>
                  </div>
                  <p v-if="field.help_text || field.placeholder">{{ field.help_text || field.placeholder }}</p>
                  <div class="field-meta-line">
                    <span>{{ fieldTypeLabel(field.type) }}</span>
                    <span>{{ field.required ? 'Obligatorio' : 'Opcional' }}</span>
                    <span v-if="field.type === 'readonly'">No editable</span>
                    <span>{{ field.system ? 'Campo base' : 'Campo propio' }}</span>
                    <span>{{ field.enabled === false ? 'Inactivo' : 'Activo' }}</span>
                  </div>
                </div>
                <button class="btn-icon" type="button" :disabled="!canEditTemplate" title="Editar campo" @click="openFieldDialog(selectedSectionIndex, field, fieldIndex)">
                  <v-icon size="17">mdi-pencil-outline</v-icon>
                </button>
              </div>

              <article v-if="selectedSection.fields.length === 0" class="empty-state">
                Esta sección todavía no tiene campos. Agrega el primero para usarla en la historia clínica.
              </article>
            </section>
          </template>

          <article v-else class="empty-state large">
            Selecciona una sección para revisar sus campos.
          </article>
        </main>

        <aside v-if="showPreviewPanel" class="preview-pane">
          <div class="pane-header compact-title">
            <div>
              <h3>Vista previa de la sección</h3>
              <p>Así se verá esta sección al capturar la historia clínica.</p>
            </div>
            <button class="btn-icon preview-close" type="button" title="Ocultar vista previa" @click="showPreviewPanel = false">
              <v-icon size="17">mdi-close</v-icon>
            </button>
          </div>

          <article v-if="selectedSection" class="preview-section focused-preview">
            <div class="preview-section-head">
              <h4>{{ selectedSection.label }}</h4>
              <span>{{ selectedPreviewFields.length }}</span>
            </div>
            <p v-if="selectedSection.description">{{ selectedSection.description }}</p>
            <div class="preview-fields">
              <div v-for="field in selectedPreviewFields" :key="field.key">
                <span>{{ field.label }}<strong v-if="field.required">*</strong></span>
                <small>{{ fieldTypeLabel(field.type) }}</small>
              </div>
              <article v-if="selectedPreviewFields.length === 0" class="empty-preview">
                Esta sección no tiene campos activos.
              </article>
            </div>
          </article>

          <div class="preview-actions">
            <button class="btn-outline full" type="button" @click="openFullPreview">
              Ver vista previa completa
            </button>
          </div>

          <div class="advanced-box">
            <button class="btn-ghost full" type="button" @click="toggleAdvancedJson">
              <v-icon size="17">mdi-code-json</v-icon>
              {{ showAdvancedJson ? 'Ocultar herramientas de soporte' : 'Herramientas de soporte' }}
            </button>
            <div v-if="showAdvancedJson" class="advanced-json">
              <strong>Herramientas de soporte.</strong>
              <p>Usa esta área solo con apoyo técnico o cuando soporte te lo indique.</p>
              <v-textarea
                v-model="advancedJsonText"
                rows="10"
                outlined
                dense
                :readonly="!canEditTemplate"
                :color="themeColor"
              ></v-textarea>
              <button v-if="canEditTemplate" class="btn-outline" type="button" @click="applyAdvancedJson">Aplicar cambios de soporte</button>
            </div>
          </div>
        </aside>

      </section>
    </template>

    <v-dialog v-model="sectionPreviewDialog" max-width="520">
      <v-card v-dialog-name="'Vista previa de la sección ' + (selectedSection && selectedSection.label || '')">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Vista previa</p>
            <h3>Vista previa de la sección</h3>
          </div>
          <v-btn icon aria-label="Cerrar vista previa de la sección" @click="sectionPreviewDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <article v-if="selectedSection" class="preview-section focused-preview">
            <div class="preview-section-head">
              <h4>{{ selectedSection.label }}</h4>
              <span>{{ selectedPreviewFields.length }}</span>
            </div>
            <p v-if="selectedSection.description">{{ selectedSection.description }}</p>
            <div class="preview-fields">
              <div v-for="field in selectedPreviewFields" :key="field.key">
                <span>{{ field.label }}<strong v-if="field.required">*</strong></span>
                <small>{{ fieldTypeLabel(field.type) }}</small>
              </div>
              <article v-if="selectedPreviewFields.length === 0" class="empty-preview">
                Esta sección no tiene campos activos.
              </article>
            </div>
          </article>

          <div class="advanced-box">
            <button class="btn-ghost full" type="button" @click="toggleAdvancedJson">
              <v-icon size="17">mdi-code-json</v-icon>
              {{ showAdvancedJson ? 'Ocultar herramientas de soporte' : 'Herramientas de soporte' }}
            </button>
            <div v-if="showAdvancedJson" class="advanced-json">
              <strong>Herramientas de soporte.</strong>
              <p>Usa esta área solo con apoyo técnico o cuando soporte te lo indique.</p>
              <v-textarea
                v-model="advancedJsonText"
                rows="10"
                outlined
                dense
                :readonly="!canEditTemplate"
                :color="themeColor"
              ></v-textarea>
              <button v-if="canEditTemplate" class="btn-outline" type="button" @click="applyAdvancedJson">Aplicar cambios de soporte</button>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="fullPreviewDialog" max-width="760">
      <v-card v-dialog-name="'Vista previa completa de la plantilla'">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Vista previa</p>
            <h3>Vista previa de toda la plantilla</h3>
          </div>
          <v-btn icon aria-label="Cerrar vista previa completa" @click="fullPreviewDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <div class="preview-list full-preview-list">
            <article v-for="section in previewSections" :key="section.key" class="preview-section">
              <div class="preview-section-head">
                <h4>{{ section.label }}</h4>
                <span>{{ previewFields(section).length }}</span>
              </div>
              <p v-if="section.description">{{ section.description }}</p>
              <div class="preview-fields">
                <div v-for="field in previewVisibleFields(section)" :key="field.key">
                  <span>{{ field.label }}<strong v-if="field.required">*</strong></span>
                  <small>{{ fieldTypeLabel(field.type) }}</small>
                </div>
                <em v-if="previewHiddenFieldCount(section) > 0" class="preview-more">
                  +{{ countLabel(previewHiddenFieldCount(section), 'campo', 'campos') }} más
                </em>
              </div>
            </article>
            <article v-if="previewSections.length === 0" class="empty-preview">
              No hay secciones visibles para mostrar.
            </article>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="sectionDialog" max-width="620">
      <v-card v-dialog-name="sectionForm.isNew ? 'Agregar sección propia' : 'Editar sección'">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">{{ sectionForm.isNew ? 'Nueva sección' : 'Editar sección' }}</p>
            <h3>{{ sectionForm.isNew ? 'Agregar sección propia' : 'Editar sección' }}</h3>
          </div>
          <v-btn icon aria-label="Cerrar edición de sección" @click="sectionDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <v-text-field v-model="sectionForm.label" label="Nombre de la sección" outlined dense :color="themeColor"></v-text-field>
          <v-textarea v-model="sectionForm.description" label="Descripción breve" outlined rows="3" :color="themeColor"></v-textarea>
          <v-text-field v-if="!sectionForm.isNew" v-model.number="sectionForm.order" label="Posición" type="number" min="1" :max="schema.sections.length" step="1" :error-messages="sectionPositionError ? [sectionPositionError] : []" :hint="'Entero entre 1 y ' + schema.sections.length + '. Las demás secciones se reordenan automáticamente.'" persistent-hint outlined dense :color="themeColor" @input="sectionPositionError = ''"></v-text-field>
          <v-checkbox
            v-model="sectionForm.enabled"
            label="Sección activa"
            :disabled="sectionForm.locked"
            :color="themeColor"
          ></v-checkbox>
          <p v-if="sectionForm.locked" class="help-note">
            Esta sección forma parte de la plantilla base y no puede eliminarse, pero puedes ajustar su texto.
          </p>
          <p class="help-note">Aplicar cambia el borrador local. Después pulsa Guardar nueva versión para conservarlo.</p>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="sectionDialog = false">Cancelar</button>
          <button class="btn-primary" type="button" @click="saveSectionDialog">Aplicar al borrador</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="fieldDialog" max-width="620">
      <v-card v-dialog-name="'Editar campo ' + (fieldForm.label || '')">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Editar campo</p>
            <h3>{{ fieldForm.system ? 'Campo base' : 'Campo propio' }}</h3>
          </div>
          <v-btn icon aria-label="Cerrar edición del campo" @click="fieldDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <p v-if="fieldForm.system" class="help-note">
            Este campo pertenece a la plantilla base. Puedes ajustar su nombre y ayuda. El estado de alergias siempre es obligatorio y activo; los demás campos conservan su configuración.
          </p>
          <v-text-field v-model="fieldForm.label" label="Nombre del campo" outlined dense :color="themeColor"></v-text-field>
          <v-textarea v-model="fieldForm.help_text" label="Ayuda para quien captura" outlined rows="2" :color="themeColor"></v-textarea>
          <v-text-field v-model="fieldForm.placeholder" label="Texto sugerido, opcional" outlined dense :color="themeColor"></v-text-field>
          <div class="switch-grid">
            <v-checkbox v-model="fieldForm.required" label="Obligatorio" :disabled="fieldForm.system_core" :color="themeColor"></v-checkbox>
            <v-checkbox v-model="fieldForm.enabled" label="Activo" :disabled="fieldForm.system_core" :color="themeColor"></v-checkbox>
          </div>
          <v-textarea
            v-if="usesOptions(fieldForm.type) && !fieldForm.system_core"
            v-model="fieldForm.optionsText"
            :disabled="fieldForm.system_core"
            label="Escribe una opción por línea"
            outlined
            rows="4"
            :color="themeColor"
          ></v-textarea>
          <p v-if="fieldForm.system_core" class="help-note">El estado y su detalle se capturan con el editor compartido de alergias del paciente.</p>
          <p class="help-note">Aplicar cambia el borrador local. Después pulsa Guardar nueva versión para conservarlo.</p>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="fieldDialog = false">Cancelar</button>
          <button class="btn-primary" type="button" @click="saveFieldDialog">Aplicar al borrador</button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="customFieldDialog" max-width="620">
      <v-card v-dialog-name="'Agregar campo propio'">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">Campo propio</p>
            <h3>Agregar campo</h3>
          </div>
          <v-btn icon aria-label="Cerrar nuevo campo" @click="customFieldDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
        </div>
        <v-card-text class="dialog-body">
          <v-text-field v-model="customFieldForm.label" label="Nombre del campo" outlined dense :color="themeColor"></v-text-field>
          <v-select
            v-model="customFieldForm.type"
            :items="fieldTypeOptions"
            item-text="label"
            item-value="value"
            label="Tipo de campo"
            outlined
            dense
            :color="themeColor"
          ></v-select>
          <v-textarea v-model="customFieldForm.help_text" label="Ayuda para quien captura, opcional" outlined rows="2" :color="themeColor"></v-textarea>
          <div class="switch-grid">
            <v-checkbox v-model="customFieldForm.required" label="Obligatorio" :color="themeColor"></v-checkbox>
            <v-checkbox v-model="customFieldForm.enabled" label="Activo" :color="themeColor"></v-checkbox>
          </div>
          <v-textarea
            v-if="usesOptions(customFieldForm.type)"
            v-model="customFieldForm.optionsText"
            label="Escribe una opción por línea"
            outlined
            rows="4"
            :color="themeColor"
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <button class="btn-outline" type="button" @click="customFieldDialog = false">Cancelar</button>
          <button class="btn-primary" type="button" @click="saveCustomField">Agregar al borrador</button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
import { authorizationContext, isCurrentAuthorization } from '../../../security/authorizationContext';
import PreparationGuide from './PreparationGuide.vue';
import { focusControl } from '../../../domain/onboarding/focusControl';
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DAClinicalHistoryTemplateService } from '../../../services/context/core-proccess-context';
import { buildLicenseLimitMessage } from '../../../utils/licenseLimitMessage';
import dialogName from '../../../core/directives/dialog-name';
import { confirmSettingsDiscard, registerSettingsNavigationGuard } from '../../../domain/settings/settings.navigation';

const FIELD_TYPES = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'multiselect', label: 'Selección múltiple' },
  { value: 'checkbox', label: 'Casilla' },
  { value: 'boolean', label: 'Sí / No' },
  { value: 'readonly', label: 'Informativo' }
];

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

export default {
  components:{PreparationGuide},
  directives: { dialogName },
  props: {
    themeColor: {
      type: String,
      default: '#E7AC18'
    }
  },
  data() {
    return {
      disposed:false, pendingWrite:null,
      isLoading: false,
      isSaving: false,
      loadError: '', loadRequest: 0, sectionPositionError: '', dialogBaseline: '', dialogActivator: null,
      currentTemplate: null,
      templateSource: '',
      schema: { sections: [] },
      initialSchemaText: '',
      selectedSectionKey: '',
      showTemplateHelp: true,
      showPreviewPanel: false,
      sectionPreviewDialog: false,
      fullPreviewDialog: false,
      expandedSections: [],
      showAdvancedJson: false,
      advancedJsonText: '',
      sectionDialog: false,
      fieldDialog: false,
      customFieldDialog: false,
      sectionForm: this.emptySectionForm(),
      fieldForm: this.emptyFieldForm(),
      customFieldForm: this.emptyCustomFieldForm(),
      editingSectionIndex: -1,
      editingFieldIndex: -1,
      fieldTypeOptions: FIELD_TYPES
    };
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, {
      hasPermission: fnTypes.hasPermission,
      authBusiness: fnTypes.getBusiness
    }),
    canManageTemplate() {
      return this.hasPermission('clinical_history_template.manage');
    },
    canEditTemplate() {
      return this.canManageTemplate && !this.isCustomTemplateLocked && !this.usesSystemTemplate && Boolean(this.currentTemplate) && !this.isLoading && !this.isSaving && !this.loadError;
    },
    usesSystemTemplate() {
      return this.templateSource === 'SYSTEM' || (this.currentTemplate && this.currentTemplate.is_system_template === true);
    },
    currentPlanCode() {
      return String(this.authBusiness && this.authBusiness.plan ? this.authBusiness.plan : '').toLowerCase();
    },
    isCustomTemplateLocked() {
      return this.currentPlanCode === 'basic';
    },
    customTemplateLockedMessage() {
      return 'Las plantillas clinicas personalizadas estan disponibles desde el plan Profesional. Puedes seguir consultando la plantilla vigente.';
    },
    templateName() {
      return this.currentTemplate ? this.currentTemplate.name || 'Plantilla de historia clínica' : 'Sin plantilla';
    },
    currentVersion() {
      return this.currentTemplate ? this.currentTemplate.version_number || 1 : 'Sin dato';
    },
    templateActive() {
      return this.currentTemplate ? this.currentTemplate.is_active !== false : false;
    },
    lastUpdated() {
      const value = this.currentTemplate ? this.currentTemplate.version_created_at || this.currentTemplate.updated_at || this.currentTemplate.created_at : null;
      if(!value) {
        return 'Sin dato';
      }
      const date = new Date(value);
      if(Number.isNaN(date.getTime())) {
        return 'Sin dato';
      }
      return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    orderedSections() {
      return (this.schema.sections || []).slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    },
    previewSections() {
      return this.orderedSections.filter((section) => section.enabled !== false);
    },
    selectedSection() {
      return this.orderedSections.find((section) => section.key === this.selectedSectionKey) || this.orderedSections[0] || null;
    },
    selectedSectionIndex() {
      return this.selectedSection ? this.schemaSectionIndex(this.selectedSection.key) : -1;
    },
    selectedPreviewFields() {
      return this.selectedSection ? this.previewFields(this.selectedSection) : [];
    },
    totalFieldCount() {
      return this.orderedSections.reduce((total, section) => total + (section.fields || []).length, 0);
    },
    hasUnsavedChanges() {
      return Boolean(this.initialSchemaText) && JSON.stringify(this.schema) !== this.initialSchemaText;
    },
    hasPendingCapture() {
      const dialog = this.currentDialogForm();
      return this.hasUnsavedChanges || Boolean(dialog && this.dialogBaseline && JSON.stringify(dialog) !== this.dialogBaseline)
        || Boolean(this.showAdvancedJson && this.advancedJsonText !== JSON.stringify(this.schema, null, 2));
    }
  },
  mounted() {
    this.loadTemplate();
    this.removeNavigationGuard = registerSettingsNavigationGuard(this, {hasChanges: () => this.hasPendingCapture, isSaving: () => this.isSaving});
  },
  beforeDestroy() { this.disposed=true;this.loadRequest++; if(this.removeNavigationGuard) this.removeNavigationGuard(); },
  watch: {
    sectionDialog(value) { if(!value) this.restoreDialogFocus(); },
    fieldDialog(value) { if(!value) this.restoreDialogFocus(); },
    customFieldDialog(value) { if(!value) this.restoreDialogFocus(); },
    sectionPreviewDialog(value) { if(!value) this.restoreDialogFocus(); },
    fullPreviewDialog(value) { if(!value) this.restoreDialogFocus(); }
  },
  methods: {
    async reconcileWrite(){
      if(!this.pendingWrite)return false;
      const context=authorizationContext(this.$store),intent=this.pendingWrite;
      const response=await DAClinicalHistoryTemplateService.getCurrent();
      if(this.disposed || !isCurrentAuthorization(context,this.$store))return true;
      if(!response || !response.success || !response.data || !response.data.template)throw Error();
      const current=response.data.template;
      const matches=intent.kind==='create' ? response.data.source==='BUSINESS' : JSON.stringify(this.normalizeSchema(current.schema_json))===intent.schema;
      if(matches){this.currentTemplate=current;this.templateSource=response.data.source;this.initialSchemaText=JSON.stringify(this.normalizeSchema(current.schema_json));this.pendingWrite=null;this.$emit('saved','Guardado comprobado. Conservamos los cambios locales posteriores.');}
      else if(current.id_clinical_history_template===intent.id && current.version_number===intent.version){this.pendingWrite=null;this.$emit('error','La lectura conserva la versión anterior. Revisa tu captura antes de volver a guardar.');}
      else this.$emit('error','La versión guardada es distinta. Conservamos tu captura; revisa los cambios antes de reemplazarla.');
      return true;
    },
    focusGuideControl(id, reveal){focusControl(this.$refs[id==='customize' && this.$refs.guideCustomize ? 'guideCustomize' : id==='save' && this.$refs.guideSave ? 'guideSave' : 'guideSummary'], reveal);},
    countLabel(count, singular, plural) { return `${count} ${Number(count) === 1 ? singular : plural}`; },
    currentDialogForm() { return this.sectionDialog ? this.sectionForm : this.fieldDialog ? this.fieldForm : this.customFieldDialog ? this.customFieldForm : null; },
    rememberDialogFocus() { this.dialogActivator = typeof document !== 'undefined' ? document.activeElement : null; },
    restoreDialogFocus() { const element = this.dialogActivator; this.$nextTick(() => { if(element && element.isConnected && element.focus) element.focus(); }); },
    openSectionPreview() { this.rememberDialogFocus(); this.sectionPreviewDialog = true; },
    openFullPreview() { this.rememberDialogFocus(); this.fullPreviewDialog = true; },
    async reloadTemplate() {
      if(this.isLoading || this.isSaving) return false;
      if(this.hasPendingCapture && !await confirmSettingsDiscard(this, {text:'Recargar descartará los cambios locales de la plantilla que aún no guardaste como una nueva versión.'})) return false;
      this.sectionDialog = false; this.fieldDialog = false; this.customFieldDialog = false;
      return this.loadTemplate();
    },
    async loadTemplate() {
      const request = ++this.loadRequest,context=authorizationContext(this.$store);
      const current=()=>!this.disposed && request===this.loadRequest && isCurrentAuthorization(context,this.$store);
      this.isLoading = true;
      this.loadError = '';
      try {
      const response = await DAClinicalHistoryTemplateService.getCurrent();
      if(!current())return false;
      if(response && response.success && response.data && response.data.template) {
        this.currentTemplate = response.data.template;
        this.templateSource = response.data.source || '';
        this.schema = this.normalizeSchema(this.currentTemplate.schema_json || {});
        this.expandedSections = this.orderedSections.slice(0, 2).map((section) => section.key);
        this.selectedSectionKey = this.resolveSelectedSectionKey();
        this.initialSchemaText = JSON.stringify(this.schema);
        this.syncAdvancedJson();
        return true;
      }
      this.loadError = 'No se pudo cargar la plantilla de historia clínica. Tus cambios locales se conservan; reintenta la carga.';
      this.$emit('error', this.loadError);
      return false;
      } catch (_) {
        if(current()) { this.loadError = 'No se pudo cargar la plantilla. Revisa tu conexión y reintenta.'; this.$emit('error', this.loadError); }
        return false;
      } finally { if(current()) this.isLoading = false; }
    },
    async createBusinessTemplate() {
      if(this.isSaving || this.isLoading || this.loadError || !this.canManageTemplate || this.isCustomTemplateLocked) return false;
      this.isSaving = true;
      const context=authorizationContext(this.$store);
      const current=()=>!this.disposed && isCurrentAuthorization(context,this.$store);
      try {
      if(await this.reconcileWrite())return false;
      this.pendingWrite={kind:'create',id:this.currentTemplate.id_clinical_history_template,version:this.currentTemplate.version_number};
      const response = await DAClinicalHistoryTemplateService.createBusinessTemplate({
        name: 'Historia clínica del consultorio',
        description: 'Plantilla del consultorio.'
      });

      if(!current())return false;
      if(response && response.success) {
        this.pendingWrite=null;
        this.$emit('saved', 'Plantilla del consultorio creada correctamente.');
        await this.loadTemplate();
        return;
      }

      if(Number(response && response.status)<500)this.pendingWrite=null;
      this.$emit('error', this.pendingWrite ? 'No se pudo confirmar el guardado. El siguiente intento comprobará la plantilla sin crear otra versión.' : buildLicenseLimitMessage(response, this.cleanBackendMessage(response && response.message)));
      return false;
      } catch (_) { if(current())this.$emit('error', 'No se pudo confirmar la creación. Recarga la plantilla para comprobar su estado antes de reintentar.'); return false; }
      finally { if(current())this.isSaving = false; }
    },
    async saveNewVersion() {
      if(this.isSaving || this.isLoading || this.loadError || !this.canEditTemplate) {
        return;
      }

      const validation = this.validateBeforeSave();
      if(!validation.ok) {
        this.$emit('error', validation.message);
        return;
      }

      this.isSaving = true;
      const context=authorizationContext(this.$store);
      const current=()=>!this.disposed && isCurrentAuthorization(context,this.$store);
      try {
      if(await this.reconcileWrite())return false;
      const submittedSchema = clone(this.schema);
      this.pendingWrite={kind:'version',id:this.currentTemplate.id_clinical_history_template,version:this.currentTemplate.version_number,schema:JSON.stringify(submittedSchema)};
      const response = await DAClinicalHistoryTemplateService.createVersion(
        this.currentTemplate.id_clinical_history_template,
        { schema_json: submittedSchema }
      );

      if(!current())return false;
      if(response && response.success) {
        this.pendingWrite=null;
        const laterChanges = JSON.stringify(this.schema) !== JSON.stringify(submittedSchema) ? clone(this.schema) : null;
        this.$emit('saved', 'Nueva versión guardada correctamente.');
        await this.loadTemplate();
        if(laterChanges) { this.schema = laterChanges; this.syncAdvancedJson(); }
        return true;
      }

      if(Number(response && response.status)<500)this.pendingWrite=null;
      this.$emit('error', this.pendingWrite ? 'No se pudo confirmar el guardado. El siguiente intento comprobará la plantilla sin crear otra versión.' : buildLicenseLimitMessage(response, this.cleanBackendMessage(response && response.message)));
      return false;
      } catch (_) { if(current())this.$emit('error', 'No se pudo confirmar la nueva versión. Recarga la plantilla para comprobar su estado antes de reintentar.'); return false; }
      finally { if(current())this.isSaving = false; }
    },
    normalizeSchema(rawSchema) {
      const schema = clone(rawSchema);
      schema.sections = Array.isArray(schema.sections) ? schema.sections : [];
      schema.sections = schema.sections.map((section, index) => {
        const normalizedSection = {
          ...section,
          key: section.key || `section_${index + 1}`,
          label: section.label || 'Sección sin nombre',
          description: section.description || '',
          enabled: section.enabled !== false,
          order: Number(section.order || index + 1),
          system: section.system !== false && !String(section.key || '').startsWith('custom_'),
          locked: Boolean(section.locked),
          fields: Array.isArray(section.fields) ? section.fields : []
        };

        normalizedSection.fields = normalizedSection.fields.map((field) => ({
          ...field,
          key: field.key || this.uniqueFieldKey(normalizedSection, 'custom_campo'),
          label: field.label || 'Campo sin nombre',
          type: this.isAllowedFieldType(field.type) ? field.type : 'text',
          required: Boolean(field.required),
          enabled: field.enabled !== false,
          system: field.system !== false && !String(field.key || '').startsWith('custom_'),
          help_text: field.help_text || '',
          placeholder: field.placeholder || '',
          options: Array.isArray(field.options) ? field.options : []
        }));

        return normalizedSection;
      });
      return schema;
    },
    emptySectionForm() {
      return {
        isNew: false,
        label: '',
        description: '',
        enabled: true,
        order: 1,
        locked: false
      };
    },
    emptyFieldForm() {
      return {
        label: '',
        help_text: '',
        placeholder: '',
        type: 'text',
        required: false,
        enabled: true,
        system: false,
        optionsText: ''
      };
    },
    emptyCustomFieldForm() {
      return {
        label: '',
        type: 'text',
        help_text: '',
        required: false,
        enabled: true,
        optionsText: ''
      };
    },
    openSectionDialog(section = null, sectionIndex = -1) {
      if(!this.canEditTemplate) {
        return;
      }
      this.editingSectionIndex = sectionIndex;
      this.sectionPositionError = '';
      this.sectionForm = section ? {
        isNew: false,
        label: section.label || '',
        description: section.description || '',
        enabled: section.enabled !== false,
        order: Number(section.order || sectionIndex + 1),
        locked: Boolean(section.locked)
      } : {
        ...this.emptySectionForm(),
        isNew: true,
        order: this.nextSectionOrder()
      };
      this.dialogBaseline = JSON.stringify(this.sectionForm);
      this.rememberDialogFocus();
      this.sectionDialog = true;
    },
    saveSectionDialog() {
      if(!this.sectionForm.label || !this.sectionForm.label.trim()) {
        this.$emit('error', 'Escribe el nombre de la sección.');
        return;
      }

      const position = Number(this.sectionForm.order);
      if(!this.sectionForm.isNew && (!Number.isInteger(position) || position < 1 || position > this.schema.sections.length)) {
        this.sectionPositionError = `Indica una posición entera entre 1 y ${this.schema.sections.length}.`;
        return false;
      }

      if(this.sectionForm.isNew) {
        const key = this.uniqueSectionKey(`custom_${this.slugify(this.sectionForm.label)}`);
        this.schema.sections.push({
          key,
          label: this.sectionForm.label.trim(),
          description: this.sectionForm.description || '',
          enabled: Boolean(this.sectionForm.enabled),
          order: this.nextSectionOrder(),
          system: false,
          locked: false,
          fields: []
        });
        this.expandedSections.push(key);
        this.selectedSectionKey = key;
      } else if(this.editingSectionIndex >= 0) {
        const section = this.schema.sections[this.editingSectionIndex];
        section.label = this.sectionForm.label.trim();
        section.description = this.sectionForm.description || '';
        const ordered = this.orderedSections.filter(item => item !== section);
        ordered.splice(position - 1, 0, section);
        ordered.forEach((item, index) => { item.order = index + 1; });
        if(!section.locked) {
          section.enabled = Boolean(this.sectionForm.enabled);
        }
      }

      this.syncAdvancedJson();
      this.sectionDialog = false;
    },
    openFieldDialog(sectionIndex, field, fieldIndex) {
      if(!this.canEditTemplate) {
        return;
      }
      this.editingSectionIndex = sectionIndex;
      this.editingFieldIndex = fieldIndex;
      this.fieldForm = {
        label: field.label || '',
        help_text: field.help_text || '',
        placeholder: field.placeholder || '',
        type: field.type || 'text',
        required: Boolean(field.required),
        enabled: field.enabled !== false,
        system: Boolean(field.system),
        system_core: Boolean(field.system_core),
        optionsText: this.optionsToText(field.options)
      };
      this.dialogBaseline = JSON.stringify(this.fieldForm);
      this.rememberDialogFocus();
      this.fieldDialog = true;
    },
    saveFieldDialog() {
      if(!this.fieldForm.label || !this.fieldForm.label.trim()) {
        this.$emit('error', 'Escribe el nombre del campo.');
        return;
      }

      if(this.usesOptions(this.fieldForm.type) && this.parseOptions(this.fieldForm.optionsText).length === 0) {
        this.$emit('error', 'Agrega al menos una opción para este campo.');
        return;
      }

      const section = this.schema.sections[this.editingSectionIndex];
      if(!section || !section.fields[this.editingFieldIndex]) {
        return;
      }

      const field = section.fields[this.editingFieldIndex];
      field.label = this.fieldForm.label.trim();
      field.help_text = this.fieldForm.help_text || '';
      field.placeholder = this.fieldForm.placeholder || '';
      if(!field.system_core) {
        field.required = Boolean(this.fieldForm.required);
        field.enabled = Boolean(this.fieldForm.enabled);
      }
      if(this.usesOptions(field.type) && !field.system_core) {
        field.options = this.parseOptions(this.fieldForm.optionsText);
      }

      this.syncAdvancedJson();
      this.fieldDialog = false;
    },
    openCustomFieldDialog(sectionIndex) {
      if(!this.canEditTemplate) {
        return;
      }
      this.editingSectionIndex = sectionIndex;
      this.customFieldForm = this.emptyCustomFieldForm();
      this.dialogBaseline = JSON.stringify(this.customFieldForm);
      this.rememberDialogFocus();
      this.customFieldDialog = true;
    },
    saveCustomField() {
      if(!this.customFieldForm.label || !this.customFieldForm.label.trim()) {
        this.$emit('error', 'Escribe el nombre del campo.');
        return;
      }

      if(!this.isAllowedFieldType(this.customFieldForm.type)) {
        this.$emit('error', 'Selecciona un tipo de campo.');
        return;
      }

      if(this.usesOptions(this.customFieldForm.type) && this.parseOptions(this.customFieldForm.optionsText).length === 0) {
        this.$emit('error', 'Agrega al menos una opción para este campo.');
        return;
      }

      const section = this.schema.sections[this.editingSectionIndex];
      if(!section) {
        return;
      }

      const key = this.uniqueFieldKey(section, `custom_${this.slugify(this.customFieldForm.label)}`);
      section.fields.push({
        key,
        label: this.customFieldForm.label.trim(),
        type: this.customFieldForm.type,
        help_text: this.customFieldForm.help_text || '',
        required: Boolean(this.customFieldForm.required),
        enabled: Boolean(this.customFieldForm.enabled),
        system: false,
        options: this.usesOptions(this.customFieldForm.type) ? this.parseOptions(this.customFieldForm.optionsText) : []
      });

      if(!this.expandedSections.includes(section.key)) {
        this.expandedSections.push(section.key);
      }
      this.syncAdvancedJson();
      this.customFieldDialog = false;
    },
    validateBeforeSave() {
      const activeSections = (this.schema.sections || []).filter((section) => section.enabled !== false);
      if(activeSections.length === 0) {
        return { ok: false, message: 'Debe haber al menos una sección activa.' };
      }

      const sectionKeys = new Set();
      const positions = new Set();
      for(const section of this.schema.sections) {
        if(!Number.isInteger(Number(section.order)) || Number(section.order) < 1 || Number(section.order) > this.schema.sections.length || positions.has(Number(section.order))) return {ok:false, message:'Las posiciones deben ser enteros distintos entre 1 y el total de secciones.'};
        positions.add(Number(section.order));
        if(sectionKeys.has(section.key)) {
          return { ok: false, message: `Hay secciones repetidas: ${section.label || section.key}.` };
        }
        sectionKeys.add(section.key);

        if(section.enabled !== false && !String(section.label || '').trim()) {
          return { ok: false, message: 'Cada sección activa debe tener nombre.' };
        }

        const fieldKeys = new Set();
        for(const field of section.fields || []) {
          if(fieldKeys.has(field.key)) {
            return { ok: false, message: `Hay campos repetidos en la sección ${section.label}.` };
          }
          fieldKeys.add(field.key);

          if(field.enabled !== false && !String(field.label || '').trim()) {
            return { ok: false, message: `Hay campos activos sin nombre en la sección ${section.label}.` };
          }

          if(field.enabled !== false && this.usesOptions(field.type) && (!field.options || field.options.length === 0)) {
            return { ok: false, message: `Agrega opciones al campo ${field.label}.` };
          }
        }
      }

      if(JSON.stringify(this.schema).length > 250000) {
        return { ok: false, message: 'La plantilla tiene demasiada información para guardarse.' };
      }

      return { ok: true };
    },
    toggleExpanded(key) {
      if(this.expandedSections.includes(key)) {
        this.expandedSections = this.expandedSections.filter((item) => item !== key);
        return;
      }
      this.expandedSections.push(key);
    },
    toggleAdvancedJson() {
      this.showAdvancedJson = !this.showAdvancedJson;
      this.syncAdvancedJson();
    },
    applyAdvancedJson() {
      try {
        const parsed = JSON.parse(this.advancedJsonText);
        this.schema = this.normalizeSchema(parsed);
        this.selectedSectionKey = this.resolveSelectedSectionKey();
        this.syncAdvancedJson();
        this.$emit('saved', 'Cambios de soporte aplicados a la plantilla.');
      } catch (error) {
        this.$emit('error', 'No pudimos aplicar esos cambios. Revisa el contenido o pide apoyo de soporte.');
      }
    },
    syncAdvancedJson() {
      this.advancedJsonText = JSON.stringify(this.schema, null, 2);
    },
    activeFieldCount(section) {
      return (section.fields || []).filter((field) => field.enabled !== false).length;
    },
    requiredFieldCount(section) {
      return (section.fields || []).filter((field) => field.required && field.enabled !== false).length;
    },
    previewFields(section) {
      return (section.fields || []).filter((field) => field.enabled !== false);
    },
    previewVisibleFields(section) {
      return this.previewFields(section);
    },
    previewHiddenFieldCount(section) {
      return Math.max(this.previewFields(section).length - this.previewVisibleFields(section).length, 0);
    },
    schemaSectionIndex(key) {
      return (this.schema.sections || []).findIndex((section) => section.key === key);
    },
    selectSection(key) {
      this.selectedSectionKey = key;
    },
    resolveSelectedSectionKey() {
      if(this.orderedSections.some((section) => section.key === this.selectedSectionKey)) {
        return this.selectedSectionKey;
      }
      return this.orderedSections.length ? this.orderedSections[0].key : '';
    },
    toggleSectionEnabled(section) {
      section.enabled = section.enabled === false;
      this.syncAdvancedJson();
    },
    fieldTypeLabel(type) {
      const found = FIELD_TYPES.find((item) => item.value === type);
      return found ? found.label : 'Texto corto';
    },
    isAllowedFieldType(type) {
      return FIELD_TYPES.some((item) => item.value === type);
    },
    usesOptions(type) {
      return ['select', 'multiselect'].includes(type);
    },
    parseOptions(text) {
      return String(text || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({ label: item, value: this.slugify(item) }));
    },
    optionsToText(options) {
      return (options || []).map((item) => item.label || item.value || item).join('\n');
    },
    nextSectionOrder() {
      const maxOrder = (this.schema.sections || []).reduce((max, section) => Math.max(max, Number(section.order || 0)), 0);
      return maxOrder + 1;
    },
    uniqueSectionKey(baseKey) {
      const existing = new Set((this.schema.sections || []).map((section) => section.key));
      let key = baseKey || 'custom_seccion';
      let index = 2;
      while(existing.has(key)) {
        key = `${baseKey}_${index}`;
        index += 1;
      }
      return key;
    },
    uniqueFieldKey(section, baseKey) {
      const existing = new Set((section.fields || []).map((field) => field.key));
      let key = baseKey || 'custom_campo';
      let index = 2;
      while(existing.has(key)) {
        key = `${baseKey}_${index}`;
        index += 1;
      }
      return key;
    },
    slugify(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'campo';
    },
    cleanBackendMessage(message) {
      if(!message) {
        return 'No se pudo guardar la plantilla.';
      }
      return String(message)
        .replace(/schema_json/gi, 'la plantilla')
        .replace(/key/gi, 'dato interno')
        .replace(/fields/gi, 'campos')
        .replace(/sections/gi, 'secciones');
    }
  }
};
</script>

<style scoped>
.clinical-template-config {
  color: #25364d;
  width: 100%;
}

.section-header,
.template-status,
.editor-grid,
.pane-header,
.detail-head,
.section-card-head,
.section-actions,
.header-actions {
  display: flex;
  gap: .875rem;
}

.section-header {
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.35rem 1.5rem;
  border-bottom: 1px solid var(--color-primary-200, #d8e9ef);
  background: linear-gradient(180deg, var(--color-primary-100, #eefbff) 0%, #ffffff 100%);
}

.header-copy {
  max-width: 48rem;
}

.section-header h2,
.pane-header h3,
.section-card h4,
.preview-section h4,
.dialog-header h3 {
  margin: 0;
  color: #1f2a44;
}

.section-header h2 {
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1.2;
}

.header-subtitle {
  margin: .45rem 0 0;
  color: #475569;
  font-size: .95rem;
  line-height: 1.45;
}

.header-note {
  margin: .35rem 0 0;
  color: #64748b;
  font-size: .82rem;
  line-height: 1.35;
}

.section-card p,
.preview-pane p,
.help-note {
  color: #64748b;
}

.eyebrow {
  margin: 0 0 .25rem;
  color: var(--color-primary-900, #006077);
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.header-actions,
.section-actions {
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.header-actions {
  min-width: 16rem;
}

.unsaved-indicator {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  color: #9a6700;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: .38rem .55rem;
  font-size: .76rem;
  font-weight: 800;
  white-space: nowrap;
}

.unsaved-indicator::before {
  content: '';
  width: .42rem;
  height: .42rem;
  border-radius: 50%;
  background: #d97706;
}

.template-status {
  align-items: center;
  justify-content: space-between;
  padding: .8rem 1.5rem;
  margin: 0;
  border-bottom: 1px solid #e2e8f0;
}

.compact-summary {
  background: #fff;
}

.summary-primary {
  min-width: 12rem;
}

.summary-primary span {
  display: block;
  color: #64748b;
  font-size: .68rem;
  font-weight: 900;
  text-transform: uppercase;
}

.summary-primary strong {
  display: block;
  margin-top: .15rem;
  color: #0f172a;
  font-size: .95rem;
  line-height: 1.25;
  overflow-wrap: break-word;
}

.summary-details {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: .4rem .85rem;
  color: #64748b;
  font-size: .78rem;
  line-height: 1.3;
}

.summary-details strong {
  color: #475569;
}

.template-status article,
.notice-card,
.section-card,
.selected-section-card,
.sections-pane,
.detail-pane,
.fields-panel,
.preview-pane,
.loading-card {
  border: 1px solid #d8e9ef;
  background: #fff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .04);
}

.template-status article {
  min-width: 0;
  padding: .72rem .8rem;
  border-radius: 6px;
}

.template-status span {
  display: block;
  color: #64748b;
  font-size: .68rem;
  font-weight: 900;
  text-transform: uppercase;
}

.template-status strong {
  display: block;
  margin-top: .25rem;
  color: #0f172a;
  overflow-wrap: break-word;
  word-break: normal;
  font-size: .9rem;
  line-height: 1.3;
}

.status-value {
  display: inline-flex !important;
  align-items: center;
  gap: .4rem;
}

.help-guide {
  margin: .85rem 1.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #f8fafc;
}

.guide-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding: .65rem .8rem;
  color: #334155;
  font-size: .86rem;
  font-weight: 900;
}

.guide-toggle span {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
}

.guide-body {
  border-top: 1px solid #e2e8f0;
  padding: .75rem .85rem .85rem;
}

.guide-body p {
  margin: 0;
  color: #64748b;
  font-size: .84rem;
  line-height: 1.45;
}

.guide-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .5rem;
  margin-top: .7rem;
}

.guide-steps span {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 6px;
  padding: .5rem .6rem;
  color: #475569;
  font-size: .78rem;
  font-weight: 800;
}

.notice-card,
.loading-card {
  margin: 0 1.5rem 1rem;
  padding: .85rem 1rem;
  border-radius: 6px;
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
}

.notice-card.muted {
  border-color: #d8e9ef;
  background: #f8fbfd;
  color: #64748b;
}

.notice-card.locked {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #475569;
}

.notice-card p {
  margin: .25rem 0 0;
}

.locked-cta {
  margin-top: .85rem;
  min-height: 2.25rem;
  padding: 0 .9rem;
  border: 1px solid #0f766e;
  color: #0f766e;
  background: #ffffff;
  font-weight: 800;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(240px, .34fr) minmax(0, 1fr);
  gap: 1rem;
  padding: 0 1.35rem 1.35rem;
  align-items: flex-start;
}

.editor-grid.preview-hidden {
  grid-template-columns: minmax(240px, .34fr) minmax(0, 1fr);
}

.sections-pane,
.detail-pane,
.preview-pane,
.preview-list,
.fields-list {
  display: grid;
  gap: .75rem;
}

.sections-pane,
.detail-pane {
  padding: 1rem;
  border-radius: 7px;
}

.sections-pane {
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow: auto;
}

.pane-header {
  align-items: center;
  justify-content: space-between;
  padding: .35rem 0 .2rem;
}

.pane-header.compact-title {
  align-items: flex-start;
  padding: 0 0 .15rem;
}

.pane-header.compact {
  display: block;
  padding: 0;
}

.pane-header h3,
.detail-head h3 {
  font-size: 1rem;
  font-weight: 850;
}

.pane-header p {
  margin: .25rem 0 0;
  color: #64748b;
  font-size: .86rem;
}

.section-list-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: .55rem;
  align-items: start;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  padding: .65rem .6rem;
  text-align: left;
  transition: background .14s ease, border-color .14s ease, box-shadow .14s ease;
}

.section-list-item:hover,
.section-list-item.is-selected {
  background: #fff;
  border-color: #d8e9ef;
}

.section-list-item.is-selected {
  box-shadow: inset 3px 0 0 var(--color-primary-500, #19a6c9);
}

.section-list-item.is-inactive {
  opacity: .68;
}

.section-list-copy {
  min-width: 0;
}

.section-list-copy strong {
  display: block;
  color: #1f2937;
  font-size: .86rem;
  line-height: 1.25;
  overflow-wrap: break-word;
  word-break: normal;
}

.section-list-copy small {
  display: block;
  margin-top: .18rem;
  color: #64748b;
  font-size: .72rem;
  line-height: 1.35;
}

.section-card {
  padding: .95rem;
  border-radius: 7px;
  transition: border-color .14s ease, box-shadow .14s ease, opacity .14s ease;
}

.section-card.is-inactive {
  background: #f8fafc;
  opacity: .78;
}

.selected-section-card {
  padding: 1.1rem;
  border-radius: 7px;
}

.selected-section-card.is-inactive {
  background: #f8fafc;
  opacity: .82;
}

.section-card-head {
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.detail-head {
  align-items: flex-start;
  flex-direction: column;
  justify-content: flex-start;
}

.section-title-block {
  min-width: 0;
}

.section-title-line,
.field-main-line,
.preview-section-head {
  display: flex;
  align-items: center;
  gap: .45rem;
  min-width: 0;
}

.section-title-line h4 {
  min-width: 0;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: break-word;
  word-break: normal;
}

.section-title-line h3 {
  min-width: 0;
  font-size: 1.08rem;
  font-weight: 850;
  line-height: 1.25;
  overflow-wrap: break-word;
  word-break: normal;
}

.section-title-block p {
  margin: .38rem 0 0;
  color: #64748b;
  font-size: .86rem;
  line-height: 1.4;
}

.status-dot {
  flex: 0 0 auto;
  width: .55rem;
  height: .55rem;
  border-radius: 50%;
  background: #94a3b8;
}

.status-dot.active {
  background: #10b981;
  box-shadow: 0 0 0 3px #dcfce7;
}

.status-dot.inactive {
  background: #94a3b8;
  box-shadow: 0 0 0 3px #e2e8f0;
}

.section-meta-line,
.field-meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: .35rem .55rem;
  margin-top: .52rem;
  color: #667085;
  font-size: .77rem;
  line-height: 1.35;
}

.section-meta-line span:not(:last-child)::after,
.field-meta-line span:not(:last-child)::after {
  content: '·';
  margin-left: .55rem;
  color: #cbd5e1;
}

.section-actions {
  flex: 0 0 auto;
  gap: .45rem;
  justify-content: flex-start;
  width: 100%;
}

.fields-panel {
  padding: 1rem;
  border-radius: 7px;
}

.help-note {
  margin: .65rem 0 0;
  border-left: 3px solid #fde68a;
  padding: .3rem 0 .3rem .65rem;
  font-size: .8rem;
  line-height: 1.35;
}

.dialog-body > .help-note:first-child {
  margin-top: 0;
  margin-bottom: 1rem;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: .7rem;
  align-items: center;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 6px;
  padding: .78rem .85rem;
}

.field-row.is-inactive {
  background: #f8fafc;
  opacity: .72;
}

.field-main-line strong {
  min-width: 0;
  color: #1f2937;
  font-size: .9rem;
  line-height: 1.25;
  overflow-wrap: break-word;
  word-break: normal;
}

.field-main-line em {
  color: #b42318;
  font-style: normal;
  margin-left: .15rem;
}

.field-row p {
  margin: .22rem 0 0;
  color: #64748b;
  font-size: .8rem;
  line-height: 1.35;
}

.quiet-pill {
  border: 1px solid #cbd5e1;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 999px;
  padding: .14rem .42rem;
  font-size: .68rem;
  font-weight: 800;
}

.fields-list {
  margin-top: .85rem;
  border-top: 1px solid #e2e8f0;
  padding-top: .75rem;
}

.fields-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  color: #334155;
}

.fields-toolbar strong,
.fields-toolbar span {
  display: block;
}

.fields-toolbar strong {
  font-size: .88rem;
}

.fields-toolbar span {
  color: #64748b;
  font-size: .76rem;
}

.preview-pane {
  padding: 1rem;
  border-radius: 7px;
  position: sticky;
  top: 1rem;
}

.preview-close {
  flex: 0 0 auto;
}

.focused-preview {
  margin-top: .15rem;
}

.preview-actions {
  display: grid;
  gap: .5rem;
}

.preview-section {
  border: 1px solid #d8e9ef;
  background: #f8fbfd;
  border-radius: 6px;
  padding: .7rem;
}

.preview-section-head {
  justify-content: space-between;
}

.preview-section-head h4 {
  font-size: .88rem;
  font-weight: 800;
  overflow-wrap: break-word;
  word-break: normal;
}

.preview-section-head span {
  flex: 0 0 auto;
  min-width: 1.45rem;
  height: 1.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #d8e9ef;
  color: #64748b;
  font-size: .72rem;
  font-weight: 900;
}

.preview-section p {
  margin: .22rem 0 .55rem;
  font-size: .78rem;
  line-height: 1.35;
}

.preview-fields {
  display: grid;
  gap: .38rem;
}

.preview-fields div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .65rem;
  border: 1px solid #e2edf3;
  background: #fff;
  border-radius: 5px;
  padding: .45rem .5rem;
}

.preview-fields span {
  min-width: 0;
  color: #334155;
  font-size: .78rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: break-word;
  word-break: normal;
}

.preview-fields strong {
  color: #b42318;
}

.preview-fields small {
  color: var(--color-primary-900, #006077);
  font-weight: 800;
  font-size: .68rem;
  white-space: nowrap;
}

.preview-more {
  color: #64748b;
  font-style: normal;
  font-size: .76rem;
  padding: .1rem .2rem;
}

.empty-preview,
.empty-state {
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  border-radius: 6px;
  color: #64748b;
  text-align: center;
  padding: .85rem;
  font-size: .86rem;
}

.empty-state.large {
  padding: 1.2rem;
}

.advanced-box {
  display: grid;
  gap: .55rem;
  margin-top: .25rem;
}

.advanced-json {
  border: 1px solid #fde68a;
  background: #fffbeb;
  border-radius: 6px;
  padding: .85rem;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid #d8e9ef;
  background: #f8fbfd;
}

.dialog-body {
  padding: 1.25rem !important;
}

.dialog-actions {
  justify-content: flex-end;
  gap: .65rem;
  padding: 0 1.25rem 1.25rem !important;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .5rem;
}

.btn-primary,
.btn-outline,
.btn-soft,
.btn-ghost,
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  border-radius: 6px;
  border: 1px solid transparent;
  min-height: 2.25rem;
  padding: .48rem .78rem;
  font-size: .84rem;
  font-weight: 800;
  line-height: 1;
  transition: box-shadow .14s ease, background .14s ease, border-color .14s ease;
}

.btn-primary {
  color: #fff;
  background: var(--color-primary-500, #19a6c9);
}

.btn-primary.cta {
  box-shadow: 0 8px 18px rgba(20, 151, 189, .16);
}

.btn-outline {
  color: var(--color-primary-900, #006077);
  background: #fff;
  border-color: #d8e9ef;
}

.btn-soft {
  color: var(--color-primary-900, #006077);
  background: var(--color-primary-100, #e0f7fc);
  border-color: var(--color-primary-200, #b8edf7);
}

.btn-ghost {
  color: #475569;
  background: transparent;
  border-color: transparent;
}

.btn-ghost.muted-action {
  color: #64748b;
  background: #f8fafc;
  border-color: #d5e0ea;
}

.btn-ghost.muted-action.danger-action {
  color: #9f1239;
  background: #fff7f7;
  border-color: #fecdd3;
}

.btn-ghost.muted-action.success-action {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.btn-outline.compact,
.btn-soft.compact,
.btn-ghost.compact {
  min-height: 2rem;
  padding: .38rem .6rem;
  font-size: .78rem;
}

.btn-icon {
  width: 2rem;
  height: 2rem;
  min-height: 2rem;
  padding: 0;
  color: var(--color-primary-900, #006077);
  background: #fff;
  border-color: #d8e9ef;
}

.btn-primary:hover:not(:disabled),
.btn-outline:hover:not(:disabled),
.btn-soft:hover:not(:disabled),
.btn-ghost:hover:not(:disabled),
.btn-icon:hover:not(:disabled) {
  box-shadow: 0 8px 16px rgba(15, 23, 42, .07);
}

.btn-primary:disabled,
.btn-outline:disabled,
.btn-soft:disabled,
.btn-ghost:disabled,
.btn-icon:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.btn-outline.full {
  width: 100%;
}

.btn-ghost.full {
  width: 100%;
  justify-content: center;
}

.full-preview-list {
  max-height: 66vh;
  overflow: auto;
  padding-right: .15rem;
}

html[data-theme="clinical-night"] .clinical-template-config {
  color: #E5E7EB;
  background: rgba(30, 41, 59, .96) !important;
  border-color: #334155 !important;
}

html[data-theme="clinical-night"] .clinical-template-config .section-header {
  background: linear-gradient(180deg, rgba(38, 52, 73, .98) 0%, rgba(30, 41, 59, .98) 100%);
  border-color: #334155;
}

html[data-theme="clinical-night"] .clinical-template-config .section-header h2,
html[data-theme="clinical-night"] .clinical-template-config .pane-header h3,
html[data-theme="clinical-night"] .clinical-template-config .section-card h4,
html[data-theme="clinical-night"] .clinical-template-config .preview-section h4,
html[data-theme="clinical-night"] .clinical-template-config .dialog-header h3,
html[data-theme="clinical-night"] .clinical-template-config .summary-primary strong,
html[data-theme="clinical-night"] .clinical-template-config .template-status strong,
html[data-theme="clinical-night"] .clinical-template-config .section-list-copy strong,
html[data-theme="clinical-night"] .clinical-template-config .section-title-line h3,
html[data-theme="clinical-night"] .clinical-template-config .field-main-line strong,
html[data-theme="clinical-night"] .clinical-template-config .fields-toolbar {
  color: #F8FAFC;
}

html[data-theme="clinical-night"] .clinical-template-config .header-subtitle,
html[data-theme="clinical-night"] .clinical-template-config .header-note,
html[data-theme="clinical-night"] .clinical-template-config .section-card p,
html[data-theme="clinical-night"] .clinical-template-config .preview-pane p,
html[data-theme="clinical-night"] .clinical-template-config .help-note,
html[data-theme="clinical-night"] .clinical-template-config .summary-details,
html[data-theme="clinical-night"] .clinical-template-config .summary-primary span,
html[data-theme="clinical-night"] .clinical-template-config .template-status span,
html[data-theme="clinical-night"] .clinical-template-config .pane-header p,
html[data-theme="clinical-night"] .clinical-template-config .section-list-copy small,
html[data-theme="clinical-night"] .clinical-template-config .section-title-block p,
html[data-theme="clinical-night"] .clinical-template-config .section-meta-line,
html[data-theme="clinical-night"] .clinical-template-config .field-meta-line,
html[data-theme="clinical-night"] .clinical-template-config .field-row p,
html[data-theme="clinical-night"] .clinical-template-config .fields-toolbar span,
html[data-theme="clinical-night"] .clinical-template-config .preview-more {
  color: #CBD5E1;
}

html[data-theme="clinical-night"] .clinical-template-config .eyebrow,
html[data-theme="clinical-night"] .clinical-template-config .preview-fields small,
html[data-theme="clinical-night"] .clinical-template-config .btn-outline,
html[data-theme="clinical-night"] .clinical-template-config .btn-soft,
html[data-theme="clinical-night"] .clinical-template-config .btn-icon {
  color: #38BDF8;
}

html[data-theme="clinical-night"] .clinical-template-config .compact-summary,
html[data-theme="clinical-night"] .clinical-template-config .template-status article,
html[data-theme="clinical-night"] .clinical-template-config .notice-card,
html[data-theme="clinical-night"] .clinical-template-config .section-card,
html[data-theme="clinical-night"] .clinical-template-config .selected-section-card,
html[data-theme="clinical-night"] .clinical-template-config .sections-pane,
html[data-theme="clinical-night"] .clinical-template-config .detail-pane,
html[data-theme="clinical-night"] .clinical-template-config .fields-panel,
html[data-theme="clinical-night"] .clinical-template-config .preview-pane,
html[data-theme="clinical-night"] .clinical-template-config .loading-card,
html[data-theme="clinical-night"] .clinical-template-config .field-row,
html[data-theme="clinical-night"] .clinical-template-config .preview-fields div,
html[data-theme="clinical-night"] .clinical-template-config .preview-section-head span,
html[data-theme="clinical-night"] .clinical-template-config .dialog-header,
html[data-theme="clinical-night"] .clinical-template-config .btn-outline,
html[data-theme="clinical-night"] .clinical-template-config .btn-icon {
  background: #1E293B;
  border-color: #334155;
  box-shadow: 0 8px 18px rgba(2, 6, 23, .16);
}

html[data-theme="clinical-night"] .clinical-template-config .template-status,
html[data-theme="clinical-night"] .clinical-template-config .guide-body,
html[data-theme="clinical-night"] .clinical-template-config .fields-list,
html[data-theme="clinical-night"] .clinical-template-config .dialog-header {
  border-color: #334155;
}

html[data-theme="clinical-night"] .clinical-template-config .help-guide,
html[data-theme="clinical-night"] .clinical-template-config .preview-section,
html[data-theme="clinical-night"] .clinical-template-config .empty-preview,
html[data-theme="clinical-night"] .clinical-template-config .empty-state,
html[data-theme="clinical-night"] .clinical-template-config .advanced-json,
html[data-theme="clinical-night"] .clinical-template-config .guide-steps span,
html[data-theme="clinical-night"] .clinical-template-config .section-card.is-inactive,
html[data-theme="clinical-night"] .clinical-template-config .selected-section-card.is-inactive,
html[data-theme="clinical-night"] .clinical-template-config .field-row.is-inactive,
html[data-theme="clinical-night"] .clinical-template-config .quiet-pill,
html[data-theme="clinical-night"] .clinical-template-config .btn-ghost.muted-action {
  background: #111827;
  border-color: #334155;
  color: #CBD5E1;
}

html[data-theme="clinical-night"] .clinical-template-config .guide-toggle,
html[data-theme="clinical-night"] .clinical-template-config .guide-steps span,
html[data-theme="clinical-night"] .clinical-template-config .preview-fields span {
  color: #E5E7EB;
}

html[data-theme="clinical-night"] .clinical-template-config .notice-card,
html[data-theme="clinical-night"] .clinical-template-config .advanced-json {
  border-color: rgba(251, 191, 36, .35);
}

html[data-theme="clinical-night"] .clinical-template-config .notice-card {
  color: #FDE68A;
}

html[data-theme="clinical-night"] .clinical-template-config .notice-card.muted {
  color: #CBD5E1;
  background: #111827;
  border-color: #334155;
}

html[data-theme="clinical-night"] .clinical-template-config .section-list-item:hover,
html[data-theme="clinical-night"] .clinical-template-config .section-list-item.is-selected {
  background: rgba(56, 189, 248, .09);
  border-color: rgba(56, 189, 248, .32);
}

html[data-theme="clinical-night"] .clinical-template-config .section-list-item.is-selected {
  box-shadow: inset 3px 0 0 #38BDF8;
}

html[data-theme="clinical-night"] .clinical-template-config .status-dot.active {
  background: #34D399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, .18);
}

html[data-theme="clinical-night"] .clinical-template-config .status-dot.inactive {
  background: #94A3B8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, .18);
}

html[data-theme="clinical-night"] .clinical-template-config .section-meta-line span:not(:last-child)::after,
html[data-theme="clinical-night"] .clinical-template-config .field-meta-line span:not(:last-child)::after {
  color: #64748B;
}

html[data-theme="clinical-night"] .clinical-template-config .help-note {
  border-left-color: rgba(251, 191, 36, .72);
}

html[data-theme="clinical-night"] .clinical-template-config .field-main-line em,
html[data-theme="clinical-night"] .clinical-template-config .preview-fields strong {
  color: #FCA5A5;
}

html[data-theme="clinical-night"] .clinical-template-config .btn-soft {
  background: rgba(56, 189, 248, .12);
  border-color: rgba(56, 189, 248, .32);
}

html[data-theme="clinical-night"] .clinical-template-config .btn-ghost {
  color: #CBD5E1;
}

html[data-theme="clinical-night"] .clinical-template-config .btn-ghost.muted-action.danger-action {
  color: #FCA5A5;
  background: rgba(248, 113, 113, .1);
  border-color: rgba(248, 113, 113, .32);
}

html[data-theme="clinical-night"] .clinical-template-config .btn-ghost.muted-action.success-action {
  color: #A7F3D0;
  background: rgba(52, 211, 153, .1);
  border-color: rgba(52, 211, 153, .32);
}

html[data-theme="clinical-night"] .clinical-template-config .btn-primary.cta {
  box-shadow: 0 8px 18px rgba(56, 189, 248, .16);
}

html[data-theme="clinical-night"] .clinical-template-config .btn-primary:hover:not(:disabled),
html[data-theme="clinical-night"] .clinical-template-config .btn-outline:hover:not(:disabled),
html[data-theme="clinical-night"] .clinical-template-config .btn-soft:hover:not(:disabled),
html[data-theme="clinical-night"] .clinical-template-config .btn-ghost:hover:not(:disabled),
html[data-theme="clinical-night"] .clinical-template-config .btn-icon:hover:not(:disabled) {
  box-shadow: 0 8px 16px rgba(2, 6, 23, .24);
}

html[data-theme="clinical-night"] .clinical-template-config .unsaved-indicator {
  color: #FDE68A;
  background: rgba(251, 191, 36, .12);
  border-color: rgba(251, 191, 36, .35);
}

@media (min-width: 1280px) {
  .editor-grid:not(.preview-hidden) {
    grid-template-columns:
      minmax(240px, .3fr)
      minmax(360px, 1fr)
      minmax(220px, .28fr);
  }

  .editor-grid.preview-hidden {
    grid-template-columns: minmax(260px, .32fr) minmax(0, 1fr);
  }
}

@media (max-width: 1279px) {
  .preview-pane {
    grid-column: 1 / -1;
    position: static;
  }
}

@media (max-width: 900px) {
  .section-header,
  .section-card-head,
  .detail-head {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .editor-grid,
  .editor-grid.preview-hidden {
    grid-template-columns: 1fr;
  }

  .preview-pane {
    grid-column: auto;
  }

  .template-status {
    align-items: flex-start;
    flex-direction: column;
  }

  .sections-pane,
  .preview-pane {
    position: static;
    max-height: none;
  }

  .header-actions,
  .section-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .section-header,
  .editor-grid,
  .template-status,
  .help-guide {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .help-guide {
    margin-left: 1rem;
    margin-right: 1rem;
  }

  .switch-grid {
    grid-template-columns: 1fr;
  }

  .summary-details,
  .guide-steps {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
  }

  .pane-header,
  .fields-toolbar,
  .detail-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .section-actions,
  .header-actions {
    width: 100%;
  }

  .section-actions > button,
  .header-actions > button {
    flex: 1 1 auto;
  }

  .preview-fields div {
    align-items: flex-start;
    flex-direction: column;
    gap: .25rem;
  }
}
</style>
