import Vue from 'vue';

export default Vue.extend({
    name: 'roundeable',
    props: {
        rsm: Boolean,
        rmd: Boolean,
        rlg: Boolean,
        rxl: Boolean,
        r2xl: Boolean,
        rlcornerlg: Boolean,
        rrcornerlg: Boolean,
        rtlcornerlg: Boolean
    },
    computed: {
       // rounded-sm  rounded-lg, rounded-xl rounded-2xl
        roundeableClass() {
            return {
                'rounded-sm': this.rms,
                'rounded-md': this.rmd,
                'rounded-lg': this.rlg,
                'rounded-xl': this.rxl,
                'rounded-2xl': this.r2xl,
                'rounded-tl-lg rounded-bl-lg': this.rlcornerlg,
                'rounded-tr-lg rounded-br-lg': this.rrcornerlg,
                'rounded-tl-lg rounded-tr-lg': this.rtlcornerlg,
            }
        }
    }
})