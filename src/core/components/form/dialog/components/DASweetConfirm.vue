<template>
  <v-card class="h-1/2 bg-white">
        <v-card-text class="text-center">
            <div class="py-5">
                <slot name="icon">
                    <lottie-animation
                        :path="lottiepath"
                        :width="iconwidth"
                        :height="iconheight"
                        :speed="1"
                    />
                </slot>
            </div>
            <div class="text-4xl">
                <label for="">{{ title ? title : '' }}</label>
            </div>
            <div class="text-sm text-gray-500">
                <span for="">{{ message ? message : '' }}</span>
            </div>
            <slot name="content"></slot>
            <div class="py-2 grid grid-flow-row gap-y-2 sm:px-0 md:px-5 lg:px-5">
                <da-button-gray  :label="calcelbtntext" rsm swmd class="py-1 px-5 font-light min-1/2 max-w-full"  @click.native="$emit('close', $attrs.value)" v-if="!hiddecancelbtn"  ></da-button-gray>
                <da-button-primary  :label="confirmbtntext" rsm swmd class="py-1 px-5 font-light min-1/2 max-w-full" @click.native="$emit('confirm', $attrs.value)" v-if="!hiddeconfirmbtn"  ></da-button-primary>
                <slot name="extrabutton"></slot>
            </div>
        </v-card-text>
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
        },
        lottiepath: {
            type: String,
            default: 'lottie/questions.json'
        },
        iconwidth: {
            type: Number,
            default: 200
        },
        iconheight: {
            type: Number,
            default: 200
        },
        hiddeconfirmbtn: Boolean,
        hiddecancelbtn: Boolean
    }
    }
</script>

<style lang="scss" scoped>

</style>
