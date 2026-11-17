<template>
  <aside class="tenant-navigation-rail" :class="{ 'is-collapsed': collapsed }" aria-label="Navegación principal">
    <div class="navigation-panel">
      <div class="navigation-brand" :title="collapsed ? businessName : null">
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
          <v-icon size="18">{{ item.icon }}</v-icon>
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
          <v-icon size="18">{{ item.icon }}</v-icon>
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
              <v-icon size="18">{{ item.icon }}</v-icon>
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
              <v-icon size="18">{{ item.icon }}</v-icon>
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
            <v-btn
              text block
              class="session-trigger"
              v-bind="attrs"
              v-on="on"
              :aria-label="'Menú de cuenta de ' + sessionName"
              :title="collapsed ? sessionName : null"
            >
              <span class="session-card session-trigger-content">
                <v-avatar size="32" class="session-avatar" aria-hidden="true">{{ sessionInitials }}</v-avatar>
                <span class="session-copy">
                  <strong>{{ sessionName }}</strong>
                  <small>{{ sessionEmail || sessionRoleLabel || 'Sesión activa' }}</small>
                </span>
                <v-icon class="session-chevron" size="18" aria-hidden="true">mdi-chevron-right</v-icon>
              </span>
            </v-btn>
          </template>

          <v-list class="session-menu-list" role="presentation">
            <v-list-item class="session-card session-menu-header" role="presentation">
              <v-avatar size="32" class="session-avatar" aria-hidden="true">{{ sessionInitials }}</v-avatar>
              <span>
                <strong :title="sessionName">{{ sessionName }}</strong>
                <small :title="sessionEmail || sessionRoleLabel">
                  {{ sessionEmail || sessionRoleLabel || 'Sesión activa' }}
                </small>
                <small v-if="sessionEmail && sessionRoleLabel">{{ sessionRoleLabel }}</small>
              </span>
            </v-list-item>
            <template v-for="(item, index) in sessionItems">
              <v-divider v-if="item.key === 'logout' && index > 0" :key="item.key + '-divider'" class="session-menu-divider" />
              <v-list-item
                :key="item.key"
                :id="'account-' + (mobile ? 'mobile-' : 'desktop-') + item.key"
                class="session-menu-item"
                :class="{ 'session-menu-item--logout': item.key === 'logout' }"
                role="menuitem"
                @click="$emit('session-action', item)"
              >
                <v-icon size="17" aria-hidden="true">{{ item.icon }}</v-icon>
                <span>{{ item.label }}</span>
              </v-list-item>
            </template>
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
  data: () => ({ accountMenuOpen: false }),
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
  width:100%; height:100%;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;
  color:var(--tenant-nav-ink);
}
.navigation-panel { display:flex; flex-direction:column; height:100%; min-height:0; padding:16px 12px 12px; background:var(--tenant-nav-surface); }
.navigation-brand { display:flex; align-items:center; gap:12px; min-width:0; min-height:56px; padding:0 8px 16px; border-bottom:1px solid var(--tenant-nav-border); }
.brand-copy { flex:1; min-width:0; }
.navigation-brand strong { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; color:var(--tenant-nav-ink); font-size:15px; font-weight:600; line-height:1.5; }
.navigation-brand small { display:block; margin-top:2px; color:var(--tenant-nav-muted); font-size:11px; line-height:1.5; }
.navigation-actions { padding:20px 0 8px; }
.primary-action,.navigation-item { display:flex; align-items:center; gap:9px; width:100%; min-height:44px; padding:8px 10px; border:0; border-radius:6px; font-size:13px; line-height:1.4; letter-spacing:0; text-align:left; transition:background-color 160ms ease,color 160ms ease; }
.primary-action .v-icon,.navigation-item .v-icon { flex-shrink:0; color:inherit; }
.navigation-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.primary-action { justify-content:center; background:var(--tenant-nav-accent); color:var(--tenant-nav-surface); font-weight:600; }
.primary-action:hover { background:var(--tenant-nav-accent-hover); }
.navigation-sections { min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:0; }
.navigation-caption { margin:22px 10px 7px; color:var(--tenant-nav-muted); font-size:11px; font-weight:600; line-height:1.5; }
.navigation-item { margin-bottom:4px; background:transparent; color:var(--tenant-nav-muted); font-weight:400; }
.navigation-item:hover { background:var(--tenant-nav-hover); color:var(--tenant-nav-ink); }
.navigation-item.is-active { background:var(--tenant-nav-selected); color:var(--tenant-nav-ink); font-weight:600; }
.primary-action:focus-visible,.navigation-item:focus-visible,.session-trigger:focus-visible { outline:2px solid var(--tenant-nav-accent); outline-offset:2px; }
.restricted-status { display:flex; align-items:center; gap:9px; margin-top:16px; padding:10px; border:1px solid var(--tenant-nav-border); border-radius:6px; background:var(--tenant-nav-hover); color:var(--tenant-nav-muted); font-size:12px; font-weight:500; }
.restricted-status .v-icon { color:inherit; }
.primary-action.is-restricted,.primary-action.is-restricted:hover,.navigation-item.is-restricted,.navigation-item.is-restricted:hover { background:var(--tenant-nav-hover); color:var(--tenant-nav-muted); cursor:not-allowed; opacity:.65; }
.navigation-session {
  --account-surface:var(--tenant-nav-surface);
  --account-border:var(--tenant-nav-border);
  --account-hover:var(--tenant-nav-hover);
  --account-text:var(--tenant-nav-ink);
  --account-muted:var(--tenant-nav-muted);
  --account-avatar-bg:var(--tenant-nav-selected);
  --account-avatar-text:var(--tenant-nav-ink);
  margin-top:auto; padding-top:12px; border-top:1px solid var(--account-border);
}
.session-card { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:10px; min-width:0; }
.session-trigger.v-btn { width:100%; height:auto; min-height:44px; padding:8px; border-radius:6px; color:var(--account-text); text-align:start; text-transform:none; letter-spacing:0; }
.session-trigger ::v-deep .v-btn__content { width:100%; }
.session-trigger-content { grid-template-columns:auto minmax(0,1fr) auto; width:100%; }
.session-trigger:hover,.session-trigger[aria-expanded="true"] { background:var(--account-hover); }
.session-avatar { display:grid; place-items:center; flex-shrink:0; width:32px; height:32px; border-radius:6px; background:var(--account-avatar-bg); color:var(--account-avatar-text); font-size:11px; font-weight:600; text-transform:uppercase; }
.session-card strong,.session-card small { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:1.5; }
.session-card strong { color:var(--account-text); font-size:13px; font-weight:600; }
.session-card small { color:var(--account-muted); font-size:11px; margin-top:2px; }
.session-chevron.v-icon { color:var(--account-muted); }
.navigation-session ::v-deep .sidebar-account-menu { border:1px solid var(--account-border); border-radius:8px; box-shadow:0 8px 24px rgba(25,62,67,.12); }
.session-menu-list.v-list { padding:4px; background:var(--account-surface); color:var(--account-text); }
.session-menu-header { display:flex; margin-bottom:4px; padding:8px 8px 12px; border-bottom:1px solid var(--account-border); }
.session-menu-header > span { min-width:0; flex:1; }
.session-menu-item.v-list-item { gap:9px; min-height:40px; padding-inline:8px; border-radius:6px; color:var(--account-text)!important; font-size:13px; }
.session-menu-item .v-icon { color:var(--account-muted); }
.session-menu-divider.v-divider { margin:4px 0; border-color:var(--account-border); }
.session-menu-item--logout.v-list-item { --logout-color:#b42318; color:var(--logout-color)!important; }
.session-menu-item--logout.v-list-item .v-icon,
.session-menu-item--logout.v-list-item > span { color:var(--logout-color)!important; }
.session-menu-item--logout:hover { background:rgba(180,35,24,.06); }
html[data-theme="clinical-night"] .session-menu-item--logout.v-list-item { --logout-color:#fda29b; }
html[data-theme="clinical-night"] .session-menu-item--logout:hover { background:rgba(253,162,155,.08); }
.is-collapsed .navigation-panel { padding-inline:12px; }
.is-collapsed .navigation-brand { justify-content:center; padding-inline:0; }
.is-collapsed .brand-copy,.is-collapsed .navigation-caption,.is-collapsed .navigation-label,.is-collapsed .session-copy,.is-collapsed .session-chevron,.is-collapsed .restricted-label { display:none; }
.is-collapsed .navigation-item,.is-collapsed .primary-action,.is-collapsed .restricted-status { justify-content:center; padding-inline:0; }
.is-collapsed .session-trigger { padding-inline:0; }
.is-collapsed .session-trigger-content { grid-template-columns:1fr; justify-items:center; }
@media(max-width:1023px) { .navigation-panel { padding:20px 16px 16px; } }
@media(prefers-reduced-motion:reduce) { .primary-action,.navigation-item { transition:none; } }
</style>
