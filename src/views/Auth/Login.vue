<template>
  <main class="medsync-auth-screen">
    <da-loader v-bind:overlay="isLoading"></da-loader>

    <section class="auth-card-panel" aria-labelledby="login-title">
      <div class="auth-card" :class="{ 'auth-card--recovery': !isLoginView }">
        <div class="auth-brand">
          <div class="auth-logo-lockup">
            <img :src="bgLogotype" alt="MedSync" class="auth-brand-logo" @error="useDefaultLoginLogo">
            <div class="auth-brand-text">
              <span class="auth-brand-label">Portal clínico</span>
              <span class="auth-brand-subline">Operado con MedSync</span>
            </div>
          </div>
          <span class="auth-secure-badge">
            <v-icon small color="#0f766e">mdi-shield-check</v-icon>
            Acceso seguro
          </span>
        </div>

        <v-form v-if="isLoginView" class="login-form" @submit.prevent="onLogin">
          <p class="auth-eyebrow">Ingreso seguro</p>
          <h1 id="login-title" class="auth-title">Acceso a tu portal clínico</h1>
          <p class="auth-subtitle">
            Ingresa con tu teléfono y contraseña para continuar.
          </p>

          <v-alert
            v-if="sessionExpiredNotice"
            id="login-session-status"
            type="warning"
            dense
            text
            class="auth-alert"
            aria-live="polite"
          >
            {{ sessionExpiredNotice }}
          </v-alert>

          <v-alert
            v-if="loginErrorMessage"
            id="login-error-status"
            type="error"
            dense
            text
            class="auth-alert"
            aria-live="assertive"
          >
            {{ loginErrorMessage }}
          </v-alert>

          <v-text-field
            v-model.trim="$v.auth.param.$model"
            :label="ui.phoneLabel"
            type="tel"
            inputmode="numeric"
            maxlength="10"
            autocomplete="username"
            prepend-inner-icon="mdi-phone-outline"
            outlined
            dense
            class="auth-input"
            color="#0f766e"
            :error-messages="phoneErrors"
            :disabled="isLoading"
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
            class="auth-input"
            color="#0f766e"
            :error-messages="passwordErrors"
            :disabled="isLoading"
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

          <div class="auth-row">
            <v-checkbox
              v-model="rememberIdentifier"
              :label="ui.rememberPhone"
              color="#0f766e"
              hide-details
              class="remember-checkbox"
              :disabled="isLoading"
            ></v-checkbox>

            <button type="button" class="forgot-action" @click="validateInputsAuth(1)">
              Olvidé mi contraseña
            </button>
          </div>

          <v-btn
            type="submit"
            block
            depressed
            class="auth-submit"
            :loading="isLoading"
            :disabled="isLoading"
          >
            Iniciar sesión
          </v-btn>

          <p class="auth-security-copy">
            Tus credenciales son personales. Cierra sesión al terminar en equipos compartidos.
          </p>
          <p v-if="registrationAvailable" class="registration-entry">
            ¿Aún no tienes cuenta? <router-link :to="{ name: 'register' }">Crear cuenta</router-link>
          </p>
        </v-form>

        <div v-else class="recovery-wrapper" :class="'recovery-step-' + recoveryStep">
          <nav class="recovery-progress" aria-label="Progreso de recuperaci&oacute;n">
            <span
              v-for="step in recoverySteps"
              :key="step.key"
              class="recovery-progress-step"
              :class="{ active: recoveryStepIndex === step.index, complete: recoveryStepIndex > step.index || recoveryStep === 'success' }"
            >
              <span class="recovery-progress-dot">
                <v-icon x-small>{{ recoveryStepIndex > step.index || recoveryStep === 'success' ? 'mdi-check' : step.icon }}</v-icon>
              </span>
              <span>{{ step.label }}</span>
            </span>
          </nav>

          <v-alert
            v-if="recoveryStatus.message"
            :type="recoveryStatus.type"
            dense
            text
            class="auth-alert recovery-alert"
            :class="'recovery-alert--' + recoveryStatus.type"
            :icon="recoveryStatus.icon"
            :aria-live="recoveryStatus.type === 'error' ? 'assertive' : 'polite'"
          >
            <strong v-if="recoveryStatus.title">{{ recoveryStatus.title }}</strong>
            <span>{{ recoveryStatus.message }}</span>
          </v-alert>

          <v-form
            v-if="recoveryStep === 'phone'"
            class="recovery-step-card"
            aria-labelledby="recovery-phone-title"
            @submit.prevent="sendRecoveryCode"
          >
            <div class="recovery-heading">
              <p class="auth-eyebrow">Recuperaci&oacute;n segura</p>
              <h1 id="recovery-phone-title" class="auth-title">Recuperar acceso</h1>
              <p>Ingresa tu tel&eacute;fono para recibir un c&oacute;digo de recuperaci&oacute;n en el correo asociado a tu cuenta.</p>
            </div>

            <v-text-field
              v-model.trim="phoneOtp"
              :label="ui.phoneLabel"
              type="tel"
              inputmode="numeric"
              maxlength="15"
              autocomplete="username"
              prepend-inner-icon="mdi-phone-outline"
              color="#0f766e"
              outlined
              dense
              class="auth-input"
              :error-messages="recoveryPhoneErrors"
              :disabled="isLoading"
              @input="clearRecoveryFeedback"
              @blur="recoveryTouched.phone = true"
            ></v-text-field>

            <p class="recovery-security-copy">
              Por seguridad, no confirmaremos si el tel&eacute;fono existe en MedSync.
            </p>

            <div class="recovery-actions">
              <v-btn type="submit" block depressed class="auth-submit" :loading="isLoading" :disabled="isLoading">
                Enviar c&oacute;digo
              </v-btn>
              <button type="button" class="recovery-secondary-action" :disabled="isLoading" @click="returnToLogin">
                Volver a iniciar sesi&oacute;n
              </button>
            </div>
          </v-form>

          <v-form
            v-if="recoveryStep === 'code'"
            class="recovery-step-card"
            aria-labelledby="recovery-code-title"
            @submit.prevent="validateRecoveryCode"
          >
            <div class="recovery-heading">
              <p class="auth-eyebrow">C&oacute;digo de recuperaci&oacute;n</p>
              <h1 id="recovery-code-title" class="auth-title">Revisa tu correo</h1>
              <p>Ingresa el c&oacute;digo que enviamos para continuar con el cambio de contrase&ntilde;a.</p>
            </div>

            <p class="recovery-inline-note">
              Si existe una cuenta asociada, enviaremos un c&oacute;digo de recuperaci&oacute;n. El c&oacute;digo expira en pocos minutos.
            </p>

            <v-text-field
              v-model.trim="otp"
              :label="ui.recoveryCodeLabel"
              autocomplete="one-time-code"
              maxlength="12"
              prepend-inner-icon="mdi-email-lock-outline"
              color="#0f766e"
              outlined
              dense
              class="auth-input recovery-code-input"
              :error-messages="recoveryCodeErrors"
              :disabled="isLoading"
              @input="normalizeRecoveryCode"
              @blur="recoveryTouched.code = true"
            ></v-text-field>

            <div class="recovery-link-row">
              <button
                type="button"
                class="resend-action"
                :disabled="isLoading || resendCooldown > 0"
                @click="resendRecoveryCode"
              >
                <span v-if="resendCooldown > 0">Reenviar en {{ resendCooldown }}s</span>
                <span v-else>Reenviar c&oacute;digo</span>
              </button>
              <button type="button" class="resend-action" :disabled="isLoading" @click="goToRecoveryStep('phone')">
                Cambiar tel&eacute;fono
              </button>
            </div>

            <div class="recovery-actions">
              <v-btn type="submit" block depressed class="auth-submit" :loading="isLoading" :disabled="isLoading">
                Validar c&oacute;digo
              </v-btn>
              <button type="button" class="recovery-secondary-action" :disabled="isLoading" @click="returnToLogin">
                Volver a iniciar sesi&oacute;n
              </button>
            </div>
          </v-form>

          <v-form
            v-if="recoveryStep === 'password'"
            class="recovery-step-card"
            aria-labelledby="recovery-password-title"
            @submit.prevent="submitNewPassword"
          >
            <div class="recovery-heading">
              <p class="auth-eyebrow">Nueva contrase&ntilde;a</p>
              <h1 id="recovery-password-title" class="auth-title">Crea una nueva contrase&ntilde;a</h1>
              <p>Usa una contrase&ntilde;a segura para proteger tu acceso cl&iacute;nico.</p>
            </div>

            <v-text-field
              v-model="newPwd"
              :label="ui.newPasswordLabel"
              prepend-inner-icon="mdi-lock-outline"
              color="#0f766e"
              outlined
              dense
              class="auth-input"
              autocomplete="new-password"
              :type="showNewPWD ? 'text' : 'password'"
              :error-messages="newPasswordErrors"
              :disabled="isLoading"
              @input="clearRecoveryFeedback"
              @blur="recoveryTouched.password = true"
            >
              <template v-slot:append>
                <v-btn
                  icon
                  small
                  type="button"
                  :aria-label="showNewPWD ? ui.hideNewPassword : ui.showNewPassword"
                  @click="showNewPWD = !showNewPWD"
                >
                  <v-icon small>{{ showNewPWD ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
                </v-btn>
              </template>
            </v-text-field>

            <v-text-field
              v-model="newPwdRepet"
              :label="ui.confirmPasswordLabel"
              prepend-inner-icon="mdi-lock-check-outline"
              color="#0f766e"
              outlined
              dense
              class="auth-input"
              autocomplete="new-password"
              :type="showNewPwdRepeat ? 'text' : 'password'"
              :error-messages="confirmPasswordErrors"
              :disabled="isLoading"
              @input="clearRecoveryFeedback"
              @blur="recoveryTouched.confirmPassword = true"
            >
              <template v-slot:append>
                <v-btn
                  icon
                  small
                  type="button"
                  :aria-label="showNewPwdRepeat ? ui.hideConfirmPassword : ui.showConfirmPassword"
                  @click="showNewPwdRepeat = !showNewPwdRepeat"
                >
                  <v-icon small>{{ showNewPwdRepeat ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
                </v-btn>
              </template>
            </v-text-field>

            <div class="password-helper" aria-live="polite">
              <div class="password-strength" :class="'score-' + passwordStrength.score">
                <span v-for="index in 4" :key="index"></span>
              </div>
              <p>{{ passwordStrength.label }}</p>
              <ul class="password-requirements">
                <li :class="{ complete: passwordChecks.length }">
                  <v-icon x-small>{{ passwordChecks.length ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                  M&iacute;nimo 8 caracteres
                </li>
                <li :class="{ complete: passwordChecks.letter }">
                  <v-icon x-small>{{ passwordChecks.letter ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                  Una letra
                </li>
                <li :class="{ complete: passwordChecks.number }">
                  <v-icon x-small>{{ passwordChecks.number ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                  Un n&uacute;mero
                </li>
              </ul>
            </div>

            <div class="recovery-actions">
              <v-btn type="submit" block depressed class="auth-submit" :loading="isLoading" :disabled="isLoading">
                Actualizar contrase&ntilde;a
              </v-btn>
              <button type="button" class="recovery-secondary-action" :disabled="isLoading" @click="goToRecoveryStep('code')">
                Volver al c&oacute;digo
              </button>
            </div>
          </v-form>

          <div
            v-if="recoveryStep === 'success'"
            class="recovery-step-card recovery-success-state"
            aria-labelledby="recovery-success-title"
            aria-live="polite"
          >
            <span class="recovery-success-icon">
              <v-icon color="#0f766e">mdi-check-decagram-outline</v-icon>
            </span>
            <p class="auth-eyebrow">Acceso actualizado</p>
            <h1 id="recovery-success-title" class="auth-title">Contrase&ntilde;a actualizada</h1>
            <p>
              Tu acceso fue actualizado correctamente. Por seguridad, las sesiones anteriores fueron cerradas.
            </p>
            <div class="recovery-actions">
              <v-btn block depressed class="auth-submit" :disabled="isLoading" @click="returnToLogin">
                Volver a iniciar sesi&oacute;n
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="auth-visual-panel" aria-label="Seguridad clínica MedSync">
      <div class="visual-content">
        <span class="visual-kicker">Clinical Precision Access</span>
        <h2>Control clínico con precisión y trazabilidad.</h2>
        <p>
          Acceso protegido para equipos clínicos, sesiones auditables y datos médicos tratados con cuidado operativo.
        </p>
        <div class="trust-strip" aria-label="Controles de confianza">
          <span><v-icon small color="#5eead4">mdi-lock-check-outline</v-icon> Acceso seguro</span>
          <span><v-icon small color="#5eead4">mdi-clipboard-pulse-outline</v-icon> Control de sesiones</span>
          <span><v-icon small color="#5eead4">mdi-shield-account-outline</v-icon> Datos clínicos protegidos</span>
        </div>
      </div>
      <div class="clinical-field" aria-hidden="true">
        <span class="field-curve"></span>
        <span class="blueprint-line line-a"></span>
        <span class="blueprint-line line-b"></span>
        <span class="blueprint-line line-c"></span>
        <span class="grid-node node-a"></span>
        <span class="grid-node node-b"></span>
        <span class="grid-node node-c"></span>
        <span class="grid-node node-d"></span>
        <span class="scan-line"></span>
      </div>
    </section>
  </main>
</template>

<script>
import { mapActions, mapGetters } from 'vuex';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import DAAuthModel from '../../models/auth/DAAuthModel';
import { DAConfigService } from '../../services/context/core-proccess-context';
import { validationMixin } from 'vuelidate';
import { required, helpers, maxLength } from 'vuelidate/lib/validators';
import { getLoginImageData, getStoredLoginLogo, setStoredLoginLogo } from '../../utils/branding';
import defaultLoginLogo from '@/assets/login/med-sync-logo.png';
import {
  clearRememberedIdentifier,
  getRememberedIdentifier,
  normalizeRememberedIdentifier,
  setRememberedIdentifier
} from '../../utils/authRememberedIdentifier';
import { isD2AuthMode } from '../../services/config/authTransport.config';
import Registration from '../../services/core/auth/DARegistrationService';
import { usableRegistrationContext, isPendingActivation } from '../../utils/registration';

const phonePattern = helpers.regex('numeric', /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/);

export default {
  mixins: [validationMixin],
  data: function() {
    return {
      otp: '',
      registrationAvailable: false,
      newPwd: '',
      newPwdRepet: '',
      ErrorPwdRepeatM: '',
      phoneOtp: null,
      length: 5,
      isEnded: null,
      endDate: new Date(),
      showPWD: false,
      showNewPWD: false,
      showNewPwdRepeat: false,
      classInputPassWord: false,
      classInputPhone: false,
      isLoading: false,
      phoneError: false,
      ErrorPd: false,
      ErrorPwd: false,
      ErrorPwdRepeat: false,
      classFormAuth: 'login-step',
      classFormPhone: 'hidden',
      classFormOtp: 'hidden',
      classFormPass: 'hidden',
      recoveryStep: 'phone',
      recoveryStatus: {
        type: 'info',
        icon: 'mdi-information-outline',
        title: '',
        message: ''
      },
      recoveryTouched: {
        phone: false,
        code: false,
        password: false,
        confirmPassword: false
      },
      resendCooldown: 0,
      resendCooldownTimer: null,
      auth: new DAAuthModel(),
      rememberIdentifier: false,
      bgLogotype: getStoredLoginLogo() || defaultLoginLogo,
      ui: {
        phoneLabel: 'Tel\u00e9fono',
        passwordLabel: 'Contrase\u00f1a',
        recoveryCodeLabel: 'C\u00f3digo de recuperaci\u00f3n',
        newPasswordLabel: 'Nueva contrase\u00f1a',
        confirmPasswordLabel: 'Confirmar contrase\u00f1a',
        rememberPhone: 'Recordar mi tel\u00e9fono',
        showPassword: 'Mostrar contrase\u00f1a',
        hidePassword: 'Ocultar contrase\u00f1a',
        showNewPassword: 'Mostrar nueva contrase\u00f1a',
        hideNewPassword: 'Ocultar nueva contrase\u00f1a',
        showConfirmPassword: 'Mostrar confirmaci\u00f3n de contrase\u00f1a',
        hideConfirmPassword: 'Ocultar confirmaci\u00f3n de contrase\u00f1a'
      }
    };
  },
  created() {
    this.loadRegistrationAvailability();
    this.loadRememberedIdentifier();
    this.loadLoginImage();
  },
  mounted() {
    this.applyAuthDocumentScrollMode();
  },
  beforeDestroy() {
    this.clearResendCooldown();
    this.restoreAuthDocumentScrollMode();
  },
  validations: {
    auth: {
      param: {
        required,
        phonePattern,
        maxLength: maxLength(10)
      },
      pwd: {
        required
      }
    }
  },
  computed: {
    ...mapGetters(moduleTypes.AUTH, {
      isAuthorized: fnTypes.isAuthorized,
      isOtpSend: fnTypes.sendOtp,
      isValidateOtp: fnTypes.validateOtp,
      isPwdUpdated: fnTypes.updatePwd,
      hasError: fnTypes.hasError,
      hasErrorOTP: fnTypes.hasErrorOTP,
      hasErrorVOTP: fnTypes.hasErrorVOTP,
      hasErrorPWD: fnTypes.hasErrorPWD,
      unauthorized: fnTypes.unauthorized,
      role: fnTypes.getRole,
      tenantOperational: fnTypes.getTenantOperational
    }),
    isActive() {
      return this.otp.length === this.length;
    },
    isLoginView() {
      return this.classFormAuth !== 'hidden';
    },
    recoverySteps() {
      return [
        { key: 'phone', label: 'Tel\u00e9fono', icon: 'mdi-phone-outline', index: 0 },
        { key: 'code', label: 'C\u00f3digo', icon: 'mdi-email-lock-outline', index: 1 },
        { key: 'password', label: 'Contrase\u00f1a', icon: 'mdi-lock-outline', index: 2 }
      ];
    },
    recoveryStepIndex() {
      const current = this.recoverySteps.find(step => step.key === this.recoveryStep);
      return current ? current.index : this.recoverySteps.length;
    },
    normalizedRecoveryPhone() {
      return normalizeRememberedIdentifier(this.phoneOtp);
    },
    normalizedRecoveryCode() {
      return String(this.otp || '').replace(/\s/g, '').trim();
    },
    recoveryPhoneErrors() {
      if (!this.recoveryTouched.phone) {
        return [];
      }

      if (!this.normalizedRecoveryPhone || this.normalizedRecoveryPhone.length < 7 || this.normalizedRecoveryPhone.length > 15) {
        return ['Ingresa un tel\u00e9fono v\u00e1lido.'];
      }

      return [];
    },
    recoveryCodeErrors() {
      if (!this.recoveryTouched.code) {
        return [];
      }

      if (!/^[A-Za-z0-9]{4,12}$/.test(this.normalizedRecoveryCode)) {
        return ['Ingresa el c\u00f3digo de recuperaci\u00f3n.'];
      }

      return [];
    },
    passwordChecks() {
      const value = String(this.newPwd || '');
      return {
        length: value.length >= 8,
        letter: /[A-Za-z]/.test(value),
        number: /\d/.test(value)
      };
    },
    passwordStrength() {
      const value = String(this.newPwd || '');
      let score = 0;
      if (this.passwordChecks.length) score += 1;
      if (this.passwordChecks.letter) score += 1;
      if (this.passwordChecks.number) score += 1;
      if (value.length >= 12 || /[^A-Za-z0-9]/.test(value)) score += 1;

      const labels = ['Ingresa una contrase\u00f1a segura.', 'Seguridad baja.', 'Seguridad media.', 'Seguridad buena.', 'Seguridad alta.'];
      return {
        score,
        label: labels[score]
      };
    },
    newPasswordErrors() {
      const errors = [];
      if (!this.recoveryTouched.password) {
        return errors;
      }

      if (!this.newPwd) {
        errors.push('Ingresa una nueva contrase\u00f1a.');
      } else if (!this.passwordChecks.length || !this.passwordChecks.letter || !this.passwordChecks.number) {
        errors.push('La contrase\u00f1a debe tener m\u00ednimo 8 caracteres, una letra y un n\u00famero.');
      }

      return errors;
    },
    confirmPasswordErrors() {
      const errors = [];
      if (!this.recoveryTouched.confirmPassword) {
        return errors;
      }

      if (!this.newPwdRepet) {
        errors.push('Confirma la nueva contrase\u00f1a.');
      } else if (this.newPwd !== this.newPwdRepet) {
        errors.push('La confirmaci\u00f3n de contrase\u00f1a no coincide.');
      }

      return errors;
    },
    phoneErrors() {
      const errors = [];
      if (!this.$v.auth.param.$dirty) {
        return errors;
      }
      if (!this.$v.auth.param.required) {
        errors.push('Ingresa tu tel\u00e9fono.');
      } else if (!this.$v.auth.param.phonePattern || !this.$v.auth.param.maxLength) {
        errors.push('Ingresa un tel\u00e9fono valido de 10 digitos.');
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
    },
    sessionExpiredNotice() {
      return this.unauthorized
        ? 'Tu sesi\u00f3n expir\u00f3 o fue cerrada por seguridad. Inicia sesi\u00f3n nuevamente.'
        : '';
    }
  },
  methods: {
    async loadRegistrationAvailability() {
      try {
        const context = await Registration.context();
        if (!this._isDestroyed) this.registrationAvailable = usableRegistrationContext(context);
      } catch { this.registrationAvailable = false; }
    },
    ...mapActions(moduleTypes.AUTH, [
      fnTypes.login, fnTypes.sendOtp, fnTypes.validateOtp, fnTypes.updatePwd
    ]),

    applyAuthDocumentScrollMode: function() {
      if (typeof document === 'undefined') {
        return;
      }

      this.previousDocumentOverflowY = document.documentElement.style.overflowY;
      this.previousBodyOverflowY = document.body.style.overflowY;
      document.documentElement.style.overflowY = 'hidden';
      document.body.style.overflowY = 'hidden';
    },

    restoreAuthDocumentScrollMode: function() {
      if (typeof document === 'undefined') {
        return;
      }

      document.documentElement.style.overflowY = this.previousDocumentOverflowY || '';
      document.body.style.overflowY = this.previousBodyOverflowY || '';
    },

    loadRememberedIdentifier: function() {
      const remembered = getRememberedIdentifier();
      if (remembered) {
        this.auth.param = remembered;
        this.rememberIdentifier = true;
      }
    },

    syncRememberedIdentifier: function() {
      if (!this.rememberIdentifier) {
        clearRememberedIdentifier();
        return;
      }

      const normalized = normalizeRememberedIdentifier(this.auth.param);
      if (normalized) {
        setRememberedIdentifier(normalized);
      }
    },

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

      if (normalized.includes('network') || normalized.includes('timeout') || normalized.includes('no fue posible completar') || normalized.includes('preparar la solicitud segura')) {
        return 'No pudimos conectar con MedSync. Revisa tu conexi\u00f3n e int\u00e9ntalo nuevamente.';
      }

      return 'No pudimos iniciar sesi\u00f3n con esos datos.';
    },

    loadLoginImage: async function() {
      try {
        const response = await DAConfigService.getLoginImage();
        if (!response || !response.success) return;
        const logo = getLoginImageData(response);
        if (logo) {
          this.bgLogotype = logo;
          setStoredLoginLogo(logo);
        } else {
          this.useDefaultLoginLogo();
        }
      } catch (error) {
        this.bgLogotype = this.bgLogotype || defaultLoginLogo;
      }
    },

    useDefaultLoginLogo: function() {
      this.bgLogotype = defaultLoginLogo;
      setStoredLoginLogo(null);
    },

    setRecoveryStatus: function(type, title, message) {
      const icons = {
        info: 'mdi-information-outline',
        success: 'mdi-check-circle-outline',
        warning: 'mdi-alert-circle-outline',
        error: 'mdi-alert-outline'
      };
      this.recoveryStatus = {
        type: type || 'info',
        icon: icons[type] || icons.info,
        title: title || '',
        message: message || ''
      };
    },

    clearRecoveryFeedback: function() {
      this.phoneError = false;
      this.ErrorPd = false;
      this.ErrorPwd = false;
      this.ErrorPwdRepeat = false;
      this.ErrorPwdRepeatM = '';
      this.recoveryStatus = {
        type: 'info',
        icon: 'mdi-information-outline',
        title: '',
        message: ''
      };
    },

    touchRecoveryStep: function(step) {
      if (step === 'phone') {
        this.recoveryTouched.phone = true;
      } else if (step === 'code') {
        this.recoveryTouched.code = true;
      } else if (step === 'password') {
        this.recoveryTouched.password = true;
        this.recoveryTouched.confirmPassword = true;
      }
    },

    resetRecoveryTouched: function() {
      this.recoveryTouched = {
        phone: false,
        code: false,
        password: false,
        confirmPassword: false
      };
    },

    normalizeRecoveryCode: function(value) {
      this.otp = String(value || '').replace(/\s/g, '').slice(0, 12);
      this.clearRecoveryFeedback();
    },

    safeRecoveryErrorMessage: function(message, context) {
      const normalized = String(message || '').toLowerCase();
      if (normalized.includes('demasiad') || normalized.includes('rate') || normalized.includes('429') || normalized.includes('bloque')) {
        return {
          type: 'warning',
          title: 'Demasiados intentos',
          message: 'Por seguridad, bloqueamos temporalmente nuevos intentos. Int\u00e9ntalo m\u00e1s tarde.'
        };
      }

      if (normalized.includes('network') || normalized.includes('timeout') || normalized.includes('conectar')) {
        return {
          type: 'error',
          title: '',
          message: 'No pudimos conectar con MedSync. Revisa tu conexi\u00f3n e int\u00e9ntalo nuevamente.'
        };
      }

      if (context === 'code') {
        return {
          type: 'error',
          title: 'No pudimos validar el c\u00f3digo',
          message: 'El c\u00f3digo puede ser incorrecto o haber expirado. Solicita uno nuevo para continuar.'
        };
      }

      if (context === 'password') {
        return {
          type: 'error',
          title: '',
          message: 'No pudimos actualizar la contrase\u00f1a con esos datos.'
        };
      }

      return {
        type: 'error',
        title: '',
        message: 'No pudimos completar la solicitud. Int\u00e9ntalo nuevamente.'
      };
    },

    startRecovery: function() {
      this.clearRecoveryFeedback();
      this.resetRecoveryTouched();
      this.recoveryStep = 'phone';
      this.phoneOtp = this.auth.param || this.phoneOtp || '';
      this.classFormAuth = 'hidden';
      this.classFormOtp = 'hidden';
      this.classFormPass = 'hidden';
      this.classFormPhone = 'recovery-step-card';
    },

    returnToLogin: function() {
      this.clearResendCooldown();
      this.clearRecoveryFeedback();
      this.resetRecoveryTouched();
      this.otp = '';
      this.phoneOtp = null;
      this.newPwdRepet = '';
      this.newPwd = '';
      this.showNewPWD = false;
      this.showNewPwdRepeat = false;
      this.recoveryStep = 'phone';
      this.classFormPhone = 'hidden';
      this.classFormOtp = 'hidden';
      this.classFormPass = 'hidden';
      this.classFormAuth = 'login-step';
    },

    goToRecoveryStep: function(step) {
      this.clearRecoveryFeedback();
      if (step === 'phone') {
        this.recoveryStep = 'phone';
        this.classFormPhone = 'recovery-step-card';
        this.classFormOtp = 'hidden';
        this.classFormPass = 'hidden';
      } else if (step === 'code') {
        this.recoveryStep = 'code';
        this.classFormPhone = 'hidden';
        this.classFormOtp = 'recovery-step-card';
        this.classFormPass = 'hidden';
      } else if (step === 'password') {
        this.recoveryStep = 'password';
        this.classFormPhone = 'hidden';
        this.classFormOtp = 'hidden';
        this.classFormPass = 'recovery-step-card';
      } else if (step === 'success') {
        this.recoveryStep = 'success';
        this.classFormPhone = 'hidden';
        this.classFormOtp = 'hidden';
        this.classFormPass = 'hidden';
      }
      this.classFormAuth = 'hidden';
    },

    startResendCooldown: function() {
      this.clearResendCooldown();
      this.resendCooldown = 60;
      this.resendCooldownTimer = window.setInterval(() => {
        if (this.resendCooldown <= 1) {
          this.clearResendCooldown();
          return;
        }
        this.resendCooldown -= 1;
      }, 1000);
    },

    clearResendCooldown: function() {
      if (this.resendCooldownTimer) {
        window.clearInterval(this.resendCooldownTimer);
        this.resendCooldownTimer = null;
      }
      this.resendCooldown = 0;
    },

    validateInputsAuth: async function(opcion) {
      if (opcion == 1) {
        this.startRecovery();
      } else if (opcion == 2) {
        this.returnToLogin();
      } else if (opcion == 3) {
        this.sendRecoveryCode();
      } else if (opcion == 4) {
        this.validateRecoveryCode();
      } else if (opcion == 5) {
        this.submitNewPassword();
      }
    },

    onLogin: async function() {
      if (this.isLoading) {
        return;
      }

      this.auth.refresh = false;
      if (!this.rememberIdentifier) {
        clearRememberedIdentifier();
      }

      this.$v.$touch();
      if (this.$v.auth.param.$invalid || this.$v.auth.pwd.$invalid) {
        return;
      }

      this.syncRememberedIdentifier();
      this.isLoading = true;
      if (this.isAuthorized) {
        this.isLoading = false;
        this.$router.push(this.getPostLoginRoute());
        return;
      }

      await this.login(this.auth);
      if (this.isAuthorized) {
        if (!isPendingActivation(this.tenantOperational)) await this.loadLoginImage();
        this.$router.push(this.getPostLoginRoute());
      }
      this.isLoading = false;
    },

    getPostLoginRoute: function() {
      if (this.role !== 'super_admin' && isPendingActivation(this.tenantOperational)) return '/activar-cuenta';
      if (isD2AuthMode()) {
        if (this.role !== 'super_admin' && this.tenantOperational && this.tenantOperational.allowed === false && this.tenantOperational.code === 'TENANT_NOT_OPERATIONAL') {
          return '/tenant-restricted';
        }

        return this.role === 'super_admin' ? '/super-admin/dashboard' : '/inicio';
      }

      const token = this.$session ? this.$session.get('token') : null;
      if (!token) {
        return '/inicio';
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const tenantOperational = this.$session ? this.$session.get('tenantOperational') : null;
        if (payload && payload.rol !== 'super_admin' && isPendingActivation(tenantOperational)) return '/activar-cuenta';
        if (payload && payload.rol !== 'super_admin' && tenantOperational && tenantOperational.allowed === false && tenantOperational.code === 'TENANT_NOT_OPERATIONAL') {
          return '/tenant-restricted';
        }
        return payload && payload.rol === 'super_admin' ? '/super-admin/dashboard' : '/inicio';
      } catch (error) {
        return '/inicio';
      }
    },

    sendRecoveryCode: async function() {
      if (this.isLoading) {
        return;
      }

      this.touchRecoveryStep('phone');
      if (this.recoveryPhoneErrors.length > 0) {
        return;
      }

      const phone = this.normalizedRecoveryPhone;
      var t = { 'phone': phone };
      this.phoneOtp = phone;
      this.isLoading = true;
      await this.sendOtp(t);
      if (this.isOtpSend) {
        this.goToRecoveryStep('code');
        this.setRecoveryStatus(
          'info',
          'Revisa tu correo',
          'Si existe una cuenta asociada, enviaremos un c\u00f3digo de recuperaci\u00f3n.'
        );
        this.startResendCooldown();
      } else {
        const safe = this.safeRecoveryErrorMessage(this.hasErrorOTP ? this.hasErrorOTP.message : '', 'phone');
        this.setRecoveryStatus(safe.type, safe.title, safe.message);
      }
      this.isLoading = false;
    },

    resendRecoveryCode: async function() {
      if (this.resendCooldown > 0 || this.isLoading) {
        return;
      }
      await this.sendRecoveryCode();
    },

    validateRecoveryCode: async function() {
      if (this.isLoading) {
        return;
      }

      this.touchRecoveryStep('code');
      if (this.recoveryCodeErrors.length > 0) {
        return;
      }

      var t = { 'telephone': this.normalizedRecoveryPhone, 'code': this.normalizedRecoveryCode };
      this.otp = this.normalizedRecoveryCode;
      this.isLoading = true;
      await this.validateOtp(t);
      if (this.isValidateOtp) {
        this.goToRecoveryStep('password');
        this.setRecoveryStatus('success', '', 'C\u00f3digo validado. Crea una nueva contrase\u00f1a para continuar.');
      } else {
        const safe = this.safeRecoveryErrorMessage(this.hasErrorVOTP ? this.hasErrorVOTP.message : '', 'code');
        this.setRecoveryStatus(safe.type, safe.title, safe.message);
      }
      this.isLoading = false;
    },

    submitNewPassword: async function() {
      if (this.isLoading) {
        return;
      }

      this.touchRecoveryStep('password');
      if (this.newPasswordErrors.length > 0 || this.confirmPasswordErrors.length > 0) {
        return;
      }

      var t = {
        'phone': this.normalizedRecoveryPhone,
        'otp': this.normalizedRecoveryCode,
        'password': this.newPwd,
        'confirmPassword': this.newPwdRepet
      };
      this.isLoading = true;
      await this.updatePwd(t);
      if (this.isPwdUpdated) {
        this.clearResendCooldown();
        this.otp = '';
        this.phoneOtp = null;
        this.newPwdRepet = '';
        this.newPwd = '';
        this.showNewPWD = false;
        this.showNewPwdRepeat = false;
        this.clearRecoveryFeedback();
        this.goToRecoveryStep('success');
      } else {
        const pwdMessage = this.hasErrorPWD && this.hasErrorPWD.error
          ? this.hasErrorPWD.message
          : (this.hasErrorVOTP && this.hasErrorVOTP.message ? this.hasErrorVOTP.message : '');
        const safe = this.safeRecoveryErrorMessage(pwdMessage, 'password');
        this.setRecoveryStatus(safe.type, safe.title, safe.message);
      }
      this.isLoading = false;
    },

    OnsendOtp: async function() {
      await this.sendRecoveryCode();
    },

    OnValidateOtp: async function() {
      await this.validateRecoveryCode();
    },

    onChangePassword: async function() {
      await this.submitNewPassword();
    }
  }
};
</script>

<style scoped>
.registration-entry{margin:16px 0 0;text-align:center;font-size:14px;color:#526970}
.registration-entry a{color:#13655e;font-weight:700;text-decoration:underline;text-underline-offset:3px;padding:8px 0}
.registration-entry a:focus-visible{outline:3px solid #258e86;outline-offset:3px}
.medsync-auth-screen {
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  display: grid;
  grid-template-columns: minmax(22rem, 0.92fr) minmax(0, 1.08fr);
  background:
    linear-gradient(135deg, rgba(240, 253, 250, 0.92), rgba(248, 250, 252, 0.98)),
    linear-gradient(90deg, rgba(14, 116, 144, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(15, 118, 110, 0.07) 1px, transparent 1px);
  background-size: auto, 42px 42px, 42px 42px;
  color: #0f172a;
}

.medsync-auth-screen,
.medsync-auth-screen * {
  box-sizing: border-box;
}

.auth-card-panel {
  grid-column: 2;
  grid-row: 1;
  width: 100%;
  max-width: 100vw;
  min-width: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
}

.auth-card {
  width: 100%;
  max-width: 28rem;
  min-width: 0;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(20, 184, 166, 0.2);
  border-radius: 8px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.14);
  padding: 2rem;
}

.auth-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.7rem;
}

.auth-brand-logo {
  max-width: 12.5rem;
  max-height: 4rem;
  object-fit: contain;
}

.auth-secure-badge {
  min-height: 2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  background: #ecfdf5;
}

.auth-eyebrow {
  margin: 0 0 0.35rem;
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.auth-title {
  margin: 0;
  color: #0f172a;
  font-size: 2.15rem;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: 0;
}

.auth-subtitle {
  margin: 0.75rem 0 1.35rem;
  color: #475569;
  font-size: 0.98rem;
  line-height: 1.55;
  overflow-wrap: break-word;
}

.auth-alert {
  margin-bottom: 1rem;
}

.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0.1rem 0 1.25rem;
}

.remember-checkbox {
  margin: 0;
  padding: 0;
  min-width: 0;
}

.forgot-action,
.resend-action {
  border: 0;
  background: transparent;
  color: #0f766e;
  font-weight: 800;
  font-size: 0.86rem;
  cursor: pointer;
  text-align: right;
  padding: 0.35rem 0;
}

.forgot-action:focus-visible,
.resend-action:focus-visible {
  outline: 3px solid rgba(20, 184, 166, 0.35);
  outline-offset: 3px;
  border-radius: 6px;
}

.auth-submit {
  min-height: 3rem;
  background: linear-gradient(135deg, #0f766e, #0891b2);
  color: #fff;
  border-radius: 7px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
}

.auth-security-copy {
  margin: 1rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.45;
  overflow-wrap: break-word;
}

.login-form {
  min-width: 0;
}

.auth-visual-panel {
  grid-column: 1;
  grid-row: 1;
  position: relative;
  width: 100%;
  max-width: 100vw;
  min-width: 0;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 4rem;
  background:
    linear-gradient(145deg, rgba(8, 47, 73, 0.96), rgba(15, 23, 42, 0.98)),
    linear-gradient(90deg, rgba(45, 212, 191, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(56, 189, 248, 0.07) 1px, transparent 1px);
  background-size: auto, 38px 38px, 38px 38px;
  color: #e0f2fe;
}

.auth-visual-panel::after {
  content: "";
  position: absolute;
  inset: 12%;
  border: 1px solid rgba(94, 234, 212, 0.16);
  transform: skew(-8deg);
  pointer-events: none;
}

.visual-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 34rem;
  min-width: 0;
}

.visual-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  border: 1px solid rgba(94, 234, 212, 0.35);
  color: #99f6e4;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.visual-content h2 {
  margin: 1.25rem 0 1rem;
  max-width: 32rem;
  color: #f8fafc;
  font-size: 3rem;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: 0;
  overflow-wrap: break-word;
}

.visual-content p {
  width: 100%;
  max-width: 30rem;
  color: #bae6fd;
  font-size: 1rem;
  line-height: 1.65;
  overflow-wrap: break-word;
}

.trust-strip {
  margin-top: 1.75rem;
  display: grid;
  gap: 0.75rem;
}

.trust-strip span {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: #ccfbf1;
  font-weight: 700;
  font-size: 0.92rem;
}

.clinical-grid {
  position: absolute;
  right: 8%;
  bottom: 12%;
  width: min(28vw, 20rem);
  aspect-ratio: 1;
  border: 1px solid rgba(94, 234, 212, 0.18);
  background:
    linear-gradient(90deg, rgba(94, 234, 212, 0.12) 1px, transparent 1px),
    linear-gradient(0deg, rgba(125, 211, 252, 0.1) 1px, transparent 1px);
  background-size: 34px 34px;
}

.grid-node {
  position: absolute;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 18px rgba(94, 234, 212, 0.65);
}

.node-a { left: 18%; top: 26%; }
.node-b { right: 24%; top: 38%; }
.node-c { left: 42%; bottom: 20%; }

.pulse-line {
  position: absolute;
  left: 14%;
  right: 12%;
  top: 54%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #5eead4, #38bdf8, transparent);
}

.recovery-wrapper,
.recovery-step-card {
  width: 100%;
  min-width: 0;
}

.recovery-step-card {
  animation: panel-in 220ms ease-out;
}

.recovery-heading {
  margin-bottom: 1.25rem;
}

.recovery-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.5rem;
  line-height: 1.2;
  font-weight: 800;
}

.recovery-heading p:not(.auth-eyebrow) {
  margin: 0.55rem 0 0;
  color: #64748b;
  line-height: 1.5;
}

.recovery-error {
  margin: -0.25rem 0 0.75rem;
  color: #dc2626;
  font-size: 0.82rem;
  line-height: 1.35;
}

.recovery-actions {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.1rem;
}

.hidden {
  display: none !important;
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .recovery-step-card {
    animation: none;
  }
}

@media (max-width: 960px) {
  .medsync-auth-screen {
    grid-template-columns: 1fr;
  }

  .auth-card-panel {
    grid-column: auto;
    grid-row: auto;
    width: 100%;
    max-width: 100vw;
    min-height: auto;
    padding: 1.25rem;
  }

  .auth-card {
    width: calc(100vw - 2.5rem);
    max-width: 31rem;
    padding: 1.35rem;
  }

  .auth-brand {
    align-items: flex-start;
  }

  .auth-secure-badge {
    display: none;
  }

  .auth-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.55rem;
  }

  .forgot-action {
    text-align: left;
  }

  .auth-visual-panel {
    grid-column: auto;
    grid-row: auto;
    width: 100%;
    max-width: 100vw;
    min-height: auto;
    padding: 1.5rem 1.25rem 2rem;
  }

  .visual-content h2 {
    font-size: 1.65rem;
  }

  .clinical-grid {
    display: none;
  }
}

@media (max-width: 700px) {
  .auth-card-panel {
    justify-content: center;
  }

  .auth-card {
    width: 100%;
    max-width: 20rem;
    margin: 0 auto;
  }

  .auth-subtitle,
  .auth-security-copy,
  .visual-content p {
    font-size: 0.9rem;
  }

  .visual-content h2 {
    font-size: 1.45rem;
  }
}

@media (max-width: 420px) {
  .auth-card-panel {
    padding: 0.85rem;
  }

  .auth-card {
    width: calc(100vw - 1.7rem);
    max-width: calc(100vw - 1.7rem);
    padding: 1rem;
  }

  .auth-title {
    font-size: 1.8rem;
  }

  .auth-brand-logo {
    max-width: 10.5rem;
  }
}

.medsync-auth-screen {
  position: relative;
  isolation: isolate;
  grid-template-columns: minmax(30rem, 0.96fr) minmax(30rem, 1.04fr);
  background:
    radial-gradient(circle at 72% 46%, rgba(45, 212, 191, 0.18), transparent 24rem),
    radial-gradient(circle at 88% 18%, rgba(56, 189, 248, 0.12), transparent 22rem),
    linear-gradient(135deg, #ecfeff 0%, #f8fbff 44%, #ffffff 100%);
}

.medsync-auth-screen::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 71% 50%, rgba(20, 184, 166, 0.16), transparent 18rem),
    radial-gradient(circle at 58% 54%, rgba(125, 211, 252, 0.14), transparent 22rem),
    linear-gradient(90deg, rgba(14, 116, 144, 0.055) 1px, transparent 1px),
    linear-gradient(0deg, rgba(15, 118, 110, 0.045) 1px, transparent 1px);
  background-size: auto, auto, 44px 44px, 44px 44px;
  mask-image: linear-gradient(90deg, transparent 0%, transparent 38%, #000 47%, #000 100%);
}

.medsync-auth-screen::after {
  content: "";
  position: absolute;
  z-index: 2;
  top: -10%;
  bottom: -10%;
  left: 42%;
  width: clamp(8rem, 13vw, 18rem);
  pointer-events: none;
  background:
    linear-gradient(104deg, transparent 0%, rgba(56, 189, 248, 0.12) 24%, rgba(45, 212, 191, 0.3) 48%, rgba(236, 253, 245, 0.42) 72%, transparent 100%);
  filter: blur(16px);
  transform: skewX(-8deg);
  opacity: 0.92;
}

.auth-card-panel {
  position: relative;
  z-index: 3;
  padding: clamp(2rem, 5vw, 4.5rem);
}

.auth-card-panel::before {
  content: "";
  position: absolute;
  width: min(42rem, 76vw);
  height: min(42rem, 76vw);
  left: clamp(-8rem, -5vw, 1rem);
  top: 50%;
  transform: translateY(-50%);
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(45, 212, 191, 0.26), rgba(56, 189, 248, 0.15) 34%, rgba(236, 253, 245, 0.18) 50%, transparent 72%);
  filter: blur(18px);
  pointer-events: none;
}

.auth-card {
  position: relative;
  z-index: 2;
  width: clamp(28.25rem, 31.5vw, 33rem);
  max-width: calc(100vw - 3rem);
  padding: 2.65rem;
  border-radius: 26px;
  border: 1px solid rgba(20, 184, 166, 0.32);
  background:
    radial-gradient(circle at 10% 0%, rgba(20, 184, 166, 0.12), transparent 13rem),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 252, 255, 0.96));
  box-shadow:
    0 30px 78px rgba(8, 47, 73, 0.13),
    0 0 0 1px rgba(255, 255, 255, 0.82) inset,
    0 24px 80px rgba(20, 184, 166, 0.1);
  animation: auth-card-in 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.auth-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.16), transparent 30%),
    linear-gradient(315deg, rgba(56, 189, 248, 0.1), transparent 32%);
  opacity: 0.72;
}

.auth-card > * {
  position: relative;
  z-index: 1;
}

.auth-brand {
  align-items: flex-start;
  margin-bottom: 2.1rem;
}

.auth-logo-lockup {
  min-width: 0;
  display: grid;
  gap: 0.65rem;
  align-items: start;
}

.auth-brand-logo {
  display: block;
  max-width: 13.2rem;
  max-height: 3.95rem;
  width: auto;
  height: auto;
  object-position: left center;
  object-fit: contain;
  border: 1px solid rgba(20, 184, 166, 0.12);
  border-radius: 14px;
  padding: 0.35rem 0.55rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(240, 253, 250, 0.48));
  box-shadow: 0 10px 24px rgba(8, 47, 73, 0.06);
}

.auth-brand-text {
  display: grid;
  gap: 0.15rem;
}

.auth-brand-label {
  color: #0f766e;
  font-size: 0.76rem;
  font-weight: 850;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: uppercase;
}

.auth-brand-subline {
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.25;
}

.auth-secure-badge {
  min-height: 2.15rem;
  flex: 0 0 auto;
  border-color: rgba(20, 184, 166, 0.26);
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.96), rgba(240, 249, 255, 0.96));
  box-shadow: 0 12px 28px rgba(15, 118, 110, 0.08);
}

.auth-eyebrow {
  margin-bottom: 0.45rem;
  color: #0f766e;
}

.auth-title {
  max-width: 23rem;
  font-size: clamp(2rem, 3vw, 2.45rem);
  line-height: 1.04;
}

.auth-subtitle {
  margin: 0.9rem 0 1.65rem;
  color: #475569;
}

.auth-card ::v-deep .auth-alert.v-alert {
  margin-bottom: 1rem;
  border: 1px solid rgba(244, 63, 94, 0.2);
  border-radius: 14px;
  background: rgba(255, 241, 242, 0.88) !important;
  color: #9f1239 !important;
  padding: 0.65rem 0.75rem;
  font-size: 0.86rem;
  line-height: 1.35;
}

.auth-card ::v-deep .auth-alert.v-alert::before {
  opacity: 0;
}

.auth-card ::v-deep .auth-alert .v-alert__icon {
  align-self: flex-start;
  margin-right: 0.5rem;
  color: #be123c !important;
  font-size: 1rem;
}

.auth-card ::v-deep .auth-alert .v-alert__content {
  color: #9f1239 !important;
  padding: 0.05rem 0;
}

.auth-card ::v-deep .auth-alert .v-icon {
  color: #be123c !important;
}

.auth-card ::v-deep .auth-input.v-text-field {
  margin-bottom: 0.2rem;
}

.auth-card ::v-deep .auth-input.v-text-field--outlined > .v-input__control > .v-input__slot {
  min-height: 3.25rem;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.92);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.85) inset;
  transition: box-shadow 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.auth-card ::v-deep .auth-input input {
  background: transparent !important;
  box-shadow: none !important;
  caret-color: #0f766e;
}

.auth-card ::v-deep .auth-input input::selection {
  background: rgba(20, 184, 166, 0.24);
  color: #0f172a;
}

.auth-card ::v-deep .auth-input input:-webkit-autofill,
.auth-card ::v-deep .auth-input input:-webkit-autofill:hover,
.auth-card ::v-deep .auth-input input:-webkit-autofill:focus,
.auth-card ::v-deep .auth-input input:-webkit-autofill:active {
  -webkit-text-fill-color: #0f172a !important;
  caret-color: #0f766e;
  box-shadow: 0 0 0 1000px rgba(248, 250, 252, 0.96) inset !important;
  transition: background-color 9999s ease-out 0s;
}

.auth-card ::v-deep .auth-input.v-input--is-focused input:-webkit-autofill,
.auth-card ::v-deep .auth-input.v-input--is-focused input:-webkit-autofill:hover,
.auth-card ::v-deep .auth-input.v-input--is-focused input:-webkit-autofill:focus,
.auth-card ::v-deep .auth-input.v-input--is-focused input:-webkit-autofill:active {
  box-shadow: 0 0 0 1000px #ffffff inset !important;
}

.auth-card ::v-deep .auth-input.v-text-field--outlined fieldset {
  border-color: rgba(15, 118, 110, 0.24);
  transition: border-color 180ms ease;
}

.auth-card ::v-deep .auth-input.v-input--is-focused > .v-input__control > .v-input__slot {
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.16);
}

