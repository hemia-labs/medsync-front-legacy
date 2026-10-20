<template>
  <nav v-if="pagination" class="list-page-nav" :aria-label="label">
    <button type="button" :disabled="busy || pagination.page <= 1" @click="$emit('change', pagination.page - 1)">Anterior</button>
    <span aria-live="polite">Página {{ pagination.page }} de {{ pagination.totalPages }} · {{ pagination.total }} registros</span>
    <button type="button" :disabled="busy || pagination.page >= pagination.totalPages" @click="$emit('change', pagination.page + 1)">Siguiente</button>
  </nav>
</template>
<script>
export default {
  props: {
    pagination: { type: Object, default: null },
    busy: { type: Boolean, default: false },
    label: { type: String, default: 'Páginas del historial' }
  }
};
</script>
<style scoped>
.list-page-nav { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 12px; padding: 16px 0; }
.list-page-nav span { font-size: 13px; text-align: center; }
.list-page-nav button { min-height: 40px; padding: 8px 14px; border: 1px solid var(--color-primary-300, #94a3b8); border-radius: 8px; color: var(--color-primary-700, #334155); }
.list-page-nav button:disabled { opacity: .5; cursor: default; }
.list-page-nav button:focus-visible { outline: 2px solid var(--color-primary-600, #475569); outline-offset: 3px; }
</style>
