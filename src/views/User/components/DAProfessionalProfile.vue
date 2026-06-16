<template>
    <section class="mt-6 border border-gray-200 bg-white p-5">
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
            <div>
                <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">{{ adminControlsOnly ? 'Autorizaciones profesionales' : 'Perfil profesional' }}</p>
                <h3 class="m-0 mt-1 text-gray-700 text-lg font-semibold">{{ adminControlsOnly ? 'Autorizaciones del doctor' : 'Datos del doctor' }}</h3>
                <p class="m-0 mt-1 text-gray-500 text-sm">{{ adminControlsOnly ? 'Controla si este doctor puede actuar como emisor o firmante profesional.' : 'Estos datos se usan para emitir recetas y firmar documentos clinicos.' }}</p>
            </div>
            <da-button-primary v-if="!hideSaveButton" @click.native="save" :label="adminControlsOnly ? 'Guardar autorizaciones' : 'Guardar perfil'" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
        </div>

        <div v-if="warning" class="mb-4 px-4 py-3 border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
            {{ warning }}
        </div>

        <div class="mb-4 px-4 py-3 border text-sm" :class="form.is_active ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 bg-gray-50 text-gray-600'">
            {{ professionalProfileLicenseMessage }}
        </div>

        <div v-if="!adminControlsOnly" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <v-text-field v-model="form.professional_name" label="Nombre profesional" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field v-model="form.professional_license" label="Cedula profesional" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field v-model="form.university" label="Universidad" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field v-model="form.specialty" label="Especialidad" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field v-model="form.specialty_license" label="Cedula de especialidad" dense outlined :color="themePrimary"></v-text-field>
            <v-text-field v-model="form.professional_phone" label="Telefono profesional" dense outlined :color="themePrimary"></v-text-field>
        </div>

        <div v-if="showAdminControls || adminControlsOnly" class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <v-checkbox v-model="form.can_issue_prescriptions" label="Autorizado como doctor emisor" :color="themePrimary" hide-details></v-checkbox>
            <v-checkbox v-model="form.can_sign_documents" label="Autorizado como firmante profesional" :color="themePrimary" hide-details></v-checkbox>
            <v-checkbox v-model="form.is_active" label="Perfil activo" :color="themePrimary" hide-details></v-checkbox>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div class="px-3 py-2 border text-sm" :class="form.can_issue_prescriptions ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'">
                {{ form.can_issue_prescriptions ? 'Autorizado como doctor emisor' : 'Pendiente de autorizacion como doctor emisor' }}
            </div>
            <div class="px-3 py-2 border text-sm" :class="form.can_sign_documents ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'">
                {{ form.can_sign_documents ? 'Autorizado como firmante profesional' : 'Sin autorizacion como firmante profesional' }}
            </div>
            <div class="px-3 py-2 border text-sm" :class="form.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'">
                {{ form.is_active ? 'Perfil activo' : 'Perfil inactivo' }}
            </div>
        </div>

        <div v-if="!adminControlsOnly" class="border border-gray-200 bg-gray-50 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p class="m-0 text-gray-700 font-semibold">Firma profesional</p>
                <da-button-secondary
                    @click.native="signaturePadVisible = !signaturePadVisible"
                    :label="signaturePadVisible ? 'Cancelar firma' : (form.signature_image ? 'Cambiar firma' : 'Capturar firma')"
                    rxl
                    swpr
                    class="py-1 px-3 font-light"
                ></da-button-secondary>
            </div>

            <da-signature-pad v-if="signaturePadVisible" required v-on:signed="onSigned"></da-signature-pad>
            <div v-else class="min-h-32 flex items-center justify-center text-center">
                <div v-if="form.signature_image" class="w-full">
                    <div class="h-24 bg-contain bg-center bg-no-repeat" :style="imageStyle(form.signature_image)"></div>
                    <p class="m-0 mt-2 text-sm text-gray-500">Firma capturada.</p>
                </div>
                <p v-else class="m-0 text-gray-500">Sin firma profesional.</p>
            </div>
        </div>
    </section>
</template>

<script>
import { DAUserService } from '../../../services/context/core-proccess-context';
import { buildLicenseLimitMessage } from '../../../utils/licenseLimitMessage';

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

export default {
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
            signaturePadVisible: false
        };
    },
    computed: {
        themePrimary() {
            return 'var(--color-primary-700)';
        },
        professionalProfileLicenseMessage() {
            if(this.form.is_active) {
                return 'Perfil activo: este usuario cuenta como profesional del plan si no tiene ya un rol profesional.';
            }
            return 'Perfil inactivo: este usuario no consume cupo profesional por perfil.';
        }
    },
    watch: {
        idLogin: {
            immediate: true,
            handler(value) {
                if(value) {
                    this.load();
                }
            }
        }
    },
    methods: {
        async load() {
            const response = await DAUserService.getProfessionalProfile(this.idLogin);
            if(response.success && response.data) {
                this.form = {
                    ...emptyForm(),
                    ...response.data,
                    can_issue_prescriptions: response.data.can_issue_prescriptions !== 0,
                    can_sign_documents: response.data.can_sign_documents === 1,
                    is_active: response.data.is_active !== 0
                };
            }
            else {
                this.form = emptyForm();
            }
            this.warning = this.validationMessage();
            this.signaturePadVisible = false;
        },
        validationMessage() {
            if(this.adminControlsOnly) {
                return '';
            }
            if(!this.form.professional_name || !this.form.professional_license || !this.form.signature_image) {
                return 'Para emitir recetas, completa nombre profesional, cedula profesional y firma.';
            }
            return '';
        },
        async save() {
            this.warning = this.validationMessage();
            const payload = this.showAdminControls
                ? this.form
                : {
                    ...this.form,
                    can_issue_prescriptions: this.form.can_issue_prescriptions,
                    can_sign_documents: this.form.can_sign_documents,
                    is_active: this.form.is_active
                };
            const response = await DAUserService.saveProfessionalProfile(this.idLogin, payload);
            if(response.success) {
                this.form = {
                    ...this.form,
                    ...response.data,
                    can_issue_prescriptions: response.data.can_issue_prescriptions !== 0,
                    can_sign_documents: response.data.can_sign_documents === 1,
                    is_active: response.data.is_active !== 0
                };
                this.warning = this.validationMessage();
                this.$emit('saved', response.data);
                return response;
            }
            this.$emit('error', buildLicenseLimitMessage(response, response.message || 'No fue posible guardar el perfil profesional.'));
            return response;
        },
        onSigned(data) {
            this.form.signature_image = data;
            this.signaturePadVisible = false;
            this.warning = this.validationMessage();
        },
        imageStyle(image) {
            return `background-image: url('${image}')`;
        }
    }
};
</script>
