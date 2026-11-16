<template>
  <div class="patient-identity">
    <div class="patient-identity-grid">
      <v-select
        ref="biologicalSex"
        v-field-error="{ id: 'patient-biologicalSex', invalid: Boolean(sexErrors.length), required: true }"
        :value="value.biologicalSex || ''"
        :items="sexItems"
        label="Sexo biológico *"
        :error-messages="sexErrors"
        :disabled="disabled"
        :menu-props="{ offsetY: true }"
        outlined
        dense
        @change="update(withField(value, 'biologicalSex', $event))"
        @blur="$emit('blur-sex')"
      ></v-select>
      <v-select
        v-for="field in enums"
        :key="field.key"
        :value="value[field.key] || ''"
        :items="field.items"
        :label="field.label + ', opcional'"
        :disabled="disabled"
        :menu-props="{ offsetY: true }"
        outlined
        dense
        @change="update(withField(value, field.key, $event))"
      ></v-select>
      <v-text-field
        :value="value.curp && value.curp.value"
        label="CURP, opcional"
        maxlength="18"
        hint="18 caracteres. Si no la conoces, déjala vacía."
        :disabled="disabled"
        outlined
        dense
        @input="update(withCurp(value, $event))"
      ></v-text-field>
      <template v-if="value.curp">
        <v-select
          :value="value.curp.kind"
          :items="curpKinds"
          label="Tipo de CURP"
          :disabled="disabled"
          :menu-props="{ offsetY: true }"
          outlined
          dense
          @change="update(withCurpDetail(value, 'kind', $event))"
        ></v-select>
        <v-text-field
          v-if="value.curp.kind === 'generic'"
          :value="value.curp.reason"
          label="Motivo de CURP genérica"
          maxlength="250"
          :disabled="disabled"
          outlined
          dense
          @input="update(withCurpDetail(value, 'reason', $event))"
        ></v-text-field>
      </template>
    </div>

    <button
      type="button"
      class="patient-identity-toggle"
      :aria-expanded="String(showReferences)"
      aria-controls="patient-identity-references"
      :disabled="disabled"
      @click="showReferences = !showReferences"
    >
      <v-icon small>{{ showReferences ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      <span>Claves de nacimiento y residencia, opcional</span>
    </button>
    <v-expand-transition>
      <div v-show="showReferences" id="patient-identity-references" class="patient-identity-references">
        <p>Captura solo claves conocidas. La validación contra catálogos está pendiente; guardar no acredita validez para un reporte.</p>
        <div class="patient-identity-grid">
          <v-text-field
            v-for="reference in references"
            :key="reference.key"
            :value="referenceCode(value, reference.key)"
            :label="reference.label"
            maxlength="32"
            :disabled="disabled"
            outlined
            dense
            @input="update(withReference(value, reference, $event))"
          ></v-text-field>
          <v-text-field
            class="patient-identity-wide"
            :value="listCodes(value, 'affiliations')"
            label="Afiliaciones: claves separadas por coma"
            :disabled="disabled"
            outlined
            dense
            @change="update(withList(value, 'affiliations', 'sis.affiliation', $event))"
          ></v-text-field>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script>
import fieldError from '../../../core/directives/field-error';
import {
    BIOLOGICAL_SEX, PATIENT_IDENTITY_ENUMS, PATIENT_IDENTITY_REFERENCES, selectItems,
    withField, withCurp, withCurpDetail, referenceCode, withReference, listCodes, withList
} from '../../../domain/patient/identityCapture';

export default {
    name: 'PatientIdentityFields',
    directives: { fieldError },
    props: {
        value: { type: Object, required: true },
        disabled: Boolean,
        sexErrors: { type: Array, default: () => [] }
    },
    data: () => ({
        showReferences: false,
        sexItems: selectItems(BIOLOGICAL_SEX),
        enums: PATIENT_IDENTITY_ENUMS.map(field => ({ ...field, items: selectItems(field.options) })),
        references: PATIENT_IDENTITY_REFERENCES,
        curpKinds: [{ text: 'Personal', value: 'real' }, { text: 'Genérica', value: 'generic' }]
    }),
    methods: {
        withField, withCurp, withCurpDetail, referenceCode, withReference, listCodes, withList,
        update(identity) { this.$emit('input', identity); },
        // Used by the form's error summary to take the user to the required field.
        focus() { const select = this.$refs.biologicalSex; if (select && select.focus) select.focus(); }
    }
};
</script>

<style scoped>
.patient-identity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem 1rem;
}

.patient-identity-wide {
  grid-column: 1 / -1;
}

.patient-identity-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.75rem;
  margin-top: 0.25rem;
  padding: 0 0.25rem;
  border-radius: 8px;
  color: var(--color-primary-900);
  font-size: 0.92rem;
  font-weight: 600;
  text-align: left;
}

.patient-identity-toggle .v-icon {
  color: inherit;
}

.patient-identity-toggle:hover {
  text-decoration: underline;
}

.patient-identity-toggle:focus-visible {
  outline: 2px solid var(--color-primary-700);
  outline-offset: 2px;
}

.patient-identity-references > p {
  margin: 0.25rem 0 1rem;
  color: #52627a;
  font-size: 0.92rem;
}

html[data-theme="clinical-night"] .patient-identity-toggle { color: #7dd3fc; }
html[data-theme="clinical-night"] .patient-identity-references > p { color: #e2e8f0; }

@media (max-width: 768px) {
  .patient-identity-grid {
    grid-template-columns: 1fr;
  }
}
</style>
