<template>
  <div class="shadow-md rounded-md  bg-white">
    <da-loader v-bind:overlay="isLoading"></da-loader>
    <da-header-title :title="'Datos Personales'" class=" font-medium tracking-wider" rtlcornerlg/>
    <identity-fields v-if="!id" v-model="nc1Identity" :names="false" required-sex :disabled="isLoading" />
    <identity-editor v-else :subject="id" @saved="refreshIdentity" />
    <div class="px-5 py-5">
        <div class="grid grid-cols-1 md:grid-cols-2 px-1 py-1 gap-5" >
            
          <da-text-field-primary 
                 :label="'Apellidos:'"
                 :value="$v.patient.person.surname" 
                 v-model="$v.patient.person.surname.$model"
                 :error="$v.patient.person.surname.$invalid && $v.patient.person.surname.$anyDirty"
                 text
                 :disabled="isReadOnly"
             />
            
             <da-text-field-primary 
                 :label="'Nombre:'"
                 :value="$v.patient.person.name"
                 :error="$v.patient.person.name.$invalid && $v.patient.person.name.$anyDirty" 
                 v-model="$v.patient.person.name.$model"
                 text
                 :disabled="isReadOnly"
             />
          
         </div>

         <div class="grid grid-cols-1 md:grid-cols-2 px-1 py-1 gap-5" >
            <da-date-picker-field
            :label="'Fecha de nacimiento:'"
            :placeholder="'Ejem: 24-01-1995'"
            :value="patient.person.birthday"
            @update="patient.person.birthday = $event"
            :rules="rules.date"
            ></da-date-picker-field>
            
              <da-text-field-primary 
                  :label="'Edad:'"
                  :value="$v.patient.person.age"
                  :error="$v.patient.person.age.$invalid && $v.patient.person.age.$anyDirty" 
                  v-model="$v.patient.person.age.$model"
                  number
                  :disabled="isReadOnly"
              />
          
          </div>
          
         <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
            <da-text-field-primary 
                :label="'Lugar de nacimiento:'"
                :value="$v.patient.address.place_birth"
                :error="$v.patient.address.place_birth.$invalid && $v.patient.address.place_birth.$anyDirty" 
                v-model="$v.patient.address.place_birth.$model"
                text
                :disabled="isReadOnly"
            />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 px-1 py-1 gap-5" >
            
        <da-text-field-primary 
              :label="'Ocupación:'"
              :value="$v.patient.person.ocupation" 
              v-model="$v.patient.person.ocupation.$model"
              :error="$v.patient.person.ocupation.$invalid && $v.patient.person.ocupation.$anyDirty"
              text
              :disabled="isReadOnly"
          />
          <da-text-field-primary 
              :label="'RFC:'"
              :value="$v.patient.person.rfc"
              :error="$v.patient.person.rfc.$invalid && $v.patient.person.rfc.$anyDirty" 
              v-model="$v.patient.person.rfc.$model"
              :rules="[ ($v.patient.person.rfc.$anyDirty ? $v.patient.person.rfc.rfcpattern : true) || 'Formato incorrecto']"
              text
              :disabled="hasRfc || isReadOnly"
          >
          <template #append-icon>
            <v-checkbox
              v-model="hasRfc"
              label="N/A"
              color="gray"
              hide-details
              class="mt-0 pt-0"
              :disabled="isReadOnly"
            ></v-checkbox>
          </template>
        </da-text-field-primary>
      
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 px-1 py-1 gap-5" >
            
          <da-text-field-primary 
                :label="'Lugar de residencia:'"
                :value="$v.patient.address.residence" 
                v-model="$v.patient.address.residence.$model"
                :error="$v.patient.address.residence.$invalid && $v.patient.address.residence.$anyDirty"
                text
                :disabled="isReadOnly"
            />
            <da-text-field-primary 
                :label="'Dirección:'"
                :value="$v.patient.address.direction"
                :error="$v.patient.address.direction.$invalid && $v.patient.address.direction.$anyDirty" 
                v-model="$v.patient.address.direction.$model"
                text
                :disabled="isReadOnly"
            />
            <da-text-field-primary 
                :label="'Código postal:'"
                :value="$v.patient.address.cp"
                :error="$v.patient.address.cp.$invalid && $v.patient.address.cp.$anyDirty" 
                v-model="$v.patient.address.cp.$model"
                text
                :disabled="isReadOnly"
            />
        
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 px-1 py-1 gap-5" >
            <div>
              <da-text-field-primary 
                    :label="'Teléfono local:'"
                    :value="$v.patient.person.local_telephone" 
                    v-model="$v.patient.person.local_telephone.$model"
                    v-mask="'(###)-###-####'"
                    :error="$v.patient.person.local_telephone.$invalid && $v.patient.person.local_telephone.$anyDirty"
                    text
                    :rules="[ ($v.patient.person.local_telephone.$anyDirty ? $v.patient.person.local_telephone.phonePattern : true) || 'Formato incorrecto']"
                    :disabled="hasLocalPhone || isReadOnly"
                >
                <template #append-icon>
                  <v-checkbox
                    v-model="hasLocalPhone"
                    label="N/A"
                    color="gray"
                    hide-details
                    class="mt-0 pt-0"
                    :disabled="isReadOnly"
                  ></v-checkbox>
                </template>
              </da-text-field-primary>
            </div>
            <da-text-field-primary 
                :label="'Celular:'"
                :value="$v.patient.person.telephone"
                :error="$v.patient.person.telephone.$invalid && $v.patient.person.telephone.$anyDirty" 
                v-model="$v.patient.person.telephone.$model"
                v-mask="'(###)-###-####'"
                text
                :rules="[ ($v.patient.person.telephone.$anyDirty ? $v.patient.person.telephone.phonePattern : true) || 'Formato incorrecto']"
                :disabled="isReadOnly"
            />
        
          </div>

          <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
            <da-text-field-primary 
                :label="'Motivo de consulta:'"
                :value="$v.patient.query.reason_consultation"
                :error="$v.patient.query.reason_consultation.$invalid && $v.patient.query.reason_consultation.$anyDirty" 
                v-model="$v.patient.query.reason_consultation.$model"
                text
                :disabled="isReadOnly"
            />
        </div>

          <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
            <da-text-area-primary 
                :label="'Padecimiento actual:'"
                :value="$v.patient.query.current_condition"
                :error="$v.patient.query.current_condition.$invalid && $v.patient.query.current_condition.$anyDirty" 
                v-model="$v.patient.query.current_condition.$model"
                text
                outlined
                :disabled="isReadOnly"
            />
        </div>

        <!-- <div class="grid grid-cols-1 md:grid-cols-4 px-1 py-1 gap-5" >
            
            <da-text-field-primary 
                  :label="'Pulso:'"
                  :value="$v.patient.query.pulse" 
                  v-model="$v.patient.query.pulse.$model"
                  :error="$v.patient.query.pulse.$invalid && $v.patient.query.pulse.$anyDirty"
                  text
                  :disabled="isReadOnly"
              />
              <da-text-field-primary 
                  :label="'Presión(SYS):'"
                  :value="$v.patient.query.blood_pressure"
                  :error="$v.patient.query.blood_pressure.$invalid && $v.patient.query.blood_pressure.$anyDirty" 
                  v-model="$v.patient.query.blood_pressure.$model"
                  text
                  :disabled="isReadOnly"
              />
              <da-text-field-primary 
                  :label="'Oxígenación:'"
                  :value="$v.patient.query.oxygenation"
                  :error="$v.patient.query.oxygenation.$invalid && $v.patient.query.oxygenation.$anyDirty" 
                  v-model="$v.patient.query.oxygenation.$model"
                  text
                  :disabled="isReadOnly"
              />
              <da-text-field-primary 
                  :label="'Día:'"
                  :value="$v.patient.query.dia"
                  :error="$v.patient.query.dia.$invalid && $v.patient.query.dia.$anyDirty" 
                  v-model="$v.patient.query.dia.$model"
                  v-mask="'####-##-##'"
                  text
                  :disabled="isReadOnly"
              >
              <template #append-icon>
              <da-date-picker v-on:date="(val) => patient.query.dia = val" :isdisabled="false" :datevalue="patient.query.dia" />
            </template>
             </da-text-field-primary>
          
            </div> -->
    </div>
    <da-header-title :title="'Antecedentes Heredero-Familiares'" class=" font-medium tracking-wider" />
    <div class="px-5 py-5">
      <div class="flex justify-start items-center gap-5 align-middle">
          <span for="" class="text-gray-500">Madre</span>

          <!-- <v-checkbox
            v-model="$v.mother.live.$model"
            label="Viva"
            color="gray"
            hide-details
            class="mt-0 pt-0"
            :error="$v.mother.live.$invalid && $v.mother.live.$anyDirty || ( $v.mother.live.$anyDirty && !mother.live && !mother.dead )"
          ></v-checkbox>
          <v-checkbox
            v-model="$v.mother.dead.$model"
            label="Fallecida"
            color="gray"
            hide-details
            class="mt-0 pt-0"
            :error="$v.mother.dead.$invalid && $v.mother.dead.$anyDirty || ( $v.mother.live.$anyDirty && !mother.live && !mother.dead )"
          ></v-checkbox> -->

      </div>
      <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
        <!-- <da-text-field-primary 
                :label="'(Si es finada) Causa de muerte:'"
                :value="$v.mother.death_cause"
                :error="$v.mother.death_cause.$invalid && $v.mother.death_cause.$anyDirty" 
                v-model="$v.mother.death_cause.$model"
                text
                :disabled="mother.live ? true : false"
            />
            <da-text-field-primary 
                :label="'(Si aún vive) Enfermedades que padece:'"
                :value="$v.mother.current_illness"
                :error="$v.mother.current_illness.$invalid && $v.mother.current_illness.$anyDirty" 
                v-model="$v.mother.current_illness.$model"
                text
                :disabled="mother.dead ? true : false"
            /> -->
        </div>
    </div>
    <div class="px-5 py-5 bg-gray-100">
      <div class="flex justify-start items-center gap-5 align-middle">
          <span for="" class="text-gray-500">Padre</span>

          <!-- <v-checkbox
            v-model="$v.father.live.$model"
            label="Vivo"
            color="gray"
            hide-details
            class="mt-0 pt-0"
            :error="$v.father.live.$invalid && $v.father.live.$anyDirty || ( $v.father.live.$anyDirty && !father.live && !father.dead )"
            
          ></v-checkbox>
          <v-checkbox
            v-model="$v.father.dead.$model"
            label="Fallecido"
            color="gray"
            hide-details
            class="mt-0 pt-0"
            :error="$v.father.dead.$invalid && $v.father.dead.$anyDirty || ( $v.father.live.$anyDirty && !father.live && !father.dead )"
          ></v-checkbox> -->

      </div>
      <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
        <!-- <da-text-field-primary 
                :label="'(Si es finado) Causa de muerte:'"
                :value="$v.father.death_cause"
                :error="$v.father.death_cause.$invalid && $v.father.death_cause.$anyDirty" 
                v-model="$v.father.death_cause.$model"
                text
                :disabled="father.live ? true : false"
            />
            <da-text-field-primary 
                :label="'(Si aún vive) Enfermedades que padece:'"
                :value="$v.father.current_illness"
                :error="$v.father.current_illness.$invalid && $v.father.current_illness.$anyDirty" 
                v-model="$v.father.current_illness.$model"
                text
                :disabled="father.dead ? true : false"
            /> -->
        </div>
    </div>

    <div class="px-5 py-5">
      <div class="flex justify-start items-center gap-5 align-middle">
          <span for="" class="text-gray-500">Hermanos</span>
          <!-- <v-checkbox
            v-model="hasBrothers"
            label="Sin hermanos"
            color="gray"
            hide-details
            class="mt-0 pt-0"
          ></v-checkbox> -->
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 px-1 py-1 gap-5" >
        <!-- <da-text-field-primary 
              :label="'Número de hermanos:'"
              :value="$v.patient.family_brothers.total"
              :error="$v.patient.family_brothers.total.$invalid && $v.patient.family_brothers.total.$anyDirty" 
              v-model.number="$v.patient.family_brothers.total.$model"
              number
              :disabled="hasBrothers"
          />
        <da-text-field-primary 
                :label="'Vivos:'"
                :value="$v.patient.family_brothers.live"
                :error="$v.patient.family_brothers.live.$invalid && $v.patient.family_brothers.live.$anyDirty" 
                v-model.number="$v.patient.family_brothers.live.$model"
                number
                :disabled="hasBrothers"
            />
            <da-text-field-primary 
                :label="'Fallecidos:'"
                :value="$v.patient.family_brothers.dead"
                :error="$v.patient.family_brothers.dead.$invalid && $v.patient.family_brothers.dead.$anyDirty" 
                v-model.number="$v.patient.family_brothers.dead.$model"
                number
                :disabled="hasBrothers"
            /> -->
        </div>
        <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
            <da-text-field-primary 
                :label="'Nombre y edades:'"
                :value="$v.patient.family_brothers.name_age"
                :error="$v.patient.family_brothers.name_age.$invalid && $v.patient.family_brothers.name_age.$anyDirty" 
                v-model="$v.patient.family_brothers.name_age.$model"
                text
                :disabled="hasBrothers"
            />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
            <da-text-field-primary 
                :label="'Causas de muerte:'"
                :value="$v.patient.family_brothers.causes_death"
                :error="$v.patient.family_brothers.causes_death.$invalid && $v.patient.family_brothers.causes_death.$anyDirty" 
                v-model="$v.patient.family_brothers.causes_death.$model"
                text
                :disabled="hasBrothers"
            />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
            <!-- <da-text-field-primary 
                :label="'Enfermedades que padece o padecio:'"
                :value="$v.patient.family_brothers.diseases"
                :error="$v.patient.family_brothers.diseases.$invalid && $v.patient.family_brothers.diseases.$anyDirty" 
                v-model="$v.patient.family_brothers.diseases.$model"
                text
                :disabled="hasBrothers"
            /> -->
        </div>
    </div>
    <div class="px-5 py-5 bg-gray-100">
      <div class="flex justify-start items-center gap-5 align-middle">
          <span for="" class="text-gray-500">Abuelos Paternos</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
          <!-- <da-text-field-primary 
              :label="'Enfermedades:'"
              :value="$v.grandfather.diseases"
              :error="$v.grandfather.diseases.$invalid && $v.grandfather.diseases.$anyDirty" 
              v-model="$v.grandfather.diseases.$model"
              text
          /> -->
        </div> 

      <div class="flex justify-start items-center gap-5 align-middle">
          <span for="" class="text-gray-500">Abuelos Maternos</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >
          <!-- <da-text-field-primary 
              :label="'Enfermedades:'"
              :value="$v.grandmother.diseases"
              :error="$v.grandmother.diseases.$invalid && $v.grandmother.diseases.$anyDirty" 
              v-model="$v.grandmother.diseases.$model"
              text
          /> -->
        </div>

    </div>
    <da-header-title :title="'Datos Patológicos'" class=" font-medium tracking-wider" />
    <div class="px-5 py-5">

      <div class="flex justify-start items-center gap-5 align-middle">
          <span for="" class="text-gray-500">¿Usted padece o ha padecido alguna de las siguientes enfermedades o malestares?</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-1 px-1 py-1 gap-5" >

       <div v-for="(item, idx) in patologic" :key="idx">
        <div class="px-5 py-2 border-2 border-gray-400 rounded-lg text-gray-500">
          <span>{{ item.description ? item.description : ''  }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 px-1 py-1 gap-5">
          <div v-for="(ch, idy) in item.child" :key="idy">
              <div  v-if="ch.unique" class="flex items-center gap-2">
                <v-checkbox
                    :label="ch.description"
                    color="gray"
                    hide-details
                    class="mt-0 pt-0"
                    v-model="ch.value"
                    :disabled="isReadOnly"
                  ></v-checkbox>
                  <small v-if=" ch.lower_description">{{ ch.lower_description ? ch.lower_description : '' }}</small>
              </div>
              <div v-else>
                <div class="flex items-center gap-2 text-gray-500">
                  {{ ch.description ?  ch.description : '' }}
                  <div  v-for="(opt, idt) in ch.options" :key="idt">
                    <v-checkbox
                       v-if="opt.description.includes('Si') "
                      :label="opt.description"
                      color="gray"
                      hide-details
                      class="mt-0 pt-0"
                      v-model="opt.value"
                      :disabled="isReadOnly"
                      @change="onChageOption(item.id_type_pathological_personal, idy, opt.id, opt.value)"
                    ></v-checkbox>
                    <v-checkbox
                    v-if="opt.description.includes('No')"
                      :label="opt.description"
                      color="gray"
                      hide-details
                      class="mt-0 pt-0"
                      v-model="opt.value"
                      :disabled="isReadOnly"
                      @change="onChageOption(item.id_type_pathological_personal, idy, opt.id, opt.value)"
                    ></v-checkbox>
                  </div>
                    
                </div>
              <div v-if="ch.plain">
                <da-text-field-primary 
                     :label="'Especifique:'"
                     :value="ch.text" 
                     v-model="ch.text"
                     :error="!ch.text && ch.value"
                     text
                     :disabled="isReadOnly"
                 />
              </div>
              </div>
          </div>
        </div>
       </div>
       <div>
        <div class="px-5 py-2 border-2 border-gray-400 rounded-lg text-gray-500 mt-2">
            <span>¿Cómo nos conociste?</span>
        </div>
        <div class="flex gap-3 mt-4 ml-0">
              <v-checkbox
              v-for="option in options"
              :key="option"
              :label="option"
              :value="option"
              color="gray"
              v-model="selectedOptions"
              hide-details
              class="mt-0 pt-0"
              :disabled="isReadOnly || isWriting"
            ></v-checkbox>
          <da-text-field-primary 
                v-if="selectedOptions.includes('Otro')"
                :label="'Mencione dónde'"
                v-model="addSocialMediaOther"
                class="mt-0 pt-0 "
                text
                :disabled="isReadOnly"
            />
        </div>
      </div>
      </div>
    </div>
      <div>
  <da-header-title :title="'Alergias'" class="font-medium tracking-wider" />

  <div class="px-5 py-5">
    <AllergyFields v-if="!id" v-model="patient.allergy" :disabled="isReadOnly" group-name="new-patient-allergies" />
    <div v-else><strong>{{ allergyStateLabel }}</strong><p>{{ patient.allergy.description }}</p><button v-if="!isReadOnly" type="button" class="px-4 py-3 rounded-full border" @click="showAllergyEditor = true">Revisar alergias</button></div>
    <AllergyEditor v-if="id" v-model="showAllergyEditor" :patient-id="id" :patient-name="patient.person.name" :record="patient.allergy" @saved="onAllergyReviewed" />
  </div>


      </div>
    <da-header-title :title="'Firma de Paciente'" class=" font-medium tracking-wider" />

<div class="ml-5 mr-5 mb-1 mt-4">
                <da-text-field-primary 
                     :label="'Nombre Tutor [Menores de edad]:'"
                 :value="$v.patient.person.name_signature" 
                 v-model="$v.patient.person.name_signature.$model"
                 :error="$v.patient.person.surname.$invalid && $v.patient.person.surname.$anyDirty"
                     text
                 />
</div>



    <div class="px-5 py-5">
      <da-signature-pad v-if="(!patient.files.file || isUpdateSignature) && !patient.person.id_signature" required v-on:signed="onSigned" ></da-signature-pad>
      <div class="w-full" v-if="patient.files.file && !isUpdateSignature && !patient.person.id_signature">
        <div class="flex justify-end">
          <button class="rounded-full text-red-500 shadow-lg" @click="patient.files.file = ''">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <img  :src="patient.files.file" alt="Firma" srcset="">
        <div class="w-full flex items-center justify-center border-t-2 border-gray-500">
          <span class="font-sans font-semibold tracking-wider text-gray-500 text-center">{{ fullname ? fullname : '' }}</span>
        </div>
      </div>
      <div v-if="id && !patient.files.file && patient.person.id_signature">
        <div class="flex justify-end">

              <v-tooltip bottom>
                <template v-slot:activator="{ on, attrs }">
                  <button class="rounded-full text-red-500 shadow-lg" @click="patient.person.id_signature = ''" v-bind="attrs" v-on="on">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </template>
                <span>Cambiar Firma</span>
              </v-tooltip>
        </div>
        <img  :src="patient.person.id_signature" alt="Firma" srcset="">
        <div class="w-full flex items-center justify-center border-t-2 border-gray-500">
          <span class="font-sans font-semibold tracking-wider text-gray-500 text-center">{{ fullname ? fullname : '' }}</span>
        </div>
      </div>
     
    </div>
    <div v-if="$v.$anyError" class="px-5">
      <small class="error-text">* Complete los campos requeridos, para continuar.</small>
    </div>
    <div class="flex justify-end py-5 px-5">
        <div class="flex gap-2 justify-end align-middle">
            <da-button-primary @click.native="onSave"  :label="'GUARDAR'" r2xl swpr class="py-1 px-5 font-light"></da-button-primary>
            <da-button-secondary @click.native="onCancel" :label="'CANCELAR'" rxl swsec class="py-1 px-5 font-light"></da-button-secondary>
        </div>
    </div>

    <da-dialog v-model="isFinish" :persist="true" :maxWidth="'500px'">
        <template #body>
            <da-sweet-confirm 
            :title="'Foto de Perfil'" 
            :message="'Para continuar, es necesario agregar una foto de perfil del paciente o puedes continuar sin foto...'"
            :calcelbtntext="'Continuar sin foto'" 
            :lottiepath="PROFILE"
            :iconwidth="150"
            :iconheight="150"
            v-on:confirm="onFinish(true)" 
            v-on:close="onFinish(false)">
        </da-sweet-confirm>
        </template>
  </da-dialog>

  <da-upload-file :show="isUploadFile" v-on:close="onFinish(false)" v-on:save="onSavePicture"></da-upload-file>

  <da-dialog v-model="isUpdated" :persist="true" :maxWidth="'500px'">
        <template #body>
            <da-sweet-confirm 
            :title="'Actualizar'" 
            :message="'¿La información es correcta?'"
            v-on:confirm="onUpdate(true)" 
            v-on:close="isUpdated = false">
        </da-sweet-confirm>
        </template>
  </da-dialog>

  </div>
</template>

<script>
import IdentityFields from "../../components/identity/IdentityFields.vue";
import IdentityEditor from "../../components/identity/IdentityEditor.vue";
import DAFamilyModel from '../../models/patient/DAFamily.model';
import AllergyFields from './components/AllergyFields.vue';
import AllergyEditor from './components/AllergyEditor.vue';
import { allergyLabels, allergyStatus } from '../../domain/patient/allergy';
import DAFamilyGrandparentsModel from '../../models/patient/DAFamilyGrandparents.model'
import { SYS_PATH_FATHER, SYS_PATH_MOTHER, SYS_PATH_GRANDFATHER, SYS_PATH_GRANDMOTHER } from '../../utils/familypathcode';
import { mapGetters } from 'vuex';
import VuexMixin from '../../mixins/VuexMixin';
import { validationMixin } from 'vuelidate';
import { required, requiredIf } from 'vuelidate/lib/validators';
import PatientModel from '../../models/patient/DAPatient.model';
import {  phonePattern, rfcpattern } from '../../utils/common/regex';
import moduleTypes from '../../store/modules/common/module-types';
import fnTypes from '../../store/modules/common/fn-types';
import { getAge } from '../../utils/date';
import DAUploadFile from './profile/DAUploadFile.vue';
import DASweetConfirm from '../../core/components/form/dialog/components/DASweetConfirm.vue';
import { PROFILE } from '../../utils/lottieicon';
import { formatFecha, revertFormatFecha } from '../../utils/date'
import { buildProfilePhotoPayload } from '../../domain/photo/photo.builder';
import {
  applyClinicalQueryDefaults,
  buildPatientPayload,
  buildSocialMediaPayload,
  mapPatientResponseToForm
} from '../../domain/patient/patient.builder';

export default {
  mixins: [validationMixin, VuexMixin],
  props: {
    id: {
      type: [String],
      default: ''
    }
  },
  components: {
    IdentityFields, IdentityEditor,
    AllergyFields, AllergyEditor,
    'da-upload-file': DAUploadFile,
    'da-sweet-confirm': DASweetConfirm,
  },
  data: function() {
          return {
            nc1Identity: {},
              patient: new PatientModel(),
              showAllergyEditor: false,
              mother: new DAFamilyModel(),
              father: new DAFamilyModel(),
              grandfather: new DAFamilyGrandparentsModel(),
              grandmother: new DAFamilyGrandparentsModel(),
              patologic: [],
              showPWD: false,
              options: ["Facebook", "Instagram", "Twitter", "Otro"],
              selectedOptions: [],
              isWriting: false,
              addSocialMediaOther: '',
              hasBrothers: false,
              hasLocalPhone: false,
              hasRfc: false,
              isUpdateSignature: false,
              isFinish: false,
              isUploadFile: false,
              isReadOnly: false,
              isUpdated: false,
              isLoading: false,
              PROFILE,
              rules: {
              date: [
                (v) => !!v || "El campo es requerido",
                (v) =>
                  (v && v.replace(/\D/g, "").length === 8) ||
                  "La fecha es incorrecta",
              ],
            },
          }
  },
  validations: {
      patient: {
            person: {
              name: {
                required
              },
              surname: {
                required
              },
              birthday: {
                required
              },
              age: {
                required
              },
              ocupation: {
                required
              },
              rfc: {
                required: requiredIf(function() {
                  return !this.hasRfc ? true : false
                }),
                rfcpattern
              },
              local_telephone: {
                required: requiredIf(function() {
                  return !this.hasLocalPhone ? true : false
                }),
                phonePattern
              },
              telephone: {
                required,
                phonePattern
              },
              name_signature: {
                required: false
              },

            },

            address: {
              place_birth: {
                required
              },
              residence: {
                required
              },
              direction: {
                required
              },
              cp: {
                required
              }
            },

            query : {
              reason_consultation: {
                required
              },
              current_condition: {
                required
              },
            },
            family_brothers: {
              total: {},
              live: {},
              dead: {},
              name_age: {},
              causes_death: {},
              diseases: {}
            },
            files : {
              file: {
                required: false
              }
            },
            pathological_data: {
              required
            },
            allergy: {
              has_allergy: {
                required: false
              },
              description: {
                required: requiredIf(function() {
                  return !this.id && ['HAS_ALLERGIES', 'UNKNOWN'].includes(this.patient.allergy.review_status)
                })
              }
            }
          },
      },
  created() {
      this.init()
  },
  methods: {
    onAllergyReviewed(record) {
      this.patient.allergy = record;
      this.$store.commit(`${moduleTypes.PX}/SET_ALLERGY`, record);
    },
    formatFecha,
    revertFormatFecha,
    // ...mapActions(moduleTypes.PX, [
    //         fnTypes.save, fnTypes.getById, fnTypes.update
    // ]),
    init: async function() {

        applyClinicalQueryDefaults(this.patient, this.px);

        await this.ActionWrapp(moduleTypes.FAMILYPATH, fnTypes.getFamilyPath);
      
      if(this.id) {
        this.getPatient(this.id)
      }else {
        await this.ActionWrapp(moduleTypes.PATOLOGIC, fnTypes.getPatologicInfo);
      }
    },
    onSave: async function() {

        this.father.id_family_path = this.familyPath.find(x => x.code == SYS_PATH_FATHER) ? this.familyPath.find(x => x.code == SYS_PATH_FATHER).id_family_path : ''
        this.mother.id_family_path = this.familyPath.find(x => x.code == SYS_PATH_MOTHER) ? this.familyPath.find(x => x.code == SYS_PATH_MOTHER).id_family_path : ''

        this.grandfather.id_family_path = this.familyPath.find(x => x.code == SYS_PATH_GRANDFATHER) ? this.familyPath.find(x => x.code == SYS_PATH_GRANDFATHER).id_family_path : ''
        this.grandmother.id_family_path = this.familyPath.find(x => x.code == SYS_PATH_GRANDMOTHER) ? this.familyPath.find(x => x.code == SYS_PATH_GRANDMOTHER).id_family_path : ''
        
        this.patient.family_parents = []
        this.patient.family_parents.push(this.father)
        this.patient.family_parents.push(this.mother)

        this.patient.family_grandparents = []
        this.patient.family_grandparents.push(this.grandfather)
        this.patient.family_grandparents.push(this.grandmother)

        const checkboxesData = buildSocialMediaPayload(
          this.selectedOptions,
          this.isWriting,
          this.addSocialMediaOther
        );

        this.patient.pathological_data = this.patologic;

        this.patient.social_media = checkboxesData;

        const patientData = buildPatientPayload(this.patient, this.patologic, checkboxesData, this.formatFecha)
        if(!this.id) { patientData.identity = this.nc1Identity; if(!this.nc1Identity.biologicalSex) { this.$swal.fire({icon:"error",text:"Selecciona el sexo biológico."}); return; } }

        this.$v.$touch();
        if(!this.$v.$anyError) {
           if(this.id && this.id != undefined) {
              this.isUpdated = true;
           }else {
             this.isLoading = true
             const response = await this.ActionWrapp(moduleTypes.PX, fnTypes.save, patientData);
             this.isLoading = false
             if(!response || !response.success || !response.data || !response.data.id_person) {
              this.$swal.fire({
                icon: 'error',
                title: 'No se pudo guardar el paciente',
                text: response && response.message ? response.message : 'Intenta de nuevo o revisa los datos capturados.'
              });
              return;
             }
             if(!this.id) {
              this.isReadOnly = true;
              this.isFinish = true;
            }
           }
        }
    },
    async refreshIdentity() {
      const before = mapPatientResponseToForm(this.px, this.revertFormatFecha).person;
      await this.ActionWrapp(moduleTypes.PX, fnTypes.getById, this.id);
      const after = mapPatientResponseToForm(this.px, this.revertFormatFecha).person;
      // Refresh the revision in px, retaining unsaved clinical/contact edits.
      for (const key of ['name', 'surname', 'birthday', 'age']) {
        if (this.patient.person[key] === before[key]) this.$set(this.patient.person, key, after[key]);
      }
    },
    getPatient: async function(id) {
      await this.ActionWrapp(moduleTypes.PX, fnTypes.getById, id );
      
      if(this.px) {
        const { family_brothers, family_grandparents = [], family_parents = [] } = this.px;

        const patientForm = mapPatientResponseToForm(this.px, this.revertFormatFecha);
        this.patient.person = patientForm.person;
        this.patient.address = patientForm.address;
        this.patient.query = patientForm.query;
        this.patient.allergy = patientForm.allergy;
        this.patologic = patientForm.patologic;
        this.selectedOptions = patientForm.selectedOptions;
        this.isWriting = patientForm.isWriting;
        this.addSocialMediaOther = patientForm.addSocialMediaOther;
        this.allergy = !this.patient.allergy.has_allergy ? true : false
        this.hasRfc = !this.patient.person.rfc ? true : false
        this.hasLocalPhone = !this.patient.person.local_telephone ? true : false
        this.patient.family_brothers = family_brothers;
        this.mother = family_parents.find(x => x.code == SYS_PATH_MOTHER) ? family_parents.find(x => x.code == SYS_PATH_MOTHER) : new DAFamilyModel();
        this.father = family_parents.find(x => x.code == SYS_PATH_FATHER) ? family_parents.find(x => x.code == SYS_PATH_FATHER) : new DAFamilyModel();
        this.grandfather = family_grandparents.find(x => x.code == SYS_PATH_GRANDFATHER) ? family_grandparents.find(x => x.code == SYS_PATH_GRANDFATHER) : new DAFamilyGrandparentsModel();
        this.grandmother = family_grandparents.find(x => x.code == SYS_PATH_GRANDMOTHER) ? family_grandparents.find(x => x.code == SYS_PATH_GRANDMOTHER) : new DAFamilyGrandparentsModel();
      }
    },
    onSigned: function(data) {
        this.patient.files.file = data;
        this.isUpdateSignature = false;
    },
    onCancel: function() {
      if(this.id) {
        this.$emit('cancel')
      }else {
        this.$router.go(-1)
      }
    },
    onChageOption: function(id_section, indexchild, idoptions, value) {
      let section = this.patologic.find(x => x.id_type_pathological_personal == id_section);
      let child = section.child[indexchild] ? section.child[indexchild] : null
      child.options = child.options.map((opt) => {return {...opt, value: opt.id != idoptions ? false : value }})
    },
    onFinish: function(flag) {
      this.isFinish = false;
      if(flag) {
        this.isUploadFile = true;
      }else {
        this.isUploadFile = false;
        if(!this.id_person) {
          this.$swal.fire({
            icon: 'error',
            title: 'Paciente sin identificador',
            text: 'No se encontro el identificador del paciente para abrir su expediente.'
          });
          return;
        }
        this.$router.push({
          path: '/px/history/'+this.id_person,
          query: {
            tab: 'medical-history',
            fromCreatePatient: '1'
          }
        })
      }
    },
    onSavePicture: async function(event) {
      if(event) {
          const profile = buildProfilePhotoPayload(this.id_person, event);
          await this.ActionWrapp(moduleTypes.PX, fnTypes.uploadProfile, {data: profile, isnew: true});
      }
    },
    onUpdate: async function(value) {
      if(value) {
        const socialMedia = buildSocialMediaPayload(
          this.selectedOptions,
          this.isWriting,
          this.addSocialMediaOther
        );
        const patientData = buildPatientPayload(this.patient, this.patologic, socialMedia, this.formatFecha)
        patientData.expectedRevision = (this.px.identity || {}).revision || 0
        await this.ActionWrapp(moduleTypes.PX, fnTypes.update, patientData)
        if(this.hasPxErrorInService == false) {
          this.onCancel()
        }
      }
    },
  },
  computed: {
    allergyStateLabel() { return allergyLabels[allergyStatus(this.patient.allergy)]; },
        ...mapGetters(moduleTypes.FAMILYPATH, {
            familyPath: fnTypes.getFamilyPath,
        }),
        ...mapGetters(moduleTypes.PX, {
            hasPxErrorInService: fnTypes.hasErrorInService,
            px: fnTypes.getPx,
            id_person: fnTypes.id_person
        }),
        ...mapGetters(moduleTypes.PATOLOGIC, {
          patologicInfo: fnTypes.getPatologicInfo
        }),
        ...mapGetters(moduleTypes.AUTH, {
          isRefresingToken: fnTypes.isRefresingToken
        }),
        fullname: function() {
          return this.patient.person.name+' '+this.patient.person.surname
        }
    },
    watch: {
      'mother.live': function() {
        if(this.mother.live) {
          this.mother.dead = false
        }
      },
      'mother.dead': function() {
        if(this.mother.dead) {
          this.mother.live = false
        }
      },
      'father.live': function() {
        if(this.father.live) {
          this.father.dead = false
        }
      },
      'father.dead': function() {
        if(this.father.dead) {
          this.father.live = false
        }
      },
      'patient.person.birthday': function() {
        if(this.patient.person.birthday) {
            let AGE = getAge(this.formatFecha(this.patient.person.birthday))
            this.patient.person.age = AGE;
        }
      },
      hasLocalPhone: function() {
        if(this.hasLocalPhone && this.patient.person.local_telephone) {
            this.patient.person.local_telephone = '';
        }
      },
      hasRfc: function() {
        if(this.hasRfc && this.patient.person.rfc) {
            this.patient.person.rfc = '';
        }
      },
      patologicInfo: function() {
        if(this.patologicInfo && this.patologicInfo.length > 0 ) {
            this.patologic = this.patologicInfo
        }
      },
      addSocialMediaOther(newValue) {
        this.isWriting = newValue.length > 0;
        this.selectedOptions = ['Otro'];
      },
    }


}
</script>

<style scoped>

</style>
