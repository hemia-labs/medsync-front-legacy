<template>
  <section class="dashboard-widget team-widget" aria-labelledby="team-breakdown-title">
    <div class="widget-heading">
      <div>
        <p class="eyebrow">Equipo y capacidad</p>
        <h2 id="team-breakdown-title">Uso por equipo</h2>
        <span class="widget-description">Resumen del equipo por estado, rol y capacidad incluida.</span>
      </div>
      <span class="privacy-note">Sin nombres ni correos</span>
    </div>

    <div v-if="loading" class="widget-state">
      <v-progress-circular indeterminate color="#0f766e" size="28"></v-progress-circular>
      <span>Cargando uso por equipo...</span>
    </div>

    <div v-else-if="error" class="widget-state is-error">
      <v-icon size="28">mdi-alert-circle-outline</v-icon>
      <span>No pudimos cargar el uso por equipo.</span>
      <button type="button" class="widget-action" @click="$emit('retry')">Reintentar</button>
    </div>

    <div v-else-if="isEmpty" class="widget-state is-empty">
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
            <v-icon size="21">{{ metric.icon }}</v-icon>
          </span>
          <div>
            <small>{{ metric.label }}</small>
            <strong>{{ formatNumber(metric.value) }}</strong>
          </div>
        </article>
      </div>

      <section class="role-section" aria-labelledby="roles-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Roles</p>
            <h3 id="roles-title">Distribucion del equipo</h3>
          </div>
          <span>{{ formatNumber(roleTotal) }} usuarios</span>
        </div>

        <div class="role-list">
          <article v-for="role in normalizedRoles" :key="role.key" class="role-row">
            <div>
              <strong>{{ role.label }}</strong>
              <span>{{ formatNumber(role.count) }} usuarios</span>
            </div>
            <div class="role-bar" aria-hidden="true">
              <span :style="{ width: roleWidth(role) + '%' }"></span>
            </div>
          </article>
        </div>
      </section>

      <section class="license-section" aria-labelledby="team-license-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Licencia</p>
            <h3 id="team-license-title">Capacidad de equipo</h3>
          </div>
          <span>Uso contratado</span>
        </div>

        <div class="license-list">
          <article v-for="item in licenseCards" :key="item.key" class="license-row">
            <div class="license-copy">
              <strong>{{ item.label }}</strong>
              <span>{{ item.usedLabel }} / {{ item.limitLabel }}</span>
            </div>
            <div v-if="!item.unlimited" class="license-bar" aria-hidden="true">
              <span :style="{ width: item.progress + '%' }"></span>
            </div>
            <small>{{ item.helper }}</small>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
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
      const used = normalizeNumber(source.used);
      const limit = source.limit;
      const unlimited = limit === null || limit === undefined || Number(limit) < 0;
      const numericLimit = Number(limit);
      const safeLimit = Number.isFinite(numericLimit) && numericLimit > 0 ? numericLimit : 0;
      const remaining = unlimited ? null : normalizeNumber(source.remaining);
      const progress = unlimited || safeLimit === 0
        ? 100
        : Math.min(100, Math.round((used / safeLimit) * 100));

      return {
        key,
        label,
        used,
        usedLabel: this.formatNumber(used),
        limitLabel: unlimited ? 'Ilimitado' : this.formatNumber(limit),
        remaining,
        unlimited,
        progress,
        helper: unlimited ? 'Sin limite configurado' : `${this.formatNumber(remaining)} disponibles`
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
      return normalizeNumber(value).toLocaleString('es-MX');
    }
  }
};
</script>

<style scoped>
.dashboard-widget {
  padding: 1.15rem;
  border: 1px solid rgba(14, 116, 144, 0.12);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.07);
}

.widget-heading,
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #0f766e;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

h2,
h3 {
  margin: 0;
  color: #12313a;
  letter-spacing: 0;
}

.widget-description,
.section-heading span,
.license-row small {
  color: #64748b;
  line-height: 1.4;
}

