<template>
  <div class="help-center">
    <header class="help-header">
      <div class="help-heading">
        <v-icon aria-hidden="true" size="28">mdi-help-circle-outline</v-icon>
        <h1>Centro de ayuda</h1>
      </div>
      <p class="help-preview">En preparación · Vista previa</p>
    </header>

    <nav class="help-sections" aria-label="Secciones del Centro de ayuda">
      <router-link v-for="section in sections" :key="section.id"
        :to="{ name: 'helpCenter', query: { seccion: section.id } }"
        custom v-slot="{ href, navigate }">
        <a :href="href" @click="navigate" :aria-current="activeSection.id === section.id ? 'page' : null">{{ section.title }}</a>
      </router-link>
    </nav>

    <div class="help-layout">
      <nav class="help-topics" aria-label="Temas de ayuda">
        <p class="help-index-label">En esta sección</p>
        <ol>
          <li v-for="topic in topics" :key="topic.id">
            <router-link v-if="activeArticle" :to="{ name: 'helpCenter', query: { seccion: activeSection.id }, hash: '#' + topicAnchor(topic) }">{{ topic.title }}</router-link>
            <a v-else :href="'#' + topicAnchor(topic)" @click.prevent="goToTopic(topic)">{{ topic.title }}</a>
          </li>
        </ol>
      </nav>

      <article v-if="activeArticle" class="help-content help-article" aria-labelledby="help-article-title">
        <router-link class="help-back" :to="{ name: 'helpCenter', query: { seccion: 'guia' }, hash: '#guia-' + activeEntry.topic }">Volver al índice de la guía</router-link>
        <v-card outlined class="help-topic-card">
          <p class="help-preview">Borrador para revisión</p>
          <h2 id="help-article-title" tabindex="-1">{{ activeEntry.title }}</h2>
          <p class="help-article-summary">{{ activeArticle.summary }}</p>
          <section v-for="part in activeArticle.sections" :key="part.id" :aria-labelledby="'articulo-' + part.id">
            <h3 :id="'articulo-' + part.id">{{ part.title }}</h3>
            <ol v-if="part.steps">
              <li v-for="step in part.steps" :key="step">{{ step }}</li>
            </ol>
            <p v-for="paragraph in part.paragraphs" :key="paragraph">{{ paragraph }}</p>
            <ul v-if="part.items">
              <li v-for="item in part.items" :key="item">{{ item }}</li>
            </ul>
          </section>
        </v-card>
        <router-link class="help-back" :to="{ name: 'helpCenter', query: { seccion: 'guia' }, hash: '#guia-' + activeEntry.topic }">Volver al índice de la guía</router-link>
      </article>
      <section v-else class="help-content" :aria-labelledby="activeSection.id">
        <h2 :id="activeSection.id" tabindex="-1">{{ activeSection.title }}</h2>
        <v-card v-for="topic in topics" :key="topic.id" tag="section" outlined
          class="help-topic-card" :aria-labelledby="topicAnchor(topic)">
          <h3 :id="topicAnchor(topic)" tabindex="-1">{{ topic.title }}</h3>
          <ul class="help-entry-list">
            <li v-for="entry in entriesFor(topic)" :key="entry.id" :data-help-id="entry.id">
              <router-link v-if="articles[entry.id]" :to="{ name: 'helpCenter', query: { seccion: 'guia', articulo: entry.id } }">{{ entry.title }}</router-link>
              <span v-else>{{ entry.title }}</span>
            </li>
          </ul>
        </v-card>
        <a class="help-back" :href="'#' + activeSection.id" @click.prevent="goToStart">Volver al inicio de la sección</a>
      </section>
    </div>
  </div>
</template>

<script>
import { helpSections, helpTopics, helpEntries } from '../../domain/help/helpIndex';
import { helpArticles } from '../../domain/help/helpArticles';

export default {
  name: 'HelpCenter',
  data: () => ({ sections: helpSections, topics: helpTopics, articles: helpArticles }),
  computed: {
    activeSection() {
      return this.sections.find(section => section.id === this.$route.query.seccion) || this.sections[0];
    },
    activeEntry() {
      return this.activeSection.id === 'guia' && helpEntries.find(entry => entry.type === 'guide' && entry.id === this.$route.query.articulo);
    },
    activeArticle() {
      return this.activeEntry && this.articles[this.activeEntry.id];
    }
  },
  watch: {
    '$route.fullPath'() { this.$nextTick(this.focusDestination); }
  },
  mounted() {
    if (this.$route.hash || this.activeArticle) this.$nextTick(this.focusDestination);
  },
  methods: {
    entriesFor(topic) {
      return helpEntries.filter(entry => entry.section === this.activeSection.id && entry.topic === topic.id)
        .sort((left, right) => left.order - right.order);
    },
    topicAnchor(topic) { return `${this.activeSection.id}-${topic.id}`; },
    async goToTopic(topic) { await this.navigateToAnchor(this.topicAnchor(topic)); },
    async goToStart() { await this.navigateToAnchor(this.activeSection.id); },
    async navigateToAnchor(id) {
      const hash = `#${id}`;
      if (this.$route.hash !== hash || this.$route.query.articulo) {
        try { await this.$router.push({ name: 'helpCenter', query: { seccion: this.activeSection.id }, hash }); }
        catch (error) { if (error.name !== 'NavigationDuplicated') throw error; }
      }
      this.$nextTick(this.focusDestination);
    },
    focusDestination() {
      const id = this.$route.hash.slice(1);
      const target = Array.from(this.$el.querySelectorAll('[id]')).find(element => element.id === id)
        || this.$el.querySelector('h2');
      if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start' }); }
    }
  }
};
</script>