.auth-card ::v-deep .auth-input.v-input--is-focused fieldset {
  border-color: #0d9488;
}

.auth-card ::v-deep .auth-input.error--text fieldset {
  border-color: rgba(220, 38, 38, 0.74);
}

.auth-card ::v-deep .auth-input .v-input__prepend-inner {
  margin-right: 0.55rem;
}

.auth-row {
  margin: 0.2rem 0 1.35rem;
}

.forgot-action,
.resend-action {
  color: #0f766e;
  transition: color 180ms ease, transform 180ms ease;
}

.forgot-action:hover,
.resend-action:hover {
  color: #0891b2;
  transform: translateY(-1px);
}

.auth-submit {
  min-height: 3.25rem;
  border-radius: 14px;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 48%, #0891b2 100%);
  box-shadow: 0 14px 30px rgba(8, 145, 178, 0.22);
  transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
}

.auth-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 36px rgba(8, 145, 178, 0.28);
  filter: saturate(1.05);
}

.auth-submit.v-btn--disabled {
  background: #94a3b8 !important;
  box-shadow: none;
}

.auth-security-copy {
  margin-top: 1.15rem;
  color: #64748b;
}

.auth-card.auth-card--recovery {
  width: clamp(30rem, 34vw, 35rem);
  max-height: calc(100vh - 3rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(15, 118, 110, 0.34) transparent;
}

.recovery-wrapper {
  display: grid;
  gap: 1rem;
}

.recovery-progress {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  margin-bottom: 0.2rem;
}

.recovery-progress-step {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid rgba(15, 118, 110, 0.14);
  border-radius: 999px;
  padding: 0.42rem 0.45rem;
  color: #64748b;
  background: rgba(248, 250, 252, 0.74);
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
}

.recovery-progress-step.active {
  color: #0f766e;
  border-color: rgba(20, 184, 166, 0.34);
  background: rgba(236, 253, 245, 0.9);
}

.recovery-progress-step.complete {
  color: #0f766e;
  border-color: rgba(20, 184, 166, 0.24);
}

.recovery-progress-dot {
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 1.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.08);
  color: currentColor;
}

