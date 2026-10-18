<template>
  <section class="roles-permissions">
    <div class="roles-header">
      <div>
        <p class="eyebrow">Puestos y accesos</p>
        <h2>Puestos y accesos</h2>
        <p>Define qué puede hacer cada puesto dentro del consultorio.</p>
      </div>
      <v-btn text color="primary" :loading="isLoadingRoles" :disabled="isSaving || isLoadingPermissions" @click="reloadRoles">
        <v-icon left small>mdi-refresh</v-icon>
        Recargar
      </v-btn>
    </div>

    <v-alert type="info" dense text class="mb-4">
      Los cambios aplican a los usuarios con este puesto dentro de este consultorio. Las otras clinicas conservan sus accesos.
      Los accesos administrativos se reservan al puesto administrador y se conservan para evitar perder acceso al consultorio.
    </v-alert>

    <v-alert type="info" dense text class="mb-4">
      Recepción: agenda y ficha administrativa; habilita «Captura inicial en recepción» sólo si puede registrar el motivo y relato del paciente.
      Asistencia clínica: asigna por separado consulta de historia, borradores, seguimiento y tratamientos según sus funciones.
      Finalizar, emitir y firmar conservan sus permisos y requisitos profesionales. Los indicadores económicos requieren autorización explícita;
      «Todo el consultorio» amplía únicamente las familias de indicadores ya autorizadas.
    </v-alert>

    <v-alert v-if="errorMessage" type="error" dense text class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <v-alert v-if="successMessage" type="success" dense text class="mb-4">
      {{ successMessage }}
    </v-alert>

    <div class="concept-grid">
      <article>
        <span>Usuarios</span>
        <strong>Personas/cuentas</strong>
      </article>
      <article>
        <span>Puestos</span>
        <strong>Funciones del equipo</strong>
      </article>
      <article>
        <span>Accesos</span>
        <strong>Lo que puede hacer cada puesto</strong>
      </article>
    </div>

    <div class="roles-layout">
      <aside class="roles-list">
        <div class="panel-title">
          <strong>Puestos</strong>
          <span>{{ roles.length }} disponibles</span>
        </div>
        <button
          v-for="role in roles"
          :key="role.id_rol"
          type="button"
          :class="['role-button', selectedRoleId === role.id_rol ? 'is-active' : '']"
          :aria-pressed="selectedRoleId === role.id_rol ? 'true' : 'false'"
          :disabled="isSaving"
          @click="selectRole(role.id_rol)"
        >
          <strong>{{ role.desc_rol || role.code }}</strong>
          <span>{{ role.code }}</span>
        </button>
      </aside>

      <main class="permissions-panel">
        <div v-if="!selectedRoleId" class="empty-state">
          <v-icon size="38">mdi-shield-key-outline</v-icon>
          <strong>Selecciona un puesto</strong>
          <span>Al elegir un puesto podrás revisar qué puede hacer.</span>
        </div>

        <template v-else>
          <div class="permissions-heading">
            <div>
              <p class="eyebrow">Accesos del puesto</p>
              <h3>{{ selectedRoleName }}</h3>
              <span>El sistema revisa tu plan antes de guardar.</span>
              <p role="status" class="capture-state">{{ dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes' }}</p>
            </div>
            <v-btn color="primary" depressed :loading="isSaving" :disabled="isSaving || isLoadingPermissions || !permissionsLoaded || !dirty" @click="savePermissions">
              <v-icon left small>mdi-content-save-outline</v-icon>
              Guardar cambios
            </v-btn>
          </div>

          <v-progress-linear v-if="isLoadingPermissions" indeterminate color="primary" height="3" />

          <div v-if="isLoadingPermissions" class="loading-state">
            <v-progress-circular indeterminate color="primary" />
            <span>Cargando accesos...</span>
          </div>

          <div v-else class="permission-groups">
            <section v-for="group in permissionGroups" :key="group.name" class="permission-group">
              <div class="group-title">{{ group.name }}</div>
              <div class="permission-list">
                <article v-for="permission in group.items" :key="permission.code" class="permission-row">
                  <div>
                    <strong :id="permissionNameId(permission)">{{ permission.name }}</strong>
                    <span :id="permissionDescriptionId(permission)">{{ permission.description || permission.code }}</span>
                    <small v-if="permissionLockReason(permission)" :id="`${permissionNameId(permission)}-reason`">
                      {{ permissionLockReason(permission) }}
                    </small>
                  </div>
                  <div class="permission-action">
                    <v-chip v-if="isPermissionPremium(permission)" small outlined color="primary">
                      {{ premiumLabel(permission) }}
                    </v-chip>
                    <v-switch
                      v-model="selectedPermissions"
                      :value="permission.code"
                      :aria-labelledby="permissionNameId(permission)"
                      :aria-describedby="`${permissionDescriptionId(permission)}${permissionLockReason(permission) ? ` ${permissionNameId(permission)}-reason` : ''}`"
                      :disabled="isSaving || !permissionsLoaded || isPermissionLocked(permission) || isAdministrativePermission(permission)"
                      color="primary"
                      hide-details
                      dense
                      class="m-0"
                    />
                  </div>
                </article>
              </div>
            </section>
          </div>

          <div class="upgrade-note">
            <span>Las opciones bloqueadas requieren cambiar de plan.</span>
            <v-btn small outlined color="primary" @click="$emit('contact-plan')">
              Contactar para cambiar plan
            </v-btn>
          </div>
        </template>
      </main>
    </div>
  </section>
</template>

<script>
import { DARolService } from '../../../services/context/core-proccess-context';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import mutationTypes from '../../../store/modules/common/mutation-types';
import { isD2AuthMode } from '../../../services/config/authTransport.config';
import { confirmSettingsDiscard, registerSettingsNavigationGuard } from '../../../domain/settings/settings.navigation';

export default {
  data: function() {
    return {
      roles: [],
      permissions: [],
      selectedRoleId: '',
      selectedPermissions: [],
      isLoadingRoles: false,
      isLoadingPermissions: false,
      isSaving: false,
      errorMessage: '',
      successMessage: '',
      permissionsRequest: 0,
      rolesRequest: 0,
      permissionsLoaded: false,
      baseline: '',
      navigationCleanup: null
    };
  },

  computed: {
    dirty() { return this.permissionsLoaded && this.baseline !== JSON.stringify([...this.selectedPermissions].sort()); },
    selectedRole: function() {
      return this.roles.find((role) => role.id_rol === this.selectedRoleId) || null;
    },

    selectedRoleName: function() {
      return this.selectedRole ? (this.selectedRole.desc_rol || this.selectedRole.code) : 'Puesto seleccionado';
    },

    permissionGroups: function() {
      return this.permissions.reduce((groups, permission) => {
        const groupName = permission.module || 'General';
        let group = groups.find((item) => item.name === groupName);
        if(!group) {
          group = { name: groupName, items: [] };
          groups.push(group);
        }
        group.items.push(permission);
        return groups;
      }, []);
    }
  },

  created: function() {
    this.loadRoles();
  },
  mounted() {
    this.navigationCleanup = registerSettingsNavigationGuard(this, { hasChanges: () => this.dirty, isSaving: () => this.isSaving });
  },
  beforeDestroy() {
    this.permissionsRequest++; this.rolesRequest++;
    if(this.navigationCleanup) this.navigationCleanup();
  },

  methods: {
    loadRoles: async function() {
      const request = ++this.rolesRequest;
      this.isLoadingRoles = true;
      this.errorMessage = '';
      try {
      const response = await DARolService.getRoles();
      if(request !== this.rolesRequest) return false;
      if(response && response.success) {
        this.roles = (Array.isArray(response.data) ? response.data : [])
          .filter((role) => role.code !== 'super_admin');
        if(this.roles.length) {
          const selected = this.roles.some(role => role.id_rol === this.selectedRoleId) ? this.selectedRoleId : this.roles[0].id_rol;
          this.selectedRoleId = selected;
          return await this.loadPermissions();
        }
        this.selectedRoleId = ''; this.permissions=[]; this.selectedPermissions=[]; this.permissionsLoaded=false;
        return true;
      } else {
        this.errorMessage = response && response.message ? response.message : 'No fue posible cargar los puestos.';
        return false;
      }
      } catch(_) { if(request === this.rolesRequest) this.errorMessage='No se pudieron consultar los puestos. Reintenta la carga.'; return false; }
      finally { if(request === this.rolesRequest) this.isLoadingRoles = false; }
    },
    async reloadRoles() {
      if(this.isSaving || this.isLoadingPermissions || this.isLoadingRoles) return false;
      if(this.dirty && !await confirmSettingsDiscard(this)) return false;
      return this.loadRoles();
    },

    selectRole: async function(idRol) {
      if(this.isSaving) return false;
      if(this.selectedRoleId === idRol && this.permissions.length) {
        return true;
      }
      if(this.dirty && !await confirmSettingsDiscard(this)) return false;
      if(this.isSaving) return false;
      this.selectedRoleId = idRol;
      this.successMessage = '';
      return this.loadPermissions();
    },

    loadPermissions: async function() {
      const request=++this.permissionsRequest;
      const roleId=this.selectedRoleId;
      this.permissionsLoaded=false;
      this.permissions=[]; this.selectedPermissions=[]; this.baseline='';
      if(!this.selectedRoleId) {
        this.permissions = [];
        this.selectedPermissions = [];
        return;
      }

      this.isLoadingPermissions = true;
      this.errorMessage = '';
      try {
      const response = await DARolService.getPermissions(roleId);
      if(request !== this.permissionsRequest || roleId !== this.selectedRoleId) return false;

      if(response && response.success) {
        this.permissions = Array.isArray(response.data) ? response.data : [];
        this.selectedPermissions = this.permissions
          .filter((permission) => permission.allowed)
          .map((permission) => permission.code);
        this.permissionsLoaded=true;
        this.baseline=JSON.stringify([...this.selectedPermissions].sort());
        return true;
      } else {
        this.permissions = [];
        this.selectedPermissions = [];
        this.errorMessage = response && response.message ? response.message : 'No fue posible cargar los accesos.';
        return false;
      }
      } catch(_) { if(request === this.permissionsRequest) this.errorMessage='No se pudieron consultar los accesos. Recarga antes de guardar.'; return false; }
      finally { if(request === this.permissionsRequest) this.isLoadingPermissions = false; }
    },

    savePermissions: async function() {
      if(!this.selectedRoleId || this.isSaving || this.isLoadingPermissions || !this.permissionsLoaded || !this.dirty) {
        return false;
      }
      const roleId=this.selectedRoleId;
      const selected=[...this.selectedPermissions];
      this.isSaving = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
      const response = await DARolService.savePermissions(roleId, selected);

      if(response && response.success) {
        this.permissions = Array.isArray(response.data) ? response.data : [];
        this.selectedPermissions = this.permissions
          .filter((permission) => permission.allowed)
          .map((permission) => permission.code);
        this.baseline=JSON.stringify([...this.selectedPermissions].sort());
        this.successMessage = 'Accesos actualizados correctamente.';
        if(isD2AuthMode()) {
          try { await this.$store.dispatch(`${moduleTypes.AUTH}/${fnTypes.getToken}`); }
          catch(_) { this.errorMessage='Los accesos se guardaron, pero no se pudo actualizar tu sesión. Recarga antes de continuar.'; }
        }
        else {
          const actor=this.$store.getters[`${moduleTypes.AUTH}/${fnTypes.getUser}`] || {};
          if(actor.id_rol===roleId) this.$store.commit(`${moduleTypes.AUTH}/${mutationTypes.SET_AUTH_PERMISSIONS}`,this.selectedPermissions);
        }
        return true;
      } else {
        this.errorMessage = this.buildErrorMessage(response);
        return false;
      }
      } catch(_) { this.errorMessage='No se pudo confirmar el guardado. Tus cambios se conservan; revisa la conexión y vuelve a intentar.'; return false; }
      finally { this.isSaving = false; }
    },

    buildErrorMessage: function(response) {
      const code = response && response.data ? response.data.code : null;
      if(code === 'PLAN_FEATURE_NOT_ALLOWED') {
        return 'Esta opción no está incluida en tu plan actual.';
      }
      return response && response.message ? response.message : 'No fue posible guardar los accesos.';
    },

    isPermissionPremium: function(permission) {
      return Boolean(permission && permission.licensing && permission.licensing.isPremium);
    },
    isAdministrativePermission(permission) { return ['admin.users','admin.config'].includes(permission.code); },
    permissionNameId(permission) { return `permission-name-${permission.code}`; },
    permissionDescriptionId(permission) { return `permission-description-${permission.code}`; },
    permissionLockReason(permission) {
      if(this.isAdministrativePermission(permission)) return this.selectedRole && ['admin','business_admin'].includes(this.selectedRole.code) ? 'Este acceso se conserva para mantener la administración del consultorio.' : 'Este acceso se reserva al puesto administrador.';
      return this.isPermissionLocked(permission) ? 'Esta opción no está incluida en tu plan actual.' : '';
    },

    isPermissionLocked: function(permission) {
      const isSelected = this.selectedPermissions.includes(permission.code);
      const allowed = !permission.licensing || permission.licensing.planAllowed !== false;
      return !isSelected && !allowed;
    },

    premiumLabel: function(permission) {
      const plan = permission && permission.licensing ? permission.licensing.minimumPlan : '';
      if(plan === 'enterprise') {
        return 'Clinica';
      }
      if(plan === 'pro') {
        return 'Profesional';
      }
      return 'Premium';
    }
  }
};
</script>

<style scoped>
.roles-permissions {
  display: grid;
  min-width: 0;
  max-width: 100%;
  gap: 1rem;
  background: #ffffff;
  border: 1px solid #d9e8ef;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
}

.roles-header,
.permissions-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: #e8f7fb;
  border-bottom: 1px solid #d9e8ef;
}

