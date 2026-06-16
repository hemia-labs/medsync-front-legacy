<template>
    <v-card class="bg-white">
        <v-card-title class="flex justify-end items-center">
            <div class="flex justify-center items-center text-2xl tracking-wide font-sans font-medium text-gray-500">
                <label for="">Información Dental</label>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 cursor-pointer" @click="$emit('close')">
             <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </v-card-title>
        <v-card-text class="gap-y-5 items-start">
            
            <div class="grid sm:grid-cols-1 md:grid-cols-3 gap-y-5 items-start py-5">

                <div class="col-span-1 sm:border-b md:border-r md:border-b-0  border-gray-400">
                    <div>
                        <div class="flex justify-center items-center text-lg tracking-wide font-sans font-medium text-gray-500">
                           <div class="grid text-center">
                            <label for="">Vista Previa </label>
                            <span >[P-{{ PART_SELECTED ? PART_SELECTED : 'G' }}]</span>
                           </div>
                        </div>
                        <div class="flex justify-center py-3">
                            <div class="w-28 h-32 ">
                                <da-tooth :tooth="toothConfig" 
                                :action="onSelectTooth" 
                                :symbol="null" 
                                :read-only="globalTooth == 1 ? true : false" 
                                :color="globalTooth == 1 ? toothConfig.color : part.color" 
                                :id="tooth.id_tooth" 
                                :globalcolor="globalTooth == 1 && toothConfig.general ? toothConfig.general.color :  '#ddd'"
                                ref="toothref"
                                :color1="sectioncolors.uno"
                                :color2="sectioncolors.dos"
                                :color3="sectioncolors.tres"
                                :color4="sectioncolors.cuatro"
                                :color5="sectioncolors.cinco"
                                >
                            </da-tooth>
                            </div>
                        </div>
                            <v-radio-group v-model="globalTooth" row>
                                <v-radio
                                    v-for="n in toothoptions"
                                    :key="n.id"
                                    :label="`${n.label ? n.label : ''}`"
                                    :value="n.id"
                                ></v-radio>
                            </v-radio-group>
                        
                     </div>
                </div>
                <div class="col-span-2">
                    <div class="flex justify-center items-center text-lg tracking-wide font-sans font-medium text-gray-500">
                            <label for="">Observación</label>
                    </div>
                    <div class="px-2 py-3">
                        <da-text-area-primary 
                            :label="'Observaciones generales:'"
                            :value="$v.tooth.observation"
                            :error="$v.tooth.observation.$invalid && $v.tooth.observation.$anyDirty" 
                            :rows="5"
                            v-model="$v.tooth.observation.$model"
                            text
                            outlined
                            :disabled="!hasEdited"
                        />
                    </div>
                   <div class="px-2">
                    <small class="font-sans font-medium">Más Acciones</small>
                    <v-divider></v-divider>
                   </div>
                    <div class="px-2 py-2">
                        <button @click="onDeleteColor" :disabled="!PART_SELECTED" class="bg-gray-200 font-sans font-medium tracking-wide py-1 px-1 hover:bg-red-500 hover:text-white hover:shadow-md rounded-sm">
                            <small>Eliminar color</small>
                        </button>
                    </div>
                </div>

            </div>
            <div class="grid sm:grid-cols-1">
            <v-tabs 
                    v-model="tab" 
                    color="blue-grey darken-1" 
                    background-color="blue-grey lighten-5" 
                    next-icon="mdi-chevron-right"
                    prev-icon="mdi-chevron-left"
                    active-class="active-tab"
                    :show-arrows="true"
                    grow
                    class="rounded-tl-lg rounded-tr-lg" 
                    v-if="configuration && configuration.length > 0" 
                >
                <v-tabs-slider color="blue-grey darken-1"></v-tabs-slider>
                <v-tab dark  v-for="(item, i)  in configuration" :key="i" class="capitalize">
                    {{item.name ? item.name : ''}}
                </v-tab>
            </v-tabs>
            <v-tabs-items v-model="tab">
                <v-tab-item >
                        <div class="px-5 py-5">
                            <small class="font-sans font-medium">Condición</small>
                            <v-divider></v-divider>
                           
                            <div class="grid grid-cols-1 md:grid-cols-2 px-1 py-1 gap-5">
                                <div  class="flex items-center gap-2" v-for="(ch, idy) in conditions "  :key="idy">
                                <v-checkbox
                                    v-if="globalTooth == 1"
                                    :label="ch.label"
                                    :value="ch.id_cat_condition"
                                    color="gray"
                                    hide-details
                                    class="mt-0 pt-0"
                                    v-model="$v.toothConfig.general.conditions.$model"
                                    :disabled="!hasEdited"
                                ></v-checkbox>
                                <v-checkbox
                                    v-else
                                    :label="ch.label"
                                    :value="ch.id_cat_condition"
                                    color="gray"
                                    hide-details
                                    class="mt-0 pt-0"
                                    v-model="part.conditions"
                                    :disabled="!hasEdited || ( part.part == null || part.part == '' )"
                                ></v-checkbox>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 py-5 gap-5">
                                <div>
                                    <small class="font-sans font-medium">Predeterminado</small>
                                    <v-divider></v-divider>
                                </div>
                                <v-select
                                    :items="conditionsdefault"
                                    :item-text="'label'"
                                    :item-value="'identity'"
                                    label="Seleccione una opción"
                                    v-model="$v.tooth.symbol.$model"
                                    dense
                                    ></v-select>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 px-1 py-2 gap-5">
                                <div>
                                    <small class="font-sans font-medium">Color</small>
                                    <v-divider></v-divider>
                                    <v-color-picker
                                    class="ma-2"
                                    :swatches="swatches"
                                    show-swatches
                                    hide-sliders
                                    hide-mode-switch
                                    hide-inputs
                                    hide-canvas
                                    :disabled="!hasEdited || (globalTooth == 2 && ( part.part == null || part.part == '' ) )"
                                    v-model="colorpainted"
                                    @input="onSelectColor(globalTooth, colorpainted)"
                                    ></v-color-picker>
                                </div>
                                <div>
                                    <small class="font-sans font-medium">Símbolo</small>
                                    <v-divider></v-divider>
                                    <div class="flex justify-center items-center py-1">
                                        <div class="w-17 h-20"  >
                                            <div class="w-full h-full" style="display: flex; justify-content: center; align-items: center;">
                                                <da-tooth :tooth="toothConfig" :read-only="true" :symbol="identity"  :globalcolor="globalTooth == 1 && toothConfig.general ? toothConfig.general.color :  '#ddd'"></da-tooth>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                </v-tab-item>
            </v-tabs-items>
            </div>
            
            <div class="flex justify-end">
              <div class="flex gap-2 justify-end align-middle">
                  <da-button-primary @click.native="onSave"  :label="'APLICAR'" rlg swpr class="py-1 px-5 font-light"></da-button-primary>
              </div>
          </div>
        </v-card-text>
       
    </v-card>
