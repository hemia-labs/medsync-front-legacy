<template>
    <v-dialog v-model="internalShow" persistent max-width="980">
        <v-card>
            <div class="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200 bg-primary-100">
                <div>
                    <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Receta medica</p>
                    <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">{{ form.id_prescription ? 'Editar borrador' : 'Nueva receta' }}</h3>
                    <p class="m-0 mt-1 text-gray-500 text-sm">Paciente: {{ patientName }}</p>
                </div>
                <v-btn icon @click="close"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
            </div>

            <v-card-text class="pt-5">
                <div class="mb-4 px-4 py-3 border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm leading-relaxed">
                    Puedes guardar como borrador para continuar despues. Al emitir la receta quedara bloqueada como documento clinico historico.
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div class="md:col-span-2 bg-primary-100 border border-primary-200 p-4">
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Paciente</p>
                        <h4 class="m-0 mt-1 text-gray-700 font-semibold">{{ patientName }}</h4>
                        <p class="m-0 mt-1 text-gray-500 text-sm">{{ patientMeta }}</p>
                    </div>

                    <v-select
                        v-model="form.issuer_doctor_id"
                        :items="doctorOptions"
                        item-text="display_name"
                        item-value="id_login"
                        label="Doctor emisor"
                        dense
                        outlined
                        :disabled="currentUserIsDoctor"
                        color="var(--color-primary-700)"
                    ></v-select>
                </div>
                <div v-if="selectedDoctorWarning" class="mb-4 px-4 py-3 border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm leading-relaxed">
                    {{ selectedDoctorWarning }}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <v-text-field v-model="form.issue_date" type="date" label="Fecha de receta" dense outlined color="var(--color-primary-700)"></v-text-field>
                    <v-text-field v-model="form.diagnosis" label="Diagnostico opcional" dense outlined color="var(--color-primary-700)"></v-text-field>
                </div>

                <v-textarea v-model="form.notes" label="Notas generales" rows="2" outlined color="var(--color-primary-700)"></v-textarea>

                <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Medicamentos</p>
                        <h4 class="m-0 text-gray-700 font-semibold">Prescripcion</h4>
                    </div>
                    <button type="button" class="rx-form-action rx-form-action--add" @click="addItem">
                        <v-icon small>mdi-plus</v-icon>
                        <span>Medicamento</span>
                    </button>
                </div>

                <div class="space-y-4">
                    <article v-for="(item, index) in form.items" :key="item.local_id" class="border border-gray-200 bg-gray-50 p-4">
                        <div class="flex items-center justify-between mb-3">
                            <p class="m-0 text-gray-700 font-semibold">Medicamento {{ index + 1 }}</p>
                            <v-btn icon small @click="removeItem(index)" :disabled="form.items.length === 1">
                                <v-icon color="#A6001E">mdi-delete-outline</v-icon>
                            </v-btn>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <v-text-field v-model="item.generic_name" label="Nombre generico" dense outlined color="var(--color-primary-700)"></v-text-field>
                            <v-text-field v-model="item.commercial_name" label="Nombre comercial opcional" dense outlined color="var(--color-primary-700)"></v-text-field>
                            <v-text-field v-model="item.presentation" label="Presentacion" dense outlined color="var(--color-primary-700)"></v-text-field>
                            <v-text-field v-model="item.concentration" label="Concentracion" dense outlined color="var(--color-primary-700)"></v-text-field>
                            <v-text-field v-model="item.pharmaceutical_form" label="Forma farmaceutica" dense outlined color="var(--color-primary-700)"></v-text-field>
                            <v-text-field v-model="item.quantity" label="Cantidad" dense outlined color="var(--color-primary-700)"></v-text-field>
                            <v-text-field v-model="item.dose" label="Dosis" dense outlined color="var(--color-primary-700)"></v-text-field>
                            <v-text-field v-model="item.administration_route" label="Via de administracion" dense outlined color="var(--color-primary-700)"></v-text-field>
                            <v-text-field v-model="item.frequency" label="Frecuencia" dense outlined color="var(--color-primary-700)"></v-text-field>
                            <v-text-field v-model="item.duration" label="Duracion" dense outlined color="var(--color-primary-700)"></v-text-field>
                        </div>
                        <v-textarea v-model="item.indications" label="Indicaciones" rows="2" outlined color="var(--color-primary-700)"></v-textarea>
                    </article>
                </div>

                <p v-if="error" class="mt-4 text-red-600 font-semibold">{{ error }}</p>
            </v-card-text>

            <v-card-actions class="px-6 pb-5 justify-end">
                <div class="rx-form-actions">
                    <button type="button" class="rx-form-action rx-form-action--close" @click="close">
                        <v-icon small>mdi-close</v-icon>
                        <span>Cerrar</span>
                    </button>
                    <button type="button" class="rx-form-action rx-form-action--draft" @click="saveDraft" :disabled="saving || issuing">
                        <v-icon small>mdi-content-save-outline</v-icon>
                        <span>{{ saving ? 'Guardando...' : 'Guardar borrador' }}</span>
                    </button>
                    <button type="button" class="rx-form-action rx-form-action--issue" @click="issue" :disabled="saving || issuing">
                        <v-icon small>mdi-check-decagram-outline</v-icon>
                        <span>{{ issuing ? 'Emitiendo...' : 'Emitir receta' }}</span>
                    </button>
                </div>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DAPrescriptionService } from '../../../services/context/core-proccess-context';

