<template>
    <div class="w-full h-full">
        <div class="prescription-body">
            <div class="prescription-intro">
                <div>
                    <p class="prescription-kicker">Recetas médicas</p>
                    <h3>Historial de recetas</h3>
                    <p>Borradores, recetas emitidas y cancelaciones del paciente.</p>
                </div>
                <div class="prescription-intro-actions">
                    <div class="prescription-legend">
                        <span v-for="status in statusLegend" :key="status.value" class="px-3 py-1 text-xs font-semibold border" :class="status.className">
                            {{ status.label }}
                        </span>
                    </div>
                    <button v-if="canCreate" type="button" class="prescription-add tab-create-action" @click="openNew">
                        <v-icon small>mdi-plus</v-icon>
                        <span>Nueva receta</span>
                    </button>
                </div>
            </div>

            <div v-if="loading" class="p-8 text-center" role="status">Cargando recetas…</div>
            <div v-else-if="loadError" class="p-8 text-center" role="alert"><p>{{ loadError }}</p><button class="rx-action rx-action--ghost" @click="load">Reintentar</button></div>
            <div v-else-if="items.length === 0" class="bg-white border border-gray-200 shadow-md p-8 text-center">
                <h3 class="m-0 text-gray-700 text-lg font-semibold">Sin recetas registradas</h3>
                <p class="m-0 mt-2 text-gray-500">Las recetas creadas para este paciente aparecerán aquí.</p>
                <button v-if="canCreate" class="rx-action rx-action--primary mt-4" @click="openNew">Nueva receta</button>
            </div>

            <div v-else class="grid grid-cols-1 gap-3">
                <article v-for="item in items" :key="item.id_prescription" class="bg-white border border-gray-200 shadow-md p-4 prescription-card" :class="`prescription-card--${item.status}`">
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <h3 class="m-0 text-gray-700 text-lg font-semibold">{{ item.folio }}</h3>
                                <span class="px-2 py-1 text-xs font-semibold border" :class="statusClass(item.status)">
                                    {{ statusText(item.status) }}
                                </span>
                            </div>
                            <p class="m-0 mt-1 text-gray-500 text-sm">
                                Fecha: {{ item.issue_date }} | Doctor: {{ item.doctor_name || 'Sin doctor' }}
                                <span v-if="item.issued_at"> | Emitida: {{ formatDateTime(item.issued_at) }}</span>
                            </p>
                            <p class="m-0 mt-1 text-gray-600 text-sm truncate">Medicamentos: {{ item.medications || 'Sin medicamentos capturados' }}</p>
                            <p v-if="item.cancellation_reason" class="m-0 mt-1 text-red-600 text-sm">Motivo de cancelación: {{ item.cancellation_reason }}</p>
                        </div>
                        <div class="prescription-actions">
                            <button type="button" class="rx-action rx-action--ghost" title="Ver receta" @click="preview(item)">
                                <v-icon small>mdi-eye-outline</v-icon>
                                <span>Ver</span>
                            </button>
                            <button v-if="item.status === 'draft' && canIssue" type="button" class="rx-action rx-action--issue" title="Emitir receta" @click="issueDraft(item)">
                                <v-icon small>mdi-check-decagram-outline</v-icon>
                                <span>Emitir</span>
                            </button>
                            <button v-else-if="item.status === 'draft'" type="button" class="rx-action rx-action--disabled" title="Tu rol no puede emitir recetas" @click="showMissingIssuePermission">
                                <v-icon small>mdi-lock-outline</v-icon>
                                <span>Emitir</span>
                            </button>
                            <button v-if="canPrint && item.status === 'issued'" :disabled="outputBusy" type="button" class="rx-action rx-action--ghost" title="Imprimir receta" @click="print(item)">
                                <v-icon small>mdi-printer-outline</v-icon>
                                <span>Imprimir</span>
                            </button>
                            <button v-if="canDownload && item.status === 'issued'" :disabled="outputBusy" type="button" class="rx-action rx-action--ghost" title="Descargar PDF" @click="download(item)">
                                <v-icon small>mdi-file-pdf-box</v-icon>
                                <span>PDF</span>
                            </button>
                            <button v-if="canEdit(item)" type="button" class="rx-action rx-action--edit" title="Editar borrador" @click="edit(item)">
                                <v-icon small>mdi-pencil-outline</v-icon>
                                <span>Editar</span>
                            </button>
                            <button v-if="item.status === 'draft' && canEditDraft" type="button" class="rx-action rx-action--danger" title="Eliminar borrador" @click="deleteDraft(item)">
                                <v-icon small>mdi-trash-can-outline</v-icon>
                                <span>Eliminar</span>
                            </button>
                            <button v-if="item.status === 'issued' && canCancel" type="button" class="rx-action rx-action--danger" title="Cancelar receta" @click="cancel(item)">
                                <v-icon small>mdi-close-octagon-outline</v-icon>
                                <span>Cancelar</span>
                            </button>
                        </div>
                    </div>
                </article>
            </div>
        </div>

        <list-page-nav :pagination="pagination" :busy="loading" @change="changePage" />

        <prescription-form
            ref="editor"
            :show="formDialog"
            :px="px"
            :prescription="selected"
            @close="formDialog = false"
            @saved="onSaved"
            @draft-saved="load"
        ></prescription-form>

        <v-dialog v-model="previewDialog" max-width="760" aria-label="Vista previa de receta">
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
                                <h3 class="m-0 text-gray-700 font-semibold">{{ previewData.doctor_name || previewData.doctor_name_snapshot || 'Doctor emisor' }}</h3>
                                <p class="m-0 text-sm text-gray-500">Folio: {{ previewData.folio }}</p>
                                <p class="m-0 text-sm text-gray-500">Estado: {{ statusText(previewData.status) }}</p>
                            </div>
                            <p class="m-0 text-sm text-gray-500">{{ previewData.issue_date }}</p>
                        </div>
                        <div class="py-4 text-sm text-gray-600">
                            <p class="m-0"><strong>Paciente:</strong> {{ patientName }}</p>
                            <p v-if="previewData.diagnosis" class="m-0 mt-1"><strong>Diagnostico:</strong> {{ previewData.diagnosis }}</p>
                        </div>
                        <div v-for="(item, index) in previewData.items || []" :key="item.id_prescription_item || index" class="border border-gray-200 p-3 mb-3">
                            <p class="m-0 font-semibold text-gray-700">{{ index + 1 }}. {{ item.generic_name }}</p>
                            <p class="m-0 text-sm text-gray-500">{{ item.dose }} | {{ item.administration_route }} | {{ item.frequency }} | {{ item.duration }}</p>
                            <p v-if="item.indications" class="m-0 mt-1 text-sm text-gray-600">{{ item.indications }}</p>
                        </div>
                        <p v-if="previewData.notes" class="m-0 mt-4 text-sm text-gray-600"><strong>Notas:</strong> {{ previewData.notes }}</p>
                        <p v-if="previewData.cancellation_reason" class="m-0 mt-4 text-sm text-red-600"><strong>Motivo de cancelación:</strong> {{ previewData.cancellation_reason }}</p>
                        <p v-if="previewData.cancelled_at" class="m-0 mt-1 text-sm text-red-700"><strong>Fecha de cancelación:</strong> {{ formatDateTime(previewData.cancelled_at) }}</p>
                    </div>
                </v-card-text>
                <v-card-actions v-if="previewData" class="px-6 pb-5 justify-end flex-wrap">
                    <div class="prescription-actions">
                        <button v-if="previewData.status === 'draft' && canIssue" type="button" class="rx-action rx-action--issue" title="Emitir receta" @click="issueDraft(previewData)">
                            <v-icon small>mdi-check-decagram-outline</v-icon>
                            <span>Emitir receta</span>
                        </button>
                        <button v-else-if="previewData.status === 'draft'" type="button" class="rx-action rx-action--disabled" title="Tu rol no puede emitir recetas" @click="showMissingIssuePermission">
                            <v-icon small>mdi-lock-outline</v-icon>
                            <span>Emitir receta</span>
                        </button>
                        <button v-if="canPrint && previewData.status === 'issued'" :disabled="outputBusy" type="button" class="rx-action rx-action--ghost" title="Imprimir receta" @click="print(previewData)">
                            <v-icon small>mdi-printer-outline</v-icon>
                            <span>Imprimir</span>
                        </button>
                        <button v-if="canDownload && previewData.status === 'issued'" :disabled="outputBusy" type="button" class="rx-action rx-action--ghost" title="Descargar PDF" @click="download(previewData)">
                            <v-icon small>mdi-file-pdf-box</v-icon>
                            <span>PDF</span>
                        </button>
                        <button v-if="previewData.status === 'issued' && canCancel" type="button" class="rx-action rx-action--danger" title="Cancelar receta" @click="cancel(previewData)">
                            <v-icon small>mdi-close-octagon-outline</v-icon>
                            <span>Cancelar</span>
                        </button>
                    </div>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import { DAPrescriptionService } from '../../../services/context/core-proccess-context';