<style scoped>
.help-center { max-width: 1180px; margin: 0 auto; padding: 24px; color: #12313a; }
.help-heading { display: flex; align-items: center; gap: 12px; }
.help-heading .v-icon { color: #0f766e; }
.help-center h1 { font-size: 1.8rem; line-height: 1.25; font-weight: 700; margin: 0; }
.help-preview { margin: 12px 0 24px; color: #475569; font-size: .9rem; }
.help-sections { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 24px; }
.help-sections a { display: flex; align-items: center; min-height: 48px; padding: 10px 20px; border: 2px solid #cbd5e1; border-radius: 12px; background: #fff; color: #334155; text-decoration: none; }
.help-sections a[aria-current] { border-color: #0f766e; background: #e6f4f1; color: #0f766e; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }
.help-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 32px; align-items: start; }
.help-topics { position: sticky; top: 96px; }
.help-index-label { font-weight: 700; margin: 0 0 8px; }
.help-topics ol { list-style: none; padding: 0; margin: 0; }
.help-topics a { display: flex; align-items: center; min-height: 44px; padding: 10px 0; color: #334155; text-decoration: underline; text-underline-offset: 3px; line-height: 1.5; }
.help-center h2 { font-size: 1.4rem; font-weight: 700; margin: 0 0 20px; }
.help-center h3 { font-size: 1.1rem; font-weight: 700; line-height: 1.5; margin: 0 0 8px; color: #12313a; }
.help-topic-card { padding: 24px; margin-bottom: 16px; border-radius: 16px; border-color: #dbe5ea; }
.help-entry-list { padding-left: 20px; margin: 0; color: #334155; }
.help-entry-list li { padding: 8px 0 8px 4px; line-height: 1.6; overflow-wrap: anywhere; }
.help-entry-list a { display: inline-flex; align-items: center; min-height: 44px; color: #0f766e; text-decoration: underline; text-underline-offset: 3px; }
.help-article { min-width: 0; }
.help-article .help-topic-card { margin-top: 16px; color: inherit; }
.help-article p, .help-article li { line-height: 1.75; overflow-wrap: anywhere; }
.help-article p { margin: 0 0 16px; }
.help-article section { margin-top: 28px; }
.help-article ul, .help-article ol { padding-left: 24px; margin-bottom: 16px; }
.help-article li { padding: 6px 0 6px 4px; }
.help-article-summary { font-size: 1.05rem; }
.help-back { display: inline-flex; align-items: center; min-height: 44px; color: #0f766e; text-decoration: underline; scroll-margin-block: 100px 140px; }
.help-article { padding-bottom: 140px; }
.help-center a:focus, .help-center [tabindex]:focus { outline: 3px solid #0f766e; outline-offset: 4px; border-radius: 4px; }
.help-center [id] { scroll-margin-top: 100px; }
html[data-theme="clinical-night"] .help-center, html[data-theme="clinical-night"] .help-center h3 { color: #e5e7eb; }
html[data-theme="clinical-night"] .help-preview, html[data-theme="clinical-night"] .help-entry-list,
html[data-theme="clinical-night"] .help-topics a { color: #cbd5e1; }
html[data-theme="clinical-night"] .help-sections a { color: #e5e7eb; background: #1e293b; border-color: #64748b; }
html[data-theme="clinical-night"] .help-sections a[aria-current] { color: #5eead4; border-color: #5eead4; background: #123b3b; }
html[data-theme="clinical-night"] .help-topic-card { background: #1e293b; border-color: #64748b; }
html[data-theme="clinical-night"] .help-back, html[data-theme="clinical-night"] .help-entry-list a, html[data-theme="clinical-night"] .help-heading .v-icon { color: #5eead4; }
html[data-theme="clinical-night"] .help-center a:focus, html[data-theme="clinical-night"] .help-center [tabindex]:focus { outline-color: #5eead4; }
@media (max-width: 1100px) {
  .help-layout { grid-template-columns: 1fr; gap: 24px; }
  .help-topics { position: static; }
  .help-topics ol { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; }
}
@media (max-width: 600px) {
  .help-center { padding: 20px 12px; }
  .help-center h1 { font-size: 1.5rem; }
  .help-sections { gap: 8px; }
  .help-sections a { padding: 10px 12px; }
  .help-topics ol { grid-template-columns: 1fr; }
  .help-topic-card { padding: 20px 16px; }
}
</style>
