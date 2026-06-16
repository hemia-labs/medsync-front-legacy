<template>
    <v-menu
        ref="menu"
        v-model="menu"
        :close-on-content-click="false"
        :return-value.sync="date"
        transition="scale-transition"
        lang="es-MX"
        width="290px"
        :disabled="isdisabled"
    >
        <template v-slot:activator="{ on, attrs }">
            <div  v-bind="attrs" v-on="on">
                <slot name="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-chevron-down" width="25" height="25" viewBox="0 0 24 24" stroke-width="1.5" stroke="#9e9e9e" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <polyline points="6 9 12 15 18 9" />
                            </svg>
                </slot>
            </div>
        </template>
        <v-date-picker
        v-model="date"
        no-title
        scrollable
        landscape
        :header-color="themePrimary900"
        locale="es"
        @change="$refs.menu.save(date)"
        >
        </v-date-picker>
    </v-menu>
</template>

<script>


export default {
    props: {
        isdisabled: {
            type: Boolean,
            default: false
        },
        datevalue: {
            type: String,
            default: (new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString()
        }
    },
    data: function() {
        return {
            menu: false,
            dateprop: (new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString()
        }
    },
    computed: {
        themePrimary900: function() {
            return 'var(--color-primary-900)';
        },
        date: {
           get: function() {
                return this.dateprop ? this.dateprop : (new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString()
           },
           set: function(val) {
              this.dateprop = val
              
           }
        }
    },
    methods: {

    },
    watch: {
        date: function() {
            //this.profile.person.birthdate = this.date;
            this.$emit('date', this.date )
        },
        datevalue: function() {
            if(this.datevalue) {
                this.dateprop = this.datevalue;
            }
        }
    }
}
</script>

<style>

</style>
