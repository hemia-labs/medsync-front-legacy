<template>
  <main class="medsync-auth-screen auth-clinic-screen" lang="es">
    <da-loader v-bind:overlay="isLoading"></da-loader>

    <section class="auth-card-panel" aria-labelledby="login-title">
      <div class="auth-card" :class="{ 'auth-card--recovery': !isLoginView }">
        <div class="auth-brand">
          <div class="auth-logo-lockup">
            <medsync-brand :custom-logo="bgLogotype === defaultBrandLogo ? '' : bgLogotype" @error="useDefaultLoginLogo" />

          </div>
          <!-- Selector de idioma oculto hasta que la aplicación tenga traducciones. -->
          <v-menu v-if="false" offset-y left rounded="lg" :nudge-bottom="6">
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                text small rounded :ripple="false" class="login-language"
                :aria-label="'Idioma' + ': ' + language.toUpperCase()"
                :disabled="isLoading" v-bind="attrs" v-on="on"
              >
                <v-icon small left aria-hidden="true">mdi-web</v-icon>
                {{ language.toUpperCase() }}
                <v-icon small right aria-hidden="true">mdi-chevron-down</v-icon>
              </v-btn>
            </template>
            <v-list dense class="login-language-menu" role="listbox" :aria-label="'Idioma'">
              <v-list-item
                v-for="option in [{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }]"
                :key="option.code" :lang="option.code" role="option"
                :aria-selected="language === option.code" :input-value="language === option.code"
                color="var(--color-primary-700)" @click="language = option.code"
              >
                <v-list-item-title>{{ option.label }}</v-list-item-title>
                <v-list-item-icon><v-icon v-if="language === option.code" small color="var(--color-primary-700)">mdi-check</v-icon></v-list-item-icon>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>

        <v-form v-if="isLoginView" class="login-form" @submit.prevent="onLogin">
          <h1 id="login-title" class="auth-title">Acceso a tu portal clínico</h1>
          <p class="auth-subtitle">
            Ingresa con tu correo electrónico o teléfono y tu contraseña para continuar.
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

          <label class="login-field-label" for="login-phone">{{ ui.identifierLabel }}</label>
          <v-text-field
            id="login-phone"
            v-model.trim="$v.auth.param.$model"
            placeholder="Ingresa tu correo electrónico o teléfono"
            type="text"
            maxlength="254"
            autocomplete="username"
            prepend-inner-icon="mdi-account-outline"
            outlined
            dense
            class="auth-input"
            color="var(--auth-focus)"
            :error-messages="identifierErrors"
            :disabled="isLoading"
            @input="clearLoginError"
          ></v-text-field>

          <label class="login-field-label" for="login-password">Contraseña</label>
          <v-text-field
            id="login-password"
            v-model="$v.auth.pwd.$model"
            placeholder="Ingresa tu contraseña"
            :type="showPWD ? 'text' : 'password'"
            autocomplete="current-password"
            prepend-inner-icon="mdi-lock-outline"
            outlined
            dense
            class="auth-input"
            color="var(--auth-focus)"
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
                <v-icon small>{{ showPWD ? 'mdi-eye-outline' : 'mdi-eye-off-outline' }}</v-icon>
              </v-btn>
            </template>
          </v-text-field>

          <div class="auth-row">
            <v-checkbox
              v-model="rememberIdentifier"
              :label="ui.rememberIdentifier"
              color="var(--color-primary-700)"
              hide-details
              class="remember-checkbox"
              :disabled="isLoading"
            ></v-checkbox>

            <button type="button" class="forgot-action" @click="startRecovery">
              ¿Olvidaste tu contraseña?
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
            <v-icon right aria-hidden="true">mdi-arrow-right</v-icon>
          </v-btn>

          <div class="login-register">
            <p>¿Aún no tienes cuenta?</p>
            <v-btn text :to="{ name: 'register' }" :disabled="isLoading" color="var(--auth-link)" class="login-register-button">
              Probar gratis 15 días
            </v-btn>
          </div>

          <div class="login-security-divider"><v-icon small aria-hidden="true">mdi-lock-outline</v-icon><span>Acceso seguro</span></div>
          <p class="auth-security-copy">
            Tus credenciales son personales. Cierra sesión al terminar en equipos compartidos.
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
              <h1 id="recovery-phone-title" class="auth-title">Recuperar acceso</h1>
              <p>Ingresa tu correo electr&oacute;nico para recibir un c&oacute;digo de recuperaci&oacute;n.</p>
            </div>

            <label class="login-field-label" for="recovery-phone">Correo</label>
            <v-text-field
              id="recovery-phone"
              v-model.trim="phoneOtp"
              placeholder="Ingresa tu correo"
              type="email"
              inputmode="email"
              maxlength="254"
              autocomplete="username"
              prepend-inner-icon="mdi-email-outline"
              color="var(--auth-focus)"
              outlined
              dense
              class="auth-input"
              :error-messages="recoveryPhoneErrors"
              :disabled="isLoading"
              @input="clearRecoveryFeedback"
              @blur="recoveryTouched.phone = true"
            ></v-text-field>

            <div class="recovery-actions">
              <v-btn type="submit" block depressed class="auth-submit" :loading="isLoading" :disabled="isLoading || resendCooldown > 0">
                {{ resendCooldown ? 'Enviar en ' + resendCooldown + ' s' : 'Enviar código' }}
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
              <h1 id="recovery-code-title" class="auth-title">Revisa tu correo</h1>
              <p>Ingresa el c&oacute;digo que enviamos para continuar con el cambio de contrase&ntilde;a.</p>
            </div>

            <label class="login-field-label" for="recovery-code">Código de recuperación</label>
            <v-text-field
              id="recovery-code"
              v-model.trim="otp"
              placeholder="Ingresa el código de tu correo"
              autocomplete="one-time-code"
              maxlength="12"
              prepend-inner-icon="mdi-email-lock-outline"
              color="var(--auth-focus)"
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
                Cambiar correo electr&oacute;nico
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
              <h1 id="recovery-password-title" class="auth-title">Crea una nueva contrase&ntilde;a</h1>
              <p>Usa una contrase&ntilde;a segura para proteger tu acceso cl&iacute;nico.</p>
            </div>

            <label class="login-field-label" for="recovery-password">Nueva contraseña</label>
            <v-text-field
              id="recovery-password"
              v-model="newPwd"
              placeholder="Crea una contraseña segura"
              prepend-inner-icon="mdi-lock-outline"
              color="var(--auth-focus)"
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

            <label class="login-field-label" for="recovery-confirm">Confirmar contraseña</label>
            <v-text-field
              id="recovery-confirm"
              v-model="newPwdRepet"
              placeholder="Repite tu nueva contraseña"
              prepend-inner-icon="mdi-lock-check-outline"
              color="var(--auth-focus)"
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
              </ul>
            </div>

            <div class="recovery-actions">
              <v-btn type="submit" block depressed class="auth-submit" :loading="isLoading" :disabled="isLoading">
                Actualizar contrase&ntilde;a
              </v-btn>
              <button type="button" class="recovery-secondary-action" :disabled="isLoading || resendCooldown > 0" @click="resendRecoveryCode">
                {{ resendCooldown ? 'Solicitar otro código en ' + resendCooldown + ' s' : 'Solicitar otro código' }}
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
              <v-icon color="var(--color-primary-700)">mdi-check-decagram-outline</v-icon>
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
        <medsync-brand class="clinic-brand" />
        <h2>Control clínico<br>con precisión y <span>trazabilidad.</span></h2>
        <p>
          Acceso protegido para equipos clínicos, sesiones auditables y datos médicos tratados con cuidado operativo.
        </p>
        <div class="trust-strip" aria-label="Controles de confianza">
          <span><v-icon small color="var(--color-primary-200)">mdi-lock-check-outline</v-icon> Acceso seguro</span>
          <span><v-icon small color="var(--color-primary-200)">mdi-clipboard-pulse-outline</v-icon> Control de sesiones</span>
          <span><v-icon small color="var(--color-primary-200)">mdi-shield-account-outline</v-icon> Datos clínicos protegidos</span>
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
import { isNavigationFailure } from 'vue-router';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import DAAuthModel from '../../models/auth/DAAuthModel';
import { DAConfigService } from '../../services/context/core-proccess-context';
import { validationMixin } from 'vuelidate';
import { required, email, maxLength, or } from 'vuelidate/lib/validators';
import { loginPhonePattern } from '../../utils/common/regex';
import { registrationPasswordError } from '../../utils/registration';
import { getLoginImageData, getStoredLoginLogo, setStoredLoginLogo } from '../../utils/branding';
import defaultLoginLogo from '@/assets/login/med-sync-logo.svg';
import {
  clearRememberedIdentifier,
  getRememberedIdentifier,
  normalizeRememberedIdentifier,
  setRememberedIdentifier
} from '../../utils/authRememberedIdentifier';
import { isD2AuthMode } from '../../services/config/authTransport.config';
import { isPendingActivation, verificationStorageKey } from '../../utils/registration';