import PrescriptionForm from '../../prescriptions/components/PrescriptionForm.vue';
import { openPrescriptionPrintWindow } from '../../../domain/prescriptions/prescription.print';
import dialogName from '../../../core/directives/dialog-name';

import ListPageNav from '../../../components/common/ListPageNav.vue';

export default {
    directives: { dialogName },
    props: {
        px: {
            type: Object,
            default: () => ({})
        }
    },
    components: {
        ListPageNav,
        PrescriptionForm
    },
    data() {
        return {
            items: [],
            page: 1,
            pagination: null,
            loading: true,
            outputBusy: false,
            loadError: '',
            loadRequest: 0,
            selected: null,
            formDialog: false,
            previewDialog: false,
            previewData: null,
            loadingAction: false,
            statusLegend: [
                { value: 'draft', label: 'Borrador', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                { value: 'issued', label: 'Emitida', className: 'bg-blue-50 text-blue-700 border-blue-200' },
                { value: 'cancelled', label: 'Cancelada', className: 'bg-red-50 text-red-700 border-red-200' }
            ]
        };
    },
    mounted() {
        this.load();
    },
    watch: {
        pagingScope() { this.loadRequest++; this.page = 1; this.items = []; this.pagination = null; this.load(); },
        'px.person.id_person': function(value) {
            if(value) {
                this.page = 1;
                this.pagination = null;
                this.items = [];
                this.load();
            }
        }
    },
    computed: {
        pagingScope() { const getters = this.$store && this.$store.getters || {}; return JSON.stringify([getters['auth/getUser'], getters['auth/getBusiness'], getters['auth/getPermissions']]); },
        ...mapGetters(moduleTypes.AUTH, {
            hasPermission: fnTypes.hasPermission
        }),
        patient() {
            return this.px && this.px.person ? this.px.person : {};
        },
        patientName() {
            return this.patient.fullname || `${this.patient.name || ''} ${this.patient.surname || ''}`.trim() || 'Paciente';
        },
        canCreate() {
            return this.hasPermission('prescriptions.create');
        },
        canEditDraft() {
            return this.hasPermission('prescriptions.edit_draft');
        },
        canCancel() {
            return this.hasPermission('prescriptions.cancel');
        },
        canIssue() {
            return this.hasPermission('prescriptions.issue');
        },
        canPrint() {
            return this.hasPermission('prescriptions.print');
        },
        canDownload() {
            return this.hasPermission('prescriptions.download');
        }
    },
    beforeDestroy() { this.loadRequest++; },
    methods: {
        changePage(page) { this.page = page; return this.load(); },
        async load() {
            const request = ++this.loadRequest, scope = this.pagingScope;
            this.loading = true;
            this.loadError = '';
            const idPerson = this.patient.id_person;
            if(!idPerson) {
                this.loading = false;
                this.loadError = 'No se pudo identificar al paciente.';
                return;
            }
            try {
                const response = await DAPrescriptionService.listByPatient(idPerson, { page: this.page, page_size: 10 });
                if(request !== this.loadRequest || scope !== this.pagingScope) return;
                if(!response.success) throw new Error(response.message || 'No se pudo cargar el historial de recetas.');
                this.items = Array.isArray(response.data) ? response.data : response.data.items || [];
                this.pagination = response.data.pagination || null;
                if(this.pagination) this.page = this.pagination.page;
            } catch(error) { if(request === this.loadRequest && scope === this.pagingScope) this.loadError = error.message; }
            finally { if(request === this.loadRequest && scope === this.pagingScope) this.loading = false; }
        },
        confirmLeave() {
            return this.$refs.editor ? this.$refs.editor.confirmLeave() : Promise.resolve(true);
        },
        openNew() {
            this.selected = null;
            this.formDialog = true;
        },
        edit(item) {
            this.selected = item;
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
            else {
                this.toast('error', response.message || 'No se pudo cargar la receta.');
            }
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
                this.toast('warning', 'Solo las recetas emitidas pueden imprimirse o generar PDF.');
                return false;
            }
            if(action === 'printed' ? !this.canPrint : !this.canDownload) {
                this.toast('warning', 'No tienes permiso para esta acción de receta.');
                return false;
            }
            this.outputBusy = true;
            try {
                const response = await DAPrescriptionService.prepareOutput(item.id_prescription, action, { source: 'patient_record' });
                const document = response.data && response.data.prescription;
                if(!response.success || !document || document.status !== 'issued' || document.id_prescription !== item.id_prescription) {
                    this.toast('error', response.message || 'No se autorizó la impresión o el PDF. Reintenta consultando su estado.');
                    if(response.data && response.data.status) {
                        if(this.previewData && this.previewData.id_prescription === item.id_prescription) this.previewData = { ...this.previewData, ...response.data };
                        await this.load();
                    }
                    return false;
                }
                if(!openPrescriptionPrintWindow(document, response.data.config || {}, true)) {
                    this.toast('warning', 'El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes y reintenta.');
                    return false;
                }
                return true;
            } catch(error) {
                this.toast('error', 'No se pudo autorizar la copia. Reintenta cuando haya conexión.');
                return false;
            } finally { this.outputBusy = false; }
        },
        async deleteDraft(item) {
            const confirm = await this.$swal({
                title: 'Eliminar borrador',
                text: 'Esta acción elimina un borrador que aún no ha sido emitido.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cancelar',
                customClass: { confirmButton: 'medsync-alert-danger' }
            });
            if(!confirm.value) {
                return;
            }

            const response = await DAPrescriptionService.deleteDraft(item.id_prescription);
            if(!response.success) {
                this.toast('error', response.message || 'No se pudo eliminar el borrador.');
                return;
            }
            this.toast('success', 'Borrador eliminado.');
            await this.load();
        },
        async issueDraft(item) {
            this.previewDialog = false;
            this.edit(item);
        },
        showMissingIssuePermission() {
            this.toast('warning', 'Tu rol no tiene permiso para emitir recetas.');
        },
        async cancel(item) {
            const result = await this.$swal({
                title: 'Cancelar receta',
                input: 'textarea',
                inputLabel: 'Motivo de cancelación',
                inputPlaceholder: 'Describe el motivo...',
                inputAttributes: { maxlength: 500 },
                showCancelButton: true,
                confirmButtonText: 'Cancelar receta',
                cancelButtonText: 'Cerrar',
                customClass: { confirmButton: 'medsync-alert-danger' },
                inputValidator: (value) => !value ? 'Captura el motivo de cancelación.' : undefined
            });

            if(!result.value) {
                return;
            }

            const response = await DAPrescriptionService.cancel(item.id_prescription, result.value);
            if(!response.success) {
                this.toast('error', response.message || 'No se pudo cancelar la receta.');
                return;
            }
            this.toast('success', 'Receta cancelada.');
            this.previewDialog = false;
            await this.load();
        },
        async onSaved(document) {
            this.toast('success', `${document.status === 'issued' ? 'Receta emitida' : 'Borrador guardado'}: ${document.folio}.`);
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
        },
        formatDateTime(value) {
            if(!value) {
                return '';
            }
            return String(value).replace('T', ' ').slice(0, 16);
        },
        toast(type, text) {
            const Toast = this.$swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            Toast.fire({ icon: type, title: text });
        }
    }
};
</script>