.auth-card ::v-deep .recovery-alert.v-alert {
  margin-bottom: 0.25rem;
  border-radius: 14px;
  padding: 0.68rem 0.75rem;
  font-size: 0.84rem;
}

.auth-card ::v-deep .recovery-alert .v-alert__content {
  display: grid;
  gap: 0.18rem;
}

.auth-card ::v-deep .recovery-alert strong {
  font-size: 0.82rem;
  line-height: 1.25;
}

.auth-card ::v-deep .recovery-alert--info.v-alert {
  border-color: rgba(14, 116, 144, 0.18);
  background: rgba(240, 249, 255, 0.88) !important;
  color: #155e75 !important;
}

.auth-card ::v-deep .recovery-alert--info .v-alert__content,
.auth-card ::v-deep .recovery-alert--info .v-alert__icon,
.auth-card ::v-deep .recovery-alert--info .v-icon {
  color: #155e75 !important;
}

.auth-card ::v-deep .recovery-alert--success.v-alert {
  border-color: rgba(15, 118, 110, 0.18);
  background: rgba(236, 253, 245, 0.9) !important;
  color: #0f766e !important;
}

.auth-card ::v-deep .recovery-alert--success .v-alert__content,
.auth-card ::v-deep .recovery-alert--success .v-alert__icon,
.auth-card ::v-deep .recovery-alert--success .v-icon {
  color: #0f766e !important;
}

