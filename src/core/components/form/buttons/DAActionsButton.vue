<template>
    <button :class="[css, classes]" class="px-2 transition duration-150 ease-in-out font-sans font-semibold tracking-wide rounded-full" style="padding-top: 3px; padding-bottom: 3px;" >
        <slot> {{label ? label : ''}}</slot>
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