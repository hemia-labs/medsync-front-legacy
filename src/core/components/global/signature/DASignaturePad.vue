<template>
    <div>
    <VueSignaturePad
        id="signature"
        width="100%"
        :height="height"
        ref="signaturePad"
        class="signature-success"
        :options="signaturepadOptions"
    />
    <small v-if="isSignatureEmpty" class="error-text">* La firma es requerida</small>
    <div v-if="showActions" class="flex flex-wrap justify-start py-5 md:px-0 lg:px-5 gap-5">
        <da-button-gray         :label="'Deshacer'" @click.native="undo" rmd class="py-1 md:px-1 lg:px-5 font-light"></da-button-gray>
        <da-button-secondary    :label="'Limpiar'" @click.native="clear" rmd class="py-1 md:px-1 lg:px-5 font-light"></da-button-secondary>
        <da-button-primary      :label="'Aplicar'"  @click.native="save" rmd class="py-1 md:px-1 lg:px-5 font-light"></da-button-primary>
    </div>

</div>
</template>

<script>
export default {
    props: {
        required: Boolean,
        trackChanges: { type: Boolean, default: false },
        showActions: {
            type: Boolean,
            default: true
        },
        height: {
            type: String,
            default: '300px'
        }
    },
    data() {
        return {
            signaturepadOptions: {
                penColor: "#000000",
                scaleToDevicePixelRatio: true
            },
            isSignatureEmpty: false
        }
    },
    created() {
        if (this.trackChanges) this.signaturepadOptions.onEnd = this.notifyChange;
    },
    methods: {
        notifyChange() {
            if (!this.trackChanges || !this.$refs.signaturePad) return;
            const { isEmpty } = this.$refs.signaturePad.saveSignature();
            this.$emit('changed', { isEmpty });
        },
        undo() {
            this.$refs.signaturePad.undoSignature();
            this.notifyChange();
        },
        clear() {
            this.$refs.signaturePad.clearSignature();
            this.notifyChange();
        },
        save() {
            this.isSignatureEmpty = false;
            const { isEmpty, data } = this.$refs.signaturePad.saveSignature();
            if(isEmpty && this.required) {this.isSignatureEmpty = isEmpty; return}
          
            this.$emit('signed', data)
        }
    }

}
</script>

<style scoped>

#signature {
  border: 2px solid var(--color-primary-700, #1497BD);
  border-radius: 5px;
  background-color: #fff;
}

</style>
