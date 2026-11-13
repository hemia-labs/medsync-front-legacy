<template>
  <button :class="[css, classes]" class="bg-secondary-500 px-2 py-1 text-white hover:bg-secondary-700 transition duration-150 ease-in-out font-sans font-semibold tracking-wide rounded-full" >
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