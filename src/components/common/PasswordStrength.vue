<template>
  <div class="password-helper" aria-live="polite" aria-atomic="true">
    <div class="password-strength" :class="'score-' + strength.score" aria-hidden="true">
      <span v-for="index in 4" :key="index"></span>
    </div>
    <p>{{ strength.label }}</p>
  </div>
</template>

<script>
import { registrationPasswordError } from '../../utils/registration';

export default {
  props: { value: { type: String, default: '' } },
  computed: {
    checks() {
      return {
        length: !registrationPasswordError(this.value),
        letter: /[A-Za-z]/.test(this.value),
        number: /\d/.test(this.value)
      };
    },
    strength() {
      let score = 0;
      if (this.checks.length) score += 1;
      if (this.checks.letter) score += 1;
      if (this.checks.number) score += 1;
      if (this.value.length >= 12 || /[^A-Za-z0-9]/.test(this.value)) score += 1;
      const labels = ['Ingresa una contraseña segura.', 'Seguridad baja.', 'Seguridad media.', 'Seguridad buena.', 'Seguridad alta.'];
      return { score, label: labels[score] };
    }
  }
};
</script>

<style scoped>
.password-helper { margin-top:-.1rem; display:grid; gap:.55rem; }
.password-strength { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.35rem; }
.password-strength span { height:.32rem; border-radius:999px; background:rgba(var(--color-muted-rgb),.32); }
.password-strength.score-1 span:nth-child(-n+1) { background:#f97316; }
.password-strength.score-2 span:nth-child(-n+2) { background:#f59e0b; }
.password-strength.score-3 span:nth-child(-n+3), .password-strength.score-4 span { background:var(--color-primary-700); }
.password-helper p { margin:0; color:var(--color-terciary-500); font-size:.8rem; line-height:1.3; }
@media(max-width:600px) { .password-helper { gap:.42rem; } }
</style>