.roles-header h2,
.permissions-heading h3 {
  margin: 0;
  color: #374151;
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 0;
}

.roles-header p,
.permissions-heading span {
  margin: 0.35rem 0 0;
  color: #6b7280;
}

.eyebrow {
  margin: 0 0 0.25rem;
  color: #036b84;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.concept-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0 1.5rem;
}

.concept-grid article {
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.concept-grid span,
.panel-title span,
.permission-row span,
.permission-row small,
.upgrade-note span {
  color: #6b7280;
  font-size: 0.85rem;
}

.concept-grid strong,
.panel-title strong,
.permission-row strong {
  color: #111827;
}

.roles-layout {
  display: grid;
  grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
  gap: 1rem;
  padding: 0 1.5rem 1.5rem;
}

.roles-list,
.permissions-panel {
  min-width: 0;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.role-button {
  display: grid;
  width: 100%;
  gap: 0.15rem;
  padding: 0.85rem 1rem;
  text-align: left;
  border: 0;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
  cursor: pointer;
}

.role-button.is-active,
.role-button:hover {
  background: #e8f7fb;
}

.role-button span {
  color: #6b7280;
  font-size: 0.78rem;
}

.permissions-panel {
  min-height: 24rem;
}

.empty-state,
.loading-state {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  min-height: 18rem;
  color: #6b7280;
  text-align: center;
}

.permission-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  gap: 1rem;
  padding: 1rem;
}

.permission-group {
  min-width: 0;
  border: 1px solid #e5e7eb;
}

.group-title {
  padding: 0.75rem 1rem;
  color: #036b84;
  background: #e8f7fb;
  font-weight: 800;
}

.permission-list {
  display: grid;
}

.permission-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid #f1f5f9;
}

.permission-row div:first-child {
  display: grid;
  min-width: 0;
  overflow-wrap: anywhere;
  gap: 0.15rem;
}

.permission-row small {
  color: #b45309;
}

.permission-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 7rem;
}

.permission-action ::v-deep .v-input { flex: 0 0 auto; margin: 0; }
.role-button:focus-visible { outline: 2px solid var(--color-primary-700); outline-offset: -3px; }
.capture-state { color: #526575; font-size: .85rem; }

.upgrade-note {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 960px) {
  .roles-header,
  .permissions-heading,
  .upgrade-note {
    display: grid;
  }

  .concept-grid,
  .roles-layout,
  .permission-groups {
    grid-template-columns: 1fr;
  }
}
</style>
