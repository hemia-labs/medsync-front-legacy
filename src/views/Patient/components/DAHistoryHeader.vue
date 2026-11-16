<template>
    <section class="patient-summary-card" aria-label="Datos del paciente">
        <div class="patient-summary-top">
            <div class="patient-summary-main">
                <!-- NC1-UX4: the avatar is the only photo entry. -->
                <div class="patient-avatar-wrap" @keydown.esc="closePhotoMenu">
                    <button v-if="photoAction" ref="avatar" type="button" class="patient-avatar" :aria-label="photoActionLabel" :aria-haspopup="photoAction === 'menu' ? 'true' : null" :aria-expanded="photoAction === 'menu' ? String(photoMenu) : null" @click="onAvatarClick">
                        <img v-if="patient.profile" :src="patient.profile" alt="" class="patient-avatar-img">
                        <span v-else class="patient-avatar-initials">{{ initials }}</span>
                        <span v-if="canUpdatePhoto" class="patient-photo-badge" aria-hidden="true"><v-icon x-small>mdi-camera-outline</v-icon></span>
                    </button>
                    <div v-else class="patient-avatar" aria-hidden="true">
                        <span class="patient-avatar-initials">{{ initials }}</span>
                    </div>
                    <div v-if="photoMenu" class="patient-photo-menu" role="menu" @focusout="onPhotoMenuFocusOut">
                        <button ref="photoView" type="button" role="menuitem" @click="viewPhoto">Ver foto</button>
                        <button type="button" role="menuitem" @click="updatePhoto">Actualizar foto</button>
                    </div>
                </div>

                <div class="patient-summary-info">
                    <p class="patient-kicker">Expediente clínico</p>
                    <h1>{{ patientName }}</h1>
                    <div class="patient-meta">
                        <span class="patient-code">Exp #{{ patient.code || 'Sin folio' }}</span>
                        <span>{{ patient.age === null || patient.age === undefined ? 'Edad sin registrar' : patient.age + ' años' }}</span>
                        <span class="patient-badge" :class="archived ? 'patient-badge--archived' : 'patient-badge--soft'">
                            <v-icon x-small>{{ archived ? 'mdi-archive-outline' : 'mdi-account-check-outline' }}</v-icon>
                            {{ archived ? 'Paciente archivado' : 'Paciente activo' }}
                        </span>
                        <span v-if="showClinical" class="patient-badge" :class="hasCondition ? 'patient-badge--warning' : 'patient-badge--soft'">
                            <v-icon x-small>{{ hasCondition ? 'mdi-alert-circle-outline' : 'mdi-shield-check-outline' }}</v-icon>
                            {{ hasCondition ? 'Afecciones: ' + condition : 'Sin afecciones registradas' }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Mutating actions are hidden while the patient form is open. -->
            <div v-if="canEdit && !editing" class="patient-summary-actions">
                <template v-if="archived">
                    <button type="button" class="patient-action patient-action--outlined" :disabled="archivePending" @click="$emit('restore')">
                        <v-icon small>mdi-archive-arrow-up-outline</v-icon>Restaurar paciente
                    </button>
                </template>
                <template v-else>
                    <button type="button" class="patient-action patient-action--outlined" @click="$emit('edit-patient')">
                        <v-icon small>mdi-account-edit-outline</v-icon>Editar datos del paciente
                    </button>
                    <button type="button" class="patient-action patient-action--text" :disabled="archivePending" @click="$emit('archive')">Archivar</button>
                </template>
            </div>
        </div>

        <p v-if="archived" class="patient-archived-notice" role="status">
            Paciente archivado. Su expediente y sus citas se conservan. Restaura al paciente para acceder a las secciones que no estén disponibles.
        </p>

        <dl class="patient-contact">
            <div>
                <dt>Teléfono del paciente</dt>
                <dd><a v-if="patientPhone" :href="'tel:' + patientPhone">{{ patientPhone }}</a><span v-else class="patient-contact-empty">Sin registrar</span></dd>
            </div>
            <div>
                <dt>Domicilio</dt>
                <dd><template v-if="addressLine">{{ addressLine }}<span v-if="postalCode" class="patient-contact-secondary">CP {{ postalCode }}</span></template><span v-else class="patient-contact-empty">Sin registrar</span></dd>
            </div>
            <!-- EC1 read-only. Key absent (API without EC1): no row, rather than claiming there is no contact. -->
            <div v-if="emergency.state !== 'unsupported'">
                <dt>Contacto de emergencia</dt>
                <dd v-if="emergency.state === 'none'"><span class="patient-contact-empty">Sin contacto de emergencia registrado</span></dd>
                <dd v-else>
                    <span class="patient-contact-person">{{ emergency.who }}</span>
                    <a v-if="emergency.phone" :href="'tel:' + emergency.phone">{{ emergency.phone }}</a>
                    <span v-else class="patient-contact-empty">Teléfono sin registrar</span>
                </dd>
            </div>
        </dl>
    </section>
</template>

<script>
const text = value => (value === undefined || value === null ? '' : String(value).trim());

export default {
    props: {
        canEdit: { type: Boolean, default: false },
        editing: { type: Boolean, default: false },
        archivePending: { type: Boolean, default: false },
        showClinical: { type: Boolean, default: true },
        px: {
            type: Object,
            default: function(){return {}}
        }
    },
    data() {
        return { photoMenu: false };
    },
    computed: {
        patient() {
            return this.px && this.px.person ? this.px.person : {};
        },
        query() {
            return this.px && this.px.query ? this.px.query : {};
        },
        archived() {
            return Number(this.patient.active) === 0;
        },
        patientName() {
            return this.patient.fullname || `${this.patient.name || ''} ${this.patient.surname || ''}`.trim() || 'Paciente sin nombre';
        },
        patientPhone() {
            return text(this.patient.telephone);
        },
        addressLine() {
            return text(this.px && this.px.address && this.px.address.direction);
        },
        postalCode() {
            return text(this.px && this.px.address && this.px.address.cp);
        },
        // Three states from the GET; the patient's own phone is never used as a substitute.
        emergency() {
            if(!this.px || !Object.prototype.hasOwnProperty.call(this.px, 'emergencyContact')) return { state: 'unsupported' };
            const contact = this.px.emergencyContact;
            const name = text(contact && contact.name);
            if(!contact || typeof contact !== 'object' || !name) return { state: 'none' };
            const relationship = text(contact.relationship);
            return { state: 'contact', who: relationship ? `${name} (${relationship})` : name, phone: text(contact.phone) };
        },
        canUpdatePhoto() {
            return this.canEdit && !this.editing;
        },
        // 'menu': view or update; 'view': view only; 'update': no photo yet; '': not interactive.
        photoAction() {
            if(this.patient.profile) return this.canUpdatePhoto ? 'menu' : 'view';
            return this.canUpdatePhoto ? 'update' : '';
        },
        photoActionLabel() {
            if(this.photoAction === 'menu') return 'Foto del paciente: ver o actualizar';
            return this.photoAction === 'view' ? 'Ver foto del paciente' : 'Actualizar foto del paciente';
        },
        condition() {
            return this.query.current_condition || 'NA';
        },
        hasCondition() {
            const value = String(this.condition || '').trim().toLowerCase();
            return value && !['na', 'n/a', 'no aplica', 'sin especificar'].includes(value);
        },
        initials() {
            const parts = this.patientName.split(' ').filter(Boolean);
            return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PX';
        }
    },
    watch: {
        photoAction(value) { if(value !== 'menu') this.photoMenu = false; }
    },
    methods: {
        onAvatarClick() {
            if(this.photoAction === 'update') this.updatePhoto();
            else if(this.photoAction === 'view') this.viewPhoto();
            else if(this.photoAction === 'menu') {
                this.photoMenu = !this.photoMenu;
                if(this.photoMenu) this.$nextTick(() => { if(this.$refs.photoView) this.$refs.photoView.focus(); });
            }
        },
        viewPhoto() {
            this.photoMenu = false;
            if(this.patient.profile && typeof this.$viewerApi === 'function') this.$viewerApi({ images: [this.patient.profile] });
        },
        updatePhoto() {
            this.photoMenu = false;
            if(this.canUpdatePhoto) this.$emit('edit', true);
        },
        closePhotoMenu() {
            if(!this.photoMenu) return;
            this.photoMenu = false;
            if(this.$refs.avatar) this.$refs.avatar.focus();
        },
        onPhotoMenuFocusOut(event) {
            const menu = event.currentTarget;
            if(!event.relatedTarget || !menu.contains(event.relatedTarget)) this.photoMenu = false;
        }
    }
}
</script>

<style scoped>
.patient-summary-card {
    padding: 1.15rem 1.25rem;
    border: 1px solid var(--color-primary-200);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.1);
}