.auth-card ::v-deep .recovery-alert--warning.v-alert {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(255, 251, 235, 0.9) !important;
  color: #92400e !important;
}

.auth-card ::v-deep .recovery-alert--warning .v-alert__content,
.auth-card ::v-deep .recovery-alert--warning .v-alert__icon,
.auth-card ::v-deep .recovery-alert--warning .v-icon {
  color: #92400e !important;
}

.auth-card ::v-deep .recovery-alert--error.v-alert {
  border-color: rgba(244, 63, 94, 0.2);
  background: rgba(255, 241, 242, 0.88) !important;
  color: #9f1239 !important;
}

.auth-card ::v-deep .recovery-alert--error .v-alert__content,
.auth-card ::v-deep .recovery-alert--error .v-alert__icon,
.auth-card ::v-deep .recovery-alert--error .v-icon {
  color: #9f1239 !important;
}

.recovery-heading {
  margin-bottom: 1.15rem;
}

.recovery-heading .auth-title {
  max-width: 27rem;
}

.recovery-heading p:not(.auth-eyebrow) {
  margin: 0.75rem 0 0;
  color: #475569;
  font-size: 0.96rem;
  line-height: 1.52;
}

.recovery-security-copy,
.recovery-inline-note {
  margin: 0.2rem 0 1rem;
  border: 1px solid rgba(15, 118, 110, 0.12);
  border-radius: 14px;
  padding: 0.72rem 0.82rem;
  color: #64748b;
  background: rgba(240, 253, 250, 0.54);
  font-size: 0.82rem;
  line-height: 1.42;
}

