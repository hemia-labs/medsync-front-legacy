<template>
  <div class="businesses-page">
    <section class="intro-panel">
      <div>
        <p class="eyebrow">Administracion global</p>
        <h1>Negocios</h1>
        <span>
          Consulta administrativa de negocios, consultorios y clinicas registrados en el SaaS.
          La paginacion y filtros se resuelven desde backend.
        </span>
      </div>

      <v-btn class="create-button" color="primary" depressed @click="openCreateDialog">
        <v-icon left>mdi-domain-plus</v-icon>
        Crear negocio
      </v-btn>
    </section>

    <section class="filters-panel" aria-label="Filtros de negocios">
      <v-text-field
        v-model="filters.search"
        label="Buscar negocio"
        prepend-inner-icon="mdi-magnify"
        outlined
        dense
        hide-details
        clearable
        @input="onSearchInput"
        @click:clear="onSearchClear"
      />

      <v-select
        v-model="filters.active"
        :items="activeOptions"
        label="Activo"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="filters.status"
        :items="statusOptions"
        label="Estado tecnico"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="filters.subscriptionStatus"
        :items="subscriptionStatusFilterOptions"
        label="Estado SaaS"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="filters.trialState"
        :items="trialStateOptions"
        label="Trial"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="filters.plan"
        :items="planOptions"
        label="Plan"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="pagination.pageSize"
        :items="pageSizeOptions"
        label="Por pagina"
        outlined
        dense
        hide-details
        @change="onPageSizeChange"
      />
    </section>

    <section class="table-panel" aria-label="Listado paginado de negocios">
      <div class="table-toolbar">
        <div>
          <strong>{{ pagination.total }}</strong>
          <span> negocios encontrados</span>
        </div>

        <v-btn text small color="primary" :loading="isLoading" @click="fetchBusinesses">
          <v-icon left small>mdi-refresh</v-icon>
          Actualizar
        </v-btn>
      </div>

      <v-alert v-if="errorMessage" type="error" dense text class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-progress-linear v-if="isLoading" indeterminate color="primary" height="3" />

      <div class="table-scroll">
        <table class="business-table">
          <thead>
            <tr>
              <th v-for="header in headers" :key="header.value">
                <button
                  v-if="header.sortable"
                  type="button"
                  class="sort-button"
                  @click="toggleSort(header.value)"
                >
                  <span>{{ header.text }}</span>
                  <v-icon small>{{ getSortIcon(header.value) }}</v-icon>
                </button>
                <span v-else>{{ header.text }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="business in businesses" :key="business.id_business">
              <td class="name-cell">{{ business.name || 'Sin nombre' }}</td>
              <td>
                <span class="status-chip">{{ getStatusLabel(business.status, business.active) }}</span>
              </td>
              <td>
                <span :class="getSubscriptionChipClass(business.subscription_status)">
                  {{ getSubscriptionStatusLabel(business.subscription_status) }}
                </span>
              </td>
              <td>
                <div class="plan-cell">
                  <strong>{{ getPlanLabel(business.plan, business) }}</strong>
                  <span>{{ business.plan || 'Sin codigo' }}</span>
                </div>
              </td>
              <td>{{ getTrialEndLabel(business) }}</td>
              <td>
                <span :class="['trial-text', business.is_trial_expired ? 'is-expired' : '']">
                  {{ getTrialDaysLabel(business) }}
                </span>
              </td>
              <td>
                <span :class="['operation-chip', business.is_operational ? 'is-operational' : 'is-blocked']">
                  {{ business.is_operational ? 'Operativo' : 'Bloqueado' }}
                </span>
              </td>
              <td>
                <span :class="['active-chip', business.active ? 'is-active' : 'is-inactive']">
                  {{ business.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>{{ getBusinessLicenseValue(business, 'professionals') }}</td>
              <td>{{ getBusinessLicenseValue(business, 'staffUsers') }}</td>
              <td>Pacientes ilimitados</td>
              <td>{{ formatNumber(business.total_users) }}</td>
              <td>{{ formatNumber(business.active_users) }}</td>
              <td>{{ formatDate(business.last_activity_at) }}</td>
              <td>{{ formatDate(business.created_at) }}</td>
              <td>{{ formatDate(business.updated_at) }}</td>
              <td class="actions-cell">
                <v-menu offset-y left>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn icon small :disabled="commercialDialog.isSaving || editDialog.isSaving" v-bind="attrs" v-on="on">
                      <v-icon small>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>

                  <v-list dense class="action-menu">
                    <v-list-item
                      v-for="action in getBusinessActions(business)"
                      :key="action.type"
                      :disabled="action.disabled"
                      @click="openBusinessAction(action.type, business)"
                    >
                      <v-list-item-icon>
                        <v-icon small>{{ action.icon }}</v-icon>
                      </v-list-item-icon>
                      <v-list-item-content>
                        <v-list-item-title>{{ action.label }}</v-list-item-title>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>

            <tr v-if="!isLoading && !businesses.length">
              <td colspan="17">
                <div class="empty-state">
                  <v-icon size="36">mdi-domain-off</v-icon>
                  <strong>No hay negocios para mostrar</strong>
                  <span>Ajusta la busqueda o los filtros para consultar otros resultados.</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <span>
          Pagina {{ pagination.page }} de {{ safeTotalPages }}
        </span>

        <v-pagination
          v-if="safeTotalPages > 1"
          v-model="pagination.page"
          :length="safeTotalPages"
          :total-visible="7"
          circle
          @input="onPageChange"
        />
      </div>
    </section>

    <v-dialog v-model="createDialog.show" persistent max-width="840">
      <v-card>
        <v-card-title>Crear negocio</v-card-title>
        <v-card-text>
          <v-alert v-if="createDialog.errors.length" type="error" dense text class="mb-4">
            <ul class="validation-list">
              <li v-for="error in createDialog.errors" :key="error">{{ error }}</li>
            </ul>
          </v-alert>

          <section class="form-section" aria-label="Datos del negocio">
            <div class="form-section-header">
              <v-icon color="primary">mdi-domain</v-icon>
              <div>
                <strong>Datos del negocio</strong>
                <span>Informacion administrativa del nuevo consultorio o tenant.</span>
              </div>
            </div>

            <div class="form-grid">
              <v-text-field
                v-model.trim="createForm.business.name"
                label="Nombre del negocio *"
                outlined
                dense
                :disabled="createDialog.isSaving"
              />
              <v-text-field
                v-model.trim="createForm.business.slug"
                label="Slug"
                outlined
                dense
                hint="Opcional. Si lo dejas vacio, backend lo generara."
                persistent-hint
                :disabled="createDialog.isSaving"
              />
              <v-text-field
                v-model.trim="createForm.business.legalName"
                label="Razon social"
                outlined
                dense
                :disabled="createDialog.isSaving"
              />
              <v-text-field
                v-model.trim="createForm.business.phone"
                label="Telefono"
                outlined
                dense
                :disabled="createDialog.isSaving"
              />
              <v-text-field
                v-model.trim="createForm.business.email"
                label="Correo"
                outlined
                dense
                :disabled="createDialog.isSaving"
              />
              <v-textarea
                v-model.trim="createForm.business.address"
                class="form-grid-full"
                label="Direccion"
                outlined
                dense
                rows="2"
                auto-grow
                :disabled="createDialog.isSaving"
              />
            </div>
          </section>

          <section class="form-section" aria-label="Estado SaaS">
            <div class="form-section-header">
              <v-icon color="primary">mdi-license</v-icon>
              <div>
                <strong>Estado SaaS</strong>
                <span>Define si el negocio inicia en prueba gratis o como cliente activo.</span>
              </div>
            </div>

            <div class="form-grid">
              <v-select
                v-model="createForm.business.subscriptionStatus"
                :items="subscriptionStatusOptions"
                label="Estado inicial"
                outlined
                dense
                :disabled="createDialog.isSaving"
              />
              <v-select
                v-model.trim="createForm.business.plan"
                :items="commercialPlanOptions"
                label="Plan"
                outlined
                dense
                :disabled="createDialog.isSaving"
              />
              <v-text-field
                v-if="createForm.business.subscriptionStatus === 'trial'"
                v-model.number="createForm.business.trialDays"
                label="Dias de prueba"
                outlined
                dense
                type="number"
                min="1"
                max="365"
                :disabled="createDialog.isSaving"
              />
              <div class="license-help form-grid-full">
                <v-icon small color="primary">mdi-information-outline</v-icon>
                <span v-if="createForm.business.subscriptionStatus === 'trial'">
                  El negocio tendra acceso completo durante el periodo de prueba. Al vencer, el acceso tenant sera bloqueado hasta cambiar su estado comercial.
                </span>
                <span v-else>
                  Usa este estado si el negocio ya es cliente pagado o debe operar sin periodo de prueba.
                </span>
              </div>
            </div>
          </section>

          <section class="form-section" aria-label="Admin inicial">
            <div class="form-section-header">
              <v-icon color="primary">mdi-account-tie</v-icon>
              <div>
                <strong>Admin inicial</strong>
                <span>Cuenta de acceso administrativa para operar el negocio.</span>
              </div>
            </div>

            <v-checkbox
              v-model="createForm.adminUser.create"
              label="Crear usuario administrador inicial"
              hide-details
              :disabled="createDialog.isSaving"
            />

            <div v-if="createForm.adminUser.create" class="form-grid admin-grid">
              <v-text-field
                v-model.trim="createForm.adminUser.name"
                label="Nombre del admin *"
                outlined
                dense
                :disabled="createDialog.isSaving"
              />
              <v-text-field
                v-model.trim="createForm.adminUser.telephone"
                label="Telefono de acceso *"
                outlined
                dense
                :disabled="createDialog.isSaving"
              />
              <v-text-field
                v-model.trim="createForm.adminUser.email"
                label="Correo de contacto *"
                type="email"
                autocomplete="email"
                required
                aria-required="true"
                hint="Obligatorio para contactar al administrador."
                persistent-hint
                :error-messages="createDialog.errors.filter(message => message.startsWith('El correo del administrador'))"
                outlined
                dense
                :disabled="createDialog.isSaving"
              />
              <v-text-field
                value="admin"
                label="Rol"
                outlined
                dense
                readonly
                disabled
              />
              <v-text-field
                v-model="createForm.adminUser.password"
                label="Contrasena temporal *"
                outlined
                dense
                type="password"
                autocomplete="new-password"
                :disabled="createDialog.isSaving"
              />
              <v-text-field
                v-model="createForm.adminUser.confirmPassword"
                label="Confirmar contrasena *"
                outlined
                dense
                type="password"
                autocomplete="new-password"
                :disabled="createDialog.isSaving"
              />
            </div>
          </section>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="createDialog.isSaving" @click="closeCreateDialog">Cancelar</v-btn>
          <v-btn color="primary" depressed :loading="createDialog.isSaving" @click="openCreateConfirmDialog">
            Revisar creacion
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="createConfirmDialog.show" persistent max-width="560">
      <v-card>
        <v-card-title>Confirmar alta de negocio</v-card-title>
        <v-card-text>
          <div class="confirm-summary">
            <strong>{{ createForm.business.name || 'Sin nombre' }}</strong>
            <span>Estado inicial: {{ getSubscriptionStatusLabel(createForm.business.subscriptionStatus) }}</span>
            <span>Plan: {{ getPlanLabel(createForm.business.plan) }}</span>
            <span v-if="createForm.business.subscriptionStatus === 'trial'">
              Trial: {{ createForm.business.trialDays || 60 }} dias, vence aprox. {{ estimatedTrialEndDate }}
            </span>
            <span>Admin inicial: {{ createForm.adminUser.create ? createForm.adminUser.name : 'No se creara en esta accion' }}</span>
          </div>
          <p class="confirm-message">
            Se creara el negocio y, si esta activado, un usuario administrador inicial. El usuario podra iniciar sesion con las credenciales definidas.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="createDialog.isSaving" @click="createConfirmDialog.show = false">Cancelar</v-btn>
          <v-btn color="primary" depressed :loading="createDialog.isSaving" @click="confirmCreateBusiness">
            Crear negocio
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editDialog.show" persistent max-width="760">
      <v-card>
        <v-card-title>Editar datos del negocio</v-card-title>
        <v-card-text>
          <v-alert v-if="editDialog.errors.length" type="error" dense text class="mb-4">
            <ul class="validation-list">
              <li v-for="error in editDialog.errors" :key="error">{{ error }}</li>
            </ul>
          </v-alert>

          <section class="form-section" aria-label="Datos administrativos del negocio">
            <div class="form-section-header">
              <v-icon color="primary">mdi-domain-edit</v-icon>
              <div>
                <strong>Datos administrativos</strong>
                <span>Esta edicion no modifica estado SaaS, plan, trial, suspension ni estado tecnico.</span>
              </div>
            </div>

            <div class="form-grid">
              <v-text-field
                v-model.trim="editForm.name"
                label="Nombre del negocio *"
                outlined
                dense
                :disabled="editDialog.isSaving"
              />
              <v-text-field
                v-model.trim="editForm.slug"
                label="Slug *"
                outlined
                dense
                hint="Minusculas, numeros y guiones. Sin espacios."
                persistent-hint
                :disabled="editDialog.isSaving"
              />
              <v-text-field
                v-model.trim="editForm.legalName"
                label="Razon social"
                outlined
                dense
                :disabled="editDialog.isSaving"
              />
              <v-text-field
                v-model.trim="editForm.phone"
                label="Telefono"
                outlined
                dense
                :disabled="editDialog.isSaving"
              />
              <v-text-field
                v-model.trim="editForm.email"
                label="Correo"
                outlined
                dense
                :disabled="editDialog.isSaving"
              />
              <v-textarea
                v-model.trim="editForm.address"
                class="form-grid-full"
                label="Direccion"
                outlined
                dense
                rows="2"
                auto-grow
                :disabled="editDialog.isSaving"
              />
            </div>
          </section>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="editDialog.isSaving" @click="closeEditDialog">Cancelar</v-btn>
          <v-btn color="primary" depressed :loading="editDialog.isSaving" @click="openEditConfirmDialog">
            Guardar cambios
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editConfirmDialog.show" persistent max-width="560">
      <v-card>
        <v-card-title>Confirmar edicion</v-card-title>
        <v-card-text>
          <div class="confirm-summary">
            <strong>{{ editForm.name || 'Negocio seleccionado' }}</strong>
            <span v-for="field in editChangedFields" :key="field">
              {{ getEditFieldLabel(field) }}: {{ getEditPreviewValue(field) }}
            </span>
          </div>
          <p class="confirm-message">
            Se actualizaran solo datos administrativos del negocio. Esta accion no cambia estado SaaS, plan, trial ni bloqueo tecnico.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="editDialog.isSaving" @click="editConfirmDialog.show = false">Cancelar</v-btn>
          <v-btn color="primary" depressed :loading="editDialog.isSaving" @click="confirmUpdateBusiness">
            Confirmar cambios
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="commercialDialog.show" persistent max-width="640">
      <v-card>
        <v-card-title>{{ getCommercialDialogTitle() }}</v-card-title>
        <v-card-text>
          <v-alert v-if="commercialDialog.errors.length" type="error" dense text class="mb-4">
            <ul class="validation-list">
              <li v-for="error in commercialDialog.errors" :key="error">{{ error }}</li>
            </ul>
          </v-alert>

          <div class="confirm-summary">
            <strong>{{ selectedBusinessName }}</strong>
            <span>Estado SaaS actual: {{ getSubscriptionStatusLabel(selectedBusinessStatus) }}</span>
            <span>Plan actual: {{ selectedBusinessPlan }}</span>
            <span v-if="commercialDialog.business && commercialDialog.business.subscription_status === 'trial'">
              Trial vence: {{ formatDate(commercialDialog.business.trial_ends_at) }}
            </span>
          </div>

          <p class="confirm-message">{{ getCommercialDialogDescription() }}</p>

          <v-textarea
            v-if="requiresReason(commercialDialog.type) || showsReason(commercialDialog.type)"
            v-model.trim="commercialForm.reason"
            :label="requiresReason(commercialDialog.type) ? 'Motivo *' : 'Motivo'"
            outlined
            dense
            rows="2"
            auto-grow
            :disabled="commercialDialog.isSaving"
          />

          <v-text-field
            v-if="commercialDialog.type === 'extend_trial'"
            v-model.number="commercialForm.days"
            label="Dias de extension *"
            type="number"
            min="1"
            :max="MAX_MANUAL_TRIAL_EXTENSION_DAYS"
            outlined
            dense
            :disabled="commercialDialog.isSaving"
          />

          <div v-if="commercialDialog.type === 'extend_trial'" class="license-help">
            <v-icon small color="primary">mdi-calendar-clock</v-icon>
            <span>Nueva fecha estimada: {{ getEstimatedExtendedTrialEnd() }}</span>
          </div>

          <v-select
            v-if="commercialDialog.type === 'change_plan'"
            v-model="commercialForm.plan"
            :items="commercialPlanOptions"
            label="Nuevo plan *"
            outlined
            dense
            :disabled="commercialDialog.isSaving"
          />

          <v-text-field
            v-if="commercialDialog.type === 'cancel'"
            v-model.trim="commercialForm.confirmText"
            label="Escribe CANCELAR para confirmar *"
            outlined
            dense
            :disabled="commercialDialog.isSaving"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="commercialDialog.isSaving" @click="closeCommercialDialog">Cancelar</v-btn>
          <v-btn
            :color="getCommercialActionColor()"
            depressed
            :loading="commercialDialog.isSaving"
            @click="confirmCommercialAction"
          >
            {{ getCommercialConfirmLabel() }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="licenseDialog.show" max-width="760">
      <v-card>
        <v-card-title>Resumen de licencia</v-card-title>
        <v-card-text>
          <v-alert v-if="licenseDialog.error" type="error" dense text class="mb-4">
            {{ licenseDialog.error }}
          </v-alert>

          <div v-if="licenseDialog.isLoading" class="license-loading">
            <v-progress-circular indeterminate color="primary" />
            <span>Cargando licencia...</span>
          </div>

          <div v-else-if="licenseSummary" class="license-summary">
            <section class="license-hero">
              <div>
                <p class="eyebrow">Plan actual</p>
                <h2>{{ licenseSummary.plan.name }}</h2>
                <span>{{ licenseSummary.plan.description }}</span>
              </div>
              <span v-if="licenseSummary.plan.recommended" class="recommended-chip">Mas recomendado</span>
            </section>

            <section class="license-grid" aria-label="Precios del plan">
              <div class="license-metric">
                <span>Precio publico</span>
                <strong>{{ licenseSummary.plan.publicLabel || formatMoney(licenseSummary.plan.monthlyPriceMxn) }}</strong>
              </div>
              <div class="license-metric">
                <span>Precio fundador</span>
                <strong>{{ licenseSummary.plan.founderLabel || formatMoney(licenseSummary.plan.founderMonthlyPriceMxn) }}</strong>
              </div>
              <div class="license-metric">
                <span>Pacientes</span>
                <strong>Ilimitados con uso razonable</strong>
              </div>
            </section>

            <section class="license-limits" aria-label="Uso de licencia">
              <div
                v-for="item in getLicenseLimitItems()"
                :key="item.key"
                :class="['limit-row', item.exceeded ? 'is-exceeded' : '']"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small v-if="item.key !== 'patients'">
                  Base {{ item.baseLimit }} + extra {{ item.extra }} = limite efectivo {{ item.limit }}
                </small>
              </div>
            </section>

            <section class="license-overrides" aria-label="Extras manuales">
              <div class="license-overrides-header">
                <div>
                  <strong>Extras manuales</strong>
                  <span>Administrados solo por Super Admin. No generan cobro automatico.</span>
                </div>
                <v-btn small color="primary" depressed @click="openLicenseOverrideDialog">
                  <v-icon left small>mdi-plus-box-multiple-outline</v-icon>
                  Editar extras
                </v-btn>
              </div>
              <div class="override-grid">
                <div>
                  <span>Profesionales extra</span>
                  <strong>{{ licenseOverrideValue('extraProfessionals') }}</strong>
                </div>
                <div>
                  <span>Usuarios internos extra</span>
                  <strong>{{ licenseOverrideValue('extraAuxiliaryUsers') }}</strong>
                </div>
                <div>
                  <span>Vigencia</span>
                  <strong>{{ licenseOverrideValidityLabel }}</strong>
                </div>
              </div>
              <v-alert v-if="licenseSummary.overrides && licenseSummary.overrides.expired" type="warning" dense text class="mt-3">
                Los extras existen, pero su vigencia ya vencio y no se suman al limite efectivo.
              </v-alert>
            </section>

            <v-alert v-if="hasExceededLicenseLimit" type="warning" dense text>
              Este negocio supera los limites incluidos de su plan. La operacion existente no se bloquea, pero nuevas altas pueden quedar detenidas.
              <ul class="exceeded-limit-list">
                <li v-for="item in exceededLicenseLimitItems" :key="item.key">
                  {{ item.label }}: {{ item.used }} usados, limite {{ item.limit }}, restante {{ item.remaining }}.
                </li>
              </ul>
            </v-alert>

            <section class="license-features" aria-label="Capacidades del plan">
              <strong>Capacidades</strong>
              <ul>
                <li v-for="feature in licenseSummary.plan.features" :key="feature">{{ feature }}</li>
              </ul>
              <span v-if="!licenseSummary.plan.features.length">Sin capacidades configuradas para este plan.</span>
            </section>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="licenseDialog.isLoading" @click="closeLicenseDialog">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="licenseOverrideDialog.show" persistent max-width="680">
      <v-card>
        <v-card-title>Editar extras de licencia</v-card-title>
        <v-card-text>
          <v-alert v-if="licenseOverrideDialog.errors.length" type="error" dense text class="mb-4">
            <ul class="validation-list">
              <li v-for="error in licenseOverrideDialog.errors" :key="error">{{ error }}</li>
            </ul>
          </v-alert>

          <div class="license-help mb-4">
            <v-icon small color="primary">mdi-information-outline</v-icon>
            <span>
              Estos extras son manuales e informativos. No conectan pagos, no borran usuarios y no modifican datos clinicos.
            </span>
          </div>

          <div class="form-grid">
            <v-text-field
              v-model.number="licenseOverrideForm.extra_professionals"
              type="number"
              min="0"
              max="50"
              label="Profesionales extra"
              outlined
              dense
              :disabled="licenseOverrideDialog.isSaving"
            />
            <v-text-field
              v-model.number="licenseOverrideForm.extra_auxiliary_users"
              type="number"
              min="0"
              max="100"
              label="Usuarios internos extra"
              outlined
              dense
              :disabled="licenseOverrideDialog.isSaving"
            />
            <v-text-field
              v-model="licenseOverrideForm.valid_until"
              type="date"
              label="Vigencia opcional"
              outlined
              dense
              :disabled="licenseOverrideDialog.isSaving"
            />
            <v-textarea
              v-model.trim="licenseOverrideForm.reason"
              class="form-grid-full"
              label="Motivo"
              outlined
              dense
              rows="2"
              auto-grow
              :disabled="licenseOverrideDialog.isSaving"
            />
          </div>

          <div class="confirm-summary mt-3">
            <strong>{{ licenseDialog.business ? licenseDialog.business.name : 'Negocio seleccionado' }}</strong>
            <span>Profesionales extra: {{ Number(licenseOverrideForm.extra_professionals || 0) }}</span>
            <span>Usuarios internos extra: {{ Number(licenseOverrideForm.extra_auxiliary_users || 0) }}</span>
            <span>Vigencia: {{ licenseOverrideForm.valid_until || 'Sin vencimiento' }}</span>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="licenseOverrideDialog.isSaving" @click="closeLicenseOverrideDialog">Cancelar</v-btn>
          <v-btn color="primary" depressed :loading="licenseOverrideDialog.isSaving" @click="confirmLicenseOverrideUpdate">
            Guardar extras
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4200">
      {{ snackbar.text }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
import { DASuperAdminService } from '@/services/context/core-proccess-context';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_DIR = 'desc';
const MAX_MANUAL_TRIAL_EXTENSION_DAYS = 30;
const PLAN_LABELS = {
  basic: 'Individual',
  pro: 'Profesional',
  enterprise: 'Clinica'
};

const ALLOWED_SORTS = [
  'name',
  'active',
  'status',
  'subscription_status',
  'trial_ends_at',
  'plan',
  'created_at',
  'updated_at',
  'total_users',
  'active_users',
  'last_activity_at'
];

export default {
  data: function() {
    return {
      MAX_MANUAL_TRIAL_EXTENSION_DAYS,
      businesses: [],
      isLoading: false,
      errorMessage: '',
      searchTimer: null,
      filters: {
        search: '',
        active: '',
        status: '',
        subscriptionStatus: '',
        trialState: '',
        plan: ''
      },
      createDialog: {
        show: false,
        isSaving: false,
        errors: []
      },
      createConfirmDialog: {
        show: false
      },
      createForm: this.getEmptyCreateForm(),
      editDialog: {
        show: false,
        business: null,
        isSaving: false,
        errors: []
      },
      editConfirmDialog: {
        show: false
      },
      editForm: this.getEmptyEditForm(),
      commercialDialog: {
        show: false,
        type: '',
        business: null,
        isSaving: false,
        errors: []
      },
      commercialForm: this.getEmptyCommercialForm(),
      licenseDialog: {
        show: false,
        business: null,
        isLoading: false,
        error: '',
        summary: null
      },
      licenseOverrideDialog: {
        show: false,
        isSaving: false,
        errors: []
      },
      licenseOverrideForm: this.getEmptyLicenseOverrideForm(),
      snackbar: {
        show: false,
        color: 'success',
        text: ''
      },
      pagination: {
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 0
      },
      sortBy: DEFAULT_SORT_BY,
      sortDir: DEFAULT_SORT_DIR,
      activeOptions: [
        { text: 'Todos', value: '' },
        { text: 'Activos', value: 'true' },
        { text: 'Inactivos', value: 'false' }
      ],
      statusOptions: [
        { text: 'Todos', value: '' },
        { text: 'active', value: 'active' },
        { text: 'inactive', value: 'inactive' },
        { text: 'suspended', value: 'suspended' },
        { text: 'trial', value: 'trial' }
      ],
      subscriptionStatusOptions: [
        { text: 'Prueba gratis', value: 'trial' },
        { text: 'Activo', value: 'active' }
      ],
      subscriptionStatusFilterOptions: [
        { text: 'Todos', value: '' },
        { text: 'Prueba gratis', value: 'trial' },
        { text: 'Activo', value: 'active' },
        { text: 'Pago pendiente', value: 'past_due' },
        { text: 'Suspendido', value: 'suspended' },
        { text: 'Cancelado', value: 'cancelled' }
      ],
      trialStateOptions: [
        { text: 'Todos', value: '' },
        { text: 'Trial vigente', value: 'active' },
        { text: 'Trial vencido', value: 'expired' },
        { text: 'Proximo a vencer', value: 'expiring_soon' }
      ],
      planOptions: [
        { text: 'Todos', value: '' },
        { text: 'Individual', value: 'basic' },
        { text: 'Profesional', value: 'pro' },
        { text: 'Clinica', value: 'enterprise' }
      ],
      commercialPlanOptions: [
        { text: 'Individual', value: 'basic' },
        { text: 'Profesional', value: 'pro' },
        { text: 'Clinica', value: 'enterprise' }
      ],
      pageSizeOptions: [10, 20, 50, 100],
      headers: [
        { text: 'Nombre', value: 'name', sortable: true },
        { text: 'Estado tecnico', value: 'status', sortable: true },
        { text: 'Estado SaaS', value: 'subscription_status', sortable: true },
        { text: 'Plan', value: 'plan', sortable: true },
        { text: 'Trial vence', value: 'trial_ends_at', sortable: true },
        { text: 'Dias restantes', value: 'trial_days_remaining', sortable: false },
        { text: 'Operativo', value: 'is_operational', sortable: false },
        { text: 'Activo', value: 'active', sortable: true },
        { text: 'Profesionales', value: 'license_professionals', sortable: false },
        { text: 'Usuarios internos', value: 'license_staff_users', sortable: false },
        { text: 'Pacientes', value: 'license_patients', sortable: false },
        { text: 'Usuarios totales', value: 'total_users', sortable: true },
        { text: 'Usuarios activos', value: 'active_users', sortable: true },
        { text: 'Ultima actividad', value: 'last_activity_at', sortable: true },
        { text: 'Creado', value: 'created_at', sortable: true },
        { text: 'Actualizado', value: 'updated_at', sortable: true },
        { text: 'Acciones', value: 'actions', sortable: false }
      ]
    };
  },

  computed: {
    safeTotalPages: function() {
      return Math.max(Number(this.pagination.totalPages) || 0, 1);
    },

    estimatedTrialEndDate: function() {
      const days = Number(this.createForm.business.trialDays) || 60;
      const date = new Date();
      date.setDate(date.getDate() + days);

      return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    },

    selectedBusinessName: function() {
      return this.commercialDialog.business && this.commercialDialog.business.name
        ? this.commercialDialog.business.name
        : 'Negocio seleccionado';
    },

    selectedBusinessStatus: function() {
      return this.commercialDialog.business && this.commercialDialog.business.subscription_status
        ? this.commercialDialog.business.subscription_status
        : 'unknown';
    },

    selectedBusinessPlan: function() {
      return this.commercialDialog.business && this.commercialDialog.business.plan
        ? this.getPlanLabel(this.commercialDialog.business.plan, this.commercialDialog.business)
        : 'Sin plan';
    },

    licenseSummary: function() {
      return this.licenseDialog.summary;
    },

    hasExceededLicenseLimit: function() {
      const limits = this.licenseSummary && this.licenseSummary.limits ? this.licenseSummary.limits : {};
      return ['professionals', 'staffUsers'].some((key) => {
        return limits[key] && limits[key].exceeded;
      });
    },

    exceededLicenseLimitItems: function() {
      return this.getLicenseLimitItems().filter((item) => item.exceeded);
    },

    licenseOverrideValidityLabel: function() {
      const overrides = this.licenseSummary && this.licenseSummary.overrides ? this.licenseSummary.overrides : {};
      if(!overrides.validUntil && !overrides.valid_until) {
        return 'Sin vencimiento';
      }

      const label = this.formatDate(overrides.validUntil || overrides.valid_until);
      return overrides.expired ? `${label} (vencido)` : label;
    },

    editChangedFields: function() {
      const original = this.editDialog.business || {};
      const current = this.normalizeEditForm(this.editForm);
      const previous = this.normalizeEditBusiness(original);

      return ['name', 'slug', 'legalName', 'email', 'phone', 'address'].filter((field) => {
        return String(current[field] || '') !== String(previous[field] || '');
      });
    }
  },

  mounted: function() {
    this.fetchBusinesses();
  },

  beforeDestroy: function() {
    if(this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  },

  methods: {
    getEmptyCreateForm: function() {
      return {
        business: {
          name: '',
          slug: '',
          legalName: '',
          phone: '',
          email: '',
          address: '',
          status: 'active',
          active: true,
          subscriptionStatus: 'trial',
          trialDays: 60,
          plan: 'basic'
        },
        adminUser: {
          create: true,
          name: '',
          email: '',
          telephone: '',
          password: '',
          confirmPassword: '',
          role: 'admin'
        }
      };
    },

    getEmptyEditForm: function() {
      return {
        name: '',
        slug: '',
        legalName: '',
        email: '',
        phone: '',
        address: ''
      };
    },

    getEmptyCommercialForm: function() {
      return {
        reason: '',
        confirmText: '',
        days: 30,
        plan: 'basic'
      };
    },

    getEmptyLicenseOverrideForm: function() {
      return {
        extra_professionals: 0,
        extra_auxiliary_users: 0,
        reason: '',
        valid_until: ''
      };
    },

    buildParams: function() {
      return {
        page: this.pagination.page,
        pageSize: this.pagination.pageSize,
        search: this.filters.search,
        active: this.filters.active,
        status: this.filters.status,
        subscriptionStatus: this.filters.subscriptionStatus,
        trialState: this.filters.trialState,
        plan: this.filters.plan,
        sortBy: ALLOWED_SORTS.includes(this.sortBy) ? this.sortBy : DEFAULT_SORT_BY,
        sortDir: this.sortDir === 'asc' ? 'asc' : 'desc'
      };
    },

    openCreateDialog: function() {
      this.createDialog = {
        show: true,
        isSaving: false,
        errors: []
      };
      this.createConfirmDialog.show = false;
    },

    closeCreateDialog: function() {
      if(this.createDialog.isSaving) {
        return;
      }

      this.createDialog.show = false;
      this.createConfirmDialog.show = false;
      this.createDialog.errors = [];
    },

    openCreateConfirmDialog: function() {
      if(!this.validateCreateForm()) {
        return;
      }

      this.createConfirmDialog.show = true;
    },

    validateCreateForm: function() {
      const errors = [];
      const business = this.createForm.business;
      const adminUser = this.createForm.adminUser;

      if(!business.name || !business.name.trim()) {
        errors.push('El nombre del negocio es obligatorio.');
      }

      if(business.email && !this.isValidEmail(business.email)) {
        errors.push('El correo del negocio no tiene un formato valido.');
      }

      if(!['trial', 'active'].includes(business.subscriptionStatus)) {
        errors.push('El estado inicial debe ser prueba gratis o activo.');
      }

      if(!['basic', 'pro', 'enterprise'].includes(business.plan)) {
        errors.push('Selecciona un plan valido.');
      }

      if(business.subscriptionStatus === 'trial') {
        const trialDays = Number(business.trialDays);

        if(!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 365) {
          errors.push('Los dias de prueba deben ser un entero entre 1 y 365.');
        }
      }

      if(adminUser.create) {
        if(!adminUser.name || !adminUser.name.trim()) {
          errors.push('El nombre del administrador inicial es obligatorio.');
        }

        if(!adminUser.telephone || !adminUser.telephone.trim()) {
          errors.push('El telefono de acceso del administrador es obligatorio.');
        }

        if(!adminUser.email || !adminUser.email.trim()) {
          errors.push('El correo del administrador es obligatorio como dato de contacto.');
        } else if(adminUser.email.trim().length > 254 || !this.isValidEmail(adminUser.email)) {
          errors.push('El correo del administrador no tiene un formato valido.');
        }

        if(!adminUser.password) {
          errors.push('La contrasena temporal del administrador es obligatoria.');
        }

        if(adminUser.password && adminUser.password.length < 8) {
          errors.push('La contrasena temporal debe tener al menos 8 caracteres.');
        }

        if(!adminUser.confirmPassword) {
          errors.push('La confirmacion de contrasena es obligatoria.');
        } else if(adminUser.password !== adminUser.confirmPassword) {
          errors.push('La confirmacion de contrasena no coincide.');
        }

        if(adminUser.role !== 'admin') {
          errors.push('El rol del administrador inicial debe ser admin.');
        }
      }

      this.createDialog.errors = errors;
      return errors.length === 0;
    },

    isValidEmail: function(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
    },

    isValidSlug: function(value) {
      return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || '').trim());
    },

    isValidPhone: function(value) {
      const phone = String(value || '').trim();
      return phone.length >= 6 && phone.length <= 50 && /^[0-9+().\-\s]+$/.test(phone);
    },

    cleanPayloadValue: function(value) {
      if(value === undefined || value === null) {
        return undefined;
      }

      if(typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? undefined : trimmed;
      }

      return value;
    },

    buildCreatePayload: function() {
      const business = this.createForm.business;
      const adminUser = this.createForm.adminUser;
      const payloadBusiness = {
        name: this.cleanPayloadValue(business.name),
        slug: this.cleanPayloadValue(business.slug),
        legalName: this.cleanPayloadValue(business.legalName),
        phone: this.cleanPayloadValue(business.phone),
        email: this.cleanPayloadValue(business.email),
        address: this.cleanPayloadValue(business.address),
        status: 'active',
        active: true,
        plan: this.cleanPayloadValue(business.plan) || 'basic',
        subscription_status: business.subscriptionStatus === 'active' ? 'active' : 'trial'
      };

      if(payloadBusiness.subscription_status === 'trial') {
        payloadBusiness.trial_days = Number(business.trialDays) || 60;
      }

      Object.keys(payloadBusiness).forEach((key) => {
        if(payloadBusiness[key] === undefined) {
          delete payloadBusiness[key];
        }
      });

      if(!adminUser.create) {
        return {
          business: payloadBusiness,
          adminUser: {
            create: false
          }
        };
      }

      const payloadAdmin = {
        create: true,
        name: this.cleanPayloadValue(adminUser.name),
        email: this.cleanPayloadValue(adminUser.email),
        telephone: this.cleanPayloadValue(adminUser.telephone),
        password: adminUser.password,
        role: 'admin'
      };

      Object.keys(payloadAdmin).forEach((key) => {
        if(payloadAdmin[key] === undefined) {
          delete payloadAdmin[key];
        }
      });

      return {
        business: payloadBusiness,
        adminUser: payloadAdmin
      };
    },

    confirmCreateBusiness: async function() {
      if(!this.validateCreateForm()) {
        this.createConfirmDialog.show = false;
        return;
      }

      this.createDialog.isSaving = true;
      this.createDialog.errors = [];

      const response = await DASuperAdminService.createBusiness(this.buildCreatePayload());

      if(response && response.success) {
        const createdAdmin = response.data && response.data.adminUser;
        const createdBusiness = response.data && response.data.business ? response.data.business : {};
        const licenseMessage = createdBusiness.subscription_status === 'trial'
          ? ` Trial configurado por ${this.createForm.business.trialDays || 60} dias.`
          : ' Negocio creado como activo.';
        this.showSnackbar(
          'success',
          `Negocio creado correctamente.${licenseMessage}${createdAdmin ? ' Admin inicial creado correctamente.' : ''}`
        );
        this.createConfirmDialog.show = false;
        this.createDialog.show = false;
        this.createForm = this.getEmptyCreateForm();
        this.pagination.page = 1;
        await this.fetchBusinesses();
      } else {
        this.createConfirmDialog.show = false;
        this.handleCreateError(response);
      }

      this.createDialog.isSaving = false;
    },

    handleCreateError: function(response) {
      const status = response && Number(response.status);

      if(status === 400) {
        this.createDialog.errors = [response && response.message
          ? response.message
          : 'Revisa los datos del formulario antes de continuar.'];
        return;
      }

      if(status === 401) {
        this.createDialog.errors = ['Tu sesion expiro. Vuelve a iniciar sesion para continuar.'];
        window.setTimeout(() => this.$router.push({ name: 'login' }).catch(() => {}), 1200);
        return;
      }

      if(status === 403) {
        this.createDialog.errors = ['No tienes permiso para crear negocios.'];
        return;
      }

      if(status === 409) {
        this.createDialog.errors = [response && response.message
          ? response.message
          : 'Ya existe un negocio con esos datos.'];
        return;
      }

      this.createDialog.errors = [response && response.message
        ? response.message
        : 'No fue posible crear el negocio. Intenta nuevamente.'];
    },

    normalizeEditBusiness: function(business) {
      return {
        name: business && business.name ? business.name : '',
        slug: business && business.slug ? business.slug : '',
        legalName: business && (business.legal_name || business.legalName) ? (business.legal_name || business.legalName) : '',
        email: business && business.email ? business.email : '',
        phone: business && business.phone ? business.phone : '',
        address: business && business.address ? business.address : ''
      };
    },

    normalizeEditForm: function(form) {
      return {
        name: String(form.name || '').trim(),
        slug: String(form.slug || '').trim(),
        legalName: String(form.legalName || '').trim(),
        email: String(form.email || '').trim(),
        phone: String(form.phone || '').trim(),
        address: String(form.address || '').trim()
      };
    },

    openEditDialog: function(business) {
      this.editDialog = {
        show: true,
        business,
        isSaving: false,
        errors: []
      };
      this.editConfirmDialog.show = false;
      this.editForm = this.normalizeEditBusiness(business);
    },

    closeEditDialog: function() {
      if(this.editDialog.isSaving) {
        return;
      }

      this.editDialog = {
        show: false,
        business: null,
        isSaving: false,
        errors: []
      };
      this.editConfirmDialog.show = false;
      this.editForm = this.getEmptyEditForm();
    },

    validateEditForm: function() {
      const errors = [];
      const form = this.normalizeEditForm(this.editForm);

      if(!this.editDialog.business || !this.editDialog.business.id_business) {
        errors.push('No se encontro el negocio seleccionado.');
      }

      if(!form.name) {
        errors.push('El nombre del negocio es obligatorio.');
      }

      if(!form.slug) {
        errors.push('El slug es obligatorio.');
      } else if(!this.isValidSlug(form.slug)) {
        errors.push('El slug debe estar en minusculas, sin espacios y usar solo letras, numeros y guiones.');
      }

      if(form.email && !this.isValidEmail(form.email)) {
        errors.push('El correo del negocio no tiene un formato valido.');
      }

      if(form.phone && !this.isValidPhone(form.phone)) {
        errors.push('El telefono debe tener entre 6 y 50 caracteres y usar solo numeros, espacios o signos telefonicos.');
      }

      if(!this.editChangedFields.length) {
        errors.push('No hay cambios administrativos para guardar.');
      }

      this.editDialog.errors = errors;
      return errors.length === 0;
    },

    openEditConfirmDialog: function() {
      if(!this.validateEditForm()) {
        return;
      }

      this.editConfirmDialog.show = true;
    },

    buildEditPayload: function() {
      const form = this.normalizeEditForm(this.editForm);
      const payload = {};

      this.editChangedFields.forEach((field) => {
        if(field === 'legalName') {
          payload.legalName = this.cleanPayloadValue(form.legalName) || null;
          return;
        }

        if(['email', 'phone', 'address'].includes(field)) {
          payload[field] = this.cleanPayloadValue(form[field]) || null;
          return;
        }

        payload[field] = form[field];
      });

      return payload;
    },

    confirmUpdateBusiness: async function() {
      if(!this.validateEditForm()) {
        this.editConfirmDialog.show = false;
        return;
      }

      this.editDialog.isSaving = true;
      this.editDialog.errors = [];

      const response = await DASuperAdminService.updateBusiness(
        this.editDialog.business.id_business,
        this.buildEditPayload()
      );

      if(response && response.success) {
        this.showSnackbar('success', 'Datos del negocio actualizados correctamente.');
        this.editDialog.isSaving = false;
        this.closeEditDialog();
        await this.fetchBusinesses();
      } else {
        this.editConfirmDialog.show = false;
        this.handleEditError(response);
        this.editDialog.isSaving = false;
      }
    },

    handleEditError: function(response) {
      const status = response && Number(response.status);

      if(status === 401) {
        this.editDialog.errors = ['Tu sesion expiro. Vuelve a iniciar sesion para continuar.'];
        window.setTimeout(() => this.$router.push({ name: 'login' }).catch(() => {}), 1200);
        return;
      }

      if(status === 403) {
        this.editDialog.errors = ['No tienes permiso para editar negocios.'];
        return;
      }

      if(status === 404) {
        this.editDialog.errors = ['El negocio seleccionado no fue encontrado.'];
        return;
      }

      if(status === 400 || status === 409) {
        this.editDialog.errors = [response && response.message
          ? response.message
          : 'Revisa los datos antes de continuar.'];
        return;
      }

      this.editDialog.errors = [response && response.message
        ? response.message
        : 'No fue posible actualizar el negocio.'];
    },

    getEditFieldLabel: function(field) {
      const labels = {
        name: 'Nombre',
        slug: 'Slug',
        legalName: 'Razon social',
        email: 'Correo',
        phone: 'Telefono',
        address: 'Direccion'
      };

      return labels[field] || field;
    },

    getEditPreviewValue: function(field) {
      const form = this.normalizeEditForm(this.editForm);
      return form[field] || 'Sin registro';
    },

    showSnackbar: function(color, text) {
      this.snackbar = {
        show: true,
        color,
        text
      };
    },

    getPlanLabel: function(planCode, business = null) {
      if(business && business.plan_label) {
        return business.plan_label;
      }

      return PLAN_LABELS[planCode] || 'Plan desconocido';
    },

    formatMoney: function(value) {
      if(value === null || value === undefined || value === '') {
        return 'Sin precio configurado';
      }

      return `$${Number(value || 0).toLocaleString('es-MX')} MXN + IVA / mes`;
    },

    openLicenseDialog: async function(business) {
      this.licenseDialog = {
        show: true,
        business,
        isLoading: true,
        error: '',
        summary: null
      };

      const response = await DASuperAdminService.getBusinessLicenseSummary(business.id_business);

      if(response && response.success) {
        this.licenseDialog.summary = response.data || null;
      } else {
        this.licenseDialog.error = this.getLicenseErrorMessage(response);
      }

      this.licenseDialog.isLoading = false;
    },

    closeLicenseDialog: function() {
      if(this.licenseDialog.isLoading) {
        return;
      }

      this.closeLicenseOverrideDialog();
      this.licenseDialog = {
        show: false,
        business: null,
        isLoading: false,
        error: '',
        summary: null
      };
    },

    openLicenseOverrideDialog: function() {
      const overrides = this.licenseSummary && this.licenseSummary.overrides ? this.licenseSummary.overrides : {};
      this.licenseOverrideForm = {
        extra_professionals: Number(overrides.extra_professionals !== undefined ? overrides.extra_professionals : overrides.extraProfessionals || 0),
        extra_auxiliary_users: Number(overrides.extra_auxiliary_users !== undefined ? overrides.extra_auxiliary_users : overrides.extraAuxiliaryUsers || 0),
        reason: overrides.reason || '',
        valid_until: this.formatDateForInput(overrides.valid_until || overrides.validUntil)
      };
      this.licenseOverrideDialog = {
        show: true,
        isSaving: false,
        errors: []
      };
    },

    closeLicenseOverrideDialog: function() {
      if(this.licenseOverrideDialog.isSaving) {
        return;
      }

      this.licenseOverrideDialog = {
        show: false,
        isSaving: false,
        errors: []
      };
      this.licenseOverrideForm = this.getEmptyLicenseOverrideForm();
    },

    validateLicenseOverrideForm: function() {
      const errors = [];
      const fields = [
        { key: 'extra_professionals', label: 'Profesionales extra', max: 50 },
        { key: 'extra_auxiliary_users', label: 'Usuarios internos extra', max: 100 }
      ];

      fields.forEach((field) => {
        const value = Number(this.licenseOverrideForm[field.key]);
        if(!Number.isInteger(value) || value < 0 || value > field.max) {
          errors.push(`${field.label} debe ser un entero entre 0 y ${field.max}.`);
        }
      });

      const hasExtras = fields.some((field) => Number(this.licenseOverrideForm[field.key]) > 0);
      if(hasExtras && !String(this.licenseOverrideForm.reason || '').trim()) {
        errors.push('El motivo es obligatorio cuando se asignan extras.');
      }

      this.licenseOverrideDialog.errors = errors;
      return errors.length === 0;
    },

    confirmLicenseOverrideUpdate: async function() {
      if(!this.validateLicenseOverrideForm()) {
        return;
      }

      const business = this.licenseDialog.business;
      if(!business || !business.id_business) {
        this.licenseOverrideDialog.errors = ['No se encontro el negocio seleccionado.'];
        return;
      }

      this.licenseOverrideDialog.isSaving = true;
      const response = await DASuperAdminService.updateBusinessLicenseOverrides(business.id_business, {
        extra_professionals: Number(this.licenseOverrideForm.extra_professionals || 0),
        extra_auxiliary_users: Number(this.licenseOverrideForm.extra_auxiliary_users || 0),
        reason: this.cleanPayloadValue(this.licenseOverrideForm.reason),
        valid_until: this.licenseOverrideForm.valid_until || null
      });

      if(response && response.success) {
        this.showSnackbar('success', 'Extras de licencia actualizados correctamente.');
        this.closeLicenseOverrideDialog();
        await this.reloadLicenseSummary();
        await this.fetchBusinesses();
      } else {
        this.licenseOverrideDialog.errors = [this.getLicenseErrorMessage(response)];
      }

      this.licenseOverrideDialog.isSaving = false;
    },

    reloadLicenseSummary: async function() {
      const business = this.licenseDialog.business;
      if(!business || !business.id_business) {
        return;
      }

      this.licenseDialog.isLoading = true;
      const response = await DASuperAdminService.getBusinessLicenseSummary(business.id_business);
      if(response && response.success) {
        this.licenseDialog.summary = response.data || null;
        this.licenseDialog.error = '';
      } else {
        this.licenseDialog.error = this.getLicenseErrorMessage(response);
      }
      this.licenseDialog.isLoading = false;
    },

    getLicenseErrorMessage: function(response) {
      const status = response && Number(response.status);

      if(status === 401) {
        return 'Tu sesion expiro. Vuelve a iniciar sesion para continuar.';
      }

      if(status === 403) {
        return 'No tienes permiso para consultar esta licencia.';
      }

      if(status === 404) {
        return 'El negocio seleccionado no fue encontrado.';
      }

      return response && response.message
        ? response.message
        : 'No fue posible cargar el resumen de licencia.';
    },

    formatLicenseLimit: function(limit) {
      if(!limit) {
        return 'Sin registro';
      }

      if(limit.limit === null || limit.limit === undefined) {
        return limit.fairUse ? 'Ilimitados con uso razonable' : 'Sin limite configurado';
      }

      return `${Number(limit.used || 0)} / ${Number(limit.limit || 0)}`;
    },

    getBusinessLicenseValue: function(business, resource) {
      const summary = business && business.license_summary ? business.license_summary : null;
      const limit = summary && summary[resource] ? summary[resource] : null;

      if(!limit) {
        return 'Sin registro';
      }

      return this.formatLicenseLimit(limit);
    },

    licenseOverrideValue: function(key) {
      const overrides = this.licenseSummary && this.licenseSummary.overrides ? this.licenseSummary.overrides : {};
      return Number(overrides[key] || 0);
    },

    licenseBaseLimitValue: function(resource) {
      const limits = this.licenseSummary && this.licenseSummary.planLimits ? this.licenseSummary.planLimits : {};
      if(resource === 'staffUsers' && limits.staffUsers === undefined) {
        return Number(limits.auxiliaryUsers || 0);
      }
      return Number(limits[resource] || 0);
    },

    licenseExtraValue: function(resource) {
      const overrides = this.licenseSummary && this.licenseSummary.overrides ? this.licenseSummary.overrides : {};
      const map = {
        professionals: 'extraProfessionals',
        staffUsers: 'extraAuxiliaryUsers',
        auxiliaryUsers: 'extraAuxiliaryUsers'
      };
      return overrides.expired ? 0 : Number(overrides[map[resource]] || 0);
    },

    getLicenseLimitItems: function() {
      const limits = this.licenseSummary && this.licenseSummary.limits ? this.licenseSummary.limits : {};
      const staffLimit = limits.staffUsers || limits.auxiliaryUsers || {};

      return [
        {
          key: 'professionals',
          label: 'Profesionales',
          value: this.formatLicenseLimit(limits.professionals),
          baseLimit: this.licenseBaseLimitValue('professionals'),
          extra: this.licenseExtraValue('professionals'),
          used: Number((limits.professionals && limits.professionals.used) || 0),
          limit: Number((limits.professionals && limits.professionals.limit) || 0),
          remaining: Number((limits.professionals && limits.professionals.remaining) || 0),
          exceeded: limits.professionals && limits.professionals.exceeded
        },
        {
          key: 'staffUsers',
          label: 'Usuarios internos',
          value: this.formatLicenseLimit(staffLimit),
          baseLimit: this.licenseBaseLimitValue('staffUsers'),
          extra: this.licenseExtraValue('staffUsers'),
          used: Number(staffLimit.used || 0),
          limit: Number(staffLimit.limit || 0),
          remaining: Number(staffLimit.remaining || 0),
          exceeded: staffLimit.exceeded
        },
        {
          key: 'patients',
          label: 'Pacientes',
          value: this.formatLicenseLimit(limits.patients),
          baseLimit: 'Ilimitados',
          extra: 'No aplica',
          limit: 'Ilimitados',
          exceeded: false
        }
      ];
    },

    getBusinessActions: function(business) {
      const status = business && business.subscription_status ? business.subscription_status : 'unknown';
      const actions = [
        { type: 'edit', label: 'Editar datos', icon: 'mdi-pencil-outline' },
        { type: 'license', label: 'Ver licencia', icon: 'mdi-card-account-details-outline' }
      ];

      if(status === 'trial') {
        actions.push({ type: 'extend_trial', label: 'Extender trial', icon: 'mdi-calendar-plus' });
        actions.push({ type: 'activate', label: 'Activar negocio', icon: 'mdi-check-decagram' });
      }

      if(['suspended', 'cancelled', 'past_due'].includes(status)) {
        actions.push({ type: 'reactivate', label: 'Reactivar negocio', icon: 'mdi-backup-restore' });
      }

      if(status !== 'past_due' && status !== 'cancelled') {
        actions.push({ type: 'past_due', label: 'Marcar pago pendiente', icon: 'mdi-alert-circle-outline' });
      }

      if(status !== 'suspended' && status !== 'cancelled') {
        actions.push({ type: 'suspend', label: 'Suspender negocio', icon: 'mdi-pause-octagon-outline' });
      }

      if(status !== 'cancelled') {
        actions.push({ type: 'cancel', label: 'Cancelar negocio', icon: 'mdi-cancel' });
      }

      actions.push({ type: 'change_plan', label: 'Cambiar plan', icon: 'mdi-tag-outline' });

      return actions;
    },

    openBusinessAction: function(type, business) {
      if(type === 'edit') {
        this.openEditDialog(business);
        return;
      }

      if(type === 'license') {
        this.openLicenseDialog(business);
        return;
      }

      this.openCommercialDialog(type, business);
    },

    openCommercialDialog: function(type, business) {
      this.commercialDialog = {
        show: true,
        type,
        business,
        isSaving: false,
        errors: []
      };
      this.commercialForm = this.getEmptyCommercialForm();
      this.commercialForm.plan = business && ['basic', 'pro', 'enterprise'].includes(business.plan) ? business.plan : 'basic';
    },

    closeCommercialDialog: function() {
      if(this.commercialDialog.isSaving) {
        return;
      }

      this.commercialDialog = {
        show: false,
        type: '',
        business: null,
        isSaving: false,
        errors: []
      };
      this.commercialForm = this.getEmptyCommercialForm();
    },

    getCommercialDialogTitle: function() {
      const titles = {
        extend_trial: 'Extender trial',
        activate: 'Activar negocio',
        past_due: 'Marcar pago pendiente',
        suspend: 'Suspender negocio',
        reactivate: 'Reactivar negocio',
        cancel: 'Cancelar negocio',
        change_plan: 'Cambiar plan'
      };

      return titles[this.commercialDialog.type] || 'Accion comercial';
    },

    getCommercialDialogDescription: function() {
      const descriptions = {
        extend_trial: 'Agrega dias al periodo de prueba. No se crean datos clinicos ni se modifica informacion de pacientes.',
        activate: 'El negocio quedara como cliente activo y podra operar mientras tambien este tecnicamente activo.',
        past_due: 'El negocio quedara marcado con pago pendiente. Actualmente este estado bloquea la operacion tenant.',
        suspend: 'El tenant quedara bloqueado para operar. No se borra el negocio, no se borran usuarios y no se borran datos.',
        reactivate: 'El negocio volvera a estado comercial activo y podra operar si tambien esta tecnicamente activo.',
        cancel: 'El tenant quedara bloqueado comercialmente. No se borra el negocio, no se borran usuarios y no se borran datos.',
        change_plan: 'Cambia solo el plan comercial. No modifica el estado SaaS ni el estado tecnico.'
      };

      return descriptions[this.commercialDialog.type] || 'Confirma la accion comercial.';
    },

    getCommercialConfirmLabel: function() {
      const labels = {
        extend_trial: 'Extender trial',
        activate: 'Activar',
        past_due: 'Marcar pago pendiente',
        suspend: 'Suspender',
        reactivate: 'Reactivar',
        cancel: 'Cancelar negocio',
        change_plan: 'Cambiar plan'
      };

      return labels[this.commercialDialog.type] || 'Confirmar';
    },

    getCommercialActionColor: function() {
      if(['suspend', 'cancel', 'past_due'].includes(this.commercialDialog.type)) {
        return 'error';
      }

      if(this.commercialDialog.type === 'change_plan') {
        return 'primary';
      }

      return 'success';
    },

    requiresReason: function(type) {
      return ['suspend', 'cancel', 'past_due'].includes(type);
    },

    showsReason: function(type) {
      return ['extend_trial', 'activate', 'reactivate', 'change_plan'].includes(type);
    },

    getEstimatedExtendedTrialEnd: function() {
      const business = this.commercialDialog.business;
      const days = Number(this.commercialForm.days);

      if(!business || !Number.isInteger(days) || days < 1 || days > MAX_MANUAL_TRIAL_EXTENSION_DAYS) {
        return 'Sin calculo disponible';
      }

      const now = new Date();
      const currentEnd = business.trial_ends_at ? new Date(business.trial_ends_at) : null;
      const baseDate = currentEnd && !Number.isNaN(currentEnd.getTime()) && currentEnd > now
        ? currentEnd
        : now;
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + days);

      return this.formatDate(nextDate);
    },

    validateCommercialAction: function() {
      const errors = [];
      const type = this.commercialDialog.type;
      const business = this.commercialDialog.business;

      if(!business || !business.id_business) {
        errors.push('No se encontro el negocio seleccionado.');
      }

      if(this.requiresReason(type) && !this.commercialForm.reason.trim()) {
        errors.push('El motivo es obligatorio para esta accion.');
      }

      if(type === 'cancel' && this.commercialForm.confirmText !== 'CANCELAR') {
        errors.push('Debes escribir CANCELAR para confirmar la cancelacion.');
      }

      if(type === 'extend_trial') {
        const days = Number(this.commercialForm.days);

        if(!Number.isInteger(days) || days < 1 || days > MAX_MANUAL_TRIAL_EXTENSION_DAYS) {
          errors.push(`Los dias de extension deben ser un entero entre 1 y ${MAX_MANUAL_TRIAL_EXTENSION_DAYS}.`);
        }

        if(business && business.subscription_status !== 'trial') {
          errors.push('Solo se puede extender el trial de negocios en prueba gratis.');
        }
      }

      if(type === 'change_plan' && !['basic', 'pro', 'enterprise'].includes(this.commercialForm.plan)) {
        errors.push('Selecciona un plan valido.');
      }

      this.commercialDialog.errors = errors;
      return errors.length === 0;
    },

    confirmCommercialAction: async function() {
      if(!this.validateCommercialAction()) {
        return;
      }

      const business = this.commercialDialog.business;
      const type = this.commercialDialog.type;
      this.commercialDialog.isSaving = true;
      this.commercialDialog.errors = [];

      let response = null;

      if(type === 'extend_trial') {
        response = await DASuperAdminService.extendBusinessTrial(business.id_business, {
          days: Number(this.commercialForm.days),
          reason: this.cleanPayloadValue(this.commercialForm.reason)
        });
      } else if(type === 'change_plan') {
        response = await DASuperAdminService.updateBusinessPlan(business.id_business, {
          plan: this.commercialForm.plan,
          reason: this.cleanPayloadValue(this.commercialForm.reason)
        });
      } else {
        const nextStatus = this.getNextCommercialStatus(type);
        response = await DASuperAdminService.updateBusinessSubscriptionStatus(business.id_business, {
          subscription_status: nextStatus,
          reason: this.cleanPayloadValue(this.commercialForm.reason)
        });
      }

      if(response && response.success) {
        this.showSnackbar('success', this.getCommercialSuccessMessage(type));
        this.closeCommercialDialog();
        await this.fetchBusinesses();
      } else {
        this.handleCommercialError(response);
      }

      this.commercialDialog.isSaving = false;
    },

    getNextCommercialStatus: function(type) {
      const statusByType = {
        activate: 'active',
        reactivate: 'active',
        past_due: 'past_due',
        suspend: 'suspended',
        cancel: 'cancelled'
      };

      return statusByType[type] || 'active';
    },

    getCommercialSuccessMessage: function(type) {
      const messages = {
        extend_trial: 'Trial extendido correctamente.',
        activate: 'Negocio activado correctamente.',
        past_due: 'Negocio marcado con pago pendiente.',
        suspend: 'Negocio suspendido correctamente.',
        reactivate: 'Negocio reactivado correctamente.',
        cancel: 'Negocio cancelado correctamente.',
        change_plan: 'Plan actualizado correctamente.'
      };

      return messages[type] || 'Accion comercial completada.';
    },

    handleCommercialError: function(response) {
      const status = response && Number(response.status);

      if(status === 401) {
        this.commercialDialog.errors = ['Tu sesion expiro. Vuelve a iniciar sesion para continuar.'];
        window.setTimeout(() => this.$router.push({ name: 'login' }).catch(() => {}), 1200);
        return;
      }

      if(status === 403) {
        this.commercialDialog.errors = ['No tienes permiso para ejecutar esta accion comercial.'];
        return;
      }

      if(status === 404) {
        this.commercialDialog.errors = ['El negocio seleccionado no fue encontrado.'];
        return;
      }

      if(status === 400) {
        this.commercialDialog.errors = [response && response.message
          ? response.message
          : 'Revisa los datos antes de continuar.'];
        return;
      }

      this.commercialDialog.errors = [response && response.message
        ? response.message
        : 'No fue posible completar la accion comercial.'];
    },

    fetchBusinesses: async function() {
      this.isLoading = true;
      this.errorMessage = '';

      const response = await DASuperAdminService.getBusinesses(this.buildParams());

      if(response && response.success) {
        const payload = response.data || {};
        const pagination = payload.pagination || {};

        this.businesses = Array.isArray(payload.data) ? payload.data : [];
        this.pagination = {
          page: Number(pagination.page) || this.pagination.page,
          pageSize: Number(pagination.pageSize) || this.pagination.pageSize,
          total: Number(pagination.total) || 0,
          totalPages: Number(pagination.totalPages) || 0
        };
      } else {
        this.businesses = [];
        this.pagination.total = 0;
        this.pagination.totalPages = 0;
        this.handleRequestError(response);
      }

      this.isLoading = false;
    },

    handleRequestError: function(response) {
      const status = response && Number(response.status);

      if(status === 401) {
        this.errorMessage = 'Tu sesion expiro. Vuelve a iniciar sesion para continuar.';
        window.setTimeout(() => this.$router.push({ name: 'login' }).catch(() => {}), 1200);
        return;
      }

      if(status === 403) {
        this.errorMessage = 'No tienes permiso para consultar la administracion global.';
        window.setTimeout(() => this.$router.push({ name: 'dashboard' }).catch(() => {}), 1200);
        return;
      }

      this.errorMessage = response && response.message
        ? response.message
        : 'No fue posible cargar el listado de negocios.';
    },

    onSearchInput: function() {
      if(this.searchTimer) {
        clearTimeout(this.searchTimer);
      }

      this.searchTimer = setTimeout(() => {
        this.pagination.page = 1;
        this.fetchBusinesses();
      }, 450);
    },

    onSearchClear: function() {
      this.filters.search = '';
      this.pagination.page = 1;
      this.fetchBusinesses();
    },

    onFilterChange: function() {
      this.pagination.page = 1;
      this.fetchBusinesses();
    },

    onPageSizeChange: function() {
      this.pagination.page = 1;
      this.fetchBusinesses();
    },

    onPageChange: function(page) {
      this.pagination.page = page;
      this.fetchBusinesses();
    },

    toggleSort: function(column) {
      if(!ALLOWED_SORTS.includes(column)) {
        return;
      }

      if(this.sortBy === column) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortBy = column;
        this.sortDir = column === 'name' ? 'asc' : 'desc';
      }

      this.pagination.page = 1;
      this.fetchBusinesses();
    },

    getSortIcon: function(column) {
      if(this.sortBy !== column) {
        return 'mdi-swap-vertical';
      }

      return this.sortDir === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down';
    },

    getStatusLabel: function(status, active) {
      if(status) {
        return status;
      }

      return active ? 'active' : 'inactive';
    },

    getSubscriptionStatusLabel: function(status) {
      const labels = {
        trial: 'Prueba gratis',
        active: 'Activo',
        past_due: 'Pago pendiente',
        suspended: 'Suspendido',
        cancelled: 'Cancelado'
      };

      return labels[status] || 'Desconocido';
    },

    getSubscriptionChipClass: function(status) {
      return [
        'subscription-chip',
        `is-${status || 'unknown'}`
      ];
    },

    getTrialEndLabel: function(business) {
      if(!business || business.subscription_status !== 'trial') {
        return 'No aplica';
      }

      return this.formatDate(business.trial_ends_at);
    },

    getTrialDaysLabel: function(business) {
      if(!business || business.subscription_status !== 'trial') {
        return 'No aplica';
      }

      if(business.is_trial_expired) {
        return 'Trial vencido';
      }

      const days = Number(business.trial_days_remaining);

      if(!Number.isFinite(days)) {
        return 'Sin registro';
      }

      return `${days} dias restantes`;
    },

    formatDate: function(value) {
      if(!value) {
        return 'Sin registro';
      }

      const date = new Date(value);

      if(Number.isNaN(date.getTime())) {
        return 'Sin registro';
      }

      return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    },

    formatDateForInput: function(value) {
      if(!value) {
        return '';
      }

      const date = new Date(value);
      if(Number.isNaN(date.getTime())) {
        return '';
      }

      return date.toISOString().slice(0, 10);
    },

    formatNumber: function(value) {
      return Number(value || 0).toLocaleString('es-MX');
    }
  }
};
</script>

<style scoped>
.businesses-page {
  display: grid;
  gap: 1.25rem;
}

.intro-panel,
.filters-panel,
.table-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.intro-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #047857;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.intro-panel h1 {
  margin: 0;
  color: #111827;
  font-size: 1.65rem;
  line-height: 2rem;
  font-weight: 800;
  letter-spacing: 0;
}

.intro-panel span {
  display: block;
  max-width: 55rem;
  margin-top: 0.75rem;
  color: #4b5563;
  line-height: 1.5rem;
}

.create-button {
  flex: 0 0 auto;
}

.filters-panel {
  display: grid;
  grid-template-columns: minmax(16rem, 1fr) repeat(5, minmax(9rem, 11rem)) minmax(9rem, 10rem);
  gap: 1rem;
  padding: 1rem;
}

.table-panel {
  overflow: hidden;
}

.table-toolbar,
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
}

