<template>
    <v-card class="px-3 py-3">
        <div class="flex justify-between items-center">
            <v-card-title>Historial de odontogramas</v-card-title>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 hover:text-gray-400 cursor-pointer" @click="$emit('close')">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </div>
        <v-card-text>
            <div class=" sm:px-0 md:px-5 lg:px-5">
            <da-datatable :headers="headers" :values="history" :elevation="3" :hidesearch="false" :hidepagination="false">
                    <template #created_at="{data}">
                       {{  data.created_at  }}
                    </template>
                    <template #active="{data}">
                       <div class="flex w-full items-center justify-center">
                            <v-switch
                            :color="'#E7AC18'"
                            v-model="data.active"
                            inset
                            @change="onEvent(data, actions.CHANGEACTIVE)"
                            ></v-switch>
                       </div>
                    </template>
                    <template #actions="{data}">
                       <div class="flex w-full items-center justify-center">
                            <da-button-cancel @click.native="onEvent(data, actions.DELETE)"  :label="'Eliminar'" r2xl class="text-xs w-full px-1 tracking-wider bg-secondary-500 hover:bg-secondary-700" :class="{'rounded-xl': !data.ultimo}"></da-button-cancel>
                       </div>
                    </template>
                </da-datatable>
            </div>
        </v-card-text>

        <div class="flex justify-end">
              <div class="flex gap-2 justify-end align-middle">
                  <da-button-secondary @click.native="$emit('close')" :label="'CERRAR'" rxl swsec class="py-1 px-5 font-light"></da-button-secondary>
              </div>
        </div>

    <!-- DIALOG ACTIVAR / DESACTIVAR -->
    <da-dialog v-model="isChangeActive" :persist="true" :max-width="'500px'">
        <template #body>
            <ma-sweet-confirm 
            :title="'Activar / Desactivar'" 
            :message="'¿Desea activar o desactivar el odontograma seleccionado?'" 
            v-on:confirm="onChangeActive(odontogramEdit, true)" 
            v-on:close="onChangeActive(odontogramEdit, false)">
        </ma-sweet-confirm>
        </template>
    </da-dialog>

        <!-- DIALOG ELIMINAR -->
    <da-dialog v-model="isDelete" :persist="true" :max-width="'500px'">
        <template #body>
            <ma-sweet-confirm 
            :title="'Eliminar'"
            :lottiepath="DELETE"
            :message="'¿Desea eliminar el odontograma seleccionado?, esta acción no se puede revertir'" 
            v-on:confirm="onDelete(odontogramEdit)" 
            v-on:close="isDelete = false">
        </ma-sweet-confirm>
        </template>
    </da-dialog>

    </v-card>
</template>


<script>
import {mapGetters, mapActions, mapMutations } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import actions from '../../../utils/common/actions';
import mutationTypes from '../../../store/modules/common/mutation-types';
import DASweetConfirm from '../../../core/components/form/dialog/components/DASweetConfirm.vue';
import { DELETE } from '../../../utils/lottieicon';
import {
    buildOdontogramDeletePayload,
    buildOdontogramStatusPayload
} from '../../../domain/odontogram/odontogram.builder';

export default {
    props: {
        id: {
            type: String,
            default: ""
        },
        open: Boolean
    },
    data: function() {
        return {
            actions,
            isChangeActive: false,
            isDelete: false,
            DELETE,
            headers: [
                { text: 'Código',               value: 'code' },
                { text: 'Descripción',          value: 'description' },
                { text: 'Fecha de Alta',        value: 'created_at' },
                { text: 'Activo',               value: 'active' },
                { text: 'Acción',               value: 'actions' },
            ],
        }
    },
    components: {
        'ma-sweet-confirm': DASweetConfirm,
    },
    mounted() {
            this.init();
    },
    computed: {
        ...mapGetters(moduleTypes.ODONTOGRAM, {
            hasError: fnTypes.hasError,
            history: fnTypes.history,
            odontogramEdit: fnTypes.odontogramEdit,
        }),
    },
    methods: {
        ...mapMutations(moduleTypes.ODONTOGRAM, [
            mutationTypes.SET_ODONTOGRAM_EDIT
        ]),
        ...mapActions(moduleTypes.ODONTOGRAM, [
                fnTypes.getOdontogramHistory, fnTypes.status, fnTypes.delete
        ]),
        init: async function() {
                await this.getOdontogramHistory(this.id)
        },
        onEvent: function(data, action) {
                const modelData = {...data};

                switch(action) {
                    case actions.DELETE:
                    this.SET_ODONTOGRAM_EDIT(modelData);
                    this.isDelete = true;
                    break;
                    case actions.CHANGEACTIVE:
                    this.SET_ODONTOGRAM_EDIT(modelData);
                    this.isChangeActive = true;
                    break;
                }
            },
            onChangeActive: async function(data, confirm) {
                this.isChangeActive = false;
                if(!confirm){
                    let item =  this.history.find(x => x.id_odontogramv1 == data.id_odontogramv1 ) ;
                    if(item) {item.active = !item.active; return; }
                }
                const dataModel = buildOdontogramStatusPayload(data.id_odontogramv1, data.active)
                await this.status({data: dataModel, id: this.id});
                this.$emit('close');
            },
            onDelete: async function(data) {
                this.isDelete = false;
                const dataModel = buildOdontogramDeletePayload(data.id_odontogramv1);
                await this.delete({data: dataModel, id: this.id});
               
            },
    },
    watch: {
        open: function(newValue) {
            if(newValue) {
                this.init()
            }
            
        }
    }
}

</script>
