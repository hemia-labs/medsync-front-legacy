<template>
    <v-card v-dialog-name="'Historial de odontogramas'" class="odontogram-history" :aria-busy="String(loading || pending)">
        <header class="history-header">
            <span class="history-icon"><v-icon size="24">mdi-history</v-icon></span>
            <div class="history-heading">
                <p class="history-kicker">Odontograma</p>
                <h2>Historial de odontogramas</h2>
                <p>Consulta los registros del paciente y administra cuál permanece activo.</p>
            </div>
            <v-btn icon :disabled="pending" aria-label="Cerrar historial de odontogramas" @click="onClose"><v-icon>mdi-close</v-icon></v-btn>
        </header>

        <v-card-text class="history-body">
            <section v-if="loading" class="history-state" role="status" aria-live="polite">
                <v-progress-circular indeterminate size="26" width="3" color="var(--color-primary-700)"></v-progress-circular>
                <h3>Cargando historial…</h3>
                <p>Estamos consultando los odontogramas del paciente.</p>
            </section>
            <section v-else-if="loadError" class="history-state history-state-error" role="alert">
                <v-icon size="30">mdi-alert-circle-outline</v-icon>
                <h3>No se pudo cargar el historial</h3>
                <p>{{ loadError }}</p>
                <v-btn outlined :disabled="loading || pending" class="history-button" @click="init">Reintentar</v-btn>
            </section>
            <template v-else>
                <div class="history-toolbar">
                    <div class="history-count">
                        <strong>{{ historyItems.length }} {{ historyItems.length === 1 ? 'odontograma' : 'odontogramas' }}</strong>
                        <span>Los registros finalizados se conservan en el expediente.</span>
                    </div>
                    <v-text-field v-model="search" label="Buscar en el historial" prepend-inner-icon="mdi-magnify" outlined dense hide-details clearable :disabled="pending" class="history-search"></v-text-field>
                </div>
                <p v-if="actionError && !isDelete && !isChangeActive" role="alert" class="history-action-error">{{ actionError }}</p>
                <section v-if="!historyItems.length" class="history-state">
                    <v-icon size="34">mdi-tooth-outline</v-icon>
                    <h3>Aún no hay odontogramas</h3>
                    <p>Los odontogramas que crees aparecerán aquí para dar seguimiento al paciente.</p>
                </section>
                <section v-else-if="!filteredHistory.length" class="history-state" role="status">
                    <v-icon size="32">mdi-magnify</v-icon>
                    <h3>Sin resultados</h3>
                    <p>Prueba con otro tipo de dentición, fecha o estado.</p>
                    <v-btn text class="history-button" @click="search = ''">Limpiar búsqueda</v-btn>
                </section>
                <ul v-else class="history-list" aria-label="Odontogramas del paciente">
                    <li v-for="item in filteredHistory" :key="item.id_odontogramv1" class="history-record">
                        <div class="record-summary">
                            <div class="record-title-row">
                                <h3>{{ item.description || 'Dentición no registrada' }}</h3>
                                <span class="record-status" :class="{ 'is-active': isActive(item.active) }">{{ isActive(item.active) ? 'Activo' : 'Finalizado' }}</span>
                            </div>
                            <p class="record-date"><v-icon size="16">mdi-calendar-outline</v-icon>Creado el {{ formatCreatedAt(item) }}</p>
                            <span v-if="item.code" class="record-code">Código {{ item.code }}</span>
                        </div>
                        <div class="record-actions">
                            <v-btn outlined class="history-button record-status-action" :disabled="pending || loading || !!loadError" @click="onEvent({ ...item, active: !isActive(item.active) }, actions.CHANGEACTIVE)">
                                <v-icon left size="17">{{ isActive(item.active) ? 'mdi-check-circle-outline' : 'mdi-restore' }}</v-icon>
                                {{ isActive(item.active) ? 'Finalizar' : 'Activar' }}
                            </v-btn>
                            <v-btn text class="history-button record-delete" :disabled="pending || loading || !!loadError" :aria-label="'Eliminar odontograma ' + (item.description || '') + ' del ' + formatCreatedAt(item)" @click="onEvent(item, actions.DELETE)">
                                <v-icon left size="17">mdi-trash-can-outline</v-icon>Eliminar
                            </v-btn>
                        </div>
                    </li>
                </ul>
            </template>
        </v-card-text>

        <v-card-actions class="history-footer">
            <span v-if="pending" role="status" aria-live="polite">Guardando cambios…</span>
            <v-spacer></v-spacer>
            <v-btn outlined :disabled="pending" class="history-button" @click="onClose">Cerrar</v-btn>
        </v-card-actions>

        <odontogram-confirm-dialog
            :value="isChangeActive"
            :title="isActive(odontogramEdit.active) ? 'Activar odontograma' : 'Finalizar odontograma'"
            :message="isActive(odontogramEdit.active) ? 'Este odontograma volverá a estar activo. Si hay otro activo, se finalizará y se conservará en el historial.' : 'El odontograma se conservará en el historial. Puedes volver a activarlo cuando necesites continuar su registro.'"
            :confirm-label="isActive(odontogramEdit.active) ? 'Activar odontograma' : 'Finalizar odontograma'"
            :icon="isActive(odontogramEdit.active) ? 'mdi-restore' : 'mdi-check-circle-outline'"
            :busy="pending"
            :error="actionError"
            @confirm="onChangeActive(odontogramEdit, true)"
            @input="value => !value && onChangeActive(odontogramEdit, false)"
        ></odontogram-confirm-dialog>
        <odontogram-confirm-dialog
            :value="isDelete"
            title="Eliminar odontograma"
            message="Se eliminarán este odontograma y sus diagnósticos del expediente. Esta acción no se puede revertir."
            confirm-label="Eliminar odontograma"
            icon="mdi-trash-can-outline"
            :busy="pending"
            :error="actionError"
            danger
            @confirm="onDelete(odontogramEdit)"
            @input="value => !value && onCancelDelete()"
        ></odontogram-confirm-dialog>
    </v-card>
