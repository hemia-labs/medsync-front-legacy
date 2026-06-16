<template>
<div class="flex h-full items-center justify-center p-5 w-full bg-white">
  <div class="text-center">
    <div class="inline-flex rounded-full bg-red-100 p-4">
      <div class="rounded-full stroke-red-600 bg-red-200 p-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-alert-octagon" width="100" height="100" viewBox="0 0 24 24" stroke-width="1.5" stroke="#ff2825" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M8.7 3h6.6c.3 0 .5 .1 .7 .3l4.7 4.7c.2 .2 .3 .4 .3 .7v6.6c0 .3 -.1 .5 -.3 .7l-4.7 4.7c-.2 .2 -.4 .3 -.7 .3h-6.6c-.3 0 -.5 -.1 -.7 -.3l-4.7 -4.7c-.2 -.2 -.3 -.4 -.3 -.7v-6.6c0 -.3 .1 -.5 .3 -.7l4.7 -4.7c.2 -.2 .4 -.3 .7 -.3z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
    </div>
    <h1 class="mt-5 text-[36px] font-bold text-slate-800 lg:text-[50px]">500 - Error en el servidor</h1>
    <p class="text-slate-600 mt-5 lg:text-lg">Oops algo anda mal, trata de refrescar o intentalo mas tarde. <br> Estamos trabajando para brindarte la mejor experiencia.</p>
    <router-link to="/inicio">
        <da-button-primary   :label="'Ir al inicio'" rlg swpr class="py-2 px-10 font-light"></da-button-primary>
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
