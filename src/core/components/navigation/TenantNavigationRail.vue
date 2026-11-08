<template>
  <aside class="tenant-navigation-rail" :class="{ 'is-collapsed': collapsed }" aria-label="Navegación principal">
    <div class="navigation-panel">
      <div class="navigation-brand" :title="collapsed ? businessName : null">
        <span class="brand-mark" :class="{ 'brand-mark--logo': showBusinessLogo }" aria-hidden="true">
          <img v-if="showBusinessLogo" :src="businessLogo" alt="" @error="failedLogo = businessLogo">
          <v-icon v-else size="20">mdi-hospital-building</v-icon>
        </span>
        <div class="brand-copy">
          <strong :title="businessName || null">{{ businessName || 'Tu consultorio' }}</strong>
          <small>Consultorio</small>
        </div>
        <slot name="brand-action" />
      </div>

      <div v-if="tenantRestricted" class="restricted-status" role="status" :title="collapsed ? 'Acceso restringido' : null" :aria-label="collapsed ? 'Acceso restringido' : null">
        <v-icon size="18">mdi-lock-alert-outline</v-icon>
        <span class="restricted-label">Acceso restringido</span>
      </div>

      <div v-if="actionItems.length" class="navigation-actions">
        <button
          v-for="item in actionItems"
          :key="item.key"
          type="button"
          :class="primaryActionClass(item)"
          :aria-label="item.label"
          :title="collapsed ? item.label : null"
          :aria-disabled="isRestrictedDisabled(item) ? 'true' : null"
          :disabled="isRestrictedDisabled(item)"
          @click="emitNavigation(item)"
        >
          <v-icon size="20">{{ item.icon }}</v-icon>
          <span class="navigation-label">{{ item.label }}</span>
        </button>
      </div>

      <nav class="navigation-sections" aria-label="Secciones del sistema">
        <p class="navigation-caption">Operación</p>
        <button
          v-for="item in operationItems"
          :key="item.key"
          type="button"
          :class="navItemClass(item)"
          :aria-current="isActive(item) ? 'page' : null"
          :aria-label="item.label"
          :title="collapsed ? item.label : null"
          :aria-disabled="isRestrictedDisabled(item) ? 'true' : null"
          :disabled="isRestrictedDisabled(item)"
          @click="emitNavigation(item)"
        >
          <span class="active-marker" aria-hidden="true"></span>
          <v-icon size="21">{{ item.icon }}</v-icon>
          <span class="navigation-label">{{ item.label }}</span>
        </button>

        <template v-if="clinicalItems.length">
          <p class="navigation-caption">Clínico</p>
          <button
            v-for="item in clinicalItems"
            :key="item.key"
            type="button"
            :class="navItemClass(item)"
            :aria-current="isActive(item) ? 'page' : null"
            :aria-label="item.label"
            :title="collapsed ? item.label : null"
            :aria-disabled="isRestrictedDisabled(item) ? 'true' : null"
            :disabled="isRestrictedDisabled(item)"
            @click="emitNavigation(item)"
          >
            <span class="active-marker" aria-hidden="true"></span>
            <v-icon size="21">{{ item.icon }}</v-icon>
            <span class="navigation-label">{{ item.label }}</span>
          </button>
        </template>

        <template v-if="managementItems.length">
          <p class="navigation-caption">Gestión</p>
          <button
            v-for="item in managementItems"
            :key="item.key"
            type="button"
            :class="navItemClass(item)"
            :aria-current="isActive(item) ? 'page' : null"
            :aria-label="item.label"
            :title="collapsed ? item.label : null"
            :aria-disabled="isRestrictedDisabled(item) ? 'true' : null"
            :disabled="isRestrictedDisabled(item)"
            @click="emitNavigation(item)"
          >
            <span class="active-marker" aria-hidden="true"></span>
            <v-icon size="21">{{ item.icon }}</v-icon>
            <span class="navigation-label">{{ item.label }}</span>
          </button>
        </template>
      </nav>

      <div class="navigation-session">
        <v-menu
          v-model="accountMenuOpen"
          attach
          top
          :disabled="!navigationOpen"
          :offset-x="!mobile"
          :offset-y="mobile"
          :nudge-right="mobile ? 0 : 16"
          :nudge-top="mobile ? 8 : 0"
          origin="bottom left"
          min-width="244"
          max-width="244"
          content-class="sidebar-account-menu"
          :content-props="{ 'aria-label': 'Cuenta' }"
        >
          <template v-slot:activator="{ on, attrs }">
            <button
              type="button"
              class="session-card session-trigger"
              v-bind="attrs"
              v-on="on"
              :aria-label="'Menú de cuenta de ' + sessionName"
              :title="collapsed ? sessionName : null"
            >
              <span class="session-avatar" aria-hidden="true">{{ sessionInitials }}</span>
              <span class="session-copy">
                <strong>{{ sessionName }}</strong>
                <small>{{ sessionEmail || sessionRoleLabel || 'Sesión activa' }}</small>
              </span>
              <v-icon class="session-chevron" size="18" aria-hidden="true">mdi-chevron-right</v-icon>
            </button>
          </template>

          <v-list class="session-menu-list" role="presentation">
            <div class="session-card session-menu-header">
              <span class="session-avatar" aria-hidden="true">{{ sessionInitials }}</span>
              <span>
                <strong :title="sessionName">{{ sessionName }}</strong>
                <small :title="sessionEmail || sessionRoleLabel">
                  {{ sessionEmail || sessionRoleLabel || 'Sesión activa' }}
                </small>
                <small v-if="sessionEmail && sessionRoleLabel">{{ sessionRoleLabel }}</small>
              </span>
            </div>
            <v-list-item
              v-for="item in sessionItems"
              :key="item.key"
              :id="'account-' + (mobile ? 'mobile-' : 'desktop-') + item.key"
              class="session-menu-item"
              role="menuitem"
              @click="$emit('session-action', item)"
            >
              <v-icon size="17" aria-hidden="true">{{ item.icon }}</v-icon>
              <span>{{ item.label }}</span>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
  </aside>
