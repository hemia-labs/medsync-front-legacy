<template>
   <v-textarea
        :label="label"
        :value="value"
        :hint="hinttext"
        :error="error"
        @input="onInput"
        :color="themePrimary"
        :rules="rules"
        :readonly="readonly"
        :outlined="outlined"
        auto-grow
        :rows="rows"
        :disabled="disabled"
        hide-details
        :autofocus="autofocus"
    ></v-textarea>
</template>

<script>
import typeable from '../../../mixins/typeable';

export default {
    name: 'da-text-area-primary',
    mixins: [typeable],
    props: {
        error: {
            type: [Boolean],
            default: false
        },
        label:  {
            type: String,
            default: ""
        },
        rules: {
            type: Array,
            default: function() { return []}
        },
        value: {
            type: [String, Number],
            default: ''
        },
        hinttext: {
            type: [String],
            default: ''
        },
        rows: {
            type: [String, Number],
            default: '3'
        },
        disabled: Boolean,
        readonly: Boolean,
        customType: Boolean,
        outlined: Boolean,
        autofocus: Boolean
    },
    computed: {
        themePrimary() {
            return 'var(--color-primary-700)'
        }
    },
    methods: {
        onInput(event) {
            this.$nextTick(() => {
                this.$emit('input', event)
            })
        }
    }

}
</script>

<style>

</style>
