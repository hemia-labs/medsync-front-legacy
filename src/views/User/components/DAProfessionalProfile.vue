<template>
    <section class="mt-6 border border-gray-200 bg-white p-5">
        <preparation-guide ref="profileGuide" v-if="!adminControlsOnly" branch="doctor-identity" :subject="idLogin" :signature-open="signaturePadVisible" :signature-has-ink="signatureHasInk" :signature-capture-label="signatureCaptureLabel" :action-label="saveButtonLabel" :save-state="guideSaveState" :dirty="hasUnsavedChanges" :busy="loading || saving" @focus-control="focusGuideControl" @skip-signature="signaturePadVisible=false" />
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
            <div>
                <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">{{ adminControlsOnly ? 'Autorizaciones profesionales' : 'Perfil profesional' }}</p>
                <h3 class="m-0 mt-1 text-gray-700 text-lg font-semibold">{{ adminControlsOnly ? 'Autorizaciones del doctor' : 'Datos del doctor' }}</h3>
                <p class="m-0 mt-1 text-gray-500 text-sm">{{ adminControlsOnly ? 'Controla si este doctor puede actuar como emisor o firmante profesional.' : 'Tu nombre identifica tu agenda. La cédula y la firma se utilizan al preparar recetas y documentos clínicos.' }}</p>
            </div>
            <da-button-primary ref="guideSave" v-if="!hideSaveButton" :disabled="loading || saving || !!loadError" @click.native="save" :label="saveButtonLabel" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
        </div>
        <p v-if="loading" role="status">Consultando perfil profesional…</p>
        <p v-if="loadError" role="alert" class="text-red-800">{{ loadError }} <button type="button" class="underline" @click="load">Reintentar</button></p>
        <p v-if="saveError" role="alert" class="mb-4 p-3 border border-red-200 bg-red-50 text-red-800">{{ saveError }}</p>
        <p v-if="!loading && !loadError" class="mb-4 text-sm text-gray-600" role="status">{{ saving ? 'Espera a que se confirme el resultado antes de salir.' : uncertainProfile ? 'El guardado está pendiente de confirmación.' : hasUnsavedChanges ? 'Tienes cambios sin guardar.' : 'Sin cambios pendientes.' }}</p>
        <template v-if="!loading && !loadError">

        <div v-if="warning" class="mb-4 px-4 py-3 border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
            {{ warning }}
        </div>

        <div class="mb-4 px-4 py-3 border text-sm" :class="form.is_active ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 bg-gray-50 text-gray-600'">
            {{ professionalProfileLicenseMessage }}
        </div>

        <div v-if="!adminControlsOnly" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <v-text-field ref="guideIdentity" v-model="form.professional_name" :disabled="saving" label="Nombre profesional" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field ref="guideLicense" v-model="form.professional_license" :disabled="saving" label="Cédula profesional" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field v-model="form.university" :disabled="saving" label="Universidad" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field v-model="form.specialty" :disabled="saving" label="Especialidad" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field v-model="form.specialty_license" :disabled="saving" label="Cédula de especialidad" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field ref="professionalPhone" v-model="form.professional_phone" :disabled="saving" :error-messages="professionalPhoneError" @input="professionalPhoneError = ''" label="Teléfono profesional (opcional)" inputmode="tel" hint="De 10 a 15 dígitos; puedes usar + al inicio, espacios, paréntesis o guiones." persistent-hint dense outlined :color="themePrimary"></v-text-field>
        </div>

        <div v-if="showAdminControls || adminControlsOnly" class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <v-checkbox ref="guideIssuer" v-model="form.can_issue_prescriptions" :disabled="saving" label="Autorizado como doctor emisor" :color="themePrimary" hide-details></v-checkbox>
            <v-checkbox ref="guideSigner" v-model="form.can_sign_documents" :disabled="saving" label="Autorizado como firmante profesional" :color="themePrimary" hide-details></v-checkbox>
            <v-checkbox v-model="form.is_active" :disabled="saving" label="Perfil activo" :color="themePrimary" hide-details></v-checkbox>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div class="px-3 py-2 border text-sm" :class="form.can_issue_prescriptions ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'">
                {{ form.can_issue_prescriptions ? 'Autorizado como doctor emisor' : 'Pendiente de autorizacion como doctor emisor' }}
            </div>
            <div class="px-3 py-2 border text-sm" :class="form.can_sign_documents ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'">
                {{ form.can_sign_documents ? 'Autorizado como firmante profesional' : 'Sin autorizacion como firmante profesional' }}
            </div>
            <div class="px-3 py-2 border text-sm" :class="form.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'">
                {{ !hasProfile ? 'Sin perfil creado' : form.is_active ? 'Perfil activo' : 'Perfil inactivo' }}
            </div>
        </div>
        <div v-if="!adminControlsOnly && (!form.can_issue_prescriptions || !form.can_sign_documents || !hasProfile)" class="my-4 p-4 border rounded-lg bg-yellow-50 text-yellow-900">
            <p>Completar tus datos no concede autorización para emitir o firmar. {{ canManageAuthorizations ? 'Como administrador, revisa por separado las autorizaciones del doctor en Personal y usuarios.' : 'Solicita al administrador del consultorio que revise las autorizaciones del doctor.' }}</p>
            <router-link v-if="canManageAuthorizations" to="/admin?section=users" target="_blank" rel="noopener" class="underline">Revisar autorizaciones (abre otra pestaña)</router-link>
        </div>

        <div ref="guideSignature" v-if="!adminControlsOnly" class="border border-gray-200 bg-gray-50 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p class="m-0 text-gray-700 font-semibold">Firma profesional</p>
                <da-button-secondary
                    ref="guideCapture"
                    :disabled="saving"
                    @click.native="signaturePadVisible = !signaturePadVisible"
                    :label="signatureCaptureLabel"
                    rxl
                    swpr
                    class="py-1 px-3 font-light"
                ></da-button-secondary>
            </div>

            <button v-if="form.signature_image && !signaturePadVisible" type="button" class="mb-3 text-sm underline" :disabled="saving" @click="removeSignature">Eliminar firma del perfil</button>
            <button v-if="form.signature_image && !signaturePadVisible" type="button" class="mb-3 ml-3 text-sm underline" :disabled="saving" @click="refreshSignature">Actualizar imagen</button>
            <da-signature-pad ref="guideSignaturePad" v-if="signaturePadVisible && !saving" required track-changes @changed="signatureHasInk=!$event.isEmpty" v-on:signed="onSigned"></da-signature-pad>
            <div v-else class="min-h-32 flex items-center justify-center text-center">
                <div v-if="form.signature_image" class="w-full">
                    <div class="h-24 bg-contain bg-center bg-no-repeat" :style="imageStyle(signaturePreview)"></div>
                    <p class="m-0 mt-2 text-sm text-gray-500">Firma capturada.</p>
                </div>
                <p v-else class="m-0 text-gray-500">Sin firma profesional.</p>
            </div>
        </div>
        </template>
    </section>
