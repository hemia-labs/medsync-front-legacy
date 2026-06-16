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
            {{ calcelbtntext ? calcelbtntext : 'CANCELAR' }}
        </v-btn>
        <v-btn
            :color="confirmcolor"
            class="text-green-500"
            text
            @click="$emit('confirm', $attrs.value)"
        >
            {{  confirmbtntext? confirmbtntext : 'ACEPTAR' }}
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
            default: '#10B981'
        },
        cancelcolor: {
            type: String,
            default: '#9CA3AF'
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
            default: 'CANCELAR'
        },
        confirmbtntext: {
            type: String,
            default: 'ACEPTAR'
        }
    }
}
</script>

<style>

</style>