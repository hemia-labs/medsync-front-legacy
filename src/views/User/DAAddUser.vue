<template>
  <section class="staff-editor-card">
    <preparation-guide branch="users" stage="create" :dirty="dirty" :busy="saving" @focus-control="focusGuideControl" />
    <div ref="guideControls" class="staff-editor-header">
      <div>
        <p class="staff-editor-eyebrow">Nuevo usuario</p>
        <h2>Agregar personal</h2>
        <p>Completa los datos de la persona que tendrá acceso al sistema.</p>
      </div>
      <span class="staff-editor-icon"><v-icon size="24">mdi-account-plus-outline</v-icon></span>
    </div>

    <div class="staff-editor-body">
      <p role="status">{{ dirty ? 'Cambios sin guardar' : 'Completa el formulario para crear el usuario.' }}</p>
      <p v-if="saveError" role="alert" class="mb-4 error--text">{{ saveError }}</p>
      <div v-if="validationErrors.length" ref="validationSummary" tabindex="-1" role="alert" class="mb-5 p-4 rounded-lg border border-red-300 bg-red-50 text-red-800">
        <strong>Revisa los datos para crear el usuario:</strong>
        <ul><li v-for="item in validationErrors" :key="item.field"><button type="button" class="underline" @click="focusField(item.field)">{{ item.message }}</button></li></ul>
      </div>
      <section class="staff-form-section">
        <div class="staff-section-title">
          <p>Datos principales</p>
          <span>Nombre y contacto del usuario</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <v-text-field ref="name" label="Nombre *" outlined dense :disabled="saving" :color="themePrimary" :error-messages="fieldErrors('name')"
            v-model="$v.user.name.$model"
          />
          <v-text-field ref="phone" label="Teléfono *" type="tel" inputmode="numeric" maxlength="10" outlined dense :disabled="saving" :color="themePrimary" :error-messages="fieldErrors('phone')" hint="Ingresa un teléfono de 10 dígitos." persistent-hint
            v-model="$v.user.phone.$model"
          />
        </div>
      </section>

      <section class="staff-form-section">
        <div class="staff-section-title">
          <p>Acceso al sistema</p>
          <span>Correo, puesto y contraseña inicial</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <v-text-field ref="email" label="Correo *" type="email" outlined dense :disabled="saving" :color="themePrimary" :error-messages="fieldErrors('email')"
            v-model="$v.user.email.$model"
          />
          <v-select
            ref="id_rol"
            :disabled="saving"
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
          <v-text-field ref="password" label="Contraseña inicial *" outlined dense :disabled="saving" :color="themePrimary" :error-messages="fieldErrors('password')"
            v-model="$v.user.password.$model"
            :type="showPWD ? 'text': 'password'"
          >
            <template v-slot:append>
              <v-btn icon small :aria-label="showPWD ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPWD = !showPWD"><v-icon>{{!showPWD ? 'mdi-eye' : 'mdi-eye-off'}}</v-icon></v-btn>
            </template>
          </v-text-field>
        </div>
      </section>

      <section class="role-permissions-note" aria-label="Accesos del puesto">
        <div>
          <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Accesos del puesto</p>
          <h3 class="m-0 mt-1 text-gray-700 text-base font-semibold">{{ selectedRoleName }}</h3>
          <p class="m-0 mt-1 text-gray-500 text-sm">
            Los accesos se administran por puesto y aplican a todas las personas con ese puesto. Primero guarda el usuario; si necesitas ajustar accesos, hazlo desde Puestos y accesos.
          </p>
        </div>
      </section>

      <section class="license-context" aria-label="Uso de licencia">
        <p v-if="licenseLoading" role="status">Consultando cupos del consultorio…</p>
        <p v-if="licenseError" role="alert">No pudimos consultar los cupos. <button type="button" class="underline" @click="loadLicenseSummary">Reintentar</button></p>
        <div>
          <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Uso de licencia</p>
          <h3 class="m-0 mt-1 text-gray-700 text-base font-semibold">{{ licensePlanLabel }}</h3>
          <p class="m-0 mt-1 text-gray-500 text-sm">{{ selectedRoleLicenseMessage }}</p>
        </div>
        <div class="license-context-grid">
          <span v-for="item in licenseUsageItems" :key="item.key">
            <strong>{{ item.label }}</strong>
            <small>{{ item.value }}</small>
          </span>
        </div>
        <p class="m-0 mt-3 text-gray-500 text-xs">
          Esta informacion es orientativa. Si se alcanza un limite, el sistema te avisara al guardar.
        </p>
      </section>

      <div class="staff-editor-actions">
        <button ref="guideSave" type="button" class="staff-save-button" :disabled="saving" @click="onSave">
          <v-icon size="18">mdi-content-save-outline</v-icon>
          <span>Guardar usuario</span>
        </button>
        <button type="button" class="staff-cancel-button" :disabled="saving" @click="requestClose">
          <v-icon size="18">mdi-close-circle-outline</v-icon>
          <span>Cancelar</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import PreparationGuide from '../configuration/components/PreparationGuide.vue';
