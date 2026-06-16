<template>
    <div>
        <div>
           
            <div class="flex justify-end items-center gap-2">
                <span class="font-sans font-medium text-gray-600">Tipo de Odontograma:</span>
                  <v-radio-group v-model="odontotypeValue" row>
                    <v-radio
                      v-for="(otype, idx) in toothtypes"
                      :key="idx"
                      :label="otype.description"
                      :value="otype.code"
                      @click="isUpdateType = true"
                    ></v-radio>
                  </v-radio-group>
              </div>
        </div>
        <div class="grid sm:grid-cols-1 md:grid-cols-2">

            <div class="flex justify-around items-start relative flex-wrap h-auto gap-y-5 gap-x-3  px-3 py-3" :class="{'md:border-r border-gray-500': x%2==0, 'md:border-l border-gray-500': x%2!=0, 'border-b-2': x != tooths.length - 1 && x != tooths.length - 2}" v-for="(item, x ) in  tooths" :key="x">
                    <div  v-for="(tooth, y) in  item" :key="y" >
                        <span class="flex justify-center font-sans text-gray-400 font-medium">{{ tooth.identity }}</span>
                        <div class="w-17 h-20" @click="onSelectTooth(tooth.id)" >
                            <div class="w-full h-full" style="display: flex; justify-content: center; align-items: center;">
                                <da-tooth :tooth="tooth" :read-only="readOnly" :symbol="tooth.symbol"></da-tooth>
                            </div>
                        </div>
                        <div class="border border-gray-200 rounded-sm flex justify-center items-center h-auto w-min" style="min-height: 20px; min-width: 100%;">
                            <v-menu
                                :close-on-content-click="false"
                                :nudge-width="300"
                                offset-x
                                :max-width="300"
                                :min-width="300"
                                class="bg-white"
                            >
                            <template v-slot:activator="{ on, attrs }">
                                <div class="inline-block w-17 text-center"  v-bind="attrs"  v-on="on">
                                    <span class="truncate block font-sans text-xs font-medium w-17"> {{ tooth.observation ? tooth.observation : '' }}</span>
                                </div>
                            </template>
                            <div class="bg-white">                                
                                <v-alert
                                    :border="'top'"
                                    colored-border
                                    type="info"
                                    elevation="0"
                                    class="mb-0"
                                    >
                                    <span class="font-sans tracking-wide font-normal">{{ tooth.observation ? tooth.observation : '' }}</span>
                                    </v-alert>
                            </div>
                            </v-menu>
                         
                        </div>
                    </div>
            </div>

        </div>

        <v-dialog 
                v-model="isToothDetail" 
                max-width="md" 
                max-height="md" 
                :persist="true"  
                :retain-focus="true"  
                width="700px" 
                :fullscreen="$vuetify.breakpoint.smAndDown"
                scrollable
                >
                <da-odontogram-tooth v-on:close="onClose" v-on:save="onSave" :hasEdited="hasEdited" :id="idToohSelected" :open="isToothDetail"></da-odontogram-tooth>
        </v-dialog>

        <da-dialog v-model="isUpdateType" :persist="true" :maxWidth="'500px'">
            <template #body>
            <da-sweet-confirm 
            :title="'Actualizar Odontograma'" 
            :message="'¿Desea actualizar el odontograma?, la información capturada se eliminará permanentemente.'"
            v-on:confirm="onConfirmType" 
            v-on:close="onCloseUpdateType">
            </da-sweet-confirm>
            </template>
    </da-dialog>



    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import DATooth from './DATooth.vue';
import DAOdontogramTooth from './DAOdontogramTooth.vue';
import VuexMixin from '../../../../mixins/VuexMixin'
import moduleTypes from '../../../../store/modules/common/module-types';
import fnTypes from '../../../../store/modules/common/fn-types';
import DASweetConfirm from '../../../../core/components/form/dialog/components/DASweetConfirm.vue'

    export default {
        mixins: [VuexMixin],
        props: {
            readOnly: {
                type: Boolean,
                default: true
            },
            id: {
                type: [String],
                default: ''
            },
            hasEdited: Boolean
        },
        components: {
            'da-tooth': DATooth,
            'da-odontogram-tooth': DAOdontogramTooth,
            'da-sweet-confirm': DASweetConfirm
        },
        data: function() {
            return {
               isToothDetail: false,
               idToohSelected: '',
               odontotype: this.codetypetooth,
               isUpdateType: false
            }
        },
        mounted() {
            this.init()
        },
        computed: {
            ...mapGetters(moduleTypes.ODONTOGRAM, {
                tooths: fnTypes.odontogram,
                toothtypes: fnTypes.getTypeTooth,
                codetypetooth: fnTypes.codetypetooth,
            }),
            odontotypeValue:  {
                get: function() {
                    return this.odontotype  ? this.odontotype : this.codetypetooth;
                },
                set: function (newvalue) {
                    this.odontotype = newvalue;
                }
            }
        },
        methods: {
            init: async function() {
                await this.ActionWrapp(moduleTypes.ODONTOGRAM, fnTypes.initOdontogram, {id: this.id, code: ''});
            },
            onSelectTooth: function(id) {
                this.idToohSelected = id;
                this.isToothDetail = true
            },
            onClose: function() {
                this.isToothDetail = false;
                this.idToohSelected = null;
            },
            onSave: function() {
                this.isToothDetail = false;
                this.idToohSelected = null;
                this.init()
            },
            onConfirmType: async function() {
                this.isUpdateType = false
                await this.ActionWrapp(moduleTypes.ODONTOGRAM, fnTypes.getOdontogram, {id: this.id, code:  this.odontotype});
            },
            onCloseUpdateType: function() {
                this.odontotype = this.codetypetooth
                this.isUpdateType = false
            }
        },
    }
</script>

<style lang="scss" scoped>
@media (min-width: 960px) {
  /* override max-width and max-height for LG and XL screens */
  .v-dialog--active.v-dialog--fullscreen {
    max-width: 80%;
    max-height: 100%;
  }
}

</style>