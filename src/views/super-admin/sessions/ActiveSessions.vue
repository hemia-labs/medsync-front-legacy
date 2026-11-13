<template>
  <div class="sessions-page">
    <section class="intro-panel">
      <div>
        <p class="eyebrow">Administración global</p>
        <h1>Sesiones activas</h1>
        <span>Consulta y cierre seguro de sesiones activas del sistema.</span>
      </div>
    </section>

    <v-alert type="info" dense text class="info-alert">
      El cierre de sesión invalida la sesión activa en backend. Para efecto inmediato, el backend debe operar con REQUIRE_ACTIVE_SESSION=true.
    </v-alert>

    <section class="filters-panel" aria-label="Filtros de sesiones activas">
      <v-text-field
        v-model="filters.search"
        label="Buscar sesión"
        prepend-inner-icon="mdi-magnify"
        outlined
        dense
        hide-details
        clearable
        @input="onSearchInput"
        @click:clear="onSearchClear"
      />

      <v-select
        v-model="filters.businessId"
        :items="businessOptions"
        :loading="isLoadingBusinesses"
        label="Negocio"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="filters.role"
        :items="roleOptions"
        label="Rol"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="filters.active"
        :items="stateOptions"
        label="Estado"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="pagination.pageSize"
        :items="pageSizeOptions"
        label="Por página"
        outlined
        dense
        hide-details
        @change="onPageSizeChange"
      />
    </section>

    <section class="table-panel" aria-label="Listado paginado de sesiones">
      <div class="table-toolbar">
        <div>
          <strong>{{ pagination.total }}</strong>
          <span> sesiones encontradas</span>
        </div>

        <v-btn text small color="primary" :loading="isLoading" @click="fetchSessions">
          <v-icon left small>mdi-refresh</v-icon>
          Actualizar
        </v-btn>
      </div>

      <v-alert v-if="errorMessage" type="error" dense text class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-progress-linear v-if="isLoading" indeterminate color="primary" height="3" />

      <div class="table-scroll">
        <table class="session-table">
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
            <tr v-for="session in sessions" :key="session.id_session">
              <td class="name-cell">{{ getUserName(session) }}</td>
              <td>{{ getUserEmail(session) }}</td>
              <td>
                <span class="role-chip">{{ getUserRole(session) }}</span>
              </td>
              <td>{{ getBusinessName(session) }}</td>
              <td>
                <span :class="['state-chip', session.active ? 'is-active' : 'is-inactive']">
                  {{ session.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td>
                <span :class="['state-chip', session.last ? 'is-last' : 'is-not-last']">
                  {{ session.last ? 'Si' : 'No' }}
                </span>
              </td>
              <td>{{ formatDate(session.created_at) }}</td>
              <td>{{ formatDate(session.updated_at) }}</td>
              <td>{{ formatDate(session.forced_at) }}</td>
              <td>{{ session.forced_by || 'Sin registro' }}</td>
              <td class="actions-cell">
                <span v-if="isOwnSession(session)" class="own-session-chip">Sesión propia</span>
                <span v-else-if="!session.active" class="closed-chip">Cerrada</span>
                <template v-else>
                  <v-btn
                    small
                    depressed
                    color="warning"
                    :disabled="isActionLoading"
                    @click="openCloseSessionDialog(session)"
                  >
                    <v-icon left small>mdi-logout-variant</v-icon>
                    Cerrar sesión
                  </v-btn>
                  <v-btn
                    small
                    outlined
                    color="error"
                    :disabled="isActionLoading"
                    @click="openCloseUserDialog(session)"
                  >
                    <v-icon left small>mdi-account-cancel-outline</v-icon>
                    Cerrar sesiones del usuario
                  </v-btn>
                </template>
              </td>
            </tr>

            <tr v-if="!isLoading && !sessions.length">
              <td colspan="11">
                <div class="empty-state">
                  <v-icon size="36">mdi-monitor-off</v-icon>
                  <strong>No hay sesiones para mostrar</strong>
                  <span>Ajusta la búsqueda o los filtros para consultar otros resultados.</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <span>Página {{ pagination.page }} de {{ safeTotalPages }}</span>

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

    <v-dialog v-model="closeSessionDialog.show" max-width="560">
      <v-card>
        <v-card-title>Cerrar sesión activa</v-card-title>
        <v-card-text>
          <div class="confirm-summary">
            <strong>{{ getUserName(closeSessionDialog.session) }}</strong>
            <span>{{ getUserEmail(closeSessionDialog.session) }}</span>
            <span>{{ getBusinessName(closeSessionDialog.session) }}</span>
          </div>
          <p class="confirm-message">
            Esta acción cerrará la sesión activa del usuario. Si el backend está con REQUIRE_ACTIVE_SESSION=true, el access token dejará de funcionar inmediatamente.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="isActionLoading" @click="resetDialogs">Cancelar</v-btn>
          <v-btn color="warning" depressed :loading="isActionLoading" @click="confirmCloseSession">
            Confirmar cierre
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="closeUserDialog.show" max-width="620">
      <v-card>
        <v-card-title>Cerrar sesiones del usuario</v-card-title>
        <v-card-text>
          <div class="confirm-summary">
            <strong>{{ getUserName(closeUserDialog.session) }}</strong>
            <span>{{ getUserEmail(closeUserDialog.session) }}</span>
            <span>{{ getBusinessName(closeUserDialog.session) }}</span>
          </div>
          <p class="confirm-message">
            Esta acción cerrará todas las sesiones activas de este usuario e invalidará sus refresh tokens activos. El usuario tendrá que iniciar sesión nuevamente.
          </p>
          <v-text-field
            v-model="closeUserDialog.confirmText"
            label="Escribe CERRAR para confirmar"
            outlined
            dense
            hide-details
            autocomplete="off"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="isActionLoading" @click="resetDialogs">Cancelar</v-btn>
          <v-btn
            color="error"
            depressed
            :disabled="closeUserDialog.confirmText !== 'CERRAR'"
            :loading="isActionLoading"
            @click="confirmCloseUserSessions"
          >
            Confirmar cierre
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
import { mapGetters } from 'vuex';
import { DASuperAdminService } from '@/services/context/core-proccess-context';
import moduleTypes from '@/store/modules/common/module-types';
import fnTypes from '@/store/modules/common/fn-types';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_DIR = 'desc';
const ALLOWED_SORTS = [
  'created_at',
  'updated_at',
  'active',
  'last',
  'user_name',
  'email',
  'role',
  'business_name'
];

export default {
  data: function() {
    return {
      sessions: [],
      isLoading: false,
      isActionLoading: false,
      isLoadingBusinesses: false,
      errorMessage: '',
      searchTimer: null,
      filters: {
        search: '',
        businessId: '',
        role: '',
        active: 'true'
      },
      pagination: {
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 0
      },
      sortBy: DEFAULT_SORT_BY,
      sortDir: DEFAULT_SORT_DIR,
      businessOptions: [
        { text: 'Todos', value: '' }
      ],
      roleOptions: [
        { text: 'Todos', value: '' },
        { text: 'super_admin', value: 'super_admin' },
        { text: 'admin', value: 'admin' },
        { text: 'business_admin', value: 'business_admin' },
        { text: 'doctor', value: 'doctor' },
        { text: 'assistant', value: 'assistant' },
        { text: 'reception', value: 'reception' },
        { text: 'receptionist', value: 'receptionist' }
      ],
      stateOptions: [
        { text: 'Activas', value: 'true' },
        { text: 'Inactivas', value: 'false' },
        { text: 'Todas', value: 'all' }
      ],
      pageSizeOptions: [10, 20, 50, 100],
      headers: [
        { text: 'Usuario', value: 'user_name', sortable: true },
        { text: 'Correo', value: 'email', sortable: true },
        { text: 'Rol', value: 'role', sortable: true },
        { text: 'Negocio', value: 'business_name', sortable: true },
        { text: 'Activa', value: 'active', sortable: true },
        { text: 'Última', value: 'last', sortable: true },
        { text: 'Inicio', value: 'created_at', sortable: true },
        { text: 'Actualizacion', value: 'updated_at', sortable: true },
        { text: 'Cierre forzado', value: 'forced_at', sortable: false },
        { text: 'Forzada por', value: 'forced_by', sortable: false },
        { text: 'Acciones', value: 'actions', sortable: false }
      ],
      closeSessionDialog: {
        show: false,
        session: null
      },
      closeUserDialog: {
        show: false,
        session: null,
        confirmText: ''
      },
      snackbar: {
        show: false,
        color: 'success',
        text: ''
      }
    };
  },

  computed: {
    ...mapGetters(moduleTypes.AUTH, {
      authUser: fnTypes.getUser
    }),
    safeTotalPages: function() {
      return Math.max(Number(this.pagination.totalPages) || 0, 1);
    }
  },

  mounted: function() {
    this.fetchBusinesses();
    this.fetchSessions();
  },

  beforeDestroy: function() {
    if(this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  },

  methods: {
    buildParams: function() {
      return {
        page: this.pagination.page,
        pageSize: this.pagination.pageSize,
        search: this.filters.search,
        businessId: this.filters.businessId,
        role: this.filters.role,
        active: this.filters.active,
        sortBy: ALLOWED_SORTS.includes(this.sortBy) ? this.sortBy : DEFAULT_SORT_BY,
        sortDir: this.sortDir === 'asc' ? 'asc' : 'desc'
      };
    },

    fetchSessions: async function() {
      this.isLoading = true;
      this.errorMessage = '';

      const response = await DASuperAdminService.getSessions(this.buildParams());

      if(response && response.success) {
        const payload = response.data || {};
        const pagination = payload.pagination || {};

        this.sessions = Array.isArray(payload.data) ? payload.data : [];
        this.pagination = {
          page: Number(pagination.page) || this.pagination.page,
          pageSize: Number(pagination.pageSize) || this.pagination.pageSize,
          total: Number(pagination.total) || 0,
          totalPages: Number(pagination.totalPages) || 0
        };
      } else {
        this.sessions = [];
        this.pagination.total = 0;
        this.pagination.totalPages = 0;
        this.handleRequestError(response, 'No fue posible cargar el listado de sesiones.');
      }

      this.isLoading = false;
    },

    fetchBusinesses: async function() {
      this.isLoadingBusinesses = true;

      const response = await DASuperAdminService.getBusinesses({
        page: 1,
        pageSize: 100,
        sortBy: 'name',
        sortDir: 'asc'
      });

      if(response && response.success) {
        const payload = response.data || {};
        const businesses = Array.isArray(payload.data) ? payload.data : [];
        this.businessOptions = [
          { text: 'Todos', value: '' },
          ...businesses.map((business) => ({
            text: business.name || business.id_business,
            value: business.id_business
          }))
        ];
      } else {
        this.showSnackbar('error', 'No fue posible cargar el filtro de negocios.');
      }

      this.isLoadingBusinesses = false;
    },

    handleRequestError: function(response, fallbackMessage) {
      const status = response && Number(response.status);

      if(status === 401) {
        this.errorMessage = 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.';
        return;
      }

      if(status === 403) {
        this.errorMessage = 'No tienes permiso para realizar esta acción o consultar esta información.';
        return;
      }

      if(status === 404) {
        this.errorMessage = 'La sesión o usuario solicitado ya no está disponible.';
        return;
      }

      this.errorMessage = response && response.message ? response.message : fallbackMessage;
    },

    handleActionError: function(response) {
      const status = response && Number(response.status);

      if(status === 401) {
        this.showSnackbar('error', 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
        return;
      }

      if(status === 403) {
        this.showSnackbar('error', 'No puedes cerrar tu propia sesión desde este módulo o no tienes permiso para esta acción.');
        return;
      }

      if(status === 404) {
        this.showSnackbar('error', 'La sesión o usuario ya no está disponible.');
        return;
      }

      this.showSnackbar('error', 'No fue posible cerrar la sesión. Intenta nuevamente.');
    },

    openCloseSessionDialog: function(session) {
      if(this.isOwnSession(session) || !session.active) {
        return;
      }

      this.closeSessionDialog = {
        show: true,
        session
      };
    },

    openCloseUserDialog: function(session) {
      if(this.isOwnSession(session) || !session.active) {
        return;
      }

      this.closeUserDialog = {
        show: true,
        session,
        confirmText: ''
      };
    },

    confirmCloseSession: async function() {
      const session = this.closeSessionDialog.session;
      if(!session || !session.id_session) {
        return;
      }

      this.isActionLoading = true;
      const response = await DASuperAdminService.closeSession(session.id_session);

      if(response && response.success) {
        this.showSnackbar('success', 'Sesión cerrada correctamente.');
        this.resetDialogs();
        await this.fetchSessions();
      } else {
        this.handleActionError(response);
      }

      this.isActionLoading = false;
    },

    confirmCloseUserSessions: async function() {
      const session = this.closeUserDialog.session;
      const userId = session && session.user ? session.user.id_login : null;

      if(!userId || this.closeUserDialog.confirmText !== 'CERRAR') {
        return;
      }

      this.isActionLoading = true;
      const response = await DASuperAdminService.closeUserSessions(userId);

      if(response && response.success) {
        this.showSnackbar('success', 'Sesiones del usuario cerradas correctamente.');
        this.resetDialogs();
        await this.fetchSessions();
      } else {
        this.handleActionError(response);
      }

      this.isActionLoading = false;
    },

    resetDialogs: function() {
      this.closeSessionDialog = {
        show: false,
        session: null
      };
      this.closeUserDialog = {
        show: false,
        session: null,
        confirmText: ''
      };
    },

    onSearchInput: function() {
      if(this.searchTimer) {
        clearTimeout(this.searchTimer);
      }

      this.searchTimer = setTimeout(() => {
        this.pagination.page = 1;
        this.fetchSessions();
      }, 450);
    },

    onSearchClear: function() {
      this.filters.search = '';
      this.pagination.page = 1;
      this.fetchSessions();
    },

    onFilterChange: function() {
      this.pagination.page = 1;
      this.fetchSessions();
    },

    onPageSizeChange: function() {
      this.pagination.page = 1;
      this.fetchSessions();
    },

    onPageChange: function(page) {
      this.pagination.page = page;
      this.fetchSessions();
    },

    toggleSort: function(column) {
      if(!ALLOWED_SORTS.includes(column)) {
        return;
      }

      if(this.sortBy === column) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortBy = column;
        this.sortDir = ['user_name', 'email', 'role', 'business_name'].includes(column) ? 'asc' : 'desc';
      }

      this.pagination.page = 1;
      this.fetchSessions();
    },

    getSortIcon: function(column) {
      if(this.sortBy !== column) {
        return 'mdi-swap-vertical';
      }

      return this.sortDir === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down';
    },

    isOwnSession: function(session) {
      if(!session || !this.authUser) {
        return false;
      }

      const sessionUserId = session.user && session.user.id_login;
      return session.id_session === this.authUser.id_session || sessionUserId === this.authUser.id_login;
    },

    getUserName: function(session) {
      return session && session.user && session.user.name ? session.user.name : 'Sin nombre';
    },

    getUserEmail: function(session) {
      return session && session.user && session.user.email ? session.user.email : 'Sin correo';
    },

    getUserRole: function(session) {
      return session && session.user && session.user.role ? session.user.role : 'Sin rol';
    },

    getBusinessName: function(session) {
      return session && session.business && session.business.name ? session.business.name : 'Sin negocio';
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

    showSnackbar: function(color, text) {
      this.snackbar = {
        show: true,
        color,
        text
      };
    }
  }
};
</script>

<style scoped>
.sessions-page {
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
  font-weight: 600;
  text-transform: uppercase;
}

.intro-panel h1 {
  margin: 0;
  color: #111827;
  font-size: 1.65rem;
  line-height: 2rem;
  font-weight: 600;
  letter-spacing: 0;
}

.intro-panel span {
  display: block;
  max-width: 55rem;
  margin-top: 0.75rem;
  color: #4b5563;
  line-height: 1.5rem;
}

.info-alert {
  margin: 0;
}

.filters-panel {
  display: grid;
  grid-template-columns: minmax(16rem, 1.2fr) minmax(12rem, 1fr) minmax(9rem, 0.7fr) minmax(9rem, 0.7fr) minmax(9rem, 0.6fr);
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

.session-table {
  width: 100%;
  min-width: 104rem;
  border-collapse: collapse;
}

.session-table th,
.session-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #eef2f7;
  color: #374151;
  font-size: 0.9rem;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.session-table th {
  background: #f9fafb;
  color: #111827;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.name-cell {
  color: #111827;
  font-weight: 600;
}

.actions-cell {
  min-width: 22rem;
}

.actions-cell .v-btn {
  margin-right: 0.5rem;
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

.role-chip,
.state-chip,
.own-session-chip,
.closed-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0 0.65rem;
  border: 1px solid #d1d5db;
  color: #374151;
  background: #f9fafb;
  font-size: 0.78rem;
  font-weight: 600;
}

.state-chip.is-active,
.state-chip.is-last {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.state-chip.is-inactive,
.state-chip.is-not-last,
.closed-chip {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.own-session-chip {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
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

@media (max-width: 1100px) {
  .filters-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .intro-panel {
    display: grid;
  }

  .filters-panel {
    grid-template-columns: 1fr;
  }

  .pagination-bar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
