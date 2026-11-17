<template>
  <div class="min-h-full app-background tenant-layout" :class="{ 'tenant-settings-layout': $route.path === '/admin', 'tenant-restricted-layout': $route.name === 'tenantRestricted', 'tenant-pulse-layout': $route.name === 'business-pulse', 'tenant-sidebar-collapsed': sidebarCollapsed }">
    <header class="tenant-header" :inert="isMobileNavigationOpen ? '' : null">
      <div class="tenant-header-nav">
        <div class="tenant-header-left">
          <v-btn
            class="tenant-mobile-menu-button"
            ref="mobileMenuButton"
            icon
            color="primary"
            aria-label="Abrir navegación principal"
            :aria-expanded="String(isMobileNavigationOpen)"
            aria-controls="tenant-mobile-navigation"
            @click="isMobileNavigationOpen = true"
          >
            <v-icon>mdi-menu</v-icon>
          </v-btn>

          <nav class="tenant-breadcrumb" aria-label="Ruta de navegación">
            <ol>
              <li v-for="(item, index) in breadcrumbs" :key="item.label">
                <v-icon v-if="index" class="tenant-breadcrumb-separator" size="16" aria-hidden="true">mdi-chevron-right</v-icon>
                <router-link v-if="index < breadcrumbs.length - 1" :to="item.path">{{ item.label }}</router-link>
                <span v-else aria-current="page" :title="item.label">{{ item.label }}</span>
              </li>
            </ol>
          </nav>
        </div>

        <div class="tenant-header-right">
          <div class="tenant-logo">
            <medsync-brand :custom-logo="logoOrrico === defaultBrandLogo ? '' : logoOrrico" />
          </div>
        </div>
      </div>
    </header>

    <v-navigation-drawer
      id="tenant-desktop-navigation"
      class="tenant-desktop-navigation"
      permanent fixed touchless
      disable-resize-watcher disable-route-watcher
      width="var(--tenant-sidebar-width)"
    >
      <tenant-navigation-rail
        :collapsed="sidebarCollapsed"
        :section-items="sectionNavigationItems"
        :action-items="actionNavigationItems"
        :session-items="sessionNavigationItems"
        :session-name="sessionName"
        :session-email="(sessionUser || {}).email || ''"
        :session-initials="sessionInitials"
        :session-role-label="sessionRoleLabel"
        :business-name="businessName"
        :tenant-restricted="isTenantRestrictedMode"
        @navigate="navigateToItem"
        @session-action="handleSessionAction"
      >
        <template v-slot:brand-action>
          <button class="tenant-sidebar-toggle" type="button" aria-controls="tenant-desktop-navigation"
            :aria-expanded="String(!sidebarCollapsed)" :aria-label="sidebarToggleLabel" :title="sidebarToggleLabel"
            @click="sidebarCollapsed = !sidebarCollapsed">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
              <path :d="sidebarCollapsed ? 'm14 9 3 3-3 3' : 'm17 9-3 3 3 3'" />
            </svg>
          </button>
        </template>
      </tenant-navigation-rail>
    </v-navigation-drawer>

    <v-navigation-drawer
      ref="mobileDrawer"
      id="tenant-mobile-navigation"
      role="dialog"
      aria-label="Navegación principal"
      :aria-modal="isMobileNavigationOpen ? 'true' : null"
      tabindex="-1"
      v-model="isMobileNavigationOpen"
      fixed
      temporary
      width="296"
      class="tenant-mobile-drawer"
    >
      <tenant-navigation-rail
        mobile
        :navigation-open="isMobileNavigationOpen"
        :section-items="sectionNavigationItems"
        :action-items="actionNavigationItems"
        :session-items="sessionNavigationItems"
        :session-name="sessionName"
        :session-email="(sessionUser || {}).email || ''"
        :session-initials="sessionInitials"
        :session-role-label="sessionRoleLabel"
        :business-name="businessName"
        :tenant-restricted="isTenantRestrictedMode"
        @navigate="navigateToItem"
        @session-action="handleSessionAction"
      />
    </v-navigation-drawer>

    <main class="tenant-main-shell" :inert="isMobileNavigationOpen ? '' : null">
      <da-re-login :show="isRelogin" v-on:auth="isRelogin = false"></da-re-login>
      <div class="tenant-content">
        <trial-notice />
        <pulse-return />
        <onboarding-coordinator />
        <slot></slot>
      </div>
    </main>

    <logout-confirm-dialog v-model="showLogoutConfirmation" @confirm="confirmLogout" />

  </div>
