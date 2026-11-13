<template>
  <div class="audit-page">
    <section class="intro-panel">
      <div>
        <p class="eyebrow">Administración global</p>
        <h1>Auditoría administrativa</h1>
        <span>Consulta acciones realizadas por Super Admin sobre negocios, usuarios y sesiones.</span>
      </div>

      <v-btn text color="primary" :loading="isLoading" @click="fetchAuditLogs">
        <v-icon left small>mdi-refresh</v-icon>
        Actualizar
      </v-btn>
    </section>

    <section class="filters-panel" aria-label="Filtros de auditoría">
      <v-text-field
        v-model="filters.search"
        label="Buscar"
        prepend-inner-icon="mdi-magnify"
        outlined
        dense
        hide-details
        clearable
        @input="onSearchInput"
        @click:clear="onSearchClear"
      />

      <v-select
        v-model="filters.action"
        :items="actionOptions"
        label="Acción"
        outlined
        dense
        hide-details
        @change="onFilterChange"
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

      <v-text-field
        v-model.trim="filters.actorUserId"
        label="Actor ID"
        outlined
        dense
        hide-details
        clearable
        @input="onSearchInput"
        @click:clear="onSearchClear"
      />

      <v-text-field
        v-model="filters.from"
        label="Desde"
        type="date"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-text-field
        v-model="filters.to"
        label="Hasta"
        type="date"
        outlined
        dense
        hide-details
        @change="onFilterChange"
      />

      <v-select
        v-model="pagination.limit"
        :items="limitOptions"
        label="Por página"
        outlined
        dense
        hide-details
        @change="onLimitChange"
      />

      <v-btn text color="primary" @click="clearFilters">
        <v-icon left small>mdi-filter-off-outline</v-icon>
        Limpiar
      </v-btn>
    </section>

    <section class="table-panel" aria-label="Listado paginado de auditoría">
      <div class="table-toolbar">
        <div>
          <strong>{{ pagination.total }}</strong>
          <span> eventos encontrados</span>
        </div>
      </div>

      <v-alert v-if="errorMessage" type="error" dense text class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-alert v-if="businessLoadError" type="warning" dense text class="mb-4">
        {{ businessLoadError }}
      </v-alert>

      <v-progress-linear v-if="isLoading" indeterminate color="primary" height="3" />

      <div class="table-scroll">
        <table class="audit-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Actor</th>
              <th>Negocio</th>
              <th>Usuario objetivo</th>
              <th>Resumen</th>
              <th>Metadata segura</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in auditLogs" :key="item.id">
              <td>{{ formatDate(item.created_at) }}</td>
              <td>
                <span :class="getActionChipClass(item.action)">
                  {{ getActionLabel(item.action) }}
                </span>
              </td>
              <td>
                <strong>{{ item.actor_name || 'Sin nombre' }}</strong>
                <span>{{ item.actor_email || item.actor_user_id || 'Sin registro' }}</span>
              </td>
              <td>{{ item.business_name || item.business_id || 'Sin negocio' }}</td>
              <td>
                <strong>{{ item.target_user_name || 'Sin usuario' }}</strong>
                <span>{{ item.target_user_email || item.target_user_id || 'No aplica' }}</span>
              </td>
              <td>{{ getAuditSummary(item) }}</td>
              <td>
                <v-btn small text color="primary" @click="openMetadataDialog(item)">
                  <v-icon left small>mdi-code-json</v-icon>
                  Ver detalle
                </v-btn>
              </td>
            </tr>

            <tr v-if="!isLoading && !auditLogs.length">
              <td colspan="7">
                <div class="empty-state">
                  <v-icon size="36">mdi-clipboard-search-outline</v-icon>
                  <strong>No hay eventos para mostrar</strong>
                  <span>Ajusta la búsqueda o filtros para consultar otros resultados.</span>
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

    <v-dialog v-model="metadataDialog.show" max-width="760">
      <v-card>
        <v-card-title>Metadata segura</v-card-title>
        <v-card-text>
          <div class="confirm-summary">
            <strong>{{ getActionLabel(metadataDialog.item && metadataDialog.item.action) }}</strong>
            <span>{{ formatDate(metadataDialog.item && metadataDialog.item.created_at) }}</span>
          </div>
          <pre class="metadata-json">{{ metadataPreview }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text color="primary" @click="metadataDialog.show = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { DASuperAdminService } from '@/services/context/core-proccess-context';

const DEFAULT_LIMIT = 20;
const SENSITIVE_KEYS = [
  'password',
  'hash',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'secret',
  'jwt',
  'credential',
  'credentials',
  'patient',
  'paciente',
  'diagnosis',
  'diagnostico',
  'clinical',
  'historia',
  'prescription',
  'receta',
  'document',
  'content_html',
  'signature',
  'birthdate',
  'birth_date',
  'branch',
  'branches',
  'branchbreakdown',
  'maxbranches',
  'extra_branches',
  'extrabranches',
  'sucursal',
  'sucursales'
];

const ACTION_LABELS = {
  SUPER_ADMIN_BUSINESS_CREATE: 'Negocio creado',
  SUPER_ADMIN_BUSINESS_UPDATE: 'Negocio editado',
  SUPER_ADMIN_BUSINESS_STATUS_CHANGE: 'Estado comercial actualizado',
  SUPER_ADMIN_BUSINESS_SUSPEND: 'Negocio suspendido',
  SUPER_ADMIN_BUSINESS_REACTIVATE: 'Negocio reactivado',
  SUPER_ADMIN_BUSINESS_CANCEL: 'Negocio cancelado',
  SUPER_ADMIN_BUSINESS_TRIAL_EXTEND: 'Trial extendido',
  SUPER_ADMIN_BUSINESS_PLAN_CHANGE: 'Plan actualizado',
  SUPER_ADMIN_TRIAL_EXPIRED_TO_PAST_DUE: 'Trial vencido a pago pendiente',
  SUPER_ADMIN_LICENSE_OVERRIDES_UPDATE: 'Extras de licencia actualizados',
  LICENSE_LIMIT_BLOCKED: 'Límite de licencia bloqueó una alta',
  PLAN_FEATURE_BLOCKED: 'Funcionalidad no incluida bloqueada',
  ROLE_PERMISSIONS_UPDATE: 'Permisos de rol actualizados',
  ROLE_PERMISSIONS_BLOCKED: 'Permisos de rol bloqueados',
  SUPER_ADMIN_SESSION_CLOSE: 'Sesión cerrada',
  SUPER_ADMIN_USER_SESSIONS_CLOSE: 'Sesiones de usuario cerradas'
};

export default {
  data: function() {
    return {
      auditLogs: [],
      isLoading: false,
      isLoadingBusinesses: false,
      errorMessage: '',
      businessLoadError: '',
      searchTimer: null,
      filters: {
        search: '',
        action: '',
        businessId: '',
        actorUserId: '',
        from: '',
        to: ''
      },
      pagination: {
        page: 1,
        limit: DEFAULT_LIMIT,
        total: 0,
        totalPages: 0
      },
      actionOptions: [
        { text: 'Todas', value: '' },
        ...Object.keys(ACTION_LABELS).map((action) => ({
          text: ACTION_LABELS[action],
          value: action
        }))
      ],
      businessOptions: [
        { text: 'Todos', value: '' }
      ],
      limitOptions: [10, 20, 50, 100],
      metadataDialog: {
        show: false,
        item: null
      }
    };
  },

  computed: {
    safeTotalPages: function() {
      return Math.max(Number(this.pagination.totalPages) || 0, 1);
    },

    metadataPreview: function() {
      const metadata = this.metadataDialog.item && this.metadataDialog.item.metadata
        ? this.sanitizeMetadata(this.metadataDialog.item.metadata)
        : {};

      return JSON.stringify(metadata, null, 2);
    }
  },

  mounted: function() {
    this.fetchBusinesses();
    this.fetchAuditLogs();
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
        limit: this.pagination.limit,
        search: this.filters.search,
        action: this.filters.action,
        businessId: this.filters.businessId,
        actorUserId: this.filters.actorUserId,
        from: this.filters.from,
        to: this.filters.to
      };
    },

    fetchAuditLogs: async function() {
      this.isLoading = true;
      this.errorMessage = '';

      const response = await DASuperAdminService.getAuditLogs(this.buildParams());

      if(response && response.success) {
        const payload = response.data || {};
        const pagination = payload.pagination || {};
        this.auditLogs = Array.isArray(payload.data)
          ? payload.data.map((item) => ({
              ...item,
              metadata: this.sanitizeMetadata(item.metadata || {})
            }))
          : [];
        this.pagination = {
          page: Number(pagination.page) || this.pagination.page,
          limit: Number(pagination.limit) || this.pagination.limit,
          total: Number(pagination.total) || 0,
          totalPages: Number(pagination.totalPages) || 0
        };
      } else {
        this.auditLogs = [];
        this.pagination.total = 0;
        this.pagination.totalPages = 0;
        this.handleRequestError(response);
      }

      this.isLoading = false;
    },

    fetchBusinesses: async function() {
      this.isLoadingBusinesses = true;
      this.businessLoadError = '';

      const response = await DASuperAdminService.getBusinesses({
        page: 1,
        pageSize: 100,
        sortBy: 'name',
        sortDir: 'asc'
      });

      if(response && response.success) {
        const businesses = response.data && Array.isArray(response.data.data) ? response.data.data : [];
        this.businessOptions = [
          { text: 'Todos', value: '' },
          ...businesses.map((business) => ({
            text: business.name || business.id_business,
            value: business.id_business
          }))
        ];
      } else {
        this.businessLoadError = 'No fue posible cargar el filtro de negocios.';
      }

      this.isLoadingBusinesses = false;
    },

    handleRequestError: function(response) {
      const status = response && Number(response.status);

      if(status === 401) {
        this.errorMessage = 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.';
        window.setTimeout(() => this.$router.push({ name: 'login' }).catch(() => {}), 1200);
        return;
      }

      if(status === 403) {
        this.errorMessage = 'No tienes permiso para consultar auditoría administrativa.';
        window.setTimeout(() => this.$router.push({ name: 'dashboard' }).catch(() => {}), 1200);
        return;
      }

      if(status === 400) {
        this.errorMessage = response && response.message ? response.message : 'Revisa los filtros antes de continuar.';
        return;
      }

      this.errorMessage = response && response.message
        ? response.message
        : 'No fue posible cargar la auditoría administrativa.';
    },

    onSearchInput: function() {
      if(this.searchTimer) {
        clearTimeout(this.searchTimer);
      }

      this.searchTimer = setTimeout(() => {
        this.pagination.page = 1;
        this.fetchAuditLogs();
      }, 450);
    },

    onSearchClear: function() {
      this.filters.search = '';
      this.filters.actorUserId = '';
      this.pagination.page = 1;
      this.fetchAuditLogs();
    },

    onFilterChange: function() {
      this.pagination.page = 1;
      this.fetchAuditLogs();
    },

    onLimitChange: function() {
      this.pagination.page = 1;
      this.fetchAuditLogs();
    },

    onPageChange: function(page) {
      this.pagination.page = page;
      this.fetchAuditLogs();
    },

    clearFilters: function() {
      this.filters = {
        search: '',
        action: '',
        businessId: '',
        actorUserId: '',
        from: '',
        to: ''
      };
      this.pagination.page = 1;
      this.fetchAuditLogs();
    },

    openMetadataDialog: function(item) {
      this.metadataDialog = {
        show: true,
        item
      };
    },

    getActionLabel: function(action) {
      return ACTION_LABELS[action] || action || 'Acción desconocida';
    },

    getActionChipClass: function(action) {
      if(action && action.includes('CANCEL')) {
        return 'action-chip is-danger';
      }

      if(action && (action.includes('SUSPEND') || action.includes('SESSION_CLOSE'))) {
        return 'action-chip is-warning';
      }

      if(action && (action.includes('REACTIVATE') || action.includes('CREATE'))) {
        return 'action-chip is-success';
      }

      return 'action-chip';
    },

    getAuditSummary: function(item) {
      const metadata = item && item.metadata ? item.metadata : {};

      if(Array.isArray(metadata.changed_fields) && metadata.changed_fields.length) {
        return `Campos modificados: ${metadata.changed_fields.join(', ')}`;
      }

      if(metadata.new_subscription_status || metadata.previous_subscription_status) {
        return `${metadata.previous_subscription_status || 'sin estado'} -> ${metadata.new_subscription_status || 'sin estado'}`;
      }

      if(metadata.new_plan || metadata.previous_plan) {
        return `${metadata.previous_plan || 'sin plan'} -> ${metadata.new_plan || 'sin plan'}`;
      }

      if(metadata.days) {
        return `Extensión: ${metadata.days} días`;
      }

      if(metadata.reason) {
        return String(metadata.reason).slice(0, 120);
      }

      return 'Evento administrativo';
    },

    sanitizeMetadata: function(value, depth = 0) {
      if(depth > 3) {
        return '[max_depth]';
      }

      if(value === null || value === undefined) {
        return null;
      }

      if(['string', 'number', 'boolean'].includes(typeof value)) {
        return value;
      }

      if(Array.isArray(value)) {
        return value.slice(0, 30).map((item) => this.sanitizeMetadata(item, depth + 1));
      }

      if(typeof value === 'object') {
        return Object.keys(value).reduce((result, key) => {
          const normalized = String(key || '').toLowerCase();
          const isSensitive = SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
          if(!isSensitive) {
            result[key] = this.sanitizeMetadata(value[key], depth + 1);
          }
          return result;
        }, {});
      }

      return null;
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
    }
  }
};
</script>