<style scoped>
.rx-action.rx-action--primary { background: #116c70; color: white; border-color: #116c70; }
.prescription-body {
    padding: 1.25rem;
}

.prescription-intro {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-primary-200);
    border-radius: 12px;
    background: linear-gradient(180deg, var(--color-primary-100), #fff);
}

.prescription-kicker {
    margin: 0 0 0.2rem;
    color: var(--color-primary-900);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.prescription-intro h3 {
    margin: 0;
    color: #334155;
    font-size: 1rem;
    font-weight: 600;
}

.prescription-intro p:last-child {
    margin: 0.25rem 0 0;
    color: #64748b;
    font-size: 0.85rem;
    font-weight: 600;
}

.prescription-intro-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.7rem;
}

.prescription-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.45rem;
}

.prescription-add {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 2.35rem;
    padding: 0.45rem 0.9rem;
    border: 1px solid #b8e8ca;
    border-radius: 999px;
    background: #e8f8ef;
    color: #137445;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    line-height: 1;
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.1);
    transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.prescription-add:hover {
    transform: translateY(-1px);
    background: #d9f4e5;
}

.prescription-add .v-icon {
    color: currentColor;
}

.prescription-card {
    border-left-width: 4px;
}

.prescription-card--draft {
    border-left-color: #f6c343;
}

