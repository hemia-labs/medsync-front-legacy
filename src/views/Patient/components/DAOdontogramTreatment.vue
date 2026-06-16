<template>
<v-card  class="px-3 py-3">
        <div class="flex justify-between items-center">
            <v-card-title>Diagnostico de región dental - {{ item.sec }}</v-card-title>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 hover:text-gray-400 cursor-pointer" @click="$emit('close')">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </div>
       
        <v-card-text class="py-3">
            <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
            <da-text-area-primary
                :label="'Diagnostico'"
                :value="odontogramDetail.treatment"
                v-model="$v.odontogramDetail.treatment.$model"
                :error="$v.odontogramDetail.treatment.$invalid && $v.odontogramDetail.treatment.$anyDirty" 
                :rows="6"
                text
                outlined
                autofocus
            />
        </div>
        </v-card-text>
        <div class="flex justify-end">
              <div class="flex gap-2 justify-end align-middle">
                  <da-button-primary @click.native="onSave"  :label="'GUARDAR'" r2xl swpr class="py-1 px-5 font-light"></da-button-primary>
                  <da-button-secondary @click.native="$emit('close')" :label="'CANCELAR'" rxl swsec class="py-1 px-5 font-light"></da-button-secondary>
              </div>
          </div>
    </v-card>

</template>

<script>
import fnTypes from '../../../store/modules/common/fn-types';
import moduleTypes from '../../../store/modules/common/module-types';
import {  mapState } from 'vuex';
import { validationMixin } from 'vuelidate';
import { required } from 'vuelidate/lib/validators';

import VuexMixin from '../../../mixins/VuexMixin';
import { buildOdontogramDetailPayload } from '../../../domain/odontogram/odontogram.builder';

export default {
    mixins: [validationMixin, VuexMixin],
    props:{
        item: {
            type: Object,
            default: function() {return {}}
        }
    },
    data: function() {
        return {
           
        }
    },
    validations: {
        odontogramDetail: {
            id_tooth: {
                required
            },
            treatment: {
                required
            },
            id_person: {
                required
            }
        }
    },
    computed: {
        ...mapState(moduleTypes.ODONTOGRAM, {
            odontogramDetail: fnTypes.odontogramDetail
      }),
        ...mapState(moduleTypes.PX, {
            id_person: fnTypes.id_person
      }),
    },
    
    methods: {
        onSave: async function() {
            this.$v.$touch();
              if(!this.$v.$anyError) {
                const data = buildOdontogramDetailPayload(this.odontogramDetail, this.id_person);
                await this.ActionWrapp(moduleTypes.ODONTOGRAM, fnTypes.saveOdontograDetail, {data, id_person: this.id_person});
                this.onClose();
              }
        },
        onClose() {
            this.$emit('close')
        }
    }
}

</script>
