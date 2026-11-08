<template>
    <section class="password-settings bg-white border border-primary-200 shadow-xl" aria-labelledby="change-password-title" :aria-busy="String(loading)">
        <header class="password-heading bg-primary-100 border-b border-primary-200">
            <div class="password-heading-icon" aria-hidden="true"><v-icon color="inherit" size="26">mdi-lock-reset</v-icon></div>
            <div>
                <p class="password-eyebrow">Seguridad de tu cuenta</p>
                <h2 id="change-password-title">Cambiar contraseña</h2>
                <p v-if="step === 'form'">Confirma tu contraseña actual y elige una nueva. Después enviaremos un código a tu correo para autorizar el cambio.</p>
                <p v-else-if="step === 'code'">Introduce el código que enviamos a tu correo. La contraseña cambiará cuando confirmes el código.</p>
                <p v-else>La contraseña de tu cuenta se actualizó correctamente.</p>
            </div>
        </header>

        <div class="password-content" v-if="step !== 'success'">
            <form v-if="step === 'form'" class="password-form" novalidate @submit.prevent="sendCode">
                <v-text-field
                    v-for="field in fields"
                    :id="'change-password-' + field.key"
                    :key="field.key"
                    :ref="field.key"
                    v-model="form[field.key]"
                    :label="field.label"
                    :type="visible[field.key] ? 'text' : 'password'"
                    :autocomplete="field.autocomplete"
                    :error-messages="touched[field.key] ? errors[field.key] : ''"
                    :hint="field.hint"
                    :persistent-hint="Boolean(field.hint)"
                    :spellcheck="false"
                    autocapitalize="off"
                    autocorrect="off"
                    color="var(--color-primary-700)"
                    outlined
                    required
                    :disabled="loading"
                    @blur="touched[field.key] = true"
                    @input="clearFeedback"
                >
                    <template #append>
                        <button type="button" class="password-visibility" :aria-label="(visible[field.key] ? 'Ocultar ' : 'Mostrar ') + field.label.toLowerCase()" :aria-pressed="String(visible[field.key])" :disabled="loading" @click="visible[field.key] = !visible[field.key]">
                            <v-icon aria-hidden="true">{{ visible[field.key] ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
                        </button>
                    </template>
                </v-text-field>

                <p v-if="feedback.message" class="password-feedback" :class="'password-feedback--' + feedback.type" :role="feedback.type === 'error' ? 'alert' : 'status'">{{ feedback.message }}</p>

                <div class="password-actions">
                    <button type="button" class="password-button password-button--secondary" :disabled="!hasChanges || loading" @click="clearForm">Limpiar campos</button>
                    <button type="submit" class="password-button password-button--primary" :disabled="loading || resendRemaining > 0">
                        <v-icon color="inherit" size="18" aria-hidden="true">{{ loading ? 'mdi-loading' : 'mdi-email-outline' }}</v-icon>
                        {{ loading ? 'Validando y enviando…' : resendRemaining ? 'Enviar en ' + resendRemaining + ' s' : 'Enviar código de verificación' }}
                    </button>
                </div>
            </form>

            <form v-else class="password-form" novalidate @submit.prevent="confirmCode">
                <p class="password-intro">Enviamos un código a <strong>{{ emailMasked || 'el correo asociado a tu cuenta' }}</strong>. Vence en {{ ttlMinutes }} minutos.</p>

                <div
                    class="otp-input-group"
                    role="group"
                    aria-label="Código de verificación de 6 dígitos"
                    @focusout="handleCodeGroupBlur"
                >
                    <p class="otp-label">Código de verificación</p>
                    <div class="otp-inputs" :class="{ 'otp-inputs--error': codeTouched && !validCode }">
                        <input
                            v-for="(_, index) in 6"
                            :key="index"
                            ref="codeFields"
                            :value="codeDigits[index]"
                            type="text"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            maxlength="6"
                            :autocomplete="index === 0 ? 'one-time-code' : 'off'"
                            :aria-label="'Dígito ' + (index + 1) + ' de 6'"
                            :aria-invalid="String(codeTouched && !validCode)"
                            :aria-describedby="codeTouched && !validCode ? 'change-password-code-error' : null"
                            :disabled="loading"
                            spellcheck="false"
                            autocapitalize="off"
                            autocorrect="off"
                            class="otp-input"
                            @input="handleCodeInput(index, $event)"
                            @focus="selectCodeField"
                            @keydown="handleCodeKeydown(index, $event)"
                            @paste="handleCodePaste(index, $event)"
                        >
                    </div>
                    <p v-if="codeTouched && !validCode" id="change-password-code-error" class="otp-error" role="alert">
                        Introduce los 6 dígitos del código.
                    </p>
                </div>

                <p v-if="feedback.message" class="password-feedback" :class="'password-feedback--' + feedback.type" :role="feedback.type === 'error' ? 'alert' : 'status'">{{ feedback.message }}</p>

                <div class="password-actions">
                    <button type="button" class="password-button password-button--secondary" :disabled="loading" @click="backToForm">Cambiar datos</button>
                    <button type="button" class="password-button password-button--outline" :disabled="loading || resendRemaining > 0" @click="sendCode">{{ resendRemaining ? 'Reenviar en ' + resendRemaining + ' s' : 'Reenviar código' }}</button>
                    <button type="submit" class="password-button password-button--primary" :disabled="loading || !validCode">
                        <v-icon color="inherit" size="18" aria-hidden="true">{{ loading ? 'mdi-loading' : 'mdi-lock-check-outline' }}</v-icon>
                        {{ loading ? 'Confirmando…' : 'Confirmar cambio' }}
                    </button>
                </div>
            </form>


        </div>

        <div v-else class="password-success" role="status" tabindex="-1">
            <v-icon color="success" size="36" aria-hidden="true">mdi-check-circle-outline</v-icon>
            <h3>Contraseña actualizada</h3>
            <p>Se cerraron las demás sesiones de tu cuenta. Esta sesión permanece activa.</p>
            <button type="button" class="password-button password-button--primary" @click="resetFlow">Listo</button>
        </div>
    </section>
</template>

<script>
import { registerSettingsNavigationGuard } from '../../../domain/settings/settings.navigation';
import { DAAuthService } from '../../../services/context/core-proccess-context';
import { registrationPasswordError } from '../../../utils/registration';

const emptyForm = () => ({ currentPassword: '', newPassword: '', confirmPassword: '' });
const emptyFlags = () => ({ currentPassword: false, newPassword: false, confirmPassword: false });
const emptyFeedback = () => ({ type: '', message: '' });

export default {
    data() {
        return {
            form: emptyForm(),
            touched: emptyFlags(),
            visible: emptyFlags(),
            step: 'form',
            codeDigits: Array(6).fill(''),
            codeTouched: false,
            emailMasked: '',
            ttlMinutes: 10,
            loading: false,
            resendRemaining: 0,
            resendTimer: null,
            feedback: emptyFeedback(),
            fields: [
                { key: 'currentPassword', label: 'Contraseña actual', autocomplete: 'current-password', hint: '' },
                { key: 'newPassword', label: 'Nueva contraseña', autocomplete: 'new-password', hint: 'De 8 a 128 caracteres. Puedes incluir espacios.' },
                { key: 'confirmPassword', label: 'Confirmar nueva contraseña', autocomplete: 'new-password', hint: '' }
            ]
        };
    },
    computed: {
        hasChanges() { return Object.values(this.form).some(Boolean) || Boolean(this.code); },
        code() { return this.codeDigits.join(''); },
        validCode() { return /^\d{6}$/.test(String(this.code || '').trim()); },
        errors() {
            const { currentPassword, newPassword, confirmPassword } = this.form;
            return {
                currentPassword: currentPassword ? '' : 'Introduce tu contraseña actual.',
                newPassword: !newPassword ? 'Introduce una nueva contraseña.'
                    : registrationPasswordError(newPassword) ? registrationPasswordError(newPassword)
                    : newPassword === currentPassword ? 'Elige una contraseña diferente de la actual.' : '',
                confirmPassword: !confirmPassword ? 'Vuelve a escribir la nueva contraseña.'
                    : confirmPassword !== newPassword ? 'Las contraseñas no coinciden.' : ''
            };
        }
    },
    mounted() {
        this.removeNavigationGuard = registerSettingsNavigationGuard(this, {
            hasChanges: () => this.hasChanges,
            isSaving: () => this.loading,
            onDiscard: () => this.clearForm()
        });
    },
    beforeDestroy() {
        if(this.removeNavigationGuard) this.removeNavigationGuard();
        this.clearForm();
        clearInterval(this.resendTimer);
    },
    methods: {
        startResendCooldown(seconds) {
            clearInterval(this.resendTimer);
            const until = Date.now() + Math.max(0, Number(seconds) || 0) * 1000;
            const tick = () => {
                this.resendRemaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
                if (!this.resendRemaining) clearInterval(this.resendTimer);
            };
            tick(); this.resendTimer = setInterval(tick, 500);
        },
        clearForm() {
            this.form = emptyForm();
            this.touched = emptyFlags();
            this.visible = emptyFlags();
            this.step = 'form';
            this.codeDigits = Array(6).fill('');
            this.codeTouched = false;
            this.emailMasked = '';
            this.ttlMinutes = 10;
            this.feedback = emptyFeedback();
        },
        clearFeedback() {
            if(this.feedback.message) this.feedback = emptyFeedback();
        },
        async sendCode() {
            if (this.loading || this.resendRemaining) return;
            this.fields.forEach(field => { this.touched[field.key] = true; });
            const invalid = this.fields.find(field => this.errors[field.key]);
            this.feedback = emptyFeedback();
            if(invalid) {
                this.$nextTick(() => {
                    const field = this.$refs[invalid.key];
                    const input = Array.isArray(field) ? field[0] : field;
                    if(input) input.focus();
                });
                return;
            }

            this.loading = true;
            try {
                const response = await DAAuthService.sendPasswordChangeCode({
                    currentPassword: this.form.currentPassword,
                    newPassword: this.form.newPassword,
                    confirmPassword: this.form.confirmPassword
                });
                if (this._isDestroyed) return;
                if (response && response.retryAfterSeconds) this.startResendCooldown(response.retryAfterSeconds);
                if(!response || !response.success) {
                    this.feedback = { type: 'error', message: response && response.message ? response.message : 'No se pudo enviar el código.' };
                    return;
                }

                this.startResendCooldown(response.data.resendAfterSeconds || 60);
                this.step = 'code';
                this.codeDigits = Array(6).fill('');
                this.codeTouched = false;
                this.emailMasked = response.data && response.data.emailMasked ? response.data.emailMasked : '';
                this.ttlMinutes = response.data && response.data.ttlMinutes ? response.data.ttlMinutes : 10;
                this.feedback = emptyFeedback();
                this.focusCodeField(0);
            } catch {
                this.feedback = { type: 'error', message: 'No se pudo enviar el código. Inténtalo de nuevo.' };
            } finally {
                this.loading = false;
            }
        },
        async confirmCode() {
            if (this.loading) return;
            this.codeTouched = true;
            this.feedback = emptyFeedback();
            if(!this.validCode) {
                const firstEmpty = this.codeDigits.findIndex(digit => !digit);
                this.focusCodeField(firstEmpty < 0 ? 0 : firstEmpty);
                return;
            }

            this.loading = true;
            try {
                const response = await DAAuthService.confirmPasswordChange({ code: String(this.code).trim() });
                if (this._isDestroyed) return;
                if(!response || !response.success) {
                    this.feedback = { type: 'error', message: response && response.status === 0
                        ? 'No pudimos confirmar el resultado. Comprueba el acceso con tu nueva contraseña antes de repetir el cambio.'
                        : response && response.message ? response.message : 'No se pudo confirmar el código.' };
                    return;
                }

                this.step = 'success';
                this.form = emptyForm();
                this.touched = emptyFlags();
                this.visible = emptyFlags();
                this.codeDigits = Array(6).fill('');
                this.codeTouched = false;
                this.feedback = emptyFeedback();
            } catch {
                this.feedback = { type: 'error', message: 'No se pudo confirmar el código. Inténtalo de nuevo.' };
            } finally {
                this.loading = false;
            }
        },
        focusCodeField(index) {
            this.$nextTick(() => {
                const fields = this.$refs.codeFields;
                const field = Array.isArray(fields) ? fields[index] : fields;
                if(field) field.focus();
            });
        },
        handleCodeGroupBlur(event) {
            if(!event.currentTarget.contains(event.relatedTarget)) this.codeTouched = true;
        },
        selectCodeField(event) {
            event.target.select();
        },
        handleCodeInput(index, event) {
            const entered = String(event.target.value || '').replace(/\D/g, '').slice(0, 6);
            const digits = this.codeDigits.slice();
            const startIndex = entered.length === 6 ? 0 : index;

            if(entered.length > 1) {
                for(let offset = 0; offset < entered.length && startIndex + offset < digits.length; offset += 1) {
                    digits[startIndex + offset] = entered[offset];
                }
            } else {
                digits[index] = entered;
            }

            this.codeDigits = digits;
            event.target.value = this.codeDigits[index];
            this.clearFeedback();
            if(entered) this.focusCodeField(Math.min(startIndex + entered.length, 5));
        },
        handleCodeKeydown(index, event) {
            if(event.key === 'ArrowLeft' && index > 0) {
                event.preventDefault();
                this.focusCodeField(index - 1);
            } else if(event.key === 'ArrowRight' && index < 5) {
                event.preventDefault();
                this.focusCodeField(index + 1);
            } else if(event.key === 'Backspace' && !this.codeDigits[index] && index > 0) {
                event.preventDefault();
                const digits = this.codeDigits.slice();
                digits[index - 1] = '';
                this.codeDigits = digits;
                this.clearFeedback();
                this.focusCodeField(index - 1);
            }
        },
        handleCodePaste(index, event) {
            const allDigits = String(event.clipboardData && event.clipboardData.getData('text') || '').replace(/\D/g, '');
            const startIndex = allDigits.length >= 6 ? 0 : index;
            const pasted = allDigits.slice(0, 6 - startIndex);
            if(!pasted) return;

            event.preventDefault();
            const digits = this.codeDigits.slice();
            for(let offset = 0; offset < pasted.length; offset += 1) digits[startIndex + offset] = pasted[offset];
            this.codeDigits = digits;
            this.clearFeedback();
            this.focusCodeField(Math.min(startIndex + pasted.length, 5));
        },
        backToForm() {
            this.step = 'form';
            this.codeDigits = Array(6).fill('');
            this.codeTouched = false;
            this.feedback = emptyFeedback();
        },
        resetFlow() {
            this.clearForm();
        }
    }
};
</script>

<style scoped>
.password-settings { min-width: 0; }
.password-heading { display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem 1.75rem; }
.password-heading-icon { display: flex; align-items: center; justify-content: center; flex: 0 0 3rem; height: 3rem; color: var(--color-primary-900); border: 1px solid var(--color-primary-200); background: white; }
.password-eyebrow { margin: 0 0 .35rem; color: var(--color-primary-900); font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.password-heading h2 { margin: 0; color: #4b5563; font-size: 1.5rem; font-weight: 400; }
.password-heading p:last-child { max-width: 48rem; margin: .5rem 0 0; color: #4b5563; font-size: .875rem; line-height: 1.65; }
.password-content { display: block; padding: 1.75rem; align-items: start; }
.password-form { min-width: 0; max-width: 40rem; }
.password-intro { margin: .5rem 0 1.5rem; color: #6b7280; font-size: .875rem; line-height: 1.65; }
.otp-input-group { margin: 0 0 1rem; }
.otp-label { margin: 0 0 .5rem; color: #6b7280; font-size: .875rem; font-weight: 500; }
.otp-inputs { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: clamp(.35rem, 2vw, .75rem); width: min(100%, 23rem); }
.otp-input { box-sizing: border-box; min-width: 0; height: 3.5rem; padding: 0 .25rem; border: 1px solid #9ca3af; border-radius: .4rem; color: #374151; background: white; font: inherit; font-size: 1.35rem; font-weight: 600; text-align: center; transition: border-color .15s ease, box-shadow .15s ease; }
.otp-input:focus { border: 2px solid var(--color-primary-700); outline: none; box-shadow: 0 0 0 2px rgba(14, 116, 144, .12); }
.otp-input:disabled { opacity: .6; }
.otp-inputs--error .otp-input { border-color: #ef4444; }
.otp-error { margin: .4rem 0 0; color: #dc2626; font-size: .8rem; line-height: 1.4; }
.password-visibility { display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; margin-top: -.25rem; border-radius: .25rem; }
.password-visibility:focus-visible, .password-button:focus-visible { outline: 3px solid var(--color-primary-700); outline-offset: 3px; }
.password-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: .75rem; padding-top: .5rem; }
.password-button { display: inline-flex; justify-content: center; align-items: center; gap: .5rem; min-height: 2.75rem; padding: .65rem 1rem; font-size: .875rem; font-weight: 600; border: 1px solid transparent; border-radius: .5rem; line-height: 1.4; }
.password-button--primary { color: white; background: var(--color-primary-900); }
.password-button--primary .v-icon { color: white !important; }
.password-button--primary:hover { background: var(--color-primary-700); }
.password-button--outline { color: var(--color-primary-900); border-color: var(--color-primary-200); background: white; }
.password-button--outline:hover { background: var(--color-primary-100); }
.password-button--secondary { color: #4b5563; border-color: #d1d5db; background: white; }
.password-button:disabled { opacity: .5; cursor: default; }
.password-feedback { padding: .875rem 1rem; border: 1px solid var(--color-primary-200); font-size: .875rem; line-height: 1.6; }
.password-feedback--success { color: #166534; border-color: #bbf7d0; background: #f0fdf4; }
.password-feedback--error { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
.password-success { display: flex; flex-direction: column; align-items: flex-start; gap: .75rem; padding: 2rem; }
.password-success h3 { margin: 0; color: #166534; font-size: 1.25rem; }
.password-success p { margin: 0 0 .5rem; color: #4b5563; font-size: .9rem; line-height: 1.6; }
@media (max-width: 639px) {
    .password-heading, .password-content { padding: 1.25rem; }
    .password-heading-icon { display: none; }
    .password-content { gap: 1.5rem; }
    .password-actions { flex-direction: column-reverse; }
    .password-button { width: 100%; }
    .password-success { padding: 1.25rem; }
}
</style>
