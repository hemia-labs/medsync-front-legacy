<template>
    <section class="bg-white bg-opacity-95 border border-primary-200 shadow-xl">
        <preparation-guide branch="prescriptions" :subject="selectedDoctorId" :personal-scope="!doctorProfile || doctorProfile.id_login === (authUser || {}).id_login" :dirty="dirty" :busy="loading || saving" :verify-editor="verifySavedFormat" @focus-control="focusGuideControl" />
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 px-7 py-5 border-b border-primary-200 bg-primary-100">
            <div>
                <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Recetas medicas</p>
                <h2 class="m-0 text-gray-600 text-2xl font-normal">Datos para receta medica</h2>
                <p class="m-0 mt-2 text-gray-500 text-sm">Cada doctor tiene su propio formato de receta. Su identidad, cedula y firma vienen de su perfil profesional.</p>
            </div>
            <da-button-primary ref="guideSave" :disabled="!selectedDoctorId || loading || saving || !!loadError" @click.native="save()" :label="saving ? 'Guardando…' : 'Guardar recetas'" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
        </div>

        <div ref="guideDoctor" class="px-7 pt-5">
            <v-select :key="selectedDoctorId + '-' + selectorRevision" :value="selectedDoctorId" :items="doctorOptions" item-text="label" item-value="id" label="Configuración de recetas del doctor" no-data-text="No hay doctores con perfil activo" :readonly="doctorOptions.length === 1" :disabled="loading || saving || !doctorOptions.length" outlined dense :color="themeColor" @change="chooseDoctor"></v-select>
            <div v-if="!loading && !loadError && !doctorOptions.length" role="status" class="mb-4 p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-900">
                <p>Primero completa y guarda el perfil profesional del doctor. Después podrás revisar el formato de sus recetas. La autorización para emitir se revisa por separado.</p>
                <router-link v-if="canManageAllDoctors && hasPermission('admin.users')" to="/admin?section=users">Revisar profesionales del consultorio</router-link>
                <router-link v-else to="/admin?section=doctor-identity" class="underline">Completar mi perfil profesional</router-link>
            </div>
            <p v-else-if="!selectedDoctorId && !loading">Selecciona el doctor cuyo formato quieres configurar.</p>
            <p v-if="loading" role="status">Cargando formato del doctor…</p>
            <p v-if="loadError" role="alert" class="text-red-700">{{ loadError }} <button type="button" @click="selectedDoctorId ? load() : init()">Reintentar</button></p>
            <p v-if="selectedDoctorId && !loading && !loadError" role="status" class="mb-3 text-sm text-gray-600">{{ dirty ? 'Tienes cambios sin guardar. ' : '' }}{{ isFormatReady ? 'Domicilio y teléfono completos. La emisión también requiere perfil y autorización del doctor.' : 'Preparación pendiente: completa el domicilio y un teléfono válido antes de guardar el formato.' }} Los controles cambian la vista previa; pulsa Guardar recetas para conservarlos.</p>
            <div v-if="submitAttempted && Object.keys(configErrors).length" ref="validationSummary" role="alert" tabindex="-1" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                <strong>Revisa los datos del formato</strong>
                <ul class="mt-2 pl-4"><li v-for="(error, field) in configErrors" :key="field">{{ error }}</li></ul>
            </div>
            <p v-if="saveError" role="alert" class="mb-4 text-red-700">{{ saveError }}</p>
        </div>
        <div v-if="selectedDoctorId && !loading && !loadError" class="grid grid-cols-1 lg:grid-cols-5 gap-6 p-7">
            <article ref="guideContact" class="lg:col-span-3 border border-gray-200 bg-white shadow-md p-5">
                <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Consultorio</p>
                <h3 class="m-0 text-gray-700 text-lg font-semibold">Datos del consultorio</h3>
                <div v-if="!form.id_prescription_config && hasPermission('admin.config')" class="mt-3">
                    <button type="button" class="contact-copy" :disabled="saving || copyingContact" @click="copyClinicContact">{{ copyingContact ? 'Consultando…' : 'Usar datos del consultorio' }}</button>
                    <p class="text-sm mt-2">Copia nombre, teléfono y domicilio de Datos del consultorio. Puedes editarlos antes de guardar este formato.</p>
                    <p v-if="contactMessage" role="status">{{ contactMessage }}</p>
                </div>
                <div v-if="doctorProfileWarning" class="mt-4 mb-4 px-4 py-3 border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
                    {{ doctorProfileWarning }}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    <v-text-field v-model="form.clinic_name" :disabled="saving" label="Consultorio o clínica (opcional)" dense outlined :color="themeColor"></v-text-field>
                    <v-text-field ref="guidePhone" v-model="form.clinic_phone" :disabled="saving" label="Teléfono de contacto (obligatorio)" inputmode="tel" maxlength="100" hint="De 10 a 15 dígitos. Puedes usar +, espacios, paréntesis o guiones." persistent-hint :error-messages="configFieldErrors('clinic_phone')" @blur="touchConfigField('clinic_phone')" dense outlined :color="themeColor"></v-text-field>
                    <v-select
                        v-model="form.template_mode"
                        :items="templateModes"
                        item-text="text"
                        item-value="value"
                        label="Plantilla"
                        :disabled="saving"
                        dense
                        outlined
                        :color="themeColor"
                    ></v-select>
                </div>
                <p class="m-0 -mt-2 mb-4 text-xs text-gray-500">La plantilla de cabecera es la recomendada para lectura e impresión.</p>

                <v-textarea ref="guideAddress" v-model="form.clinic_address" :disabled="saving" label="Domicilio completo del consultorio (obligatorio)" maxlength="2000" :error-messages="configFieldErrors('clinic_address')" @blur="touchConfigField('clinic_address')" rows="2" outlined :color="themeColor"></v-textarea>
                <v-textarea v-model="form.footer_note" :disabled="saving" label="Nota inferior o texto legal (opcional)" rows="2" outlined :color="themeColor"></v-textarea>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <v-checkbox v-model="form.show_university" :disabled="saving" label="Mostrar universidad" :color="themeColor" hide-details></v-checkbox>
                    <v-checkbox v-model="form.show_specialty" :disabled="saving" label="Mostrar especialidad" :color="themeColor" hide-details></v-checkbox>
                    <v-checkbox v-model="form.show_footer_note" :disabled="saving" label="Mostrar nota inferior" :color="themeColor" hide-details></v-checkbox>
                </div>
            </article>

            <article class="lg:col-span-2 border border-gray-200 bg-white shadow-md p-5">
                <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Imagenes</p>
                <h3 class="m-0 text-gray-700 text-lg font-semibold">Cabecera y fondo</h3>
                <p class="m-0 mt-1 text-gray-500 text-sm">Usa PNG, JPG o WEBP. Mantener imagenes ligeras mejora la carga.</p>

                <div class="space-y-4 mt-5">
                    <div>
                        <label class="text-sm text-gray-600 font-semibold">Imagen de cabecera</label>
                        <input ref="headerInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="readImage($event, 'header_image')">
                        <div class="flex flex-wrap items-center gap-2 mt-2">
                            <da-button-secondary :disabled="saving" @click.native="$refs.headerInput.click()" :label="'Seleccionar cabecera'" rxl swpr class="py-1 px-3 font-light"></da-button-secondary>
                            <span class="text-sm text-gray-500">{{ form.header_image ? 'Imagen lista' : 'Sin archivo' }}</span>
                        </div>
                        <div v-if="form.header_image" class="mt-2 h-24 border border-gray-200 bg-gray-50 bg-contain bg-center bg-no-repeat" :style="imageStyle(form.header_image)"></div>
                    </div>

                    <div>
                        <label class="text-sm text-gray-600 font-semibold">Imagen de fondo</label>
                        <input ref="backgroundInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="readImage($event, 'background_image')">
                        <div class="flex flex-wrap items-center gap-2 mt-2">
                            <da-button-secondary :disabled="saving" @click.native="$refs.backgroundInput.click()" :label="'Seleccionar fondo'" rxl swpr class="py-1 px-3 font-light"></da-button-secondary>
                            <span class="text-sm text-gray-500">{{ form.background_image ? 'Imagen lista' : 'Sin archivo' }}</span>
                        </div>
                        <p class="m-0 mt-2 text-xs text-gray-500">Asegurate de que el fondo no afecte la lectura de la receta.</p>
                        <v-slider v-if="form.template_mode === 'background'" :value="Math.round(Number(form.background_opacity) * 100)" :disabled="saving" min="0" max="100" step="5" label="Intensidad del fondo (%)" thumb-label="always" class="mt-8" :color="themeColor" @input="form.background_opacity = $event / 100"></v-slider>
                    </div>
                </div>
            </article>

            <article v-if="false" class="lg:col-span-5 border border-gray-200 bg-white shadow-md p-5">
                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                    <div>
                        <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Firma del doctor</p>
                        <h3 class="m-0 text-gray-700 text-lg font-semibold">Firma para recetas</h3>
                        <p class="m-0 mt-1 text-gray-500 text-sm">Captura la firma que aparecera en la receta impresa y en PDF.</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <da-button-secondary
                            v-if="!signaturePadVisible"
                            @click.native="startSignatureCapture"
                            :label="form.signature_image ? 'Cambiar firma' : 'Capturar firma'"
                            rxl
                            swpr
                            class="py-1 px-3 font-light"
                        ></da-button-secondary>
                        <da-button-secondary
                            v-if="signaturePadVisible"
                            @click.native="cancelSignatureCapture"
                            :label="'Cancelar'"
                            rxl
                            swpr
                            class="py-1 px-3 font-light"
                        ></da-button-secondary>
                    </div>
                </div>

                <da-signature-pad
                    v-if="signaturePadVisible"
                    required
                    v-on:signed="onPrescriptionSignatureSigned"
                ></da-signature-pad>

                <div v-else class="min-h-40 border border-gray-200 bg-gray-50 flex items-center justify-center text-center p-6">
                    <div v-if="form.signature_image" class="w-full">
                        <div class="h-28 bg-contain bg-center bg-no-repeat" :style="imageStyle(form.signature_image)"></div>
                        <p class="m-0 mt-2 text-sm text-gray-500">Firma capturada. Guarda los cambios para conservarla.</p>
                    </div>
                    <div v-else>
                        <v-icon color="#9CA3AF" size="42">mdi-draw-pen</v-icon>
                        <p class="m-0 mt-2 text-gray-600 font-semibold">Aún no hay firma para recetas</p>
                        <p class="m-0 mt-1 text-sm text-gray-500">Usa “Capturar firma” para agregarla.</p>
                    </div>
                </div>
            </article>

            <article ref="guidePreview" class="lg:col-span-5 border border-gray-200 bg-gray-50 p-5">
                <h3 class="m-0 text-lg font-semibold text-gray-700">Vista previa del formato</h3>
                <p class="my-2 text-sm text-gray-500">Usa datos de ejemplo y el mismo formato de impresión. El tamaño de la hoja se adapta aquí a tu pantalla.</p>
                <iframe title="Vista previa del formato de receta con datos de ejemplo" sandbox="" :srcdoc="previewHtml" class="prescription-preview w-full border border-gray-200 bg-white" style="height: 680px;"></iframe>
            </article>
        </div>
        <v-dialog v-model="leaveOpen" persistent max-width="520"><v-card class="p-5"><h3 class="text-xl font-semibold text-gray-700">Cambios sin guardar</h3><p>Guarda este formato antes de cambiar de doctor o descarta los cambios.</p><div class="flex flex-wrap gap-2"><v-btn :color="themeColor" dark :loading="saving" @click="saveAndSwitch">Guardar y cambiar</v-btn><v-btn outlined :disabled="saving" @click="switchDoctor(pendingDoctor)">Descartar cambios</v-btn><v-btn text :disabled="saving" @click="leaveOpen = false">Seguir editando</v-btn></div></v-card></v-dialog>
    </section>
