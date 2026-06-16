<template>
    <section class="bg-white bg-opacity-95 border border-primary-200 shadow-xl">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 px-7 py-5 border-b border-primary-200 bg-primary-100">
            <div>
                <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Recetas medicas</p>
                <h2 class="m-0 text-gray-600 text-2xl font-normal">Datos para receta medica</h2>
                <p class="m-0 mt-2 text-gray-500 text-sm">Configura plantilla visual y datos del consultorio. Los datos profesionales vienen del perfil del doctor.</p>
            </div>
            <da-button-primary @click.native="save()" :label="'Guardar recetas'" rxl swpr class="py-1 px-3 font-light"></da-button-primary>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 p-7">
            <article class="lg:col-span-3 border border-gray-200 bg-white shadow-md p-5">
                <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Consultorio</p>
                <h3 class="m-0 text-gray-700 text-lg font-semibold">Datos del consultorio</h3>
                <div v-if="doctorProfileWarning" class="mt-4 mb-4 px-4 py-3 border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
                    {{ doctorProfileWarning }}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    <v-text-field v-model="form.clinic_name" label="Consultorio o clinica" dense outlined :color="themeColor"></v-text-field>
                    <v-text-field v-model="form.clinic_phone" label="Telefono de contacto" dense outlined :color="themeColor"></v-text-field>
                    <v-select
                        v-model="form.template_mode"
                        :items="templateModes"
                        item-text="text"
                        item-value="value"
                        label="Plantilla"
                        dense
                        outlined
                        :color="themeColor"
                    ></v-select>
                </div>
                <p class="m-0 -mt-2 mb-4 text-xs text-gray-500">La plantilla de cabecera es la recomendada para lectura e impresion.</p>

                <v-textarea v-model="form.clinic_address" label="Domicilio completo del consultorio" rows="2" outlined :color="themeColor"></v-textarea>
                <v-textarea v-model="form.footer_note" label="Nota inferior o texto legal" rows="2" outlined :color="themeColor"></v-textarea>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <v-checkbox v-model="form.show_university" label="Mostrar universidad" :color="themeColor" hide-details></v-checkbox>
                    <v-checkbox v-model="form.show_specialty" label="Mostrar especialidad" :color="themeColor" hide-details></v-checkbox>
                    <v-checkbox v-model="form.show_footer_note" label="Mostrar nota inferior" :color="themeColor" hide-details></v-checkbox>
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
                            <da-button-secondary @click.native="$refs.headerInput.click()" :label="'Seleccionar cabecera'" rxl swpr class="py-1 px-3 font-light"></da-button-secondary>
                            <span class="text-sm text-gray-500">{{ form.header_image ? 'Imagen lista' : 'Sin archivo' }}</span>
                        </div>
                        <div v-if="form.header_image" class="mt-2 h-24 border border-gray-200 bg-gray-50 bg-contain bg-center bg-no-repeat" :style="imageStyle(form.header_image)"></div>
                    </div>

                    <div>
                        <label class="text-sm text-gray-600 font-semibold">Imagen de fondo</label>
                        <input ref="backgroundInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="readImage($event, 'background_image')">
                        <div class="flex flex-wrap items-center gap-2 mt-2">
                            <da-button-secondary @click.native="$refs.backgroundInput.click()" :label="'Seleccionar fondo'" rxl swpr class="py-1 px-3 font-light"></da-button-secondary>
                            <span class="text-sm text-gray-500">{{ form.background_image ? 'Imagen lista' : 'Sin archivo' }}</span>
                        </div>
                        <p class="m-0 mt-2 text-xs text-gray-500">Asegurate de que el fondo no afecte la lectura de la receta.</p>
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
                        <p class="m-0 mt-2 text-gray-600 font-semibold">Aun no hay firma para recetas</p>
                        <p class="m-0 mt-1 text-sm text-gray-500">Usa “Capturar firma” para agregarla.</p>
                    </div>
                </div>
            </article>

            <article class="lg:col-span-5 border border-gray-200 bg-gray-50 p-5">
                <div class="bg-white border border-gray-200 mx-auto max-w-3xl p-6 shadow-sm prescription-preview">
                    <div v-if="form.header_image" class="h-24 bg-contain bg-center bg-no-repeat mb-4" :style="imageStyle(form.header_image)"></div>
                    <div class="flex justify-between gap-4 border-b border-gray-200 pb-4">
                        <div>
                            <h3 class="m-0 text-gray-700 text-xl font-semibold">{{ doctorProfile.professional_name || 'Nombre profesional' }}</h3>
                            <p class="m-0 text-sm text-gray-500">Ced. Prof. {{ doctorProfile.professional_license || 'Sin cedula' }}</p>
                            <p v-if="form.show_university" class="m-0 text-sm text-gray-500">{{ doctorProfile.university || 'Universidad no configurada' }}</p>
                            <p v-if="form.show_specialty && doctorProfile.specialty" class="m-0 text-sm text-gray-500">{{ doctorProfile.specialty }} {{ doctorProfile.specialty_license ? `- Ced. Esp. ${doctorProfile.specialty_license}` : '' }}</p>
                        </div>
                        <div class="text-right text-sm text-gray-500">
                            <p class="m-0 font-semibold text-gray-700">{{ form.clinic_name || 'Consultorio' }}</p>
                            <p class="m-0">{{ form.clinic_phone || 'Telefono' }}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 py-4 text-sm text-gray-600">
                        <p class="m-0">Paciente: Nombre del paciente</p>
                        <p class="m-0 text-right">Folio: RX-2026-000001</p>
                    </div>
                    <div class="border border-gray-200 p-4 text-gray-600">
                        <p class="m-0 font-semibold">Medicamento</p>
                        <p class="m-0 mt-1 text-sm">Dosis, via, frecuencia, duracion e indicaciones.</p>
                    </div>
                    <div class="mt-8 flex justify-end">
                        <div class="w-48 text-center">
                            <div v-if="doctorProfile.signature_image" class="h-20 bg-contain bg-center bg-no-repeat" :style="imageStyle(doctorProfile.signature_image)"></div>
                            <div class="border-t border-gray-300 pt-2 text-sm text-gray-600">Firma</div>
                        </div>
                    </div>
                    <p v-if="form.show_footer_note && form.footer_note" class="m-0 mt-4 text-xs text-gray-500 text-center">{{ form.footer_note }}</p>
                </div>
            </article>
        </div>
    </section>
