<template>
  <section class="an-card team-widget" aria-labelledby="team-breakdown-title">
    <div class="an-heading">
      <div>
        <p class="an-eyebrow">Equipo y capacidad</p>
        <h2 id="team-breakdown-title">Uso por equipo</h2>
        <span class="an-description">{{ data && data.dateBasis || 'Estado actual del equipo; no depende del periodo seleccionado.' }}</span>
      </div>
      <span class="an-chip"><v-icon size="15">mdi-shield-lock-outline</v-icon>Sin nombres ni correos</span>
    </div>

    <div v-if="loading" class="an-state">
      <v-progress-circular indeterminate color="#0f766e" size="28"></v-progress-circular>
      <span>Cargando uso por equipo...</span>
    </div>

    <div v-else-if="error" class="an-state is-error">
      <v-icon size="28">mdi-alert-circle-outline</v-icon>
      <span>No pudimos cargar el uso por equipo.</span>
      <button type="button" class="an-button" @click="$emit('retry')">Reintentar</button>
    </div>

    <div v-else-if="isEmpty" class="an-state is-empty">
      <v-icon size="30">mdi-account-group-outline</v-icon>
      <div>
        <strong>No hay actividad de equipo para mostrar.</strong>
        <p>Cuando existan usuarios o roles configurados, apareceran aqui de forma resumida.</p>
      </div>
    </div>

    <div v-else class="team-content">
      <div class="team-metrics" aria-label="Resumen del equipo">
        <article v-for="metric in userMetrics" :key="metric.key" class="team-metric">
          <span class="metric-icon">
            <v-icon size="20">{{ metric.icon }}</v-icon>
          </span>
          <div>
            <strong>{{ formatNumber(metric.value) }}</strong>
            <small>{{ metric.label }}</small>
          </div>
        </article>
      </div>

      <section class="team-block" aria-labelledby="roles-title">
        <div class="an-heading">
          <div>
            <p class="an-eyebrow">Roles</p>
            <h3 id="roles-title">Distribucion del equipo</h3>
          </div>
          <span class="block-aside">{{ formatNumber(roleTotal) }} usuarios</span>
        </div>

        <div class="role-list">
          <article v-for="role in normalizedRoles" :key="role.key" class="role-row">
            <div>
              <strong>{{ role.label }}</strong>
              <span>{{ formatNumber(role.count) }} usuarios</span>
            </div>
            <div class="an-meter" aria-hidden="true">
              <span :style="{ width: roleWidth(role) + '%' }"></span>
            </div>
          </article>
        </div>
      </section>

      <section class="team-block" aria-labelledby="team-license-title">
        <div class="an-heading">
          <div>
            <p class="an-eyebrow">Licencia</p>
            <h3 id="team-license-title">Capacidad de equipo</h3>
          </div>
          <span class="block-aside">Uso contratado</span>
        </div>

        <div class="license-list">
          <article v-for="item in licenseCards" :key="item.key" class="license-row">
            <svg v-if="!item.unlimited" class="an-ring" viewBox="0 0 36 36" aria-hidden="true">
              <circle class="ring-track" cx="18" cy="18" r="15.915" />
              <circle class="ring-value" cx="18" cy="18" r="15.915" :stroke-dasharray="item.progress + ' 100'" />
            </svg>
            <span v-else class="license-open" aria-hidden="true">∞</span>
            <div class="license-copy">
              <strong>{{ item.label }}</strong>
              <span>{{ item.usedLabel }} / {{ item.limitLabel }}</span>
              <small>{{ item.helper }}</small>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
