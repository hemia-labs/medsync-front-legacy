<template>
  <div class="min-h-full app-background tenant-layout" :class="{ 'tenant-settings-layout': $route.path === '/admin', 'tenant-pulse-layout': $route.name === 'business-pulse' }">
    <header class="tenant-header" :inert="isMobileNavigationOpen ? '' : null">
      <nav class="tenant-header-nav">
        <div class="tenant-header-left">
          <v-btn
            class="tenant-mobile-menu-button"
            ref="mobileMenuButton"
            icon
            color="primary"
            aria-label="Abrir navegacion principal"
            :aria-expanded="String(isMobileNavigationOpen)"
            aria-controls="tenant-mobile-navigation"
            @click="isMobileNavigationOpen = true"
          >
            <v-icon>mdi-menu</v-icon>
          </v-btn>

          <div class="tenant-route-context">
            <v-icon size="21">{{ currentPrimaryIcon }}</v-icon>
            <span>{{ currentPrimaryLabel }}</span>
          </div>
        </div>

        <div class="tenant-header-right">
          <div class="tenant-logo">
            <div :style="`background-image: url('` + logoOrrico + `')`"></div>
          </div>
        </div>
      </nav>
    </header>

    <tenant-navigation-rail
      class="tenant-desktop-navigation"
      :section-items="sectionNavigationItems"
      :action-items="actionNavigationItems"
      :session-items="sessionNavigationItems"
      :session-name="sessionName"
      :session-initials="sessionInitials"
      :session-role-label="sessionRoleLabel"
      :business-name="businessName"
      :tenant-restricted="isTenantRestrictedMode"
      @navigate="navigateToItem"
      @session-action="handleSessionAction"
    />

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
        :section-items="sectionNavigationItems"
        :action-items="actionNavigationItems"
        :session-items="sessionNavigationItems"
        :session-name="sessionName"
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
        <legal-update-notice />
        <pulse-return />
        <onboarding-coordinator />
        <slot></slot>
      </div>
    </main>

    <footer class="tenant-footer" :inert="isMobileNavigationOpen ? '' : null">
      <div class="tenant-footer-brand">
        <strong>MedSync.mx</strong>
        <span class="tenant-footer-copy">&copy; {{ currentYear }} Todos los derechos reservados</span>
        <span>Copyright © Todos los derechos reservados</span>
      </div>
      <nav class="tenant-footer-links" aria-label="Enlaces legales y contacto">
        <button type="button" @click="$router.push('/privacy')">
          Aviso de privacidad
        </button>
        <button type="button" @click="$router.push('/terms-and-conditions')">
          Términos y condiciones
        </button>
        <a v-if="hasSupportEmail" class="tenant-footer-support-link" :href="`mailto:${supportEmail}`">
          <span>Contacto</span><span class="tenant-footer-support-email">: {{ supportEmail }}</span>
        </a>
        <button v-else type="button" @click="$swal.fire({icon:'info',title:'Ayuda con tu cuenta',text:'Solicita ayuda al administrador que te entregó el acceso. Si eres titular del consultorio, utiliza el canal por el que contrataste MedSync e indica la pantalla y la acción que necesitas realizar.',confirmButtonText:'Entendido'})">Ayuda y contacto</button>
      </nav>
    </footer>
  </div>
</template>

<script>
import { containNavigationFocus } from '../../utils/mobileNavigationFocus';
import PulseReturn from '../../views/Pulse/PulseReturn.vue';
import OnboardingCoordinator from '../../views/configuration/components/OnboardingCoordinator.vue';
import { canAccessPulse } from '../../security/pulseAccess';
import { canAccessSettings } from '../../security/settingsAccess';
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
import LegalUpdateNotice from '../components/legal/LegalUpdateNotice.vue';
import {
  tenantNavigationItems,
  sortTenantNavigationItems,
  TENANT_NAVIGATION_TYPES
} from '../navigation/tenantNavigation';
import { MEDSYNC_SUPPORT_EMAIL } from '../../views/legal/privacyLegalConfig';

