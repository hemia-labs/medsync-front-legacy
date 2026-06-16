<template>
  <section class="patient-create-page">
    <header class="patient-create-hero">
      <div>
        <p class="patient-create-kicker">Alta administrativa</p>
        <h1>Nuevo paciente</h1>
        <p>Registra los datos basicos del paciente. La historia clinica se podra crear despues dentro del expediente.</p>
      </div>
      <button type="button" class="patient-create-secondary" @click="$router.push('/inicio')">
        Cancelar
      </button>
    </header>

    <div class="patient-create-shell">
      <article class="patient-create-section">
        <div class="section-heading">
          <p>Datos personales</p>
          <span>Informacion minima para crear el expediente.</span>
        </div>
        <div class="patient-create-grid">
          <v-text-field v-model.trim="form.name" label="Nombre" outlined dense :error-messages="fieldError('name')"></v-text-field>
          <v-text-field v-model.trim="form.firstSurname" label="Apellido paterno" outlined dense :error-messages="fieldError('firstSurname')"></v-text-field>
          <v-text-field v-model.trim="form.secondSurname" label="Apellido materno, opcional" outlined dense></v-text-field>
          <v-text-field v-model="form.birthDate" label="Fecha de nacimiento" type="date" outlined dense :error-messages="fieldError('birthDate')"></v-text-field>
          <v-text-field :value="form.age" label="Edad" outlined dense readonly></v-text-field>
          <v-text-field v-model.trim="form.mobilePhone" label="Telefono / celular" outlined dense :error-messages="fieldError('mobilePhone')"></v-text-field>
        </div>
      </article>

      <article class="patient-create-section">
        <div class="section-heading">
          <p>Datos opcionales</p>
          <span>Estos datos ayudan a identificar al paciente, pero no son historia clinica.</span>
        </div>
        <div class="patient-create-grid">
          <v-text-field v-model.trim="form.localPhone" label="Telefono local, opcional" outlined dense></v-text-field>
          <v-text-field v-model.trim="form.occupation" label="Ocupacion, opcional" outlined dense></v-text-field>
          <v-text-field v-model.trim="form.rfc" label="RFC, opcional" outlined dense></v-text-field>
        </div>
      </article>

      <article class="patient-create-section">
        <div class="section-heading">
          <p>Direccion</p>
          <span>La direccion es opcional en el alta; puede completarse despues.</span>
        </div>
        <div class="patient-create-grid">
          <v-text-field v-model.trim="form.streetAddress" label="Calle / domicilio" outlined dense></v-text-field>
          <v-text-field v-model.trim="form.city" label="Ciudad / municipio" outlined dense></v-text-field>
          <v-text-field v-model.trim="form.state" label="Estado" outlined dense></v-text-field>
          <v-text-field v-model.trim="form.postalCode" label="Codigo postal" outlined dense></v-text-field>
        </div>
      </article>

      <article class="patient-create-section patient-create-note">
        <div>
          <p>Contacto de emergencia</p>
          <span>La base de datos actual no tiene soporte dedicado para contacto de emergencia, correo o sexo del paciente. Quedo preparado un script SQL opcional para agregarlos sin afectar datos existentes.</span>
        </div>
      </article>

      <footer class="patient-create-actions">
        <button type="button" class="patient-create-secondary" :disabled="isSaving" @click="$router.push('/inicio')">
          Cancelar
        </button>
        <button type="button" class="patient-create-primary" :disabled="isSaving" @click="createPatient">
          {{ isSaving ? 'Creando...' : 'Crear paciente' }}
        </button>
      </footer>
    </div>
  </section>
</template>

<script>
import VuexMixin from '../../mixins/VuexMixin';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';

