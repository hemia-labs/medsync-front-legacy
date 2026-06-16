import Vue from 'vue';

export default Vue.extend({
    name: 'typeable',

    props: {
        text: Boolean,
        number: Boolean,
        password: Boolean,
        tel: Boolean,
        email: Boolean,
        button: Boolean,
    },


    computed: {
        typeableClass() {
            return {
                'text': this.text,
                'number': this.number,
                'password': this.password,
                'tel': this.tel,
                'email': this.email,
                'button': this.button
            }
        }
    }

})