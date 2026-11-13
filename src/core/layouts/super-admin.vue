<template>
  <div class="super-admin-shell">
    <aside class="super-admin-sidebar">
      <div class="brand-block">
        <p class="brand-kicker">Sistema</p>
        <h1>Super Admin</h1>
      </div>

      <nav class="nav-list" aria-label="Menú Super Admin">
        <button
          v-for="item in menuItems"
          :key="item.key"
          type="button"
          class="nav-item"
          :class="{ active: item.route && $route.name === item.route, disabled: item.disabled }"
          :disabled="item.disabled"
          @click="goTo(item)"
        >
          <v-icon size="20">{{ item.icon }}</v-icon>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <button type="button" class="logout-button" @click="onLogout">
        <v-icon size="20">mdi-logout</v-icon>
        <span>Cerrar sesión</span>
      </button>
    </aside>

    <main class="super-admin-main">
      <header class="super-admin-header">
        <div>
          <p class="header-kicker">Administración global</p>
          <h2>{{ pageTitle }}</h2>
        </div>
        <div class="session-pill">
          <v-icon size="18">mdi-shield-account-outline</v-icon>
          <span>{{ sessionName }}</span>
        </div>
      </header>

      <section class="super-admin-content">
        <slot></slot>
      </section>

      <da-re-login :show="isRelogin" v-on:auth="isRelogin = false"></da-re-login>
    </main>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import ReLogin from '../../views/Auth/ReLogin.vue';
import { isD2AuthMode } from '../../services/config/authTransport.config';

export default {
  components: {
    'da-re-login': ReLogin
  },
  data: function() {
    return {
      isRelogin: false,
      menuItems: [
        { key: 'dashboard', label: 'Dashboard', icon: 'mdi-view-dashboard-outline', route: 'superAdminDashboard' },
        { key: 'businesses', label: 'Negocios', icon: 'mdi-domain', route: 'superAdminBusinesses' },
        { key: 'users', label: 'Usuarios', icon: 'mdi-account-group-outline', route: 'superAdminUsers' },
        { key: 'sessions', label: 'Sesiones activas', icon: 'mdi-monitor-account', route: 'superAdminSessions' },
        { key: 'legal-documents', label: 'Documentos legales', icon: 'mdi-file-document-edit-outline', route: 'superAdminLegalDocuments' },
        { key: 'audit', label: 'Auditoría', icon: 'mdi-clipboard-search-outline', route: 'superAdminAudit' }
      ]
    };
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, {
      user: fnTypes.getUser,
      unauthorized: fnTypes.unauthorized,
      refreshtoken: fnTypes.refreshtoken,
      isRefresingToken: fnTypes.isRefresingToken
    }),
    pageTitle: function() {
      return this.$route.meta.headertitle || 'Dashboard';
    },
    sessionName: function() {
      return this.user && this.user.name ? this.user.name : 'Super admin';
    }
  },
  methods: {
    ...mapActions(moduleTypes.AUTH, [
      fnTypes.logout,
      fnTypes.getRefreshtoken
    ]),
    goTo: function(item) {
      if(item.disabled || !item.route) {
        return;
      }

      if(this.$route.name !== item.route) {
        this.$router.push({ name: item.route });
      }
    },
    onLogout: async function() {
      await this.logout();
    }
  },
  watch: {
    unauthorized: async function() {
      if(isD2AuthMode()) {
        return;
      }

      if(this.unauthorized && this.refreshtoken) {
        await this.getRefreshtoken();
      } else if(this.isRefresingToken === false && !this.refreshtoken) {
        this.isRelogin = true;
      }
    }
  }
};
</script>

<style scoped>
.super-admin-shell {
  min-height: 100%;
  display: grid;
  grid-template-columns: 17rem minmax(0, 1fr);
  background: #f3f4f6;
  color: #1f2937;
}

.super-admin-sidebar {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
  background: #111827;
  color: #f9fafb;
}

.brand-block {
  padding: 0.75rem 0.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.brand-kicker,
.header-kicker {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  line-height: 1rem;
  text-transform: uppercase;
  color: #6ee7b7;
  font-weight: 600;
}

.brand-block h1,
.super-admin-header h2 {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0;
}

.brand-block h1 {
  font-size: 1.35rem;
  line-height: 1.75rem;
}

.nav-list {
  display: grid;
  gap: 0.5rem;
}

.nav-item,
.logout-button {
  width: 100%;
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid transparent;
  background: transparent;
  color: #d1d5db;
  text-align: left;
  cursor: pointer;
}

.nav-item:hover:not(:disabled),
.nav-item.active {
  background: #1f2937;
  border-color: rgba(110, 231, 183, 0.35);
  color: #ffffff;
}

.nav-item.disabled {
  color: #6b7280;
  cursor: not-allowed;
}

.logout-button {
  margin-top: auto;
  color: #fecaca;
}

.logout-button:hover {
  background: #1f2937;
  color: #ffffff;
}

.super-admin-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.super-admin-header {
  min-height: 4.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.super-admin-header h2 {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

.session-pill {
  max-width: 18rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
  font-size: 0.875rem;
}

.session-pill span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.super-admin-content {
  width: 100%;
  max-width: 86rem;
  padding: 1.5rem;
}

@media (max-width: 860px) {
  .super-admin-shell {
    grid-template-columns: 1fr;
  }

  .super-admin-sidebar {
    min-height: auto;
  }

  .super-admin-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
