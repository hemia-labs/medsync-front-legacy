<template>
  <section class="roles-permissions">
    <div class="roles-header">
      <div>
        <h2>Puestos y accesos</h2>
        <p>Elige un puesto y revisa qué puede hacer en tu consultorio.</p>
      </div>
      <v-btn text color="primary" :loading="isLoadingRoles" :disabled="isSaving || isLoadingPermissions" @click="reloadRoles">
        <v-icon left small>mdi-refresh</v-icon>
        Actualizar lista
      </v-btn>
    </div>

    <details class="access-help">
      <summary>¿Cómo asignar los accesos?</summary>
      <p>Activa solo lo que necesita cada puesto. Los switches preparan los cambios; se aplican al pulsar Guardar cambios.</p>
      <ul>
        <li>Para recepción, revisa los accesos de pacientes y citas. Si también registra el motivo de consulta, busca ese acceso en Historia clínica.</li>
        <li>Consultar, crear, corregir y firmar son accesos distintos. Revisa cada acción que necesita el equipo.</li>
        <li>Ver indicadores económicos y costos requiere activar sus accesos. Ver indicadores de todo el consultorio no habilita otros tipos de indicadores.</li>
      </ul>
    </details>

    <v-alert v-if="errorMessage" type="error" dense text class="mb-4">
      {{ errorMessage }}
    </v-alert>

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
          <strong>{{ roleLabel(role) }}</strong>
          <span v-if="selectedRoleId === role.id_rol">Seleccionado</span>
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
              <p class="scope-note">Los cambios se aplican al guardar y afectan a todas las personas con este puesto.</p>
              <p role="status" class="capture-state">{{ dirty ? `${changedPermissionCodes.length} ${changedPermissionCodes.length === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}` : 'Sin cambios pendientes' }}</p>
            </div>
            <v-btn color="primary" depressed :dark="dirty" :loading="isSaving" :disabled="isSaving || isLoadingPermissions || !permissionsLoaded || !dirty" @click="savePermissions">
              <v-icon left small>mdi-content-save-outline</v-icon>
              Guardar cambios
            </v-btn>
          </div>

          <v-progress-linear v-if="isLoadingPermissions" indeterminate color="primary" height="3" />

          <div v-if="isLoadingPermissions" class="loading-state">
            <v-progress-circular indeterminate color="primary" />
            <span>Cargando accesos...</span>
          </div>

          <template v-else-if="permissionsLoaded">
            <div class="permission-toolbar">
              <v-text-field v-model="permissionSearch" label="Buscar un acceso" placeholder="Por ejemplo: citas, recetas o costos" outlined dense hide-details clearable prepend-inner-icon="mdi-magnify" />
              <div class="group-tools">
                <span role="status">{{ normalizedSearch ? `${matchingPermissionCount} ${matchingPermissionCount === 1 ? 'acceso encontrado' : 'accesos encontrados'}` : `${permissions.length} accesos en ${permissionGroups.length} secciones` }}</span>
                <button v-if="!normalizedSearch && permissionGroups.length" type="button" class="text-action" @click="toggleAllGroups">{{ allGroupsExpanded ? 'Cerrar todas las secciones' : 'Abrir todas las secciones' }}</button>
                <span v-if="normalizedSearch">Se muestran las secciones con coincidencias.</span>
              </div>
            </div>
          <div class="permission-groups">
            <section v-for="group in permissionGroups" :key="group.name" class="permission-group">
              <h4 class="group-heading">
                <button :id="groupButtonId(group)" type="button" class="group-title" :aria-expanded="isGroupExpanded(group) ? 'true' : 'false'" :aria-controls="groupPanelId(group)" @click="toggleGroup(group)">
                  <span class="group-label"><strong>{{ group.name }}</strong><span class="group-summary">{{ groupAllowedCount(group) }} de {{ group.allItems.length }} activos</span></span>
                  <span class="group-state"><span v-if="groupChangeCount(group)" class="group-changes">{{ groupChangeCount(group) }} {{ groupChangeCount(group) === 1 ? 'cambio' : 'cambios' }}</span><v-icon aria-hidden="true">{{ isGroupExpanded(group) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon></span>
                </button>
              </h4>
              <div v-show="isGroupExpanded(group)" :id="groupPanelId(group)" :aria-labelledby="groupButtonId(group)" class="permission-list">
                <article v-for="permission in group.items" :key="permission.code" class="permission-row">
                  <div>
                    <strong :id="permissionNameId(permission)">{{ permissionText(permission).name }}</strong>
                    <span :id="permissionDescriptionId(permission)">{{ permissionText(permission).description }}</span>
                    <small v-if="permissionLockReason(permission)" :id="`${permissionNameId(permission)}-reason`" :class="{ 'permission-protected': isAdministrativePermission(permission) }">
                      {{ permissionLockReason(permission) }}
                    </small>
                  </div>
                  <div class="permission-action">
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
            <div v-if="!permissionGroups.length" class="search-empty" role="status">
              <p>{{ normalizedSearch ? 'No encontramos accesos con esa búsqueda.' : 'No hay accesos disponibles para este puesto.' }}</p>
              <button v-if="normalizedSearch" type="button" class="text-action" @click="permissionSearch = ''">Limpiar búsqueda</button>
            </div>
          </div>

          <div v-if="hasPlanLockedPermissions" class="upgrade-note">
            <span>Algunos accesos requieren otro plan. Verás el plan necesario junto a cada opción.</span>
            <v-btn small outlined color="primary" @click="$emit('contact-plan')">
              Consultar planes
            </v-btn>
          </div>
          <div v-if="dirty || successMessage" class="permissions-savebar" :class="{ 'is-saved': !dirty && successMessage }">
            <div><strong>{{ selectedRoleName }}</strong><span role="status">{{ dirty ? `${changedPermissionCodes.length} ${changedPermissionCodes.length === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}` : successMessage }}</span><small v-if="errorMessage" class="savebar-error">{{ dirty ? 'Guardado pendiente: ' : '' }}{{ errorMessage }}</small></div>
            <v-btn v-if="dirty" color="primary" dark depressed :loading="isSaving" :disabled="isSaving" @click="savePermissions">Guardar cambios</v-btn>
            <v-icon v-else color="success" aria-hidden="true">mdi-check-circle-outline</v-icon>
          </div>
          </template>
          <div v-else class="search-empty"><v-btn outlined color="primary" @click="loadPermissions">Volver a cargar accesos</v-btn></div>
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
import { permissionText, permissionGroupLabel, roleLabel, normalizePermissionSearch } from '../../../domain/settings/permissions.presentation';

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
      permissionSearch: '',
      expandedGroups: [],
      searchCollapsedGroups: [],
      navigationCleanup: null
    };
  },

  computed: {
    dirty() { return this.permissionsLoaded && this.baseline !== JSON.stringify([...this.selectedPermissions].sort()); },
    selectedRole: function() {
      return this.roles.find((role) => role.id_rol === this.selectedRoleId) || null;
    },

    selectedRoleName: function() {
      return this.selectedRole ? roleLabel(this.selectedRole) : 'Puesto seleccionado';
    },

    permissionGroups: function() {
      return this.permissions.reduce((groups, permission) => {
        const groupName = permissionGroupLabel(permission.module || 'General');
        let group = groups.find((item) => item.name === groupName);
        if(!group) {
          group = { id: groups.length, name: groupName, items: [], allItems: [] };
          groups.push(group);
        }
        group.allItems.push(permission);
        const copy = permissionText(permission);
        if(!this.normalizedSearch || normalizePermissionSearch(`${groupName} ${copy.name} ${copy.description} ${permission.code}`).includes(this.normalizedSearch)) group.items.push(permission);
        return groups;
      }, []).filter(group => group.items.length);
    },
    normalizedSearch() { return normalizePermissionSearch(this.permissionSearch); },
    matchingPermissionCount() { return this.permissionGroups.reduce((count,group)=>count+group.items.length,0); },
    changedPermissionCodes() {
      if(!this.permissionsLoaded || !this.baseline) return [];
      const baseline = JSON.parse(this.baseline);
      return [...new Set([...baseline,...this.selectedPermissions])].filter(code=>baseline.includes(code)!==this.selectedPermissions.includes(code));
    },
    allGroupsExpanded() { return this.permissionGroups.length > 0 && this.permissionGroups.every(group=>this.expandedGroups.includes(group.name)); },
    hasPlanLockedPermissions() { return this.permissions.some(permission=>!this.isAdministrativePermission(permission) && this.isPermissionLocked(permission)); }
  },

  watch: {
    permissionSearch() { this.searchCollapsedGroups=[]; },
    selectedPermissions() { if(this.dirty)this.successMessage=''; }
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
    permissionText, roleLabel,
    groupButtonId(group) { return `access-group-toggle-${this._uid}-${group.id}`; },
    groupPanelId(group) { return `access-group-panel-${this._uid}-${group.id}`; },
    isGroupExpanded(group) { return this.normalizedSearch ? !this.searchCollapsedGroups.includes(group.name) : this.expandedGroups.includes(group.name); },
    toggleGroup(group) {
      if(this.normalizedSearch) { this.searchCollapsedGroups=this.searchCollapsedGroups.includes(group.name) ? this.searchCollapsedGroups.filter(name=>name!==group.name) : [...this.searchCollapsedGroups,group.name]; return; }
      this.expandedGroups = this.expandedGroups.includes(group.name) ? this.expandedGroups.filter(name=>name!==group.name) : [...this.expandedGroups,group.name];
    },
    toggleAllGroups() { this.expandedGroups=this.allGroupsExpanded ? [] : this.permissionGroups.map(group=>group.name); },
    groupAllowedCount(group) { return group.allItems.filter(permission=>this.selectedPermissions.includes(permission.code)).length; },
    groupChangeCount(group) { return group.allItems.filter(permission=>this.changedPermissionCodes.includes(permission.code)).length; },
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
      this.permissionSearch='';this.expandedGroups=[];this.searchCollapsedGroups=[];
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
        this.successMessage = 'Accesos guardados.';
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
      if(this.isAdministrativePermission(permission)) return this.selectedRole && ['admin','business_admin'].includes(this.selectedRole.code) ? 'Acceso protegido del administrador; no se puede modificar aquí.' : 'Este acceso se reserva al puesto administrador.';
      if(!this.isPermissionLocked(permission)) return '';
      const plan = permission.licensing && permission.licensing.minimumPlan;
      return ['pro','enterprise'].includes(plan) ? `Requiere el plan ${this.premiumLabel(permission)}.` : 'Este acceso no está incluido en tu plan actual.';
    },

    isPermissionLocked: function(permission) {
      const isSelected = this.selectedPermissions.includes(permission.code);
      const allowed = !permission.licensing || permission.licensing.planAllowed !== false;
      return !isSelected && !allowed;
    },

    premiumLabel: function(permission) {
      const plan = permission && permission.licensing ? permission.licensing.minimumPlan : '';
      if(plan === 'enterprise') {
        return 'Clínica';
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
  font-weight: 600;
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
.role-button.is-active { box-shadow: inset 3px 0 #087f8c; }
.role-button:hover:not(.is-active) { background: #f8fafb; }

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
  grid-template-columns: minmax(0, 1fr);
  gap: 0.65rem;
  padding: 1rem;
}

.permission-group {
  min-width: 0;
  border: 1px solid #e5e7eb;
}

.group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  border: 0;
  text-align: left;
  padding: 0.75rem 1rem;
  color: #036b84;
  background: #e8f7fb;
  font-weight: 600;
}

.group-heading { margin: 0; font-size: 1rem; }
.group-label { display: grid; gap: 0.2rem; min-width: 0; overflow-wrap: anywhere; }
.group-summary { color: #526779; font-size: 0.8rem; font-weight: 400; }
.group-state { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.group-changes { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 0.2rem 0.4rem; font-size: 0.75rem; white-space: nowrap; }
.group-title:focus-visible, .text-action:focus-visible, .access-help summary:focus-visible { outline: 2px solid #087f8c; outline-offset: -2px; }
.permission-toolbar { display: grid; gap: 0.65rem; padding: 1rem 1rem 0; }
.group-tools { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem 1rem; color: #526779; font-size: 0.8rem; line-height: 1.5; }
.text-action { min-height: 32px; padding: 0.25rem; color: #036b84; text-decoration: underline; text-underline-offset: 3px; }
.access-help { margin: 0 1.5rem; color: #526779; font-size: 0.875rem; line-height: 1.65; }
.access-help summary { width: fit-content; padding: 0.35rem 0; color: #036b84; font-weight: 600; cursor: pointer; }
.access-help p { margin: 0.5rem 0; }
.access-help ul { padding-left: 1.25rem; margin: 0.5rem 0 0; }
.scope-note { margin: 0.5rem 0; color: #526779; font-size: 0.875rem; line-height: 1.5; }
.save-reminder { margin: 0.25rem 0 0; color: #92400e; font-size: 0.8rem; }
.search-empty { padding: 1.5rem; color: #526779; text-align: center; }
.role-button { min-height: 4rem; }
.roles-permissions ::v-deep .v-btn { text-transform: none; letter-spacing: 0; }
.permissions-savebar { position: sticky; bottom: 2.75rem; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.85rem 1rem; background: #fff; border-top: 1px solid #d9e8ef; box-shadow: 0 -4px 12px rgba(15,23,42,0.06); }
.permissions-savebar > div { display: grid; gap: 0.2rem; min-width: 0; font-size: 0.85rem; color: #526779; overflow-wrap: anywhere; }
.permissions-savebar .v-btn { flex-shrink: 0; }
.permissions-savebar .savebar-error { color: #991b1b; }
.permissions-savebar.is-saved { background: #f0fdf4; border-color: #bbf7d0; }

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
.permission-row small.permission-protected { color: #526779; }

.permission-row strong { line-height: 1.5; font-size: 0.9rem; }
.permission-row span { line-height: 1.55; }

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

@media (max-width: 600px) {
  .roles-header, .permissions-heading { padding: 1rem; }
  .roles-layout { padding: 0 1rem 1rem; }
  .roles-list { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); }
  .panel-title { grid-column: 1 / -1; }
  .role-button { min-width: 0; overflow-wrap: anywhere; }
  .access-help { margin: 0 1rem; }
  .permission-toolbar { padding: 0.85rem 0.85rem 0; }
  .permission-groups { padding: 0.85rem; }
  .group-title { padding: 0.8rem; gap: 0.5rem; }
  .group-state { gap: 0.25rem; }
  .permission-row { padding: 0.85rem; gap: 0.6rem; }
  .upgrade-note { padding: 0.85rem; }
  .permissions-savebar { gap: 0.5rem; padding: 0.75rem; }
}
</style>
