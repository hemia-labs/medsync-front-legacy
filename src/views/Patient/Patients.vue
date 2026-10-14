<template>
  <section class="patients-page">
    <div class="patients-shell">
      <section class="patients-hero">
        <div class="patients-hero-copy">
          <p class="patients-eyebrow">Pacientes</p>
          <h1>Directorio clinico</h1>
          <p>
            Consulta el listado general, filtra por datos clave y abre el expediente sin salir del flujo diario.
          </p>
        </div>

        <div class="patients-actions">
          <button type="button" class="patients-icon-button" aria-label="Actualizar pacientes" @click="loadPatients">
            <v-icon size="20">mdi-refresh</v-icon>
          </button>

          <router-link v-if="canCreatePatient" class="patients-primary-action" :to="'/px/new'">
            <v-icon size="19">mdi-account-plus-outline</v-icon>
            <span>Nuevo paciente</span>
          </router-link>
        </div>
      </section>

      <section class="patients-summary-grid" aria-label="Resumen de pacientes">
        <article class="patients-summary-card">
          <span class="summary-icon"><v-icon size="22">mdi-account-group-outline</v-icon></span>
          <div>
            <strong>{{ totalPatients }}</strong>
            <small>Pacientes registrados</small>
          </div>
        </article>

        <article class="patients-summary-card">
          <span class="summary-icon"><v-icon size="22">mdi-filter-outline</v-icon></span>
          <div>
            <strong>{{ filteredPatients.length }}</strong>
            <small>Coincidencias visibles</small>
          </div>
        </article>

        <article class="patients-summary-card">
          <span class="summary-icon"><v-icon size="22">mdi-briefcase-outline</v-icon></span>
          <div>
            <strong>{{ patientsWithOccupation }}</strong>
            <small>Con ocupacion registrada</small>
          </div>
        </article>
      </section>

      <section class="patients-panel">
        <div class="patients-panel-header">
          <div>
            <p class="patients-eyebrow">Busqueda</p>
            <h2>Todos los pacientes</h2>
          </div>

          <div class="patients-range" v-if="filteredPatients.length">
            {{ pageRangeText }}
          </div>
        </div>

        <div class="patients-toolbar" :class="{ 'patients-toolbar-search-only': !canCreatePatient }">
          <div v-if="canCreatePatient" class="patients-archive-filter">
            <v-checkbox
              v-model="includeArchived"
              label="Incluir archivados"
              aria-describedby="patients-archive-help"
              hide-details
              :color="themePrimaryColor"
              class="patients-archive-checkbox"
              @change="loadPatients"
            />
            <p id="patients-archive-help" class="patients-archive-help">Muestra también los pacientes archivados, sin reactivarlos.</p>
          </div>

          <div class="patients-search-group">
            <label class="patients-search-label" for="patients-search">Buscar paciente</label>
            <div class="patients-search-controls">
              <v-text-field
                id="patients-search"
                v-model.trim="searchTerm"
                placeholder="Nombre, teléfono o folio"
                prepend-inner-icon="mdi-magnify"
                outlined
                dense
                hide-details
                :color="themePrimaryColor"
                class="patients-search-field"
              ></v-text-field>

              <button type="button" class="patients-clear-search" :disabled="!searchTerm" aria-label="Limpiar búsqueda" @click="onClearSearch">
                <v-icon size="18" aria-hidden="true">mdi-close</v-icon>
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </div>

        <v-progress-linear
          v-if="isPatientsLoading"
          indeterminate
          height="3"
          :color="themePrimaryColor"
          class="patients-progress"
        ></v-progress-linear>

        <div v-if="patientsServiceError" class="patients-state patients-state-error">
          <v-icon size="32">mdi-alert-circle-outline</v-icon>
          <strong>No pudimos cargar los pacientes.</strong>
          <p>Intenta actualizar el listado en unos segundos.</p>
          <button type="button" class="patients-primary-action compact" @click="loadPatients">
            <v-icon size="18">mdi-refresh</v-icon>
            <span>Actualizar</span>
          </button>
        </div>

        <div v-else-if="!isPatientsLoading && totalPatients === 0" class="patients-state">
          <v-icon size="34">mdi-account-search-outline</v-icon>
          <strong>Aun no hay pacientes registrados.</strong>
          <p>Cuando agregues pacientes, apareceran en este directorio.</p>
          <router-link v-if="canCreatePatient" class="patients-primary-action compact" :to="'/px/new'">
            <v-icon size="18">mdi-account-plus-outline</v-icon>
            <span>Nuevo paciente</span>
          </router-link>
        </div>

        <div v-else-if="!isPatientsLoading && filteredPatients.length === 0" class="patients-state">
          <v-icon size="34">mdi-text-search</v-icon>
          <strong>No encontramos coincidencias.</strong>
          <p>Prueba con otro nombre, telefono, ocupacion o folio.</p>
        </div>

        <div v-else class="patients-table-card">
          <div class="patients-table-wrap">
            <table class="patients-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Contacto</th>
                  <th>Ocupacion</th>
                  <th>Edad</th>
                  <th class="patients-table-action">Accion</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="patient in paginatedPatients" :key="patientKey(patient)">
                  <td>
                    <div class="patient-cell">
                      <span class="patient-avatar">{{ patientInitials(patient) }}</span>
                      <div class="patient-cell-copy">
                        <strong>{{ patientName(patient) }}</strong>
                        <small>{{ patientFolio(patient) }}{{ Number(patient.active) === 0 ? ' · Archivado' : '' }}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="patient-muted">{{ patientContact(patient) }}</span>
                  </td>
                  <td>
                    <span class="patient-pill">{{ patientOccupation(patient) }}</span>
                  </td>
                  <td>
                    <span class="patient-age">{{ patientAge(patient) }}</span>
                  </td>
                  <td>
                    <div class="patients-row-actions">
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on, attrs }">
                          <button
                            type="button"
                            class="patient-open-button"
                            v-bind="attrs"
                            v-on="on"
                            @click="goTo(patient.id_person)"
                          >
                            <v-icon size="19">mdi-folder-account-outline</v-icon>
                            <span>Historial</span>
                          </button>
                        </template>
                        <span>Abrir expediente</span>
                      </v-tooltip>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="patients-mobile-list">
            <article v-for="patient in paginatedPatients" :key="`mobile-${patientKey(patient)}`" class="patient-mobile-card">
              <div class="patient-mobile-head">
                <span class="patient-avatar">{{ patientInitials(patient) }}</span>
                <div>
                  <strong>{{ patientName(patient) }}</strong>
                  <small>{{ patientFolio(patient) }}{{ Number(patient.active) === 0 ? ' · Archivado' : '' }}</small>
                </div>
              </div>

              <dl class="patient-mobile-meta">
                <div>
                  <dt>Contacto</dt>
                  <dd>{{ patientContact(patient) }}</dd>
                </div>
                <div>
                  <dt>Ocupacion</dt>
                  <dd>{{ patientOccupation(patient) }}</dd>
                </div>
                <div>
                  <dt>Edad</dt>
                  <dd>{{ patientAge(patient) }}</dd>
                </div>
              </dl>

              <button type="button" class="patient-open-button mobile" @click="goTo(patient.id_person)">
                <v-icon size="19">mdi-folder-account-outline</v-icon>
                <span>Abrir expediente</span>
              </button>
            </article>
          </div>

          <div v-if="pageCount > 1" class="patients-pagination">
            <v-pagination
              v-model="page"
              :length="pageCount"
              :total-visible="7"
              :color="themePrimaryColor"
            ></v-pagination>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import VuexMixin from '../../mixins/VuexMixin';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';

