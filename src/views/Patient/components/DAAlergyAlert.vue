<template>
    <section class="allergy-status" :class="statusClass">
        <div class="allergy-icon">
            <v-icon>{{ statusIcon }}</v-icon>
        </div>
        <div class="allergy-copy">
            <p class="allergy-label">{{ statusTitle }}</p>
            <p class="allergy-text">{{ statusText }}</p>
        </div>
        <button v-if="canEdit" type="button" class="allergy-action" @click="$emit('edit')">
            Actualizar
        </button>
    </section>
</template>

<script>
import { allergyStatus, allergyLabels } from '../../../domain/patient/allergy';
export default {
    props: {
        canEdit: { type: Boolean, default: true },
        px: {
            type: Object,
            default: function(){return {}}
        }
    },
    computed: {
        allergy() {
            return this.px && this.px.allergy ? this.px.allergy : {};
        },
        hasRecord() {
            return allergyStatus(this.allergy) === 'NONE_KNOWN';
        },
        hasAllergy() {
            return allergyStatus(this.allergy) === 'HAS_ALLERGIES';
        },
        description() {
            return this.allergy.description || '';
        },
        status() {
            if(this.hasAllergy) {
                return 'danger';
            }
            if(this.hasRecord) {
                return 'safe';
            }
            return 'pending';
        },
        statusTitle() {
            return allergyLabels[allergyStatus(this.allergy)];
        },
        statusText() {
            if(this.status === 'danger') {
                return this.description || 'El paciente tiene alergia registrada, pero falta capturar la descripcion.';
            }
            if(this.status === 'safe') {
                return 'El expediente indica que el paciente no reporta alergias.';
            }
            return allergyStatus(this.allergy) === 'UNKNOWN' ? this.description : 'Pregunta al paciente y actualiza esta informacion antes de continuar el tratamiento.';
        },
        statusIcon() {
            const map = {
                danger: 'mdi-alert-circle-outline',
                safe: 'mdi-shield-check-outline',
                pending: 'mdi-help-circle-outline'
            };
            return map[this.status];
        },
        statusClass() {
            return `allergy-status--${this.status}`;
        }
    }
}
</script>

<style scoped>
.allergy-status {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.8rem 1rem;
    border: 1px solid transparent;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.allergy-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.35rem;
    height: 2.35rem;
    border-radius: 999px;
    flex-shrink: 0;
}

.allergy-icon .v-icon {
    color: currentColor;
}

.allergy-copy {
    min-width: 0;
    flex: 1;
}

.allergy-label {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.allergy-text {
    margin: 0.15rem 0 0;
    color: #475569;
    font-size: 0.86rem;
    font-weight: 600;
    line-height: 1.35;
}

.allergy-action {
    min-height: 2rem;
    padding: 0.35rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 999px;
    background: #fff;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.1);
}

.allergy-status--danger {
    border-color: #fecdd3;
    background: #fff1f2;
    color: #b4232f;
}

.allergy-status--danger .allergy-icon {
    background: #ffe4e8;
}

.allergy-status--danger .allergy-action {
    color: #b4232f;
    border-color: #fecdd3;
}

.allergy-status--safe {
    border-color: #bbf7d0;
    background: #f0fdf4;
    color: #137445;
}

.allergy-status--safe .allergy-icon {
    background: #dcfce7;
}

.allergy-status--pending {
    border-color: #fde68a;
    background: #fffbeb;
    color: #a16207;
}

.allergy-status--pending .allergy-icon {
    background: #fef3c7;
}

.allergy-status--pending .allergy-action {
    color: #a16207;
    border-color: #fde68a;
}

@media (max-width: 640px) {
    .allergy-status {
        align-items: flex-start;
    }

    .allergy-action {
        align-self: center;
    }
}
</style>
