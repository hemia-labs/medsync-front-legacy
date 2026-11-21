<template>
  <v-autocomplete
    :value="value"
    :items="available"
    :label="label"
    :disabled="disabled"
    :item-text="item => item.display || item.name"
    item-value="id"
    @keydown.enter.native.prevent
    multiple
    return-object
    outlined
    dense
    hide-details
    no-data-text="Sin coincidencias"
    @input="$emit('input', $event.map(({ id, name }) => ({ id, name })))"
  >
    <template #item="{ item }">
      <div><small v-if="item.heading" class="plan-heading">{{ item.heading }}</small>{{ item.display || item.name }}</div>
    </template>
    <template #selection="{ index, item }">
      <span v-if="index === 0" class="summary">
        {{ value.length === 1 ? item.name : value.length + ' seleccionados' }}
      </span>
    </template>
  </v-autocomplete>
</template>

<script>
export default {
  props: {
    value: { type: Array, default: () => [] },
    items: { type: Array, required: true },
    label: { type: String, required: true },
    disabled: Boolean
  },
  computed: {
    available() {
      const ids = new Set(this.items.map(item => item.id))
      return this.items.concat(this.value.filter(item => !ids.has(item.id)))
    }
  }
}
</script>

<style scoped>
.plan-heading { display:block; font-weight:600; margin-top:.4rem }
.summary { max-width: 75%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>