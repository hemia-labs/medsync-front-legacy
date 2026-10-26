<template>
  <section class="home-page">
    <div class="home-container">
      <preparation-checklist />
      <header class="home-hero">
        <div class="hero-copy">
          <p class="eyebrow">{{ formattedToday }}</p>
          <h1>{{ greetingTitle }}</h1>
          <p class="hero-description">
            Busca un paciente, revisa tus citas del dia o continua con la operacion diaria.
          </p>
          <p v-if="scopeContext" class="hero-description">
            Agenda e indicadores: <strong>{{ homeScopeLabel }}</strong>
            <span v-if="homeScopeDoctorName"> · {{ homeScopeDoctorName }}</span>
          </p>
          <select v-if="scopeContext && scopeContext.canSelectOwn && scopeContext.canSelectTenant"
            v-model="selectedScope" class="continuity-select" aria-label="Alcance de agenda e indicadores de Inicio" @change="changeHomeScope">
            <option value="">Mi actividad</option><option value="tenant">Todo el consultorio</option>
          </select>
        </div>

        <div class="hero-visual" :class="homeSeason !== 'normal' ? ['hero-visual--seasonal', 'hero-visual--' + homeSeason] : []" aria-hidden="true">
          <owned-home-lottie
            :key="heroLottiePath"
            :path="heroLottiePath"
            :width="190"
            :height="190"
            :speed="1"
          />
          <home-seasonal-decoration v-if="homeSeason !== 'normal'" :season="homeSeason" :period="dayPeriod" />
        </div>
      </header>

      <section v-if="hasPermission('px.all')" class="search-command" aria-labelledby="patient-search-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Busqueda principal</p>
            <h2 id="patient-search-title">Encuentra rapido a tu paciente</h2>
          </div>
        </div>

        <div class="search-box">
          <v-text-field
            ref="patientSearchInput"
            v-model="Param"
            aria-label="Buscar paciente"
            placeholder="Buscar paciente por nombre, telefono o folio"
            prepend-inner-icon="mdi-magnify"
            color="#0f766e"
            outlined
            hide-details
            class="patient-search-input"
            @input="clearSearchMessages"
            @keypress.enter.native="onSearch"
          ></v-text-field>

          <button
            type="button"
            class="primary-button"
            :disabled="isSearching"
            @click="onSearch"
          >
            <v-icon size="19">mdi-magnify</v-icon>
            <span>{{ isSearching ? 'Buscando...' : 'Buscar' }}</span>
          </button>

          <router-link
            v-if="canCreatePatient"
            class="secondary-button"
            :to="'/px/new'"
          >
            <v-icon size="19">mdi-account-plus-outline</v-icon>
            <span>Nuevo paciente</span>
          </router-link>
        </div>

        <p v-if="searchError" class="form-message is-warning">
          Ingresa un dato para buscar, por ejemplo nombre, telefono o folio.
        </p>
        <p v-if="searchServiceError" class="form-message is-error">
          No pudimos buscar pacientes en este momento. Intenta nuevamente.
        </p>
      </section>

      <div class="home-grid">
        <main class="home-main-column">
          <section v-if="hasPermission('px.all')" class="content-card search-results-card" aria-labelledby="search-results-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Resultados</p>
                <h2 id="search-results-title">{{ resultsTitle }}</h2>
              </div>
              <button
                v-if="showResult"
                type="button"
                class="icon-button"
                aria-label="Limpiar busqueda"
                @click="onClearSearcher"
              >
                <v-icon size="19">mdi-trash-can-outline</v-icon>
              </button>
            </div>

            <v-progress-linear
              v-if="isSearching"
              indeterminate
              color="#0f766e"
              height="3"
              class="card-progress"
            ></v-progress-linear>

            <div v-if="showResult && patients.length" class="patient-results">
              <button
                v-for="result in patients"
                :key="patientKey(result)"
                type="button"
                class="patient-result"
                @click="onSelect(result.id_person)"
              >
                <span class="patient-avatar">{{ patientInitials(result) }}</span>
                <span class="patient-info">
                  <strong>{{ patientName(result) }}</strong>
                  <small>{{ patientMeta(result) }}</small>
                </span>
                <span class="patient-action">
                  Abrir expediente
                  <v-icon size="19">mdi-arrow-right</v-icon>
                </span>
              </button>
            </div>

            <div v-else-if="showResult && !isSearching" class="empty-state">
              <v-icon size="34">mdi-account-search-outline</v-icon>
              <strong>No encontramos pacientes con ese criterio.</strong>
              <p>Puedes intentar con otro dato o crear un nuevo paciente.</p>
              <router-link
                v-if="canCreatePatient"
                class="empty-state-action"
                :to="'/px/new'"
              >
                Nuevo paciente
              </router-link>
            </div>

            <div v-else class="empty-state is-soft">
              <v-icon size="34">mdi-text-search</v-icon>
              <strong>La busqueda aparecera aqui.</strong>
              <p>Escribe un nombre, telefono o folio para abrir rapidamente el expediente.</p>
            </div>
          </section>
          <home-insights />
        </main>

        <aside class="home-side-column">
          <section class="content-card" aria-labelledby="appointments-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Hoy</p>
                <h2 id="appointments-title">Citas del dia</h2>
              </div>
              <router-link
                v-if="canViewAppointments"
                class="mini-link"
                :to="'/px/dates'"
              >
                Agenda
              </router-link>
            </div>

            <v-progress-linear
              v-if="isAppointmentsLoading"
              indeterminate
              color="#0f766e"
              height="3"
              class="card-progress"
            ></v-progress-linear>

            <div v-if="!canViewAppointments" class="inline-state">
              <v-icon size="24">mdi-calendar-lock-outline</v-icon>
              <p>La agenda no esta visible para este perfil.</p>
            </div>

            <div v-else-if="appointmentsError" class="inline-state is-error">
              <v-icon size="24">mdi-alert-circle-outline</v-icon>
              <p>No pudimos cargar tus citas. Intenta nuevamente.</p>
            </div>

            <div v-else-if="todayAppointments.length" class="appointment-list">
              <article
                v-for="appointment in visibleTodayAppointments"
                :key="appointmentKey(appointment)"
                class="appointment-item"
              >
                <span class="appointment-time">{{ appointmentTime(appointment) }}</span>
                <span class="appointment-copy">
                  <strong>{{ appointmentPatient(appointment) }}</strong>
                  <small>{{ appointmentDoctor(appointment) }}</small>
                  <small>{{ appointmentStatus(appointment) }}</small>
                </span>
              </article>
            </div>

            <div v-else-if="!isAppointmentsLoading" class="inline-state">
              <v-icon size="24">mdi-calendar-check-outline</v-icon>
              <p>{{ appointmentsEmptyMessage }}</p>
              <router-link
                v-if="canViewAppointments"
                :to="'/px/dates'"
              >
                Ver agenda
              </router-link>
            </div>
          </section>

          <section
            class="content-card continuity-card"
            aria-labelledby="continuity-title"
            @mouseenter="pauseContinuityRotation"
            @mouseleave="resumeContinuityRotation"
            @focusin="pauseContinuityRotation"
            @focusout="resumeContinuityRotation"
          >
            <div class="section-heading continuity-heading">
              <div>
                <p class="eyebrow">{{ activeContinuity.eyebrow }}</p>
                <h2 id="continuity-title">Continuidad clinica</h2>
              </div>
              <button
                type="button"
                class="icon-button"
                aria-label="Actualizar continuidad clinica"
                :disabled="isContinuityLoading"
                @click="loadContinuitySummary(true)"
              >
                <v-icon size="18">mdi-refresh</v-icon>
              </button>
            </div>

            <v-progress-linear
              v-if="isContinuityLoading"
              indeterminate
              color="#0f766e"
              height="3"
              class="card-progress"
            ></v-progress-linear>

            <div v-if="continuityOptions.length" class="continuity-controls">
              <button
                type="button"
                class="continuity-arrow"
                aria-label="Ver seccion anterior"
                @click="showPreviousContinuity"
              >
                <v-icon size="20">mdi-chevron-left</v-icon>
              </button>

              <select
                v-model="activeContinuityKey"
                class="continuity-select"
                aria-label="Seleccionar seccion de continuidad clinica"
                @change="onContinuityManualChange"
              >
                <option
                  v-for="option in continuityOptions"
                  :key="option.key"
                  :value="option.key"
                >
                  {{ option.label }}
                </option>
              </select>

              <button
                type="button"
                class="continuity-arrow"
                aria-label="Ver seccion siguiente"
                @click="showNextContinuity"
              >
                <v-icon size="20">mdi-chevron-right</v-icon>
              </button>
            </div>

            <div v-if="continuityError" class="inline-state is-error">
              <v-icon size="24">mdi-alert-circle-outline</v-icon>
              <p>No pudimos cargar la continuidad clinica. Intenta nuevamente.</p>
            </div>

            <div v-else-if="activeContinuity.available" class="continuity-panel">
              <div class="continuity-hero-line">
                <span class="continuity-icon">
                  <v-icon size="25">{{ activeContinuity.icon }}</v-icon>
                </span>
                <div>
                  <strong>{{ activeContinuity.title }}</strong>
                  <p>{{ activeContinuity.description }}</p>
                </div>
              </div>

              <div class="continuity-stat-grid">
                <article
                  v-for="card in activeContinuity.cards"
                  :key="card.key"
                  :class="['continuity-stat', `tone-${card.tone || 'neutral'}`]"
                >
                  <strong>{{ card.value === null || card.value === undefined ? 'No disponible' : card.value }}</strong>
                  <span>{{ card.label }}</span>
                </article>
              </div>

              <div v-if="activeContinuity.items && activeContinuity.items.length" class="continuity-item-list">
                <button
                  v-for="item in activeContinuity.items"
                  :key="item.key"
                  type="button"
                  class="continuity-item"
                  @click="navigateToContinuityItem(item)"
                >
                  <span class="continuity-dot"></span>
                  <span>
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.detail }}</small>
                  </span>
                  <v-icon size="18">mdi-arrow-right</v-icon>
                </button>
              </div>

              <button
                v-if="activeContinuity.action"
                type="button"
                class="continuity-action"
                @click="navigateTo(activeContinuity.action.path)"
              >
                <v-icon size="18">mdi-open-in-new</v-icon>
                <span>{{ activeContinuity.action.label }}</span>
              </button>
            </div>

            <div v-else-if="!isContinuityLoading" class="inline-state">
              <v-icon size="24">mdi-shield-check-outline</v-icon>
              <p>No tienes indicadores habilitados para este alcance.</p>
            </div>

          </section>
        </aside>
      </div>
    </div>
  </section>
