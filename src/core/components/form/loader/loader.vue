<template>
    <div class="text-center"> 
    <v-overlay
      v-model="overlay"
      class="align-center justify-center"
    >
      <lottie-animation
            :path="'lottie/loader.json'"
            :width="300"
            :height="300"
            :speed="1"
        />
    </v-overlay>
  </div>
</template>

<script>
export default {
    props: {
        overlay: {
            type: Boolean,
            default: false
        },
    },
}
</script>

<style>

</style>