import { formatMetric, metricNumber } from '../../../domain/dashboard/metrics';

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default {
  name: 'DashboardTeamBreakdown',
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    data: {
      type: Object,
      default: null
    }
  },
  computed: {
    users: function() {
      return this.data && this.data.users ? this.data.users : {};
    },
    license: function() {
      return this.data && this.data.license ? this.data.license : {};
    },
    roles: function() {
      return this.data && Array.isArray(this.data.roles) ? this.data.roles : [];
    },
    userMetrics: function() {
      const staffUsers = this.users.staffUsers === undefined ? this.users.auxiliaryUsers : this.users.staffUsers;
      return [
        { key: 'active', label: 'Activos', value: this.users.active, icon: 'mdi-account-check-outline' },
        { key: 'inactive', label: 'Inactivos', value: this.users.inactive, icon: 'mdi-account-cancel-outline' },
        { key: 'professionals', label: 'Profesionales', value: this.users.professionals, icon: 'mdi-account-tie-outline' },
        { key: 'staffUsers', label: 'Usuarios internos', value: staffUsers, icon: 'mdi-account-multiple-outline' }
      ];
    },
    normalizedRoles: function() {
      const roles = this.roles.map((role) => ({
        key: role.key || role.role || role.label,
        label: this.roleLabel(role.label || role.role || role.key),
        count: normalizeNumber(role.count)
      }));

      if(roles.length) {
        return roles;
      }

      return [
        { key: 'professionals', label: 'Profesionales', count: normalizeNumber(this.users.professionals) },
        { key: 'staffUsers', label: 'Usuarios internos', count: normalizeNumber(this.users.staffUsers === undefined ? this.users.auxiliaryUsers : this.users.staffUsers) }
      ].filter((role) => role.count > 0);
    },
    roleTotal: function() {
      return this.normalizedRoles.reduce((acc, role) => acc + normalizeNumber(role.count), 0);
    },
    maxRoleTotal: function() {
      return Math.max.apply(null, this.normalizedRoles.map((role) => normalizeNumber(role.count)).concat([1]));
    },
    licenseCards: function() {
      return [
        this.buildLicenseCard('professionals', 'Profesionales'),
        this.buildLicenseCard('staffUsers', 'Usuarios internos')
      ];
    },
    isEmpty: function() {
      const hasUsers = this.userMetrics.some((metric) => normalizeNumber(metric.value) > 0);
      const hasRoles = this.normalizedRoles.some((role) => normalizeNumber(role.count) > 0);
      const hasLicense = this.licenseCards.some((item) => item.used > 0 || !item.unlimited);

      return !hasUsers && !hasRoles && !hasLicense;
    }
  },
  methods: {
    buildLicenseCard: function(key, label) {
      const source = this.license[key] || (key === 'staffUsers' ? this.license.auxiliaryUsers : {}) || {};
      const used = metricNumber(source.used);
      const limit = source.limit;
      const unlimited = limit === null || Number(limit) < 0;
      const numericLimit = metricNumber(limit);
      const reportedRemaining = metricNumber(source.remaining);
      const remaining = unlimited ? null : reportedRemaining !== null ? reportedRemaining
        : numericLimit !== null && used !== null ? Math.max(0, numericLimit - used) : null;
      const progress = unlimited ? 100 : used === null || numericLimit === null ? 0
        : numericLimit === 0 ? 100 : Math.min(100, Math.round((used / numericLimit) * 100));

      return {
        key,
        label,
        used,
        usedLabel: this.formatNumber(used),
        limitLabel: unlimited ? 'Ilimitado' : this.formatNumber(limit),
        remaining,
        unlimited,
        progress,
        helper: unlimited ? 'Sin limite configurado' : remaining === null ? 'Disponibilidad: No disponible'
          : `${this.formatNumber(remaining)} disponibles`
      };
    },
    roleLabel: function(value) {
      const labels = {
        professional: 'Profesionales',
        professionals: 'Profesionales',
        auxiliary: 'Usuarios internos',
        auxiliaryUsers: 'Usuarios internos',
        staffUsers: 'Usuarios internos',
        admin: 'Administradores',
        administrator: 'Administradores'
      };

      return labels[value] || value || 'Rol sin etiqueta';
    },
    roleWidth: function(role) {
      const count = normalizeNumber(role.count);
      if(count <= 0) {
        return 0;
      }

      return Math.max(8, Math.round((count / this.maxRoleTotal) * 100));
    },
    formatNumber: function(value) {
      return formatMetric(value);
    }
  }
};
</script>

<style scoped>
.team-content {
  display: grid;
  gap: 1.2rem;
  margin-top: 1.1rem;
}

.team-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.team-metric {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 0.8rem;
  border-radius: var(--an-radius-sm);
  background: var(--an-surface-2);
}

.metric-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 0.75rem;
  color: var(--an-accent);
  background: var(--an-accent-soft);
}

.metric-icon .v-icon {
  color: inherit !important;
}

.team-metric strong,
.team-metric small {
  display: block;
}

.team-metric strong {
  color: var(--an-ink);
  font-size: 1.4rem;
  font-weight: 600;
  line-height: 1.15;
}

.team-metric small {
  color: var(--an-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.team-block {
  display: grid;
  gap: 0.75rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--an-border);
}

.block-aside {
  color: var(--an-muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.role-list,
.license-list {
  display: grid;
  gap: 0.7rem;
}

.role-row {
  display: grid;
  gap: 0.35rem;
}

.role-row > div:first-child {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.role-row strong,
.license-copy strong {
  color: var(--an-ink);
}

.role-row span,
.license-copy small {
  color: var(--an-muted);
  font-size: 0.8rem;
}

.license-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 0.8rem;
  border-radius: var(--an-radius-sm);
  background: var(--an-surface-2);
}

.license-open {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 3.6rem;
  height: 3.6rem;
  border: 3px solid var(--an-track);
  border-radius: 50%;
  color: var(--an-accent);
  font-size: 1.5rem;
  font-weight: 600;
}

.license-copy {
  display: grid;
  gap: 0.05rem;
  min-width: 0;
}

.license-copy span {
  color: var(--an-ink);
  font-size: 1.15rem;
  font-weight: 600;
}
</style>