.recovery-inline-note {
  margin-top: -0.3rem;
  margin-bottom: 1rem;
}

.recovery-code-input ::v-deep input {
  font-weight: 800;
  letter-spacing: 0.08em;
}

.recovery-link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: -0.15rem 0 0.7rem;
}

.recovery-link-row .resend-action:disabled,
.recovery-secondary-action:disabled {
  cursor: default;
  opacity: 0.55;
  transform: none;
}

.recovery-secondary-action {
  width: 100%;
  min-height: 2.75rem;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 14px;
  color: #0f766e;
  background: rgba(255, 255, 255, 0.72);
  font-weight: 800;
  cursor: pointer;
  transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.recovery-secondary-action:hover {
  border-color: rgba(8, 145, 178, 0.32);
  color: #0891b2;
  background: rgba(240, 249, 255, 0.86);
  transform: translateY(-1px);
}

.recovery-secondary-action:focus-visible {
  outline: 3px solid rgba(20, 184, 166, 0.35);
  outline-offset: 3px;
}

.password-helper {
  margin-top: -0.1rem;
  display: grid;
  gap: 0.55rem;
}

.password-strength {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.35rem;
}

.password-strength span {
  height: 0.32rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.32);
}

.password-strength.score-1 span:nth-child(-n + 1) {
  background: #f97316;
}

