<template>
    <div class="tooth-wrapper relative">
        <div class="tooth">
            <div :class="['part-'+i, item == idselected ? 'painted' : '', customclass(symbol)]" :data="i" v-for="(item, i) in tooth.parts" @click="onAction(id, item)" v-bind:key="i+item"></div>
        </div>
        <tooth-residue v-if="symbol == 9 || symbol == 11" :symbol="symbol" ></tooth-residue>
        <tooth-missing v-if="symbol == 7" ></tooth-missing>
        <tooth-healthy v-if="symbol == 0" ></tooth-healthy>
        <tooth-cavity v-if="symbol == 10" ></tooth-cavity>
        <tooth-bridge v-if="symbol == 12" ></tooth-bridge>
        <tooth-abfraccion v-if="symbol == 13" ></tooth-abfraccion>
        <tooth-abrasion v-if="symbol == 14" ></tooth-abrasion>
        <tooth-atricion v-if="symbol == 15" ></tooth-atricion>
        <tooth-erosion v-if="symbol == 16" ></tooth-erosion>
  </div>
</template>

<script>
import DAResidue from './components/symbols/DAResidue.vue';
import DAMissing from './components/symbols/DAMissing.vue';
import DAHealthy from './components/symbols/DAHealthy.vue';
import DACavity from './components/symbols/DACavity.vue';
import DABridge from './components/symbols/DABridge.vue';
import DAAbfraccion from './components/symbols/DAAbfraccion.vue';
import DAAbrasion from './components/symbols/DAAbrasion.vue';
import DAAtricion from './components/symbols/DAAtricion.vue';
import DAErosion from './components/symbols/DAErosion.vue';


    export default {
        props: {
          id: {
            type: String,
            default: ''
          },
            /**
            * Datos del diente
            * @values Modelo del diente
            */
            tooth: {
                type: Object,
                default: function() {return {}},
            },
             /**
             * Función que se ejecutará al seleccionar un area del diente
             * @values funtion(part)
             */
            action:  {
                type: Function,
                default() {return 'No function found'}
            },
            symbol: {
              type: [String, Number],
              default: 0
            },
            color: {
              type: [String],
              default: '#ebebeb'
            },
            globalcolor: {
              type: String,
              default: '#ddd'
            },
            readOnly: Boolean,
            color1: {
              type: [String],
              default: 'white'
            },
            color2: {
              type: [String],
              default: 'white'
            },
            color3: {
              type: [String],
              default: '#ffffff'
            },
            color4: {
              type: [String],
              default: 'white'
            },
            color5: {
              type: [String],
              default: 'white'
            },
        },
        components: {
          'tooth-residue': DAResidue,
          'tooth-missing': DAMissing,
          'tooth-healthy': DAHealthy,
          'tooth-cavity': DACavity,
          'tooth-bridge': DABridge,
          'tooth-abfraccion': DAAbfraccion,
          'tooth-abrasion': DAAbrasion,
          'tooth-atricion': DAAtricion,
          'tooth-erosion': DAErosion,
        },
        data: function() {
            return {
                idselected: ""
            }
        },
        methods: {
            onAction: function(id, id_part) {
             
              if(!this.readOnly) {
                  this.idselected = (this.idselected == id_part ? null : id_part);
              }
              this.action(id, id_part, this.idselected != null ? true : false)
            },
            customclass: function(symbol) {
              let classes = {
                    1: 'tooth-part-corona',
                    2: 'tooth-part-corona-filtrada',
                    3: 'tooth-part-resina',
                    4: 'tooth-part-icdas',
                    5: 'tooth-part-caries-esmalte',
                    6: 'tooth-part-resina-filtrada',
                    8: 'tooth-part-caries-dentina',
                    17: 'tooth-part-amalgama',
              }
              return classes[symbol] ? classes[symbol] : 'tooth-part'
            }
        },
        computed: {

        },
        watch: {
          readOnly: function() {
            this.idselected = "";
          }
        }
    }
</script>

<style lang="scss" scoped>

