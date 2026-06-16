<template>
  <div class="privacy-page">
    <header class="privacy-header">
      <button type="button" class="brand-button" aria-label="Ir al inicio" @click="$router.push('/')">
        <span class="brand-logo" :style="`background-image: url('` + logoOrrico + `')`"></span>
      </button>
      <button type="button" class="print-button" aria-label="Imprimir o guardar este aviso como PDF" @click="printNotice">
        <v-icon size="18" aria-hidden="true">mdi-printer-outline</v-icon>
        <span>Imprimir / guardar PDF</span>
      </button>
    </header>

    <main class="privacy-shell">
      <section class="privacy-hero" aria-labelledby="privacy-title">
        <p class="eyebrow">MedSync.mx | SaaS médico y dental</p>
        <h1 id="privacy-title">Aviso de Privacidad Integral de MedSync.mx</h1>
        <p class="hero-subtitle">
          Aviso público para visitantes, clientes y usuarios de la plataforma. Distingue el rol de
          MedSync como proveedor tecnológico del rol clínico de cada consultorio o tenant.
        </p>
        <div class="hero-meta">
          <span>Última actualización: {{ lastUpdated }}</span>
          <span>Documento pendiente de revisión legal antes de producción</span>
        </div>
      </section>

      <section class="production-blocker" aria-labelledby="production-blocker-title">
        <p class="section-kicker">TODO_PRODUCTION_BLOCKER</p>
        <h2 id="production-blocker-title">No publicar en producción sin revisión legal</h2>
        <p>{{ productionBlocker }}</p>
      </section>

      <section class="legal-review" aria-labelledby="legal-review-title">
        <div>
          <p class="section-kicker">TODO_LEGAL_REVIEW</p>
          <h2 id="legal-review-title">Datos legales pendientes</h2>
        </div>
        <ul>
          <li v-for="item in legalTodos" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="role-cards" aria-label="Resumen de privacidad">
        <article v-for="card in highlightCards" :key="card.title" class="role-card">
          <span class="role-icon" aria-hidden="true">
            <v-icon size="24" aria-hidden="true">{{ card.icon }}</v-icon>
          </span>
          <h2>{{ card.title }}</h2>
          <p>{{ card.text }}</p>
        </article>
      </section>

      <div class="privacy-layout">
        <aside class="toc" aria-label="Índice del aviso de privacidad">
          <p>Índice</p>
          <a v-for="section in sections" :key="section.id" :href="`#${section.id}`">
            {{ section.title }}
          </a>
        </aside>

        <article class="privacy-content">
          <section
            v-for="section in sections"
            :id="section.id"
            :key="section.id"
            class="notice-section"
          >
            <h2>{{ section.title }}</h2>
            <p v-for="paragraph in section.body" :key="paragraph">{{ paragraph }}</p>
          </section>

          <section id="inventario" class="notice-section">
            <h2>Inventario de datos identificado en el código</h2>
            <p>
              Este inventario se construyó a partir de modelos, tablas, servicios, rutas y módulos
              existentes. Debe actualizarse cuando se agreguen integraciones o nuevas categorías de datos.
            </p>
            <div class="table-frame">
              <table>
                <caption>Inventario técnico de categorías de datos personales tratados por MedSync.</caption>
                <thead>
                  <tr>
                    <th scope="col">Categoría</th>
                    <th scope="col">Datos tratados</th>
                    <th scope="col">Evidencia técnica</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in dataCategories" :key="row.group">
                    <td>{{ row.group }}</td>
                    <td>{{ row.data }}</td>
                    <td>{{ row.source }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="notice-section two-column-section">
            <div>
              <h2>Finalidades primarias o necesarias</h2>
              <ul class="purpose-list">
                <li v-for="purpose in primaryPurposes" :key="purpose">{{ purpose }}</li>
              </ul>
            </div>
            <div>
              <h2>Finalidades secundarias u opcionales</h2>
              <ul class="purpose-list">
                <li v-for="purpose in secondaryPurposes" :key="purpose">{{ purpose }}</li>
              </ul>
            </div>
          </section>

          <section id="proveedores" class="notice-section provider-section">
            <h2>Proveedores, remisiones y transferencias</h2>
            <p>
              Estas categorías técnicas requieren confirmación legal y operativa antes de producción.
              La ausencia de un nombre comercial aquí no debe interpretarse como que no existen
              remisiones, transferencias o subprocesadores.
            </p>
            <div v-for="group in providerGroups" :key="group.id" class="provider-group">
              <h3>{{ group.title }}</h3>
              <p>{{ group.note }}</p>
              <div class="table-frame">
                <table>
                  <caption>{{ group.title }}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Categoría</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="provider in group.rows" :key="provider.type">
                      <td>{{ provider.type }}</td>
                      <td>{{ provider.status }}</td>
                      <td>{{ provider.notes }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="avisos-simplificados-tabla" class="notice-section">
            <h2>Estado de avisos simplificados</h2>
            <p>
              Revisión de puntos de captura públicos o futuros. Los formularios clínicos internos
              corresponden principalmente al consultorio/tenant y requieren su propio análisis.
            </p>
            <div class="table-frame">
              <table>
                <caption>Estado de avisos simplificados en puntos de captura.</caption>
                <thead>
                  <tr>
                    <th scope="col">Punto de captura</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in simplifiedNoticeRows" :key="row.point">
                    <td>{{ row.point }}</td>
                    <td>{{ row.status }}</td>
                    <td>{{ row.note }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="contact-panel" aria-labelledby="privacy-contact-title">
            <div>
              <p class="section-kicker">Contacto de privacidad</p>
              <h2 id="privacy-contact-title">{{ legalName }}</h2>
              <p>{{ legalAddress }}</p>
            </div>
            <div class="contact-actions">
              <a :href="`mailto:${privacyEmail}`">{{ privacyEmail }}</a>
              <span>{{ privacyPhone }}</span>
            </div>
          </section>

          <section class="sources-panel" aria-labelledby="sources-title">
            <h2 id="sources-title">Referencias legales usadas como marco</h2>
            <ul>
              <li v-for="source in legalSources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  </div>
</template>

<script>
import {
  MEDSYNC_LEGAL_ADDRESS,
  MEDSYNC_LEGAL_NAME,
  MEDSYNC_LAST_UPDATED,
  MEDSYNC_PRIVACY_EMAIL,
  MEDSYNC_PRIVACY_PHONE,
  TODO_LEGAL_REVIEW,
  TODO_PRODUCTION_BLOCKER,
  dataCategories,
  highlightCards,
  legalSources,
  primaryPurposes,
  providerGroups,
  secondaryPurposes,
  simplifiedNoticeRows,
  sections
} from './privacyNoticeContent';

export default {
  data: function() {
    return {
      logoOrrico: require('@/assets/login/med-sync-logo.png'),
      legalAddress: MEDSYNC_LEGAL_ADDRESS,
      legalName: MEDSYNC_LEGAL_NAME,
      lastUpdated: MEDSYNC_LAST_UPDATED,
      privacyEmail: MEDSYNC_PRIVACY_EMAIL,
      privacyPhone: MEDSYNC_PRIVACY_PHONE,
      productionBlocker: TODO_PRODUCTION_BLOCKER,
      legalTodos: TODO_LEGAL_REVIEW,
      dataCategories,
      highlightCards,
      legalSources,
      primaryPurposes,
      providerGroups,
      secondaryPurposes,
      simplifiedNoticeRows,
      sections
    }
  },
  methods: {
    printNotice: function() {
      window.print()
    }
  }
}
</script>

<style scoped>
.privacy-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, #f6fbfd 0%, #edf7f9 44%, #f8fafc 100%),
    repeating-linear-gradient(120deg, rgba(14, 116, 144, 0.045) 0, rgba(14, 116, 144, 0.045) 1px, transparent 1px, transparent 42px);
  color: #1f3347;
}

.privacy-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 4.4rem;
  padding: 0.65rem clamp(1rem, 4vw, 3rem);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.brand-button,
.print-button {
  border: 0;
  background: transparent;
}

.brand-button {
  width: 11.5rem;
  height: 3.1rem;
  cursor: pointer;
}

.brand-logo {
  display: block;
  width: 100%;
  height: 100%;
  background-position: left center;
  background-repeat: no-repeat;
  background-size: contain;
}

.print-button {
  min-height: 2.55rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid #b7dfe1;
  border-radius: 8px;
  padding: 0 0.85rem;
  color: #075f67;
  background: #e9fbfb;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
}

.print-button .v-icon {
  color: #075f67;
}

.privacy-shell {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 3.5rem;
}

.privacy-hero {
  padding: clamp(1.35rem, 4vw, 3rem) 0 1.6rem;
}

.eyebrow,
.section-kicker {
  margin: 0 0 0.55rem;
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.privacy-hero h1 {
  max-width: 850px;
  margin: 0;
  color: #123247;
  font-size: clamp(2rem, 4.8vw, 4.15rem);
  line-height: 1.02;
  letter-spacing: 0;
}

.hero-subtitle {
  max-width: 760px;
  margin: 1rem 0 0;
  color: #496275;
  font-size: 1.05rem;
  line-height: 1.7;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.2rem;
}

.hero-meta span {
  border: 1px solid #cfe7eb;
  border-radius: 8px;
  padding: 0.45rem 0.65rem;
  color: #29485c;
  background: rgba(255, 255, 255, 0.74);
  font-size: 0.86rem;
  font-weight: 800;
}

.legal-review,
.production-blocker,
.contact-panel,
.sources-panel,
.notice-section {
  border: 1px solid #d8e8ec;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
}

.legal-review {
  display: grid;
  grid-template-columns: minmax(0, 0.45fr) minmax(0, 0.55fr);
  gap: 1rem;
  padding: 1.25rem;
  border-color: #f0c674;
  background: #fffaf0;
}

.production-blocker {
  padding: 1.15rem 1.25rem;
  margin-bottom: 1rem;
  border-color: #f2a6a6;
  background: #fff4f4;
}

.production-blocker p:last-child {
  margin: 0.45rem 0 0;
  color: #7f1d1d;
  font-weight: 800;
  line-height: 1.6;
}

.legal-review h2,
.production-blocker h2,
.contact-panel h2,
.sources-panel h2,
.notice-section h2,
.role-card h2 {
  margin: 0;
  color: #17364b;
  letter-spacing: 0;
}

.legal-review ul,
.purpose-list,
.sources-panel ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #4f6475;
  line-height: 1.65;
}

.role-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.85rem;
  margin: 1rem 0 1.4rem;
}

.role-card {
  min-height: 15.5rem;
  border: 1px solid #d7e9ec;
  border-radius: 8px;
  padding: 1rem;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.role-icon {
  width: 2.6rem;
  height: 2.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.85rem;
  border-radius: 8px;
  color: #0f766e;
  background: #e5fbf7;
}

.role-icon .v-icon {
  color: #0f766e;
}

.role-card h2 {
  font-size: 1rem;
}

.role-card p {
  margin: 0.55rem 0 0;
  color: #526a7d;
  font-size: 0.9rem;
  line-height: 1.58;
}

.privacy-layout {
  display: grid;
  grid-template-columns: 16.5rem minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.privacy-layout > * {
  min-width: 0;
}

.toc {
  position: sticky;
  top: 5.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: 1px solid #d8e8ec;
  border-radius: 8px;
  padding: 0.9rem;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.toc p {
  margin: 0 0 0.45rem;
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
}

.toc a {
  min-height: 2rem;
  display: flex;
  align-items: center;
  border-radius: 8px;
  padding: 0.28rem 0.5rem;
  color: #43596c;
  font-size: 0.86rem;
  font-weight: 700;
  text-decoration: none;
}

.toc a:hover {
  color: #075f67;
  background: #e9fbfb;
}

.privacy-content {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.notice-section {
  min-width: 0;
  scroll-margin-top: 5.25rem;
  padding: 1.25rem;
}

.notice-section h2 {
  font-size: 1.22rem;
}

.provider-group {
  margin-top: 1.1rem;
}

.provider-group h3 {
  margin: 0;
  color: #17364b;
  font-size: 1rem;
}

.notice-section p,
.contact-panel p {
  margin: 0.75rem 0 0;
  color: #4f6475;
  line-height: 1.75;
}

.two-column-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.table-frame {
  width: 100%;
  overflow-x: auto;
  margin-top: 1rem;
  border: 1px solid #dbe8eb;
  border-radius: 8px;
}

table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  background: #ffffff;
}

caption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

th,
td {
  padding: 0.85rem;
  border-bottom: 1px solid #e6eef1;
  color: #40576b;
  font-size: 0.9rem;
  line-height: 1.55;
  text-align: left;
  vertical-align: top;
}

th {
  color: #17364b;
  background: #eef8fa;
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
}

tr:last-child td {
  border-bottom: 0;
}

.contact-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1.25rem;
  background: #123247;
}

.contact-panel h2,
.contact-panel p,
.contact-panel .section-kicker {
  color: #ffffff;
}

.contact-panel p {
  color: #d6e7ef;
}

.contact-actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  align-items: flex-end;
}

.contact-actions a,
.contact-actions span {
  max-width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  color: #dffafa;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.9rem;
  font-weight: 800;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.sources-panel {
  padding: 1.25rem;
}

.sources-panel a {
  color: #0f766e;
  font-weight: 800;
}

@media (max-width: 1100px) {
  .role-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .privacy-layout {
    grid-template-columns: 1fr;
  }

  .toc {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toc p {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .privacy-header {
    position: static;
    align-items: stretch;
    flex-direction: column;
  }

  .brand-button {
    width: 9.75rem;
  }

  .print-button {
    justify-content: center;
    width: 100%;
  }

  .legal-review,
  .two-column-section,
  .contact-panel {
    grid-template-columns: 1fr;
  }

  .role-cards,
  .toc {
    grid-template-columns: 1fr;
  }

  .role-card {
    min-height: auto;
  }

  .contact-actions {
    align-items: stretch;
  }

  .privacy-shell {
    width: min(100% - 1rem, 1180px);
    padding-top: 1rem;
  }
}

@media print {
  @page {
    size: letter;
    margin: 16mm 14mm;
  }

  * {
    box-shadow: none !important;
    text-shadow: none !important;
  }

  .privacy-page {
    background: #ffffff;
    color: #111827;
  }

  .privacy-header,
  .toc,
  .print-button,
  .role-icon {
    display: none;
  }

  .privacy-hero {
    padding: 0 0 0.75rem;
  }

  .privacy-hero h1 {
    max-width: none;
    color: #111827;
    font-size: 24pt;
    line-height: 1.12;
  }

  .hero-subtitle,
  .notice-section p,
  .contact-panel p,
  .role-card p,
  td {
    color: #1f2937;
  }

  .hero-meta span {
    border-color: #9ca3af;
    color: #111827;
    background: #ffffff;
  }

  .privacy-shell {
    width: 100%;
    padding: 0;
  }

  .privacy-layout,
  .role-cards,
  .legal-review,
  .two-column-section,
  .contact-panel {
    display: block;
  }

  .role-cards {
    margin: 0 0 0.75rem;
  }

  .notice-section,
  .role-card,
  .legal-review,
  .production-blocker,
  .contact-panel,
  .sources-panel {
    break-inside: avoid;
    page-break-inside: avoid;
    border-color: #cbd5e1;
    box-shadow: none;
    margin-bottom: 0.75rem;
    background: #ffffff;
  }

  .role-card {
    min-height: auto;
  }

  .role-card h2 {
    font-size: 12pt;
  }

  .role-card p {
    margin-top: 0.25rem;
  }

  .notice-section,
  .role-card,
  .legal-review,
  .production-blocker,
  .contact-panel,
  .sources-panel {
    padding: 0.75rem;
  }

  .contact-panel h2,
  .contact-panel p,
  .contact-panel .section-kicker {
    color: #111827;
  }

  .contact-actions a,
  .contact-actions span {
    border-color: #cbd5e1;
    color: #111827;
    background: #ffffff;
  }

  .table-frame {
    overflow: visible;
    border-color: #cbd5e1;
  }

  table {
    min-width: 0;
    font-size: 9pt;
  }

  th {
    color: #111827;
    background: #e5e7eb;
  }

  th,
  td {
    padding: 0.45rem;
    border-color: #cbd5e1;
  }

  a {
    color: #111827;
    text-decoration: underline;
  }
}
</style>
