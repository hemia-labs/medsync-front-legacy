<template>
  <section class="staff-editor-card">
    <div class="staff-editor-header">
      <div>
        <p class="staff-editor-eyebrow">Editar usuario</p>
        <h2>Actualizar personal</h2>
        <p>Modifica los datos de contacto y el puesto de esta persona.</p>
      </div>
      <span class="staff-editor-icon"><v-icon size="24">mdi-account-edit-outline</v-icon></span>
    </div>

    <div class="staff-editor-body">
      <p v-if="isLoading" role="status">Cargando los datos de esta persona…</p>
      <div v-if="loadError" role="alert" class="mb-4 p-4 rounded-lg border border-red-300 bg-red-50 text-red-800">{{ loadError }} <button type="button" class="underline" @click="init">Reintentar</button></div>
      <p v-if="saveError" role="alert" class="mb-4 error--text">{{ saveError }}</p>
      <p v-if="!isLoading && !loadError" role="status">{{ dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes' }}</p>
      <template v-if="!isLoading && !loadError">
      <div v-if="validationErrors.length" ref="validationSummary" tabindex="-1" role="alert" class="mb-5 p-4 rounded-lg border border-red-300 bg-red-50 text-red-800">
        <strong>Revisa los datos para actualizar el usuario:</strong>
        <ul><li v-for="item in validationErrors" :key="item.field"><button type="button" class="underline" @click="focusField(item.field)">{{ item.message }}</button></li></ul>
      </div>
      <section class="staff-form-section">
        <div class="staff-section-title">
          <p>Datos principales</p>
          <span>Nombre y contacto del usuario</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" v-if="user">
          <v-text-field ref="name" label="Nombre *" outlined dense :disabled="isSaving" :color="themePrimary" :error-messages="fieldErrors('name')"
            v-model="$v.user.name.$model"
          />
          <v-text-field ref="phone" label="Teléfono *" type="tel" inputmode="numeric" outlined dense :disabled="isSaving" :color="themePrimary" :error-messages="fieldErrors('phone')" hint="Ingresa un teléfono de 10 dígitos." persistent-hint
            v-model="$v.user.phone.$model"
          />
        </div>
      </section>

      <section class="staff-form-section">
        <div class="staff-section-title">
          <p>Acceso al sistema</p>
          <span>Correo y puesto asignado</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <v-text-field ref="email" label="Correo *" type="email" outlined dense :disabled="isSaving" :color="themePrimary" :error-messages="fieldErrors('email')"
            v-model="$v.user.email.$model"
          />
          <v-select
            ref="id_rol"
            :disabled="isSaving"
            :color="themePrimary"
            :items="roles"
            label="Puesto *"
            v-model="$v.user.id_rol.$model"
            item-text="desc_rol"
            item-value="id_rol"
            outlined
            dense
            :error-messages="fieldErrors('id_rol')"
          >
            <template slot="item" slot-scope="data">
              <span class="text-primary-900">{{ data.item.desc_rol ? data.item.desc_rol : '' }}</span>
            </template>
          </v-select>
        </div>
      </section>

      <section class="role-permissions-note" aria-label="Accesos del puesto">
        <div>
          <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Accesos del puesto</p>
          <h3 class="m-0 mt-1 text-gray-700 text-base font-semibold">{{ selectedRoleName }}</h3>
          <p class="m-0 mt-1 text-gray-500 text-sm">
            Esta pantalla solo edita datos del usuario y su puesto. Los accesos se administran por puesto y aplican a todas las personas con ese puesto.
          </p>
        </div>
      </section>

      <section v-if="isDoctorLike" class="staff-professional-panel">
        <da-professional-profile
          ref="professionalProfile"
          :id-login="id"
          show-admin-controls
          admin-controls-only
          hide-save-button
          v-on:saved="toastFunction('success','Autorizaciones profesionales guardadas.')"
          v-on:error="toastFunction('error',$event)"
        ></da-professional-profile>
      </section>

      </template>

      <div class="staff-editor-actions">
        <button type="button" class="staff-save-button" :disabled="isSaving || isLoading || !!loadError || loadedUserId !== id" @click="onSave">
          <v-icon size="18">mdi-content-save-outline</v-icon>
          <span>{{ isSaving ? 'Guardando...' : 'Guardar cambios' }}</span>
        </button>
        <button type="button" class="staff-cancel-button" :disabled="isSaving" @click="requestClose">
          <v-icon size="18">mdi-close-circle-outline</v-icon>
          <span>Cancelar</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import DAUserModel from '../../models/user/DAUserModel';
import { validationMixin } from 'vuelidate';
import { required } from 'vuelidate/lib/validators';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import { emailPattern, phonePattern } from '../../utils/common/regex'
import DAProfessionalProfile from './components/DAProfessionalProfile.vue';
import { buildLicenseLimitMessage } from '../../utils/licenseLimitMessage';
import { confirmSettingsDiscard, registerSettingsNavigationGuard } from '../../domain/settings/settings.navigation';

export default {
    mixins: [validationMixin],
    components: {
        'da-professional-profile': DAProfessionalProfile
    },
    props: {
        id: {
            type: String,
            default: ""
        }
    },
    data: function() {
        return {
            user: new DAUserModel(),
            showPWD: false,
            isSaving: false,
            isLoading: false,
            loadedUserId: '',
            loadError: '',
            saveError: '',
            baseline: '',
            loadRequest: 0,
            navigationCleanup: null
        }
    },
    validations: {
        user: {
            email: {
                 required,
                 emailPattern
            },
            phone: {
                required,
                phonePattern
            },
            id_rol: {
                 required
            },
            name: {
                 required
            }
         }
    },
    created() {
        this.init()
    },
    mounted() {
        this.navigationCleanup = registerSettingsNavigationGuard(this, { hasChanges: () => this.hasPendingChanges(), isSaving: () => this.isWorking() });
    },
    beforeDestroy() {
        this.loadRequest++;
        if(this.navigationCleanup) this.navigationCleanup();
    },
    computed: {
        dirty() { return !!this.baseline && this.baseline !== JSON.stringify(this.user); },
        validationErrors() {
            return ['name', 'phone', 'email', 'id_rol'].flatMap(field => this.fieldErrors(field).map(message => ({ field, message })));
        },
        ...mapGetters(moduleTypes.ROLE, {
            roles: fnTypes.getRoles,
        }),
        ...mapGetters(moduleTypes.USER, {
            hasErrorInService: fnTypes.hasErrorInService,
            lastErrorInService: fnTypes.lastErrorInService,
            lastErrorInServiceDetails: fnTypes.lastErrorInServiceDetails,
        }),
        themePrimary: function() {
            return 'var(--color-primary-700)'
        },
        isDoctorLike: function() {
            const role = (this.roles || []).find((item) => item.id_rol === this.user.id_rol)
            return role && ['doctor', 'admin', 'business_admin'].includes(role.code)
        },
        selectedRoleName: function() {
            const role = (this.roles || []).find((item) => item.id_rol === this.user.id_rol)
            return role && role.desc_rol ? role.desc_rol : 'Selecciona un puesto'
        }
    },
    methods: {
        hasPendingChanges() {
            const profile = this.$refs.professionalProfile;
            return this.dirty || Boolean(profile && profile.hasUnsavedChanges);
        },
        isWorking() {
            const profile = this.$refs.professionalProfile;
            return this.isSaving || Boolean(profile && profile.saving);
        },
        async requestClose() {
            if(this.isWorking()) return false;
            if(this.hasPendingChanges() && !await confirmSettingsDiscard(this)) return false;
            if(this.isWorking()) return false;
            this.$emit('close');
            return true;
        },
        fieldErrors(field) {
            const value = this.$v.user[field];
            if(!value || !value.$dirty || !value.$invalid) return [];
            const labels = { name: 'El nombre es obligatorio.', phone: 'Ingresa un teléfono de 10 dígitos.', email: 'Ingresa un correo válido.', id_rol: 'Selecciona un puesto.' };
            return [labels[field]];
        },
        focusField(field) {
            const input = this.$refs[field];
            if(input && input.$el) input.$el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            if(input && input.focus) input.focus();
        },
        ...mapActions(moduleTypes.ROLE, [
            fnTypes.getRoles
        ]),
        ...mapActions(moduleTypes.USER, [
            fnTypes.update, fnTypes.getUser
        ]),
        init: async function() {
            const request=++this.loadRequest;
            this.$v.$reset()
            this.user = new DAUserModel()
            this.isLoading=true; this.loadedUserId=''; this.baseline=''; this.loadError=''; this.saveError='';
            try {
                if(!await this.getUserById(this.id, request)) return false;
                await this.getRoles();
                return true;
            } catch(_) {
                if(request===this.loadRequest) this.loadError='No se pudieron cargar los datos de esta persona. Reintenta antes de editar.';
                return false;
            } finally { if(request===this.loadRequest) this.isLoading=false; }
        },
        onSave: async function() {
            if(this.isWorking() || this.isLoading || this.loadError || this.loadedUserId !== this.id) {
                return false
            }

            this.$v.$touch();
            if(this.$v.$anyError) {
                this.$nextTick(() => {
                    const summary = this.$refs.validationSummary;
                    if(summary) { summary.scrollIntoView({ block: 'center' }); summary.focus(); }
                });
                return false;
            }
            if(!this.$v.$anyError) {
                this.isSaving = true
                this.saveError = ''
                const payload = JSON.parse(JSON.stringify(this.user));
                try {
                    const response = await this.update({data: payload, id: this.id})
                    if(!response || !response.success) {
                        this.saveError = buildLicenseLimitMessage(response, response && response.message ? response.message : 'No se pudo actualizar el usuario. Tu captura se conserva; puedes reintentar.');
                        return false;
                    }
                    this.baseline = JSON.stringify(payload);
                    if(!await this.saveProfessionalProfileIfNeeded()) {
                        this.saveError='Los datos de contacto se guardaron, pero las autorizaciones siguen pendientes. Revisa su mensaje y reintenta sin salir de esta pantalla.';
                        return false;
                    }
                    this.$emit('success', true);
                    return true;
                }
                catch(error) {
                    this.saveError='No se pudo confirmar el guardado. Tu captura se conserva; revisa la conexión y vuelve a intentar.';
                    return false;
                }
                finally {
                    this.isSaving = false
                }
            }
        },
        saveProfessionalProfileIfNeeded: async function() {
            if(!this.isDoctorLike) {
                return true
            }

            const professionalProfile = this.$refs.professionalProfile
            if(!professionalProfile || typeof professionalProfile.save !== 'function') {
                return true
            }
            if(!professionalProfile.hasUnsavedChanges) return true;

            const response = await professionalProfile.save()
            return Boolean(response && response.success)
        },
        getUserById: async function(id, request = this.loadRequest) {
            const response = await this.getUser(id)
            if(request !== this.loadRequest || id !== this.id) return false;
            if(!response || !response.success || !response.data || response.data.id_login !== id) {
                this.loadError=response && response.message ? response.message : 'No se pudieron verificar los datos de esta persona. Reintenta la carga.';
                this.loadedUserId='';
                return false;
            }
            this.user=JSON.parse(JSON.stringify(response.data));
            this.loadedUserId=id;
            this.baseline=JSON.stringify(this.user);
            return true;
        },
        toastFunction: function(type,text){
            const Toast = this.$swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            })

            Toast.fire({
                icon: type,
                title: text
            })
        }
    }
}
</script>

