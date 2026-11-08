<template>
  <v-overlay :value="overlay">
    <div class="medsync-loader" role="status">
      <img class="medsync-loader__mark" src="@/assets/login/medsync-isotipo.svg" width="66" height="44" alt="">
      <span>Cargando…</span>
    </div>
  </v-overlay>
</template>

<script>
export default {
  props: {
    overlay: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
.medsync-loader {
  display: grid;
  justify-items: center;
  gap: 12px;
  width: 152px;
  padding: 18px 12px 22px;
  border-radius: 16px;
  background: #fff;
  color: #334155;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

html[data-theme="clinical-night"] .medsync-loader {
  background: #1e293b;
  color: #e2e8f0;
}

.medsync-loader__mark {
  animation: medsync-loader-pulse 1.4s ease-in-out infinite;
}

@keyframes medsync-loader-pulse {
  0%, 100% {
    opacity: 0.78;
    transform: translateY(0) scale(1);
  }

  50% {
    opacity: 1;
    transform: translateY(-3px) scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .medsync-loader__mark {
    animation: none;
  }
}
</style>