.widget-description {
  display: block;
  margin-top: 0.28rem;
}

.privacy-note {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  color: #0f766e;
  background: #ecfdf5;
  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;
}

.widget-state {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1rem;
  padding: 1rem;
  border: 1px dashed #b7e4df;
  color: #475569;
  background: #f8fdfc;
}

.widget-state.is-error {
  border-color: #fecaca;
  background: #fff7f7;
}

.widget-state.is-empty {
  justify-content: center;
  min-height: 9rem;
  text-align: center;
}

.widget-state strong {
  display: block;
  color: #12313a;
}

.widget-state p {
  margin: 0.25rem 0 0;
  color: #64748b;
  line-height: 1.45;
}

.widget-action {
  min-height: 2.25rem;
  border: 1px solid #b7e4df;
  border-radius: 999px;
  padding: 0 0.8rem;
  color: #0f766e;
  background: #ffffff;
  font-weight: 900;
}

.widget-action:hover {
  color: #ffffff;
  border-color: #0f766e;
  background: #0f766e;
}

.team-content {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.team-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.75rem, 1fr));
  gap: 0.65rem;
}

.team-metric,
.role-section,
.license-section,
.role-row,
.license-row {
  border: 1px solid #e2edf0;
  background: #f8fbfc;
}

.team-metric {
  display: grid;
  grid-template-columns: 2.35rem minmax(0, 1fr);
  gap: 0.7rem;
  align-items: center;
  min-width: 0;
  padding: 0.78rem 0.72rem;
}

.metric-icon {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 0.78rem;
  color: #0f766e;
  background: #dff7f4;
}

.team-metric small {
  display: block;
  min-width: 0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.05rem;
  overflow-wrap: anywhere;
}

.team-metric strong {
  display: block;
  color: #12313a;
  font-size: 1.45rem;
}

.role-section,
.license-section {
  padding: 1rem;
}

.role-list,
.license-list {
  display: grid;
  gap: 0.68rem;
  margin-top: 0.85rem;
}

.role-row,
.license-row {
  display: grid;
  gap: 0.5rem;
  padding: 0.78rem;
  background: #ffffff;
}

.role-row strong,
.role-row span,
.license-copy strong,
.license-copy span {
  display: block;
}

.role-row strong,
.license-copy strong {
  color: #12313a;
}

.role-row span,
.license-copy span {
  color: #64748b;
  font-size: 0.84rem;
}

.role-bar,
.license-bar {
  height: 0.45rem;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.role-bar span,
.license-bar span {
  display: block;
  height: 100%;
  max-width: 100%;
  border-radius: inherit;
  background: #0f766e;
}

.license-bar span {
  background: linear-gradient(90deg, #0f766e, #0369a1);
}

html[data-theme="clinical-night"] .dashboard-widget {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] h2,
html[data-theme="clinical-night"] h3,
html[data-theme="clinical-night"] .widget-state strong,
html[data-theme="clinical-night"] .team-metric strong,
html[data-theme="clinical-night"] .role-row strong,
html[data-theme="clinical-night"] .license-copy strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .widget-description,
html[data-theme="clinical-night"] .widget-state,
html[data-theme="clinical-night"] .widget-state p,
html[data-theme="clinical-night"] .section-heading span,
html[data-theme="clinical-night"] .team-metric small,
html[data-theme="clinical-night"] .role-row span,
html[data-theme="clinical-night"] .license-copy span,
html[data-theme="clinical-night"] .license-row small {
  color: #94a3b8;
}

html[data-theme="clinical-night"] .team-metric,
html[data-theme="clinical-night"] .role-section,
html[data-theme="clinical-night"] .license-section,
html[data-theme="clinical-night"] .role-row,
html[data-theme="clinical-night"] .license-row {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.76);
}

@media (max-width: 1100px) {
  .team-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .widget-heading,
  .section-heading {
    flex-direction: column;
  }

  .team-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