</template>

<script>
import PreparationGuide from './PreparationGuide.vue';
import { focusControl } from '../../../domain/onboarding/focusControl';
import { authorizationContext, isCurrentAuthorization } from '../../../security/authorizationContext';
import { registerSettingsNavigationGuard } from '../../../domain/settings/settings.navigation';
import { DAPrescriptionService, DABusinessService } from '../../../services/context/core-proccess-context';
import { mapGetters } from 'vuex';
import { isTenantAdministrator } from '../../../security/settingsAccess';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { buildPrescriptionPreviewHtml } from '../../../domain/prescriptions/prescription.print';

const emptyForm = () => ({
    doctor_name: '',
    professional_license: '',
    university: '',
    specialty: '',
    specialty_license: '',
    clinic_name: '',
    clinic_address: '',
    clinic_phone: '',
    header_image: '',
    background_image: '',
    footer_note: '',
    template_mode: 'header',
    background_opacity: 0.10,
    show_specialty: true,
    show_university: true,
    show_footer_note: true,
});

export default {
    components:{PreparationGuide},
    props: {
        themeColor: {
            type: String,
            default: '#1497BD'
        }
    },
    data() {
        return {
            form: emptyForm(),
            doctors: [], selectedDoctorId: '', loading: false, saving: false, loadError: '', request: 0,
            disposed:false, uncertainIntent:null, baseline: '', leaveOpen: false, pendingDoctor: '', selectorRevision: 0,
            doctorProfile: {},
            submitAttempted: false, touchedConfigFields: {}, saveError: '', copyingContact:false, contactMessage:'',
            signaturePadVisible: false,
            templateModes: [
                { text: 'Cabecera', value: 'header' },
                { text: 'Fondo', value: 'background' }
            ]
        };
    },
    mounted() {
        this.init();
        this.removeNavigationGuard = registerSettingsNavigationGuard(this,{hasChanges:()=>this.dirty || !!this.uncertainIntent,isSaving:()=>this.saving});
    },
    beforeDestroy() { this.disposed=true; this.request++; if(this.removeNavigationGuard)this.removeNavigationGuard(); },
    computed: {
        ...mapGetters(moduleTypes.AUTH, { authUser: fnTypes.getUser, hasPermission: fnTypes.hasPermission, role:fnTypes.getRole }),
        canManageAllDoctors() { return isTenantAdministrator(this.role) && this.hasPermission('admin.config'); },
        doctorOptions() { return this.doctors.filter(d => this.canManageAllDoctors || d.id_login === (this.authUser || {}).id_login).map(d => ({id:d.id_doctor_professional_profile,label:d.professional_name || d.name})); },
        dirty() { return !!this.baseline && JSON.stringify(this.form) !== this.baseline; },
        configErrors() {
            const errors = {};
            if(!String(this.form.clinic_address || '').trim()) errors.clinic_address = 'Indica el domicilio del consultorio.';
            else if(String(this.form.clinic_address).trim().length > 2000) errors.clinic_address = 'El domicilio admite hasta 2000 caracteres.';
            const phone = String(this.form.clinic_phone || '').trim(), digits = phone.replace(/\D/g, '');
            if(!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 10 || digits.length > 15 || phone.length > 100) errors.clinic_phone = 'Ingresa un teléfono de contacto de 10 a 15 dígitos.';
            return errors;
        },
        isFormatReady() { return Object.keys(this.configErrors).length === 0; },
        previewHtml() { return buildPrescriptionPreviewHtml(this.form, this.doctorProfile); },
        doctorProfileWarning() {
            if(!this.doctorProfile || !this.doctorProfile.id_doctor_professional_profile) {
                return this.doctorProfile && this.doctorProfile.id_login!==((this.authUser || {}).id_login) ? 'El profesional necesita completar su identidad y firma desde su sesión. Puedes preparar su formato sin capturar esos datos.' : 'Para emitir recetas, completa tu identidad y firma en Mi perfil profesional.';
            }
            if(!this.doctorProfile.professional_name || !this.doctorProfile.professional_license || !this.doctorProfile.signature_image) {
                return this.doctorProfile && this.doctorProfile.id_login!==((this.authUser || {}).id_login) ? 'El profesional necesita completar su identidad y firma desde su sesión. Puedes preparar su formato sin capturar esos datos.' : 'Para emitir recetas, completa tu identidad y firma en Mi perfil profesional.';
            }
            return '';
        }
    },
    methods: {
        async copyClinicContact(){
            if(this.saving || this.loading || this.copyingContact || this.form.id_prescription_config || !this.hasPermission('admin.config'))return;
            const subject=this.selectedDoctorId,request=this.request,context=authorizationContext(this.$store);
            const before=JSON.stringify([this.form.clinic_name,this.form.clinic_phone,this.form.clinic_address]);
            this.copyingContact=true;this.contactMessage='';
            try{
                const response=await DABusinessService.getCurrent();
                if(!this.requestCurrent(request,context) || subject!==this.selectedDoctorId || this.saving || this.form.id_prescription_config)return;
                if(!response || !response.success || !response.data)throw Error();
                if(before!==JSON.stringify([this.form.clinic_name,this.form.clinic_phone,this.form.clinic_address])){this.contactMessage='Conservamos lo que acabas de escribir. Pulsa de nuevo para copiar los datos del consultorio.';return;}
                this.form.clinic_name=response.data.name || '';this.form.clinic_phone=response.data.phone || '';this.form.clinic_address=response.data.address || '';
                this.contactMessage='Datos copiados del consultorio. Revisa los campos y pulsa Guardar recetas.';
            }catch(_){if(this.requestCurrent(request,context))this.contactMessage='No pudimos consultar el contacto. Puedes reintentar o escribirlo en estos campos.';}
            finally{if(!this.disposed)this.copyingContact=false;}
        },
        focusGuideControl(id, reveal){focusControl(this.$refs[{doctor:'guideDoctor',contact:'guidePhone',address:'guideAddress',preview:'guidePreview',save:'guideSave'}[id]], reveal);},
        requestCurrent(request, context){return !this.disposed && request===this.request && isCurrentAuthorization(context,this.$store);},
        formatContent(form){return JSON.stringify(['clinic_name','clinic_address','clinic_phone','header_image','background_image','footer_note','template_mode','background_opacity','show_specialty','show_university','show_footer_note'].map(key=>key.startsWith('show_') ? !!Number(form[key]) : key==='background_opacity' ? Number(form[key]) : String(form[key] || '').trim()));},
        async verifySavedFormat(){
            if(!this.selectedDoctorId)return 'Selecciona el doctor cuyo formato quieres comprobar.';
            const subject=this.selectedDoctorId,request=this.request,context=authorizationContext(this.$store);
            const response=await DAPrescriptionService.getConfig(subject);
            if(!this.requestCurrent(request,context) || subject!==this.selectedDoctorId)throw Error();
            if(!response || !response.success || !response.data || response.data.doctor_profile_id!==subject)throw Error();
            const saved=response.data;
            if(this.uncertainIntent){
                if(saved.id_prescription_config && this.formatContent(saved)===this.uncertainIntent.content){
                    this.baseline=JSON.stringify({...this.uncertainIntent.form,...saved});this.uncertainIntent=null;this.saveError='';
                }else if(this.formatContent(saved)===this.uncertainIntent.before){this.uncertainIntent=null;this.saveError='La lectura conserva el formato anterior. Revisa tu captura antes de volver a guardar.';}
                else {this.saveError='El formato guardado es distinto. Conservamos tu captura; revisa el estado con el administrador antes de reemplazarlo.';}
            }
            return {ready:!!saved.id_prescription_config && !this.uncertainIntent && !!String(saved.clinic_address || '').trim() && /^\+?[\d\s().-]+$/.test(saved.clinic_phone || '') && String(saved.clinic_phone || '').replace(/\D/g,'').length>=10,detail:saved.id_prescription_config ? 'Formato propio guardado para este doctor. La emisión comprueba además su identidad, firma, autorización y los datos de la receta.' : 'Todavía no hay un formato propio guardado. Completa los campos o usa los datos del consultorio y revísalos antes de guardar.'};
        },
        touchConfigField(field) { this.$set(this.touchedConfigFields, field, true); },
        configFieldErrors(field) { return (this.submitAttempted || this.touchedConfigFields[field]) && this.configErrors[field] ? [this.configErrors[field]] : []; },
        async init() {
            const request=++this.request,context=authorizationContext(this.$store);
            this.loading = true; this.loadError = '';
            try {
            const response = await DAPrescriptionService.doctors();
            if(!this.requestCurrent(request,context))return;
            if(!response.success) { this.loadError = response.message || 'No se pudieron cargar los doctores.'; return; }
            this.doctors = (response.data || []).filter(d => d.id_doctor_professional_profile && Number(d.professional_profile_active) === 1);
            const own = this.doctors.find(d => d.id_login === (this.authUser || {}).id_login);
            const requested=this.$route && this.$route.query.doctor;
            this.selectedDoctorId = this.doctorOptions.some(d=>d.id===requested) ? requested : own ? own.id_doctor_professional_profile : this.doctorOptions.length === 1 ? this.doctorOptions[0].id : '';
            if(this.selectedDoctorId) await this.load();
            } catch(error) { if(this.requestCurrent(request,context))this.loadError = 'No se pudieron cargar los doctores. Reintenta.'; }
            finally { if(this.requestCurrent(request,context))this.loading = false; }
        },
        chooseDoctor(id) { if(this.saving)return; if(this.dirty || this.uncertainIntent) {this.selectorRevision++;this.pendingDoctor=id;this.leaveOpen=true;} else this.switchDoctor(id); },
        switchDoctor(id) {this.uncertainIntent=null;this.leaveOpen=false;this.selectedDoctorId=id;this.load();},
        async saveAndSwitch() {if(await this.save() && !this.dirty)this.switchDoctor(this.pendingDoctor);},
        async load() {
            if(!this.selectedDoctorId) return;
            const request = ++this.request,context=authorizationContext(this.$store); this.loading = true; this.loadError = '';this.contactMessage='';
            try {
            const response = await DAPrescriptionService.getConfig(this.selectedDoctorId);
            if(!this.requestCurrent(request,context)) return;
            if(!response.success) throw new Error(response.message || 'No se pudo cargar el formato.');
            if(response.data.doctor_profile_id !== this.selectedDoctorId) throw new Error('El formato recibido no corresponde al doctor seleccionado. Reintenta la carga.');
            this.form = emptyForm();
            if(response.success && response.data) {
                this.form = {
                    ...emptyForm(),
                    ...response.data,
                    background_opacity: response.data.background_opacity == null ? 0.1 : Number(response.data.background_opacity),
                    show_specialty: response.data.show_specialty !== 0,
                    show_university: response.data.show_university !== 0,
                    show_footer_note: response.data.show_footer_note !== 0,
                };
            }
            this.doctorProfile = response.data && response.data.doctor_profile || {};
            this.submitAttempted = false; this.touchedConfigFields = {}; this.saveError = '';
            this.baseline = JSON.stringify(this.form);
            this.signaturePadVisible = false;
            } catch(error) { if(this.requestCurrent(request,context))this.loadError = error.message; }
            finally { if(this.requestCurrent(request,context))this.loading = false; }
        },
        async save() {
            if(this.loading || this.saving || this.loadError || !this.selectedDoctorId) return false;
            if(this.uncertainIntent){try{await this.verifySavedFormat();}catch(_){this.saveError='No pudimos comprobar el guardado anterior. Reintenta la comprobación; no se enviaron cambios otra vez.';}return false;}
            if(!this.dirty && this.form.id_prescription_config){try{await this.verifySavedFormat();return true;}catch(_){this.saveError='No pudimos comprobar el formato guardado.';return false;}}
            const request=this.request,context=authorizationContext(this.$store);
            this.submitAttempted = true; this.saveError = '';
            if(!this.isFormatReady) { this.$nextTick(() => { if(this.$refs.validationSummary) this.$refs.validationSummary.focus(); }); return false; }
            this.saving = true;
            try {
            const submittedForm = {...this.form};
            const submittedText = JSON.stringify(submittedForm);
            const payload = {
                doctor_profile_id: this.selectedDoctorId,
                clinic_name: this.form.clinic_name,
                clinic_address: this.form.clinic_address.trim(),
                clinic_phone: this.form.clinic_phone.trim(),
                header_image: this.form.header_image,
                background_image: this.form.background_image,
                footer_note: this.form.footer_note,
                template_mode: this.form.template_mode,
                background_opacity: this.form.background_opacity,
                show_specialty: this.form.show_specialty,
                show_university: this.form.show_university,
                show_footer_note: this.form.show_footer_note,
            };
            this.uncertainIntent={form:submittedForm,content:this.formatContent(payload),before:this.formatContent(JSON.parse(this.baseline || '{}'))};
            const response = await DAPrescriptionService.saveConfig(payload);
            if(!this.requestCurrent(request,context))return false;
            if(response.success) {
                this.uncertainIntent=null;
                const savedForm = {
                    ...submittedForm,
                    ...response.data,
                    show_specialty: response.data.show_specialty !== 0,
                    show_university: response.data.show_university !== 0,
                    show_footer_note: response.data.show_footer_note !== 0,
                };
                if(JSON.stringify(this.form) === submittedText) this.form = savedForm;
                this.$emit('saved');
                this.baseline = JSON.stringify(savedForm);
                return true;
            }

            if(Number(response.status)<500)this.uncertainIntent=null;
            this.saveError = this.uncertainIntent ? 'No se pudo confirmar el guardado. Comprueba el estado antes de reenviar; tu captura se conserva.' : response.message || 'No fue posible guardar los datos de recetas. Tus cambios se conservaron.';
            this.$emit('error', this.saveError);
            return false;
            } catch(error) { if(this.requestCurrent(request,context)){this.saveError = 'No se pudo confirmar el guardado. Comprueba el estado antes de reenviar; tu captura se conserva.'; this.$emit('error', this.saveError);}return false; }
            finally { if(this.requestCurrent(request,context))this.saving = false; }
        },
        readImage(event, field) {
            if(this.saving) return;
            const file = event.target.files && event.target.files[0];
            if(!file) {
                return;
            }

            if(!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                this.$emit('error', 'Formato no permitido. Usa JPG, PNG o WEBP.');
                return;
            }

            if(file.size > 2 * 1024 * 1024) {
                this.$emit('error', 'La imagen no debe superar 2 MB.');
                return;
            }

            const reader = new FileReader();
            const doctorId = this.selectedDoctorId,request=this.request,context=authorizationContext(this.$store);
            reader.onload = () => {
                if(this.requestCurrent(request,context) && doctorId === this.selectedDoctorId) this.form[field] = reader.result;
            };
            reader.readAsDataURL(file);
        },
        startSignatureCapture() {
            this.signaturePadVisible = true;
        },
        cancelSignatureCapture() {
            this.signaturePadVisible = false;
        },
        onPrescriptionSignatureSigned(data) {
            this.form.signature_image = data;
            this.signaturePadVisible = false;
        },
        imageStyle(image) {
            return `background-image: url('${image}')`;
        }
    }
};
</script>
<style scoped>
.contact-copy{min-height:44px;padding:10px 14px;border:1px solid #0e6970;border-radius:8px;color:#075c64;font-weight:600}
.contact-copy:focus-visible{outline:3px solid #996000;outline-offset:3px}
.contact-copy:disabled{opacity:.55}
</style>
