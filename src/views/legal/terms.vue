<template>
  <div class="terms-page">
    <header class="terms-header">
      <button type="button" class="brand-button" aria-label="Ir al inicio" @click="$router.push('/')">
        <medsync-brand />
      </button>
      <button type="button" class="print-button" aria-label="Imprimir o guardar estos términos como PDF" @click="printTerms">
        <v-icon size="18" aria-hidden="true">mdi-printer-outline</v-icon>
        <span>Imprimir / guardar PDF</span>
      </button>
    </header>

    <main class="terms-shell">
      <section class="terms-hero" aria-labelledby="terms-title">
        <p class="eyebrow">MedSync.mx | SaaS médico y dental</p>
        <h1 id="terms-title">Términos y Condiciones de Uso de MedSync.mx</h1>
        <p class="hero-subtitle">
          Condiciones de uso para clientes, tenants y usuarios autorizados de MedSync.mx como plataforma
          tecnológica para consultorios médicos, odontológicos y de salud.
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
          <h2 id="legal-review-title">Pendientes legales y comerciales</h2>
        </div>
        <ul>
          <li v-for="item in legalTodos" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="role-cards" aria-label="Resumen de términos">
        <article v-for="card in cards" :key="card.title" class="role-card">
          <span class="role-icon" aria-hidden="true">
            <v-icon size="24" aria-hidden="true">{{ card.icon }}</v-icon>
          </span>
          <h2>{{ card.title }}</h2>
          <p>{{ card.text }}</p>
        </article>
      </section>

      <div class="terms-layout">
        <aside class="toc" aria-label="Índice de términos y condiciones">
          <p>Índice</p>
          <a v-for="section in sections" :key="section.id" :href="`#${section.id}`">
            {{ section.title }}
          </a>
        </aside>

        <article class="terms-content">
          <section id="identidad" class="notice-section">
            <h2>Identidad del proveedor</h2>
            <dl class="identity-list">
              <div>
                <dt>Proveedor</dt>
                <dd>{{ legalName }}</dd>
              </div>
              <div>
                <dt>Domicilio legal</dt>
                <dd>{{ legalAddress }}</dd>
              </div>
              <div>
                <dt>Correo legal / soporte</dt>
                <dd>{{ legalEmail }}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{{ legalPhone }}</dd>
              </div>
              <div>
                <dt>Jurisdicción</dt>
                <dd>{{ jurisdiction }}</dd>
              </div>
            </dl>
          </section>

          <section id="responsabilidades-tabla" class="notice-section">
            <h2>Responsabilidades principales</h2>
            <p>
              Esta tabla resume la diferencia entre MedSync como proveedor SaaS y el consultorio/tenant
              como responsable clínico y operativo.
            </p>
            <div class="table-frame">
              <table>
                <caption>Responsabilidades de MedSync y del tenant.</caption>
                <thead>
                  <tr>
                    <th scope="col">Tema</th>
                    <th scope="col">MedSync</th>
                    <th scope="col">Consultorio / tenant</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in responsibilityRows" :key="row.topic">
                    <td>{{ row.topic }}</td>
                    <td>{{ row.medsync }}</td>
                    <td>{{ row.tenant }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="uso-tabla" class="notice-section">
            <h2>Uso permitido y prohibido</h2>
            <div class="table-frame">
              <table>
                <caption>Comparativo de usos permitidos y usos prohibidos.</caption>
                <thead>
                  <tr>
                    <th scope="col">Uso permitido</th>
                    <th scope="col">Uso prohibido</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in useRulesRows" :key="row.allowed">
                    <td>{{ row.allowed }}</td>
                    <td>{{ row.prohibited }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section
            v-for="section in sections"
            :id="section.id"
            :key="section.id"
            class="notice-section"
          >
            <h2>{{ section.title }}</h2>
            <p v-for="paragraph in section.body" :key="paragraph">{{ paragraph }}</p>
            <router-link
              v-if="section.link"
              class="section-link"
              :to="section.link.href"
            >
              {{ section.link.label }}
            </router-link>
          </section>

          <section class="contact-panel" aria-labelledby="terms-contact-title">
            <div>
              <p class="section-kicker">Contacto legal / soporte</p>
              <h2 id="terms-contact-title">{{ legalName }}</h2>
              <p>{{ legalAddress }}</p>
            </div>
            <div class="contact-actions">
              <span>{{ legalEmail }}</span>
              <span>{{ legalPhone }}</span>
            </div>
          </section>
        </article>
      </div>
    </main>
  </div>
</template>

<script>
import {
  MEDSYNC_JURISDICTION
} from './privacyLegalConfig';
import {
  MEDSYNC_LEGAL_ADDRESS,
  MEDSYNC_LEGAL_EMAIL,
  MEDSYNC_LEGAL_NAME,
  MEDSYNC_LEGAL_PHONE,
  MEDSYNC_TERMS_LAST_UPDATED,
  TERMS_TODO_LEGAL_REVIEW,
  TODO_PRODUCTION_BLOCKER,
  responsibilityRows,
  termsHeroCards,
  termsSections,
  useRulesRows
} from './termsAndConditionsContent';

export default {
  data: function() {
    return {
      cards: termsHeroCards,
      jurisdiction: MEDSYNC_JURISDICTION,
      lastUpdated: MEDSYNC_TERMS_LAST_UPDATED,
      legalAddress: MEDSYNC_LEGAL_ADDRESS,
      legalEmail: MEDSYNC_LEGAL_EMAIL,
      legalName: MEDSYNC_LEGAL_NAME,
      legalPhone: MEDSYNC_LEGAL_PHONE,
      legalTodos: TERMS_TODO_LEGAL_REVIEW,
      productionBlocker: TODO_PRODUCTION_BLOCKER,
      responsibilityRows,
      sections: termsSections,
      useRulesRows
    }
  },
  methods: {
    printTerms: function() {
      window.print()
    }
  }
}
</script>

<style scoped>
.terms-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, #f6fbfd 0%, #edf7f9 44%, #f8fafc 100%),
    repeating-linear-gradient(120deg, rgba(14, 116, 144, 0.045) 0, rgba(14, 116, 144, 0.045) 1px, transparent 1px, transparent 42px);
  color: #1f3347;
}

.terms-header {
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
  font-weight: 600;
  cursor: pointer;
}

.print-button .v-icon {
  color: #075f67;
}

.terms-shell {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 3.5rem;
}

.terms-hero {
  padding: clamp(1.35rem, 4vw, 3rem) 0 1.6rem;
}

.eyebrow,
.section-kicker {
  margin: 0 0 0.55rem;
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.terms-hero h1 {
  max-width: 920px;
  margin: 0;
  color: #123247;
  font-size: clamp(2rem, 4.8vw, 4.15rem);
  line-height: 1.02;
  letter-spacing: 0;
}

.hero-subtitle {
  max-width: 790px;
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
  font-weight: 600;
}

.legal-review,
.production-blocker,
.contact-panel,
.notice-section {
  border: 1px solid #d8e8ec;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
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
  font-weight: 600;
  line-height: 1.6;
}

.legal-review {
  display: grid;
  grid-template-columns: minmax(0, 0.42fr) minmax(0, 0.58fr);
  gap: 1rem;
  padding: 1.25rem;
  border-color: #f0c674;
  background: #fffaf0;
}

.legal-review h2,
.production-blocker h2,
.contact-panel h2,
.notice-section h2,
.role-card h2 {
  margin: 0;
  color: #17364b;
  letter-spacing: 0;
}

.legal-review ul {
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
  min-height: 14.5rem;
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

.terms-layout {
  display: grid;
  grid-template-columns: 16.5rem minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.terms-layout > * {
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
  font-weight: 600;
  text-transform: uppercase;
}

.toc a {
  min-height: 2rem;
  display: flex;
  align-items: center;
  border-radius: 8px;
  padding: 0.28rem 0.5rem;
  color: #43596c;
  font-size: 0.84rem;
  font-weight: 600;
  text-decoration: none;
}

.toc a:hover {
  color: #075f67;
  background: #e9fbfb;
}

.terms-content {
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

.notice-section p,
.contact-panel p {
  margin: 0.75rem 0 0;
  color: #4f6475;
  line-height: 1.75;
}

.identity-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  margin: 1rem 0 0;
}

.identity-list div {
  border: 1px solid #dbe8eb;
  border-radius: 8px;
  padding: 0.8rem;
  background: #f8fcfd;
}

.identity-list dt {
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
}

.identity-list dd {
  margin: 0.35rem 0 0;
  color: #17364b;
  font-weight: 600;
  overflow-wrap: anywhere;
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
  font-weight: 600;
  text-transform: uppercase;
}

tr:last-child td {
  border-bottom: 0;
}

.section-link {
  display: inline-flex;
  margin-top: 0.85rem;
  color: #0f766e;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
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

.contact-actions span {
  max-width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  color: #dffafa;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.9rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

@media (max-width: 1100px) {
  .role-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .terms-layout {
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
  .terms-header {
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
  .contact-panel {
    grid-template-columns: 1fr;
  }

  .role-cards,
  .toc,
  .identity-list {
    grid-template-columns: 1fr;
  }

  .role-card {
    min-height: auto;
  }

  .contact-actions {
    align-items: stretch;
  }

  .terms-shell {
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

  .terms-page {
    background: #ffffff;
    color: #111827;
  }

  .terms-header,
  .toc,
  .print-button,
  .role-icon {
    display: none;
  }

  .terms-hero {
    padding: 0 0 0.75rem;
  }

  .terms-hero h1 {
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

  .terms-shell {
    width: 100%;
    padding: 0;
  }

  .terms-layout,
  .role-cards,
  .legal-review,
  .contact-panel {
    display: block;
  }

  .notice-section,
  .role-card,
  .legal-review,
  .production-blocker,
  .contact-panel {
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
  .contact-panel {
    padding: 0.75rem;
  }

  .contact-panel h2,
  .contact-panel p,
  .contact-panel .section-kicker {
    color: #111827;
  }

  .contact-actions span {
    border-color: #cbd5e1;
    color: #111827;
    background: #ffffff;
  }

  .identity-list {
    display: block;
  }

  .identity-list div {
    margin-bottom: 0.4rem;
    border-color: #cbd5e1;
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