<style scoped>
.staff-editor-card {
    overflow: hidden;
    border: 1px solid rgba(8, 103, 131, 0.14);
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.staff-editor-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: clamp(1.15rem, 2vw, 1.45rem);
    border-bottom: 1px solid var(--color-primary-200, #cdeef7);
    background: linear-gradient(135deg, var(--color-primary-100, #e6f7fb) 0%, rgba(255, 255, 255, 0.94) 72%);
}

.staff-editor-eyebrow,
.staff-section-title p {
    margin: 0;
    color: var(--color-primary-900, #086783);
    font-size: 0.74rem;
    font-weight: 900;
    letter-spacing: 0;
    line-height: 1rem;
    text-transform: uppercase;
}

.staff-editor-header h2 {
    margin: 0.25rem 0 0;
    color: #12313a;
    font-size: 1.55rem;
    font-weight: 900;
    letter-spacing: 0;
    line-height: 1.15;
}

.staff-editor-header p:not(.staff-editor-eyebrow) {
    margin: 0.55rem 0 0;
    color: #475569;
    line-height: 1.45rem;
}

.staff-editor-icon {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 8px;
    color: var(--color-primary-900, #086783);
    background: #ffffff;
    box-shadow: 0 10px 20px rgba(8, 103, 131, 0.10);
}

.staff-editor-icon .v-icon {
    color: currentColor;
}

.staff-editor-body {
    display: grid;
    gap: 1rem;
    padding: clamp(1rem, 2vw, 1.35rem);
}

.staff-form-section,
.staff-professional-panel {
    border: 1px solid #e0edf0;
    border-radius: 8px;
    background: #fbfdfe;
    padding: 1rem;
}

.role-permissions-note {
    border: 1px solid var(--color-primary-200, #cdeef7);
    border-radius: 8px;
    background: #ffffff;
    padding: 1rem;
}

.staff-section-title {
    margin-bottom: 0.85rem;
}

.staff-section-title span {
    display: block;
    margin-top: 0.25rem;
    color: #64748b;
    font-size: 0.84rem;
    font-weight: 700;
}

.staff-editor-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: flex-end;
    padding-top: 0.25rem;
}

.staff-save-button,
.staff-cancel-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-height: 2.55rem;
    border-radius: 8px;
    padding: 0 1rem;
    font-weight: 800;
    letter-spacing: 0;
    transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.staff-save-button {
    min-width: 10rem;
    border: 1px solid var(--color-primary-700, #1497bd);
    color: #ffffff;
    background: var(--color-primary-700, #1497bd);
    box-shadow: 0 10px 20px rgba(8, 103, 131, 0.16);
}

.staff-cancel-button {
    min-width: 8rem;
    border: 1px solid #d6e6ea;
    color: #64748b;
    background: #ffffff;
}

.staff-save-button .v-icon,
.staff-cancel-button .v-icon {
    color: currentColor;
}

.staff-save-button:hover,
.staff-save-button:focus {
    border-color: var(--color-primary-900, #086783);
    color: #ffffff;
    background: var(--color-primary-900, #086783);
    outline: none;
    transform: translateY(-1px);
}

.staff-save-button:disabled,
.staff-save-button:disabled:hover,
.staff-save-button:disabled:focus {
    border-color: var(--color-primary-400, #61c9df);
    color: #ffffff;
    background: var(--color-primary-400, #61c9df);
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.72;
    transform: none;
}

.staff-cancel-button:hover,
.staff-cancel-button:focus {
    border-color: var(--color-primary-300, #a6e1f0);
    color: var(--color-primary-900, #086783);
    background: var(--color-primary-100, #e6f7fb);
    outline: none;
}

html[data-theme="clinical-night"] .staff-editor-card,
html[data-theme="clinical-night"] .staff-form-section,
html[data-theme="clinical-night"] .staff-professional-panel,
html[data-theme="clinical-night"] .role-permissions-note {
    border-color: rgba(148, 163, 184, 0.18);
    background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] .staff-editor-header {
    border-color: rgba(148, 163, 184, 0.18);
    background: rgba(15, 23, 42, 0.72);
}

html[data-theme="clinical-night"] .staff-editor-header h2,
html[data-theme="clinical-night"] .role-permissions-note h3 {
    color: #e2e8f0;
}

html[data-theme="clinical-night"] .staff-editor-header p:not(.staff-editor-eyebrow),
html[data-theme="clinical-night"] .staff-section-title span,
html[data-theme="clinical-night"] .role-permissions-note p {
    color: #94a3b8;
}

html[data-theme="clinical-night"] .staff-cancel-button,
html[data-theme="clinical-night"] .staff-editor-icon {
    border-color: rgba(148, 163, 184, 0.2);
    background: rgba(30, 41, 59, 0.68);
}

@media (max-width: 700px) {
    .staff-editor-header {
        align-items: stretch;
        flex-direction: column;
    }

    .staff-editor-actions,
    .staff-save-button,
    .staff-cancel-button {
        width: 100%;
    }
}
</style>
