<template>
  <section class="staff-page" :class="{'staff-compact': isCompactLayout}">
    <preparation-guide v-if="!isNew && !isEdit" branch="users" :busy="isUsersLoading" :control-labels="ownAuthorizationReview ? {users:'Revisar mis autorizaciones'} : {}" @focus-control="focusGuideControl" />
    <div ref="guideControls" class="staff-shell">
      <section v-if="!isNew && !isEdit" class="staff-hero">
        <div class="staff-hero-copy">
          <p class="staff-eyebrow">Personal y usuarios</p>
          <h1>Equipo del consultorio</h1>
          <p>
            Administra a las personas que entran al sistema, sus datos de contacto y el puesto que tienen dentro del consultorio.
          </p>
        </div>

        <div class="staff-actions">
          <button v-if="ownAuthorizationReview" ref="guideOwnAuthorization" type="button" class="staff-primary-action" @click="onEvent(ACTIONS.EDIT, ownUser.id_login)">Revisar mis autorizaciones</button>
          <button type="button" class="staff-icon-button" aria-label="Actualizar usuarios" :disabled="isUsersLoading || !!deactivatingId" @click="init">
            <v-icon size="20">mdi-refresh</v-icon>
          </button>
          <button type="button" class="staff-primary-action" @click="openNewUser">
            <v-icon size="19">mdi-account-plus-outline</v-icon>
            <span>Agregar personal</span>
          </button>
        </div>
      </section>

      <section v-if="!isNew && !isEdit" class="staff-summary-grid" aria-label="Resumen de usuarios">
        <article class="staff-summary-card">
          <span class="summary-icon"><v-icon size="22">mdi-account-group-outline</v-icon></span>
          <div>
            <strong>{{ totalUsers }}</strong>
            <small>{{ totalUsers === 1 ? 'Persona registrada' : 'Personas registradas' }}</small>
          </div>
        </article>

        <article class="staff-summary-card">
          <span class="summary-icon"><v-icon size="22">mdi-filter-outline</v-icon></span>
          <div>
            <strong>{{ filteredUsers.length }}</strong>
            <small>{{ filteredUsers.length === 1 ? 'Coincidencia visible' : 'Coincidencias visibles' }}</small>
          </div>
        </article>

        <article class="staff-summary-card">
          <span class="summary-icon"><v-icon size="22">mdi-briefcase-account-outline</v-icon></span>
          <div>
            <strong>{{ roleCount }}</strong>
            <small>{{ roleCount === 1 ? 'Puesto asignado' : 'Puestos asignados' }}</small>
          </div>
        </article>
      </section>

      <section v-if="isNew" class="staff-form-wrap" :class="{'animate-fade-in-down': isNew}">
        <da-add-user class="staff-form-card" v-on:success="onSuccess" v-on:close="closeNewUser"></da-add-user>
      </section>

      <section v-if="isEdit" class="staff-form-wrap" :class="{'animate-fade-in-down': isEdit}">
        <da-edit-user class="staff-form-card" :id="currentID" v-on:success="onSuccessEdit" v-on:close="closeEditUser"></da-edit-user>
      </section>

      <section v-if="!isNew && !isEdit" class="staff-panel">
        <div class="staff-panel-header">
          <div>
            <p class="staff-eyebrow">Directorio interno</p>
            <h2>Usuarios del sistema</h2>
          </div>

          <div class="staff-range" v-if="filteredUsers.length">
            {{ pageRangeText }}
          </div>
        </div>

        <div class="staff-toolbar">
          <v-text-field ref="guideSearch"
            v-model.trim="searchTerm"
            aria-label="Buscar usuarios"
            placeholder="Buscar por nombre, correo, telefono o puesto"
            prepend-inner-icon="mdi-magnify"
            clearable
            outlined
            dense
            hide-details
            :color="themePrimaryColor"
            class="staff-search-field"
            @click:clear="onClearSearch"
          ></v-text-field>

          <button type="button" class="staff-secondary-action" :disabled="!searchTerm" @click="onClearSearch">
            <v-icon size="18">mdi-close-circle-outline</v-icon>
            <span>Limpiar</span>
          </button>
        </div>

        <v-progress-linear
          v-if="isUsersLoading"
          indeterminate
          height="3"
          :color="themePrimaryColor"
          class="staff-progress"
        ></v-progress-linear>

        <div v-if="usersServiceError" class="staff-state staff-state-error">
          <v-icon size="32">mdi-alert-circle-outline</v-icon>
          <strong>No pudimos cargar el personal.</strong>
          <p>{{ usersErrorMessage || 'Intenta actualizar el listado en unos segundos.' }}</p>
          <button type="button" class="staff-primary-action compact" @click="init">
            <v-icon size="18">mdi-refresh</v-icon>
            <span>Actualizar</span>
          </button>
        </div>

        <div v-else-if="!isUsersLoading && totalUsers === 0" class="staff-state">
          <v-icon size="34">mdi-account-search-outline</v-icon>
          <strong>Aun no hay personal registrado.</strong>
          <p>Cuando agregues usuarios, apareceran en este directorio.</p>
          <button type="button" class="staff-primary-action compact" @click="openNewUser">
            <v-icon size="18">mdi-account-plus-outline</v-icon>
            <span>Agregar personal</span>
          </button>
        </div>

        <div v-else-if="!isUsersLoading && filteredUsers.length === 0" class="staff-state">
          <v-icon size="34">mdi-text-search</v-icon>
          <strong>No encontramos coincidencias.</strong>
          <p>Prueba con otro nombre, correo, telefono o puesto.</p>
        </div>

        <div v-else class="staff-table-card">
          <div class="staff-table-wrap">
            <table class="staff-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellidos</th>
                  <th>Contacto</th>
                  <th>Puesto</th>
                  <th>Estado</th>
                  <th class="staff-table-action">Accion</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in paginatedUsers" :key="userKey(user)">
                  <td>
                    <div class="staff-cell">
                      <span class="staff-avatar">{{ userInitials(user) }}</span>
                      <div class="staff-cell-copy">
                        <strong>{{ user.first_name || userName(user) }}</strong>
                        <small>{{ userEmail(user) }}</small>
                      </div>
                    </div>
                  </td>
                  <td><span class="staff-muted">{{ user.last_name || '—' }}</span></td>
                  <td>
                    <span class="staff-muted">{{ userPhone(user) }}</span>
                  </td>
                  <td>
                    <span class="staff-pill">{{ userRole(user) }}</span>
                  </td>
                  <td>
                    <span :class="['staff-status', userIsActive(user) ? 'is-active' : 'is-inactive']">
                      {{ userIsActive(user) ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <div class="staff-row-actions">
                      <v-tooltip bottom>
                        <template v-slot:activator="{ on, attrs }">
                          <button
                            type="button"
                            class="staff-action-button"
                            v-bind="attrs"
                            v-on="on"
                            @click="onEvent(ACTIONS.EDIT, user.id_login)"
                          >
                            <v-icon size="18">mdi-pencil-outline</v-icon>
                            <span>Editar</span>
                          </button>
                        </template>
                        <span>Editar usuario</span>
                      </v-tooltip>

                      <v-tooltip bottom>
                        <template v-slot:activator="{ on, attrs }">
                          <button
                            type="button"
                            class="staff-action-button danger"
                            :disabled="!!deactivatingId"
                            v-bind="attrs"
                            v-on="on"
                            @click="onEvent(ACTIONS.DELETE, user.id_login)"
                          >
                            <v-icon size="18">mdi-account-off-outline</v-icon>
                            <span>Desactivar</span>
                          </button>
                        </template>
                        <span>Desactivar usuario</span>
                      </v-tooltip>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="staff-mobile-list">
            <article v-for="user in paginatedUsers" :key="`mobile-${userKey(user)}`" class="staff-mobile-card">
              <div class="staff-mobile-head">
                <span class="staff-avatar">{{ userInitials(user) }}</span>
                <div>
                  <strong>{{ userName(user) }}</strong>
                  <small>{{ userEmail(user) }}</small>
                </div>
              </div>

              <dl class="staff-mobile-meta">
                <div>
                  <dt>Telefono</dt>
                  <dd>{{ userPhone(user) }}</dd>
                </div>
                <div>
                  <dt>Puesto</dt>
                  <dd>{{ userRole(user) }}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{{ userIsActive(user) ? 'Activo' : 'Inactivo' }}</dd>
                </div>
              </dl>

              <div class="staff-mobile-actions">
                <button type="button" class="staff-action-button mobile" @click="onEvent(ACTIONS.EDIT, user.id_login)">
                  <v-icon size="18">mdi-pencil-outline</v-icon>
                  <span>Editar</span>
                </button>
                <button type="button" class="staff-action-button danger mobile" :disabled="!!deactivatingId" @click="onEvent(ACTIONS.DELETE, user.id_login)">
                  <v-icon size="18">mdi-account-off-outline</v-icon>
                  <span>Desactivar</span>
                </button>
              </div>
            </article>
          </div>

          <div v-if="pageCount > 1" class="staff-pagination">
            <v-pagination
              v-model="page"
              :length="pageCount"
              :total-visible="7"
              :color="themePrimaryColor"
            ></v-pagination>
          </div>
        </div>
      </section>

      <v-dialog v-model="isDelete" persistent max-width="560">
        <v-card aria-labelledby="staff-deactivate-title">
          <v-card-title id="staff-deactivate-title">¿Desactivar a {{ selectedUserName }}?</v-card-title>
          <v-card-text>Esta persona dejará de tener acceso al sistema. Sus expedientes, documentos y actividad registrada se conservan; no se borran sus datos.</v-card-text>
          <v-card-text v-if="deleteError" role="alert" class="error--text">{{ deleteError }}</v-card-text>
          <v-card-actions class="flex-wrap">
            <v-spacer />
            <v-btn text :disabled="!!deactivatingId" @click="isDelete = false">Cancelar</v-btn>
            <v-btn color="error" :loading="!!deactivatingId" :disabled="!!deactivatingId" @click="onDelete(currentID)">Desactivar acceso</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </section>
</template>

<script>
import PreparationGuide from '../configuration/components/PreparationGuide.vue';
import { focusControl } from '../../domain/onboarding/focusControl';
import { mapActions, mapGetters } from 'vuex';
import VuexMixin from '../../mixins/VuexMixin';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import ACTIONS from '../../utils/common/actions';

export default {
    mixins: [VuexMixin],
    data: function() {
        return {
            searchTerm: '',
            page: 1,
            itemsPerPage: 8,
            isUsersLoading: false,
            usersServiceError: false,
            usersErrorMessage: '',
            listRequest: 0,
            deactivatingId: '',
            deleteError: '',
            isCompactLayout: false,
            isNew: false,
            isDelete: false,
            isEdit: false,
            ACTIONS,
            currentID: ''
        }
    },
    components: {
        PreparationGuide,
        'da-add-user': () => import('./DAAddUser.vue'),
        'da-edit-user': () => import('./DAEditUser.vue'),
    },
    created() {
        this.init()
    },
    mounted() { this.startResponsiveLayout(); },
    beforeDestroy() { this.listRequest++; this.stopResponsiveLayout(); },
    computed: {
        ...mapGetters(moduleTypes.AUTH, { authUser: fnTypes.getUser }),
        ownUser() { return this.safeUsers.find(user => user.id_login === (this.authUser || {}).id_login); },
        ownAuthorizationReview() { return this.$route.query.goal === 'authorizations' && !this.isUsersLoading && !this.usersServiceError && !!this.ownUser; },
        ...mapGetters(moduleTypes.USER, {
            users: fnTypes.getUsers,
            hasErrorInService: fnTypes.hasErrorInService
        }),

        safeUsers: function() {
            return Array.isArray(this.users) ? this.users : []
        },

        totalUsers: function() {
            return this.safeUsers.length
        },

        roleCount: function() {
            const roles = this.safeUsers
                .map((user) => this.userRole(user))
                .filter((role) => role && role !== 'Sin puesto')
            return new Set(roles).size
        },

        filteredUsers: function() {
            const term = this.normalizeText(this.searchTerm)
            if(!term) {
                return this.safeUsers
            }

            return this.safeUsers.filter((user) => {
                const searchable = [
                    this.userName(user),
                    this.userEmail(user),
                    this.userPhone(user),
                    this.userRole(user),
                    user.id_login
                ].join(' ')

                return this.normalizeText(searchable).indexOf(term) !== -1
            })
        },

        pageCount: function() {
            return Math.max(1, Math.ceil(this.filteredUsers.length / this.itemsPerPage))
        },

        paginatedUsers: function() {
            const start = (this.page - 1) * this.itemsPerPage
            return this.filteredUsers.slice(start, start + this.itemsPerPage)
        },

        pageRangeText: function() {
            if(!this.filteredUsers.length) {
                return ''
            }

            const start = ((this.page - 1) * this.itemsPerPage) + 1
            const end = Math.min(this.page * this.itemsPerPage, this.filteredUsers.length)
            return `${start}-${end} de ${this.filteredUsers.length}`
        },

        themePrimaryColor: function() {
            return 'var(--color-primary-700)'
        },
        selectedUserName() { return this.userName(this.safeUsers.find(user => user.id_login === this.currentID) || {}); }
    },
    methods: {
        focusGuideControl(id, reveal){focusControl(this.$refs.guideOwnAuthorization || this.$refs.guideSearch, reveal);},
        updateCompactLayout(width) {
            const measuredWidth = Number(width)
            if(Number.isFinite(measuredWidth) && measuredWidth > 0) this.isCompactLayout = measuredWidth <= 864
        },
        startResponsiveLayout() {
            this._staffResizeHandler = () => this.updateCompactLayout(this.$el.getBoundingClientRect().width || window.innerWidth)
            this._staffResizeHandler()
            if(typeof window.ResizeObserver === 'function') {
                this._staffResizeObserver = new window.ResizeObserver(entries => {
                    const entry = entries.find(item => item.target === this.$el)
                    if(entry) this.updateCompactLayout(entry.contentRect.width)
                })
                this._staffResizeObserver.observe(this.$el)
            }
            window.addEventListener('resize', this._staffResizeHandler)
        },
        stopResponsiveLayout() {
            if(this._staffResizeObserver) this._staffResizeObserver.disconnect()
            if(this._staffResizeHandler) window.removeEventListener('resize', this._staffResizeHandler)
            this._staffResizeObserver = null
            this._staffResizeHandler = null
        },
        ...mapActions(moduleTypes.USER, [
            fnTypes.update
        ]),

        init: async function() {
            const request = ++this.listRequest
            this.isNew = false
            this.isEdit = false
            this.isUsersLoading = true
            this.usersServiceError = false
            this.usersErrorMessage = ''

            try {
                const response = await this.ActionWrapp(moduleTypes.USER, fnTypes.getUsers)
                if(request !== this.listRequest) return false
                this.usersServiceError = !(response && response.success)
                if(this.usersServiceError) this.usersErrorMessage = response && response.message ? response.message : 'No se pudo consultar el personal. Actualiza para reintentar.'
                return !this.usersServiceError
            }
            catch(error) {
                if(request === this.listRequest) { this.usersServiceError = true; this.usersErrorMessage = 'No se pudo consultar el personal. Revisa la conexión y vuelve a intentar.' }
                return false
            }
            finally {
                if(request === this.listRequest) this.isUsersLoading = false
            }
        },

        openNewUser: function() {
            this.isNew = true
            this.isEdit = false
            this.currentID = ''
        },

        closeNewUser: function() {
            this.isNew = false
        },

        closeEditUser: function() {
            this.isEdit = false
            this.currentID = ''
        },

        onClearSearch: function() {
            this.searchTerm = ''
            this.page = 1
        },

        onEvent: function(type, id) {
            this.currentID = id
            switch(type) {
                case this.ACTIONS.DELETE:
                    this.deleteError = ''
                    this.isDelete = true
                    break
                case this.ACTIONS.EDIT:
                    this.isEdit = true
                    this.isNew = false
                    break
            }
        },

        onDelete: async function(id) {
            if(this.deactivatingId) return false
            const item = this.safeUsers.find(user => user.id_login === id)
            if(!item) return false
            this.deactivatingId = id
            this.deleteError = ''
            try {
                const response = await this.update({data: {...item, active:false}, id})
                if(!response || !response.success) {
                    this.deleteError = response && response.message ? response.message : 'No se pudo confirmar la desactivación. Actualiza el listado para verificar el estado antes de reintentar.'
                    return false
                }
                this.isDelete = false
                await this.init()
                return true
            } catch(error) {
                this.deleteError = 'No se pudo confirmar la desactivación. Actualiza el listado antes de volver a intentar.'
                return false
            } finally { this.deactivatingId = '' }
        },

        onSuccess: function() {
            this.init()
        },

        onSuccessEdit: function() {
            this.init()
        },

        userKey: function(user) {
            return user.id_login || `${user.name || ''}-${user.email || ''}-${user.phone || ''}`
        },

        userName: function(user) {
            return user.name || user.fullname || user.name_complete || 'Usuario sin nombre'
        },

        userInitials: function(user) {
            return this.userName(user)
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part.charAt(0))
                .join('')
                .toUpperCase()
        },

        userEmail: function(user) {
            return user.email || 'Sin correo'
        },

        userPhone: function(user) {
            return user.phone || user.telephone || user.celphone || 'Sin telefono'
        },

        userRole: function(user) {
            return user.desc_rol || user.role || user.rol || 'Sin puesto'
        },

        userIsActive: function(user) {
            return user.active !== false && user.active !== 0
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
.staff-page {
  width: 100%;
  min-height: 100%;
}

.staff-shell {
  width: min(100%, 100%);
  margin: 0 auto;
}

.staff-hero,
.staff-panel,
.staff-summary-card,
.staff-form-wrap {
  border: 1px solid rgba(8, 103, 131, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.staff-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: clamp(1.15rem, 2vw, 1.6rem);
  border-color: var(--color-primary-200, rgba(8, 103, 131, 0.16));
  background:
    linear-gradient(135deg, var(--color-primary-100, #e6f7fb) 0%, rgba(255, 255, 255, 0.94) 68%);
}

.staff-hero-copy {
  min-width: 0;
}

.staff-eyebrow {
  margin: 0 0 0.35rem;
  color: var(--color-primary-900, #086783);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1rem;
  text-transform: uppercase;
}

.staff-hero h1,
.staff-panel-header h2 {
  margin: 0;
  color: #12313a;
  letter-spacing: 0;
}

.staff-hero h1 {
  font-size: clamp(1.65rem, 3vw, 2.25rem);
  font-weight: 900;
  line-height: 1.08;
}

.staff-hero p:not(.staff-eyebrow) {
  max-width: 43rem;
  margin: 0.65rem 0 0;
  color: #475569;
  font-size: 0.96rem;
  line-height: 1.55rem;
}

.staff-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-shrink: 0;
}

.staff-primary-action,
.staff-secondary-action,
.staff-icon-button,
.staff-action-button {
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

.staff-primary-action {
  min-width: 11rem;
  padding: 0 1rem;
  border: 1px solid var(--color-primary-700, #1497bd);
  color: #ffffff;
  background: var(--color-primary-700, #1497bd);
  box-shadow: 0 10px 20px rgba(8, 103, 131, 0.16);
}

.staff-primary-action .v-icon,
.staff-action-button .v-icon {
  color: currentColor;
}

.staff-primary-action:hover,
.staff-primary-action:focus {
  background: var(--color-primary-900, #086783);
  border-color: var(--color-primary-900, #086783);
  color: #ffffff;
  outline: none;
  transform: translateY(-1px);
}

.staff-primary-action.compact {
  min-width: 0;
  min-height: 2.35rem;
  padding: 0 0.85rem;
}

.staff-icon-button,
.staff-secondary-action {
  border: 1px solid #d6e6ea;
  color: #64748b;
  background: #ffffff;
}

.staff-icon-button {
  width: 2.55rem;
  padding: 0;
}

.staff-secondary-action {
  min-width: 7.4rem;
  padding: 0 0.85rem;
}

.staff-secondary-action:disabled {
  cursor: default;
  opacity: 0.55;
}

.staff-icon-button:hover,
.staff-icon-button:focus,
.staff-secondary-action:not(:disabled):hover,
.staff-secondary-action:not(:disabled):focus {
  border-color: var(--color-primary-300, #a6e1f0);
  color: var(--color-primary-900, #086783);
  background: var(--color-primary-100, #e6f7fb);
  outline: none;
}

.staff-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}

.staff-summary-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  min-height: 5.3rem;
  padding: 1rem;
}

.staff-summary-card > div {
  min-width: 0;
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

.staff-summary-card strong {
  display: block;
  color: #12313a;
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1.65rem;
}

.staff-summary-card small {
  display: block;
  margin-top: 0.18rem;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.25rem;
  overflow-wrap: anywhere;
  white-space: normal;
}

.staff-form-wrap {
  padding: clamp(1rem, 2vw, 1.35rem);
}

.staff-form-card {
  width: 100%;
}

.staff-panel {
  margin-top: 1rem;
  overflow: hidden;
}

.staff-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem 1.25rem 1rem;
  border-bottom: 1px solid #e0edf0;
  background: rgba(255, 255, 255, 0.88);
}

.staff-panel-header h2 {
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.55rem;
}

.staff-range {
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

.staff-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #edf2f5;
  background: #fbfdfe;
}

.staff-search-field {
  min-width: 0;
}

.staff-progress {
  margin: 0;
}

.staff-table-card {
  margin: 0;
  overflow: hidden;
}

.staff-table-wrap {
  overflow-x: auto;
}

.staff-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.staff-table th {
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

.staff-table td {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #e8eef2;
  color: #475569;
  font-size: 0.9rem;
  vertical-align: middle;
}

.staff-table tbody tr {
  transition: background-color 160ms ease;
}

.staff-table tbody tr:hover {
  background: #fbfdfe;
}

.staff-table tbody tr:last-child td {
  border-bottom: 0;
}

.staff-table-action {
  text-align: right !important;
}

.staff-cell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.staff-avatar {
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

.staff-cell-copy,
.staff-mobile-head div {
  min-width: 0;
}

.staff-cell-copy strong,
.staff-mobile-head strong {
  display: block;
  overflow: hidden;
  color: #12313a;
  font-weight: 900;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.staff-cell-copy small,
.staff-mobile-head small {
  display: block;
  overflow: hidden;
  margin-top: 0.12rem;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.staff-muted {
  color: #64748b;
  font-weight: 700;
}

.staff-pill,
.staff-status {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
}

.staff-pill {
  border: 1px solid #dbe7eb;
  color: #475569;
  background: #f8fafc;
}

.staff-status.is-active {
  border: 1px solid #bbf7d0;
  color: #166534;
  background: #f0fdf4;
}

.staff-status.is-inactive {
  border: 1px solid #fecaca;
  color: #b91c1c;
  background: #fef2f2;
}

.staff-row-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.staff-action-button {
  min-width: 0;
  padding: 0 0.85rem;
  border: 1px solid var(--color-primary-700, #1497bd);
  color: var(--color-primary-900, #086783);
  background: #ffffff;
}

.staff-action-button:hover,
.staff-action-button:focus {
  color: #ffffff;
  background: var(--color-primary-900, #086783);
  border-color: var(--color-primary-900, #086783);
  outline: none;
  transform: translateY(-1px);
}

.staff-action-button.danger {
  border-color: #fecaca;
  color: #b91c1c;
}

.staff-action-button.danger:hover,
.staff-action-button.danger:focus {
  border-color: #b91c1c;
  color: #ffffff;
  background: #b91c1c;
}

.staff-mobile-list {
  display: none;
}

.staff-pagination {
  display: flex;
  justify-content: center;
  padding: 0.9rem 1rem 1rem;
  border-top: 1px solid #e8eef2;
  background: #fbfdfe;
}

.staff-state {
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

.staff-state .v-icon {
  color: var(--color-primary-700, #1497bd);
}

.staff-state strong {
  color: #12313a;
  font-weight: 900;
}

.staff-state p {
  max-width: 30rem;
  margin: 0;
  color: #64748b;
  line-height: 1.45rem;
}

.staff-state-error .v-icon,
.staff-state-error strong {
  color: #b42318;
}

html[data-theme="clinical-night"] .staff-hero,
html[data-theme="clinical-night"] .staff-panel,
html[data-theme="clinical-night"] .staff-summary-card,
html[data-theme="clinical-night"] .staff-toolbar,
html[data-theme="clinical-night"] .staff-form-wrap {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] .staff-hero h1,
html[data-theme="clinical-night"] .staff-panel-header h2,
html[data-theme="clinical-night"] .staff-summary-card strong,
html[data-theme="clinical-night"] .staff-cell-copy strong,
html[data-theme="clinical-night"] .staff-mobile-head strong,
html[data-theme="clinical-night"] .staff-state strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .staff-hero p:not(.staff-eyebrow),
html[data-theme="clinical-night"] .staff-summary-card small,
html[data-theme="clinical-night"] .staff-cell-copy small,
html[data-theme="clinical-night"] .staff-mobile-head small,
html[data-theme="clinical-night"] .staff-muted,
html[data-theme="clinical-night"] .staff-state p {
  color: #94a3b8;
}

html[data-theme="clinical-night"] .staff-panel-header,
html[data-theme="clinical-night"] .staff-pagination {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.72);
}

html[data-theme="clinical-night"] .staff-table td {
  border-bottom-color: rgba(148, 163, 184, 0.16);
  color: #cbd5e1;
}

html[data-theme="clinical-night"] .staff-table tbody tr:hover,
html[data-theme="clinical-night"] .staff-state,
html[data-theme="clinical-night"] .staff-pill,
html[data-theme="clinical-night"] .staff-icon-button,
html[data-theme="clinical-night"] .staff-secondary-action,
html[data-theme="clinical-night"] .staff-action-button {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.68);
}

@media (max-width: 1100px) {
  .staff-row-actions {
    align-items: stretch;
    flex-direction: column;
  }
}

.staff-page.staff-compact .staff-summary-grid {
  grid-template-columns: minmax(0, 1fr);
}

.staff-page.staff-compact .staff-table-wrap {
  display: none;
}

.staff-page.staff-compact .staff-mobile-list {
  display: grid;
}

.staff-mobile-list {
  gap: 0.8rem;
  padding: 0.9rem;
}

.staff-mobile-card {
  display: grid;
  gap: 0.8rem;
  min-width: 0;
  padding: 0.9rem;
  border: 1px solid #e0edf0;
  border-radius: 8px;
  background: #ffffff;
}

.staff-mobile-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.staff-mobile-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: 0.65rem;
  margin: 0;
}

.staff-mobile-meta div {
  min-width: 0;
  padding: 0.7rem;
  border: 1px solid #e8eef2;
  border-radius: 8px;
  background: #f8fafc;
}

.staff-mobile-meta dt {
  margin: 0 0 0.25rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.staff-mobile-meta dd {
  overflow: hidden;
  margin: 0;
  color: #12313a;
  font-size: 0.86rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.staff-mobile-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: 0.65rem;
}

.staff-action-button.mobile {
  width: 100%;
  min-width: 0;
}

html[data-theme="clinical-night"] .staff-mobile-card,
html[data-theme="clinical-night"] .staff-mobile-meta div {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.62);
}

html[data-theme="clinical-night"] .staff-mobile-meta dd {
  color: #e2e8f0;
}

@media (max-width: 980px) {
  .staff-table-wrap {
    display: none;
  }

  .staff-mobile-list {
    display: grid;
  }
}
@media (max-width: 720px) {
  .staff-summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .staff-hero,
  .staff-panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .staff-toolbar {
    grid-template-columns: 1fr;
  }

  .staff-actions {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    width: 100%;
  }

  .staff-icon-button {
    width: 2.55rem;
    flex-shrink: 0;
  }

  .staff-primary-action,
  .staff-secondary-action {
    width: 100%;
  }

  .staff-panel-header,
  .staff-toolbar {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .staff-mobile-meta,
  .staff-mobile-actions {
    grid-template-columns: 1fr;
  }
}
</style>