import { focusControl } from '../../domain/onboarding/focusControl';
import { mapGetters, mapActions } from 'vuex';
import DAUserModel from '../../models/user/DAUserModel';
import { validationMixin } from 'vuelidate';
import { required } from 'vuelidate/lib/validators';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import { emailPattern, phonePattern } from '../../utils/common/regex'
import { buildLicenseLimitMessage } from '../../utils/licenseLimitMessage';
import { authorizationContext, isCurrentAuthorization } from '../../security/authorizationContext';
import { DAUserService } from '../../services/context/core-proccess-context';
import { DABusinessService } from '../../services/context/core-proccess-context';
import { confirmSettingsDiscard, registerSettingsNavigationGuard } from '../../domain/settings/settings.navigation';

export default {
    components:{PreparationGuide},
    mixins: [validationMixin],
    data: function() {
        return {
            user: new DAUserModel(),
            disposed:false, uncertainUser:null,
            showPWD: false,
            licenseSummary: null,
            licenseLoading: false,
            licenseError: false,
            saving: false,
            baseline: '',
            saveError: '',
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
            },
            password: {
                 required
            }
         }
    },
    created() {
        this.init()
    },
    mounted() {
        this.navigationCleanup=registerSettingsNavigationGuard(this, { hasChanges: () => this.dirty, isSaving: () => this.saving });
    },
    beforeDestroy() { this.disposed=true; if(this.navigationCleanup) this.navigationCleanup(); },
    computed: {
        dirty() { return !!this.baseline && this.baseline !== JSON.stringify(this.user); },
        validationErrors() {
            return ['name','phone','email','id_rol','password'].flatMap(field=>this.fieldErrors(field).map(message=>({field,message})));
        },
        ...mapGetters(moduleTypes.ROLE, {
            roles: fnTypes.getRoles,
        }),
        ...mapGetters(moduleTypes.USER, {
            isSave: fnTypes.isSave,
            hasErrorInService: fnTypes.hasErrorInService,
            lastErrorInService: fnTypes.lastErrorInService,
            lastErrorInServiceDetails: fnTypes.lastErrorInServiceDetails,
        }),
        themePrimary: function() {
            return 'var(--color-primary-700)'
        },
        selectedRole: function() {
            return (this.roles || []).find((role) => role.id_rol === this.user.id_rol) || null
        },
        selectedRoleName: function() {
            return this.selectedRole && this.selectedRole.desc_rol ? this.selectedRole.desc_rol : 'Selecciona un puesto'
        },
        selectedRoleLicenseType: function() {
            const roleCode = String(
                this.selectedRole && (this.selectedRole.code || this.selectedRole.desc_rol)
                    ? (this.selectedRole.code || this.selectedRole.desc_rol)
                    : ''
            ).toLowerCase()

            if(['doctor', 'dentist', 'odontologist', 'specialist', 'professional', 'medico', 'odontologo', 'especialista'].includes(roleCode)) {
                return 'professional'
            }

            if(roleCode === 'super_admin') {
                return 'ignored'
            }

            if(!roleCode) {
                return 'unknown'
            }

            return 'staff'
        },
        selectedRoleLicenseMessage: function() {
            if(this.selectedRoleLicenseType === 'professional') {
                return 'Este puesto cuenta como profesional del plan.'
            }
            if(this.selectedRoleLicenseType === 'staff') {
                return 'Este puesto cuenta como usuario interno del plan.'
            }
            if(this.selectedRoleLicenseType === 'ignored') {
                return 'El superadministrador de plataforma no consume cupo del consultorio.'
            }
            return 'Selecciona un puesto para revisar como se considera dentro del plan.'
        },
        licensePlanLabel: function() {
            const business = this.licenseSummary && this.licenseSummary.business ? this.licenseSummary.business : {}
            return business.planName ? `Plan actual: ${business.planName}` : 'Plan actual'
        },
        licenseUsageItems: function() {
            const license = this.licenseSummary && this.licenseSummary.license ? this.licenseSummary.license : {}
            const professionals = license.professionals || {}
            const staff = license.staffUsers || license.auxiliaryUsers || {}

            return [
                {
                    key: 'professionals',
                    label: 'Profesionales',
                    value: this.formatLicenseUsage(professionals)
                },
                {
                    key: 'staff',
                    label: 'Usuarios internos',
                    value: this.formatLicenseUsage(staff)
                },
                {
                    key: 'patients',
                    label: 'Pacientes',
                    value: 'Ilimitados'
                }
            ]
        }
    },
    methods: {
        focusGuideControl(id, reveal){focusControl(this.$refs[{users:'name',phone:'phone',email:'email',access:'id_rol',password:'password',save:'guideSave'}[id]], reveal);},
        async requestClose() {
            if(this.saving) return false;
            if(this.dirty && !await confirmSettingsDiscard(this)) return false;
            if(this.saving) return false;
            this.$emit('close'); return true;
        },
        fieldErrors(field) {
            const value=this.$v.user[field];
            if(!value || !value.$dirty || !value.$invalid) return [];
            const labels={name:'El nombre es obligatorio.',phone:'Ingresa un teléfono de 10 dígitos.',email:'Ingresa un correo válido.',id_rol:'Selecciona un puesto.',password:'La contraseña inicial es obligatoria.'};
            return [labels[field]];
        },
        focusField(field) {const input=this.$refs[field];if(input && input.focus)input.focus();},
        ...mapActions(moduleTypes.ROLE, [
            fnTypes.getRoles
        ]),
        ...mapActions(moduleTypes.USER, [
            fnTypes.save
        ]),
        init: async function() {
            this.$v.$reset()
            this.user = new DAUserModel()
            this.baseline = JSON.stringify(this.user)
            await this.getRoles()
            await this.loadLicenseSummary()
        },
        loadLicenseSummary: async function() {
            this.licenseLoading=true;this.licenseError=false;
            try {
                const response = await DABusinessService.getLicenseUsage()
                this.licenseSummary = response && response.success ? response.data : null
                this.licenseError=!this.licenseSummary
            } catch (_) {this.licenseSummary=null;this.licenseError=true}
            finally {this.licenseLoading=false}
        },
        formatLicenseUsage: function(limit) {
            if(!limit || limit.limit === undefined) return 'No disponible'
            if(limit.limit === null) return 'Sin límite'
            return `${Number(limit.used || 0)} de ${Number(limit.limit || 0)}`
        },
        onSave: async function() {
            if(this.saving)return;
            const context=authorizationContext(this.$store);
            const current=()=>!this.disposed && isCurrentAuthorization(context,this.$store);
            if(this.uncertainUser){
                this.saving=true;
                try{const response=await DAUserService.getUsers();if(!current())return false;if(!response || !response.success)throw Error();
                    const matches=(response.data || []).filter(user=>user.email===this.uncertainUser.email || user.phone===this.uncertainUser.phone);
                    this.saveError=matches.length ? 'Hay un usuario con ese contacto en el listado. Revisa sus datos y accesos antes de continuar; no creamos otro usuario.' : 'No aparece todavía en el listado. Conservamos tu captura; comprueba el resultado con el administrador antes de repetir el alta.';
                }catch(_){if(current())this.saveError='No pudimos comprobar el alta anterior. Reintenta la consulta; no se enviará otro usuario.';}
                finally{if(current())this.saving=false;}return false;
            }
            this.$v.$touch();
            if(this.$v.$anyError) {this.$nextTick(()=>{if(this.$refs.validationSummary)this.$refs.validationSummary.focus()});return;}
            if(!this.$v.$anyError) {
                this.saving=true;
                try {
                this.saveError='';
                const payload=JSON.parse(JSON.stringify(this.user));
                this.uncertainUser={email:payload.email,phone:payload.phone};
                const response=await this.save(payload)
                if(!current())return false;
                if(response && response.success) {
                    this.uncertainUser=null;
                    this.baseline=JSON.stringify(payload);
                    this.$emit('success', true);
                    return true;
                }
                if(Number(response && response.status)<500)this.uncertainUser=null;
                this.saveError=this.uncertainUser ? 'No se pudo confirmar el alta. El siguiente intento consultará el listado sin crear otro usuario.' : buildLicenseLimitMessage(response, response && response.message ? response.message : 'No se pudo crear el usuario. Tu captura se conserva; puedes reintentar.');
                return false;
                } catch(_) { if(current())this.saveError='No se pudo confirmar el guardado. Tu captura se conserva; revisa la conexión antes de reintentar.'; return false;
                } finally {if(current())this.saving=false;}
            }
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
.license-context {
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

.license-context-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 0.85rem;
}

.license-context-grid span {
    display: grid;
    gap: 0.25rem;
    min-height: 4rem;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #ffffff;
}

.license-context-grid strong {
    color: #374151;
    font-size: 0.82rem;
}

.license-context-grid small {
    color: #0f766e;
    font-weight: 800;
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

.staff-cancel-button:hover,
.staff-cancel-button:focus {
    border-color: var(--color-primary-300, #a6e1f0);
    color: var(--color-primary-900, #086783);
    background: var(--color-primary-100, #e6f7fb);
    outline: none;
}

html[data-theme="clinical-night"] .staff-editor-card,
html[data-theme="clinical-night"] .staff-form-section,
html[data-theme="clinical-night"] .license-context,
html[data-theme="clinical-night"] .role-permissions-note {
    border-color: rgba(148, 163, 184, 0.18);
    background: rgba(15, 23, 42, 0.88);
}

html[data-theme="clinical-night"] .staff-editor-header {
    border-color: rgba(148, 163, 184, 0.18);
    background: rgba(15, 23, 42, 0.72);
}

html[data-theme="clinical-night"] .staff-editor-header h2,
html[data-theme="clinical-night"] .role-permissions-note h3,
html[data-theme="clinical-night"] .license-context h3,
html[data-theme="clinical-night"] .license-context-grid strong {
    color: #e2e8f0;
}

html[data-theme="clinical-night"] .staff-editor-header p:not(.staff-editor-eyebrow),
html[data-theme="clinical-night"] .staff-section-title span,
html[data-theme="clinical-night"] .role-permissions-note p,
html[data-theme="clinical-night"] .license-context p {
    color: #94a3b8;
}

html[data-theme="clinical-night"] .license-context-grid span,
html[data-theme="clinical-night"] .staff-cancel-button,
html[data-theme="clinical-night"] .staff-editor-icon {
    border-color: rgba(148, 163, 184, 0.2);
    background: rgba(30, 41, 59, 0.68);
}

@media (max-width: 700px) {
    .license-context-grid {
        grid-template-columns: 1fr;
    }

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
