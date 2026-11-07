<template>
  <span class="medsync-brand" aria-label="MedSync">
    <img v-if="customLogo" :src="customLogo" alt="MedSync" class="medsync-brand__custom" @error="$emit('error')">
    <template v-else><img src="@/assets/login/medsync-isotipo.svg" alt="" class="medsync-brand__symbol"><strong class="medsync-brand__name">medsync</strong></template>
  </span>
</template>
<script>
export default { props: { customLogo: { type: String, default: '' } } };
</script>
<style scoped>
.medsync-brand { display:inline-flex; align-items:center; gap:0.35em; font-size:28px; line-height:1; flex-shrink:0; }
.medsync-brand__symbol { width:1.72em; height:1.72em; object-fit:contain; }
.medsync-brand .medsync-brand__name { font-family:Inter,sans-serif; font-weight:600; font-size:1em; letter-spacing:-0.02em; color:#0d1b2a; line-height:1.2; }
.medsync-brand__custom { max-width:190px; max-height:64px; object-fit:contain; }
</style>