</template>

<script>
import PreparationGuide from '../../configuration/components/PreparationGuide.vue';
import { focusControl } from '../../../domain/onboarding/focusControl';
import { DAUserService } from '../../../services/context/core-proccess-context';
import { buildLicenseLimitMessage } from '../../../utils/licenseLimitMessage';
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { getSettingsSections } from '../../../security/settingsAccess';
import { confirmSettingsDiscard, registerSettingsNavigationGuard } from '../../../domain/settings/settings.navigation';

const emptyForm = () => ({
    professional_name: '',
    professional_license: '',
    university: '',
    specialty: '',
    specialty_license: '',
    professional_phone: '',
    signature_image: '',
    can_issue_prescriptions: false,
    can_sign_documents: false,
    is_active: true
});
const profileSnapshot = form => JSON.stringify(Object.fromEntries(Object.keys(emptyForm()).map(key => [key, form[key]])));
const profileForm = data => ({
    ...emptyForm(), ...(data || {}),
    can_issue_prescriptions: Boolean(data && Number(data.can_issue_prescriptions) === 1),
    can_sign_documents: Boolean(data && Number(data.can_sign_documents) === 1),
    is_active: data && data.is_active !== undefined ? Number(data.is_active) === 1 : true
});
const validateProfessionalPhone = value => {
    const message = 'El teléfono profesional debe contener de 10 a 15 dígitos. Puedes usar + al inicio, espacios, paréntesis o guiones, o dejar el campo vacío.';
    if(value === undefined || value === null || value === '') return { isValid: true, value: '' };
    if(typeof value !== 'string') return { isValid: false, message };
    const phone = value.trim();
    if(!phone) return { isValid: true, value: '' };
    const digits = phone.replace(/\D/g, '');
    if(!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 10 || digits.length > 15 || phone.length > 100) return { isValid: false, message };
    return { isValid: true, value: (phone.startsWith('+') ? '+' : '') + digits };
};

