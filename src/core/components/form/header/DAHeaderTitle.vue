<template>
      <div class="bg-white"  :class="[classes]">
        <div class="box-backgroud-title text-primary-700 px-5 py-2 flex justify-between items-center" :class="[classes]">
          <span class="font-sans text-lg">{{ title ? title : '' }}</span>
          <div>
            <slot name="actions"></slot>
          </div>
        </div>
    </div>
</template>

<script>
import roundeable from '../../../mixins/roundeable';

export default {
    mixins: [roundeable],
    props: {
        title: {
            type: String,
            default: ''
        }
    },
    computed: {
        classes() {
            return {...this.roundeableClass}
        }
    }
}
</script>

<style>

</style>