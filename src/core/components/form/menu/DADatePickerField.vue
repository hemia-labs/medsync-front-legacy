<template>
    <v-menu
        ref="menu"
        v-model="menu"
        :close-on-content-click="false"
        transition="scale-transition"
        offset-y
        lang="es-MX"
        max-width="290px"
        :disabled="isdisabled"
    >
        <template v-slot:activator="{ on: onMenu }">
            <v-text-field
            :label="label"
            :placeholder="placeholder"
            :color="themePrimary"
            v-model="formattedDate"
            v-bind="$attrs"
            ref="datePicker"
            v-mask="'##-##-####'"
            >
            <template slot="append">
                        <svg v-on="{ ...onMenu, ...$listeners }" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-chevron-down" width="25" height="25" viewBox="0 0 24 24" stroke-width="1.5" stroke="#9e9e9e" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
            </template>
            </v-text-field>
        </template>
        <v-date-picker
        no-title
        scrollable
        landscape
        :header-color="themePrimary900"
        locale="es"
        v-model="internalDate"
        @input="onDatePickerValueChanged"
        >
        </v-date-picker>
    </v-menu>
</template>

<script>

import moment from 'moment';
import {formatFecha} from '../../../../utils/date';

export default {

    props: {
        isdisabled: {
            type: Boolean,
            default: false
        },
        value: {
            type: String,
            default: (new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString()
        },
        max: {
            type: String,
            default: null,
        },
        format: {
            type: String,
            default: 'DD-MM-YYYY',
            validator: function(val) {
                return ['YYYY-MM-dd',  'DD-MM-YYYY'].includes(val);
            }
        },
        label: String,
        placeholder: String
    },
    data: function() {
        return {
            menu: false,
            internalDate: this.value,
            internalDateValue: this.value,
        }
    },
    computed: {
        themePrimary: function() {
            return 'var(--color-primary-700)';
        },
        themePrimary900: function() {
            return 'var(--color-primary-900)';
        },
        formattedDate: {
           get: function() {
                return this.internalDateValue  && this.internalDateValue.length === 10 ? moment(this.internalDate).format("DD-MM-YYYY") : this.internalDateValue;
           },
           set: function(newValue) {
            if (newValue && newValue.length < 11) {
                if (newValue.length === 2 || newValue.length === 5) {
                    this.internalDateValue = newValue + "-";
                    this.internalDate = null;
                } else if (newValue.length === 10) {
                    let newDate = `${newValue.substring(6, 10)}-${newValue.substring(
                    3,
                    5
                    )}-${newValue.substring(0, 2)}`;
                    let newDateObject = new Date(newDate);
                    if (this.isValidDate(newDateObject)) {
                    if (
                        this.max !== null &&
                        new Date(this.max).getTime() < newDateObject.getTime()
                    ) {
                        this.internalDate = this.max;
                        this.internalDateValue = this.max;
                    } else {
                        this.internalDate = newDate;
                        this.internalDateValue = newDate;
                    }
                    } else {
                    this.internalDate = null;
                    this.internalDateValue = null;
                    this.$refs.datePicker.internalValue = null;
                    }
                    this.$emit("update", this.internalDate);
                } else {
                    this.internalDateValue = newValue;
                    this.internalDate = null;
                }
                } else {
                this.internalDate = null;
                this.internalDateValue = null;
                this.$emit("update",  this.internalDate);
                }
           }
        }
    },
    methods: {
        formatFecha,
        isValidDate(val) {
            if (Object.prototype.toString.call(val) === "[object Date]") {
                return !isNaN(val.getTime());
            } else {
                return false;
            }
        },
        onDatePickerValueChanged() {
            this.$emit("update", this.internalDate);
            this.menu = false;
        },
    },
    watch: {
        value(val) {
            this.internalDate = val && val.length < 10 ? null : val;
            this.internalDateValue = val;
        },

    }
}
</script>

<style>

</style>
