<template>
    <v-card v-dialog-name="'Editar diagnóstico dental'" class="odontogram-editor" :aria-busy="String(saving)">
        <div class="editor-header">
            <div class="editor-heading">
                <p class="editor-eyebrow">Odontograma</p>
                <h2>Diagnóstico de región dental</h2>
                <span class="editor-region">Región {{ item.sec }}</span>
            </div>
            <v-btn icon class="editor-close" :disabled="saving" aria-label="Cerrar editor de diagnóstico" @click="onClose">
                <v-icon>mdi-close</v-icon>
            </v-btn>
        </div>

        <v-card-text class="editor-body">
            <p :id="'diagnosis-help-' + _uid" class="editor-help">Describe los hallazgos y el diagnóstico de esta región dental.</p>
            <v-textarea
                v-field-error="{ id: 'diagnosis-' + _uid, invalid: diagnosisInvalid }"
                v-model="$v.odontogramDetail.treatment.$model"
                :id="'diagnosis-' + _uid"
                label="Diagnóstico"
                :aria-describedby="'diagnosis-help-' + _uid"
                :error-messages="diagnosisInvalid ? ['Escribe el diagnóstico de esta región dental.'] : []"
                rows="6"
                :disabled="saving"
                color="var(--color-primary-700)"
                maxlength="1000"
                counter="1000"
                outlined
                autofocus
                class="editor-field"
            />
            <v-alert v-if="saveError" outlined dense type="error" role="alert" class="editor-error">{{ saveError }}</v-alert>
        </v-card-text>

        <v-card-actions class="editor-footer">
            <span v-if="saving" role="status" class="editor-saving">Guardando diagnóstico…</span>
            <v-spacer></v-spacer>
            <v-btn outlined :disabled="saving" class="editor-cancel" @click="onClose">Cancelar</v-btn>
            <v-btn depressed :disabled="saving" :loading="saving" color="var(--color-primary-900)" class="editor-submit" @click="onSave">Guardar diagnóstico</v-btn>
        </v-card-actions>
    </v-card>

</template>

<script>
import fnTypes from '../../../store/modules/common/fn-types';
import moduleTypes from '../../../store/modules/common/module-types';
import {  mapState } from 'vuex';
import { validationMixin } from 'vuelidate';
import { required } from 'vuelidate/lib/validators';

import VuexMixin from '../../../mixins/VuexMixin';
import { buildOdontogramDetailPayload } from '../../../domain/odontogram/odontogram.builder';
import dialogName from '../../../core/directives/dialog-name';
import fieldError from '../../../core/directives/field-error';

export default {
    directives: { dialogName, fieldError },
    mixins: [validationMixin, VuexMixin],
    props:{
        item: {
            type: Object,
            default: function() {return {}}
        }
    },
    data: function() {
        return {
            saving: false,
            saveError: ''
        }
    },
    validations: {
        odontogramDetail: {
            id_tooth: {
                required
            },
            treatment: {
                required
            }
        },
        id_person: {
            required
        }
    },
    computed: {
        diagnosisInvalid() {
            return this.$v.odontogramDetail.treatment.$invalid && this.$v.odontogramDetail.treatment.$anyDirty;
        },
        ...mapState(moduleTypes.ODONTOGRAM, {
            odontogramDetail: fnTypes.odontogramDetail
      }),
        ...mapState(moduleTypes.PX, {
            id_person: fnTypes.id_person
      }),
    },
    
    methods: {
        onSave: async function() {
            if(this.saving) return;
            this.$v.$touch();
            if(this.$v.$invalid) return;
            this.saving = true;
            this.$emit('busy', true);
            this.saveError = '';
            try {
                const data = buildOdontogramDetailPayload(this.odontogramDetail, this.id_person);
                const response = await this.ActionWrapp(moduleTypes.ODONTOGRAM, fnTypes.saveOdontograDetail, {data, id_person: this.id_person});
                if(!response || !response.success) {
                    this.saveError = response && response.message || 'No se pudo guardar el diagnóstico. Intenta de nuevo.';
                    return;
                }
                this.$emit('saved', response);
                this.$emit('close');
            } catch(error) {
                this.saveError = 'No se pudo guardar el diagnóstico. Intenta de nuevo.';
            } finally {
                this.saving = false;
                this.$emit('busy', false);
            }
        },
        onClose() {
            if(!this.saving) this.$emit('close')
        }
    }
}