.password-strength.score-2 span:nth-child(-n + 2) {
  background: #f59e0b;
}

.password-strength.score-3 span:nth-child(-n + 3) {
  background: #0d9488;
}

.password-strength.score-4 span {
  background: #0891b2;
}

.password-helper p {
  margin: 0;
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.3;
}

.password-requirements {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.password-requirements li {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  border: 1px solid rgba(100, 116, 139, 0.16);
  border-radius: 999px;
  padding: 0.38rem 0.45rem;
  color: #64748b;
  background: rgba(248, 250, 252, 0.7);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
}

.password-requirements li.complete {
  border-color: rgba(20, 184, 166, 0.26);
  color: #0f766e;
  background: rgba(236, 253, 245, 0.8);
}

.recovery-success-state {
  text-align: left;
}

.recovery-success-icon {
  width: 3rem;
  height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  border: 1px solid rgba(20, 184, 166, 0.22);
  border-radius: 18px;
  background: rgba(236, 253, 245, 0.9);
  box-shadow: 0 16px 36px rgba(15, 118, 110, 0.1);
}

.recovery-success-state p:not(.auth-eyebrow) {
  margin: 0.9rem 0 0;
  color: #475569;
  font-size: 0.96rem;
  line-height: 1.52;
}

.auth-visual-panel {
  z-index: 1;
  padding: clamp(3rem, 6vw, 5.8rem);
  background:
    radial-gradient(circle at 72% 30%, rgba(20, 184, 166, 0.22), transparent 17rem),
    radial-gradient(circle at 22% 72%, rgba(56, 189, 248, 0.16), transparent 19rem),
    linear-gradient(145deg, rgba(8, 47, 73, 0.98), rgba(15, 23, 42, 0.99) 62%, rgba(12, 74, 110, 0.98)),
    linear-gradient(90deg, rgba(45, 212, 191, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(56, 189, 248, 0.07) 1px, transparent 1px);
  background-size: auto, auto, auto, 38px 38px, 38px 38px;
  clip-path: polygon(0 0, 100% 0, calc(100% - 5.6vw) 100%, 0 100%);
}

.auth-visual-panel::before {
  content: "";
  position: absolute;
  right: -20%;
  top: -12%;
  width: 56%;
  height: 124%;
  border-radius: 44% 0 0 56%;
  background:
    linear-gradient(158deg, rgba(45, 212, 191, 0.22), rgba(56, 189, 248, 0.12) 38%, rgba(236, 253, 245, 0.08) 58%, transparent 76%);
  border-left: 0;
  filter: blur(2px);
  transform: rotate(5deg);
}

.auth-visual-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(100deg, transparent 0%, rgba(125, 211, 252, 0.08) 44%, rgba(45, 212, 191, 0.18) 50%, rgba(125, 211, 252, 0.08) 56%, transparent 100%);
  transform: translateX(-120%);
  animation: panel-scan 12s ease-in-out infinite;
}

.auth-visual-panel > * {
  position: relative;
  z-index: 2;
}

.visual-kicker {
  border-radius: 12px;
  border-color: rgba(94, 234, 212, 0.32);
  background: rgba(8, 47, 73, 0.42);
}

.visual-content h2 {
  font-size: clamp(2.55rem, 4.4vw, 4.2rem);
  line-height: 0.98;
}

.visual-content p {
  color: #bae6fd;
}

.trust-strip {
  margin-top: 2rem;
  max-width: 28rem;
}

.trust-strip span {
  width: fit-content;
  border: 1px solid rgba(94, 234, 212, 0.18);
  border-radius: 999px;
  padding: 0.62rem 0.82rem;
  background: rgba(8, 47, 73, 0.4);
  box-shadow: 0 16px 36px rgba(2, 6, 23, 0.16);
}

.clinical-field {
  position: absolute;
  inset: 9% 7% 8% 11%;
  z-index: 1;
  pointer-events: none;
  border: 1px solid rgba(94, 234, 212, 0.12);
  background:
    linear-gradient(90deg, rgba(94, 234, 212, 0.1) 1px, transparent 1px),
    linear-gradient(0deg, rgba(125, 211, 252, 0.08) 1px, transparent 1px);
  background-size: 36px 36px;
  opacity: 0.8;
}

.field-curve {
  position: absolute;
  right: 8%;
  top: 12%;
  width: 48%;
  height: 68%;
  border: 1px solid rgba(94, 234, 212, 0.18);
  border-left-color: transparent;
  border-radius: 48% 52% 42% 58%;
  transform: rotate(-16deg);
  animation: field-glow 10s ease-in-out infinite;
}

.blueprint-line {
  position: absolute;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(125, 211, 252, 0.36), rgba(94, 234, 212, 0.5), transparent);
}