export default {
    mixins:[VuexMixin],
    data: function() {
        return {
            logoOrrico: require('@/assets/login/med-sync-logo.png'),
            isMobileNavigationOpen: false,
            isRelogin: false,
            navigationItems: sortTenantNavigationItems(tenantNavigationItems)
        }
    },
    components: {
      LegalUpdateNotice, PulseReturn, OnboardingCoordinator,
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
        currentYear: function() {
          return new Date().getFullYear()
        },
        supportEmail: function() {
          return MEDSYNC_SUPPORT_EMAIL
        },
        hasSupportEmail: function() {
          return Boolean(this.supportEmail && this.supportEmail.indexOf('[') !== 0)
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
          return this.allowedNavigationItems.filter((item) => item.type === TENANT_NAVIGATION_TYPES.SESSION)
        },
        currentPrimaryItem: function() {
          return this.sectionNavigationItems.find((item) => this.isItemActive(item))
            || this.actionNavigationItems.find((item) => this.isItemActive(item))
            || this.sectionNavigationItems[0]
            || null
        },
        currentPrimaryLabel: function() {
          return this.currentPrimaryItem ? this.currentPrimaryItem.label : 'Inicio'
        },
        currentPrimaryIcon: function() {
          return this.currentPrimaryItem ? this.currentPrimaryItem.icon : 'mdi-home-outline'
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
            this.onLogout()
          }
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
        onLogout: async function() {
            await this.logout();
            if(isD2AuthMode()) {
                return
            }

            if(!this.isAuthorized) {
                this.$router.push('/auth/login')
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
      isMobileNavigationOpen: function(open) {
          if(this.releaseMobileFocus) { this.releaseMobileFocus(); this.releaseMobileFocus = null; }
          this.$nextTick(() => {
              if(open && this.isMobileNavigationOpen && !this._isDestroyed) {
                  this.releaseMobileFocus = containNavigationFocus(this.$refs.mobileDrawer.$el,
                      () => { this.isMobileNavigationOpen = false; });
              } else if(!open && !this.isMobileNavigationOpen && !this._isDestroyed) {
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
  position: relative;
  min-height: 100vh;
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

.tenant-desktop-navigation,
.tenant-route-context {
  display: none;
}

.tenant-route-context {
  align-items: center;
  gap: 0.55rem;
  min-height: 2.4rem;
  padding: 0 0.85rem;
  border: 1px solid #d5e8e8;
  border-radius: 999px;
  color: #0f766e;
  background: #f0fdfa;
  font-size: 0.92rem;
  font-weight: 800;
}

.tenant-route-context .v-icon {
  color: #0f766e;
}

.tenant-logo {
  width: 9.5rem;
  height: 3rem;
}

.tenant-logo div {
  width: 100%;
  height: 100%;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center right;
}

.tenant-main-shell {
  min-height: 100vh;
  padding-top: 4rem;
  padding-bottom: 4.25rem;
}

.tenant-content {
  width: 100%;
  min-height: calc(100vh - 8.25rem);
}

.tenant-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 35;
  min-height: 3.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 1.1rem;
  border-top: 1px solid #dbe4e9;
  background: rgba(248, 250, 252, 0.98);
  color: #334155;
  box-shadow: 0 -8px 22px rgba(15, 23, 42, 0.05);
}

.tenant-footer-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.tenant-footer-brand strong {
  color: var(--color-primary-900, #086783);
  font-size: 0.9rem;
  font-weight: 900;
}

.tenant-footer-brand span:not(.tenant-footer-copy) {
  display: none;
}

.tenant-footer-links {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.tenant-footer span,
.tenant-footer button,
.tenant-footer a,
.tenant-footer-contact-pending {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
}

.tenant-footer button,
.tenant-footer a,
.tenant-footer-contact-pending {
  min-height: 2rem;
  display: inline-flex;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.32rem 0.72rem;
  color: #0f766e;
  background: rgba(20, 184, 166, 0.08);
  text-decoration: none;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.tenant-footer button:hover,
.tenant-footer a:hover {
  border-color: rgba(15, 118, 110, 0.22);
  background: rgba(20, 184, 166, 0.14);
  color: #0f5f59;
}

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

html[data-theme="clinical-night"] .tenant-route-context {
  border-color: rgba(45, 212, 191, 0.24);
  color: #5eead4;
  background: rgba(20, 184, 166, 0.12);
}

html[data-theme="clinical-night"] .tenant-route-context .v-icon {
  color: #5eead4;
}

html[data-theme="clinical-night"] .tenant-footer {
  border-top-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.96);
  color: #cbd5e1;
}

html[data-theme="clinical-night"] .tenant-footer-brand strong {
  color: #5eead4;
}

html[data-theme="clinical-night"] .tenant-footer button,
html[data-theme="clinical-night"] .tenant-footer a,
html[data-theme="clinical-night"] .tenant-footer-contact-pending {
  border-color: rgba(45, 212, 191, 0.16);
  color: #99f6e4;
  background: rgba(20, 184, 166, 0.1);
}

html[data-theme="clinical-night"] .tenant-footer button:hover,
html[data-theme="clinical-night"] .tenant-footer a:hover {
  border-color: rgba(45, 212, 191, 0.32);
  color: #ccfbf1;
  background: rgba(20, 184, 166, 0.16);
}

@media (min-width: 1024px) {
  .tenant-mobile-menu-button {
    display: none !important;
  }

  .tenant-desktop-navigation {
    display: block;
  }

  .tenant-route-context {
    display: flex;
  }

  .tenant-mobile-drawer {
    display: none !important;
  }

  .tenant-header-nav {
    padding-left: 1.15rem;
    padding-right: 1.25rem;
  }

  .tenant-main-shell {
    padding-left: 17rem;
  }

  .tenant-content {
    min-height: calc(100vh - 8.25rem);
  }

  .tenant-footer {
    left: 17rem;
  }
}

@media (max-width: 639px) {
  .tenant-logo {
    width: 7.25rem;
  }

  .tenant-main-shell {
    padding-bottom: 7.5rem;
  }

  .tenant-footer {
    align-items: center;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.45rem;
    min-height: 2.65rem;
    padding: 0.34rem 0.58rem;
    text-align: left;
  }

  .tenant-footer-brand {
    flex: 0 0 auto;
    gap: 0;
  }

  .tenant-footer-brand strong {
    font-size: 0.78rem;
  }

  .tenant-footer-copy {
    display: none;
  }

  .tenant-footer-links {
    flex: 1 1 auto;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-width: 0;
    overflow-x: visible;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .tenant-footer-links::-webkit-scrollbar {
    display: none;
  }

  .tenant-footer span,
  .tenant-footer button,
  .tenant-footer a {
    font-size: 0.68rem;
  }

  .tenant-footer button,
  .tenant-footer a,
  .tenant-footer-contact-pending {
    min-height: 1.55rem;
    padding: 0.18rem 0.45rem;
    white-space: nowrap;
  }

  .tenant-footer-support-email,
  .tenant-footer-contact-pending {
    display: none;
  }
}
.tenant-settings-layout .tenant-main-shell { min-height: calc(100vh - 3.25rem); padding-bottom: 0; }
.tenant-pulse-layout .tenant-main-shell { padding-bottom: 0; }
.tenant-pulse-layout .tenant-footer { position: relative; left: auto; right: auto; bottom: auto; z-index: auto; }
@media (min-width: 1024px) { .tenant-pulse-layout .tenant-footer { margin-left: 17rem; } }
.tenant-settings-layout .tenant-content { min-height: calc(100vh - 7.25rem); }
.tenant-settings-layout .tenant-footer { position: relative; left: auto; right: auto; bottom: auto; z-index: auto; background: #f8fafc; }
html[data-theme="clinical-night"] .tenant-settings-layout .tenant-footer { background: #0f172a; }
@media (min-width: 1024px) { .tenant-settings-layout .tenant-footer { margin-left: 17rem; } }
@media (max-width: 639px) { .tenant-settings-layout .tenant-main-shell { min-height: calc(100vh - 2.65rem); } }
</style>