</template>


<script>
import {mapGetters, mapActions, mapMutations } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import actions from '../../../utils/common/actions';
import mutationTypes from '../../../store/modules/common/mutation-types';
import OdontogramConfirmDialog from '../Sections/components/OdontogramConfirmDialog.vue';
import dialogName from '../../../core/directives/dialog-name';
import { formatOdontogramCreatedAt } from '../../../domain/odontogram/odontogram.date';
import {
    buildOdontogramDeletePayload,
    buildOdontogramStatusPayload
} from '../../../domain/odontogram/odontogram.builder';

export default {
    directives: { dialogName },
    props: {
        id: {
            type: String,
            default: ""
        },
        open: Boolean
    },
    data: function() {
        return {
            actions,
            isChangeActive: false,
            isDelete: false,
            loading: false,
            pending: false,
            loadError: '',
            actionError: '',
            search: '',
        }
    },
    components: {
        OdontogramConfirmDialog,
    },
    mounted() {
            this.init();
    },
    computed: {
        ...mapGetters(moduleTypes.ODONTOGRAM, {
            hasError: fnTypes.hasError,
            history: fnTypes.history,
            odontogramEdit: fnTypes.odontogramEdit,
        }),
        historyItems() {
            return Array.isArray(this.history) ? this.history : [];
        },
        filteredHistory() {
            const query = this.normalizeSearch(this.search);
            if(!query) return this.historyItems;
            return this.historyItems.filter(item => this.normalizeSearch([
                item.code, item.description, item.created_at,
                this.formatCreatedAt(item), this.isActive(item.active) ? 'Activo' : 'Finalizado'
            ].join(' ')).includes(query));
        },
    },
    methods: {
        isActive(value) {
            return value === true || value === 1 || value === '1';
        },
        normalizeSearch(value) {
            return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        },
        formatCreatedAt: formatOdontogramCreatedAt,
        ...mapMutations(moduleTypes.ODONTOGRAM, [
            mutationTypes.SET_ODONTOGRAM_EDIT
        ]),
        ...mapActions(moduleTypes.ODONTOGRAM, [
                fnTypes.getOdontogramHistory, fnTypes.status, fnTypes.delete
        ]),
        init: async function() {
                if(this.loading || this.pending) return;
                this.loading = true;
                this.loadError = '';
                this.actionError = '';
                try {
                    const response = await this.getOdontogramHistory(this.id);
                    if(!response || !response.success) {
                        this.loadError = response && response.message || 'No se pudo cargar el historial.';
                    }
                } catch(error) {
                    this.loadError = 'No se pudo cargar el historial. Intenta de nuevo.';
                } finally {
                    this.loading = false;
                }
        },
        onEvent: function(data, action) {
                if(this.loading || this.pending || this.loadError || this.isChangeActive || this.isDelete) return;
                this.actionError = '';
                const modelData = {...data};

                switch(action) {
                    case actions.DELETE:
                    this.SET_ODONTOGRAM_EDIT(modelData);
                    this.isDelete = true;
                    break;
                    case actions.CHANGEACTIVE:
                    this.SET_ODONTOGRAM_EDIT(modelData);
                    this.isChangeActive = true;
                    break;
                }
            },
            onChangeActive: async function(data, confirm) {
                if(this.pending) return;
                if(!confirm){
                    this.isChangeActive = false;
                    this.actionError = '';
                    return;
                }
                if(!this.isChangeActive) return;
                this.pending = true;
                this.$emit('busy', true);
                this.actionError = '';
                try {
                    const dataModel = buildOdontogramStatusPayload(data.id_odontogramv1, data.active);
                    const response = await this.status({data: dataModel, id: this.id});
                    if(!response || !response.success) {
                        this.actionError = response && response.message || 'No se pudo cambiar el estado del odontograma.';
                        return;
                    }
                    this.isChangeActive = false;
                    if(response.refreshSuccess === false) this.$emit('refresh-error');
                    else this.$emit('close');
                } catch(error) {
                    this.actionError = 'No se pudo cambiar el estado del odontograma. Intenta de nuevo.';
                } finally {
                    this.pending = false;
                    this.$emit('busy', false);
                }
            },
            onDelete: async function(data) {
                if(this.pending || !this.isDelete) return;
                this.pending = true;
                this.$emit('busy', true);
                this.actionError = '';
                try {
                    const dataModel = buildOdontogramDeletePayload(data.id_odontogramv1);
                    const response = await this.delete({data: dataModel, id: this.id});
                    if(!response || !response.success) {
                        this.actionError = response && response.message || 'No se pudo eliminar el odontograma.';
                        return;
                    }
                    this.isDelete = false;
                    if(response.refreshSuccess === false) this.$emit('refresh-error');
                } catch(error) {
                    this.actionError = 'No se pudo eliminar el odontograma. Intenta de nuevo.';
                } finally {
                    this.pending = false;
                    this.$emit('busy', false);
                }
            },
            onCancelDelete() {
                if(this.pending) return;
                this.isDelete = false;
                this.actionError = '';
            },
            onClose() {
                if(!this.pending) this.$emit('close');
            }
    },
    watch: {
        open: function(newValue) {
            if(newValue) {
                this.init()
            }
            
        }
    }
}