</template>

<script>
import { containNavigationFocus } from '../../utils/mobileNavigationFocus';
import PulseReturn from '../../views/Pulse/PulseReturn.vue';
import OnboardingCoordinator from '../../views/configuration/components/OnboardingCoordinator.vue';
import { canAccessPulse } from '../../security/pulseAccess';
import { canAccessSettings, getSettingsSections } from '../../security/settingsAccess';
import { mapActions, mapGetters } from 'vuex';
import fnTypes from '../../store/modules/common/fn-types';
import moduleTypes from '../../store/modules/common/module-types';
import ReLogin from '../../views/Auth/ReLogin.vue';
import VuexMixin from '../../mixins/VuexMixin';
import { DAConfigService } from '../../services/context/core-proccess-context';
import { getLoginImageData, setStoredLoginLogo } from '../../utils/branding';
import decode from 'jwt-decode';
import { isD2AuthMode } from '../../services/config/authTransport.config';
import TenantNavigationRail from '../components/navigation/TenantNavigationRail.vue';
import LogoutConfirmDialog from '../components/navigation/LogoutConfirmDialog.vue';
import TrialNotice from '../../components/billing/TrialNotice.vue';
import {
  tenantNavigationItems,
  sortTenantNavigationItems,
  TENANT_NAVIGATION_TYPES
} from '../navigation/tenantNavigation';

