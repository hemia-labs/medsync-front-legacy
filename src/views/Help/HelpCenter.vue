<template>
  <div class="help-center">
    <header class="help-hero">
      <div class="help-hero-text">
        <div class="help-heading">
          <span class="help-hero-icon"><v-icon aria-hidden="true" size="30">mdi-lifebuoy</v-icon></span>
          <div>
            <h1>Centro de ayuda</h1>
            <p class="help-hero-lead">Guías paso a paso y respuestas para trabajar en MedSync.</p>
          </div>
        </div>
      </div>
      <form class="help-search" role="search" @submit.prevent>
        <label for="help-search-input" class="help-search-label">Buscar en la ayuda</label>
        <div class="help-search-field">
          <v-icon aria-hidden="true" class="help-search-icon">mdi-magnify</v-icon>
          <input id="help-search-input" v-model="query" type="search" autocomplete="off"
            placeholder="Por ejemplo: emitir receta, reprogramar cita" aria-describedby="help-search-status">
          <button v-if="query" type="button" class="help-search-clear" aria-label="Borrar búsqueda" @click="clearSearch">
            <v-icon aria-hidden="true" size="20">mdi-close</v-icon>
          </button>
        </div>
        <p id="help-search-status" class="help-search-status" role="status">{{ searchStatus }}</p>
      </form>
    </header>

    <nav class="help-sections" aria-label="Secciones del Centro de ayuda">
      <router-link v-for="section in sections" :key="section.id"
        :to="{ name: 'helpCenter', query: { seccion: section.id } }"
        custom v-slot="{ href, navigate }">
        <a :href="href" @click="navigate" :aria-current="activeSection.id === section.id ? 'page' : null">
          <v-icon aria-hidden="true" size="20">{{ section.id === 'guia' ? 'mdi-book-open-page-variant-outline' : 'mdi-forum-outline' }}</v-icon>
          {{ section.title }}
        </a>
      </router-link>
    </nav>

    <section v-if="isSearching" class="help-results" aria-labelledby="help-results-title">
      <h2 id="help-results-title">Resultados de búsqueda</h2>
      <ul v-if="searchResults.length" class="help-result-list">
        <li v-for="result in searchResults" :key="result.entry.id" class="help-row">
          <span class="help-result-meta">
            <span class="help-kind">{{ result.entry.type === 'guide' ? 'Guía' : 'Pregunta frecuente' }}</span>
            {{ result.topic.title }}
          </span>
          <router-link class="help-row-link" :to="resultLink(result.entry)">{{ result.entry.title }}</router-link>
          <span class="help-row-summary">{{ result.snippet }}</span>
        </li>
      </ul>
      <div v-else class="help-empty">
        <p>No encontramos una guía o pregunta con esas palabras.</p>
        <p>Prueba con el nombre de la tarea o de la pantalla, por ejemplo: receta, cita, paciente o contraseña.</p>
      </div>
    </section>

    <div v-else class="help-layout" :class="{ 'is-article': activeArticle }">
      <nav class="help-topics" aria-label="Temas de ayuda">
        <p class="help-index-label">{{ activeArticle ? 'Temas de la guía' : 'En esta sección' }}</p>
        <ol>
          <li v-for="topic in topics" :key="topic.id">
            <router-link v-if="activeArticle" :to="{ name: 'helpCenter', query: { seccion: activeSection.id }, hash: '#' + topicAnchor(topic) }"
              :class="{ 'is-active': activeEntry.topic === topic.id }" :aria-current="activeEntry.topic === topic.id ? 'location' : null">
              <v-icon aria-hidden="true" size="18">{{ topic.icon }}</v-icon><span>{{ topic.title }}</span>
            </router-link>
            <a v-else :href="'#' + topicAnchor(topic)" @click.prevent="goToTopic(topic)">
              <v-icon aria-hidden="true" size="18">{{ topic.icon }}</v-icon><span>{{ topic.title }}</span>
            </a>
          </li>
        </ol>
      </nav>

      <article v-if="activeArticle" class="help-content help-article" aria-labelledby="help-article-title">
        <nav class="help-breadcrumb" aria-label="Ruta de navegación">
          <ol>
            <li><router-link :to="{ name: 'helpCenter', query: { seccion: 'guia' } }">Guía de uso</router-link></li>
            <li><router-link :to="{ name: 'helpCenter', query: { seccion: 'guia' }, hash: '#guia-' + activeEntry.topic }">{{ activeTopic.title }}</router-link></li>
            <li aria-current="page">{{ activeEntry.title }}</li>
          </ol>
        </nav>
        <v-card outlined class="help-topic-card help-article-card">
          <p class="help-preview">Borrador para revisión</p>
          <h2 id="help-article-title" tabindex="-1">{{ activeEntry.title }}</h2>
          <p class="help-article-summary"><help-text :text="activeArticle.summary" /></p>

          <dl class="help-facts">
            <div v-if="activeFlowScreen">
              <dt><v-icon aria-hidden="true" size="18">mdi-map-marker-outline</v-icon>Dónde se hace</dt>
              <dd><span class="help-ui">{{ activeFlowScreen }}</span></dd>
            </div>
            <div v-if="prerequisites.length">
              <dt><v-icon aria-hidden="true" size="18">mdi-clipboard-check-outline</v-icon>Antes de empezar</dt>
              <dd>
                <ul>
                  <li v-for="item in prerequisites" :key="item.id">
                    <router-link :to="{ name: 'helpCenter', query: { seccion: 'guia', articulo: item.id } }">{{ item.title }}</router-link>
                  </li>
                </ul>
              </dd>
            </div>
          </dl>

          <nav v-if="activeArticle.sections.length > 2" class="help-toc" aria-label="En esta guía">
            <p class="help-toc-label">En esta guía</p>
            <ol>
              <li v-for="part in activeArticle.sections" :key="part.id">
                <router-link :to="{ name: 'helpCenter', query: { seccion: 'guia', articulo: activeEntry.id }, hash: '#articulo-' + part.id }">{{ part.title }}</router-link>
              </li>
            </ol>
          </nav>

          <section v-for="part in articleParts" :key="part.id" :aria-labelledby="'articulo-' + part.id">
            <h3 :id="'articulo-' + part.id" tabindex="-1">{{ part.title }}</h3>
            <template v-for="(block, index) in part.blocks">
              <div v-if="block.type === 'text'" :key="index">
                <p v-for="paragraph in block.entries" :key="paragraph"><help-text :text="paragraph" /></p>
              </div>
              <ol v-else-if="block.type === 'steps'" :key="index" class="help-steps" role="list">
                <li v-for="step in block.entries" :key="step"><help-text :text="step" /></li>
              </ol>
              <ul v-else-if="block.type === 'items'" :key="index" class="help-items">
                <li v-for="item in block.entries" :key="item"><help-text :text="item" /></li>
              </ul>
              <div v-else :key="index" class="help-notes">
                <div v-if="block.tips.length" class="help-note" role="note">
                  <p class="help-note-title"><v-icon aria-hidden="true" size="18">mdi-information-outline</v-icon>Ten en cuenta</p>
                  <p v-for="paragraph in block.tips" :key="paragraph"><help-text :text="paragraph" /></p>
                </div>
                <div v-if="block.problems.length" class="help-note is-problem" role="note">
                  <p class="help-note-title"><v-icon aria-hidden="true" size="18">mdi-alert-circle-outline</v-icon>Si algo falla</p>
                  <p v-for="paragraph in block.problems" :key="paragraph"><help-text :text="paragraph" /></p>
                </div>
              </div>
            </template>
          </section>
        </v-card>

        <section class="help-next" aria-labelledby="help-next-title">
          <h3 id="help-next-title"><v-icon aria-hidden="true" size="20">mdi-message-question-outline</v-icon>¿Sigues con dudas?</h3>
          <ul v-if="relatedQuestions.length">
            <li v-for="question in relatedQuestions" :key="question.id">
              <router-link :to="resultLink(question)">{{ question.title }}</router-link>
            </li>
          </ul>
          <p>Si no encuentras la respuesta, pide ayuda a quien administra tu consultorio. Si eres titular, usa el canal por el que contrataste MedSync e indica la pantalla y la acción que necesitas realizar.</p>
        </section>
        <router-link class="help-back" :to="{ name: 'helpCenter', query: { seccion: 'guia' }, hash: '#guia-' + activeEntry.topic }">Volver al índice de la guía</router-link>
      </article>

      <section v-else class="help-content" :aria-labelledby="activeSection.id">
        <h2 :id="activeSection.id" tabindex="-1">{{ activeSection.title }}</h2>
        <p class="help-section-intro">{{ sectionIntro }}</p>
        <v-card v-for="topic in topics" :key="topic.id" tag="section" outlined
          class="help-topic-card" :aria-labelledby="topicAnchor(topic)">
          <div class="help-topic-header">
            <span class="help-topic-icon"><v-icon aria-hidden="true" size="22">{{ topic.icon }}</v-icon></span>
            <h3 :id="topicAnchor(topic)" tabindex="-1">{{ topic.title }}</h3>
            <span class="help-topic-count">{{ countLabel(topic) }}</span>
          </div>
          <ul class="help-entry-list">
            <li v-for="entry in entriesFor(topic)" :key="entry.id" :data-help-id="entry.id"
              :class="{ 'help-row': !answers[entry.id] && articles[entry.id] }">
              <details v-if="answers[entry.id]" class="help-answer" :open="!!openQuestions[entry.id]" @toggle="onToggle(entry.id, $event)">
                <summary :id="'pregunta-' + entry.id">
                  <span>{{ entry.title }}</span>
                  <v-icon aria-hidden="true" class="help-answer-chevron">mdi-chevron-down</v-icon>
                </summary>
                <div class="help-answer-body">
                  <p v-for="paragraph in answers[entry.id]" :key="paragraph"><help-text :text="paragraph" /></p>
                  <router-link :to="{ name: 'helpCenter', query: { seccion: 'guia', articulo: entry.relatedArticle } }">Ver guía: {{ relatedTitle(entry) }}</router-link>
                </div>
              </details>
              <template v-else-if="articles[entry.id]">
                <router-link class="help-row-link" :to="{ name: 'helpCenter', query: { seccion: 'guia', articulo: entry.id } }">{{ entry.title }}</router-link>
                <span class="help-row-summary">{{ plain(articles[entry.id].summary) }}</span>
                <v-icon aria-hidden="true" class="help-row-chevron">mdi-chevron-right</v-icon>
              </template>
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
import { helpSections, helpTopics, helpEntries, helpFlows } from '../../domain/help/helpIndex';
import { helpArticles } from '../../domain/help/helpArticles';
import { helpAnswers } from '../../domain/help/helpAnswers';
import { textSegments, plainText, sectionBlocks } from '../../domain/help/helpText';
import { buildHelpIndex, searchHelp } from '../../domain/help/helpSearch';