</template>

<script>
import { TENANT_NAVIGATION_GROUPS } from '../../navigation/tenantNavigation';

export default {
  name: 'TenantNavigationRail',
  props: {
    sectionItems: {
      type: Array,
      default: () => []
    },
    actionItems: {
      type: Array,
      default: () => []
    },
    sessionItems: {
      type: Array,
      default: () => []
    },
    sessionName: {
      type: String,
      default: 'Usuario activo'
    },
    sessionInitials: {
      type: String,
      default: ''
    },
    sessionEmail: {
      type: String,
      default: ''
    },
    sessionRoleLabel: {
      type: String,
      default: ''
    },
    businessName: {
      type: String,
      default: ''
    },
    businessLogo: {
      type: String,
      default: ''
    },
    collapsed: Boolean,
    mobile: Boolean,
    navigationOpen: {
      type: Boolean,
      default: true
    },
    tenantRestricted: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({ failedLogo: '', accountMenuOpen: false }),
  computed: {
    showBusinessLogo() {
      return this.businessLogo && this.businessLogo !== this.failedLogo;
    },
    operationItems: function() {
      return this.sectionItems.filter((item) => item.group === TENANT_NAVIGATION_GROUPS.OPERATION);
    },
    clinicalItems: function() {
      return this.sectionItems.filter((item) => item.group === TENANT_NAVIGATION_GROUPS.CLINICAL);
    },
    managementItems: function() {
      return this.sectionItems.filter((item) => item.group === TENANT_NAVIGATION_GROUPS.MANAGEMENT);
    }
  },
  watch: {
    navigationOpen(open) {
      if (!open) this.accountMenuOpen = false;
    },
    collapsed() {
      this.accountMenuOpen = false;
    }
  },
  methods: {
    primaryActionClass: function(item) {
      return {
        'primary-action': true,
        'is-restricted': this.isRestrictedDisabled(item)
      };
    },
    navItemClass: function(item) {
      return {
        'navigation-item': true,
        'is-active': this.isActive(item),
        'is-restricted': this.isRestrictedDisabled(item)
      };
    },
    isRestrictedDisabled: function(item) {
      return Boolean(this.tenantRestricted && item && item.isTenantRestrictedDisabled);
    },
    emitNavigation: function(item) {
      if(this.isRestrictedDisabled(item)) {
        return;
      }

      this.$emit('navigate', item);
    },
    isActive: function(item) {
      const routeName = this.$route ? this.$route.name : '';
      const path = this.$route ? this.$route.path : '';
      const activeRouteNames = Array.isArray(item.activeRouteNames) ? item.activeRouteNames : [];
      const activePathPrefixes = Array.isArray(item.activePathPrefixes) ? item.activePathPrefixes : [];

      return activeRouteNames.includes(routeName) || activePathPrefixes.some((prefix) => path.indexOf(prefix) === 0);
    }
  }
};
</script>

<style scoped>
.tenant-navigation-rail {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;
  z-index: 38;
  width: var(--tenant-sidebar-width, 17rem);
}

.navigation-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 0.85rem;
  border-right: 1px solid rgba(14, 116, 144, 0.12);
  background: #fff;
}

