<template>
  <aside class="tenant-navigation-rail" aria-label="Navegacion principal">
    <div class="navigation-panel">
      <div class="navigation-brand">
        <span class="brand-mark" aria-hidden="true">
          <v-icon size="20">mdi-hospital-building</v-icon>
        </span>
        <div>
          <strong>{{ businessName || 'Tu consultorio' }}</strong>
          <small>Consultorio</small>
        </div>
      </div>

      <div v-if="tenantRestricted" class="restricted-status" role="status">
        <v-icon size="18">mdi-lock-alert-outline</v-icon>
        <span>Acceso restringido</span>
      </div>

      <div v-if="actionItems.length" class="navigation-actions">
        <button
          v-for="item in actionItems"
          :key="item.key"
          type="button"
          :class="primaryActionClass(item)"
          :aria-label="item.label"
          :aria-disabled="isRestrictedDisabled(item) ? 'true' : null"
          :disabled="isRestrictedDisabled(item)"
          @click="emitNavigation(item)"
        >
          <v-icon size="20">{{ item.icon }}</v-icon>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <nav class="navigation-sections" aria-label="Secciones del sistema">
        <p class="navigation-caption">Operacion</p>
        <button
          v-for="item in operationItems"
          :key="item.key"
          type="button"
          :class="navItemClass(item)"
          :aria-current="isActive(item) ? 'page' : null"
          :aria-disabled="isRestrictedDisabled(item) ? 'true' : null"
          :disabled="isRestrictedDisabled(item)"
          @click="emitNavigation(item)"
        >
          <span class="active-marker" aria-hidden="true"></span>
          <v-icon size="21">{{ item.icon }}</v-icon>
          <span>{{ item.label }}</span>
        </button>

        <template v-if="clinicalItems.length">
          <p class="navigation-caption">Clinico</p>
          <button
            v-for="item in clinicalItems"
            :key="item.key"
            type="button"
            :class="navItemClass(item)"
            :aria-current="isActive(item) ? 'page' : null"
            :aria-disabled="isRestrictedDisabled(item) ? 'true' : null"
            :disabled="isRestrictedDisabled(item)"
            @click="emitNavigation(item)"
          >
            <span class="active-marker" aria-hidden="true"></span>
            <v-icon size="21">{{ item.icon }}</v-icon>
            <span>{{ item.label }}</span>
          </button>
        </template>

        <template v-if="managementItems.length">
          <p class="navigation-caption">Gestion</p>
          <button
            v-for="item in managementItems"
            :key="item.key"
            type="button"
            :class="navItemClass(item)"
            :aria-current="isActive(item) ? 'page' : null"
            :aria-disabled="isRestrictedDisabled(item) ? 'true' : null"
            :disabled="isRestrictedDisabled(item)"
            @click="emitNavigation(item)"
          >
            <span class="active-marker" aria-hidden="true"></span>
            <v-icon size="21">{{ item.icon }}</v-icon>
            <span>{{ item.label }}</span>
          </button>
        </template>
      </nav>

      <div class="navigation-session">
        <div class="session-card">
          <div class="session-avatar">{{ sessionInitials }}</div>
          <div>
            <strong>{{ sessionName }}</strong>
            <small>{{ sessionRoleLabel || 'Sesion activa' }}</small>
          </div>
        </div>
        <button
          v-for="item in sessionItems"
          :key="item.key"
          type="button"
          class="session-action"
          :aria-label="item.label"
          @click="$emit('session-action', item)"
        >
          <v-icon size="20">{{ item.icon }}</v-icon>
          <span>{{ item.label }}</span>
        </button>
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
    sessionRoleLabel: {
      type: String,
      default: ''
    },
    businessName: {
      type: String,
      default: ''
    },
    tenantRestricted: {
      type: Boolean,
      default: false
    }
  },
  computed: {
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
  top: 4rem;
  left: 0;
  bottom: 2.75rem;
  z-index: 38;
  width: 17rem;
  padding: 0.85rem 0.8rem;
  pointer-events: none;
}

.navigation-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 0.85rem;
  border-right: 1px solid rgba(14, 116, 144, 0.12);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
  pointer-events: auto;
}

.navigation-brand {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
  padding: 0.35rem 0.35rem 0.85rem;
  border-bottom: 1px solid #e5edf1;
}

.brand-mark,
.session-avatar {
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
.navigation-item,
.session-action {
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
  display: grid;
  gap: 0.55rem;
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid #e5edf1;
}

.session-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  align-items: center;
  min-width: 0;
  padding: 0.55rem 0.35rem;
}

.session-avatar {
  width: 2rem;
  height: 2rem;
  font-size: 0.72rem;
}

.session-card div {
  min-width: 0;
}

.session-card strong,
.session-card small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-action {
  padding: 0 0.75rem;
  color: #475569;
  background: #f8fafc;
  border-color: #e2e8f0;
  font-weight: 700;
}

.session-action:hover,
.session-action:focus {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
  outline: none;
}

html[data-theme="clinical-night"] .navigation-panel {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.95);
}

html[data-theme="clinical-night"] .navigation-brand,
html[data-theme="clinical-night"] .navigation-session {
  border-color: rgba(148, 163, 184, 0.18);
}

html[data-theme="clinical-night"] .restricted-status {
  border-color: rgba(96, 165, 250, 0.28);
  background: rgba(30, 64, 175, 0.16);
  color: #93c5fd;
}

html[data-theme="clinical-night"] .navigation-brand strong,
html[data-theme="clinical-night"] .session-card strong {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .navigation-brand small,
html[data-theme="clinical-night"] .session-card small,
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

html[data-theme="clinical-night"] .session-action {
  color: #cbd5e1;
  background: rgba(30, 41, 59, 0.82);
  border-color: rgba(148, 163, 184, 0.2);
}

@media (max-width: 1023px) {
  .tenant-navigation-rail {
    position: static;
    width: 100%;
    height: 100%;
    padding: 0;
  }

  .navigation-panel {
    height: 100%;
    border-right: 0;
    box-shadow: none;
  }
}
</style>
