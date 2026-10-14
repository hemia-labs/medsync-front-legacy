<template>
    <section class="patient-summary-card">
        <div class="patient-summary-main">
            <div class="patient-avatar-wrap">
                <button type="button" class="patient-avatar" :disabled="!canEdit" @click="$emit('edit', $attrs.value)">
                    <img v-if="patient.profile" :src="patient.profile" class="patient-avatar-img" v-viewer>
                    <span v-else class="patient-avatar-initials">{{ initials }}</span>
                </button>
                <button v-if="canEdit" type="button" class="patient-photo-action" title="Actualizar foto" @click="$emit('edit', $attrs.value)">
                    <v-icon small>mdi-camera-outline</v-icon>
                </button>
            </div>

            <div class="patient-summary-info">
                <p class="patient-kicker">Expediente clínico</p>
                <div class="patient-title-row">
                    <h1>{{ patientName }}</h1>
                    <span class="patient-code">Exp #{{ patient.code || 'Sin folio' }}</span>
                </div>
                <div class="patient-meta">
                    <span>{{ patient.age === null || patient.age === undefined ? 'Edad sin registrar' : patient.age + ' años' }}</span>
                    <span v-if="showClinical" class="patient-dot"></span>
                    <span v-if="showClinical">Afecciones: {{ condition }}</span>
                </div>
                <div class="patient-badges">
                    <span class="patient-badge patient-badge--soft">
                        <v-icon x-small>mdi-account-check-outline</v-icon>
                        {{ Number(patient.active) === 0 ? 'Paciente inactivo' : 'Paciente activo' }}
                    </span>
                    <span v-if="showClinical" class="patient-badge" :class="hasCondition ? 'patient-badge--warning' : 'patient-badge--soft'">
                        <v-icon x-small>{{ hasCondition ? 'mdi-alert-circle-outline' : 'mdi-shield-check-outline' }}</v-icon>
                        {{ hasCondition ? condition : 'Sin afecciones registradas' }}
                    </span>
                </div>
            </div>
        </div>

        <div class="patient-summary-actions">
            <v-tooltip v-if="canEdit" bottom>
                <template v-slot:activator="{ on, attrs }">
                    <button type="button" class="patient-icon-action" v-bind="attrs" v-on="on" aria-label="Actualizar foto" @click="$emit('edit', $attrs.value)">
                        <v-icon small>mdi-camera-outline</v-icon>
                    </button>
                </template>
                <span>Actualizar foto</span>
            </v-tooltip>
            <v-tooltip bottom>
                <template v-slot:activator="{ on, attrs }">
                    <button type="button" class="patient-icon-action patient-icon-action--close" v-bind="attrs" v-on="on" aria-label="Cerrar expediente" @click="$router.push('/px/all')">
                        <v-icon small>mdi-close</v-icon>
                    </button>
                </template>
                <span>Cerrar expediente</span>
            </v-tooltip>
        </div>
    </section>
</template>

<script>
export default {
    props: {
        canEdit: { type: Boolean, default: false },
        showClinical: { type: Boolean, default: true },
        px: {
            type: Object,
            default: function(){return {}}
        }
    },
    computed: {
        patient() {
            return this.px && this.px.person ? this.px.person : {};
        },
        query() {
            return this.px && this.px.query ? this.px.query : {};
        },
        patientName() {
            return this.patient.fullname || `${this.patient.name || ''} ${this.patient.surname || ''}`.trim() || 'Paciente sin nombre';
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
    }
}
</script>

<style scoped>
.patient-summary-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.15rem;
    border: 1px solid var(--color-primary-200);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.1);
}

.patient-summary-main {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
}

.patient-avatar-wrap {
    position: relative;
    flex-shrink: 0;
}

.patient-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4.8rem;
    height: 4.8rem;
    overflow: hidden;
    border: 1px solid var(--color-primary-200);
    border-radius: 16px;
    background: linear-gradient(135deg, var(--color-primary-100), #fff);
    color: var(--color-primary-900);
    box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.68);
}

.patient-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.patient-avatar-initials {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: 0.04em;
}

.patient-photo-action {
    position: absolute;
    right: -0.35rem;
    bottom: -0.35rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
    border: 1px solid var(--color-primary-200);
    border-radius: 999px;
    background: #fff;
    color: var(--color-primary-700);
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.14);
}

.patient-photo-action .v-icon {
    color: currentColor;
}

.patient-summary-info {
    min-width: 0;
}

.patient-kicker {
    margin: 0 0 0.2rem;
    color: var(--color-primary-900);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.patient-title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.65rem;
}

.patient-title-row h1 {
    margin: 0;
    color: #334155;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    line-height: 1.2;
}

.patient-code {
    display: inline-flex;
    align-items: center;
    min-height: 1.6rem;
    padding: 0.25rem 0.65rem;
    border: 1px solid var(--color-primary-200);
    border-radius: 999px;
    background: var(--color-primary-100);
    color: var(--color-primary-900);
    font-size: 0.78rem;
    font-weight: 700;
}

.patient-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.35rem;
    color: #64748b;
    font-size: 0.86rem;
    font-weight: 600;
}

.patient-dot {
    width: 0.28rem;
    height: 0.28rem;
    border-radius: 999px;
    background: var(--color-primary-500);
}

.patient-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.65rem;
}

.patient-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 1.7rem;
    padding: 0.28rem 0.65rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
}

.patient-badge .v-icon {
    color: currentColor;
}

.patient-badge--soft {
    border: 1px solid var(--color-primary-200);
    background: #fff;
    color: var(--color-primary-900);
}

.patient-badge--warning {
    border: 1px solid #fecdd3;
    background: #fff1f2;
    color: #b4232f;
}

.patient-summary-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-shrink: 0;
}

.patient-icon-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--color-primary-200);
    border-radius: 999px;
    background: #fff;
    color: var(--color-primary-700);
    transition: background-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.patient-icon-action:hover {
    transform: translateY(-1px);
    background: var(--color-primary-100);
    color: var(--color-primary-900);
}

.patient-icon-action .v-icon {
    color: currentColor;
}

.patient-icon-action--close {
    color: #64748b;
}

@media (max-width: 768px) {
    .patient-summary-card {
        align-items: flex-start;
        padding: 0.9rem;
    }

    .patient-summary-main {
        align-items: flex-start;
    }

    .patient-avatar {
        width: 3.8rem;
        height: 3.8rem;
        border-radius: 14px;
    }

    .patient-title-row h1 {
        font-size: 1.05rem;
    }

    .patient-summary-actions {
        flex-direction: column;
    }
}
</style>