.patient-summary-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.patient-summary-main {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1 1 22rem;
    min-width: 0;
}

.patient-avatar-wrap {
    position: relative;
    flex-shrink: 0;
}

.patient-avatar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4.2rem;
    height: 4.2rem;
    padding: 0;
    border: 1px solid var(--color-primary-200);
    border-radius: 16px;
    background: linear-gradient(135deg, var(--color-primary-100), #fff);
    color: var(--color-primary-900);
}

button.patient-avatar { cursor: pointer; }
button.patient-avatar:focus-visible { outline: 2px solid var(--color-primary-700); outline-offset: 2px; }

.patient-avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 15px;
    object-fit: cover;
}

.patient-avatar-initials {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.04em;
}

.patient-photo-badge {
    position: absolute;
    right: -0.35rem;
    bottom: -0.35rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.6rem;
    height: 1.6rem;
    border: 1px solid var(--color-primary-200);
    border-radius: 999px;
    background: #fff;
    color: var(--color-primary-700);
}

.patient-photo-badge .v-icon { color: currentColor; }

.patient-photo-menu {
    position: absolute;
    top: calc(100% + 0.4rem);
    left: 0;
    z-index: 5;
    display: grid;
    min-width: 11rem;
    padding: 0.3rem;
    border: 1px solid var(--color-primary-200);
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
}

