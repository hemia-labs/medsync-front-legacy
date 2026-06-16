<template>
    <div class="absolute w-24 transform rotate-45" >
          <div class=" w-5 h-1  transform rotate-45 absolute left-0" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-90 absolute left-2" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-45 absolute left-4" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-90 absolute left-6" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-45 absolute left-8" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-90 absolute left-10" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-45 absolute left-12" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-90 absolute left-14" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-45 absolute left-16" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-90 absolute left-17" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
          <div class=" w-5 h-1 transform rotate-45 absolute left-20" :class="{'bg-red-500': symbol == 11, 'bg-black': symbol == 9}"></div>
    </div>
</template>

<script>
    export default {
        props: {
            symbol: {
                type: [Number],
                default: 0
            }
        }
    }
</script>

<style lang="scss" scoped>

</style>