import Vue from 'vue';

export default Vue.extend({
    name: 'elevatable',
    props: {
        swsm: Boolean,
        swmd: Boolean,
        swlg: Boolean,
        swxl: Boolean,
        swpr: Boolean,
        swsec: Boolean
    },
    computed: {
        elevatableClass() {
            return {
                'shadow-sm': this.swsm,
                'shadow-md': this.swmd,
                'shadow-lg': this.swlg,
                'shadow-xl': this.swxl,
                'box-shadow-primary': this.swpr,
                'box-shadow-secondary': this.swsec,
            }
        }
    }
})