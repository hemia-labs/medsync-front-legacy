<template>
  <button :class="[css, classes]" class="bg-primary-900 px-2 py-1 text-white hover:bg-primary-1000 transition duration-150 ease-in-out font-sans font-medium  tracking-widest text-center" >
        {{label ? label : ''}}
        <slot></slot>
  </button>
</template>

<script>
import roundeable from '../../../mixins/roundeable';
import elevatable from '../../../mixins/elevatable';

export default {
    mixins: [roundeable, elevatable],
    props: {
        label: {
            type: String,
            default: ""
        },
        css: {
            type: String,
            default: ""
        },
    },
    computed: {
        classes() {
            return {...this.roundeableClass, ...this.elevatableClass}
        }
    }
}
</script>

<style>

</style>