</script>

<style scoped>
.odontogram-history {
    overflow: hidden;
    border-radius: 12px;
    background: var(--color-surface);
    color: var(--color-text, #25364d);
}
.history-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 24px;
    border-bottom: 1px solid var(--color-border, #d8e9ef);
}
.history-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--color-primary-100);
}
.history-icon .v-icon { color: var(--color-primary-700); }
.history-heading { flex: 1; min-width: 0; }
.history-heading .history-kicker {
    margin: 0 0 5px;
    font-size: .67rem;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--color-primary-700);
}
.history-heading h2 { margin: 0; font-size: 1.2rem; font-weight: 600; line-height: 1.4; color: var(--color-text, #25364d); }
.history-heading p { margin: 7px 0 0; font-size: .82rem; line-height: 1.6; color: var(--color-text-muted, #64748b); }
.history-header > .v-btn { margin-top: -4px; margin-right: -8px; color: var(--color-text-muted, #64748b); }
.odontogram-history .history-body { padding: 24px; background: var(--color-bg, #f8fbfd); color: var(--color-text, #25364d); }
.history-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.history-count { display: grid; gap: 5px; }
.history-count strong { font-size: .88rem; font-weight: 600; color: var(--color-text, #25364d); }
.history-count span { font-size: .76rem; line-height: 1.5; color: var(--color-text-muted, #64748b); }
.history-search { flex: 0 1 290px; min-width: 230px; }
.history-search ::v-deep input:focus { outline: none; }
.history-search ::v-deep .v-input__slot { background: var(--color-surface); border-radius: 8px; }
.history-search ::v-deep .v-label, .history-search ::v-deep .v-icon { color: var(--color-text-muted, #64748b); }
.history-search ::v-deep input { color: var(--color-text, #25364d); }
html[data-theme="clinical-night"] .history-search ::v-deep input { background-color: transparent !important; }
.history-search ::v-deep fieldset { border-color: var(--color-border, #d8e9ef); }
.history-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 36px 20px;
    border: 1px solid var(--color-border, #d8e9ef);
    border-radius: 12px;
    background: var(--color-surface);
    text-align: center;
}
.history-state > .v-icon { color: var(--color-primary-700); }
.history-state h3 { margin: 0; font-size: .95rem; line-height: 1.5; color: var(--color-text, #25364d); font-weight: 600; }
.history-state p { margin: 0; max-width: 420px; font-size: .82rem; line-height: 1.65; color: var(--color-text-muted, #64748b); }
.history-state-error > .v-icon { color: #b45309; }
.history-list { display: grid; gap: 12px; list-style: none; padding: 0; margin: 0; }
.history-record {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    border: 1px solid var(--color-border, #d8e9ef);
    border-radius: 12px;
    padding: 20px;
    background: var(--color-surface);
}
.record-summary { min-width: 0; }
.record-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
.record-title-row h3 { margin: 0; font-size: .95rem; font-weight: 600; line-height: 1.5; color: var(--color-text, #25364d); overflow-wrap: anywhere; }
.record-status { padding: 3px 9px; border-radius: 999px; background: var(--color-bg, #f8fbfd); border: 1px solid var(--color-border, #d8e9ef); color: var(--color-text-muted, #64748b); font-size: .69rem; font-weight: 600; line-height: 1.5; }
.record-status.is-active { background: var(--color-primary-100); border-color: var(--color-primary-200); color: var(--color-primary-900); }
.history-record .record-date { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; font-size: .78rem; color: var(--color-text-muted, #64748b); }
.record-date .v-icon { color: inherit; }
.record-code { display: block; margin-top: 5px; font-size: .7rem; color: var(--color-text-muted, #64748b); }
.record-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; flex-shrink: 0; }
.odontogram-history .history-button { border-radius: 8px; text-transform: none; letter-spacing: 0; font-size: .8rem; font-weight: 600; }
.odontogram-history .record-status-action:not(.v-btn--disabled) { color: var(--color-primary-900); border-color: var(--color-primary-200); }
.odontogram-history .record-delete:not(.v-btn--disabled), .history-action-error { color: #b42335; }
.history-action-error { padding: 12px 16px; border-radius: 8px; border: 1px solid currentColor; font-size: .82rem; line-height: 1.6; }
.odontogram-history .history-footer { padding: 16px 24px; gap: 12px; border-top: 1px solid var(--color-border, #d8e9ef); background: var(--color-surface); }
.history-footer > span { color: var(--color-text-muted, #64748b); font-size: .78rem; }
.history-footer .history-button { margin: 0; color: var(--color-text, #25364d); border-color: var(--color-border, #d8e9ef); min-width: 100px; }
html[data-theme="clinical-night"] .odontogram-history { --color-text: #e2e8f0; --color-text-muted: #cbd5e1; --color-surface: #1e293b; --color-bg: #172333; --color-border: #3b4d63; }
html[data-theme="clinical-night"] .record-delete:not(.v-btn--disabled), html[data-theme="clinical-night"] .history-action-error { color: #fda4af; }
html[data-theme="clinical-night"] .record-status-action:not(.v-btn--disabled), html[data-theme="clinical-night"] .history-kicker { color: #7dd3fc; }
html[data-theme="clinical-night"] .history-state-error > .v-icon { color: #fcd34d; }
@media (max-width: 640px) {
    .history-header { gap: 10px; padding: 20px 16px; }
    .history-icon { flex-basis: 36px; width: 36px; height: 36px; border-radius: 10px; }
    .history-heading h2 { font-size: 1.1rem; }
    .history-heading p { font-size: .78rem; }
    .history-header > .v-btn { width: 32px; height: 32px; }
    .odontogram-history .history-body { padding: 20px 16px; }
    .history-toolbar { flex-direction: column; align-items: stretch; gap: 16px; }
    .history-search { flex: auto; min-width: 0; width: 100%; }
    .history-record { flex-direction: column; align-items: stretch; gap: 16px; padding: 16px; }
    .record-actions { border-top: 1px solid var(--color-border, #d8e9ef); padding-top: 14px; }
    .record-actions .history-button { flex: 1; }
    .history-state { padding: 28px 16px; }
    .odontogram-history .history-footer { padding: 16px; }
}
</style>