export default {
    mixins:[VuexMixin],
    data: function() {
        let sidebarCollapsed = false
        try { sidebarCollapsed = window.localStorage.getItem('medsync.sidebar.collapsed') === 'true' } catch (_) { /* Keep navigation usable when storage is unavailable. */ }
        return {
            defaultBrandLogo: require('@/assets/login/med-sync-logo.svg'),
            logoOrrico: require('@/assets/login/med-sync-logo.svg'),
            sidebarCollapsed,
            isMobileNavigationOpen: false,
            showLogoutConfirmation: false,
            isRelogin: false,
            navigationItems: sortTenantNavigationItems(tenantNavigationItems)
        }
    },
    components: {
      TrialNotice, PulseReturn, OnboardingCoordinator, LogoutConfirmDialog,
      'da-re-login': ReLogin,
      'tenant-navigation-rail': TenantNavigationRail
    },
    created() {
      this.loadHeaderLogo()
    },
    mounted() {
      this.closeMobileNavigationOnDesktop()
      window.addEventListener('resize', this.closeMobileNavigationOnDesktop)
    },
    beforeDestroy() {
      if(this.releaseMobileFocus) this.releaseMobileFocus();
      window.removeEventListener('resize', this.closeMobileNavigationOnDesktop)
    },
    computed: {
        ...mapGetters(moduleTypes.AUTH, {
            isAuthorized: fnTypes.isAuthorized,
            user: fnTypes.getUser,
            unauthorized: fnTypes.unauthorized,
            refreshtoken: fnTypes.refreshtoken,
            isRefresingToken: fnTypes.isRefresingToken,
            hasPermission: fnTypes.hasPermission,
            tenantOperational: fnTypes.getTenantOperational,
            business: fnTypes.getBusiness,
            role: fnTypes.getRole,
        }),
        currentRoute: function() {
          return this.$route.name
        },
        allowedNavigationItems: function() {
          return this.navigationItems
            .filter((item) => this.canShowNavigationItem(item))
            .map((item) => this.resolveNavigationItemState(item))
        },
        sectionNavigationItems: function() {
          return this.allowedNavigationItems.filter((item) => item.type === TENANT_NAVIGATION_TYPES.SECTION)
        },
        actionNavigationItems: function() {
          return this.allowedNavigationItems.filter((item) => item.type === TENANT_NAVIGATION_TYPES.ACTION)
        },
        sessionNavigationItems: function() {
          const sections = getSettingsSections(this.role, this.hasPermission)
          const shortcuts = (this.isTenantRestrictedMode ? ['plan-billing'] : ['doctor-identity', 'plan-billing'])
            .map(key => sections.find(section => section.key === key))
            .filter(Boolean)
            .map(section => ({
              key: section.key,
              label: section.key === 'doctor-identity' ? 'Mi perfil' : section.title,
              icon: section.icon,
              path: `/admin?section=${section.key}`
            }))
          return [...shortcuts, ...this.allowedNavigationItems.filter(item => item.type === TENANT_NAVIGATION_TYPES.SESSION)]
        },
        currentPrimaryItem: function() {
          return this.sectionNavigationItems.find((item) => this.isItemActive(item))
            || this.actionNavigationItems.find((item) => this.isItemActive(item))
            || this.sectionNavigationItems[0]
            || null
        },
        currentSettingsSection() {
          if(this.$route.path !== '/admin') return null
          const sections = getSettingsSections(this.role, this.hasPermission)
          return sections.find(section => section.key === this.$route.query.section) || sections[0] || null
        },
        breadcrumbs: function() {
          const home = this.sectionNavigationItems.find((item) => item.key === 'home') || { label: 'Inicio', path: '/inicio' }
          if(this.$route.path === '/admin') {
            const items = [home, { label: 'Configuración', path: '/admin' }]
            if(this.currentSettingsSection) items.push({ label: this.currentSettingsSection.title })
            return items
          }
          const current = this.currentPrimaryItem || home
          if(current.key === 'home' || current === home) return [home]
          const items = [home, current]
          if(this.$route.name === 'ShowPx') items.push({ label: 'Expediente del paciente' })
          return items
        },
        sidebarToggleLabel: function() {
          return this.sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'
        },
        sessionName: function() {
          const user = this.sessionUser
          if(!user) {
            return 'Usuario activo'
          }

          return user.name || user.user_name || user.username || user.email || user.telephone || 'Usuario activo'
        },
        sessionUser: function() {
          if(isD2AuthMode()) {
            return this.user || null
          }

          if(this.user && this.user.name) {
            return this.user
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
        sessionInitials: function() {
          const name = this.sessionName.trim()
          if(!name) {
            return ''
          }

          return name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join('')
        },
        businessName: function() {
          if(isD2AuthMode()) {
            const business = this.business || {}
            if(business.name || business.legalName) {
              return business.name || business.legalName
            }

            const user = this.sessionUser
            return user && user.business_name ? user.business_name : ''
          }

          const user = this.sessionUser
          if(user && user.business_name) {
            return user.business_name
          }

          const business = this.$session ? this.$session.get('business') : null
          return business && business.name ? business.name : ''
        },
        sessionRoleLabel: function() {
          if(isD2AuthMode()) {
            return this.role ? this.roleLabel(this.role) : ''
          }

          const user = this.sessionUser
          return user && user.rol ? this.roleLabel(user.rol) : ''
        },
        isTenantRestrictedMode: function() {
          const tenantOperational = isD2AuthMode()
            ? this.tenantOperational
            : this.tenantOperational || (this.$session ? this.$session.get('tenantOperational') : null)
          return Boolean(
            tenantOperational
            && tenantOperational.allowed === false
            && tenantOperational.code === 'TENANT_NOT_OPERATIONAL'
          )
        }
    },

    methods: {
        ...mapActions(moduleTypes.AUTH, [
            fnTypes.logout, fnTypes.getRefreshtoken
        ]),
        loadHeaderLogo: async function() {
            const response = await DAConfigService.getLoginImage();
            const logo = getLoginImageData(response);
            if(logo) {
              this.logoOrrico = logo;
              setStoredLoginLogo(logo);
            }
        },
        navigateToItem: function(item) {
          if(!item || !item.path) {
            return
          }

          this.isMobileNavigationOpen = false

          if(this.isTenantRestrictedMode && item.isTenantRestrictedDisabled) {
            return
          }

          if(this.$route && this.$route.path === item.path) {
            return
          }

          this.$router.push(item.path).catch(() => {})
        },
        handleSessionAction: function(item) {
          this.isMobileNavigationOpen = false

          if(item && item.key === 'logout') {
            this.showLogoutConfirmation = true
            return
          }
          const target = this.sessionNavigationItems.find(entry => item && entry.key === item.key && entry.path)
          if(target) this.navigateToItem(target)
        },
        confirmLogout() {
          if(!this.showLogoutConfirmation) return
          this.showLogoutConfirmation = false
          return this.logout()
        },
        isItemActive: function(item) {
          const routeName = this.$route ? this.$route.name : ''
          const path = this.$route ? this.$route.path : ''
          const activeRouteNames = Array.isArray(item.activeRouteNames) ? item.activeRouteNames : []
          const activePathPrefixes = Array.isArray(item.activePathPrefixes) ? item.activePathPrefixes : []

          return activeRouteNames.includes(routeName) || activePathPrefixes.some((prefix) => path.indexOf(prefix) === 0)
        },
        canShowNavigationItem: function(item) {
          if(!item) {
            return false
          }
          if(item.pulseAccess) return canAccessPulse(this.$store.state.CORE.AUTH.permissions,this.role)
          if(item.settingsAccess) return canAccessSettings(this.role, this.hasPermission)

          if(Array.isArray(item.permissionsAny) && item.permissionsAny.length) {
            return item.permissionsAny.some((permission) => this.hasPermission(permission))
          }

          return this.hasPermission(item.permission)
        },
        resolveNavigationItemState: function(item) {
          if(!this.isTenantRestrictedMode || item.type === TENANT_NAVIGATION_TYPES.SESSION) {
            return item
          }

          if(item.key === 'home') {
            return {
              ...item,
              icon: 'mdi-lock-outline',
              routeName: 'tenantRestricted',
              path: '/tenant-restricted',
              activeRouteNames: ['tenantRestricted'],
              activePathPrefixes: ['/tenant-restricted']
            }
          }

          if(item.key === 'patients') {
            return {
              ...item,
              icon: 'mdi-account-search-outline',
              label: 'Pacientes',
              routeName: 'AllPatients',
              path: '/px/all',
              activeRouteNames: ['AllPatients', 'ShowPx', 'patient'],
              activePathPrefixes: ['/px/all', '/px/history']
            }
          }

          return {
            ...item,
            icon: 'mdi-lock-outline',
            isTenantRestrictedDisabled: true
          }
        },
        closeMobileNavigationOnDesktop: function() {
          if(window.innerWidth >= 1024) {
            this.isMobileNavigationOpen = false
          }
        },
        roleLabel: function(role) {
            const roles = {
                super_admin: 'Super admin',
                business_admin: 'Admin negocio',
                doctor: 'Doctor',
                receptionist: 'Recepcion',
                assistant: 'Asistente',
                admin: 'Administrador'
            }

            return roles[role] || role
        }
    },
    watch: {
      showLogoutConfirmation(open) {
          if(open) return
          this.$nextTick(() => {
              if(this._isDestroyed) return
              const trigger = window.innerWidth < 1024
                  ? this.$refs.mobileMenuButton && this.$refs.mobileMenuButton.$el
                  : this.$el.querySelector('#tenant-desktop-navigation .session-trigger')
              if(trigger && trigger.isConnected && trigger.getClientRects().length) trigger.focus()
          })
      },
      sidebarCollapsed(value) {
          try { window.localStorage.setItem('medsync.sidebar.collapsed', String(value)) } catch (_) { /* The selection still works for this page session. */ }
      },
      isMobileNavigationOpen: function(open) {
          if(this.releaseMobileFocus) { this.releaseMobileFocus(); this.releaseMobileFocus = null; }
          this.$nextTick(() => {
              if(open && this.isMobileNavigationOpen && !this._isDestroyed) {
                  this.releaseMobileFocus = containNavigationFocus(this.$refs.mobileDrawer.$el,
                      () => { this.isMobileNavigationOpen = false; });
              } else if(!open && !this.isMobileNavigationOpen && !this.showLogoutConfirmation && !this._isDestroyed) {
                  const trigger = this.$refs.mobileMenuButton && this.$refs.mobileMenuButton.$el;
                  if(trigger && trigger.isConnected && trigger.getClientRects().length) trigger.focus();
              }
          });
      },
      currentRoute: function() {
          this.isMobileNavigationOpen = false;
      },
      unauthorized: async function() {
        if(isD2AuthMode()) {
          return
        }

        if(this.unauthorized && this.refreshtoken) {
          await this.getRefreshtoken()
        }else {
          if(this.isRefresingToken == false && !this.refreshtoken) {
              this.isRelogin = true;
          }
        }
      }
    }
}
</script>

<style>
html { overflow-y: auto; }

.header, .v-toolbar__content {
    align-items: center;
    display: flex;
    position: relative;
    z-index: 0;
    width: 100%;
}

.v-dialog {
  border-radius: 0px;
  margin: 0px;
  overflow-y: auto;
  pointer-events: auto;
  transition: .3s cubic-bezier(.25,.8,.25,1);
  width: 100%;
  z-index: inherit;
  outline: none;
}

.app-background {
  min-height: 100%;
  background-color: #edf5f8;
  background-image:
    linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0) 42%),
    linear-gradient(180deg, rgba(236, 248, 251, 0.86) 0%, rgba(244, 248, 250, 0.92) 48%, rgba(232, 241, 245, 0.86) 100%),
    repeating-linear-gradient(115deg, rgba(14, 116, 144, 0.045) 0, rgba(14, 116, 144, 0.045) 1px, transparent 1px, transparent 42px);
  background-attachment: fixed;
}