export default {
  mixins: [validationMixin],
  data: function() {
    return {
      language: 'es',
      otp: '',
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
      defaultBrandLogo: defaultLoginLogo,
      bgLogotype: getStoredLoginLogo() || defaultLoginLogo,
      ui: {
        identifierLabel: 'Correo electrónico o teléfono',
        passwordLabel: 'Contrase\u00f1a',
        recoveryCodeLabel: 'C\u00f3digo de recuperaci\u00f3n',
        newPasswordLabel: 'Nueva contrase\u00f1a',
        confirmPasswordLabel: 'Confirmar contrase\u00f1a',
        rememberIdentifier: 'Recordar mi correo o teléfono',
        showPassword: 'Mostrar contrase\u00f1a',
        hidePassword: 'Ocultar contrase\u00f1a',
        showNewPassword: 'Mostrar nueva contrase\u00f1a',
        hideNewPassword: 'Ocultar nueva contrase\u00f1a',
        showConfirmPassword: 'Mostrar confirmaci\u00f3n de contrase\u00f1a',
        hideConfirmPassword: 'Ocultar confirmaci\u00f3n de contrase\u00f1a'
      }
    };
  },
  watch: {
    '$route.name': {
      immediate: true,
      handler(name) {
        if (name === 'forgotPassword') this.startRecovery();
        else if (name === 'login') this.returnToLogin();
      }
    }
  },
  created() {
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
      business: fnTypes.getBusiness,
      tenantOperational: fnTypes.getTenantOperational
    }),
    isActive() {
      return this.otp.length === this.length;
    },
    isLoginView() {
      return this.$route.name !== 'forgotPassword';
    },
    recoverySteps() {
      return [
        { key: 'phone', label: 'Correo', icon: 'mdi-email-outline', index: 0 },
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

      if (!email(this.normalizedRecoveryPhone) || this.normalizedRecoveryPhone.length > 254) {
        return ['Ingresa un correo electrónico válido.'];
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
        length: !registrationPasswordError(value),
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
      } else if (registrationPasswordError(this.newPwd)) {
        errors.push(registrationPasswordError(this.newPwd));
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
    },
    sessionExpiredNotice() {
      return this.unauthorized
        ? 'Tu sesi\u00f3n expir\u00f3 o fue cerrada por seguridad. Inicia sesi\u00f3n nuevamente.'
        : '';
    }
  },
  methods: {
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

      if (/^(no pudimos iniciar sesi[oó]n con esos datos|usuario o contraseña incorrectos)\.?$/.test(normalized.trim())) {
        return 'Usuario o contraseña incorrectos.';
      }

      return 'No pudimos iniciar sesi\u00f3n con esos datos.';
    },

    loadLoginImage: async function() {
      // Without a session this endpoint returns the default business branding,
      // not the tenant logo saved from Settings or the authenticated layout.
      const storedLogo = getStoredLoginLogo();
      if (storedLogo) {
        this.bgLogotype = storedLogo;
        return;
      }

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
      if (this.$route.name !== 'forgotPassword') {
        this.$router.push({ name: 'forgotPassword' });
        return;
      }
      this.clearRecoveryFeedback();
      this.resetRecoveryTouched();
      this.recoveryStep = 'phone';
      this.phoneOtp = (email(this.auth.param) ? this.auth.param : '') || this.phoneOtp || '';
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
      if (this.$route.name !== 'login') this.$router.push({ name: 'login' });
    },

    goToRecoveryStep: function(step) {
      this.clearRecoveryFeedback();
      if (step === 'phone') {
        this.otp = ''; this.newPwd = ''; this.newPwdRepet = '';
        this.showNewPWD = false; this.showNewPwdRepeat = false;
        this.resetRecoveryTouched();
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

    startResendCooldown: function(seconds = 60) {
      this.clearResendCooldown();
      this.resendCooldown = Math.max(1, Math.ceil(Number(seconds) || 60));
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
      try {
        if (!this.isAuthorized) {
          await this.login(this.auth);
          if (!this.isAuthorized) return;

          if (isPendingActivation(this.tenantOperational, this.business)) {
            const user = this.$store.getters['CORE/AUTH/getUser'] || {};
            try { sessionStorage.removeItem(verificationStorageKey(user.id_login, user.email)); }
            catch (_) { /* The verification screen also works without storage. */ }
          } else {
            await this.loadLoginImage();
          }
        }

        await this.$router.push(this.getPostLoginRoute());
      } catch (error) {
        if (!isNavigationFailure(error)) throw error;
      } finally {
        this.isLoading = false;
      }
    },

    getPostLoginRoute: function() {
      if (this.role !== 'super_admin' && isPendingActivation(this.tenantOperational, this.business)) return '/activar-cuenta';
      if (isD2AuthMode()) {
        if (this.role !== 'super_admin' && this.tenantOperational && this.tenantOperational.allowed === false && this.tenantOperational.code === 'TENANT_NOT_OPERATIONAL') {
          return '/tenant-restricted';
        }

        if (this.role !== 'super_admin' && this.business && this.business.registrationWelcomePending) return '/activar-cuenta';
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
      if (this.isLoading || this.resendCooldown > 0) {
        return;
      }

      this.touchRecoveryStep('phone');
      if (this.recoveryPhoneErrors.length > 0) {
        return;
      }

      const phone = this.normalizedRecoveryPhone;
      const t = { email: phone };
      this.phoneOtp = phone;
      this.isLoading = true;
      try {
        const response = await this.sendOtp(t);
        if (this._isDestroyed) return;
        if (response && response.retryAfterSeconds) this.startResendCooldown(response.retryAfterSeconds);
        if (this.isOtpSend) {
          this.otp = ''; this.newPwd = ''; this.newPwdRepet = '';
          this.showNewPWD = false; this.showNewPwdRepeat = false;
          this.resetRecoveryTouched();
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
      } catch (_) {
        if (!this._isDestroyed) this.setRecoveryStatus('error', '', 'No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
      } finally {
        this.isLoading = false;
      }
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

      const t = { email: this.normalizedRecoveryPhone, code: this.normalizedRecoveryCode };
      this.otp = this.normalizedRecoveryCode;
      this.isLoading = true;
      try {
        await this.validateOtp(t);
        if (this._isDestroyed) return;
        if (this.isValidateOtp) {
          this.goToRecoveryStep('password');
          this.clearRecoveryFeedback();
        } else {
          const safe = this.safeRecoveryErrorMessage(this.hasErrorVOTP ? this.hasErrorVOTP.message : '', 'code');
          this.setRecoveryStatus(safe.type, safe.title, safe.message);
        }
      } catch (_) {
        if (!this._isDestroyed) this.setRecoveryStatus('error', '', 'No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
      } finally {
        this.isLoading = false;
      }
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
        email: this.normalizedRecoveryPhone,
        'otp': this.normalizedRecoveryCode,
        'password': this.newPwd,
        'confirmPassword': this.newPwdRepet
      };
      this.isLoading = true;
      try {
        await this.updatePwd(t);
        if (this._isDestroyed) return;
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
      } catch (_) {
        if (!this._isDestroyed) this.setRecoveryStatus('error', '', 'No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
      } finally {
        this.isLoading = false;
      }
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

<style src="./authPalette.css"></style>
<style scoped src="./authScreen.css"></style>
