<template>
    <header class="admin-settings-header">
        <div class="settings-heading-copy">
            <p v-if="activeSection !== 'plan-billing'" class="settings-context">{{ administrator ? 'Configuración del consultorio' : 'Mis ajustes' }}</p>
            <h1>{{ currentSection.title || 'Configuración' }}</h1>
            <p class="settings-description">{{ currentSection.description }}</p>
        </div>
        <v-btn
            ref="navigationButton"
            outlined
            class="admin-mobile-section"
            :aria-expanded="String(navigationOpen)"
            aria-controls="admin-settings-navigation"
            @click="$emit('open-navigation')"
        >
            <v-icon left size="20">mdi-menu</v-icon>
            Apartados de configuración
        </v-btn>
    </header>
</template>

<script>
export default {
    computed: {
        currentSection() { return this.sections.find(section => section.key === this.activeSection) || {} }
    },
    props: {
        activeSection: {type:String,default:''},
        administrator: {type:Boolean,default:false},
        navigationOpen: Boolean,
        sections: {
            type: Array,
            default: () => []
        }
    }
}
</script>

<style scoped>
.admin-settings-header { margin-bottom:24px; min-width:0; }
.settings-context { margin:0 0 8px; color:var(--settings-muted); font-size:12px; line-height:1.5; }
.admin-settings-header h1 { margin:0; color:var(--settings-ink); font-size:26px; line-height:1.25; font-weight:600; letter-spacing:-.025em; overflow-wrap:anywhere; }
.settings-description { margin:8px 0 0; color:var(--settings-muted); font-size:14px; line-height:1.6; }
.admin-mobile-section { display:flex; max-width:100%; min-height:44px; margin-top:20px; background:var(--settings-surface); border-color:var(--settings-border); color:var(--settings-ink); border-radius:6px; }
@media(min-width:1026px) { .admin-mobile-section { display:none!important; } }
@media(max-width:639px) { .admin-settings-header h1 { font-size:24px; } .settings-description { font-size:13px; } }
</style>
