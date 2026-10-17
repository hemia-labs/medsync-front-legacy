<template>
  <section class="patient-administrative-form pa-5">
    <h2 class="text-lg font-semibold mb-2">Datos administrativos</h2>
    <p class="text-sm mb-4">Estos cambios actualizan la ficha del paciente. Los documentos clínicos ya registrados se conservan.</p>
    <v-form ref="form" @submit.prevent="save">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <v-text-field v-model.trim="form.person.name" label="Nombre" outlined dense :rules="[required]" />
        <v-text-field v-model.trim="form.person.surname" label="Apellidos" outlined dense :rules="[required]" />
        <v-text-field v-model="form.person.birthday" type="date" :max="today" label="Fecha de nacimiento" outlined dense :rules="[value => !administrativeErrors.birthDate || administrativeErrors.birthDate]" @input="updateAge" />
        <v-text-field :value="form.person.age" label="Edad" outlined dense readonly />
        <v-text-field v-model.trim="form.person.telephone" label="Celular" type="tel" inputmode="tel" hint="10 dígitos." outlined dense :rules="[value => !administrativeErrors.mobilePhone || administrativeErrors.mobilePhone]" />
        <v-text-field v-model.trim="form.person.local_telephone" label="Teléfono local, opcional" type="tel" inputmode="tel" hint="10 dígitos." outlined dense :rules="[value => !administrativeErrors.localPhone || administrativeErrors.localPhone]" />
        <v-text-field v-model.trim="form.person.ocupation" label="Ocupación, opcional" outlined dense />
        <v-text-field v-model.trim="form.person.rfc" label="RFC, opcional" outlined dense />
        <v-text-field v-model.trim="form.address.place_birth" label="Lugar de nacimiento, opcional" outlined dense />
        <v-text-field v-model.trim="form.address.residence" label="Lugar de residencia, opcional" outlined dense />
        <v-text-field v-model.trim="form.address.direction" label="Dirección, opcional" outlined dense />
        <v-text-field v-model.trim="form.address.cp" label="Código postal, opcional" inputmode="numeric" hint="5 dígitos." outlined dense :rules="[value => !administrativeErrors.postalCode || administrativeErrors.postalCode]" />
      </div>
      <p v-if="error" role="alert" class="error--text mb-3">{{ error }}</p>
      <div class="flex flex-wrap gap-3 justify-end">
        <v-btn outlined :disabled="saving" @click="$emit('cancel')">Cancelar</v-btn>
        <v-btn type="submit" color="primary" :loading="saving" :disabled="saving">Guardar datos</v-btn>
      </div>
    </v-form>
  </section>
</template>

<script>
import DAPxService from '../../../services/core/px/DAPxService';
import { patientAge, patientAdministrativeErrors, normalizePatientPhone, localDateString } from '../../../domain/patient/administrative.validation';
export default {
  props: { patient: { type: Object, required: true } },
  data() {
    const person = { ...this.patient.person };
    const date = String(person.birthday || '').split('-');
    if(date.length === 3 && date[0].length === 2) person.birthday = date.reverse().join('-');
    return { form: { person, address: { ...this.patient.address } }, saving: false, error: '' };
  },
  computed: {
    today() { return localDateString(); },
    administrativeErrors() {
      const person = this.form.person;
      return patientAdministrativeErrors({ name: person.name, firstSurname: person.surname, birthDate: person.birthday, mobilePhone: person.telephone, localPhone: person.local_telephone, postalCode: this.form.address.cp });
    }
  },
  methods: {
    required(value) { return String(value == null ? '' : value).trim().length > 0 || 'Campo obligatorio'; },
    updateAge(value) {
      this.form.person.age = patientAge(value);
    },
    async save() {
      this.updateAge(this.form.person.birthday);
      if(this.saving || !this.$refs.form.validate() || Object.keys(this.administrativeErrors).length) return;
      this.error = '';
      this.saving = true;
      try {
        const payload = { person: { ...this.form.person, telephone: normalizePatientPhone(this.form.person.telephone), local_telephone: normalizePatientPhone(this.form.person.local_telephone) || null }, address: { ...this.form.address } };
        const response = await DAPxService.updateAdministrative(payload);
        if(response.success) this.$emit('saved');
        else this.error = response.message || 'No se pudieron guardar los datos. Tu captura se conserva; intenta nuevamente.';
      } catch(error) { this.error = 'No se pudieron guardar los datos. Tu captura se conserva; intenta nuevamente.'; }
      finally { this.saving = false; }
    }
  }
};
</script>