.navigation-brand {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
  padding: 0.35rem 0.35rem 0.85rem;
  border-bottom: 1px solid #e5edf1;
}

.brand-copy {
  flex: 1;
  min-width: 0;
}

.brand-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 0.8rem;
  background: #0f766e;
  color: #ffffff;
  font-weight: 800;
  letter-spacing: 0;
}

.brand-mark .v-icon {
  color: #ffffff;
}

.brand-mark {
  width: 2.4rem;
  height: 2.4rem;
  font-size: 0.8rem;
}

.brand-mark--logo {
  background: #fff;
  border: 1px solid #e5edf1;
  overflow: hidden;
}

.brand-mark img {
  width: 100%;
  height: 100%;
  padding: 0.2rem;
  object-fit: contain;
}

.navigation-brand strong,
.session-card strong {
  display: block;
  min-width: 0;
  color: #12313a;
  font-size: 0.92rem;
  line-height: 1.2rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navigation-brand small,
.session-card small {
  display: block;
  min-width: 0;
  margin-top: 0.1rem;
  color: #64748b;
  font-size: 0.76rem;
  line-height: 1.05rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navigation-brand strong {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
  overflow-wrap: anywhere;
}

.navigation-actions {
  padding: 0.95rem 0.15rem 0.55rem;
}

.restricted-status {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.8rem 0.15rem 0;
  padding: 0.6rem 0.7rem;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
}

.restricted-status .v-icon {
  color: currentColor;
}

.primary-action,
.navigation-item {
  width: 100%;
  min-height: 2.8rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  font-size: 0.9rem;
  letter-spacing: 0;
  text-align: left;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.primary-action {
  justify-content: center;
  padding: 0 0.85rem;
  background: #0f766e;
  color: #ffffff;
  font-weight: 800;
}

.primary-action:hover,
.primary-action:focus {
  background: #115e59;
  outline: none;
}

.primary-action .v-icon {
  color: #ffffff;
}

.primary-action.is-restricted,
.primary-action.is-restricted:hover,
.primary-action.is-restricted:focus {
  color: #64748b;
  background: #e2e8f0;
  border-color: #cbd5e1;
  box-shadow: none;
  cursor: not-allowed;
}

.primary-action.is-restricted .v-icon {
  color: #64748b;
}

.navigation-sections {
  min-height: 0;
  overflow-y: auto;
  padding: 0.15rem;
}

.navigation-caption {
  margin: 1rem 0 0.4rem;
  padding: 0 0.65rem;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1rem;
  text-transform: uppercase;
}

.navigation-item {
  position: relative;
  margin-bottom: 0.2rem;
  padding: 0 0.75rem;
  color: #334155;
  background: transparent;
  font-weight: 700;
}

.navigation-item:hover,
.navigation-item:focus {
  background: #eef8f8;
  color: #0f766e;
  outline: none;
}

.navigation-item.is-active {
  border-color: #b7e4df;
  background: #e7f6f4;
  color: #0f766e;
}

.active-marker {
  position: absolute;
  left: 0.35rem;
  width: 0.22rem;
  height: 1.55rem;
  border-radius: 999px;
  background: transparent;
}

.navigation-item.is-active .active-marker {
  background: #0f766e;
}

.navigation-item .v-icon {
  color: currentColor;
}

.navigation-item.is-restricted,
.navigation-item.is-restricted:hover,
.navigation-item.is-restricted:focus {
  color: #94a3b8;
  background: transparent;
  border-color: transparent;
  cursor: not-allowed;
  opacity: 0.82;
}

.navigation-item.is-restricted .active-marker {
  background: transparent;
}

.navigation-session {
  --account-surface: #fff;
  --account-border: #e5e7eb;
  --account-hover: #f1f5f9;
  --account-text: #0f172a;
  --account-muted: #64748b;
  --account-avatar-bg: #e5f2ef;
  --account-avatar-text: #115e59;
  margin-top: auto;
  padding-top: 0.65rem;
  border-top: 1px solid var(--account-border);
}

.session-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.session-trigger {
  grid-template-columns: auto minmax(0, 1fr) auto;
  width: 100%;
  padding: 0.45rem;
  border-radius: 0.55rem;
  text-align: start;
}

.session-trigger:hover,
.session-trigger[aria-expanded="true"] {
  background: var(--account-hover);
}

.session-trigger:focus-visible {
  outline: 2px solid #0f766e;
  outline-offset: 2px;
}

.session-avatar {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: var(--account-avatar-bg);
  color: var(--account-avatar-text);
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
}

.session-card strong {
  color: var(--account-text);
  font-size: 0.875rem;
  font-weight: 600;
}

.session-card small,
.session-chevron.v-icon {
  color: var(--account-muted);
}

.navigation-session ::v-deep .sidebar-account-menu {
  border: 1px solid var(--account-border);
  border-radius: 0.65rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
}

.session-menu-list.v-list {
  padding: 0.25rem;
  background: var(--account-surface);
  color: var(--account-text);
}

.session-menu-header {
  margin-bottom: 0.25rem;
  padding: 0.45rem 0.45rem 0.65rem;
  border-bottom: 1px solid var(--account-border);
}

.session-menu-item.v-list-item {
  gap: 0.55rem;
  min-height: 2.1rem;
  padding-inline: 0.45rem;
  border-radius: 0.4rem;
  color: var(--account-text) !important;
  font-size: 0.85rem;
}

.session-menu-item .v-icon {
  color: var(--account-muted);
}

html[data-theme="clinical-night"] .navigation-panel {
  border-color: rgba(148, 163, 184, 0.18);
  background: #0f172a;
}

html[data-theme="clinical-night"] .navigation-brand {
  border-color: rgba(148, 163, 184, 0.18);
}

html[data-theme="clinical-night"] .restricted-status {
  border-color: rgba(96, 165, 250, 0.28);
  background: rgba(30, 64, 175, 0.16);
  color: #93c5fd;
}

html[data-theme="clinical-night"] .navigation-brand strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .navigation-brand small,
html[data-theme="clinical-night"] .navigation-caption {
  color: #94a3b8;
}

html[data-theme="clinical-night"] .navigation-item {
  color: #cbd5e1;
}

html[data-theme="clinical-night"] .navigation-item:hover,
html[data-theme="clinical-night"] .navigation-item:focus,
html[data-theme="clinical-night"] .navigation-item.is-active {
  border-color: rgba(45, 212, 191, 0.28);
  background: rgba(20, 184, 166, 0.14);
  color: #5eead4;
}

html[data-theme="clinical-night"] .primary-action.is-restricted,
html[data-theme="clinical-night"] .primary-action.is-restricted:hover,
html[data-theme="clinical-night"] .primary-action.is-restricted:focus,
html[data-theme="clinical-night"] .navigation-item.is-restricted,
html[data-theme="clinical-night"] .navigation-item.is-restricted:hover,
html[data-theme="clinical-night"] .navigation-item.is-restricted:focus {
  color: #64748b;
  background: transparent;
  border-color: transparent;
}

html[data-theme="clinical-night"] .primary-action.is-restricted {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(148, 163, 184, 0.16);
}

html[data-theme="clinical-night"] .primary-action.is-restricted .v-icon {
  color: #64748b;
}

html[data-theme="clinical-night"] .navigation-session {
  --account-surface: #111c2e;
  --account-border: #334155;
  --account-hover: #1e293b;
  --account-text: #e2e8f0;
  --account-muted: #94a3b8;
  --account-avatar-bg: #134e4a;
  --account-avatar-text: #ccfbf1;
}

.is-collapsed .navigation-panel {
  padding-inline: 0.55rem;
}

.is-collapsed .navigation-brand {
  flex-direction: column;
  gap: 0.4rem;
  padding-inline: 0;
}

.is-collapsed .brand-copy,
.is-collapsed .navigation-caption,
.is-collapsed .navigation-label,
.is-collapsed .session-copy,
.is-collapsed .session-chevron,
.is-collapsed .restricted-label {
  display: none;
}

.is-collapsed .navigation-item,
.is-collapsed .primary-action,
.is-collapsed .restricted-status {
  justify-content: center;
  padding-inline: 0;
}

.is-collapsed .active-marker {
  inset-inline-start: 0.2rem;
}

.is-collapsed .session-trigger {
  grid-template-columns: 1fr;
  justify-items: center;
  padding-inline: 0;
}

@media (max-width: 1023px) {
  .tenant-navigation-rail {
    position: static;
    width: 100%;
    height: 100%;
  }

  .navigation-panel {
    height: 100%;
    border-right: 0;
  }
}
</style>