</template>

<script>
import {mapActions, mapGetters} from 'vuex'
import DATooth from './DATooth.vue';
import { validationMixin } from 'vuelidate';
import moduleTypes from '../../../../store/modules/common/module-types';
import fnTypes from '../../../../store/modules/common/fn-types';
import DAToothModel from '../../../../models/odontogram/DATooth.model';
import DAToothConfig from '../../../../models/odontogram/DAToothConfig.model';
import DAToothCondition from '../../../../models/odontogram/DAToothCondition.model';

    export default {
        mixins: [validationMixin],
        props: {
            id: {
                type: String,
                default: ''
            },
            hasEdited: Boolean,
            open: Boolean
        },
        components: {
            'da-tooth': DATooth
        },
        data: function() {
            return {
                tooth:  new DAToothModel(),
                toothConfig:  new DAToothConfig(),
                part : new DAToothCondition(),
                tab: 0,
                configuration: [
                    {name: 'Estado y Práctica'}
                ],
                globalTooth: 1,
                toothoptions: [
                    {id: 1, label: 'General'},
                    {id: 2, label: 'Sección'},
                ],
                swatches: [
                    ['#F92D15', '#1580F9', '#F9E415'],
                    ['#FF5733', '#4BE910', '#010400'],
                    ['#00FF00', '#00AA00', '#005500'],
                    ['#00FFFF', '#00AAAA', '#ebebeb'],
                    ['#ddd'],
                ],
                colorpainted: '#ebebeb',
                DEFAULT_COLOR: '#ebebeb',
                DEFAULT_COLOR_UPPER: "#EBEBEB",
                PART_SELECTED: null
            }
        },
        validations: {
            tooth: {
                observation: {
                    required: false
                },
                symbol: {
                    required: false
                }
            },
            toothConfig: {
                general: {
                    conditions:  {
                        required: false
                    }
                }
            }
        },
        computed: {
            ...mapGetters(moduleTypes.CONDITION, {
                conditions: fnTypes.conditions
            }),
            ...mapGetters(moduleTypes.PX, {
                id_person: fnTypes.id_person
            }),
            ...mapGetters(moduleTypes.ODONTOGRAM, {
                toothModel: fnTypes.getTooth,
                hasError: fnTypes.hasError,
            }),
            conditionsdefault: function() {
                let options = this.conditions.filter(x =>  this.toothConfig.general.conditions.includes(x.id_cat_condition))
                return options;
            },
            identity: function() {
                let cond = this.conditions.find(x => x.id_cat_condition ==  (this.globalTooth == 1 ? this.toothConfig.general.conditions[this.toothConfig.general.conditions.length - 1] : this.part.conditions[this.part.conditions.length - 1] ) )
                var identity = cond ? cond.identity : -1

                return identity;
            },
            sectioncolors:  function() {
                let colors = this.toothConfig.sections.map((x) => {return { p: x.part, c: x.color }  })
                let objectColor = {
                    uno: colors.find(x => x.p == 1 && x.c != this.DEFAULT_COLOR_UPPER) ? colors.find(x => x.p == 1).c : '#ffffff',
                    dos: colors.find(x => x.p == 2 && x.c != this.DEFAULT_COLOR_UPPER) ? colors.find(x => x.p == 2).c : '#ffffff',
                    tres: colors.find(x => x.p == 3 && x.c != this.DEFAULT_COLOR_UPPER) ? colors.find(x => x.p == 3).c : '#ffffff',
                    cuatro: colors.find(x => x.p == 4 && x.c != this.DEFAULT_COLOR_UPPER) ? colors.find(x => x.p == 4).c : '#ffffff',
                    cinco: colors.find(x => x.p == 5 && x.c != this.DEFAULT_COLOR_UPPER) ? colors.find(x => x.p == 5).c : '#ffffff'
                }
                  return objectColor
            }
        },
        created() {
          this.init()
        },
       
        methods: {
            init: async function() {
                this.tooth = new DAToothModel()
                this.PART_SELECTED = null;
                this.globalTooth = 1;
                await this.getConditions()
                await this.getTooth({id: this.id, id_person:  this.id_person})
            },
            ...mapActions(moduleTypes.CONDITION, [
                fnTypes.getConditions
            ]),
            ...mapActions(moduleTypes.ODONTOGRAM, [
                fnTypes.getTooth, fnTypes.onSaveTooth
            ]),
            onSelectTooth: function(id, id_part, selected = true) {
                if(this.globalTooth == 1) return;
                this.PART_SELECTED =  selected ? id_part : null;

                let findSection = this.toothConfig.sections.find(x => x.part == id_part)
               
                if(findSection) {
                    this.part = findSection
                    this.colorpainted = findSection.color ? findSection.color : this.DEFAULT_COLOR
                }else {
                    this.part = new DAToothCondition()
                    this.part.part = id_part
                    this.colorpainted = this.DEFAULT_COLOR
                    this.toothConfig.sections.push(this.part)
                }

            },
            onSelectColor: function(global, color) {
                if(global == 1) {
                    this.toothConfig.general.color = color;
                }else {
                    this.part.color = color;
                }
            },
            onSave: async function() {

                //FILTER REMOVE EMPTY VALUES
                let notEmptyValues = this.toothConfig.sections.filter(x => x.conditions.length > 0 || ( x.color != this.DEFAULT_COLOR && x.color != this.DEFAULT_COLOR_UPPER ) )
                this.toothConfig.sections = notEmptyValues;

                this.tooth.config = [this.toothConfig];

                await this.onSaveTooth(this.tooth)
                this.PART_SELECTED = null;
                if(!this.hasError) {
                    this.$emit('save')
                }
            },
            onDeleteColor: function() {
                if(this.PART_SELECTED) {
                    this.part.color = this.DEFAULT_COLOR_UPPER
                }
            }
        },
        watch: {
            open: function() {
                if(this.open) {
                    this.init()
                }
            },
            toothModel: function() {
                if(this.toothModel) {
                    this.tooth = this.toothModel;
                    this.toothConfig = this.toothModel.config.length > 0 ? this.toothModel.config[0] : new DAToothConfig()
                    this.colorpainted = this.toothConfig.general ? this.toothConfig.general.color : this.DEFAULT_COLOR
                }
            },
            globalTooth: function() {
                this.part = new DAToothCondition()
                if(this.globalTooth == 1) {
                    this.colorpainted = this.toothConfig.general.color
                    this.PART_SELECTED = null
                }else if(this.globalTooth == 2 && ( this.part.part == null ||  this.part.part == '' ) ) {
                    this.colorpainted = this.DEFAULT_COLOR;
                }
            },
            conditionsdefault: function() {
                if(this.conditionsdefault && this.conditionsdefault.length == 1) {
                    this.tooth.symbol = this.conditionsdefault[0] ? this.conditionsdefault[0].identity : ''
                }
            }
        }
        
    }
</script>

<style lang="scss" scoped>

</style>