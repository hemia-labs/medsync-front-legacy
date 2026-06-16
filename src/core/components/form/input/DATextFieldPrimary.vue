<template>
    <!-- <div> -->
        <v-text-field
        :label="label"
        :prepend-inner-icon="icon"
        :color="themePrimary"
        :type="vtype ? vtype : type"
        @input="onInput"
        :error="error"
        :rules="rules"
        :value="value"
        :disabled="disabled"
        :readonly="readonly"
        :placeholder="placeholder"
        >
        <template slot="append">
            <slot name="append-icon">

            </slot>
        </template>
    </v-text-field>
    <!-- </div> -->
</template>
<script>
import typeable from '../../../mixins/typeable';

export default {
    name: 'da-text-field-primary',
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
        icon: {
            type: String,
            default: ""
        },
        rules: {
            type: Array,
            default: function() { return []}
        },
        vtype: {
            type: [String],
            default: ''
        },
        value: {
            type: [String, Number],
            default: ''
        },
        placeholder: {
            type: [String],
            default: ''
        },
        disabled: Boolean,
        readonly: Boolean,
        customType: Boolean
    },
    computed: {
        themePrimary() {
            return 'var(--color-primary-700)'
        },
        type() {
           let types = {...this.typeableClass}
            return Object.keys(types).find(key => types[key] == true)
        },
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