const today = () => new Date().toISOString().slice(0, 10);
const localId = () => `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyItem = () => ({
    local_id: localId(),
    generic_name: '',
    commercial_name: '',
    presentation: '',
    concentration: '',
    pharmaceutical_form: '',
    dose: '',
    administration_route: '',
    frequency: '',
    duration: '',
    quantity: '',
    indications: ''
});

const emptyForm = (idPerson) => ({
    id_prescription: '',
    id_person: idPerson,
    issuer_doctor_id: '',
    issue_date: today(),
    diagnosis: '',
    notes: '',
    items: [emptyItem()]
});

export default {
    props: {
        show: {
            type: Boolean,
            default: false
        },
        px: {
            type: Object,
            default: () => ({})
        },
        prescription: {
            type: Object,
            default: null
        }
    },
    data() {
        return {
            internalShow: false,
            form: emptyForm(''),
            doctors: [],
            error: '',
            saving: false,
            issuing: false
        };
    },
    computed: {
        patient() {
            return this.px && this.px.person ? this.px.person : {};
        },
        patientName() {
            return this.patient.fullname || `${this.patient.name || ''} ${this.patient.surname || ''}`.trim() || 'Paciente';
        },
        patientMeta() {
            const parts = [];
            if(this.patient.age !== undefined && this.patient.age !== null) {
                parts.push(`${this.patient.age} anios`);
            }
            if(this.patient.birthday) {
                parts.push(`Nacimiento: ${this.patient.birthday}`);
            }
            return parts.join(' | ');
        },
        ...mapGetters(moduleTypes.AUTH, {
            authUser: fnTypes.getUser
        }),
        currentUserIsDoctor() {
            return this.authUser && ['doctor'].includes(this.authUser.rol);
        },
        doctorOptions() {
            return (this.doctors || []).map((doctor) => ({
                ...doctor,
                display_name: doctor.professional_name || doctor.name
            }));
        },
        selectedDoctor() {
            return this.doctors.find((doctor) => doctor.id_login === this.form.issuer_doctor_id) || null;
        },
        selectedDoctorWarning() {
            const doctor = this.selectedDoctor;
            if(!doctor) {
                return '';
            }
            if(Number(doctor.professional_profile_complete) !== 1) {
                return 'Para emitir recetas, completa el perfil profesional del doctor en Configuracion > Personal y usuarios > Perfil profesional.';
            }
            return '';
        }
    },
    watch: {
        show(value) {
            this.internalShow = value;
            if(value) {
                this.init();
            }
        },
        internalShow(value) {
            if(!value) {
                this.$emit('close');
            }
        }
    },
    methods: {
        async init() {
            this.error = '';
            const idPerson = this.patient.id_person || '';
            this.form = emptyForm(idPerson);
            await this.loadDoctors();

            if(this.prescription) {
                const response = await DAPrescriptionService.getById(this.prescription.id_prescription);
                if(response.success) {
                    this.fillForm(response.data);
                }
            }
        },
        async loadDoctors() {
            const response = await DAPrescriptionService.doctors();
            this.doctors = response.success ? response.data : [];
            if(this.currentUserIsDoctor && this.authUser && this.authUser.id_login) {
                this.form.issuer_doctor_id = this.authUser.id_login;
                return;
            }
            if(!this.form.issuer_doctor_id && this.doctors.length === 1) {
                this.form.issuer_doctor_id = this.doctors[0].id_login;
            }
        },
        fillForm(data) {
            this.form = {
                id_prescription: data.id_prescription,
                id_person: data.id_person,
                issuer_doctor_id: data.issuer_doctor_id,
                issue_date: data.issue_date ? data.issue_date.slice(0, 10) : today(),
                diagnosis: data.diagnosis || '',
                notes: data.notes || '',
                items: (data.items || []).map((item) => ({
                    ...item,
                    local_id: item.id_prescription_item || localId()
                }))
            };

            if(this.form.items.length === 0) {
                this.form.items = [emptyItem()];
            }
        },
        addItem() {
            this.form.items.push(emptyItem());
        },
        removeItem(index) {
            if(this.form.items.length > 1) {
                this.form.items.splice(index, 1);
            }
        },
        validate() {
            if(!this.form.id_person) {
                return 'No se encontro el paciente del expediente.';
            }
            if(!this.form.issuer_doctor_id) {
                return 'Selecciona el doctor emisor.';
            }
            if(this.currentUserIsDoctor && this.authUser && this.form.issuer_doctor_id !== this.authUser.id_login) {
                return 'El doctor solo puede emitir recetas con su propio perfil profesional.';
            }
            if(!this.form.issue_date) {
                return 'Selecciona fecha de receta.';
            }
            return '';
        },
        validateForIssue() {
            const baseError = this.validate();
            if(baseError) {
                return baseError;
            }
            if(this.selectedDoctorWarning) {
                return this.selectedDoctorWarning;
            }

            if(!this.form.items || this.form.items.length === 0) {
                return 'Agrega al menos un medicamento.';
            }

            for(let index = 0; index < this.form.items.length; index += 1) {
                const item = this.form.items[index] || {};
                const prefix = `Medicamento ${index + 1}:`;
                if(!item.generic_name) {
                    return `${prefix} captura nombre generico.`;
                }
                if(!item.dose) {
                    return `${prefix} captura dosis.`;
                }
                if(!item.administration_route) {
                    return `${prefix} captura via de administracion.`;
                }
                if(!item.frequency) {
                    return `${prefix} captura frecuencia.`;
                }
                if(!item.duration) {
                    return `${prefix} captura duracion.`;
                }
            }

            return '';
        },
        async saveDraft() {
            if(this.saving || this.issuing) {
                return;
            }
            this.error = this.validate();
            if(this.error) {
                return;
            }

            this.saving = true;
            const response = await DAPrescriptionService.save(this.form);
            this.saving = false;
            if(response.success) {
                this.$emit('saved', response.data);
                this.close();
                return;
            }

            this.error = response.message || 'No fue posible guardar la receta.';
        },
        async issue() {
            if(this.saving || this.issuing) {
                return;
            }

            this.error = this.validateForIssue();
            if(this.error) {
                return;
            }

            const confirm = await this.$swal({
                title: 'Emitir receta',
                text: 'Despues de emitirla ya no podra editarse. Si hay un error, deberas cancelarla y crear una nueva.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Emitir receta',
                cancelButtonText: 'Revisar',
                buttonsStyling: false,
                customClass: {
                    confirmButton: 'rx-swal-confirm',
                    cancelButton: 'rx-swal-cancel'
                }
            });
            if(!confirm.value) {
                return;
            }

            this.issuing = true;
            const draft = await DAPrescriptionService.save(this.form);
            if(!draft.success) {
                this.issuing = false;
                this.error = draft.message || 'No fue posible guardar el borrador.';
                return;
            }

            const issued = await DAPrescriptionService.issue(draft.data.id_prescription);
            this.issuing = false;
            if(issued.success) {
                this.$emit('saved', issued.data);
                this.close();
                return;
            }

            this.error = issued.message || 'No fue posible emitir la receta.';
        },
        close() {
            this.internalShow = false;
        }
    }
};
</script>

<style scoped>
.rx-form-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.6rem;
}

.rx-form-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 2.35rem;
    padding: 0.45rem 0.9rem;
    border: 1px solid transparent;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1;
    box-shadow: 0 5px 14px rgba(15, 23, 42, 0.1);
    transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease, opacity 0.16s ease;
}

.rx-form-action:hover:not(:disabled) {
    transform: translateY(-1px);
}

.rx-form-action:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}

.rx-form-action .v-icon {
    color: currentColor;
}

.rx-form-action--close {
    background: #fff;
    border-color: #e5e7eb;
    color: #64748b;
}

.rx-form-action--close:hover:not(:disabled) {
    background: #f8fafc;
}

.rx-form-action--draft {
    background: #eef9fc;
    border-color: #bdebf5;
    color: var(--color-primary-700);
}

.rx-form-action--draft:hover:not(:disabled) {
    background: #ddf5fa;
}

.rx-form-action--issue {
    background: #e8f8ef;
    border-color: #b8e8ca;
    color: #137445;
}

.rx-form-action--issue:hover:not(:disabled) {
    background: #d9f4e5;
}

.rx-form-action--add {
    background: #fff7ed;
    border-color: #fed7aa;
    color: #b45309;
}

.rx-form-action--add:hover:not(:disabled) {
    background: #ffedd5;
}
</style>

<style>
.rx-swal-confirm,
.rx-swal-cancel {
    min-width: 9rem;
    min-height: 2.65rem;
    margin: 0 0.35rem;
    padding: 0.65rem 1.1rem;
    border: 1px solid transparent;
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
    transition: background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.rx-swal-confirm:hover,
.rx-swal-cancel:hover {
    transform: translateY(-1px);
}

.rx-swal-confirm {
    background: #e8f8ef;
    border-color: #b8e8ca;
    color: #137445;
}

.rx-swal-confirm:hover {
    background: #d9f4e5;
}

.rx-swal-cancel {
    background: #eef9fc;
    border-color: #bdebf5;
    color: var(--color-primary-700);
}

.rx-swal-cancel:hover {
    background: #ddf5fa;
}
</style>