.table-toolbar {
  border-bottom: 1px solid #e5e7eb;
  color: #4b5563;
}

.table-toolbar strong {
  color: #111827;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.business-table {
  width: 100%;
  min-width: 118rem;
  border-collapse: collapse;
}

.business-table th,
.business-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #eef2f7;
  color: #374151;
  font-size: 0.9rem;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.business-table th {
  background: #f9fafb;
  color: #111827;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.name-cell {
  color: #111827;
  font-weight: 700;
}

.plan-cell {
  display: grid;
  gap: 0.1rem;
}

.plan-cell strong {
  color: #111827;
}

.plan-cell span {
  color: #6b7280;
  font-size: 0.76rem;
  text-transform: uppercase;
}

.actions-cell {
  width: 4.5rem;
  text-align: center;
}

.action-menu {
  min-width: 15rem;
}

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  color: inherit;
  font: inherit;
  text-transform: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.status-chip,
.active-chip,
.subscription-chip,
.operation-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0 0.65rem;
  border: 1px solid #d1d5db;
  color: #374151;
  background: #f9fafb;
  font-size: 0.78rem;
  font-weight: 700;
}

.subscription-chip.is-trial {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.subscription-chip.is-active {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.subscription-chip.is-past_due {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.subscription-chip.is-suspended,
.subscription-chip.is-cancelled,
.subscription-chip.is-unknown {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.trial-text {
  color: #374151;
  font-weight: 700;
}

.trial-text.is-expired {
  color: #b91c1c;
}

.operation-chip.is-operational {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.operation-chip.is-blocked {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.active-chip.is-active {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.active-chip.is-inactive {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  min-height: 13rem;
  color: #6b7280;
  text-align: center;
}

.empty-state strong {
  color: #111827;
  font-size: 1rem;
}

.pagination-bar {
  border-top: 1px solid #e5e7eb;
  color: #4b5563;
}

.form-section {
  display: grid;
  gap: 1rem;
  padding: 1rem 0;
}

.form-section + .form-section {
  border-top: 1px solid #e5e7eb;
}

.form-section-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.form-section-header div {
  display: grid;
  gap: 0.15rem;
}

.form-section-header strong {
  color: #111827;
  font-size: 1rem;
}

.form-section-header span {
  color: #6b7280;
  font-size: 0.88rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.admin-grid {
  margin-top: 1rem;
}

.form-grid-full {
  grid-column: 1 / -1;
}

.confirm-summary {
  display: grid;
  gap: 0.25rem;
  margin-bottom: 1rem;
  padding: 0.9rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.confirm-summary strong {
  color: #111827;
}

.confirm-message {
  color: #4b5563;
  line-height: 1.5rem;
}

.validation-list {
  margin: 0;
  padding-left: 1.25rem;
}

.license-help {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.85rem;
  color: #374151;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  line-height: 1.45rem;
}

.license-loading {
  display: grid;
  place-items: center;
  gap: 0.75rem;
  min-height: 10rem;
  color: #4b5563;
}

.license-summary {
  display: grid;
  gap: 1rem;
}

.license-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.license-hero h2 {
  margin: 0;
  color: #111827;
  font-size: 1.35rem;
  letter-spacing: 0;
}

.license-hero span {
  color: #4b5563;
}

.recommended-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0 0.65rem;
  color: #065f46;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
}

.license-grid,
.license-limits {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.license-metric,
.limit-row {
  display: grid;
  gap: 0.25rem;
  padding: 0.85rem;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.license-metric span,
.limit-row span,
.override-grid span {
  color: #6b7280;
  font-size: 0.8rem;
}

.license-metric strong,
.limit-row strong,
.override-grid strong {
  color: #111827;
  font-size: 0.95rem;
}

.limit-row small {
  color: #6b7280;
  font-size: 0.74rem;
}

.limit-row.is-exceeded {
  border-color: #fca5a5;
  background: #fef2f2;
}

.exceeded-limit-list {
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
}

.license-overrides {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.license-overrides-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.license-overrides-header div {
  display: grid;
  gap: 0.15rem;
}

.license-overrides-header strong {
  color: #111827;
}

.license-overrides-header span {
  color: #6b7280;
  font-size: 0.86rem;
}

.override-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.override-grid div {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.license-features {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.license-features strong {
  color: #111827;
}

.license-features ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem 1rem;
  margin: 0;
  padding-left: 1.1rem;
  color: #374151;
}

@media (max-width: 900px) {
  .intro-panel {
    display: grid;
  }

  .filters-panel {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .license-grid,
  .license-limits,
  .override-grid,
  .license-features ul {
    grid-template-columns: 1fr;
  }

  .pagination-bar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
