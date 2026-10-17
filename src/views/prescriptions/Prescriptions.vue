<template>
    <div class="w-full min-h-full px-8 pb-12">
        <section class="bg-primary-100 border border-primary-200 shadow-sm mb-6">
            <div class="px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Recetas medicas</p>
                    <h2 class="m-0 mt-1 text-gray-700 text-2xl font-normal">Gestion de recetas</h2>
                    <p class="m-0 mt-2 text-gray-500">Consulta, filtra, imprime y crea recetas del negocio actual.</p>
                </div>
                <button v-if="canCreate" class="rx-page-button" @click="openCreate">Nueva receta</button>
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
                <button class="rx-page-button" @click="load">Buscar</button>
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
                        <tr v-if="loading"><td colspan="7" role="status" class="text-center py-8">Cargando recetas…</td></tr>
                        <tr v-else-if="loadError"><td colspan="7" role="alert" class="text-center py-8"><p>{{ loadError }}</p><button class="rx-page-button" @click="load">Reintentar</button></td></tr>
                        <tr v-else-if="items.length === 0">
                            <td colspan="7" class="text-center text-gray-500 py-8">No se encontraron recetas.</td>
                        </tr>
                        <tr v-for="item in loading || loadError ? [] : items" :key="item.id_prescription">
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
                                            <v-btn icon :aria-label="`Ver receta ${item.folio}`" v-bind="attrs" v-on="on" @click="preview(item)">
                                                <v-icon color="var(--color-primary-700)">mdi-eye-outline</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>Previsualizar</span>
                                    </v-tooltip>
                                    <v-tooltip v-if="canPrint && item.status === 'issued'" bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon :disabled="outputBusy" :aria-label="`Imprimir receta ${item.folio}`" v-bind="attrs" v-on="on" @click="print(item)">
                                                <v-icon color="var(--color-primary-900)">mdi-printer</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>Imprimir</span>
                                    </v-tooltip>
                                    <v-tooltip v-if="canDownload && item.status === 'issued'" bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon :disabled="outputBusy" :aria-label="`Descargar receta ${item.folio}`" v-bind="attrs" v-on="on" @click="download(item)">
                                                <v-icon color="var(--color-primary-700)">mdi-file-pdf-box</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>PDF</span>
                                    </v-tooltip>
                                    <v-tooltip bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon aria-label="Abrir expediente del paciente" v-bind="attrs" v-on="on" @click="goToPatient(item)">
                                                <v-icon color="#64748B">mdi-account-arrow-right-outline</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>Ir al expediente</span>
                                    </v-tooltip>
                                    <v-tooltip v-if="canEdit(item)" bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon :aria-label="`Editar borrador ${item.folio}`" v-bind="attrs" v-on="on" @click="edit(item)">
                                                <v-icon color="#0E7490">mdi-pencil-outline</v-icon>
                                            </v-btn>
                                        </template>
                                        <span>Editar borrador</span>
                                    </v-tooltip>
                                    <v-tooltip v-if="item.status === 'issued' && canCancel" bottom>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-btn icon :aria-label="`Cancelar receta ${item.folio}`" v-bind="attrs" v-on="on" @click="cancel(item)">
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

        <v-dialog v-model="createDialog" max-width="760" aria-label="Seleccionar paciente para receta">
            <v-card v-dialog-name="'Seleccionar paciente para receta'">
                <div class="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
                    <div>
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Nueva receta</p>
                        <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">Seleccionar paciente</h3>
                    </div>
                    <v-btn icon aria-label="Cerrar selección de paciente" @click="createDialog = false"><v-icon color="#64748B">mdi-close</v-icon></v-btn>
                </div>
                <v-card-text class="pt-5">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div class="md:col-span-3">
                            <v-text-field v-model="patientSearch" label="Buscar por nombre, telefono o expediente" dense outlined color="var(--color-primary-700)" @keyup.enter="searchPatients"></v-text-field>
                        </div>
                        <button class="rx-page-button self-start" :disabled="searchingPatients" @click="searchPatients">Buscar</button>
                    </div>

                    <p v-if="searchingPatients" role="status">Buscando pacientes…</p>
                    <p v-else-if="patientSearchError" role="alert">{{ patientSearchError }}</p>
                    <p v-else-if="patientSearched && !patientResults.length" role="status">No se encontraron pacientes. Prueba otro nombre o expediente.</p>
                    <div v-if="patientResults.length && !searchingPatients" class="mt-4 border border-gray-200 divide-y divide-gray-200">
                        <button v-for="patient in patientResults" :key="patient.id_person" class="w-full text-left px-4 py-3 hover:bg-primary-100" type="button" @click="selectPatient(patient)">
                            <p class="m-0 font-semibold text-gray-700">{{ patient.name }} {{ patient.surname }}</p>
                            <p class="m-0 text-sm text-gray-500">Exp. {{ patient.code || 'Sin folio' }} · {{ patient.telephone || patient.celphone || 'Sin telefono' }}</p>
                        </button>
                    </div>

                    <div v-if="selectedPatient" class="mt-4 bg-primary-100 border border-primary-200 p-4">
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Paciente seleccionado</p>
                        <h4 class="m-0 mt-1 text-gray-700 font-semibold">{{ selectedPatient.name }} {{ selectedPatient.surname }}</h4>
                    </div>
                </v-card-text>
                <v-card-actions class="px-6 pb-5 justify-end">
                    <da-button-secondary @click.native="createDialog = false" :label="'Cerrar'" rxl swpr class="py-1 px-4 font-light"></da-button-secondary>
                    <button class="rx-page-button" :disabled="!selectedPatient || searchingPatients" @click="startForm">Continuar con este paciente</button>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <prescription-form
            ref="editor"
            :show="formDialog"
            :px="formPx"
            :prescription="selectedPrescription"
            @close="formDialog = false"
            @saved="onSaved"
            @draft-saved="load"
        ></prescription-form>

        <v-dialog v-model="previewDialog" max-width="820" aria-label="Vista previa de receta">
            <v-card v-dialog-name="'Vista previa de receta'">
                <div class="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
                    <div>
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">Vista previa</p>
                        <h3 class="m-0 mt-1 text-gray-700 text-xl font-semibold">{{ previewData ? previewData.folio : '' }}</h3>
                    </div>
                    <v-btn icon aria-label="Cerrar vista previa" @click="previewDialog = false"><v-icon color="#64748B">mdi-close</v-icon></v-btn>
                </div>
                <v-card-text v-if="previewData" class="pt-5">
                    <div v-if="previewData.status !== 'issued'" class="mb-4 p-3 border rounded text-sm" :class="statusClass(previewData.status)" role="status">
                        <strong>{{ previewData.status === 'cancelled' ? 'Receta cancelada · solo para consulta del histórico.' : 'Borrador · pendiente de emisión.' }}</strong>
                        <p class="m-0 mt-1">{{ previewData.status === 'cancelled' ? 'No se permite imprimir ni generar PDF de una receta cancelada.' : 'PDF e impresión estarán disponibles cuando el doctor emita la receta.' }}</p>
                    </div>
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
                        <p v-if="previewData.cancelled_at" class="m-0 mt-4 text-sm text-red-700"><strong>Fecha de cancelación:</strong> {{ String(previewData.cancelled_at).replace('T', ' ').slice(0, 16) }}</p>
                        <p v-if="previewData.cancellation_reason" class="m-0 mt-1 text-sm text-red-700"><strong>Motivo de cancelación:</strong> {{ previewData.cancellation_reason }}</p>
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
import { DAPrescriptionService, DAPxService } from '../../services/context/core-proccess-context';
import PrescriptionForm from './components/PrescriptionForm.vue';
import { openPrescriptionPrintWindow } from '../../domain/prescriptions/prescription.print';
import dialogName from '../../core/directives/dialog-name';