<style scoped>
.audit-page {
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
  max-width: 52rem;
  margin-top: 0.75rem;
  color: #4b5563;
  line-height: 1.5rem;
}

.filters-panel {
  display: grid;
  grid-template-columns: minmax(14rem, 1fr) minmax(12rem, 16rem) minmax(12rem, 16rem) minmax(10rem, 14rem) repeat(2, minmax(9rem, 11rem)) minmax(8rem, 9rem) auto;
  gap: 1rem;
  align-items: center;
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

.audit-table {
  width: 100%;
  min-width: 92rem;
  border-collapse: collapse;
}

.audit-table th,
.audit-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #eef2f7;
  color: #374151;
  font-size: 0.9rem;
  text-align: left;
  vertical-align: top;
}

.audit-table th {
  background: #f9fafb;
  color: #111827;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.audit-table td span,
.audit-table td strong {
  display: block;
}

.audit-table td strong {
  color: #111827;
}

.action-chip {
  display: inline-flex !important;
  align-items: center;
  width: max-content;
  min-height: 1.75rem;
  padding: 0 0.65rem;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  background: #eff6ff;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.action-chip.is-success {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.action-chip.is-warning {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.action-chip.is-danger {
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

.metadata-json {
  max-height: 28rem;
  overflow: auto;
  padding: 1rem;
  background: #111827;
  color: #e5e7eb;
  font-size: 0.82rem;
  line-height: 1.35rem;
  white-space: pre-wrap;
}

@media (max-width: 1100px) {
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