.line-a {
  left: 8%;
  right: 32%;
  top: 28%;
}

.line-b {
  left: 24%;
  right: 12%;
  top: 52%;
  transform: rotate(-8deg);
}

.line-c {
  left: 16%;
  right: 22%;
  bottom: 23%;
  transform: rotate(12deg);
}

.clinical-field .grid-node {
  animation: node-breathe 9s ease-in-out infinite;
}

.node-a { left: 18%; top: 26%; }
.node-b { right: 24%; top: 38%; }
.node-c { left: 42%; bottom: 20%; }
.node-d { right: 16%; bottom: 28%; }

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 14%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(94, 234, 212, 0.55), rgba(56, 189, 248, 0.42), transparent);
  box-shadow: 0 0 18px rgba(94, 234, 212, 0.28);
  animation: field-scan 9s ease-in-out infinite;
}

@keyframes auth-card-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes panel-scan {
  0%, 44% {
    transform: translateX(-120%);
  }
  70%, 100% {
    transform: translateX(120%);
  }
}

@keyframes field-scan {
  0%, 15% {
    transform: translateY(0);
    opacity: 0;
  }
  28% {
    opacity: 1;
  }
  72% {
    opacity: 1;
  }
  100% {
    transform: translateY(22rem);
    opacity: 0;
  }
}

