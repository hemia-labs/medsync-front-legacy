<template>
  <div class="users-page">
    <section class="intro-panel">
      <div>
        <p class="eyebrow">Administración global</p>
        <h1>Usuarios</h1>
        <span>Consulta administrativa de cuentas de acceso al sistema.</span>
      </div>

      <v-btn class="create-button" color="primary" depressed disabled>
        <v-icon left>mdi-account-plus-outline</v-icon>
        Crear usuario
        <span class="soon-label">Proximamente</span>
      </v-btn>
    </section>

    <section class="filters-panel" aria-label="Filtros de usuarios">
      <v-text-field
        v-model="filters.search"
        label="Buscar cuenta"
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
        :items="activeOptions"
        label="Activo"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="filters.locked"
        :items="lockedOptions"
        label="Bloqueado"
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

    <section class="table-panel" aria-label="Listado paginado de usuarios">
      <div class="table-toolbar">
        <div>
          <strong>{{ pagination.total }}</strong>
          <span> cuentas encontradas</span>
        </div>

        <v-btn text small color="primary" :loading="isLoading" @click="fetchUsers">
          <v-icon left small>mdi-refresh</v-icon>
          Actualizar
        </v-btn>
      </div>

      <v-alert v-if="errorMessage" type="error" dense text class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-progress-linear v-if="isLoading" indeterminate color="primary" height="3" />

      <div class="table-scroll">
        <table class="user-table">
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
            <tr v-for="user in users" :key="user.id_login">
              <td class="name-cell">{{ user.name || 'Sin nombre' }}</td>
              <td>{{ user.email || 'Sin correo' }}</td>
              <td>
                <span class="role-chip">{{ user.role || 'Sin rol' }}</span>
              </td>
              <td>{{ user.business && user.business.name ? user.business.name : 'Sin negocio' }}</td>
              <td>
                <span :class="['state-chip', user.active ? 'is-active' : 'is-inactive']">
                  {{ user.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <span :class="['state-chip', user.locked ? 'is-locked' : 'is-unlocked']">
                  {{ formatLocked(user.locked) }}
                </span>
              </td>
              <td>{{ formatDate(user.last_activity_at) }}</td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>{{ formatDate(user.updated_at) }}</td>
            </tr>

            <tr v-if="!isLoading && !users.length">
              <td colspan="9">
                <div class="empty-state">
                  <v-icon size="36">mdi-account-search-outline</v-icon>
                  <strong>No hay cuentas para mostrar</strong>
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
  </div>
</template>

<script>
import { DASuperAdminService } from '@/services/context/core-proccess-context';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_DIR = 'desc';
const ALLOWED_SORTS = [
  'created_at',
  'updated_at',
  'name',
  'email',
  'active',
  'locked',
  'role',
  'business_name',
  'last_activity_at'
];

export default {
  data: function() {
    return {
      users: [],
      isLoading: false,
      isLoadingBusinesses: false,
      errorMessage: '',
      businessLoadError: '',
      searchTimer: null,
      filters: {
        search: '',
        businessId: '',
        role: '',
        active: '',
        locked: ''
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
      activeOptions: [
        { text: 'Todos', value: '' },
        { text: 'Activos', value: 'true' },
        { text: 'Inactivos', value: 'false' }
      ],
      lockedOptions: [
        { text: 'Todos', value: '' },
        { text: 'Bloqueados', value: 'true' },
        { text: 'No bloqueados', value: 'false' }
      ],
      pageSizeOptions: [10, 20, 50, 100],
      headers: [
        { text: 'Nombre', value: 'name', sortable: true },
        { text: 'Correo', value: 'email', sortable: true },
        { text: 'Rol', value: 'role', sortable: true },
        { text: 'Negocio', value: 'business_name', sortable: true },
        { text: 'Activo', value: 'active', sortable: true },
        { text: 'Bloqueado', value: 'locked', sortable: true },
        { text: 'Última actividad', value: 'last_activity_at', sortable: true },
        { text: 'Creado', value: 'created_at', sortable: true },
        { text: 'Actualizado', value: 'updated_at', sortable: true }
      ]
    };
  },

  computed: {
    safeTotalPages: function() {
      return Math.max(Number(this.pagination.totalPages) || 0, 1);
    }
  },

  mounted: function() {
    this.fetchBusinesses();
    this.fetchUsers();
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
        locked: this.filters.locked,
        sortBy: ALLOWED_SORTS.includes(this.sortBy) ? this.sortBy : DEFAULT_SORT_BY,
        sortDir: this.sortDir === 'asc' ? 'asc' : 'desc'
      };
    },

    fetchUsers: async function() {
      this.isLoading = true;
      this.errorMessage = '';

      const response = await DASuperAdminService.getUsers(this.buildParams());

      if(response && response.success) {
        const payload = response.data || {};
        const pagination = payload.pagination || {};

        this.users = Array.isArray(payload.data) ? payload.data : [];
        this.pagination = {
          page: Number(pagination.page) || this.pagination.page,
          pageSize: Number(pagination.pageSize) || this.pagination.pageSize,
          total: Number(pagination.total) || 0,
          totalPages: Number(pagination.totalPages) || 0
        };
      } else {
        this.users = [];
        this.pagination.total = 0;
        this.pagination.totalPages = 0;
        this.handleRequestError(response);
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
        this.businessLoadError = response && response.message
          ? response.message
          : 'No fue posible cargar el filtro de negocios.';
      }

      this.isLoadingBusinesses = false;
    },

    handleRequestError: function(response) {
      const status = response && Number(response.status);

      if(status === 401) {
        this.errorMessage = 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.';
        return;
      }

      if(status === 403) {
        this.errorMessage = 'No tienes permiso para consultar la administración global.';
        window.setTimeout(() => this.$router.push({ name: 'dashboard' }).catch(() => {}), 1200);
        return;
      }

      this.errorMessage = response && response.message
        ? response.message
        : 'No fue posible cargar el listado de usuarios.';
    },

    onSearchInput: function() {
      if(this.searchTimer) {
        clearTimeout(this.searchTimer);
      }

      this.searchTimer = setTimeout(() => {
        this.pagination.page = 1;
        this.fetchUsers();
      }, 450);
    },

    onSearchClear: function() {
      this.filters.search = '';
      this.pagination.page = 1;
      this.fetchUsers();
    },

    onFilterChange: function() {
      this.pagination.page = 1;
      this.fetchUsers();
    },

    onPageSizeChange: function() {
      this.pagination.page = 1;
      this.fetchUsers();
    },

    onPageChange: function(page) {
      this.pagination.page = page;
      this.fetchUsers();
    },

    toggleSort: function(column) {
      if(!ALLOWED_SORTS.includes(column)) {
        return;
      }

      if(this.sortBy === column) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortBy = column;
        this.sortDir = ['name', 'email', 'role', 'business_name'].includes(column) ? 'asc' : 'desc';
      }

      this.pagination.page = 1;
      this.fetchUsers();
    },

    getSortIcon: function(column) {
      if(this.sortBy !== column) {
        return 'mdi-swap-vertical';
      }

      return this.sortDir === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down';
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

    formatLocked: function(value) {
      if(value === null || value === undefined) {
        return 'Sin dato';
      }

      return value ? 'Bloqueado' : 'No bloqueado';
    }
  }
};
</script>

<style scoped>
.users-page {
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

.create-button {
  flex: 0 0 auto;
}

.soon-label {
  margin-left: 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
}

.filters-panel {
  display: grid;
  grid-template-columns: minmax(16rem, 1.2fr) minmax(12rem, 1fr) repeat(4, minmax(9rem, 0.7fr));
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

.user-table {
  width: 100%;
  min-width: 78rem;
  border-collapse: collapse;
}

.user-table th,
.user-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #eef2f7;
  color: #374151;
  font-size: 0.9rem;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.user-table th {
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
.state-chip {
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
.state-chip.is-unlocked {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.state-chip.is-inactive,
.state-chip.is-locked {
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