</template>

<script>
import HomeInsights from './components/HomeInsights.vue';
import OwnedHomeLottie from './components/OwnedHomeLottie.vue';
import HomeSeasonalDecoration from './components/HomeSeasonalDecoration.vue';
import { getHomeSeason } from '../../utils/homeSeason';
import { mapGetters } from 'vuex';
import decode from 'jwt-decode';
import VuexMixin from '../../mixins/VuexMixin';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import { DAHomeService } from '../../services/context/core-proccess-context';
import { APPOINTMENT_STATUS_LABELS } from '../../domain/appointments/appointment.storage';
import { isD2AuthMode } from '../../services/config/authTransport.config';
import { clearClinicalContinuityCache } from '../../utils/authStorageCleanup';
import PreparationChecklist from '../configuration/components/PreparationChecklist.vue';

const CONTINUITY_ROTATION_MS = 15000;
const CONTINUITY_MANUAL_PAUSE_MS = 60000;
const EMPTY_CONTINUITY_SECTION = {
  key: 'empty',
  label: 'Continuidad clinica',
  eyebrow: 'Pendientes',
  title: 'Todo al dia por ahora',
  description: 'Aqui apareceran borradores, firmas, pacientes recientes y actividad semanal.',
  icon: 'mdi-shield-check-outline',
  available: false,
  total: 0,
  cards: [],
  items: [],
  action: null
};