export default {
    mixins: [VuexMixin],
    data: function() {
        return {
            searchTerm: '',
            includeArchived: false,
            page: 1,
            itemsPerPage: 8,
            isPatientsLoading: false,
            patientsServiceError: false
        }
    },
    created() {
      this.loadPatients()
    },
    computed: {
      ...mapGetters(moduleTypes.DASHBOARD, {
        patients: fnTypes.getPatients
      }),
      ...mapGetters(moduleTypes.AUTH, {
        hasPermission: fnTypes.hasPermission
      }),

      canCreatePatient: function() {
        return this.hasPermission('px.new')
      },

      totalPatients: function() {
        return Array.isArray(this.patients) ? this.patients.length : 0
      },

      patientsWithOccupation: function() {
        return this.safePatients.filter((patient) => {
          return Boolean(patient.ocupation || patient.occupation)
        }).length
      },

      safePatients: function() {
        return Array.isArray(this.patients) ? this.patients : []
      },

      filteredPatients: function() {
        const term = this.normalizeText(this.searchTerm)
        if(!term) {
          return this.safePatients
        }

        return this.safePatients.filter((patient) => {
          const searchable = [
            this.patientName(patient),
            this.patientContact(patient),
            this.patientOccupation(patient),
            this.patientAge(patient),
            this.patientFolio(patient),
            patient.id_person,
            patient.folio
          ].join(' ')

          return this.normalizeText(searchable).indexOf(term) !== -1
        })
      },

      pageCount: function() {
        return Math.max(1, Math.ceil(this.filteredPatients.length / this.itemsPerPage))
      },

      paginatedPatients: function() {
        const start = (this.page - 1) * this.itemsPerPage
        return this.filteredPatients.slice(start, start + this.itemsPerPage)
      },

      pageRangeText: function() {
        if(!this.filteredPatients.length) {
          return ''
        }

        const start = ((this.page - 1) * this.itemsPerPage) + 1
        const end = Math.min(this.page * this.itemsPerPage, this.filteredPatients.length)
        return `${start}-${end} de ${this.filteredPatients.length}`
      },

      themePrimaryColor: function() {
        return 'var(--color-primary-700)'
      }
    },
    methods: {
      ...mapActions(moduleTypes.DASHBOARD, [
        fnTypes.getPatients
      ]),

      loadPatients: async function() {
        this.isPatientsLoading = true
        this.patientsServiceError = false

        try {
          const response = await this.ActionWrapp(moduleTypes.DASHBOARD, fnTypes.getPatients, { param: '', include_archived: this.includeArchived })
          this.patientsServiceError = !(response && response.success)
        }
        catch(error) {
          this.patientsServiceError = true
        }
        finally {
          this.isPatientsLoading = false
        }
      },

      onClearSearch: function() {
        this.searchTerm = ''
        this.page = 1
      },

      goTo: function(id) {
        if(!id) {
          return
        }

        this.$router.push('/px/history/' + id).catch(() => {})
      },

      patientKey: function(patient) {
        return patient.id_person || `${patient.name || ''}-${patient.surname || ''}-${patient.age || ''}`
      },

      patientName: function(patient) {
        const fullName = `${patient.name || ''} ${patient.surname || ''}`.trim()
        return patient.name_complete || patient.fullname || fullName || 'Paciente sin nombre'
      },

      patientInitials: function(patient) {
        return this.patientName(patient)
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part.charAt(0))
          .join('')
          .toUpperCase()
      },

      patientContact: function(patient) {
        return patient.telephone
          || patient.celphone
          || patient.phone
          || patient.mobilePhone
          || patient.local_telephone
          || 'Sin telefono'
      },

      patientOccupation: function(patient) {
        return patient.ocupation || patient.occupation || 'Sin ocupacion'
      },

      patientAge: function(patient) {
        if(patient.age === 0 || patient.age === '0') {
          return '0 años'
        }

        return patient.age ? `${patient.age} años` : 'No registrada'
      },

      patientFolio: function(patient) {
        const folio = patient.folio || patient.id_person
        return folio ? `Expediente ${folio}` : 'Sin expediente'
      },

      normalizeText: function(value) {
        return String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
      }
    },
    watch: {
      searchTerm: function() {
        this.page = 1
      },

      pageCount: function(value) {
        if(this.page > value) {
          this.page = value
        }
      }
    }
}
</script>

