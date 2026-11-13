<template>
    <button :class="[css, classes]" class="bg-terciary-500 px-2 py-1 text-white hover:bg-grey transition duration-150 ease-in-out font-sans font-semibold tracking-wide rounded-full text-center" >
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