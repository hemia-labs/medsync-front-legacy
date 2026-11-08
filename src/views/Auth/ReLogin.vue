<template>
  <da-dialog v-model="show" :persist="true" :maxWidth="'520px'">
    <template #body>
      <v-form class="relogin-card" @submit.prevent="onLogin">
        <div class="relogin-icon" aria-hidden="true">
          <v-icon color="#0f766e">mdi-shield-lock-outline</v-icon>
        </div>

        <p class="relogin-eyebrow">Sesión protegida</p>
        <h2>Confirma tu acceso</h2>
        <p class="relogin-copy">
          {{ user && user.name ? user.name + ', ' : '' }}por seguridad necesitamos validar nuevamente tus credenciales.
        </p>

        <v-alert
          v-if="loginErrorMessage"
          type="error"
          dense
          text
          class="relogin-alert"
          aria-live="assertive"
        >
          {{ loginErrorMessage }}
        </v-alert>

        <v-text-field
          v-model.trim="$v.auth.param.$model"
          :label="ui.identifierLabel"
          type="text"
          maxlength="254"
          autocomplete="username"
          prepend-inner-icon="mdi-account-outline"
          outlined
          dense
          color="#0f766e"
          :error-messages="identifierErrors"
          :disabled="isSubmitting"
          @input="clearLoginError"
        ></v-text-field>

        <v-text-field
          v-model="$v.auth.pwd.$model"
          :label="ui.passwordLabel"
          :type="showPWD ? 'text' : 'password'"
          autocomplete="current-password"
          prepend-inner-icon="mdi-lock-outline"
          outlined
          dense
          color="#0f766e"
          :error-messages="passwordErrors"
          :disabled="isSubmitting"
          @input="clearLoginError"
        >
          <template v-slot:append>
            <v-btn
              icon
              small
              type="button"
              :aria-label="showPWD ? ui.hidePassword : ui.showPassword"
              @click="showPWD = !showPWD"
            >
              <v-icon small>{{ showPWD ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
            </v-btn>
          </template>
        </v-text-field>

        <p class="relogin-security-copy">
          Esta acción no mantiene la sesión abierta por más tiempo.
        </p>

        <div class="relogin-actions">
          <v-btn type="submit" depressed class="relogin-submit" :loading="isSubmitting" :disabled="isSubmitting">
            Iniciar sesión
          </v-btn>
          <v-btn type="button" outlined color="#334155" :disabled="isSubmitting" @click="logout">
            Salir
          </v-btn>
        </div>
      </v-form>
    </template>
  </da-dialog>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import DAAuthModel from '../../models/auth/DAAuthModel';
import { validationMixin } from 'vuelidate';
import { required, email, maxLength, or } from 'vuelidate/lib/validators';
import { loginPhonePattern } from '../../utils/common/regex';
import { getRememberedIdentifier } from '../../utils/authRememberedIdentifier';

export default {
  mixins: [validationMixin],
  props: {
    show: Boolean
  },
  data: function() {
    return {
      auth: new DAAuthModel(),
      showPWD: false,
      isSubmitting: false,
      ui: {
        identifierLabel: 'Correo electrónico o teléfono',
        passwordLabel: 'Contrase\u00f1a',
        showPassword: 'Mostrar contrase\u00f1a',
        hidePassword: 'Ocultar contrase\u00f1a'
      }
    };
  },
  created() {
    const remembered = getRememberedIdentifier();
    if (remembered) {
      this.auth.param = remembered;
    }
  },
  validations: {
    auth: {
      param: {
        required,
        identifier: or(email, loginPhonePattern),
        maxLength: maxLength(254)
      },
      pwd: {
        required
      }
    }
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, {
      hasError: fnTypes.hasError,
      user: fnTypes.getUser,
      isAuthorized: fnTypes.isAuthorized
    }),
    identifierErrors() {
      const errors = [];
      if (!this.$v.auth.param.$dirty) {
        return errors;
      }
      if (!this.$v.auth.param.required) {
        errors.push('Ingresa tu correo electrónico o teléfono.');
      } else if (!this.$v.auth.param.identifier || !this.$v.auth.param.maxLength) {
        errors.push('Ingresa un correo electrónico válido o un teléfono de entre 7 y 15 dígitos.');
      }
      return errors;
    },
    passwordErrors() {
      const errors = [];
      if (!this.$v.auth.pwd.$dirty) {
        return errors;
      }
      if (!this.$v.auth.pwd.required) {
        errors.push('Ingresa tu contrase\u00f1a.');
      }
      return errors;
    },
    loginErrorMessage() {
      if (!this.hasError || !this.hasError.error) {
        return '';
      }
      return this.safeLoginErrorMessage(this.hasError.message);
    }
  },
  methods: {
    ...mapActions(moduleTypes.AUTH, [
      fnTypes.login, fnTypes.logout
    ]),

    clearLoginError: function() {
      if (this.hasError && this.hasError.error) {
        this.hasError.error = false;
        this.hasError.message = '';
      }
    },

    safeLoginErrorMessage: function(message) {
      const normalized = String(message || '').toLowerCase();
      if (normalized.includes('demasiadas') || normalized.includes('rate') || normalized.includes('429') || normalized.includes('auth_rate_limited')) {
        return 'Por seguridad, bloqueamos temporalmente nuevos intentos. Int\u00e9ntalo m\u00e1s tarde.';
      }

      if (normalized.includes('network') || normalized.includes('timeout') || normalized.includes('no fue posible completar')) {
        return 'No pudimos conectar con MedSync. Revisa tu conexi\u00f3n e int\u00e9ntalo nuevamente.';
      }

      return 'No pudimos iniciar sesi\u00f3n con esos datos.';
    },

    onLogin: async function() {
      if (this.isSubmitting) {
        return;
      }

      this.auth.refresh = false;
      this.$v.$touch();
      if (this.$v.auth.param.$invalid || this.$v.auth.pwd.$invalid) {
        return;
      }

      this.isSubmitting = true;
      await this.login(this.auth);
      this.isSubmitting = false;
      if (this.isAuthorized) {
        this.$emit('auth');
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.relogin-card {
  box-sizing: border-box;
  background: #fff;
  border: 1px solid rgba(20, 184, 166, 0.26);
  border-radius: 24px;
  box-shadow: 0 28px 70px rgba(8, 47, 73, 0.18);
  padding: 2rem;
  color: #0f172a;
}

.relogin-icon {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ecfdf5;
  border: 1px solid rgba(15, 118, 110, 0.18);
  margin-bottom: 1rem;
}

.relogin-eyebrow {
  margin: 0 0 0.35rem;
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.relogin-card h2 {
  margin: 0;
  font-size: 1.6rem;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: 0;
}

.relogin-copy,
.relogin-security-copy {
  color: #64748b;
  line-height: 1.5;
}

.relogin-copy {
  margin: 0.65rem 0 1.25rem;
}

.relogin-security-copy {
  margin: 0.25rem 0 1rem;
  font-size: 0.86rem;
}

.relogin-alert {
  margin-bottom: 1rem;
}

.relogin-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.relogin-submit {
  min-height: 3rem;
  background: linear-gradient(135deg, #0f766e, #0891b2);
  color: #fff;
  border-radius: 14px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
}

@media (max-width: 520px) {
  .relogin-card {
    padding: 1.25rem;
  }

  .relogin-actions {
    grid-template-columns: 1fr;
  }
}
</style>
