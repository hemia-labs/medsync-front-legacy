<template>
    <div class="w-full min-h-full px-8 pb-12">
        <section class="bg-primary-100 border border-primary-200 shadow-sm mb-6">
            <div class="px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Recetas medicas</p>
                    <h2 class="m-0 mt-1 text-gray-700 text-2xl font-normal">Gestion de recetas</h2>
                    <p class="m-0 mt-2 text-gray-500">Consulta, filtra, imprime y crea recetas del negocio actual.</p>
                </div>
                <da-button-primary v-if="canCreate" @click.native="openCreate" :label="'Nueva receta'" rxl swpr class="py-2 px-5 font-light"></da-button-primary>
            </div>
        </section>

        <section class="bg-white border border-gray-200 shadow-sm p-5 mb-5">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                <v-text-field v-model="filters.search" label="Folio o paciente" dense outlined clearable color="var(--color-primary-700)" @keyup.enter="load"></v-text-field>
                <v-text-field v-model="filters.date_from" type="date" label="Desde" dense outlined color="var(--color-primary-700)"></v-text-field>
                <v-text-field v-model="filters.date_to" type="date" label="Hasta" dense outlined color="var(--color-primary-700)"></v-text-field>
                <v-select v-model="filters.status" :items="statusOptions" label="Estado" dense outlined clearable color="var(--color-primary-700)"></v-select>
                <v-select v-model="filters.issuer_doctor_id" :items="doctors" item-text="name" item-value="id_login" label="Doctor" dense outlined clearable color="var(--color-primary-700)"></v-select>
            </div>
            <div class="flex justify-end gap-2">
                <da-button-secondary @click.native="clearFilters" :label="'Limpiar'" rxl swpr class="py-1 px-4 font-light"></da-button-secondary>
                <da-button-primary @click.native="load" :label="'Buscar'" rxl swpr class="py-1 px-4 font-light"></da-button-primary>
            </div>
        </section>

        <section class="bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full prescription-table">
                    <thead>
                        <tr>
                            <th>Folio</th>
                            <th>Fecha</th>
                            <th>Paciente</th>
                            <th>Doctor emisor</th>
                            <th>Estado</th>
                            <th>Medicamentos</th>
                            <th class="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="items.length === 0">
                            <td colspan="7" class="text-center text-gray-500 py-8">No se encontraron recetas.</td>
                        </tr>
                        <tr v-for="item in items" :key="item.id_prescription">
                            <td class="font-semibold text-gray-700">{{ item.folio }}</td>
                            <td>{{ item.issue_date }}</td>
                            <td>{{ item.patient_name }}</td>
                            <td>{{ item.doctor_name || 'Sin doctor' }}</td>
                            <td><span class="px-2 py-1 text-xs font-semibold border" :class="statusClass(item.status)">{{ statusText(item.status) }}</span></td>
                            <td class="max-w-xs truncate">{{ item.medications || 'Sin medicamentos' }}</td>
                            <td>
                                <div class="flex justify-end flex-wrap gap-2">
                                    <v-tooltip bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon small v-bind="attrs" v-on="on" @click="preview(item)">
                                                <v-icon color="var(--color-primary-700)">mdi-eye-outline</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>Previsualizar</span>
                                    </v-tooltip>
                                    <v-tooltip v-if="canPrint" bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon small v-bind="attrs" v-on="on" @click="print(item)">
                                                <v-icon color="var(--color-primary-900)">mdi-printer</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>Imprimir</span>
                                    </v-tooltip>
                                    <v-tooltip v-if="canDownload" bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon small v-bind="attrs" v-on="on" @click="download(item)">
                                                <v-icon color="var(--color-primary-700)">mdi-file-pdf-box</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>PDF</span>
                                    </v-tooltip>
                                    <v-tooltip bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon small v-bind="attrs" v-on="on" @click="goToPatient(item)">
                                                <v-icon color="#64748B">mdi-account-arrow-right-outline</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>Ir al expediente</span>
                                    </v-tooltip>
                                    <v-tooltip v-if="canEdit(item)" bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon small v-bind="attrs" v-on="on" @click="edit(item)">
                                                <v-icon color="#0E7490">mdi-pencil-outline</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>Editar borrador</span>
                                    </v-tooltip>
                                    <v-tooltip v-if="item.status === 'issued' && canCancel" bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon small v-bind="attrs" v-on="on" @click="cancel(item)">
                                                <v-icon color="#B91C1C">mdi-cancel</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>Cancelar receta</span>
                                    </v-tooltip>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <v-dialog v-model="createDialog" max-width="760">
            <v-card>
                <div class="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
                    <div>
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Nueva receta</p>
                        <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">Seleccionar paciente</h3>
                    </div>
                    <v-btn icon @click="createDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
                </div>
                <v-card-text class="pt-5">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div class="md:col-span-3">
                            <v-text-field v-model="patientSearch" label="Buscar por nombre, telefono o expediente" dense outlined color="var(--color-primary-700)" @keyup.enter="searchPatients"></v-text-field>
                        </div>
                        <da-button-primary @click.native="searchPatients" :label="'Buscar'" rxl swpr class="py-1 px-4 font-light self-start"></da-button-primary>
                    </div>

                    <div v-if="patientResults.length" class="mt-4 border border-gray-200 divide-y divide-gray-200">
                        <button v-for="patient in patientResults" :key="patient.id_person" class="w-full text-left px-4 py-3 hover:bg-primary-100" type="button" @click="selectPatient(patient)">
                            <p class="m-0 font-semibold text-gray-700">{{ patient.name }} {{ patient.surname }}</p>
                            <p class="m-0 text-sm text-gray-500">{{ patient.telephone || patient.celphone || 'Sin telefono' }}</p>
                        </button>
                    </div>

                    <div v-if="selectedPatient" class="mt-4 bg-primary-100 border border-primary-200 p-4">
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Paciente seleccionado</p>
                        <h4 class="m-0 mt-1 text-gray-700 font-semibold">{{ selectedPatient.name }} {{ selectedPatient.surname }}</h4>
                    </div>
                </v-card-text>
                <v-card-actions class="px-6 pb-5 justify-end">
                    <da-button-secondary @click.native="createDialog = false" :label="'Cerrar'" rxl swpr class="py-1 px-4 font-light"></da-button-secondary>
                    <da-button-primary @click.native="startForm" :label="'Crear receta'" rxl swpr class="py-1 px-4 font-light"></da-button-primary>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <prescription-form
            :show="formDialog"
            :px="formPx"
            :prescription="selectedPrescription"
            @close="formDialog = false"
            @saved="onSaved"
        ></prescription-form>

        <v-dialog v-model="previewDialog" max-width="820">
            <v-card>
                <div class="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
                    <div>
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Vista previa</p>
                        <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">{{ previewData ? previewData.folio : '' }}</h3>
                    </div>
                    <v-btn icon @click="previewDialog = false"><v-icon color="#9CA3AF">mdi-close</v-icon></v-btn>
                </div>
                <v-card-text v-if="previewData" class="pt-5">
                    <div class="border border-gray-200 bg-white p-6">
                        <div class="flex justify-between border-b border-gray-200 pb-4">
                            <div>
                                <h3 class="m-0 text-gray-700 font-semibold">{{ previewData.doctor_name_snapshot || previewData.doctor_name || 'Doctor emisor' }}</h3>
                                <p class="m-0 text-sm text-gray-500">Folio: {{ previewData.folio }}</p>
                                <p class="m-0 text-sm text-gray-500">Estado: {{ statusText(previewData.status) }}</p>
                            </div>
                            <p class="m-0 text-sm text-gray-500">{{ previewData.issue_date }}</p>
                        </div>
                        <div class="py-4 text-sm text-gray-600">
                            <p class="m-0"><strong>Paciente:</strong> {{ previewData.patient_name }}</p>
                            <p v-if="previewData.diagnosis" class="m-0 mt-1"><strong>Diagnostico:</strong> {{ previewData.diagnosis }}</p>
                        </div>
                        <div v-for="(item, index) in previewData.items || []" :key="item.id_prescription_item || index" class="border border-gray-200 p-3 mb-3">
                            <p class="m-0 font-semibold text-gray-700">{{ index + 1 }}. {{ item.generic_name }}</p>
                            <p class="m-0 text-sm text-gray-500">{{ item.dose }} | {{ item.administration_route }} | {{ item.frequency }} | {{ item.duration }}</p>
                            <p v-if="item.indications" class="m-0 mt-1 text-sm text-gray-600">{{ item.indications }}</p>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import { DAPrescriptionService, DADashboardService } from '../../services/context/core-proccess-context';
