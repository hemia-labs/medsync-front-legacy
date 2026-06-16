<template>
  <div class="mt-4 border border-primary-200 bg-white shadow-sm">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 bg-primary-100 border-b border-primary-200">
      <div>
        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Accesos del puesto</p>
        <h3 class="m-0 text-gray-700 text-lg font-medium">{{ roleName || 'Selecciona un puesto' }}</h3>
      </div>
      <v-switch
        v-model="allPermissions"
        label="Dar todos los accesos"
        :color="themePrimary"
        hide-details
        dense
        :disabled="!idRol"
        class="role-permissions-switch"
      ></v-switch>
    </div>

    <div v-if="!idRol" class="px-4 py-5 text-gray-500 text-sm">
      Selecciona un puesto para ver las pantallas disponibles.
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <section v-for="group in permissionGroups" :key="group.name" class="bg-white border border-gray-200 shadow-sm">
        <div class="px-4 py-2 bg-primary-100 text-primary-900 font-semibold tracking-wide">
          {{ group.name }}
        </div>
        <div class="px-4 py-2">
          <v-switch
            v-for="permission in group.items"
            :key="permission.code"
            v-model="selectedPermissions"
            :value="permission.code"
            :label="permission.name"
            :color="themePrimary"
            hide-details
            dense
            class="mt-0 role-permissions-switch"
          ></v-switch>
        </div>
      </section>
    </div>

    <div v-if="idRol" class="px-4 py-3 flex justify-end border-t border-gray-200">
      <da-button-primary @click.native="onSave" :label="'Guardar accesos'" rxl swpr class="py-1 px-4 font-light"></da-button-primary>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';

export default {
  props: {
    idRol: {
      type: String,
      default: ''
    },
    roles: {
      type: Array,
      default: function() { return [] }
    }
  },
  data: function() {
    return {
      selectedPermissions: []
    }
  },
  computed: {
    ...mapGetters(moduleTypes.ROLE, {
      permissions: fnTypes.getRolePermissions
    }),
    themePrimary: function() {
      return 'var(--color-primary-700)'
    },
    roleName: function() {
      const role = this.roles.find((item) => item.id_rol === this.idRol)
      return role ? role.desc_rol : ''
    },
    allPermissions: {
      get: function() {
        return this.permissions.length > 0 && this.selectedPermissions.length === this.permissions.length
      },
      set: function(value) {
        this.selectedPermissions = value ? this.permissions.map((item) => item.code) : []
      }
    },
    permissionGroups: function() {
      return this.permissions.reduce((groups, permission) => {
        const groupName = permission.module || 'General'
        let group = groups.find((item) => item.name === groupName)
        if(!group) {
          group = { name: groupName, items: [] }
          groups.push(group)
        }
        group.items.push(permission)
        return groups
      }, [])
    }
  },
  methods: {
    ...mapActions(moduleTypes.ROLE, [
      fnTypes.getRolePermissions,
      fnTypes.saveRolePermissions
    ]),
    onSave: async function() {
      await this.saveRolePermissions({
        idRol: this.idRol,
        permissions: this.selectedPermissions
      })
      this.$emit('saved')
    },
    loadPermissions: async function() {
      if(!this.idRol) {
        this.selectedPermissions = []
        return
      }
      await this.getRolePermissions(this.idRol)
      this.selectedPermissions = this.permissions.filter((item) => item.allowed).map((item) => item.code)
    }
  },
  watch: {
    idRol: {
      immediate: true,
      handler: function() {
        this.loadPermissions()
      }
    },
    permissions: function() {
      this.selectedPermissions = this.permissions.filter((item) => item.allowed).map((item) => item.code)
    }
  }
}
</script>

<style>
html[data-theme="clinical-night"] .role-permissions-switch .v-input__slot,
html[data-theme="clinical-night"] .role-permissions-switch .v-input--selection-controls__input,
html[data-theme="clinical-night"] .role-permissions-switch input,
html[data-theme="clinical-night"] .role-permissions-switch .v-label {
  background: transparent !important;
  background-color: transparent !important;
}

html[data-theme="clinical-night"] .role-permissions-switch .v-input--switch__track {
  background-color: #334155 !important;
  opacity: 1;
}

html[data-theme="clinical-night"] .role-permissions-switch.v-input--is-label-active .v-input--switch__track {
  background-color: var(--color-primary-700) !important;
  opacity: 0.65;
}
</style>
