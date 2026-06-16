<template>
  <section class="tenant-restricted-page">
    <div class="tenant-restricted-panel">
      <div class="status-icon">
        <v-icon size="36">mdi-lock-alert-outline</v-icon>
      </div>

      <div class="status-copy">
        <p class="eyebrow">Acceso operativo restringido</p>
        <h1>{{ title }}</h1>
        <p>{{ message }}</p>
      </div>

      <dl class="status-list">
        <div>
          <dt>Consultorio</dt>
          <dd>{{ businessName }}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{{ statusLabel }}</dd>
        </div>
        <div>
          <dt>Acceso disponible</dt>
          <dd>Lectura minima de expedientes existentes</dd>
        </div>
      </dl>

      <div class="actions">
        <v-btn color="primary" depressed @click="goToPatientSearch">
          <v-icon left small>mdi-account-search-outline</v-icon>
          Buscar expedientes
        </v-btn>
        <v-btn color="primary" depressed @click="refreshStatus">
          <v-icon left small>mdi-refresh</v-icon>
          Actualizar estado
        </v-btn>
        <v-btn text color="primary" @click="logout">
          <v-icon left small>mdi-logout</v-icon>
          Cerrar sesion
        </v-btn>
      </div>

      <v-alert v-if="loadError" type="warning" dense text class="mt-5">
        {{ loadError }}
      </v-alert>
    </div>
  </section>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import DABusinessService from '../../services/core/business/DABusinessService';
import { isD2AuthMode } from '../../services/config/authTransport.config';

const REASON_MESSAGES = {
  TRIAL_EXPIRED: 'El acceso operativo del consultorio esta temporalmente restringido. Contacta al administrador del sistema para revisar los siguientes pasos.',
  SUBSCRIPTION_PAST_DUE: 'El acceso operativo del consultorio esta temporalmente restringido. Contacta al administrador del sistema para revisar los siguientes pasos.',
  TENANT_SUSPENDED: 'Este consultorio esta suspendido temporalmente. Contacta al administrador del sistema para revisar el motivo.',
  TENANT_CANCELLED: 'Este consultorio esta cancelado. Tus datos no se han eliminado. Contacta al administrador del sistema si necesitas asistencia.',
  TENANT_INACTIVE: 'Este consultorio esta temporalmente restringido. Contacta al administrador del sistema para revisar el estado.',
  TENANT_STATUS_INVALID: 'Este consultorio requiere revision administrativa antes de operar.'
};

export default {
  name: 'TenantRestricted',
  data() {
    return {
      business: null,
      refreshedTenantOperational: null,
      loadError: ''
    };
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, {
      runtimeTenantOperational: fnTypes.getTenantOperational,
      runtimeBusiness: fnTypes.getBusiness
    }),
    tenantOperational() {
      if(isD2AuthMode()) {
        return this.refreshedTenantOperational || this.runtimeTenantOperational || null;
      }

      return this.$session ? this.$session.get('tenantOperational') : null;
    },
    reasonCode() {
      return this.tenantOperational && this.tenantOperational.reasonCode ? this.tenantOperational.reasonCode : '';
    },
    title() {
      return this.reasonCode === 'TENANT_CANCELLED'
        ? 'Consultorio cancelado'
        : 'Consultorio temporalmente restringido';
    },
    message() {
      return REASON_MESSAGES[this.reasonCode] || 'El acceso operativo del consultorio esta temporalmente restringido. Contacta al administrador del sistema.';
    },
    businessName() {
      const business = this.business
        || (isD2AuthMode() ? this.runtimeBusiness : (this.$session ? this.$session.get('business') : null))
        || {};
      return business.name || business.legalName || 'Consultorio';
    },
    statusLabel() {
      const status = (this.tenantOperational && (this.tenantOperational.tenantStatus || this.tenantOperational.status))
        || (this.business && this.business.subscriptionStatus)
        || '';
      const labels = {
        trial: 'Prueba',
        past_due: 'Revision comercial',
        suspended: 'Suspendido',
        cancelled: 'Cancelado',
        inactive: 'Inactivo'
      };
      return labels[status] || 'Restringido';
    }
  },
  created() {
    this.refreshStatus();
  },
  methods: {
    ...mapActions(moduleTypes.AUTH, [
      fnTypes.logout
    ]),
    goToPatientSearch: function() {
      this.$router.push('/px/all').catch(() => {});
    },
    refreshStatus: async function() {
      this.loadError = '';
      let response = null;

      try {
        response = await DABusinessService.getCurrent();
      } catch (error) {
        response = error && error.response ? error.response.data : null;
      }

      if(response && response.status === 200 && response.data) {
        this.business = response.data;
        this.refreshedTenantOperational = response.data.tenantOperational || null;
        if(!isD2AuthMode() && response.data.tenantOperational && this.$session) {
          this.$session.set('tenantOperational', response.data.tenantOperational);
        }
        return;
      }

      this.loadError = response && response.message
        ? response.message
        : 'No fue posible actualizar el estado del consultorio.';
    }
  }
};
</script>

<style scoped>
.tenant-restricted-page {
  min-height: calc(100vh - 180px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.tenant-restricted-panel {
  width: min(720px, 100%);
  border: 1px solid #d9e7ef;
  background: #fff;
  padding: 28px;
  box-shadow: 0 18px 44px rgba(32, 82, 103, 0.12);
}

.status-icon {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  color: #08799a;
  background: #e5f6fb;
  border-radius: 8px;
  margin-bottom: 20px;
}

.status-copy .eyebrow {
  margin: 0 0 6px;
  color: #08799a;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.status-copy h1 {
  margin: 0;
  color: #17324d;
  font-size: 28px;
  line-height: 1.2;
}

.status-copy p {
  margin: 12px 0 0;
  color: #536779;
  font-size: 15px;
  line-height: 1.6;
}

.status-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 24px 0;
}

.status-list div {
  border: 1px solid #e2ebf1;
  padding: 14px;
  min-width: 0;
}

.status-list dt {
  color: #5f7081;
  font-size: 12px;
  font-weight: 700;
}

.status-list dd {
  margin: 6px 0 0;
  color: #163047;
  font-size: 14px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 720px) {
  .tenant-restricted-panel {
    padding: 22px;
  }

  .status-list {
    grid-template-columns: 1fr;
  }
}
</style>
