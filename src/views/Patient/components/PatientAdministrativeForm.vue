<template>
  <section class="nc1-sheet">
    <header class="nc1-sheet-heading"><div><p class="nc1-eyebrow">Ficha del paciente</p><h2>Datos del paciente</h2><p>Edita lo que necesitas. Los datos clínicos ya registrados se conservan.</p></div><v-chip small outlined color="primary">Paciente existente</v-chip></header>
    <v-alert text type="info" class="nc1-help">Solo los campos con * son obligatorios. Puedes guardar cambios de contacto o domicilio aunque falten otros datos.</v-alert>
    <v-alert v-if="conflict" ref="conflict" tabindex="-1" type="warning" color="#714b12" text role="alert" class="nc1-conflict">
      <strong>Hay datos guardados distintos de tu captura.</strong><p>Tu teléfono y domicilio pendientes se conservan. Revisa el nombre y la fecha antes de guardar.</p>
      <v-btn v-if="currentIdentity" outlined @click="review = !review">Revisar diferencias</v-btn>
      <div v-if="review" class="nc1-review"><div v-for="item in reviewDifferences" :key="item.key" class="mb-4"><strong>{{ item.label }}</strong><p>Guardado: {{ item.saved }}</p><p>Tu captura: {{ item.draft }}</p></div><p>Al conservar tu captura, el próximo guardado reemplazará estos datos por los valores de «Tu captura». El teléfono y domicilio pendientes se conservan en ambas opciones.</p><div class="nc1-actions"><v-btn outlined @click="reconcile(false)">Usar identidad guardada</v-btn><v-btn outlined @click="reconcile(true)">Conservar mi captura</v-btn></div></div>
    </v-alert>
    <v-form ref="form" @submit.prevent="save">
      <v-expansion-panels v-model="panels" multiple flat class="nc1-groups">
        <v-expansion-panel><v-expansion-panel-header><div class="nc1-group-title"><span><v-icon small class="mr-2">mdi-account-outline</v-icon>Datos personales</span><small>{{ identityGroupStatus }}</small></div></v-expansion-panel-header><v-expansion-panel-content>
          <v-row><v-col cols="12" md="6"><v-text-field :disabled="saving || awaitingReload" v-model.trim="identity.givenNames" label="Nombre(s) *" outlined dense hide-details="auto" :rules="[required]" /></v-col><v-col cols="12" sm="6" md="3"><v-text-field :disabled="saving || awaitingReload" v-model="identity.birthDate" type="date" :max="today" :rules="[validBirthDate]" label="Fecha de nacimiento *" outlined dense hide-details="auto" /></v-col><v-col cols="12" sm="6" md="3"><v-select :disabled="saving || awaitingReload" v-model="identity.biologicalSex" :items="sexField.items" :label="sexField.label" outlined dense clearable hide-details="auto" /></v-col></v-row>
          <div v-if="legacySurname && !storedSurnamesPresent" class="nc1-legacy"><v-icon small color="primary" class="mr-2">mdi-information-outline</v-icon><span>Apellidos actuales en el expediente: <strong>{{ legacySurname }}</strong>. Escribe cada apellido en su campo; no se separan automáticamente. Mientras no captures ninguno, se conservan como están.</span></div>
          <!-- NC1 identidad simple: three plain fields; an empty surname stays pending (never a declaration). -->
          <v-row><v-col v-for="(label,key) in surnames" :key="key" cols="12" md="6"><v-text-field :disabled="saving || awaitingReload" :value="identity[key] || ''" :label="label" :autocomplete="key === 'firstSurname' ? 'family-name' : 'off'" outlined dense hide-details="auto" @input="setSurnameText(key,$event)" /></v-col></v-row>
          <p v-if="surnameHint" role="status" class="nc1-surname-notice">{{ surnameHint }}</p>
        </v-expansion-panel-content></v-expansion-panel>
        <v-expansion-panel><v-expansion-panel-header><div class="nc1-group-title"><span><v-icon small class="mr-2">mdi-phone-outline</v-icon>Contacto</span><small>{{ contactChanged ? 'Cambios pendientes' : 'Sin cambios' }}</small></div></v-expansion-panel-header><v-expansion-panel-content><v-row><v-col cols="12" md="6"><v-text-field :disabled="saving || awaitingReload" v-model.trim="person.telephone" :rules="[validPhone]" label="Celular *" hint="10 dígitos" persistent-hint outlined dense inputmode="tel" /></v-col><v-col cols="12" md="6"><v-text-field :disabled="saving || awaitingReload" v-model.trim="person.local_telephone" :rules="[optionalPhone]" label="Teléfono local, opcional" outlined dense inputmode="tel" hide-details="auto" /></v-col></v-row><section class="nc1-emergency" aria-labelledby="nc1-emergency-title"><h3 id="nc1-emergency-title"><v-icon small color="primary" class="mr-2">mdi-account-heart-outline</v-icon>Contacto de emergencia <span>opcional</span></h3><p>La persona a quien llamar si el paciente lo necesita durante su atención.</p><v-row><v-col cols="12" md="5"><v-text-field :disabled="saving || awaitingReload" v-model="emergency.name" :rules="[emergencyNameRule]" label="Nombre completo" outlined dense autocomplete="off" maxlength="255" hide-details="auto" /></v-col><v-col cols="12" sm="6" md="3"><v-combobox :disabled="saving || awaitingReload" v-model="emergency.relationship" :items="relationshipItems" label="Parentesco" outlined dense hide-details="auto" maxlength="150" /></v-col><v-col cols="12" sm="6" md="4"><v-text-field :disabled="saving || awaitingReload" v-model.trim="emergency.phone" :rules="[optionalPhone]" label="Teléfono" hint="10 dígitos" persistent-hint outlined dense inputmode="tel" /></v-col></v-row><v-btn v-if="hasEmergencyContact" text small color="primary" class="nc1-emergency-clear" :disabled="saving || awaitingReload" @click="clearEmergency"><v-icon small left>mdi-close</v-icon>Quitar contacto de emergencia</v-btn></section></v-expansion-panel-content></v-expansion-panel>
        <v-expansion-panel><v-expansion-panel-header><div class="nc1-group-title"><span><v-icon small class="mr-2">mdi-map-marker-outline</v-icon>Domicilio</span><small>{{ addressGroupChanged ? 'Cambios pendientes' : 'Sin cambios' }}</small></div></v-expansion-panel-header><v-expansion-panel-content><v-row><v-col cols="12"><v-text-field :disabled="saving || awaitingReload" v-model.trim="address.direction" label="Calle, número y colonia" outlined dense hide-details="auto" /></v-col><v-col cols="12" md="8"><v-text-field :disabled="saving || awaitingReload" v-model.trim="address.residence" label="Lugar de residencia" outlined dense hide-details="auto" /></v-col><v-col cols="12" md="4"><v-text-field :disabled="saving || awaitingReload" v-model.trim="address.cp" :rules="[validPostalCode]" label="Código postal" outlined dense inputmode="numeric" maxlength="5" hide-details="auto" /></v-col></v-row></v-expansion-panel-content></v-expansion-panel>
        <v-expansion-panel><v-expansion-panel-header><div class="nc1-group-title"><span><v-icon small class="mr-2">mdi-card-account-details-outline</v-icon>Información adicional</span><small>{{ optionalChanged ? 'Cambios pendientes' : 'Opcional' }}</small></div></v-expansion-panel-header><v-expansion-panel-content>
          <div class="nc1-optional-intro"><v-icon color="primary" class="mr-3">mdi-shield-check-outline</v-icon><div><strong>¿Por qué te pedimos estos datos?</strong><p>La norma oficial de expedientes clínicos electrónicos (NOM-024) los contempla para que el expediente esté completo. <b>Ninguno es obligatorio:</b> captura solo lo que el paciente quiera compartir y deja en blanco lo demás.</p></div></div>
          <v-row><v-col v-for="field in additionalFields" :key="field.key" cols="12" md="6"><v-select :disabled="saving || awaitingReload" v-model="identity[field.key]" :items="field.items" :label="field.label" outlined dense clearable hide-details="auto" /></v-col>
            <v-col cols="12" md="6"><v-text-field :disabled="saving || awaitingReload" v-model="curpValue" label="CURP" hint="18 caracteres, como aparece en su documento" maxlength="18" outlined dense hide-details="auto" /></v-col><v-col v-if="curpValue" cols="12" md="6"><v-select :disabled="saving || awaitingReload" v-model="curpKind" label="Tipo de CURP" :items="[{text:'Personal',value:'real'},{text:'Genérica',value:'generic'}]" outlined dense hide-details="auto" /></v-col><v-col v-if="curpValue && curpKind === 'generic'" cols="12"><v-text-field :disabled="saving || awaitingReload" v-model="curpReason" label="Motivo de CURP genérica *" outlined dense :rules="[required]" /></v-col>
            <v-col cols="12" md="6"><v-text-field :disabled="saving || awaitingReload" v-model="person.ocupation" label="Ocupación" outlined dense hide-details="auto" /></v-col><v-col cols="12" md="6"><v-text-field :disabled="saving || awaitingReload" v-model="person.rfc" label="RFC" outlined dense hide-details="auto" /></v-col><v-col cols="12"><v-text-field :disabled="saving || awaitingReload" v-model.trim="address.place_birth" label="Lugar de nacimiento" outlined dense hide-details="auto" /></v-col></v-row>
          <section class="nc1-catalogs" aria-labelledby="nc1-catalogs-title"><h3 id="nc1-catalogs-title">Claves de nacimiento y residencia, opcional</h3><p>Busca por nombre o clave y selecciona un resultado. Nacionalidad y código postal siguen como captura no verificada; el código postal se edita en Domicilio.</p>
            <v-row><v-col v-for="field in catalogReferences" :key="field.key" :ref="'catalog-' + field.key" cols="12" md="6"><catalog-reference-field :value="catalogValue(field.key)" :family="field.family" :label="field.label" :parent="catalogParent(field.key)" :active="panels.includes(3)" :disabled="saving || awaitingReload" :errors="catalogErrors[field.key] || []" @input="setCatalogReference(field.key,$event)" /></v-col></v-row>
            <div ref="catalog-affiliations"><catalog-reference-list :value="identity.affiliations" family="sis.affiliation" label="Afiliación" :active="panels.includes(3)" :disabled="saving || awaitingReload" :errors="catalogErrors.affiliations || []" @input="setCatalogAffiliations" /></div>
          </section>
        </v-expansion-panel-content></v-expansion-panel>
      </v-expansion-panels>
      <v-alert v-if="error" type="error" text role="alert" class="mt-4">{{ error }}</v-alert>
      <p v-if="message" role="status" class="mt-4">{{ message }}</p>
      <v-btn v-if="awaitingReload" outlined :loading="saving" @click="reloadSaved">Actualizar ficha guardada</v-btn>
      <v-btn v-if="conflict && !currentIdentity" outlined :loading="saving" @click="loadConflict">Consultar datos para conciliar</v-btn>
      <footer class="nc1-save-bar"><div role="status"><strong>{{ dirty ? 'Cambios pendientes de guardar' : 'Sin cambios pendientes' }}</strong><p>{{ conflict ? 'Revisa las diferencias para habilitar el guardado.' : 'Un solo guardado para toda la ficha del paciente.' }}</p></div><div class="nc1-actions"><v-btn outlined :disabled="saving" @click="cancel">Volver al expediente</v-btn><v-btn color="primary" type="submit" :loading="saving" :disabled="saving || awaitingReload || !hasSavableChanges || conflict">Guardar ficha</v-btn></div></footer>
    </v-form>
    <da-dialog :value="Boolean(pendingConfirmation)" :persist="true" :max-width="'500px'" @input="!$event && resolveConfirmation(false)">
      <template #body>
        <da-sweet-confirm :title="confirmationCopy.title" :message="confirmationCopy.message" :calcelbtntext="'Seguir editando'" :confirmbtntext="confirmationCopy.confirm" v-on:close="resolveConfirmation(false)" v-on:confirm="resolveConfirmation(true)"></da-sweet-confirm>
      </template>
    </da-dialog>
  </section>