// Interface labels («…») render as chips; everything else stays plain text (no v-html).
const HelpText = {
  name: 'HelpText',
  functional: true,
  props: { text: { type: String, required: true } },
  render(h, { props }) {
    return h('span', textSegments(props.text).map(part => (part.label ? h('span', { staticClass: 'help-ui' }, part.text) : part.text)));
  }
};

const searchIndex = buildHelpIndex({ entries: helpEntries, articles: helpArticles, answers: helpAnswers, topics: helpTopics });

export default {
  name: 'HelpCenter',
  components: { HelpText },
  data: () => ({ sections: helpSections, topics: helpTopics, articles: helpArticles, answers: helpAnswers, query: '', openQuestions: {} }),
  computed: {
    activeSection() {
      return this.sections.find(section => section.id === this.$route.query.seccion) || this.sections[0];
    },
    activeEntry() {
      return this.activeSection.id === 'guia' && helpEntries.find(entry => entry.type === 'guide' && entry.id === this.$route.query.articulo);
    },
    activeArticle() {
      return this.activeEntry && this.articles[this.activeEntry.id];
    },
    activeTopic() {
      return this.activeEntry && this.topics.find(topic => topic.id === this.activeEntry.topic);
    },
    activeFlowScreen() {
      const flow = this.activeEntry && helpFlows[this.activeEntry.flow];
      return flow ? flow.screen.replace(/ > /g, ' → ') : '';
    },
    prerequisites() {
      return (this.activeEntry && this.activeEntry.prerequisites || [])
        .map(id => helpEntries.find(entry => entry.id === id)).filter(entry => entry && this.articles[entry.id]);
    },
    relatedQuestions() {
      return this.activeEntry ? helpEntries.filter(entry => entry.type === 'question' && entry.relatedArticle === this.activeEntry.id) : [];
    },
    articleParts() {
      return this.activeArticle ? this.activeArticle.sections.map(part => ({ id: part.id, title: part.title, blocks: sectionBlocks(part) })) : [];
    },
    sectionIntro() {
      return this.activeSection.id === 'guia'
        ? 'Instrucciones paso a paso, ordenadas como suele avanzar el trabajo en el consultorio.'
        : 'Respuestas breves sobre estados, permisos y resultados que no salen como esperabas. Abre una pregunta para ver su respuesta.';
    },
    isSearching() {
      return this.query.trim().length > 1;
    },
    searchResults() {
      return this.isSearching ? searchHelp(searchIndex, this.query) : [];
    },
    searchStatus() {
      if (!this.isSearching) return '';
      const total = this.searchResults.length;
      return total ? `${total} ${total === 1 ? 'resultado' : 'resultados'}` : 'Sin resultados';
    }
  },
  watch: {
    '$route.fullPath'() {
      this.query = '';
      this.$nextTick(this.focusDestination);
    }
  },
  mounted() {
    if (this.$route.hash || this.activeArticle) this.$nextTick(this.focusDestination);
  },
  methods: {
    plain: plainText,
    relatedTitle(entry) { return helpEntries.find(item => item.id === entry.relatedArticle).title; },
    entriesFor(topic) {
      return helpEntries.filter(entry => entry.section === this.activeSection.id && entry.topic === topic.id)
        .sort((left, right) => left.order - right.order);
    },
    countLabel(topic) {
      const total = this.entriesFor(topic).length;
      if (this.activeSection.id === 'guia') return `${total} ${total === 1 ? 'guía' : 'guías'}`;
      return `${total} ${total === 1 ? 'pregunta' : 'preguntas'}`;
    },
    resultLink(entry) {
      return entry.type === 'guide'
        ? { name: 'helpCenter', query: { seccion: 'guia', articulo: entry.id } }
        : { name: 'helpCenter', query: { seccion: 'preguntas' }, hash: '#pregunta-' + entry.id };
    },
    clearSearch() {
      this.query = '';
      this.$nextTick(() => this.$el.querySelector('#help-search-input').focus());
    },
    onToggle(id, event) { this.$set(this.openQuestions, id, event.target.open); },
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
      if (id.startsWith('pregunta-')) this.$set(this.openQuestions, id.slice('pregunta-'.length), true);
      this.$nextTick(() => {
        const target = Array.from(this.$el.querySelectorAll('[id]')).find(element => element.id === id)
          || this.$el.querySelector('.help-content h2');
        if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start' }); }
      });
    }
  }
};
</script>