<style scoped>
.patients-page {
  width: 100%;
  min-height: 100%;
  padding: clamp(1rem, 2vw, 1.75rem);
}

.patients-shell {
  width: min(1240px, 100%);
  margin: 0 auto;
}

.patients-hero,
.patients-panel,
.patients-summary-card {
  border: 1px solid rgba(8, 103, 131, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.patients-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: clamp(1.15rem, 2vw, 1.6rem);
  border-color: var(--color-primary-200, rgba(8, 103, 131, 0.16));
  background:
    linear-gradient(135deg, var(--color-primary-100, #e6f7fb) 0%, rgba(255, 255, 255, 0.94) 68%);
}

.patients-hero-copy {
  min-width: 0;
}

.patients-eyebrow {
  margin: 0 0 0.35rem;
  color: var(--color-primary-900, #086783);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1rem;
  text-transform: uppercase;
}

.patients-hero h1,
.patients-panel-header h2 {
  margin: 0;
  color: #12313a;
  letter-spacing: 0;
}

.patients-hero h1 {
  font-size: clamp(1.75rem, 3vw, 2.45rem);
  font-weight: 900;
  line-height: 1.08;
}

.patients-hero p:not(.patients-eyebrow) {
  max-width: 42rem;
  margin: 0.65rem 0 0;
  color: #475569;
  font-size: 0.96rem;
  line-height: 1.55rem;
}

.patients-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-shrink: 0;
}

.patients-primary-action,
.patients-secondary-action,
.patients-icon-button,
.patient-open-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.55rem;
  border-radius: 8px;
  font-weight: 800;
  letter-spacing: 0;
  text-decoration: none;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.patients-primary-action {
  min-width: 10.5rem;
  padding: 0 1rem;
  border: 1px solid var(--color-primary-700, #1497bd);
  color: #ffffff;
  background: var(--color-primary-700, #1497bd);
  box-shadow: 0 10px 20px rgba(8, 103, 131, 0.16);
}

.patients-primary-action .v-icon,
.patient-open-button .v-icon {
  color: currentColor;
}

.patients-primary-action:hover,
.patients-primary-action:focus,
.patient-open-button:hover,
.patient-open-button:focus {
  background: var(--color-primary-900, #086783);
  border-color: var(--color-primary-900, #086783);
  color: #ffffff;
  outline: none;
  transform: translateY(-1px);
}

.patients-primary-action.compact {
  min-width: 0;
  min-height: 2.35rem;
  padding: 0 0.85rem;
}

.patients-icon-button,
.patients-secondary-action {
  border: 1px solid #d6e6ea;
  color: #64748b;
  background: #ffffff;
}

.patients-icon-button {
  width: 2.55rem;
  padding: 0;
}

.patients-secondary-action {
  min-width: 7.4rem;
  padding: 0 0.85rem;
}

.patients-secondary-action:disabled {
  cursor: default;
  opacity: 0.55;
}

.patients-icon-button:hover,
.patients-icon-button:focus,
.patients-secondary-action:not(:disabled):hover,
.patients-secondary-action:not(:disabled):focus {
  border-color: var(--color-primary-300, #a6e1f0);
  color: var(--color-primary-900, #086783);
  background: var(--color-primary-100, #e6f7fb);
  outline: none;
}

.patients-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}

.patients-summary-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.8rem;
  min-height: 5.3rem;
  padding: 1rem;
}

.summary-icon {
  display: grid;
  place-items: center;
  width: 2.65rem;
  height: 2.65rem;
  border-radius: 8px;
  color: var(--color-primary-900, #086783);
  background: var(--color-primary-100, #e6f7fb);
}

.summary-icon .v-icon {
  color: currentColor;
}

.patients-summary-card strong {
  display: block;
  color: #12313a;
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1.65rem;
}

.patients-summary-card small {
  display: block;
  margin-top: 0.18rem;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
}

.patients-panel {
  margin-top: 1rem;
  overflow: hidden;
}

.patients-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem 1.25rem 1rem;
  border-bottom: 1px solid #e0edf0;
  background: rgba(255, 255, 255, 0.88);
}

.patients-panel-header h2 {
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.55rem;
}

.patients-range {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid var(--color-primary-200, #cdeef7);
  border-radius: 999px;
  color: var(--color-primary-900, #086783);
  background: var(--color-primary-100, #e6f7fb);
  font-size: 0.8rem;
  font-weight: 900;
  white-space: nowrap;
}

.patients-toolbar {
  display: grid;
  grid-template-columns: minmax(13rem, 0.8fr) minmax(0, 1.7fr);
  gap: 1.75rem;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #edf2f5;
  background: #fbfdfe;
}

.patients-toolbar-search-only {
  grid-template-columns: minmax(0, 1fr);
}

.patients-archive-checkbox {
  margin: 0;
  padding: 0;
}

.patients-archive-checkbox ::v-deep .v-label {
  color: #475569;
  font-size: 0.9rem;
  font-weight: 600;
}

.patients-archive-help {
  max-width: 19rem;
  margin: 0.3rem 0 0 2rem;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.2rem;
}

.patients-search-group {
  min-width: 0;
}

.patients-search-label {
  display: block;
  margin-bottom: 0.4rem;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
}

.patients-search-controls {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.patients-search-field {
  flex: 1 1 0;
  min-width: 0;
}

.patients-search-field ::v-deep .v-input__slot {
  min-height: 44px !important;
  border-radius: 8px;
  background: #ffffff;
}

.patients-clear-search {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 44px;
  padding: 0 0.6rem;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 700;
  transition: background-color 160ms ease, color 160ms ease;
}

.patients-clear-search .v-icon {
  color: currentColor;
}

.patients-clear-search:disabled {
  color: #94a3b8;
  cursor: default;
}

.patients-clear-search:not(:disabled):hover {
  color: var(--color-primary-900, #086783);
  background: var(--color-primary-100, #e6f7fb);
}

.patients-clear-search:focus-visible {
  outline: 2px solid var(--color-primary-700, #1497bd);
  outline-offset: 2px;
}

.patients-progress {
  margin: 0;
}

.patients-table-card {
  margin: 0;
  overflow: hidden;
}

.patients-table-wrap {
  overflow-x: auto;
}

.patients-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.patients-table th {
  padding: 0.95rem 1rem;
  border-bottom: 1px solid var(--color-primary-200, #cdeef7);
  color: var(--color-primary-900, #086783);
  background: var(--color-primary-100, #e6f7fb);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1rem;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.patients-table td {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #e8eef2;
  color: #475569;
  font-size: 0.9rem;
  vertical-align: middle;
}

.patients-table tbody tr {
  transition: background-color 160ms ease;
}

.patients-table tbody tr:hover {
  background: #fbfdfe;
}

.patients-table tbody tr:last-child td {
  border-bottom: 0;
}

.patients-table-action {
  text-align: right !important;
}

.patient-cell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  min-width: 15rem;
}

.patient-avatar {
  display: grid;
  place-items: center;
  width: 2.65rem;
  height: 2.65rem;
  border-radius: 8px;
  color: #ffffff;
  background: var(--color-primary-700, #1497bd);
  font-size: 0.82rem;
  font-weight: 900;
  flex-shrink: 0;
}

.patient-cell-copy {
  min-width: 0;
}

.patient-cell-copy strong,
.patient-mobile-head strong {
  display: block;
  overflow: hidden;
  color: #12313a;
  font-weight: 900;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patient-cell-copy small,
.patient-mobile-head small {
  display: block;
  overflow: hidden;
  margin-top: 0.12rem;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patient-muted {
  color: #64748b;
  font-weight: 700;
}

.patient-pill,
.patient-age {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
}

.patient-pill {
  border: 1px solid #dbe7eb;
  color: #475569;
  background: #f8fafc;
}

.patient-age {
  color: var(--color-primary-900, #086783);
  background: var(--color-primary-100, #e6f7fb);
}

.patients-row-actions {
  display: flex;
  justify-content: flex-end;
}

.patient-open-button {
  min-width: 8.3rem;
  padding: 0 0.85rem;
  border: 1px solid var(--color-primary-700, #1497bd);
  color: var(--color-primary-900, #086783);
  background: #ffffff;
}

.patient-open-button:hover,
.patient-open-button:focus {
  color: #ffffff;
}

.patients-mobile-list {
  display: none;
}

.patients-pagination {
  display: flex;
  justify-content: center;
  padding: 0.9rem 1rem 1rem;
  border-top: 1px solid #e8eef2;
  background: #fbfdfe;
}

.patients-state {
  display: grid;
  place-items: center;
  gap: 0.45rem;
  min-height: 16rem;
  margin: 1rem 1.25rem 1.25rem;
  padding: 1.5rem;
  border: 1px dashed #c9dce2;
  border-radius: 8px;
  color: #64748b;
  background: #f8fbfc;
  text-align: center;
}

.patients-state .v-icon {
  color: var(--color-primary-700, #1497bd);
}

.patients-state strong {
  color: #12313a;
  font-weight: 900;
}

.patients-state p {
  max-width: 30rem;
  margin: 0;
  color: #64748b;
  line-height: 1.45rem;
}

.patients-state-error .v-icon,
.patients-state-error strong {
  color: #b42318;
}

html[data-theme="clinical-night"] .patients-hero,
html[data-theme="clinical-night"] .patients-panel,
html[data-theme="clinical-night"] .patients-summary-card,
html[data-theme="clinical-night"] .patients-toolbar {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] .patients-hero h1,
html[data-theme="clinical-night"] .patients-panel-header h2,
html[data-theme="clinical-night"] .patients-summary-card strong,
html[data-theme="clinical-night"] .patient-cell-copy strong,
html[data-theme="clinical-night"] .patient-mobile-head strong,
html[data-theme="clinical-night"] .patients-state strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .patients-hero p:not(.patients-eyebrow),
html[data-theme="clinical-night"] .patients-archive-help,
html[data-theme="clinical-night"] .patients-summary-card small,
html[data-theme="clinical-night"] .patient-cell-copy small,
html[data-theme="clinical-night"] .patient-mobile-head small,
html[data-theme="clinical-night"] .patient-muted,
html[data-theme="clinical-night"] .patients-state p {
  color: #94a3b8;
}

html[data-theme="clinical-night"] .patients-search-label,
html[data-theme="clinical-night"] .patients-archive-checkbox ::v-deep .v-label,
html[data-theme="clinical-night"] .patients-clear-search:not(:disabled) {
  color: #cbd5e1;
}

html[data-theme="clinical-night"] .patients-search-field ::v-deep .v-input__slot {
  background: rgba(30, 41, 59, 0.68);
}

html[data-theme="clinical-night"] .patients-panel-header,
html[data-theme="clinical-night"] .patients-pagination {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.72);
}

html[data-theme="clinical-night"] .patients-table td {
  border-bottom-color: rgba(148, 163, 184, 0.16);
  color: #cbd5e1;
}

html[data-theme="clinical-night"] .patients-table tbody tr:hover,
html[data-theme="clinical-night"] .patients-state,
html[data-theme="clinical-night"] .patient-pill,
html[data-theme="clinical-night"] .patients-icon-button,
html[data-theme="clinical-night"] .patients-secondary-action,
html[data-theme="clinical-night"] .patient-open-button {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.68);
}

@media (max-width: 980px) {
  .patients-summary-grid {
    grid-template-columns: 1fr;
  }

  .patients-table-wrap {
    display: none;
  }

  .patients-mobile-list {
    display: grid;
    gap: 0.8rem;
    padding: 0.9rem;
  }

  .patient-mobile-card {
    display: grid;
    gap: 0.8rem;
    padding: 0.9rem;
    border: 1px solid #e0edf0;
    border-radius: 8px;
    background: #ffffff;
  }

  .patient-mobile-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.75rem;
  }

  .patient-mobile-meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
    margin: 0;
  }

  .patient-mobile-meta div {
    min-width: 0;
    padding: 0.7rem;
    border: 1px solid #e8eef2;
    border-radius: 8px;
    background: #f8fafc;
  }

  .patient-mobile-meta dt {
    margin: 0 0 0.25rem;
    color: #64748b;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .patient-mobile-meta dd {
    overflow: hidden;
    margin: 0;
    color: #12313a;
    font-size: 0.86rem;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .patient-open-button.mobile {
    width: 100%;
  }

  html[data-theme="clinical-night"] .patient-mobile-card,
  html[data-theme="clinical-night"] .patient-mobile-meta div {
    border-color: rgba(148, 163, 184, 0.18);
    background: rgba(30, 41, 59, 0.62);
  }

  html[data-theme="clinical-night"] .patient-mobile-meta dd {
    color: #e2e8f0;
  }
}

@media (max-width: 720px) {
  .patients-page {
    padding: 0.85rem;
  }

  .patients-hero,
  .patients-panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .patients-toolbar {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .patients-actions {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    width: 100%;
  }

  .patients-icon-button {
    width: 2.55rem;
    flex-shrink: 0;
  }

  .patients-primary-action,
  .patients-secondary-action {
    width: 100%;
  }

  .patients-panel-header,
  .patients-toolbar {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .patients-state {
    margin-left: 1rem;
    margin-right: 1rem;
  }

  .patient-mobile-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .patients-search-controls {
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .patients-search-field {
    flex-basis: 100%;
  }

  .patients-clear-search {
    margin-left: auto;
  }
}
</style>
