<template>
  <section class="home-page">
    <div class="home-container">
      <header class="home-hero">
        <div class="hero-copy">
          <p class="eyebrow">{{ formattedToday }}</p>
          <h1>{{ greetingTitle }}</h1>
          <p class="hero-description">
            Busca un paciente, revisa tus citas del dia o continua con la operacion diaria.
          </p>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <lottie-animation
            :key="heroLottiePath"
            :path="heroLottiePath"
            :width="190"
            :height="190"
            :speed="1"
          />
        </div>
      </header>

      <section class="search-command" aria-labelledby="patient-search-title">
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
          <section class="content-card search-results-card" aria-labelledby="search-results-title">
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
        </main>

        <aside class="home-side-column">
          <section class="content-card" aria-labelledby="appointments-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Hoy</p>
                <h2 id="appointments-title">Proximas citas</h2>
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

          <section class="content-card" aria-labelledby="birthdays-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Mes: {{ mesActual }}</p>
                <h2 id="birthdays-title">Cumpleaños del mes</h2>
              </div>
            </div>

            <v-progress-linear
              v-if="isBirthdaysLoading"
              indeterminate
              color="#0f766e"
              height="3"
              class="card-progress"
            ></v-progress-linear>

            <div v-if="birthdaysError" class="inline-state is-error">
              <v-icon size="24">mdi-alert-circle-outline</v-icon>
              <p>No pudimos cargar los cumpleaños. Intenta nuevamente.</p>
            </div>

            <div v-else-if="birthdays.length" class="birthday-list">
              <article
                v-for="birthday in visibleBirthdays"
                :key="birthdayKey(birthday)"
                class="birthday-item"
              >
                <span class="birthday-avatar">{{ birthdayInitials(birthday) }}</span>
                <span>
                  <strong>{{ birthday.name_complete || birthday.name || 'Paciente' }}</strong>
                  <small>{{ birthdayDetail(birthday) }}</small>
                </span>
              </article>

              <p v-if="birthdays.length > visibleBirthdays.length" class="list-note">
                +{{ birthdays.length - visibleBirthdays.length }} cumpleaños mas este mes
              </p>
            </div>

            <div v-else-if="!isBirthdaysLoading" class="inline-state">
              <v-icon size="24">mdi-cake-variant-outline</v-icon>
              <p>No hay cumpleaños registrados este mes.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </section>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import decode from 'jwt-decode';
import VuexMixin from '../../mixins/VuexMixin';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import { DAAppointmentService } from '../../services/context/core-proccess-context';
import { APPOINTMENT_STATUS_LABELS } from '../../domain/appointments/appointment.storage';
import { isD2AuthMode } from '../../services/config/authTransport.config';

const primeraLetraMayuscula = (cadena) => cadena.charAt(0).toUpperCase().concat(cadena.substring(1, cadena.length));