html[data-theme="clinical-night"] .app-background {
  background-color: #0F172A;
  background-image:
    linear-gradient(180deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.96) 52%, rgba(15, 23, 42, 1) 100%),
    repeating-linear-gradient(115deg, rgba(56, 189, 248, 0.045) 0, rgba(56, 189, 248, 0.045) 1px, transparent 1px, transparent 44px);
}
</style>

<style scoped>
.tenant-layout {
  --tenant-sidebar-width: 17rem;
  --tenant-sidebar-duration: 240ms;
  --tenant-sidebar-easing: cubic-bezier(.2, 0, 0, 1);
  --tenant-nav-surface: #fafcfb;
  --tenant-nav-ink: #193e43;
  --tenant-nav-muted: #52696d;
  --tenant-nav-border: #dce8e5;
  --tenant-nav-hover: #f0f7f5;
  --tenant-nav-selected: #e3f2ef;
  --tenant-nav-accent: #087b79;
  --tenant-nav-accent-hover: #106664;
  position: relative;
  min-height: 100vh;
}

html[data-theme="clinical-night"] .tenant-layout {
  --tenant-nav-surface: #0f1d20;
  --tenant-nav-ink: #e4f1ee;
  --tenant-nav-muted: #b4c8c5;
  --tenant-nav-border: #334a4d;
  --tenant-nav-hover: #20363a;
  --tenant-nav-selected: #244345;
  --tenant-nav-accent: #71c9c2;
  --tenant-nav-accent-hover: #90d8d2;
}