.prescription-card--issued {
    border-left-color: #2563eb;
}

.prescription-card--cancelled {
    border-left-color: #ef4444;
    opacity: 0.82;
}

.prescription-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
}

.rx-action {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2rem;
    padding: 0.35rem 0.7rem;
    border: 1px solid transparent;
    border-radius: 999px;
    background: #fff;
    color: #4b5563;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.rx-action:hover {
    transform: translateY(-1px);
}

.rx-action .v-icon {
    color: currentColor;
}

.rx-action--ghost {
    border-color: #d7eef4;
    color: var(--color-primary-900);
}

.rx-action--ghost:hover {
    background: #effbfe;
    border-color: var(--color-primary-300);
}

.rx-action--issue {
    background: #e8f8ef;
    border-color: #b8e8ca;
    color: #137445;
}

.rx-action--issue:hover {
    background: #d9f4e5;
}

.rx-action--edit {
    background: #eef9fc;
    border-color: #bdebf5;
    color: var(--color-primary-700);
}

.rx-action--edit:hover {
    background: #ddf5fa;
}

.rx-action--danger {
    background: #fff1f2;
    border-color: #fecdd3;
    color: #b4232f;
}

.rx-action--danger:hover {
    background: #ffe4e8;
}

.rx-action--disabled {
    background: #f3f4f6;
    border-color: #e5e7eb;
    color: #6b7280;
}

@media (max-width: 768px) {
    .prescription-body {
        padding: 1rem;
    }

    .prescription-intro {
        align-items: flex-start;
        flex-direction: column;
    }

    .prescription-intro-actions,
    .prescription-legend {
        justify-content: flex-start;
    }
}
</style>