export default {
    directives: { dialogName },
    components: {
        PrescriptionForm
    },
    data() {
        return {
            items: [],
            loading: true,
            outputBusy: false,
            loadError: '',
            loadRequest: 0,
            searchingPatients: false,
            patientSearchError: '',
            patientSearched: false,
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
            const request = ++this.loadRequest;
            this.loading = true;
            this.loadError = '';
            try {
                const response = await DAPrescriptionService.list(this.filters);
                if(request !== this.loadRequest) return;
                if(!response.success) throw new Error(response.message || 'No se pudo cargar el historial de recetas.');
                this.items = response.data || [];
            } catch(error) { if(request === this.loadRequest) this.loadError = error.message; }
            finally { if(request === this.loadRequest) this.loading = false; }
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
            this.patientSearched = false;
            this.patientSearchError = '';
            this.createDialog = true;
        },
        async searchPatients() {
            if(this.searchingPatients) return;
            this.selectedPatient = null;
            this.patientSearchError = '';
            if(!this.patientSearch) {
                this.patientResults = [];
                this.patientSearched = false;
                return;
            }
            if(this.patientSearch.trim().length < 2) { this.patientResults = []; this.patientSearchError = 'Escribe al menos dos caracteres para buscar.'; return; }
            this.searchingPatients = true;
            this.patientSearched = true;
            try {
                const response = await DAPxService.searchFast({ query: this.patientSearch.trim(), limit: 12 });
                if(!response.success) throw new Error(response.message || 'No se pudo buscar. Pulsa Buscar para reintentar.');
                this.patientResults = (response.data || []).map(patient => ({ ...patient, fullname: patient.name, name: patient.firstName || patient.name }));
            } catch(error) { this.patientResults = []; this.patientSearchError = error.message; }
            finally { this.searchingPatients = false; }
        },
        selectPatient(patient) {
            this.selectedPatient = patient;
        },
        startForm() {
            if(!this.selectedPatient) {
                this.patientSearchError = 'Selecciona un paciente para crear la receta.';
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
            else this.notify('error', response.message || 'No se pudo cargar la receta.');
        },
        async print(item) {
            await this.openPrintable(item, 'printed');
        },
        async download(item) {
            await this.openPrintable(item, 'downloaded');
        },
        async openPrintable(item, action) {
            if(this.outputBusy) return false;
            if(!item || item.status !== 'issued') {
                this.notify('warning', 'Solo las recetas emitidas pueden imprimirse o generar PDF.');
                return false;
            }
            if(action === 'printed' ? !this.canPrint : !this.canDownload) {
                this.notify('warning', 'No tienes permiso para esta acción de receta.');
                return false;
            }
            this.outputBusy = true;
            try {
                const response = await DAPrescriptionService.prepareOutput(item.id_prescription, action, { source: 'prescriptions_page' });
                const document = response.data && response.data.prescription;
                if(!response.success || !document || document.status !== 'issued' || document.id_prescription !== item.id_prescription) {
                    this.notify('error', response.message || 'No se autorizó la impresión o el PDF. Reintenta consultando su estado.');
                    if(response.data && response.data.status) {
                        if(this.previewData && this.previewData.id_prescription === item.id_prescription) this.previewData = { ...this.previewData, ...response.data };
                        await this.load();
                    }
                    return false;
                }
                if(!openPrescriptionPrintWindow(document, response.data.config || {}, true)) {
                    this.notify('warning', 'El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes y reintenta.');
                    return false;
                }
                return true;
            } catch(error) {
                this.notify('error', 'No se pudo autorizar la copia. Reintenta cuando haya conexión.');
                return false;
            } finally { this.outputBusy = false; }
        },
        async cancel(item) {
            const result = await this.$swal({ title: 'Cancelar receta', input: 'textarea', inputLabel: 'Motivo de cancelación', inputAttributes: { maxlength: 500 }, showCancelButton: true, confirmButtonText: 'Cancelar receta', cancelButtonText: 'Volver', inputValidator: value => !value.trim() ? 'Captura el motivo de cancelación.' : undefined });
            if(!result.isConfirmed) return;
            const response = await DAPrescriptionService.cancel(item.id_prescription, result.value.trim());
            if(!response.success) { this.notify('error', response.message || 'No se pudo cancelar la receta.'); return; }
            this.notify('success', `Receta ${item.folio} cancelada.`);
            await this.load();
        },
        goToPatient(item) {
            this.$router.push(`/px/history/${item.id_person}`);
        },
        async onSaved(document) {
            this.notify('success', `${document.status === 'issued' ? 'Receta emitida' : 'Borrador guardado'}: ${document.folio}.`);
            await this.load();
        },
        notify(icon, title) { this.$swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 4000 }); },
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
.rx-page-button { background: #116c70; color: white; border-radius: 8px; min-height: 44px; padding: 10px 16px; font-weight: 600; }
.rx-page-button:disabled { opacity: .55; cursor: not-allowed; }
.rx-page-button:focus-visible { outline: 3px solid #176ea6; outline-offset: 3px; }
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