@media (prefers-reduced-motion: reduce) {
  .tenant-layout { --tenant-sidebar-duration: 0ms; }
}

.tenant-sidebar-collapsed {
  --tenant-sidebar-width: 4.5rem;
}

.tenant-header {
  position: fixed;
  top: 0;
  inset-inline: 0;
  z-index: 50;
  overflow: hidden;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.tenant-header-nav {
  min-height: 4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.35rem 1rem;
}

.tenant-header-left,
.tenant-header-right {
  display: flex;
  align-items: center;
  min-width: 0;
}

.tenant-header-left {
  gap: 0.65rem;
}

.tenant-header-right {
  justify-content: flex-end;
  gap: 0.85rem;
}

.tenant-mobile-menu-button {
  display: inline-flex;
}

.tenant-desktop-navigation {
  display: none;
}

.tenant-sidebar-toggle {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  color: var(--tenant-nav-muted);
}

.tenant-sidebar-toggle:hover,
.tenant-sidebar-toggle:focus-visible {
  border-color: var(--tenant-nav-border);
  color: var(--tenant-nav-ink);
  background: var(--tenant-nav-hover);
}

.tenant-breadcrumb {
  min-width: 0;
  color: #526477;
  font-size: 0.875rem;
}

.tenant-breadcrumb ol,
.tenant-breadcrumb li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.tenant-breadcrumb ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tenant-breadcrumb a {
  color: inherit;
  white-space: nowrap;
}

.tenant-breadcrumb a:hover {
  text-decoration: underline;
}

.tenant-breadcrumb-separator {
  flex-shrink: 0;
  color: currentColor;
}

.tenant-breadcrumb [aria-current="page"] {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #12313a;
  font-weight: 600;
}

.tenant-logo {
  display: flex;
  align-items: center;
  height: 3rem;
}

.tenant-logo .medsync-brand {
  font-size: 1.375rem;
}

.tenant-main-shell {
  min-height: 100vh;
  padding-top: 4rem;
  padding-bottom: 0;
}

.tenant-content {
  width: 100%;
  min-height: calc(100vh - 4rem);
}

.tenant-restricted-layout .tenant-main-shell,
.tenant-restricted-layout .tenant-content { min-height: 0; }
.tenant-restricted-layout.app-background { background: #fff; }
html[data-theme="clinical-night"] .tenant-restricted-layout.app-background { background: #142334; }

.tenant-mobile-drawer {
  z-index: 70;
}

.v-dialog {
  box-shadow: 0 15px -7px rgb(0 0 0 / 20%), 0 24px 38px 3px rgb(0 0 0 / 14%), 0 9px 46px 8px rgb(0 0 0 / 12%)
}

.v-dialog__content {
  align-items: start;
  margin-top: 3.2rem;
}

html[data-theme="clinical-night"] .tenant-header {
  border-bottom-color: rgba(148, 163, 184, 0.18);
  background: #0f172a;
}

html[data-theme="clinical-night"] .tenant-breadcrumb,
html[data-theme="clinical-night"] .tenant-sidebar-toggle {
  color: #94a3b8;
}

html[data-theme="clinical-night"] .tenant-breadcrumb [aria-current="page"] {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] .tenant-sidebar-toggle:hover,
html[data-theme="clinical-night"] .tenant-sidebar-toggle:focus-visible {
  border-color: rgba(45, 212, 191, 0.28);
  color: #5eead4;
  background: rgba(20, 184, 166, 0.14);
}

@media (min-width: 1024px) {
  .tenant-mobile-menu-button {
    display: none !important;
  }

  .tenant-desktop-navigation.v-navigation-drawer {
    display: block;
    overflow: visible;
    z-index: 38;
    background: var(--tenant-nav-surface);
    transition: width var(--tenant-sidebar-duration) var(--tenant-sidebar-easing), transform var(--tenant-sidebar-duration) var(--tenant-sidebar-easing);
  }

  .tenant-desktop-navigation ::v-deep .v-navigation-drawer__content { overflow: visible; }
  .tenant-desktop-navigation ::v-deep .v-navigation-drawer__border { background: var(--tenant-nav-border); }

  .tenant-mobile-drawer {
    display: none !important;
  }

  .tenant-header {
    inset-inline-start: var(--tenant-sidebar-width);
    transition: inset-inline-start var(--tenant-sidebar-duration) var(--tenant-sidebar-easing);
  }

  .tenant-header-nav {
    padding-left: 1.15rem;
    padding-right: 1.25rem;
  }

  .tenant-main-shell {
    padding-inline-start: var(--tenant-sidebar-width);
    transition: padding-inline-start var(--tenant-sidebar-duration) var(--tenant-sidebar-easing);
  }

  .tenant-content {
    min-height: calc(100vh - 4rem);
  }
}

@media (max-width: 1023px) {
  .tenant-breadcrumb li:not(:last-child),
  .tenant-breadcrumb-separator {
    display: none;
  }
}

@media (max-width: 639px) {
  .tenant-main-shell {
    padding-bottom: 0;
  }
}
</style>
