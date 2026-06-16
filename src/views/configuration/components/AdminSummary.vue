<template>
    <section class="bg-white bg-opacity-95 border border-primary-200 shadow-xl">
        <div class="px-7 py-5 border-b border-primary-200 bg-primary-100">
            <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Resumen</p>
            <h2 class="m-0 text-gray-600 text-2xl font-normal">Resumen del consultorio</h2>
            <p class="m-0 mt-2 text-gray-500 text-sm">Revisa de un vistazo qué información del consultorio está lista.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-7">
            <article v-for="item in items" :key="item.label" class="bg-white border border-gray-200 shadow-md p-5">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="m-0 text-primary-900 text-xs font-bold tracking-widest uppercase">{{ item.label }}</p>
                        <h3 class="m-0 mt-2 text-gray-700 text-xl font-semibold">{{ item.value }}</h3>
                        <p class="m-0 mt-1 text-gray-500 text-sm">{{ item.detail }}</p>
                    </div>
                    <span class="h-3 w-3 rounded-full mt-2" :class="item.statusClass"></span>
                </div>
            </article>
        </div>
    </section>
</template>

<script>
export default {
    props: {
        items: {
            type: Array,
            default: () => []
        }
    }
}
</script>
