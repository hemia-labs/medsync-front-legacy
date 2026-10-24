<template>
    <section>
        <activation-welcome />
        <aside v-if="licenseDemoAvailable" class="mb-5 p-5 rounded-xl border border-primary-200 bg-white">
            <p class="m-0 font-semibold text-primary-900">Plan Profesional · Vista de prueba</p>
            <p class="mt-2 text-sm text-gray-600">Revisa el recorrido de activación sin cobros ni cambios en tu licencia.</p>
            <router-link to="/activar-cuenta/demo" class="inline-block mt-2 underline text-primary-900">Probar activación de Profesional</router-link>
        </aside>
        <preparation-checklist show-completed />
        <div class="bg-white bg-opacity-95 border border-primary-200 shadow-xl rounded-xl">
        <div class="px-7 py-5 border-b border-primary-200 bg-primary-100">
            <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Resumen</p>
            <h2 class="m-0 text-gray-600 text-2xl font-normal">Personalización opcional</h2>
            <p class="m-0 mt-2 text-gray-500 text-sm">Estos ajustes no bloquean la captura administrativa ni los borradores.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-7">
            <article v-for="item in items" :key="item.label" class="bg-white border border-gray-200 shadow-md p-5 rounded-lg">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">{{ item.label }}</p>
                        <h3 class="m-0 mt-2 text-gray-700 text-xl font-semibold">{{ item.value }}</h3>
                        <p class="m-0 mt-1 text-gray-500 text-sm">{{ item.detail }}</p>
                        <router-link :to="item.path" class="inline-block mt-3 text-primary-900 underline">Configurar {{ item.label.toLowerCase() }}</router-link>
                    </div>
                    <span class="h-3 w-3 rounded-full mt-2" :class="item.statusClass"></span>
                </div>
            </article>
        </div>
        </div>
    </section>
</template>

<script>
import PreparationChecklist from './PreparationChecklist.vue';
import ActivationWelcome from './ActivationWelcome.vue';
export default {
    components: { PreparationChecklist, ActivationWelcome },
    computed: { licenseDemoAvailable() {
        const business = this.$store.getters['CORE/AUTH/getBusiness'] || {};
        return process.env.NODE_ENV === 'development' && !business.registrationActivationConfirmed;
    } },
    props: {
        items: {
            type: Array,
            default: () => []
        }
    }
}
</script>
