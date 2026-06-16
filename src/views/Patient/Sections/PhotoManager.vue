<template>
  <div class="w-full h-full">
    <da-loader v-bind:overlay="isLoading"></da-loader>
    <da-header-title :title="'Archivo de Fotos'" class="shadow-md font-medium tracking-wider" rtlcornerlg>
      <template #actions>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon v-bind="attrs" v-on="on" @click="showDialog()">
              <v-icon  color="#E7AC18">mdi-file-plus</v-icon>
            </v-btn>
          </template>
          <span>Agregar Foto</span>
        </v-tooltip>
      </template>
    </da-header-title>
    <div class="mt-5 ">
      <!-- {{hasErrorPhoto}} -->
      <da-header-title :title="'Rayos X'" class=" font-medium tracking-wider" />
      <div class="ml-4 mr-4 mt-5">

        <v-row v-if="listaRayosX.length > 0" class="images clearfix " v-viewer >
          <v-col v-for="n in listaRayosX" :key="n.id_files" class="" cols="4">
            <div class="text-center">
                <img class="image rounded-md shadow-xl md:w-auto lg:w-72 sm:h-17 md:h-auto lg:h-60" :src="n.url" @click="showDialogPhoto(n,'C81E72')" >
              <div class="flex justify-center mt-1 border-b-2 border-gray-200">
                <v-menu class="pb-1">
                  <template v-slot:activator="{ on  }">
                    <v-btn v-on="on" icon>
                      <v-icon  color="#E7AC18">mdi mdi-dots-horizontal</v-icon>
                    </v-btn>
                  </template>

                  <v-list>
                    <v-list-item class="hover:bg-primary-300 rounded-md cursor-pointer"  @click="downloadImage(n.url)">

                      <v-list-item-title class="text-primary-900 font-mono0">Descargar</v-list-item-title>
                    </v-list-item>
                    <v-list-item class="hover:bg-primary-300 rounded-md cursor-pointer"  @click="deleteImage(n.url,'C81E72')">
                      <v-list-item-title class="text-primary-900 font-mono">Eliminar </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </div>
          </v-col>
        </v-row>
        <v-row v-else> 
          <div class="w-full">
          <h1 class="text-center text-gray-400 mt-5 mb-5">No hay elementos</h1>
          </div>  
        </v-row>
      </div>
    </div>
    <div class="mt-5 mb-5">
      <da-header-title :title="'Fotos'" class=" font-medium tracking-wider" />
      <div class="ml-4 mr-4 mt-5">

        <v-row v-if="listaFotos.length > 0" class="images clearfix " v-viewer >
          <v-col v-for="n in listaFotos" :key="n.id_files" class="" cols="4">
            <div class="text-center">

                <img class="image rounded-md shadow-xl md:w-auto lg:w-72 sm:h-17 md:h-auto lg:h-60" :src="n.url" @click="showDialogPhoto(n,'C4CA42')" >

              <div class="flex justify-center mt-1 border-b-2 border-gray-200">
                <v-menu class="pb-1">
                  <template v-slot:activator="{ on  }">
                    <v-btn v-on="on" icon>
                      <v-icon  color="#E7AC18">mdi mdi-dots-horizontal</v-icon>
                    </v-btn>
                  </template>

                  <v-list>
                    <v-list-item class="hover:bg-primary-300 rounded-md cursor-pointer"  @click="downloadImage(n.url)">

                      <v-list-item-title class="text-primary-900 font-mono0">Descargar</v-list-item-title>
                    </v-list-item>
                    <v-list-item class="hover:bg-primary-300 rounded-md cursor-pointer"  @click="deleteImage(n.url,'C4CA42')">
                      <v-list-item-title class="text-primary-900 font-mono">Eliminar </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </div>
          </v-col>
        </v-row>
        <v-row v-else> 
          <div class="w-full">
          <h1 class="text-center text-gray-400 mt-5 mb-5">No hay elementos</h1>
          </div>  
        </v-row>
      </div>
    </div>

    <v-dialog v-model="show" persistent max-width="800" >
      <v-card>
        <div class="flex">
          <span class="text-xl ml-5 mt-4">Agregar Foto</span> 
            <div class="flex justify-end items-center mr-4 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" @click="show = false" class="icon icon-tabler icon-tabler-square-x text-gray-400 cursor-pointer" width="35" height="35" viewBox="0 0 24 24" stroke-width="1" stroke="#BDBDBD" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M10 10l4 4m0 -4l-4 4" />
                </svg>
            </div>
        </div>
        <v-card-text>
          <v-autocomplete :items="typeFilesList" item-text="name" v-model="typePhoto"  @change="ErrorPhotoB = false"  item-value="id" label="Tipo de Foto" color="#E7AC18"></v-autocomplete>
           <h5 v-show="ErrorPhotoB" class="text-red-600 text-xs">{{ErrorPhoto}}</h5>
          <da-cropper v-on:save="onSavePhoto"></da-cropper>
        </v-card-text>
      </v-card>
    </v-dialog>

    <da-dialog v-model="deleteFoto" :persist="true" :maxWidth="'500px'">
          <template #body>
              <da-sweet-confirm 
              :title="'¡ESPERA!'" 
              :message="'¿Estás seguro que deseas eliminar la foto seleccinada?'"
              v-on:confirm="onDeleteImage()" 
              v-on:close="deleteFoto = false">
          </da-sweet-confirm>
          </template>
    </da-dialog>
  </div>
