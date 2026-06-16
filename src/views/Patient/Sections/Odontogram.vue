<template>
  <div class="w-full h-full px-5 py-5">
    <da-header-title :title="'Odontograma'" class=" font-medium tracking-wider">
      <template #actions>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon v-bind="attrs" v-on="on" @click="isOpenHistory = true">
              <v-icon  color="#E7AC18">mdi-history</v-icon>
            </v-btn>
          </template>
          <span>Historial</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon v-bind="attrs" v-on="on" @click="addOdontograma = true">
              <v-icon  color="#E7AC18">mdi-file-plus</v-icon>
            </v-btn>
          </template>
          <span>Agregar Nuevo</span>
        </v-tooltip>
        <v-tooltip bottom v-if="id_odontogram">
            <template v-slot:activator="{ on, attrs }">
              <v-btn  @click="isChangeActive = true" icon v-bind="attrs" v-on="on">       
                <v-icon  color="#E7AC18">mdi-close-octagon</v-icon>
              </v-btn>
            </template>
            <span>Finalizar</span>
          </v-tooltip>
      </template>
      </da-header-title>
      
    <div>
         <div class="py-5">
          <!--
          <div class="flex justify-end items-center gap-2" v-if="id_odontogram">
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
            -->

            <div v-if="!id_odontogram" class="font-sans text-xl text-gray-400 font-medium text-center">
              <span>El paciente no cuenta con Odontograma, seleccionar crear uno</span>
            </div>

           <da-datatable :headers="headers" :values="odontogram" :elevation="0" :hidesearch="false" :hidepagination="false" v-if="id_odontogram" :itemsperpage="32">
            <template #amount="{data, header}">
                    <da-scoped-column>
                      <template #header>{{header ? header : '' }}</template>
                  </da-scoped-column>
            </template>
            <template #treatment="{ data }">
              <div class="flex items-center justify-between py-1 px-1"    v-if="!data.treatment">
                <span class="underline text-yellow-800">Agrega un diagnostico a la región dental (opcional)</span>
                <v-btn
                  outlined
                  fab
                  small
                  color="#E7AC18"
                  @click="onEditOdontogramTreatment(data)"
                >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              </div>
              <div class="flex items-center justify-between py-1 px-1 gap-x-2"    v-if="data.treatment">
                <div class="flex-grow">
                  <span >{{ data.treatment }}</span>
                </div>

                <div class="grid gap-y-1 ">
                  <v-btn outlined fab color="#E7AC18" small  @click="onEditOdontogramTreatment(data)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                </div>

              </div>

            </template>
          </da-datatable>

         </div>
      </div>

      <da-dialog v-model="openOdontogramTreatment" :persist="true">
        <template #body>
            <da-odontogram-treatment
            :item="odontogramSelected"
            v-on:close="openOdontogramTreatment = false"
            v-if="openOdontogramTreatment"
            >
            </da-odontogram-treatment>
        </template>
    </da-dialog>

    
    <da-dialog v-model="isDelete" :persist="true" :maxWidth="'500px'">
        <template #body>
            <da-sweet-confirm 
            :title="'Eliminar Diagnostico'" 
            :message="'¿Está seguro de eliminar el diagnostico seleccionado?'"
            :lottiepath="DELETE"
            :iconwidth="150"
            :iconheight="150"
            v-on:confirm="isDelete = false" 
            v-on:close="isDelete = false">
        </da-sweet-confirm>
        </template>
    </da-dialog>

          <!-- MODAL NUEVO ODONTOGRAMA -->
    <da-dialog v-model="addOdontograma" :persist="true" :maxWidth="'500px'">
      <template #body>
          <da-sweet-confirm 
          :title="'Crear nuevo odontograma'" 
          :message="'¿Estás seguro que deseas crear un nuevo odontograma?, si cuentas con uno activo, este será desactivado'"
          :iconwidth="150"
          :iconheight="150"
          :hiddeconfirmbtn="true"
          v-on:close="addOdontograma = false">
          <template #extrabutton>
            <da-button-primary v-for="(item, i) in toothtypes" :key="i" :label="item.description" @click.native="onSaveParent(item.code)" rsm swmd class="py-1 px-5 font-light min-1/2 max-w-full" ></da-button-primary>
          </template>
      </da-sweet-confirm>
      </template>
    </da-dialog>

      <!-- DIALOG ACTIVAR / DESACTIVAR -->
      <da-dialog v-model="isChangeActive" :persist="true" :max-width="'500px'">
        <template #body>
            <da-sweet-confirm 
            :title="'Finalizar'" 
            :message="'¿Desea finalizar el odontograma seleccionado?'" 
            v-on:confirm="onChangeActive(id_odontogram, true)" 
            v-on:close="onChangeActive(id_odontogram, false)">
        </da-sweet-confirm>
        </template>
    </da-dialog>

      <!-- DIALOG HISTORY -->
    <da-dialog v-model="isOpenHistory" :persist="true" :max-width="'900px'">
        <template #body>
           <da-odontogram-history
           :open="isOpenHistory" 
           :id="px.person.id_person"       
            v-on:close="isOpenHistory = false"
           ></da-odontogram-history>
        </template>
    </da-dialog>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import DASweetConfirm from '../../../core/components/form/dialog/components/DASweetConfirm.vue';
