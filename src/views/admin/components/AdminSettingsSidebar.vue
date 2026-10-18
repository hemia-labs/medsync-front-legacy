<template>
    <aside class="admin-settings-sidebar">
        <nav class="admin-settings-nav bg-white border border-gray-200 shadow-md p-3" aria-label="Apartados de configuración">
          <div v-for="group in groups" :key="group.label">
            <p class="px-4 pt-3 pb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">{{ group.label }}</p>
            <button
                v-for="section in group.sections"
                :key="section.key"
                type="button"
                class="w-full text-left px-4 py-3 mb-2 border transition duration-150 ease-in-out"
                :class="activeSection === section.key ? 'bg-primary-100 border-primary-300 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'"
                :aria-current="activeSection === section.key ? 'page' : null"
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
        </nav>
    </aside>
</template>

<script>
export default {
    computed: {
        groups() {
            return this.sections.reduce((groups,section)=>{
                let group=groups.find(item=>item.label===section.scope)
                if(!group) {group={label:section.scope,sections:[]};groups.push(group)}
                group.sections.push(section)
                return groups
            },[])
        }
    },
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
        position: sticky;
        top: 5rem;
        min-width: 0;
    }
    .admin-settings-nav { max-height: max(15rem, calc(100vh - 19rem)); overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
}
.admin-settings-nav button:focus-visible { outline: 3px solid var(--color-primary-700); outline-offset: 2px; }
</style>