export default {
  mixins: [VuexMixin],
  data() {
    return {
      isSaving: false,
      submitted: false,
      form: {
        name: '',
        firstSurname: '',
        secondSurname: '',
        birthDate: '',
        age: '',
        mobilePhone: '',
        localPhone: '',
        occupation: '',
        rfc: '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: ''
      }
    };
  },
  watch: {
    'form.birthDate': function() {
      this.form.age = this.calculateAge(this.form.birthDate);
    }
  },
  methods: {
    calculateAge(value) {
      if(!value) {
        return '';
      }
      const birth = new Date(`${value}T00:00:00`);
      if(Number.isNaN(birth.getTime())) {
        return '';
      }
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if(monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age -= 1;
      }
      return age >= 0 ? age : '';
    },
    fieldError(field) {
      if(!this.submitted) {
        return [];
      }
      const messages = {
        name: 'El nombre del paciente es obligatorio.',
        firstSurname: 'El apellido paterno es obligatorio.',
        birthDate: 'La fecha de nacimiento es obligatoria.',
        mobilePhone: 'Ingresa al menos un telefono de contacto.'
      };
      return this.isMissing(field) ? [messages[field]] : [];
    },
    isMissing(field) {
      return !String(this.form[field] || '').trim();
    },
    validateForm() {
      const required = ['name', 'firstSurname', 'birthDate', 'mobilePhone'];
      return !required.some((field) => this.isMissing(field));
    },
    buildResidence() {
      return [this.form.city, this.form.state].filter(Boolean).join(', ');
    },
    buildPayload() {
      const surname = [this.form.firstSurname, this.form.secondSurname].filter(Boolean).join(' ');
      return {
        person: {
          name: this.form.name,
          surname,
          birthday: this.form.birthDate,
          age: this.form.age,
          telephone: this.form.mobilePhone,
          local_telephone: this.form.localPhone || null,
          ocupation: this.form.occupation || null,
          rfc: this.form.rfc || null
        },
        address: {
          direction: this.form.streetAddress || null,
          residence: this.buildResidence() || null,
          cp: this.form.postalCode || null,
          place_birth: null
        }
      };
    },
    async createPatient() {
      this.submitted = true;
      if(!this.validateForm()) {
        return;
      }
      this.isSaving = true;
      const response = await this.ActionWrapp(moduleTypes.PX, fnTypes.createMinimal, this.buildPayload());
      this.isSaving = false;
      if(!response || !response.success || !response.data || !response.data.id_person) {
        this.$swal.fire({
          icon: 'error',
          title: 'No se pudo crear el paciente',
          text: response && response.message ? response.message : 'Revisa los datos e intenta nuevamente.'
        });
        return;
      }
      this.$router.push({
        path: `/px/history/${response.data.id_person}`,
        query: {
          tab: 'medical-history',
          fromCreatePatient: '1'
        }
      });
    }
  }
};
</script>

<style scoped>
.patient-create-page {
  max-width: 76rem;
  margin: 4.5rem auto 2rem;
  padding: 0 1rem;
}

.patient-create-hero,
.patient-create-shell {
  border: 1px solid var(--color-primary-200);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.09);
}

.patient-create-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 14px;
  margin-bottom: 1rem;
}

.patient-create-kicker,
.section-heading p,
.patient-create-note p {
  margin: 0;
  color: var(--color-primary-900);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.patient-create-hero h1 {
  margin: 0.15rem 0;
  color: #0f172a;
  font-size: 1.55rem;
  font-weight: 800;
}

.patient-create-hero p,
.section-heading span,
.patient-create-note span {
  margin: 0;
  color: #52627a;
  font-size: 0.92rem;
}

.patient-create-shell {
  border-radius: 14px;
  overflow: hidden;
}

.patient-create-section {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2edf5;
}

.section-heading {
  margin-bottom: 1rem;
}

.patient-create-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem 1rem;
}

.patient-create-note {
  background: #f8fbfd;
}

.patient-create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
}

.patient-create-primary,
.patient-create-secondary {
  min-height: 2.55rem;
  border-radius: 999px;
  padding: 0 1.15rem;
  font-weight: 800;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.patient-create-primary {
  color: white;
  background: var(--color-primary-700);
  box-shadow: 0 10px 20px rgba(14, 165, 190, 0.24);
}

.patient-create-secondary {
  color: var(--color-primary-900);
  border: 1px solid var(--color-primary-200);
  background: white;
}

.patient-create-primary:hover,
.patient-create-secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
}

.patient-create-primary:disabled,
.patient-create-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

@media (max-width: 768px) {
  .patient-create-hero,
  .patient-create-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .patient-create-grid {
    grid-template-columns: 1fr;
  }
}
</style>