</template>

<script>
import VuexMixin from '../../../mixins/VuexMixin'
import { mapActions, mapGetters } from 'vuex';
import moduleTypes from '../../../store/modules/common/module-types';
import fnTypes from '../../../store/modules/common/fn-types';
import DASweetConfirm from '../../../core/components/form/dialog/components/DASweetConfirm.vue';
import { buildPhotoDeletePayload, buildPhotoUploadPayload } from '../../../domain/photo/photo.builder';

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
          show:       false,
          isLoading:  false,
          deleteFoto: false,
          typePhoto:     [],
          listaRayosX2:  [],
          URLPHOTO:      '',
          CODEPHOTO:      '',
          ErrorPhoto:    '',
          ErrorPhotoB:   false,
      }
  },
  created() {
      this.isLoading = true
      this.onGetPhotos()
      this.isLoading = false
    },
  computed: {
    ...mapGetters(moduleTypes.PHOTO, {
      listTypePhoto: fnTypes.getTypeFiles,
      isSavePhoto:    fnTypes.savePhoto,
      isGetPhoto:     fnTypes.getPhotos,
      isDeletePhoto:  fnTypes.deletePhoto,
      hasErrorPhoto:  fnTypes.hasErrorPhoto,
      listaFotos: 'listaFotos' ,  
      listaRayosX: 'listaRayosX'   
    }),

    typeFilesList: function() {
      return  this.listTypePhoto.length > 0 ? this.listTypePhoto.map((t) => {return {id: t.code, name: t.description}}): []
    },

  },
  components: {
    'da-sweet-confirm': DASweetConfirm,
  },
  methods: {
    ...mapActions(moduleTypes.PHOTO, [
          fnTypes.savePhoto, fnTypes.deletePhoto, fnTypes.initPhotos
      ]),
      onSavePhoto: async function(event){
        if (this.typePhoto == '') {
          this.ErrorPhotoB = true
          this.ErrorPhoto = "Selecciona un tipo el tipo de foto para continuar."
          return 
        }else{
          const data = buildPhotoUploadPayload(this.px.person.id_person, this.typePhoto, event);
          await this.ActionWrapp(moduleTypes.PHOTO, fnTypes.savePhoto, data)
        }

        this.show = false
        
      },

      onGetPhotos: async function(){
        await this.ActionWrapp(moduleTypes.PHOTO, fnTypes.initPhotos, this.px.person.id_person)
      },
      onDeleteImage: async function(){

        const data = buildPhotoDeletePayload(this.px.person.id_person, this.CODEPHOTO, this.URLPHOTO);
         await this.ActionWrapp(moduleTypes.PHOTO, fnTypes.deletePhoto, data)
          this.deleteFoto = false
      },
      deleteImage(url,code){

        this.CODEPHOTO = code
        this.URLPHOTO = url
        this.deleteFoto = true
      },
      showDialog(){
        this.show = true
      },
      showDialogPhoto(obj,code){
        this.selectedPhoto = obj
        this.selectedPhoto.code = code
        this.URLPHOTO = obj.url
      },

      downloadImage(url) {
        if (!url || !/^https?:\/\//i.test(url)) {
          return;
        }

        const link = document.createElement('a');
        link.href = url;
        link.download = 'image.png';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
     },

    obtenerID(url) {
      let urlArray = url.split('/');
      let id = urlArray.pop();
      return id;
    },

  }

}

</script>

<style>

  .image {
    cursor: pointer;
    margin: 10px;
    display: inline-block;
  }
</style>

