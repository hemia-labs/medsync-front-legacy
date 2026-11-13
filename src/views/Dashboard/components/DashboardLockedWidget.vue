<template>
  <section class="locked-widget" aria-label="Analisis operativo no disponible">
    <div class="locked-icon">
      <v-icon size="24">mdi-lock-outline</v-icon>
    </div>
    <div>
      <p class="eyebrow">Disponible en Profesional</p>
      <h2>Analisis operativo</h2>
      <p>
        Tu plan actual incluye el resumen esencial. Las tendencias y el analisis operativo se habilitan
        en el plan Profesional.
      </p>
      <button type="button" class="locked-cta">Contactar para cambiar plan</button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'DashboardLockedWidget'
};
</script>

<style scoped>
.locked-widget {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.95rem;
  margin-top: 1rem;
  padding: 1.1rem;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.92);
}

.locked-icon {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.85rem;
  color: #64748b;
  background: #e2e8f0;
}

.eyebrow {
  margin: 0 0 0.3rem;
  color: #0f766e;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: #12313a;
  letter-spacing: 0;
}

p:not(.eyebrow) {
  margin: 0.5rem 0 0;
  color: #64748b;
  line-height: 1.5;
}

.locked-cta {
  margin-top: 0.85rem;
  min-height: 2.25rem;
  padding: 0 0.9rem;
  border: 1px solid #0f766e;
  color: #0f766e;
  background: #ffffff;
  font-weight: 600;
}

html[data-theme="clinical-night"] .locked-widget {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.74);
}

html[data-theme="clinical-night"] h2 {
  color: #e2e8f0;
}

html[data-theme="clinical-night"] p:not(.eyebrow) {
  color: #94a3b8;
}

@media (max-width: 640px) {
  .locked-widget {
    grid-template-columns: 1fr;
  }
}
</style>
