<template>
    <v-card >
        <v-card-title class="text-h5">
            {{ title ? title : '' }}
        </v-card-title>
        <v-card-text>{{ message ? message : '' }}</v-card-text>
        <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
            :color="cancelcolor"
            text
            @click="$emit('close', $attrs.value)"
        >
            {{ calcelbtntext ? calcelbtntext : 'Cancelar' }}
        </v-btn>
        <v-btn
            :color="confirmcolor"
            text
            @click="$emit('confirm', $attrs.value)"
        >
            {{  confirmbtntext? confirmbtntext : 'Aceptar' }}
        </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script>
export default {
    data: function() {
        return {
            confirm: false
        }
    },
    props: {
        confirmcolor: {
            type: String,
            default: 'var(--color-primary-700)'
        },
        cancelcolor: {
            type: String,
            default: 'var(--color-grey)'
        },
        title: {
            type: String,
            default: 'Alerta'
        },
        message: {
            type: String,
            default: ''
        },
        calcelbtntext: {
            type: String,
            default: 'Cancelar'
        },
        confirmbtntext: {
            type: String,
            default: 'Aceptar'
        }
    }
}
</script>

<style>

</style>