.patient-photo-menu button {
    min-height: 44px;
    padding: 0 0.8rem;
    border-radius: 8px;
    color: #334155;
    font-size: 0.86rem;
    text-align: left;
}

.patient-photo-menu button:hover,
.patient-photo-menu button:focus-visible { background: var(--color-primary-100); outline: none; }

.patient-summary-info { min-width: 0; }

.patient-kicker {
    margin: 0 0 0.2rem;
    color: var(--color-primary-900);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.patient-summary-info h1 {
    margin: 0;
    color: #334155;
    font-size: 1.35rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    line-height: 1.25;
    overflow-wrap: anywhere;
}

.patient-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.45rem;
    color: #64748b;
    font-size: 0.84rem;
    font-weight: 600;
}

.patient-code {
    display: inline-flex;
    align-items: center;
    min-height: 1.6rem;
    padding: 0.2rem 0.6rem;
    border: 1px solid var(--color-primary-200);
    border-radius: 999px;
    background: var(--color-primary-100);
    color: var(--color-primary-900);
    font-size: 0.78rem;
}

.patient-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 1.6rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    overflow-wrap: anywhere;
}

.patient-badge .v-icon { color: currentColor; }

.patient-badge--soft {
    border: 1px solid var(--color-primary-200);
    background: #fff;
    color: var(--color-primary-900);
}

.patient-badge--archived {
    border: 1px solid #cbd5e1;
    background: #f1f5f9;
    color: #334155;
}

.patient-badge--warning {
    border: 1px solid #fecdd3;
    background: #fff1f2;
    color: #b4232f;
}

.patient-summary-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

.patient-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 44px;
    padding: 0 1rem;
    border-radius: 999px;
    font-size: 0.86rem;
    font-weight: 600;
}

.patient-action .v-icon { color: currentColor; }
.patient-action:disabled { opacity: 0.55; cursor: not-allowed; }
.patient-action:focus-visible { outline: 2px solid var(--color-primary-700); outline-offset: 2px; }

.patient-action--outlined {
    border: 1px solid var(--color-primary-700);
    color: var(--color-primary-700);
    background: #fff;
}

.patient-action--outlined:hover:not(:disabled) { background: var(--color-primary-100); }

/* Discreet, neutral text action: visible and named, without competing with Edit. */
.patient-action--text {
    padding: 0 0.75rem;
    border: 1px solid transparent;
    color: #64748b;
    background: transparent;
}

.patient-action--text:hover:not(:disabled) { color: #334155; text-decoration: underline; text-underline-offset: 3px; }

.patient-archived-notice {
    margin: 0.9rem 0 0;
    padding: 0.6rem 0.8rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: #334155;
    font-size: 0.86rem;
    line-height: 1.45;
}

.patient-contact {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) minmax(0, 1.25fr);
    gap: 1.1rem;
    margin: 1rem 0 0;
    padding-top: 0.9rem;
    border-top: 1px solid var(--color-primary-200);
}

.patient-contact > div { min-width: 0; }

.patient-contact dt {
    margin-bottom: 0.15rem;
    color: #64748b;
    font-size: 0.74rem;
    font-weight: 600;
}

.patient-contact dd {
    display: flex;
    flex-direction: column;
    margin: 0;
    color: #334155;
    font-size: 0.88rem;
    line-height: 1.45;
    overflow-wrap: anywhere;
}

.patient-contact a {
    align-self: flex-start;
    color: #334155;
    text-decoration: underline;
    text-underline-offset: 3px;
}

.patient-contact-secondary { color: #64748b; }
.patient-contact-empty { color: #64748b; font-style: italic; }

@media (max-width: 768px) {
    .patient-summary-card { padding: 0.95rem; }
    .patient-summary-main { align-items: flex-start; flex-basis: 100%; }
    .patient-avatar { width: 3.4rem; height: 3.4rem; border-radius: 14px; }
    .patient-avatar-img { border-radius: 13px; }
    .patient-summary-info h1 { font-size: 1.1rem; }
    .patient-summary-actions { width: 100%; }
    .patient-action--outlined { flex: 1 1 auto; }
    .patient-contact { grid-template-columns: minmax(0, 1fr); gap: 0.8rem; }
}
</style>