</template>
<script>
import CatalogReferenceField from '../../../components/identity/CatalogReferenceField.vue';
import CatalogReferenceList from '../../../components/identity/CatalogReferenceList.vue';
import { identityFieldError } from '../../../domain/identity/identityDraft';
import DAPxService from '../../../services/core/px/DAPxService';
import { patientAge, localDateString, normalizePatientPhone } from '../../../domain/patient/administrative.validation';
import { authorizationContext, isCurrentAuthorization } from '../../../security/authorizationContext';
import DASweetConfirm from '../../../core/components/form/dialog/components/DASweetConfirm.vue';
const clone = value => JSON.parse(JSON.stringify(value));
const normalizePatient = record => {
  const person=clone(record.person), parts=String(person.birthday||'').split('-');
  if(parts.length===3 && parts[0].length===2)person.birthday=parts.reverse().join('-');
  const identity={givenNames:person.name,birthDate:person.birthday,firstSurname:null,secondSurname:null,legacySurname:person.surname,revision:0,...clone(record.identity||{})};
  return {...clone(record),person,address:clone(record.address||{}),identity};
};
const choices = values => Object.entries(values).map(([value,text]) => ({value,text}));
const surnameKeys = ['firstSurname','secondSurname'];
const coreIdentityKeys = ['givenNames','birthDate','biologicalSex',...surnameKeys];
const same = (a,b) => JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);
const affiliationText = identity => (identity.affiliations || []).map(item => item.code).join(',');
// NC1-EC1: one optional primary emergency contact; empty fields mean «no contact».
const emergencyDraft = value => ({name:(value&&value.name)||'',relationship:(value&&value.relationship)||'',phone:(value&&value.phone)||''});
const emergencyValue = draft => {
  const text = value => String(value==null?'':value).trim().replace(/\s+/g,' ');
  const next = {name:text(draft.name),phone:normalizePatientPhone(draft.phone)||null,relationship:text(draft.relationship)||null};
  return next.name||next.phone||next.relationship ? next : null;
};
const editableIdentity = record => {
  const identity = clone(record);
  // Surname statuses are derived by the server; they are neither shown nor sent.
  ['contractVersion','revision','updatedAt','provenance','qualityIssues','legacySurname','catalogValidation','catalogChecks','curpSex','firstSurnameStatus','secondSurnameStatus'].forEach(key => delete identity[key]);
  if(identity.curp) delete identity.curp.validationStatus;
  return identity;
};
export default {
  components:{ CatalogReferenceField, CatalogReferenceList, 'da-sweet-confirm': DASweetConfirm },
  props:{patient:{type:Object,required:true}},
  data() {
    const patient=normalizePatient(this.patient), identity=patient.identity;
    return {identity, baseline:clone(identity),person:clone(patient.person),address:clone(patient.address),original:clone(patient),legacySurname:identity.legacySurname,revision:identity.revision||0,panels:[0,1,2,3],saving:false,catalogErrors:{},error:'',message:'',conflict:false,review:false,currentIdentity:null,currentPatient:null,awaitingReload:false,pendingSavedSurnames:null,sequence:0,
      curpValue:(identity.curp||{}).value||'',curpKind:(identity.curp||{}).kind||'real',curpReason:(identity.curp||{}).reason||'',affiliations:affiliationText(identity),residence:clone(identity.residence||{}),pendingConfirmation:null,selectionRevision:0,emergency:emergencyDraft(patient.emergencyContact),
      relationshipItems:['Madre','Padre','Pareja','Hijo o hija','Hermano o hermana','Otro familiar','Amistad','Tutor o tutora'],
      surnames:{firstSurname:'Primer apellido',secondSurname:'Segundo apellido, opcional'},
      sexField:{key:'biologicalSex',label:'Sexo biológico',items:choices({1:'Hombre',2:'Mujer',3:'Intersexual'})},
      additionalFields:[{key:'genderIdentity',label:'Género',items:choices({0:'No especificado',1:'Masculino',2:'Femenino',3:'Transgénero',4:'Transexual',5:'Travesti',6:'Intersexual',88:'Otro'})},...['indigenousSelfIdentification','afromexicanSelfIdentification'].map((key,i)=>({key,label:i?'¿Se autodenomina afromexicano/a?':'¿Se autodenomina indígena?',items:choices({yes:'Sí',no:'No',declined:'No responde',unknown_to_patient:'No sabe'})})),{key:'migrantStatus',label:'Situación migratoria',items:choices({none:'No migrante',national:'Nacional',international:'Internacional',returned:'Retornado'})}],
      catalogFields:[{key:'birthCountry',family:'sis.country',label:'País de nacimiento: clave'},{key:'birthEntity',family:'sis.federal_entity',label:'Entidad de nacimiento: clave'},{key:'nationality',family:'renapo.nationality',label:'Nacionalidad: clave'},{key:'originCountry',family:'sis.country',label:'País de procedencia: clave'}],residenceFields:[{key:'country',family:'sis.country',label:'País: clave'},{key:'entity',family:'inegi.state',label:'Entidad: clave'},{key:'municipality',family:'inegi.municipality',label:'Municipio: clave'},{key:'locality',family:'inegi.locality',label:'Localidad: clave'}]};
  },
  computed:{
    today(){return localDateString();},
    catalogReferences(){return [...this.catalogFields.map(f=>({...f,label:f.label.replace(': clave','')})),...this.residenceFields.map(f=>({...f,key:'residence.'+f.key,label:({country:'País de residencia',entity:'Entidad de residencia',municipality:'Municipio',locality:'Localidad'})[f.key]}))];},
    inputErrors(){
      const errors=[];
      if(this.required(this.identity.givenNames)!==true)errors.push('El nombre es obligatorio.');
      if(this.validBirthDate(this.identity.birthDate)!==true)errors.push(this.validBirthDate(this.identity.birthDate));
      if(this.validPhone(this.person.telephone)!==true)errors.push(this.validPhone(this.person.telephone));
      if(this.optionalPhone(this.person.local_telephone)!==true)errors.push(this.optionalPhone(this.person.local_telephone));
      if(this.validPostalCode(this.address.cp)!==true)errors.push(this.validPostalCode(this.address.cp));
      if(this.emergencyNameRule(this.emergency.name)!==true)errors.push(this.emergencyNameRule(this.emergency.name));
      if(this.optionalPhone(this.emergency.phone)!==true)errors.push('El teléfono del contacto de emergencia debe tener 10 dígitos.');
      if(this.surnamesChanged && !surnameKeys.some(key=>String(this.identity[key]||'').trim()))errors.push('Registra al menos un apellido.');
      return errors;
    },
    reviewDifferences(){
      if(!this.currentIdentity)return [];
      const labels={givenNames:'Nombre(s)',firstSurname:'Primer apellido',secondSurname:'Segundo apellido',birthDate:'Fecha de nacimiento',affiliations:'Afiliaciones'};
      this.catalogReferences.forEach(f=>{labels[f.key]=f.label;});
      const value=(data,key)=>key.startsWith('residence.')?(data.residence||{})[key.slice(10)]:data[key];
      const display=v=>Array.isArray(v)?v.map(display).join(', '):v&&typeof v==='object'?v.code+' ('+(v.releaseId||'sin verificar')+')':v||'Sin capturar';
      const draft=this.formIdentity();
      return Object.keys(labels).filter(key=>!same(value(this.currentIdentity,key),value(draft,key))).map(key=>({key,label:labels[key],saved:display(value(this.currentIdentity,key)),draft:display(value(draft,key))}));
    },
    storedSurnamesPresent(){return surnameKeys.some(key => String(this.baseline[key]||'').trim());},
    surnamesChanged(){const draft=this.formIdentity(),baseline=editableIdentity(this.baseline);return surnameKeys.some(key=>!same(draft[key],baseline[key]));},
    surnameHint(){return this.surnamesChanged && !surnameKeys.some(key=>String(this.identity[key]||'').trim()) ? 'Registra al menos un apellido.' : '';},
    changedIdentityKeys(){const baseline=editableIdentity(this.baseline);return Object.entries(this.formIdentity()).filter(([key,value])=>!same(value,baseline[key])).map(([key])=>key);},
    optionalChanged(){return this.personalDetailsChanged || !same(this.address.place_birth,this.original.address.place_birth) || this.changedIdentityKeys.some(key=>!coreIdentityKeys.includes(key));},
    addressGroupChanged(){const strip=address=>{const copy=clone(address||{});delete copy.place_birth;return copy;};return !same(strip(this.address),strip(this.original.address));},
    storedCodes(){
      const fields=[...this.catalogFields.map(field=>[field.label.replace(': clave',''),(this.identity[field.key]||{}).code]),...this.residenceFields.map(field=>['Residencia · '+field.label.replace(': clave',''),(this.residence[field.key]||{}).code])];
      if(this.affiliations)fields.push(['Afiliación',this.affiliations]);
      return fields.filter(([,code])=>code).map(([label,code])=>label+' '+code);
    },
    confirmationCopy(){
      return {title:'¿Salir sin guardar?',message:'Tienes cambios sin guardar en la ficha del paciente. Si sales ahora, se perderán.',confirm:'Salir sin guardar'};
    },
    identityChanged(){const baseline=editableIdentity(this.baseline);return Object.entries(this.formIdentity()).some(([key,value])=>!same(value,baseline[key]));},
    identityGroupStatus(){
      if(this.changedIdentityKeys.some(key=>coreIdentityKeys.includes(key))) return 'Cambios pendientes';
      const complete = this.identity.givenNames && patientAge(this.identity.birthDate) !== '' && this.identity.biologicalSex && surnameKeys.some(key => String(this.identity[key] || '').trim());
      return complete ? 'Identidad confirmada' : 'Identidad por completar';
    },
    hasSavableChanges(){return Object.keys(this.identityPatch()).length > 0 || this.personalDetailsChanged || this.contactChanged || this.addressChanged;},
    personalDetailsChanged(){return ['ocupation','rfc'].some(key=>!same(this.person[key],this.original.person[key]));},
    emergencyChanged(){return !same(emergencyValue(this.emergency),emergencyValue(emergencyDraft(this.original.emergencyContact)));},
    hasEmergencyContact(){return Boolean(emergencyValue(this.emergency));},
    contactChanged(){return this.emergencyChanged || ['telephone','local_telephone'].some(key=>!same(normalizePatientPhone(this.person[key]),normalizePatientPhone(this.original.person[key])));},
    addressChanged(){return !same(this.address,this.original.address);},dirty(){return this.identityChanged||this.personalDetailsChanged||this.contactChanged||this.addressChanged;}
  },
  watch:{'identity.birthDate'(value){this.person.age=patientAge(value);}},
  beforeDestroy(){this.sequence++;},
  methods:{
    catalogValue(key){return key.startsWith('residence.')?this.residence[key.slice(10)]||null:this.identity[key]||null;},
    catalogParent(key){const parent=key==='residence.municipality'?'entity':key==='residence.locality'?'municipality':null;return parent?(this.residence[parent]||{}).code||'':'';},
    setCatalogReference(key,value){if(this.saving||this.awaitingReload)return;if(key.startsWith('residence.'))this.$set(this.residence,key.slice(10),value);else this.$set(this.identity,key,value);this.catalogErrors={};},
    setCatalogAffiliations(value){if(this.saving||this.awaitingReload)return;this.$set(this.identity,'affiliations',value);this.affiliations=affiliationText(this.identity);this.catalogErrors={};},
    focusCatalog(key){if(!this.panels.includes(3))this.panels=[...this.panels,3];this.$nextTick(()=>{const wrapper=this.$refs['catalog-'+key],target=Array.isArray(wrapper)?wrapper[0]:wrapper;const root=target&&(target.$el||target);const input=root&&root.querySelector('input');if(input){input.focus();input.scrollIntoView({block:'center'});}});},
    validBirthDate(value){return patientAge(value)!=='' || 'Ingresa una fecha real, anterior o igual a hoy, con una edad de hasta 150 años.';},
    validPhone(value){return /^\d{10}$/.test(normalizePatientPhone(value)) || 'Ingresa un teléfono de contacto de 10 dígitos.';},
    optionalPhone(value){return !value || this.validPhone(value);},
    emergencyNameRule(value){const draft=emergencyValue(this.emergency);return !draft || Boolean(String(value||'').trim()) || 'Escribe el nombre del contacto de emergencia o borra sus datos.';},
    clearEmergency(){this.emergency=emergencyDraft(null);},
    validPostalCode(value){return !value || /^\d{5}$/.test(value) || 'El código postal debe tener 5 dígitos.';},
    required(v){return !!String(v||'').trim()||'Campo obligatorio';},
    setSurnameText(key,value){const text=value==null?'':String(value);this.$set(this.identity,key,text.trim()?text:null);},
    resolveConfirmation(confirmed){
      const action=this.pendingConfirmation;this.pendingConfirmation=null;this.selectionRevision++;
      if(!confirmed || !action)return;
      this.$emit('cancel');
    },
    reconcile(keep){
      if(!this.currentIdentity || !this.currentPatient)return;
      // The server sends no current identity in a 409: compare a fresh GET, never infer it.
      this.original.person={...this.original.person,name:this.currentPatient.person.name,surname:this.currentPatient.person.surname,birthday:this.currentPatient.person.birthday,age:this.currentPatient.person.age};
      if(!keep){
        this.identity=clone(this.currentIdentity);this.person.name=this.currentIdentity.givenNames;this.person.birthday=this.currentIdentity.birthDate;this.person.age=patientAge(this.currentIdentity.birthDate);
        this.person.surname=this.currentPatient.person.surname;
        this.original.person={...this.original.person,name:this.person.name,birthday:this.person.birthday,age:this.person.age,surname:this.person.surname};
        this.residence=clone(this.currentIdentity.residence||{});this.affiliations=affiliationText(this.currentIdentity);
        this.curpValue=(this.currentIdentity.curp||{}).value||'';this.curpKind=(this.currentIdentity.curp||{}).kind||'real';this.curpReason=(this.currentIdentity.curp||{}).reason||'';
      }
      this.baseline=clone(this.currentIdentity);this.revision=this.currentIdentity.revision;this.conflict=false;this.review=false;this.message='Revisión terminada. Guarda la ficha para enviar los cambios que ves.';
    },
    cancel(){if(this.dirty){this.pendingConfirmation={kind:'discard'};return;}this.$emit('cancel');},
    formIdentity(){
      const identity=editableIdentity(this.identity);
      ['firstSurname','secondSurname'].forEach(key=>{if(typeof identity[key]==='string')identity[key]=identity[key].trim()||null;});
      identity.curp=this.curpValue?{value:this.curpValue.toUpperCase(),kind:this.curpKind,...(this.curpKind==='generic'?{reason:this.curpReason}:{})}:null;
      identity.residence=Object.keys(this.residence).length?clone(this.residence):null;
      identity.affiliations=this.affiliations.trim()?this.affiliations.split(',').map(value=>{
        const code=value.trim(), existing=(this.identity.affiliations||[]).find(item=>item.code===code);
        return existing?clone(existing):{family:'sis.affiliation',code};
      }):null;
      return identity;
    },
    identityPatch(){
      const draft=this.formIdentity(), baseline=editableIdentity(this.baseline), patch={};
      Object.entries(draft).forEach(([key,value])=>{if(!surnameKeys.includes(key)&&!same(value,baseline[key]))patch[key]=value;});
      // Both surnames travel together, so the server can derive person.surname consistently.
      if(surnameKeys.some(key=>!same(draft[key],baseline[key]))) surnameKeys.forEach(key=>{patch[key]=draft[key] == null ? null : draft[key];});
      // H3: address.cp is the single editable CP. Include its identity mirror in the same revision-controlled write.
      const cp=this.address.cp || '', previousCp=this.original.address.cp || '', storedCp=((baseline.residence||{}).postalCode||{}).code || '';
      if(cp!==previousCp || (this.revision>0 && this.addressChanged && cp!==storedCp)) {
        patch.residence={...(patch.residence||{}),postalCode:cp?{family:'sepomex.postal_code',code:cp}:null};
      }
      return patch;
    },
    buildPayload(){
      const person={...this.person,name:this.identity.givenNames,birthday:this.identity.birthDate,age:patientAge(this.identity.birthDate),surname:this.original.person.surname,telephone:normalizePatientPhone(this.person.telephone),local_telephone:normalizePatientPhone(this.person.local_telephone)||null};
      const payload={person,address:clone(this.address)};
      const identity=this.identityPatch();
      if(surnameKeys.some(key=>key in identity))person.surname=[identity.firstSurname,identity.secondSurname].filter(Boolean).join(' ');
      if(Object.keys(identity).length){payload.identity=identity;payload.expectedRevision=this.revision;}
      if(this.emergencyChanged)payload.emergencyContact=emergencyValue(this.emergency);
      return payload;
    },
    acceptSavedPatient(patient, pendingSurnames){
      patient=normalizePatient(patient);
      this.original=clone(patient);this.person=clone(patient.person);this.address=clone(patient.address);this.emergency=emergencyDraft(patient.emergencyContact);
      this.identity=clone(patient.identity);this.baseline=clone(patient.identity);this.revision=patient.identity.revision||0;
      this.legacySurname=patient.identity.legacySurname;this.residence=clone(patient.identity.residence||{});this.affiliations=affiliationText(patient.identity);
      this.curpValue=(patient.identity.curp||{}).value||'';this.curpKind=(patient.identity.curp||{}).kind||'real';this.curpReason=(patient.identity.curp||{}).reason||'';
      if(pendingSurnames)Object.entries(pendingSurnames).forEach(([key,value])=>this.$set(this.identity,key,value));
    },
    async save(){
      if(this.saving||this.conflict||this.awaitingReload||!this.hasSavableChanges)return;
      if(!this.$refs.form.validate() || this.inputErrors.length){this.error=this.inputErrors[0]||'Revisa los campos indicados.';return;}
      const pendingSurnames=null;
      const context=authorizationContext(this.$store), seq=this.sequence;
      this.saving=true;this.error='';this.catalogErrors={};this.message='';
      try{
        const response=await DAPxService.updateAdministrative(this.buildPayload());
        if(seq!==this.sequence||!isCurrentAuthorization(context,this.$store))return;
        if(response.status===409 && (!response.data || response.data.code!=='AUTH_CONTEXT_CHANGED')){this.conflict=true;this.currentIdentity=null;await this.loadConflict();return;}
        if(!response.success){const mapped=identityFieldError(response);if(mapped){this.catalogErrors=mapped.errors;this.error=mapped.label+': '+mapped.message+' Conservamos la captura.';this.focusCatalog(mapped.field);return;}throw Error(response.message);}
        this.awaitingReload=true;this.pendingSavedSurnames=pendingSurnames;
        await this.reloadSaved();
      }catch(e){this.error=e.message||'No se pudo guardar. Tu captura se conserva.';}finally{this.saving=false;}
    },
    async readPatient(){
      const response=await DAPxService.getById(this.original.person.id_person);
      if(!response.success || !response.data || !response.data.person || response.data.person.id_person!==this.original.person.id_person)throw Error(response.message||'No se pudo consultar la ficha.');
      // Preserve the API DTO for store consumers; normalize only the form's private copies.
      return response.data;
    },
    async loadConflict(){
      const context=authorizationContext(this.$store),seq=this.sequence;this.saving=true;this.error='';
      try{
        const patient=await this.readPatient();
        if(seq!==this.sequence||!isCurrentAuthorization(context,this.$store))return;
        this.currentPatient=normalizePatient(patient);this.currentIdentity=clone(this.currentPatient.identity);
        this.$nextTick(()=>{if(this.$refs.conflict)this.$refs.conflict.$el.focus();});
      }catch(e){this.error='No se pudieron consultar los cambios guardados. Tu captura se conserva; vuelve a consultar para conciliar.';}finally{this.saving=false;}
    },
    async reloadSaved(){
      const context=authorizationContext(this.$store),seq=this.sequence;this.saving=true;this.error='';
      try{
        const patient=await this.readPatient();
        if(seq!==this.sequence||!isCurrentAuthorization(context,this.$store))return;
        const pending=this.pendingSavedSurnames;
        this.acceptSavedPatient(patient,pending);this.awaitingReload=false;this.pendingSavedSurnames=null;
        this.message=pending?'Los demás cambios se guardaron. Tu captura de apellidos sigue pendiente en esta ficha.':'Ficha guardada.';
        this.$emit('refreshed',patient);
        if(!pending)this.$emit('saved',patient);
      }catch(e){this.error='La ficha se guardó, pero no se pudo confirmar la lectura. Tu captura se conserva. Actualiza la ficha guardada antes de continuar.';}finally{this.saving=false;}
    }
  }
};
</script>
<style scoped>
.nc1-catalogs { margin-top:18px; padding-top:16px; border-top:1px solid #dbe6ec; }
.nc1-catalogs h3 { font-size:16px; margin-bottom:8px; }
.nc1-catalogs > p { font-size:13px; line-height:1.5; }
.nc1-surname-notice { padding:12px 14px; margin:12px 0 0; background:#f3f7fa; border-left:3px solid #186c8e; border-radius:0 8px 8px 0; font-size:14px; color:#334155; }
.nc1-surname-absent { margin-top:6px; padding-top:0; }
.nc1-surname-absent ::v-deep label { font-size:13px; color:#516479; }
.nc1-optional-intro { display:flex; align-items:flex-start; gap:4px; padding:14px 16px; margin-bottom:18px; border-radius:12px; background:linear-gradient(135deg,#f0f9fb,#f7fbfd); border:1px solid #d6ecf2; }
.nc1-optional-intro strong { display:block; color:#0f3d52; font-size:15px; margin-bottom:4px; }
.nc1-optional-intro p { margin:0; font-size:14px; line-height:1.5; color:#40566b; }
.nc1-codes-note { display:flex; align-items:flex-start; margin-top:18px; padding:12px 14px; border-radius:10px; background:#f8fafc; border:1px dashed #cbd5e1; color:#516479; font-size:13px; }
.nc1-codes-note strong { display:block; color:#334155; margin-bottom:2px; }
.nc1-codes-note p { margin:0 0 4px; }
.nc1-emergency { margin-top:20px; padding-top:16px; border-top:1px solid #e5edf2; }
.nc1-emergency h3 { display:flex; align-items:center; font-size:15px; font-weight:600; color:#0f3d52; margin:0 0 4px; }
.nc1-emergency h3 span { margin-left:8px; font-size:12px; font-weight:400; color:#516479; }
.nc1-emergency > p { margin:0 0 8px; font-size:13px; color:#516479; }
.nc1-emergency-clear { margin-top:8px; }
.nc1-confirm-actions { display:flex; flex-wrap:wrap; gap:12px; padding:16px; }
.nc1-confirm-actions .v-btn { min-height:44px; }
.nc1-conflict { color: #714b12 !important; background: #fff5df !important; }
.nc1-conflict .v-btn { color: #186c8e !important; }
.nc1-sheet{background:#fff;border:1px solid var(--color-primary-200);border-radius:16px;padding:24px;color:#334155}.nc1-sheet-heading{display:flex;justify-content:space-between;gap:16px;margin-bottom:20px}.nc1-sheet h2{font-size:24px;font-weight:600;margin:4px 0 8px}.nc1-eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--color-primary-700);margin:0}.nc1-help{font-size:14px}.nc1-groups>.v-expansion-panel{border:1px solid #dbe6ec;border-radius:12px!important;margin:0 0 16px}.nc1-group-title{display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:600;font-size:17px}.nc1-group-title small{font-size:12px;font-weight:400;color:#516479}.nc1-legacy{display:flex;align-items:flex-start;background:#f3f7fa;border-radius:10px;padding:12px 14px;margin:4px 0 16px;font-size:14px;color:#334155;line-height:1.5}.nc1-legacy p{margin:4px 0}.nc1-status-note{font-size:12px;color:#516479;margin:6px 0 12px;min-height:32px}.nc1-save-bar{display:flex;justify-content:space-between;gap:16px;align-items:center;border-top:1px solid #dbe6ec;padding-top:22px}.nc1-save-bar p{font-size:13px;margin:4px 0}.nc1-actions{display:flex;flex-wrap:wrap;gap:12px}.nc1-sheet .v-btn{min-height:44px}.nc1-review{margin-top:16px}.nc1-sheet .row{margin-top:4px}.nc1-sheet ::v-deep .v-select__selection{max-width:100%;white-space:normal;line-height:1.4;margin-top:9px;margin-bottom:9px}.nc1-sheet ::v-deep .v-expansion-panel-header{min-height:64px}.nc1-sheet summary{cursor:pointer;padding:12px 0}
@media(max-width:600px){.nc1-sheet{padding:16px}.nc1-sheet-heading{display:block}.nc1-sheet-heading .v-chip{margin-top:6px}.nc1-group-title{display:block}.nc1-group-title small{display:block;margin-top:8px}.nc1-save-bar{display:block}.nc1-actions{margin-top:16px}.nc1-actions .v-btn{width:100%;white-space:normal}.nc1-sheet ::v-deep .v-expansion-panel-content__wrap{padding:0 16px 16px}.nc1-sheet h2{font-size:21px}}
</style>