export default {
    name: 'Home',
    components: { PreparationChecklist, HomeInsights, OwnedHomeLottie, HomeSeasonalDecoration },
    mixins: [VuexMixin],
    data: function() {
        return {
            Param: '',
            selectedScope: '',
            scopeContext: null,
            patients: [],
            homeDisposed: false,
            continuityRequestVersion: 0,
            appointmentsRequestVersion: 0,
            searchRequestVersion: 0,
            showResult: false,
            searchError: false,
            searchServiceError: false,
            isSearching: false,
            isContinuityLoading: false,
            continuityError: false,
            continuitySummary: null,
            activeContinuityKey: 'drafts',
            continuityRotationTimer: null,
            continuityResumeTimer: null,
            continuityRotationPaused: false,
            isAppointmentsLoading: false,
            appointmentsError: false,
            appointmentsUnavailable: false,
            todayAppointments: [],
            currentDateTime: new Date(),
            homeClockTimer: null
        }
    },
    created() {
      clearClinicalContinuityCache()
      this.init()
    },
    beforeDestroy() {
      this.homeDisposed = true
      this.resetClinicalHome()
      if(this.homeClockTimer) {
        clearInterval(this.homeClockTimer)
      }
      if(this.continuityRotationTimer) {
        clearInterval(this.continuityRotationTimer)
      }
      if(this.continuityResumeTimer) {
        clearTimeout(this.continuityResumeTimer)
      }
    },
    watch: {
      homeSessionKey: function() {
        this.selectedScope = ''
        this.resetClinicalHome()
        if(this.homeSessionKey && !this.homeDisposed) {
          this.loadContinuitySummary()
          this.loadTodayAppointments()
        }
      }
    },
    computed: {
      ...mapGetters(moduleTypes.AUTH, {
        hasPermission: fnTypes.hasPermission,
        authUser: fnTypes.getUser,
        business: fnTypes.getBusiness,
        authPermissions: 'getPermissions'
      }),
      homeScopeLabel: function() {
        if(!this.scopeContext) return ''
        if(this.selectedScope === 'tenant' || !this.scopeContext.canSelectOwn) return 'Todo el consultorio'
        return 'Mi actividad'
      },
      homeScopeDoctorName: function() {
        return this.scopeContext && this.homeScopeLabel === 'Mi actividad'
          ? this.scopeContext.doctorName || '' : ''
      },
      homeSessionKey: function() {
        const user = this.sessionUser || {}
        const actor = user.id_login || user.id
        const business = (this.business && this.business.id_business) || user.id_business
        return actor && business
          ? JSON.stringify([actor, business, [...(this.authPermissions || [])].sort()])
          : ''
      },
      sessionUser: function() {
        if(isD2AuthMode()) {
          return this.authUser || null
        }

        if(this.authUser && (this.authUser.name || this.authUser.user_name || this.authUser.email)) {
          return this.authUser
        }

        const token = this.$session ? this.$session.get('token') : null
        if(!token) {
          return null
        }

        try {
          return decode(token)
        }
        catch(error) {
          return null
        }
      },
      greetingTitle: function() {
        const name = this.displayUserName
        return name ? `${this.greetingPrefix}, ${name}` : this.greetingPrefix
      },
      homeSeason: function() {
        return getHomeSeason(this.currentDateTime)
      },
      dayPeriod: function() {
        const hour = this.currentDateTime.getHours()

        if(hour >= 5 && hour < 12) {
          return 'morning'
        }

        if(hour >= 12 && hour < 19) {
          return 'afternoon'
        }

        return 'night'
      },
      greetingPrefix: function() {
        if(this.dayPeriod === 'morning') {
          return 'Buen dia'
        }

        if(this.dayPeriod === 'afternoon') {
          return 'Buenas tardes'
        }

        return 'Buenas noches'
      },
      heroLottiePath: function() {
        const paths = {
          morning: 'lottie/doctor-morning.json',
          afternoon: 'lottie/doctor-afternoon.json',
          night: 'lottie/doctor-night.json'
        }

        return paths[this.dayPeriod] || paths.night
      },
      displayUserName: function() {
        const user = this.sessionUser
        if(!user) {
          return ''
        }

        return user.name || user.user_name || user.username || user.email || ''
      },
      formattedToday: function() {
        return new Intl.DateTimeFormat('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }).format(this.currentDateTime)
      },
      resultsTitle: function() {
        if(!this.showResult) {
          return 'Busca para ver resultados'
        }

        return `${this.patients.length} resultado${this.patients.length === 1 ? '' : 's'} encontrado${this.patients.length === 1 ? '' : 's'}`
      },
      canCreatePatient: function() {
        return this.hasPermission('px.new')
      },
      canViewAppointments: function() {
        return this.hasPermission('px.dates')
      },
      visibleTodayAppointments: function() {
        return this.todayAppointments.slice(0, 4)
      },
      appointmentsEmptyMessage: function() {
        return this.appointmentsUnavailable
          ? 'No hay citas para mostrar por ahora.'
          : 'No hay citas registradas hoy en este alcance.'
      },
      continuitySections: function() {
        const sections = this.continuitySummary && this.continuitySummary.sections
          ? this.continuitySummary.sections
          : {}

        return ['drafts', 'signatures', 'recentPatients', 'pulse']
          .map((key) => key === 'pulse' && sections[key] ? {...sections[key], label:'Actividad reciente',title:'Actividad reciente'} : sections[key])
          .filter((section) => section && section.available)
      },
      continuityOptions: function() {
        return this.continuitySections.map((section) => ({
          key: section.key,
          label: section.label
        }))
      },
      activeContinuity: function() {
        if(!this.continuitySections.length) {
          return EMPTY_CONTINUITY_SECTION
        }

        return this.continuitySections.find((section) => section.key === this.activeContinuityKey)
          || this.continuitySections[0]
      }
    },
    methods: {
      changeHomeScope: async function() {
        this.resetHomeIndicators()
        await Promise.all([this.loadContinuitySummary(), this.loadTodayAppointments()])
      },
      resetHomeIndicators: function() {
        this.continuityRequestVersion += 1
        this.appointmentsRequestVersion += 1
        this.continuitySummary = null
        this.todayAppointments = []
        this.continuityError = false
        this.appointmentsError = false
        this.appointmentsUnavailable = false
        this.isContinuityLoading = false
        this.isAppointmentsLoading = false
      },
      resetClinicalHome: function() {
        this.resetHomeIndicators()
        this.scopeContext = null
        this.searchRequestVersion += 1
        this.patients = []
        this.Param = ''
        this.showResult = false
        this.searchError = false
        this.searchServiceError = false
        this.isSearching = false
      },
      isCurrentHomeRequest: function(scope, version, key) {
        return !this.homeDisposed && Boolean(scope) && scope === this.homeSessionKey && this[key] === version
      },
      init: async function() {
        this.startHomeClock()
        await Promise.all([
          this.loadContinuitySummary(),
          this.loadTodayAppointments()
        ])
        if(!this.homeDisposed) this.startContinuityRotation()
      },
      startHomeClock: function() {
        this.currentDateTime = new Date()

        if(this.homeClockTimer) {
          clearInterval(this.homeClockTimer)
        }

        this.homeClockTimer = setInterval(() => {
          this.currentDateTime = new Date()
        }, 60000)
      },
      clearSearchMessages: function() {
        this.searchError = false
        this.searchServiceError = false
      },
      onSearch: async function() {
        if(!this.homeSessionKey || !this.hasPermission('px.all')) return
        const scope = this.homeSessionKey
        const version = ++this.searchRequestVersion
        const current = () => this.isCurrentHomeRequest(scope, version, 'searchRequestVersion')
        const param = this.Param ? this.Param.trim() : ''
        if(!param) {
          this.isSearching = false
          this.searchError = true
          this.searchServiceError = false
          return
        }

        this.isSearching = true
        this.searchError = false
        this.searchServiceError = false

        const data = {
          param: param
        }

        try {
          const response = await DAHomeService.getPatients(data)
          if(!current()) return
          this.patients = response && response.success ? response.data || [] : []
          this.searchServiceError = !(response && response.success)
          this.showResult = true
        }
        catch(error) {
          if(!current()) return
          this.patients = []
          this.searchServiceError = true
          this.showResult = true
        }
        finally {
          if(current()) this.isSearching = false
        }
      },
      onClearSearcher: function() {
        this.Param = ''
        this.searchRequestVersion += 1
        this.patients = []
        this.isSearching = false
        this.showResult = false
        this.searchError = false
        this.searchServiceError = false
      },
      onSelect: function(id) {
        if(!id) {
          return
        }

        this.$router.push('/px/history/' + id)
      },
      navigateTo: function(path) {
        if(!path) {
          return
        }

        this.$router.push(path).catch(() => {})
      },
      loadContinuitySummary: async function() {
        if(!this.homeSessionKey) return
        const scope = this.homeSessionKey
        const version = ++this.continuityRequestVersion
        const requestedScope = this.selectedScope
        const current = () => this.selectedScope === requestedScope && this.isCurrentHomeRequest(scope, version, 'continuityRequestVersion')
        this.isContinuityLoading = true
        this.continuityError = false

        try {
          const response = await DAHomeService.getContinuitySummary(this.selectedScope ? { scope: this.selectedScope } : {})
          if(!current()) return
          if(response && response.success) {
            this.applyContinuitySummary(response.data)
          }
          else {
            this.continuitySummary = null
            this.continuityError = true
          }
        }
        catch(error) {
          if(!current()) return
          this.continuitySummary = null
          this.continuityError = true
        }
        finally {
          if(current()) this.isContinuityLoading = false
        }
      },
      applyContinuitySummary: function(summary) {
        this.continuitySummary = summary || null
        if(summary && summary.scope) {
          this.scopeContext = {
            canSelectOwn: Boolean(summary.canSelectOwn),
            canSelectTenant: Boolean(summary.canSelectTenant),
            doctorName: summary.scope.doctorName || (this.scopeContext && this.scopeContext.doctorName) || ''
          }
        }
        if(!this.continuityOptions.some((option) => option.key === this.activeContinuityKey) && this.continuityOptions.length) {
          this.activeContinuityKey = this.continuityOptions[0].key
        }
      },
      startContinuityRotation: function() {
        if(this.continuityRotationTimer) {
          clearInterval(this.continuityRotationTimer)
        }

        this.continuityRotationTimer = setInterval(() => {
          if(!this.continuityRotationPaused && this.continuityOptions.length > 1) {
            this.advanceContinuity(1)
          }
        }, CONTINUITY_ROTATION_MS)
      },
      pauseContinuityRotation: function() {
        this.continuityRotationPaused = true
      },
      resumeContinuityRotation: function() {
        if(this.continuityResumeTimer) {
          return
        }

        this.continuityRotationPaused = false
      },
      pauseContinuityAfterManualChange: function() {
        this.continuityRotationPaused = true
        if(this.continuityResumeTimer) {
          clearTimeout(this.continuityResumeTimer)
        }
        this.continuityResumeTimer = setTimeout(() => {
          this.continuityRotationPaused = false
          this.continuityResumeTimer = null
        }, CONTINUITY_MANUAL_PAUSE_MS)
      },
      onContinuityManualChange: function() {
        this.pauseContinuityAfterManualChange()
      },
      showPreviousContinuity: function() {
        this.advanceContinuity(-1)
        this.pauseContinuityAfterManualChange()
      },
      showNextContinuity: function() {
        this.advanceContinuity(1)
        this.pauseContinuityAfterManualChange()
      },
      advanceContinuity: function(direction) {
        if(!this.continuityOptions.length) {
          return
        }

        const currentIndex = this.continuityOptions.findIndex((option) => option.key === this.activeContinuityKey)
        const safeIndex = currentIndex >= 0 ? currentIndex : 0
        const nextIndex = (safeIndex + direction + this.continuityOptions.length) % this.continuityOptions.length
        this.activeContinuityKey = this.continuityOptions[nextIndex].key
      },
      navigateToContinuityItem: function(item) {
        if(item && item.path) {
          this.navigateTo(item.path)
        }
      },
      loadTodayAppointments: async function() {
        if(!this.canViewAppointments || !this.homeSessionKey) {
          this.todayAppointments = []
          this.appointmentsError = false
          return
        }

        const scope = this.homeSessionKey
        const version = ++this.appointmentsRequestVersion
        const requestedScope = this.selectedScope
        const current = () => this.selectedScope === requestedScope && this.isCurrentHomeRequest(scope, version, 'appointmentsRequestVersion')

        this.isAppointmentsLoading = true
        this.appointmentsError = false
        this.appointmentsUnavailable = false

        try {
          const today = this.todayIsoDate()
          const response = await DAHomeService.getAppointments({ date: today, ...(this.selectedScope ? { scope: this.selectedScope } : {}) })
          if(!current()) return

          if(response && response.success) {
            this.todayAppointments = this.sortAppointments(response.data || [])
          }
          else {
            this.todayAppointments = []
            this.appointmentsError = true
          }
        }
        catch(error) {
          if(!current()) return
          this.todayAppointments = []
          this.appointmentsError = true
        }
        finally {
          if(current()) this.isAppointmentsLoading = false
        }
      },
      todayIsoDate: function() {
        const date = new Date()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${date.getFullYear()}-${month}-${day}`
      },
      sortAppointments: function(appointments) {
        return [...appointments].sort((left, right) => {
          const leftTime = this.appointmentStartTime(left)
          const rightTime = this.appointmentStartTime(right)
          return leftTime.localeCompare(rightTime)
        })
      },
      appointmentStartTime: function(appointment) {
        return appointment.startTime || appointment.start_time || appointment.hour || appointment.time || ''
      },
      appointmentDoctor: function(appointment) {
        return appointment.doctorName || appointment.doctor_name || appointment.doctor_name_snapshot || 'Doctor sin nombre registrado'
      },
      appointmentEndTime: function(appointment) {
        return appointment.endTime || appointment.end_time || ''
      },
      appointmentTime: function(appointment) {
        const start = this.appointmentStartTime(appointment)
        const end = this.appointmentEndTime(appointment)
        if(start && end) {
          return `${start} - ${end}`
        }

        return start || 'Horario por confirmar'
      },
      appointmentPatient: function(appointment) {
        return appointment.patientName
          || appointment.patient_name
          || appointment.name_complete
          || appointment.title
          || 'Paciente por confirmar'
      },
      appointmentStatus: function(appointment) {
        const status = appointment.status || appointment.appointment_status || ''
        return APPOINTMENT_STATUS_LABELS[status] || appointment.description || 'Cita registrada'
      },
      appointmentKey: function(appointment) {
        return appointment.id || appointment.id_appointment || `${this.appointmentPatient(appointment)}-${this.appointmentTime(appointment)}`
      },
      patientKey: function(patient) {
        return patient.id_person || `${patient.name || ''}-${patient.surname || ''}`
      },
      patientName: function(patient) {
        const fullName = `${patient.name || ''} ${patient.surname || ''}`.trim()
        return patient.name_complete || fullName || 'Paciente'
      },
      patientInitials: function(patient) {
        return this.initials(this.patientName(patient))
      },
      patientMeta: function(patient) {
        const details = []
        if(patient.telephone || patient.phone) {
          details.push(patient.telephone || patient.phone)
        }
        if(patient.age) {
          details.push(`${patient.age} años`)
        }
        if(patient.code || patient.folio) {
          details.push(`Folio ${patient.code || patient.folio}`)
        }

        return details.length ? details.join(' | ') : 'Expediente disponible'
      },
      initials: function(name) {
        return String(name || '')
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part.charAt(0))
          .join('')
          .toUpperCase()
      }
    }
}
</script>

<style scoped>
.home-page {
  width: 100%;
  min-height: 100%;
  padding: clamp(1rem, 2vw, 1.75rem);
}

.home-container {
  width: min(1240px, 100%);
  margin: 0 auto;
}

.home-hero,
.search-command,
.content-card {
  border: 1px solid rgba(15, 118, 110, 0.12);
  background: rgba(255, 255, 255, 0.94);
  border-radius: 1.2rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1.5rem;
  min-height: 12.5rem;
  padding: clamp(1.4rem, 3vw, 2.15rem);
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 253, 252, 0.98) 58%, rgba(236, 248, 246, 0.94) 100%);
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 0.4rem;
  color: #0f766e;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1rem;
  letter-spacing: 0;
  text-transform: uppercase;
}

.home-hero h1,
.section-heading h2 {
  margin: 0;
  color: #12313a;
  letter-spacing: 0;
}

.home-hero h1 {
  max-width: 42rem;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  line-height: 1.06;
}

.hero-description {
  max-width: 38rem;
  margin: 0.85rem 0 0;
  color: #475569;
  font-size: 1rem;
  line-height: 1.6rem;
}

.hero-visual {
  display: grid;
  place-items: center;
  width: 12rem;
  min-height: 9rem;
  border: 1px solid rgba(15, 118, 110, 0.08);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.66);
}

.hero-visual--seasonal {
  position: relative;
}

.hero-visual--day-of-dead {
  border-color: rgba(194, 104, 23, 0.24);
}

.hero-visual--christmas {
  border-color: rgba(48, 117, 82, 0.3);
}

.search-command {
  margin-top: 1.25rem;
  padding: clamp(1rem, 2vw, 1.35rem);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 253, 253, 0.96) 100%);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-heading.compact {
  margin-bottom: 0.75rem;
}

.section-heading h2 {
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.55rem;
}

.search-box {
  display: grid;
  grid-template-columns: minmax(16rem, 1fr) auto auto;
  gap: 0.75rem;
  align-items: center;
}

.patient-search-input {
  min-width: 0;
}

.primary-button,
.secondary-button,
.soft-link,
.mini-link,
.empty-state-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  border-radius: 0.85rem;
  font-weight: 800;
  letter-spacing: 0;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.primary-button {
  min-width: 8.25rem;
  padding: 0 1rem;
  color: #ffffff;
  background: #0f766e;
  box-shadow: 0 10px 20px rgba(15, 118, 110, 0.18);
}

.primary-button:hover,
.primary-button:focus {
  background: #115e59;
  outline: none;
}

.primary-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.primary-button .v-icon {
  color: #ffffff;
}

.secondary-button,
.soft-link,
.empty-state-action {
  border: 1px solid #b7e4df;
  color: #0f766e;
  background: #f0fdfa;
}

.secondary-button {
  min-width: 10.25rem;
  padding: 0 1rem;
}

.soft-link {
  min-height: 2.35rem;
  padding: 0 0.8rem;
  text-decoration: none;
}

.mini-link {
  min-height: 2.1rem;
  padding: 0 0.75rem;
  border: 1px solid #d6e6ea;
  color: #0f766e;
  background: #ffffff;
  text-decoration: none;
}

.secondary-button:hover,
.secondary-button:focus,
.soft-link:hover,
.soft-link:focus,
.mini-link:hover,
.mini-link:focus,
.empty-state-action:hover,
.empty-state-action:focus {
  border-color: #0f766e;
  outline: none;
}

.form-message {
  margin: 0.75rem 0 0;
  font-size: 0.88rem;
  font-weight: 700;
}

.form-message.is-warning {
  color: #8a5a00;
}

.form-message.is-error,
.inline-state.is-error {
  color: #b42318;
}

.patient-info strong,
.appointment-copy strong,
.empty-state strong {
  display: block;
  color: #12313a;
  font-weight: 900;
  letter-spacing: 0;
}

.patient-info small,
.appointment-copy small {
  display: block;
  margin-top: 0.15rem;
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.15rem;
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(20rem, 0.85fr);
  gap: 1.25rem;
  align-items: start;
  margin-top: 1.25rem;
}

.content-card {
  padding: clamp(1rem, 2vw, 1.25rem);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(251, 253, 253, 0.96) 100%);
}

.home-main-column,
.home-side-column {
  display: grid;
  gap: 1.25rem;
}

.card-progress {
  margin: -0.35rem 0 1rem;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border: 1px solid #d6e6ea;
  border-radius: 0.75rem;
  color: #64748b;
  background: #ffffff;
}

.icon-button:hover,
.icon-button:focus {
  color: #b42318;
  border-color: #fecaca;
  background: #fef2f2;
  outline: none;
}

.patient-results {
  display: grid;
  gap: 0.7rem;
}

.patient-result {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  min-height: 4.6rem;
  padding: 0.85rem;
  border: 1px solid #e0edf0;
  border-radius: 0.95rem;
  background: #ffffff;
  text-align: left;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.patient-result:hover,
.patient-result:focus {
  border-color: #8bd8d2;
  background: #fbfefe;
  transform: translateY(-1px);
  outline: none;
}

.patient-avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 0.85rem;
  background: #0f766e;
  color: #ffffff;
  font-weight: 900;
}

.patient-avatar {
  width: 2.8rem;
  height: 2.8rem;
}

.patient-info {
  min-width: 0;
}

.patient-info strong,
.patient-info small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patient-action {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #0f766e;
  font-size: 0.86rem;
  font-weight: 900;
}

.empty-state,
.inline-state {
  display: grid;
  place-items: center;
  gap: 0.45rem;
  min-height: 13rem;
  padding: 1.5rem;
  border: 1px dashed #c9dce2;
  border-radius: 0.95rem;
  color: #64748b;
  background: rgba(248, 251, 252, 0.72);
  text-align: center;
}

.empty-state.is-soft {
  background: #f8fbfc;
}

.empty-state .v-icon,
.inline-state .v-icon {
  color: #0f766e;
}

.empty-state p,
.inline-state p {
  max-width: 28rem;
  margin: 0;
  color: #64748b;
  line-height: 1.45rem;
}

.empty-state-action {
  min-height: 2.35rem;
  margin-top: 0.35rem;
  padding: 0 0.85rem;
  text-decoration: none;
}

.inline-state {
  min-height: 8.5rem;
}

.inline-state a {
  color: #0f766e;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.appointment-list {
  display: grid;
  gap: 0.65rem;
}

.appointment-item {
  display: grid;
  align-items: center;
  gap: 0.7rem;
  padding: 0.8rem;
  border: 1px solid #e0edf0;
  border-radius: 0.85rem;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035);
}

.appointment-item {
  grid-template-columns: auto 1fr;
}

.appointment-time {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.8rem;
  min-height: 2.2rem;
  padding: 0 0.55rem;
  border-radius: 999px;
  color: #0f766e;
  background: #e7f6f4;
  font-size: 0.78rem;
  font-weight: 900;
}

.continuity-card {
  overflow: hidden;
}

.continuity-heading {
  margin-bottom: 0.75rem;
}

.continuity-controls {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr) 2.25rem;
  gap: 0.45rem;
  align-items: center;
  margin-bottom: 0.85rem;
}

.continuity-arrow {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid #d6e6ea;
  border-radius: 0.5rem;
  color: #0f766e;
  background: #ffffff;
}

.continuity-arrow:hover,
.continuity-arrow:focus {
  border-color: #8bd8d2;
  background: #f0fdfa;
  outline: none;
}

.continuity-select {
  width: 100%;
  min-height: 2.25rem;
  padding: 0 2rem 0 0.8rem;
  border: 1px solid #d6e6ea;
  border-radius: 0.5rem;
  color: #12313a;
  background: #ffffff;
  font-size: 0.88rem;
  font-weight: 800;
}

.continuity-select:focus {
  border-color: #0f766e;
  outline: none;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
}

.continuity-panel {
  display: grid;
  gap: 0.85rem;
}

.continuity-hero-line {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  padding: 0.85rem;
  border: 1px solid #dff0ee;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #f7fffd 0%, #ffffff 100%);
}

.continuity-icon {
  display: grid;
  place-items: center;
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 0.5rem;
  color: #ffffff;
  background: #0f766e;
}

.continuity-icon .v-icon {
  color: #ffffff;
}

.continuity-hero-line strong {
  display: block;
  color: #12313a;
  font-size: 0.98rem;
  font-weight: 900;
  line-height: 1.25rem;
}

.continuity-hero-line p {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.84rem;
  line-height: 1.25rem;
}

.continuity-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.continuity-stat {
  min-width: 0;
  padding: 0.65rem;
  border: 1px solid #e0edf0;
  border-radius: 0.5rem;
  background: #ffffff;
}

.continuity-stat strong {
  display: block;
  color: #12313a;
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.2rem;
}

.continuity-stat span {
  display: block;
  margin-top: 0.28rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 0.95rem;
}

.continuity-stat.tone-warning {
  border-color: #e7dbc3;
  background: #fffaf0;
}

.continuity-stat.tone-danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.continuity-stat.tone-accent {
  border-color: #b7e4df;
  background: #f0fdfa;
}

.continuity-stat.tone-success {
  border-color: #c8eadc;
  background: #f3fbf7;
}

.continuity-stat.tone-neutral {
  border-color: #dfecef;
  background: #fbfefe;
}

.continuity-stat.tone-warning strong {
  color: #4f4634;
}

.continuity-stat.tone-accent strong,
.continuity-stat.tone-success strong {
  color: #0f766e;
}

.continuity-item-list {
  display: grid;
  gap: 0.5rem;
}

.continuity-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.65rem;
  border: 1px solid #e0edf0;
  border-radius: 0.5rem;
  background: #ffffff;
  text-align: left;
}

.continuity-item:hover,
.continuity-item:focus {
  border-color: #8bd8d2;
  background: #fbfefe;
  outline: none;
}

.continuity-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: #0f766e;
}

.continuity-item strong,
.continuity-item small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.continuity-item strong {
  color: #12313a;
  font-size: 0.85rem;
  font-weight: 900;
}

.continuity-item small {
  margin-top: 0.12rem;
  color: #64748b;
  font-size: 0.76rem;
  line-height: 1rem;
}

.continuity-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.35rem;
  padding: 0 0.85rem;
  border: 1px solid #b7e4df;
  border-radius: 0.5rem;
  color: #0f766e;
  background: #f0fdfa;
  font-weight: 900;
}

.continuity-action:hover,
.continuity-action:focus {
  border-color: #0f766e;
  outline: none;
}

html[data-theme="clinical-night"] .home-hero,
html[data-theme="clinical-night"] .search-command,
html[data-theme="clinical-night"] .content-card,
html[data-theme="clinical-night"] .patient-result,
html[data-theme="clinical-night"] .appointment-item,
html[data-theme="clinical-night"] .continuity-hero-line,
html[data-theme="clinical-night"] .continuity-stat,
html[data-theme="clinical-night"] .continuity-item,
html[data-theme="clinical-night"] .continuity-select,
html[data-theme="clinical-night"] .continuity-arrow {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] .home-hero h1,
html[data-theme="clinical-night"] .section-heading h2,
html[data-theme="clinical-night"] .patient-info strong,
html[data-theme="clinical-night"] .appointment-copy strong,
html[data-theme="clinical-night"] .empty-state strong,
html[data-theme="clinical-night"] .continuity-hero-line strong,
html[data-theme="clinical-night"] .continuity-stat strong,
html[data-theme="clinical-night"] .continuity-item strong,
html[data-theme="clinical-night"] .continuity-select {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .hero-description,
html[data-theme="clinical-night"] .patient-info small,
html[data-theme="clinical-night"] .appointment-copy small,
html[data-theme="clinical-night"] .empty-state p,
html[data-theme="clinical-night"] .inline-state p,
html[data-theme="clinical-night"] .continuity-hero-line p,
html[data-theme="clinical-night"] .continuity-stat span,
html[data-theme="clinical-night"] .continuity-item small {
  color: #94a3b8;
}

html[data-theme="clinical-night"] .empty-state,
html[data-theme="clinical-night"] .inline-state,
html[data-theme="clinical-night"] .icon-button {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.64);
}

@media (max-width: 1180px) {
  .home-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .home-page {
    padding: 0.85rem;
  }

  .home-hero {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 1.35rem;
  }

  .hero-visual {
    display: none;
  }

  .search-box {
    grid-template-columns: 1fr;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .soft-link,
  .mini-link {
    width: 100%;
  }

  .continuity-stat-grid {
    grid-template-columns: 1fr;
  }

  .patient-result {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .patient-action {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
</style>