@keyframes field-glow {
  0%, 100% {
    opacity: 0.45;
    transform: rotate(-16deg) scale(0.98);
  }
  50% {
    opacity: 0.86;
    transform: rotate(-16deg) scale(1.02);
  }
}

@keyframes node-breathe {
  0%, 100% {
    opacity: 0.52;
    transform: scale(0.88);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (min-width: 1024px) {
  .medsync-auth-screen {
    height: 100vh;
    min-height: 100vh;
    overflow: hidden;
  }

  .auth-card-panel,
  .auth-visual-panel {
    height: 100vh;
    min-height: 100vh;
  }
}

@media (min-width: 1200px) and (min-height: 821px) {
  .auth-card {
    padding: 2.85rem;
  }

  .auth-card ::v-deep .auth-input.v-text-field--outlined > .v-input__control > .v-input__slot {
    min-height: 3.38rem;
  }

  .auth-submit {
    min-height: 3.35rem;
  }
}

@media (max-width: 1199px) {
  .medsync-auth-screen {
    grid-template-columns: minmax(25rem, 0.9fr) minmax(26rem, 1.1fr);
  }

  .auth-card {
    width: min(100%, 26.5rem);
    max-width: 26.5rem;
    padding: 2.25rem;
  }

  .auth-card.auth-card--recovery {
    width: min(100%, 28.5rem);
    max-width: 28.5rem;
  }

  .auth-visual-panel {
    padding: 3rem;
  }

  .visual-content h2 {
    font-size: 2.65rem;
  }
}

@media (min-width: 1024px) and (max-height: 820px) {
  .auth-card {
    width: min(100%, 26.75rem);
    max-width: 26.75rem;
    padding: 2rem 2.35rem;
  }

  .auth-card.auth-card--recovery {
    width: min(100%, 28.5rem);
    max-width: 28.5rem;
    padding: 1.85rem 2.15rem;
  }

  .auth-brand {
    margin-bottom: 1.2rem;
  }

  .auth-logo-lockup {
    gap: 0.45rem;
  }

  .auth-brand-logo {
    max-height: 3.05rem;
    padding: 0.28rem 0.45rem;
  }

  .auth-secure-badge {
    min-height: 2rem;
  }

  .auth-eyebrow {
    margin-bottom: 0.3rem;
  }

  .auth-title {
    font-size: 2.05rem;
  }

  .auth-subtitle {
    margin: 0.65rem 0 1.05rem;
    line-height: 1.42;
  }

  .auth-card ::v-deep .auth-input.v-text-field {
    margin-bottom: 0;
  }

  .auth-card ::v-deep .auth-input.v-text-field--outlined > .v-input__control > .v-input__slot {
    min-height: 3rem;
  }

  .auth-row {
    margin: 0 0 1rem;
  }

  .auth-submit {
    min-height: 3rem;
  }

  .auth-security-copy {
    margin-top: 0.8rem;
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .recovery-progress {
    gap: 0.35rem;
  }

  .recovery-heading {
    margin-bottom: 0.95rem;
  }

  .recovery-security-copy,
  .recovery-inline-note {
    margin-bottom: 0.75rem;
    padding: 0.62rem 0.72rem;
  }

  .password-helper {
    gap: 0.42rem;
  }
}

@media (max-width: 1023px) {
  .medsync-auth-screen {
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 100vh;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% -4rem, rgba(20, 184, 166, 0.2), transparent 22rem),
      linear-gradient(180deg, #082f49 0%, #0f172a 15rem, #f8fafc 15rem, #f1f5f9 100%);
  }

  .medsync-auth-screen::before {
    background:
      linear-gradient(90deg, rgba(14, 116, 144, 0.07) 1px, transparent 1px),
      linear-gradient(0deg, rgba(15, 118, 110, 0.05) 1px, transparent 1px);
    background-size: 42px 42px, 42px 42px;
  }

  .auth-card-panel {
    order: 1;
    min-height: auto;
    padding: 2rem 1.5rem 1rem;
  }

  .auth-card-panel::before {
    left: 50%;
    top: 10%;
    transform: translateX(-50%);
    width: min(36rem, 92vw);
    height: 18rem;
  }

  .auth-card {
    width: min(100%, 32rem);
    max-width: 32rem;
    padding: 2.1rem;
  }

  .auth-card.auth-card--recovery {
    max-height: calc(100vh - 3rem);
  }

  .auth-visual-panel {
    order: 2;
    width: calc(100% - 3rem);
    max-width: 46rem;
    min-height: auto;
    margin: 0 auto 2rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(94, 234, 212, 0.18);
    border-radius: 24px;
    clip-path: none;
  }

  .auth-visual-panel::before,
  .auth-visual-panel::after,
  .clinical-field,
  .visual-kicker {
    display: none;
  }

  .visual-content {
    max-width: none;
  }

  .visual-content h2 {
    margin: 0;
    font-size: 1.06rem;
    line-height: 1.25;
  }

  .visual-content p {
    margin: 0.28rem 0 0;
    max-width: none;
    font-size: 0.82rem;
    line-height: 1.35;
  }

  .trust-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    max-width: none;
    gap: 0.4rem;
    margin-top: 0.55rem;
  }

  .trust-strip span {
    width: 100%;
    justify-content: center;
    padding: 0.38rem 0.45rem;
    font-size: 0.72rem;
    text-align: center;
  }
}

@media (max-width: 767px) {
  .medsync-auth-screen {
    height: 100vh;
    min-height: 100vh;
    overflow: hidden;
    justify-content: center;
    background:
      radial-gradient(circle at 50% 0%, rgba(20, 184, 166, 0.18), transparent 16rem),
      radial-gradient(circle at 88% 18%, rgba(56, 189, 248, 0.12), transparent 13rem),
      linear-gradient(180deg, #082f49 0%, #0f172a 9rem, #f8fbff 9rem, #f1f5f9 100%);
  }

  .auth-card-panel {
    width: 100%;
    height: 100vh;
    min-height: 100vh;
    overflow: hidden;
    padding: 1.25rem 0;
  }

  .auth-card-panel::before {
    top: 5%;
    height: 14rem;
  }

  .auth-card {
    width: calc(100% - 32px);
    max-width: 28rem;
    margin: 0 auto;
    padding: 1.75rem;
    border-radius: 24px;
  }

  .auth-card.auth-card--recovery {
    max-height: calc(100vh - 2.5rem);
  }

  .auth-brand {
    gap: 0.9rem;
    margin-bottom: 1.45rem;
  }

  .auth-brand-logo {
    max-width: 11.5rem;
    max-height: 3.25rem;
    padding: 0.3rem 0.45rem;
  }

  .auth-secure-badge {
    padding: 0.35rem 0.55rem;
    font-size: 0.72rem;
  }

  .auth-title {
    font-size: 1.95rem;
  }

  .auth-subtitle {
    margin-bottom: 1.3rem;
  }

  .auth-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.55rem;
    margin-bottom: 1.15rem;
  }

  .forgot-action {
    text-align: left;
  }

  .auth-visual-panel {
    display: none;
  }
}

@media (max-width: 420px) {
  .auth-card-panel {
    padding: 0.9rem 0;
  }

  .auth-card {
    width: calc(100% - 32px);
    max-width: calc(100% - 32px);
    padding: 1.35rem;
    border-radius: 22px;
  }

  .auth-brand {
    margin-bottom: 1.15rem;
  }

  .auth-brand-logo {
    max-width: 10.25rem;
    max-height: 3rem;
  }

  .auth-brand-subline,
  .auth-secure-badge {
    display: none;
  }

  .auth-title {
    font-size: 1.72rem;
  }

  .auth-subtitle,
  .auth-security-copy {
    font-size: 0.88rem;
  }

  .recovery-progress {
    gap: 0.3rem;
  }

  .recovery-progress-step {
    gap: 0.25rem;
    padding: 0.36rem 0.32rem;
    font-size: 0.66rem;
  }

  .recovery-progress-dot {
    width: 1rem;
    height: 1rem;
    flex-basis: 1rem;
  }

  .recovery-heading p:not(.auth-eyebrow),
  .recovery-success-state p:not(.auth-eyebrow) {
    font-size: 0.88rem;
  }

  .recovery-security-copy,
  .recovery-inline-note {
    font-size: 0.78rem;
  }

  .recovery-link-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.25rem;
  }

  .password-requirements {
    gap: 0.32rem;
  }

  .password-requirements li {
    padding: 0.34rem 0.28rem;
    font-size: 0.66rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-card,
  .auth-visual-panel::after,
  .field-curve,
  .scan-line,
  .clinical-field .grid-node {
    animation: none;
  }

  .auth-submit,
  .forgot-action,
  .resend-action,
  .recovery-secondary-action,
  .auth-card ::v-deep .auth-input.v-text-field--outlined > .v-input__control > .v-input__slot {
    transition: none;
  }
}
</style>