export default {
    components:{PreparationGuide},
    props: {
        idLogin: {
            type: String,
            required: true
        },
        showAdminControls: {
            type: Boolean,
            default: false
        },
        adminControlsOnly: {
            type: Boolean,
            default: false
        },
        hideSaveButton: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            form: emptyForm(),
            warning: '',
            signaturePadVisible: false, signatureHasInk:false,
            hasProfile:false, loading:false, loadError:'', saving:false, checkingProfile:false, loadRequest:0,
            saveError:'', professionalPhoneError:'', baseline:'', disposed:false, reloadAfterSave:false
            ,uncertainProfile:null
        };
    },
    computed: {
        ...mapGetters(moduleTypes.AUTH,{role:fnTypes.getRole,hasPermission:fnTypes.hasPermission}),
        signaturePreview() { return String(this.form.signature_image || '').startsWith('consultorios/') ? this.form.signature_url || '' : this.form.signature_image; },
        signatureCaptureLabel() { return this.signaturePadVisible ? 'Cancelar firma' : this.form.signature_image ? 'Cambiar firma' : 'Capturar firma'; },
        saveButtonLabel() { return this.saving ? (this.checkingProfile ? 'Comprobando…' : 'Guardando…') : this.uncertainProfile ? 'Comprobar guardado' : this.adminControlsOnly ? 'Guardar autorizaciones' : 'Guardar perfil'; },
        guideSaveState() { return this.loading ? 'loading' : this.saving ? 'saving' : this.uncertainProfile ? 'uncertain' : this.loadError || this.saveError ? 'error' : this.hasProfile && !this.hasUnsavedChanges ? 'saved' : 'idle'; },
        profileSessionKey() { const auth=this.$store && this.$store.state.CORE.AUTH;return auth ? JSON.stringify([auth.accessRevision,(auth.user || {}).id_login,(auth.business || {}).id_business]) : ''; },
        hasUnsavedChanges() { return Boolean(!this.loading && !this.loadError && this.baseline && (profileSnapshot(this.form) !== this.baseline || this.signaturePadVisible)); },
        canManageAuthorizations() {return getSettingsSections(this.role,this.hasPermission).some(section=>section.key==='users');},
        themePrimary() {
            return 'var(--color-primary-700)';
        },
        professionalProfileLicenseMessage() {
            if(!this.hasProfile) return this.adminControlsOnly
                ? 'El doctor aún no ha creado su perfil. Puede completar sus datos en Mi perfil profesional con su cuenta. Aquí administras sus autorizaciones; el cupo se revisa al guardar un perfil activo.'
                : 'Perfil sin crear. Completa tus datos y guárdalos para registrar tu perfil. El cupo se revisa al guardar un perfil activo.';
            if(this.form.is_active) {
                return 'Perfil activo: este usuario cuenta como profesional del plan si no tiene ya un rol profesional.';
            }
            return 'Perfil inactivo: este usuario no consume cupo profesional por perfil.';
        }
    },
    watch: {
        signaturePadVisible(){this.signatureHasInk=false;},
        profileSessionKey() {this.loadRequest++;this.saving=false;this.uncertainProfile=null;this.form=emptyForm();this.baseline='';this.hasProfile=false;if(this.idLogin)this.load({discardConfirmed:true});},
        idLogin: {
            immediate: true,
            handler(value) {
                if(this.saving) {
                    this.loadRequest++;
                    this.form = emptyForm(); this.baseline = ''; this.hasProfile = false;
                    this.loading = true; this.reloadAfterSave = true;
                    return;
                }
                if(value) {
                    this.load({ discardConfirmed: true });
                }
            }
        }
    },
    mounted() {
        this.signatureRefreshTimer=setInterval(()=>this.refreshSignature(),240000);
        if(!this.adminControlsOnly) this.removeSettingsGuard = registerSettingsNavigationGuard(this, {
            hasChanges: () => this.hasUnsavedChanges,
            isSaving: () => this.saving,
            onDiscard: () => this.discardChanges()
        });
    },
    beforeDestroy() {
        clearInterval(this.signatureRefreshTimer);
        this.disposed = true;
        this.loadRequest++;
        if(this.removeSettingsGuard) this.removeSettingsGuard();
    },
    methods: {
        removeSignature() { if(!this.saving){this.form.signature_image='';this.saveError='';this.warning=this.validationMessage();} },
        async refreshSignature() {
            const id=this.idLogin,key=this.profileSessionKey,source=this.form.signature_image;
            if(this.saving || !String(source || '').startsWith('consultorios/'))return;
            try {
                const result=await DAUserService.getProfessionalProfile(id);
                if(this.disposed || this.saving || id!==this.idLogin || key!==this.profileSessionKey || source!==this.form.signature_image)return;
                if(!result || !result.success)throw Error();
                if(result.data && result.data.signature_image===source)this.$set(this.form,'signature_url',result.data.signature_url);
                else this.saveError='La firma cambió en otra sesión. Vuelve a cargar el perfil para consultarla.';
            }catch(_){if(!this.disposed && key===this.profileSessionKey)this.saveError='No se pudo actualizar la imagen de la firma. Reintenta la consulta.';}
        },
        async matchesSavedProfile(saved, payload) {
            for(const field of Object.keys(payload)) {
                if(field==='signature_image' && String(payload[field]).startsWith('data:image/') && saved.signature_digest) {
                    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload[field]));
                    const digest=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
                    if(digest!==saved.signature_digest)return false;
                }else if(String(saved[field] == null ? '' : saved[field])!==String(payload[field] == null ? '' : payload[field]))return false;
            }
            return true;
        },
        focusGuideControl(id, reveal){const pad=this.$refs.guideSignaturePad;const drawing=pad && ['signature-capture','signature-apply'].includes(id);focusControl(drawing ? (id==='signature-apply' && this.signatureHasInk ? pad.$refs.applyButton : pad.$refs.signaturePad) : this.$refs[{identity:'guideIdentity',license:'guideLicense',signature:'guideCapture','signature-capture':'guideCapture',save:'guideSave'}[id]], reveal, drawing ? pad.$el : null);},
        async checkProfileSave() {
            const intent=this.uncertainProfile,id=this.idLogin,key=this.profileSessionKey,request=this.loadRequest;
            if(!intent || intent.id!==id)return;
            this.saving=true;this.checkingProfile=true;
            try {
                const result=await DAUserService.getProfessionalProfile(id);
                if(this.disposed || id!==this.idLogin || key!==this.profileSessionKey || request!==this.loadRequest)return;
                if(!result || !result.success)throw new Error();
                const saved=profileForm(result.data || {});
                const matches=result.data && await this.matchesSavedProfile(saved,intent.payload);
                if(this.disposed || id!==this.idLogin || key!==this.profileSessionKey || request!==this.loadRequest)return;
                if(matches){
                    if(profileSnapshot(this.form)===intent.submitted)this.form=saved;
                    this.baseline=profileSnapshot(saved);this.hasProfile=true;this.saveError='';this.uncertainProfile=null;this.$emit('saved',result.data);
                }else{
                    this.uncertainProfile=null;this.saveError='Lo guardado no coincide con esta captura. Tu captura sigue aquí. Revisa los datos antes de volver a guardar.';
                }
            }catch(_){if(!this.disposed && id===this.idLogin && key===this.profileSessionKey && request===this.loadRequest)this.saveError='No pudimos comprobar el perfil. Conserva esta pantalla e intenta comprobarlo otra vez.';}
            finally{if(!this.disposed && id===this.idLogin && key===this.profileSessionKey && request===this.loadRequest){this.saving=false;this.checkingProfile=false;}}
        },
        discardChanges() {
            if(this.baseline) this.form = { ...this.form, ...JSON.parse(this.baseline) };
            this.signaturePadVisible = false;
            this.saveError = '';
            this.professionalPhoneError = '';
        },
        async load(options = {}) {
            if(this.saving) return;
            if(this.hasUnsavedChanges && !options.discardConfirmed && !await confirmSettingsDiscard(this)) return;
            const id = this.idLogin, key=this.profileSessionKey, request=++this.loadRequest;this.loading=true;this.loadError='';this.saveError='';this.professionalPhoneError='';this.uncertainProfile=null;
            try {
            const response = await DAUserService.getProfessionalProfile(id);
            if(this.disposed || request!==this.loadRequest || id!==this.idLogin || key!==this.profileSessionKey)return;
            if(!response || !response.success)throw new Error();
            this.hasProfile=Boolean(response.data && response.data.id_doctor_professional_profile);
            if(response.success && response.data) {
                this.form = profileForm(response.data);
            }
            else {
                this.form = emptyForm();
            }
            this.warning = this.validationMessage();
            this.signaturePadVisible = false;
            this.baseline = profileSnapshot(this.form);
            } catch(_) {if(!this.disposed && request===this.loadRequest && id===this.idLogin && key===this.profileSessionKey){this.loadError='No se pudo cargar el perfil profesional. Reintenta para consultar su estado.';this.hasProfile=false;}}
            finally {if(!this.disposed && request===this.loadRequest && key===this.profileSessionKey)this.loading=false;}
        },
        validationMessage() {
            if(this.adminControlsOnly) {
                return '';
            }
            if(!this.form.professional_name || !this.form.professional_license || !this.form.signature_image) {
                return 'Para emitir recetas, completa nombre profesional, cédula profesional y firma. Para preparar tu agenda basta con guardar un perfil activo con tu nombre.';
            }
            return '';
        },
        async save() {
            if(this.loading || this.saving || this.loadError)return;
            if(this.uncertainProfile)return this.checkProfileSave();
            if(this.signaturePadVisible) {
                this.saveError = 'Aplica la firma que estás capturando o pulsa Cancelar firma antes de guardar el perfil.';
                return { success: false, message: this.saveError };
            }
            this.professionalPhoneError = '';
            const phone = validateProfessionalPhone(this.form.professional_phone);
            if(!phone.isValid && !this.adminControlsOnly) {
                this.professionalPhoneError = phone.message;
                this.saveError = 'Revisa el teléfono profesional. Tu captura se conserva.';
                this.$nextTick(() => { const field = this.$refs.professionalPhone; if(field && typeof field.focus === 'function') field.focus(); });
                return { success: false, message: this.saveError, data: { fieldErrors: { professional_phone: phone.message } } };
            }
            this.saving=true;
            this.saveError='';
            const id = this.idLogin, key=this.profileSessionKey, request = this.loadRequest, submitted = profileSnapshot(this.form);
            try {
            this.warning = this.validationMessage();
            const payload = this.adminControlsOnly ? {
                can_issue_prescriptions: this.form.can_issue_prescriptions,
                can_sign_documents: this.form.can_sign_documents,
                is_active: this.form.is_active
            } : { ...JSON.parse(submitted), professional_phone: phone.value };
            this.uncertainProfile={id,submitted,payload};
            const response = await DAUserService.saveProfessionalProfile(id, payload);
            if(this.disposed || id !== this.idLogin || request !== this.loadRequest || key!==this.profileSessionKey) return response;
            if(response && response.success && response.data) {
                this.uncertainProfile=null;
                this.hasProfile=Boolean(response.data && response.data.id_doctor_professional_profile);
                const saved = profileForm(response.data);
                // Disabled controls prevent normal edits during the request. Preserve
                // any later programmatic/input event instead of silently replacing it.
                if(profileSnapshot(this.form) === submitted) this.form = saved;
                this.baseline = profileSnapshot(saved);
                this.warning = this.validationMessage();
                this.$emit('saved', response.data);
                return response;
            }
            this.professionalPhoneError = response && response.data && response.data.fieldErrors && response.data.fieldErrors.professional_phone || '';
            if(response && response.status>=400 && response.status<500)this.uncertainProfile=null;
            this.saveError = buildLicenseLimitMessage(response, response && response.message || 'No fue posible guardar el perfil profesional. Tus cambios siguen aquí; reintenta.');
            if(this.uncertainProfile)this.saveError='No pudimos confirmar si se guardó el perfil. Pulsa Comprobar guardado para consultarlo sin reenviar tus datos.';
            this.$emit('error', this.saveError);
            return response;
            } catch(_) {
                if(!this.disposed && id === this.idLogin && request === this.loadRequest && key===this.profileSessionKey) {
                    this.saveError = 'No pudimos confirmar si se guardó el perfil. Pulsa Comprobar guardado para consultarlo sin reenviar tus datos.';
                    this.$emit('error', this.saveError);
                }
                return { success: false, message: this.saveError || 'No se pudo confirmar el guardado del perfil.' };
            } finally {
                if(!this.disposed && key===this.profileSessionKey)this.saving=false;
                if(this.reloadAfterSave && !this.disposed && key===this.profileSessionKey) {
                    this.reloadAfterSave=false;
                    if(this.idLogin) this.load({ discardConfirmed: true });
                    else this.loading=false;
                }
            }
        },
        onSigned(data) {
            if(this.saving) return;
            this.form.signature_image = data;
            this.signaturePadVisible = false;
            this.saveError = '';
            this.warning = this.validationMessage();
            this.$nextTick(()=>{if(this.$refs.profileGuide)this.$refs.profileGuide.goTo('save');});
        },
        imageStyle(image) {
            return `background-image: url('${image}')`;
        }
    }
};
</script>