</template>

<script>
import { DAPrescriptionService, DAUserService } from '../../../services/context/core-proccess-context';

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
    props: {
        themeColor: {
            type: String,
            default: '#1497BD'
        }
    },
    data() {
        return {
            form: emptyForm(),
            doctorProfile: {},
            signaturePadVisible: false,
            templateModes: [
                { text: 'Cabecera', value: 'header' },
                { text: 'Fondo', value: 'background' }
            ]
        };
    },
    mounted() {
        this.load();
    },
    computed: {
        doctorProfileWarning() {
            if(!this.doctorProfile || !this.doctorProfile.id_doctor_professional_profile) {
                return 'Para emitir recetas, completa el perfil profesional del doctor en Configuracion > Personal y usuarios > Perfil profesional.';
            }
            if(!this.doctorProfile.professional_name || !this.doctorProfile.professional_license || !this.doctorProfile.signature_image) {
                return 'Para emitir recetas, completa el perfil profesional del doctor en Configuracion > Personal y usuarios > Perfil profesional.';
            }
            return '';
        }
    },
    methods: {
        async load() {
            const response = await DAPrescriptionService.getConfig();
            if(response.success && response.data) {
                this.form = {
                    ...emptyForm(),
                    ...response.data,
                    show_specialty: response.data.show_specialty !== 0,
                    show_university: response.data.show_university !== 0,
                    show_footer_note: response.data.show_footer_note !== 0,
                };
            }
            await this.loadDoctorProfile();
            this.signaturePadVisible = false;
        },
        async loadDoctorProfile() {
            const response = await DAUserService.getMyProfessionalProfile();
            this.doctorProfile = response.success && response.data ? response.data : {};
        },
        async save() {
            const payload = {
                clinic_name: this.form.clinic_name,
                clinic_address: this.form.clinic_address,
                clinic_phone: this.form.clinic_phone,
                header_image: this.form.header_image,
                background_image: this.form.background_image,
                footer_note: this.form.footer_note,
                template_mode: this.form.template_mode,
                background_opacity: this.form.background_opacity,
                show_specialty: this.form.show_specialty,
                show_university: this.form.show_university,
                show_footer_note: this.form.show_footer_note,
            };
            const response = await DAPrescriptionService.saveConfig(payload);
            if(response.success) {
                this.form = {
                    ...this.form,
                    ...response.data,
                    show_specialty: response.data.show_specialty !== 0,
                    show_university: response.data.show_university !== 0,
                    show_footer_note: response.data.show_footer_note !== 0,
                };
                this.$emit('saved');
                return;
            }

            this.$emit('error', response.message || 'No fue posible guardar los datos de recetas.');
        },
        readImage(event, field) {
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
            reader.onload = () => {
                this.form[field] = reader.result;
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
