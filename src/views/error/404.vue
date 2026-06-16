<template>
    <div class="flex h-full items-center justify-center p-5 bg-white w-full">
  <div class="text-center">
    <div class="inline-flex rounded-full bg-yellow-100 p-4">
      <div class="rounded-full stroke-yellow-600 bg-yellow-200 p-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-alert-circle" width="100" height="100" viewBox="0 0 24 24" stroke-width="1.5" stroke="#ff9300" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
    </div>
    <h1 class="mt-5 text-[36px] font-bold text-slate-800 lg:text-[50px]">404 - Pagina no encontrada</h1>
    <p class="text-slate-600 mt-5 lg:text-lg">La pagina que buscas no existe o <br />fue removida.</p>
    <router-link to="/inicio">
        <da-button-primary  :label="'Ir al inicio'" rlg swpr class="py-2 px-10 font-light"></da-button-primary>
    </router-link>
  </div>
</div>
</template>

<script>
    export default {
        
    }
</script>

<style lang="scss" scoped>

</style>