import PrescriptionForm from './components/PrescriptionForm.vue';
import { openPrescriptionPrintWindow } from '../../domain/prescriptions/prescription.print';

export default {
    components: {
        PrescriptionForm
    },
    data() {
        return {
            items: [],
            doctors: [],
            filters: {
                search: '',
                date_from: '',
                date_to: '',
                status: '',
                issuer_doctor_id: ''
            },
            statusOptions: [
                { text: 'Borrador', value: 'draft' },
                { text: 'Emitida', value: 'issued' },
                { text: 'Cancelada', value: 'cancelled' }
            ],
            createDialog: false,
            formDialog: false,
            previewDialog: false,
            selectedPrescription: null,
            previewData: null,
            patientSearch: '',
            patientResults: [],
            selectedPatient: null
        };
    },
    computed: {
        ...mapGetters(moduleTypes.AUTH, {
            hasPermission: fnTypes.hasPermission
        }),
        canCreate() {
            return this.hasPermission('prescriptions.create');
        },
        canEditDraft() {
            return this.hasPermission('prescriptions.edit_draft');
        },
        canCancel() {
            return this.hasPermission('prescriptions.cancel');
        },
        canPrint() {
            return this.hasPermission('prescriptions.print');
        },
        canDownload() {
            return this.hasPermission('prescriptions.download');
        },
        formPx() {
            return this.selectedPatient ? { person: this.selectedPatient } : { person: {} };
        }
    },
    mounted() {
        this.loadDoctors();
        this.load();
    },
    methods: {
        async load() {
            const response = await DAPrescriptionService.list(this.filters);
            this.items = response.success ? response.data : [];
        },
        async loadDoctors() {
            const response = await DAPrescriptionService.doctors();
            this.doctors = response.success ? response.data : [];
        },
        clearFilters() {
            this.filters = {
                search: '',
                date_from: '',
                date_to: '',
                status: '',
                issuer_doctor_id: ''
            };
            this.load();
        },
        openCreate() {
            this.selectedPrescription = null;
            this.selectedPatient = null;
            this.patientResults = [];
            this.patientSearch = '';
            this.createDialog = true;
        },
        async searchPatients() {
            if(!this.patientSearch) {
                this.patientResults = [];
                return;
            }

            const response = await DADashboardService.getPatients({ param: this.patientSearch });
            this.patientResults = response.success ? response.data : [];
        },
        selectPatient(patient) {
            this.selectedPatient = patient;
        },
        startForm() {
            if(!this.selectedPatient) {
                window.alert('Selecciona un paciente para crear la receta.');
                return;
            }

            this.createDialog = false;
            this.formDialog = true;
        },
        edit(item) {
            this.selectedPatient = {
                id_person: item.id_person,
                fullname: item.patient_name,
                name: item.patient_name
            };
            this.selectedPrescription = item;
            this.formDialog = true;
        },
        canEdit(item) {
            return item.status === 'draft' && this.canEditDraft;
        },
        async preview(item) {
            const response = await DAPrescriptionService.getById(item.id_prescription);
            if(response.success) {
                this.previewData = response.data;
                this.previewDialog = true;
            }
        },
        async print(item) {
            await this.openPrintable(item, 'printed');
        },
        async download(item) {
            await this.openPrintable(item, 'downloaded');
        },
        async openPrintable(item, action) {
            const response = await DAPrescriptionService.getById(item.id_prescription);
            if(!response.success) {
                return;
            }

            const config = await DAPrescriptionService.getConfig();
            await DAPrescriptionService.auditAction(item.id_prescription, action, { source: 'prescriptions_page' });
            openPrescriptionPrintWindow(response.data, config.success ? config.data : {}, true);
        },
        async cancel(item) {
            const reason = window.prompt('Motivo de cancelacion');
            if(!reason) {
                return;
            }

            await DAPrescriptionService.cancel(item.id_prescription, reason);
            await this.load();
        },
        goToPatient(item) {
            this.$router.push(`/px/history/${item.id_person}`);
        },
        async onSaved() {
            this.formDialog = false;
            await this.load();
        },
        statusText(status) {
            const map = {
                draft: 'Borrador',
                issued: 'Emitida',
                cancelled: 'Cancelada'
            };
            return map[status] || status;
        },
        statusClass(status) {
            const map = {
                draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                issued: 'bg-blue-50 text-blue-700 border-blue-200',
                cancelled: 'bg-red-50 text-red-700 border-red-200'
            };
            return map[status] || 'bg-gray-50 text-gray-600 border-gray-200';
        }
    }
};
</script>

<style scoped>
.prescription-table th {
    background: var(--color-primary-100);
    color: var(--color-primary-900);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    padding: 0.9rem;
    text-transform: uppercase;
}

.prescription-table td {
    border-top: 1px solid #e5e7eb;
    color: #4b5563;
    font-size: 0.9rem;
    padding: 0.8rem 0.9rem;
    vertical-align: middle;
}
</style>
