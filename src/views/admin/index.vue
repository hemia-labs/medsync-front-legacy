<template>
    <div class="admin-page-shell mx-auto px-5 py-5">
        <admin-settings-header
            :value="mobileSection"
            :administrator="administrator"
            :sections="availableSections"
            @change="goToSection"
        ></admin-settings-header>

        <v-alert v-if="deniedSection" type="warning" dense text role="alert">No tienes acceso a ese apartado. Se muestran los ajustes que tienes autorizados.</v-alert>
        <div v-if="availableSections.length" class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <admin-settings-sidebar
                :sections="availableSections"
                :active-section="activeSection"
                @select="goToSection"
            ></admin-settings-sidebar>

            <main class="lg:col-span-9 min-w-0">
                <da-user-index v-if="activeSection === 'users'"></da-user-index>
                <da-config-index v-else :active-section="activeSection"></da-config-index>
            </main>
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { getSettingsSections, isTenantAdministrator } from '../../security/settingsAccess';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import AdminSettingsHeader from './components/AdminSettingsHeader.vue';
import AdminSettingsSidebar from './components/AdminSettingsSidebar.vue';

export default {
    components: {
        'da-user-index': () => import('../User/DAUser.vue'),
        'da-config-index': () => import('../configuration/index.vue'),
        AdminSettingsHeader,
        AdminSettingsSidebar
    },
    data: function() {
        return {
            mobileSection: 'summary',
        }
    },
    computed: {
        ...mapGetters(moduleTypes.AUTH, {
            hasPermission: fnTypes.hasPermission,
            role: fnTypes.getRole
        }),
        administrator() { return isTenantAdministrator(this.role) },
        availableSections() { return getSettingsSections(this.role, this.hasPermission) },
        deniedSection() { return Boolean(this.$route.query.section && !this.availableSections.some(section=>section.key===this.$route.query.section)) },
        activeSection: function() {
            const requested = this.$route.query.section || 'summary'
            const exists = this.availableSections.some((section) => section.key === requested)
            return exists ? requested : (this.availableSections[0] || {}).key || ''
        }
    },
    created() {
        this.mobileSection = this.activeSection
    },
    methods: {
        goToSection: function(section) {
            if(section === this.activeSection) {
                return
            }

            this.$router.push({
                path: '/admin',
                query: { section }
            })
        }
    },
    watch: {
        activeSection: function(value) {
            this.mobileSection = value
        }
    }
}
</script>

<style scoped>
.admin-page-shell {
    width: 100%;
    max-width: 96rem;
}
</style>