</script>

<style scoped>
.odontogram-editor { border: 1px solid var(--color-border, #d8e9ef); border-radius: 12px; overflow: hidden; background: var(--color-surface); color: var(--color-text, #25364d); }
.editor-header { display: flex; align-items: flex-start; gap: 16px; padding: 24px; border-bottom: 1px solid var(--color-border, #d8e9ef); background: var(--color-primary-50, #effbfe); }
.editor-heading { flex: 1; min-width: 0; }
.editor-eyebrow { margin: 0 0 6px; color: var(--color-text-muted, #64748b); font-size: 10px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; }
.editor-heading h2 { margin: 0; color: var(--color-text, #25364d); font-size: 22px; line-height: 1.35; font-weight: 600; overflow-wrap: anywhere; }
.editor-region { display: inline-flex; margin-top: 12px; padding: 5px 11px; border: 1px solid var(--color-primary-200); border-radius: 999px; color: var(--color-primary-900); background: var(--color-primary-100); font-size: 12px; font-weight: 600; }
.editor-header .editor-close { flex: 0 0 auto; margin: -6px -6px 0 0; color: var(--color-text-muted, #64748b); }
.odontogram-editor .editor-body { padding: 22px 24px; background: var(--color-bg, #f8fbfd); }
.editor-help { margin: 0 0 22px; color: var(--color-text-muted, #64748b); font-size: 14px; line-height: 1.6; }
.editor-field { margin: 0; }
.editor-field ::v-deep .v-input__slot { background: var(--color-surface); border-radius: 8px; }
.editor-field ::v-deep textarea { color: var(--color-text, #25364d); font-size: 14px; line-height: 1.6; }
.editor-field ::v-deep textarea:focus { outline: none; }
.editor-field ::v-deep .v-label,
.editor-field ::v-deep .v-counter { color: var(--color-text-muted, #64748b); }
.editor-field:not(.error--text) ::v-deep fieldset { border-color: var(--color-border, #d8e9ef); }
.editor-field.v-input--is-focused:not(.error--text) ::v-deep fieldset { border-color: var(--color-primary-700); }
.editor-error { margin: 16px 0 0; font-size: 13px; line-height: 1.5; }
.odontogram-editor .editor-footer { gap: 10px; padding: 18px 24px; border-top: 1px solid var(--color-border, #d8e9ef); background: var(--color-surface); flex-wrap: wrap; }
.editor-footer .v-btn { margin: 0; min-height: 40px; padding: 0 18px; border-radius: 8px; font-size: 13px; letter-spacing: 0; text-transform: none; font-weight: 600; }
.editor-footer .editor-cancel { border-color: var(--color-border, #d8e9ef); color: var(--color-text, #25364d); }
.editor-footer .editor-submit:not(.v-btn--disabled) { color: #fff; }
.editor-saving { font-size: 12px; color: var(--color-text-muted, #64748b); }
html[data-theme="clinical-night"] .odontogram-editor { --color-surface: #1e293b; --color-bg: #0f172a; --color-border: #334155; --color-text: #e5e7eb; --color-text-muted: #94a3b8; }
html[data-theme="clinical-night"] .editor-header { background: var(--color-bg, #0f172a); }
html[data-theme="clinical-night"] .editor-field ::v-deep textarea { background-color: transparent !important; }
html[data-theme="clinical-night"] .editor-region { border-color: rgba(56, 189, 248, .35); color: #bae6fd; background: rgba(56, 189, 248, .1); }
@media (max-width: 480px) {
    .editor-header { gap: 10px; padding: 20px 16px; }
    .editor-heading h2 { font-size: 20px; }
    .odontogram-editor .editor-body { padding: 20px 16px; }
    .odontogram-editor .editor-footer { padding: 16px; flex-direction: column; align-items: stretch; }
    .editor-footer .spacer { display: none; }
    .editor-footer .v-btn { width: 100%; flex: none; }
    .editor-footer .editor-submit { order: -1; }
    .editor-saving { width: 100%; }
}
</style>
