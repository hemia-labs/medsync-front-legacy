<template>
  <main class="published-legal bg-gray98 text-gray-700">
    <header class="published-legal__header">
      <router-link to="/" class="published-legal__brand">MedSync</router-link>
      <v-btn v-if="version" outlined class="published-legal__print" @click="printDocument">
        <v-icon left small>mdi-printer-outline</v-icon>Imprimir / guardar PDF
      </v-btn>
    </header>
    <section class="published-legal__sheet bg-white" :aria-busy="loading ? 'true' : 'false'">
      <p class="published-legal__eyebrow">Documentos de MedSync</p>
      <h1>{{ title }}</h1>
      <p v-if="loading" role="status">Consultando la versión publicada…</p>
      <v-alert v-else-if="error" type="warning" text role="alert">
        {{ error }}
        <v-btn v-if="retryable" text color="primary" @click="load">Reintentar</v-btn>
      </v-alert>
      <template v-else-if="version">
        <p class="published-legal__meta">Versión {{ version.version_number }}<template v-if="publishedDate"> · Publicada el {{ publishedDate }}</template></p>
        <p v-if="document.description">{{ document.description }}</p>
        <!-- The published snapshot is rendered through the document sanitizer. -->
        <article class="published-legal__content" v-html="safeContent"></article>
        <p class="published-legal__note">Si tienes una cuenta, consulta y registra tu aceptación en Configuración → Cuenta y legal.</p>
      </template>
    </section>
  </main>
</template>

<script>
import saasLegalService from '@/services/saasLegal.service';
import { sanitizeHtmlForDocumentSnapshot } from '@/utils/sanitizeHtml';

export default {
  name: 'PublishedLegalDocument',
  props: { documentKey: { type: String, required: true } },
  data: () => ({ loading: false, error: '', retryable: false, document: null, sequence: 0 }),
  computed: {
    title() { return this.document ? this.document.title : this.documentKey === 'privacy_notice' ? 'Aviso de privacidad' : 'Términos y condiciones'; },
    version() { return this.document && this.document.current_version; },
    publishedDate() {
      if (!this.version || !this.version.published_at) return '';
      const date = new Date(this.version.published_at);
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    safeContent() { return sanitizeHtmlForDocumentSnapshot(this.version ? this.version.content_html : ''); }
  },
  watch: { documentKey: { immediate: true, handler() { this.load(); } } },
  beforeDestroy() { this.sequence++; },
  methods: {
    async load() {
      const sequence = ++this.sequence;
      this.loading = true; this.document = null; this.error = ''; this.retryable = false;
      try {
        const result = await saasLegalService.publicCurrent(this.documentKey);
        if(sequence !== this.sequence) return;
        if(result && result.success && result.data && result.data.document && result.data.document.current_version) {
          this.document = result.data.document;
        } else {
          this.retryable = !(result && (result.status === 404 || result.code === 'LEGAL_DOCUMENT_NOT_FOUND'));
          this.error = this.retryable ? 'No se pudo consultar el documento. Reintenta en unos momentos.' : 'MedSync aún no ha publicado este documento. Contacta a soporte si necesitas consultarlo.';
        }
      } catch(_) {
        if(sequence === this.sequence) { this.error = 'No se pudo consultar el documento. Revisa tu conexión y reintenta.'; this.retryable = true; }
      } finally { if(sequence === this.sequence) this.loading = false; }
    },
    printDocument() { window.print(); }
  }
};
</script>

<style scoped>
.published-legal { min-height: 100vh; padding: 24px; }
.published-legal__header { max-width: 960px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.published-legal__brand { color: var(--color-primary-900, #086783); font-size: 24px; font-weight: 700; text-decoration: none; }
.published-legal__print { color: var(--color-primary-900, #086783); }
.published-legal__sheet { max-width: 960px; margin: auto; padding: 36px; border: 1px solid var(--color-primary-200, #dfe6ef); border-radius: 16px; }
.published-legal__eyebrow { color: var(--color-primary-900, #086783); font-weight: 600; }
h1 { font-size: clamp(24px, 5vw, 34px); line-height: 1.2; margin: 0 0 20px; overflow-wrap: anywhere; }
.published-legal__meta, .published-legal__note { color: var(--color-grey, #607089); font-size: 14px; }
.published-legal__note { border-top: 1px solid var(--border-color, #dfe6ef); padding-top: 20px; margin-top: 28px; }
.published-legal__content { line-height: 1.7; overflow-wrap: anywhere; overflow-x: auto; }
.published-legal__content ::v-deep img { max-width: 100%; height: auto; }
html[data-theme="clinical-night"] .published-legal__brand,
html[data-theme="clinical-night"] .published-legal__eyebrow,
html[data-theme="clinical-night"] .published-legal__print { color: #bae6fd !important; }
html[data-theme="clinical-night"] .published-legal__meta,
html[data-theme="clinical-night"] .published-legal__note { color: #cbd5e1; }
@media (max-width: 600px) { .published-legal { padding: 16px; } .published-legal__sheet { padding: 22px 18px; } }
@media print { .published-legal { padding: 0; background: #fff; } .published-legal__header, .published-legal__note { display: none; } .published-legal__sheet { max-width: none; border: 0; padding: 0; } .published-legal__content { overflow: visible; } }
</style>