export default {
    name: 'Home',
    mixins: [VuexMixin],
    data: function() {
        return {
            Param: '',
            mesActual: '',
            showResult: false,
            searchError: false,
            searchServiceError: false,
            isSearching: false,
            isBirthdaysLoading: false,
            birthdaysError: false,
            isAppointmentsLoading: false,
            appointmentsError: false,
            appointmentsUnavailable: false,
            todayAppointments: [],
            currentDateTime: new Date(),
            homeClockTimer: null
        }
    },
    created() {
      this.init()
    },
    beforeDestroy() {
      if(this.homeClockTimer) {
        clearInterval(this.homeClockTimer)
      }
    },
    computed: {
      ...mapGetters(moduleTypes.HOME, {
        birthdays: fnTypes.getBirthdays,
        patients: fnTypes.getPatients
      }),
      ...mapGetters(moduleTypes.AUTH, {
        hasPermission: fnTypes.hasPermission,
        authUser: fnTypes.getUser,
        business: fnTypes.getBusiness
      }),
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
      visibleBirthdays: function() {
        return this.birthdays.slice(0, 5)
      },
      appointmentsEmptyMessage: function() {
        return this.appointmentsUnavailable
          ? 'No hay citas para mostrar por ahora.'
          : 'No tienes citas proximas hoy.'
      }
    },
    methods: {
      ...mapActions(moduleTypes.HOME, [
        fnTypes.getBirthdays,
        fnTypes.getPatients
      ]),

      init: async function() {
        this.startHomeClock()
        this.mesActual = new Intl.DateTimeFormat('es-ES', { month: 'long'}).format(new Date());
        this.mesActual = primeraLetraMayuscula(this.mesActual)
        await Promise.all([
          this.loadBirthdays(),
          this.loadTodayAppointments()
        ])
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
        const param = this.Param ? this.Param.trim() : ''
        if(!param) {
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
          const response = await this.ActionWrapp(moduleTypes.HOME, fnTypes.getPatients, data)
          this.searchServiceError = !(response && response.success)
          this.showResult = true
          this.Param = ''
        }
        catch(error) {
          this.searchServiceError = true
          this.showResult = true
        }
        finally {
          this.isSearching = false
        }
      },
      onClearSearcher: function() {
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
      loadBirthdays: async function() {
        this.isBirthdaysLoading = true
        this.birthdaysError = false

        try {
          const response = await this.ActionWrapp(moduleTypes.HOME, fnTypes.getBirthdays)
          this.birthdaysError = !(response && response.success)
        }
        catch(error) {
          this.birthdaysError = true
        }
        finally {
          this.isBirthdaysLoading = false
        }
      },
      loadTodayAppointments: async function() {
        if(!this.canViewAppointments) {
          this.todayAppointments = []
          this.appointmentsError = false
          return
        }

        this.isAppointmentsLoading = true
        this.appointmentsError = false
        this.appointmentsUnavailable = false

        try {
          const today = this.todayIsoDate()
          const response = await DAAppointmentService.list({
            date_from: today,
            date_to: today
          })

          if(response && response.success) {
            this.todayAppointments = this.sortAppointments(response.data || [])
          }
          else {
            this.todayAppointments = []
            this.appointmentsUnavailable = true
          }
        }
        catch(error) {
          this.todayAppointments = []
          this.appointmentsError = true
        }
        finally {
          this.isAppointmentsLoading = false
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
        if(patient.folio || patient.id_person) {
          details.push(`Folio ${patient.folio || patient.id_person}`)
        }

        return details.length ? details.join(' | ') : 'Expediente disponible'
      },
      birthdayKey: function(birthday) {
        return birthday.id_person || `${birthday.name_complete || birthday.name}-${birthday.birthday || ''}`
      },
      birthdayInitials: function(birthday) {
        return this.initials(birthday.name_complete || birthday.name || 'Paciente')
      },
      birthdayDetail: function(birthday) {
        const details = []
        if(birthday.birthday) {
          details.push(birthday.birthday)
        }
        if(birthday.age) {
          details.push(`${birthday.age} años`)
        }

        return details.length ? details.join(' | ') : 'Fecha registrada'
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
.birthday-item strong,
.empty-state strong {
  display: block;
  color: #12313a;
  font-weight: 900;
  letter-spacing: 0;
}

.patient-info small,
.appointment-copy small,
.birthday-item small {
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

.patient-avatar,
.birthday-avatar {
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

.appointment-list,
.birthday-list {
  display: grid;
  gap: 0.65rem;
}

.appointment-item,
.birthday-item {
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

.birthday-item {
  grid-template-columns: auto 1fr;
}

.birthday-avatar {
  width: 2.35rem;
  height: 2.35rem;
  font-size: 0.78rem;
}

.list-note {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
}

html[data-theme="clinical-night"] .home-hero,
html[data-theme="clinical-night"] .search-command,
html[data-theme="clinical-night"] .content-card,
html[data-theme="clinical-night"] .patient-result,
html[data-theme="clinical-night"] .appointment-item,
html[data-theme="clinical-night"] .birthday-item {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] .home-hero h1,
html[data-theme="clinical-night"] .section-heading h2,
html[data-theme="clinical-night"] .patient-info strong,
html[data-theme="clinical-night"] .appointment-copy strong,
html[data-theme="clinical-night"] .birthday-item strong,
html[data-theme="clinical-night"] .empty-state strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .hero-description,
html[data-theme="clinical-night"] .patient-info small,
html[data-theme="clinical-night"] .appointment-copy small,
html[data-theme="clinical-night"] .birthday-item small,
html[data-theme="clinical-night"] .empty-state p,
html[data-theme="clinical-night"] .inline-state p,
html[data-theme="clinical-night"] .list-note {
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

  .patient-result {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .patient-action {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
</style>