<style scoped>
.help-center { max-width: 1180px; margin: 0 auto; padding: 24px; color: #12313a; }

/* Hero and search */
.help-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 440px); gap: 24px 40px; align-items: center;
  padding: 28px 32px; margin-bottom: 24px; border: 1px solid #d5e7e3; border-radius: 20px;
  background: linear-gradient(135deg, #e6f4f1 0%, #f4faf9 55%, #ffffff 100%); }
.help-heading { display: flex; align-items: center; gap: 16px; }
.help-hero-icon { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 56px; height: 56px;
  border-radius: 16px; background: #0f766e; }
.help-hero-icon .v-icon { color: #fff; }
.help-center h1 { font-size: 1.8rem; line-height: 1.25; font-weight: 600; margin: 0; }
.help-hero-lead { margin: 4px 0 0; color: #334155; font-size: 1.02rem; line-height: 1.5; }
.help-preview { display: inline-block; margin: 16px 0 0; padding: 2px 10px; border: 1px solid #cbd5e1; border-radius: 999px;
  background: rgba(255, 255, 255, .7); color: #475569; font-size: .8rem; }
.help-search-label { display: block; font-weight: 600; margin-bottom: 8px; }
.help-search-field { position: relative; display: flex; align-items: center; }
.help-search-icon { position: absolute; left: 14px; color: #64748b; pointer-events: none; }
.help-search input { width: 100%; min-height: 52px; padding: 12px 48px 12px 46px; border: 2px solid #cbd5e1; border-radius: 14px;
  background: #fff; color: #12313a; font-size: 1rem; box-shadow: 0 1px 2px rgba(15, 23, 42, .06); }
.help-search input::placeholder { color: #64748b; }
.help-search input:focus { outline: 3px solid #0f766e; outline-offset: 2px; border-color: #0f766e; }
.help-search input::-webkit-search-cancel-button { display: none; }
.help-search-clear { position: absolute; right: 4px; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px;
  border-radius: 10px; color: #475569; }
.help-search-clear:hover { background: #f1f5f9; }
.help-search-clear:focus { outline: 3px solid #0f766e; outline-offset: 0; }
.help-search-status { min-height: 1.4em; margin: 6px 0 0; color: #475569; font-size: .9rem; }

/* Section switch */
.help-sections { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 24px; }
.help-sections a { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 10px 20px; border: 2px solid #cbd5e1; border-radius: 12px; background: #fff; color: #334155; text-decoration: none; }
.help-sections a .v-icon { color: inherit; }
.help-sections a:hover { border-color: #94a3b8; }
.help-sections a[aria-current] { border-color: #0f766e; background: #e6f4f1; color: #0f766e; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; }

/* Layout and topic index */
.help-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 32px; align-items: start; }
.help-topics { position: sticky; top: 96px; }
.help-index-label { font-weight: 600; margin: 0 0 8px; }
.help-topics ol { list-style: none; padding: 0; margin: 0; }
.help-topics a { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 8px 10px; border-left: 3px solid transparent;
  border-radius: 0 8px 8px 0; color: #334155; text-decoration: underline; text-underline-offset: 3px; line-height: 1.4; }
.help-topics a .v-icon { color: #0f766e; flex: none; }
.help-topics a:hover { background: #f1f5f9; }
.help-topics a.is-active { border-left-color: #0f766e; background: #e6f4f1; color: #0f3d44; font-weight: 600; }
.help-center h2 { font-size: 1.4rem; font-weight: 600; margin: 0 0 8px; }
.help-center h3 { font-size: 1.1rem; font-weight: 600; line-height: 1.5; margin: 0 0 8px; color: #12313a; }
.help-section-intro { margin: 0 0 20px; color: #475569; line-height: 1.6; }

.help-topic-card { padding: 24px; margin-bottom: 16px; border-radius: 16px; border-color: #dbe5ea; }
.help-topic-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.help-topic-header h3 { margin: 0; flex: 1; }
.help-topic-icon { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 40px; height: 40px; border-radius: 12px; background: #e6f4f1; }
.help-topic-icon .v-icon { color: #0f766e; }
.help-topic-count { flex: none; padding: 2px 10px; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: .85rem; }
.help-entry-list { list-style: none; padding: 0; margin: 0; color: #334155; }
.help-entry-list > li { border-top: 1px solid #edf2f4; overflow-wrap: anywhere; }
.help-entry-list > li:first-child { border-top: 0; }

/* Clickable rows: the link stretches over the row; its name stays the title */
.help-row { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; padding: 12px 12px 12px 4px; border-radius: 10px; }
.help-row:hover { background: #f4faf9; }
.help-row:focus-within { outline: 3px solid #0f766e; outline-offset: 2px; }
.help-row-link { grid-column: 1; display: inline-flex; align-items: center; min-height: 32px; color: #0f766e; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; line-height: 1.45; }
.help-row-link::after { content: ''; position: absolute; inset: 0; border-radius: 10px; }
.help-center .help-row-link:focus { outline: none; }
.help-row-summary { grid-column: 1; color: #475569; font-size: .92rem; line-height: 1.55; }
.help-row-chevron { grid-column: 2; grid-row: 1 / span 2; align-self: center; color: #94a3b8; }

/* FAQ accordion */
.help-answer summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 10px 4px;
  cursor: pointer; list-style: none; font-weight: 600; line-height: 1.5; color: #12313a; border-radius: 8px; }
.help-answer summary::-webkit-details-marker { display: none; }
.help-answer summary:hover { color: #0f766e; }
.help-answer-chevron { flex: none; color: #0f766e; transition: transform .15s ease; }
.help-answer[open] .help-answer-chevron { transform: rotate(180deg); }
.help-answer-body { padding: 0 4px 16px; }
.help-answer-body p { line-height: 1.75; margin-bottom: 12px; }
.help-answer-body a { display: inline-flex; align-items: center; min-height: 44px; color: #0f766e; text-decoration: underline; text-underline-offset: 3px; font-weight: 600; }

/* Search results */
.help-results { max-width: 860px; }
.help-result-list { list-style: none; padding: 8px; margin: 12px 0 0; border: 1px solid #dbe5ea; border-radius: 16px; background: #fff; }
.help-result-meta { grid-column: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: #475569; font-size: .85rem; }
.help-kind { padding: 1px 8px; border: 1px solid #99d5cb; border-radius: 999px; background: #e6f4f1; color: #0f5e57; font-weight: 600; }
.help-empty { padding: 24px; border: 1px dashed #cbd5e1; border-radius: 16px; background: #fff; }
.help-empty p { margin: 0 0 8px; line-height: 1.6; }

/* Article */
.help-article { min-width: 0; padding-bottom: 140px; }
.help-breadcrumb ol { display: flex; flex-wrap: wrap; align-items: center; list-style: none; padding: 0; margin: 0 0 12px; color: #475569; font-size: .9rem; }
.help-breadcrumb li { display: inline-flex; align-items: center; }
.help-breadcrumb li + li::before { content: '›'; margin: 0 8px; color: #94a3b8; }
.help-breadcrumb a { display: inline-flex; align-items: center; min-height: 44px; color: #0f766e; text-decoration: underline; text-underline-offset: 3px; }
.help-breadcrumb [aria-current] { color: #334155; }
.help-article .help-topic-card { color: inherit; }
.help-article-card .help-preview { margin: 0 0 12px; background: #f8fafc; }
.help-article p, .help-article li { line-height: 1.75; overflow-wrap: anywhere; }
.help-article p { margin: 0 0 16px; }
.help-article-card section { margin-top: 32px; }
.help-article-card section h3 { padding-top: 20px; border-top: 1px solid #edf2f4; }
.help-article-summary { font-size: 1.08rem; color: #334155; }
.help-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 20px 0 8px; padding: 16px 18px;
  border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
.help-facts:empty { display: none; }
.help-facts dt { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-weight: 600; font-size: .9rem; color: #334155; }
.help-facts dt .v-icon { color: #0f766e; }
.help-facts dd { margin: 0; }
.help-facts ul { list-style: none; padding: 0; margin: 0; }
.help-facts li { padding: 0; }
.help-facts a { display: inline-flex; align-items: center; min-height: 36px; color: #0f766e; text-decoration: underline; text-underline-offset: 3px; line-height: 1.4; }
.help-toc { margin: 16px 0 0; }
.help-toc-label { margin: 0 0 4px !important; font-weight: 600; font-size: .9rem; color: #334155; }
.help-toc ol { list-style: none; padding: 0; margin: 0; }
.help-toc li { padding: 0; }
.help-toc a { display: inline-flex; align-items: center; min-height: 36px; color: #0f766e; text-decoration: underline; text-underline-offset: 3px; }
.help-steps { list-style: none; padding: 0; margin: 0 0 16px; counter-reset: help-step; }
.help-steps li { position: relative; counter-increment: help-step; padding: 6px 0 10px 44px; }
.help-steps li::before { content: counter(help-step); position: absolute; left: 0; top: 6px; display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%; background: #0f766e; color: #fff; font-weight: 600; font-size: .85rem; line-height: 1; }
.help-items { list-style: disc; padding-left: 24px; margin-bottom: 16px; }
.help-items li { padding: 6px 0 6px 4px; }
.help-items li::marker { color: #0f766e; }
.help-note { margin: 8px 0 16px; padding: 14px 16px 2px; border: 1px solid #b7e0d9; border-left: 4px solid #0f766e; border-radius: 10px; background: #f0faf8; }
.help-note.is-problem { border-color: #f3d9a4; border-left-color: #b45309; background: #fffaeb; }
.help-note-title { display: flex; align-items: center; gap: 6px; margin: 0 0 6px !important; font-weight: 600; color: #0f5e57; }
.help-note-title .v-icon { color: inherit; }
.help-note.is-problem .help-note-title { color: #92400e; }
.help-next { margin-top: 16px; padding: 20px 24px; border: 1px solid #dbe5ea; border-radius: 16px; background: #f8fafc; }
.help-next h3 { display: flex; align-items: center; gap: 8px; }
.help-next h3 .v-icon { color: #0f766e; }
.help-next ul { list-style: disc; padding-left: 20px; margin: 0 0 12px; }
.help-next li { padding: 0; }
.help-next a { display: inline-flex; align-items: center; min-height: 40px; color: #0f766e; text-decoration: underline; text-underline-offset: 3px; }
.help-next p { margin: 0; color: #475569; }

/* Interface labels written as «…» in the drafts */
.help-ui { display: inline; padding: 1px 6px; border: 1px solid #cbd5e1; border-radius: 6px; background: #f1f5f9; color: #0f3d44;
  font-weight: 600; font-size: .95em; white-space: normal; -webkit-box-decoration-break: clone; box-decoration-break: clone; }

.help-back { display: inline-flex; align-items: center; min-height: 44px; margin-top: 8px; color: #0f766e; text-decoration: underline; scroll-margin-block: 100px 140px; }
.help-center a:focus, .help-center [tabindex]:focus, .help-answer summary:focus { outline: 3px solid #0f766e; outline-offset: 4px; border-radius: 4px; }
.help-center [id] { scroll-margin-top: 100px; }

/* Night theme */
html[data-theme="clinical-night"] .help-center, html[data-theme="clinical-night"] .help-center h3,
html[data-theme="clinical-night"] .help-answer summary { color: #e5e7eb; }
html[data-theme="clinical-night"] .help-hero { background: linear-gradient(135deg, #123b3b 0%, #1e293b 70%); border-color: #335f5c; }
html[data-theme="clinical-night"] .help-hero-lead, html[data-theme="clinical-night"] .help-article-summary,
html[data-theme="clinical-night"] .help-facts dt, html[data-theme="clinical-night"] .help-toc-label,
html[data-theme="clinical-night"] .help-breadcrumb [aria-current] { color: #e5e7eb; }
html[data-theme="clinical-night"] .help-preview, html[data-theme="clinical-night"] .help-entry-list,
html[data-theme="clinical-night"] .help-topics a, html[data-theme="clinical-night"] .help-section-intro,
html[data-theme="clinical-night"] .help-row-summary, html[data-theme="clinical-night"] .help-search-status,
html[data-theme="clinical-night"] .help-result-meta, html[data-theme="clinical-night"] .help-breadcrumb ol,
html[data-theme="clinical-night"] .help-next p { color: #cbd5e1; }
html[data-theme="clinical-night"] .help-preview { background: rgba(15, 23, 42, .5); border-color: #64748b; }
html[data-theme="clinical-night"] .help-search input { background: #0f172a; color: #e5e7eb; border-color: #64748b; }
html[data-theme="clinical-night"] .help-search input::placeholder, html[data-theme="clinical-night"] .help-search-icon,
html[data-theme="clinical-night"] .help-search-clear { color: #94a3b8; }
html[data-theme="clinical-night"] .help-search-clear:hover, html[data-theme="clinical-night"] .help-topics a:hover { background: #273449; }
html[data-theme="clinical-night"] .help-sections a { color: #e5e7eb; background: #1e293b; border-color: #64748b; }
html[data-theme="clinical-night"] .help-sections a[aria-current] { color: #5eead4; border-color: #5eead4; background: #123b3b; }
html[data-theme="clinical-night"] .help-topic-card, html[data-theme="clinical-night"] .help-result-list,
html[data-theme="clinical-night"] .help-empty { background: #1e293b; border-color: #64748b; }
html[data-theme="clinical-night"] .help-entry-list > li { border-top-color: #334155; }
html[data-theme="clinical-night"] .help-row:hover { background: #22324a; }
html[data-theme="clinical-night"] .help-topic-icon, html[data-theme="clinical-night"] .help-topics a.is-active { background: #123b3b; color: #e5e7eb; }
html[data-theme="clinical-night"] .help-topics a.is-active { border-left-color: #5eead4; }
html[data-theme="clinical-night"] .help-topic-count { background: #334155; color: #e5e7eb; }
html[data-theme="clinical-night"] .help-kind { background: #123b3b; border-color: #2c7a72; color: #99f6e4; }
html[data-theme="clinical-night"] .help-facts, html[data-theme="clinical-night"] .help-next { background: #172033; border-color: #475569; }
html[data-theme="clinical-night"] .help-article-card section h3 { border-top-color: #334155; }
html[data-theme="clinical-night"] .help-note { background: #123b3b; border-color: #2c7a72; border-left-color: #5eead4; }
html[data-theme="clinical-night"] .help-note.is-problem { background: #3b2a12; border-color: #7c5a1e; border-left-color: #fbbf24; }
html[data-theme="clinical-night"] .help-note-title { color: #99f6e4; }
html[data-theme="clinical-night"] .help-note.is-problem .help-note-title { color: #fcd34d; }
html[data-theme="clinical-night"] .help-ui { background: #0f172a; border-color: #64748b; color: #e5e7eb; }
html[data-theme="clinical-night"] .help-back, html[data-theme="clinical-night"] .help-row-link, html[data-theme="clinical-night"] .help-answer-body a,
html[data-theme="clinical-night"] .help-breadcrumb a, html[data-theme="clinical-night"] .help-facts a, html[data-theme="clinical-night"] .help-toc a,
html[data-theme="clinical-night"] .help-next a, html[data-theme="clinical-night"] .help-answer-chevron,
html[data-theme="clinical-night"] .help-topics a .v-icon, html[data-theme="clinical-night"] .help-topic-icon .v-icon,
html[data-theme="clinical-night"] .help-facts dt .v-icon, html[data-theme="clinical-night"] .help-next h3 .v-icon { color: #5eead4; }
html[data-theme="clinical-night"] .help-steps li::before { background: #5eead4; color: #0f172a; }
html[data-theme="clinical-night"] .help-center a:focus, html[data-theme="clinical-night"] .help-center [tabindex]:focus,
html[data-theme="clinical-night"] .help-answer summary:focus, html[data-theme="clinical-night"] .help-row:focus-within,
html[data-theme="clinical-night"] .help-search input:focus { outline-color: #5eead4; }

@media (max-width: 1100px) {
  .help-layout { grid-template-columns: 1fr; gap: 24px; }
  .help-topics { position: static; }
  .help-topics ol { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; }
  .help-layout.is-article .help-topics { display: none; }
}
@media (max-width: 900px) {
  .help-hero { grid-template-columns: 1fr; padding: 24px; }
}
@media (max-width: 600px) {
  .help-center { padding: 20px 12px; }
  .help-hero { padding: 20px 16px; border-radius: 16px; }
  .help-hero-icon { width: 44px; height: 44px; border-radius: 12px; }
  .help-center h1 { font-size: 1.5rem; }
  .help-sections a { padding: 10px 12px; }
  .help-topics ol { grid-template-columns: 1fr; }
  .help-topic-card { padding: 20px 14px; }
  .help-topic-header { flex-wrap: wrap; }
  .help-next { padding: 18px 16px; }
}
</style>
