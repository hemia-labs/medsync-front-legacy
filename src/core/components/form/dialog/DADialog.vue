<template>
    <v-dialog
    v-model="show"
    :persistent="persist"
    :max-width="maxWidth"
    :retain-focus="false"
    >
    <template  v-slot:activator="{ on}">
        <slot name="button" v-on="on"></slot>     
    </template>
    <slot name="body"></slot>
    </v-dialog>
</template>

<script>
export default {
    props: {
        maxWidth: {
            type: String,
            default: '700px'
        },
        persist: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        show: {
            get () {
                return this.$attrs.value
            },
            set (value) {
                this.$emit('input', value)
            }
    }
    }
}
</script>

<style>

</style>