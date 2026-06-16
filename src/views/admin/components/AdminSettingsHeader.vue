<template>
    <section class="bg-primary-100 border border-primary-200 shadow-md px-6 py-5 mb-5">
        <p class="m-0 mb-1 text-primary-900 text-xs font-bold tracking-widest uppercase">Ajustes del consultorio</p>
        <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div>
                <h2 class="m-0 text-gray-600 text-2xl font-normal">Configuracion del consultorio</h2>
                <p class="m-0 mt-2 text-gray-500 text-sm">Organiza usuarios, identidad, documentos, recetas, apariencia y agenda desde un solo lugar.</p>
            </div>
            <v-select
                :value="value"
                :items="sections"
                item-text="title"
                item-value="key"
                label="Apartado"
                dense
                outlined
                hide-details
                class="admin-mobile-section bg-white"
                color="var(--color-primary-700)"
                @change="$emit('change', $event)"
            ></v-select>
        </div>
    </section>
</template>

<script>
export default {
    props: {
        value: {
            type: String,
            default: 'summary'
        },
        sections: {
            type: Array,
            default: () => []
        }
    }
}
</script>

<style scoped>
.admin-mobile-section {
    display: block;
}

@media (min-width: 1026px) {
    .admin-mobile-section {
        display: none;
    }
}
</style>
