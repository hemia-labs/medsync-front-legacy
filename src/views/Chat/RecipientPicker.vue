<template>
  <fieldset class="ms-chat-picker">
    <legend class="ms-chat-label">{{ legend }}</legend>
    <label class="ms-chat-search">
      <span class="ms-chat-sr">Buscar colega</span>
      <v-icon size="18" aria-hidden="true">mdi-magnify</v-icon>
      <input v-model="query" type="search" :placeholder="people.length > 6 ? 'Buscar por nombre' : 'Buscar'" autocomplete="off"
        :aria-controls="listId" @keydown.enter.prevent="pickSingle">
    </label>
    <p v-if="loading" class="ms-chat-muted" role="status">Cargando equipo…</p>
    <p v-else-if="error" class="ms-chat-error" role="alert">{{ error }} <button type="button" class="ms-chat-link" @click="$emit('retry')">Reintentar</button></p>
    <p v-else-if="!people.length" class="ms-chat-muted">No hay otros colegas activos en este consultorio.</p>
    <div v-else :id="listId" class="ms-chat-groups">
      <p v-if="!visible.length" class="ms-chat-muted" role="status">Nadie coincide con «{{ query }}».</p>
      <div v-for="group in groups" :key="group.key" class="ms-chat-group">
        <p class="ms-chat-group-title" :id="listId + '-' + group.key">{{ group.label }}</p>
        <div role="radiogroup" :aria-labelledby="listId + '-' + group.key">
          <label v-for="person in group.people" :key="person.id" class="ms-chat-person" :class="{ 'is-selected': value === person.id }">
            <input type="radio" :name="listId" :value="person.id" :checked="value === person.id" @change="$emit('input', person.id)">
            <span class="ms-chat-avatar" aria-hidden="true">{{ person.initials }}</span>
            <span class="ms-chat-person-name">{{ person.name }}</span>
          </label>
        </div>
      </div>
    </div>
  </fieldset>
</template>

<script>
let uid = 0;
const fold = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default {
  name: 'RecipientPicker',
  props: {
    people: { type: Array, default: () => [] },
    value: { type: String, default: '' },
    legend: { type: String, default: '¿A quién escribes?' },
    loading: Boolean,
    error: { type: String, default: '' }
  },
  data() { uid += 1; return { query: '', listId: 'ms-chat-picker-' + uid }; },
  computed: {
    visible() {
      const q = fold(this.query.trim());
      return q ? this.people.filter(person => fold(person.name).includes(q)) : this.people;
    },
    groups() {
      const frequent = this.visible.filter(person => person.frequent);
      const rest = this.visible.filter(person => !person.frequent);
      return [
        { key: 'frequent', label: 'Frecuentes', people: frequent },
        { key: 'team', label: frequent.length ? 'Resto del equipo' : 'Equipo', people: rest }
      ].filter(group => group.people.length);
    }
  },
  methods: {
    pickSingle() { if (this.visible.length === 1) this.$emit('input', this.visible[0].id); }
  }
};
</script>
