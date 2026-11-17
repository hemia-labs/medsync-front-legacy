<template>
  <v-dialog :value="value" max-width="420" width="calc(100% - 32px)" content-class="logout-confirm-dialog"
    aria-labelledby="logout-confirm-title" aria-describedby="logout-confirm-description" @input="$emit('input', $event)">
    <v-card class="logout-confirm-card" elevation="0">
      <v-card-title class="logout-confirm-heading"><h2 id="logout-confirm-title">¿Cerrar sesión?</h2></v-card-title>
      <v-card-text id="logout-confirm-description" class="logout-confirm-description">
        Tendrás que iniciar sesión de nuevo para continuar en MedSync.
      </v-card-text>
      <v-card-actions class="logout-confirm-actions">
        <v-btn outlined class="logout-confirm-cancel" @click="$emit('input', false)">Cancelar</v-btn>
        <v-btn depressed class="logout-confirm-submit" @click="$emit('confirm')">Cerrar sesión</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default { props: { value: Boolean } };
</script>

<style>
.v-dialog.logout-confirm-dialog { margin:16px; border-radius:10px; background:transparent!important; box-shadow:0 12px 32px rgba(25,62,67,.14); }
</style>
<style scoped>
.logout-confirm-card.v-card {
  --logout-surface:#fff; --logout-ink:#193e43; --logout-muted:#52696d; --logout-border:#dce8e5;
  --logout-accent:#087b79; --logout-on-accent:#fff;
  border:1px solid var(--logout-border)!important; border-radius:10px;
  background:var(--logout-surface)!important; color:var(--logout-ink);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;
}
.logout-confirm-heading.v-card__title { padding:24px 24px 8px; word-break:normal; }
.logout-confirm-heading h2 { margin:0; font-size:18px; font-weight:600; line-height:1.4; color:var(--logout-ink); }
.logout-confirm-description.v-card__text { padding:0 24px 24px; font-size:14px; line-height:1.6; color:var(--logout-muted); }
.logout-confirm-actions.v-card__actions { justify-content:flex-end; gap:8px; padding:16px 24px; border-top:1px solid var(--logout-border); }
.logout-confirm-actions .v-btn { margin:0!important; min-height:40px; padding:0 16px; border-radius:6px; font-size:13px; font-weight:600; letter-spacing:0; text-transform:none; }
.logout-confirm-cancel.v-btn { border-color:var(--logout-border); color:var(--logout-ink)!important; }
.logout-confirm-submit.v-btn { background:var(--logout-accent)!important; color:var(--logout-on-accent)!important; }
.logout-confirm-actions .v-btn:focus-visible { outline:2px solid var(--logout-accent); outline-offset:3px; }
html[data-theme="clinical-night"] .logout-confirm-card.v-card {
  --logout-surface:#18292d; --logout-ink:#e4f1ee; --logout-muted:#b4c8c5; --logout-border:#334a4d;
  --logout-accent:#71c9c2; --logout-on-accent:#0f1d20;
  background:var(--logout-surface)!important; border-color:var(--logout-border)!important;
}
@media(max-width:639px) {
  .logout-confirm-heading.v-card__title { padding:20px 20px 8px; }
  .logout-confirm-description.v-card__text { padding:0 20px 20px; }
  .logout-confirm-actions.v-card__actions { padding:16px 20px; }
  .logout-confirm-actions .v-btn { flex:1; min-height:44px; }
}
</style>