import { DELETE } from '../../../utils/lottieicon';
import VuexMixin from '../../../mixins/VuexMixin';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import {
  buildOdontogramParentPayload,
  buildOdontogramStatusPayload
} from "../../../domain/odontogram/odontogram.builder";

export default {
  mixins: [VuexMixin],
  props: {
    px: {
      type: Object,
      default: function(){return {}}
    }
  },
  data: function() {
    return {
      addOdontograma: false,
      openOdontogramTreatment: false,
      isDelete: false,
      isChangeActive: false,
      isOpenHistory: false,
      DELETE,
      headers: [
          { text: 'Región dental', value: 'sec' },
          { text: 'Diagnostico', value: 'treatment' },
      ],
      odontogramSelected: {}
    }
  },
  components: {
    'da-sweet-confirm': DASweetConfirm,
    'da-odontogram-treatment': () => import("../components/DAOdontogramTreatment.vue"),
    'da-odontogram-history': () => import("../components/DAOdontogramHistory.vue")
  },
  mounted() {
      this.init();
  },
  computed: {
    ...mapGetters(moduleTypes.ODONTOGRAM, {
          toothtypes: fnTypes.getTypeTooth,
          id_odontogram: fnTypes.id_odontogram,
          odontogram: fnTypes.odontogram,
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
    ...mapActions(moduleTypes.ODONTOGRAM, [
            fnTypes.setOdontogramDetail, fnTypes.status
    ]),
    init: async function() {
        await this.ActionWrapp(moduleTypes.ODONTOGRAM, fnTypes.initOdontogram, {id: this.px.person.id_person});  
    },
    onshowDelete: function(data){
        this.odontogramSelected = data;
        this.isDelete = true
    },

    onEditOdontogramTreatment: function(data) {
      this.setOdontogramDetail(data);
      this.odontogramSelected = data;
      this.openOdontogramTreatment = true;
    },
    onSaveParent: async function(code) {
        const data = buildOdontogramParentPayload(this.px.person.id_person, code);
        this.addOdontograma = false;
        await this.ActionWrapp(moduleTypes.ODONTOGRAM, fnTypes.save, data);
        
    },
    onChangeActive: async function(data, confirm) {
        this.isChangeActive = false;
        if(!confirm){
          return
        }
        const dataModel = buildOdontogramStatusPayload(data, false)
        await this.status({data: dataModel, id: this.px.person.id_person});
    },
    
  },
  watch: {
    id_odontogram(newValue) {
      if (!newValue || newValue.length <= 0) {
        this.addOdontograma = true;
      }
    }
  }
}
</script>

<style>

</style>
