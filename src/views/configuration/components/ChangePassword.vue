<template>
    <section class="password-settings bg-white border border-primary-200 shadow-xl" aria-labelledby="change-password-title">
        <header class="password-heading bg-primary-100 border-b border-primary-200">
            <div class="password-heading-icon" aria-hidden="true"><v-icon color="inherit" size="26">mdi-lock-reset</v-icon></div>
            <div>
                <p class="password-eyebrow">Seguridad de tu cuenta</p>
                <h2 id="change-password-title">Cambiar contraseña</h2>
                <p>Introduce tu contraseña actual y elige una nueva. Te enviaremos un código al correo de tu cuenta para confirmar que eres tú antes de realizar el cambio.</p>
            </div>
        </header>

        <div class="password-content">
            <form class="password-form" novalidate @submit.prevent="reviewForm">
                <h3>Elige tu nueva contraseña</h3>
                <p class="password-intro">Completa los tres campos. Tu contraseña actual seguirá vigente hasta que confirmes el código.</p>

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
                    :maxlength="field.key === 'currentPassword' ? null : 128"
                    :hint="field.hint"
                    :persistent-hint="Boolean(field.hint)"
                    :spellcheck="false"
                    autocapitalize="off"
                    autocorrect="off"
                    color="var(--color-primary-700)"
                    outlined
                    required
                    @blur="touched[field.key] = true"
                    @input="availabilityNotice = false"
                >
                    <template #append>
                        <button type="button" class="password-visibility" :aria-label="(visible[field.key] ? 'Ocultar ' : 'Mostrar ') + field.label.toLowerCase()" :aria-pressed="String(visible[field.key])" @click="visible[field.key] = !visible[field.key]">
                            <v-icon aria-hidden="true">{{ visible[field.key] ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
                        </button>
                    </template>
                </v-text-field>

                <p v-if="availabilityNotice" ref="availabilityStatus" tabindex="-1" class="password-status" role="status">El envío de códigos estará disponible próximamente. Tu contraseña no se ha modificado.</p>

                <div class="password-actions">
                    <button type="button" class="password-button password-button--secondary" :disabled="!hasChanges" @click="clearForm">Limpiar campos</button>
                    <button type="submit" class="password-button password-button--primary" aria-describedby="password-availability">
                        <v-icon color="inherit" size="18" aria-hidden="true">mdi-email-outline</v-icon>
                        Enviar código de verificación
                    </button>
                </div>
                <p id="password-availability" class="password-availability">La verificación por correo estará disponible próximamente.</p>
            </form>

            <aside class="password-help" aria-labelledby="password-help-title">
                <div class="password-help-icon" aria-hidden="true"><v-icon color="inherit" size="24">mdi-email-check-outline</v-icon></div>
                <h3 id="password-help-title">Confirma el cambio desde tu correo</h3>
                <p>El código se enviará al correo asociado a tu cuenta de MedSync.</p>
                <ol>
                    <li>Escribe tu contraseña actual y la nueva.</li>
                    <li>Revisa tu correo para obtener el código.</li>
                    <li>Introduce el código para confirmar el cambio.</li>
                </ol>
                <p class="password-help-note"><v-icon color="inherit" size="17" aria-hidden="true">mdi-shield-lock-outline</v-icon><span>No compartas tu contraseña ni el código de verificación.</span></p>
            </aside>
        </div>
    </section>
</template>

<script>
import { registerSettingsNavigationGuard } from '../../../domain/settings/settings.navigation';

const emptyForm = () => ({ currentPassword: '', newPassword: '', confirmPassword: '' });
const emptyFlags = () => ({ currentPassword: false, newPassword: false, confirmPassword: false });

export default {
    data() {
        return {
            form: emptyForm(),
            touched: emptyFlags(),
            visible: emptyFlags(),
            availabilityNotice: false,
            fields: [
                { key: 'currentPassword', label: 'Contraseña actual', autocomplete: 'current-password', hint: '' },
                { key: 'newPassword', label: 'Nueva contraseña', autocomplete: 'new-password', hint: 'De 8 a 128 caracteres, con al menos una letra y un número.' },
                { key: 'confirmPassword', label: 'Confirmar nueva contraseña', autocomplete: 'new-password', hint: '' }
            ]
        };
    },
    computed: {
        hasChanges() { return Object.values(this.form).some(Boolean); },
        errors() {
            const { currentPassword, newPassword, confirmPassword } = this.form;
            return {
                currentPassword: currentPassword ? '' : 'Introduce tu contraseña actual.',
                newPassword: !newPassword ? 'Introduce una nueva contraseña.'
                    : newPassword.length < 8 || newPassword.length > 128 ? 'Usa entre 8 y 128 caracteres.'
                    : !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) ? 'Incluye al menos una letra y un número.'
                    : newPassword === currentPassword ? 'Elige una contraseña diferente de la actual.' : '',
                confirmPassword: !confirmPassword ? 'Vuelve a escribir la nueva contraseña.'
                    : confirmPassword !== newPassword ? 'Las contraseñas no coinciden.' : ''
            };
        }
    },
    mounted() {
        this.removeNavigationGuard = registerSettingsNavigationGuard(this, {
            hasChanges: () => this.hasChanges,
            onDiscard: () => this.clearForm()
        });
    },
    beforeDestroy() {
        if(this.removeNavigationGuard) this.removeNavigationGuard();
        this.clearForm();
    },
    methods: {
        clearForm() {
            this.form = emptyForm();
            this.touched = emptyFlags();
            this.visible = emptyFlags();
            this.availabilityNotice = false;
        },
        reviewForm() {
            this.fields.forEach(field => { this.touched[field.key] = true; });
            const invalid = this.fields.find(field => this.errors[field.key]);
            this.availabilityNotice = false;
            this.$nextTick(() => {
                if(invalid) {
                    const field = this.$refs[invalid.key];
                    const input = Array.isArray(field) ? field[0] : field;
                    if(input) input.focus();
                } else {
                    // UI only: never reuse password recovery to bypass current-password verification.
                    this.availabilityNotice = true;
                    this.$nextTick(() => {
                        if(this.$refs.availabilityStatus) this.$refs.availabilityStatus.focus();
                    });
                }
            });
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
.password-content { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(14rem, 1fr); gap: 2rem; padding: 1.75rem; align-items: start; }
.password-content h3 { margin: 0; color: #374151; font-size: 1rem; font-weight: 600; line-height: 1.5; }
.password-form { min-width: 0; }
.password-intro { margin: .5rem 0 1.5rem; color: #6b7280; font-size: .875rem; line-height: 1.65; }
.password-visibility { display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; margin-top: -.25rem; border-radius: .25rem; }
.password-visibility:focus-visible, .password-button:focus-visible { outline: 3px solid var(--color-primary-700); outline-offset: 3px; }
.password-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: .75rem; padding-top: .5rem; }
.password-button { display: inline-flex; justify-content: center; align-items: center; gap: .5rem; min-height: 2.75rem; padding: .65rem 1rem; font-size: .875rem; font-weight: 600; border: 1px solid transparent; border-radius: .5rem; line-height: 1.4; }
.password-button--primary { color: white; background: var(--color-primary-900); }
.password-button--primary .v-icon { color: white !important; }
.password-button--primary:hover { background: var(--color-primary-700); }
.password-button--secondary { color: #4b5563; border-color: #d1d5db; background: white; }
.password-button:disabled { opacity: .5; cursor: default; }
.password-availability { margin: .75rem 0 0; color: #6b7280; font-size: .75rem; text-align: right; line-height: 1.5; }
.password-help { padding: 1.5rem; border: 1px solid var(--color-primary-200); background: var(--color-primary-100); }
.password-help-icon { color: var(--color-primary-900); margin-bottom: .75rem; }
.password-help p, .password-help li { color: #4b5563; font-size: .875rem; line-height: 1.65; }
.password-help p { margin: .6rem 0 0; }
.password-help ol { margin: 1.25rem 0; padding-left: 1.25rem; list-style-type: decimal; }
.password-help li + li { margin-top: .75rem; }
.password-help .password-help-note { display: flex; align-items: flex-start; gap: .5rem; padding-top: 1rem; border-top: 1px solid var(--color-primary-200); font-size: .8rem; }
.password-help-note .v-icon { margin-top: .2rem; }
.password-status { padding: 1rem; border: 1px solid var(--color-primary-200); background: var(--color-primary-100); color: #374151; font-size: .875rem; line-height: 1.6; }
@media (max-width: 1279px) { .password-content { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 639px) {
    .password-heading, .password-content { padding: 1.25rem; }
    .password-heading-icon { display: none; }
    .password-content { gap: 1.5rem; }
    .password-actions { flex-direction: column-reverse; }
    .password-button { width: 100%; }
    .password-availability { text-align: left; }
}
</style>
