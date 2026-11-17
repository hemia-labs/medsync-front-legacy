<template>
    <div class="admin-settings-sidebar">
        <v-navigation-drawer
            class="admin-settings-drawer"
            ref="drawer"
            id="admin-settings-navigation"
            :value="!isMobile || value"
            :permanent="!isMobile"
            :temporary="isMobile"
            :role="isMobile ? 'dialog' : null"
            :aria-modal="isMobile && value ? 'true' : null"
            :inert="isMobile && !value ? '' : null"
            :aria-hidden="isMobile && !value ? 'true' : null"
            aria-label="Apartados de configuración"
            tabindex="-1"
            fixed touchless
            @input="isMobile && $emit('input', $event)"
            disable-resize-watcher disable-route-watcher
            :width="isMobile ? 296 : 'var(--settings-sidebar-width)'"
            :height="isMobile ? '100%' : 'calc(100% - var(--settings-header-height))'"
            :style="{ top: isMobile ? '0' : 'var(--settings-header-height)' }"
        >
            <nav class="admin-settings-nav" aria-label="Apartados de configuración">
                <div class="settings-nav-heading">
                    <h2>Configuración</h2>
                    <v-btn v-if="isMobile" icon aria-label="Cerrar apartados de configuración" @click="$emit('input', false)">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </div>
                <div v-for="group in groups" :key="group.label" class="settings-nav-group">
                    <p class="settings-group-label">{{ group.label }}</p>
                    <button v-for="section in group.sections" :key="section.key" type="button"
                        class="settings-nav-item" :aria-current="activeSection === section.key ? 'page' : null"
                        :title="section.description" @click="selectSection(section.key)">
                        <v-icon size="18" color="inherit" aria-hidden="true">{{ section.icon }}</v-icon>
                        <span>{{ section.title }}</span>
                    </button>
                </div>
            </nav>
        </v-navigation-drawer>
    </div>
</template>

<script>
import { containNavigationFocus } from '../../../utils/mobileNavigationFocus';
export default {
    beforeDestroy() {
        if(this.releaseFocus) this.releaseFocus()
    },
    methods: {
        selectSection(section) {
            if(this.isMobile) this.$emit('input', false)
            this.$emit('select', section)
        }
    },
    watch: {
        isMobile() { this.$emit('input', false) },
        value(open) {
            if(this.releaseFocus) { this.releaseFocus(); this.releaseFocus = null }
            if(open) this.trigger = document.querySelector('button[aria-controls="admin-settings-navigation"]')
            this.$nextTick(() => {
                if(this._isDestroyed) return
                if(open && this.value && this.isMobile) {
                    this.releaseFocus = containNavigationFocus(this.$refs.drawer.$el, () => this.$emit('input', false))
                } else if(!open && !this.value && this.trigger && this.trigger.isConnected && this.trigger.getClientRects().length) {
                    this.trigger.focus()
                }
            })
        }
    },
    computed: {
        isMobile() { return this.$vuetify.breakpoint.width < 1026 },
        groups() {
            return this.sections.reduce((groups,section)=>{
                let group=groups.find(item=>item.label===section.scope)
                if(!group) {group={label:section.scope,sections:[]};groups.push(group)}
                group.sections.push(section)
                return groups
            },[]).sort((a,b)=>['Consultorio','Configuración clínica','Mi cuenta'].indexOf(a.label)-['Consultorio','Configuración clínica','Mi cuenta'].indexOf(b.label))
        }
    },
    props: {
        value: Boolean,
        sections: {
            type: Array,
            default: () => []
        },
        activeSection: {
            type: String,
            default: 'summary'
        }
    }
}
</script>

<style scoped>
.admin-settings-sidebar { display:contents; min-width:0; }
.admin-settings-drawer.v-navigation-drawer { background:var(--settings-background); max-width:calc(100vw - 32px); z-index:200; }
.admin-settings-nav { padding:18px 16px 24px; }
.settings-nav-heading { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
.admin-settings-drawer ::v-deep .v-navigation-drawer__border { background-color:var(--settings-border); }
.admin-settings-drawer ::v-deep .v-navigation-drawer__content { overscroll-behavior:contain; scrollbar-gutter:stable; }
.admin-settings-nav h2 { margin:0 10px; color:var(--settings-ink); font-size:15px; font-weight:600; line-height:1.5; }
.settings-nav-group + .settings-nav-group { margin-top:22px; }
.settings-group-label { margin:0 10px 7px; color:var(--settings-muted); font-size:11px; font-weight:600; line-height:1.5; }
.settings-nav-item { display:flex; align-items:center; gap:9px; width:100%; min-height:44px; padding:8px 10px; border:0; border-radius:6px; background:transparent; color:var(--settings-muted); text-align:left; font-size:13px; line-height:1.4; }
.settings-nav-item span { min-width:0; overflow-wrap:anywhere; }
.settings-nav-item .v-icon { flex-shrink:0; color:inherit; }
.settings-nav-item:hover { background:var(--settings-soft); color:var(--settings-ink); }
.settings-nav-item[aria-current="page"] { background:var(--settings-selected); color:var(--settings-ink); font-weight:600; }
.settings-nav-item:focus-visible { outline:3px solid var(--color-primary-700); outline-offset:2px; }
@media(min-width:1026px) {
    .admin-settings-sidebar { display:block; }
    .admin-settings-drawer.v-navigation-drawer {
        inset-inline-start:calc(var(--tenant-sidebar-width, 4.5rem) + var(--settings-sidebar-inset));
        background:var(--settings-background);
        z-index:20;
        transition:inset-inline-start var(--tenant-sidebar-duration) var(--tenant-sidebar-easing), transform var(--tenant-sidebar-duration) var(--tenant-sidebar-easing);
    }
    .admin-settings-nav { padding:28px 16px 20px 0; }
}
</style>
