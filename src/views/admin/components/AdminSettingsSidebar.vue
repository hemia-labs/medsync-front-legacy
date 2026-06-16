<template>
    <aside class="admin-settings-sidebar">
        <div class="sticky top-24 bg-white border border-gray-200 shadow-md p-3">
            <button
                v-for="section in sections"
                :key="section.key"
                type="button"
                class="w-full text-left px-4 py-3 mb-2 border transition duration-150 ease-in-out"
                :class="activeSection === section.key ? 'bg-primary-100 border-primary-300 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'"
                @click="$emit('select', section.key)"
            >
                <div class="flex items-start gap-3">
                    <v-icon :color="activeSection === section.key ? 'var(--color-primary-900)' : '#6B7280'">{{ section.icon }}</v-icon>
                    <div class="min-w-0">
                        <p class="m-0 text-sm font-semibold" :class="activeSection === section.key ? 'text-primary-900' : 'text-gray-700'">{{ section.title }}</p>
                        <p class="m-0 mt-1 text-xs text-gray-500 leading-snug">{{ section.description }}</p>
                    </div>
                </div>
            </button>
        </div>
    </aside>
</template>

<script>
export default {
    props: {
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
.admin-settings-sidebar {
    display: none;
}

@media (min-width: 1026px) {
    .admin-settings-sidebar {
        display: block;
        grid-column: span 3 / span 3;
    }
}
</style>