#grid {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.tooth {
  position: relative;
  width: 100%;
  height: 85%;
  transform: rotate(-45deg); 
}
  .tooth-part {
    border: 4px solid v-bind(globalcolor);
    background-color: #ffffff;
    position: absolute;
    width: 50%;
    height: 50%;
    box-sizing: border-box; 
    &.part-0 {
      background-color: v-bind(color1);
    }
    &.part-1 {
      background-color: v-bind(color2);
    }
    &.part-2 {
      background-color: v-bind(color3);
    }
    &.part-3 {
      background-color: v-bind(color4);
    }
    &.part-4 {
      background-color: v-bind(color5);
    }
  }
  .tooth-part.painted {
    background-color: v-bind(color);
  }
  .tooth-wrapper {
    width: 180px;
    height: 250px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center; 
    display: contents;
  }

.part-1 {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 3;
  border-radius: 0 100% 0 0;
  border-left-width: 2px;
  border-bottom-width: 2px; 
}

.part-2 {
  position: absolute;
  bottom: 0;
  left: 50%;
  z-index: 3;
  border-radius: 0 0 100% 0;
  border-left-width: 2px;
  border-top-width: 2px; }

.part-3 {
  position: absolute;
  bottom: 0;
  left: 0;
  border-radius: 0 0 0 100%;
  border-right-width: 2px;
  border-top-width: 2px;
  z-index: 3; }

.part-4 {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 100% 0 0 0;
  border-right-width: 2px;
  border-bottom-width: 2px;
  z-index: 3; }

.part-5 {
  width: 80%;
  height: 80%;
  position: absolute;
  top: -29%;
  right: -29%;
  border-radius: 0 100% 0 0;
  z-index: 2; }

.part-6 {
  width: 80%;
  height: 80%;
  position: absolute;
  bottom: -29%;
  left: -29%;
  border-radius: 0 0 0 100%;
  z-index: 2; }

.part-0 {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 4;
  width: 40%;
  height: 40%;
  border-radius: 100%; 
  background-color: v-bind(color0);
}

.tooth-part-corona {
    border: 2px solid rgb(252, 239, 239);
    background-color: rgba(59, 130, 246, 1);
    position: absolute;
    width: 50%;
    height: 50%;
    box-sizing: border-box; 
}

.tooth-part-corona-filtrada {
   // border: 4px solid rgb(255, 255, 255);
    background-color: rgba(59, 130, 246, 1);
    position: absolute;
    width: 50%;
    height: 50%;
    box-sizing: border-box;
    &.part-0 {
      border: 4px solid rgb(255, 255, 255);
    } 
    &.part-1 {
      border-top: 6px solid rgb(233, 5, 5);
    }
    &.part-2 {
      border-right: 6px solid rgb(233, 5, 5);
    }
    &.part-3 {
      border-bottom: 6px solid rgb(233, 5, 5);
    }
    &.part-4 {
      border-left: 6px solid rgb(233, 5, 5);
    }
}

.tooth-part-resina {
    border: 2px solid #ddd;
    background-color: rgb(255, 255, 255);
    position: absolute;
    width: 50%;
    height: 50%;
    box-sizing: border-box; 
    &.part-0 {
      background-color: rgba(59, 130, 246, 1);
    }
}

.tooth-part-icdas {
    border: 2px solid #ddd;
    background-color: rgb(255, 255, 255);
    position: absolute;
    width: 50%;
    height: 50%;
    box-sizing: border-box; 
    &.part-0 {
      background-color: rgba(16, 185, 129, 1);
    }
}

.tooth-part-caries-esmalte {
    border: 2px solid #ddd;
    background-color: rgb(255, 255, 255);
    position: absolute;
    width: 50%;
    height: 50%;
    box-sizing: border-box; 
    &.part-0 {
      background-color: rgb(233, 5, 5);
    }
}

.tooth-part-caries-dentina {
    border: 2px solid #ddd;
    background-color: white;
    position: absolute;
    width: 50%;
    height: 50%;
    box-sizing: border-box; 
    &.part-0 {
      background-color: #5e2129;
    }
}


.tooth-part-resina-filtrada {
    border: 2px solid #ddd;
    background-color: rgb(255, 255, 255);
    position: absolute;
    width: 50%;
    height: 50%;
    box-sizing: border-box; 
    &.part-0 {
      border: 4px solid rgb(233, 5, 5);
      background-color: rgba(59, 130, 246, 1);
    }
}

.tooth-part-amalgama {
    border: 2px solid #ddd;
    background-color: rgb(255, 255, 255);
    position: absolute;
    width: 50%;
    height: 50%;
    box-sizing: border-box; 
    &.part-0 {
      background-color: rgb(14, 13, 13);
    }
}


</style>